'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, GhostButton, PrimaryLink, SectionTitle } from '@/components/ui';

interface MetaAccount {
  id: string;
  adAccountId: string;
  name: string;
  status: string | null;
  currency: string | null;
  metaUserName: string | null;
  tokenExpiresAt: string | null;
  connectedAt: string;
}

interface MetaStatus {
  configured: boolean;
  connected: boolean;
  accounts: MetaAccount[];
}

const ERROR_TEXT: Record<string, string> = {
  not_configured:
    'Meta connection is not set up on this site yet — the app keys are missing. Manual entry still works.',
  denied: 'You cancelled the Meta connection. Nothing was connected — try again whenever you like.',
  bad_state:
    'The connection did not complete (the security check failed). Try again — it usually works second time.',
  session_expired: 'Your session expired while connecting. Sign in and try again.',
  no_accounts:
    'Meta connected, but no ad accounts were found on that Facebook user. Make sure the user has access to at least one ad account.',
  token: 'Your Meta connection expired or was revoked. Reconnect below.',
  permission: 'Meta refused the request — the app may be missing a permission.',
  rate_limit: 'Meta is rate-limiting requests right now. Wait a few minutes and try again.',
  api: 'Something went wrong talking to Meta. Try again.',
};

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Connect / manage the Meta ad account link. Read-only: connecting only
 * lets the tool PULL live numbers — it can never change anything in the
 * ad account.
 */
export default function MetaConnect({ next = '/dashboard' }: { next?: string }) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/meta/status', { cache: 'no-store' });
      const json = (await res.json()) as MetaStatus;
      setStatus(json);
    } catch {
      setStatus({ configured: false, connected: false, accounts: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Surface the result of a connect attempt (?meta=connected / ?meta_error=…).
  useEffect(() => {
    if (searchParams.get('meta') === 'connected') {
      setNotice('✓ Meta account connected — your ad accounts are listed below.');
      load();
    }
    const err = searchParams.get('meta_error');
    if (err) {
      setNotice(ERROR_TEXT[err] ?? 'The Meta connection did not complete. Try again.');
      load();
    }
  }, [searchParams, load]);

  async function disconnect(id: string) {
    setDisconnecting(id);
    try {
      await fetch(`/api/meta/accounts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      setNotice('Disconnected. Live data for that account is no longer available here.');
      await load();
    } catch {
      setNotice('Could not disconnect that account. Try again.');
    } finally {
      setDisconnecting(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <p className="animate-pulse text-sm text-zinc-500">Checking Meta connection…</p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle hint="Read-only: the tool pulls live numbers from your ad account. It can never create, edit, pause, or change anything there.">
        Meta ad account
      </SectionTitle>

      {notice && (
        <p className="mb-4 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-200" role="status">
          {notice}
        </p>
      )}

      {!status?.configured && (
        <p className="text-sm leading-relaxed text-zinc-400">
          Meta connection is not set up on this site yet — the app keys are missing. Manual entry
          still works for every diagnosis; the site owner needs to add the Meta app credentials to
          enable live data.
        </p>
      )}

      {status?.configured && !status.connected && (
        <div>
          <p className="text-sm leading-relaxed text-zinc-400">
            Connect your Meta ad account once, and the wizard can pull live spend, clicks,
            purchases and revenue straight from Ads Manager — no typing, no stale numbers.
          </p>
          <div className="mt-4">
            <PrimaryLink href={`/api/meta/auth?next=${encodeURIComponent(next)}`}>
              Connect Meta account
            </PrimaryLink>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            You approve this on Facebook. The app only asks for read access (ads_read) — it cannot
            change your ads.
          </p>
        </div>
      )}

      {status?.configured && status.connected && (
        <div>
          <ul className="space-y-3">
            {status.accounts.map((a) => {
              const days = daysUntil(a.tokenExpiresAt);
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-zinc-100">{a.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Ad account {a.adAccountId}
                      {a.currency ? ` · ${a.currency}` : ''}
                      {a.metaUserName ? ` · via ${a.metaUserName}` : ''}
                    </p>
                    {days !== null && (
                      <p className={days < 7 ? 'mt-0.5 text-xs text-amber-300' : 'mt-0.5 text-xs text-zinc-500'}>
                        {days < 0
                          ? 'Connection expired — reconnect to use live data.'
                          : `Connection valid for about ${days} more day${days === 1 ? '' : 's'} — reconnect when it expires.`}
                      </p>
                    )}
                  </div>
                  <GhostButton
                    onClick={() => disconnect(a.id)}
                    disabled={disconnecting === a.id}
                    className="px-4 py-2 text-xs"
                  >
                    {disconnecting === a.id ? 'Disconnecting…' : 'Disconnect'}
                  </GhostButton>
                </li>
              );
            })}
          </ul>
          <div className="mt-4">
            <PrimaryLink href={`/api/meta/auth?next=${encodeURIComponent(next)}`} className="px-4 py-2 text-xs">
              Connect another account
            </PrimaryLink>
          </div>
        </div>
      )}
    </Card>
  );
}
