import type { ForecastInputs } from '@/lib/forecast';

/**
 * Sample forecast — clearly labeled example values (the reference
 * calculator's example: CPM 26.31, CTR 1.52%, AOV 68.85, margin 50%).
 * The funnel rates are tuned so expected purchases (~11) line up with the
 * observed purchases (11), so the sample tells a coherent story: a young
 * campaign, still learning, below break-even, with a weak hook.
 */
export const SAMPLE_FORECAST: ForecastInputs = {
  campaignName: 'Sample — Aurora Skincare early test',
  market: 'Netherlands + Belgium',
  totalBudget: 5000,
  spentSoFar: 550,
  dailyBudget: 50,
  daysRunning: 11,
  cpm: 26.31,
  impressionsActual: null,
  linkCtrPct: 1.52,
  linkClicksActual: null,
  lpvActual: null,
  lpvRatePct: 85,
  atcActual: null,
  atcRatePct: 15,
  checkoutsActual: null,
  checkoutRatePct: 60,
  purchaseRatePct: 45,
  purchasesSoFar: 11,
  aov: 68.85,
  marginPct: 50,
  targetProfit: 0,
  hookRatePct: 16,
  frequency: 1.8,
  attribution: '7dc_1dv',
};

export const SAMPLE_FORECAST_NOTE =
  'Sample forecast — example values from the original calculator (CPM $26.31, CTR 1.52%, AOV $68.85, 50% margin). Replace them with your own numbers to forecast a real campaign.';
