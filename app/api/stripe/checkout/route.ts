import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // apiVersion: '2024-12-18.acacia', // Let SDK default
});

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!process.env.STRIPE_PRICE_ID_ANNUAL) {
            throw new Error('STRIPE_PRICE_ID_ANNUAL not configured');
        }

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID_ANNUAL,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/account?payment=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/account?payment=cancelled`,
            client_reference_id: user.id,
            metadata: {
                userId: user.id,
                userEmail: user.email || '',
            },
            customer_email: user.email, // Correct param name
        });

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error('[Stripe Checkout Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
