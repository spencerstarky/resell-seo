export const EBAY_SCOPES = [
    'https://api.ebay.com/oauth/api_scope',
    'https://api.ebay.com/oauth/api_scope/sell.inventory',
    'https://api.ebay.com/oauth/api_scope/sell.marketing',
    'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly'
].join(' ');

export async function getEbayAuthUrl() {
    const clientId = process.env.EBAY_CLIENT_ID;
    const ruName = process.env.EBAY_RUNAME;

    console.log('--- eBay Auth Debug ---');
    console.log('Client ID loaded:', clientId ? `${clientId.substring(0, 8)}...` : 'MISSING');
    console.log('RuName loaded:', ruName ? 'YES' : 'MISSING');

    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/ebay/callback`;
    const isSandbox = clientId?.includes('-SBX-');
    const authHost = isSandbox ? 'auth.sandbox.ebay.com' : 'auth.ebay.com';

    const url = new URL(`https://${authHost}/oauth2/authorize`);
    url.searchParams.append('client_id', clientId!);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('redirect_uri', ruName!); // eBay requires the RuName here, not the URL
    url.searchParams.append('scope', EBAY_SCOPES);

    return url.toString();
}

export async function exchangeCodeForTokens(code: string) {
    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;
    const isSandbox = clientId?.includes('-SBX-');
    const apiHost = isSandbox ? 'api.sandbox.ebay.com' : 'api.ebay.com';

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(`https://${apiHost}/identity/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authHeader}`
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.EBAY_RUNAME!
        })
    });

    if (!response.ok) {
        const err = await response.json();
        console.error('--- eBay Token Exchange Detailed Error ---', err);
        throw new Error(`eBay Token Exchange Failed: ${err.error_description || JSON.stringify(err)}`);
    }

    return response.json();
}

export async function refreshAccessToken(refreshToken: string) {
    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;
    const isSandbox = clientId?.includes('-SBX-');
    const apiHost = isSandbox ? 'api.sandbox.ebay.com' : 'api.ebay.com';

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(`https://${apiHost}/identity/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${authHeader}`
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            scope: EBAY_SCOPES,
        })
    });

    if (!response.ok) {
        const err = await response.json();
        console.error('--- eBay Token Refresh Detailed Error ---', err);
        throw new Error(`eBay Token Refresh Failed: ${err.error_description || JSON.stringify(err)}`);
    }

    return response.json();
}