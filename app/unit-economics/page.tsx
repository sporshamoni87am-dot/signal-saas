'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CURRENCY_OPTIONS,
  buildUnitEconomicsSummaryText,
  calculateUnitEconomics,
  type CurrencySymbol,
  type UnitEconomicsInputs,
  type UnitEconomicsMode,
} from '@/lib/unit-economics';
import {
  SAMPLE_UNIT_ECONOMICS,
  SAMPLE_UNIT_ECONOMICS_LEADGEN,
  SAMPLE_UNIT_ECONOMICS_NOTE,
} from '@/lib/unit-economics-sample';
import { parseNum } from '@/lib/format';
import { Card, Field, GhostButton, PageHeader, PrimaryButton, SectionTitle, inputClassName } from '@/components/ui';
import { cn } from '@/lib/cn';

type FormState = {
  mode: UnitEconomicsMode;
  currency: CurrencySymbol;
  aov: string;
  avgPurchases: string;
  marginPct: string;
  adSpend: string;
  customersAcquired: string;
  leadsAcquired: string;
  leadToCustomerPct: string;
  // Helper: calculate AOV / avg purchases from totals, as Heath insists.
  totalRevenue: string;
  totalCustomersForAvg: string;
  totalPurchases: string;
};

const EMPTY: FormState = {
  mode: 'ecommerce',
  currency: '$',
  aov: '',
  avgPurchases: '',
  marginPct: '',
  adSpend: '',
  customersAcquired: '',
  leadsAcquired: '',
  leadToCustomerPct: '',
  totalRevenue: '',
  totalCustomersForAvg: '',
  totalPurchases: '',
};

function sampleToForm(s: UnitEconomicsInputs): FormState {
  const str = (v: number | null) => (v === null ? '' : String(v));
  return {
    ...EMPTY,
    mode: s.mode,
    currency: s.currency,
    aov: str(s.aov),
    avgPurchases: str(s.avgPurchases),
    marginPct: str(s.marginPct),
    adSpend: str(s.adSpend),
    customersAcquired: str(s.customersAcquired),
    leadsAcquired: str(s.leadsAcquired),
    leadToCustomerPct: str(s.leadToCustomerPct),
  };
}

function money(sym: string, v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  return `${sym}${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

const VERDICT_STYLES: Record<string, { box: string; text: string }> = {
  'scale-aggressive': { box: 'border-lime-400/40 bg-lime-400/5', text: 'text-lime-200' },
  'scale-cautious': { box: 'border-sky-400/40 bg-sky-400/5', text: 'text-sky-200' },
  'scale-little': { box: 'border-amber-400/40 bg-amber-400/5', text: 'text-amber-200' },
  'first-order-loss': { box: 'border-amber-400/40 bg-amber-400/5', text: 'text-amber-200' },
  'lifetime-loss': { box: 'border-red-500/40 bg-red-500/5', text: 'text-red-300' },
  unknown: { box: 'border-zinc-700 bg-zinc-900/60', text: 'text-zinc-200' },
};

const FORMULAS: { metric: string; formula: string }[] = [
  { metric: 'Lifetime revenue per customer', formula: 'AOV × average purchases' },
  { metric: 'LTGP (lifetime gross profit)', formula: 'AOV × average purchases × gross margin' },
  { metric: 'CAC', formula: 'Total ad spend ÷ customers acquired (delivered, paid)' },
  { metric: 'LTGP:CAC ratio', formula: 'LTGP ÷ CAC' },
  { metric: 'First-order gross profit', formula: 'AOV × gross margin' },
  { metric: 'Acceptable cost per purchase (first order)', formula: 'AOV × gross margin' },
  { metric: 'Acceptable CAC (lifetime)', formula: 'LTGP' },
  { metric: 'Acceptable CPL (lead gen, first order)', formula: 'First-order gross profit × lead-to-customer conversion' },
  { metric: 'Break-even ROAS (first order)', formula: '1 ÷ gross margin' },
  { metric: 'Profit per customer after ads', formula: 'LTGP − CAC' },
];

export default function UnitEconomicsPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);
  const [results, setResults] = useState<{ inputs: UnitEconomicsInputs; r: ReturnType<typeof calculateUnitEconomics> } | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [copied, setCopied] = useState(false);
  const [totalsNote, setTotalsNote] = useState<string | null>(null);

  const sym = form.currency;

  function set<K extends keyof FormState>(name: K, v: string) {
    setForm((f) => ({ ...f, [name]: v }));
    setErrors((e) => e.filter((n) => n !== name));
  }

  function buildInputs(): UnitEconomicsInputs {
    return {
      mode: form.mode,
      currency: form.currency,
      aov: parseNum(form.aov),
      avgPurchases: parseNum(form.avgPurchases),
      marginPct: parseNum(form.marginPct),
      adSpend: parseNum(form.adSpend),
      customersAcquired: form.mode === 'ecommerce' ? parseNum(form.customersAcquired) : null,
      leadsAcquired: form.mode === 'leadgen' ? parseNum(form.leadsAcquired) : null,
      leadToCustomerPct: form.mode === 'leadgen' ? parseNum(form.leadToCustomerPct) : null,
    };
  }

  function validate(): string[] {
    const errs: string[] = [];
    const aov = parseNum(form.aov);
    const avg = parseNum(form.avgPurchases);
    const margin = parseNum(form.marginPct);
    const spend = parseNum(form.adSpend);
    if (aov === null || aov <= 0) errs.push('aov');
    if (avg === null || avg < 1) errs.push('avgPurchases');
    if (margin === null || margin <= 0 || margin > 100) errs.push('marginPct');
    if (spend === null) errs.push('adSpend');
    if (form.mode === 'ecommerce') {
      const c = parseNum(form.customersAcquired);
      if (c === null || c <= 0) errs.push('customersAcquired');
    } else {
      const leads = parseNum(form.leadsAcquired);
      const conv = parseNum(form.leadToCustomerPct);
      if (leads === null || leads <= 0) errs.push('leadsAcquired');
      if (conv === null || conv <= 0 || conv > 100) errs.push('leadToCustomerPct');
    }
    return errs;
  }

  function run() {
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const inputs = buildInputs();
    setIsSample(false);
    setResults({ inputs, r: calculateUnitEconomics(inputs) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function loadSample(mode: UnitEconomicsMode) {
    const s = mode === 'leadgen' ? SAMPLE_UNIT_ECONOMICS_LEADGEN : SAMPLE_UNIT_ECONOMICS;
    setForm(sampleToForm(s));
    setIsSample(true);
    setErrors([]);
    setResults({ inputs: s, r: calculateUnitEconomics(s) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function useTotals() {
    const rev = parseNum(form.totalRevenue);
    const cust = parseNum(form.totalCustomersForAvg);
    const purch = parseNum(form.totalPurchases);
    if (rev === null || cust === null || cust <= 0 || purch === null) {
      setTotalsNote('Fill in all three totals first — total revenue, total customers and total purchases.');
      return;
    }
    const aov = rev / cust;
    const avg = purch / cust;
    setForm((f) => ({
      ...f,
      aov: String(Math.round(aov * 100) / 100),
      avgPurchases: String(Math.round(avg * 100) / 100),
    }));
    setTotalsNote(
      `Done — AOV ${sym}${(Math.round(aov * 100) / 100).toLocaleString()} and average purchases ${Math.round(avg * 100) / 100} filled in from your totals.`,
    );
  }

  function onCopy() {
    if (!results) return;
    navigator.clipboard
      .writeText(buildUnitEconomicsSummaryText(results.inputs, results.r))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setCopied(false));
  }

  function onCsv() {
    if (!results) return;
    const { inputs, r } = results;
    const rows: [string, string][] = [
      ['Mode', inputs.mode],
      ['AOV / first transaction', money(sym, inputs.aov)],
      ['Average purchases per customer', inputs.avgPurchases !== null ? String(inputs.avgPurchases) : ''],
      ['Gross margin %', inputs.marginPct !== null ? String(inputs.marginPct) : ''],
      ['Ad spend', money(sym, inputs.adSpend)],
      ['Customers acquired', r.customers !== null ? String(Math.round(r.customers)) : ''],
      ['Lifetime revenue per customer', money(sym, r.lifetimeRevenuePerCustomer)],
      ['First-order gross profit', money(sym, r.firstOrderGrossProfit)],
      ['LTGP', money(sym, r.ltgp)],
      ['CAC', money(sym, r.cac)],
      ['CPL', money(sym, r.cpl)],
      ['LTGP:CAC', r.ltgpCacRatio !== null ? `${r.ltgpCacRatio.toFixed(2)}:1` : ''],
      ['First-order ROAS', r.firstOrderRoas !== null ? `${r.firstOrderRoas.toFixed(2)}x` : ''],
      ['Break-even ROAS (first order)', r.breakEvenRoas !== null ? `${r.breakEvenRoas.toFixed(2)}x` : ''],
      ['Acceptable CPP (first order)', money(sym, r.acceptableCpp)],
      ['Acceptable CAC (lifetime)', money(sym, r.acceptableCacLifetime)],
      ['Acceptable CPL (first order)', money(sym, r.acceptableCpl)],
      ['Profit per customer after ads', money(sym, r.profitPerCustomerAfterAds)],
      ['Total profit after ads', money(sym, r.totalProfitAfterAds)],
      ['Verdict', r.verdictHeadline],
    ];
    const csv = rows.map(([k, v]) => `"${k.replaceAll('"', '""')}","${String(v).replaceAll('"', '""')}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'unit-economics.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ---------------- results view ----------------
  if (results) {
    const { r } = results;
    const vs = VERDICT_STYLES[r.scaleVerdict] ?? VERDICT_STYLES.unknown;
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Unit Economics Calculator"
          sub={isSample ? 'Sample — Ben Heath’s worked example. Replace it with your own numbers.' : 'Your unit economics, with every formula shown.'}
          actions={
            <div className="no-print flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <GhostButton onClick={() => { setResults(null); window.scrollTo({ top: 0 }); }} className="w-full sm:w-auto">Edit inputs</GhostButton>
              <GhostButton onClick={() => { setForm(EMPTY); setResults(null); setIsSample(false); setErrors([]); window.scrollTo({ top: 0 }); }} className="w-full sm:w-auto">↺ Start fresh</GhostButton>
            </div>
          }
        />
        {isSample && (
          <p className="no-print mb-4 rounded-xl border border-sky-400/30 bg-sky-400/5 px-4 py-3 text-sm text-sky-200">{SAMPLE_UNIT_ECONOMICS_NOTE}</p>
        )}

        <div className="no-print mb-5 flex flex-wrap gap-2">
          <button type="button" onClick={onCopy} className="inline-flex min-h-11 items-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500">
            {copied ? '✓ Copied to clipboard' : '⧉ Copy summary'}
          </button>
          <button type="button" onClick={onCsv} className="inline-flex min-h-11 items-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500">
            ⭳ Export CSV
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500">
            ⎙ Print / save PDF
          </button>
        </div>

        <div className={cn('rounded-2xl border p-4 sm:p-5', vs.box)}>
          <p className={cn('text-lg font-bold', vs.text)}>{r.verdictHeadline}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{r.verdictDetail}</p>
          <p className="mt-3 text-xs text-zinc-500">
            Scale bands are AdSignal Pro guidance from the headroom principle — Ben Heath’s video gives no band thresholds, only “scale aggressively when actual cost is far below acceptable cost”.
          </p>
        </div>

        <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-zinc-100">The headline numbers</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="LTGP — lifetime gross profit / customer" value={money(sym, r.ltgp)} sub="AOV × avg purchases × margin" />
          <Metric label="CAC — cost to acquire a customer" value={money(sym, r.cac)} sub="Ad spend ÷ delivered, paid customers" />
          <Metric label="LTGP:CAC ratio" value={r.ltgpCacRatio !== null ? `${r.ltgpCacRatio.toFixed(1)}:1` : '—'} sub="LTGP ÷ CAC — no universal minimum; judge on headroom" />
          <Metric label="Profit / customer after ads" value={money(sym, r.profitPerCustomerAfterAds)} sub="LTGP − CAC, over the lifetime" />
          <Metric label="Lifetime revenue / customer" value={money(sym, r.lifetimeRevenuePerCustomer)} sub="AOV × avg purchases" />
          <Metric label="First-order gross profit" value={money(sym, r.firstOrderGrossProfit)} sub="AOV × margin" />
          <Metric label="Acceptable CPP (first order)" value={money(sym, r.acceptableCpp)} sub="Max you can pay per purchase and break even on order 1" />
          <Metric label="Acceptable CAC (lifetime)" value={money(sym, r.acceptableCacLifetime)} sub="Max you can pay per customer and break even over their lifetime" />
          <Metric label="First-order ROAS" value={r.firstOrderRoas !== null ? `${r.firstOrderRoas.toFixed(2)}×` : '—'} sub={`Break-even ${r.breakEvenRoas !== null ? `${r.breakEvenRoas.toFixed(2)}×` : '—'}`} />
          <Metric label="Headroom (first order)" value={money(sym, r.headroomFirstOrder)} sub={r.headroomFirstOrderPct !== null ? `${(r.headroomFirstOrderPct * 100).toFixed(0)}% of acceptable CPP left` : '—'} />
          {results.inputs.mode === 'leadgen' && (
            <>
              <Metric label="CPL — cost per lead" value={money(sym, r.cpl)} sub="Ad spend ÷ leads" />
              <Metric label="Acceptable CPL (first order)" value={money(sym, r.acceptableCpl)} sub="First-order profit × conversion" />
            </>
          )}
          <Metric label="Total profit after ads" value={money(sym, r.totalProfitAfterAds)} sub={`${r.customers !== null ? Math.round(r.customers).toLocaleString() : '—'} customers × profit/customer`} />
        </div>

        <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-zinc-100">What moves LTGP most?</h2>
        <p className="mb-3 text-sm text-zinc-400">
          Heath’s sensitivity test: improving the customer is usually a bigger lever than improving CAC. Each row changes one thing only, holding CAC the same.
        </p>
        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-500">
                <th className="px-4 py-3 font-semibold">Lever</th>
                <th className="px-4 py-3 font-semibold">New LTGP</th>
                <th className="px-4 py-3 font-semibold">Change</th>
                <th className="px-4 py-3 font-semibold">New LTGP:CAC</th>
              </tr>
            </thead>
            <tbody>
              {r.levers.map((l) => (
                <tr key={l.label} className="border-t border-zinc-800/60 align-top">
                  <td className="px-4 py-3"><span className="font-semibold text-zinc-100">{l.label}</span><br /><span className="text-xs text-zinc-500">{l.change}</span></td>
                  <td className="px-4 py-3 font-mono text-zinc-100">{money(sym, l.newLtgp)}</td>
                  <td className="px-4 py-3 font-mono text-lime-300">{l.deltaLtgp !== null ? `+${money(sym, l.deltaLtgp)}` : '—'}</td>
                  <td className="px-4 py-3 font-mono text-zinc-300">{l.newRatio !== null ? `${l.newRatio.toFixed(1)}:1` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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

        <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-zinc-100">Warnings &amp; caveats</h2>
        <ul className="space-y-2">
          {r.warnings.map((w) => (
            <li key={w} className="rounded-xl border-l-4 border-amber-400/60 bg-amber-400/5 px-4 py-3 text-sm leading-relaxed text-zinc-300">• {w}</li>
          ))}
        </ul>
        <p className="mt-6 text-center text-xs text-zinc-500">
          Based on Ben Heath’s LTGP:CAC framework (“The REAL Secret to Winning with Meta Ads”, 11 Nov 2026). Not affiliated with, endorsed by, or connected to Meta. No data is uploaded; calculations run in this browser.
        </p>
      </div>
    );
  }

  // ---------------- form view ----------------
  const err = (name: string) => errors.includes(name);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader title="Unit Economics Calculator" sub="Can this business afford to buy customers on Meta? · no sign-up needed to try" />

      <div className="no-print mb-6 flex flex-wrap items-center gap-2">
        <GhostButton onClick={() => loadSample('ecommerce')}>Load Ben Heath’s example</GhostButton>
        <GhostButton onClick={() => loadSample('leadgen')}>Load lead-gen example</GhostButton>
        <Link href="/how-it-works" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-lime-300 transition hover:text-lime-200">
          How it works →
        </Link>
      </div>

      <p className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm leading-relaxed text-zinc-300">
        <strong className="text-zinc-100">The idea, in one line:</strong> the winner is usually the business that can afford to pay the most for a customer, because each customer is worth the most over their lifetime. This calculator checks that maths before you judge CPM, CTR or creative.
      </p>

      {errors.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3" role="alert">
          <p className="text-sm font-semibold text-red-200">A few fields need your attention — check the highlighted fields below.</p>
        </div>
      )}

      <Card className="mb-6">
        <SectionTitle hint="E-commerce: you sell a product. Lead gen: you sell a service and a lead becomes a customer only some of the time.">
          Business type &amp; currency
        </SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Business type">
            <div className="flex gap-2">
              {(['ecommerce', 'leadgen'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set('mode', m)}
                  className={cn(
                    'min-h-11 flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                    form.mode === m ? 'border-lime-400/70 bg-lime-400/10 text-lime-200' : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500',
                  )}
                >
                  {m === 'ecommerce' ? 'E-commerce' : 'Lead gen'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Currency — symbol only, no conversion">
            <select value={form.currency} onChange={(e) => set('currency', e.target.value as CurrencySymbol)} className={inputClassName}>
              {CURRENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card className="mb-6">
        <SectionTitle hint="Calculate these from totals, don’t guess them — see the box below. Margin deducts direct costs only (product, delivery, service cost), not overheads.">
          Customer value
        </SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={`AOV — first order value *`} hint={form.mode === 'leadgen' ? 'First transaction value, e.g. $1,000 for a service.' : 'Average order value, e.g. $200.'}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">{sym}</span>
              <input type="number" min="0" step="any" inputMode="decimal" value={form.aov} onChange={(e) => set('aov', e.target.value)} className={cn(inputClassName, 'pl-8', err('aov') && 'border-red-500/70')} placeholder="0" aria-invalid={err('aov')} />
            </div>
          </Field>
          <Field label="Average purchases per customer *" hint="Total purchases ÷ total customers. 1 = one-off purchase.">
            <input type="number" min="1" step="any" inputMode="decimal" value={form.avgPurchases} onChange={(e) => set('avgPurchases', e.target.value)} className={cn(inputClassName, err('avgPurchases') && 'border-red-500/70')} placeholder="e.g. 5" aria-invalid={err('avgPurchases')} />
          </Field>
          <Field label="Gross profit margin *" hint="After product + delivery/service cost, before ads and overheads.">
            <div className="relative">
              <input type="number" min="0" max="100" step="any" inputMode="decimal" value={form.marginPct} onChange={(e) => set('marginPct', e.target.value)} className={cn(inputClassName, 'pr-10', err('marginPct') && 'border-red-500/70')} placeholder="e.g. 50" aria-invalid={err('marginPct')} />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
            </div>
          </Field>
          <Field label="Ad spend *" hint="Total ad spend for the period these customers came from.">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">{sym}</span>
              <input type="number" min="0" step="any" inputMode="decimal" value={form.adSpend} onChange={(e) => set('adSpend', e.target.value)} className={cn(inputClassName, 'pl-8', err('adSpend') && 'border-red-500/70')} placeholder="0" aria-invalid={err('adSpend')} />
            </div>
          </Field>
        </div>

        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm font-semibold text-zinc-100">Calculate AOV &amp; average purchases from totals</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">Heath’s rule: don’t guess the averages. Total revenue ÷ total customers = AOV. Total purchases ÷ total customers = average purchases.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Total revenue">
              <input type="number" min="0" step="any" inputMode="decimal" value={form.totalRevenue} onChange={(e) => set('totalRevenue', e.target.value)} className={inputClassName} placeholder="0" />
            </Field>
            <Field label="Total customers">
              <input type="number" min="0" step="any" inputMode="decimal" value={form.totalCustomersForAvg} onChange={(e) => set('totalCustomersForAvg', e.target.value)} className={inputClassName} placeholder="0" />
            </Field>
            <Field label="Total purchases">
              <input type="number" min="0" step="any" inputMode="decimal" value={form.totalPurchases} onChange={(e) => set('totalPurchases', e.target.value)} className={inputClassName} placeholder="0" />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <GhostButton onClick={useTotals}>Use these totals</GhostButton>
            {totalsNote && <p className="text-xs text-lime-300">{totalsNote}</p>}
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <SectionTitle hint={form.mode === 'ecommerce' ? 'Count delivered, paid customers only — not messages, leads or orders that never paid / never arrived. A cheap cost-per-message that never converts is not a low CAC.' : 'In lead gen, customers are derived from leads × conversion, so the two can never disagree.'}>
          Customers acquired
        </SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {form.mode === 'ecommerce' ? (
            <Field label="Customers acquired (delivered, paid) *">
              <input type="number" min="0" step="any" inputMode="decimal" value={form.customersAcquired} onChange={(e) => set('customersAcquired', e.target.value)} className={cn(inputClassName, err('customersAcquired') && 'border-red-500/70')} placeholder="e.g. 200" aria-invalid={err('customersAcquired')} />
            </Field>
          ) : (
            <>
              <Field label="Leads acquired *">
                <input type="number" min="0" step="any" inputMode="decimal" value={form.leadsAcquired} onChange={(e) => set('leadsAcquired', e.target.value)} className={cn(inputClassName, err('leadsAcquired') && 'border-red-500/70')} placeholder="e.g. 500" aria-invalid={err('leadsAcquired')} />
              </Field>
              <Field label="Lead-to-customer conversion *" hint="Customers ÷ leads. 20% means 1 in 5 leads becomes a paying customer.">
                <div className="relative">
                  <input type="number" min="0" max="100" step="any" inputMode="decimal" value={form.leadToCustomerPct} onChange={(e) => set('leadToCustomerPct', e.target.value)} className={cn(inputClassName, 'pr-10', err('leadToCustomerPct') && 'border-red-500/70')} placeholder="e.g. 20" aria-invalid={err('leadToCustomerPct')} />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
                </div>
              </Field>
            </>
          )}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-zinc-500">
          For Bangladesh F-commerce: use delivered, paid customers as the denominator. COD orders that cancel, return or never pay are not customers yet — counting them flatters CAC and breaks every break-even number.
        </p>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <PrimaryButton onClick={run} className="w-full sm:w-auto">Calculate unit economics</PrimaryButton>
            <GhostButton onClick={() => loadSample(form.mode)} className="w-full sm:w-auto">Load sample</GhostButton>
            <GhostButton onClick={() => { setForm(EMPTY); setErrors([]); setTotalsNote(null); }} className="w-full sm:w-auto">↺ Start fresh</GhostButton>
          </div>
          <p className="text-center text-xs text-zinc-500 sm:text-right">Planning model — not a Meta prediction. No data leaves your browser.</p>
        </div>
      </div>
    </div>
  );
}
