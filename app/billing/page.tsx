export const instant = false;

import Link from 'next/link';
import { getTrial } from '@/lib/actions';
import { TRIAL_DAYS } from '@/lib/trial';
import { BILLING_ENABLED } from '@/lib/stripe';
import { Card, PageHeader } from '@/components/ui';
import TrialBanner from '@/components/trial-banner';

/**
 * Plans page.
 *
 * Trial launch (BILLING_ENABLED=false): shows the trial status and notes that
 * paid plans are coming soon. No checkout, no card collection, no paywall.
 *
 * Billing phase (BILLING_ENABLED=true): this page should be extended to render
 * the Stripe UpgradeButton / PortalButton again (see components/billing-buttons.tsx,
 * kept in the codebase for that purpose).
 */
export default async function BillingPage() {
  const trial = await getTrial();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader title="Plans" sub="Your access, and what's coming next." />

      <TrialBanner compact />

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-400">Current access</p>
            <p className="mt-1 text-2xl font-bold text-zinc-50">
              {trial.expired ? 'Trial ended' : 'Free trial'}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {trial.expired
                ? `Your ${TRIAL_DAYS}-day trial has ended. You can keep viewing your past diagnoses.`
                : `${Math.max(trial.daysLeft, 0)} of ${TRIAL_DAYS} days remaining · unlimited diagnoses · no credit card.`}
            </p>
          </div>
        </div>
      </Card>

      <Card className="mt-4 border-dashed">
        <h3 className="font-semibold text-zinc-100">Paid plans — coming soon</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          We&apos;re launching with a free trial while we learn what buyers need most.
          When paid plans arrive, your saved diagnoses and history come with you —
          nothing gets locked away or deleted.
        </p>
        <p className="mt-3 text-sm text-zinc-500">
          Want a heads-up? Keep diagnosing — we&apos;ll announce plans inside the app.
        </p>
      </Card>

      {BILLING_ENABLED && (
        <p className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Note: BILLING_ENABLED=true but this page hasn&apos;t been re-wired to Stripe checkout yet.
          See the comment at the top of this file.
        </p>
      )}

      <p className="mt-6 text-center text-xs text-zinc-600">
        <Link href="/dashboard" className="underline underline-offset-2 hover:text-zinc-400">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
