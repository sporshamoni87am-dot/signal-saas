/**
 * Signup-return restore flag (sessionStorage).
 *
 * The diagnose/forecast pages persist form + results to localStorage so
 * nothing is lost if the user signs up mid-flow. But a fresh visit must
 * start EMPTY — so the pages only restore from localStorage when this flag
 * says the user is coming back from the signup flow. The flag is set by the
 * "Create your free account to save" CTAs before they navigate to /signup,
 * and consumed (removed) on the first mount that reads it.
 *
 * sessionStorage (not localStorage) is deliberate: it lives only in the
 * current tab, so a new tab or a return visit days later starts clean.
 */

const RESTORE_FLAG_KEY = 'adsignalpro:restore';

export type RestoreKind = 'diagnose' | 'forecast';

export function markRestore(kind: RestoreKind): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(RESTORE_FLAG_KEY, kind);
  } catch {}
}

export function clearRestoreFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(RESTORE_FLAG_KEY);
  } catch {}
}

/**
 * True only when the flag matches `kind` — and the flag is removed either
 * way it is read by the matching page, so a later reload never restores
 * again. A flag for the *other* page is left alone (the user may still be
 * heading there).
 */
export function consumeRestore(kind: RestoreKind): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const v = window.sessionStorage.getItem(RESTORE_FLAG_KEY);
    if (v !== kind) return false;
    window.sessionStorage.removeItem(RESTORE_FLAG_KEY);
    return true;
  } catch {
    return false;
  }
}
