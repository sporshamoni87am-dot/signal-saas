'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, Field, PrimaryButton, inputClassName } from '@/components/ui';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // This page is only reachable with an active session: the recovery link
  // goes through /auth/callback, which exchanges the code for a session
  // and then sends the user here. Without a session (expired or used
  // link, or a direct visit) there is nothing to reset — send them to
  // sign in (or request a fresh reset link from there).
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/login');
        return;
      }
      setChecking(false);
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('The two passwords don’t match.');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-16">
        <Card>
          <p className="text-sm text-zinc-400">Checking your reset link…</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-16">
      <Card>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Choose a new password</h1>
        <p className="mt-1.5 text-sm text-zinc-400">Enter your new password below.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="New password" hint="Minimum 6 characters.">
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClassName} placeholder="••••••••" autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password">
            <input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClassName} placeholder="••••••••" autoComplete="new-password" />
          </Field>
          {error && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{error}</p>
          )}
          <PrimaryButton type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving…' : 'Save new password'}
          </PrimaryButton>
        </form>
      </Card>
    </div>
  );
}
