/**
 * Shared helpers for the post-signup "where do I go after confirming?"
 * redirect. The destination must NEVER be put on the Supabase redirect URL
 * itself (emailRedirectTo must match the allowlist exactly, with no query
 * string) — it travels in a short-lived cookie instead.
 */

/** Cookie holding the post-confirmation destination (a same-origin path). */
export const POST_CONFIRM_NEXT_COOKIE = 'sa_post_confirm_next';

/** Only same-origin paths are allowed, so a stored value can never bounce
 *  the user to another site. */
export function isSafeNextPath(value: string | null | undefined): value is string {
  return !!value && value.startsWith('/') && !value.startsWith('//');
}

/** Resolve a stored/raw destination to a safe path, defaulting to /dashboard. */
export function resolveNextPath(value: string | null | undefined): string {
  return isSafeNextPath(value) ? value : '/dashboard';
}
