export const instant = false;

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader } from '@/components/ui';
import CompareAllClient from '@/components/compare-all-client';
import type { DiagnosisSummary } from '@/lib/compare';
import type { DiagnosisInputs, DiagnosisResults, Verdict } from '@/lib/engine';

interface DiagnosisRow {
  id: string;
  campaign_name: string;
  verdict: Verdict;
  inputs: DiagnosisInputs;
  results: DiagnosisResults;
  created_at: string;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ earlier?: string; later?: string }>;
}) {
  const { earlier, later } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // proxy already redirected; belt & braces

  const { data: rows } = await supabase
    .from('diagnoses')
    .select('id, campaign_name, verdict, inputs, results, created_at')
    .order('created_at', { ascending: false });

  const summaries: DiagnosisSummary[] = ((rows ?? []) as DiagnosisRow[]).map((r) => ({
    id: r.id,
    campaignName: r.campaign_name,
    verdict: r.verdict,
    createdAt: r.created_at,
    inputs: r.inputs,
    results: r.results,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Compare diagnoses"
        sub="Pick any two saved diagnoses and see, side by side, what actually improved — verdict, ROAS, CPA, creative and the funnel. The best pair (your latest diagnosis and the previous one for the same campaign) is suggested for you."
        actions={
          <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500">
            ← Dashboard
          </Link>
        }
      />

      {summaries.length === 0 ? (
        <EmptyState
          title="Nothing to compare yet"
          sub="Run two diagnoses of the same campaign — today, and again after a week or so of changes — and this page will show you exactly what moved."
          action={
            <Link href="/diagnose" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 px-6 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_-6px] shadow-lime-400/40 transition hover:from-lime-300 hover:to-emerald-300">
              Run your first diagnosis
            </Link>
          }
        />
      ) : (
        <CompareAllClient rows={summaries} initialEarlierId={earlier ?? null} initialLaterId={later ?? null} />
      )}
    </div>
  );
}
