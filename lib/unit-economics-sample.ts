import type { UnitEconomicsInputs } from '@/lib/unit-economics';

/**
 * Sample unit economics — Ben Heath's worked example from the video,
 * verified against the transcript and on-screen sheet:
 * AOV $200, 5 purchases, 50% margin, $10,000 spend, 200 customers.
 * Expected: lifetime revenue $1,000, LTGP $500, CAC $50, LTGP:CAC 10,
 * first-order gross profit $100, acceptable CPP $100, profit/customer $450.
 */
export const SAMPLE_UNIT_ECONOMICS: UnitEconomicsInputs = {
  mode: 'ecommerce',
  currency: '$',
  aov: 200,
  avgPurchases: 5,
  marginPct: 50,
  adSpend: 10000,
  customersAcquired: 200,
  leadsAcquired: null,
  leadToCustomerPct: null,
};

export const SAMPLE_UNIT_ECONOMICS_NOTE =
  'Sample — Ben Heath’s worked example from the video (AOV $200, 5 purchases, 50% margin, $10,000 spend, 200 customers → LTGP $500, CAC $50, ratio 10). Replace them with your own numbers.';

export const SAMPLE_UNIT_ECONOMICS_LEADGEN: UnitEconomicsInputs = {
  mode: 'leadgen',
  currency: '$',
  aov: 1000,
  avgPurchases: 1,
  marginPct: 50,
  adSpend: 10000,
  customersAcquired: null,
  leadsAcquired: 500,
  leadToCustomerPct: 20,
};

/**
 * Heath's Sheet 1 examples, exactly as shown in the video — each is just
 * a different set of the same 5 inputs. Expected outputs (CAC stays $50
 * unless spend/customers change):
 * - base: $200, 5, 50%, $10,000, 200 → LTV $1,000, LTGP $500, ratio 10
 * - repeat: purchases 5 → 15 → LTGP $1,500, ratio 30
 * - aov-300-margin-75: $300, 5, 75% → LTV $1,500, LTGP $1,125, ratio 22.5
 * - best: $300, 8, 60% → LTV $2,400, LTGP $1,440, ratio 28.8
 * - subscription: $100, 23, 50% → LTV $2,300, LTGP $1,150, ratio 23
 * - worst: $200, 1, 15% → LTGP $30, ratio 0.6
 * - cac-40: 250 customers → CAC $40, ratio 12.5
 */
export interface HeathSheet1Example {
  label: string;
  note: string;
  aov: number;
  avgPurchases: number;
  marginPct: number;
  adSpend: number;
  customersAcquired: number;
}

export const HEATH_SHEET1_EXAMPLES: HeathSheet1Example[] = [
  { label: 'Base example', note: 'LTGP $500, ratio 10', aov: 200, avgPurchases: 5, marginPct: 50, adSpend: 10000, customersAcquired: 200 },
  { label: 'Repeat ×3', note: '15 purchases → LTGP $1,500', aov: 200, avgPurchases: 15, marginPct: 50, adSpend: 10000, customersAcquired: 200 },
  { label: 'AOV $300, margin 75%', note: 'LTGP $1,125', aov: 300, avgPurchases: 5, marginPct: 75, adSpend: 10000, customersAcquired: 200 },
  { label: 'Best case', note: '$300 × 8 × 60% → LTGP $1,440', aov: 300, avgPurchases: 8, marginPct: 60, adSpend: 10000, customersAcquired: 200 },
  { label: 'Subscription', note: '$100 × 23 → LTGP $1,150', aov: 100, avgPurchases: 23, marginPct: 50, adSpend: 10000, customersAcquired: 200 },
  { label: 'Worst case', note: '$200 × 1 × 15% → LTGP $30', aov: 200, avgPurchases: 1, marginPct: 15, adSpend: 10000, customersAcquired: 200 },
  { label: 'CAC $40', note: '250 customers → ratio 12.5', aov: 200, avgPurchases: 5, marginPct: 50, adSpend: 10000, customersAcquired: 250 },
];

/**
 * Heath's break-even Lead Gen presets, as shown/spoken in the video.
 * Base: $1,000 value, 50% margin, 20% close → profit $500, max CPL $100.
 * The 10% / 30% close-rate examples use 75% margin ($750 profit):
 * 10% → $75, 30% → $225.
 */
export interface HeathBreakEvenLeadGenPreset {
  label: string;
  note: string;
  firstTransactionValue: number;
  marginPct: number;
  conversionPct: number;
}

export const HEATH_BREAKEVEN_LEADGEN_PRESETS: HeathBreakEvenLeadGenPreset[] = [
  { label: '20% close rate', note: 'Max CPL $100', firstTransactionValue: 1000, marginPct: 50, conversionPct: 20 },
  { label: '10% close rate', note: 'Max CPL $75', firstTransactionValue: 1000, marginPct: 75, conversionPct: 10 },
  { label: '30% close rate', note: 'Max CPL $225', firstTransactionValue: 1000, marginPct: 75, conversionPct: 30 },
];
