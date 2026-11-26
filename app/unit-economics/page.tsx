'use client';

import { useMemo, useState } from 'react';
import {
  CURRENCY_OPTIONS,
  buildUnitEconomicsSummaryText,
  calculateBreakEvenEcom,
  calculateBreakEvenLeadGen,
  calculateUnitEconomics,
  type CurrencySymbol,
  type UnitEconomicsInputs,
  type UnitEconomicsMode,
} from '@/lib/unit-economics';
import { parseNum } from '@/lib/format';
import { Card, Field, GhostButton, PageHeader, SectionTitle, inputClassName } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * AdSignal Pro — Unit Economics Calculator.
 *
 * Two calculators, built for anyone to use:
 *  1. What is one customer worth? (lifetime value, lifetime profit, CAC, ratio)
 *  2. Break-even: the most you can pay per purchase / per lead.
 *
 * Design rules for this page: simple first, depth on demand. The two
 * calculators and their answers are visible immediately, in plain
 * English, with example numbers already filled in. Everything advanced
 * (levers, ROAS, export, totals helper) sits behind one collapsed
 * "Advanced" section. No jargon in the main flow, no clutter above
 * the first calculator.
 */

function money(sym: string, v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  return `${sym}${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/** Plain number: 10, 12.5, 28.8. */
function plainNumber(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return '—';
  return String(Math.round(v * 100) / 100);
}

function ResultRow({ label, value, plain }: { label: string; value: string; plain: string }) {
  return (
    <div className="border-t border-zinc-200 px-1 py-4 first:border-t-0 sm:flex sm:items-baseline sm:justify-between sm:gap-6 sm:px-2">
      <div>
        <p className="text-sm font-semibold text-zinc-900">{label}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-zinc-600">{plain}</p>
      </div>
      <p className="mt-1 shrink-0 font-mono text-xl font-bold text-red-700 sm:mt-0">{value}</p>
    </div>
  );
}

const EXAMPLE = { aov: '200', purchases: '5', margin: '50', spend: '10000', customers: '200', leads: '2000', leadConversion: '10' };

export default function UnitEconomicsPage() {
  // ---- Calculator 1: what is one customer worth? ----
  const [currency, setCurrency] = useState<CurrencySymbol>('$');
  const [calc1Mode, setCalc1Mode] = useState<UnitEconomicsMode>('ecommerce');
  const [aov, setAov] = useState(EXAMPLE.aov);
  const [purchases, setPurchases] = useState(EXAMPLE.purchases);
  const [margin, setMargin] = useState(EXAMPLE.margin);
  const [spend, setSpend] = useState(EXAMPLE.spend);
  const [customers, setCustomers] = useState(EXAMPLE.customers);
  // Lead-gen mode: customers are derived (leads × conversion), never typed.
  const [leads, setLeads] = useState(EXAMPLE.leads);
  const [leadConversion, setLeadConversion] = useState(EXAMPLE.leadConversion);

  // ---- Calculator 2: break-even (independent inputs) ----
  const [beEcomAov, setBeEcomAov] = useState('200');
  const [beEcomMargin, setBeEcomMargin] = useState('50');
  const [beLeadValue, setBeLeadValue] = useState('1000');
  const [beLeadMargin, setBeLeadMargin] = useState('75');
  const [beLeadConversion, setBeLeadConversion] = useState('10');

  // ---- Advanced / helpers (collapsed by default) ----
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [totalsOpen, setTotalsOpen] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState('');
  const [totalCustomersForAvg, setTotalCustomersForAvg] = useState('');
  const [totalPurchases, setTotalPurchases] = useState('');
  const [totalsNote, setTotalsNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sym = currency;

  const calc1 = useMemo(() => {
    const inputs: UnitEconomicsInputs = {
      mode: calc1Mode,
      currency,
      aov: parseNum(aov),
      avgPurchases: parseNum(purchases),
      marginPct: parseNum(margin),
      adSpend: parseNum(spend),
      customersAcquired: calc1Mode === 'ecommerce' ? parseNum(customers) : null,
      leadsAcquired: calc1Mode === 'leadgen' ? parseNum(leads) : null,
      leadToCustomerPct: calc1Mode === 'leadgen' ? parseNum(leadConversion) : null,
    };
    return { inputs, r: calculateUnitEconomics(inputs) };
  }, [calc1Mode, currency, aov, purchases, margin, spend, customers, leads, leadConversion]);

  const beEcom = useMemo(
    () => calculateBreakEvenEcom(parseNum(beEcomAov), parseNum(beEcomMargin)),
    [beEcomAov, beEcomMargin],
  );
  const beLead = useMemo(
    () => calculateBreakEvenLeadGen(parseNum(beLeadValue), parseNum(beLeadMargin), parseNum(beLeadConversion)),
    [beLeadValue, beLeadMargin, beLeadConversion],
  );

  const r = calc1.r;
  // E-commerce needs 5 boxes; lead-gen swaps "customers won" for two
  // boxes (leads + conversion), so it needs 6.
  const calc1Valid =
    parseNum(aov) !== null && parseNum(purchases) !== null && parseNum(margin) !== null &&
    parseNum(spend) !== null &&
    (calc1Mode === 'ecommerce'
      ? parseNum(customers) !== null
      : parseNum(leads) !== null && parseNum(leadConversion) !== null);
  const calc1BoxCount = calc1Mode === 'leadgen' ? 'six' : 'five';

  function loadExample() {
    setAov(EXAMPLE.aov);
    setPurchases(EXAMPLE.purchases);
    setMargin(EXAMPLE.margin);
    setSpend(EXAMPLE.spend);
    setCustomers(EXAMPLE.customers);
    setLeads(EXAMPLE.leads);
    setLeadConversion(EXAMPLE.leadConversion);
    setTotalsNote(null);
  }

  function clearAll() {
    setAov(''); setPurchases(''); setMargin(''); setSpend(''); setCustomers('');
    setLeads(''); setLeadConversion('');
    setTotalsNote(null);
  }

  function useTotals() {
    const rev = parseNum(totalRevenue);
    const cust = parseNum(totalCustomersForAvg);
    const purch = parseNum(totalPurchases);
    if (rev === null || cust === null || cust <= 0 || purch === null || purch <= 0) {
      setTotalsNote('Fill in all three totals first — total revenue, total customers and total purchases.');
      return;
    }
    const newAov = Math.round((rev / purch) * 100) / 100;
    const newAvg = Math.round((purch / cust) * 100) / 100;
    setAov(String(newAov));
    setPurchases(String(newAvg));
    setTotalsNote(`Done — average order value ${sym}${newAov.toLocaleString()} and ${newAvg} purchases per customer, filled in from your totals.`);
  }

  function onCopy() {
    navigator.clipboard
      .writeText(buildUnitEconomicsSummaryText(calc1.inputs, r))
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => setCopied(false));
  }

  function onCsv() {
    const rows: [string, string][] = [
      ['Average order value', money(sym, parseNum(aov))],
      ['Purchases per customer', purchases],
      ['Gross profit margin %', margin],
      ['Total ad spend', money(sym, parseNum(spend))],
      ...(calc1Mode === 'leadgen'
        ? [
            ['Leads won', leads],
            ['Lead-to-customer conversion %', leadConversion],
            ['Customers won (derived)', r.customers !== null ? String(Math.round(r.customers * 100) / 100) : '—'],
          ] as [string, string][]
        : [['Customers won', customers] as [string, string]]),
      ['Lifetime value per customer', money(sym, r.lifetimeRevenuePerCustomer)],
      ['Lifetime profit per customer', money(sym, r.ltgp)],
      ['Cost per customer (CAC)', money(sym, r.cac)],
      ...(calc1Mode === 'leadgen'
        ? [['Cost per lead (CPL)', money(sym, r.cpl)] as [string, string]]
        : []),
      ['Lifetime profit vs cost', plainNumber(r.ltgpCacRatio)],
      ['Profit on first order', money(sym, r.firstOrderGrossProfit)],
      ['Most you can pay per purchase', money(sym, r.acceptableCpp)],
      ['Break-even — profit on first order', money(sym, beEcom.grossProfitFirst)],
      ['Break-even — most you can pay per purchase', money(sym, beEcom.acceptableCpp)],
      ['Break-even lead gen — profit on first sale', money(sym, beLead.grossProfitFirst)],
      ['Break-even lead gen — most you can pay per lead', money(sym, beLead.acceptableCpl)],
    ];
    const csv = rows.map(([k, v]) => `"${k}","${String(v).replaceAll('"', '""')}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'unit-economics.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const numInput = (value: string, set: (v: string) => void, extra?: string) => (
    <input
      type="number" min="0" step="any" inputMode="decimal" value={value}
      onChange={(e) => set(e.target.value)}
      className={cn(inputClassName, 'min-h-12 text-base', extra)}
      placeholder="0"
    />
  );

  const ratioSentence =
    r.ltgpCacRatio !== null
      ? r.ltgpCacRatio >= 1
        ? `For every ${sym}1 it costs to win a customer, you earn ${sym}${plainNumber(r.ltgpCacRatio)} in lifetime profit.`
        : `For every ${sym}1 it costs to win a customer, you earn back only ${sym}${plainNumber(r.ltgpCacRatio)} in lifetime profit — less than it costs to win them.`
      : 'Fill in the numbers above to see this.';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        title="Unit Economics Calculator"
        sub="What is one customer worth to your business — and what is the most you can afford to pay to win one?"
      />
      <p className="mb-6 text-sm leading-relaxed text-zinc-600">
        Type your numbers below — the answers appear as you type. Example numbers are already filled in so you can see
        how it works; replace them with yours. Free, no sign-up, nothing is uploaded.
      </p>

      {/* How it works — 3 short steps */}
      <ol className="mb-8 grid gap-2 sm:grid-cols-3">
        {[
          ['1', 'Enter your numbers', 'Your prices, costs and ad spend.'],
          ['2', 'See what a customer is worth', 'Lifetime value, profit and cost per customer.'],
          ['3', 'See the most you can pay', 'Your break-even cost per purchase and per lead.'],
        ].map(([n, title, desc]) => (
          <li key={n} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-sm font-bold text-red-700">{n}. {title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{desc}</p>
          </li>
        ))}
      </ol>

      {/* ================= Calculator 1 ================= */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionTitle hint="Lifetime value, lifetime profit, cost per customer — the three numbers that decide whether your ads can work.">
            Calculator 1 — What is one customer worth?
          </SectionTitle>
          <Field label="Currency">
            <select
              value={currency}
              onChange={(e) => { setCurrency(e.target.value as CurrencySymbol); setTotalsNote(null); }}
              className={cn(inputClassName, 'min-h-11 w-28')}
              aria-label="Currency — symbol only, numbers are not converted"
            >
              {CURRENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label.split(' — ')[0]}</option>
              ))}
            </select>
          </Field>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Currency is a label only — it never converts your numbers.</p>

        {/* E-commerce or lead-gen: same maths, different last boxes. */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-zinc-300 bg-white p-1" role="group" aria-label="Business model">
            <button
              type="button"
              onClick={() => setCalc1Mode('ecommerce')}
              aria-pressed={calc1Mode === 'ecommerce'}
              className={cn('min-h-9 rounded-lg px-3 text-sm font-medium transition', calc1Mode === 'ecommerce' ? 'bg-red-600 text-white' : 'text-zinc-600 hover:text-zinc-900')}
            >
              E-commerce
            </button>
            <button
              type="button"
              onClick={() => setCalc1Mode('leadgen')}
              aria-pressed={calc1Mode === 'leadgen'}
              className={cn('min-h-9 rounded-lg px-3 text-sm font-medium transition', calc1Mode === 'leadgen' ? 'bg-red-600 text-white' : 'text-zinc-600 hover:text-zinc-900')}
            >
              Lead-gen
            </button>
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">
            {calc1Mode === 'ecommerce'
              ? 'You sell products online — enter the customers this spend won.'
              : 'You buy leads for a service — enter the leads this spend won and how many become paying customers. Customers are worked out from leads × conversion, never typed separately.'}
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Average order value *" hint={`What a customer spends on a typical order. Example: ${sym}200.`}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">{sym}</span>
              {numInput(aov, setAov, 'pl-8')}
            </div>
          </Field>
          <Field label="How many times does one customer buy? *" hint="Total orders ÷ total customers. Enter 1 if they buy only once.">
            {numInput(purchases, setPurchases)}
          </Field>
          <Field label="Gross profit margin *" hint="After product and delivery costs, before ads. Not after rent or salaries.">
            <div className="relative">
              {numInput(margin, setMargin, 'pr-10')}
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
            </div>
          </Field>
          <Field label="Total ad spend *" hint="The ad spend that won these customers, for the same period.">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">{sym}</span>
              {numInput(spend, setSpend, 'pl-8')}
            </div>
          </Field>
          {calc1Mode === 'ecommerce' ? (
            <Field label="Customers won *" hint="Paying customers this spend won. Count delivered, paid customers only — not messages or unpaid orders.">
              {numInput(customers, setCustomers)}
            </Field>
          ) : (
            <>
              <Field label="Leads won *" hint="Leads this spend won — enquiries, form fills or calls.">
                {numInput(leads, setLeads)}
              </Field>
              <Field label="How many leads become customers? *" hint="Out of 100 leads, how many pay? Example: 10 means 1 in 10.">
                <div className="relative">
                  {numInput(leadConversion, setLeadConversion, 'pr-10')}
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
                </div>
              </Field>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <GhostButton onClick={loadExample}>Use example numbers</GhostButton>
          <GhostButton onClick={clearAll}>Clear</GhostButton>
          <button
            type="button"
            onClick={() => setTotalsOpen((v) => !v)}
            className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-red-700 transition hover:text-red-800"
          >
            Don’t know your averages? Work them out from your totals {totalsOpen ? '▴' : '▾'}
          </button>
        </div>

        {totalsOpen && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-sm font-semibold text-zinc-900">Work out your averages from totals</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Average order value = total revenue ÷ total purchases. Purchases per customer = total purchases ÷ total customers.
            </p>
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
              {totalsNote && <p className="text-xs text-emerald-700">{totalsNote}</p>}
            </div>
          </div>
        )}

        <h3 className="mb-1 mt-6 text-base font-semibold text-zinc-900">Your answers</h3>
        {calc1Valid ? (
          <div>
            <ResultRow label="Lifetime value — what one customer spends with you" value={money(sym, r.lifetimeRevenuePerCustomer)} plain="Average order value × how many times they buy." />
            <ResultRow label="Lifetime profit — what one customer is worth" value={money(sym, r.ltgp)} plain="Lifetime value × your gross profit margin. This is the real amount you can spend to win one customer." />
            <ResultRow label="Cost per customer — what you pay to win one" value={money(sym, r.cac)} plain="Total ad spend ÷ customers won." />
            {calc1Mode === 'leadgen' && (
              <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                Customers won: {r.customers !== null ? Math.round(r.customers * 100) / 100 : '—'} — worked out from
                {' '}{leads || '—'} leads × {leadConversion || '—'}% conversion, never typed separately.
                Cost per lead: {money(sym, r.cpl)}.
              </p>
            )}
            <ResultRow label="Value vs. cost" value={plainNumber(r.ltgpCacRatio)} plain={ratioSentence} />
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-sm font-bold text-zinc-900">{r.verdictHeadline}</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">{r.verdictDetail}</p>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
            Fill in all {calc1BoxCount} boxes above to see your answers.
          </p>
        )}
      </Card>

      {/* ================= Calculator 2 ================= */}
      <Card className="mb-6">
        <SectionTitle hint="The safe rule: break even on the first sale, before counting repeat purchases.">
          Calculator 2 — The most you can pay
        </SectionTitle>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          These two boxes work on their own — changing them does not change Calculator 1.
        </p>

        <h3 className="mb-3 mt-6 text-sm font-semibold tracking-wide text-zinc-700">If you sell a product</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Average order value *" hint="What a customer spends on a typical first order.">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">{sym}</span>
              {numInput(beEcomAov, setBeEcomAov, 'pl-8')}
            </div>
          </Field>
          <Field label="Gross profit margin *" hint="After product and delivery costs, before ads.">
            <div className="relative">
              {numInput(beEcomMargin, setBeEcomMargin, 'pr-10')}
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
            </div>
          </Field>
        </div>
        <div className="mt-2">
          <ResultRow label="Profit on the first order" value={money(sym, beEcom.grossProfitFirst)} plain="Average order value × gross profit margin." />
          <ResultRow label="Most you can pay per purchase" value={money(sym, beEcom.acceptableCpp)} plain="Pay more than this per purchase and the first order loses money." />
        </div>

        <h3 className="mb-3 mt-6 text-sm font-semibold tracking-wide text-zinc-700">If you sell a service and buy leads</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="First sale value *" hint="What one new client pays you the first time.">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">{sym}</span>
              {numInput(beLeadValue, setBeLeadValue, 'pl-8')}
            </div>
          </Field>
          <Field label="Gross profit margin *" hint="After the direct cost of delivering the service.">
            <div className="relative">
              {numInput(beLeadMargin, setBeLeadMargin, 'pr-10')}
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
            </div>
          </Field>
          <Field label="How many leads become clients? *" hint="Out of 100 leads, how many pay? Example: 20 means 1 in 5.">
            <div className="relative">
              {numInput(beLeadConversion, setBeLeadConversion, 'pr-10')}
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">%</span>
            </div>
          </Field>
        </div>
        <div className="mt-2">
          <ResultRow label="Profit on the first sale" value={money(sym, beLead.grossProfitFirst)} plain="First sale value × gross profit margin." />
          <ResultRow label="Most you can pay per lead" value={money(sym, beLead.acceptableCpl)} plain="Profit on the first sale × how many leads become clients. Fixing follow-up is often worth more than cheaper leads." />
        </div>
      </Card>

      {/* ================= Advanced (collapsed by default) ================= */}
      <Card className="mb-6">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={advancedOpen}
        >
          <span>
            <span className="text-base font-semibold text-zinc-900">Advanced — what moves the number most</span>
            <span className="mt-0.5 block text-sm text-zinc-500">Levers, ROAS and export. Optional — the two calculators above are the whole tool.</span>
          </span>
          <span className="shrink-0 text-lg text-zinc-600">{advancedOpen ? '▴' : '▾'}</span>
        </button>

        {advancedOpen && r.ready && (
          <div className="mt-5">
            <h3 className="mb-3 text-sm font-semibold text-zinc-900">What moves lifetime profit most?</h3>
            <p className="mb-3 text-sm text-zinc-600">
              Each row changes one thing only, keeping your cost per customer the same. Improving the customer is
              usually a bigger lever than cheaper ads.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-zinc-200">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="px-4 py-3 font-semibold">Change</th>
                    <th className="px-4 py-3 font-semibold">New lifetime profit</th>
                    <th className="px-4 py-3 font-semibold">Gain</th>
                    <th className="px-4 py-3 font-semibold">New value vs. cost</th>
                  </tr>
                </thead>
                <tbody>
                  {r.levers.map((l) => (
                    <tr key={l.label} className="border-t border-zinc-200 align-top">
                      <td className="px-4 py-3"><span className="font-semibold text-zinc-900">{l.label}</span><br /><span className="text-xs text-zinc-500">{l.change}</span></td>
                      <td className="px-4 py-3 font-mono text-zinc-900">{money(sym, l.newLtgp)}</td>
                      <td className="px-4 py-3 font-mono text-emerald-700">{l.deltaLtgp !== null ? `+${money(sym, l.deltaLtgp)}` : '—'}</td>
                      <td className="px-4 py-3 font-mono text-zinc-600">{l.newRatio !== null ? plainNumber(l.newRatio) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="mb-3 mt-6 text-sm font-semibold text-zinc-900">Extra numbers</h3>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ['Profit per customer after ads', money(sym, r.profitPerCustomerAfterAds)],
                ['First-order ROAS', r.firstOrderRoas !== null ? `${r.firstOrderRoas.toFixed(2)}×` : '—'],
                ['Break-even ROAS', r.breakEvenRoas !== null ? `${r.breakEvenRoas.toFixed(2)}×` : '—'],
                ['Total profit after ads', money(sym, r.totalProfitAfterAds)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs text-zinc-500">{label}</p>
                  <p className="mt-0.5 font-mono text-base font-semibold text-zinc-900">{value}</p>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              ROAS means return on ad spend — revenue for every {sym}1 of ad spend. First-order
              ROAS uses first-order revenue only; break-even ROAS (1 ÷ margin) is the ROAS at
              which the first order breaks even.
            </p>

            <div className="no-print mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={onCopy} className="inline-flex min-h-11 items-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400">
                {copied ? '✓ Copied to clipboard' : '⧉ Copy summary'}
              </button>
              <button type="button" onClick={onCsv} className="inline-flex min-h-11 items-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400">
                ⭳ Export CSV
              </button>
              <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400">
                ⎙ Print / save PDF
              </button>
            </div>
          </div>
        )}
        {advancedOpen && !r.ready && (
          <p className="mt-4 text-sm text-zinc-600">Fill in all {calc1BoxCount} boxes in Calculator 1 to see the advanced numbers.</p>
        )}
      </Card>

      <p className="text-center text-xs leading-relaxed text-zinc-500">
        How it works: lifetime profit = average order value × purchases per customer × gross profit margin. Cost per
        customer = ad spend ÷ customers won. Gross margin counts direct costs only (product, delivery, service) — not
        rent or salaries. This is a planning tool, not a prediction. Method popularised by Ben Heath.
      </p>
    </div>
  );
}
