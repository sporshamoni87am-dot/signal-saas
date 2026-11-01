-- Meta Ads Signal Assistance — initial schema
-- Run this in the Supabase SQL editor (or via supabase db push).
-- Tables: profiles, diagnoses, subscriptions + private screenshots bucket.

-- ============================= profiles =============================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================= diagnoses =============================
create table if not exists public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  campaign_name text not null default 'Untitled campaign',
  verdict text not null default 'WAIT',
  inputs jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  screenshot_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diagnoses_user_id_created_idx
  on public.diagnoses (user_id, created_at desc);

-- ============================= subscriptions =============================
create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  status text not null default 'inactive',
  price_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- ============================= RLS =============================
alter table public.profiles enable row level security;
alter table public.diagnoses enable row level security;
alter table public.subscriptions enable row level security;

-- profiles: users read/update only their own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- diagnoses: users full access to only their own rows
drop policy if exists "diagnoses_all_own" on public.diagnoses;
create policy "diagnoses_all_own"
  on public.diagnoses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- subscriptions: users can read their own row.
-- Writes come from the Stripe webhook using the service-role key (bypasses RLS).
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- ============================= storage: screenshots =============================
-- Private bucket. Files are stored at <user_id>/<filename>.
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false)
on conflict (id) do nothing;

-- Users can upload into their own folder
drop policy if exists "screenshots_insert_own" on storage.objects;
create policy "screenshots_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own files (app generates signed URLs for display)
drop policy if exists "screenshots_select_own" on storage.objects;
create policy "screenshots_select_own"
  on storage.objects for select
  using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own files
drop policy if exists "screenshots_delete_own" on storage.objects;
create policy "screenshots_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
