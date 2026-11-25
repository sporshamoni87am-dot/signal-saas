import type { UnitEconomicsInputs } from '@/lib/unit-economics';

/**
 * Sample unit economics — Ben Heath's worked example from the video,
 * verified against the transcript and on-screen sheet:
 * AOV $200, 5 purchases, 50% margin, $10,000 spend, 200 customers.
 * Expected: lifetime revenue $1,000, LTGP $500, CAC $50, LTGP:CAC 10:1,
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
  'Sample — Ben Heath’s worked example from the video (AOV $200, 5 purchases, 50% margin, $10,000 spend, 200 customers → LTGP $500, CAC $50, 10:1). Replace them with your own numbers.';

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
