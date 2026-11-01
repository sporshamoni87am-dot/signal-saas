import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { BILLING_ENABLED, getStripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';

// Stripe needs the raw body to verify the signature.
// (Route handlers are dynamic by default; no segment config needed.)

interface SubLike {
  id: string;
  customer: string | Stripe.Customer | null;
  status: string;
  metadata?: Record<string, string>;
  items: { data: Array<{ price: { id: string } }> };
  current_period_end?: number;
}

async function syncSubscription(sub: SubLike) {
  const supabase = await createServiceClient();

  let userId = sub.metadata?.supabase_user_id;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;

  if (!userId && customerId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    userId = (profile?.id as string | undefined) ?? undefined;
  }

  if (!userId) {
    console.error('[stripe-webhook] could not resolve user for subscription', sub.id);
    return;
  }

  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: sub.status,
      price_id: sub.items.data[0]?.price.id ?? null,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    console.error('[stripe-webhook] subscription upsert failed:', error.message);
    throw new Error(error.message);
  }
}

export async function POST(req: Request) {
  if (!BILLING_ENABLED) {
    // Billing is off for the trial launch: acknowledge and ignore.
    // (Returning 200 avoids Stripe retries if an old endpoint is still registered.)
    return NextResponse.json({ received: true, billing: 'disabled' });
  }
  const stripe = getStripe();
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const sub = (await stripe.subscriptions.retrieve(
            session.subscription as string,
          )) as unknown as SubLike;
          // Ensure our user id is attached even if subscription_data metadata was missed.
          sub.metadata = { ...(sub.metadata ?? {}), ...(session.metadata ?? {}) };
          await syncSubscription(sub);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscription(event.data.object as unknown as SubLike);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err);
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
