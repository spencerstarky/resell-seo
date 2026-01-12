import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client to bypass RLS (if any) and ensure we can write to leads table
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
        }

        // Insert into leads table
        const { error } = await supabaseAdmin
            .from('leads')
            .insert({ email })
            .select();

        if (error) {
            // Handle duplicate email error (Postgres constraint violation)
            if (error.code === '23505') { // Unique violation
                return NextResponse.json({ message: "You're already subscribed!" });
            }
            console.error('Newsletter Error:', error);
            return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
        }

        return NextResponse.json({ message: "Thanks for subscribing!" });

    } catch (e: any) {
        console.error('Newsletter Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
