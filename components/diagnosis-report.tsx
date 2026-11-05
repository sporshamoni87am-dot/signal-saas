import type { DiagnosisInputs, DiagnosisResults, SignalGrade } from '@/lib/engine';
import { VERDICT_META } from '@/lib/engine';
import { GLOSSARY } from '@/lib/glossary';
import { Card, SectionTitle, StatusPill, VerdictBadge } from '@/components/ui';
import { cn } from '@/lib/cn';

const VERDICT_RING: Record<string, string> = {
  SCALE: 'border-lime-400/50',
  RUN: 'border-sky-400/50',
  FIX: 'border-amber-400/50',
  WAIT: 'border-zinc-600',
  KILL: 'border-red-500/50',
};

const VERDICT_GLOW: Record<string, string> = {
  SCALE: 'radial-gradient(60% 120% at 50% 0%, rgb(163 230 53 / 0.14), transparent 70%)',
  RUN: 'radial-gradient(60% 120% at 50% 0%, rgb(56 189 248 / 0.14), transparent 70%)',
  FIX: 'radial-gradient(60% 120% at 50% 0%, rgb(251 191 36 / 0.14), transparent 70%)',
  WAIT: 'radial-gradient(60% 120% at 50% 0%, rgb(161 161 170 / 0.12), transparent 70%)',
  KILL: 'radial-gradient(60% 120% at 50% 0%, rgb(239 68 68 / 0.14), transparent 70%)',
};

const VERDICT_TITLE_COLOR: Record<string, string> = {
  SCALE: 'text-lime-300',
  RUN: 'text-sky-300',
  FIX: 'text-amber-300',
  WAIT: 'text-zinc-200',
  KILL: 'text-red-300',
};

function SignalTable({ signals }: { signals: SignalGrade[] }) {
  return (
    <>
      {/* Desktop: dense scannable table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
              <th className="pb-2 pr-3 font-medium">Signal</th>
              <th className="pb-2 pr-3 font-medium">Value</th>
              <th className="pb-2 pr-3 font-medium">Status</th>
              <th className="pb-2 font-medium">Why it matters</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr key={s.key} className="border-b border-zinc-800/60 last:border-0">
                <td className="py-3 pr-3 font-medium text-zinc-200">{s.label}</td>
                <td className="py-3 pr-3 font-mono text-zinc-100">{s.display}</td>
                <td className="py-3 pr-3">
                  <StatusPill status={s.status} />
                </td>
                <td className="py-3 text-[13px] leading-relaxed text-zinc-400">
                  {s.explanation}
                  <span className="mt-1 block text-xs text-zinc-500">Benchmark: {s.benchmark}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile: stacked cards, no horizontal scroll */}
      <div className="space-y-3 sm:hidden">
        {signals.map((s) => (
          <div key={s.key} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-zinc-100">{s.label}</p>
              <StatusPill status={s.status} />
            </div>
            <p className="mt-1.5 font-mono text-lg text-zinc-100">{s.display}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">{s.explanation}</p>
            <p className="mt-1.5 text-xs text-zinc-500">Benchmark: {s.benchmark}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export default function DiagnosisReport({
  inputs,
  results,
  screenshotUrl,
  compact = false,
}: {
  inputs: DiagnosisInputs;
  results: DiagnosisResults;
  screenshotUrl?: string | null;
  compact?: boolean;
}) {
  const progress = results.dataSufficiency.spendProgress;
  return (
    // Hidden in print: report-actions.tsx renders a light print-only document.
    <div className="space-y-6 print:hidden">
      {/* Verdict hero — the one thing the eye must land on first */}
      <div
        className={cn('relative overflow-hidden rounded-2xl border bg-zinc-900/60 p-6 sm:p-10', VERDICT_RING[results.verdict])}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: VERDICT_GLOW[results.verdict] }}
          aria-hidden
        />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              D2C diagnosis · rule-based · transparent
            </span>
            <VerdictBadge verdict={results.verdict} size="sm" />
          </div>
          <h2 className={cn('mt-4 text-4xl font-black tracking-tight sm:text-5xl', VERDICT_TITLE_COLOR[results.verdict])}>
            {VERDICT_META[results.verdict].title}
          </h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-zinc-200 sm:text-base">
            {results.verdictReason}
          </p>
          {inputs.problemStatement.trim() !== '' && (
            <p className="mt-4 border-l-2 border-zinc-700 pl-3 text-sm italic text-zinc-400">
              Your note: “{inputs.problemStatement}”
            </p>
          )}
        </div>
      </div>

      {/* Data sufficiency */}
      <Card>
        <SectionTitle hint="A verdict is only trustworthy once the campaign has spent roughly 1× target CPA.">Data sufficiency</SectionTitle>
        <div className="flex items-center gap-4">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={cn('h-full rounded-full', results.dataSufficiency.sufficient ? 'bg-lime-400' : 'bg-amber-400')}
              style={{ width: `${Math.min(100, (progress ?? 0) * 100)}%` }}
            />
          </div>
          <span className="font-mono text-sm text-zinc-300">
            {progress !== null ? `${Math.round(progress * 100)}%` : '—'}
          </span>
        </div>
        <p className="mt-2 text-sm text-zinc-400">
          {results.dataSufficiency.targetCpa !== null ? (
            <>
              Target CPA <span className="font-mono text-zinc-200">${results.dataSufficiency.targetCpa.toFixed(2)}</span>
              {' '}(AOV ÷ breakeven ROAS). {results.dataSufficiency.note}
            </>
          ) : (
            'Add AOV + breakeven ROAS so we can compute your target CPA spend gate.'
          )}
        </p>
      </Card>

      {/* Ad signals */}
      <Card>
        <SectionTitle hint="Every ad-platform signal, graded against adjustable D2C starting benchmarks.">
          Ad signals
        </SectionTitle>
        <SignalTable signals={results.adSignals} />
      </Card>

      {/* Business metrics */}
      <Card>
        <SectionTitle hint="What the business actually keeps. Ad metrics can lie — these keep you honest.">
          Business metrics
        </SectionTitle>
        <SignalTable signals={results.businessMetrics} />
      </Card>

      {/* Creative */}
      <Card>
        <SectionTitle hint="Video creative health. Needs 3-sec views + thruplays from Ads Manager video metrics.">
          Creative analysis
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-300">Hook rate</p>
              <StatusPill status={results.creative.hookStatus} />
            </div>
            <p className="mt-2 font-mono text-2xl text-zinc-100">
              {results.creative.hookRate !== null ? `${(results.creative.hookRate * 100).toFixed(1)}%` : '—'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">3-sec views ÷ impressions. Good ≥ 30% · Watch ≥ 20%.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-300">Hold rate</p>
              <StatusPill status={results.creative.holdStatus} />
            </div>
            <p className="mt-2 font-mono text-2xl text-zinc-100">
              {results.creative.holdRate !== null ? `${(results.creative.holdRate * 100).toFixed(1)}%` : '—'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Thruplays ÷ 3-sec views. Good ≥ 20% · Watch ≥ 10%.</p>
          </div>
        </div>
        <p className={cn('mt-4 rounded-xl border px-4 py-3 text-sm leading-relaxed', results.creative.fatigue ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-zinc-800 bg-zinc-950 text-zinc-400')}>
          {results.creative.fatigue ? '⚠ ' : 'ℹ '}{results.creative.fatigueNote}
        </p>
      </Card>

      {/* Funnel */}
      <Card>
        <SectionTitle hint="Where the funnel leaks — fix the biggest drop first.">Funnel</SectionTitle>
        <div className="space-y-2.5">
          {results.funnel.map((f) => {
            const max = results.funnel[0].count ?? 1;
            const pct = f.count !== null && max > 0 ? Math.max(2, (f.count / max) * 100) : 0;
            return (
              <div key={f.stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-200">{f.stage}</span>
                  <span className="font-mono text-zinc-400">
                    {f.count !== null ? f.count.toLocaleString('en-US') : '—'}
                    <span className="ml-2 text-xs text-zinc-500">{f.rateFromPrev}</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-lime-500 to-lime-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Rules fired */}
      <Card>
        <SectionTitle hint="Full transparency: every rule that fired, with the math. No black box.">
          Rules that fired ({results.rulesFired.length})
        </SectionTitle>
        <ul className="space-y-3">
          {results.rulesFired.map((r, idx) => (
            <li key={idx} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm font-semibold text-zinc-100">{r.rule}</p>
              <p className="mt-1 text-sm text-zinc-400">{r.detail}</p>
              <p className="mt-2 break-words font-mono text-xs text-lime-300/90">{r.math}</p>
            </li>
          ))}
        </ul>
      </Card>

      {/* Action items */}
      <Card>
        <SectionTitle hint="Do these in order. Each maps to a concrete step in Ads Manager or your store.">
          Action items — change this
        </SectionTitle>
        <ol className="space-y-4">
          {results.actionItems.map((a) => (
            <li key={a.priority} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime-400 text-sm font-bold text-zinc-950">
                {a.priority}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-zinc-100">{a.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{a.detail}</p>
                <p className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-[13px] text-zinc-300">
                  <span className="font-semibold text-lime-300">In Ads Manager: </span>
                  {a.adsManagerStep}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {/* Screenshot reference */}
      {screenshotUrl && !compact && (
        <Card>
          <SectionTitle hint="Uploaded by you as a visual reference. This version does not read or analyze screenshots automatically.">
            Screenshot reference
          </SectionTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={screenshotUrl} alt="Uploaded Ads Manager screenshot (reference only)" className="max-h-[480px] w-auto max-w-full rounded-xl border border-zinc-800" />
        </Card>
      )}

      {/* Plain-language metric guide — beginner-proofing */}
      <details className="group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
        <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-zinc-200 transition hover:text-lime-300">
          <span className="mr-2 inline-block transition group-open:rotate-90">▸</span>
          New to these metrics? Read the plain-language guide
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-sm font-semibold text-zinc-100">{g.term}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
                <strong className="text-zinc-300">What: </strong>{g.what}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
                <strong className="text-zinc-300">Why: </strong>{g.why}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-lime-200/80">
                <strong>Good: </strong>{g.goodLooksLike}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-600">
          Benchmarks are adjustable starting points, not verified platform data.
        </p>
      </details>
    </div>
  );
}
