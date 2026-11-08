/**
 * Meta Ads Signal Assistance — D2C diagnosis engine.
 *
 * Pure, transparent, rule-based logic. No AI, no hidden scoring.
 * Every verdict and action item traces back to a rule whose math is shown.
 *
 * Extension point for future campaign types: add a new module (e.g.
 * `lib/engines/leadgen.ts`) exporting the same `diagnose(inputs)` shape
 * and dispatch on `inputs.campaignType`.
 */

export type CampaignType = 'D2C';

export type Verdict = 'SCALE' | 'KILL' | 'FIX' | 'RUN' | 'WAIT';
export type SignalStatus = 'good' | 'warn' | 'bad' | 'na';

export interface DiagnosisInputs {
  campaignType: CampaignType;
  campaignName: string;
  breakevenRoas: number | null;
  dailyBudget: number | null;
  aov: number | null;
  grossMarginPct: number | null;
  daysRunning: number | null;
  totalBusinessRevenue: number | null; // for MER (blended)
  problemStatement: string;
  adSpend: number | null;
  impressions: number | null;
  reach: number | null;
  linkClicks: number | null;
  /** People who actually loaded the landing page (Meta: landing_page_views). */
  landingPageViews: number | null;
  addToCarts: number | null;
  checkoutsInitiated: number | null;
  purchases: number | null;
  attributedRevenue: number | null;
  videoViews3s: number | null;
  videoThruplays: number | null;
  frequency: number | null;
}

export interface SignalGrade {
  key: string;
  label: string;
  value: number | null;
  display: string;
  status: SignalStatus;
  benchmark: string;
  explanation: string;
}

export interface RuleFired {
  rule: string;
  detail: string;
  math: string;
}

export interface ActionItem {
  priority: number;
  title: string;
  detail: string;
  adsManagerStep: string;
}

export interface FunnelStage {
  stage: string;
  count: number | null;
  rateFromPrev: string;
}

/**
 * One funnel transition ranked by money lost, not by rate.
 * Every person lost after clicking cost one click's worth of spend
 * (CPC = ad spend ÷ link clicks), so wastedSpend is the dollars that
 * died at that transition. shareOfWaste is the fraction of the total
 * computable waste (0..1) — transitions that can't be computed because
 * a stage count is missing are skipped, so the shares always sum to 1
 * over the transitions shown.
 */
export interface LeakStep {
  fromStage: string;
  toStage: string;
  /** People who entered the transition and never came out the other side. */
  lost: number;
  wastedSpend: number;
  shareOfWaste: number;
}

export interface LeakRanking {
  /** Biggest money-loser first. */
  steps: LeakStep[];
  biggestLeak: LeakStep;
  /** Sum of wastedSpend over the ranked transitions. When every funnel
      stage is provided this equals (linkClicks − purchases) × CPC. */
  totalWastedSpend: number;
  totalSpend: number;
}

export interface CreativeAnalysis {
  hookRate: number | null;
  holdRate: number | null;
  hookStatus: SignalStatus;
  holdStatus: SignalStatus;
  fatigue: boolean;
  fatigueNote: string;
}

export interface DiagnosisResults {
  campaignType: CampaignType;
  verdict: Verdict;
  verdictTitle: string;
  verdictReason: string;
  dataSufficiency: {
    sufficient: boolean;
    spendProgress: number | null; // 0..1+ vs 1x target CPA
    targetCpa: number | null;
    note: string;
  };
  adSignals: SignalGrade[];
  businessMetrics: SignalGrade[];
  creative: CreativeAnalysis;
  funnel: FunnelStage[];
  /**
   * Spend-weighted leak ranking, or null when it can't be computed
   * (ad spend or link clicks missing/zero). Purely informational —
   * it never changes the verdict, rules, or action items.
   */
  leakRanking: LeakRanking | null;
  rulesFired: RuleFired[];
  actionItems: ActionItem[];
  /** Rank used for old-vs-new improvement comparison (higher = better). */
  verdictRank: number;
}

export const VERDICT_META: Record<
  Verdict,
  { title: string; badge: string; rank: number }
> = {
  SCALE: { title: 'SCALE IT', badge: 'scale', rank: 4 },
  RUN: { title: 'KEEP RUNNING', badge: 'run', rank: 3 },
  FIX: { title: 'FIX IT & RETEST', badge: 'fix', rank: 2 },
  WAIT: { title: 'WAIT — NOT ENOUGH DATA', badge: 'wait', rank: 1 },
  KILL: { title: 'KILL IT', badge: 'kill', rank: 0 },
};

// ---------------------------------------------------------------------------
// Benchmarks — adjustable starting points for D2C on Meta.
// These are rough industry starting points, NOT verified Meta data.
// The UI labels them as adjustable.
// ---------------------------------------------------------------------------
const BENCH = {
  ctrGood: 0.01,
  ctrWarn: 0.007,
  cpcGood: 2.0,
  cpcWarn: 3.5,
  cpmGood: 15,
  cpmWarn: 25,
  freqGood: 2.5,
  freqWarn: 4.0,
  clickAtcGood: 0.08,
  clickAtcWarn: 0.04,
  checkoutPurchaseGood: 0.6,
  checkoutPurchaseWarn: 0.35,
  hookGood: 0.3,
  hookWarn: 0.2,
  holdGood: 0.2,
  holdWarn: 0.1,
  fatigueFreq: 3.5,
  fatigueCtr: 0.008,
} as const;

function num(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !Number.isFinite(v) || v < 0) return null;
  return v;
}

function div(a: number | null, b: number | null): number | null {
  if (a === null || b === null || b === 0) return null;
  return a / b;
}

function grade(
  value: number | null,
  goodAtOrAbove: number,
  warnAtOrAbove: number,
): SignalStatus {
  if (value === null) return 'na';
  if (value >= goodAtOrAbove) return 'good';
  if (value >= warnAtOrAbove) return 'warn';
  return 'bad';
}

/** Lower-is-better grading (e.g. CPA, CPC, frequency). */
function gradeLow(
  value: number | null,
  goodAtOrBelow: number,
  warnAtOrBelow: number,
): SignalStatus {
  if (value === null) return 'na';
  if (value <= goodAtOrBelow) return 'good';
  if (value <= warnAtOrBelow) return 'warn';
  return 'bad';
}

const ADJUSTABLE = 'Adjustable starting benchmark — tune it to your account history.';

export function diagnose(raw: DiagnosisInputs): DiagnosisResults {
  const i: DiagnosisInputs = { ...raw, campaignType: 'D2C' };

  const adSpend = num(i.adSpend) ?? 0;
  const purchases = num(i.purchases) ?? 0;
  const attributedRevenue = num(i.attributedRevenue) ?? 0;
  const breakevenRoas = num(i.breakevenRoas);
  const aov = num(i.aov);
  const grossMarginPct = num(i.grossMarginPct);
  const impressions = num(i.impressions);
  const linkClicks = num(i.linkClicks);
  const landingPageViews = num(i.landingPageViews);
  const addToCarts = num(i.addToCarts);
  const checkoutsInitiated = num(i.checkoutsInitiated);
  const videoViews3s = num(i.videoViews3s);
  const videoThruplays = num(i.videoThruplays);
  const frequency = num(i.frequency);
  const totalBusinessRevenue = num(i.totalBusinessRevenue);

  // ---------------- derived metrics ----------------
  const roas = div(attributedRevenue, adSpend);
  const cpa = div(adSpend, purchases); // cost per purchase
  const targetCpa = breakevenRoas && aov ? aov / breakevenRoas : null;
  const ctr = div(linkClicks, impressions);
  const cpc = div(adSpend, linkClicks);
  const cpm = impressions ? (adSpend / impressions) * 1000 : null;
  const clickToAtc = div(addToCarts, linkClicks);
  const clickToLpv = div(landingPageViews, linkClicks);
  const lpvToAtc = div(addToCarts, landingPageViews);
  const atcToCheckout = div(checkoutsInitiated, addToCarts);
  const checkoutToPurchase = div(purchases, checkoutsInitiated);
  const cvr = div(purchases, linkClicks);
  const mer = div(totalBusinessRevenue, adSpend);
  const poas =
    grossMarginPct !== null
      ? div(attributedRevenue * (grossMarginPct / 100), adSpend)
      : null;
  const hookRate = div(videoViews3s, impressions);
  const holdRate = div(videoThruplays, videoViews3s);

  const rulesFired: RuleFired[] = [];
  const actionItems: ActionItem[] = [];
  let prio = 1;
  const addAction = (title: string, detail: string, adsManagerStep: string) => {
    actionItems.push({ priority: prio++, title, detail, adsManagerStep });
  };

  // ---------------- data sufficiency ----------------
  // Don't judge a campaign before it has spent ~1x target CPA.
  const minSpend = targetCpa;
  const spendProgress = minSpend ? adSpend / minSpend : null;
  const sufficient = minSpend ? adSpend >= minSpend : purchases > 0 || adSpend >= (num(i.dailyBudget) ?? 0) * 3;

  // ---------------- verdict ----------------
  let verdict: Verdict;
  let verdictReason: string;

  if (!sufficient) {
    verdict = 'WAIT';
    verdictReason = minSpend
      ? `You've spent $${adSpend.toFixed(2)} of the $${minSpend.toFixed(2)} needed for 1× target CPA. Meta hasn't had enough conversions to judge yet — deciding now is guessing.`
      : `Not enough spend or conversion volume to judge yet. Give the campaign room to exit the learning phase before calling it.`;
    rulesFired.push({
      rule: 'Data sufficiency gate',
      detail: 'Require ~1× target CPA in spend before a verdict.',
      math: minSpend
        ? `spend $${adSpend.toFixed(2)} < 1× target CPA $${minSpend.toFixed(2)}`
        : 'no target CPA computable — waiting for conversions',
    });
    addAction(
      'Keep it running — do not touch it yet',
      minSpend
        ? `Let spend reach at least $${minSpend.toFixed(2)} (≈1× target CPA) before judging. That's roughly $${Math.max(0, minSpend - adSpend).toFixed(2)} more at current pacing.`
        : 'Let the campaign accumulate more spend and at least a handful of purchases before judging.',
      'Ads Manager → leave budget, audience and creative unchanged until the spend gate is hit. No edits — edits reset learning.',
    );
  } else if (purchases === 0 && targetCpa !== null && adSpend >= 2 * targetCpa) {
    verdict = 'KILL';
    verdictReason = `Zero purchases after $${adSpend.toFixed(2)} — that's ${(adSpend / targetCpa).toFixed(1)}× your target CPA of $${targetCpa.toFixed(2)}. The market has voted; more spend won't fix a broken offer or broken creative.`;
    rulesFired.push({
      rule: 'Kill rule: 2× target CPA with zero purchases',
      detail: 'Spending twice the target CPA without a single purchase = structural failure.',
      math: `$${adSpend.toFixed(2)} ≥ 2 × $${targetCpa.toFixed(2)} with 0 purchases`,
    });
    addAction(
      'Turn the campaign off',
      'Stop the bleed. Do not "give it one more day" — the kill threshold already accounts for variance.',
      'Ads Manager → toggle the campaign off. Keep the ad account data for the post-mortem below.',
    );
    if (ctr !== null && ctr < BENCH.ctrWarn) {
      addAction(
        'Post-mortem: the creative never stopped the scroll',
        `Link CTR of ${(ctr * 100).toFixed(2)}% is below the ${(BENCH.ctrWarn * 100).toFixed(1)}% floor. The hook failed before the offer ever got a chance.`,
        'Ads Manager → Columns → customize with 3-sec video views to confirm hook rate, then rebuild hooks (below) before relaunching.',
      );
    } else if (clickToAtc !== null && clickToAtc < BENCH.clickAtcWarn) {
      addAction(
        'Post-mortem: clicks came, but nobody added to cart',
        `Only ${(clickToAtc * 100).toFixed(1)}% of clicks added to cart. Traffic was curious; the landing page or offer didn't convert curiosity.`,
        'Open the landing page on mobile → check load speed, message match with the ad, and whether the offer is visible above the fold.',
      );
    } else {
      addAction(
        'Post-mortem: diagnose offer vs audience before relaunching',
        'Traffic and engagement looked passable but zero checkouts converted — suspect offer strength, pricing, or audience intent.',
        'Relaunch only with a new angle: different offer (bundle/discount), or a warmer audience. Do not relaunch the same setup.',
      );
    }
  } else if (roas !== null && breakevenRoas !== null && roas >= breakevenRoas * 1.15) {
    verdict = 'SCALE';
    verdictReason = `ROAS of ${roas.toFixed(2)}× beats your ${breakevenRoas.toFixed(2)}× breakeven by a healthy margin across ${purchases} purchases. This is a winner — feed it budget methodically.`;
    rulesFired.push({
      rule: 'Scale rule: ROAS ≥ 1.15× breakeven with sufficient data',
      detail: 'Comfortable margin above breakeven = scale candidate.',
      math: `${roas.toFixed(2)} ≥ 1.15 × ${breakevenRoas.toFixed(2)} = ${(breakevenRoas * 1.15).toFixed(2)}`,
    });
    addAction(
      'Raise budget 20–30%',
      'Scale in steps, not jumps. A 20–30% increase every 48–72 hours keeps the algorithm stable.',
      'Ads Manager → Ad Set → Edit budget → increase by 20–30%. Do not duplicate into 10 ad sets at once.',
    );
    addAction(
      'Watch frequency and CTR as you scale',
      'Scale often raises CPM and frequency. If frequency climbs past 3.5 or CTR sags, pause scaling and refresh creative.',
      'Ads Manager → Columns → add Frequency and Link CTR → check every 2 days while scaling.',
    );
    if (hookRate !== null && hookRate < BENCH.hookWarn) {
      addAction(
        'Bank new hooks now, while it wins',
        `Hook rate of ${(hookRate * 100).toFixed(1)}% is soft — winners die when creative fatigues. Prepare replacements before performance dips.`,
        'Creative → cut 3 new first-3-second variants of the winning ad this week; keep them in drafts.',
      );
    }
  } else if (roas !== null && breakevenRoas !== null && roas >= breakevenRoas * 0.85) {
    verdict = 'RUN';
    verdictReason = `ROAS of ${roas.toFixed(2)}× is hovering around your ${breakevenRoas.toFixed(2)}× breakeven. Not a winner, not a loser — keep it running while you fix the weakest link below.`;
    rulesFired.push({
      rule: 'Hold rule: ROAS within ±15% of breakeven',
      detail: 'Too close to call — optimize the weakest signal instead of killing.',
      math: `${(breakevenRoas * 0.85).toFixed(2)} ≤ ${roas.toFixed(2)} < ${(breakevenRoas * 1.15).toFixed(2)}`,
    });
  } else {
    verdict = 'FIX';
    const roasTxt = roas !== null ? `${roas.toFixed(2)}×` : 'unknown';
    const beTxt = breakevenRoas !== null ? `${breakevenRoas.toFixed(2)}×` : 'your target';
    verdictReason = `ROAS of ${roasTxt} is below ${beTxt} breakeven, but the data shows fixable leaks rather than a dead campaign. Work the action list top-down.`;
    rulesFired.push({
      rule: 'Fix rule: ROAS < 0.85× breakeven but no kill trigger',
      detail: 'Underperforming with identifiable leaks — optimize, don’t kill yet.',
      math:
        roas !== null && breakevenRoas !== null
          ? `${roas.toFixed(2)} < 0.85 × ${breakevenRoas.toFixed(2)} = ${(breakevenRoas * 0.85).toFixed(2)}`
          : 'ROAS below target with fixable signals',
    });
  }

  // ---------------- ad signal grading ----------------
  const adSignals: SignalGrade[] = [];

  adSignals.push({
    key: 'roas',
    label: 'ROAS (return on ad spend)',
    value: roas,
    display: roas !== null ? `${roas.toFixed(2)}×` : '—',
    status: roas !== null && breakevenRoas !== null ? grade(roas, breakevenRoas * 1.15, breakevenRoas * 0.85) : 'na',
    benchmark: breakevenRoas !== null ? `Your breakeven: ${breakevenRoas.toFixed(2)}×. ${ADJUSTABLE}` : 'Set a breakeven ROAS to grade this.',
    explanation: 'The master signal for D2C. Above breakeven = profitable; everything else is diagnosis of why it isn’t.',
  });

  adSignals.push({
    key: 'cpa',
    label: 'Cost per purchase',
    value: cpa,
    display: cpa !== null ? `$${cpa.toFixed(2)}` : '—',
    status: cpa !== null && targetCpa !== null ? gradeLow(cpa, targetCpa, targetCpa * 1.3) : 'na',
    benchmark: targetCpa !== null ? `Your target CPA: $${targetCpa.toFixed(2)} (AOV ÷ breakeven ROAS). ${ADJUSTABLE}` : 'Needs AOV + breakeven ROAS to grade.',
    explanation: 'What you actually pay per order. Compare against target CPA, not against your feelings.',
  });

  const ctrStatus = grade(ctr, BENCH.ctrGood, BENCH.ctrWarn);
  adSignals.push({
    key: 'ctr',
    label: 'Link CTR',
    value: ctr,
    display: ctr !== null ? `${(ctr * 100).toFixed(2)}%` : '—',
    status: ctrStatus,
    benchmark: `Good ≥ ${(BENCH.ctrGood * 100).toFixed(1)}% · Watch ≥ ${(BENCH.ctrWarn * 100).toFixed(1)}%. ${ADJUSTABLE}`,
    explanation: 'Measures creative + audience fit. Low CTR = the scroll didn’t stop. This is almost always creative, not budget.',
  });

  adSignals.push({
    key: 'cpc',
    label: 'CPC (link)',
    value: cpc,
    display: cpc !== null ? `$${cpc.toFixed(2)}` : '—',
    status: gradeLow(cpc, BENCH.cpcGood, BENCH.cpcWarn),
    benchmark: `Good ≤ $${BENCH.cpcGood.toFixed(2)} · Watch ≤ $${BENCH.cpcWarn.toFixed(2)}. ${ADJUSTABLE}`,
    explanation: 'Price of each visitor. High CPC with low CTR = weak creative in a competitive auction.',
  });

  adSignals.push({
    key: 'cpm',
    label: 'CPM',
    value: cpm,
    display: cpm !== null ? `$${cpm.toFixed(2)}` : '—',
    status: gradeLow(cpm, BENCH.cpmGood, BENCH.cpmWarn),
    benchmark: `Good ≤ $${BENCH.cpmGood.toFixed(0)} · Watch ≤ $${BENCH.cpmWarn.toFixed(0)}. ${ADJUSTABLE}`,
    explanation: 'Auction price for your audience. High CPM = narrow or contested audience; fix with broader targeting, not higher bids.',
  });

  const freqStatus = gradeLow(frequency, BENCH.freqGood, BENCH.freqWarn);
  adSignals.push({
    key: 'frequency',
    label: 'Frequency',
    value: frequency,
    display: frequency !== null ? frequency.toFixed(2) : '—',
    status: freqStatus,
    benchmark: `Good ≤ ${BENCH.freqGood.toFixed(1)} · Watch ≤ ${BENCH.freqWarn.toFixed(1)}. ${ADJUSTABLE}`,
    explanation: 'How often the same people see your ad. Rising frequency + falling CTR = fatigue setting in.',
  });

  const clickAtcStatus = grade(clickToAtc, BENCH.clickAtcGood, BENCH.clickAtcWarn);
  adSignals.push({
    key: 'clickToAtc',
    label: 'Click → Add to cart',
    value: clickToAtc,
    display: clickToAtc !== null ? `${(clickToAtc * 100).toFixed(1)}%` : '—',
    status: clickAtcStatus,
    benchmark: `Good ≥ ${(BENCH.clickAtcGood * 100).toFixed(0)}% · Watch ≥ ${(BENCH.clickAtcWarn * 100).toFixed(0)}%. ${ADJUSTABLE}`,
    explanation: 'Landing page verdict. Clicks were interested — did the page sell? Low rate = message mismatch, slow page, or weak offer.',
  });

  const coStatus = grade(checkoutToPurchase, BENCH.checkoutPurchaseGood, BENCH.checkoutPurchaseWarn);
  adSignals.push({
    key: 'checkoutToPurchase',
    label: 'Checkout → Purchase',
    value: checkoutToPurchase,
    display: checkoutToPurchase !== null ? `${(checkoutToPurchase * 100).toFixed(1)}%` : '—',
    status: coStatus,
    benchmark: `Good ≥ ${(BENCH.checkoutPurchaseGood * 100).toFixed(0)}% · Watch ≥ ${(BENCH.checkoutPurchaseWarn * 100).toFixed(0)}%. ${ADJUSTABLE}`,
    explanation: 'Checkout friction check. Shoppers with intent are dropping at payment — shipping costs, trust, or form friction.',
  });

  // ---------------- business metrics ----------------
  const businessMetrics: SignalGrade[] = [];

  businessMetrics.push({
    key: 'mer',
    label: 'MER — Marketing Efficiency Ratio (blended)',
    value: mer,
    display: mer !== null ? `${mer.toFixed(2)}×` : '—',
    status: mer !== null && breakevenRoas !== null ? grade(mer, breakevenRoas, breakevenRoas * 0.8) : 'na',
    benchmark: breakevenRoas !== null ? `Healthy when ≥ your ${breakevenRoas.toFixed(2)}× breakeven. ${ADJUSTABLE}` : 'Needs total business revenue + breakeven ROAS.',
    explanation: 'Total business revenue ÷ total ad spend. ROAS lies when attribution misses; MER tells you if the business as a whole is winning.',
  });

  businessMetrics.push({
    key: 'poas',
    label: 'POAS — Profit on Ad Spend',
    value: poas,
    display: poas !== null ? `${poas.toFixed(2)}×` : '—',
    status: grade(poas, 1.0, 0.8),
    benchmark: `Profitable at ≥ 1.00×. ${ADJUSTABLE}`,
    explanation: '(Attributed revenue × gross margin) ÷ ad spend. A 3× ROAS at 20% margin is a 0.6× POAS — you’re losing money. This is the metric that keeps you honest.',
  });

  // ---------------- creative analysis ----------------
  const hookStatus = grade(hookRate, BENCH.hookGood, BENCH.hookWarn);
  const holdStatus = grade(holdRate, BENCH.holdGood, BENCH.holdWarn);
  const fatigue = frequency !== null && ctr !== null && frequency > BENCH.fatigueFreq && ctr < BENCH.fatigueCtr;
  const creative: CreativeAnalysis = {
    hookRate,
    holdRate,
    hookStatus,
    holdStatus,
    fatigue,
    fatigueNote: fatigue
      ? `Fatigue pattern detected: frequency ${frequency!.toFixed(1)} with CTR ${(ctr! * 100).toFixed(2)}%. Same people, tired creative. True confirmation needs a second diagnosis in 7+ days — save this one and compare.`
      : 'No clear fatigue pattern right now. If frequency keeps climbing while CTR falls, fatigue is setting in — compare against a future diagnosis to confirm.',
  };

  // ---------------- funnel ----------------
  // Landing page views sits between clicks and carts: the click→page
  // drop (slow page, accidental taps, app-to-browser friction) was
  // invisible before. When LPV wasn't provided, its rate is '—' and
  // the report hides the row; the ATC rate then falls back to % of
  // clicks, exactly as before. There is deliberately NO leak rule for
  // click→LPV: the engine has no benchmark for it, and this feature
  // must not change any verdict or action item.
  const funnel: FunnelStage[] = [
    { stage: 'Impressions', count: impressions, rateFromPrev: '—' },
    { stage: 'Link clicks', count: linkClicks, rateFromPrev: ctr !== null ? `${(ctr * 100).toFixed(2)}% CTR` : '—' },
    { stage: 'Landing page views', count: landingPageViews, rateFromPrev: clickToLpv !== null ? `${(clickToLpv * 100).toFixed(1)}% of clicks` : '—' },
    {
      stage: 'Add to carts',
      count: addToCarts,
      rateFromPrev:
        landingPageViews !== null
          ? lpvToAtc !== null
            ? `${(lpvToAtc * 100).toFixed(1)}% of page views`
            : '—'
          : clickToAtc !== null
            ? `${(clickToAtc * 100).toFixed(1)}% of clicks`
            : '—',
    },
    { stage: 'Checkouts', count: checkoutsInitiated, rateFromPrev: atcToCheckout !== null ? `${(atcToCheckout * 100).toFixed(1)}% of ATCs` : '—' },
    { stage: 'Purchases', count: purchases, rateFromPrev: checkoutToPurchase !== null ? `${(checkoutToPurchase * 100).toFixed(1)}% of checkouts` : '—' },
  ];

  // ---------------- spend-weighted leak ranking ----------------
  // Rate-based flags say a stage is weak; this says which weak stage
  // is actually eating the budget. Built only from the funnel stages
  // provided, starting at link clicks — people who never clicked cost
  // nothing, so the impressions→clicks drop is not a spend leak.
  // Raw values (not the ?? 0 fallbacks above): a missing purchase
  // count must not read as "every checkout was lost".
  const spendRaw = num(i.adSpend);
  const purchasesRaw = num(i.purchases);
  let leakRanking: LeakRanking | null = null;
  if (spendRaw !== null && spendRaw > 0 && linkClicks !== null && linkClicks > 0) {
    const cpcValue = spendRaw / linkClicks;
    const chain = [
      { stage: 'Link clicks', count: linkClicks },
      { stage: 'Landing page views', count: landingPageViews },
      { stage: 'Add to carts', count: addToCarts },
      { stage: 'Checkouts', count: checkoutsInitiated },
      { stage: 'Purchases', count: purchasesRaw },
    ].filter((s): s is { stage: string; count: number } => s.count !== null);
    const steps: LeakStep[] = [];
    for (let k = 0; k < chain.length - 1; k++) {
      const lost = chain[k].count - chain[k + 1].count;
      if (lost <= 0) continue; // downstream counts that rise = noisy data, not a leak
      steps.push({
        fromStage: chain[k].stage,
        toStage: chain[k + 1].stage,
        lost,
        wastedSpend: lost * cpcValue,
        shareOfWaste: 0,
      });
    }
    if (steps.length > 0) {
      const totalWastedSpend = steps.reduce((s, x) => s + x.wastedSpend, 0);
      for (const s of steps) {
        s.shareOfWaste = totalWastedSpend > 0 ? s.wastedSpend / totalWastedSpend : 0;
      }
      steps.sort((a, b) => b.wastedSpend - a.wastedSpend);
      leakRanking = { steps, biggestLeak: steps[0], totalWastedSpend, totalSpend: spendRaw };
    }
  }

  // ---------------- signal-driven action items (RUN / FIX) ----------------
  if (verdict === 'RUN' || verdict === 'FIX') {
    if (ctrStatus === 'bad' || hookStatus === 'bad') {
      rulesFired.push({
        rule: 'Creative weakness detected',
        detail: 'CTR and/or hook rate below floor — the ad isn’t earning attention.',
        math: `CTR ${ctr !== null ? (ctr * 100).toFixed(2) + '%' : 'n/a'} < ${(BENCH.ctrWarn * 100).toFixed(1)}%${hookRate !== null ? ` · hook ${(hookRate * 100).toFixed(1)}% < ${(BENCH.hookWarn * 100).toFixed(0)}%` : ''}`,
      });
      addAction(
        'Fix the first 3 seconds — launch 3 new hooks',
        'Your offer never got a fair test because the scroll never stopped. Test hooks, not whole new videos: same footage, 3 different openers (problem call-out, bold claim, pattern interrupt).',
        'Ads Manager → Ad level → Duplicate the ad 3× → swap only the first 3 seconds → publish into the same ad set. Judge after each hook spends ~0.5× target CPA.',
      );
    }
    if (clickAtcStatus === 'bad') {
      rulesFired.push({
        rule: 'Landing page leak detected',
        detail: 'Clicks arrive but don’t add to cart — page/offer mismatch.',
        math: `click→ATC ${clickToAtc !== null ? (clickToAtc * 100).toFixed(1) + '%' : 'n/a'} < ${(BENCH.clickAtcWarn * 100).toFixed(0)}%`,
      });
      addAction(
        'Fix the landing page before touching ads',
        'More traffic won’t fix a page that doesn’t convert. Check: does the headline match the ad’s promise? Is the offer visible above the fold on mobile? Page load under 3s?',
        'Open the landing URL on your phone → fix message match + mobile speed first. Then re-test with the same ads.',
      );
    }
    if (coStatus === 'bad') {
      rulesFired.push({
        rule: 'Checkout friction detected',
        detail: 'High-intent shoppers abandon at checkout.',
        math: `checkout→purchase ${checkoutToPurchase !== null ? (checkoutToPurchase * 100).toFixed(1) + '%' : 'n/a'} < ${(BENCH.checkoutPurchaseWarn * 100).toFixed(0)}%`,
      });
      addAction(
        'Remove checkout friction',
        'They wanted to buy. Suspects: surprise shipping costs, forced account creation, limited payment options, missing trust signals.',
        'Store settings → enable guest checkout + show shipping costs early + add reviews/trust badges on the cart page.',
      );
    }
    if (cpa !== null && targetCpa !== null && cpa > targetCpa * 1.3) {
      addAction(
        'Bring CPA down or accept the verdict',
        `You’re paying $${cpa.toFixed(2)} per order against a $${targetCpa.toFixed(2)} target. Work the leaks above in order — creative first, then page, then checkout. If none move in one test cycle, kill it.`,
        'Ads Manager → set an automated rule: turn off ad sets spending > 1.5× target CPA with 0 purchases.',
      );
    }
    const merBad = businessMetrics[0].status === 'bad';
    if (merBad) {
      addAction(
        'Zoom out: the business is underwater, not just the campaign',
        `Blended MER of ${mer !== null ? mer.toFixed(2) + '×' : 'n/a'} is below breakeven. No ad-level tweak fixes a business losing money on every blended dollar — check pricing, AOV and repeat purchase rate.`,
        'Founder task, not an Ads Manager task: review pricing/bundles to lift AOV before scaling spend.',
      );
    }
    if (fatigue) {
      addAction(
        'Refresh creative — fatigue pattern detected',
        'Same audience seeing the same ad too often. Frequency is up, CTR is down.',
        'Ads Manager → broaden the audience or add 2–3 fresh creatives to the ad set; don’t just raise the budget on tired ads.',
      );
    }
    if (actionItems.length === 0) {
      addAction(
        'Hold steady and re-measure in 3–4 days',
        'No single signal is screaming. Small sample or mixed signals — let more data accumulate before changing anything.',
        'Ads Manager → no edits. Set a calendar reminder to re-run this diagnosis with fresh numbers.',
      );
    }
  }

  return {
    campaignType: 'D2C',
    verdict,
    verdictTitle: VERDICT_META[verdict].title,
    verdictReason,
    verdictRank: VERDICT_META[verdict].rank,
    dataSufficiency: {
      sufficient,
      spendProgress,
      targetCpa,
      note: sufficient
        ? 'Enough spend for a real read.'
        : 'Not enough spend yet — the verdict is WAIT by design.',
    },
    adSignals,
    businessMetrics,
    creative,
    funnel,
    leakRanking,
    rulesFired,
    actionItems: actionItems.sort((a, b) => a.priority - b.priority),
  };
}

/** Compare two results (old vs new) for the improvement verdict. */
export function compareVerdicts(
  oldR: DiagnosisResults,
  newR: DiagnosisResults,
): { improved: boolean; summary: string } {
  if (newR.verdictRank > oldR.verdictRank) {
    return {
      improved: true,
      summary: `Improved: verdict moved from ${oldR.verdictTitle} to ${newR.verdictTitle}.`,
    };
  }
  if (newR.verdictRank < oldR.verdictRank) {
    return {
      improved: false,
      summary: `Declined: verdict moved from ${oldR.verdictTitle} to ${newR.verdictTitle}. Revisit the action items.`,
    };
  }
  const oldRoas = oldR.adSignals.find((s) => s.key === 'roas')?.value;
  const newRoas = newR.adSignals.find((s) => s.key === 'roas')?.value;
  if (oldRoas !== null && oldRoas !== undefined && newRoas !== null && newRoas !== undefined) {
    if (newRoas > oldRoas) {
      return { improved: true, summary: `Holding ${newR.verdictTitle}, with ROAS improving ${oldRoas.toFixed(2)}× → ${newRoas.toFixed(2)}×.` };
    }
    if (newRoas < oldRoas) {
      return { improved: false, summary: `Holding ${newR.verdictTitle}, but ROAS slipped ${oldRoas.toFixed(2)}× → ${newRoas.toFixed(2)}×.` };
    }
  }
  return { improved: true, summary: `Stable at ${newR.verdictTitle} — no meaningful change between the two diagnoses.` };
}
