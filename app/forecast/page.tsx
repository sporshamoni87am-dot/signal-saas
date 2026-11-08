'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ATTRIBUTION_OPTIONS,
  forecast,
  type ForecastInputs,
  type ForecastResults,
} from '@/lib/forecast';
import { SAMPLE_FORECAST, SAMPLE_FORECAST_NOTE } from '@/lib/forecast-sample';
import { getTrial, saveForecast } from '@/lib/actions';
import { parseNum } from '@/lib/format';
import ForecastReport from '@/components/forecast-report';
import MetricHelp from '@/components/metric-help';
import { Card, Field, GhostButton, PageHeader, PrimaryButton, PrimaryLink, SectionTitle, inputClassName } from '@/components/ui';
import { cn } from '@/lib/cn';

/** localStorage keys for preserving guest (and logged-in) progress across signup. */
const FORECAST_STATE_KEY = 'signal:forecast-state:v1';
const FORECAST_RESULTS_KEY = 'signal:forecast-results:v1';

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
  market: string;
  totalBudget: string;
  spentSoFar: string;
  dailyBudget: string;
  daysRunning: string;
  cpm: string;
  impressionsActual: string;
  linkCtrPct: string;
  linkClicksActual: string;
  lpvActual: string;
  lpvRatePct: string;
  atcActual: string;
  atcRatePct: string;
  checkoutsActual: string;
  checkoutRatePct: string;
  purchaseRatePct: string;
  purchasesSoFar: string;
  aov: string;
  marginPct: string;
  targetProfit: string;
  hookRatePct: string;
  frequency: string;
  attribution: string;
};

const EMPTY: FormState = {
  campaignName: '',
  market: '',
  totalBudget: '',
  spentSoFar: '',
  dailyBudget: '',
  daysRunning: '',
  cpm: '',
  impressionsActual: '',
  linkCtrPct: '',
  linkClicksActual: '',
  lpvActual: '',
  lpvRatePct: '',
  atcActual: '',
  atcRatePct: '',
  checkoutsActual: '',
  checkoutRatePct: '',
  purchaseRatePct: '',
  purchasesSoFar: '',
  aov: '',
  marginPct: '',
  targetProfit: '0',
  hookRatePct: '',
  frequency: '',
  attribution: '7dc_1dv',
};

const BUDGET_FIELDS: NumFieldDef[] = [
  { name: 'campaignName', label: 'Campaign name', required: true },
  { name: 'market', label: 'Market / audience', hint: 'E.g. Netherlands + Belgium. Label only — it never changes the math.' },
  { name: 'totalBudget', label: 'Total budget', prefix: '$', hint: 'The full budget for this campaign. Leave blank to forecast only what has been spent so far.' },
  { name: 'spentSoFar', label: 'Spent so far', prefix: '$', required: true },
  { name: 'dailyBudget', label: 'Daily budget', prefix: '$', hint: 'For the spend-pace check.' },
  { name: 'daysRunning', label: 'Days running', required: true, hint: 'Powers the learning-phase pace and the spend-pace check.' },
];

const PERFORMANCE_FIELDS: NumFieldDef[] = [
  { name: 'cpm', label: 'CPM', prefix: '$', required: true, hint: 'Cost per 1,000 impressions. Fill this or impressions.' },
  { name: 'impressionsActual', label: 'Impressions (actual)', hint: 'Optional — overrides the CPM estimate when filled.' },
  { name: 'linkCtrPct', label: 'Link CTR', suffix: '%', required: true, hint: 'Link clicks ÷ impressions. Fill this or actual clicks.' },
  { name: 'linkClicksActual', label: 'Link clicks (actual)', hint: 'Optional — overrides the CTR estimate when filled.' },
  { name: 'lpvActual', label: 'Landing page views (actual)', hint: 'Optional — overrides the LPV rate when filled.' },
  { name: 'lpvRatePct', label: 'Click → LPV rate', suffix: '%', required: true, hint: 'Landing page views ÷ link clicks. A slow page drops this.' },
  { name: 'purchasesSoFar', label: 'Purchases so far', required: true, hint: 'Drives the learning-phase gate and the confidence label. 0 is fine.' },
  { name: 'aov', label: 'Average order value (AOV)', prefix: '$', required: true, helpTerm: 'AOV' },
  { name: 'marginPct', label: 'Contribution margin', suffix: '%', required: true, hint: 'AOV × margin − target profit = break-even CPA.', helpTerm: 'Contribution margin' },
  { name: 'targetProfit', label: 'Target profit per order', prefix: '$', hint: 'Leave 0 for a pure break-even target.' },
];

const FUNNEL_FIELDS: NumFieldDef[] = [
  { name: 'atcActual', label: 'Add to carts (actual)', hint: 'Optional — overrides the ATC rate when filled.' },
  { name: 'atcRatePct', label: 'LPV → add to cart rate', suffix: '%', required: true, hint: 'Good ≥8% of clicks (engine threshold).' },
  { name: 'checkoutsActual', label: 'Checkouts initiated (actual)', hint: 'Optional — overrides the checkout rate when filled.' },
  { name: 'checkoutRatePct', label: 'ATC → checkout rate', suffix: '%', required: true, hint: 'Good ≥60% (engine threshold).' },
  { name: 'purchaseRatePct', label: 'Checkout → purchase rate', suffix: '%', required: true, hint: 'Good ≥60% · watch ≥35% (engine threshold).' },
];

const CREATIVE_FIELDS: NumFieldDef[] = [
  { name: 'hookRatePct', label: 'Hook rate', suffix: '%', hint: '3-second video views ÷ impressions. Weak below 20%, strong above 30%.', helpTerm: 'Hook rate' },
  { name: 'frequency', label: 'Frequency', hint: 'Average impressions per person. Watch above 2.5, high above 4.0.', helpTerm: 'Frequency' },
];

const REQUIRED_MESSAGES: Record<string, string> = {
  campaignName: 'Give the forecast a name so you can find it later.',
  spentSoFar: 'Spent so far is required — everything is forecast from what the campaign has already done.',
  daysRunning: 'Days running is required for the learning-phase gate and the spend-pace check.',
  cpm: 'CPM is required (or fill in actual impressions).',
  linkCtrPct: 'Link CTR is required (or fill in actual link clicks).',
  lpvRatePct: 'Click → LPV rate is required (or fill in actual landing page views).',
  atcRatePct: 'LPV → add to cart rate is required (or fill in actual add to carts).',
  checkoutRatePct: 'ATC → checkout rate is required (or fill in actual checkouts).',
  purchaseRatePct: 'Checkout → purchase rate is required.',
  purchasesSoFar: 'Purchases so far is required — 0 is a real answer, it just means the campaign is still learning.',
  aov: 'Average order value is required to compute revenue and break-even.',
  marginPct: 'Contribution margin is required to compute break-even ROAS and CPA.',
};

function str(n: number | null): string {
  return n === null || n === undefined ? '' : String(n);
}

/** Prefill the form from the sample forecast (strings for the inputs). */
function sampleToForm(): FormState {
  const s = SAMPLE_FORECAST;
  return {
    campaignName: s.campaignName,
    market: s.market ?? '',
    totalBudget: str(s.totalBudget),
    spentSoFar: str(s.spentSoFar),
    dailyBudget: str(s.dailyBudget),
    daysRunning: str(s.daysRunning),
    cpm: str(s.cpm),
    impressionsActual: str(s.impressionsActual),
    linkCtrPct: str(s.linkCtrPct),
    linkClicksActual: str(s.linkClicksActual),
    lpvActual: str(s.lpvActual),
    lpvRatePct: str(s.lpvRatePct),
    atcActual: str(s.atcActual),
    atcRatePct: str(s.atcRatePct),
    checkoutsActual: str(s.checkoutsActual),
    checkoutRatePct: str(s.checkoutRatePct),
    purchaseRatePct: str(s.purchaseRatePct),
    purchasesSoFar: str(s.purchasesSoFar),
    aov: str(s.aov),
    marginPct: str(s.marginPct),
    targetProfit: str(s.targetProfit),
    hookRatePct: str(s.hookRatePct),
    frequency: str(s.frequency),
    attribution: s.attribution,
  };
}

type PersistedResults = { inputs: ForecastInputs; results: ForecastResults; liveSource?: LiveSourceInfo | null };

/** Live Meta data that pre-filled this forecast (for the report badge + save). */
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
  const isText = def.name === 'campaignName' || def.name === 'market';
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

function ForecastPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<string[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const isGuest = authReady && !uid;

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

  // Restore preserved progress (e.g. after returning from signup).
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = readStorage<{ form: FormState }>(FORECAST_STATE_KEY);
    if (saved) setForm({ ...EMPTY, ...saved.form });
    const savedResults = readStorage<PersistedResults>(FORECAST_RESULTS_KEY);
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
      window.localStorage.setItem(FORECAST_STATE_KEY, JSON.stringify({ form }));
    } catch {}
  }, [form]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (results) {
        window.localStorage.setItem(FORECAST_RESULTS_KEY, JSON.stringify(results));
      } else {
        window.localStorage.removeItem(FORECAST_RESULTS_KEY);
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

  // One-click sample forecast: ?sample=1 runs the full forecast immediately.
  const ranSample = useRef(false);
  useEffect(() => {
    if (searchParams.get('sample') === '1' && !ranSample.current) {
      ranSample.current = true;
      setForm(sampleToForm());
      setIsSample(true);
      setLiveSource(null);
      setResults({ inputs: SAMPLE_FORECAST, results: forecast(SAMPLE_FORECAST) });
      window.scrollTo({ top: 0 });
    }
  }, [searchParams]);

  function set(name: keyof FormState, v: string) {
    setForm((f) => ({ ...f, [name]: v }));
    setErrors((e) => e.filter((n) => n !== name));
  }

  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function buildInputs(): ForecastInputs {
    return {
      campaignName: form.campaignName.trim() || 'Untitled forecast',
      market: form.market.trim(),
      totalBudget: parseNum(form.totalBudget),
      spentSoFar: parseNum(form.spentSoFar) ?? 0,
      dailyBudget: parseNum(form.dailyBudget),
      daysRunning: parseNum(form.daysRunning),
      cpm: parseNum(form.cpm),
      impressionsActual: parseNum(form.impressionsActual),
      linkCtrPct: parseNum(form.linkCtrPct),
      linkClicksActual: parseNum(form.linkClicksActual),
      lpvActual: parseNum(form.lpvActual),
      lpvRatePct: parseNum(form.lpvRatePct),
      atcActual: parseNum(form.atcActual),
      atcRatePct: parseNum(form.atcRatePct),
      checkoutsActual: parseNum(form.checkoutsActual),
      checkoutRatePct: parseNum(form.checkoutRatePct),
      purchaseRatePct: parseNum(form.purchaseRatePct),
      purchasesSoFar: parseNum(form.purchasesSoFar),
      aov: parseNum(form.aov),
      marginPct: parseNum(form.marginPct),
      targetProfit: parseNum(form.targetProfit) ?? 0,
      hookRatePct: parseNum(form.hookRatePct),
      frequency: parseNum(form.frequency),
      attribution: form.attribution as ForecastInputs['attribution'],
    };
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!form.campaignName.trim()) errs.push('campaignName');
    if (parseNum(form.spentSoFar) === null) errs.push('spentSoFar');
    if (parseNum(form.daysRunning) === null) errs.push('daysRunning');
    if (parseNum(form.cpm) === null && parseNum(form.impressionsActual) === null) errs.push('cpm');
    if (parseNum(form.linkCtrPct) === null && parseNum(form.linkClicksActual) === null) errs.push('linkCtrPct');
    if (parseNum(form.lpvRatePct) === null && parseNum(form.lpvActual) === null) errs.push('lpvRatePct');
    if (parseNum(form.atcRatePct) === null && parseNum(form.atcActual) === null) errs.push('atcRatePct');
    if (parseNum(form.checkoutRatePct) === null && parseNum(form.checkoutsActual) === null) errs.push('checkoutRatePct');
    if (parseNum(form.purchaseRatePct) === null) errs.push('purchaseRatePct');
    if (parseNum(form.purchasesSoFar) === null) errs.push('purchasesSoFar');
    if (parseNum(form.aov) === null) errs.push('aov');
    if (parseNum(form.marginPct) === null) errs.push('marginPct');
    return errs;
  }

  function runForecast() {
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) {
      scrollTop();
      return;
    }
    const inputs = buildInputs();
    setIsSample(false);
    setResults({ inputs, results: forecast(inputs), liveSource });
    scrollTop();
  }

  /**
   * Pull live numbers from Meta for the chosen campaign + date range and
   * pre-fill the forecast. Only the fields Meta provides are overwritten —
   * business numbers (AOV, margin, funnel rates) still come from you,
   * because Meta doesn't know them. Rates are derived from the live counts
   * (CPM from spend/impressions, CTR from clicks/impressions, hook rate
   * from 3-sec views/impressions); a field Meta has no data for is left
   * blank and the form says so — nothing is invented.
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
      const num = (k: string): number | null => {
        const v = m[k];
        if (v === null || v === undefined || v === '') return null;
        const n = typeof v === 'number' ? v : Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const next: FormState = { ...form };
      const spend = num('adSpend');
      const impressions = num('impressions');
      const clicks = num('linkClicks');
      const video3s = num('videoViews3s');
      const revenue = num('attributedRevenue');
      const purchases = num('purchases');
      const setStr = (k: keyof FormState, v: number | null) => {
        if (v !== null) next[k] = String(v);
      };
      if (m.campaignName) next.campaignName = String(m.campaignName);
      setStr('spentSoFar', spend);
      setStr('dailyBudget', num('dailyBudget'));
      setStr('daysRunning', num('daysRunning'));
      setStr('impressionsActual', impressions);
      setStr('linkClicksActual', clicks);
      setStr('lpvActual', num('landingPageViews'));
      setStr('atcActual', num('addToCarts'));
      setStr('checkoutsActual', num('checkoutsInitiated'));
      setStr('purchasesSoFar', purchases);
      setStr('frequency', num('frequency'));
      // Derived rates — only when both sides exist.
      if (spend !== null && impressions !== null && impressions > 0) {
        next.cpm = String(Math.round((spend / impressions) * 1000 * 100) / 100);
      }
      if (clicks !== null && impressions !== null && impressions > 0) {
        next.linkCtrPct = String(Math.round((clicks / impressions) * 100 * 100) / 100);
      }
      if (video3s !== null && impressions !== null && impressions > 0) {
        next.hookRatePct = String(Math.round((video3s / impressions) * 100 * 100) / 100);
      }
      if (revenue !== null && purchases !== null && purchases > 0) {
        next.aov = String(Math.round((revenue / purchases) * 100) / 100);
      }
      setForm(next);
      if (json.source) setLiveSource(json.source);
      setLiveFlags(Array.isArray(json.flags) ? json.flags : []);
      setErrors([]);
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
      window.localStorage.removeItem(FORECAST_STATE_KEY);
      window.localStorage.removeItem(FORECAST_RESULTS_KEY);
    } catch {}
  }

  async function onSave() {
    if (!results) return;
    if (isGuest) {
      // Safety net — guests see a signup CTA instead of this button.
      router.push('/signup?next=/forecast');
      return;
    }
    setSaving(true);
    setSaveError(null);
    const res = await saveForecast({
      inputs: results.inputs,
      results: results.results,
      source: liveSource ? 'meta' : 'manual',
      metaCampaignId: liveSource?.objectId ?? null,
      metaDateRange:
        liveSource ? `${liveSource.since} → ${liveSource.until}` : null,
    });
    if (res.error === 'NOT_SIGNED_IN') {
      setSaving(false);
      router.push('/signup?next=/forecast');
      return;
    }
    if (res.error === 'TRIAL_EXPIRED') {
      setSaving(false);
      setSaveError(
        'Your free trial has ended — you can still view your past forecasts, but saving new ones is paused until paid plans launch. Nothing you saved is going anywhere.',
      );
      return;
    }
    if (res.error === 'FREE_LIMIT_REACHED') {
      setSaving(false);
      setSaveError('You’ve reached your plan’s limit. See the Plans page for options.');
      return;
    }
    if (res.error || !res.id) {
      setSaving(false);
      setSaveError(res.error ?? 'Could not save.');
      return;
    }
    clearPreserved();
    router.push(`/forecasts/${res.id}`);
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
        <PageHeader title="New forecast" sub="Early-stage campaign forecast" />
        <Card className="border-amber-400/40 bg-amber-400/5 text-center">
          <p className="text-lg font-semibold text-amber-200">Your free trial has ended</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
            You can still view all your past forecasts on the dashboard — nothing is locked
            away. Creating new forecasts is paused until paid plans launch.
          </p>
          <div className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
              View my forecasts
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
    <PrimaryLink href="/signup?next=/forecast" className="w-full sm:w-auto">Create your free account to save this forecast</PrimaryLink>
  ) : (
    <PrimaryButton onClick={onSave} disabled={saving} className="w-full sm:w-auto">
      {saving ? 'Saving…' : 'Save forecast'}
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
              ? 'Sample forecast — explore it, then run your own numbers.'
              : isGuest
                ? 'Your forecast is ready — create a free account to save it and compare it later.'
                : 'Your forecast is ready. Save it to compare against how the campaign actually lands.'
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
            {SAMPLE_FORECAST_NOTE}
          </p>
        )}
        {isGuest && (
          <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lime-400/40 bg-lime-400/5 px-4 py-3">
            <p className="text-sm text-zinc-300">
              <strong className="text-lime-200">Keep this forecast.</strong>{' '}
              A free account saves it to your dashboard — your inputs are preserved, nothing to retype.
            </p>
            <PrimaryLink href="/signup?next=/forecast" className="w-full shrink-0 px-4 py-2 sm:w-auto">
              Create free account
            </PrimaryLink>
          </div>
        )}
        {saveError && (
          <p className="no-print mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{saveError}</p>
        )}
        <ForecastReport
          inputs={results.inputs}
          results={results.results}
          liveSource={liveSource}
          generatedAt={new Date().toISOString()}
        />
        <div className="no-print mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <GhostButton onClick={() => { setResults(null); scrollTop(); }} className="w-full sm:w-auto">Edit inputs</GhostButton>
          {saveCta}
        </div>
      </div>
    );
  }

  // ---------------- form view ----------------
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader title="Early-stage forecast" sub="How will this campaign land? · no sign-up needed to try" />

      {isGuest && (
        <div className="no-print mb-6 rounded-xl border border-sky-400/30 bg-sky-400/5 px-4 py-3 text-sm leading-relaxed text-sky-200">
          <strong>Trying it out — no account needed.</strong> The full forecast runs right
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
            <Link href="/signup?next=/forecast" className="font-semibold text-lime-300 underline underline-offset-2">
              Create one
            </Link>{' '}
            to connect your Meta ad account — manual entry works right now.
          </p>
        )}

        {!isGuest && metaStatus && !metaStatus.configured && (
          <p className="mt-3 text-sm text-zinc-400">
            Meta connection is not set up on this site yet — the app keys are missing. Manual
            entry works for every forecast.
          </p>
        )}

        {!isGuest && metaStatus?.configured && !metaStatus.connected && (
          <div className="mt-3">
            <PrimaryLink href="/api/meta/auth?next=/forecast" className="w-full sm:w-auto">
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
                Ranges end yesterday — today&apos;s Meta data is still partial. This fills the ad
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
                  Ad numbers are filled from Meta. Still needed from you: AOV and margin (Meta
                  doesn&apos;t know your business numbers) and the funnel rates.
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

      {errors.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3" role="alert">
          <p className="text-sm font-semibold text-red-200">A few fields need your attention:</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-red-300">
            {errors.map((e) => (
              <li key={e}>{REQUIRED_MESSAGES[e] ?? e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Campaign & budget */}
      <Card className="mb-6">
        <SectionTitle hint="The money side — what the campaign costs and how long it has been running.">
          Campaign &amp; budget
        </SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {BUDGET_FIELDS.map((def) => (
            <NumField
              key={def.name}
              def={def}
              value={form[def.name]}
              onChange={(v) => set(def.name, v)}
              error={errors.includes(def.name)}
              errorText={REQUIRED_MESSAGES[def.name]}
            />
          ))}
        </div>
      </Card>

      {/* Ad performance */}
      <Card className="mb-6">
        <SectionTitle hint="What Meta is actually delivering — CPM, CTR, landing page views and the economics of each order.">
          Ad performance &amp; economics
        </SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PERFORMANCE_FIELDS.map((def) => (
            <NumField
              key={def.name}
              def={def}
              value={form[def.name]}
              onChange={(v) => set(def.name, v)}
              error={errors.includes(def.name)}
              errorText={REQUIRED_MESSAGES[def.name]}
            />
          ))}
        </div>
      </Card>

      {/* Funnel */}
      <Card className="mb-6">
        <SectionTitle hint="Clicks → landing page → add to cart → checkout → purchase. The leak shows you where to fix, not just that CPA is high.">
          Funnel rates
        </SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {FUNNEL_FIELDS.map((def) => (
            <NumField
              key={def.name}
              def={def}
              value={form[def.name]}
              onChange={(v) => set(def.name, v)}
              error={errors.includes(def.name)}
              errorText={REQUIRED_MESSAGES[def.name]}
            />
          ))}
        </div>
      </Card>

      {/* Creative + attribution */}
      <Card className="mb-6">
        <SectionTitle hint="Whether the ad itself is holding attention, and which attribution window the numbers come from.">
          Creative signals &amp; attribution
        </SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {CREATIVE_FIELDS.map((def) => (
            <NumField
              key={def.name}
              def={def}
              value={form[def.name]}
              onChange={(v) => set(def.name, v)}
              error={errors.includes(def.name)}
              errorText={REQUIRED_MESSAGES[def.name]}
            />
          ))}
          <Field
            label="Attribution window"
            hint="The window the numbers come from. It is printed on the report, so the forecast is never compared against a different window."
          >
            <select
              value={form.attribution}
              onChange={(e) => set('attribution', e.target.value)}
              className={inputClassName}
            >
              {ATTRIBUTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-zinc-500">
          Meta&apos;s 2026 default is 7-day click + 1-day view, plus a 1-day engage-through leg.
          The most recent days&apos; purchase data is still filling in — Meta counts a conversion on
          the day of the interaction, not the day of the purchase — so early numbers can look
          worse than they are.
        </p>
      </Card>

      {/* Sticky action bar on phones */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <PrimaryButton onClick={runForecast} className="w-full sm:w-auto">
              Run forecast
            </PrimaryButton>
            <GhostButton
              onClick={() => {
                setForm(sampleToForm());
                setIsSample(true);
                setLiveSource(null);
                setResults({ inputs: SAMPLE_FORECAST, results: forecast(SAMPLE_FORECAST) });
                scrollTop();
              }}
              className="w-full sm:w-auto"
            >
              Load sample
            </GhostButton>
          </div>
          <p className="text-center text-xs text-zinc-500 sm:text-right">
            Planning model — not a Meta prediction. No data leaves your browser.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ForecastPageWrapper() {
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
      <ForecastPage />
    </Suspense>
  );
}
