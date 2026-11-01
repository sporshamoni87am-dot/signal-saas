'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  diagnose,
  compareVerdicts,
  type DiagnosisInputs,
  type DiagnosisResults,
} from '@/lib/engine';
import { saveDiagnosis } from '@/lib/actions';
import { parseNum } from '@/lib/format';
import { Card, Field, GhostButton, PrimaryButton, SectionTitle, VerdictBadge, inputClassName } from '@/components/ui';
import { cn } from '@/lib/cn';

type MetricName =
  | 'adSpend'
  | 'impressions'
  | 'linkClicks'
  | 'addToCarts'
  | 'checkoutsInitiated'
  | 'purchases'
  | 'attributedRevenue'
  | 'totalBusinessRevenue'
  | 'daysRunning';

const METRIC_FIELDS: Array<{ name: MetricName; label: string; prefix?: string }> = [
  { name: 'adSpend', label: 'Ad spend', prefix: '$' },
  { name: 'impressions', label: 'Impressions' },
  { name: 'linkClicks', label: 'Link clicks' },
  { name: 'addToCarts', label: 'Add to carts' },
  { name: 'checkoutsInitiated', label: 'Checkouts initiated' },
  { name: 'purchases', label: 'Purchases' },
  { name: 'attributedRevenue', label: 'Attributed revenue', prefix: '$' },
  { name: 'totalBusinessRevenue', label: 'Total business revenue', prefix: '$' },
  { name: 'daysRunning', label: 'Days running (new total)' },
];

const DELTA_KEYS: Array<{
  key: string;
  label: string;
  higherBetter: boolean;
  money?: boolean;
  pct?: boolean;
}> = [
  { key: 'roas', label: 'ROAS', higherBetter: true },
  { key: 'cpa', label: 'Cost / purchase', higherBetter: false, money: true },
  { key: 'ctr', label: 'Link CTR', higherBetter: true, pct: true },
  { key: 'cpc', label: 'CPC', higherBetter: false, money: true },
  { key: 'cpm', label: 'CPM', higherBetter: false, money: true },
  { key: 'frequency', label: 'Frequency', higherBetter: false },
  { key: 'clickToAtc', label: 'Click → ATC', higherBetter: true, pct: true },
  { key: 'checkoutToPurchase', label: 'Checkout → purch.', higherBetter: true, pct: true },
  { key: 'mer', label: 'MER', higherBetter: true },
  { key: 'poas', label: 'POAS', higherBetter: true },
];

function fmtVal(v: number | null | undefined, m: { money?: boolean; pct?: boolean }): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  if (m.money) return `$${v.toFixed(2)}`;
  if (m.pct) return `${(v * 100).toFixed(2)}%`;
  return `${v.toFixed(2)}×`;
}

export default function CompareClient({
  baseInputs,
  baseResults,
}: {
  baseInputs: DiagnosisInputs;
  baseResults: DiagnosisResults;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Record<MetricName, string>>({
    adSpend: '',
    impressions: '',
    linkClicks: '',
    addToCarts: '',
    checkoutsInitiated: '',
    purchases: '',
    attributedRevenue: '',
    totalBusinessRevenue: '',
    daysRunning: '',
  });
  const [fresh, setFresh] = useState<{ inputs: DiagnosisInputs; results: DiagnosisResults } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [ran, setRan] = useState(false);

  function run() {
    const inputs: DiagnosisInputs = {
      ...baseInputs,
      adSpend: parseNum(form.adSpend),
      impressions: parseNum(form.impressions),
      reach: null,
      linkClicks: parseNum(form.linkClicks),
      addToCarts: parseNum(form.addToCarts),
      checkoutsInitiated: parseNum(form.checkoutsInitiated),
      purchases: parseNum(form.purchases),
      attributedRevenue: parseNum(form.attributedRevenue),
      totalBusinessRevenue: parseNum(form.totalBusinessRevenue),
      daysRunning: parseNum(form.daysRunning) ?? baseInputs.daysRunning,
      videoViews3s: null,
      videoThruplays: null,
      frequency: null,
      problemStatement: `Follow-up to diagnosis from the same campaign.`,
    };
    setFresh({ inputs, results: diagnose(inputs) });
    setRan(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onSave() {
    if (!fresh) return;
    setSaving(true);
    setSaveError(null);
    setLimitHit(false);
    const res = await saveDiagnosis({ inputs: fresh.inputs, results: fresh.results, screenshotPath: null });
    setSaving(false);
    if (res.error === 'TRIAL_EXPIRED') {
      setSaveError(
        'Your free trial has ended — you can still view your past diagnoses, but saving new ones is paused until paid plans launch.',
      );
      return;
    }
    if (res.error === 'FREE_LIMIT_REACHED') {
      setLimitHit(true);
      return;
    }
    if (res.error || !res.id) {
      setSaveError(res.error ?? 'Could not save.');
      return;
    }
    router.push(`/diagnoses/${res.id}`);
  }

  const comparison = fresh ? compareVerdicts(baseResults, fresh.results) : null;

  function deltaRow(key: string) {
    const meta = DELTA_KEYS.find((d) => d.key === key)!;
    const oldSig = [...baseResults.adSignals, ...baseResults.businessMetrics].find((s) => s.key === key);
    const newSig = fresh ? [...fresh.results.adSignals, ...fresh.results.businessMetrics].find((s) => s.key === key) : undefined;
    const o = oldSig?.value ?? null;
    const n = newSig?.value ?? null;
    const d = o !== null && n !== null ? n - o : null;
    const good = d !== null && (meta.higherBetter ? d > 0 : d < 0);
    const bad = d !== null && (meta.higherBetter ? d < 0 : d > 0);
    return (
      <tr key={key} className="border-b border-zinc-800/60 last:border-0">
        <td className="py-2.5 pr-3 font-medium text-zinc-200">{meta.label}</td>
        <td className="py-2.5 pr-3 font-mono text-zinc-400">{fmtVal(o, meta)}</td>
        <td className="py-2.5 pr-3 font-mono text-zinc-100">{fmtVal(n, meta)}</td>
        <td className={cn('py-2.5 font-mono font-semibold', good && 'text-emerald-300', bad && 'text-red-300', !good && !bad && 'text-zinc-500')}>
          {d === null ? '—' : `${d > 0 ? '+' : ''}${meta.money ? `$${d.toFixed(2)}` : meta.pct ? `${(d * 100).toFixed(2)}pp` : `${d.toFixed(2)}`}`}
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-6">
      {!ran && (
        <Card>
          <SectionTitle hint="Same campaign setup is carried over. Enter the fresh numbers from your new date range.">
            New numbers for “{baseInputs.campaignName}”
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {METRIC_FIELDS.map((f) => (
              <Field key={f.name} label={f.label}>
                <div className="relative">
                  {f.prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">{f.prefix}</span>}
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={form[f.name]}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    className={cn(inputClassName, f.prefix && 'pl-8')}
                    placeholder="0"
                  />
                </div>
              </Field>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <PrimaryButton onClick={run}>Compare old vs new ⚡</PrimaryButton>
          </div>
        </Card>
      )}

      {fresh && comparison && (
        <>
          <div className={cn('rounded-2xl border p-6', comparison.improved ? 'border-lime-400/50 bg-lime-400/5' : 'border-red-500/50 bg-red-500/5')}>
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn('rounded-full px-4 py-1.5 text-sm font-bold', comparison.improved ? 'bg-lime-400 text-zinc-950' : 'bg-red-500 text-white')}>
                {comparison.improved ? '✓ IMPROVED' : '✗ NOT IMPROVED'}
              </span>
              <div className="flex items-center gap-2 text-sm">
                <VerdictBadge verdict={baseResults.verdict} size="sm" />
                <span className="text-zinc-500">→</span>
                <VerdictBadge verdict={fresh.results.verdict} size="sm" />
              </div>
            </div>
            <p className="mt-3 text-[15px] text-zinc-200">{comparison.summary}</p>
            <p className="mt-2 text-sm text-zinc-400">{fresh.results.verdictReason}</p>
          </div>

          <Card>
            <SectionTitle hint="Old diagnosis vs fresh numbers. Green delta = moved the right way.">
              Metric deltas
            </SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                    <th className="pb-2 pr-3 font-medium">Metric</th>
                    <th className="pb-2 pr-3 font-medium">Old</th>
                    <th className="pb-2 pr-3 font-medium">New</th>
                    <th className="pb-2 font-medium">Delta</th>
                  </tr>
                </thead>
                <tbody>{DELTA_KEYS.map((d) => deltaRow(d.key))}</tbody>
              </table>
            </div>
          </Card>

          <Card>
            <SectionTitle hint="What to do next, based on the fresh numbers.">New action items</SectionTitle>
            <ol className="space-y-3">
              {fresh.results.actionItems.map((a) => (
                <li key={a.priority} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime-400 text-xs font-bold text-zinc-950">{a.priority}</span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{a.title}</p>
                    <p className="mt-0.5 text-[13px] text-zinc-400">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {saveError && <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{saveError}</p>}
          {limitHit && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              Plan limit reached.{' '}
              <Link href="/billing" className="font-semibold underline underline-offset-2">See plans</Link> for options.
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <GhostButton onClick={() => { setRan(false); setFresh(null); }}>Edit numbers</GhostButton>
            <PrimaryButton onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save as new diagnosis'}</PrimaryButton>
          </div>
        </>
      )}
    </div>
  );
}
