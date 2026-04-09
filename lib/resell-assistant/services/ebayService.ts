import axios from 'axios';
import * as cheerio from 'cheerio';
import { Listing } from './analysisService';

let cachedToken: string | null = null;
let tokenExpiry = 0;

/**
 * Get an eBay OAuth token using client credentials grant.
 */
async function getEbayToken(): Promise<string> {
    // Return cached token if still valid
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    const appId = process.env.EBAY_APP_ID;
    const certId = process.env.EBAY_CERT_ID;

    if (!appId || !certId) {
        throw new Error('eBay API credentials are not configured. Please add EBAY_APP_ID and EBAY_CERT_ID to your .env file.');
    }

    const credentials = Buffer.from(`${appId}:${certId}`).toString('base64');

    let response;
    try {
        response = await axios.post(
            'https://api.ebay.com/identity/v1/oauth2/token',
            'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${credentials}`,
                },
            }
        );
    } catch (authError: any) {
        console.error('[eBay Auth Error]', authError.response?.data || authError.message);
        throw new Error(`eBay API Authentication Failed: ${JSON.stringify(authError.response?.data || authError.message)}`);
    }

    cachedToken = response.data.access_token;
    // Expire 5 minutes early to be safe
    tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

    return cachedToken!;
}

/**
 * Search for active listings on eBay using the Browse API.
 * Returns normalized listing objects and the true numerical market total.
 */
export async function searchActiveListings(query: string, limit = 50, condition: string = 'all'): Promise<{ items: Listing[], totalCount: number }> {
    const token = await getEbayToken();

    const requestParams: any = { q: query, limit };
    if (condition === 'new') {
        requestParams.filter = 'conditionIds:{1000}';
    } else if (condition === 'used') {
        // Appends broadly Pre-Owned and corresponding conditions mathematically
        requestParams.filter = 'conditionIds:{3000|4000|5000|6000}';
    }

    const response = await axios.get(
        'https://api.ebay.com/buy/browse/v1/item_summary/search',
        {
            params: requestParams,
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
                'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<ePNCampaignId>,affiliateReferenceId=<referenceId>',
            },
        }
    );

    const items = response.data.itemSummaries || [];
    const totalCount = response.data.total || items.length;

    const mappedItems = items.map((item: any) => ({
        title: item.title || '',
        price: item.price?.value ? parseFloat(item.price.value) : 0,
        currency: item.price?.currency || 'USD',
        image: item.thumbnailImages?.[0]?.imageUrl || item.image?.imageUrl || null,
        itemWebUrl: item.itemWebUrl || '#',
        condition: item.condition || null,
        itemId: item.itemId,
    }));

    return { items: mappedItems, totalCount };
}

export async function searchSoldListings(query: string, limit = 15, condition: string = 'all'): Promise<{ items: Listing[], totalCount: number }> {
    try {
        console.log(`[eBay/Native] Starting Serverless scrape: "${query}" | Condition: ${condition}`);
        
        let searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1`;
        if (condition === 'new') {
            searchUrl += '&LH_ItemCondition=1000';
        } else if (condition === 'used') {
            searchUrl += '&LH_ItemCondition=3000'; // Target explicit 'Pre-owned' 
        }

        // Native fetch with a hyper-specific iOS Safari User-Agent to bypass Datacenter IP blocking!
        const res = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            }
        });

        const html = await res.text();
        const $ = cheerio.load(html);
        const items: Listing[] = [];

        // Market Velocity Fix: Extract the true global count of sold listings!
        let totalCount = 0;
        const countText = $('.srp-controls__count-heading').text() || $('[class*="count-heading"]').text();
        if (countText) {
            // "36 results" or "1,234 results" -> remove commas and parse
            const match = countText.replace(/,/g, '').match(/(\d+)/);
            if (match) totalCount = parseInt(match[1], 10);
        }

        $('.s-card__title').each((i, el) => {
            const title = $(el).text().trim();
            if (!title || title.includes("Shop on eBay") || title.length < 3) return;

            const wrapper = $(el).closest('.s-card, .su-card-container');
            let priceText = wrapper.find('.s-item__price, [class*="price"]').text().trim() || '';
            if (priceText.includes('to')) priceText = priceText.split('to')[0];
            const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;

            if (price > 0 && title) {
                const imgEl = wrapper.find('img');
                items.push({
                    title: title,
                    price: price,
                    image: imgEl.attr('data-src') || imgEl.attr('src') || undefined,
                    itemWebUrl: wrapper.find('a').attr('href') || '#',
                    condition: wrapper.find('.SECONDARY_INFO').text().trim() || undefined
                });
            }
        });

        if (items.length === 0) {
            console.warn('[eBay/Native] No sold items found natively for query:', query);
            return { items: [], totalCount: 0 };
        }

        if (totalCount === 0) {
            totalCount = items.length; // Fallback
        }

        console.log(`[eBay/Native] Bypass Success! Scraped ${items.length} items. True Market Total: ${totalCount}`);
        
        return { items: items.slice(0, limit), totalCount };
    } catch (err: any) {
        console.error('[eBay/Native] Error fetching sold comps natively:', err.message);
        return { items: [], totalCount: 0 };
    }
}
