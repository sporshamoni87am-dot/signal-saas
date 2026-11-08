import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, PageHeader, PrimaryLink, SectionTitle } from '@/components/ui';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'The plain-language manual for AdSignal Pro: what the diagnosis and forecast do, how to use them, how the verdict is decided, and what the tool cannot do.',
};

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime-400/15 text-sm font-bold text-lime-300">
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="font-semibold text-zinc-100">{title}</h3>
        <div className="mt-1 space-y-2 text-sm leading-relaxed text-zinc-400">{children}</div>
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title="How it works"
        sub="The plain-language manual for AdSignal Pro — what it does, how to use it, how the verdict is decided, and what it cannot do."
      />

      <Card className="mb-6 space-y-4 text-sm leading-relaxed text-zinc-300">
        <SectionTitle hint="Two tools, one job: turn a pile of ad numbers into a decision.">
          What AdSignal Pro does
        </SectionTitle>
        <p>
          <strong className="text-zinc-100">Diagnose</strong> reads a campaign&apos;s numbers and
          tells you, in plain words, whether to kill it, scale it, fix it, or leave it alone —
          and exactly what to change in Ads Manager, in order. <strong className="text-zinc-100">Forecast</strong>{' '}
          looks at a young campaign that has only spent part of its budget and projects how it
          is likely to land when the full budget is spent.
        </p>
        <p>
          It is for <strong className="text-zinc-100">new media buyers</strong> who don&apos;t
          yet know which metrics matter, and for <strong className="text-zinc-100">experienced
          buyers</strong> who know the metrics but want a second pair of eyes — and a ranked
          list of what to fix first — instead of staring at Ads Manager for an hour. You do not
          need prompting skills, a spreadsheet, or a marketing degree. You type in the numbers;
          the tool does the judging.
        </p>
        <p>
          Both tools are for <strong className="text-zinc-100">D2C campaigns on Meta</strong>{' '}
          (Facebook and Instagram ads that sell a product online). Other campaign types are not
          supported yet.
        </p>
      </Card>

      <Card className="mb-6 space-y-5">
        <SectionTitle hint="About 2 minutes. No sign-up needed to try — the full diagnosis runs right on the page.">
          A diagnosis, step by step
        </SectionTitle>
        <Step n="1" title="Campaign setup — the basics">
          <p>
            Give the campaign a name, then enter your <strong className="text-zinc-200">breakeven
            ROAS</strong> — the ROAS at which you make exactly $0 profit per order. It is usually{' '}
            <span className="font-mono text-zinc-200">1 ÷ your gross margin</span>: at 50% margin
            your breakeven is 2.0×. Everything is graded against this number, so it is the one
            field you must get right. Add your average order value (AOV), gross margin, daily
            budget, days running, and total business revenue if you have them. There is also a
            one-line box for what is worrying you — it shows up on your report.
          </p>
        </Step>
        <Step n="2" title="Ad metrics — copy from Ads Manager">
          <p>
            Copy the numbers from Ads Manager (use <strong className="text-zinc-200">Columns →
            Customise columns</strong> to show them): ad spend, impressions, reach, link clicks,
            landing page views, add to carts, checkouts initiated, purchases, and attributed
            revenue. Use the same date range for all of them — lifetime, or the last 7/14/30 days.
          </p>
          <p>
            Two optional dropdowns sharpen the grades: <strong className="text-zinc-200">where
            you sell</strong> (your market) and <strong className="text-zinc-200">what you
            sell</strong> (your product category). CPM is set by where your audience lives, CTR
            and CPC by what you sell, so the tool grades your numbers against your market and
            category instead of one generic table. Skip them and you get the generic benchmarks —
            the report says so. The verdict never changes either way: it comes from your own
            breakeven ROAS and target CPA.
          </p>
        </Step>
        <Step n="3" title="Creative + screenshot — video health">
          <p>
            Enter 3-second video views, thruplays (completions), and frequency — all three are
            columns in Ads Manager. They power the hook-rate, hold-rate, and fatigue checks. You
            can also upload a screenshot of your Ads Manager as a visual reference while you type.
            It is <strong className="text-zinc-200">reference only</strong>: this version does not
            read or analyse screenshots automatically, and nothing is sent to any AI.
          </p>
        </Step>
        <Step n="4" title="Review & run — check, then diagnose">
          <p>
            Check the essentials, then hit <strong className="text-zinc-200">Run diagnosis</strong>.
            The engine shows every rule it fired, with the math, so you can see exactly why the
            verdict is what it is. Not sure what a metric means? Tap the ⓘ next to any field for
            a plain-language explainer.
          </p>
        </Step>
        <p className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm leading-relaxed text-zinc-400">
          Not ready to type your own numbers?{' '}
          <Link href="/diagnose?sample=1" className="font-semibold text-lime-300 underline underline-offset-2">
            Run the sample diagnosis
          </Link>{' '}
          — a fictional D2C skincare campaign, fully filled in, so you can see a complete report
          before touching your own data. Same for the{' '}
          <Link href="/forecast?sample=1" className="font-semibold text-lime-300 underline underline-offset-2">
            sample forecast
          </Link>
          .
        </p>
      </Card>

      <Card className="mb-6 space-y-4 text-sm leading-relaxed text-zinc-300">
        <SectionTitle hint="No AI model, no black box. The rules are written down, and every verdict shows its working.">
          How the verdict is decided
        </SectionTitle>
        <p>
          The diagnosis is a <strong className="text-zinc-100">transparent rule-based engine</strong>:
          a set of written rules with thresholds, applied the same way every time. The same
          numbers always give the same verdict. There are five possible verdicts:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-lime-300">SCALE IT</strong> — ROAS is at least 1.15× your
            breakeven. A winner: raise the budget in steps.
          </li>
          <li>
            <strong className="text-sky-300">KEEP RUNNING</strong> — ROAS is within ±15% of your
            breakeven. Not a winner, not a loser: keep it running and fix the weakest link.
          </li>
          <li>
            <strong className="text-amber-300">FIX IT &amp; RETEST</strong> — ROAS is below 0.85×
            your breakeven, but the data shows fixable leaks rather than a dead campaign. Work the
            action list top-down.
          </li>
          <li>
            <strong className="text-red-300">KILL IT</strong> — zero purchases after spending twice
            your target CPA. The market has voted.
          </li>
          <li>
            <strong className="text-zinc-200">WAIT — NOT ENOUGH DATA</strong> — you have not spent
            roughly 1× your target CPA yet, so there is nothing solid to judge. The tool refuses
            to guess.
          </li>
        </ul>
        <p>
          The verdict comes from <strong className="text-zinc-100">your own economics</strong>:
          your ROAS against your breakeven, your cost per purchase against your target CPA (your
          AOV divided by your breakeven ROAS). Your business numbers decide; industry averages do
          not.
        </p>
        <p>
          The <em>grades</em> on individual signals — CTR, CPM, CPC, funnel rates — are compared
          against benchmarks. Where you gave a market and category, those benchmarks come from
          published 2026 data (Revealbot, WordStream, Triple Whale, Lebesgue) for your segment,
          and the report names the source. Where you skipped them, the generic D2C benchmarks
          apply. Either way, benchmarks are <strong className="text-zinc-100">starting points,
          not Meta-verified data</strong> — the best benchmark is always your own account history.
        </p>
        <p>
          Two gates protect you from bad calls on thin data. The{' '}
          <strong className="text-zinc-100">data-sufficiency gate</strong> holds the verdict at
          WAIT until the campaign has spent about 1× target CPA. The{' '}
          <strong className="text-zinc-100">learning-phase gate</strong> (forecast) refuses
          scale-or-pause calls until the campaign has about 50 optimisation events in a week —
          Meta&apos;s own rule for when delivery stabilises.
        </p>
      </Card>

      <Card className="mb-6 space-y-4 text-sm leading-relaxed text-zinc-300">
        <SectionTitle hint="Every section answers one question. Read top to bottom: verdict first, then why.">
          Reading your report
        </SectionTitle>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-zinc-100">Verdict</strong> — the call (scale / run / fix /
            kill / wait) and the one-paragraph reason, in plain words.
          </li>
          <li>
            <strong className="text-zinc-100">Data sufficiency</strong> — whether the campaign has
            spent enough for a real read, shown as a progress bar against your target CPA.
          </li>
          <li>
            <strong className="text-zinc-100">Ad signals</strong> — ROAS, cost per purchase, link
            CTR, CPC, CPM, frequency, and funnel rates, each graded Good / Watch / Bad against
            the benchmarks for your market and category, with a one-line explanation of why it
            matters.
          </li>
          <li>
            <strong className="text-zinc-100">Business metrics</strong> — MER (total business
            revenue ÷ ad spend) and POAS (profit on ad spend). Ad metrics can look fine while the
            business loses money; these two keep you honest.
          </li>
          <li>
            <strong className="text-zinc-100">Creative analysis</strong> — hook rate (who stopped
            scrolling in the first 3 seconds), hold rate (who stayed watching), and a fatigue
            warning when frequency climbs while CTR falls.
          </li>
          <li>
            <strong className="text-zinc-100">Funnel</strong> — impressions → link clicks →
            landing page views → add to carts → checkouts → purchases, with the conversion rate at
            each step.
          </li>
          <li>
            <strong className="text-zinc-100">Where your budget is leaking</strong> — the funnel
            in dollars. Each step shows how much of your spend died there, ranked biggest first,
            with one clear &ldquo;#1 focus&rdquo;. A step with a mediocre rate can waste more
            money than a step with a terrible rate — this is the view that tells you where to
            focus first.
          </li>
          <li>
            <strong className="text-zinc-100">Rules that fired</strong> — every rule behind the
            verdict, with its math. Full transparency: nothing is decided in secret.
          </li>
          <li>
            <strong className="text-zinc-100">Action items — change this</strong> — the fixes in
            order, each with the exact step to take in Ads Manager or your store. Work them
            top-down.
          </li>
        </ul>
      </Card>

      <Card className="mb-6 space-y-4 text-sm leading-relaxed text-zinc-300">
        <SectionTitle hint="For campaigns that have only spent part of their budget.">
          The forecast
        </SectionTitle>
        <p>
          The forecast answers one question: <em>you have spent $500 of a $5,000 budget — how is
          this campaign likely to land when the full budget is spent?</em> Enter what it has done
          so far (spend, CPM, CTR, landing page views, funnel rates, purchases, AOV, margin) and
          it projects the full budget at today&apos;s rates: expected purchases, revenue, CPA, and
          ROAS against your break-even.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-zinc-100">Learning-phase gate</strong> — the forecast refuses
            scale-or-pause calls until the campaign is near 50 optimisation events a week, and
            shows the minimum daily budget to get there: (target CPA × 50) ÷ 7.
          </li>
          <li>
            <strong className="text-zinc-100">Remaining-budget projection</strong> — what the
            unspent budget is likely to buy at today&apos;s rates, and the full-budget outcome.
          </li>
          <li>
            <strong className="text-zinc-100">Attribution window</strong> — the window the numbers
            come from, labelled on the report. Meta&apos;s 2026 default is 7-day click + 1-day
            view, plus a 1-day engage-through leg. The most recent days&apos; purchase data is
            still filling in, so early numbers can look worse than they are.
          </li>
          <li>
            <strong className="text-zinc-100">Confidence label</strong> — how much to trust the
            projection, based on how many purchases the campaign has so far. Few purchases means a
            wide range, and the report says so.
          </li>
        </ul>
        <p>
          A forecast is a <strong className="text-zinc-100">planning model, not a Meta
          prediction</strong>. It assumes today&apos;s rates hold; auctions, creative fatigue, and
          seasonality will move them.
        </p>
      </Card>

      <Card className="mb-6 space-y-4 text-sm leading-relaxed text-zinc-300">
        <SectionTitle hint="Real numbers, pulled straight from your ad account — with your permission, and only for reading.">
          Live data from Meta
        </SectionTitle>
        <p>
          If you connect your Meta ad account (free account required), the tools can pull spend,
          impressions, clicks, landing page views, purchases, revenue, frequency, and hook rate
          straight from the Meta Marketing API — no typing, no stale numbers. Only the fields
          Meta provides are filled in; your business numbers (breakeven ROAS, AOV, margin) still
          come from you, because Meta doesn&apos;t know them. A field Meta has no data for is
          left blank — nothing is ever invented.
        </p>
        <p>
          The connection is <strong className="text-zinc-100">read-only</strong> (ads_read). It
          can never create, edit, pause, or delete anything in Ads Manager. You approve it on
          Facebook, your token is stored encrypted and never touches the browser, and you can
          disconnect it any time from your dashboard.
        </p>
      </Card>

      <Card className="mb-6 space-y-4 text-sm leading-relaxed text-zinc-300">
        <SectionTitle hint="Honest limits — a tool that pretends to know everything is a tool you can't trust.">
          What it cannot do
        </SectionTitle>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-zinc-100">It cannot read your screenshots.</strong> Uploaded
            screenshots are a visual reference only. No AI reads them in this version.
          </li>
          <li>
            <strong className="text-zinc-100">It is D2C only, for now.</strong> Lead generation,
            local, and app-install campaigns are not supported yet.
          </li>
          <li>
            <strong className="text-zinc-100">Benchmarks are starting points.</strong> They are
            published third-party medians for your market and category — useful for grading, not
            gospel. Your own account history is always the better benchmark.
          </li>
          <li>
            <strong className="text-zinc-100">It advises; it does not run your ads.</strong> The
            verdict is a recommendation from your numbers. The final call — and the budget — is
            yours. It cannot see your creative quality, your offer strength, or your landing
            page beyond what the numbers show.
          </li>
          <li>
            <strong className="text-zinc-100">It is not Meta&apos;s AI.</strong> Meta&apos;s
            optimisation lives inside Ads Manager and cannot be called by any outside tool. This
            tool uses live data from Meta&apos;s API plus written rules built on Meta&apos;s
            published guidance.
          </li>
        </ul>
      </Card>

      <Card className="mb-6 space-y-4 text-sm leading-relaxed text-zinc-300">
        <SectionTitle hint="The practical bits.">
          Trying it, saving it, sharing it
        </SectionTitle>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-zinc-100">No sign-up to try.</strong> The full diagnosis and
            forecast run right in your browser. A free account (30-day trial, no credit card) is
            only needed to save results to your dashboard — and if you sign up after running one,
            your inputs are preserved, nothing to retype.
          </li>
          <li>
            <strong className="text-zinc-100">Track improvement.</strong> Save a diagnosis, fix
            the top action items, come back in a week with fresh numbers, and compare old vs new
            side by side to see whether it actually improved.
          </li>
          <li>
            <strong className="text-zinc-100">Take it with you.</strong> Every report can be
            copied, printed, or downloaded as CSV or XLSX (one sheet per section) for your
            records or your client.
          </li>
          <li>
            <strong className="text-zinc-100">Your numbers stay yours.</strong> Guest runs never
            leave your browser unless you save them. Saved diagnoses and screenshots are private
            to your account. We never sell your data — see the{' '}
            <Link href="/privacy" className="font-semibold text-lime-300 underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </li>
        </ul>
        <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:flex-wrap">
          <PrimaryLink href="/diagnose?sample=1">Try the sample diagnosis</PrimaryLink>
          <PrimaryLink href="/diagnose" className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700">
            Run your own diagnosis
          </PrimaryLink>
          <PrimaryLink href="/forecast" className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700">
            Run a forecast
          </PrimaryLink>
        </div>
      </Card>
    </div>
  );
}
