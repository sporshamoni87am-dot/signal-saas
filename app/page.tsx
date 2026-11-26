import Link from 'next/link';
import { diagnose } from '@/lib/engine';
import { SAMPLE_CAMPAIGN } from '@/lib/sample-campaign';
import { forecast } from '@/lib/forecast';
import { SAMPLE_FORECAST } from '@/lib/forecast-sample';
import { calculateUnitEconomics, type UnitEconomicsInputs } from '@/lib/unit-economics';
import { VerdictBadge } from '@/components/ui';

const STEPS = [
  {
    n: '01',
    title: 'Drop in your numbers',
    body: 'Type your Ads Manager metrics — or upload a screenshot for reference while you type. Add your breakeven ROAS, margin, and a one-line note on what’s worrying you.',
  },
  {
    n: '02',
    title: 'Get a metric-first diagnosis',
    body: 'A transparent rule-based engine grades every signal that matters for D2C — ROAS vs breakeven, MER, POAS, hook rate, funnel leaks — and shows you the exact math behind the verdict.',
  },
  {
    n: '03',
    title: 'Act on it in Ads Manager',
    body: 'Every diagnosis ends with an ordered list of concrete changes: what to fix, in what order, and the exact clicks to make it happen. Save it, come back in a week, and compare.',
  },
];

const SIGNALS = [
  'ROAS vs your breakeven',
  'MER — blended business view',
  'POAS — profit on ad spend',
  'Cost per purchase vs target CPA',
  'Link CTR & hook rate',
  'Click → ATC → checkout funnel',
  'Frequency & fatigue flags',
  'Kill / scale / wait verdict',
];

export default function LandingPage() {
  // All three previews below are built from the REAL sample data run
  // through the real engine/forecast/calculator — no fake screenshots,
  // no invented numbers.
  const sample = diagnose(SAMPLE_CAMPAIGN);
  const sampleForecast = forecast(SAMPLE_FORECAST);
  // Unit Economics preview: the calculator's own base example, run
  // through the real calculator — same numbers as /unit-economics
  // ("Use example numbers").
  const ueExample: UnitEconomicsInputs = {
    mode: 'ecommerce',
    currency: '$',
    aov: 200,
    avgPurchases: 5,
    marginPct: 50,
    adSpend: 10000,
    customersAcquired: 200,
    leadsAcquired: null,
    leadToCustomerPct: null,
  };
  const ue = calculateUnitEconomics(ueExample);
  const roas = sample.adSignals.find((s) => s.key === 'roas');
  const cpa = sample.adSignals.find((s) => s.key === 'cpa');
  const mer = sample.businessMetrics.find((s) => s.key === 'mer');
  const poas = sample.businessMetrics.find((s) => s.key === 'poas');
  const creativeRule = sample.rulesFired.find((r) => r.rule === 'Creative weakness detected');
  const topAction = sample.actionItems[0];
  const forecastPurchases = sampleForecast.funnel.find((f) => f.stage === 'Purchases (expected)');
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Grid backdrop on its own layer: .hero-grid carries a mask-image,
            which would mask the hero's text too if applied to the section. */}
        <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0" />
        {/* Subtle radial red glow behind the headline — background layer only. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(60% 45% at 50% 0%, rgb(220 38 38 / 0.06), transparent 70%)' }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
              Built for D2C media buyers on Meta
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-zinc-900 sm:text-6xl">
              Stop guessing which metrics matter.{' '}
              <span className="text-red-700">Get the signal.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600">
              AdSignal Pro reads your campaign numbers and tells you, in plain
              terms, which signals are healthy, which are leaking money, whether to kill,
              scale, fix or wait — and exactly what to change in Ads Manager. No prompting
              skills required. No generic strategy fluff.
            </p>
            {/* Mobile: primary CTA goes full-width first, then How it works +
                Sign in share a row — big thumb targets, no crowding. */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/diagnose"
                className="w-full justify-center rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3.5 text-center text-sm font-semibold text-white shadow-[0_0_32px_-6px] shadow-red-600/30 transition hover:from-red-700 hover:to-rose-700 sm:w-auto"
              >
                Try a free diagnosis — no sign-up
              </Link>
              <Link
                href="#how"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 sm:flex-none"
              >
                How it works
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-11 flex-1 items-center justify-center px-2 py-3 text-center text-sm font-medium text-zinc-600 transition hover:text-zinc-900 sm:flex-none"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-zinc-500">
              The tools are free — no sign-up, no credit card. Run your first diagnosis right now.
              <br className="hidden sm:block" />
              Create a free account and you get a 30-day trial with saving and comparison.
            </p>
          </div>

          {/* Signal strip */}
          <div className="mt-14 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {SIGNALS.map((s) => (
              <div
                key={s}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[13px] font-medium text-zinc-600 shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
              >
                <span className="mr-2 text-red-600">✓</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">How it works</h2>
          <p className="mt-2 max-w-2xl text-zinc-600">
            Three steps from confused to a clear decision — in about two minutes.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-all hover:-translate-y-0.5 hover:border-zinc-300">
                <p className="font-mono text-sm font-bold text-red-600">{s.n}</p>
                <h3 className="mt-3 text-lg font-semibold text-zinc-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why metric-first */}
      <section className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                Ad metrics tell you what happened. Business metrics tell you if it matters.
              </h2>
              <p className="mt-4 leading-relaxed text-zinc-600">
                Most buyers stare at ROAS, link clicks and CTR — then wonder why the business
                isn’t growing. AdSignal Pro grades your campaign on both levels: the
                ad-platform signals <em className="text-zinc-600">and</em> the business truth —
                blended MER, profit on ad spend, margin-aware verdicts — plus creative health
                (hook rate, hold rate, fatigue) and a leak-by-leak funnel read.
              </p>
              <p className="mt-4 leading-relaxed text-zinc-600">
                And it never hides behind a black box: every rule that fires shows its math.
              </p>
            </div>
            {/* Miniature preview of the REAL sample diagnosis — same card as
                the dashboard workflow section, run through the real engine. */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-xs font-semibold text-zinc-600">Sample — Aurora Skincare</p>
                <VerdictBadge verdict={sample.verdict} size="sm" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-zinc-500">ROAS</p>
                  <p className="font-mono text-base font-semibold text-zinc-900">{roas?.display ?? '—'}</p>
                  <p className="text-[11px] text-zinc-500">Breakeven {SAMPLE_CAMPAIGN.breakevenRoas}×</p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500">Cost per purchase</p>
                  <p className="font-mono text-base font-semibold text-zinc-900">{cpa?.display ?? '—'}</p>
                  <p className="text-[11px] text-zinc-500">
                    Target ${sample.dataSufficiency.targetCpa?.toFixed(2) ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500">MER (blended)</p>
                  <p className="font-mono text-base font-semibold text-zinc-900">{mer?.display ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500">POAS</p>
                  <p className="font-mono text-base font-semibold text-zinc-900">{poas?.display ?? '—'}</p>
                </div>
              </div>
              {creativeRule && (
                <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-zinc-700">Rule that fired: {creativeRule.rule}</p>
                  <p className="mt-1 font-mono text-xs text-amber-700">{creativeRule.math}</p>
                </div>
              )}
              {topAction && (
                <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                  <span className="font-semibold text-zinc-600">First action: </span>
                  {topAction.title}
                </p>
              )}
              <Link href="/diagnose?sample=1" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-red-700 transition hover:text-red-800">
                Run the sample diagnosis →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Forecast — early-stage planning model */}
      <section className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-bold tracking-widest text-red-700">NEW · EARLY-STAGE FORECAST</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                $5,000 budget, $550 spent. How will it land?
              </h2>
              <p className="mt-4 leading-relaxed text-zinc-600">
                The forecast projects the rest of your budget at today&apos;s rates — expected
                purchases, revenue, CPA and ROAS at full spend — and shows the funnel leak,
                step by step, so you can see <em className="text-zinc-600">where</em> it breaks,
                not just that it does.
              </p>
              <p className="mt-4 leading-relaxed text-zinc-600">
                Most importantly, it refuses to judge a campaign that isn&apos;t ready to be
                judged: until Meta&apos;s learning phase is over (about 50 optimisation events
                in a week), every verdict is provisional — too early to scale or pause.
              </p>
              <Link href="/forecast" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-7 py-3 text-sm font-semibold text-white shadow-[0_0_24px_-6px] shadow-red-600/30 transition hover:from-red-700 hover:to-rose-700">
                Try the forecast — no sign-up
              </Link>
              <p className="mt-3 text-xs text-zinc-500">
                A planning model built on your numbers — not a Meta prediction, and not affiliated with Meta.
              </p>
            </div>
            {/* Miniature preview of the REAL sample forecast — run through the
                real forecast model, same numbers as /forecast?sample=1. */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <p className="text-xs font-semibold text-zinc-600">Sample — Aurora Skincare early test</p>
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800">
                  Learning: limited risk · {sampleForecast.learning.events ?? '—'} / 50 events · ~{sampleForecast.learning.weeklyProjected !== null ? Math.round(sampleForecast.learning.weeklyProjected) : '—'}/week
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-800/80">
                  Too early to scale or pause — verdicts are provisional.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[11px] text-zinc-500">Full-budget purchases</p>
                  <p className="font-mono text-base font-semibold text-zinc-900">
                    {sampleForecast.fullPurchases !== null ? `about ${Math.round(sampleForecast.fullPurchases)}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500">Full-budget CPA</p>
                  <p className="font-mono text-base font-semibold text-zinc-900">
                    {sampleForecast.fullCpa !== null ? `$${sampleForecast.fullCpa.toFixed(2)}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500">Full-budget ROAS</p>
                  <p className="font-mono text-base font-semibold text-zinc-900">
                    {sampleForecast.fullRoas !== null ? `${sampleForecast.fullRoas.toFixed(2)}×` : '—'}
                  </p>
                </div>
              </div>
              {forecastPurchases && (
                <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                  <span className="font-semibold text-zinc-600">Biggest leak: </span>
                  checkout → purchase {forecastPurchases.rateDisplay} ·{' '}
                  {forecastPurchases.status === 'bad' ? 'bad' : forecastPurchases.status === 'warn' ? 'watch' : forecastPurchases.status === 'good' ? 'good' : '—'}
                </p>
              )}
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                To exit learning: about ${sampleForecast.learning.minDailyBudget !== null ? Math.round(sampleForecast.learning.minDailyBudget) : '—'}/day.
              </p>
              <Link href="/forecast?sample=1" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-red-700 transition hover:text-red-800">
                Run the sample forecast →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Unit Economics Calculator */}
      <section className="border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-bold tracking-widest text-red-700">NEW · UNIT ECONOMICS CALCULATOR</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                Can this business afford to buy customers on Meta?
              </h2>
              <p className="mt-4 leading-relaxed text-zinc-600">
                Before you judge CPM, CTR or creative, check the maths that decides
                everything: LTGP, CAC, LTGP:CAC and break-even — AOV × average
                purchases × margin, versus what you actually pay per delivered,
                paid customer.
              </p>
              <p className="mt-4 leading-relaxed text-zinc-600">
                It shows your acceptable cost per purchase, how much headroom you
                really have to scale, and which lever — one more purchase, higher
                AOV, or better margin — moves LTGP most.
              </p>
              <Link href="/unit-economics" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-7 py-3 text-sm font-semibold text-white shadow-[0_0_24px_-6px] shadow-red-600/30 transition hover:from-red-700 hover:to-rose-700">
                Try the Unit Economics Calculator — no sign-up
              </Link>
              <p className="mt-3 text-xs text-zinc-500">
                A planning model — not a Meta prediction, and not affiliated with Meta.
              </p>
            </div>
            {/* Miniature preview of the REAL Unit Economics base example —
                run through the real calculator, same numbers as
                /unit-economics. Same card structure as the diagnosis and
                forecast previews above. */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <p className="text-xs font-semibold text-zinc-600">Example — $200 AOV · 5 purchases · 50% margin</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-zinc-500">LTGP (lifetime profit / customer)</p>
                  <p className="font-mono text-base font-semibold text-zinc-900">
                    {ue.ltgp !== null ? `$${ue.ltgp}` : '—'}
                  </p>
                  <p className="text-[11px] text-zinc-500">$200 × 5 × 50%</p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500">CAC (cost per customer)</p>
                  <p className="font-mono text-base font-semibold text-zinc-900">
                    {ue.cac !== null ? `$${ue.cac}` : '—'}
                  </p>
                  <p className="text-[11px] text-zinc-500">$10,000 ÷ 200 customers</p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500">LTGP:CAC</p>
                  <p className="font-mono text-base font-semibold text-zinc-900">
                    {ue.ltgpCacRatio !== null ? ue.ltgpCacRatio : '—'}
                  </p>
                  <p className="text-[11px] text-zinc-500">for every $1, you earn $10 in lifetime profit</p>
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500">Most you can pay per purchase</p>
                  <p className="font-mono text-base font-semibold text-zinc-900">
                    {ue.acceptableCpp !== null ? `$${ue.acceptableCpp}` : '—'}
                  </p>
                  <p className="text-[11px] text-zinc-500">$200 × 50% (first order)</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-800">{ue.verdictHeadline}</p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-800/80">{ue.verdictDetail}</p>
              </div>
              <Link href="/unit-economics" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-red-700 transition hover:text-red-800">
                Try the Unit Economics Calculator →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing — trial launch: free 30 days, no card, no paywall */}
      <section id="pricing" className="border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Pricing</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-zinc-600">
            One simple trial. Everything unlocked. Decide later.
          </p>
          <div className="mx-auto mt-10 max-w-xl">
            <div className="rounded-2xl border border-red-300 bg-white p-6 text-center shadow-[0_0_40px_-12px] shadow-red-600/20 sm:p-8">
              <p className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                LAUNCH OFFER
              </p>
              <h3 className="mt-4 text-xl font-semibold text-zinc-900">Free 30-day trial</h3>
              <p className="mt-1 text-4xl font-bold text-zinc-900">$0</p>
              <p className="mt-1 text-sm text-zinc-500">no credit card required</p>
              <ul className="mx-auto mt-6 max-w-sm space-y-2.5 text-left text-sm text-zinc-600">
                <li>✓ Unlimited diagnoses for 30 days</li>
                <li>✓ Full D2C diagnosis engine</li>
                <li>✓ Early-stage forecast with learning-phase gate</li>
                <li>✓ Unit Economics Calculator (LTGP, CAC, break-even)</li>
                <li>✓ Business metrics (MER, POAS)</li>
                <li>✓ Creative analysis + Ads Manager action items</li>
                <li>✓ Save history + old-vs-new comparison</li>
              </ul>
              <Link href="/diagnose" className="mt-7 block min-h-11 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_0_24px_-6px] shadow-red-600/30 transition hover:from-red-700 hover:to-rose-700">
                Try a free diagnosis — no sign-up
              </Link>
              <p className="mt-3 text-xs text-zinc-500">
                Paid plans are coming soon. Your saved diagnoses stay yours either way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-200">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="mx-auto max-w-2xl text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Your next campaign review takes two minutes. Make it decisive.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-600">
            No account, no credit card — just your numbers and an honest verdict.
          </p>
          <Link href="/diagnose" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-7 py-3 text-sm font-semibold text-white shadow-[0_0_24px_-6px] shadow-red-600/30 transition hover:from-red-700 hover:to-rose-700">
            Run your first diagnosis
          </Link>
        </div>
      </section>
    </div>
  );
}
