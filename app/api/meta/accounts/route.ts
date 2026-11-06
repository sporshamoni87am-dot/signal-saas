import { NextResponse } from 'next/server';
import {
  getSessionUser,
  listConnectedAccounts,
  metaErrorResponse,
  publicAccount,
} from '@/lib/meta-accounts';

/**
 * GET /api/meta/accounts — list this user's connected Meta ad accounts.
 * The token is never included in the response.
 *
 * DELETE /api/meta/accounts?id=<row-id> — disconnect one account
 * (deletes the row, including its encrypted token). The Meta app itself
 * stays authorised on Facebook's side until the user removes it in
 * Facebook Settings — this only cuts the link inside this app.
 */
export async function GET() {
  const { supabase, user } = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to view connected accounts.', kind: 'auth' }, { status: 401 });
  }
  try {
    const rows = await listConnectedAccounts(supabase, user.id);
    return NextResponse.json({ accounts: rows.map(publicAccount) });
  } catch (e) {
    return metaErrorResponse(e);
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const { supabase, user } = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to disconnect an account.', kind: 'auth' }, { status: 401 });
  }
  if (!id) {
    return NextResponse.json({ error: 'Missing account id.', kind: 'api' }, { status: 400 });
  }
  const { error } = await supabase
    .from('connected_accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) {
    return NextResponse.json({ error: 'Could not disconnect that account.', kind: 'api' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
