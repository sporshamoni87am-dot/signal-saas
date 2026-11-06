/**
 * Meta Ads Signal Assistance — Meta Marketing API client (server-only).
 *
 * READ-ONLY by design: this module only ever READS ad-account data
 * (accounts, campaigns, insights). It never creates, edits, pauses, or
 * changes anything in the ad account — no write calls exist here.
 *
 * Verified against Meta's own developer docs (Nov 2026):
 * - Version pin: Graph API / Marketing API v26.0 (released 29 Jul 2026;
 *   Meta's versioning page still lists v26.0 as current; v27.0 shipped
 *   4 Nov 2026 — bump META_API_VERSION below when adopting it).
 * - OAuth: manual server-side flow. Dialog at
 *   https://www.facebook.com/v{version}/dialog/oauth with scope `ads_read`
 *   → code (single-use, ~10 min) → short-lived token (~1–2 h) →
 *   fb_exchange_token → long-lived token (~60 days, 5184000 s).
 * - Permissions: `ads_read` is the ONLY scope requested. It covers
 *   /me/adaccounts and the Ads Insights API. `business_management` is NOT
 *   needed for read-only account listing / insights, so it is not asked for.
 * - Insights: GET /{object}/insights with `level`, `time_range`,
 *   `use_account_attribution_setting=true` (matches what the user sees in
 *   Ads Manager). Attribution windows 7d_view / 28d_view were removed
 *   12 Jan 2026 — do not request them.
 * - Budgets come back in minor currency units (cents for USD/GBP/EUR).
 * - Rate limits are tiered per app / ad account / user; error 80004 means
 *   throttled. Token problems surface as error 190.
 *
 * Tokens are encrypted at rest (AES-256-GCM, server env key) and decrypted
 * ONLY inside route handlers. Nothing in this file may be imported by
 * client components — it imports node:crypto on purpose.
 */

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

/** Pinned Graph/Marketing API version. One constant to bump on upgrade. */
export const META_API_VERSION = 'v26.0';
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
export const META_OAUTH_DIALOG = `https://www.facebook.com/${META_API_VERSION}/dialog/oauth`;

/** Minimal scopes: read-only ad data. Never request write permissions. */
export const META_SCOPES = ['ads_read'] as const;

/** Long-lived user token lifetime, seconds (~60 days). */
export const META_LONG_LIVED_TTL_SECONDS = 5184000;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** True when the Meta app credentials + token encryption key are present. */
export function isMetaConfigured(): boolean {
  return Boolean(
    process.env.META_APP_ID &&
      process.env.META_APP_SECRET &&
      process.env.META_TOKEN_ENCRYPTION_KEY,
  );
}

/** Human-readable reason the Meta connection is unavailable, or null. */
export function metaConfigError(): string | null {
  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
    return 'Meta connection is not set up yet — the app ID and secret are missing. The site owner needs to add META_APP_ID and META_APP_SECRET.';
  }
  if (!process.env.META_TOKEN_ENCRYPTION_KEY) {
    return 'Meta connection is not set up yet — the token encryption key is missing (META_TOKEN_ENCRYPTION_KEY).';
  }
  return null;
}

/**
 * OAuth redirect URI. Derived from NEXT_PUBLIC_APP_URL so no separate env
 * var is needed — but this EXACT URI must be registered in the Meta app
 * dashboard under Facebook Login → Valid OAuth Redirect URIs.
 */
export function getMetaRedirectUri(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/api/meta/callback`;
}

/** Build the Facebook Login dialog URL the user is sent to. */
export function buildAuthUrl(state: string): string {
  const url = new URL(META_OAUTH_DIALOG);
  url.searchParams.set('client_id', process.env.META_APP_ID!);
  url.searchParams.set('redirect_uri', getMetaRedirectUri());
  url.searchParams.set('scope', META_SCOPES.join(','));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  return url.toString();
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class MetaApiError extends Error {
  /** Meta's numeric error code (190 = bad token, 80004 = rate limited…). */
  metaCode: number | null;
  /** Short machine-readable kind for the UI to branch on. */
  kind: 'token' | 'permission' | 'rate_limit' | 'config' | 'api';
  constructor(message: string, kind: MetaApiError['kind'], metaCode: number | null = null) {
    super(message);
    this.name = 'MetaApiError';
    this.kind = kind;
    this.metaCode = metaCode;
  }
}

/** Map a raw Meta error payload to a friendly, safe-to-show message. */
function toMetaError(json: unknown): MetaApiError {
  const err = (json as { error?: { message?: string; code?: number; error_subcode?: number } })?.error;
  const code = typeof err?.code === 'number' ? err.code : null;
  const msg = typeof err?.message === 'string' ? err.message : 'Meta returned an unknown error.';
  if (code === 190) {
    return new MetaApiError(
      'Your Meta connection expired or was revoked. Reconnect your Meta account.',
      'token',
      code,
    );
  }
  if (code === 80004 || code === 80000) {
    return new MetaApiError(
      'Meta is rate-limiting requests right now. Wait a few minutes and try again.',
      'rate_limit',
      code,
    );
  }
  if (code === 10 || code === 100 || code === 200 || code === 294) {
    return new MetaApiError(
      'Meta refused this request — the app may be missing a permission. ' + msg,
      'permission',
      code,
    );
  }
  return new MetaApiError('Meta error: ' + msg, 'api', code);
}

// ---------------------------------------------------------------------------
// Token encryption (at rest) — AES-256-GCM, server env key only
// ---------------------------------------------------------------------------

function getEncryptionKey(): Buffer {
  const hex = process.env.META_TOKEN_ENCRYPTION_KEY ?? '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new MetaApiError(
      'META_TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate one with: openssl rand -hex 32',
      'config',
    );
  }
  return Buffer.from(hex, 'hex');
}

/** Format: v1.<iv-hex>.<ciphertext-hex>.<auth-tag-hex> */
export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('hex')}.${ciphertext.toString('hex')}.${tag.toString('hex')}`;
}

export function decryptToken(packed: string): string {
  const parts = packed.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new MetaApiError('Stored Meta token has an unknown format — reconnect your account.', 'token');
  }
  const [, ivHex, ctHex, tagHex] = parts;
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ctHex, 'hex')),
    decipher.final(),
  ]);
  return plain.toString('utf8');
}

// ---------------------------------------------------------------------------
// Graph API plumbing
// ---------------------------------------------------------------------------

/** HMAC-SHA256 of the access token, keyed by the app secret. */
function appSecretProof(accessToken: string): string {
  return createHmac('sha256', process.env.META_APP_SECRET!).update(accessToken).digest('hex');
}

interface GraphResponse<T> {
  data?: T;
  error?: { message?: string; code?: number; error_subcode?: number };
  paging?: { next?: string };
}

/** GET against the Graph API with appsecret_proof. Throws MetaApiError. */
async function graphGet<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<GraphResponse<T>> {
  const url = new URL(`${META_GRAPH_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('appsecret_proof', appSecretProof(accessToken));
  let res: Response;
  try {
    res = await fetch(url.toString(), { cache: 'no-store' });
  } catch {
    throw new MetaApiError('Could not reach Meta — check your connection and try again.', 'api');
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new MetaApiError(`Meta returned an unreadable response (HTTP ${res.status}).`, 'api');
  }
  if (!res.ok || (json as GraphResponse<T>).error) {
    throw toMetaError(json);
  }
  return json as GraphResponse<T>;
}

/** Follow `paging.next` until exhausted (cap 500 rows — safety valve). */
async function graphGetAll<T>(path: string, accessToken: string, params: Record<string, string> = {}): Promise<T[]> {
  const first = await graphGet<T[]>(path, accessToken, params);
  const rows: T[] = Array.isArray(first.data) ? [...first.data] : [];
  let next = first.paging?.next;
  while (next && rows.length < 500) {
    const url = new URL(next);
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('appsecret_proof', appSecretProof(accessToken));
    const res = await fetch(url.toString(), { cache: 'no-store' });
    const json = (await res.json()) as GraphResponse<T[]>;
    if (!res.ok || json.error) throw toMetaError(json);
    if (Array.isArray(json.data)) rows.push(...json.data);
    next = json.paging?.next;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// OAuth: code → short-lived token → long-lived token → validation
// ---------------------------------------------------------------------------

export interface MetaToken {
  accessToken: string;
  /** Seconds until expiry (from Meta). */
  expiresIn: number;
}

async function exchangeToken(params: Record<string, string>): Promise<MetaToken> {
  const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetch(url.toString(), { cache: 'no-store' });
  } catch {
    throw new MetaApiError('Could not reach Meta — check your connection and try again.', 'api');
  }
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string; code?: number };
  };
  if (!res.ok || json.error || !json.access_token) {
    throw toMetaError(json);
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in ?? 0 };
}

/** Step 1: exchange the one-time authorization code for a short-lived token. */
export async function exchangeCodeForToken(code: string): Promise<MetaToken> {
  return exchangeToken({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: getMetaRedirectUri(),
    code,
  });
}

/** Step 2: exchange a short-lived (or aging long-lived) token for a fresh 60-day token. */
export async function exchangeForLongLived(token: string): Promise<MetaToken> {
  return exchangeToken({
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: token,
  });
}

export interface TokenDebug {
  isValid: boolean;
  userId: string | null;
  appId: string | null;
  scopes: string[];
  /** Unix timestamp when the token expires, or null. */
  expiresAt: number | null;
}

/** Step 3: validate the token and confirm it carries the scopes we need. */
export async function debugToken(token: string): Promise<TokenDebug> {
  const json = await graphGet<{
    is_valid?: boolean;
    user_id?: string;
    app_id?: string;
    scopes?: string[];
    expires_at?: number;
  }>('/debug_token', `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`, {
    input_token: token,
  });
  const d = json.data ?? {};
  return {
    isValid: d.is_valid === true,
    userId: typeof d.user_id === 'string' ? d.user_id : null,
    appId: typeof d.app_id === 'string' ? d.app_id : null,
    scopes: Array.isArray(d.scopes) ? d.scopes : [],
    expiresAt: typeof d.expires_at === 'number' ? d.expires_at : null,
  };
}

// ---------------------------------------------------------------------------
// Ad accounts & campaigns (read-only)
// ---------------------------------------------------------------------------

export interface MetaAdAccount {
  id: string; // e.g. "act_1234567890"
  accountId: string; // numeric part without "act_"
  name: string;
  status: string | null;
  currency: string | null;
  timezoneName: string | null;
}

export async function listAdAccounts(token: string): Promise<MetaAdAccount[]> {
  const rows = await graphGetAll<{
    id?: string;
    account_id?: string;
    name?: string;
    account_status?: number;
    currency?: string;
    timezone_name?: string;
  }>('/me/adaccounts', token, {
    fields: 'id,account_id,name,account_status,currency,timezone_name',
    limit: '100',
  });
  return rows
    .filter((r) => typeof r.account_id === 'string' && typeof r.name === 'string')
    .map((r) => ({
      id: `act_${r.account_id}`,
      accountId: r.account_id as string,
      name: r.name as string,
      status: typeof r.account_status === 'number' ? String(r.account_status) : null,
      currency: r.currency ?? null,
      timezoneName: r.timezone_name ?? null,
    }));
}

export interface MetaUser {
  id: string;
  name: string | null;
}

export async function getMetaUser(token: string): Promise<MetaUser> {
  const json = await graphGet<{ id?: string; name?: string }>('/me', token, {
    fields: 'id,name',
  });
  const d = json.data ?? {};
  return { id: d.id ?? '', name: d.name ?? null };
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string | null;
  /** Daily budget in major currency units (e.g. dollars), or null. */
  dailyBudget: number | null;
}

export async function listCampaigns(
  token: string,
  accountId: string,
  currency: string | null,
): Promise<MetaCampaign[]> {
  const rows = await graphGetAll<{
    id?: string;
    name?: string;
    status?: string;
    objective?: string;
    daily_budget?: string;
  }>(`/act_${accountId}/campaigns`, token, {
    fields: 'id,name,status,objective,daily_budget',
    limit: '100',
  });
  return rows
    .filter((r) => typeof r.id === 'string' && typeof r.name === 'string')
    .map((r) => ({
      id: r.id as string,
      name: r.name as string,
      status: r.status ?? 'UNKNOWN',
      objective: r.objective ?? null,
      dailyBudget:
        typeof r.daily_budget === 'string' && r.daily_budget !== '0'
          ? fromMinorUnits(Number(r.daily_budget), currency)
          : null,
    }));
}

// ---------------------------------------------------------------------------
// Insights (read-only)
// ---------------------------------------------------------------------------

export type InsightsLevel = 'campaign' | 'adset' | 'ad';

export interface InsightsParams {
  accountId: string;
  /** Object to fetch insights for (campaign / ad set / ad id, or the account). */
  objectId: string;
  level: InsightsLevel;
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
}

/** One aggregated insights row (no time_increment → one row per object). */
export interface InsightRow {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  inline_link_clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  frequency?: string;
  actions?: { action_type?: string; value?: string }[];
  action_values?: { action_type?: string; value?: string }[];
  video_3s_views?: string;
  video_thruplay_watched_actions?: { action_type?: string; value?: string }[];
  video_p25_watched_actions?: { action_type?: string; value?: string }[];
  video_avg_time_watched_actions?: { action_type?: string; value?: string }[];
  purchase_roas?: { action_type?: string; value?: string }[];
  date_start?: string;
  date_stop?: string;
}

const CORE_FIELDS = [
  'campaign_name',
  'adset_name',
  'ad_name',
  'spend',
  'impressions',
  'reach',
  'clicks',
  'inline_link_clicks',
  'actions',
  'action_values',
  'ctr',
  'cpc',
  'cpm',
  'frequency',
  'purchase_roas',
].join(',');

/**
 * Video fields live in a separate call on purpose: if Meta ever drops or
 * renames a video field, the core metrics still come back and the video
 * section degrades to "no video data" instead of failing the whole fetch.
 */
const VIDEO_FIELDS = [
  'video_3s_views',
  'video_thruplay_watched_actions',
  'video_p25_watched_actions',
  'video_avg_time_watched_actions',
].join(',');

async function fetchInsightsRows(
  token: string,
  params: InsightsParams,
  fields: string,
): Promise<InsightRow[]> {
  const path =
    params.objectId === `act_${params.accountId}`
      ? `/act_${params.accountId}/insights`
      : `/${params.objectId}/insights`;
  return graphGetAll<InsightRow>(path, token, {
    fields,
    level: params.level,
    time_range: JSON.stringify({ since: params.since, until: params.until }),
    use_account_attribution_setting: 'true',
    limit: '100',
  });
}

export interface InsightsResult {
  rows: InsightRow[];
  /** True when the video-metrics call failed — core metrics unaffected. */
  videoUnavailable: boolean;
}

export async function fetchInsights(token: string, params: InsightsParams): Promise<InsightsResult> {
  const rows = await fetchInsightsRows(token, params, CORE_FIELDS);
  let videoUnavailable = false;
  try {
    const videoRows = await fetchInsightsRows(token, params, VIDEO_FIELDS);
    // Merge video fields onto the matching core row (same object id).
    const keyOf = (r: InsightRow) =>
      r.ad_id ?? r.adset_id ?? r.campaign_id ?? '';
    const byKey = new Map(videoRows.map((r) => [keyOf(r), r]));
    for (const row of rows) {
      const v = byKey.get(keyOf(row));
      if (v) {
        row.video_3s_views = v.video_3s_views;
        row.video_thruplay_watched_actions = v.video_thruplay_watched_actions;
        row.video_p25_watched_actions = v.video_p25_watched_actions;
        row.video_avg_time_watched_actions = v.video_avg_time_watched_actions;
      }
    }
  } catch {
    videoUnavailable = true; // core data stands; video just shows as missing
  }
  return { rows, videoUnavailable };
}

/** Fetch an object's budget (campaign / ad set). Returns daily budget in major units. */
export async function fetchObjectBudget(
  token: string,
  objectId: string,
  currency: string | null,
): Promise<number | null> {
  try {
    const json = await graphGet<{ daily_budget?: string; lifetime_budget?: string }>(
      `/${objectId}`,
      token,
      { fields: 'daily_budget,lifetime_budget' },
    );
    const d = json.data ?? {};
    if (typeof d.daily_budget === 'string' && d.daily_budget !== '0') {
      return fromMinorUnits(Number(d.daily_budget), currency);
    }
    return null;
  } catch {
    return null; // budget is a nice-to-have — never fail the fetch over it
  }
}

// ---------------------------------------------------------------------------
// Mapper: Meta insights → engine inputs
// ---------------------------------------------------------------------------

export interface LiveSource {
  provider: 'meta';
  accountId: string;
  accountName: string | null;
  objectId: string;
  objectName: string | null;
  level: InsightsLevel;
  since: string;
  until: string;
  currency: string | null;
}

export interface MappedLiveData {
  /** Only the fields Meta actually provides (business fields stay blank). */
  inputs: {
    campaignName: string;
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
    frequency: number | null;
    daysRunning: number | null;
    dailyBudget: number | null;
  };
  /** Human-readable caveats — shown in the wizard, never hidden. */
  flags: string[];
  source: LiveSource;
}

function num(v: string | undefined): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sumAction(
  rows: InsightRow[],
  field: 'actions' | 'action_values',
  types: string[],
): number | null {
  let total = 0;
  let found = false;
  for (const row of rows) {
    const list = row[field];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (item && types.includes(item.action_type ?? '')) {
        const v = Number(item.value ?? 0);
        if (Number.isFinite(v)) {
          total += v;
          found = true;
        }
      }
    }
  }
  return found ? total : null;
}

function sumField(rows: InsightRow[], field: keyof InsightRow): number | null {
  let total = 0;
  let found = false;
  for (const row of rows) {
    const v = num(row[field] as string | undefined);
    if (v !== null) {
      total += v;
      found = true;
    }
  }
  return found ? total : null;
}

function sumActionField(
  rows: InsightRow[],
  field: 'video_thruplay_watched_actions' | 'video_p25_watched_actions',
): number | null {
  let total = 0;
  let found = false;
  for (const row of rows) {
    const list = row[field];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const v = Number(item?.value ?? 0);
      if (Number.isFinite(v)) {
        total += v;
        found = true;
      }
    }
  }
  return found ? total : null;
}

function daysBetween(since: string, until: string): number {
  const a = new Date(`${since}T00:00:00Z`).getTime();
  const b = new Date(`${until}T00:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Map aggregated Meta insights rows onto the diagnosis engine's inputs.
 * Missing data stays null and is flagged — numbers are NEVER invented.
 */
export function mapInsightsToInputs(
  rows: InsightRow[],
  source: LiveSource,
  dailyBudget: number | null,
  videoUnavailable: boolean,
): MappedLiveData {
  const flags: string[] = [];
  const first = rows[0];
  const objectName =
    source.level === 'ad'
      ? first?.ad_name ?? null
      : source.level === 'adset'
        ? first?.adset_name ?? null
        : first?.campaign_name ?? null;

  const purchases = sumAction(rows, 'actions', ['purchase', 'offsite_conversion.fb_pixel_purchase']);
  const attributedRevenue = sumAction(rows, 'action_values', [
    'purchase',
    'offsite_conversion.fb_pixel_purchase',
  ]);

  const videoViews3s = sumField(rows, 'video_3s_views');
  const videoThruplays = sumActionField(rows, 'video_thruplay_watched_actions');

  if (purchases === null && attributedRevenue === null) {
    flags.push('No purchase data in this date range — ROAS, CPA and the verdict will be limited until Meta reports purchases for this campaign.');
  }
  if (videoUnavailable || videoViews3s === null) {
    flags.push('No video metrics for this range — hook/hold rates need 3-sec views and thruplays.');
  }
  if (rows.length === 0) {
    flags.push('Meta returned no data for this selection and date range — try a wider range or a different campaign.');
  }

  const spend = sumField(rows, 'spend');
  const impressions = sumField(rows, 'impressions');
  const reach = sumField(rows, 'reach');
  const frequencyRaw = rows.length === 1 ? num(first?.frequency) : null;
  const frequency =
    frequencyRaw ?? (impressions !== null && reach !== null && reach > 0 ? impressions / reach : null);

  return {
    inputs: {
      campaignName: objectName ?? 'Meta campaign',
      adSpend: spend,
      impressions,
      reach,
      linkClicks:
        sumField(rows, 'inline_link_clicks') ?? sumField(rows, 'clicks'),
      addToCarts: sumAction(rows, 'actions', ['add_to_cart', 'offsite_conversion.fb_pixel_add_to_cart']),
      checkoutsInitiated: sumAction(rows, 'actions', [
        'initiate_checkout',
        'offsite_conversion.fb_pixel_initiate_checkout',
      ]),
      purchases,
      attributedRevenue,
      videoViews3s,
      videoThruplays,
      frequency,
      daysRunning: daysBetween(source.since, source.until),
      dailyBudget,
    },
    flags,
    source: { ...source, objectName },
  };
}

// ---------------------------------------------------------------------------
// Currency helpers — Meta returns budgets in minor units (cents)
// ---------------------------------------------------------------------------

/** Zero-decimal currencies: Meta's budget is already in whole units. */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'JPY',
  'KRW',
  'VND',
  'CLP',
  'ISK',
  'UGX',
  'XAF',
  'XOF',
  'XPF',
]);

/** Convert a Meta budget (minor units) to major units (dollars, pounds…). */
export function fromMinorUnits(minor: number, currency: string | null): number {
  if (!Number.isFinite(minor)) return 0;
  if (currency && ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())) return minor;
  return minor / 100;
}
