import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BILLING_ENABLED, getStripe } from '@/lib/stripe';

/** Create a Stripe Checkout session for the Pro subscription (TEST mode). */
export async function POST() {
  if (!BILLING_ENABLED) {
    return NextResponse.json({ error: 'Billing is disabled.' }, { status: 503 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!priceId || !appUrl) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const stripe = getStripe();
  let customerId = profile?.stripe_customer_id as string | null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?success=1`,
    cancel_url: `${appUrl}/billing?canceled=1`,
    subscription_data: { metadata: { supabase_user_id: user.id } },
    metadata: { supabase_user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}
