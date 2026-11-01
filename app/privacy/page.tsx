import type { Metadata } from 'next';
import { Card, PageHeader } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Meta Ads Signal Assistance collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Privacy Policy"
        sub="How we collect, use, and protect your data."
      />

      <div className="mb-6 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-amber-200">
        <strong>Template notice:</strong> this is a starting-point template, not legal advice.
        Have a qualified lawyer review and adapt it before your public launch —
        especially once you collect payments.
      </div>

      <Card className="prose-sm space-y-5 text-sm leading-relaxed text-zinc-300">
        <section>
          <h2 className="text-base font-semibold text-zinc-100">1. What we collect</h2>
          <p className="mt-1.5">
            <strong className="text-zinc-100">Account data:</strong> your email address and
            password (stored securely via our authentication provider) when you create an account.
          </p>
          <p className="mt-1.5">
            <strong className="text-zinc-100">Diagnosis data:</strong> the campaign numbers you
            type in (spend, clicks, revenue, and similar metrics), your campaign names, problem
            statements, and the diagnoses we generate from them.
          </p>
          <p className="mt-1.5">
            <strong className="text-zinc-100">Screenshots:</strong> images you upload are stored
            privately in your account and are shown to you only as a visual reference. They are
            never analyzed automatically in the current version and never shared.
          </p>
          <p className="mt-1.5">
            <strong className="text-zinc-100">Billing data (future):</strong> when paid plans
            launch, payments are processed by Stripe. We never see or store your card details.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-100">2. How we use it</h2>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            <li>To run the diagnosis engine on the numbers you provide.</li>
            <li>To save your diagnosis history so you can track improvement over time.</li>
            <li>To manage your trial access and, later, your subscription.</li>
            <li>To communicate about your account and important product changes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-100">3. What we don&apos;t do</h2>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            <li>We don&apos;t sell your data. Ever.</li>
            <li>We don&apos;t share your campaign data with advertisers or third parties.</li>
            <li>We don&apos;t use your data to train machine-learning models.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-100">4. Data security &amp; your rights</h2>
          <p className="mt-1.5">
            Your data is stored with row-level access controls: you can only ever see your own
            diagnoses. You can delete any diagnosis (including its screenshot) at any time from
            your dashboard, and you can request full deletion of your account by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-100">5. Contact</h2>
          <p className="mt-1.5">
            For privacy questions or deletion requests, contact:{' '}
            <span className="font-mono text-zinc-100">[your support email]</span>.
          </p>
        </section>

        <p className="text-xs text-zinc-500">Last updated: [date] · Version: template v1</p>
      </Card>
    </div>
  );
}
