
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // 1. Handle eBay Verification Challenge
        if (body.challengeCode) {
            console.log('[eBay Notification] Received Verification Challenge');

            // Trim token to avoid copy-paste errors
            const verificationToken = process.env.EBAY_VERIFICATION_TOKEN?.trim();

            // Robust endpoint calculation to prevent mismatch errors
            const host = request.headers.get('host') || 'resell-seo.vercel.app';
            const protocol = request.headers.get('x-forwarded-proto') || 'https';
            // IMPORTANT: eBay requires the endpoint to match EXACTLY what is in the portal.
            // Ensure no trailing slash is being used.
            const endpoint = `${protocol}://${host}/api/ebay/notification`;

            console.log(`[eBay Notification] Verifying for endpoint: ${endpoint}`);
            console.log(`[eBay Notification] Using Verification Token: ${verificationToken ? '*** (Found)' : 'MISSING'}`);

            if (!verificationToken) {
                console.error('Missing EBAY_VERIFICATION_TOKEN in Vercel');
                return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
            }

            // eBay Requirement: SHA256(challengeCode + verificationToken + endpoint)
            const hash = crypto.createHash('sha256');
            hash.update(body.challengeCode);
            hash.update(verificationToken);
            hash.update(endpoint);

            const challengeResponse = hash.digest('hex');

            return NextResponse.json({ challengeResponse }, { status: 200 });
        }

        // 2. Handle Actual Notifications (Account Deletion, etc.)
        console.log('[eBay Notification] Received Event:', JSON.stringify(body, null, 2));

        return NextResponse.json({ status: 'ok' }, { status: 200 });

    } catch (error: any) {
        console.error('[eBay Notification] Error:', error.message);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
