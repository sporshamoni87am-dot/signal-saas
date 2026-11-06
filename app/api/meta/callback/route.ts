import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  MetaApiError,
  debugToken,
  encryptToken,
  exchangeCodeForToken,
  exchangeForLongLived,
  getMetaUser,
  listAdAccounts,
} from '@/lib/meta';
import { getSessionUser, sanitizeNext } from '@/lib/meta-accounts';

/**
 * GET /api/meta/callback?code=…&state=… — Meta redirects here after the
 * user approves the connection.
 *
 * Flow: verify state → code → short-lived token → long-lived token (60d)
 * → validate the token (must carry ads_read) → fetch the user's ad
 * accounts → save one encrypted row per account → redirect back.
 *
 * The user must still be logged in here — the Supabase session cookie is
 * how we know whose account to attach the Meta connection to.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const fbError = url.searchParams.get('error');

  const cookieStore = await cookies();
  const savedState = cookieStore.get('meta_oauth_state')?.value;
  const next = sanitizeNext(cookieStore.get('meta_oauth_next')?.value ?? '/dashboard');

  // State + next cookies are single-use.
  cookieStore.delete('meta_oauth_state');
  cookieStore.delete('meta_oauth_next');

  const backWith = (key: string, value: string) => {
    const dest = new URL(next, req.url);
    dest.searchParams.set(key, value);
    return NextResponse.redirect(dest);
  };

  if (fbError) {
    // User pressed "Cancel" on Facebook's dialog (or Meta refused).
    return backWith('meta_error', 'denied');
  }
  if (!code || !state || !savedState || state !== savedState) {
    return backWith('meta_error', 'bad_state');
  }

  const { supabase, user } = await getSessionUser();
  if (!user) {
    // Session expired mid-flow — they can sign in and try again.
    return backWith('meta_error', 'session_expired');
  }

  try {
    // Code (10-min life) → short-lived token (~1–2 h) → long-lived (~60 d).
    const short = await exchangeCodeForToken(code);
    const long = await exchangeForLongLived(short.accessToken);

    // The token must be valid AND carry ads_read, or it is useless to us.
    const debug = await debugToken(long.accessToken);
    if (!debug.isValid) {
      throw new MetaApiError('Meta did not accept the new token.', 'token');
    }
    if (!debug.scopes.includes('ads_read')) {
      throw new MetaApiError(
        'Meta did not grant the ads_read permission — reconnect and approve ad-data access.',
        'permission',
      );
    }

    const me = await getMetaUser(long.accessToken);
    const accounts = await listAdAccounts(long.accessToken);
    if (accounts.length === 0) {
      return backWith('meta_error', 'no_accounts');
    }

    const encrypted = encryptToken(long.accessToken);
    const expiresAt = new Date(Date.now() + long.expiresIn * 1000).toISOString();
    const now = new Date().toISOString();

    // One row per ad account — all share the same encrypted token.
    for (const a of accounts) {
      const { error } = await supabase.from('connected_accounts').upsert(
        {
          user_id: user.id,
          provider: 'meta',
          meta_user_id: me.id || null,
          meta_user_name: me.name,
          ad_account_id: a.accountId,
          ad_account_name: a.name,
          account_status: a.status,
          account_currency: a.currency,
          encrypted_token: encrypted,
          token_expires_at: expiresAt,
          updated_at: now,
        },
        { onConflict: 'user_id,provider,ad_account_id' },
      );
      if (error) {
        throw new MetaApiError('Could not save the Meta connection. Try again.', 'api');
      }
    }

    return backWith('meta', 'connected');
  } catch (e) {
    const kind = e instanceof MetaApiError ? e.kind : 'api';
    return backWith('meta_error', kind);
  }
}
