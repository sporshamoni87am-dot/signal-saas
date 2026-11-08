/**
 * Meta Ads Signal Assistance — early-stage forecast engine.
 *
 * Pure, transparent, rule-based math. No AI, no hidden scoring, no Meta API
 * calls — this module only turns the numbers you give it into a projection.
 * It is a PLANNING MODEL, not a Meta prediction: it assumes today's rates
 * hold, and it cannot predict future CPM or auction behaviour.
 *
 * Formulas (all hand-verified, same as the reference calculator):
 * - Impressions = spend ÷ CPM × 1,000
 * - Link clicks = impressions × Link CTR
 * - Landing page views = link clicks × click→LPV rate
 * - Add to carts = LPV × ATC rate · Checkouts = ATC × checkout rate
 * - Purchases (expected) = checkouts × purchase rate
 * - Revenue = purchases × AOV · CPA = spend ÷ purchases
 * - ROAS = revenue ÷ spend
 * - Break-even ROAS = 1 ÷ contribution margin rate
 * - Break-even CPA = AOV × contribution margin − target profit/order
 * - Required CVR for break-even = (spend ÷ break-even CPA) ÷ LPV
 *
 * Learning gate (Meta's rule, per Meta Business Help): an ad set exits the
 * learning phase after ~50 optimisation events in the week after its last
 * significant edit. Below that, delivery is unstable and no scale/pause
 * call should be made. Minimum daily budget rule of thumb:
 * (target CPA × 50) ÷ 7.
 */

export type AttributionWindow = '7dc_1dv' | '7dc' | '1dc';

export const ATTRIBUTION_OPTIONS: {
  value: AttributionWindow;
  label: string;
  explainer: string;
}[] = [
  {
    value: '7dc_1dv',
    label: '7-day click + 1-day view (Meta default)',
    explainer:
      'A purchase counts if it happens within 7 days of a link click or 1 day of seeing the ad. Meta’s 2026 default also includes a 1-day engage-through leg (likes, shares, 5-sec video views).',
  },
  {
    value: '7dc',
    label: '7-day click only',
    explainer:
      'Only purchases within 7 days of a link click. Stricter — view-through credit is ignored, so ROAS reads lower but cleaner.',
  },
  {
    value: '1dc',
    label: '1-day click',
    explainer:
      'Only purchases within 24 hours of a link click. The strictest read — for impulse buys and flash sales.',
  },
];

export interface ForecastInputs {
  campaignName: string;
  market: string;
  /** Full budget for the campaign/test (e.g. $5,000). Null = no projection. */
  totalBudget: number | null;
  /** What has actually been spent so far (e.g. $550). */
  spentSoFar: number | null;
  dailyBudget: number | null;
  daysRunning: number | null;
  cpm: number | null;
  /** Optional actual counts — take precedence over estimates when given. */
  impressionsActual: number | null;
  /** Link CTR, percent (e.g. 1.52 means 1.52%). */
  linkCtrPct: number | null;
  linkClicksActual: number | null;
  lpvActual: number | null;
  /** Click → landing page view rate, percent. */
  lpvRatePct: number | null;
  atcActual: number | null;
  /** Add to carts per landing page view, percent. */
  atcRatePct: number | null;
  checkoutsActual: number | null;
  /** Checkouts initiated per add to cart, percent. */
  checkoutRatePct: number | null;
  /** Purchases per started checkout, percent. */
  purchaseRatePct: number | null;
  /** Observed purchases so far — the optimisation-event count. */
  purchasesSoFar: number | null;
  aov: number | null;
  /** Contribution margin before ads, percent (after product + variable costs). */
  marginPct: number | null;
  targetProfit: number | null;
  /** Hook rate (3-sec views ÷ impressions), percent. */
  hookRatePct: number | null;
  frequency: number | null;
  attribution: AttributionWindow;
  /** 'meta' when the inputs were pulled live from the Meta API. */
  source?: 'manual' | 'meta';
  metaCampaignId?: string | null;
  metaDateRange?: string | null;
}

export type LearningStatus = 'unknown' | 'learning' | 'limited-risk' | 'exited';

export interface LearningInfo {
  status: LearningStatus;
  /** Observed optimisation events so far (purchases), or null. */
  events: number | null;
  /** Projected events per week at the current pace, or null. */
  weeklyProjected: number | null;
  /** Minimum daily budget for ~50 events/week, or null. */
  minDailyBudget: number | null;
  note: string;
}

export type ConfidenceLevel =
  | 'unknown'
  | 'very-uncertain'
  | 'uncertain'
  | 'directional'
  | 'stable';

export interface ConfidenceInfo {
  level: ConfidenceLevel;
  label: string;
  /** Purchase count the label is based on (observed, else expected). */
  basisPurchases: number | null;
  basis: 'observed' | 'expected' | null;
}

export type FunnelStatus = 'good' | 'warn' | 'bad' | 'na';

export interface FunnelStage {
  stage: string;
  count: number | null;
  /** Rate from the previous stage, as a fraction (0..1), or null. */
  rateFromPrev: number | null;
  rateDisplay: string;
  status: FunnelStatus;
  benchmark: string;
}

export interface ScenarioRow {
  cvrPct: number;
  purchases: number | null;
  cpa: number | null;
  roas: number | null;
  vsBreakEven: 'above' | 'below' | 'unknown';
}

export interface ForecastResults {
  /** False when the essentials (spend, CPM, AOV, margin) are missing. */
  ready: boolean;
  /** Spend the so-far numbers are based on. */
  spend: number;
  // ---- so far ----
  impressions: number;
  linkClicks: number;
  lpv: number;
  atc: number;
  checkouts: number;
  purchasesExpected: number;
  observedPurchases: number | null;
  revenue: number;
  cpa: number | null;
  roas: number | null;
  effCpm: number | null;
  effCtrPct: number | null;
  effLpvRatePct: number | null;
  /** Overall website purchase CVR (purchases ÷ LPV), percent. */
  cvrPct: number | null;
  clickToAtcPct: number | null;
  clickToAtcStatus: FunnelStatus;
  atcToCheckoutPct: number | null;
  checkoutToPurchasePct: number | null;
  // ---- economics ----
  beRoas: number | null;
  beCpa: number | null;
  requiredCvrPct: number | null;
  // ---- full budget ----
  remainingBudget: number | null;
  fullImpressions: number | null;
  fullClicks: number | null;
  fullLpv: number | null;
  fullPurchases: number | null;
  fullRevenue: number | null;
  fullCpa: number | null;
  fullRoas: number | null;
  // ---- gates & signals ----
  learning: LearningInfo;
  confidence: ConfidenceInfo;
  /** Rough CPA range from Poisson noise on expected purchases — a rough
   *  range, NOT a statistical guarantee. */
  cpaRange: { low: number | null; high: number | null } | null;
  pace: {
    status: 'on-track' | 'fast' | 'slow' | 'unknown';
    expectedSpend: number | null;
    note: string;
  };
  creative: {
    hookRatePct: number | null;
    hookStatus: FunnelStatus;
    frequency: number | null;
    freqStatus: FunnelStatus;
    fatigue: boolean;
    fatigueNote: string;
  };
  funnel: FunnelStage[];
  guidance: {
    kind: 'provisional' | 'ontrack' | 'below' | 'unknown';
    headline: string;
    detail: string;
  };
  warnings: string[];
  scenarioRows: ScenarioRow[];
}

// Engine thresholds reused from lib/engine.ts (reference only — do not
// duplicate the engine here). hook: good ≥30%, warn ≥20%. frequency: good
// ≤2.5, warn ≤4.0. click→ATC: good ≥8%, warn ≥4%. checkout→purchase: good
// ≥60%, warn ≥35%. Fatigue: frequency ≥3.5 while CTR < 0.8%.
const HOOK_GOOD = 0.3;
const HOOK_WARN = 0.2;
const FREQ_GOOD = 2.5;
const FREQ_WARN = 4.0;
const CLICK_ATC_GOOD = 0.08;
const CLICK_ATC_WARN = 0.04;
const CHECKOUT_PURCHASE_GOOD = 0.6;
const CHECKOUT_PURCHASE_WARN = 0.35;
const FATIGUE_FREQ = 3.5;
const FATIGUE_CTR = 0.008;

const LEARNING_TARGET = 50;

function n(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !Number.isFinite(v) || v < 0) return null;
  return v;
}

function div(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null;
  return a / b;
}

function pctDisplay(frac: number | null): string {
  if (frac === null) return '—';
  return `${(frac * 100).toFixed(1)}%`;
}

function gradeHigh(
  value: number | null,
  goodAtOrAbove: number,
  warnAtOrAbove: number,
): FunnelStatus {
  if (value === null) return 'na';
  if (value >= goodAtOrAbove) return 'good';
  if (value >= warnAtOrAbove) return 'warn';
  return 'bad';
}

function gradeLow(
  value: number | null,
  goodAtOrBelow: number,
  warnAtOrBelow: number,
): FunnelStatus {
  if (value === null) return 'na';
  if (value <= goodAtOrBelow) return 'good';
  if (value <= warnAtOrBelow) return 'warn';
  return 'bad';
}

export function forecast(raw: ForecastInputs): ForecastResults {
  const i = raw;
  const spend = n(i.spentSoFar) ?? 0;
  const cpm = n(i.cpm);
  const ctr = n(i.linkCtrPct) !== null ? (n(i.linkCtrPct) as number) / 100 : null;
  const lpvRate = n(i.lpvRatePct) !== null ? (n(i.lpvRatePct) as number) / 100 : null;
  const atcRate = n(i.atcRatePct) !== null ? (n(i.atcRatePct) as number) / 100 : null;
  const checkoutRate =
    n(i.checkoutRatePct) !== null ? (n(i.checkoutRatePct) as number) / 100 : null;
  const purchaseRate =
    n(i.purchaseRatePct) !== null ? (n(i.purchaseRatePct) as number) / 100 : null;
  const aov = n(i.aov);
  const margin = n(i.marginPct) !== null ? (n(i.marginPct) as number) / 100 : null;
  const targetProfit = n(i.targetProfit) ?? 0;
  const dailyBudget = n(i.dailyBudget);
  const daysRunning = n(i.daysRunning);
  const observed = n(i.purchasesSoFar);

  const ready = spend > 0 && cpm !== null && cpm > 0 && aov !== null && aov > 0 && margin !== null && margin > 0;

  // ---- so-far funnel: actuals take precedence over estimates ----
  const impressions = n(i.impressionsActual) ?? (cpm && cpm > 0 ? (spend / cpm) * 1000 : 0);
  const linkClicks = n(i.linkClicksActual) ?? (ctr !== null ? impressions * ctr : 0);
  const lpv = n(i.lpvActual) ?? (lpvRate !== null ? linkClicks * lpvRate : 0);
  const atc = n(i.atcActual) ?? (atcRate !== null ? lpv * atcRate : 0);
  const checkouts = n(i.checkoutsActual) ?? (checkoutRate !== null ? atc * checkoutRate : 0);
  const purchasesExpected = purchaseRate !== null ? checkouts * purchaseRate : 0;

  const revenue = aov !== null ? purchasesExpected * aov : 0;
  const cpa = purchasesExpected > 0 ? spend / purchasesExpected : null;
  const roas = spend > 0 ? revenue / spend : null;
  const effCpm = impressions > 0 ? (spend / impressions) * 1000 : null;
  const effCtrPct = impressions > 0 ? (linkClicks / impressions) * 100 : null;
  const effLpvRatePct = linkClicks > 0 ? (lpv / linkClicks) * 100 : null;
  const cvrPct = lpv > 0 ? (purchasesExpected / lpv) * 100 : null;
  const clickToAtcPct = linkClicks > 0 ? (atc / linkClicks) * 100 : null;
  const atcToCheckoutPct = atc > 0 ? (checkouts / atc) * 100 : null;
  const checkoutToPurchasePct = checkouts > 0 ? (purchasesExpected / checkouts) * 100 : null;

  // ---- economics ----
  const beRoas = margin !== null && margin > 0 ? 1 / margin : null;
  const beCpa = aov !== null && margin !== null ? aov * margin - targetProfit : null;
  const requiredCvrPct =
    beCpa !== null && beCpa > 0 && lpv > 0 ? (spend / (lpv * beCpa)) * 100 : null;

  // ---- full-budget projection (same rates, remaining budget) ----
  const totalBudget = n(i.totalBudget);
  const remainingBudget =
    totalBudget !== null ? Math.max(0, totalBudget - spend) : null;
  let fullImpressions: number | null = null;
  let fullClicks: number | null = null;
  let fullLpv: number | null = null;
  let fullPurchases: number | null = null;
  let fullRevenue: number | null = null;
  let fullCpa: number | null = null;
  let fullRoas: number | null = null;
  if (remainingBudget !== null && totalBudget !== null) {
    const impR = cpm && cpm > 0 ? (remainingBudget / cpm) * 1000 : 0;
    const clicksR = ctr !== null ? impR * ctr : 0;
    const lpvR = lpvRate !== null ? clicksR * lpvRate : 0;
    const atcR = atcRate !== null ? lpvR * atcRate : 0;
    const coR = checkoutRate !== null ? atcR * checkoutRate : 0;
    const purR = purchaseRate !== null ? coR * purchaseRate : 0;
    fullImpressions = impressions + impR;
    fullClicks = linkClicks + clicksR;
    fullLpv = lpv + lpvR;
    fullPurchases = purchasesExpected + purR;
    fullRevenue = aov !== null ? fullPurchases * aov : 0;
    fullCpa = fullPurchases > 0 ? totalBudget / fullPurchases : null;
    fullRoas = totalBudget > 0 ? fullRevenue / totalBudget : null;
  }

  // ---- learning gate ----
  const events = observed;
  const weeklyProjected =
    events !== null && daysRunning !== null && daysRunning > 0
      ? (events / daysRunning) * 7
      : null;
  let learningStatus: LearningStatus = 'unknown';
  let learningNote =
    'Enter purchases so far to check the learning phase — Meta needs about 50 optimisation events a week before delivery stabilises.';
  if (events !== null) {
    if (events >= LEARNING_TARGET) {
      learningStatus = 'exited';
      learningNote = `${events} optimisation events so far — this ad set has exited the learning phase, so its numbers are stable enough to judge.`;
    } else if (weeklyProjected !== null && weeklyProjected < LEARNING_TARGET) {
      learningStatus = 'limited-risk';
      learningNote = `Only ${events} events so far, running at ~${Math.round(weeklyProjected)}/week — below Meta's ~50/week. This ad set is at risk of "Learning Limited": delivery stays unstable and costs stay high until it gets more events.`;
    } else {
      learningStatus = 'learning';
      learningNote = `${events} of ~50 optimisation events so far. Still in the learning phase — Meta is still exploring who to show this to, so costs and ROAS will swing.`;
    }
  }
  const minDailyBudget = beCpa !== null && beCpa > 0 ? (beCpa * LEARNING_TARGET) / 7 : null;

  // ---- confidence ----
  const basisPurchases = observed ?? (purchasesExpected > 0 ? purchasesExpected : null);
  const basis: ConfidenceInfo['basis'] = observed !== null ? 'observed' : purchasesExpected > 0 ? 'expected' : null;
  let confidenceLevel: ConfidenceLevel = 'unknown';
  let confidenceLabel = 'Enter purchases to judge confidence';
  if (basisPurchases !== null) {
    if (basisPurchases < 5) {
      confidenceLevel = 'very-uncertain';
      confidenceLabel = 'Very uncertain';
    } else if (basisPurchases < 20) {
      confidenceLevel = 'uncertain';
      confidenceLabel = 'Uncertain — still learning';
    } else if (basisPurchases < 50) {
      confidenceLevel = 'directional';
      confidenceLabel = 'Directional';
    } else {
      confidenceLevel = 'stable';
      confidenceLabel = 'Stable';
    }
  }

  // ---- rough CPA range (Poisson noise on expected purchases) ----
  let cpaRange: ForecastResults['cpaRange'] = null;
  if (purchasesExpected > 0 && spend > 0) {
    const sd = Math.sqrt(purchasesExpected);
    const hi = purchasesExpected + 1.96 * sd;
    const lo = purchasesExpected - 1.96 * sd;
    cpaRange = {
      low: spend / hi,
      high: lo > 0 ? spend / lo : null, // null = "very wide" — too few purchases to bound
    };
  }

  // ---- spend pace ----
  const expectedSpend =
    dailyBudget !== null && daysRunning !== null ? dailyBudget * daysRunning : null;
  let paceStatus: ForecastResults['pace']['status'] = 'unknown';
  let paceNote = 'Enter a daily budget and days running to check spend pace.';
  if (expectedSpend !== null && expectedSpend > 0) {
    const ratio = spend / expectedSpend;
    if (ratio > 1.25) {
      paceStatus = 'fast';
      paceNote = `Spending faster than planned: $${Math.round(spend).toLocaleString()} spent vs ~$${Math.round(expectedSpend).toLocaleString()} expected by day ${Math.round(daysRunning ?? 0)} at $${dailyBudget}/day. The budget will run out early.`;
    } else if (ratio < 0.75) {
      paceStatus = 'slow';
      paceNote = `Spending slower than planned: $${Math.round(spend).toLocaleString()} spent vs ~$${Math.round(expectedSpend).toLocaleString()} expected by day ${Math.round(daysRunning ?? 0)}. Delivery may be limited — check budget, audience, or bid.`;
    } else {
      paceStatus = 'on-track';
      paceNote = `Spend pace is on track: $${Math.round(spend).toLocaleString()} spent vs ~$${Math.round(expectedSpend).toLocaleString()} expected.`;
    }
  }

  // ---- creative signals (engine thresholds) ----
  const hookRate = n(i.hookRatePct) !== null ? (n(i.hookRatePct) as number) / 100 : null;
  const frequency = n(i.frequency);
  const hookStatus = gradeHigh(hookRate, HOOK_GOOD, HOOK_WARN);
  const freqStatus = gradeLow(frequency, FREQ_GOOD, FREQ_WARN);
  const ctrFrac = effCtrPct !== null ? effCtrPct / 100 : null;
  const fatigue =
    frequency !== null && ctrFrac !== null && frequency >= FATIGUE_FREQ && ctrFrac < FATIGUE_CTR;
  const fatigueNote = fatigue
    ? `Fatigue signal: frequency ${frequency?.toFixed(1)} with CTR ${(ctrFrac * 100).toFixed(2)}% — the same people keep seeing a creative that no longer stops them. Refresh the hook.`
    : frequency !== null && frequency >= FREQ_WARN
      ? `Frequency ${frequency.toFixed(1)} is high — the same audience is seeing this a lot. Watch CTR for fatigue.`
      : 'No fatigue signal from frequency and CTR.';

  // ---- funnel with grades ----
  const clickToAtc = div(atc, linkClicks);
  const atcToCheckout = div(checkouts, atc);
  const checkoutToPurchase = div(purchasesExpected, checkouts);
  const funnel: FunnelStage[] = [
    {
      stage: 'Impressions',
      count: impressions,
      rateFromPrev: null,
      rateDisplay: '—',
      status: 'na',
      benchmark: '—',
    },
    {
      stage: 'Link clicks',
      count: linkClicks,
      rateFromPrev: ctr,
      rateDisplay: pctDisplay(ctr),
      status: gradeHigh(ctr, 0.01, 0.007),
      benchmark: 'Good ≥1.0% · Watch ≥0.7%',
    },
    {
      stage: 'Landing page views',
      count: lpv,
      rateFromPrev: lpvRate,
      rateDisplay: pctDisplay(lpvRate),
      status: 'na',
      benchmark: 'Depends on page speed & load',
    },
    {
      stage: 'Add to carts',
      count: atc,
      rateFromPrev: div(atc, lpv),
      rateDisplay: pctDisplay(div(atc, lpv)),
      status: 'na',
      benchmark: '—',
    },
    {
      stage: 'Checkouts initiated',
      count: checkouts,
      rateFromPrev: atcToCheckout,
      rateDisplay: pctDisplay(atcToCheckout),
      status: 'na',
      benchmark: '—',
    },
    {
      stage: 'Purchases (expected)',
      count: purchasesExpected,
      rateFromPrev: checkoutToPurchase,
      rateDisplay: pctDisplay(checkoutToPurchase),
      status: gradeHigh(checkoutToPurchase, CHECKOUT_PURCHASE_GOOD, CHECKOUT_PURCHASE_WARN),
      benchmark: 'Good ≥60% · Watch ≥35%',
    },
  ];
  // Click → ATC graded against the engine's threshold (ATC per link click,
  // good ≥8% / watch ≥4%).
  const clickToAtcStatus = gradeHigh(clickToAtc, CLICK_ATC_GOOD, CLICK_ATC_WARN);

  // ---- guidance (never a scale/pause verdict while learning) ----
  let guidance: ForecastResults['guidance'];
  if (learningStatus !== 'exited') {
    guidance = {
      kind: 'provisional',
      headline: 'Too early to scale or pause',
      detail:
        learningStatus === 'unknown'
          ? 'We cannot judge this campaign yet — add purchases so far and days running so the learning gate can run.'
          : learningStatus === 'limited-risk'
            ? 'This ad set is unlikely to reach 50 optimisation events a week at its current pace. Fix the volume problem first (bigger budget, wider audience, or a higher-funnel optimisation event) — a scale or pause call now would be made on unstable numbers.'
            : 'Costs and ROAS swing while Meta is still learning. Keep the campaign running, fix obvious leaks (creative, landing page), and judge again after ~50 optimisation events.',
    };
  } else if (fullRoas !== null && beRoas !== null) {
    guidance =
      fullRoas >= beRoas
        ? {
            kind: 'ontrack',
            headline: 'On track to beat break-even',
            detail: `If today's rates hold, the full $${totalBudget?.toLocaleString()} budget lands at ~${fullRoas.toFixed(2)}× ROAS against a ${beRoas.toFixed(2)}× break-even. That is a forecast, not a guarantee — re-check after the next batch of purchases.`,
          }
        : {
            kind: 'below',
            headline: 'Below break-even — fix the leak before scaling',
            detail: `If today's rates hold, the full budget lands at ~${fullRoas.toFixed(2)}× ROAS against a ${beRoas.toFixed(2)}× break-even. Find the weakest funnel step below and fix it first; scaling now would scale the loss.`,
          };
  } else if (roas !== null && beRoas !== null) {
    guidance =
      roas >= beRoas
        ? {
            kind: 'ontrack',
            headline: 'Above break-even so far',
            detail: `ROAS ${roas.toFixed(2)}× is above the ${beRoas.toFixed(2)}× break-even on spend so far. Add a total budget to see the full-budget projection.`,
          }
        : {
            kind: 'below',
            headline: 'Below break-even so far',
            detail: `ROAS ${roas.toFixed(2)}× is below the ${beRoas.toFixed(2)}× break-even on spend so far. Find the weakest funnel step below and fix it before spending more.`,
          };
  } else {
    guidance = {
      kind: 'unknown',
      headline: 'Add the essentials to see the forecast',
      detail: 'Spend so far, CPM, AOV and contribution margin are the minimum — everything else refines the picture.',
    };
  }
  // Weakest graded step, for the detail line.
  const worst = funnel
    .filter((f) => f.status === 'bad')
    .map((f) => f.stage)[0];
  if (worst && guidance.kind !== 'provisional' && guidance.kind !== 'unknown') {
    guidance = {
      ...guidance,
      detail: `${guidance.detail} Weakest step right now: ${worst}.`,
    };
  }

  // ---- warnings (reference tool's sanity checks, kept) ----
  const warnings: string[] = [];
  if (!ready) {
    warnings.push('Enter spend so far, CPM, AOV and contribution margin to calculate business economics.');
  }
  if (n(i.linkClicksActual) !== null && n(i.impressionsActual) !== null && (n(i.linkClicksActual) as number) > (n(i.impressionsActual) as number)) {
    warnings.push('Link clicks exceed impressions in the entered actuals. Check the metric/date scope.');
  }
  if (n(i.lpvActual) !== null && n(i.linkClicksActual) !== null && (n(i.lpvActual) as number) > (n(i.linkClicksActual) as number)) {
    warnings.push('Landing page views exceed link clicks. Check attribution/date scope or input values.');
  }
  if (basisPurchases !== null && basisPurchases < 5) {
    warnings.push('Low conversion sample: expected purchases below 5. CPA and ROAS are highly uncertain; do not use this as a confident scale/pause prediction.');
  }
  if (margin !== null && margin > 0 && roas !== null && beRoas !== null && roas < beRoas) {
    warnings.push('Under the entered assumptions, modelled ROAS is below simplified contribution break-even. Verify the margin and AOV before acting.');
  }
  if (remainingBudget !== null && remainingBudget === 0 && totalBudget !== null) {
    warnings.push('The full budget is already spent — this is a look-back, not a forecast. Raise the total budget to project further spend.');
  }
  warnings.push(
    'Attribution note: Meta counts conversions on the date of the ad interaction, so the most recent days’ purchase data is still filling in — today’s and yesterday’s numbers are usually incomplete.',
  );
  warnings.push(
    'This is a planning model, not a Meta prediction. It assumes today’s CPM, CTR and conversion rates hold. It does not model auction mechanics, repeat purchases, refunds, country/placement mix, or statistical confidence, and it cannot predict future CPM.',
  );

  // ---- scenario sensitivity: vary overall website CVR, hold the rest ----
  const scenarioCvrs = [0.5, 1, 2, 3, 5];
  const scenarioRows: ScenarioRow[] = scenarioCvrs.map((cvrPct) => {
    const p = lpv * (cvrPct / 100);
    const cp = p > 0 ? spend / p : null;
    const rr = spend > 0 && aov !== null ? (p * aov) / spend : null;
    return {
      cvrPct,
      purchases: p,
      cpa: cp,
      roas: rr,
      vsBreakEven: beRoas !== null && rr !== null ? (rr >= beRoas ? 'above' : 'below') : 'unknown',
    };
  });

  return {
    ready,
    spend,
    impressions,
    linkClicks,
    lpv,
    atc,
    checkouts,
    purchasesExpected,
    observedPurchases: observed,
    revenue,
    cpa,
    roas,
    effCpm,
    effCtrPct,
    effLpvRatePct,
    cvrPct,
    clickToAtcPct,
    clickToAtcStatus,
    atcToCheckoutPct,
    checkoutToPurchasePct,
    beRoas,
    beCpa,
    requiredCvrPct,
    remainingBudget,
    fullImpressions,
    fullClicks,
    fullLpv,
    fullPurchases,
    fullRevenue,
    fullCpa,
    fullRoas,
    learning: {
      status: learningStatus,
      events,
      weeklyProjected,
      minDailyBudget,
      note: learningNote,
    },
    confidence: {
      level: confidenceLevel,
      label: confidenceLabel,
      basisPurchases,
      basis,
    },
    cpaRange,
    pace: { status: paceStatus, expectedSpend, note: paceNote },
    creative: {
      hookRatePct: hookRate !== null ? hookRate * 100 : null,
      hookStatus,
      frequency,
      freqStatus,
      fatigue,
      fatigueNote,
    },
    funnel,
    guidance,
    warnings,
    scenarioRows,
  };
}

/** Plain-text summary for Copy — same idea as the diagnosis report summary. */
export function buildForecastSummaryText(
  inputs: ForecastInputs,
  r: ForecastResults,
): string {
  const lines: string[] = [];
  const money = (v: number | null) =>
    v === null || !Number.isFinite(v) ? '—' : `$${v.toFixed(2)}`;
  lines.push(`FORECAST — ${inputs.campaignName || 'Untitled campaign'}`);
  lines.push(
    `Budget: $${(inputs.totalBudget ?? 0).toLocaleString()} total · $${r.spend.toLocaleString()} spent so far`,
  );
  lines.push(
    `Learning: ${r.learning.status === 'exited' ? 'Exited learning' : r.learning.status === 'limited-risk' ? 'Learning Limited risk' : r.learning.status === 'learning' ? 'Still learning' : 'Unknown'} (${r.learning.events ?? '—'} events)`,
  );
  lines.push(`Confidence: ${r.confidence.label}`);
  lines.push(
    `So far: ${r.purchasesExpected.toFixed(1)} expected purchases · CPA ${money(r.cpa)} · ROAS ${r.roas !== null ? `${r.roas.toFixed(2)}×` : '—'} · break-even ${r.beRoas !== null ? `${r.beRoas.toFixed(2)}×` : '—'}`,
  );
  if (r.fullPurchases !== null) {
    lines.push(
      `Full budget: ${r.fullPurchases.toFixed(1)} expected purchases · CPA ${money(r.fullCpa)} · ROAS ${r.fullRoas !== null ? `${r.fullRoas.toFixed(2)}×` : '—'}`,
    );
  }
  lines.push(`Guidance: ${r.guidance.headline} — ${r.guidance.detail}`);
  lines.push(
    `Attribution: ${ATTRIBUTION_OPTIONS.find((o) => o.value === inputs.attribution)?.label ?? inputs.attribution}`,
  );
  lines.push('Planning model, not a Meta prediction. Rates assumed to hold.');
  return lines.join('\n');
}
