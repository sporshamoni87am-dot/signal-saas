'use client';

import { useState } from 'react';
import { glossaryFor } from '@/lib/glossary';
import { cn } from '@/lib/cn';

/**
 * Small "ⓘ" button next to a metric label. Expands a plain-language
 * explainer inline: what it is, why it matters, what good looks like.
 * Beginner-proofing is the product's thesis — never assume the user knows.
 */
export default function MetricHelp({ term, className }: { term: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const entry = glossaryFor(term);
  if (!entry) return null;

  return (
    <span className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`What is ${term}?`}
        /* Visual dot stays small, but the ::after hit area makes the tap
           target ~44px, and the popover is a fixed, viewport-wide sheet on
           phones (an absolute w-72 card anchored mid-label would overflow
           a 360px screen). Backdrop closes it on tap outside. */
        className="relative ml-1.5 inline-flex h-5 w-5 translate-y-[1px] items-center justify-center rounded-full border border-zinc-300 text-[11px] font-bold text-zinc-600 transition after:absolute after:-inset-3 after:content-[''] hover:border-red-300 hover:text-red-700"
      >
        i
      </button>
      {open && (
        <>
          <span
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <span className="absolute left-0 top-6 z-50 block w-72 rounded-xl border border-zinc-300 bg-white p-4 text-left shadow-2xl shadow-black/60 max-sm:fixed max-sm:inset-x-4 max-sm:top-1/4 max-sm:w-auto">
            <span className="block text-sm font-semibold text-zinc-900">{entry.term}</span>
            <span className="mt-1.5 block text-[13px] leading-relaxed text-zinc-600">
              <strong className="font-semibold text-zinc-900">What: </strong>
              {entry.what}
            </span>
            <span className="mt-1.5 block text-[13px] leading-relaxed text-zinc-600">
              <strong className="font-semibold text-zinc-900">Why it matters: </strong>
              {entry.why}
            </span>
            <span className="mt-1.5 block text-[13px] leading-relaxed text-red-700/90">
              <strong className="font-semibold">Good looks like: </strong>
              {entry.goodLooksLike}
            </span>
          </span>
        </>
      )}
    </span>
  );
}
