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
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <Card>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Welcome back</h1>
        <p className="mt-1.5 text-sm text-zinc-400">Sign in to your Signal Assistance account.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Email">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClassName} placeholder="you@agency.com" autoComplete="email" />
          </Field>
          <Field label="Password">
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClassName} placeholder="••••••••" autoComplete="current-password" />
          </Field>
          {error && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{error}</p>
          )}
          <PrimaryButton type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </PrimaryButton>
        </form>
        <p className="mt-5 text-center text-sm text-zinc-400">
          No account yet?{' '}
          <Link href="/signup" className="font-medium text-lime-300 hover:text-lime-200">
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
