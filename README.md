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
   - `supabase/migrations/003_meta_accounts.sql` — `connected_accounts`
     (encrypted Meta tokens, one row per user + ad account, RLS: own rows
     only) and `source` / `meta_campaign_id` / `meta_date_range` columns on
     `diagnoses` (so a saved diagnosis keeps its "Live data from Meta" badge).
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
| `META_APP_ID` | Meta app dashboard (see section 9) — only for live Meta data |
| `META_APP_SECRET` | Meta app dashboard → Settings → Basic (keep secret) |
| `META_TOKEN_ENCRYPTION_KEY` | `openssl rand -hex 32` — encrypts stored Meta tokens |

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

- [ ] Create your **own** Supabase project (don't reuse anyone's keys) and run all three migrations in order.
- [ ] Point a **custom domain** at the Netlify site; update `NEXT_PUBLIC_APP_URL` and Supabase redirect URLs.
- [ ] Turn email confirmation **ON** in Supabase for production.
- [ ] Have a lawyer review the **Privacy Policy** (`/privacy`) and **Terms** (`/terms`) templates — placeholders like `[your support email]` and `[date]` must be filled in.
- [ ] Test the full loop: sign up → trial banner shows 30 days → run the sample diagnosis → save → view → compare with new numbers → copy summary → print.
- [ ] To simulate expiry in testing: in the Supabase SQL editor, run
      `update profiles set trial_ends_at = now() - interval '1 day' where email = 'test@…';`
      then confirm the dashboard shows the expired state and saving is blocked.
- [ ] Add a real support email + update the footer/metadata domain (`NEXT_PUBLIC_APP_URL`).

## 8. Meta Marketing API (Phase 1 — read-only live data)

The wizard can pull live numbers straight from a user's Meta ad account
instead of typed numbers. **Read-only:** the code only ever reads accounts,
campaigns and insights — it never creates, edits, pauses or changes anything
in the ad account. No write calls exist in `lib/meta.ts`.

What it does: a logged-in user connects their Meta account once (dashboard
or wizard), picks an ad account + campaign + date range, and "Use live data"
pre-fills the wizard (spend, impressions, reach, link clicks, add-to-carts,
checkouts, purchases, attributed revenue, video metrics, frequency, days
running, daily budget). Business numbers Meta doesn't know — breakeven ROAS,
AOV, gross margin, total business revenue — are still typed by the user.
Reports from live data carry a "Live data from Meta" badge (persisted in
`diagnoses.source`). Guests cannot connect — same rule as saving.

### 8a. How it works (the moving parts)

- **OAuth** (Facebook Login, manual server flow): user → Facebook dialog
  (`ads_read` scope only) → one-time code → short-lived token (~1–2 h) →
  long-lived token (~60 days) → token validated via `debug_token`.
  State is a random value in an httpOnly cookie (CSRF protection).
- **Tokens** are AES-256-GCM encrypted with `META_TOKEN_ENCRYPTION_KEY`
  and stored in `connected_accounts` (one row per user + ad account, RLS:
  own rows only). Decryption happens only inside API routes; tokens are
  never sent to the browser or stored in localStorage.
- **Insights** come from `GET /{object}/insights` (Graph API v26.0, pinned
  in `lib/meta.ts` as `META_API_VERSION` — one constant to bump). Fields:
  spend, impressions, reach, clicks, inline_link_clicks, actions,
  action_values, ctr, cpc, cpm, frequency, purchase_roas, plus video
  metrics in a separate defensive call (if Meta drops a video field, core
  metrics still load). Attribution uses the account's own setting
  (`use_account_attribution_setting=true`). Missing data stays null and is
  flagged in the UI — numbers are never invented.
- **Routes** (`app/api/meta/`): `status`, `auth` (start OAuth), `callback`
  (exchange + save), `accounts` (list / disconnect), `campaigns` (picker),
  `insights` (fetch + map to engine inputs). Every route requires a
  logged-in user and checks ownership.
- **Rate limits** are tiered per app / account / user. The code keeps calls
  minimal (one insights call per fetch, paging capped) and maps Meta error
  80004 to "try again in a few minutes" and error 190 to "reconnect".
  Long-lived tokens expire after ~60 days — the UI shows the remaining
  days and the user reconnects (automatic refresh is a Phase 2 job).

### 8b. Setup — what the founder must do (Meta side)

1. **Create the Meta app:** https://developers.facebook.com/apps → Create
   App → use case **"Authenticate and request data from users with Facebook
   Login"** → app type Business.
2. **Add the Marketing API product:** App Dashboard → Add product →
   Marketing API. (Facebook Login is added by the use case above.)
3. **Register the redirect URI:** Facebook Login → Settings → Valid OAuth
   Redirect URIs → add exactly
   `https://YOUR-DOMAIN/api/meta/callback` (and `http://localhost:3000/api/meta/callback`
   for local testing). It must match byte-for-byte — the app derives it from
   `NEXT_PUBLIC_APP_URL`, no separate env var.
4. **Env vars** (Netlify Site settings → Environment variables, then redeploy):
   `META_APP_ID` (App Dashboard → Settings → Basic → App ID),
   `META_APP_SECRET` (same page → App Secret → Show), and
   `META_TOKEN_ENCRYPTION_KEY` (generate with `openssl rand -hex 32`).
   Without these, the Meta UI shows "not set up yet" and manual entry keeps
   working.
5. **Run migration** `supabase/migrations/003_meta_accounts.sql` in the
   Supabase SQL Editor (after 001 and 002).
6. **Test with your own account first:** in Development mode the app can
   only be used by people with a role on the app (you). Connect your ad
   account from the dashboard, run a diagnosis with live data, and check the
   numbers match Ads Manager for the same date range.

### 8c. Going live — App Review (do NOT skip)

Development mode is fine for testing, but real users cannot connect until
the app is Live. That needs **App Review** for the `ads_read` permission
plus **Business Verification**:

1. App Dashboard → App Review → Permissions and Features → request
   `ads_read` (Advanced Access). Meta asks for a screencast showing the
   connect flow and how the data is used — record the dashboard → Connect →
   wizard → live-data diagnosis flow.
2. Complete **Business Verification** (Business Settings → Business Info)
   with a legal business document. This is usually the slowest step.
3. Add the **Data Deletion** callback URL and a **Privacy Policy** URL in
   App Dashboard → Settings → Basic (the app's own /privacy page works).
4. Switch the app to **Live** mode. Until then, only app-role users can connect.
5. Keep the app in scope: only `ads_read` is requested. Asking for write
   permissions would need a separate review and is out of scope for this tool.

### 8d. What is NOT in Phase 1

- Automatic token refresh (tokens last ~60 days; users reconnect — a
  scheduled refresh job is Phase 2).
- Ad-set / ad-level pickers in the wizard (the insights API supports
  `level=adset|ad`; the wizard currently picks at campaign level only).
- Any write access to ad accounts (deliberately out of scope).
- The founder's D2C metrics matrix is not yet wired in — the engine rules
  are unchanged in this phase; the matrix review is a separate step.

## 9. Billing (for later — Stripe is coded, disabled)

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

## 10. Key product decisions baked in

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
