import Link from 'next/link';
import { diagnose } from '@/lib/engine';
import { SAMPLE_CAMPAIGN } from '@/lib/sample-campaign';
import { VerdictBadge } from '@/components/ui';

/**
 * "How it works" workflow on the dashboard — always visible, not only when
 * the dashboard is empty. The visuals are built from the REAL product:
 * the Diagnose and Act cards render the actual sample diagnosis
 * (lib/sample-campaign.ts run through the real engine), and the Compare
 * and Forecast cards are simple inline SVG diagrams — no fake screenshots,
 * no AI images, no invented numbers.
 */
export default function WorkflowSection() {
  const sample = diagnose(SAMPLE_CAMPAIGN);
  const roas = sample.adSignals.find((s) => s.key === 'roas');
  const cpa = sample.adSignals.find((s) => s.key === 'cpa');
  const actions = sample.actionItems.slice(0, 3);

  return (
    <section className="mt-10" aria-label="How it works">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">How it works</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Diagnose, act, compare, forecast — the loop that turns ad spend into decisions.
          </p>
        </div>
        <Link href="/how-it-works" className="inline-flex min-h-11 items-center text-sm font-semibold text-red-700 transition hover:text-red-800">
          Read the full user manual →
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 1 — Diagnose: miniature preview of the REAL sample report */}
        <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-all hover:-translate-y-0.5 hover:border-zinc-300">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-xs font-semibold text-zinc-600">Sample — Aurora Skincare</p>
              <VerdictBadge verdict={sample.verdict} size="sm" />
            </div>
            <div className="mt-3 flex gap-5">
              <div>
                <p className="text-[11px] text-zinc-500">ROAS</p>
                <p className="font-mono text-sm font-semibold text-zinc-900">{roas?.display ?? '—'}</p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500">CPA</p>
                <p className="font-mono text-sm font-semibold text-zinc-900">{cpa?.display ?? '—'}</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-snug text-zinc-500">
              Verdict, signals and leaks — graded against your breakeven, with the math shown.
            </p>
          </div>
          <span className="mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-sm font-bold text-white">1</span>
          <h3 className="mt-3 font-semibold text-zinc-900">Diagnose</h3>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-zinc-600">
            Run your numbers and get a verdict — kill, scale, fix or wait — in about two minutes.
          </p>
          <Link href="/diagnose" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-red-700 hover:text-red-800">
            New diagnosis →
          </Link>
        </div>

        {/* 2 — Act: the sample diagnosis's REAL top action items */}
        <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-all hover:-translate-y-0.5 hover:border-zinc-300">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <ol className="space-y-2.5">
              {actions.map((a) => (
                <li key={a.priority} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[11px] font-bold text-red-700">
                    {a.priority}
                  </span>
                  <p className="text-xs leading-snug text-zinc-600">{a.title}</p>
                </li>
              ))}
            </ol>
          </div>
          <span className="mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-sm font-bold text-white">2</span>
          <h3 className="mt-3 font-semibold text-zinc-900">Act</h3>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-zinc-600">
            Follow the ordered action items in Ads Manager — biggest leak first, in the exact order given.
          </p>
          <Link href="/how-it-works" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-red-700 hover:text-red-800">
            How the verdict is decided →
          </Link>
        </div>

        {/* 3 — Compare: SVG diagram of then vs now (a diagram, not data) */}
        <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-all hover:-translate-y-0.5 hover:border-zinc-300">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <svg viewBox="0 0 200 96" className="h-24 w-full" role="img" aria-label="Diagram: results improving from an earlier diagnosis to a later one">
              <defs>
                <linearGradient id="wf-bars" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>
              </defs>
              <rect x="18" y="58" width="28" height="26" rx="4" fill="#d4d4d8" />
              <rect x="78" y="40" width="28" height="44" rx="4" fill="#b91c1c" />
              <rect x="138" y="18" width="28" height="66" rx="4" fill="url(#wf-bars)" />
              <polyline points="32,52 92,34 152,12" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
              <text x="18" y="94" fill="#71717a" fontSize="9">Then</text>
              <text x="138" y="94" fill="#52525b" fontSize="9">Now</text>
            </svg>
          </div>
          <span className="mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-sm font-bold text-white">3</span>
          <h3 className="mt-3 font-semibold text-zinc-900">Compare</h3>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-zinc-600">
            Re-diagnose after 7–30 days and see side by side what improved — and what still leaks.
          </p>
          <Link href="/compare" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-red-700 hover:text-red-800">
            Compare diagnoses →
          </Link>
        </div>

        {/* 4 — Forecast: SVG funnel diagram */}
        <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-all hover:-translate-y-0.5 hover:border-zinc-300">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <svg viewBox="0 0 200 96" className="h-24 w-full" role="img" aria-label="Diagram: the funnel narrowing from impressions to purchases">
              <defs>
                <linearGradient id="wf-funnel" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>
              </defs>
              <rect x="10" y="8" width="180" height="14" rx="7" fill="url(#wf-funnel)" opacity="0.95" />
              <rect x="30" y="30" width="140" height="14" rx="7" fill="url(#wf-funnel)" opacity="0.7" />
              <rect x="55" y="52" width="90" height="14" rx="7" fill="url(#wf-funnel)" opacity="0.45" />
              <rect x="80" y="74" width="40" height="14" rx="7" fill="url(#wf-funnel)" opacity="0.3" />
              <text x="10" y="94" fill="#71717a" fontSize="9">Impressions → purchases</text>
            </svg>
          </div>
          <span className="mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-sm font-bold text-white">4</span>
          <h3 className="mt-3 font-semibold text-zinc-900">Forecast</h3>
          <p className="mt-1.5 flex-1 text-sm leading-relaxed text-zinc-600">
            Check the learning phase and the full-budget projection before you scale a young campaign.
          </p>
          <Link href="/forecast" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-red-700 hover:text-red-800">
            Run a forecast →
          </Link>
        </div>
      </div>
    </section>
  );
}
