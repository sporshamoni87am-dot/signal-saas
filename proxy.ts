import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

const PROTECTED_PREFIXES = ['/dashboard', '/diagnoses', '/forecasts', '/billing'];
// '/diagnose' and '/forecast' are intentionally public: guests can run a full
// diagnosis or forecast without an account. Saving stays account-gated
// inside the wizard UI. ('/forecasts' — the saved-forecast list/detail —
// is protected; prefix matching keeps '/forecast' itself public.)
const AUTH_PAGES = ['/login', '/signup'];

/**
 * Next.js 16 "proxy" (formerly middleware). Refreshes the Supabase session,
 * then guards protected routes: logged-out visitors go to /login, and
 * logged-in users hitting /login or /signup go to /dashboard.
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
