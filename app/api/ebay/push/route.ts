import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { updateEbayListingTitle } from '@/lib/ebay-api';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // --- GATE: Pro Only ---
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan_tier')
            .eq('id', user.id)
            .single();

        let tier = profile?.plan_tier || 'free';

        // Admin Override for resellseo@gmail.com
        if (user.email === 'resellseo@gmail.com') {
            tier = 'pro';
        }

        if (tier !== 'pro') {
            return NextResponse.json(
                { error: 'Direct eBay Sync is a Pro feature. Please upgrade to unlock.' },
                { status: 403 }
            );
        }
        // ----------------------

        const { listingId } = await request.json();

        if (!listingId) {
            return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
        }

        // 1. Fetch listing details (Support both Inventory and Legacy Listings)
        let listing: any;
        let sourceTable = 'ebay_inventory';

        // Try Inventory First (Primary)
        const { data: invItem } = await supabase
            .from('ebay_inventory')
            .select('*')
            .eq('id', listingId)
            .eq('user_id', user.id)
            .single();

        if (invItem) {
            listing = invItem;
        } else {
            // Fallback to Legacy Listings
            sourceTable = 'listings';
            const { data: legItem } = await supabase
                .from('listings')
                .select('*')
                .eq('id', listingId)
                .eq('user_id', user.id)
                .single();
            listing = legItem;
        }

        if (!listing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        if (!listing.ebay_item_id) {
            return NextResponse.json({ error: 'This listing is not linked to an eBay item' }, { status: 400 });
        }

        if (!listing.optimized_title) {
            return NextResponse.json({ error: 'No optimized title exists for this listing' }, { status: 400 });
        }

        // 2. Call eBay API
        // Note: updateEbayListingTitle handles the auth token refresh internally
        await updateEbayListingTitle(user.id, listing.ebay_item_id, listing.optimized_title, supabase);

        // 3. Update Status in DB (Update the table where we found it)
        await supabase
            .from(sourceTable)
            .update({
                status: 'LIVE',  // Unified status
                updated_at: new Date().toISOString()
            })
            .eq('id', listingId);

        // Optional: If we updated Legacy, also try to update Inventory shadow copy if it exists by Item ID
        if (sourceTable === 'listings') {
            await supabase
                .from('ebay_inventory')
                .update({ status: 'LIVE', optimized_title: listing.optimized_title })
                .eq('ebay_item_id', listing.ebay_item_id);
        }

        return NextResponse.json({ success: true, message: 'Title updated on eBay!' });

    } catch (error: any) {
        console.error('[API eBay Push] Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to update eBay' }, { status: 500 });
    }
}
