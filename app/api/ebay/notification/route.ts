
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function generateChallengeResponse(challengeCode: string, verificationToken: string, endpoint: string) {
    const hash = crypto.createHash('sha256');
    hash.update(challengeCode);
    hash.update(verificationToken);
    hash.update(endpoint);
    return hash.digest('hex');
}

export async function GET(request: NextRequest) {
    try {
        const challengeCode = request.nextUrl.searchParams.get('challenge_code');

        if (challengeCode) {
            console.log('[eBay Notification] Received Verification Challenge (GET)');
            console.log('Challenge Code:', challengeCode);

            const verificationToken = process.env.EBAY_VERIFICATION_TOKEN?.trim();
            const host = request.headers.get('host') || 'resell-seo.vercel.app';
            const protocol = request.headers.get('x-forwarded-proto') || 'https';
            const endpoint = `${protocol}://${host}/api/ebay/notification`;

            console.log(`[eBay Notification] Verifying for endpoint: ${endpoint}`);

            if (!verificationToken) {
                console.error('Missing EBAY_VERIFICATION_TOKEN');
                return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
            }

            const challengeResponse = generateChallengeResponse(challengeCode, verificationToken, endpoint);
            return NextResponse.json({ challengeResponse }, { status: 200 });
        }

        return NextResponse.json({ status: 'ok' });
    } catch (error: any) {
        console.error('[eBay GET Error]', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Support POST-based verification as well (just in case)
        const challengeCode = body.challengeCode || body.challenge_code;

        if (challengeCode) {
            console.log('[eBay Notification] Received Verification Challenge (POST)');

            const verificationToken = process.env.EBAY_VERIFICATION_TOKEN?.trim();
            const host = request.headers.get('host') || 'resell-seo.vercel.app';
            const protocol = request.headers.get('x-forwarded-proto') || 'https';
            const endpoint = `${protocol}://${host}/api/ebay/notification`;

            if (!verificationToken) {
                console.error('Missing EBAY_VERIFICATION_TOKEN');
                return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
            }

            const challengeResponse = generateChallengeResponse(challengeCode, verificationToken, endpoint);
            return NextResponse.json({ challengeResponse }, { status: 200 });
        }

        console.log('[eBay Notification] Received Event (POST):', JSON.stringify(body, null, 2));

        return NextResponse.json({ status: 'ok' }, { status: 200 });

    } catch (error: any) {
        console.error('[eBay POST Error]', error.message);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
