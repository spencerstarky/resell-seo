import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getEbayAuthUrl } from '@/lib/ebay';
import DashboardClient from '@/components/DashboardClient';
import Header from '@/components/Header';

export default async function DashboardPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    console.log('[Dashboard] Server-side User:', user?.id ? 'Found' : 'Missing');

    if (!user) {
        redirect('/login');
    }

    const { data: token } = await supabase
        .from('ebay_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();

    // Fetch user profile stats
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // Fetch user's saved listings
    const { data: savedListings } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_index', { ascending: true });

    const isConnected = !!token;
    const authUrl = await getEbayAuthUrl();

    return (
        <div className="container" style={{ padding: '0 1.5rem' }}>
            <Header />
            <DashboardClient
                initialIsConnected={isConnected}
                authUrl={authUrl}
                userProfile={profile}
                initialListings={savedListings || []}
                userId={user.id}
            />
        </div>
    );
}
