import type { ForecastInputs } from '@/lib/forecast';

/**
 * Sample forecast — the SAME Aurora Skincare campaign as the diagnosis
 * sample, at an earlier stage: $550 spent, 11 purchases so far, $50/day
 * for 11 days. Same business numbers (AOV $52, margin 45%) and same ad
 * numbers (CPM $7.34, CTR 1.22%) as the diagnosis sample, and the funnel
 * rates are the campaign's own rates from the diagnosis (80% click→LPV,
 * 7.4% LPV→ATC, 88% ATC→checkout, 32% checkout→purchase).
 *
 * Expected purchases come out at ~15 against 11 observed — early-stage
 * noise, and the CPA range on the report covers the gap. The learning
 * story is the point: 11 events at ~7/week is well below Meta's ~50/week,
 * so the forecast says "too early to scale or pause".
 */
export const SAMPLE_FORECAST: ForecastInputs = {
  campaignName: 'Sample — Aurora Skincare early test',
  market: 'United States',
  marketRegion: 'US',
  productCategory: 'beauty',
  totalBudget: 5000,
  spentSoFar: 550,
  dailyBudget: 50,
  daysRunning: 11,
  cpm: 7.34,
  impressionsActual: null,
  linkCtrPct: 1.22,
  linkClicksActual: null,
  lpvActual: null,
  lpvRatePct: 80,
  atcActual: null,
  atcRatePct: 7.4,
  checkoutsActual: null,
  checkoutRatePct: 88,
  purchaseRatePct: 32,
  purchasesSoFar: 11,
  aov: 52,
  marginPct: 45,
  targetProfit: 0,
  hookRatePct: 16,
  frequency: 1.9,
  attribution: '7dc_1dv',
};

export const SAMPLE_FORECAST_NOTE =
  'Sample forecast — the same Aurora Skincare campaign as the diagnosis sample, at an earlier stage: $550 spent, 11 purchases so far. Replace the numbers with your own to forecast a real campaign.';
