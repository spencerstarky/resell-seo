
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // 1. Handle eBay Verification Challenge
        if (body.challengeCode) {
            console.log('[eBay Notification] Received Verification Challenge');

            const verificationToken = process.env.EBAY_VERIFICATION_TOKEN;
            const endpoint = `${process.env.NEXT_PUBLIC_BASE_URL}/api/ebay/notification`;

            if (!verificationToken) {
                console.error('Missing EBAY_VERIFICATION_TOKEN');
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
        // For now, we just log it to comply with the requirement.
        console.log('[eBay Notification] Received Event:', JSON.stringify(body, null, 2));

        return NextResponse.json({ status: 'ok' }, { status: 200 });

    } catch (error: any) {
        console.error('[eBay Notification] Error:', error.message);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
