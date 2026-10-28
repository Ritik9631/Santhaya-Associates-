# Santhaya Associates — Cross-Device Development Handover Guide

**Version:** 1.0  
**Date:** 2026-10-28  
**Scope Lock:** Construction tender services, construction machinery supply, manufacturing machinery supply, and approved quotation/GST billing workflows. Public visitors never authenticate; staff login/dashboard deferred to Phase 3.

---

## 1. Project Implementation Status & Phase Summary

| Phase | Description | Status | Verification & Deliverables |
|---|---|---|---|
| **Phase 0** | Requirements, scope locking, architecture guidelines, genuine brand asset validation | **Completed & Approved** (2026-10-26) | `PRD.md`, `RULES.md`, `PHASES.md`, `public/santhaya-*.png` |
| **Phase 1** | Next.js 14 App Router public site, responsive header, service pages, demo quotation form | **Completed & Approved** (2026-10-26) | All 9 routes prerendered, 0 lint/typecheck errors, multi-viewport Chrome QA |
| **Phase 2A** | Supabase database & security architecture specification v2.0 | **Completed** (2026-10-26) | `docs/PHASE-2-ARCHITECTURE.md` (audit tamper-resistance, idempotency, rate limiting) |
| **Phase 2B** | Base database schema, RLS policies, dev sandbox connection safety harness | **Applied & Verified** (2026-10-28) | Applied on dev sandbox `bkqneudnnhvvwmtggorz`: 5 tables verified with RLS active |
| **Phase 2C** | Consolidated architecture specifications across all remaining milestones | **Completed** (2026-10-28) | `docs/PHASE-2C-ARCHITECTURE.md`, `PHASE-2C-DATABASE-PLAN.md`, `PHASE-2C-EMAIL-PLAN.md`, `PHASE-2C-SECURITY-PLAN.md`, `PHASE-2C-IMPLEMENTATION-ROADMAP.md` |
| **Phase 2D-A** | Quotation submission API, bot defense, rate limiting, provider-independent email subsystem | **Prepared in Code** (2026-10-28) | `/api/quotation-request`, client form hookup, durable outbox worker |
| **Phase 2D-B** | Contact flexibility (phone/email optionality), Resend free-tier safeguards, concurrency hardening, cron worker | **Prepared in Code** (2026-10-28) | 41/41 tests passing (`test:phase2d`), additive migration prepared as source |
| **Phase 3A–3D** | Staff auth (admin-provisioned), product catalog, quotes, GST invoices, payments | **Pending Future Phases** | Deferred until Phase 2D is live and formally accepted |

---

## 2. Source Control & Repository Configuration

* **Remote Repository URL:** `https://github.com/Ritik9631/Santhaya-Associates-.git`
* **Target Remote Name:** `origin`
* **Active Working Branch:** `master`
* **Upstream Tracking:** `origin/master`

All commits follow standard conventional commit naming:
* `feat: prepare Santhaya Associates website and Phase 2D backend` (Latest baseline)

---

## 3. Environment & Runtime Prerequisites

* **Node.js:** `v20.x` or `v22.x` (LTS) or `v24.x` (Current development machine runs `Node v24.18.1`).
* **npm:** `v10.x` or `v11.x` (Current development machine runs `npm v11.16.0`).
* **Operating System:** Windows, macOS, or Linux. On Windows, use `npm.cmd` if standard `npm` is not globally bound in non-standard shells.
* **Git:** Git 2.30+ with Git Credential Manager or SSH keys configured for GitHub.

---

## 4. Setup Instructions on a New Computer

### Step 4.1: Clone the Repository
```bash
git clone https://github.com/Ritik9631/Santhaya-Associates-.git
cd Santhaya-Associates-
```

### Step 4.2: Install Dependencies
```bash
npm install
```
*(Dependencies include Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React, Zod, `@supabase/supabase-js`, and `@supabase/ssr`.)*

### Step 4.3: Configure Local Environment
Copy the example environment template to `.env.local`:
```bash
cp .env.example .env.local
```
*(On Windows PowerShell: `Copy-Item .env.example .env.local`)*

Populate `.env.local` with your development credentials (see Section 5 below). **Never commit `.env.local` to git.**

### Step 4.4: Start the Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Required Environment Variables

All secrets must remain server-side. Variables prefixed with `NEXT_PUBLIC_` are bundled for the browser.

| Variable Name | Exposure | Purpose / Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client & Server) | Supabase project URL (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client & Server) | Supabase public publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only (Secret)** | Supabase service-role key for backend RPC calls & outbox processing |
| `DEV_SUPABASE_PROJECT_REF` | Server-Only (Safety) | Expected Supabase project ref (`bkqneudnnhvvwmtggorz`). Verifier halts if mismatched |
| `SUPABASE_ENV` | Server-Only (Safety) | Set to `development` (safety scripts abort if set to production) |
| `ALLOW_TEST_ENV` | Server-Only (Safety) | Set to `true` to allow automated test harnesses to connect |
| `INTERNAL_NOTIFICATION_EMAIL` | Server-Only | Recipient email for estimation team alerts (e.g. company Gmail) |
| `RATE_LIMIT_SALT` | **Server-Only (Secret)** | 32+ character random hex string used for salted SHA-256 IP pseudonymization |
| `NEXT_PUBLIC_SITE_URL` | Public (Metadata) | Canonical base URL (`http://localhost:3000` in dev, production domain in prod) |
| `RESEND_API_KEY` | **Server-Only (Secret)** | Resend API key (`re_...`) for transactional email delivery |
| `EMAIL_FROM_ADDRESS` | Server-Only | Verified sender identity in Resend (e.g. `onboarding@resend.dev` or custom domain) |
| `CRON_SECRET` | **Server-Only (Secret)** | Secret token for authenticating `/api/cron/process-outbox` webhook requests |
| `OUTBOX_WORKER_SECRET` | **Server-Only (Secret)** | Alternative/fallback token for worker invocations |
| `EMAIL_DAILY_LIMIT` | Server-Only (Optional) | Maximum emails dispatched per rolling 24h (defaults to 80 for free tier) |
| `EMAIL_MONTHLY_LIMIT` | Server-Only (Optional) | Maximum emails dispatched per month (defaults to 2500 for free tier) |

---

## 6. Supabase Development Sandbox Details

* **Target Project Reference:** `bkqneudnnhvvwmtggorz`
* **Host URL:** `https://bkqneudnnhvvwmtggorz.supabase.co`
* **Safety Allowlist Enforcement:** `scripts/verify-supabase-connection.mjs` and `scripts/test-phase2-security.mjs` validate that the configured URL matches `DEV_SUPABASE_PROJECT_REF=bkqneudnnhvvwmtggorz`. Any connection attempt against an allowlisted production domain will immediately abort with exit code 1.

---

## 7. Database Migration Status

### 7.1 Already Applied Migrations
* **Migration:** `supabase/migrations/20261026120000_phase2_schema_and_security.sql`
* **Status on `bkqneudnnhvvwmtggorz`:** **Applied & Verified**
* **Active Schema Objects:**
  - `public.staff_profiles` (RLS active)
  - `public.customers` (RLS active)
  - `public.quotation_requests` (RLS active)
  - `public.rate_limits` (RLS active)
  - `public.audit_logs` (RLS active, immutable triggers active)
  - RPC function `submit_quotation_request()` (Restricted from anonymous access; callable by `service_role`)
  - Sequence `quotation_request_seq`

### 7.2 Pending Migrations (Source Prepared, Execution Pending)
* **Migration:** `supabase/migrations/20261028120000_phase2d_email_outbox.sql`
* **Status:** **Pending Execution by Human Developer in Supabase SQL Editor**
* **Changes Included:**
  1. Creates enum `email_status_enum` (`pending`, `processing`, `sent`, `failed`, `dead_letter`).
  2. Creates table `public.email_outbox` with partial index for pending queue polling.
  3. Relaxes strict `NOT NULL` on `email` and `phone` in `quotation_requests` and `customers`.
  4. Adds `quotation_contact_check` table constraint requiring at least one contact channel.
  5. Implements atomic stored procedure `submit_quotation_request_atomic` (persists enquiry and queues outbox alert in a single atomic transaction).
  6. Implements atomic stored procedure `claim_email_outbox_batch` with `FOR UPDATE SKIP LOCKED`.
  7. Hardens privileges: revokes all access from `anon`/`authenticated`, grants to `service_role`.

---

## 8. Verification & Testing Commands

Run these commands on the new device to verify project integrity:

```bash
# 1. Typecheck TypeScript strict definitions
npm run typecheck

# 2. Run ESLint code style and Next.js rule verification
npm run lint

# 3. Execute Phase 2D-B integration, contact validation & worker test suite (41 tests)
npm run test:phase2d

# 4. Safe read-only handshake with Supabase development sandbox (requires .env.local)
npm run test:connection

# 5. Check whether Phase 2B tables exist and RLS is active on development sandbox
npm run test:migration-status

# 6. Check whether Phase 2D email outbox migration has been applied or is pending
npm run test:phase2d-status

# 7. Run static security & environment sanity checks
npm run test:security

# 8. Test production build prerendering
npm run build
```

---

## 9. Outstanding Security & Architectural Directives

1. **Mandatory Authentication & Public Website Rule:**
   - Public visitors and quotation requesters **must never** log in or register.
   - Do not add Sign In, Login, Register, or Account links in header, footer, or forms.
   - Staff login and admin dashboards are strictly deferred to Phase 3.
2. **Statutory Indian GST Notice:**
   - PostgreSQL sequences do not guarantee gapless numbering (aborted transactions leave sequence gaps).
   - In accordance with CGST Act Section 31 and GSTR-1 Table 13 statutory reporting, gapless invoice numbers must be assigned at transition from draft to issued status, or cancelled numbers accounted for via formal Credit Notes.
   - Production GST calculations and invoice generation must not go live without certified Indian Chartered Accountant review.
3. **Transactional Email Independence:**
   - Quotation enquiry persistence is completely decoupled from email provider uptime. If Resend is unreachable or hits free-tier limits, the customer enquiry is saved to `quotation_requests`, queued in `email_outbox`, and safely retried via exponential backoff (+1m, +5m, +15m, +1h).
4. **Trusted Edge IP Extraction:**
   - In production (Vercel), `extractClientIp` relies on `x-real-ip` to prevent spoofed `X-Forwarded-For` headers.

---

## 10. Exact Next Steps for Phase 2D-B Live Activation

When ready to resume development and connect live services:

### Step 1: Apply Prepared SQL Migration in Supabase
1. Open the Supabase Dashboard for development project `bkqneudnnhvvwmtggorz`.
2. Navigate to **SQL Editor**.
3. Open or paste the contents of [`supabase/migrations/20261028120000_phase2d_email_outbox.sql`](file:///d:/video/Santhaya-Associates-Clean-Starter/supabase/migrations/20261028120000_phase2d_email_outbox.sql).
4. Click **Run**.
5. Run the verification script locally:
   ```bash
   npm run test:phase2d-status
   ```
   *(Expected output: `PASS: Phase 2D Email Outbox Migration is APPLIED`)*

### Step 2: Reconcile Supabase CLI Migration History (Optional/Recommended)
If using Supabase CLI locally, record migration status without re-running DDL:
```bash
npx supabase migration repair --status applied 20261026120000
npx supabase migration repair --status applied 20261028120000
```

### Step 3: Configure Resend Transactional Email
1. Sign up or log in to [Resend.com](https://resend.com).
2. Generate an API Key and add it to `.env.local` as `RESEND_API_KEY=re_...`.
3. Set `EMAIL_FROM_ADDRESS` (e.g. `onboarding@resend.dev` for testing, or your verified domain sender).
4. Set `INTERNAL_NOTIFICATION_EMAIL` to your target company Gmail address where alerts should land.
5. Set `CRON_SECRET` to a strong random token.

### Step 4: Perform Live End-to-End Test
1. Start dev server: `npm run dev`.
2. Visit `http://localhost:3000/request-quotation`.
3. Fill out and submit a sample quotation request (testing email-only, phone-only, or both).
4. Check the browser response: should return a genuine reference number (e.g. `REQ-2026-00001`).
5. Trigger the cron endpoint to process the outbox:
   ```bash
   curl -X POST http://localhost:3000/api/cron/process-outbox -H "Authorization: Bearer <CRON_SECRET>"
   ```
6. Check your company Gmail inbox for the branded Deep Navy & Industrial Gold alert notification.
7. Verify in Supabase table `email_outbox` that `status` changed to `'sent'` with a valid `provider_message_id`.
