export const instant = false;

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ForecastReport from '@/components/forecast-report';
import DeleteForecastButton from '@/components/delete-forecast-button';
import { PageHeader } from '@/components/ui';
import type { ForecastInputs, ForecastResults } from '@/lib/forecast';
import { fmtDateTime } from '@/lib/format';

export default async function ForecastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // proxy already redirected; belt & braces

  const { data: row } = await supabase
    .from('forecasts')
    .select('id, campaign_name, inputs, results, created_at, source, meta_campaign_id, meta_date_range')
    .eq('id', id)
    .maybeSingle();

  if (!row) notFound();

  const range = (row.meta_date_range as string | null)?.split(' → ') ?? [];
  const liveSource =
    row.source === 'meta'
      ? {
          objectName: (row.meta_campaign_id as string | null) ?? (row.campaign_name as string),
          since: range[0] ?? undefined,
          until: range[1] ?? undefined,
        }
      : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        title={row.campaign_name as string}
        sub={`Forecasted ${fmtDateTime(row.created_at as string)}`}
        actions={
          <>
            <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500">
              ← Dashboard
            </Link>
            <DeleteForecastButton id={id} redirectTo="/dashboard?deleted=forecast" />
          </>
        }
      />
      <ForecastReport
        inputs={row.inputs as ForecastInputs}
        results={row.results as ForecastResults}
        liveSource={liveSource}
        generatedAt={row.created_at as string}
      />
      <div className="no-print mt-6 flex justify-end">
        <Link href="/forecast" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
          Run a new forecast →
        </Link>
      </div>
    </div>
  );
}
