import type { ReactNode } from 'react';
import type { SignalStatus, Verdict } from '@/lib/engine';
import { VERDICT_META } from '@/lib/engine';
import { cn } from '@/lib/cn';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 shadow-[0_1px_2px_rgb(0_0_0/0.4)] sm:p-6', className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-100">{children}</h2>
      {hint && <p className="mt-1 text-sm text-zinc-400">{hint}</p>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

/* Mobile: text-base (16px) so iOS Safari does not zoom on focus, and
   py-3 so inputs are at least 44px tall. Desktop keeps the compact look. */
export const inputClassName =
  'w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-3 text-base text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-lime-400/70 focus:ring-2 focus:ring-lime-400/20 sm:py-2.5 sm:text-sm';

export function PrimaryButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_-6px] shadow-lime-400/40 transition hover:from-lime-300 hover:to-emerald-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Same look as PrimaryButton, but a link (for CTAs like signup prompts). */
export function PrimaryLink({
  children,
  className,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_-6px] shadow-lime-400/40 transition hover:from-lime-300 hover:to-emerald-300 active:scale-[0.98]',
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
}

export function GhostButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700/70 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

const VERDICT_STYLES: Record<Verdict, string> = {
  SCALE: 'bg-gradient-to-r from-lime-400 to-emerald-400 text-zinc-950 border-transparent',
  RUN: 'bg-gradient-to-r from-sky-400 to-cyan-400 text-zinc-950 border-transparent',
  FIX: 'bg-gradient-to-r from-amber-400 to-orange-400 text-zinc-950 border-transparent',
  WAIT: 'bg-gradient-to-r from-zinc-400 to-zinc-500 text-zinc-950 border-transparent',
  KILL: 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-transparent',
};

export function VerdictBadge({ verdict, size = 'md' }: { verdict: Verdict; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-bold tracking-wide',
        VERDICT_STYLES[verdict],
        size === 'sm' && 'px-2.5 py-0.5 text-[11px]',
        size === 'md' && 'px-3.5 py-1 text-xs',
        size === 'lg' && 'px-5 py-1.5 text-sm',
      )}
    >
      {VERDICT_META[verdict].title}
    </span>
  );
}

const STATUS_STYLES: Record<SignalStatus, { dot: string; label: string; text: string }> = {
  good: { dot: 'bg-emerald-400', label: 'Good', text: 'text-emerald-300' },
  warn: { dot: 'bg-amber-400', label: 'Watch', text: 'text-amber-300' },
  bad: { dot: 'bg-red-500', label: 'Bad', text: 'text-red-300' },
  na: { dot: 'bg-zinc-600', label: 'N/A', text: 'text-zinc-400' },
};

export function StatusPill({ status }: { status: SignalStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', s.text)}>
      <span className={cn('h-2 w-2 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="relative mb-6">
      {/* Subtle radial lime glow behind the headline — a background layer
          only. The content below is `relative`, so it paints above the glow
          and the text is never tinted. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-8 -top-12 h-44 w-80"
        style={{ background: 'radial-gradient(closest-side, rgb(163 230 53 / 0.07), transparent)' }}
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">{title}</h1>
          {sub && <p className="mt-1.5 max-w-2xl text-sm text-zinc-400">{sub}</p>}
        </div>
        {/* Mobile: actions stack full-width so buttons are thumb-sized and
            never squeezed side-by-side; desktop keeps the inline row. */}
        {actions && <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">{actions}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ title, sub, action }: { title: string; sub: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-10 text-center sm:px-6 sm:py-14">
      <p className="text-base font-semibold text-zinc-200">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">{sub}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
