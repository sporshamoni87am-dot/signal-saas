export const instant = false;

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getTrial } from '@/lib/actions';
import { Card, EmptyState, PageHeader, VerdictBadge } from '@/components/ui';
import DeleteButton from '@/components/delete-button';
import SignOutButton from '@/components/signout-button';
import TrialBanner from '@/components/trial-banner';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import type { DiagnosisResults, Verdict } from '@/lib/engine';

interface DiagnosisRow {
  id: string;
  campaign_name: string;
  verdict: Verdict;
  inputs: Record<string, unknown>;
  results: DiagnosisResults;
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from('diagnoses')
    .select('id, campaign_name, verdict, inputs, results, created_at')
    .order('created_at', { ascending: false });

  const trial = await getTrial();
  const diagnoses = (rows ?? []) as DiagnosisRow[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Dashboard"
        sub={user?.email ? `Signed in as ${user.email}` : undefined}
        actions={
          <>
            {!trial.expired && (
              <Link href="/diagnose" className="rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
                + New diagnosis
              </Link>
            )}
            <Link href="/billing" className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500">
              Plans
            </Link>
            <SignOutButton />
          </>
        }
      />

      <TrialBanner />

      {diagnoses.length === 0 ? (
        <div>
          <EmptyState
            title="Your first diagnosis is 2 minutes away"
            sub="No numbers to type yet? Start with the sample campaign — a realistic D2C example that shows you exactly what the diagnosis tells you."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/diagnose?sample=1" className="inline-block rounded-xl bg-lime-400 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
                  ⚡ Try with a sample campaign
                </Link>
                <Link href="/diagnose" className="inline-block rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500">
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
                  <Link href={s.cta.href} className="mt-4 inline-block text-sm font-semibold text-lime-300 hover:text-lime-200">
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
              <Card key={d.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-zinc-100">{d.campaign_name}</h3>
                  <VerdictBadge verdict={d.verdict} size="sm" />
                </div>
                <p className="mt-1 text-xs text-zinc-500">{fmtDateTime(d.created_at)}</p>
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
                  <Link href={`/diagnoses/${d.id}`} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700">
                    View
                  </Link>
                  <Link href={`/diagnoses/${d.id}/compare`} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500">
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
    </div>
  );
}
