export const instant = false;

import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getTrial } from '@/lib/actions';
import { Card, EmptyState, PageHeader, VerdictBadge } from '@/components/ui';
import DeleteButton from '@/components/delete-button';
import DeleteForecastButton from '@/components/delete-forecast-button';
import SignOutButton from '@/components/signout-button';
import TrialBanner from '@/components/trial-banner';
import MetaConnect from '@/components/meta-connect';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import type { DiagnosisResults, Verdict } from '@/lib/engine';
import type { ForecastResults } from '@/lib/forecast';

interface DiagnosisRow {
  id: string;
  campaign_name: string;
  verdict: Verdict;
  inputs: Record<string, unknown>;
  results: DiagnosisResults;
  created_at: string;
}

interface ForecastRow {
  id: string;
  campaign_name: string;
  inputs: Record<string, unknown>;
  results: ForecastResults;
  created_at: string;
}

const FIRST_STEPS = [
  {
    n: '1',
    title: 'Try the sample campaign',
    body: 'One click, zero typing: see a full diagnosis on realistic D2C numbers and learn what every section tells you.',
    cta: { href: '/diagnose?sample=1', label: 'Run the sample diagnosis' },
  },
  {
    n: '2',
    title: 'Diagnose a real campaign',
    body: 'Copy 10 numbers from Ads Manager (spend, clicks, purchases…), add your breakeven ROAS, and get your verdict in two minutes.',
    cta: { href: '/diagnose', label: 'New diagnosis' },
  },
  {
    n: '3',
    title: 'Act, then compare in a week',
    body: 'Work through the action items in Ads Manager, come back with fresh numbers, and see side-by-side whether it improved.',
    cta: null,
  },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  const deletedNote =
    deleted === 'diagnosis'
      ? 'Diagnosis deleted.'
      : deleted === 'forecast'
        ? 'Forecast deleted.'
        : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from('diagnoses')
    .select('id, campaign_name, verdict, inputs, results, created_at')
    .order('created_at', { ascending: false });

  // The forecasts table lands with migration 004 — until it has run, this
  // query errors and the section simply renders empty instead of breaking
  // the dashboard.
  const { data: forecastRows, error: forecastError } = await supabase
    .from('forecasts')
    .select('id, campaign_name, inputs, results, created_at')
    .order('created_at', { ascending: false });

  const trial = await getTrial();
  const diagnoses = (rows ?? []) as DiagnosisRow[];
  const forecasts = (forecastError ? [] : (forecastRows ?? [])) as ForecastRow[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Dashboard"
        sub={user?.email ? `Signed in as ${user.email}` : undefined}
        actions={
          <>
            {!trial.expired && (
              <>
                <Link href="/diagnose" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
                  + New diagnosis
                </Link>
                <Link href="/forecast" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-lime-400/60 bg-lime-400/10 px-5 py-2.5 text-sm font-semibold text-lime-200 transition hover:bg-lime-400/20">
                  + New forecast
                </Link>
              </>
            )}
            <Link href="/billing" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500">
              Plans
            </Link>
            <SignOutButton />
          </>
        }
      />

      <TrialBanner />

      {deletedNote && (
        <p className="mb-6 rounded-xl border border-lime-400/40 bg-lime-400/5 px-4 py-3 text-sm text-lime-200">
          ✓ {deletedNote}
        </p>
      )}

      {/* Meta connection (read-only live data). Suspense: MetaConnect reads
          search params (?meta=connected / ?meta_error=…). */}
      <div className="mb-6">
        <Suspense
          fallback={
            <Card>
              <p className="animate-pulse text-sm text-zinc-500">Checking Meta connection…</p>
            </Card>
          }
        >
          <MetaConnect next="/dashboard" />
        </Suspense>
      </div>

      {diagnoses.length === 0 ? (
        <div>
          <EmptyState
            title="Your first diagnosis is 2 minutes away"
            sub="No numbers to type yet? Start with the sample campaign — a realistic D2C example that shows you exactly what the diagnosis tells you."
            action={
              <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link href="/diagnose?sample=1" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-lime-400 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
                  ⚡ Try with a sample campaign
                </Link>
                <Link href="/diagnose" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500">
                  Enter my own numbers
                </Link>
              </div>
            }
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {FIRST_STEPS.map((s) => (
              <Card key={s.n} className="relative">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-400/15 text-sm font-bold text-lime-300">
                  {s.n}
                </span>
                <h3 className="mt-3 font-semibold text-zinc-100">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{s.body}</p>
                {s.cta && (
                  <Link href={s.cta.href} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-lime-300 hover:text-lime-200">
                    {s.cta.label} →
                  </Link>
                )}
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {diagnoses.map((d) => {
            const roas = d.results?.adSignals?.find((s) => s.key === 'roas');
            const spend = (d.inputs?.adSpend as number | null) ?? null;
            return (
              <Card key={d.id} className="flex flex-col transition-colors hover:border-zinc-700">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 break-words font-semibold text-zinc-100">{d.campaign_name}</h3>
                  <span className="shrink-0">
                    <VerdictBadge verdict={d.verdict} size="sm" />
                  </span>
                </div>
                <p className="mt-1 break-words text-xs text-zinc-500">{fmtDateTime(d.created_at)}</p>
                <div className="mt-4 flex gap-6 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500">ROAS</p>
                    <p className="font-mono font-semibold text-zinc-100">{roas?.display ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Spend</p>
                    <p className="font-mono font-semibold text-zinc-100">{fmtMoney(spend)}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-4">
                  <Link href={`/diagnoses/${d.id}`} className="inline-flex min-h-11 items-center rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700">
                    View
                  </Link>
                  <Link href={`/diagnoses/${d.id}/compare`} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500">
                    Compare new data
                  </Link>
                  <span className="ml-auto">
                    <DeleteButton id={d.id} campaignName={d.campaign_name} />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Saved forecasts */}
      <div className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-100">Forecasts</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Early-stage projections — how a young campaign is likely to land at full budget.
            </p>
          </div>
          {!trial.expired && (
            <Link href="/forecast" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-lime-400/60 bg-lime-400/10 px-4 py-2 text-sm font-semibold text-lime-200 transition hover:bg-lime-400/20">
              + New forecast
            </Link>
          )}
        </div>

        {forecasts.length === 0 ? (
          <Card>
            <p className="text-sm font-semibold text-zinc-100">No forecasts saved yet</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              Spent $500 of a $5,000 budget and wondering how it lands? Run a forecast — the
              learning-phase gate tells you whether the numbers are even ready to judge yet.
            </p>
            <Link href="/forecast?sample=1" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-lime-300 hover:text-lime-200">
              Try the sample forecast →
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {forecasts.map((f) => {
              const spend = (f.inputs?.spentSoFar as number | null) ?? null;
              const fullRoas = f.results?.fullRoas;
              const fullPurchases = f.results?.fullPurchases;
              return (
                <Card key={f.id} className="flex flex-col transition-colors hover:border-zinc-700">
                  <h3 className="min-w-0 break-words font-semibold text-zinc-100">{f.campaign_name}</h3>
                  <p className="mt-1 break-words text-xs text-zinc-500">{fmtDateTime(f.created_at)}</p>
                  <p className="mt-3 text-sm font-medium text-zinc-200">{f.results?.guidance?.headline ?? 'Forecast'}</p>
                  <div className="mt-4 flex gap-6 text-sm">
                    <div>
                      <p className="text-xs text-zinc-500">Full-budget ROAS</p>
                      <p className="font-mono font-semibold text-zinc-100">
                        {fullRoas !== null && fullRoas !== undefined ? `${fullRoas.toFixed(2)}×` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Full-budget purchases</p>
                      <p className="font-mono font-semibold text-zinc-100">
                        {fullPurchases !== null && fullPurchases !== undefined ? fullPurchases.toFixed(1) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Spent</p>
                      <p className="font-mono font-semibold text-zinc-100">{fmtMoney(spend)}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-4">
                    <Link href={`/forecasts/${f.id}`} className="inline-flex min-h-11 items-center rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700">
                      View
                    </Link>
                    <span className="ml-auto">
                      <DeleteForecastButton id={f.id} />
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
