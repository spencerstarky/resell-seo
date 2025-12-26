import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/ebay';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
        console.error('eBay Callback Error:', error);
        return NextResponse.redirect(new URL('/dashboard?error=ebay_denied', process.env.NEXT_PUBLIC_BASE_URL));
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_BASE_URL));
    }

    try {
        const tokens = await exchangeCodeForTokens(code);

        // Save to Supabase
        const { error: dbError } = await supabase
            .from('ebay_tokens')
            .upsert({
                user_id: user.id,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                refresh_token_expires_at: new Date(Date.now() + tokens.refresh_token_expires_in * 1000).toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (dbError) throw dbError;

        return NextResponse.redirect(new URL('/dashboard?connected=ebay', process.env.NEXT_PUBLIC_BASE_URL));
    } catch (err: any) {
        console.error('Token Exchange Error:', err);
        return NextResponse.redirect(new URL(`/dashboard?error=token_exchange_failed&details=${encodeURIComponent(err.message)}`, process.env.NEXT_PUBLIC_BASE_URL));
    }
}
