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
      <section className="hero-grid relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
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
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-xl bg-lime-400 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
              >
                Diagnose my campaign — free
              </Link>
              <Link
                href="#how"
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500"
              >
                How it works
              </Link>
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              Free 30-day trial · No credit card required · Full access
            </p>
          </div>

          {/* Signal strip */}
          <div className="mt-14 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {SIGNALS.map((s) => (
              <div
                key={s}
                className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-[13px] font-medium text-zinc-300"
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
              <div key={s.n} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
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

      {/* Pricing — trial launch: free 30 days, no card, no paywall */}
      <section id="pricing" className="border-t border-zinc-800/80">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">Pricing</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-zinc-400">
            One simple trial. Everything unlocked. Decide later.
          </p>
          <div className="mx-auto mt-10 max-w-xl">
            <div className="rounded-2xl border border-lime-400/50 bg-zinc-900/60 p-8 text-center shadow-[0_0_40px_-12px] shadow-lime-400/20">
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
                <li>✓ Business metrics (MER, POAS)</li>
                <li>✓ Creative analysis + Ads Manager action items</li>
                <li>✓ Save history + old-vs-new comparison</li>
              </ul>
              <Link href="/signup" className="mt-7 block rounded-xl bg-lime-400 px-5 py-3 text-center text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
                Start my free trial
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
          <Link href="/signup" className="mt-7 inline-block rounded-xl bg-lime-400 px-7 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
            Run your first diagnosis
          </Link>
        </div>
      </section>
    </div>
  );
}
