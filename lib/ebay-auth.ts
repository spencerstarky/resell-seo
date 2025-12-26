
export const EBAY_SCOPES = process.env.EBAY_SCOPES || "https://api.ebay.com/oauth/api_scope/sell.inventory";

export const getEbayAuthUrl = () => {
    const appId = process.env.EBAY_APP_ID;
    const redirectUri = process.env.EBAY_RU_NAME;
    const scopes = encodeURIComponent(EBAY_SCOPES);

    // State should ideally be a random string stored in session/cookie to prevent CSRF
    // For MVP we'll use a simple indicator or timestamp
    const state = "initial_auth";

    // Sandbox URL: https://auth.sandbox.ebay.com/oauth2/authorize
    // Production URL: https://auth.ebay.com/oauth2/authorize
    const authBaseUrl = process.env.EBAY_API_BASE_URL?.includes('sandbox')
        ? 'https://auth.sandbox.ebay.com/oauth2/authorize'
        : 'https://auth.ebay.com/oauth2/authorize';

    return `${authBaseUrl}?client_id=${appId}&response_type=code&redirect_uri=${redirectUri}&scope=${scopes}&state=${state}`;
};

export const exchangeCodeForToken = async (code: string) => {
    const appId = process.env.EBAY_APP_ID;
    const certId = process.env.EBAY_CERT_ID;
    const redirectUri = process.env.EBAY_RU_NAME;
    const baseUrl = process.env.EBAY_API_BASE_URL || 'https://api.sandbox.ebay.com';

    const credentials = Buffer.from(`${appId}:${certId}`).toString('base64');

    const response = await fetch(`${baseUrl}/identity/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri!,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('eBay Token Exchange Error:', error);
        throw new Error(error.error_description || 'Failed to exchange code for token');
    }

    return response.json();
};
export const refreshAccessToken = async (refreshToken: string) => {
    const appId = process.env.EBAY_APP_ID;
    const certId = process.env.EBAY_CERT_ID;
    const baseUrl = process.env.EBAY_API_BASE_URL || 'https://api.sandbox.ebay.com';

    const credentials = Buffer.from(`${appId}:${certId}`).toString('base64');

    const response = await fetch(`${baseUrl}/identity/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            scope: EBAY_SCOPES,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('eBay Token Refresh Error:', error);
        throw new Error(error.error_description || 'Failed to refresh eBay token');
    }

    return response.json();
};
