'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, Field, PrimaryButton, inputClassName } from '@/components/ui';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';
  // One line explaining why sign-in is needed, when the user arrived here
  // from a page that needs an account (e.g. Compare or the dashboard).
  const nextNote =
    next.startsWith('/compare')
      ? 'Sign in to see your saved diagnoses and compare them.'
      : next.startsWith('/dashboard')
        ? 'Sign in to see your saved diagnoses.'
        : next.startsWith('/diagnose') || next.startsWith('/forecast')
          ? 'Sign in to save this and find it on your dashboard later.'
          : null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Sign-in is not configured yet. Add your Supabase keys to .env.local (see README).',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-16">
      <Card>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Welcome back</h1>
        <p className="mt-1.5 text-sm text-zinc-400">Sign in to your AdSignal Pro account.</p>
        {nextNote && (
          <p className="mt-3 rounded-xl border border-sky-400/30 bg-sky-400/5 px-3.5 py-2.5 text-sm text-sky-200">{nextNote}</p>
        )}
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Email">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClassName} placeholder="you@agency.com" autoComplete="email" />
          </Field>
          <Field label="Password">
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClassName} placeholder="••••••••" autoComplete="current-password" />
          </Field>
          <p className="text-right text-sm">
            <Link href="/forgot-password" className="inline-block py-1 font-medium text-violet-300 hover:text-violet-200">
              Forgot password?
            </Link>
          </p>
          {error && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{error}</p>
          )}
          <PrimaryButton type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </PrimaryButton>
        </form>
        <p className="mt-5 text-center text-sm text-zinc-400">
          No account yet?{' '}
          <Link href="/signup" className="inline-block py-1.5 font-medium text-violet-300 hover:text-violet-200">
            Create one free
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
