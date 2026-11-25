import type { DiagnosisInputs } from '@/lib/engine';

/**
 * One-click demo campaign: realistic D2C numbers for a fictional skincare
 * brand. Deliberately a mixed-signal "FIX IT" case — decent traffic, weak
 * conversion — because that's where the diagnosis earns its keep.
 *
 * The numbers are internally consistent — every figure on the report can
 * be recomputed from the inputs above:
 * - Breakeven ROAS 2.22 = 1 ÷ 45% gross margin.
 * - Daily budget $69 × 10 days running = $690 ad spend.
 * - Attributed revenue $988 = 19 purchases × $52 AOV.
 * - Total business revenue $1,150 = attributed $988 + ~$162 from other
 *   channels, so MER (1.67×) and POAS (0.64×) tell the same story: the
 *   business as a whole is below breakeven, not just this campaign.
 * - Market + category set (United States, Beauty & Skincare) so the
 *   sample demonstrates the segment benchmarks.
 *
 * The numbers are illustrative, not real account data.
 */
export const SAMPLE_CAMPAIGN: DiagnosisInputs = {
  campaignType: 'D2C',
  campaignName: 'Sample — Aurora Skincare (D2C)',
  breakevenRoas: 2.22,
  dailyBudget: 69,
  aov: 52,
  grossMarginPct: 45,
  daysRunning: 10,
  totalBusinessRevenue: 1150,
  problemStatement:
    'Spending $69/day. Clicks look cheap but barely anyone buys — is it the creative or the offer?',
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
  /** US skincare — graded against Beauty & Skincare · United States benchmarks. */
  marketRegion: 'US',
  productCategory: 'beauty',
};

export const SAMPLE_NOTE =
  'Sample data — a fictional D2C skincare campaign. Replace with your own numbers anytime via “Edit inputs”.';
