'use client';

import { useState } from 'react';
import { PrimaryButton, GhostButton } from '@/components/ui';

async function postAndRedirect(url: string, setLoading: (b: boolean) => void, setError: (s: string | null) => void) {
  setLoading(true);
  setError(null);
  try {
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.url) {
      throw new Error(data.error ?? 'Something went wrong.');
    }
    window.location.href = data.url as string;
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Something went wrong.');
    setLoading(false);
  }
}

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <PrimaryButton onClick={() => postAndRedirect('/api/stripe/checkout', setLoading, setError)} disabled={loading}>
        {loading ? 'Redirecting to Stripe…' : 'Upgrade to Pro — $29/mo'}
      </PrimaryButton>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      <p className="mt-2 text-xs text-zinc-500">Test mode — use card 4242 4242 4242 4242.</p>
    </div>
  );
}

export function PortalButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <GhostButton onClick={() => postAndRedirect('/api/stripe/portal', setLoading, setError)} disabled={loading}>
        {loading ? 'Opening…' : 'Manage billing'}
      </GhostButton>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
