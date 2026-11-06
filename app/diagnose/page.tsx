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

type PersistedResults = { inputs: DiagnosisInputs; results: DiagnosisResults; liveSource?: LiveSourceInfo | null };

/** Live Meta data that pre-filled this diagnosis (for the report badge + save). */
interface LiveSourceInfo {
  provider: 'meta';
  accountId: string;
  accountName: string | null;
  objectId: string;
  objectName: string | null;
  level: string;
  since: string;
  until: string;
  currency: string | null;
}

interface MetaAccountOption {
  id: string;
  adAccountId: string;
  name: string;
  status: string | null;
  currency: string | null;
  tokenExpiresAt: string | null;
}

interface MetaCampaignOption {
  id: string;
  name: string;
  status: string;
  objective: string | null;
  dailyBudget: number | null;
}

const META_ERROR_TEXT: Record<string, string> = {
  not_configured: 'Meta connection is not set up on this site yet — the app keys are missing. Manual entry still works.',
  denied: 'You cancelled the Meta connection. Nothing was connected.',
  bad_state: 'The connection did not complete (the security check failed). Try again.',
  session_expired: 'Your session expired while connecting. Try again.',
  no_accounts: 'Meta connected, but no ad accounts were found on that Facebook user.',
  token: 'Your Meta connection expired or was revoked. Reconnect from the dashboard.',
  permission: 'Meta refused the request — the app may be missing a permission.',
  rate_limit: 'Meta is rate-limiting requests right now. Wait a few minutes and try again.',
  api: 'Something went wrong talking to Meta. Try again.',
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Date range ending yesterday — today's Meta data is still partial. */
function presetRange(days: number): { since: string; until: string } {
  const until = new Date();
  until.setUTCDate(until.getUTCDate() - 1);
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  return { since: isoDate(since), until: isoDate(until) };
}

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

  // ---------------- Meta live data ----------------
  const [metaStatus, setMetaStatus] = useState<{ configured: boolean; connected: boolean; accounts: MetaAccountOption[] } | null>(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [campaigns, setCampaigns] = useState<MetaCampaignOption[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [datePreset, setDatePreset] = useState<'7' | '14' | '30' | 'custom'>('30');
  const [customSince, setCustomSince] = useState('');
  const [customUntil, setCustomUntil] = useState('');
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveFlags, setLiveFlags] = useState<string[]>([]);
  const [liveSource, setLiveSource] = useState<LiveSourceInfo | null>(null);

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
      if (savedResults.liveSource) setLiveSource(savedResults.liveSource);
    }
  }, []);

  // Meta connection status (logged-in users only — guests can't connect).
  useEffect(() => {
    if (!authReady || !uid) return;
    fetch('/api/meta/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        setMetaStatus(j);
        if (Array.isArray(j.accounts) && j.accounts.length === 1) {
          setSelectedAccount(j.accounts[0].adAccountId);
        }
      })
      .catch(() => setMetaStatus({ configured: false, connected: false, accounts: [] }));
  }, [authReady, uid]);

  // Campaigns for the chosen ad account.
  useEffect(() => {
    if (!selectedAccount || !uid) {
      setCampaigns([]);
      setSelectedCampaign('');
      return;
    }
    let cancelled = false;
    setCampaignsLoading(true);
    fetch(`/api/meta/campaigns?account_id=${encodeURIComponent(selectedAccount)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (Array.isArray(j.campaigns)) setCampaigns(j.campaigns);
        if (j.error) setLiveError(j.error as string);
      })
      .catch(() => {
        if (!cancelled) setLiveError('Could not load campaigns from Meta.');
      })
      .finally(() => {
        if (!cancelled) setCampaignsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAccount, uid]);

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
      setLiveSource(null);
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
    setResults({ inputs, results: diagnose(inputs), liveSource });
    scrollTop();
  }

  /**
   * Pull live numbers from Meta for the chosen campaign + date range and
   * pre-fill the wizard. Only the fields Meta provides are overwritten —
   * business numbers (breakeven ROAS, AOV, margin) still come from you,
   * because Meta doesn't know them.
   */
  async function useLiveData() {
    if (!selectedAccount || !selectedCampaign) return;
    setLiveLoading(true);
    setLiveError(null);
    setLiveFlags([]);
    try {
      const range =
        datePreset === 'custom'
          ? { since: customSince, until: customUntil }
          : presetRange(Number(datePreset));
      if (!range.since || !range.until || range.until < range.since) {
        throw new Error('Pick a valid date range first.');
      }
      const qs = new URLSearchParams({
        account_id: selectedAccount,
        object_id: selectedCampaign,
        level: 'campaign',
        since: range.since,
        until: range.until,
      });
      const res = await fetch(`/api/meta/insights?${qs.toString()}`);
      const json = (await res.json()) as {
        inputs?: Record<string, number | string | null>;
        flags?: string[];
        source?: LiveSourceInfo;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? 'Could not fetch live data.');
      const m = json.inputs ?? {};
      const metaFields: (keyof FormState)[] = [
        'campaignName',
        'dailyBudget',
        'adSpend',
        'impressions',
        'reach',
        'linkClicks',
        'addToCarts',
        'checkoutsInitiated',
        'purchases',
        'attributedRevenue',
        'videoViews3s',
        'videoThruplays',
        'frequency',
        'daysRunning',
      ];
      const next: FormState = { ...form };
      for (const f of metaFields) {
        const v = m[f];
        if (v !== null && v !== undefined && v !== '') next[f] = String(v);
      }
      setForm(next);
      if (json.source) setLiveSource(json.source);
      setLiveFlags(Array.isArray(json.flags) ? json.flags : []);
      setErrors([]);
      // Jump to step 1 so the filled ad numbers are visible immediately.
      setStep(1);
      scrollTop();
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : 'Could not fetch live data.');
    } finally {
      setLiveLoading(false);
    }
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
      source: liveSource ? 'meta' : 'manual',
      metaCampaignId: liveSource?.objectId ?? null,
      metaDateRange:
        liveSource ? `${liveSource.since} → ${liveSource.until}` : null,
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
          <div className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
              View my diagnoses
            </Link>
            <Link href="/billing" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500">
              See plans
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const saveCta = isGuest ? (
    <PrimaryLink href="/signup?next=/diagnose" className="w-full sm:w-auto">Create your free account to save this diagnosis</PrimaryLink>
  ) : (
    <PrimaryButton onClick={onSave} disabled={saving} className="w-full sm:w-auto">
      {saving ? 'Saving…' : 'Save diagnosis'}
    </PrimaryButton>
  );

  // Result of a Meta connect attempt while on this page (?meta=connected / ?meta_error=…).
  const connectError = searchParams.get('meta_error');
  const connectDone = searchParams.get('meta') === 'connected';

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
            <div className="no-print flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <GhostButton onClick={() => { setResults(null); scrollTop(); }} className="w-full sm:w-auto">Edit inputs</GhostButton>
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
            <PrimaryLink href="/signup?next=/diagnose" className="w-full shrink-0 px-4 py-2 sm:w-auto">
              Create free account
            </PrimaryLink>
          </div>
        )}
        {saveError && (
          <p className="no-print mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{saveError}</p>
        )}
        <ReportActions inputs={results.inputs} results={results.results} />
        <DiagnosisReport inputs={results.inputs} results={results.results} screenshotUrl={shotPreview} liveSource={liveSource} />
        <div className="no-print mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <GhostButton onClick={() => { setResults(null); scrollTop(); }} className="w-full sm:w-auto">Edit inputs</GhostButton>
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

      {/* Live data from Meta — pull real numbers instead of typing them.
          Guests can't connect (needs a free account, same as saving). */}
      <div className="no-print mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5">
        <p className="text-sm font-semibold text-zinc-100">⚡ Live data from Meta</p>
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
          Pull spend, clicks, purchases and revenue straight from your ad account — no typing,
          no stale numbers. Read-only: it can never change anything in Ads Manager.
        </p>

        {connectDone && (
          <p className="mt-3 rounded-xl border border-lime-400/40 bg-lime-400/5 px-3.5 py-2.5 text-sm text-lime-200">
            ✓ Meta account connected — pick an ad account and campaign below.
          </p>
        )}
        {connectError && (
          <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300" role="alert">
            {META_ERROR_TEXT[connectError] ?? 'The Meta connection did not complete. Try again.'}
          </p>
        )}

        {isGuest && (
          <p className="mt-3 text-sm text-zinc-300">
            Live data needs a free account.{' '}
            <Link href="/signup?next=/diagnose" className="font-semibold text-lime-300 underline underline-offset-2">
              Create one
            </Link>{' '}
            to connect your Meta ad account — manual entry works right now.
          </p>
        )}

        {!isGuest && metaStatus && !metaStatus.configured && (
          <p className="mt-3 text-sm text-zinc-400">
            Meta connection is not set up on this site yet — the app keys are missing. Manual
            entry works for every diagnosis.
          </p>
        )}

        {!isGuest && metaStatus?.configured && !metaStatus.connected && (
          <div className="mt-3">
            <PrimaryLink href="/api/meta/auth?next=/diagnose" className="w-full sm:w-auto">
              Connect Meta account
            </PrimaryLink>
            <p className="mt-2 text-xs text-zinc-500">
              You approve this on Facebook. The app only asks for read access (ads_read).
            </p>
          </div>
        )}

        {!isGuest && metaStatus?.configured && metaStatus.connected && (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-300">Ad account</span>
                <select
                  value={selectedAccount}
                  onChange={(e) => {
                    setSelectedAccount(e.target.value);
                    setSelectedCampaign('');
                    setLiveError(null);
                  }}
                  className={inputClassName}
                >
                  {metaStatus.accounts.map((a) => (
                    <option key={a.id} value={a.adAccountId}>
                      {a.name} ({a.adAccountId})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-300">Campaign</span>
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  disabled={!selectedAccount || campaignsLoading}
                  className={inputClassName}
                >
                  <option value="">
                    {campaignsLoading ? 'Loading campaigns…' : 'Pick a campaign'}
                  </option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-zinc-300">Date range</span>
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as '7' | '14' | '30' | 'custom')}
                  className={inputClassName}
                >
                  <option value="7">Last 7 days</option>
                  <option value="14">Last 14 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="custom">Custom range…</option>
                </select>
              </label>
              {datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-zinc-300">From</span>
                    <input type="date" value={customSince} onChange={(e) => setCustomSince(e.target.value)} className={inputClassName} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-zinc-300">To</span>
                    <input type="date" value={customUntil} onChange={(e) => setCustomUntil(e.target.value)} className={inputClassName} />
                  </label>
                </div>
              )}
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <PrimaryButton onClick={useLiveData} disabled={!selectedCampaign || liveLoading} className="w-full sm:w-auto">
                {liveLoading ? 'Pulling live data…' : 'Use live data'}
              </PrimaryButton>
              <p className="text-xs text-zinc-500">
                Ranges end yesterday — today&apos;s Meta data is still partial. This replaces the ad
                numbers below with live values.
              </p>
            </div>
            {liveError && (
              <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300" role="alert">
                {liveError}
              </p>
            )}
            {liveSource && (
              <div className="rounded-xl border border-lime-400/40 bg-lime-400/5 px-4 py-3">
                <p className="text-sm font-semibold text-lime-200">
                  ✓ Live data loaded — {liveSource.objectName ?? 'campaign'} · {liveSource.since} → {liveSource.until}
                </p>
                <p className="mt-1 text-[13px] text-zinc-400">
                  Ad numbers are filled from Meta. Still needed from you: breakeven ROAS, AOV and
                  gross margin — Meta doesn&apos;t know your business numbers.
                </p>
                {liveFlags.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-amber-200/90">
                    {liveFlags.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

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
      {/* Progress bar is always visible (was hidden on phones): the thin
          bar is the clearest "where am I" signal on a small screen. */}
      <div className="mb-6 h-1 overflow-hidden rounded-full bg-zinc-800" aria-hidden>
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

        {/* Sticky on phones: Back / Continue stays pinned to the bottom of
            the viewport while the step scrolls, so the next action is always
            one thumb-tap away. Static on desktop. The bar bleeds to the
            card's edges with a blurred backdrop and safe-area padding so it
            never covers content unreadably or sits under the home indicator. */}
        <div className="sticky bottom-0 z-20 -mx-4 -mb-4 mt-6 flex items-center justify-between gap-3 rounded-b-2xl border-t border-zinc-800 bg-zinc-900/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:static sm:z-auto sm:mx-0 sm:mb-0 sm:rounded-none sm:border-zinc-800 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-5 sm:backdrop-blur-none">
          <GhostButton onClick={back} disabled={step === 0}>
            ← Back
          </GhostButton>
          {step < 3 ? (
            <PrimaryButton onClick={next} className="flex-1 justify-center sm:flex-none">Continue →</PrimaryButton>
          ) : (
            <PrimaryButton onClick={runDiagnosis} className="flex-1 justify-center sm:flex-none">Run diagnosis ⚡</PrimaryButton>
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
