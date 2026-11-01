import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BILLING_ENABLED, getStripe } from '@/lib/stripe';

/** Create a Stripe Customer Portal session so users can manage/cancel. */
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const customerId = profile?.stripe_customer_id as string | null;
  if (!customerId) {
    return NextResponse.json({ error: 'No billing account yet — upgrade first.' }, { status: 400 });
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
