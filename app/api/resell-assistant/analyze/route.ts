import { NextRequest, NextResponse } from 'next/server';
import { identifyProduct } from '@/lib/resell-assistant/services/visionService';
import { searchActiveListings } from '@/lib/resell-assistant/services/ebayService';
import { computeMarketData } from '@/lib/resell-assistant/services/analysisService';
import { generateTitle } from '@/lib/resell-assistant/services/titleService';
import { createClient } from '@supabase/supabase-js';

// Vercel Hobby Tier: Increase serverless execution timeout to max 60 seconds.
// Gemini analyzing 4+ images often exceeds the default 15s limit.
export const maxDuration = 60;

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
        const body = await req.json();
        const imageUrls = body.imageUrls as string[];

        if (!imageUrls || imageUrls.length === 0) {
            return NextResponse.json(
                { error: 'No images provided. Please upload at least one image.' },
                { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        console.log(`[Analyze] Pulling and processing ${imageUrls.length} image(s) from Storage...`);

        // Step 1: Identify product from image URLs using vision model
        const detectedItem = await identifyProduct(imageUrls);
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

        // Ephemeral Storage Lifecycle: Clean up the massive files from the bucket to retain $0 cloud costs!
        try {
            const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
            const pathsToWipe = imageUrls.map(url => {
                const parts = url.split('/');
                return parts[parts.length - 1]; // Extrapolate base filename
            });
            await supabaseAdmin.storage.from('resell-assistant-uploads').remove(pathsToWipe);
            console.log(`[Analyze] Storage cleared: ${pathsToWipe.length} ephemeral blob(s) wiped.`);
        } catch (cleanupErr) {
            console.error('[Analyze] Non-fatal cleanup bypass:', cleanupErr);
        }

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
