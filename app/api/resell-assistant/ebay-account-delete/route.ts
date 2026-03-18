import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Handle eBay Marketplace Account Deletion Notifications
 * eBay requires all developers to provide an endpoint for account deletion requests
 * to comply with privacy laws (GDPR/CCPA).
 */

// Handle POST payload (The actual deletion notification)
export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();
        console.log('[eBay Notification] Received Account Deletion Request:', JSON.stringify(payload, null, 2));

        // We do not store user data, so there is nothing to delete.
        // We just need to Acknowledge the receipt by returning 200 OK.
        return new NextResponse('OK', { status: 200 });
    } catch (error) {
        console.error('[eBay Notification] Error processing deletion request:', error);
        return NextResponse.json({ error: 'Internal server error while processing notification' }, { status: 500 });
    }
}

// Handle GET challenge (eBay Verification Step when adding the URL)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const challengeCode = searchParams.get('challenge_code');

    if (challengeCode) {
        const verificationToken = process.env.EBAY_VERIFICATION_TOKEN || 'resell-assistant-verification-token';
        // Reconstruct the endpoint URL cleanly (without search query)
        const endpointUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}${req.nextUrl.pathname}`;

        const hash = crypto.createHash('sha256');
        hash.update(challengeCode);
        hash.update(verificationToken);
        hash.update(endpointUrl);
        const responseHash = hash.digest('hex');

        return NextResponse.json({ challengeResponse: responseHash });
    } else {
        return new NextResponse('eBay Account Deletion Webhook is active.', { status: 200 });
    }
}
