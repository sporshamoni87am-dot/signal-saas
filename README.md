# Meta Ads Signal Assistance — SaaS codebase

A commercial web app for D2C media buyers running Meta ads. Paste campaign numbers
(or upload a screenshot as a visual reference), get a transparent, rule-based,
metric-focused diagnosis — verdict (Scale / Kill / Fix / Keep running / Wait),
graded ad signals, business metrics (MER, POAS), creative analysis, funnel leaks,
and an ordered list of concrete "do this in Ads Manager" action items. Every rule
shows its math. No AI, no black box, no fake screenshot reading.

**Launch model:** free 30-day trial, no credit card required, no payments.
Billing (Stripe) is fully coded but disabled behind `BILLING_ENABLED=false`.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · Supabase
(Postgres + Auth + Storage) · Stripe (disabled for launch) · Deploy target: Netlify.

---

## 1. Prerequisites

- Node.js 20+ and npm
- A Supabase account (free tier is fine) — https://supabase.com
- That's it for launch. No Stripe account needed until paid plans.

## 2. Local development

```bash
cd codebase
npm install
cp .env.example .env.local
# fill in the Supabase values (see section 3). Leave BILLING_ENABLED=false.
npm run dev        # http://localhost:3000
npm run build      # must pass with no errors before deploying
```

## 3. Supabase setup (exact steps — the only backend needed for launch)

1. **Create a project** at https://supabase.com/dashboard → New project. Note the
   project URL and anon key (Project Settings → API).
2. **Run the database migrations, in order:** open the SQL Editor in the Supabase
   dashboard and run each file's full contents:
   - `supabase/migrations/001_init.sql` — `profiles`, `diagnoses`, `subscriptions`,
     Row Level Security (users only ever touch their own rows), private
     `screenshots` storage bucket, auto-profile trigger on signup.
   - `supabase/migrations/002_trial.sql` — adds `trial_ends_at` to `profiles`
     (30 days from signup), backfills older profiles, and updates the signup
     trigger so every new user starts a trial automatically.
3. **Auth settings** (Authentication → Sign In / Up):
   - Enable the **Email** provider.
   - *Local dev:* you can turn **"Confirm email" OFF** to skip the confirmation
     email while testing. *Production:* leave it ON.
   - Add redirect URLs: `http://localhost:3000/auth/callback` for local dev and
     `https://YOUR-DOMAIN/auth/callback` for production (Authentication → URL Configuration).

## 4. Environment variables (launch)

| Variable | Where to get it |
|---|---|
| `BILLING_ENABLED` | `false` for launch (trial mode, no Stripe) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; your domain in prod |

The `STRIPE_*` and `SUPABASE_SERVICE_ROLE_KEY` variables are only needed when
`BILLING_ENABLED=true` (see "Billing (for later)").

## 5. Deploy to Netlify

1. Push this `codebase/` directory to a Git repo (as the repo root).
2. https://app.netlify.com → Add new site → Import an existing project → pick the repo.
   - Netlify auto-detects Next.js and installs its Next.js Runtime — leave the
     suggested build command (`next build`) and publish directory (`.next`) as-is.
     No `netlify.toml` or plugin needed.
   - If the repo root is *not* this `codebase/` directory, set the base directory
     to `codebase`.
3. Site settings → Environment variables: add the variables from section 4 (use
   production values, `NEXT_PUBLIC_APP_URL=https://YOUR-DOMAIN`). Scope them to
   all deploy contexts.
4. Deploy. Then add `https://YOUR-DOMAIN/auth/callback` to the Supabase redirect
   URLs (Authentication → URL Configuration).

## 6. How the trial works

- Every signup gets `trial_ends_at = now() + 30 days` (set by the DB trigger in
  `002_trial.sql` — no app code involved, so it can't be bypassed).
- While the trial is active: full access, unlimited diagnoses.
- When it expires: the user can still **view** all past diagnoses, but saving new
  ones is blocked server-side in `saveDiagnosis` (`TRIAL_EXPIRED`) and the
  dashboard/diagnose UI reflects it. No hard paywall, no data lockout — the
  message says paid plans are coming soon.
- A friendly banner (`components/trial-banner.tsx`) shows days remaining.

## 7. What the founder must do to go live (checklist)

- [ ] Create your **own** Supabase project (don't reuse anyone's keys) and run both migrations in order.
- [ ] Point a **custom domain** at the Netlify site; update `NEXT_PUBLIC_APP_URL` and Supabase redirect URLs.
- [ ] Turn email confirmation **ON** in Supabase for production.
- [ ] Have a lawyer review the **Privacy Policy** (`/privacy`) and **Terms** (`/terms`) templates — placeholders like `[your support email]` and `[date]` must be filled in.
- [ ] Test the full loop: sign up → trial banner shows 30 days → run the sample diagnosis → save → view → compare with new numbers → copy summary → print.
- [ ] To simulate expiry in testing: in the Supabase SQL editor, run
      `update profiles set trial_ends_at = now() - interval '1 day' where email = 'test@…';`
      then confirm the dashboard shows the expired state and saving is blocked.
- [ ] Add a real support email + update the footer/metadata domain (`NEXT_PUBLIC_APP_URL`).

## 8. Billing (for later — Stripe is coded, disabled)

All Stripe code is in the codebase and untouched: `lib/stripe.ts`,
`app/api/stripe/*` (checkout, portal, webhook), `components/billing-buttons.tsx`,
the `subscriptions` table + RLS, and the free-limit enforcement in `saveDiagnosis`.

To turn billing on when paid plans are ready:

1. Create your Stripe account + product/price (see the old test-mode steps in git
   history if needed: toggle test mode, Products → Add product, copy `price_…`).
2. Set `BILLING_ENABLED=true` and fill in `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Register the webhook endpoint `https://YOUR-DOMAIN/api/stripe/webhook` for
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`.
4. **Re-wire `app/billing/page.tsx`** to render the Stripe buttons again
   (currently a "plans coming soon" page — see the comment at the top of the file;
   `UpgradeButton`/`PortalButton` in `components/billing-buttons.tsx` are ready).
5. Decide the real price (the old placeholder was $29/mo) and switch to live keys.
6. Legal pages must be finalized before going live with payments.

## 9. Key product decisions baked in

- **Trial = 30 days, unlimited diagnoses**, enforced server-side. Change
  `TRIAL_DAYS` in `lib/actions.ts` and the interval in `002_trial.sql` together.
- **Screenshots are REFERENCE ONLY.** The UI says so plainly. Orphaned uploads
  (wizard abandoned mid-upload, screenshot replaced) are deleted automatically:
  the client fires `POST /api/screenshots/cleanup` with `navigator.sendBeacon`
  on unmount, and replaces trigger an immediate cleanup. The route verifies the
  path belongs to the caller before deleting. (Tab-kill edge cases may still
  leave rare orphans — a periodic cleanup job can be added later if needed.)
- **Diagnosis engine is rule-based and transparent** (`lib/engine.ts`). Benchmarks
  are labeled as adjustable starting points, not verified Meta data.
- **Beginner-proofing:** plain-language glossary (`lib/glossary.ts`), ⓘ explainers
  on wizard fields (`components/metric-help.tsx`), and a metric guide at the end
  of every report. Never assume the user knows a metric.
- **Reports are shareable:** copy-to-clipboard summary (`lib/report-summary.ts`)
  and a print-optimized light document (`components/report-actions.tsx`).
- **D2C only.** `diagnose()` dispatches on `campaignType`; add `lib/engines/leadgen.ts`
  etc. later following the same input/output shape.
- Out of scope: AI screenshot reading (stub contract in `lib/vision.ts` — nothing
  fake wired), non-D2C types, email notifications.
