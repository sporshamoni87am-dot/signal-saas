import { NextResponse } from 'next/server';
import { listCampaigns } from '@/lib/meta';
import {
  getSessionUser,
  loadAccountToken,
  metaErrorResponse,
  notConfiguredResponse,
} from '@/lib/meta-accounts';

/**
 * GET /api/meta/campaigns?account_id=<numeric id>
 * Lists the campaigns in one of the user's connected ad accounts
 * (read-only). Used by the wizard's campaign picker.
 */
export async function GET(req: Request) {
  const notConfigured = notConfiguredResponse();
  if (notConfigured) return notConfigured;

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('account_id');
  if (!accountId || !/^\d+$/.test(accountId)) {
    return NextResponse.json({ error: 'Missing or invalid account_id.', kind: 'api' }, { status: 400 });
  }

  const { supabase, user } = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to list campaigns.', kind: 'auth' }, { status: 401 });
  }

  try {
    const loaded = await loadAccountToken(supabase, user.id, accountId);
    if (!loaded) {
      return NextResponse.json(
        { error: 'That ad account is not connected to your account.', kind: 'auth' },
        { status: 404 },
      );
    }
    const campaigns = await listCampaigns(loaded.token, accountId, loaded.row.account_currency);
    return NextResponse.json({ campaigns });
  } catch (e) {
    return metaErrorResponse(e);
  }
}
