'use client';

import { useState } from 'react';
import {
  ATTRIBUTION_OPTIONS,
  buildForecastSummaryText,
  type ForecastInputs,
  type ForecastResults,
  type FunnelStatus,
} from '@/lib/forecast';
import { fmtDateTime } from '@/lib/format';
import { cn } from '@/lib/cn';

const STATUS: Record<FunnelStatus, { label: string; dot: string; text: string }> = {
  good: { label: 'Good', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  warn: { label: 'Watch', dot: 'bg-amber-400', text: 'text-amber-300' },
  bad: { label: 'Bad', dot: 'bg-red-500', text: 'text-red-300' },
  na: { label: 'N/A', dot: 'bg-zinc-600', text: 'text-zinc-400' },
};

function money(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function int(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  return Math.round(v).toLocaleString('en-US');
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-0.5 break-words font-mono text-base font-semibold text-zinc-100">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function StatusDot({ status }: { status: FunnelStatus }) {
  const s = STATUS[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', s.text)}>
      <span className={cn('h-2 w-2 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

const INTERPRETATION: { signal: string; investigate: string; doNot: string }[] = [
  {
    signal: 'CPM high / rising',
    investigate: 'Country, placement, time, auction/delivery mix, objective and historical benchmark',
    doNot: 'That the audience is inherently poor or rich',
  },
  {
    signal: 'Link CTR weak',
    investigate: 'Creative, offer, message-market fit; compare by placement and country',
    doNot: 'That the website is the problem',
  },
  {
    signal: 'Link clicks but fewer LPVs',
    investigate: 'Page speed, redirects, accidental clicks, consent and pixel measurement',
    doNot: 'That all missing clicks are bad traffic',
  },
  {
    signal: 'LPVs but few ATCs / checkouts',
    investigate: 'Product page, price, shipping, trust, offer and event tracking',
    doNot: 'That CPM caused the drop-off',
  },
  {
    signal: 'Purchases and CPA',
    investigate: 'Compare CPA with allowable CPA and contribution margin; verify purchase value',
    doNot: 'That one purchase proves stable ROAS',
  },
  {
    signal: 'Still in learning',
    investigate: 'Events per week vs 50, daily budget vs (target CPA × 50) ÷ 7, audience size',
    doNot: 'That the campaign is a failure — or a winner — before 50 events',
  },
];

const FORMULAS: { metric: string; formula: string }[] = [
  { metric: 'CPM', formula: 'Spend ÷ Impressions × 1,000' },
  { metric: 'Link CTR', formula: 'Link clicks ÷ Impressions × 100' },
  { metric: 'Link CPC', formula: 'Spend ÷ Link clicks' },
  { metric: 'Click → LPV rate', formula: 'Landing page views ÷ Link clicks × 100' },
  { metric: 'Website purchase CVR', formula: 'Purchases ÷ Landing page views × 100' },
  { metric: 'CPA', formula: 'Spend ÷ Purchases' },
  { metric: 'Website purchase ROAS', formula: 'Attributed purchase conversion value ÷ Spend' },
  { metric: 'Break-even ROAS (simplified)', formula: '1 ÷ contribution margin rate' },
  { metric: 'Break-even CPA (one-order model)', formula: 'AOV × contribution margin rate − target profit/order' },
  { metric: 'Minimum daily budget', formula: 'Target CPA × 50 ÷ 7 (to exit learning)' },
];

export default function ForecastReport({
  inputs,
  results,
  generatedAt,
  liveSource,
}: {
  inputs: ForecastInputs;
  results: ForecastResults;
  generatedAt?: string | null;
  liveSource?: { accountName?: string | null; objectName?: string | null; since?: string; until?: string } | null;
}) {
  const [copied, setCopied] = useState(false);
  const attributionLabel =
    ATTRIBUTION_OPTIONS.find((o) => o.value === inputs.attribution)?.label ?? inputs.attribution;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(buildForecastSummaryText(inputs, results));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function onCsv() {
    const rows: [string, string][] = [
      ['Campaign', inputs.campaignName || 'Untitled forecast'],
      ['Market', inputs.market || ''],
      ['Attribution', attributionLabel],
      ['Total budget', money(inputs.totalBudget)],
      ['Spent so far', money(results.spend)],
      ['Remaining budget', money(results.remainingBudget)],
      ['Impressions (so far)', int(results.impressions)],
      ['Link clicks (so far)', int(results.linkClicks)],
      ['Landing page views (so far)', int(results.lpv)],
      ['Add to carts (so far)', int(results.atc)],
      ['Checkouts (so far)', int(results.checkouts)],
      ['Expected purchases (so far)', results.purchasesExpected.toFixed(2)],
      ['Observed purchases', results.observedPurchases !== null ? String(results.observedPurchases) : ''],
      ['Expected revenue (so far)', money(results.revenue)],
      ['CPA (so far)', money(results.cpa)],
      ['ROAS (so far)', results.roas !== null ? `${results.roas.toFixed(2)}x` : ''],
      ['Break-even ROAS', results.beRoas !== null ? `${results.beRoas.toFixed(2)}x` : ''],
      ['Break-even CPA', money(results.beCpa)],
      ['Full-budget expected purchases', results.fullPurchases !== null ? results.fullPurchases.toFixed(2) : ''],
      ['Full-budget expected revenue', money(results.fullRevenue)],
      ['Full-budget CPA', money(results.fullCpa)],
      ['Full-budget ROAS', results.fullRoas !== null ? `${results.fullRoas.toFixed(2)}x` : ''],
      ['Learning status', results.learning.status],
      ['Optimisation events', results.learning.events !== null ? String(results.learning.events) : ''],
      ['Confidence', results.confidence.label],
      ['Guidance', results.guidance.headline],
    ];
    const csv = rows.map(([k, v]) => `"${k.replaceAll('"', '""')}","${String(v).replaceAll('"', '""')}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'meta-ads-forecast.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const learning = results.learning;
  const guidanceStyles = {
    provisional: 'border-amber-400/40 bg-amber-400/5',
    ontrack: 'border-lime-400/40 bg-lime-400/5',
    below: 'border-red-500/40 bg-red-500/5',
    unknown: 'border-zinc-700 bg-zinc-900/60',
  } as const;
  const guidanceText = {
    provisional: 'text-amber-200',
    ontrack: 'text-lime-200',
    below: 'text-red-300',
    unknown: 'text-zinc-200',
  } as const;

  return (
    <div>
      {/* Screen version — hidden in print; the light document below prints. */}
      <div className="print:hidden">
      {/* Screen-only actions */}
      <div className="no-print mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex min-h-11 items-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
        >
          {copied ? '✓ Copied to clipboard' : '⧉ Copy summary'}
        </button>
        <button
          type="button"
          onClick={onCsv}
          className="inline-flex min-h-11 items-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
        >
          ⭳ Export CSV
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
        >
          ⎙ Print / save PDF
        </button>
      </div>

      {/* Learning gate — the headline of every early-stage forecast */}
      <div
        className={cn(
          'rounded-2xl border p-4 sm:p-5',
          learning.status === 'exited'
            ? 'border-lime-400/40 bg-lime-400/5'
            : learning.status === 'unknown'
              ? 'border-zinc-700 bg-zinc-900/60'
              : 'border-amber-400/40 bg-amber-400/5',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-bold text-zinc-50">
            {learning.status === 'exited' && '✓ Exited learning — numbers are stable enough to judge'}
            {learning.status === 'learning' && '⏳ Still learning — too early to scale or pause'}
            {learning.status === 'limited-risk' && '⚠ Learning Limited risk — unlikely to reach 50 events/week'}
            {learning.status === 'unknown' && 'Learning phase — unknown'}
          </p>
          <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
            {learning.events !== null ? `${learning.events} / 50 events` : 'Events not entered'}
            {learning.weeklyProjected !== null ? ` · ~${Math.round(learning.weeklyProjected)}/week` : ''}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{learning.note}</p>
        {learning.minDailyBudget !== null && learning.status !== 'exited' && (
          <p className="mt-2 text-sm text-zinc-300">
            Minimum daily budget to exit learning: <strong className="font-mono">{money(learning.minDailyBudget)}</strong>
            <span className="text-zinc-500"> (target CPA × 50 ÷ 7)</span>
          </p>
        )}
      </div>

      {/* Guidance */}
      <div className={cn('mt-4 rounded-2xl border p-4 sm:p-5', guidanceStyles[results.guidance.kind])}>
        <p className={cn('text-lg font-bold', guidanceText[results.guidance.kind])}>
          {results.guidance.headline}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{results.guidance.detail}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 font-semibold text-zinc-300">
            Confidence: {results.confidence.label}
            {results.confidence.basis ? ` (${results.confidence.basis} ${results.confidence.basisPurchases !== null ? Math.round(results.confidence.basisPurchases) : '—'} purchases)` : ''}
          </span>
          <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 font-semibold text-zinc-300">
            Attribution: {attributionLabel}
          </span>
          {liveSource && (
            <span className="rounded-full border border-lime-400/40 bg-lime-400/5 px-3 py-1 font-semibold text-lime-200">
              ⚡ Live data from Meta
            </span>
          )}
        </div>
      </div>

      {/* So far */}
      <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-zinc-100">
        So far — ${results.spend.toLocaleString()} spent
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Expected purchases" value={results.purchasesExpected.toFixed(1)} sub={results.observedPurchases !== null ? `Observed: ${results.observedPurchases}` : 'No observed count entered'} />
        <Metric label="Expected revenue" value={money(results.revenue)} />
        <Metric label="Modelled CPA" value={money(results.cpa)} sub={results.cpaRange ? `Rough range ${money(results.cpaRange.low)} – ${results.cpaRange.high !== null ? money(results.cpaRange.high) : 'very wide'}` : undefined} />
        <Metric label="Modelled ROAS" value={results.roas !== null ? `${results.roas.toFixed(2)}×` : '—'} sub={`Break-even ${results.beRoas !== null ? `${results.beRoas.toFixed(2)}×` : '—'}`} />
        <Metric label="Impressions" value={int(results.impressions)} sub={`Effective CPM ${money(results.effCpm)}`} />
        <Metric label="Link clicks" value={int(results.linkClicks)} sub={`Link CTR ${results.effCtrPct !== null ? `${results.effCtrPct.toFixed(2)}%` : '—'}`} />
        <Metric label="Landing page views" value={int(results.lpv)} sub={`Click → LPV ${results.effLpvRatePct !== null ? `${results.effLpvRatePct.toFixed(1)}%` : '—'}`} />
        <Metric label="Website CVR" value={results.cvrPct !== null ? `${results.cvrPct.toFixed(2)}%` : '—'} sub={`Required for break-even ${results.requiredCvrPct !== null ? `${results.requiredCvrPct.toFixed(2)}%` : '—'}`} />
      </div>
      {results.cpaRange && (
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          CPA range is a rough range from purchase-count noise (±1.96×√purchases) — not a statistical guarantee.
          With {results.purchasesExpected.toFixed(1)} expected purchases, the true CPA could plausibly sit anywhere in it.
        </p>
      )}

      {/* Full budget */}
      {results.remainingBudget !== null && inputs.totalBudget !== null && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-zinc-100">
            Full budget — ${inputs.totalBudget.toLocaleString()} if today&apos;s rates hold
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Remaining budget" value={money(results.remainingBudget)} />
            <Metric label="Expected purchases" value={results.fullPurchases !== null ? results.fullPurchases.toFixed(1) : '—'} />
            <Metric label="Expected revenue" value={money(results.fullRevenue)} />
            <Metric label="Modelled ROAS" value={results.fullRoas !== null ? `${results.fullRoas.toFixed(2)}×` : '—'} sub={`Break-even ${results.beRoas !== null ? `${results.beRoas.toFixed(2)}×` : '—'}`} />
            <Metric label="Full-budget CPA" value={money(results.fullCpa)} sub={`Break-even CPA ${money(results.beCpa)}`} />
            <Metric label="Impressions" value={int(results.fullImpressions)} />
            <Metric label="Link clicks" value={int(results.fullClicks)} />
            <Metric label="Landing page views" value={int(results.fullLpv)} />
          </div>
        </>
      )}

      {/* Funnel */}
      <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-zinc-100">Funnel — where does it leak?</h2>
      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        {results.funnel.map((f, idx) => (
          <div
            key={f.stage}
            className={cn(
              'flex flex-wrap items-center justify-between gap-2 bg-zinc-900/60 px-4 py-3',
              idx > 0 && 'border-t border-zinc-800',
            )}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100">{f.stage}</p>
              <p className="text-xs text-zinc-500">{f.benchmark}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-mono text-sm font-semibold text-zinc-100">{int(f.count)}</p>
              <p className="w-16 text-right font-mono text-sm text-zinc-400">{f.rateDisplay}</p>
              <span className="w-16 text-right"><StatusDot status={f.status} /></span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
        Click → ATC {results.clickToAtcPct !== null ? `${results.clickToAtcPct.toFixed(1)}%` : '—'}{' '}
        (<StatusDot status={results.clickToAtcStatus} /> · good ≥8% · watch ≥4% · engine threshold) ·{' '}
        ATC → checkout {results.atcToCheckoutPct !== null ? `${results.atcToCheckoutPct.toFixed(1)}%` : '—'} ·{' '}
        Checkout → purchase {results.checkoutToPurchasePct !== null ? `${results.checkoutToPurchasePct.toFixed(1)}%` : '—'}
      </p>

      {/* Creative signals */}
      <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-zinc-100">Creative signals</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
          <p className="text-xs text-zinc-500">Hook rate (3-sec views ÷ impressions)</p>
          <p className="mt-0.5 font-mono text-base font-semibold text-zinc-100">
            {results.creative.hookRatePct !== null ? `${results.creative.hookRatePct.toFixed(1)}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            <StatusDot status={results.creative.hookStatus} /> · weak below 20% · strong above 30%
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
          <p className="text-xs text-zinc-500">Frequency</p>
          <p className="mt-0.5 font-mono text-base font-semibold text-zinc-100">
            {results.creative.frequency !== null ? results.creative.frequency.toFixed(1) : '—'}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{results.creative.fatigueNote}</p>
        </div>
      </div>

      {/* Spend pace */}
      <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-zinc-100">Spend pace</h2>
      <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm leading-relaxed text-zinc-300">
        {results.pace.note}
      </p>

      {/* Scenario sensitivity */}
      <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-zinc-100">Scenario sensitivity (not a promise)</h2>
      <p className="mb-3 text-sm text-zinc-400">
        How CPA and ROAS change if website purchase conversion rate changes, while CPM, CTR, LPV rate and AOV stay constant.
      </p>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-zinc-800 sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-500">
              <th className="px-4 py-3 font-semibold">Website CVR</th>
              <th className="px-4 py-3 font-semibold">Expected purchases</th>
              <th className="px-4 py-3 font-semibold">CPA</th>
              <th className="px-4 py-3 font-semibold">ROAS</th>
              <th className="px-4 py-3 font-semibold">Vs break-even</th>
            </tr>
          </thead>
          <tbody>
            {results.scenarioRows.map((r) => (
              <tr key={r.cvrPct} className="border-t border-zinc-800/60">
                <td className="px-4 py-3 font-mono text-zinc-100">{r.cvrPct.toFixed(1)}%</td>
                <td className="px-4 py-3 font-mono text-zinc-300">{r.purchases !== null ? r.purchases.toFixed(2) : '—'}</td>
                <td className="px-4 py-3 font-mono text-zinc-300">{money(r.cpa)}</td>
                <td className="px-4 py-3 font-mono text-zinc-300">{r.roas !== null ? `${r.roas.toFixed(2)}×` : '—'}</td>
                <td className={cn('px-4 py-3 font-semibold', r.vsBreakEven === 'above' ? 'text-lime-300' : r.vsBreakEven === 'below' ? 'text-red-300' : 'text-zinc-500')}>
                  {r.vsBreakEven === 'above' ? 'At/above' : r.vsBreakEven === 'below' ? 'Below' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile stacked cards */}
      <div className="space-y-2 sm:hidden">
        {results.scenarioRows.map((r) => (
          <div key={r.cvrPct} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-100">CVR {r.cvrPct.toFixed(1)}%</p>
            <p className="mt-1 font-mono text-sm text-zinc-300">
              {r.purchases !== null ? r.purchases.toFixed(2) : '—'} purchases · CPA {money(r.cpa)} · ROAS {r.roas !== null ? `${r.roas.toFixed(2)}×` : '—'}
            </p>
            <p className={cn('mt-1 text-xs font-semibold', r.vsBreakEven === 'above' ? 'text-lime-300' : r.vsBreakEven === 'below' ? 'text-red-300' : 'text-zinc-500')}>
              {r.vsBreakEven === 'above' ? 'At/above break-even' : r.vsBreakEven === 'below' ? 'Below break-even' : '—'}
            </p>
          </div>
        ))}
      </div>

      {/* Interpretation guide */}
      <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-zinc-100">How to interpret the result</h2>
      <div className="hidden overflow-hidden rounded-2xl border border-zinc-800 sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-500">
              <th className="px-4 py-3 font-semibold">Signal</th>
              <th className="px-4 py-3 font-semibold">Investigate</th>
              <th className="px-4 py-3 font-semibold">Do not conclude</th>
            </tr>
          </thead>
          <tbody>
            {INTERPRETATION.map((row) => (
              <tr key={row.signal} className="border-t border-zinc-800/60 align-top">
                <td className="px-4 py-3 font-semibold text-zinc-100">{row.signal}</td>
                <td className="px-4 py-3 text-zinc-400">{row.investigate}</td>
                <td className="px-4 py-3 text-zinc-400">{row.doNot}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2 sm:hidden">
        {INTERPRETATION.map((row) => (
          <div key={row.signal} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-100">{row.signal}</p>
            <p className="mt-1 text-sm text-zinc-400"><span className="text-zinc-500">Investigate: </span>{row.investigate}</p>
            <p className="mt-1 text-sm text-zinc-400"><span className="text-zinc-500">Do not conclude: </span>{row.doNot}</p>
          </div>
        ))}
      </div>

      {/* Formula reference */}
      <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-zinc-100">Formula reference</h2>
      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full text-sm">
          <tbody>
            {FORMULAS.map((f, idx) => (
              <tr key={f.metric} className={idx > 0 ? 'border-t border-zinc-800/60' : ''}>
                <td className="px-4 py-2.5 font-semibold text-zinc-100">{f.metric}</td>
                <td className="px-4 py-2.5 font-mono text-zinc-400">{f.formula}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
        The model uses expected fractional purchases for scenario math. Actual orders are whole numbers and can vary widely
        at low spend. Break-even formulas assume the entered contribution margin and AOV are accurate and exclude fixed
        overhead/tax unless included by you.
      </p>

      {/* Warnings */}
      <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-zinc-100">Warnings &amp; caveats</h2>
      <ul className="space-y-2">
        {results.warnings.map((w) => (
          <li key={w} className="rounded-xl border-l-4 border-amber-400/60 bg-amber-400/5 px-4 py-3 text-sm leading-relaxed text-zinc-300">
            • {w}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-center text-xs text-zinc-500">
        Independent planning model. Not affiliated with, endorsed by, or connected to Meta. No data is uploaded; calculations run in this browser.
      </p>
      </div>{/* end screen version */}

      {/* Print-only document (light, ink-friendly) */}
      <div className="hidden print:block" style={{ color: '#111827' }}>
        <div style={{ borderBottom: '3px solid #111827', paddingBottom: 16, marginBottom: 20 }}>
          <p style={{ fontSize: 12, letterSpacing: 2, color: '#6b7280' }}>
            META ADS SIGNAL ASSISTANCE · EARLY-STAGE FORECAST
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '6px 0' }}>{inputs.campaignName || 'Untitled forecast'}</h1>
          <p style={{ fontSize: 13, color: '#4b5563' }}>
            {generatedAt ? fmtDateTime(generatedAt) : 'Just now'} · {attributionLabel} · Planning model, not a Meta prediction
          </p>
        </div>
        <div style={{ border: '2px solid #111827', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <p style={{ fontSize: 12, letterSpacing: 2, color: '#6b7280' }}>GUIDANCE</p>
          <p style={{ fontSize: 22, fontWeight: 800, margin: '4px 0' }}>{results.guidance.headline}</p>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>{results.guidance.detail}</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>
            Learning: {results.learning.note} Confidence: {results.confidence.label}.
          </p>
        </div>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '18px 0 8px' }}>So far</h2>
        <p style={{ fontSize: 13, lineHeight: 1.7 }}>
          Spend ${results.spend.toLocaleString()} · Expected purchases {results.purchasesExpected.toFixed(1)}
          {results.observedPurchases !== null ? ` · Observed ${results.observedPurchases}` : ''} · CPA {money(results.cpa)} · ROAS{' '}
          {results.roas !== null ? `${results.roas.toFixed(2)}×` : '—'} · Break-even ROAS{' '}
          {results.beRoas !== null ? `${results.beRoas.toFixed(2)}×` : '—'}
        </p>
        {results.fullPurchases !== null && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '18px 0 8px' }}>Full budget</h2>
            <p style={{ fontSize: 13, lineHeight: 1.7 }}>
              Expected purchases {results.fullPurchases.toFixed(1)} · CPA {money(results.fullCpa)} · ROAS{' '}
              {results.fullRoas !== null ? `${results.fullRoas.toFixed(2)}×` : '—'}
            </p>
          </>
        )}
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '18px 0 8px' }}>Funnel</h2>
        <ul style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 20 }}>
          {results.funnel.map((f) => (
            <li key={f.stage}>
              {f.stage}: {int(f.count)}{f.rateDisplay !== '—' ? ` (${f.rateDisplay} from previous)` : ''}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
