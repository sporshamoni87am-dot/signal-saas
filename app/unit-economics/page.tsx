'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CURRENCY_OPTIONS,
  buildUnitEconomicsSummaryText,
  calculateBreakEvenEcom,
  calculateBreakEvenLeadGen,
  calculateUnitEconomics,
  type CurrencySymbol,
  type UnitEconomicsInputs,
} from '@/lib/unit-economics';
import {
  HEATH_BREAKEVEN_LEADGEN_PRESETS,
  HEATH_SHEET1_EXAMPLES,
  type HeathBreakEvenLeadGenPreset,
  type HeathSheet1Example,
} from '@/lib/unit-economics-sample';
import { parseNum } from '@/lib/format';
import { Card, Field, GhostButton, PageHeader, SectionTitle, inputClassName } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * Ben Heath's calculator, rebuilt exactly — same inputs, same formulas,
 * same answers, $ only, like his Google Sheet in the video
 * ("The REAL Secret to Winning with Meta Ads", 11 Nov 2026).
 *
 * Section 1 = his Sheet 1 ("Sheet1"): 5 green "Input required" cells,
 * LTV =A4*A5, LTGP =A6*A7, CAC =C4/C5, LTGP:CAC =A8/C6 (plain number
 * in F4 — no ":1" in the cell). Section 2 = his break-even sheet:
 * Ecom (AOV, margin → gross profit on 1st transaction, acceptable
 * cost per purchase) and Lead Gen (1st transaction value, margin,
 * lead-to-client conversion → gross profit on 1st transaction,
 * acceptable cost per lead). The break-even cell formulas were never
 * shown in the video — they are inferred from values + spoken maths
 * and labelled as such.
 *
 * Everything below the "AdSignal Pro extras" divider is NOT part of
 * Ben Heath's calculator: currency symbol, totals helper, lever table,
 * scale verdict, copy/CSV, ROAS and profit-per-customer.
 */

function money(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function moneySym(sym: string, v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  return `${sym}${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/** Plain number, like Heath's F4 cell: 10, 12.5, 28.8 — never "10:1". */
function plainRatio(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  const rounded = Math.round(v * 100) / 100;
  return String(rounded);
}

function OutputRow({ label, value, formula, note }: { label: string; value: string; formula: string; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-zinc-800/60 px-4 py-3 first:border-t-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <div>
        <p className="text-sm font-semibold text-zinc-100">{label}</p>
        {note && <p className="text-xs text-zinc-500">{note}</p>}
      </div>
      <div className="sm:text-right">
        <p className="font-mono text-base font-semibold text-lime-300">{value}</p>
        <p className="font-mono text-xs text-zinc-500">{formula}</p>
      </div>
    </div>
  );
}

const INPUT_GREEN = 'border-lime-400/60 bg-lime-400/5';

/** Ben's Key box, as it appears on both of his sheets (rows 14–15 / 19–20). */
function KeyLegend() {
  return (
    <div className="mt-4 inline-flex flex-col gap-1.5 rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-400">
      <p className="font-semibold text-zinc-200">Key:</p>
      <p className="flex items-center gap-2">
        <span className="inline-block h-4 w-8 rounded-sm border border-lime-400/60 bg-lime-400/20" />
        Input required
      </p>
      <p className="flex items-center gap-2">
        <span className="inline-block h-4 w-8 rounded-sm border border-zinc-700 bg-zinc-950" />
        Calculated — do not type here
      </p>
    </div>
  );
}

export default function UnitEconomicsPage() {
  // ---- Section 1: Heath's Sheet 1, pre-filled with his base example ----
  const [aov, setAov] = useState('200');
  const [purchases, setPurchases] = useState('5');
  const [margin, setMargin] = useState('50');
  const [spend, setSpend] = useState('10000');
  const [customers, setCustomers] = useState('200');
  const [activeExample, setActiveExample] = useState('Base example');

  // ---- Section 2: Heath's break-even sheet ----
  const [beEcomAov, setBeEcomAov] = useState('200');
  const [beEcomMargin, setBeEcomMargin] = useState('50');
  const [beLeadValue, setBeLeadValue] = useState('1000');
  const [beLeadMargin, setBeLeadMargin] = useState('50');
  const [beLeadConversion, setBeLeadConversion] = useState('20');
  const [activeLeadPreset, setActiveLeadPreset] = useState('20% close rate');

  // ---- Extras (NOT part of Ben's calculator) ----
  const [currency, setCurrency] = useState<CurrencySymbol>('$');
  const [totalRevenue, setTotalRevenue] = useState('');
  const [totalCustomersForAvg, setTotalCustomersForAvg] = useState('');
  const [totalPurchases, setTotalPurchases] = useState('');
  const [totalsNote, setTotalsNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sheet1 = useMemo(() => {
    const inputs: UnitEconomicsInputs = {
      mode: 'ecommerce',
      currency: '$',
      aov: parseNum(aov),
      avgPurchases: parseNum(purchases),
      marginPct: parseNum(margin),
      adSpend: parseNum(spend),
      customersAcquired: parseNum(customers),
      leadsAcquired: null,
      leadToCustomerPct: null,
    };
    return { inputs, r: calculateUnitEconomics(inputs) };
  }, [aov, purchases, margin, spend, customers]);

  const beEcom = useMemo(
    () => calculateBreakEvenEcom(parseNum(beEcomAov), parseNum(beEcomMargin)),
    [beEcomAov, beEcomMargin],
  );
  const beLead = useMemo(
    () => calculateBreakEvenLeadGen(parseNum(beLeadValue), parseNum(beLeadMargin), parseNum(beLeadConversion)),
    [beLeadValue, beLeadMargin, beLeadConversion],
  );

  const r = sheet1.r;
  const sheet1Valid =
    parseNum(aov) !== null && parseNum(purchases) !== null && parseNum(margin) !== null && parseNum(spend) !== null && parseNum(customers) !== null;

  function loadExample(ex: HeathSheet1Example) {
    setAov(String(ex.aov));
    setPurchases(String(ex.avgPurchases));
    setMargin(String(ex.marginPct));
    setSpend(String(ex.adSpend));
    setCustomers(String(ex.customersAcquired));
    setActiveExample(ex.label);
  }

  function loadLeadPreset(p: HeathBreakEvenLeadGenPreset) {
    setBeLeadValue(String(p.firstTransactionValue));
    setBeLeadMargin(String(p.marginPct));
    setBeLeadConversion(String(p.conversionPct));
    setActiveLeadPreset(p.label);
  }

  function startFresh() {
    setAov(''); setPurchases(''); setMargin(''); setSpend(''); setCustomers('');
    setBeEcomAov(''); setBeEcomMargin('');
    setBeLeadValue(''); setBeLeadMargin(''); setBeLeadConversion('');
    setActiveExample(''); setActiveLeadPreset('');
    setTotalsNote(null);
  }

  function useTotals() {
    const rev = parseNum(totalRevenue);
    const cust = parseNum(totalCustomersForAvg);
    const purch = parseNum(totalPurchases);
    if (rev === null || cust === null || cust <= 0 || purch === null) {
      setTotalsNote('Fill in all three totals first — total revenue, total customers and total purchases.');
      return;
    }
    const newAov = Math.round((rev / cust) * 100) / 100;
    const newAvg = Math.round((purch / cust) * 100) / 100;
    setAov(String(newAov));
    setPurchases(String(newAvg));
    setTotalsNote(`Done — AOV $${newAov.toLocaleString()} and average purchases ${newAvg} filled in from your totals.`);
  }

  function onCopy() {
    navigator.clipboard
      .writeText(buildUnitEconomicsSummaryText(sheet1.inputs, r))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => setCopied(false));
  }

  function onCsv() {
    const rows: [string, string][] = [
      ['AOV', money(parseNum(aov))],
      ['No. of purchases', purchases],
      ['Gross Profit Margin %', margin],
      ['Total ad spend', money(parseNum(spend))],
      ['No. of customers acquired', customers],
      ['LTV (Lifetime revenue per customer)', money(r.lifetimeRevenuePerCustomer)],
      ['LTGP (Lifetime Gross Profit)', money(r.ltgp)],
      ['CAC', money(r.cac)],
      ['LTGP:CAC ratio', plainRatio(r.ltgpCacRatio)],
      ['Break-even Ecom — AOV', money(parseNum(beEcomAov))],
      ['Break-even Ecom — Gross Profit Margin %', beEcomMargin],
      ['Break-even Ecom — Gross Profit on 1st transaction', money(beEcom.grossProfitFirst)],
      ['Break-even Ecom — Acceptable cost per purchase', money(beEcom.acceptableCpp)],
      ['Break-even Lead Gen — 1st transaction value', money(parseNum(beLeadValue))],
      ['Break-even Lead Gen — Gross Profit Margin %', beLeadMargin],
      ['Break-even Lead Gen — Lead-to-client conversion %', beLeadConversion],
      ['Break-even Lead Gen — Gross Profit on 1st transaction', money(beLead.grossProfitFirst)],
      ['Break-even Lead Gen — Acceptable cost per lead', money(beLead.acceptableCpl)],
    ];
    const csv = rows.map(([k, v]) => `"${k}","${String(v).replaceAll('"', '""')}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'unit-economics-ben-heath.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const numInput = (value: string, set: (v: string) => void, extra?: string) => (
    <input
      type="number" min="0" step="any" inputMode="decimal" value={value}
      onChange={(e) => set(e.target.value)}
      className={cn(inputClassName, INPUT_GREEN, extra)}
      placeholder="0"
    />
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader title="Unit Economics Calculator" sub="Ben Heath’s calculator, rebuilt exactly — same inputs, same formulas, same answers." />

      <p className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm leading-relaxed text-zinc-300">
        This is the Google Sheet from Ben Heath’s video “The REAL Secret to Winning with Meta Ads” (11 Nov 2026), rebuilt as a web
        calculator. His sheet isn’t downloadable — no link exists, and he told a commenter the sheets live in his Skool community —
        so this is rebuilt from the formulas read from his formula bar and the values shown on screen. The answers update as you
        type, exactly like a spreadsheet. <strong className="text-zinc-100">$ only, like his sheet.</strong>
      </p>

      <div className="no-print mb-6 flex flex-wrap items-center gap-2">
        {HEATH_SHEET1_EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            onClick={() => loadExample(ex)}
            title={ex.note}
            className={cn(
              'min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition',
              activeExample === ex.label
                ? 'border-lime-400/70 bg-lime-400/10 text-lime-200'
                : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500',
            )}
          >
            {ex.label} <span className="text-xs text-zinc-500">· {ex.note}</span>
          </button>
        ))}
        <button type="button" onClick={startFresh} className="min-h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500">
          ↺ Start fresh
        </button>
        <Link href="/how-it-works" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-lime-300 transition hover:text-lime-200">
          How it works →
        </Link>
      </div>

      {/* ============ SECTION 1 — Heath's Sheet 1 ============ */}
      <Card className="mb-6">
        <SectionTitle hint="His Sheet 1. The 5 green cells are the only inputs — “Input required”. No other fields exist on his sheet.">
          LTGP &amp; CAC — Ben Heath’s Sheet 1
        </SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="AOV ($) *">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
              {numInput(aov, setAov, 'pl-8')}
            </div>
          </Field>
          <Field label="No. of purchases *">
            {numInput(purchases, setPurchases)}
          </Field>
          <Field label="Gross Profit Margin (%) *">
            <div className="relative">
              {numInput(margin, setMargin, 'pr-10')}
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
            </div>
          </Field>
          <Field label="Total ad spend ($) *">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
              {numInput(spend, setSpend, 'pl-8')}
            </div>
          </Field>
          <Field label="No. of customers acquired *">
            {numInput(customers, setCustomers)}
          </Field>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-zinc-500">
          Averages must come from totals, not guesses: AOV = total revenue ÷ customers; purchases = total purchases ÷ customers.
          For Bangladesh F-commerce, “customers acquired” means delivered, paid customers — COD orders that cancel, return or never
          pay are not customers yet.
        </p>

        <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-800">
          <OutputRow label="LTV — Lifetime revenue per customer" value={money(r.lifetimeRevenuePerCustomer)} formula="= AOV × No. of purchases  (=A4*A5)" note="His sheet: $1,000 in the base example" />
          <OutputRow label="LTGP — Lifetime Gross Profit" value={money(r.ltgp)} formula="= LTV × Gross Profit Margin  (=A6*A7)" note="His sheet: $500 in the base example" />
          <OutputRow label="CAC — Cost to acquire a customer" value={money(r.cac)} formula="= Total ad spend ÷ No. of customers  (=C4/C5)" note="His sheet: $50 in the base example" />
          <OutputRow label="LTGP : CAC ratio" value={plainRatio(r.ltgpCacRatio)} formula="= LTGP ÷ CAC  (=A8/C6)" note="Plain number, like his F4 cell — 10 in the base example, not “10:1”" />
        </div>
        {!sheet1Valid && (
          <p className="mt-3 text-sm text-amber-300">Fill in all 5 inputs above to see the answers.</p>
        )}
        <KeyLegend />
      </Card>

      {/* ============ SECTION 2 — Heath's break-even sheet ============ */}
      <Card className="mb-6">
        <SectionTitle hint="His second sheet, from 15:10 in the video. Two layouts: Ecom and Lead Gen.">
          Break-even — the most you can pay
        </SectionTitle>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
          Honest note: the video never shows this sheet’s formula bar, so these two multiplications are <em>inferred</em> from the
          values on screen and what Ben says aloud — not read from a formula. They match every value shown.
        </p>

        <h3 className="mb-3 mt-5 text-sm font-semibold tracking-wide text-zinc-200">Ecom</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="AOV ($) *">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
              {numInput(beEcomAov, setBeEcomAov, 'pl-8')}
            </div>
          </Field>
          <Field label="Gross Profit Margin (%) *">
            <div className="relative">
              {numInput(beEcomMargin, setBeEcomMargin, 'pr-10')}
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
            </div>
          </Field>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">
          <OutputRow label="Gross Profit on 1st transaction" value={money(beEcom.grossProfitFirst)} formula="= AOV × Gross Profit Margin  (inferred)" note="His sheet: $100 at $200 × 50%" />
          <OutputRow label="Acceptable cost per purchase" value={money(beEcom.acceptableCpp)} formula="= Gross Profit on 1st transaction  (inferred — identical in every frame)" note="His sheet: $100 — pay more and the first order loses money" />
        </div>

        <h3 className="mb-3 mt-6 text-sm font-semibold tracking-wide text-zinc-200">Lead Gen</h3>
        <div className="no-print mb-3 flex flex-wrap gap-2">
          {HEATH_BREAKEVEN_LEADGEN_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => loadLeadPreset(p)}
              title={p.note}
              className={cn(
                'min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition',
                activeLeadPreset === p.label
                  ? 'border-lime-400/70 bg-lime-400/10 text-lime-200'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500',
              )}
            >
              {p.label} <span className="text-xs text-zinc-500">· {p.note}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="1st transaction value ($) *">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
              {numInput(beLeadValue, setBeLeadValue, 'pl-8')}
            </div>
          </Field>
          <Field label="Gross Profit Margin (%) *">
            <div className="relative">
              {numInput(beLeadMargin, setBeLeadMargin, 'pr-10')}
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
            </div>
          </Field>
          <Field label="Lead-to-client conversion (%) *">
            <div className="relative">
              {numInput(beLeadConversion, setBeLeadConversion, 'pr-10')}
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
            </div>
          </Field>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">
          <OutputRow label="Gross Profit on 1st transaction" value={money(beLead.grossProfitFirst)} formula="= 1st transaction value × Gross Profit Margin  (inferred)" note="His sheet: $500 at $1,000 × 50%" />
          <OutputRow label="Acceptable cost per lead" value={money(beLead.acceptableCpl)} formula="= Gross Profit on 1st transaction × lead-to-client conversion  (inferred)" note="His sheet: $100 at 20% close rate — $75 at 10%, $225 at 30%" />
        </div>
        <KeyLegend />
      </Card>

      {/* ============ EXTRAS — NOT part of Ben Heath's calculator ============ */}
      <div className="mb-6 rounded-2xl border border-dashed border-zinc-700 p-4 sm:p-5">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-100">AdSignal Pro extras — not part of Ben Heath’s calculator</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">
          Everything in this box is our addition. Ben’s sheet has none of it: no currency choice, no totals helper, no lever table,
          no scale verdict, no copy/CSV, no ROAS or profit-per-customer. It is kept separate so the calculator above stays 100% his.
        </p>

        <div className="mt-5">
          <p className="text-sm font-semibold text-zinc-100">Currency — symbol only, no conversion</p>
          <p className="mt-1 text-xs text-zinc-500">Ben’s sheet is $ only. Picking another symbol below only re-labels the headline numbers in the extras — it never converts them.</p>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencySymbol)} className={cn(inputClassName, 'mt-2 max-w-xs')}>
            {CURRENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
              <p className="text-xs text-zinc-500">LTGP (in {currency})</p>
              <p className="mt-0.5 font-mono text-base font-semibold text-zinc-100">{moneySym(currency, r.ltgp)}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
              <p className="text-xs text-zinc-500">CAC (in {currency})</p>
              <p className="mt-0.5 font-mono text-base font-semibold text-zinc-100">{moneySym(currency, r.cac)}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
              <p className="text-xs text-zinc-500">Profit / customer after ads</p>
              <p className="mt-0.5 font-mono text-base font-semibold text-zinc-100">{moneySym(currency, r.profitPerCustomerAfterAds)}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
              <p className="text-xs text-zinc-500">First-order ROAS / break-even</p>
              <p className="mt-0.5 font-mono text-base font-semibold text-zinc-100">
                {r.firstOrderRoas !== null ? `${r.firstOrderRoas.toFixed(2)}×` : '—'} / {r.breakEvenRoas !== null ? `${r.breakEvenRoas.toFixed(2)}×` : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm font-semibold text-zinc-100">Calculate AOV &amp; average purchases from totals</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">Heath’s rule: don’t guess the averages. Total revenue ÷ total customers = AOV. Total purchases ÷ total customers = average purchases. This fills in the Sheet 1 inputs above.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Total revenue">
              <input type="number" min="0" step="any" inputMode="decimal" value={totalRevenue} onChange={(e) => setTotalRevenue(e.target.value)} className={inputClassName} placeholder="0" />
            </Field>
            <Field label="Total customers">
              <input type="number" min="0" step="any" inputMode="decimal" value={totalCustomersForAvg} onChange={(e) => setTotalCustomersForAvg(e.target.value)} className={inputClassName} placeholder="0" />
            </Field>
            <Field label="Total purchases">
              <input type="number" min="0" step="any" inputMode="decimal" value={totalPurchases} onChange={(e) => setTotalPurchases(e.target.value)} className={inputClassName} placeholder="0" />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <GhostButton onClick={useTotals}>Use these totals</GhostButton>
            {totalsNote && <p className="text-xs text-lime-300">{totalsNote}</p>}
          </div>
        </div>

        {r.ready && (
          <>
            <h3 className="mb-3 mt-6 text-base font-semibold text-zinc-100">What moves LTGP most?</h3>
            <p className="mb-3 text-sm text-zinc-400">
              Heath’s sensitivity test: improving the customer is usually a bigger lever than improving CAC. Each row changes one
              thing only, holding CAC the same.
            </p>
            <div className="overflow-hidden rounded-2xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-zinc-500">
                    <th className="px-4 py-3 font-semibold">Lever</th>
                    <th className="px-4 py-3 font-semibold">New LTGP</th>
                    <th className="px-4 py-3 font-semibold">Change</th>
                    <th className="px-4 py-3 font-semibold">New ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {r.levers.map((l) => (
                    <tr key={l.label} className="border-t border-zinc-800/60 align-top">
                      <td className="px-4 py-3"><span className="font-semibold text-zinc-100">{l.label}</span><br /><span className="text-xs text-zinc-500">{l.change}</span></td>
                      <td className="px-4 py-3 font-mono text-zinc-100">{moneySym(currency, l.newLtgp)}</td>
                      <td className="px-4 py-3 font-mono text-lime-300">{l.deltaLtgp !== null ? `+${moneySym(currency, l.deltaLtgp)}` : '—'}</td>
                      <td className="px-4 py-3 font-mono text-zinc-300">{l.newRatio !== null ? plainRatio(l.newRatio) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="mb-3 mt-6 text-base font-semibold text-zinc-100">Scale verdict (AdSignal Pro guidance)</h3>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-base font-bold text-zinc-100">{r.verdictHeadline}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{r.verdictDetail}</p>
              <p className="mt-3 text-xs text-zinc-500">
                Ben Heath’s video gives no band thresholds, only the headroom principle — scale aggressively when actual cost is far
                below acceptable cost. These bands are ours, labelled as such.
              </p>
            </div>

            <div className="no-print mt-5 flex flex-wrap gap-2">
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
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-zinc-500">
        Based on Ben Heath’s LTGP:CAC framework (“The REAL Secret to Winning with Meta Ads”, 11 Nov 2026). Rebuilt, not affiliated
        with or endorsed by Ben Heath, and not connected to Meta. Gross margin deducts direct costs only, not overheads. No data is
        uploaded; calculations run in this browser.
      </p>
    </div>
  );
}
