import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
});

// Admin client to search users
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { email, returnUrl } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 });
        }

        // 1. Find Stripe Customer ID
        const customers = await stripe.customers.list({
            email: email,
            limit: 1,
        });

        if (customers.data.length === 0) {
            return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
        }

        const customerId = customers.data[0].id;

        // 2. Create Portal Session
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://resellseo.app',
        });

        return NextResponse.json({ url: session.url });

    } catch (e: any) {
        console.error('Portal Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
