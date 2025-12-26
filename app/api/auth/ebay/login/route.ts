import { NextResponse } from 'next/server';
import { getEbayAuthUrl } from '@/lib/ebay';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_BASE_URL));
    }

    try {
        const authUrl = await getEbayAuthUrl();
        return NextResponse.redirect(authUrl);
    } catch (error) {
        console.error('eBay Login Error:', error);
        return NextResponse.redirect(new URL('/account?error=ebay_init_failed', process.env.NEXT_PUBLIC_BASE_URL));
    }
}
