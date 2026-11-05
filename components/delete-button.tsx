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
        className="inline-flex min-h-11 items-center rounded-lg border border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-400 transition hover:border-red-500/60 hover:text-red-300"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {error && <span className="text-xs text-red-300">{error}</span>}
      <span className="break-words text-xs text-zinc-400">Delete “{campaignName}”?</span>
      <button
        onClick={onDelete}
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-lg bg-red-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-40"
      >
        {pending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-lg border border-zinc-700 px-3.5 py-2 text-sm text-zinc-300 transition hover:border-zinc-500"
      >
        Cancel
      </button>
    </span>
  );
}
