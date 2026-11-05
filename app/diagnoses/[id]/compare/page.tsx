export const instant = false;

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CompareClient from '@/components/compare-client';
import { PageHeader } from '@/components/ui';
import type { DiagnosisInputs, DiagnosisResults } from '@/lib/engine';

export default async function ComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row } = await supabase
    .from('diagnoses')
    .select('id, campaign_name, inputs, results, created_at')
    .eq('id', id)
    .maybeSingle();

  if (!row) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Compare old vs new"
        sub={`Baseline: “${row.campaign_name as string}” — enter fresh numbers to see what improved after your changes.`}
        actions={
          <Link href={`/diagnoses/${id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500">
            ← Back to diagnosis
          </Link>
        }
      />
      <CompareClient
        baseInputs={row.inputs as DiagnosisInputs}
        baseResults={row.results as DiagnosisResults}
      />
    </div>
  );
}
