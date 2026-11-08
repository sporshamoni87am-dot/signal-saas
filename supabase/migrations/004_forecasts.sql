-- Meta Ads Signal Assistance — saved forecasts (early-stage forecast)
-- Run this in the Supabase SQL editor AFTER 001_init.sql.
-- Mirrors the diagnoses pattern: one row per saved forecast, JSON inputs
-- and computed results, RLS so a user only ever sees their own rows.
-- Forecasts are NOT yet runnable before this migration — the app degrades
-- gracefully (saving fails with a plain message) until it has run.

create table if not exists public.forecasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  campaign_name text not null default 'Untitled forecast',
  inputs jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  -- source = 'manual' (typed by hand) or 'meta' (pulled live from the API).
  source text not null default 'manual',
  meta_campaign_id text,
  meta_date_range text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forecasts_user_id_created_idx
  on public.forecasts (user_id, created_at desc);

alter table public.forecasts enable row level security;

-- Users full access to only their own rows.
drop policy if exists "forecasts_all_own" on public.forecasts;
create policy "forecasts_all_own"
  on public.forecasts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
