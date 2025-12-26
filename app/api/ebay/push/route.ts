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

        const { listingId } = await request.json();

        if (!listingId) {
            return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
        }

        // 1. Fetch listing details from DB
        const { data: listing, error: listingError } = await supabase
            .from('listings')
            .select('*')
            .eq('id', listingId)
            .eq('user_id', user.id)
            .single();

        if (listingError || !listing) {
            return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
        }

        if (!listing.ebay_item_id) {
            return NextResponse.json({ error: 'This listing is not linked to an eBay item' }, { status: 400 });
        }

        if (!listing.optimized_title) {
            return NextResponse.json({ error: 'No optimized title exists for this listing' }, { status: 400 });
        }

        // 2. Call eBay API
        await updateEbayListingTitle(user.id, listing.ebay_item_id, listing.optimized_title);

        // 3. Update listing status in DB
        await supabase
            .from('listings')
            .update({ status: 'uploaded', updated_at: new Date().toISOString() })
            .eq('id', listingId);

        return NextResponse.json({ success: true, message: 'Title updated on eBay!' });

    } catch (error: any) {
        console.error('[API eBay Push] Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to update eBay' }, { status: 500 });
    }
}
