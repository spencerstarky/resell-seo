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
    const authUrl = await getEbayAuthUrl(user.id);

    // --- Calculate Usage Limits ---
    let tier = profile?.plan_tier || 'free';
    if (user.email === 'resellseo@gmail.com') tier = 'pro'; // Admin Override

    let limit = 25;
    let isMonthly = false;

    if (tier === 'starter') {
        limit = 400;
        isMonthly = true;
    } else if (tier === 'pro') {
        limit = 1200;
        isMonthly = true;
    }

    const query = supabase
        .from('optimization_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

    if (isMonthly) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        query.gte('created_at', startOfMonth.toISOString());
    }

    const { count: usageCount } = await query;
    const usageStats = {
        count: usageCount || 0,
        limit,
        tier,
        isMonthly
    };
    // ------------------------------

    return (
        <div className="container" style={{ padding: '0 1.5rem' }}>
            <DashboardClient
                initialIsConnected={isConnected}
                authUrl={authUrl}
                userProfile={profile}
                initialListings={savedListings || []}
                userId={user.id}
                userEmail={user.email}
                usageStats={usageStats}
            />
        </div>
    );
}
