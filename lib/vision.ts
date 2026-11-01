/**
 * FUTURE EXTENSION POINT — AI screenshot reading (NOT implemented in v1).
 *
 * The plan: a Route Handler at `app/api/vision/extract/route.ts` will accept
 * an uploaded screenshot, call a vision model (e.g. OpenAI GPT-4o, Anthropic
 * Claude, Google Gemini), and return the extracted Ads Manager metrics in the
 * `ExtractedMetrics` shape below. The wizard's screenshot step would then offer
 * an "Analyze screenshot" button that POSTs to that route and pre-fills the
 * metrics form — with every value clearly labeled as AI-extracted and editable
 * by the user before diagnosis.
 *
 * Nothing in v1 calls this. The stub below exists so the contract is defined
 * up front; it throws if invoked.
 */

export interface ExtractedMetrics {
  adSpend: number | null;
  impressions: number | null;
  reach: number | null;
  linkClicks: number | null;
  addToCarts: number | null;
  checkoutsInitiated: number | null;
  purchases: number | null;
  attributedRevenue: number | null;
  videoViews3s: number | null;
  videoThruplays: number | null;
  /** 0..1 confidence per field, so the UI can flag uncertain values. */
  confidence: Partial<Record<keyof Omit<ExtractedMetrics, 'confidence'>, number>>;
  rawModelNotes?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function extractMetricsFromScreenshot(_image: Blob): Promise<ExtractedMetrics> {
  throw new Error(
    'Vision extraction is not implemented in v1. ' +
      'Implement app/api/vision/extract/route.ts with a vision-model provider, ' +
      'then wire it to the wizard screenshot step. See lib/vision.ts for the contract.',
  );
}
