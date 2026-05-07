import { NextRequest, NextResponse } from 'next/server';
import { identifyProduct } from '@/lib/resell-assistant/services/visionService';

export const maxDuration = 60;

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
        const { imageUrls, visualMatches } = body;

        if (!imageUrls || imageUrls.length === 0) {
            return NextResponse.json(
                { error: 'No images provided' },
                { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        const topMatches = visualMatches ? visualMatches.slice(0, 5).map((m: any) => m.title).filter(Boolean) : [];

        // Run full extraction using SerpAPI context to prevent double-billing
        const detectedItem = await identifyProduct(imageUrls, topMatches);

        return NextResponse.json({
            success: true,
            detectedItem
        }, {
            headers: { 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error: any) {
        console.error('[API Extract Error]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to extract AI overview' },
            { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    }
}
