-- Meta Ads Signal Assistance — Meta Marketing API (Phase 1, read-only)
-- Run this in the Supabase SQL editor AFTER 001_init.sql and 002_trial.sql.
--
-- Tables: connected_accounts (one row per user + ad account).
-- Also adds source columns to diagnoses so a saved diagnosis can show its
-- "Live data from Meta" badge later.
--
-- TOKEN STORAGE — why this shape:
-- Meta access tokens are stored ENCRYPTED, not plaintext. The app encrypts
-- with AES-256-GCM using the server env key META_TOKEN_ENCRYPTION_KEY
-- (generate with: openssl rand -hex 32) and stores the packed value
-- (v1.<iv>.<ciphertext>.<tag>) in `encrypted_token`. Tokens are decrypted
-- ONLY inside server-side API routes — they are never sent to the browser,
-- never stored in localStorage, and never appear in any API response.
-- If the encryption key is ever rotated, users must reconnect their Meta
-- account (old tokens become undecryptable — by design, not by accident).
-- Row Level Security limits every row to its owner (auth.uid() = user_id).

-- ============================= connected_accounts =============================
create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'meta',
  meta_user_id text,
  meta_user_name text,
  ad_account_id text not null,
  ad_account_name text,
  account_status text,
  account_currency text,
  -- AES-256-GCM packed token (v1.<iv-hex>.<ciphertext-hex>.<tag-hex>).
  -- NEVER store a plaintext Meta token in this table.
  encrypted_token text not null,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, ad_account_id)
);

create index if not exists connected_accounts_user_id_idx
  on public.connected_accounts (user_id);

alter table public.connected_accounts enable row level security;

-- Users can do everything with ONLY their own connected accounts.
drop policy if exists "connected_accounts_all_own" on public.connected_accounts;
create policy "connected_accounts_all_own"
  on public.connected_accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================= diagnoses: data source =============================
-- source = 'manual' (typed by hand) or 'meta' (pulled live from the API).
-- meta_campaign_id / meta_date_range record WHAT was diagnosed, so the
-- "Live data from Meta" badge survives on saved diagnoses.
alter table public.diagnoses
  add column if not exists source text not null default 'manual';
alter table public.diagnoses
  add column if not exists meta_campaign_id text;
alter table public.diagnoses
  add column if not exists meta_date_range text;
