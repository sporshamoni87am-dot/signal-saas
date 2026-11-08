import Link from 'next/link';

const STEPS = [
  {
    n: '01',
    title: 'Drop in your numbers',
    body: 'Type your Ads Manager metrics — or upload a screenshot to read from while you type. Add your breakeven ROAS, margin, and a one-line note on what’s worrying you.',
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
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Grid backdrop on its own layer: .hero-grid carries a mask-image,
            which would mask the hero's text too if applied to the section. */}
        <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0" />
        {/* Subtle radial lime glow behind the headline — background layer only. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(60% 45% at 50% 0%, rgb(163 230 53 / 0.09), transparent 70%)' }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3.5 py-1.5 text-xs font-semibold text-lime-300">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
              Built for D2C media buyers on Meta
            </p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-zinc-50 sm:text-6xl">
              Stop guessing which metrics matter.{' '}
              <span className="text-lime-300">Get the signal.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Meta Ads Signal Assistance reads your campaign numbers and tells you, in plain
              terms, which signals are healthy, which are leaking money, whether to kill,
              scale, fix or wait — and exactly what to change in Ads Manager. No prompting
              skills required. No generic strategy fluff.
            </p>
            {/* Mobile: primary CTA goes full-width first, then How it works +
                Sign in share a row — big thumb targets, no crowding. */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/diagnose"
                className="w-full justify-center rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 px-6 py-3.5 text-center text-sm font-semibold text-zinc-950 shadow-[0_0_32px_-6px] shadow-lime-400/50 transition hover:from-lime-300 hover:to-emerald-300 sm:w-auto"
              >
                Try a free diagnosis — no sign-up
              </Link>
              <Link
                href="#how"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 sm:flex-none"
              >
                How it works
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-11 flex-1 items-center justify-center px-2 py-3 text-center text-sm font-medium text-zinc-400 transition hover:text-zinc-100 sm:flex-none"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-zinc-500">
              Run your first diagnosis right now, no account needed.
              <br className="hidden sm:block" />
              Free 30-day trial when you create an account · No credit card required
            </p>
          </div>

          {/* Signal strip */}
          <div className="mt-14 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {SIGNALS.map((s) => (
              <div
                key={s}
                className="rounded-xl border border-zinc-800/70 bg-zinc-900/70 px-4 py-3 text-[13px] font-medium text-zinc-300 shadow-[0_1px_2px_rgb(0_0_0/0.4)]"
              >
                <span className="mr-2 text-lime-400">✓</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-zinc-800/80">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">How it works</h2>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Three steps from confused to a clear decision — in about two minutes.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-[0_1px_2px_rgb(0_0_0/0.4)] transition-all hover:-translate-y-0.5 hover:border-zinc-700/80">
                <p className="font-mono text-sm font-bold text-lime-400">{s.n}</p>
                <h3 className="mt-3 text-lg font-semibold text-zinc-100">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why metric-first */}
      <section className="border-t border-zinc-800/80 bg-zinc-900/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
                Ad metrics tell you what happened. Business metrics tell you if it matters.
              </h2>
              <p className="mt-4 leading-relaxed text-zinc-400">
                Most buyers stare at ROAS, link clicks and CTR — then wonder why the business
                isn’t growing. Signal Assistance grades your campaign on both levels: the
                ad-platform signals <em className="text-zinc-300">and</em> the business truth —
                blended MER, profit on ad spend, margin-aware verdicts — plus creative health
                (hook rate, hold rate, fatigue) and a leak-by-leak funnel read.
              </p>
              <p className="mt-4 leading-relaxed text-zinc-400">
                And it never hides behind a black box: every rule that fires shows its math.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 font-mono text-[13px] leading-relaxed">
              <p className="text-zinc-500">{'// what the engine shows you'}</p>
              <p className="mt-2 text-zinc-300">verdict: <span className="font-bold text-amber-300">FIX IT &amp; RETEST</span></p>
              <p className="text-zinc-300">rule: <span className="text-zinc-100">creative weakness detected</span></p>
              <p className="text-lime-300/90">math: CTR 0.52% &lt; 0.70% · hook 16.2% &lt; 20%</p>
              <p className="mt-3 text-zinc-300">action 1: <span className="text-zinc-100">launch 3 new hooks</span></p>
              <p className="text-zinc-500">in Ads Manager: duplicate the ad 3×, swap only the first 3 seconds…</p>
            </div>
          </div>
        </div>
      </section>

      {/* Forecast — early-stage planning model */}
      <section className="border-t border-zinc-800/80 bg-zinc-900/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-bold tracking-widest text-lime-300">NEW · EARLY-STAGE FORECAST</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
                $5,000 budget, $550 spent. How will it land?
              </h2>
              <p className="mt-4 leading-relaxed text-zinc-400">
                The forecast projects the rest of your budget at today&apos;s rates — expected
                purchases, revenue, CPA and ROAS at full spend — and shows the funnel leak,
                step by step, so you can see <em className="text-zinc-300">where</em> it breaks,
                not just that it does.
              </p>
              <p className="mt-4 leading-relaxed text-zinc-400">
                Most importantly, it refuses to judge a campaign that isn&apos;t ready to be
                judged: until Meta&apos;s learning phase is over (about 50 optimisation events
                in a week), every verdict is provisional — too early to scale or pause.
              </p>
              <Link href="/forecast" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 px-7 py-3 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_-6px] shadow-lime-400/40 transition hover:from-lime-300 hover:to-emerald-300">
                Try the forecast — no sign-up
              </Link>
              <p className="mt-3 text-xs text-zinc-500">
                A planning model built on your numbers — not a Meta prediction, and not affiliated with Meta.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 font-mono text-[13px] leading-relaxed">
              <p className="text-zinc-500">{'// what the forecast shows you'}</p>
              <p className="mt-2 text-zinc-300">learning: <span className="font-bold text-amber-300">LIMITED RISK · 11 / 50 events · ~7/week</span></p>
              <p className="text-zinc-300">guidance: <span className="text-zinc-100">too early to scale or pause — verdicts are provisional</span></p>
              <p className="text-zinc-300">full budget: <span className="text-zinc-100">~99 purchases · CPA $50.28 · ROAS 1.37×</span></p>
              <p className="mt-3 text-zinc-300">leak: <span className="text-zinc-100">checkout → purchase 45.0% · watch</span></p>
              <p className="text-zinc-500">min daily budget to exit learning: (target CPA × 50) ÷ 7</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing — trial launch: free 30 days, no card, no paywall */}
      <section id="pricing" className="border-t border-zinc-800/80">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">Pricing</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-zinc-400">
            One simple trial. Everything unlocked. Decide later.
          </p>
          <div className="mx-auto mt-10 max-w-xl">
            <div className="rounded-2xl border border-lime-400/50 bg-zinc-900/60 p-6 text-center shadow-[0_0_40px_-12px] shadow-lime-400/20 sm:p-8">
              <p className="inline-flex items-center gap-2 rounded-full bg-lime-400/15 px-3 py-1 text-xs font-bold text-lime-300">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                LAUNCH OFFER
              </p>
              <h3 className="mt-4 text-xl font-semibold text-zinc-100">Free 30-day trial</h3>
              <p className="mt-1 text-4xl font-bold text-zinc-50">$0</p>
              <p className="mt-1 text-sm text-zinc-500">no credit card required</p>
              <ul className="mx-auto mt-6 max-w-sm space-y-2.5 text-left text-sm text-zinc-300">
                <li>✓ Unlimited diagnoses for 30 days</li>
                <li>✓ Full D2C diagnosis engine</li>
                <li>✓ Early-stage forecast with learning-phase gate</li>
                <li>✓ Business metrics (MER, POAS)</li>
                <li>✓ Creative analysis + Ads Manager action items</li>
                <li>✓ Save history + old-vs-new comparison</li>
              </ul>
              <Link href="/diagnose" className="mt-7 block min-h-11 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 px-5 py-3 text-center text-sm font-semibold text-zinc-950 shadow-[0_0_24px_-6px] shadow-lime-400/40 transition hover:from-lime-300 hover:to-emerald-300">
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
      <section className="border-t border-zinc-800/80">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="mx-auto max-w-2xl text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
            Your next campaign review takes two minutes. Make it decisive.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">
            No account, no credit card — just your numbers and an honest verdict.
          </p>
          <Link href="/diagnose" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 px-7 py-3 text-sm font-semibold text-zinc-950 shadow-[0_0_24px_-6px] shadow-lime-400/40 transition hover:from-lime-300 hover:to-emerald-300">
            Run your first diagnosis
          </Link>
        </div>
      </section>
    </div>
  );
}
