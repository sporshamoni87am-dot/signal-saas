/**
 * Plain-language metric glossary — the product's whole thesis is that buyers
 * shouldn't need to already know this stuff. Each entry: what it is (one
 * line), why it matters (one line), what "good" looks like for D2C on Meta.
 * Benchmarks are starting points, not verified platform data.
 */

export interface GlossaryEntry {
  term: string;
  what: string;
  why: string;
  goodLooksLike: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: 'ROAS',
    what: 'Return on ad spend — revenue Meta attributes to your ads, divided by what you spent on them.',
    why: 'It tells you whether the ad platform thinks your spend is paying for itself.',
    goodLooksLike: 'At or above your breakeven ROAS. Below it, you lose money on every sale.',
  },
  {
    term: 'Breakeven ROAS',
    what: 'The ROAS at which you make exactly $0 profit per order — usually 1 ÷ your gross margin.',
    why: 'Every verdict is graded against this. Without it, ROAS is just a vanity number.',
    goodLooksLike: 'Know yours cold. A 2.0× ROAS is a win at 60% margin and a loss at 30%.',
  },
  {
    term: 'MER',
    what: 'Marketing efficiency ratio — your TOTAL business revenue (all channels) divided by total ad spend.',
    why: 'ROAS only sees what Meta claims. MER sees whether the business is actually growing.',
    goodLooksLike: 'Comfortably above your blended target (often 3–5× for D2C). Rising over time.',
  },
  {
    term: 'POAS',
    what: 'Profit on ad spend — gross profit from attributed revenue, divided by ad spend.',
    why: 'ROAS ignores margins. POAS tells you if the ads make money after product and shipping costs.',
    goodLooksLike: 'Above 1.0× means profitable. The higher your margin, the more room you have.',
  },
  {
    term: 'CPA (cost per purchase)',
    what: 'Ad spend divided by number of purchases.',
    why: 'The number your budget lives or dies by. Compare it to your target CPA (AOV ÷ breakeven ROAS).',
    goodLooksLike: 'At or below target CPA. Above it, you need cheaper traffic or better conversion.',
  },
  {
    term: 'Link CTR',
    what: 'The % of impressions that turned into a click to your site.',
    why: 'Your purest creative signal: it measures whether the ad stopped the scroll.',
    goodLooksLike: 'Above ~1.0% is healthy for D2C. Below ~0.7% is a creative problem, not a budget one.',
  },
  {
    term: 'CPC',
    what: 'Cost per link click — what you pay each time someone visits.',
    why: 'High CPC with good CTR means expensive auctions (competition/audience), not bad creative.',
    goodLooksLike: 'Varies by market — judge it against your own account history, not a global number.',
  },
  {
    term: 'CPM',
    what: 'Cost per 1,000 impressions — the price of attention in your auctions.',
    why: 'A sudden CPM spike explains a ROAS drop that has nothing to do with your ads.',
    goodLooksLike: 'Stable week over week. Spikes often mean seasonality, competition, or a tired audience.',
  },
  {
    term: 'Frequency',
    what: 'Average number of times each person saw your ad.',
    why: 'High frequency + falling CTR = creative fatigue: the same people are bored of the same ad.',
    goodLooksLike: 'Under ~2.5 for prospecting. Creeping past 4 with soft CTR means refresh creative.',
  },
  {
    term: 'Hook rate',
    what: '3-second video views divided by impressions — who stopped scrolling.',
    why: 'The first 3 seconds decide everything. A weak hook starves the whole funnel.',
    goodLooksLike: 'Above ~30% is strong; below ~20% means the opening needs work.',
  },
  {
    term: 'Hold rate',
    what: 'Thruplays (completions) divided by 3-second views — who stayed watching.',
    why: 'Separates a good hook from a good video: people stopped, but did the story hold them?',
    goodLooksLike: 'Above ~20% is strong; below ~10% means the middle of the video loses people.',
  },
  {
    term: 'Click → ATC rate',
    what: '% of link clicks that added something to cart.',
    why: 'Good CTR but weak ATC = the ad sold a click the landing page couldn’t cash.',
    goodLooksLike: 'Above ~8% is healthy. Below ~4% points at the product page, offer, or price.',
  },
  {
    term: 'Checkout → purchase rate',
    what: '% of started checkouts that became paid orders.',
    why: 'Leaks here are about trust and friction: shipping costs, forms, payment options.',
    goodLooksLike: 'Above ~60% is strong. Below ~35% — audit the checkout experience.',
  },
  {
    term: 'AOV',
    what: 'Average order value — revenue per purchase.',
    why: 'Higher AOV means you can afford a higher CPA, which unlocks more auction room.',
    goodLooksLike: 'Rising via bundles, upsells, and free-shipping thresholds.',
  },
  {
    term: 'Gross margin',
    what: 'The % of each sale you keep after product and shipping costs, before ad spend.',
    why: 'It sets your breakeven ROAS and powers POAS — the two numbers that decide if ads are truly profitable.',
    goodLooksLike: 'Know your real number (not a guess). Higher margin = more room to scale.',
  },
];

export function glossaryFor(term: string): GlossaryEntry | undefined {
  return GLOSSARY.find((g) => g.term.toLowerCase() === term.toLowerCase());
}
