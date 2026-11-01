import Stripe from 'stripe';

/**
 * Master billing switch. The founder is launching with a free 30-day trial
 * and NO payment method required, so this is OFF for launch.
 *
 * - `BILLING_ENABLED=false` (default): zero Stripe calls happen, no Stripe UI
 *   is rendered, access is governed by the trial logic (profiles.trial_ends_at).
 *   Stripe code stays in the codebase but is never executed.
 * - `BILLING_ENABLED=true`: Stripe Checkout / portal / webhook are live and the
 *   free-plan limit below applies again. See README "Billing (for later)".
 */
export const BILLING_ENABLED = process.env.BILLING_ENABLED === 'true';

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!BILLING_ENABLED) {
    throw new Error('Billing is disabled (BILLING_ENABLED is not true).');
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeSingleton;
}

/** Free plan: how many diagnoses a non-Pro user may save. */
export const FREE_DIAGNOSIS_LIMIT = 3;

/** Display price of the Pro plan. The real price lives in Stripe (price ID). */
export const PRO_PLAN_NAME = 'Pro';
