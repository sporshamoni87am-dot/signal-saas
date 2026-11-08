'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { POST_CONFIRM_NEXT_COOKIE, resolveNextPath } from '@/lib/auth-redirect';

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Safety net for confirmation codes that land on the site root instead of
 * /auth/callback (e.g. if Supabase ever falls back to the Site URL again).
 * Mounted in the root layout; renders nothing and does nothing at all
 * unless the URL carries a `?code=` param. When one is present it exchanges
 * the code for a session and sends the user to their post-confirm
 * destination (or /dashboard). A stale or already-used code is ignored —
 * the user simply stays on the page they are on.
 */
export default function AuthCodeHandler() {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) return;
    attemptedRef.current = true;

    (async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return;
      window.location.assign(resolveNextPath(readCookie(POST_CONFIRM_NEXT_COOKIE)));
    })();
  }, []);

  return null;
}
