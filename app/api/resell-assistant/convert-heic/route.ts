import { NextRequest, NextResponse } from 'next/server';
//@ts-ignore
import heicConvert from 'heic-convert';

export async function OPTIONS() {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        let buffer = Buffer.from(arrayBuffer);

        const isHeic = file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic');

        if (isHeic) {
            buffer = await heicConvert({
                buffer: buffer,
                format: 'JPEG',
                quality: 0.8 // Decent compression but high clarity
            });
        }

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (err: any) {
        console.error('[Convert HEIC] Error:', err);
        return NextResponse.json(
            { error: err.message || 'Failed to convert HEIC to JPEG' },
            { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    }
}
