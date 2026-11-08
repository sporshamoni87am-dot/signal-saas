import type { DiagnosisInputs } from '@/lib/engine';

/**
 * One-click demo campaign: realistic D2C numbers for a fictional skincare
 * brand. Deliberately a mixed-signal "FIX IT" case — decent traffic, weak
 * conversion — because that's where the diagnosis earns its keep.
 *
 * The numbers are illustrative, not real account data.
 */
export const SAMPLE_CAMPAIGN: DiagnosisInputs = {
  campaignType: 'D2C',
  campaignName: 'Sample — Aurora Skincare (D2C)',
  breakevenRoas: 2.2,
  dailyBudget: 75,
  aov: 52,
  grossMarginPct: 68,
  daysRunning: 10,
  totalBusinessRevenue: 5200,
  problemStatement:
    'Spending $75/day. Clicks look cheap but barely anyone buys — is it the creative or the offer?',
  adSpend: 690,
  impressions: 94000,
  reach: 61000,
  linkClicks: 1150,
  landingPageViews: 920,
  addToCarts: 68,
  checkoutsInitiated: 60,
  purchases: 19,
  attributedRevenue: 988,
  videoViews3s: 15000,
  videoThruplays: 2600,
  frequency: 1.9,
  /** No market/category given — the sample is graded on generic benchmarks. */
  marketRegion: null,
  productCategory: null,
};

export const SAMPLE_NOTE =
  'Sample data — a fictional D2C skincare campaign. Replace with your own numbers anytime via “Edit inputs”.';
