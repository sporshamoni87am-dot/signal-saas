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
        className="ml-1.5 inline-flex h-4 w-4 translate-y-[1px] items-center justify-center rounded-full border border-zinc-600 text-[10px] font-bold text-zinc-400 transition hover:border-lime-400/60 hover:text-lime-300"
      >
        i
      </button>
      {open && (
        <span className="absolute left-0 top-6 z-20 block w-72 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-left shadow-2xl shadow-black/60">
          <span className="block text-sm font-semibold text-zinc-100">{entry.term}</span>
          <span className="mt-1.5 block text-[13px] leading-relaxed text-zinc-300">
            <strong className="font-semibold text-zinc-100">What: </strong>
            {entry.what}
          </span>
          <span className="mt-1.5 block text-[13px] leading-relaxed text-zinc-300">
            <strong className="font-semibold text-zinc-100">Why it matters: </strong>
            {entry.why}
          </span>
          <span className="mt-1.5 block text-[13px] leading-relaxed text-lime-200/90">
            <strong className="font-semibold">Good looks like: </strong>
            {entry.goodLooksLike}
          </span>
        </span>
      )}
    </span>
  );
}
