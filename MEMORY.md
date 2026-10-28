# MEMORY.md — Project continuity log
Updated: 2026-10-28 | Phase: 2C Architecture Planning Completed | Implementation status: Phase 2B Verified; Phase 2C Planned (Halted for Review)

## Confirmed decisions
- Project: Santhaya Associates corporate website plus staff-only quotation and GST billing system.
- Mandatory Authentication and Public Website Rule:
  1. Public visitors and clients must never be required to log in or sign up.
  2. Do not display Login, Sign In, Register, Sign Up, Account, or Dashboard links anywhere in the public website navigation, footer, or quotation form.
  3. The public quotation request form must work without client authentication.
  4. Staff authentication must be implemented separately for authorized Santhaya Associates employees.
  5. Do not provide public staff self-registration. Staff accounts must be provisioned by an authorized administrator.
  6. Protect all staff dashboard pages, APIs, and database operations using server-side authentication and role-based authorization.
  7. Exclude staff authentication and dashboard routes from public navigation and XML sitemaps, and apply noindex to staff-facing pages.
  8. Never rely on a hidden URL, robots.txt, or noindex as a security mechanism.
  9. Do not expose customer information, quotation records, GST invoices, or payment data to unauthorized users.
  10. Do not implement staff login or dashboard functionality during Phase 2 unless separately approved.
- Business areas: government/private construction tenders, construction machinery supply, manufacturing machinery supply.
- Stack: Next.js App Router + strict TypeScript + Tailwind + Lucide + Zod; Supabase PostgreSQL/Auth/RLS planned; Vercel hosting; GitHub; server-generated PDFs and transactional email later.
- Brand palette: navy #10243B, gold #F4B323, white #FFFFFF; use actual company logo when supplied.
- Indian GST invoicing planned; place-of-supply, tax classifications and invoice obligations require accountant validation.
- Four independent workflows approved:
  1. Workflow A: Website Enquiry -> Quotation -> Invoice
  2. Workflow B: Direct Quotation Without Website Enquiry (phone/WhatsApp/in-person; enquiry_id nullable)
  3. Workflow C: Direct Sale -> Invoice Without Quotation (direct machinery/materials purchase; quotation_id nullable)
  4. Workflow D: Standalone Service Billing (equipment rental, transport, civil services; independent invoice flow)
- Catalog Option A: Master `products_services` catalog for machinery, rentals, materials, transport, services; plus custom ad-hoc line items on quotes/invoices with immutable frozen price snapshots.
- Staff Dashboard Architecture: 10 segregated navigation sections (Overview, Enquiries, Customers, Quotations, Billing, Catalog, Payments, Documents, Staff Admin, Settings). Public website has zero auth links.
- Transactional Email: Provider-independent adapter pattern with durable database outbox queue and company Gmail inbox reception.
- Work in sequential phases with explicit human approval before proceeding.

## Implemented features
- Phase 1 Complete (Approved 2026-10-26):
  - Next.js 14 App Router scaffold with strict TypeScript and Tailwind CSS.
  - Responsive header incorporating authentic `santhaya-logo-header.png` (84.125px × 64px, 1.314:1 aspect ratio, 0.00% distortion) and mobile menu drawer with `santhaya-symbol.png`.
  - Scope-locked service pages for 3 core pillars: Government & Private Construction Tenders, Construction Machinery Supply, Manufacturing Machinery Supply.
  - About Us, Privacy Policy, Terms of Service pages.
  - Client-side validated quotation request form with Zod schema and prominent non-operational preview warning.
  - Verified with 0 lint errors, 0 typecheck errors, successful static build (9/9 routes), and headless Chrome automated QA across mobile (375px), tablet (768px), laptop (1366px), and desktop (1920px).

## Completed tasks
- 2026-10-26: Prepared Santhaya-only starter documentation and preserved the technical executive summary as reference.
- 2026-10-26: Initialized local Git repository and created initial commit for asset and history traceability.
- 2026-10-26: Verified genuine brand assets in `public/`:
  - `santhaya-logo-header.png` (1045x795, 1.314 aspect ratio, RGB): Used for website header with strict aspect ratio preservation.
  - `santhaya-symbol.png` (480x550, 0.873 aspect ratio, RGB): Used as compact brand icon in mobile menu, footer, and browser icons.
  - `full-brand-reference.png` (1254x1254, 1.000 aspect ratio, RGB): Featured on homepage showcase as official visual reference.
- 2026-10-26: Verified runtime environment: Node v24.18.1, npm 11.16.0 (via `npm.cmd` on Windows).
- 2026-10-26: Phase 1 Final QA executed via headless Chrome automation suite (`scripts/run-qa.mjs`):
  - Tested 6 routes (`/`, `/services`, `/about`, `/request-quotation`, `/privacy`, `/terms`) across 4 viewports (375px, 768px, 1366px, 1920px). Zero horizontal overflow.
  - Verified Header logo aspect ratio: rendered at 84.125 × 64px (`aspect-[1045/795]`, 1.314:1, 0.00% distortion).
  - Verified mobile drawer menu with compact symbol `santhaya-symbol.png` and full navigation links.
  - Verified demo quotation form: prominent amber non-operational warning banner, client-side validation errors, and simulation success card with no false backend claims.
  - Identified & fixed Phase 1 QA defects:
    1. Added `src/app/request-quotation/layout.tsx` to provide unique page `<title>` and metadata for `/request-quotation`.
    2. Enhanced Zod schema error messages with `required_error` and `.trim()` across all form fields (e.g. "Business or organization name is required" instead of generic "Required").
    3. Added `loading="eager"` to `Footer.tsx` symbol image to prevent lazy-load lag during automated audits.
    4. Installed `sharp` for high-performance Next.js production image optimization.
  - Re-ran verification gates:
    - `npm run typecheck`: Passed (0 errors)
    - `npm run lint`: Passed (0 errors)
    - `npm run build`: Passed (9/9 routes prerendered, 0 warnings)
    - Automated QA script: 0 broken images, 0 console errors, 0 overflow issues across all viewports.
  - Captured full visual QA screenshots saved in artifact directory.
- 2026-10-26: User formally approved Phase 1. Completed Phase 1 milestone.
- 2026-10-26: Completed Phase 2A Supabase Architecture & Secure Submission Plan (`docs/PHASE-2-ARCHITECTURE.md`).
- 2026-10-26: Incorporated Phase 2A Security and Architecture Corrections into `docs/PHASE-2-ARCHITECTURE.md` (v2.0):
  1. Audit logs: Explained RLS bypass by privileged roles (`service_role` / table owner); established non-RLS database safeguards (`REVOKE UPDATE, DELETE, TRUNCATE` + `prevent_audit_log_mutation()` BEFORE trigger).
  2. Customer records: Prohibited auto-merging on email alone; preserved each quotation request as an independent immutable snapshot; customer linking is a staff-controlled operation based on statutory records (GSTIN/PAN/CIN).
  3. Idempotency: Replaced content hashing with client-generated UUID v4 `Idempotency-Key` and unique constraint; defined 24h replay window and independent tracking for repeat inquiries.
  4. Bot protection: Removed 2.5s auto-rejection (autofill friendly); implemented honeypot decoy, sub-1.0s timing flagged as risk signal (`under_review`) rather than rejection, and Turnstile challenge readiness.
  5. Rate limiting: Designed persistent, atomic PostgreSQL rate limiter (`rate_limits` table + `check_rate_limit` RPC with row locking); trustworthy edge IP extraction (`x-real-ip`) with salted SHA-256 hash; dynamic `Retry-After: <seconds>`.
  6. Database privileges: Compared Approach A (`service_role` direct table write) vs Approach B (Restricted RPC `submit_quotation_request()` granted to `anon`). Recommended Approach B for least privilege and defense-in-depth.
  7. Staff authorization: Required active authorization (`is_active_staff`); prevented self-privilege escalation via admin-only UPDATE policy on `staff_profiles`; fixed `search_path = public, pg_temp` on all SECURITY DEFINER functions.
  8. Indian GST: Structured schema for dynamic tax rates and place of supply; strictly gated production calculation and invoice numbering behind certified Indian Chartered Accountant review.
  9. Testing: Expanded security testing matrix to 15 scenarios (SEC-01 through SEC-15) covering concurrency, duplicate retries, privilege escalation, service-role exposure, and audit-log modification attempts.
  - No backend code or dependencies installed; awaiting final human approval.
- 2026-10-26: User established permanent "Mandatory Authentication and Public Website Rule". Updated `PRD.md`, `RULES.md`, `PHASES.md`, `docs/PHASE-2-ARCHITECTURE.md`, and `MEMORY.md` to mandate: zero public login/signup, zero auth links in public UI, unauthenticated quotation requests, admin-provisioned staff accounts only, server-side auth/authorization, sitemap exclusion with noindex for staff routes, no security through obscurity, and strict deferral of staff login/dashboard until Phase 3.
- 2026-10-26: Received conditional approval for Phase 2A Architecture v2.0 and authorization for Phase 2B Preparation:
  - Installed compatible Supabase dependencies: `@supabase/supabase-js` (^2.118.0) and `@supabase/ssr` (^0.12.7).
  - Created `.env.example` with placeholder variable names only.
  - Created `src/types/database.ts` with complete TypeScript database schema types.
  - Created server-side database client utilities without real credentials (`src/lib/supabase/env.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`).
  - Prepared version-controlled SQL migration file for review: `supabase/migrations/20261026120000_phase2_schema_and_security.sql` incorporating secure function ownership (`OWNER TO postgres`), `search_path = public, pg_temp` hardening, internal function access revokes, audit log operational tamper resistance, atomic token-bucket `check_rate_limit`, and `submit_quotation_request` RPC with HTTP 409 conflict detection on differing payload reuse.
  - Updated `docs/PHASE-2-ARCHITECTURE.md` with the 5 final corrections (function ownership/grants, audit tamper-resistance clarification, Vercel IP extraction, HTTP 409 idempotency conflict, and public auth isolation).
  - Executed lint, typecheck, and production build checks.
  - Zero database tables created or migrations executed; awaiting human review and approval.

## Current phase and pending tasks
- [x] Phase 1 completed, QA reviewed, and formally approved by user (2026-10-26).
- [x] Phase 2A architecture planning completed (`docs/PHASE-2-ARCHITECTURE.md`).
- [x] Phase 2A security and architecture corrections completed (`docs/PHASE-2-ARCHITECTURE.md` v2.0).
- [x] Mandatory Authentication and Public Website Rule documented across PRD, RULES, PHASES, MEMORY, and Architecture spec.
- [x] Phase 2B preparation: Installed compatible Supabase dependencies (`@supabase/supabase-js`, `@supabase/ssr`).
- [x] Phase 2B preparation: Created `.env.example` with variable placeholders only.
- [x] Phase 2B preparation: Created type-safe database client utilities without credentials (`src/lib/supabase/*`).
- [x] Phase 2B preparation: Prepared version-controlled SQL migration file (`supabase/migrations/20261026120000_phase2_schema_and_security.sql`).
- [x] Phase 2B preparation: Completed final SQL security audit & remediated RPC/concurrency defects.
- [x] Phase 2B preparation: Prepared isolated SQL test suite (`supabase/tests/20261026120000_phase2_security_tests.sql`).
- [x] User review and approval to execute development database test run.
- [x] Phase 2B execution: applied database schema migrations and RLS policies on development Supabase instance (`bkqneudnnhvvwmtggorz`, verified 2026-10-28).
- [x] Phase 2C architecture planning completed (`docs/PHASE-2C-ARCHITECTURE.md`, `docs/PHASE-2C-DATABASE-PLAN.md`, `docs/PHASE-2C-EMAIL-PLAN.md`, `docs/PHASE-2C-SECURITY-PLAN.md`, `docs/PHASE-2C-IMPLEMENTATION-ROADMAP.md`).
- [ ] User review and approval of Phase 2C architecture deliverables.
- [ ] Phase 2D execution: public enquiry persistence, honeypot/rate-limit API route, durable email outbox, and Gmail alert integration.
- [ ] Phase 3A execution: staff authentication (admin-provisioned), private dashboard layout, enquiry review, and customer records.
- [ ] Phase 3B execution: product catalog (Option A), direct & enquiry-based quotations, versioning, manual acceptance, PDF generator.
- [ ] Phase 3C execution: billing & invoice management, quotation conversion, accountant GST review, invoice PDFs, and payments.
- [ ] Phase 3D execution: comprehensive integration testing, financial rounding audit, email resilience, disaster recovery, and release readiness.

## Design decisions
- Brand palette: Deep Navy `#10243B`, Industrial Gold `#F4B323`, Clean White `#FFFFFF`.
- Typography: Inter font configured via Next.js Google font variable `--font-inter`.
- Logo assets: Never use AI-generated artwork for logos. Use authentic PNGs directly from `/public` with `object-contain` and explicit aspect-ratio constraints (`aspect-[1045/795]` and `aspect-[480/550]`).
- Header responsive sizing:
  - Desktop: `santhaya-logo-header.png` at height 56px–64px (`h-14 md:h-16`, aspect 1045/795) on white header bar.
  - Mobile: `santhaya-symbol.png` (compact mark, height 40px) inside drawer and quick "Get Quote" bar.
  - Official Visual Reference: `full-brand-reference.png` showcased on homepage with 1:1 aspect ratio.

## API and database decisions
- Database: Supabase PostgreSQL with Row Level Security (RLS) enabled on all tables.
- Decimal safety: All monetary amounts, tax rates, and totals use `NUMERIC(15,2)` / `NUMERIC(12,4)` (no floating point).
- Access control: Approach B adopted: Restricted PostgreSQL RPC function (`submit_quotation_request`) granted `EXECUTE` to `anon`, keeping direct table access (`quotation_requests`, `customers`, `audit_logs`, `rate_limits`) completely revoked.
- Function security: All `SECURITY DEFINER` functions specify `SET search_path = public, pg_temp` and `OWNER TO postgres`. Internal helpers (`is_active_staff`, `has_staff_role`, `check_rate_limit`) revoked from `PUBLIC` and `anon`.
- Customer matching: Quotations are never auto-merged on email; independent snapshots preserved on `quotation_requests`. Customer linking is a staff-governed operation based on verified legal identity.
- Idempotency & Bot defense: Client-generated UUID v4 `Idempotency-Key` (24h window). Identical payload yields safe replay (`result_status = 'replayed'`); differing payload reuse yields HTTP 409 Conflict. Autofill-friendly bot defense (honeypot + rapid timing flagged for review, not auto-rejected).
- Rate limiting: Atomic database-backed token bucket (`rate_limits` + `check_rate_limit` RPC with row lock) for serverless compatibility; trusted edge IP (`x-real-ip` on Vercel) with salted SHA-256 hash; dynamic `Retry-After: <seconds>`.
- Staff authorization: Active check mandatory (`is_active_staff`); self-privilege escalation blocked via admin-only UPDATE policy on `staff_profiles`. Staff accounts are invitation/admin-provisioned only (no public registration).
- Auditability: Operational tamper-resistance enforced via non-RLS database safeguards (`REVOKE UPDATE, DELETE, TRUNCATE` from standard roles + BEFORE trigger `prevent_audit_log_mutation()`). Triggers protect against standard operations, not root database superusers.
- GST Invoicing: Decimal-safe structure with HSN/SAC, place of supply, and dynamic tax allocation; calculations require certified accountant sign-off prior to production.
- Public site & auth constraints: No client accounts; no login/register links in public navigation/footer/form; unauthenticated quotation form; admin-provisioned staff accounts only; staff login/dashboard deferred to Phase 3.

## Reusable components
- `Header`: Responsive brand header with desktop nav, mobile drawer, and CTA.
- `Footer`: Comprehensive corporate footer with scope lock, unverified disclaimer, and compliance links.

## Assumptions / awaiting confirmation
- Exact legal name confirmed as "Santhaya Associates Pvt. Ltd." via official logo asset.
- Official registered office address, phone, email, GSTIN, domain, and staff roles remain configurable placeholders.
- Corporate transactional email provider (Resend / AWS SES / SendGrid) awaiting confirmation for staff inquiry alerts.

## Session log
- 2026-10-26: Confirmed construction tenders and machinery supply as exclusive business scope.
- 2026-10-26: Inspected authentic brand assets in `public/`.
- 2026-10-26: Received user approval for Phase 1 scaffolding. Implemented responsive header, homepage, 3 service pillars, about page, legal placeholders, and demo quotation form. Completed typecheck, lint, build, and HTTP verification. All checks passed.
- 2026-10-26: Conducted Phase 1 comprehensive QA. Resolved missing quotation metadata, generic validation messages, and footer image loading. Re-verified lint, typecheck, build, and responsive screenshots across 4 screen sizes. Zero defects remaining.
- 2026-10-26: User approved Phase 1. Completed Phase 2A Supabase Architecture & Submission Planning specification (`docs/PHASE-2-ARCHITECTURE.md`).
- 2026-10-26: Received conditional approval for Phase 2A architecture. Updated `docs/PHASE-2-ARCHITECTURE.md` (v2.0) and `MEMORY.md` incorporating all 9 security corrections: audit log trigger & grant immutability, safe customer matching, UUID idempotency, autofill-safe bot protection, atomic serverless rate limiter, restricted RPC over service_role, anti-escalation staff RLS, accountant gate on GST, and 15-scenario security test matrix. Awaiting final human approval before Phase 2B.
- 2026-10-26: User issued permanent "Mandatory Authentication and Public Website Rule". Updated `PRD.md`, `RULES.md`, `PHASES.md`, `docs/PHASE-2-ARCHITECTURE.md`, and `MEMORY.md`. Enforced: zero public login/signup, zero auth links in public UI, unauthenticated quotation requests, admin-provisioned staff accounts only, server-side auth/authorization, sitemap exclusion with noindex for staff routes, no security through obscurity, and strict deferral of staff login/dashboard until Phase 3.
- 2026-10-26: User granted Phase 2B Preparation Approval. Installed Supabase SDKs (`@supabase/supabase-js`, `@supabase/ssr`), created `.env.example`, database TypeScript interfaces (`src/types/database.ts`), server database client utilities (`src/lib/supabase/*`), version-controlled migration SQL (`supabase/migrations/20261026120000_phase2_schema_and_security.sql`), and updated architecture specification with 5 final corrections. Verified with lint, typecheck, and build (all passed). Awaiting human review before applying database migrations.
- 2026-10-27: Codified and verified the permanent "Mandatory Authentication and Public Website Rule" across all project documents (`PRD.md`, `RULES.md`, `MEMORY.md`, `PHASES.md`, and `docs/PHASE-2-ARCHITECTURE.md`). Re-verified that all 10 requirements are explicitly aligned: zero public login/signup, zero public auth UI, unauthenticated quotation requests, admin-provisioned staff accounts only, server-side auth and role-based authorization, sitemap exclusion with noindex, no security through obscurity, data confidentiality, and strict deferral of staff login/dashboard during Phase 2. Execution halted pending human approval.
- 2026-10-27: Executed Phase 2B Final SQL Security Audit on `supabase/migrations/20261026120000_phase2_schema_and_security.sql`. Identified and fixed 4 critical security & correctness defects: (1) Revoked `submit_quotation_request` from `anon` and `authenticated`, restricting `EXECUTE` strictly to server-only `service_role` so public anon keys cannot bypass Next.js edge rate-limiting and bot protection; (2) Revoked sequence `quotation_request_seq` from `anon` and `authenticated`; (3) Eliminated first-request concurrency race condition in `check_rate_limit` by introducing atomic `ON CONFLICT (key) DO NOTHING` initialization prior to `FOR UPDATE` row locking, plus added parameter validation guards; (4) Added explicit input validation on idempotency keys and SHA-256 hashes in `submit_quotation_request`; (5) Added explicit RLS insert/delete denial policies on `staff_profiles` and `audit_logs`. Verified with typecheck, lint, and production build (all passed). Zero database migrations executed; awaiting human review and approval.
- 2026-10-27: Completed Phase 2B Development Testing Preparation: (1) Created isolated SQL test suite (`supabase/tests/20261026120000_phase2_security_tests.sql`) wrapping each security test in independent PL/pgSQL DO blocks with exception assertion handlers so expected errors do not abort script execution; (2) Created automated Node.js security test harness (`scripts/test-phase2-security.mjs`, registered as `npm run test:security`) with strict non-production URL safety guards and synthetic test data covering SEC-01 through SEC-11; (3) Confirmed quotation submission RPC is callable exclusively by server-side `service_role`; (4) Verified zero production credentials or customer data; (5) Confirmed public quotation form remains strictly in unintegrated demo mode; (6) Halted prior to migration execution and requested approval for test run.
- 2026-10-27: Prepared and hardened Phase 2B development database testing suite upon user approval:
  1. Corrected `supabase/tests/20261026120000_phase2_security_tests.sql`: wrapped table reads in exception blocks to properly catch `insufficient_privilege` (code 42501) from table-level REVOKE rather than aborting DO blocks; added `auth.users` setup in Test 9 to satisfy foreign key constraints on `staff_profiles`; added explicit tests for staff self-provisioning denial (Test 9B), audit log direct insert denial by authenticated staff (Test 11), and audit log truncate denial (Test 12).
  2. Enhanced `scripts/test-phase2-security.mjs`: added hard-abort guards against production URLs (prohibiting `prod`, `production`, `live`, `main`, `santhaya.in`, `santhaya.com` even if `ALLOW_TEST_ENV=true` is set); added dual-mode execution supporting static audits when no DB is connected, with explicit NOT RUN tracking for unexecuted tests.
  3. Executed verification gates:
     - `npm.cmd run test:security`: 3 PASSED (SEC-STATIC-01, SEC-STATIC-02, SEC-STATIC-03), 0 FAILED, 14 NOT RUN (10 DB tests + 4 future API tests).
     - `npm.cmd run typecheck`: PASSED (0 errors).
     - `npm.cmd run lint`: PASSED (0 errors, 0 warnings).
     - `npm.cmd run build`: PASSED (All 9 static routes prerendered cleanly).
  4. Stopped immediately in accordance with safety directive ("Stop immediately if the environment cannot be positively verified as the development sandbox"). No remote or local development Supabase instance credentials exist in `.env.local` or environment variables. Zero production modifications made. Ready for user to provide disposable development sandbox credentials.
- 2026-10-27: Prepared Supabase development sandbox connection safety layer:
  1. Created strictly git-ignored `.env.local` template with placeholder variable names and updated `.env.example` to document `DEV_SUPABASE_PROJECT_REF`, `SUPABASE_ENV`, and `ALLOW_TEST_ENV`. Confirmed `.env.local` is ignored via `git check-ignore -v .env.local`.
  2. Implemented dedicated read-only connectivity verification script `scripts/verify-supabase-connection.mjs` (`npm run test:connection`). Enforces exact match between URL hostname and allowlisted `DEV_SUPABASE_PROJECT_REF`, hard-aborts on production indicators, tests unauthenticated and service-role PostgREST handshake, verifies zero tables currently exist, and masks all credentials without logging or exposing secrets.
  3. Updated `scripts/test-phase2-security.mjs` to require explicit allowlisted `DEV_SUPABASE_PROJECT_REF`.
  4. Re-verified zero public auth UI across the application codebase (no login, signup, register, account, or dashboard links).
- 2026-10-28: Connected and verified Supabase development sandbox (`bkqneudnnhvvwmtggorz`):
  1. Configured `.env.local` with development project details: `NEXT_PUBLIC_SUPABASE_URL=https://bkqneudnnhvvwmtggorz.supabase.co`, `DEV_SUPABASE_PROJECT_REF=bkqneudnnhvvwmtggorz`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=[REDACTED_DEV_ANON_KEY]`, and user manually supplied server-only `SUPABASE_SERVICE_ROLE_KEY`. Confirmed `.env.local` is strictly ignored by Git.
  2. Verified API key compatibility: confirmed `@supabase/supabase-js@2.118.0` has native built-in support for new-format keys (`sb_publishable_` and `sb_secret_`), attaching them properly to `apikey` headers without JWT parsing errors.
  3. Hardened `scripts/verify-supabase-connection.mjs` to eliminate credential slice printing and ensure zero secret or anon key characters appear in logs.
  4. Executed safe read-only connection check (`npm.cmd run test:connection`): PASS. PostgREST gateway successfully authenticated both anon and service-role requests; confirmed Phase 2 schema tables do not yet exist (0 tables created, zero database writes, zero migrations run).
  5. Connection status: VERIFIED. Development project allowlist locked to `bkqneudnnhvvwmtggorz`. Ready for user review before proceeding with any Phase 2B migration steps.
- 2026-10-28: Post-migration verification completed on Supabase development sandbox (`bkqneudnnhvvwmtggorz`):
  1. User executed `20261026120000_phase2_schema_and_security.sql` in Supabase SQL Editor ("Success. No rows returned.").
  2. Created `scripts/verify-phase2-migration.mjs` and registered npm script `test:migration-status`.
  3. Executed `npm.cmd run test:migration-status`: ALL PASSED.
     - Confirmed all 5 tables exist in schema cache: `staff_profiles`, `customers`, `quotation_requests`, `rate_limits`, `audit_logs`.
     - Confirmed RLS is active on all 5 tables and direct anonymous `SELECT` is blocked.
     - Confirmed `submit_quotation_request` RPC execution is revoked from anonymous users.
  4. Executed `npm.cmd run test:connection`: Confirmed `Phase 2 Migrations Applied: YES`.
  5. Inspected Supabase CLI migration history status: because the migration was applied via Dashboard SQL Editor, `supabase_migrations.schema_migrations` does not have an entry unless reconciled with `supabase migration repair --status applied 20261026120000`. The remote database schema itself is 100% verified and active.
  6. Verified `npm.cmd run typecheck` (0 errors) and `npm.cmd run lint` (0 errors). Stopped per instruction awaiting user authorization.
- 2026-10-28: Completed Phase 2C Final Consolidated Architecture Planning:
  1. Inspected existing project code, verified tables, security test harnesses, and client utilities.
  2. Defined 4 decoupled workflows: Workflow A (Website Enquiry -> Quote -> Invoice), Workflow B (Direct Quotation without Enquiry), Workflow C (Direct Sale without Quotation), Workflow D (Standalone Service Billing).
  3. Formulated 10-section private Staff Dashboard architecture with complete public UI auth isolation.
  4. Designed Catalog Option A: reusable saved items for machinery, rentals, materials, transport, services + custom ad-hoc items with frozen snapshots.
  5. Formulated additive database plan (10 new tables, sequences, financial balance triggers, RLS policies, CLI migration history repair plan).
  6. Formulated provider-independent transactional email plan with durable outbox queue and Gmail reception.
  7. Formulated comprehensive security, threat modeling, anti-escalation, and private storage plan.
  8. Created master phased implementation roadmap (Phase 2C -> 2D -> 3A -> 3B -> 3C -> 3D).
  9. Produced 5 architecture documents in `docs/`: `PHASE-2C-ARCHITECTURE.md`, `PHASE-2C-DATABASE-PLAN.md`, `PHASE-2C-EMAIL-PLAN.md`, `PHASE-2C-SECURITY-PLAN.md`, `PHASE-2C-IMPLEMENTATION-ROADMAP.md`.
  10. Enforced mandatory execution restrictions: zero migrations run, zero database records modified, zero emails sent, zero deployments. Halted for human review.
- 2026-10-28: Completed Phase 2D-A Safe Implementation Preparation:
  1. Implemented secure Next.js quotation enquiry API (`src/app/api/quotation-request/route.ts`) with Zod schema validation matching database column limits, anti-spam honeypot defense (`_company_fax`), rapid-submission risk flagging (< 2.5s), salted IP hashing, atomic token bucket rate limiting via `check_rate_limit` RPC, and SHA-256 payload normalization.
  2. Prepared additive SQL migration (`supabase/migrations/20261028120000_phase2d_email_outbox.sql`) without applying it: defines `email_status_enum`, `public.email_outbox` table, partial polling index, RLS access revocation from public/anon/authenticated, service_role grants, and atomic stored procedure `submit_quotation_request_atomic`.
  3. Implemented provider-independent transactional email subsystem (`src/lib/email/*`): `types.ts`, `templates/admin-enquiry-alert.ts` (brand-aligned Deep Navy `#10243B` and Industrial Gold `#F4B323` with plain-text fallback), `providers/resend-provider.ts` (Resend REST adapter), `providers/mock-provider.ts` (in-memory mock provider), and `factory.ts` (unified provider getter with test fallbacks).
  4. Implemented durable outbox worker (`src/lib/email/outbox-worker.ts`) with authenticated execution via secret token, bounded concurrency, 5-stage exponential backoff (+1m, +5m, +15m, +1h -> dead_letter), crash recovery for stale processing jobs (> 10m), duplicate-delivery mitigation via provider idempotency keys, and PII-scrubbed logging.
  5. Updated quotation intake form (`src/app/request-quotation/page.tsx`): wired to secure API endpoint `/api/quotation-request` with client-generated UUID v4 idempotency keys, render timing measurement, and honeypot field.
  6. Updated `src/types/database.ts` with complete GenericSchema definitions (`email_outbox` table, `submit_quotation_request_atomic` RPC, `Relationships: []` on all tables, `Views`, `Enums`, `CompositeTypes`), achieving 100% type safety with `@supabase/supabase-js`.
  7. Statutory Correction Recorded: PostgreSQL sequences (`nextval`) do NOT guarantee gapless numbering (transaction rollbacks and concurrent aborted sessions consume sequence numbers and leave gaps). For statutory Indian GST invoices, gapless numbering requires assigning sequence numbers strictly at the moment of invoice issuance (transition from draft to issued) and accounting for cancelled numbers in statutory returns (GSTR-1 Table 13) or via formal Credit Notes under CGST Act Section 34. Certified Chartered Accountant approval is mandatory before Phase 3C release.
  8. Future Migration Reconciliation Plan Documented: `npx supabase migration repair --status applied 20261026120000` will reconcile the CLI metadata table `supabase_migrations.schema_migrations` without re-running DDL.
  9. Executed full verification suite:
     - `npm.cmd run test:phase2d`: 41 PASSED, 0 FAILED.
     - `npm.cmd run typecheck`: 0 errors.
     - `npm.cmd run lint`: 0 errors, 0 warnings.
     - `npm.cmd run test:migration-status`: 5 tables verified in Supabase development sandbox `bkqneudnnhvvwmtggorz`, RLS active, anonymous RPC revoked.
  10. Enforced mandatory restrictions: zero SQL migrations applied, zero database records modified, zero emails transmitted, zero deployments, and zero public authentication changes. Halted for human approval before Phase 2D-B.

- 2026-10-28: Completed Phase 2D-B Updated Business Requirements, Security Corrections & Integration Preparation:
  1. Resend Free-Tier Architecture & Safeguards: Established server-side Resend free-tier for company Gmail alerts (`INTERNAL_NOTIFICATION_EMAIL`), verified sender (`EMAIL_FROM_ADDRESS`), with configurable usage limits (`EMAIL_DAILY_LIMIT` default 80, `EMAIL_MONTHLY_LIMIT` default 2500) and non-destructive queue pausing when quotas are reached. Enquiry persistence is completely independent of email availability.
  2. Staff Customer Contact Flexibility: Updated architecture and types so both `email` and `phone` are nullable in `customers`. Staff can create customers with neither contact method provided if statutory business identity fields (`company_name`, `billing_state`, `client_type`) are present.
  3. Public Enquiry Single-Contact Rules: Enforced cross-field validation requiring at least one contact method (Phone-only ACCEPT, Email-only ACCEPT, Both ACCEPT, Neither REJECT, Invalid formats REJECT). Decoupled validation into `src/lib/quotation/validation.ts`.
  4. Manual Phone & WhatsApp Quotation Delivery: Planned offline quotation delivery without customer email dependency. System generates unique reference (`QTN-YYYY-XXXXX`), allows PDF download, and records delivery details (`phone`, `whatsapp`, `in_person`, `printed`) manually without paid SMS or WhatsApp Business APIs.
  5. Outbox Worker Concurrency Hardening: Remediated optimistic locking race condition in `src/lib/email/outbox-worker.ts` by appending `.select('id')` and validating that exactly 1 row was claimed (`claimedRows && claimedRows.length === 1`), skipping dispatch on 0-row updates. Prepared database procedure `claim_email_outbox_batch` with `FOR UPDATE SKIP LOCKED`.
  6. Trusted Reverse-Proxy IP Security: Implemented `extractClientIp` to isolate untrusted `X-Forwarded-For` injection, requiring production edge proxies (Vercel/Cloudflare) to overwrite/sanitize forwarded headers.
  7. Authenticated Cron Endpoint Implemented: Created `src/app/api/cron/process-outbox/route.ts` with constant-time secret comparison (`crypto.timingSafeEqual`), bounded batch sizing, quota-limit checks, and zero customer PII logging.
  8. Prepared Additive Migration Updated: Updated `supabase/migrations/20261028120000_phase2d_email_outbox.sql` with `ALTER TABLE` statements for `quotation_requests` and `customers` to drop NOT NULL on email/phone, added `quotation_contact_check`, updated `submit_quotation_request_atomic`, and added `claim_email_outbox_batch`.
  9. Executed full verification gates:
     - `npm.cmd run test:phase2d`: 41/41 PASSED, 0 FAILED.
     - `npm.cmd run typecheck`: 0 errors.
     - `npm.cmd run lint`: 0 errors, 0 warnings.
  10. Enforced mandatory restrictions: zero migrations applied, zero database writes, zero real emails sent, zero deployments. Halted for human review.


- 2026-10-28: Safe First GitHub Connection, Commit & Push:
  1. Inspected local Git repository on branch master with existing commit history intact.
  2. Verified approved GitHub remote repository (https://github.com/Ritik9631/Santhaya-Associates-.git) via git ls-remote; confirmed remote repository is completely empty with zero existing branches or commits.
  3. Configured origin remote pointing to https://github.com/Ritik9631/Santhaya-Associates-.git.
  4. Executed comprehensive secret audit across repository, tracked files, untracked files, and documentation. Verified .gitignore covers .env*, confirmed zero credentials/passwords/secret keys in source code, migrations, tests, or documentation.
  5. Verified project health gates: npm.cmd run typecheck (0 errors), npm.cmd run lint (0 errors), npm.cmd run test:phase2d (41/41 passed).
  6. Staged reviewed application files, documentation, brand assets, tests, and prepared Phase 2D source migration without executing migrations, database writes, or email dispatches.


- 2026-10-28: Cross-Device Development Handover Prepared:
  1. Created comprehensive handover document at docs/DEVELOPMENT-HANDOVER.md detailing project phases, GitHub repository URL, Node.js version, clean setup instructions, required environment variables (names only, no secrets), Supabase dev reference (bkqneudnnhvvwmtggorz), applied vs pending migrations, verification commands, statutory Indian GST invoice numbering notes, outbox worker concurrency details, and exact steps for Phase 2D-B live database/Resend activation.
  2. Verified project health with typecheck, lint, and 41/41 Phase 2D tests passing.
  3. Staged and committed docs/DEVELOPMENT-HANDOVER.md and updated MEMORY.md for GitHub push.

## Agent update discipline
Record actual code changes and tests promptly. Never change 'not started' to 'completed' until verified. Mark reversed decisions superseded with date; do not erase history.


