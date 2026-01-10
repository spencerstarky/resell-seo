import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // apiVersion: '2024-12-18.acacia',
});

// Admin client to bypass RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId) {
            console.log(`[Stripe Webhook] Upgrading user ${userId} to Annual Plan`);

            // Upgrade the user
            const { error } = await supabaseAdmin
                .from('profiles')
                .update({
                    plan_tier: 'annual',
                    // Optional: You could log the subscription ID here if you added a column for it
                })
                .eq('id', userId);

            if (error) {
                console.error('[Stripe Webhook] DB Update Failed:', error);
                return NextResponse.json({ error: 'DB Update Failed' }, { status: 500 });
            }
        }
    }

    return NextResponse.json({ received: true });
}
