export const instant = false;

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getScreenshotUrl } from '@/lib/actions';
import DiagnosisReport from '@/components/diagnosis-report';
import ReportActions from '@/components/report-actions';
import { GhostButton, PageHeader } from '@/components/ui';
import DeleteButton from '@/components/delete-button';
import type { DiagnosisInputs, DiagnosisResults } from '@/lib/engine';
import { fmtDateTime } from '@/lib/format';

export default async function DiagnosisDetailPage({
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
    .from('diagnoses')
    .select('id, campaign_name, verdict, inputs, results, screenshot_path, created_at, source, meta_campaign_id, meta_date_range')
    .eq('id', id)
    .maybeSingle();

  if (!row) notFound();

  const screenshotUrl = await getScreenshotUrl(row.screenshot_path as string | null);
  const liveSource =
    row.source === 'meta'
      ? {
          campaignName: (row.meta_campaign_id as string | null) ?? (row.campaign_name as string),
          dateRange: row.meta_date_range as string | null,
        }
      : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        title={row.campaign_name as string}
        sub={`Diagnosed ${fmtDateTime(row.created_at as string)}`}
        actions={
          <>
            <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500">
              ← Dashboard
            </Link>
            <Link href={`/diagnoses/${id}/compare`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-lime-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
              Compare new data
            </Link>
            <DeleteButton id={id} campaignName={row.campaign_name as string} />
          </>
        }
      />
      <ReportActions
        inputs={row.inputs as DiagnosisInputs}
        results={row.results as DiagnosisResults}
        generatedAt={row.created_at as string}
      />
      <DiagnosisReport
        inputs={row.inputs as DiagnosisInputs}
        results={row.results as DiagnosisResults}
        screenshotUrl={screenshotUrl}
        liveSource={liveSource}
      />
      <div className="no-print mt-6 flex justify-end max-sm:[&>*]:w-full">
        <Link href={`/diagnoses/${id}/compare`} className="max-sm:block">
          <GhostButton className="w-full justify-center sm:w-auto">Compare with fresh numbers →</GhostButton>
        </Link>
      </div>
    </div>
  );
}
