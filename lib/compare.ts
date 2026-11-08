/**
 * Comparison of two SAVED diagnoses (the /compare tab).
 *
 * This is additive only: the verdict itself is still decided by
 * lib/engine.ts — compareVerdicts() supplies the summary text and this
 * module adds pair suggestion, time-window rules and the metric deltas.
 * Nothing here changes any verdict, rule or grade.
 */
import {
  compareVerdicts,
  type DiagnosisInputs,
  type DiagnosisResults,
  type Verdict,
} from './engine';

/** One saved diagnosis, as fetched for the comparison page. */
export interface DiagnosisSummary {
  id: string;
  campaignName: string;
  verdict: Verdict;
  createdAt: string; // ISO timestamp
  inputs: DiagnosisInputs;
  results: DiagnosisResults;
}

/** Auto-suggestion window: the previous same-campaign diagnosis must be
    this recent to be suggested as the pair. */
export const AUTO_WINDOW_DAYS = 90;
/** Gap above which the comparison is flagged as directional. */
export const DIRECTIONAL_GAP_DAYS = 30;

export interface PairSuggestion {
  earlierId: string | null;
  laterId: string | null;
  sameCampaign: boolean;
  /** Plain-language note when the suggestion falls back to any campaign. */
  note: string | null;
}

/**
 * Pick the best pair on load: the most recent diagnosis plus the most
 * recent PREVIOUS diagnosis of the SAME campaign within 90 days. If no
 * same-campaign previous diagnosis exists in the window, fall back to the
 * two most recent diagnoses of any campaign and say so.
 */
export function suggestPair(rows: DiagnosisSummary[]): PairSuggestion {
  const sorted = [...rows].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
  if (sorted.length === 0) {
    return { earlierId: null, laterId: null, sameCampaign: false, note: null };
  }
  if (sorted.length === 1) {
    return { earlierId: null, laterId: sorted[0].id, sameCampaign: false, note: null };
  }
  const latest = sorted[0];
  const windowMs = AUTO_WINDOW_DAYS * 24 * 3600 * 1000;
  const prevSame = sorted.slice(1).find(
    (r) =>
      r.campaignName === latest.campaignName &&
      +new Date(latest.createdAt) - +new Date(r.createdAt) <= windowMs,
  );
  if (prevSame) {
    return { earlierId: prevSame.id, laterId: latest.id, sameCampaign: true, note: null };
  }
  return {
    earlierId: sorted[1].id,
    laterId: sorted[0].id,
    sameCampaign: sorted[0].campaignName === sorted[1].campaignName,
    note: `No earlier diagnosis of “${latest.campaignName}” within ${AUTO_WINDOW_DAYS} days — showing the two most recent diagnoses instead.`,
  };
}

/** Whole days between two ISO timestamps. */
export function dayGap(aISO: string, bISO: string): number {
  return Math.round(Math.abs(+new Date(aISO) - +new Date(bISO)) / 86400000);
}

export type CompareStatus = 'improved' | 'declined' | 'stable';

/**
 * Overall status, mirroring compareVerdicts() exactly: verdict rank first,
 * then ROAS as the tiebreak. The summary text itself comes from
 * compareVerdicts() so the two can never disagree.
 */
export function compareStatus(oldR: DiagnosisResults, newR: DiagnosisResults): CompareStatus {
  if (newR.verdictRank > oldR.verdictRank) return 'improved';
  if (newR.verdictRank < oldR.verdictRank) return 'declined';
  const oldRoas = oldR.adSignals.find((s) => s.key === 'roas')?.value ?? null;
  const newRoas = newR.adSignals.find((s) => s.key === 'roas')?.value ?? null;
  if (oldRoas !== null && newRoas !== null) {
    if (newRoas > oldRoas) return 'improved';
    if (newRoas < oldRoas) return 'declined';
  }
  return 'stable';
}

export function compareSummary(oldR: DiagnosisResults, newR: DiagnosisResults): string {
  return compareVerdicts(oldR, newR).summary;
}

// ---------------------------------------------------------------------------
// Metric deltas
// ---------------------------------------------------------------------------

export type DeltaFormat = 'x' | 'money' | 'pct' | 'int';

export interface CompareRow {
  key: string;
  label: string;
  oldText: string;
  newText: string;
  /** Signed delta, e.g. "+0.21×", "−$12.40", "+2.10pp", or "—". */
  deltaText: string;
  direction: 'up' | 'down' | 'same' | 'na';
  /** null when the change is neutral (spend, revenue) or not evaluable. */
  good: boolean | null;
}

function fmtVal(v: number | null, format: DeltaFormat): string {
  if (v === null || !Number.isFinite(v)) return '—';
  if (format === 'money') return `$${v.toFixed(2)}`;
  if (format === 'pct') return `${(v * 100).toFixed(2)}%`;
  if (format === 'int') return Math.round(v).toLocaleString('en-US');
  return `${v.toFixed(2)}×`;
}

function fmtDelta(d: number, format: DeltaFormat): string {
  const sign = d > 0 ? '+' : '';
  if (format === 'money') return `${sign}$${d.toFixed(2)}`;
  if (format === 'pct') return `${sign}${(d * 100).toFixed(2)}pp`;
  if (format === 'int') return `${sign}${Math.round(d).toLocaleString('en-US')}`;
  return `${sign}${d.toFixed(2)}×`;
}

function numRow(
  key: string,
  label: string,
  oldV: number | null,
  newV: number | null,
  higherBetter: boolean,
  format: DeltaFormat,
  neutral = false,
): CompareRow {
  if (oldV === null || newV === null) {
    return { key, label, oldText: fmtVal(oldV, format), newText: fmtVal(newV, format), deltaText: '—', direction: 'na', good: null };
  }
  const d = newV - oldV;
  const direction = d > 0 ? 'up' : d < 0 ? 'down' : 'same';
  return {
    key,
    label,
    oldText: fmtVal(oldV, format),
    newText: fmtVal(newV, format),
    deltaText: d === 0 ? '0' : fmtDelta(d, format),
    direction,
    good: neutral || d === 0 ? null : higherBetter ? d > 0 : d < 0,
  };
}

function signalValue(results: DiagnosisResults, key: string): number | null {
  return (
    [...results.adSignals, ...results.businessMetrics].find((s) => s.key === key)?.value ?? null
  );
}

function rate(num: number | null, den: number | null): number | null {
  if (num === null || den === null || den === 0) return null;
  return num / den;
}

/**
 * Side-by-side metric rows for two saved diagnoses. Missing metrics in
 * either diagnosis show "—" and are never invented. MER/POAS rows appear
 * only when both diagnoses have them.
 */
export function buildMetricRows(oldI: DiagnosisInputs, oldR: DiagnosisResults, newI: DiagnosisInputs, newR: DiagnosisResults): CompareRow[] {
  const rows: CompareRow[] = [
    numRow('roas', 'ROAS', signalValue(oldR, 'roas'), signalValue(newR, 'roas'), true, 'x'),
    numRow('cpa', 'Cost / purchase', signalValue(oldR, 'cpa'), signalValue(newR, 'cpa'), false, 'money'),
    numRow('spend', 'Ad spend', oldI.adSpend, newI.adSpend, true, 'money', true),
    numRow('revenue', 'Attributed revenue', oldI.attributedRevenue, newI.attributedRevenue, true, 'money', true),
    numRow('ctr', 'Link CTR', signalValue(oldR, 'ctr'), signalValue(newR, 'ctr'), true, 'pct'),
    numRow('cpm', 'CPM', signalValue(oldR, 'cpm'), signalValue(newR, 'cpm'), false, 'money'),
    numRow('cpc', 'CPC', signalValue(oldR, 'cpc'), signalValue(newR, 'cpc'), false, 'money'),
    numRow('hook', 'Hook rate', oldR.creative.hookRate, newR.creative.hookRate, true, 'pct'),
    numRow('lpv', 'Landing-page-view rate', rate(oldI.landingPageViews, oldI.linkClicks), rate(newI.landingPageViews, newI.linkClicks), true, 'pct'),
    numRow(
      'atc',
      'Add-to-cart rate',
      rate(oldI.addToCarts, oldI.landingPageViews ?? oldI.linkClicks),
      rate(newI.addToCarts, newI.landingPageViews ?? newI.linkClicks),
      true,
      'pct',
    ),
    numRow('checkout', 'Checkout rate', rate(oldI.checkoutsInitiated, oldI.addToCarts), rate(newI.checkoutsInitiated, newI.addToCarts), true, 'pct'),
    numRow('purchase', 'Purchase rate', rate(oldI.purchases, oldI.checkoutsInitiated), rate(newI.purchases, newI.checkoutsInitiated), true, 'pct'),
  ];

  // Biggest budget leak: compare the money lost at each diagnosis's worst
  // transition (lower is better). The stage names travel with the values.
  const oldLeak = oldR.leakRanking?.biggestLeak ?? null;
  const newLeak = newR.leakRanking?.biggestLeak ?? null;
  if (oldLeak && newLeak) {
    const leakRow = numRow('leak', 'Biggest budget leak', oldLeak.wastedSpend, newLeak.wastedSpend, false, 'money');
    leakRow.oldText = `${oldLeak.fromStage} → ${oldLeak.toStage} · ${fmtVal(oldLeak.wastedSpend, 'money')}`;
    leakRow.newText = `${newLeak.fromStage} → ${newLeak.toStage} · ${fmtVal(newLeak.wastedSpend, 'money')}`;
    rows.push(leakRow);
  } else {
    rows.push({
      key: 'leak',
      label: 'Biggest budget leak',
      oldText: oldLeak ? `${oldLeak.fromStage} → ${oldLeak.toStage} · ${fmtVal(oldLeak.wastedSpend, 'money')}` : '—',
      newText: newLeak ? `${newLeak.fromStage} → ${newLeak.toStage} · ${fmtVal(newLeak.wastedSpend, 'money')}` : '—',
      deltaText: '—',
      direction: 'na',
      good: null,
    });
  }

  // Business metrics only when both diagnoses have them.
  const oldMer = signalValue(oldR, 'mer');
  const newMer = signalValue(newR, 'mer');
  if (oldMer !== null && newMer !== null) {
    rows.push(numRow('mer', 'MER (blended)', oldMer, newMer, true, 'x'));
  }
  const oldPoas = signalValue(oldR, 'poas');
  const newPoas = signalValue(newR, 'poas');
  if (oldPoas !== null && newPoas !== null) {
    rows.push(numRow('poas', 'POAS', oldPoas, newPoas, true, 'x'));
  }

  return rows;
}
