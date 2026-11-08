'use client';

import { useState } from 'react';
import { deleteForecast } from '@/lib/actions';

/** Delete button for a saved forecast (dashboard list + detail page). */
export default function DeleteForecastButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm('Delete this forecast? This cannot be undone.')) return;
    setBusy(true);
    setErr(null);
    const res = await deleteForecast(id);
    if (res.error) {
      setErr(res.error);
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
      >
        {busy ? 'Deleting…' : 'Delete'}
      </button>
      {err && <span className="text-xs text-red-300">{err}</span>}
    </span>
  );
}
