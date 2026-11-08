import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { POST_CONFIRM_NEXT_COOKIE, resolveNextPath } from '@/lib/auth-redirect';

/** Handles the email-confirmation link from Supabase Auth. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Destination: `?next=` on the link first (older emails), then the
  // short-lived cookie the signup page set. Only same-origin paths.
  const cookieStore = await cookies();
  const next = resolveNextPath(
    searchParams.get('next') ?? cookieStore.get(POST_CONFIRM_NEXT_COOKIE)?.value,
  );

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const res = NextResponse.redirect(`${origin}${next}`);
      res.cookies.delete(POST_CONFIRM_NEXT_COOKIE);
      return res;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
