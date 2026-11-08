'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteForecast } from '@/lib/actions';

/** Delete button for a saved forecast (dashboard list + detail page). */
export default function DeleteForecastButton({
  id,
  redirectTo,
}: {
  id: string;
  /**
   * Where to go after a successful delete. Detail pages pass
   * "/dashboard?deleted=forecast" so the user lands back on the list
   * instead of a 404 (the detail page 404s once the row is gone).
   * The dashboard passes nothing and keeps router.refresh() — the row
   * just disappears from the list.
   */
  redirectTo?: string;
}) {
  const router = useRouter();
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
    } else if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.refresh();
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
