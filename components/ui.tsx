import type { ReactNode } from 'react';
import type { SignalStatus, Verdict } from '@/lib/engine';
import { VERDICT_META } from '@/lib/engine';
import { cn } from '@/lib/cn';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6', className)}>
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

export const inputClassName =
  'w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-lime-400/70 focus:ring-2 focus:ring-lime-400/20';

export function PrimaryButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
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
        'inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

const VERDICT_STYLES: Record<Verdict, string> = {
  SCALE: 'bg-lime-400/15 text-lime-300 border-lime-400/40',
  RUN: 'bg-sky-400/15 text-sky-300 border-sky-400/40',
  FIX: 'bg-amber-400/15 text-amber-300 border-amber-400/40',
  WAIT: 'bg-zinc-400/15 text-zinc-300 border-zinc-400/40',
  KILL: 'bg-red-500/15 text-red-300 border-red-500/40',
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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-sm text-zinc-400">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, sub, action }: { title: string; sub: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-6 py-14 text-center">
      <p className="text-base font-semibold text-zinc-200">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">{sub}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
