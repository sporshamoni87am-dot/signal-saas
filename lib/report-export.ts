import {
  VERDICT_META,
  type DiagnosisInputs,
  type DiagnosisResults,
} from '@/lib/engine';
import { fmtInt, fmtMoney } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = {
  good: 'Good',
  warn: 'Watch',
  bad: 'Bad',
  na: 'N/A',
};

/**
 * Diagnosis export — CSV + XLSX share one canonical set of sections so both
 * files always contain exactly the same content. Pure data, no DOM: the
 * component builds the Blob / workbook from what these functions return.
 */

export interface DiagnosisExportSection {
  /** Sheet name in XLSX; section title line in CSV. */
  title: string;
  header: string[];
  rows: string[][];
}

function money(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : fmtMoney(v);
}

function int(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : fmtInt(v);
}

function pct(v: number | null | undefined, digits = 0): string {
  return v === null || v === undefined || !Number.isFinite(v)
    ? '—'
    : `${(v * 100).toFixed(digits)}%`;
}

function plain(v: number | null | undefined): string {
  return v === null || v === undefined || !Number.isFinite(v) ? '—' : String(v);
}

function statusLabel(s: string): string {
  return STATUS_LABEL[s] ?? s;
}

/** One section per report area, in report order. */
export function buildDiagnosisSections(
  inputs: DiagnosisInputs,
  results: DiagnosisResults,
  generatedAt?: string | null,
): DiagnosisExportSection[] {
  const meta = VERDICT_META[results.verdict];
  const ds = results.dataSufficiency;
  const c = results.creative;

  const summary: DiagnosisExportSection = {
    title: 'Summary',
    header: ['Field', 'Value'],
    rows: [
      ['Campaign', inputs.campaignName || 'Untitled campaign'],
      ['Generated', generatedAt ?? 'Just now'],
      ['Campaign type', inputs.campaignType],
      ['Verdict', meta.title],
      ['Verdict reason', results.verdictReason],
      ['Enough data?', ds.sufficient ? 'Yes' : 'No'],
      ['Data note', ds.note],
      ['Target CPA', money(ds.targetCpa)],
      ['Spend vs target CPA', pct(ds.spendProgress)],
      ['Daily budget', money(inputs.dailyBudget)],
      ['Days running', plain(inputs.daysRunning)],
      ['AOV', money(inputs.aov)],
      ['Gross margin', pct(inputs.grossMarginPct === null ? null : inputs.grossMarginPct / 100)],
      ['Break-even ROAS', inputs.breakevenRoas === null ? '—' : `${inputs.breakevenRoas.toFixed(2)}x`],
      ['Ad spend', money(inputs.adSpend)],
      ['Impressions', int(inputs.impressions)],
      ['Reach', int(inputs.reach)],
      ['Link clicks', int(inputs.linkClicks)],
      ['Landing page views', int(inputs.landingPageViews)],
      ['Add to carts', int(inputs.addToCarts)],
      ['Checkouts initiated', int(inputs.checkoutsInitiated)],
      ['Purchases', int(inputs.purchases)],
      ['Attributed revenue', money(inputs.attributedRevenue)],
      ['Total business revenue', money(inputs.totalBusinessRevenue)],
      ['3-sec video views', int(inputs.videoViews3s)],
      ['Thruplays', int(inputs.videoThruplays)],
      ['Frequency', plain(inputs.frequency)],
      ['Problem statement', inputs.problemStatement || '—'],
    ],
  };

  const signalRows = (signals: DiagnosisResults['adSignals']) =>
    signals.map((s) => [
      s.label,
      s.display,
      statusLabel(s.status),
      s.benchmark,
      s.explanation,
    ]);

  const funnel: DiagnosisExportSection = {
    title: 'Funnel',
    header: ['Stage', 'Count', 'Rate from previous'],
    rows: results.funnel.map((f) => [f.stage, int(f.count), f.rateFromPrev]),
  };

  const leaks: DiagnosisExportSection = {
    title: 'Budget leaks',
    header: ['From stage', 'To stage', 'People lost', 'Spend wasted', 'Share of waste'],
    rows: results.leakRanking
      ? results.leakRanking.steps.map((s) => [
          s.fromStage,
          s.toStage,
          int(s.lost),
          money(s.wastedSpend),
          pct(s.shareOfWaste, 1),
        ])
      : [
          [
            'Not available — this diagnosis has no budget-leak ranking (older save, or ad spend / link clicks missing).',
            '',
            '',
            '',
            '',
          ],
        ],
  };

  const creative: DiagnosisExportSection = {
    title: 'Creative',
    header: ['Metric', 'Value', 'Status'],
    rows: [
      ['Hook rate', c.hookRate === null ? '—' : pct(c.hookRate, 1), statusLabel(c.hookStatus)],
      ['Hold rate', c.holdRate === null ? '—' : pct(c.holdRate, 1), statusLabel(c.holdStatus)],
      ['Creative fatigue', c.fatigue ? 'Yes' : 'No', c.fatigue ? 'Watch' : 'Good'],
      ['Fatigue note', c.fatigueNote, '—'],
    ],
  };

  const rules: DiagnosisExportSection = {
    title: 'Rules',
    header: ['Rule', 'Detail', 'Math'],
    rows: results.rulesFired.map((r) => [r.rule, r.detail, r.math]),
  };

  const actions: DiagnosisExportSection = {
    title: 'Action items',
    header: ['Priority', 'Action', 'Detail', 'In Ads Manager'],
    rows: results.actionItems.map((a) => [
      String(a.priority),
      a.title,
      a.detail,
      a.adsManagerStep,
    ]),
  };

  return [
    summary,
    { title: 'Ad signals', header: ['Signal', 'Value', 'Status', 'Benchmark', 'Why it matters'], rows: signalRows(results.adSignals) },
    { title: 'Business metrics', header: ['Signal', 'Value', 'Status', 'Benchmark', 'Why it matters'], rows: signalRows(results.businessMetrics) },
    funnel,
    leaks,
    creative,
    rules,
    actions,
  ];
}

/** RFC 4180 cell: quote when the value holds a comma, quote or newline. */
export function csvCell(value: string): string {
  const v = value ?? '';
  return /[",\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
}

/** Full diagnosis as CSV text — sections in report order, blank line between. */
export function buildDiagnosisCsv(
  inputs: DiagnosisInputs,
  results: DiagnosisResults,
  generatedAt?: string | null,
): string {
  const sections = buildDiagnosisSections(inputs, results, generatedAt);
  const lines: string[] = [];
  for (const section of sections) {
    if (lines.length > 0) lines.push('');
    lines.push(section.title);
    lines.push(section.header.map(csvCell).join(','));
    for (const row of section.rows) {
      lines.push(row.map(csvCell).join(','));
    }
  }
  return lines.join('\n');
}

/**
 * File base name: adsignalpro-diagnosis-<campaign-slug>-<yyyy-mm-dd>.
 * Generated date comes from the saved diagnosis when present, else today.
 */
export function diagnosisExportBaseName(
  inputs: DiagnosisInputs,
  generatedAt?: string | null,
): string {
  const slug = (inputs.campaignName || 'campaign')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'campaign';
  const date = generatedAt ? new Date(generatedAt) : new Date();
  const ymd = Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);
  return `adsignalpro-diagnosis-${slug}-${ymd}`;
}
