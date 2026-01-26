import { SupabaseClient } from '@supabase/supabase-js';


interface EbayTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

let cachedAppToken: string | null = null;
let tokenExpiration: number = 0;

/**
 * Generates an Application Access Token (Client Credentials)
 * This token allows access to public data (search, item details) without acting as a specific user.
 */
export async function getAppAccessToken(): Promise<string> {
    const now = Date.now();
    if (cachedAppToken && now < tokenExpiration) {
        return cachedAppToken;
    }

    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('eBay Client ID or Secret is missing from environment variables.');
    }

    const isSandbox = clientId.includes('-SBX-');
    const authUrl = isSandbox
        ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
        : 'https://api.ebay.com/identity/v1/oauth2/token';

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authHeader}`
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            scope: isSandbox ? 'https://api.ebay.com/oauth/api_scope' : 'https://api.ebay.com/oauth/api_scope'
        })
    });

    if (!response.ok) {
        const err = await response.text();
        console.error('eBay App Token Error:', err);
        throw new Error('Failed to retrieve eBay App Token');
    }

    const data: EbayTokenResponse = await response.json();
    cachedAppToken = data.access_token;
    // Set expiration with a 5-minute buffer
    tokenExpiration = now + (data.expires_in * 1000) - (5 * 60 * 1000);

    return cachedAppToken;
}

export interface EbaySearchResult {
    itemId: string;
    title: string;
    price: {
        value: string;
        currency: string;
    };
    image: {
        imageUrl: string;
    };
    itemWebUrl: string;
    shippingOptions?: Array<{
        shippingCost: {
            value: string;
        }
    }>;
    condition?: string;
    conditionId?: string;
    seller?: {
        username: string;
        feedbackPercentage: string;
    };
}


// searchSellerItems removed (Store Prospector feature retired)

/**
 * Fetch detailed public item info (including item specifics) via Browse API
 */
export async function getPublicItemDetails(itemId: string) {
    const token = await getAppAccessToken();

    // Item ID in Browse API usually assumes the format `v1|{itemId}|0` for legacy IDs
    // But search results return the Browse API ID. 
    // If we have a legacy ID (numerical), we might need to look it up differently or format it.
    // The searchSellerItems returns the Browse API ID format usually.

    const isSandbox = (process.env.EBAY_CLIENT_ID || '').includes('-SBX-');
    const browseApiUrl = isSandbox
        ? 'https://api.sandbox.ebay.com/buy/browse/v1'
        : 'https://api.ebay.com/buy/browse/v1';

    const response = await fetch(`${browseApiUrl}/item/${itemId}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
    });

    if (!response.ok) {
        // Fallback: Try with legacy ID prefix format if it's purely numeric
        if (/^\d+$/.test(itemId)) {
            const legacyId = `v1|${itemId}|0`;
            const retryResponse = await fetch(`${browseApiUrl}/item/${legacyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
                }
            });
            if (retryResponse.ok) {
                return await retryResponse.json();
            }
        }

        const err = await response.text();
        console.error('eBay GetItem Error:', err);
        throw new Error(`Failed to get details for item ${itemId}`);
    }

    return await response.json();
}

/**
 * Adapter to fetch public item details and format them exactly like the 
 * internal 'getDetailedItemInfo' function so the AI Optimizer can consume it.
 */
export async function getOptimizerCompatibleItemDetails(itemId: string) {
    const data = await getPublicItemDetails(itemId);

    // 1. Format Specifics
    // Browse API returns 'localizedAspects' as Array<{name: string, value: string, type: string}>
    let specifics = '';
    if (data.localizedAspects && Array.isArray(data.localizedAspects)) {
        specifics = data.localizedAspects
            .map((aspect: any) => `${aspect.name}: ${aspect.value}`)
            .join(', ');
    }

    // 2. Format Images
    const imageUrls: string[] = [];
    if (data.image && data.image.imageUrl) {
        imageUrls.push(data.image.imageUrl);
    }
    if (data.additionalImages && Array.isArray(data.additionalImages)) {
        data.additionalImages.forEach((img: any) => {
            if (img.imageUrl) imageUrls.push(img.imageUrl);
        });
    }

    // 3. Fallback for Short Description if needed (Browse API sometimes has shortDescription)
    // The optimizer primarily uses specifics, so we stick to that.

    return {
        specifics,
        imageUrls,
        originalTitle: data.title
    };
}
