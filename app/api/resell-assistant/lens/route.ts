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
        
        // Parallel Execution: SerpAPI for Visual Grid + Gemini 1.5 Flash for AI Overview
        const fetchLens = fetch(lensApiUrl).then(res => res.json());
        
        const fetchGeminiOverview = async () => {
            if (!process.env.GEMINI_API_KEY) return null;
            try {
                const imgRes = await fetch(targetUrl);
                const arrayBuffer = await imgRes.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
                
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const prompt = "Identify the main product in this image in exactly one short sentence. You MUST read any tags, collars, or logos to definitively state the Brand Name. Start your sentence with 'This appears to be...'. Keep it under 15 words.";
                
                const result = await model.generateContent([
                    prompt, 
                    { inlineData: { data: buffer.toString('base64'), mimeType } }
                ]);
                return result.response.text().trim();
            } catch (e) {
                console.error("[Lens API] Gemini parallel fallback failed", e);
                return null;
            }
        };

        const [lensData, geminiOverview] = await Promise.all([fetchLens, fetchGeminiOverview()]);

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

        // Construct AI Overview
        let aiOverview = { title: '', subtitle: '' };
        
        if (geminiOverview) {
            // Gemini 1.5 Flash completely bypasses the visual similarity flaw by reading the tag directly!
            aiOverview.title = geminiOverview;
        } else if (lensData.knowledge_graph && lensData.knowledge_graph.length > 0) {
            aiOverview.title = lensData.knowledge_graph[0].title || '';
            aiOverview.subtitle = lensData.knowledge_graph[0].subtitle || '';
        } else if (visualMatches.length > 0) {
            // Absolute last resort fallback
            let bestMatch = visualMatches.find((m: any) => 
                m.source.toLowerCase().includes('ebay') || 
                m.source.toLowerCase().includes('poshmark')
            ) || visualMatches[0];
            let cleanTitle = bestMatch.title.split(' - ')[0].split(' | ')[0];
            aiOverview.title = cleanTitle.trim();
        }

        return NextResponse.json({
            success: true,
            visualMatches,
            aiOverview
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
