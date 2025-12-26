import { supabase } from '@/lib/supabase';
import { refreshAccessToken } from './ebay-auth';

export async function updateEbayListingTitle(userId: string, itemId: string, newTitle: string) {
    console.log(`[eBay Push] Starting update for User: ${userId}, Item: ${itemId}`);

    // 1. Get Token from DB
    const { data: tokenData, error: tokenError } = await supabase
        .from('ebay_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (tokenError || !tokenData) {
        throw new Error('eBay account not connected');
    }

    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.access_token_expires_at);

    // 2. Check if token is expired (with 5 min buffer)
    if (expiresAt.getTime() <= Date.now() + 5 * 60 * 1000) {
        console.log('[eBay Push] Token expired or expiring soon, refreshing...');
        const refreshed = await refreshAccessToken(tokenData.refresh_token);

        accessToken = refreshed.access_token;
        const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

        // Update DB with new token
        await supabase
            .from('ebay_tokens')
            .update({
                access_token: accessToken,
                access_token_expires_at: newExpiresAt,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
    }

    // 3. Call eBay Trading API (ReviseFixedPriceItem)
    const isSandbox = process.env.EBAY_API_BASE_URL?.includes('sandbox');
    const endpoint = isSandbox
        ? 'https://api.sandbox.ebay.com/ws/api.dll'
        : 'https://api.ebay.com/ws/api.dll';

    const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<ReviseFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <Item>
    <ItemID>${itemId}</ItemID>
    <Title>${newTitle.slice(0, 80)}</Title>
  </Item>
</ReviseFixedPriceItemRequest>`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'X-EBAY-API-SITEID': '0', // US
            'X-EBAY-API-COMPATIBILITY-LEVEL': '1111',
            'X-EBAY-API-CALL-NAME': 'ReviseFixedPriceItem',
            'X-EBAY-API-IAF-TOKEN': accessToken,
            'Content-Type': 'text/xml',
        },
        body: xmlBody
    });

    const resultText = await response.text();
    console.log('[eBay Push] API Response:', resultText);

    if (!response.ok || resultText.includes('<Ack>Failure</Ack>') || resultText.includes('<Ack>PartialFailure</Ack>')) {
        // Simple regex to pluck error message from XML
        const errorMsgMatch = resultText.match(/<LongMessage>(.*?)<\/LongMessage>/);
        const errorMsg = errorMsgMatch ? errorMsgMatch[1] : 'Unknown eBay API error';
        throw new Error(errorMsg);
    }

    return { success: true };
}
