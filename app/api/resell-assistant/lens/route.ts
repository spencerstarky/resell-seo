import { NextResponse } from 'next/server';

export const maxDuration = 60; // Allow 60 seconds

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageUrls } = body;

        if (!imageUrls || imageUrls.length === 0) {
            return NextResponse.json({ error: 'No image URLs provided' }, { status: 400 });
        }

        if (!process.env.SERPAPI_API_KEY) {
            return NextResponse.json({ error: 'SERPAPI_API_KEY is missing' }, { status: 500 });
        }

        const targetUrl = imageUrls[0];
        const lensApiUrl = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(targetUrl)}&api_key=${process.env.SERPAPI_API_KEY}`;
        
        const lensRes = await fetch(lensApiUrl);
        
        if (!lensRes.ok) {
            throw new Error(`SerpAPI returned ${lensRes.status}`);
        }

        const lensData = await lensRes.json();
        
        // Extract top visual matches
        let visualMatches = [];
        if (lensData.visual_matches && lensData.visual_matches.length > 0) {
            visualMatches = lensData.visual_matches.slice(0, 8).map((m: any) => ({
                title: m.title || 'Unknown Item',
                link: m.link || '',
                thumbnail: m.thumbnail || '',
                price: m.price ? m.price.extracted_value : null,
                source: m.source || 'Web'
            }));
        }

        return NextResponse.json({
            success: true,
            visualMatches
        });

    } catch (error: any) {
        console.error('[API Lens Error]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process Google Lens search' },
            { status: 500 }
        );
    }
}
