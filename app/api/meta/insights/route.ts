import { NextResponse } from 'next/server';
import {
  fetchInsights,
  fetchObjectBudget,
  mapInsightsToInputs,
  type InsightsLevel,
  type LiveSource,
} from '@/lib/meta';
import {
  getSessionUser,
  loadAccountToken,
  metaErrorResponse,
  notConfiguredResponse,
} from '@/lib/meta-accounts';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 90;

/**
 * GET /api/meta/insights?account_id=…&object_id=…&level=campaign|adset|ad
 *   &since=YYYY-MM-DD&until=YYYY-MM-DD
 *
 * Fetches live insights from Meta for one campaign / ad set / ad and maps
 * them onto the diagnosis engine's inputs. Server-side only — the Meta
 * token never leaves this route. Missing data stays null and is flagged;
 * nothing is ever invented.
 */
export async function GET(req: Request) {
  const notConfigured = notConfiguredResponse();
  if (notConfigured) return notConfigured;

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('account_id') ?? '';
  const objectId = searchParams.get('object_id') ?? '';
  const level = (searchParams.get('level') ?? 'campaign') as InsightsLevel;
  const since = searchParams.get('since') ?? '';
  const until = searchParams.get('until') ?? '';

  if (!/^\d+$/.test(accountId) || !objectId) {
    return NextResponse.json({ error: 'Missing account_id or object_id.', kind: 'api' }, { status: 400 });
  }
  if (level !== 'campaign' && level !== 'adset' && level !== 'ad') {
    return NextResponse.json({ error: 'level must be campaign, adset, or ad.', kind: 'api' }, { status: 400 });
  }
  if (!DATE_RE.test(since) || !DATE_RE.test(until)) {
    return NextResponse.json(
      { error: 'since and until must be dates like 2026-10-01.', kind: 'api' },
      { status: 400 },
    );
  }
  const sinceMs = new Date(`${since}T00:00:00Z`).getTime();
  const untilMs = new Date(`${until}T00:00:00Z`).getTime();
  if (!Number.isFinite(sinceMs) || !Number.isFinite(untilMs) || untilMs < sinceMs) {
    return NextResponse.json({ error: 'Invalid date range.', kind: 'api' }, { status: 400 });
  }
  const days = Math.round((untilMs - sinceMs) / (1000 * 60 * 60 * 24)) + 1;
  if (days > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `Date range is limited to ${MAX_RANGE_DAYS} days per fetch.`, kind: 'api' },
      { status: 400 },
    );
  }

  const { supabase, user } = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to fetch live data.', kind: 'auth' }, { status: 401 });
  }

  try {
    const loaded = await loadAccountToken(supabase, user.id, accountId);
    if (!loaded) {
      return NextResponse.json(
        { error: 'That ad account is not connected to your account.', kind: 'auth' },
        { status: 404 },
      );
    }

    const { rows, videoUnavailable } = await fetchInsights(loaded.token, {
      accountId,
      objectId,
      level,
      since,
      until,
    });

    // Daily budget lives on the campaign / ad set object, not in insights.
    // For single ads there is no own budget — leave it null.
    const dailyBudget =
      level === 'ad'
        ? null
        : await fetchObjectBudget(loaded.token, objectId, loaded.row.account_currency);

    const source: LiveSource = {
      provider: 'meta',
      accountId,
      accountName: loaded.row.ad_account_name,
      objectId,
      objectName: null, // filled in by the mapper from the insights rows
      level,
      since,
      until,
      currency: loaded.row.account_currency,
    };

    const mapped = mapInsightsToInputs(rows, source, dailyBudget, videoUnavailable);
    return NextResponse.json({
      inputs: mapped.inputs,
      flags: mapped.flags,
      source: mapped.source,
    });
  } catch (e) {
    return metaErrorResponse(e);
  }
}
