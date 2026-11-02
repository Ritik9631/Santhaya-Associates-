# SANTHAYA ASSOCIATES — CROSS-DEVICE DEVELOPMENT HANDOVER GUIDE

**Document Version:** 8.0.0  
**Effective Date:** November 3, 2026  
**Active Project Workspace:** `C:\Users\Xziant\Projects\Santhaya-Associates`  
**GitHub Remote Repository:** `https://github.com/Ritik9631/Santhaya-Associates-.git`  
**Target Git Branch:** `master`  
**Current Synchronized Commit SHA:** `300964bd9cc33ddcba9824dbbe5556d426fbbdcf`  
**Development Supabase Reference:** `bkqneudnnhvvwmtggorz`  
**Email Provider Mode:** `EMAIL_PROVIDER=mock` (Zero external emails or API costs)  
**Next Session Starting Instruction:** `"Let's begin Batch 5 acceptance testing."`

---

## 1. PROJECT ARCHITECTURE & CORE SUBSYSTEM STATUS

Santhaya Associates is an enterprise platform combining a public corporate presence with an internal Staff ERP and statutory Indian GST billing system for:
1. Government & Private Construction Tenders
2. Construction Machinery Supply & Rentals
3. Manufacturing Machinery Supply

### Core Subsystems:
1. **Public Website (`/`, `/services`, `/about`, `/request-quotation`):**
   - **Zero Public Authentication:** Public visitors never log in or register.
   - Quotation intake form (`/request-quotation`) operates unauthenticated, protected by cryptographic token-bucket rate limiting (`check_rate_limit`), anti-spam honeypot, and automatic client/admin outbox notifications.
2. **Staff ERP (`/staff/*`):**
   - Protected by server-side sessions, Supabase Auth, and Role-Based Access Control (RBAC: `super_admin`, `admin`, `billing_manager`, `estimator`, `viewer`).
   - Anti-self-escalation triggers and strict audit logging on every action.
3. **Quotation Estimation Engine (`/staff/quotations`):**
   - Multi-version revision locking (`quotation_versions`), line-item tax calculations, standard 10-clause and compact 6-clause Terms presets.
   - Financial year numbering sequence (`QT-2026-27-001`), soft-delete preservation, and professional A4 PDF generation.
   - Formally issued quotations carry the 32mm circular company stamp; unfinalized drafts remain strictly unstamped.
4. **Statutory GST Billing Subsystem (`/staff/billing`):**
   - Compliant with Section 31 of CGST Act, 2017 and Rule 46 of CGST Rules, 2017.
   - Gapless sequential tax invoice numbering (`INV-2026-27-001`), payments ledger, and balance tracking.
   - **Draft Invoice Safeguards (BUG-052):** Draft invoices display bold amber `DRAFT — NOT A TAX INVOICE` badges, repeating diagonal watermarks across screen and print layouts (`print:block`), statutory warnings prohibiting Input Tax Credit (ITC) claims, withheld signature blocks, and `Preview Draft PDF` actions.
5. **Multi-Channel Document Sharing Hub (BUG-054 to BUG-059):**
   - Unified `DocumentShareModal` supporting WhatsApp (`wa.me`) and external email client (`mailto:`) with zero paid APIs.
   - Indian mobile validation (`src/lib/utils/phone.ts`) supporting `+91`, `91`, and `0` prefixes.
   - Touch-friendly 5-step sharing guide with explicit Android (`Downloads / Files`) and Windows (`Downloads` drag) attachment instructions.
   - Strict segregation between automated email queue and manual staff sharing (`manually_sent` attestation).
6. **Transactional Outbox Engine (`/staff/communications`):**
   - Decoupled asynchronous PostgreSQL `email_outbox` queue with exponential backoff and dead-letter protection.
   - **Mock Mode Transparency (BUG-051):** When running `EMAIL_PROVIDER=mock`, the Communications Center displays an amber sandbox alert banner, distinguishes simulated vs live deliveries, and tags outbox records as `Mock — Not Sent`.

---

## 2. RECONCILED TEST BATTERY AUDIT (ALL 17 SUITES PASSING — 100%)

All 17 test batteries execute consecutively and pass against development project `bkqneudnnhvvwmtggorz`:

| # | Test Suite | Command | Scope & Subsystems Verified | Status |
| :---: | :--- | :--- | :--- | :---: |
| 1 | **Connection Verifier** | `npm.cmd run test:connection` | Supabase anon & service-role read-only handshakes | **PASSED** |
| 2 | **Super Admin Check** | `npm.cmd run test:super-admin` | Exactly 1 active Super Administrator verified | **PASSED** |
| 3 | **Phase 2D Security** | `npm.cmd run test:phase2d` | Contact validation, IP spoof defense, outbox claim | **PASSED** |
| 4 | **Phase 3A-1 Auth Guard** | `npm.cmd run test:phase3a1` | Staff route protection, public site zero auth leaks | **PASSED** |
| 5 | **Phase 3A-2 Session** | `npm.cmd run test:phase3a2` | Cookie security, session validation, active status | **PASSED** |
| 6 | **Phase 3A-3 RBAC Matrix** | `npm.cmd run test:phase3a3` | Anti-self-escalation, lockout defense, role matrix | **PASSED** |
| 7 | **Phase 3B Customer/SKU** | `npm.cmd run test:phase3b` | Customer optional contacts, master SKU catalog | **PASSED** |
| 8 | **Phase 3C Quotation** | `npm.cmd run test:phase3c` | Quotation calculation, tax splits, Rupee words | **PASSED** |
| 9 | **Phase 3D Invoicing** | `npm.cmd run test:phase3d` | Gapless invoice numbering, ledger reconciliation | **PASSED** |
| 10 | **Phase 4 Comms Hub** | `npm.cmd run test:phase4` | Delivery logging, outbox retry, browser E2E | **PASSED** |
| 11 | **Phase 6 Production** | `npm.cmd run test:phase6` | Security headers, tier separation, public integrity | **PASSED** |
| 12 | **Batch 2 Verification** | `npm.cmd run test:batch2` | Place of supply classification, draft issuance guard | **PASSED** |
| 13 | **Batch 3 Verification** | `npm.cmd run test:batch3` | High-contrast inputs, A4 print styles, date formats | **PASSED** |
| 14 | **Batch 4 Verification** | `npm.cmd run test:batch4` | Quotation soft delete, FY sequence generation | **PASSED** |
| 15 | **Batch 5 Verification** | `npm.cmd run test:batch5` | WhatsApp/Email modal, phone validation, draft safeguards | **PASSED** (17/17) |
| 16 | **Quotation Refinements** | `npm.cmd run test:refinements` | GSTIN checksum, derived PAN, 2-decimal summary | **PASSED** (26/26) |
| 17 | **Round Stamp Harness** | `npm.cmd run test:stamp` | 32mm circular stamp, draft/issued guard, 1-page fit | **PASSED** (24/24) |
| — | **Database Health Check** | `npm.cmd run test:db-health` | Read-only check of all 10 core DB tables | **PASSED** |
| **ALL**| **COMPLETE TEST SUITE** | `npm.cmd test` | **All 17 test suites executed consecutively** | **100% PASS** |

- **TypeScript Typecheck:** `npm.cmd run typecheck` (`tsc --noEmit`) → **0 errors**
- **ESLint Quality Check:** `npm.cmd run lint` (`next lint`) → **0 errors, 0 warnings**
- **Production Build:** `npm.cmd run build` (`next build`) → **26/26 routes compiled cleanly**

---

## 3. DATABASE CONTINUITY & SCHEMA STATUS

The laptop connects to the exact same cloud development Supabase database (`bkqneudnnhvvwmtggorz`). No local database re-initialization is required.

### Verified Record Counts in Development Sandbox:
- **Staff Profiles:** 1 active Super Administrator (`Heish`, `heistofeverything@gmail.com`)
- **Customers:** 6 records
- **Quotations:** 13 records (and 13 version records)
- **Tax Invoices:** 3 records (and 5 line items in `invoice_items`)
- **Payment Records:** 1 record
- **Public Quotation Enquiries:** 53 records
- **Transactional Email Outbox:** 69 jobs
- **Immutable Audit Logs:** 95 records

### Migration Files in `supabase/migrations/`:
1. `20261026120000_phase2_schema_and_security.sql`
2. `20261028120000_phase2d_email_outbox.sql`
3. `20261029120000_stage3a_staff_auth_enhancements.sql`
4. `20261029120000_stage3a_step_a_add_super_admin_enum.sql`
5. `20261029120001_stage3a_step_b_rbac_enhancements.sql`
6. `20261029140000_phase3b_catalog_and_customer_enhancements.sql`
7. `20261029160000_phase3c_quotations.sql`
8. `20261029180000_phase3d_billing_and_payments.sql`
9. `20261031120000_phase4_communications.sql`
10. `20261031230000_make_customer_billing_state_nullable.sql`
11. `20261102100000_add_quotation_soft_delete.sql`
12. `20261102120000_financial_year_quotation_numbering.sql`

*(Note: All code changes include non-destructive, application-level fallbacks. Zero unapproved database migrations should be run on the laptop without explicit authorization).*

---

## 4. LAPTOP RESUME & STARTUP INSTRUCTIONS

Follow these steps on your laptop to resume work immediately:

### Step 4.1: Clone or Fetch the Repository
If setting up on the laptop for the first time:
```powershell
git clone https://github.com/Ritik9631/Santhaya-Associates-.git
cd Santhaya-Associates
```
If an existing clone is already present on the laptop:
```powershell
# 1. Ensure working directory is clean
git status

# 2. Fetch all changes from GitHub
git fetch origin master

# 3. Fast-forward pull to the latest commit
git pull --ff-only origin master
```

### Step 4.2: Verify Git Head
Confirm the laptop is on the exact synchronized commit:
```powershell
git rev-parse HEAD
# Must output: 300964bd9cc33ddcba9824dbbe5556d426fbbdcf
```

### Step 4.3: Install Dependencies
```powershell
npm.cmd ci
# or: npm.cmd install
```

### Step 4.4: Recreate `.env.local`
Create `.env.local` in the project root on the laptop (never commit this file). Populate with your development Supabase credentials from your password manager or `.env.download`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://bkqneudnnhvvwmtggorz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Environment Locking & Safety
DEV_SUPABASE_PROJECT_REF=bkqneudnnhvvwmtggorz
SUPABASE_ENV=development
ALLOW_TEST_ENV=true

# Canonical Site URL & Cryptographic Salt
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RATE_LIMIT_SALT=<your-rate-limit-salt>

# Transactional Outbox (DEVELOPMENT MOCK MODE)
INTERNAL_NOTIFICATION_EMAIL=heistofeverything@gmail.com
EMAIL_PROVIDER=mock
EMAIL_FROM_ADDRESS=notifications@santhaya.local
EMAIL_DAILY_LIMIT=80
EMAIL_MONTHLY_LIMIT=2500

# Worker Secrets
CRON_SECRET=<your-cron-secret>
OUTBOX_WORKER_SECRET=<your-worker-secret>
```

> [!IMPORTANT]
> Keep `EMAIL_PROVIDER=mock` active in development. This safely records all transactional outbox jobs into the database without sending real emails or incurring third-party API costs.

### Step 4.5: Run Health Check & Verification Gates
```powershell
# 1. Verify database connectivity & record counts
npm.cmd run test:db-health

# 2. Run TypeScript strict typecheck
npm.cmd run typecheck

# 3. Run ESLint check
npm.cmd run lint

# 4. Run the full test battery
npm.cmd test
```

### Step 4.6: Start Development Server
```powershell
npm.cmd run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.  
Staff ERP login is accessible at **[http://localhost:3000/staff/login](http://localhost:3000/staff/login)**.

---

## 5. NEXT TASK & IMMEDIATE STARTING POINT

When starting your conversation on the laptop, provide this prompt:

> **"Let's begin Batch 5 acceptance testing."**

The agent will assist you in manually verifying:
1. High-contrast quotation new form (`/staff/quotations/new`).
2. WhatsApp and Email sharing modals on quotations and invoices (`/staff/quotations/[id]` and `/staff/billing/[id]`).
3. Indian phone validation and normalization utility.
4. Draft invoice print safeguards, diagonal repeating watermarks, and statutory notices (`/staff/billing/[id]/pdf`).
5. Communications Hub mock-mode transparency and sandbox alerts (`/staff/communications`).
6. Billing directory date formatting.

**Phase 7 production deployment remains ON HOLD.**
