import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const maxDuration = 60; // Allow 60 seconds

// Allow CORS preflight specifically for this endpoint (so the Chrome ext can call it)
export async function OPTIONS() {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageUrls } = body;

        if (!imageUrls || imageUrls.length === 0) {
            return NextResponse.json(
                { error: 'No image URLs provided' }, 
                { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        if (!process.env.SERPAPI_API_KEY) {
            return NextResponse.json(
                { error: 'SERPAPI_API_KEY is missing' }, 
                { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        const targetUrl = imageUrls[0];
        const lensApiUrl = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(targetUrl)}&api_key=${process.env.SERPAPI_API_KEY}`;
        
        // Free Tier Visual Search (Fast)
        const fetchLens = fetch(lensApiUrl).then(res => res.json());
        const lensData = await fetchLens;

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
        }, {
            headers: { 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error: any) {
        console.error('[API Lens Error]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process Google Lens search' },
            { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    }
}
