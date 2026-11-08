'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  buildMetricRows,
  compareStatus,
  compareSummary,
  dayGap,
  suggestPair,
  DIRECTIONAL_GAP_DAYS,
  type CompareRow,
  type DiagnosisSummary,
} from '@/lib/compare';
import { VERDICT_META } from '@/lib/engine';
import { fmtDate } from '@/lib/format';
import { Card, GhostButton, SectionTitle, VerdictBadge, inputClassName } from '@/components/ui';
import { cn } from '@/lib/cn';

function DeltaCell({ row }: { row: CompareRow }) {
  const arrow = row.direction === 'up' ? '↑' : row.direction === 'down' ? '↓' : row.direction === 'same' ? '→' : '';
  return (
    <span
      className={cn(
        'font-mono font-semibold',
        row.good === true && 'text-emerald-300',
        row.good === false && 'text-red-300',
        row.good === null && 'text-zinc-500',
      )}
    >
      {arrow && `${arrow} `}
      {row.deltaText}
    </span>
  );
}

export default function CompareAllClient({
  rows,
  initialEarlierId,
  initialLaterId,
}: {
  rows: DiagnosisSummary[];
  initialEarlierId: string | null;
  initialLaterId: string | null;
}) {
  const router = useRouter();
  const suggestion = useMemo(() => suggestPair(rows), [rows]);

  const validId = (id: string | null) => (id && rows.some((r) => r.id === id) ? id : null);
  const [earlierId, setEarlierId] = useState<string | null>(() => validId(initialEarlierId) ?? suggestion.earlierId);
  const [laterId, setLaterId] = useState<string | null>(() => validId(initialLaterId) ?? suggestion.laterId);

  // Group by campaign name, newest first — the pickers read like a history.
  const groups = useMemo(() => {
    const map = new Map<string, DiagnosisSummary[]>();
    for (const r of rows) {
      const g = map.get(r.campaignName) ?? [];
      g.push(r);
      map.set(r.campaignName, g);
    }
    return [...map.entries()];
  }, [rows]);

  const earlier = rows.find((r) => r.id === earlierId) ?? null;
  const later = rows.find((r) => r.id === laterId) ?? null;
  const sameRow = earlier !== null && later !== null && earlier.id === later.id;
  const comparable = earlier !== null && later !== null && !sameRow;
  const status = comparable ? compareStatus(earlier.results, later.results) : null;
  const summary = comparable ? compareSummary(earlier.results, later.results) : null;
  const gap = comparable ? dayGap(earlier.createdAt, later.createdAt) : 0;
  const differentCampaigns = comparable && earlier.campaignName !== later.campaignName;
  const metricRows = comparable ? buildMetricRows(earlier.inputs, earlier.results, later.inputs, later.results) : [];

  function pick(which: 'earlier' | 'later', id: string) {
    const nextEarlier = which === 'earlier' ? id : earlierId;
    const nextLater = which === 'later' ? id : laterId;
    if (which === 'earlier') setEarlierId(id || null);
    else setLaterId(id || null);
    const qs = new URLSearchParams();
    if (nextEarlier) qs.set('earlier', nextEarlier);
    if (nextLater) qs.set('later', nextLater);
    router.replace(`/compare?${qs.toString()}`);
  }

  function swap() {
    const e = earlierId;
    const l = laterId;
    setEarlierId(l);
    setLaterId(e);
    const qs = new URLSearchParams();
    if (l) qs.set('earlier', l);
    if (e) qs.set('later', e);
    router.replace(`/compare?${qs.toString()}`);
  }

  function picker(which: 'earlier' | 'later', value: string | null, label: string) {
    return (
      <label className="block min-w-0 flex-1">
        <span className="mb-1.5 block text-sm font-medium text-zinc-300">{label}</span>
        <select
          value={value ?? ''}
          onChange={(e) => pick(which, e.target.value)}
          className={inputClassName}
        >
          <option value="">Choose a diagnosis…</option>
          {groups.map(([campaign, list]) => (
            <optgroup key={campaign} label={campaign}>
              {list.map((r) => (
                <option key={r.id} value={r.id}>
                  {fmtDate(r.createdAt)} · {VERDICT_META[r.verdict].title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {picker('earlier', earlierId, 'Earlier diagnosis')}
          <div className="flex shrink-0 justify-end">
            <GhostButton onClick={swap} disabled={!earlierId && !laterId} className="w-full sm:w-auto">
              ⇄ Swap
            </GhostButton>
          </div>
          {picker('later', laterId, 'Later diagnosis')}
        </div>
        {suggestion.note && (
          <p className="mt-4 rounded-xl border border-sky-400/30 bg-sky-400/5 px-4 py-3 text-sm text-sky-200">
            {suggestion.note}
          </p>
        )}
        {rows.length === 1 && (
          <p className="mt-4 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
            Only one diagnosis saved so far — run this campaign again after your changes and
            come back here to compare.{' '}
            <Link href="/diagnose" className="font-semibold text-lime-300 underline underline-offset-2">
              New diagnosis
            </Link>
          </p>
        )}
      </Card>

      {sameRow && (
        <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          You picked the same diagnosis twice — choose two different ones to compare.
        </p>
      )}

      {comparable && status && summary && (
        <>
          {/* Warnings */}
          {gap > DIRECTIONAL_GAP_DAYS && (
            <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              {gap} days apart — the campaign may have changed (new creative, new budget), so
              treat this comparison as directional.
            </p>
          )}
          {differentCampaigns && (
            <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              Different campaigns — compare with care, the numbers may not be comparable.
            </p>
          )}

          {/* Overall verdict banner */}
          <div
            className={cn(
              'rounded-2xl border p-6',
              status === 'improved' && 'border-lime-400/50 bg-lime-400/5',
              status === 'declined' && 'border-red-500/50 bg-red-500/5',
              status === 'stable' && 'border-zinc-700 bg-zinc-900/60',
            )}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-bold',
                  status === 'improved' && 'bg-gradient-to-r from-lime-400 to-emerald-400 text-zinc-950',
                  status === 'declined' && 'bg-gradient-to-r from-red-500 to-rose-500 text-white',
                  status === 'stable' && 'bg-gradient-to-r from-zinc-400 to-zinc-500 text-zinc-950',
                )}
              >
                {status === 'improved' ? '↑ IMPROVED' : status === 'declined' ? '↓ DECLINED' : '→ STABLE'}
              </span>
              <div className="flex items-center gap-2 text-sm">
                <VerdictBadge verdict={earlier.verdict} size="sm" />
                <span className="text-zinc-500">→</span>
                <VerdictBadge verdict={later.verdict} size="sm" />
              </div>
              <span className="text-xs text-zinc-500">
                {fmtDate(earlier.createdAt)} → {fmtDate(later.createdAt)} · {gap === 0 ? 'same day' : `${gap} day${gap === 1 ? '' : 's'} apart`}
              </span>
            </div>
            <p className="mt-3 text-[15px] text-zinc-200">{summary}</p>
            <p className="mt-2 text-sm text-zinc-400">{later.results.verdictReason}</p>
          </div>

          {/* Side-by-side deltas */}
          <Card>
            <SectionTitle hint="Earlier vs later. Green = moved the right way, red = moved the wrong way. Spend and revenue show direction only — more spend isn't better or worse by itself.">
              Metric deltas
            </SectionTitle>
            {/* Desktop: dense table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                    <th className="pb-2 pr-3 font-medium">Metric</th>
                    <th className="pb-2 pr-3 font-medium">Earlier · {fmtDate(earlier.createdAt)}</th>
                    <th className="pb-2 pr-3 font-medium">Later · {fmtDate(later.createdAt)}</th>
                    <th className="pb-2 font-medium">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {metricRows.map((row) => (
                    <tr key={row.key} className="border-b border-zinc-800/60 last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-zinc-200">{row.label}</td>
                      <td className="py-2.5 pr-3 font-mono text-zinc-400">{row.oldText}</td>
                      <td className="py-2.5 pr-3 font-mono text-zinc-100">{row.newText}</td>
                      <td className="py-2.5">
                        <DeltaCell row={row} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile: stacked cards, no horizontal scroll */}
            <div className="space-y-3 sm:hidden">
              {metricRows.map((row) => (
                <div key={row.key} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-zinc-100">{row.label}</p>
                    <span className="shrink-0 text-sm">
                      <DeltaCell row={row} />
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-sm">
                    <span className="text-zinc-500">Earlier </span>
                    <span className="text-zinc-400">{row.oldText}</span>
                    <span className="mx-2 text-zinc-600">→</span>
                    <span className="text-zinc-500">Later </span>
                    <span className="text-zinc-100">{row.newText}</span>
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* What to do next, from the later diagnosis */}
          <Card>
            <SectionTitle hint="What to do next, based on the later numbers.">Latest action items</SectionTitle>
            <ol className="space-y-3">
              {later.results.actionItems.map((a) => (
                <li key={a.priority} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-lime-400 to-emerald-400 text-xs font-bold text-zinc-950">
                    {a.priority}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{a.title}</p>
                    <p className="mt-0.5 text-[13px] text-zinc-400">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
              <Link href={`/diagnoses/${later.id}`} className="inline-flex min-h-11 items-center rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700">
                View later diagnosis
              </Link>
              <Link href={`/diagnoses/${later.id}/compare`} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500">
                Re-diagnose this campaign
              </Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
