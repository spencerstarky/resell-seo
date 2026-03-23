import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

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
        const { fileName } = body;

        if (!fileName) {
            return NextResponse.json({ error: 'Missing fileName' }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
        }

        // Generate a 15-minute single-use secure upload URL for the Chrome Extension
        const { data, error } = await supabaseAdmin.storage
            .from('resell-assistant-uploads')
            .createSignedUploadUrl(fileName);

        if (error) throw error;

        // Construct the public URL for retrieval later
        const { data: publicUrlData } = supabaseAdmin.storage
            .from('resell-assistant-uploads')
            .getPublicUrl(fileName);

        return NextResponse.json({
            signedUrl: data.signedUrl,
            publicUrl: publicUrlData.publicUrl
        }, {
            status: 200,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err: any) {
        console.error('[Upload URL Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
}
