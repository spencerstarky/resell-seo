import axios from 'axios';
import { ApifyClient } from 'apify-client';
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
 * Returns normalized listing objects.
 */
export async function searchActiveListings(query: string, limit = 50): Promise<Listing[]> {
    const token = await getEbayToken();

    const response = await axios.get(
        'https://api.ebay.com/buy/browse/v1/item_summary/search',
        {
            params: {
                q: query,
                limit,
            },
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
                'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<ePNCampaignId>,affiliateReferenceId=<referenceId>',
            },
        }
    );

    const items = response.data.itemSummaries || [];

    return items.map((item: any) => ({
        title: item.title || '',
        price: item.price?.value ? parseFloat(item.price.value) : 0,
        currency: item.price?.currency || 'USD',
        image: item.thumbnailImages?.[0]?.imageUrl || item.image?.imageUrl || null,
        itemWebUrl: item.itemWebUrl || '#',
        condition: item.condition || null,
        itemId: item.itemId,
    }));
}

/**
 * Fetch sold listings via Apify to bypass eBay's restricted Marketplace Insights API.
 */
export async function searchSoldListings(query: string, limit = 15): Promise<Listing[]> {
    if (!process.env.APIFY_API_TOKEN) {
        console.warn('[eBay] Missing APIFY_API_TOKEN in environment variables. Cannot fetch sold comps.');
        return [];
    }

    try {
        console.log(`[eBay/Apify] Starting scrape for sold items matching: "${query}"`);
        const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

        const run = await client.actor('getdataforme/ebay-scraper').call({
            search: query,
            soldItems: true,
            maxItems: limit
        });

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        return items.map((item: any) => ({
            title: item.title || '',
            price: item.price ? parseFloat(item.price) : 0,
            currency: item.currency || 'USD',
            image: item.image || item.imageUrl || null,
            itemWebUrl: item.url || '#',
            condition: item.condition || null,
        }));
    } catch (err: any) {
        console.error('[eBay/Apify] Error fetching sold comps:', err.message);
        return [];
    }
}
