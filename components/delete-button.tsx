'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteDiagnosis } from '@/lib/actions';

export default function DeleteButton({ id, campaignName }: { id: string; campaignName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteDiagnosis(id);
      if (res.error) {
        setError(res.error);
        setConfirming(false);
      } else {
        router.refresh();
      }
    });
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-red-500/60 hover:text-red-300"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-red-300">{error}</span>}
      <span className="text-xs text-zinc-400">Delete “{campaignName}”?</span>
      <button
        onClick={onDelete}
        disabled={pending}
        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-400 disabled:opacity-40"
      >
        {pending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500"
      >
        Cancel
      </button>
    </span>
  );
}
