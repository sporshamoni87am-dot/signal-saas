'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { diagnose, type DiagnosisInputs, type DiagnosisResults } from '@/lib/engine';
import { getTrial, saveDiagnosis } from '@/lib/actions';
import { parseNum } from '@/lib/format';
import { SAMPLE_CAMPAIGN, SAMPLE_NOTE } from '@/lib/sample-campaign';
import DiagnosisReport from '@/components/diagnosis-report';
import ReportActions from '@/components/report-actions';
import MetricHelp from '@/components/metric-help';
import { Card, Field, GhostButton, PageHeader, PrimaryButton, PrimaryLink, SectionTitle, inputClassName } from '@/components/ui';
import { cn } from '@/lib/cn';

const STEP_TITLES = ['Campaign setup', 'Ad metrics', 'Creative + screenshot', 'Review & run'];

/** localStorage keys for preserving guest (and logged-in) progress across signup. */
const WIZARD_STATE_KEY = 'signal:wizard-state:v1';
const WIZARD_RESULTS_KEY = 'signal:wizard-results:v1';

interface NumFieldDef {
  name: keyof FormState;
  label: string;
  hint?: string;
  required?: boolean;
  prefix?: string;
  suffix?: string;
  /** Glossary term for the ⓘ explainer. */
  helpTerm?: string;
}

type FormState = {
  campaignName: string;
  breakevenRoas: string;
  dailyBudget: string;
  aov: string;
  grossMarginPct: string;
  daysRunning: string;
  totalBusinessRevenue: string;
  problemStatement: string;
  adSpend: string;
  impressions: string;
  reach: string;
  linkClicks: string;
  addToCarts: string;
  checkoutsInitiated: string;
  purchases: string;
  attributedRevenue: string;
  videoViews3s: string;
  videoThruplays: string;
  frequency: string;
};

const EMPTY: FormState = {
  campaignName: '',
  breakevenRoas: '',
  dailyBudget: '',
  aov: '',
  grossMarginPct: '',
  daysRunning: '',
  totalBusinessRevenue: '',
  problemStatement: '',
  adSpend: '',
  impressions: '',
  reach: '',
  linkClicks: '',
  addToCarts: '',
  checkoutsInitiated: '',
  purchases: '',
  attributedRevenue: '',
  videoViews3s: '',
  videoThruplays: '',
  frequency: '',
};

const SETUP_FIELDS: NumFieldDef[] = [
  { name: 'campaignName', label: 'Campaign name', required: true },
  { name: 'breakevenRoas', label: 'Breakeven / target ROAS', required: true, suffix: '×', hint: 'The ROAS at which you break even. E.g. 2.0.', helpTerm: 'Breakeven ROAS' },
  { name: 'dailyBudget', label: 'Daily budget', prefix: '$' },
  { name: 'aov', label: 'Average order value (AOV)', prefix: '$', hint: 'Needed to compute your target CPA.', helpTerm: 'AOV' },
  { name: 'grossMarginPct', label: 'Gross margin %', suffix: '%', hint: 'After product + shipping costs. Powers POAS.', helpTerm: 'Gross margin' },
  { name: 'daysRunning', label: 'Days running' },
  { name: 'totalBusinessRevenue', label: 'Total business revenue (same period)', prefix: '$', hint: 'All revenue, all channels — for blended MER.', helpTerm: 'MER' },
];

const AD_FIELDS: NumFieldDef[] = [
  { name: 'adSpend', label: 'Ad spend', required: true, prefix: '$' },
  { name: 'impressions', label: 'Impressions' },
  { name: 'reach', label: 'Reach' },
  { name: 'linkClicks', label: 'Link clicks', helpTerm: 'Link CTR' },
  { name: 'addToCarts', label: 'Add to carts' },
  { name: 'checkoutsInitiated', label: 'Checkouts initiated' },
  { name: 'purchases', label: 'Purchases', required: true },
  { name: 'attributedRevenue', label: 'Attributed revenue (Meta)', required: true, prefix: '$', helpTerm: 'ROAS' },
];

const CREATIVE_FIELDS: NumFieldDef[] = [
  { name: 'videoViews3s', label: '3-sec video views', hint: 'From Ads Manager video metrics.', helpTerm: 'Hook rate' },
  { name: 'videoThruplays', label: 'Video thruplays / completions', helpTerm: 'Hold rate' },
  { name: 'frequency', label: 'Frequency', hint: 'Average impressions per person.', helpTerm: 'Frequency' },
];

const REQUIRED_MESSAGES: Record<string, string> = {
  campaignName: 'Give the campaign a name so you can find it later.',
  breakevenRoas: 'Breakeven ROAS is required — every signal is graded against it.',
  adSpend: 'Ad spend is required to compute ROAS and verdicts.',
  purchases: 'Purchases are required to compute ROAS and CPA.',
  attributedRevenue: 'Attributed revenue is required to compute ROAS.',
};

function str(n: number | null): string {
  return n === null || n === undefined ? '' : String(n);
}

/** Prefill the form from the sample campaign (strings for the inputs). */
function sampleToForm(): FormState {
  const s = SAMPLE_CAMPAIGN;
  return {
    campaignName: s.campaignName,
    breakevenRoas: str(s.breakevenRoas),
    dailyBudget: str(s.dailyBudget),
    aov: str(s.aov),
    grossMarginPct: str(s.grossMarginPct),
    daysRunning: str(s.daysRunning),
    totalBusinessRevenue: str(s.totalBusinessRevenue),
    problemStatement: s.problemStatement,
    adSpend: str(s.adSpend),
    impressions: str(s.impressions),
    reach: str(s.reach),
    linkClicks: str(s.linkClicks),
    addToCarts: str(s.addToCarts),
    checkoutsInitiated: str(s.checkoutsInitiated),
    purchases: str(s.purchases),
    attributedRevenue: str(s.attributedRevenue),
    videoViews3s: str(s.videoViews3s),
    videoThruplays: str(s.videoThruplays),
    frequency: str(s.frequency),
  };
}

type PersistedResults = { inputs: DiagnosisInputs; results: DiagnosisResults };

function readStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function NumField({
  def,
  value,
  onChange,
  error,
  errorText,
}: {
  def: NumFieldDef;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  errorText?: string;
}) {
  const isText = def.name === 'campaignName' || def.name === 'problemStatement';
  return (
    <Field
      label={
        <span>
          {def.label + (def.required ? ' *' : '')}
          {def.helpTerm && <MetricHelp term={def.helpTerm} />}
        </span>
      }
      hint={def.hint}
    >
      <div className="relative">
        {def.prefix && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">{def.prefix}</span>
        )}
        {isText ? (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(inputClassName, error && 'border-red-500/70')}
            placeholder={def.label}
            aria-invalid={error}
          />
        ) : (
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(inputClassName, def.prefix && 'pl-8', def.suffix && 'pr-10', error && 'border-red-500/70')}
            placeholder="0"
            aria-invalid={error}
          />
        )}
        {def.suffix && !isText && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">{def.suffix}</span>
        )}
      </div>
      {error && errorText && <p className="mt-1.5 text-xs font-medium text-red-300">{errorText}</p>}
    </Field>
  );
}

function DiagnoseWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const isGuest = authReady && !uid;

  const [shotFile, setShotFile] = useState<File | null>(null);
  const [shotPreview, setShotPreview] = useState<string | null>(null);
  const [shotPath, setShotPath] = useState<string | null>(null);
  const [shotUploading, setShotUploading] = useState(false);
  const [shotError, setShotError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [results, setResults] = useState<PersistedResults | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [trialState, setTrialState] = useState<'loading' | 'active' | 'expired'>('loading');

  // Tracks whether the current upload was consumed by a successful save,
  // so the orphan-cleanup below doesn't delete a saved screenshot.
  const savedRef = useRef(false);
  const shotPathRef = useRef<string | null>(null);
  shotPathRef.current = shotPath;

  // Restore preserved progress (e.g. after returning from signup).
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = readStorage<{ form: FormState; step: number }>(WIZARD_STATE_KEY);
    if (saved) {
      setForm({ ...EMPTY, ...saved.form });
      setStep(Math.min(3, Math.max(0, saved.step ?? 0)));
    }
    const savedResults = readStorage<PersistedResults>(WIZARD_RESULTS_KEY);
    if (savedResults && savedResults.inputs && savedResults.results) {
      setResults(savedResults);
    }
  }, []);

  // Persist progress so nothing is lost across signup / refresh.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(WIZARD_STATE_KEY, JSON.stringify({ form, step }));
    } catch {}
  }, [form, step]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (results) {
        window.localStorage.setItem(WIZARD_RESULTS_KEY, JSON.stringify(results));
      } else {
        window.localStorage.removeItem(WIZARD_RESULTS_KEY);
      }
    } catch {}
  }, [results]);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUid(data.user?.id ?? null))
      .catch(() => setUid(null))
      .finally(() => setAuthReady(true));
    // Guests get a neutral non-expired state from the server action — no
    // redirect, no throw. Logged-out callers are handled gracefully.
    getTrial()
      .then((t) => setTrialState(t.expired ? 'expired' : 'active'))
      .catch(() => setTrialState('active'));
  }, []);

  // Orphan cleanup: if the wizard unmounts (navigate away, close tab) with an
  // uploaded-but-unsaved screenshot, delete it via sendBeacon so it doesn't
  // linger in Storage forever. Saved diagnoses are never touched.
  // Guests never upload (preview-only), so this is a no-op for them.
  useEffect(() => {
    return () => {
      const path = shotPathRef.current;
      if (path && !savedRef.current && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ path })], { type: 'application/json' });
        navigator.sendBeacon('/api/screenshots/cleanup', blob);
      }
    };
  }, []);

  // One-click sample campaign: ?sample=1 runs the full diagnosis immediately.
  const ranSample = useRef(false);
  useEffect(() => {
    if (searchParams.get('sample') === '1' && !ranSample.current) {
      ranSample.current = true;
      setForm(sampleToForm());
      setIsSample(true);
      setResults({ inputs: SAMPLE_CAMPAIGN, results: diagnose(SAMPLE_CAMPAIGN) });
      window.scrollTo({ top: 0 });
    }
  }, [searchParams]);

  // Clean up the preview object URL.
  useEffect(() => {
    return () => {
      if (shotPreview) URL.revokeObjectURL(shotPreview);
    };
  }, [shotPreview]);

  function set(name: keyof FormState, v: string) {
    setForm((f) => ({ ...f, [name]: v }));
    // Clear the error for this field as the user fixes it.
    setErrors((e) => e.filter((n) => n !== name));
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateStep(s: number): string[] {
    const errs: string[] = [];
    if (s === 0) {
      if (!form.campaignName.trim()) errs.push('campaignName');
      if (parseNum(form.breakevenRoas) === null) errs.push('breakevenRoas');
    }
    if (s === 1) {
      if (parseNum(form.adSpend) === null) errs.push('adSpend');
      if (parseNum(form.purchases) === null) errs.push('purchases');
      if (parseNum(form.attributedRevenue) === null) errs.push('attributedRevenue');
    }
    return errs;
  }

  function next() {
    const errs = validateStep(step);
    setErrors(errs);
    if (errs.length === 0) {
      setStep((s) => Math.min(3, s + 1));
      scrollTop();
    }
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
    scrollTop();
  }

  async function onPickScreenshot(file: File | undefined) {
    if (!file) return;
    setShotError(null);
    setShotFile(file);
    if (shotPreview) URL.revokeObjectURL(shotPreview);
    setShotPreview(URL.createObjectURL(file));
    // Auth still resolving — ask to re-select once it's settled.
    if (!authReady) {
      setShotError('Still signing you in — wait a moment and re-select the file.');
      return;
    }
    // Guests: client-side preview only. No user id → no storage upload, no DB
    // row, nothing leaves the browser.
    if (!uid) return;
    // If replacing a previous upload, delete the old file so it can't orphan.
    if (shotPath) {
      fetch('/api/screenshots/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: shotPath }),
        keepalive: true,
      }).catch(() => {});
      setShotPath(null);
    }
    setShotUploading(true);
    try {
      const supabase = createClient();
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      const path = `${uid}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from('screenshots').upload(path, file, {
        contentType: file.type || 'image/png',
        upsert: false,
      });
      if (error) throw error;
      setShotPath(path);
    } catch (e) {
      setShotError(e instanceof Error ? e.message : 'Upload failed. You can still continue without it.');
      setShotPath(null);
    } finally {
      setShotUploading(false);
    }
  }

  function buildInputs(): DiagnosisInputs {
    return {
      campaignType: 'D2C',
      campaignName: form.campaignName.trim() || 'Untitled campaign',
      breakevenRoas: parseNum(form.breakevenRoas),
      dailyBudget: parseNum(form.dailyBudget),
      aov: parseNum(form.aov),
      grossMarginPct: parseNum(form.grossMarginPct),
      daysRunning: parseNum(form.daysRunning),
      totalBusinessRevenue: parseNum(form.totalBusinessRevenue),
      problemStatement: form.problemStatement.trim(),
      adSpend: parseNum(form.adSpend),
      impressions: parseNum(form.impressions),
      reach: parseNum(form.reach),
      linkClicks: parseNum(form.linkClicks),
      addToCarts: parseNum(form.addToCarts),
      checkoutsInitiated: parseNum(form.checkoutsInitiated),
      purchases: parseNum(form.purchases),
      attributedRevenue: parseNum(form.attributedRevenue),
      videoViews3s: parseNum(form.videoViews3s),
      videoThruplays: parseNum(form.videoThruplays),
      frequency: parseNum(form.frequency),
    };
  }

  function runDiagnosis() {
    const inputs = buildInputs();
    setIsSample(false);
    setResults({ inputs, results: diagnose(inputs) });
    scrollTop();
  }

  function clearPreserved() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(WIZARD_STATE_KEY);
      window.localStorage.removeItem(WIZARD_RESULTS_KEY);
    } catch {}
  }

  async function onSave() {
    if (!results) return;
    if (isGuest) {
      // Safety net — guests see a signup CTA instead of this button.
      router.push('/signup?next=/diagnose');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const res = await saveDiagnosis({
      inputs: results.inputs,
      results: results.results,
      screenshotPath: shotPath,
    });
    if (res.error === 'NOT_SIGNED_IN') {
      setSaving(false);
      router.push('/signup?next=/diagnose');
      return;
    }
    if (res.error === 'TRIAL_EXPIRED') {
      setSaving(false);
      setSaveError(
        'Your free trial has ended — you can still view your past diagnoses, but creating new ones is paused until paid plans launch. Nothing you saved is going anywhere.',
      );
      return;
    }
    if (res.error === 'FREE_LIMIT_REACHED') {
      setSaving(false);
      setSaveError('You’ve reached your plan’s diagnosis limit. See the Plans page for options.');
      return;
    }
    if (res.error || !res.id) {
      setSaving(false);
      setSaveError(res.error ?? 'Could not save.');
      return;
    }
    savedRef.current = true;
    clearPreserved();
    router.push(`/diagnoses/${res.id}`);
  }

  // ---------------- trial gate (logged-in users only; guests always pass) ----------------
  if (trialState === 'loading') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center text-sm text-zinc-500">
          Loading…
        </div>
      </div>
    );
  }

  if (trialState === 'expired') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <PageHeader title="New diagnosis" sub="D2C campaign" />
        <Card className="border-amber-400/40 bg-amber-400/5 text-center">
          <p className="text-lg font-semibold text-amber-200">Your free trial has ended</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
            You can still view all your past diagnoses on the dashboard — nothing is locked
            away. Creating new diagnoses is paused until paid plans launch.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className="rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
              View my diagnoses
            </Link>
            <Link href="/billing" className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500">
              See plans
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const saveCta = isGuest ? (
    <PrimaryLink href="/signup?next=/diagnose">Create your free account to save this diagnosis</PrimaryLink>
  ) : (
    <PrimaryButton onClick={onSave} disabled={saving}>
      {saving ? 'Saving…' : 'Save diagnosis'}
    </PrimaryButton>
  );

  // ---------------- results view ----------------
  if (results) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <PageHeader
          title={results.inputs.campaignName}
          sub={
            isSample
              ? 'Sample diagnosis — explore it, then run your own numbers.'
              : isGuest
                ? 'Your diagnosis is ready — create a free account to save it and track this campaign over time.'
                : 'Your diagnosis is ready. Save it to track this campaign over time.'
          }
          actions={
            <div className="no-print flex flex-wrap items-center gap-2">
              <GhostButton onClick={() => { setResults(null); scrollTop(); }}>Edit inputs</GhostButton>
              {saveCta}
            </div>
          }
        />
        {isSample && (
          <p className="no-print mb-4 rounded-xl border border-sky-400/30 bg-sky-400/5 px-4 py-3 text-sm text-sky-200">
            {SAMPLE_NOTE}
          </p>
        )}
        {isGuest && (
          <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lime-400/40 bg-lime-400/5 px-4 py-3">
            <p className="text-sm text-zinc-300">
              <strong className="text-lime-200">Keep this diagnosis.</strong>{' '}
              A free account saves it to your dashboard — your inputs are preserved, nothing to retype.
            </p>
            <PrimaryLink href="/signup?next=/diagnose" className="shrink-0 px-4 py-2">
              Create free account
            </PrimaryLink>
          </div>
        )}
        {saveError && (
          <p className="no-print mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{saveError}</p>
        )}
        <ReportActions inputs={results.inputs} results={results.results} />
        <DiagnosisReport inputs={results.inputs} results={results.results} screenshotUrl={shotPreview} />
        <div className="no-print mt-6 flex flex-wrap justify-end gap-2">
          <GhostButton onClick={() => { setResults(null); scrollTop(); }}>Edit inputs</GhostButton>
          {saveCta}
        </div>
      </div>
    );
  }

  // ---------------- wizard view ----------------
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader title="New diagnosis" sub="D2C campaign · about 2 minutes · no sign-up needed to try" />

      {isGuest && (
        <div className="no-print mb-6 rounded-xl border border-sky-400/30 bg-sky-400/5 px-4 py-3 text-sm leading-relaxed text-sky-200">
          <strong>Trying it out — no account needed.</strong> The full diagnosis runs right
          here. Saving it to your dashboard needs a free account (30-day trial, no credit card) —
          and your inputs are kept, so nothing is lost if you sign up after.
        </div>
      )}

      {/* Step indicator */}
      <nav aria-label="Diagnosis steps" className="mb-2 flex items-center gap-2">
        {STEP_TITLES.map((t, idx) => (
          <div key={t} className="flex flex-1 items-center gap-2">
            <div className="flex flex-col gap-1.5">
              <span
                aria-current={idx === step ? 'step' : undefined}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  idx < step && 'bg-lime-400 text-zinc-950',
                  idx === step && 'bg-lime-400/20 text-lime-300 ring-2 ring-lime-400/60',
                  idx > step && 'bg-zinc-800 text-zinc-500',
                )}
              >
                {idx < step ? '✓' : idx + 1}
              </span>
              <span className={cn('hidden text-[11px] font-medium sm:block', idx === step ? 'text-zinc-200' : 'text-zinc-500')}>{t}</span>
            </div>
            {idx < STEP_TITLES.length - 1 && <div className={cn('mb-5 h-px flex-1 transition-colors', idx < step ? 'bg-lime-400/60' : 'bg-zinc-800')} />}
          </div>
        ))}
      </nav>
      <p className="mb-6 text-xs font-medium text-zinc-500 sm:hidden">
        Step {step + 1} of {STEP_TITLES.length} — {STEP_TITLES[step]}
      </p>
      <div className="mb-6 hidden h-1 overflow-hidden rounded-full bg-zinc-800 sm:block" aria-hidden>
        <div
          className="h-full rounded-full bg-lime-400 transition-all duration-300"
          style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }}
        />
      </div>

      <Card>
        <div key={step} className="step-enter">
        {step === 0 && (
          <div>
            <SectionTitle hint="The basics. Breakeven ROAS is required — everything is graded against it.">
              {STEP_TITLES[0]}
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {SETUP_FIELDS.map((def) => (
                <div key={def.name} className={def.name === 'campaignName' || def.name === 'totalBusinessRevenue' ? 'sm:col-span-2' : ''}>
                  <NumField
                    def={def}
                    value={form[def.name]}
                    onChange={(v) => set(def.name, v)}
                    error={errors.includes(def.name)}
                    errorText={errors.includes(def.name) ? REQUIRED_MESSAGES[def.name] : undefined}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Field label="One-line problem statement" hint="What’s worrying you about this campaign? Shown on your report.">
                <textarea
                  value={form.problemStatement}
                  onChange={(e) => set('problemStatement', e.target.value)}
                  rows={2}
                  className={inputClassName}
                  placeholder="e.g. Spending $50/day, clicks are cheap but nobody buys"
                />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <SectionTitle hint="Copy these from Ads Manager (lifetime or your date range). Leave blank anything you don’t track — tap ⓘ on any metric for a plain-language explainer.">
              {STEP_TITLES[1]}
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {AD_FIELDS.map((def) => (
                <NumField
                  key={def.name}
                  def={def}
                  value={form[def.name]}
                  onChange={(v) => set(def.name, v)}
                  error={errors.includes(def.name)}
                  errorText={errors.includes(def.name) ? REQUIRED_MESSAGES[def.name] : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <SectionTitle hint="Video health + an optional screenshot for reference.">{STEP_TITLES[2]}</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              {CREATIVE_FIELDS.map((def) => (
                <NumField key={def.name} def={def} value={form[def.name]} onChange={(v) => set(def.name, v)} />
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
              <p className="text-sm font-semibold text-amber-200">Screenshot — REFERENCE ONLY</p>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
                This version <strong className="text-zinc-200">does not read or analyze</strong> your screenshot
                automatically. It’s displayed next to the form so you can copy numbers from it while you type.
                Nothing is sent to any AI.
              </p>
              <div className="mt-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickScreenshot(e.target.files?.[0])}
                />
                <GhostButton type="button" onClick={() => fileRef.current?.click()} disabled={shotUploading}>
                  {shotUploading ? 'Uploading…' : shotFile ? 'Replace screenshot' : 'Upload screenshot'}
                </GhostButton>
                {shotError && <p className="mt-2 text-xs text-red-300">{shotError}</p>}
                {shotPreview && (
                  <div className="mt-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shotPreview} alt="Screenshot preview (reference only)" className="max-h-56 w-auto rounded-lg border border-zinc-700" />
                    <p className="mt-1.5 text-xs text-zinc-500">
                      {uid
                        ? (shotPath ? '✓ Uploaded privately to your account.' : 'Preview only — upload pending.')
                        : 'Preview only — it stays in your browser. Create a free account to attach it when you save.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <SectionTitle hint="Check the essentials, then run. The engine shows every rule and its math.">
              {STEP_TITLES[3]}
            </SectionTitle>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ['Campaign', form.campaignName || '—'],
                ['Breakeven ROAS', form.breakevenRoas ? `${form.breakevenRoas}×` : '—'],
                ['Ad spend', form.adSpend ? `$${form.adSpend}` : '—'],
                ['Purchases', form.purchases || '—'],
                ['Attributed revenue', form.attributedRevenue ? `$${form.attributedRevenue}` : '—'],
                ['AOV', form.aov ? `$${form.aov}` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                  <dt className="text-xs text-zinc-500">{k}</dt>
                  <dd className="mt-0.5 font-mono text-sm text-zinc-100">{v}</dd>
                </div>
              ))}
            </dl>
            {form.problemStatement.trim() !== '' && (
              <p className="mt-4 border-l-2 border-zinc-700 pl-3 text-sm italic text-zinc-400">“{form.problemStatement}”</p>
            )}
          </div>
        )}

        {errors.length > 0 && (
          <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300" role="alert">
            Please fill in the required fields marked in red.
          </p>
        )}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-5">
          <GhostButton onClick={back} disabled={step === 0}>
            ← Back
          </GhostButton>
          {step < 3 ? (
            <PrimaryButton onClick={next}>Continue →</PrimaryButton>
          ) : (
            <PrimaryButton onClick={runDiagnosis}>Run diagnosis ⚡</PrimaryButton>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function DiagnosePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60 p-10 text-center text-sm text-zinc-500">
            Loading…
          </div>
        </div>
      }
    >
      <DiagnoseWizard />
    </Suspense>
  );
}
