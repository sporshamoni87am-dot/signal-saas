import Link from 'next/link';
import { getTrial } from '@/lib/actions';
import { TRIAL_DAYS } from '@/lib/trial';
import { Card } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * Friendly trial status banner. Shown on the dashboard (and anywhere else
 * useful). While billing is disabled this is the only access messaging.
 */
export default async function TrialBanner({ compact = false }: { compact?: boolean }) {
  const trial = await getTrial();

  if (trial.expired) {
    return (
      <Card className={cn('border-amber-400/40 bg-amber-400/5', !compact && 'mb-6')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-200">Your free trial has ended</p>
            <p className="mt-1 text-sm text-zinc-400">
              You can still view all your past diagnoses below — nothing is locked away.
              Paid plans are coming soon; creating new diagnoses is paused until then.
            </p>
          </div>
          <Link
            href="/billing"
            className="rounded-xl border border-amber-400/40 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-400/10"
          >
            See plans
          </Link>
        </div>
      </Card>
    );
  }

  const days = trial.daysLeft;
  const label =
    days >= 2
      ? `${days} days left in your free trial`
      : days === 1
        ? '1 day left in your free trial'
        : 'Your free trial ends today';

  return (
    <Card className={cn('flex flex-wrap items-center justify-between gap-3', !compact && 'mb-6')}>
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime-400" />
        </span>
        <div>
          <p className="text-sm font-semibold text-zinc-100">{label}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Full access · unlimited diagnoses · no credit card required
          </p>
        </div>
      </div>
      {!compact && (
        <div className="h-2 w-40 overflow-hidden rounded-full bg-zinc-800" title={`${TRIAL_DAYS}-day trial`}>
          <div
            className="h-full rounded-full bg-lime-400"
            style={{ width: `${Math.max(4, Math.min(100, (days / TRIAL_DAYS) * 100))}%` }}
          />
        </div>
      )}
    </Card>
  );
}
