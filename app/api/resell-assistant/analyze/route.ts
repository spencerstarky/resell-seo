import { NextRequest, NextResponse } from 'next/server';
import { identifyProduct } from '@/lib/resell-assistant/services/visionService';
import { searchActiveListings } from '@/lib/resell-assistant/services/ebayService';
import { computeMarketData } from '@/lib/resell-assistant/services/analysisService';
import { generateTitle } from '@/lib/resell-assistant/services/titleService';

// Allow CORS preflight specifically for this endpoint (so the Chrome ext can call it)
export async function OPTIONS() {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const files: File[] = formData.getAll('images') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json(
                { error: 'No images provided. Please upload at least one image.' },
                { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        console.log(`[Analyze] Processing ${files.length} image(s)...`);

        // Step 1: Identify product from images using vision model
        const detectedItem = await identifyProduct(files);
        console.log('[Analyze] Detected item:', detectedItem.productName);

        // Step 2: Search eBay for comparable active listings
        const searchQuery = detectedItem.keywords || detectedItem.productName;
        const activeListings = await searchActiveListings(searchQuery);
        console.log(`[Analyze] Found ${activeListings.length} active listing(s)`);

        // Step 3: Compute market analytics
        const marketData = computeMarketData(activeListings);

        // Step 4: Generate optimized title from listing data
        const suggestedTitle = generateTitle(activeListings, detectedItem);

        // Step 5: Pick top comps to display
        const comparables = activeListings.slice(0, 10).map(listing => ({
            title: listing.title,
            price: listing.price,
            image: listing.image,
            itemWebUrl: listing.itemWebUrl,
            condition: listing.condition,
        }));

        // Return combined results with CORS header
        const result = {
            detectedItem,
            marketData,
            suggestedTitle,
            comparables,
        };

        return NextResponse.json(result, {
            headers: { 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err: any) {
        console.error('[Analyze] Error:', err);
        return NextResponse.json(
            { error: err.message || 'Failed to analyze images. Please try again.' },
            { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    }
}
