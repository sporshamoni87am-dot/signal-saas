/**
 * Segment benchmarks for the D2C diagnosis engine.
 *
 * WHY THIS FILE EXISTS
 * The engine used to grade every campaign against ONE generic D2C table.
 * Published 2026 data says that is wrong in most cases:
 *  - CPM varies ~12x by country. US ~$16–23 vs India ~$1.00–1.80
 *    (Lebesgue ecommerce CPM by country, Jul 2026; SuperAds country series).
 *    Country is the single biggest driver of CPM.
 *  - CTR/CPC vary 3–4x by industry. Apparel CPM $5.61 / CTR 1.24%,
 *    beauty $7.43 / 1.52%, finance $28.40 / 0.56%, fitness CTR 2.24%
 *    (Revealbot 2025–2026 / WordStream 2026 averages).
 *
 * WHAT THIS FILE IS NOT
 * These are published THIRD-PARTY medians and averages — directional
 * starting points, NOT Meta-verified data and NOT a promise for any
 * account. Every set carries its source label, and the report says which
 * set graded the campaign. When there is no solid published data for a
 * region or category, the generic table is used and the report says so.
 *
 * HOW THE THRESHOLDS ARE DERIVED (so nobody has to guess)
 *  - CPM is driven by REGION tier, not category: the auction price is set
 *    by where the audience lives. Tier 1 (US/UK/CA/AU/EU) keeps the
 *    existing generic thresholds — they sit at the Tier-1 ecommerce
 *    median (Triple Whale: $15.06, Aug 2025–Jul 2026).
 *  - CTR/CPC are driven by CATEGORY: the same creative performs very
 *    differently by vertical. "Good" = the published category average
 *    (rounded); "Warn" = 0.7x the average for CTR (higher is better) and
 *    1.75x the average for CPC (lower is better) — the same ratios the
 *    generic table already used.
 *  - Funnel rates (click→ATC, checkout→purchase) and hook/hold rates keep
 *    the existing generic values: no solid segment data was found for
 *    them, and inventing segment numbers would be worse than generic ones.
 */

export type MarketRegion =
  | 'US'
  | 'UK'
  | 'CA'
  | 'AU'
  | 'EU'
  | 'BD'
  | 'IN'
  | 'SEA'
  | 'OTHER';

export type ProductCategory =
  | 'beauty'
  | 'fashion'
  | 'electronics'
  | 'home'
  | 'food'
  | 'health'
  | 'other';

export const MARKET_REGIONS: { value: MarketRegion; label: string }[] = [
  { value: 'US', label: 'United States' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'EU', label: 'Europe' },
  { value: 'BD', label: 'Bangladesh' },
  { value: 'IN', label: 'India' },
  { value: 'SEA', label: 'Southeast Asia' },
  { value: 'OTHER', label: 'Other / multiple markets' },
];

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'beauty', label: 'Beauty & Skincare' },
  { value: 'fashion', label: 'Fashion & Apparel' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'home', label: 'Home & Living' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'health', label: 'Health & Supplements' },
  { value: 'other', label: 'Other / multiple categories' },
];

export function isMarketRegion(v: string | null | undefined): v is MarketRegion {
  return (
    v !== null &&
    v !== undefined &&
    MARKET_REGIONS.some((r) => r.value === v)
  );
}

export function isProductCategory(
  v: string | null | undefined,
): v is ProductCategory {
  return (
    v !== null &&
    v !== undefined &&
    PRODUCT_CATEGORIES.some((c) => c.value === v)
  );
}

export function regionLabel(r: MarketRegion | null | undefined): string | null {
  if (!isMarketRegion(r) || r === 'OTHER') return null;
  return MARKET_REGIONS.find((x) => x.value === r)?.label ?? null;
}

export function categoryLabel(
  c: ProductCategory | null | undefined,
): string | null {
  if (!isProductCategory(c) || c === 'other') return null;
  return PRODUCT_CATEGORIES.find((x) => x.value === c)?.label ?? null;
}

/** The thresholds the engine grades CTR/CPC/CPM against. */
export interface BenchmarkSet {
  ctrGood: number;
  ctrWarn: number;
  cpcGood: number;
  cpcWarn: number;
  cpmGood: number;
  cpmWarn: number;
  /** e.g. "Beauty & Skincare · United States" or "Generic D2C benchmarks". */
  label: string;
  /** Where the numbers come from — shown on the report. */
  source: string;
  /** True when at least one segment table sharpened the grades. */
  segmented: boolean;
}

/** The original generic table — unchanged, and still the fallback. */
const GENERIC = {
  ctrGood: 0.01,
  ctrWarn: 0.007,
  cpcGood: 2.0,
  cpcWarn: 3.5,
  cpmGood: 15,
  cpmWarn: 25,
} as const;

/**
 * CPM by market tier. Sources: Lebesgue ecommerce CPM by country, Jul 2026
 * (US $16.08, UK $11.81, AU $11.63, CA $11.47, IN $1.36, BR $2.63);
 * Triple Whale global ecommerce median CPM $15.06 (Aug 2025–Jul 2026).
 * Tier 1 keeps the generic thresholds — they sit at the Tier-1 median.
 */
const CPM_BY_TIER: Record<
  'tier1' | 'southAsia' | 'sea',
  { cpmGood: number; cpmWarn: number; tierLabel: string; source: string }
> = {
  tier1: {
    cpmGood: 15,
    cpmWarn: 25,
    tierLabel: 'Tier 1 markets',
    source: 'Triple Whale ecommerce median CPM $15.06 (Aug 2025–Jul 2026)',
  },
  southAsia: {
    cpmGood: 2,
    cpmWarn: 4,
    tierLabel: 'South Asia',
    source: 'Lebesgue ecommerce CPM by country, Jul 2026 (India $1.36)',
  },
  sea: {
    cpmGood: 3,
    cpmWarn: 6,
    tierLabel: 'Southeast Asia',
    source: 'Lebesgue ecommerce CPM by country, Jul 2026 (Philippines $1.80)',
  },
};

function cpmTierFor(region: MarketRegion): keyof typeof CPM_BY_TIER | null {
  switch (region) {
    case 'US':
    case 'UK':
    case 'CA':
    case 'AU':
    case 'EU':
      return 'tier1';
    case 'BD':
    case 'IN':
      return 'southAsia';
    case 'SEA':
      return 'sea';
    default:
      return null;
  }
}

/**
 * CTR/CPC by product category. Source: Revealbot 2025–2026 / WordStream
 * 2026 industry averages (conversion.studio benchmark roundup).
 * "Good" = the published category average; "Warn" = 0.7x avg (CTR) and
 * 1.75x avg (CPC) — the generic table's own ratios.
 *
 * Electronics and Home & Living have no solid published CTR/CPC table in
 * the sources checked, so they deliberately fall back to generic — the
 * report says so. Health & Supplements uses the Fitness & Wellness row,
 * the closest published vertical, and the label says so.
 */
const CTR_CPC_BY_CATEGORY: Partial<
  Record<
    ProductCategory,
    {
      ctrGood: number;
      ctrWarn: number;
      cpcGood: number;
      cpcWarn: number;
      avgCtr: string;
      avgCpc: string;
      vertical: string;
    }
  >
> = {
  beauty: {
    ctrGood: 0.015,
    ctrWarn: 0.011,
    cpcGood: 0.5,
    cpcWarn: 0.85,
    avgCtr: '1.52%',
    avgCpc: '$0.49',
    vertical: 'Beauty & Personal Care',
  },
  fashion: {
    ctrGood: 0.012,
    ctrWarn: 0.009,
    cpcGood: 0.45,
    cpcWarn: 0.8,
    avgCtr: '1.24%',
    avgCpc: '$0.45',
    vertical: 'Apparel & Fashion',
  },
  food: {
    ctrGood: 0.018,
    ctrWarn: 0.012,
    cpcGood: 0.4,
    cpcWarn: 0.7,
    avgCtr: '1.78%',
    avgCpc: '$0.39',
    vertical: 'Food & Beverage',
  },
  health: {
    ctrGood: 0.022,
    ctrWarn: 0.016,
    cpcGood: 0.35,
    cpcWarn: 0.65,
    avgCtr: '2.24%',
    avgCpc: '$0.36',
    vertical: 'Fitness & Wellness (closest published vertical)',
  },
};

const SEGMENT_SOURCE_FOOTER =
  'Published third-party medians — directional, not Meta data.';

/**
 * Pick the benchmark set for a diagnosis. Unknown or skipped values fall
 * back to the generic table; the label/source always say what happened.
 */
export function resolveBenchmarks(
  region: MarketRegion | null | undefined,
  category: ProductCategory | null | undefined,
): BenchmarkSet {
  const r = isMarketRegion(region) ? region : null;
  const c = isProductCategory(category) ? category : null;

  const tier = r ? cpmTierFor(r) : null;
  const cat = c ? CTR_CPC_BY_CATEGORY[c] : undefined;

  const cpmGood = tier ? CPM_BY_TIER[tier].cpmGood : GENERIC.cpmGood;
  const cpmWarn = tier ? CPM_BY_TIER[tier].cpmWarn : GENERIC.cpmWarn;
  const ctrGood = cat ? cat.ctrGood : GENERIC.ctrGood;
  const ctrWarn = cat ? cat.ctrWarn : GENERIC.ctrWarn;
  const cpcGood = cat ? cat.cpcGood : GENERIC.cpcGood;
  const cpcWarn = cat ? cat.cpcWarn : GENERIC.cpcWarn;

  const labelParts: string[] = [];
  if (cat && c) labelParts.push(categoryLabel(c) ?? c);
  if (tier && r) labelParts.push(regionLabel(r) ?? r);
  const segmented = labelParts.length > 0;

  const sourceParts: string[] = [];
  if (cat) {
    sourceParts.push(
      `CTR/CPC vs ${cat.vertical} averages (CTR ${cat.avgCtr}, CPC ${cat.avgCpc}; Revealbot 2025–2026 / WordStream 2026).`,
    );
  }
  if (tier) {
    sourceParts.push(
      `CPM vs ${CPM_BY_TIER[tier].tierLabel} (${CPM_BY_TIER[tier].source}).`,
    );
  }
  if (!segmented) {
    sourceParts.push(
      'Generic D2C starting points — no market or category given, so nothing was sharpened. Add them for a sharper read.',
    );
  }

  return {
    ctrGood,
    ctrWarn,
    cpcGood,
    cpcWarn,
    cpmGood,
    cpmWarn,
    label: segmented ? labelParts.join(' · ') : 'Generic D2C benchmarks',
    source: `${sourceParts.join(' ')} ${SEGMENT_SOURCE_FOOTER}`,
    segmented,
  };
}
