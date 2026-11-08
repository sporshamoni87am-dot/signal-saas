'use client';

import { useState } from 'react';
import {
  VERDICT_META,
  type DiagnosisInputs,
  type DiagnosisResults,
} from '@/lib/engine';
import { buildSummaryText } from '@/lib/report-summary';
import {
  buildDiagnosisCsv,
  buildDiagnosisSections,
  diagnosisExportBaseName,
} from '@/lib/report-export';
import { fmtDateTime } from '@/lib/format';

/** Trigger a browser file download (same Blob + anchor pattern as forecast CSV). */
function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_LABEL: Record<string, string> = {
  good: 'Good',
  warn: 'Watch',
  bad: 'Bad',
  na: 'N/A',
};

const STATUS_DOT: Record<string, string> = {
  good: '#059669',
  warn: '#d97706',
  bad: '#dc2626',
  na: '#9ca3af',
};

/**
 * Copy + Print for a diagnosis. Renders:
 *  - on screen: two buttons (hidden in print via .no-print)
 *  - in print: a clean light-background document version of the report
 *    (the dark interactive report is hidden in print inside DiagnosisReport)
 */
export default function ReportActions({
  inputs,
  results,
  generatedAt,
}: {
  inputs: DiagnosisInputs;
  results: DiagnosisResults;
  generatedAt?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [xlsxBusy, setXlsxBusy] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(buildSummaryText(inputs, results));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions) — user can still print.
      setCopied(false);
    }
  }

  function onCsv() {
    const base = diagnosisExportBaseName(inputs, generatedAt);
    const csv = buildDiagnosisCsv(inputs, results, generatedAt);
    triggerDownload(
      `${base}.csv`,
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );
  }

  async function onXlsx() {
    // SheetJS is loaded on demand only — it never enters the initial bundle.
    setXlsxBusy(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      for (const section of buildDiagnosisSections(inputs, results, generatedAt)) {
        const rows = [section.header, ...section.rows];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        // Readable column widths from the longest cell in each column.
        ws['!cols'] = section.header.map((_, col) => {
          const longest = rows.reduce(
            (max, row) => Math.max(max, (row[col] ?? '').length),
            section.header[col].length,
          );
          return { wch: Math.min(64, Math.max(12, longest + 2)) };
        });
        XLSX.utils.book_append_sheet(wb, ws, section.title);
      }
      const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      triggerDownload(
        `${diagnosisExportBaseName(inputs, generatedAt)}.xlsx`,
        new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );
    } finally {
      setXlsxBusy(false);
    }
  }

  const meta = VERDICT_META[results.verdict];

  return (
    <>
      {/* Screen-only buttons */}
      <div className="no-print mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 sm:w-auto"
        >
          {copied ? '✓ Copied to clipboard' : '⧉ Copy summary'}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 sm:w-auto"
        >
          ⎙ Print / save PDF
        </button>
        <button
          type="button"
          onClick={onCsv}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 sm:w-auto"
        >
          ↓ Download CSV
        </button>
        <button
          type="button"
          onClick={onXlsx}
          disabled={xlsxBusy}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 disabled:opacity-60 sm:w-auto"
        >
          {xlsxBusy ? 'Preparing…' : '↓ Download XLSX'}
        </button>
      </div>

      {/* Print-only document (light, ink-friendly) */}
      <div className="hidden print:block" style={{ color: '#111827' }}>
        <div style={{ borderBottom: '3px solid #111827', paddingBottom: 16, marginBottom: 20 }}>
          <p style={{ fontSize: 12, letterSpacing: 2, color: '#6b7280' }}>
            META ADS SIGNAL ASSISTANCE · D2C DIAGNOSIS
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '6px 0' }}>{inputs.campaignName}</h1>
          <p style={{ fontSize: 13, color: '#4b5563' }}>
            {generatedAt ? fmtDateTime(generatedAt) : 'Just now'} · Rule-based engine · Benchmarks are
            adjustable starting points
          </p>
        </div>

        <div
          style={{
            border: '2px solid #111827',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 12, letterSpacing: 2, color: '#6b7280' }}>VERDICT</p>
          <p style={{ fontSize: 22, fontWeight: 800, margin: '4px 0' }}>{meta.title}</p>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>{results.verdictReason}</p>
        </div>

        <PrintSignalTable title="Ad signals" signals={results.adSignals} />
        <PrintSignalTable title="Business metrics" signals={results.businessMetrics} />

        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '18px 0 8px' }}>Creative</h2>
        <p style={{ fontSize: 13 }}>
          Hook rate:{' '}
          {results.creative.hookRate !== null
            ? `${(results.creative.hookRate * 100).toFixed(1)}%`
            : 'n/a'}{' '}
          ({STATUS_LABEL[results.creative.hookStatus]}) · Hold rate:{' '}
          {results.creative.holdRate !== null
            ? `${(results.creative.holdRate * 100).toFixed(1)}%`
            : 'n/a'}{' '}
          ({STATUS_LABEL[results.creative.holdStatus]})
        </p>
        <p style={{ fontSize: 13, marginTop: 4 }}>{results.creative.fatigueNote}</p>

        {results.actionItems.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '18px 0 8px' }}>
              Action items — do this, in order
            </h2>
            <ol style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 20 }}>
              {results.actionItems.map((a) => (
                <li key={a.priority} style={{ marginBottom: 8 }}>
                  <strong>{a.title}.</strong> {a.detail}
                  <br />
                  <em>In Ads Manager: {a.adsManagerStep}</em>
                </li>
              ))}
            </ol>
          </>
        )}

        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '18px 0 8px' }}>Rules that fired</h2>
        <ul style={{ fontSize: 12, lineHeight: 1.7, paddingLeft: 20, color: '#374151' }}>
          {results.rulesFired.map((r, i) => (
            <li key={i}>
              {r.rule} — <span style={{ fontFamily: 'monospace' }}>{r.math}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function PrintSignalTable({
  title,
  signals,
}: {
  title: string;
  signals: DiagnosisResults['adSignals'];
}) {
  if (!signals.length) return null;
  return (
    <>
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '18px 0 8px' }}>{title}</h2>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #111827', textAlign: 'left' }}>
            <th style={{ padding: '6px 8px 6px 0' }}>Signal</th>
            <th style={{ padding: '6px 8px' }}>Value</th>
            <th style={{ padding: '6px 0 6px 8px' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s) => (
            <tr key={s.key} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '6px 8px 6px 0', fontWeight: 600 }}>{s.label}</td>
              <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{s.display}</td>
              <td style={{ padding: '6px 0 6px 8px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    marginRight: 6,
                    background: STATUS_DOT[s.status] ?? '#9ca3af',
                  }}
                />
                {STATUS_LABEL[s.status] ?? s.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
