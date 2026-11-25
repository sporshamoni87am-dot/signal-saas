/**
 * Meta Ads Signal Assistance — Unit Economics Calculator.
 *
 * Pure, transparent math. No AI, no hidden scoring, no Meta API calls.
 * Based on Ben Heath, "The REAL Secret to Winning with Meta Ads"
 * (11 Nov 2026, https://www.youtube.com/watch?v=S7K_RybaTmw), checked
 * against the video transcript and on-screen sheet on 25 Nov 2026.
 *
 * Heath's formulas — LTGP/CAC sheet, read directly from the Google
 * Sheets formula bar in the video (frame-by-frame re-check, 25 Nov 2026):
 * - LTV (lifetime revenue per customer) = AOV x average purchases
 *     Sheet: =A4*A5  (A6, value $1,000 in the base example)
 * - LTGP = LTV x gross profit margin = AOV x average purchases x margin
 *     Sheet: =A6*A7  (A8, value $500 in the base example)
 * - CAC = total ad spend / customers acquired
 *     Sheet: =C4/C5  (C6, value $50 in the base example)
 * - LTGP:CAC ratio = LTGP / CAC
 *     Sheet: =A8/C6  (F4, value 10 in the base example, plain number)
 * - The sheet has exactly 5 green "Input required" cells: AOV, No. of
 *   purchases, Gross Profit Margin, Total ad spend, No. of customers
 *   acquired. No field for overheads, delivery, returns, churn or currency.
 * - The sheet itself cannot be downloaded: no link in the description,
 *   pinned comment or on screen. Ben's reply to a commenter says the
 *   sheets are resources in his Skool community.
 *
 * Break-even sheet (second layout, from 15:10) — formulas NOT shown in
 * the video (no formula bar in frame). The values + spoken maths are
 * consistent with, and only inferred as:
 * - Gross profit on 1st transaction = AOV (or 1st transaction value)
 *   x gross profit margin
 * - Acceptable cost per purchase = that gross profit (identical in
 *   every frame shown)
 * - Acceptable cost per lead = lead-gen gross profit
 *   x lead-to-customer conversion rate
 * Do NOT present those break-even cell formulas as "as shown" — they
 * are arithmetic inferences. The calculator below implements them as
 * the same multiplications, labelled as such in the UI formula table.
 *
 * Worked example from the video (verified):
 *   AOV $200, 5 purchases, 50% margin -> LTGP $500
 *   Spend $10,000, 200 customers -> CAC $50, LTGP:CAC 10:1
 *   AOV $200 x 50% -> acceptable CPP $100 (first order)
 *   $300 AOV, 8 purchases, 60% margin -> LTGP $1,440, ratio 28.8:1 at $50 CAC
 *
 * Important, stated in the video and kept here:
 * - Gross margin here deducts DIRECT costs only (product / COGS, labour or
 *   service-delivery cost). It does NOT deduct overheads, office costs or
 *   other fixed costs — but LTGP must still cover those overheads.
 * - Averages must be calculated from totals, not guessed:
 *   AOV = total sales value / number of customers
 *   average purchases = total purchases / number of customers
 * - For Bangladesh F-commerce / COD, "customers acquired" must be
 *   DELIVERED, PAID customers — not leads, messages or conversations.
 *   A cheap cost-per-message that never becomes a paid delivery is not a low CAC.
 *
 * Scale bands below are AdSignal Pro guidance, NOT Heath thresholds —
 * the video gives no band thresholds, only the headroom principle
 * (scale aggressively when actual cost is far below acceptable cost;
 * scale only a little when it is close). The bands are labelled as such
 * in the UI and in the verdict text.
 *
 * REPLICA SCOPE (rebuilt 25 Nov 2026 at Radi's request: "100% same"):
 * The /unit-economics page's two calculator sections ARE Heath's sheets:
 * Section 1 = Sheet 1 (5 inputs, LTV / LTGP / CAC / ratio, $ only,
 * ratio shown as a plain number like his F4 cell, not "10:1").
 * Section 2 = his break-even sheet (Ecom + Lead Gen layouts, same
 * fields in the same order). Everything else on the page — currency
 * symbol, totals helper, lever table, scale verdict, copy/CSV, ROAS,
 * profit-per-customer — lives in a separate, clearly labelled
 * "AdSignal Pro extras" section and is NOT part of his calculator.
 * One honest limit remains: the break-even sheet's cell formulas were
 * never shown in the video, so its two multiplications are inferred
 * from the values + spoken maths (see calculateBreakEven below), not
 * read from a formula bar. They are labelled "inferred" in the UI.
 */

export type UnitEconomicsMode = 'ecommerce' | 'leadgen';

export type CurrencySymbol = '$' | '৳' | '£' | '€';

export const CURRENCY_OPTIONS: { value: CurrencySymbol; label: string }[] = [
  { value: '$', label: '$ — USD / dollars (enter your own currency if you use $)' },
  { value: '৳', label: '৳ — BDT (Bangladeshi taka)' },
  { value: '£', label: '£ — GBP' },
  { value: '€', label: '€ — EUR' },
];

export interface UnitEconomicsInputs {
  mode: UnitEconomicsMode;
  currency: CurrencySymbol;
  /** First order value (ecommerce) / first transaction value (lead gen). */
  aov: number | null;
  /** Average purchases per customer = total purchases / customers. Must be >= 1. */
  avgPurchases: number | null;
  /** Gross profit margin, percent (0 < margin <= 100). Direct costs only. */
  marginPct: number | null;
  /** Total ad spend for the period the customers came from. */
  adSpend: number | null;
  /** Delivered, paid customers acquired (ecommerce mode). */
  customersAcquired: number | null;
  /** Leads acquired (lead-gen mode only). */
  leadsAcquired: number | null;
  /** Lead-to-customer conversion, percent (lead-gen mode only, 0 < x <= 100). */
  leadToCustomerPct: number | null;
}

export type ScaleVerdict =
  | 'unknown'
  | 'lifetime-loss'
  | 'first-order-loss'
  | 'scale-little'
  | 'scale-cautious'
  | 'scale-aggressive';

export interface LeverResult {
  label: string;
  /** The changed input, in plain words. */
  change: string;
  newLtgp: number | null;
  deltaLtgp: number | null;
  newRatio: number | null;
}

export interface UnitEconomicsResults {
  ready: boolean;
  /** Customers used in the math. In lead-gen mode this is derived. */
  customers: number | null;
  lifetimeRevenuePerCustomer: number | null;
  firstOrderGrossProfit: number | null;
  /** LTGP — lifetime gross profit per customer. */
  ltgp: number | null;
  /** CAC — cost to acquire one (delivered, paid) customer. */
  cac: number | null;
  /** CPL — cost per lead (lead-gen mode only). */
  cpl: number | null;
  /** LTGP / CAC. Null when CAC is 0 / missing. */
  ltgpCacRatio: number | null;
  /** First-order ROAS = AOV / CAC. */
  firstOrderRoas: number | null;
  /** Break-even ROAS on the first order = 1 / margin. */
  breakEvenRoas: number | null;
  /** Max CPP to break even on the first order = first-order gross profit. */
  acceptableCpp: number | null;
  /** Max CAC to break even over the lifetime = LTGP. */
  acceptableCacLifetime: number | null;
  /** Max CPL to break even on the first order (lead-gen mode only). */
  acceptableCpl: number | null;
  /**
   * Max CPL to break even over the lifetime (lead-gen mode only).
   * AdSignal Pro extension — NOT a field on Heath's break-even sheet,
   * which only shows acceptable CPL on the first order. Same maths
   * (LTGP x conversion), shown nowhere in the UI except via the type.
   */
  acceptableCplLifetime: number | null;
  /** Profit per customer after ad spend, over the lifetime = LTGP - CAC. */
  profitPerCustomerAfterAds: number | null;
  totalLifetimeGrossProfit: number | null;
  totalProfitAfterAds: number | null;
  /** Acceptable CPP (first order) minus actual CAC. */
  headroomFirstOrder: number | null;
  /** Headroom as a share of acceptable CPP. */
  headroomFirstOrderPct: number | null;
  headroomLifetime: number | null;
  scaleVerdict: ScaleVerdict;
  verdictHeadline: string;
  verdictDetail: string;
  levers: LeverResult[];
  warnings: string[];
}

function n(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !Number.isFinite(v) || v < 0) return null;
  return v;
}

function div(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null;
  return a / b;
}

export function calculateUnitEconomics(raw: UnitEconomicsInputs): UnitEconomicsResults {
  const aov = n(raw.aov);
  const avgPurchases = n(raw.avgPurchases);
  const marginPct = n(raw.marginPct);
  const margin = marginPct !== null ? marginPct / 100 : null;
  const adSpend = n(raw.adSpend);
  const leads = n(raw.leadsAcquired);
  const conversionPct = n(raw.leadToCustomerPct);
  const conversion = conversionPct !== null ? conversionPct / 100 : null;

  // In lead-gen mode customers are DERIVED from leads x conversion —
  // never typed separately, so the two can never disagree.
  // In ecommerce mode customers are typed directly (delivered, paid).
  const customers =
    raw.mode === 'leadgen'
      ? leads !== null && conversion !== null
        ? leads * conversion
        : null
      : n(raw.customersAcquired);

  const lifetimeRevenuePerCustomer =
    aov !== null && avgPurchases !== null ? aov * avgPurchases : null;
  const firstOrderGrossProfit =
    aov !== null && margin !== null ? aov * margin : null;
  const ltgp =
    lifetimeRevenuePerCustomer !== null && margin !== null
      ? lifetimeRevenuePerCustomer * margin
      : null;
  // LTGP = AOV x avg purchases x margin — same result, computed directly
  // as a cross-check in the test file; keep the chained form above as the
  // single source of truth in the app.

  const cac = adSpend !== null ? div(adSpend, customers) : null;
  const cpl = raw.mode === 'leadgen' ? div(adSpend, leads) : null;
  const ltgpCacRatio = ltgp !== null && cac !== null && cac > 0 ? ltgp / cac : null;
  const firstOrderRoas = aov !== null && cac !== null && cac > 0 ? aov / cac : null;
  const breakEvenRoas = margin !== null && margin > 0 ? 1 / margin : null;
  const acceptableCpp = firstOrderGrossProfit;
  const acceptableCacLifetime = ltgp;
  const acceptableCpl =
    raw.mode === 'leadgen' && firstOrderGrossProfit !== null && conversion !== null
      ? firstOrderGrossProfit * conversion
      : null;
  const acceptableCplLifetime =
    raw.mode === 'leadgen' && ltgp !== null && conversion !== null
      ? ltgp * conversion
      : null;

  const profitPerCustomerAfterAds =
    ltgp !== null && cac !== null ? ltgp - cac : null;
  const totalLifetimeGrossProfit =
    ltgp !== null && customers !== null ? ltgp * customers : null;
  const totalProfitAfterAds =
    profitPerCustomerAfterAds !== null && customers !== null
      ? profitPerCustomerAfterAds * customers
      : null;
  const headroomFirstOrder =
    acceptableCpp !== null && cac !== null ? acceptableCpp - cac : null;
  const headroomFirstOrderPct =
    headroomFirstOrder !== null && acceptableCpp !== null && acceptableCpp > 0
      ? headroomFirstOrder / acceptableCpp
      : null;
  const headroomLifetime =
    ltgp !== null && cac !== null ? ltgp - cac : null;

  // ---- essentials ----
  const ready =
    aov !== null &&
    aov > 0 &&
    avgPurchases !== null &&
    avgPurchases >= 1 &&
    margin !== null &&
    margin > 0 &&
    margin <= 1 &&
    adSpend !== null &&
    customers !== null &&
    customers > 0 &&
    (raw.mode === 'ecommerce' ||
      (leads !== null && leads > 0 && conversion !== null && conversion > 0 && conversion <= 1));

  // ---- scale verdict (AdSignal Pro bands — see header note) ----
  let scaleVerdict: ScaleVerdict = 'unknown';
  let verdictHeadline = 'Add the essentials to see the verdict';
  let verdictDetail =
    'AOV, average purchases, margin, ad spend and customers acquired are the minimum — everything else refines the picture.';
  if (ready && ltgp !== null && cac !== null && acceptableCpp !== null) {
    if (cac >= ltgp) {
      scaleVerdict = 'lifetime-loss';
      verdictHeadline = 'Do not scale — you lose money over the lifetime';
      verdictDetail =
        'Your CAC is at or above your LTGP, so each new customer loses money even after all their repeat purchases — before overheads. Fix the economics first: raise AOV, margin or repeat purchases, or lower CAC. Cheaper clicks alone will not fix this.';
    } else if (cac > acceptableCpp) {
      scaleVerdict = 'first-order-loss';
      verdictHeadline = 'You lose money on the first order — profit only if they come back';
      verdictDetail =
        'Your CAC is above what the first order earns, so you are funding every new customer from future repeat purchases. That can work only if repeat purchases are proven (not hoped for) and you have the cash to wait for them. Otherwise, do not scale yet.';
    } else {
      // cac <= acceptable CPP: break even or better on the first order.
      const share = acceptableCpp > 0 ? cac / acceptableCpp : 1;
      if (share <= 0.5) {
        scaleVerdict = 'scale-aggressive';
        verdictHeadline = 'Wide headroom — you can scale aggressively';
        verdictDetail =
          'Your CAC is less than half of what the first order can afford, so costs can rise a lot as you scale and still stay profitable. This is the position Heath describes as “we can be really aggressive”.';
      } else if (share <= 0.8) {
        scaleVerdict = 'scale-cautious';
        verdictHeadline = 'Decent headroom — scale in steps';
        verdictDetail =
          'Your CAC is inside what the first order can afford, but not by a wide margin. Scale in +20–30% steps and re-check CPA after 48–72 hours — costs rise as you scale, so headroom shrinks.';
      } else {
        scaleVerdict = 'scale-little';
        verdictHeadline = 'Almost no headroom — scale only a little, if at all';
        verdictDetail =
          'Your CAC is close to the maximum the first order can afford. Scaling will push costs up and leave almost nothing. Improve LTGP (AOV, repeat purchases, margin) or CAC first, then scale.';
      }
    }
  }

  // ---- levers: what moves LTGP most? (Heath's sensitivity analysis) ----
  const lever = (label: string, change: string, newAov: number | null, newPurchases: number | null, newMargin: number | null): LeverResult => {
    const newLtgp =
      newAov !== null && newPurchases !== null && newMargin !== null
        ? newAov * newPurchases * newMargin
        : null;
    return {
      label,
      change,
      newLtgp,
      deltaLtgp: newLtgp !== null && ltgp !== null ? newLtgp - ltgp : null,
      newRatio: newLtgp !== null && cac !== null && cac > 0 ? newLtgp / cac : null,
    };
  };
  const levers: LeverResult[] = [
    lever(
      'One more purchase per customer',
      avgPurchases !== null ? `${avgPurchases} → ${avgPurchases + 1} purchases` : '—',
      aov,
      avgPurchases !== null ? avgPurchases + 1 : null,
      margin,
    ),
    lever(
      'AOV +10%',
      aov !== null ? `AOV × 1.10` : '—',
      aov !== null ? aov * 1.1 : null,
      avgPurchases,
      margin,
    ),
    lever(
      'Margin +5 points',
      marginPct !== null ? `${marginPct}% → ${Math.min(100, marginPct + 5)}%` : '—',
      aov,
      avgPurchases,
      margin !== null ? Math.min(1, margin + 0.05) : null,
    ),
  ];

  // ---- warnings ----
  const warnings: string[] = [];
  if (avgPurchases !== null && avgPurchases < 1) {
    warnings.push('Average purchases per customer cannot be below 1 — every customer bought at least once. Check total purchases ÷ customers.');
  }
  if (marginPct !== null && marginPct >= 90) {
    warnings.push('Margin of 90% or more is unusual — check that product, delivery and service costs are really included. An overstated margin makes every break-even number wrong.');
  }
  if (marginPct !== null && marginPct <= 0) {
    warnings.push('Margin must be above 0% — at 0% there is no gross profit to pay for ads.');
  }
  if (adSpend !== null && adSpend === 0) {
    warnings.push('Ad spend is $0, so CAC is $0 and the LTGP:CAC ratio cannot be calculated. Enter the spend for the period these customers came from.');
  }
  if (cac !== null && cac === 0) {
    warnings.push('CAC is $0 — the LTGP:CAC ratio is not meaningful until real spend is entered.');
  }
  if (raw.mode === 'leadgen' && conversionPct !== null && conversionPct > 100) {
    warnings.push('Lead-to-customer conversion cannot be above 100%.');
  }
  if (ltgp !== null && cac !== null && cac >= ltgp) {
    warnings.push('CAC is at or above LTGP — this business loses money on each customer over their lifetime, before overheads. Do not scale on cheaper CPMs; fix AOV, margin, repeat purchases or CAC first.');
  }
  warnings.push(
    'Gross margin here deducts direct costs only (product, delivery, service cost). It does NOT include overheads, office costs, tax or refunds — LTGP must still cover those.',
  );
  warnings.push(
    'Averages hide variance: a few high-value customers can flatter the average. Check the median and the repeat rate for a recent cohort before trusting LTGP for a big scale decision.',
  );
  warnings.push(
    'This is a planning model based on Ben Heath’s LTGP:CAC framework, not a Meta prediction and not affiliated with Meta. It does not model attribution, signal loss, creative fatigue or auction competition.',
  );

  return {
    ready,
    customers,
    lifetimeRevenuePerCustomer,
    firstOrderGrossProfit,
    ltgp,
    cac,
    cpl,
    ltgpCacRatio,
    firstOrderRoas,
    breakEvenRoas,
    acceptableCpp,
    acceptableCacLifetime,
    acceptableCpl,
    acceptableCplLifetime,
    profitPerCustomerAfterAds,
    totalLifetimeGrossProfit,
    totalProfitAfterAds,
    headroomFirstOrder,
    headroomFirstOrderPct,
    headroomLifetime,
    scaleVerdict,
    verdictHeadline,
    verdictDetail,
    levers,
    warnings,
  };
}

/**
 * Ben Heath's break-even sheet (second layout in the video, from 15:10).
 * Ecom: Gross Profit on 1st transaction = AOV x margin;
 *   Acceptable cost per purchase = that gross profit (identical in
 *   every frame shown — e.g. $200 x 50% = $100, and $100 again).
 * Lead Gen: Gross Profit on 1st transaction = 1st transaction value
 *   x margin; Acceptable cost per lead = that gross profit
 *   x lead-to-client conversion (e.g. $1,000 x 50% = $500, x 20% = $100;
 *   $750 x 10% = $75; $750 x 30% = $225).
 * INFERRED, not read from a formula bar: the video never shows this
 * sheet's formula bar. The multiplications match every value + spoken
 * number in the video, and the UI labels them as inferred.
 */
export interface BreakEvenEcom {
  grossProfitFirst: number | null;
  acceptableCpp: number | null;
}
export function calculateBreakEvenEcom(aov: number | null, marginPct: number | null): BreakEvenEcom {
  const profit = aov !== null && marginPct !== null && marginPct > 0 ? aov * (marginPct / 100) : null;
  return { grossProfitFirst: profit, acceptableCpp: profit };
}

export interface BreakEvenLeadGen {
  grossProfitFirst: number | null;
  acceptableCpl: number | null;
}
export function calculateBreakEvenLeadGen(
  firstTransactionValue: number | null,
  marginPct: number | null,
  conversionPct: number | null,
): BreakEvenLeadGen {
  const profit =
    firstTransactionValue !== null && marginPct !== null && marginPct > 0
      ? firstTransactionValue * (marginPct / 100)
      : null;
  const acceptableCpl =
    profit !== null && conversionPct !== null && conversionPct > 0
      ? profit * (conversionPct / 100)
      : null;
  return { grossProfitFirst: profit, acceptableCpl };
}

/** Plain-text summary for Copy — same idea as the forecast summary. */
export function buildUnitEconomicsSummaryText(
  inputs: UnitEconomicsInputs,
  r: UnitEconomicsResults,
): string {
  const sym = inputs.currency;
  const money = (v: number | null) =>
    v === null || !Number.isFinite(v) ? '—' : `${sym}${v.toFixed(2)}`;
  const lines: string[] = [];
  lines.push('UNIT ECONOMICS — AdSignal Pro');
  lines.push(
    `Inputs: AOV ${money(inputs.aov)} · avg purchases ${inputs.avgPurchases ?? '—'} · margin ${inputs.marginPct ?? '—'}% · ad spend ${money(inputs.adSpend)} · customers ${r.customers !== null ? Math.round(r.customers).toLocaleString() : '—'}`,
  );
  lines.push(`Lifetime revenue per customer: ${money(r.lifetimeRevenuePerCustomer)}`);
  lines.push(`LTGP (lifetime gross profit per customer): ${money(r.ltgp)}`);
  lines.push(`CAC: ${money(r.cac)}${r.cpl !== null ? ` · CPL: ${money(r.cpl)}` : ''}`);
  lines.push(`LTGP:CAC: ${r.ltgpCacRatio !== null ? `${r.ltgpCacRatio.toFixed(1)}:1` : '—'}`);
  lines.push(`Acceptable cost per purchase (first order): ${money(r.acceptableCpp)}`);
  lines.push(`Acceptable CAC over the lifetime: ${money(r.acceptableCacLifetime)}`);
  if (r.acceptableCpl !== null) lines.push(`Acceptable CPL (first order): ${money(r.acceptableCpl)}`);
  lines.push(`Profit per customer after ads (lifetime): ${money(r.profitPerCustomerAfterAds)}`);
  lines.push(`Verdict: ${r.verdictHeadline} — ${r.verdictDetail}`);
  lines.push('Formulas: LTGP = AOV x avg purchases x margin. CAC = ad spend / customers. Acceptable CPP = AOV x margin.');
  lines.push('Planning model based on Ben Heath’s LTGP:CAC framework — not a Meta prediction.');
  return lines.join('\n');
}
