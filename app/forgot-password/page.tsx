'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { POST_CONFIRM_NEXT_COOKIE } from '@/lib/auth-redirect';
import { Card, Field, PrimaryButton, inputClassName } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      // Where to go after the recovery link is clicked is kept in a
      // short-lived cookie, NOT on the redirect URL: redirectTo must
      // match the Supabase Redirect URL allowlist exactly (no query
      // string), or Supabase silently falls back to the project's Site URL
      // and the code is dropped somewhere no app exists to exchange it.
      // /auth/callback exchanges the recovery code, creates the session,
      // then sends the user to the cookie destination (/reset-password).
      document.cookie = `${POST_CONFIRM_NEXT_COOKIE}=${encodeURIComponent('/reset-password')}; Max-Age=600; Path=/; SameSite=Lax`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) {
        setError(error.message);
        return;
      }
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Password reset is not configured yet. Add your Supabase keys to .env.local (see README).',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-16">
      <Card>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Reset your password</h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Enter the email you signed up with and we’ll send you a link to choose a new password.
        </p>
        {done ? (
          <div className="mt-6 rounded-xl border border-lime-400/40 bg-lime-400/10 px-4 py-4 text-sm leading-relaxed text-lime-200">
            Check your inbox — we sent a password-reset link to <strong>{email}</strong>. Click it
            to choose a new password.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClassName} placeholder="you@agency.com" autoComplete="email" />
            </Field>
            {error && (
              <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{error}</p>
            )}
            <PrimaryButton type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending link…' : 'Send reset link'}
            </PrimaryButton>
          </form>
        )}
        <p className="mt-5 text-center text-sm text-zinc-400">
          Remembered it?{' '}
          <Link href="/login" className="inline-block py-1.5 font-medium text-lime-300 hover:text-lime-200">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
