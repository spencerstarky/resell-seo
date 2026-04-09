import { NextRequest, NextResponse } from 'next/server';
import { searchActiveListings, searchSoldListings } from '@/lib/resell-assistant/services/ebayService';
import { computeMarketData } from '@/lib/resell-assistant/services/analysisService';

export const maxDuration = 60;

// Handle CORS preflight explicitly for the proxy route
export async function OPTIONS() {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { compingQuery, condition } = body;

        if (!compingQuery) {
            return NextResponse.json(
                { error: 'compingQuery is required to execute a fast market bypass.' },
                { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        console.log(`[Refresh Market] Bypassing Gemini. Re-running logic for "${compingQuery}" under condition stricture: ${condition || 'all'}`);

        // Scrape both simultaneously utilizing the new optional condition parameter
        const [activeResult, soldResult] = await Promise.all([
            searchActiveListings(compingQuery, 50, condition),
            searchSoldListings(compingQuery, 15, condition)
        ]);

        console.log(`[Refresh Market] Fast index complete. True Active: ${activeResult.totalCount} | True Sold: ${soldResult.totalCount}`);

        const marketData = computeMarketData(activeResult, soldResult);

        const mapListing = (listing: any) => ({
            title: listing.title,
            price: listing.price,
            image: listing.image,
            itemWebUrl: listing.itemWebUrl,
            condition: listing.condition,
        });

        const activeComparables = activeResult.items.slice(0, 10).map(mapListing);
        const soldComparables = soldResult.items.slice(0, 10).map(mapListing);

        return NextResponse.json({
            marketData,
            activeComparables,
            soldComparables
        }, { headers: { 'Access-Control-Allow-Origin': '*' } });

    } catch (err: any) {
        console.error('[Refresh Market] Critical bypass failure:', err);
        return NextResponse.json(
            { error: err.message || 'Failed to refresh market statistical algorithms.' },
            { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    }
}
