'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Field, PrimaryButton, inputClassName } from '@/components/ui';

export default function SignupPage() {
  const router = useRouter();
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
        router.push('/dashboard');
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
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <Card>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Create your account</h1>
        <p className="mt-1.5 text-sm text-zinc-400">
          Free 30-day trial · Full access · No credit card required.
        </p>
        {done ? (
          <div className="mt-6 rounded-xl border border-lime-400/40 bg-lime-400/10 px-4 py-4 text-sm leading-relaxed text-lime-200">
            Check your inbox — we sent a confirmation link to <strong>{email}</strong>. Click it
            to activate your account, then sign in.
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
          <Link href="/login" className="font-medium text-lime-300 hover:text-lime-200">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
