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

    const isConnected = !!token;
    const authUrl = await getEbayAuthUrl(user.id);

    // --- Calculate Usage Limits (Matches /api/optimize logic) ---
    let tier = profile?.plan_tier || 'trial';
    if (user.email === 'resellseo@gmail.com') tier = 'annual'; // Admin Override

    let limit = 25;
    let period: 'lifetime' | 'monthly' | 'yearly' = 'lifetime';

    if (tier === 'trial') {
        limit = 25; // Trial limit
        period = 'lifetime';
    } else if (tier === 'annual') {
        limit = 5000;
        period = 'yearly';
    }

    const query = supabase
        .from('optimization_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

    // Only filter by date for Annual plan (yearly reset)
    // Trial is lifetime, so no date filter needed
    if (period === 'yearly') {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        query.gte('created_at', startOfYear.toISOString());
    }

    const { count: usageCount } = await query;
    const usageStats = {
        count: usageCount || 0,
        limit,
        tier,
        isMonthly: false, // Deprecated but kept for type compatibility if needed downstream
        isYearly: period === 'yearly'
    };
    // ------------------------------

    let initialInventory = [];
    if (isConnected) {
        // Fetch Shadow Inventory with Pagination to bypass 1000 row limit
        let allItems: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from('ebay_inventory')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) {
                console.error('Inventory Fetch Error:', error);
                break;
            }

            if (data && data.length > 0) {
                allItems = [...allItems, ...data];
                if (data.length < pageSize) {
                    hasMore = false;
                } else {
                    page++;
                }
            } else {
                hasMore = false;
            }

            // Safety break
            if (page > 10) break;
        }

        initialInventory = allItems;
    }

    return (
        <div className="container" style={{ padding: '0 1.5rem' }}>
            <DashboardClient
                initialIsConnected={isConnected}
                authUrl={authUrl}
                userProfile={profile}
                initialInventory={initialInventory}
                userId={user.id}
                userEmail={user.email}
                usageStats={usageStats}
            />
        </div>
    );
}
