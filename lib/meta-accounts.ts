/**
 * Server-only helpers for the Meta API routes.
 *
 * Keeps the Supabase session + connected-account lookup in one place so
 * every /api/meta/* route enforces the same rules:
 * - the caller must be logged in (guests cannot connect or read ad data),
 * - a user only ever touches their OWN connected_accounts rows (RLS + an
 *   explicit user_id filter on every query),
 * - tokens are decrypted in memory, used for one Meta call, and never
 *   returned to the browser.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MetaApiError, decryptToken, metaConfigError } from '@/lib/meta';

export interface ConnectedAccount {
  id: string;
  user_id: string;
  provider: string;
  meta_user_id: string | null;
  meta_user_name: string | null;
  ad_account_id: string;
  ad_account_name: string | null;
  account_status: string | null;
  account_currency: string | null;
  encrypted_token: string;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Public shape returned to the browser — never includes the token. */
export function publicAccount(row: ConnectedAccount) {
  return {
    id: row.id,
    adAccountId: row.ad_account_id,
    name: row.ad_account_name ?? row.ad_account_id,
    status: row.account_status,
    currency: row.account_currency,
    metaUserName: row.meta_user_name,
    tokenExpiresAt: row.token_expires_at,
    connectedAt: row.created_at,
  };
}

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** All connected accounts for this user (no tokens). */
export async function listConnectedAccounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ConnectedAccount[]> {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw new MetaApiError('Could not load your connected accounts.', 'api');
  return (data ?? []) as ConnectedAccount[];
}

/** Load one of the user's accounts + its decrypted token. Null if not theirs. */
export async function loadAccountToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  accountId: string,
): Promise<{ row: ConnectedAccount; token: string } | null> {
  const { data, error } = await supabase
    .from('connected_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('ad_account_id', accountId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as ConnectedAccount;
  let token: string;
  try {
    token = decryptToken(row.encrypted_token);
  } catch {
    throw new MetaApiError(
      'Your saved Meta token could not be read — please disconnect and reconnect your account.',
      'token',
    );
  }
  return { row, token };
}

/**
 * Only allow same-origin paths (e.g. /dashboard, /diagnose). Anything else
 * falls back to /dashboard — this stops open-redirect tricks via ?next=.
 */
export function sanitizeNext(raw: string | null | undefined): string {
  if (!raw) return '/dashboard';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) {
    return '/dashboard';
  }
  return raw;
}

/** Map a thrown error to a JSON response the UI can show. */
export function metaErrorResponse(e: unknown): NextResponse {
  if (e instanceof MetaApiError) {
    const status =
      e.kind === 'token'
        ? 401
        : e.kind === 'permission'
          ? 403
          : e.kind === 'rate_limit'
            ? 429
            : e.kind === 'config'
              ? 503
              : 502;
    return NextResponse.json({ error: e.message, kind: e.kind }, { status });
  }
  return NextResponse.json(
    { error: 'Something went wrong talking to Meta. Try again.', kind: 'api' },
    { status: 502 },
  );
}

/** 503 when the Meta app credentials are not configured on the server. */
export function notConfiguredResponse(): NextResponse | null {
  const err = metaConfigError();
  if (!err) return null;
  return NextResponse.json({ error: err, kind: 'config' }, { status: 503 });
}
