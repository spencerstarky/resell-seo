import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import AccountClient from '@/components/AccountClient';
import Header from '@/components/Header';
import { getEbayAuthUrl } from '@/lib/ebay';

export default async function AccountPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // Fetch eBay token status
    const { data: ebayToken } = await supabase
        .from('ebay_tokens')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

    const state = JSON.stringify({ u: user.id, r: '/account' });
    const authUrl = await getEbayAuthUrl(state);

    return (
        <div className="container" style={{ padding: '0 1.5rem' }}>
            <Header />
            <AccountClient
                user={user}
                profile={profile}
                hasEbayConnected={!!ebayToken}
                authUrl={authUrl}
            />
        </div>
    );
}
