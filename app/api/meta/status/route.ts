import { NextResponse } from 'next/server';
import { isMetaConfigured } from '@/lib/meta';
import { getSessionUser, listConnectedAccounts, publicAccount } from '@/lib/meta-accounts';

/**
 * GET /api/meta/status — is the Meta connection set up, and is this user
 * connected? Guests get { configured, connected: false } — never a throw.
 * The wizard and dashboard poll this to decide what to show.
 */
export async function GET() {
  const configured = isMetaConfigured();
  const { supabase, user } = await getSessionUser();
  if (!user) {
    return NextResponse.json({ configured, connected: false, accounts: [] });
  }
  try {
    const rows = await listConnectedAccounts(supabase, user.id);
    return NextResponse.json({
      configured,
      connected: rows.length > 0,
      accounts: rows.map(publicAccount),
    });
  } catch {
    return NextResponse.json({ configured, connected: false, accounts: [] });
  }
}
