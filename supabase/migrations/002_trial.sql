-- Meta Ads Signal Assistance — free 30-day trial (no payment method required)
-- Run AFTER 001_init.sql in the Supabase SQL editor.
--
-- Every profile gets trial_ends_at = signup time + 30 days.
-- While BILLING_ENABLED=false the app uses only this column for access control:
--   - trial active   → full access, unlimited diagnoses
--   - trial expired  → can VIEW past diagnoses, cannot create new ones
-- Paid plans (Stripe) are a later phase; this column stays as the source of
-- truth for "when did this user's free access start".

-- ============================= column =============================
alter table public.profiles
  add column if not exists trial_ends_at timestamptz;

-- Backfill profiles created before this migration (e.g. early testers):
-- 30 days from when the profile was created.
update public.profiles
set trial_ends_at = created_at + interval '30 days'
where trial_ends_at is null;

-- ============================= signup trigger =============================
-- Replace the 001 trigger function so every NEW signup starts a 30-day trial.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, trial_ends_at)
  values (new.id, new.email, now() + interval '30 days')
  on conflict (id) do update
    set trial_ends_at = coalesce(public.profiles.trial_ends_at, now() + interval '30 days');
  return new;
end;
$$;

-- The trigger itself (on auth.users) already exists from 001_init.sql and
-- calls this function, so no need to re-create it.
