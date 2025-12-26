import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
        }

        const { error } = await supabase
            .from('newsletter_subscribers')
            .insert([{ email }]);

        if (error) {
            if (error.code === '23505') { // Unique violation
                return NextResponse.json({ message: 'You are already subscribed!' }, { status: 200 });
            }
            throw error;
        }

        return NextResponse.json({ message: 'Welcome to the list!' }, { status: 200 });
    } catch (error: any) {
        console.error('Newsletter Subscribe Error:', error);
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
}
