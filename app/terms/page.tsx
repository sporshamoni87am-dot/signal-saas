import type { Metadata } from 'next';
import { Card, PageHeader } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms governing your use of Meta Ads Signal Assistance.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Terms of Service"
        sub="The rules for using Meta Ads Signal Assistance."
      />

      <div className="mb-6 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-amber-200">
        <strong>Template notice:</strong> this is a starting-point template, not legal advice.
        Have a qualified lawyer review and adapt it before your public launch —
        especially once you collect payments.
      </div>

      <Card className="space-y-5 text-sm leading-relaxed text-zinc-300">
        <section>
          <h2 className="text-base font-semibold text-zinc-100">1. What this tool is</h2>
          <p className="mt-1.5">
            Meta Ads Signal Assistance provides rule-based, metric-focused campaign diagnoses
            for education and decision support. It is not financial advice, and its outputs are
            only as good as the numbers you enter. Benchmarks shown are adjustable starting
            points, not verified platform data.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-100">2. Free trial</h2>
          <p className="mt-1.5">
            New accounts receive a 30-day free trial with full access and no payment method
            required. When the trial ends, you can still view your past diagnoses, but creating
            new ones is paused until paid plans become available.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-100">3. Acceptable use</h2>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            <li>Use the service only for campaigns and accounts you are authorized to manage.</li>
            <li>Don&apos;t attempt to access other users&apos; data or disrupt the service.</li>
            <li>Don&apos;t misrepresent the tool&apos;s outputs as guaranteed results to clients.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-100">4. Your data</h2>
          <p className="mt-1.5">
            You own the campaign data you enter. We store it to provide the service (see the{' '}
            <a href="/privacy" className="text-lime-300 underline underline-offset-2">
              Privacy Policy
            </a>
            ). Deleting a diagnosis permanently removes it and its screenshot.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-100">5. No warranties; limitation of liability</h2>
          <p className="mt-1.5">
            The service is provided &quot;as is&quot;. Ad decisions (killing, scaling, or
            changing campaigns) remain your responsibility. To the maximum extent permitted by
            law, we are not liable for advertising outcomes or business losses resulting from
            use of the tool.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-100">6. Changes</h2>
          <p className="mt-1.5">
            We may update these terms as the product evolves (for example, when paid plans
            launch). Material changes will be announced inside the app.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-100">7. Contact</h2>
          <p className="mt-1.5">
            Questions about these terms: <span className="font-mono text-zinc-100">[your support email]</span>.
          </p>
        </section>

        <p className="text-xs text-zinc-500">Last updated: [date] · Version: template v1</p>
      </Card>
    </div>
  );
}
