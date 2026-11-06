import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { buildAuthUrl, metaConfigError } from '@/lib/meta';
import { getSessionUser, sanitizeNext } from '@/lib/meta-accounts';

/**
 * GET /api/meta/auth?next=/diagnose — start the Meta OAuth flow.
 *
 * Logged-in users only (connecting requires a free account, same as saving).
 * Sets a random `state` in an httpOnly cookie (CSRF protection) and
 * redirects to Facebook's login dialog. Meta redirects back to
 * /api/meta/callback with a one-time code.
 *
 * If the Meta app is not configured on the server, the user is sent back
 * with ?meta_error=not_configured so the UI can explain it plainly.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const next = sanitizeNext(searchParams.get('next'));

  const configErr = metaConfigError();
  if (configErr) {
    const url = new URL(next, req.url);
    url.searchParams.set('meta_error', 'not_configured');
    return NextResponse.redirect(url);
  }

  const { user } = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(`/api/meta/auth?next=${encodeURIComponent(next)}`)}`, req.url),
    );
  }

  const state = randomBytes(32).toString('hex');
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === 'production';
  cookieStore.set('meta_oauth_state', state, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes — the code expires fast, so must the state
  });
  cookieStore.set('meta_oauth_next', next, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return NextResponse.redirect(buildAuthUrl(state));
}
