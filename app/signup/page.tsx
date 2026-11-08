'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { POST_CONFIRM_NEXT_COOKIE } from '@/lib/auth-redirect';
import { Card, Field, PrimaryButton, inputClassName } from '@/components/ui';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Where to go after signup (e.g. ?next=/diagnose preserves guest progress
  // stored in localStorage). Only allow same-origin paths.
  const rawNext = searchParams.get('next') || '/dashboard';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      // Where to go after confirming is kept in a short-lived cookie, NOT
      // on the redirect URL: emailRedirectTo must match the Supabase
      // Redirect URL allowlist exactly (no query string), or Supabase
      // silently falls back to the project's Site URL and the code is
      // dropped somewhere no app exists to exchange it.
      document.cookie = `${POST_CONFIRM_NEXT_COOKIE}=${encodeURIComponent(next)}; Max-Age=600; Path=/; SameSite=Lax`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      // If email confirmation is off, a session exists immediately.
      if (data.session) {
        router.push(next);
        router.refresh();
      } else {
        setDone(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Sign-up is not configured yet. Add your Supabase keys to .env.local (see README).',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-16">
      <Card>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Create your account</h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Free 30-day trial · Full access · No credit card required.
        </p>
        {done ? (
          <div className="mt-6 rounded-xl border border-lime-400/40 bg-lime-400/10 px-4 py-4 text-sm leading-relaxed text-lime-200">
            Check your inbox — we sent a confirmation link to <strong>{email}</strong>. Click it
            to activate your account, then sign in. If this email already has an account, no new
            email is sent —{' '}
            <Link href="/login" className="font-medium text-lime-100 underline hover:text-white">
              sign in instead
            </Link>
            .
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClassName} placeholder="you@agency.com" autoComplete="email" />
            </Field>
            <Field label="Password" hint="Minimum 6 characters.">
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClassName} placeholder="••••••••" autoComplete="new-password" />
            </Field>
            {error && (
              <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{error}</p>
            )}
            <PrimaryButton type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating account…' : 'Create free account'}
            </PrimaryButton>
          </form>
        )}
        <p className="mt-5 text-center text-sm text-zinc-400">
          Already have an account?{' '}
          <Link href="/login" className="inline-block py-1.5 font-medium text-lime-300 hover:text-lime-200">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
