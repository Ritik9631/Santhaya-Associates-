# MEMORY.md — Project continuity log
Updated: 2026-10-29 | Phase: Stage 3A-3 Preparation Completed | Implementation status: Phase 1 Complete; Phase 2 Complete; Stage 3A-1 Verified; Stage 3A-2 Verified; Stage 3A-3 Planned & Prepared (Halted for Review)

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
- Automated Testing & Development Workflow Rule (Confirmed 2026-10-29):
  1. The Antigravity agent is responsible for automatically performing all applicable development tests, security checks, regression tests, typechecks, lint checks, and production builds.
  2. Automatically diagnose and fix test failures within the currently approved implementation scope, then rerun the relevant tests.
  3. Do not require the project owner to manually perform routine testing after every development stage.
  4. Provide concise phase-completion reports containing implementation status, automated test results, blockers, and the next recommended action.
  5. The project owner will perform comprehensive manual functional and user-acceptance testing when the application is production-ready, before approving its public launch.
  6. Continue to use safe development environments and non-destructive test data.
  7. Require explicit human approval before applying database migrations, creating privileged staff accounts, sending real customer emails, changing production configuration, or deploying.
  8. Do not bypass security requirements or mark untested functionality as verified.
  9. Continue implementing only the currently approved development stage. Do not automatically begin unrelated stages.
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

- 2026-10-29: Stage 3A-1 Authentication Foundation & Protected Routes Implemented and Verified:
  1. Server Middleware Guard (`src/middleware.ts`): Intercepts `/staff/:path*`, explicitly permits unauthenticated `/staff/login`, redirects unauthenticated staff route attempts to `/staff/login` with preserved destination query (`redirectTo`).
  2. Server-Side Session Guard (`src/lib/auth/session.ts`): Dual-barrier security verifying both Supabase Auth session (`getUser()`) and active database profile (`public.staff_profiles` where `is_active = true`). Throws redirects to `/staff/login?error=unauthorized` if profile is missing, or `/staff/login?error=inactive` if suspended.
  3. Staff Authentication Placeholder (`src/app/(staff-auth)/staff/login/page.tsx`): Minimal Stage 3A-1 unauthenticated placeholder in isolated route group outside `staff/layout.tsx` to eliminate layout recursion; handles dynamic error banners for unauthorized, inactive, and session_expired states; renders `robots: { index: false, follow: false }`.
  4. Staff Protected Layout & Dashboard (`src/app/staff/layout.tsx`, `src/app/staff/page.tsx`): Server component calling `requireStaffSession()`, displays authentic Santhaya Staff Portal branding, user identity, active role badge, and Stage 3 roadmap preview.
  5. Decoupled Navigation: Updated `Header.tsx` and `Footer.tsx` to hide public navigation when path starts with `/staff`, maintaining clean boundary with zero login links on the public marketing site.
  6. Next.js App Router Compliance: Cleaned non-standard schema re-exports from `src/app/api/quotation-request/route.ts` to satisfy strict Next.js App Router route typing.
  7. Test Suite (`scripts/test-phase3a1-auth.mjs`, `npm.cmd run test:phase3a1`): 39 tests covering guard logic matrix, unauthenticated interception, redirect preservation, error banners, noindex tags, public site route availability, zero auth UI exposure, and database non-destructive invariants.
  8. Full Verification Gates:
     - `npm.cmd run test:phase3a1`: 39 PASSED, 0 FAILED.
     - `npm.cmd run test:phase2d`: 41 PASSED, 0 FAILED.
     - `npm.cmd run typecheck`: 0 errors.
     - `npm.cmd run lint`: 0 errors, 0 warnings.
     - `npm.cmd run build`: 12/12 routes compiled & prerendered cleanly.
  9. Invariants Maintained: Zero SQL migrations executed, zero database records modified, zero staff accounts created, zero secrets exposed. Halted for human approval before Stage 3A-2.

- 2026-10-29: Stage 3A-2 Staff Login UI, Credential Authentication & Logout Implemented and Verified:
  1. Open-Redirect Sanitizer (`src/lib/auth/redirect.ts`): Rejection matrix covering 15 test vectors: external URLs, protocol-relative (`//`, `/\`), backslashes, JavaScript URIs, data URIs, URL-encoded bypasses (`%2F%2F`), path traversal (`/staff/../../`), and login loops.
  2. Server Actions for Auth Lifecycle (`src/lib/auth/actions.ts`):
     - `loginAction`: Input validation, salted HMAC-SHA256 IP and email rate limiting via existing `check_rate_limit` RPC (5 attempts/5min), Supabase Auth credential verification (`signInWithPassword`), dual-barrier validation against `public.staff_profiles` (`is_active = true`), immediate session revocation (`signOut()`) on missing or inactive profiles, generic error messaging preventing user enumeration, and sanitized redirect navigation.
     - `logoutAction`: Revokes Supabase Auth session via `signOut()` and redirects to `/staff/login`.
  3. Interactive Login Form (`src/app/(staff-auth)/staff/login/LoginForm.tsx`): Responsive UI with work email, password input with visibility toggle (accessible `aria-label`), submit state with spinner, inline field validation errors, and top-level generic error alert.
  4. Login Page Integration (`src/app/(staff-auth)/staff/login/page.tsx`): Embeds `LoginForm`, handles URL `error` parameters (`unauthorized`, `inactive`, `session_expired`), preserves `redirectTo` param, returns `noindex, nofollow`, and retains clean link to public homepage.
  5. Staff ERP Layout Logout Button (`src/app/staff/layout.tsx`): Integrates server-side logout form button into staff header alongside user profile badge; sets `dynamic = 'force-dynamic'` and `revalidate = 0`.
  6. Anti-Cache Headers (`src/middleware.ts`): Emits `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, `Pragma: no-cache`, `Expires: 0`, and `X-Robots-Tag: noindex, nofollow` on all `/staff/*` routes to prevent back-button cache exposure after logout.
  7. Automated Test Suite (`scripts/test-phase3a2-login.mjs`, `npm.cmd run test:phase3a2`): 55 tests covering open redirects, validation, rate limiting, dual-barrier mock authentication, logout revocation, live dev server endpoints, and non-destructive database invariants.
  8. Full Verification Gates:
     - `npm.cmd run test:phase3a2`: 55 PASSED, 0 FAILED.
     - `npm.cmd run test:phase3a1`: 39 PASSED, 0 FAILED.
     - `npm.cmd run test:phase2d`: 41 PASSED, 0 FAILED.
     - `npm.cmd run typecheck`: 0 errors.
     - `npm.cmd run lint`: 0 errors, 0 warnings.
     - `npm.cmd run build`: 12/12 routes compiled & prerendered cleanly.
  9. Strict Restrictions Preserved: Zero SQL migrations executed, zero database records modified, zero staff accounts created, zero secrets exposed. Halted for human approval before Stage 3A-3.

- 2026-10-29: Stage 3A-3 Secure RBAC, Migration & Staff Administration Prepared:
  1. Additive RBAC Migration Prepared (`supabase/migrations/20261029120000_stage3a_staff_auth_enhancements.sql`): Adds `'super_admin'` to `public.staff_role_enum`, abolishes broad direct table-level updates on `staff_profiles` in favor of column-level self-update (`full_name` only), and introduces atomic, hardened administrative RPCs (`admin_update_staff_role`, `admin_update_staff_status`, `admin_create_staff_profile`, `is_super_admin`).
  2. Escalation & Privilege Protections: Enforces mathematical anti-self-escalation (`p_target_user_id = v_caller_id` rejected), ordinary admin ceiling (cannot grant or modify `admin`/`super_admin`), sole Super Admin demotion/deactivation lockout defense, and mandatory audit log insertion into `public.audit_logs`.
  3. One-Time Super Admin Bootstrap Prepared (`scripts/bootstrap-super-admin.mjs`): Fully non-interactive, dry-run enabled, checks that zero Super Admins exist, targets approved project `bkqneudnnhvvwmtggorz`, ingests non-hardcoded credentials, reconciles orphaned auth users, and logs bootstrap event. Prepared only, NOT executed.
  4. Comprehensive Architecture Design Documented (`docs/phase3/STAGE-3A3-RBAC-AND-ADMIN-DESIGN.md`).
  5. Type Definitions Updated: Added `'super_admin'` to `StaffRole` union type in `src/types/database.ts`.
  6. Verification Gates Passed:
     - `npm.cmd run test:phase3a2`: 55 PASSED, 0 FAILED.
     - `npm.cmd run test:phase3a1`: 39 PASSED, 0 FAILED.
     - `npm.cmd run test:phase2d`: 41 PASSED, 0 FAILED.
     - `npm.cmd run typecheck`: 0 errors.
     - `npm.cmd run lint`: 0 errors, 0 warnings.
     - `npm.cmd run build`: 12/12 routes compiled & prerendered cleanly.
     - Bootstrap dry-run: Passed read-only preflight.
  7. Invariants Maintained: Zero SQL migrations executed, zero database records modified, zero staff accounts created, zero secrets exposed, zero emails sent. Halted for human approval.

- 2026-10-29: Automated Testing & Development Workflow Policy Codified:
  1. Updated `AGENTS.md` and `MEMORY.md` with the 9 mandatory project-wide workflow rules.
  2. Antigravity agent is confirmed responsible for automatically executing all unit, security, regression, typecheck, lint, and build verification gates and autonomously remediating failures within approved scope.
  3. Relieved project owner from routine testing after every development stage; project owner will perform comprehensive manual functional and acceptance testing when the app is production-ready prior to public launch.
  4. Preserved mandatory human approval gates for database migrations, staff user creation, email dispatches, configuration changes, and deployments.
  5. Zero database changes, zero user creations, zero deployments, and zero git commits/pushes performed.

- 2026-10-29: Stage 3A-3 Security Finalization & Stage 3A-5 Staff Management Interface Completed:
  1. Concurrency Serialization via Transaction-Scoped Advisory Locking:
     - Hardened supabase/migrations/20261029120000_stage3a_staff_auth_enhancements.sql with PERFORM pg_advisory_xact_lock(847291048291); in both admin_update_staff_role and admin_update_staff_status.
     - Serializes all concurrent Super Admin demotion/deactivation transactions across all connections, preventing race conditions from reaching zero active Super Admins.
     - Added zero-argument parameterless convenience overloads public.is_super_admin() and public.is_active_staff().
     - Verified audit log INSERT statements in RPCs match the exact public.audit_logs schema (entity_type, entity_id, action, actor_type, actor_id, previous_state, new_state).
  2. Safe Bootstrap Recovery & Legitimate Account Protection:
     - Updated scripts/bootstrap-super-admin.mjs with isNewAuthUser check: rollback deletes ONLY newly created accounts and preserves pre-existing accounts during failure recovery.
     - Set actor_id: null in pending bootstrap audit log to prevent foreign key violations before the staff profile exists.
  3. Stage 3A-5 Staff Management ERP Interface Implemented:
     - Server Actions (src/lib/auth/staff-actions.ts): inviteStaffAction (role ceilings: admin can only invite estimator/billing/viewer; super_admin can invite all roles), updateStaffRoleAction (super_admin only, anti-self-escalation), updateStaffStatusAction (anti-self-deactivation, role ceilings), updateOwnProfileNameAction (column-level update on full_name).
     - Dashboard Shell (src/app/staff/layout.tsx, StaffSidebar.tsx): Responsive sidebar, mobile toggle, role-aware navigation badges, account summary, server-side logout.
     - Master Overview (src/app/staff/page.tsx, ProfileNameEditor.tsx): ERP welcome banner, inline name editing, quick metrics, core module launchpad.
     - Staff Directory (src/app/staff/team/page.tsx): Directory table with member details, role badges, status badges, join dates, and Manage links.
     - Staff Invitation Form (src/app/staff/team/invite/page.tsx, InviteStaffForm.tsx): Dynamic role ceiling filtering, high-entropy password generation, zero external email policy, copyable temporary credentials banner.
     - Staff Detail & Management (src/app/staff/team/[id]/page.tsx, StaffDetailManager.tsx): Role modification dropdown (Super Admin only), account suspension/reactivation toggle with confirmation dialogs, and immutable audit log history timeline.
  4. Automated Verification Results (All 8 Suites Passed):
     - npm.cmd run test:phase3a5: 45 PASSED, 0 FAILED.
     - npm.cmd run test:phase3a3: 53 PASSED, 0 FAILED.
     - npm.cmd run test:phase3a2: 55 PASSED, 0 FAILED.
     - npm.cmd run test:phase3a1: 39 PASSED, 0 FAILED.
     - npm.cmd run test:phase2d: 41 PASSED, 0 FAILED.
     - npm.cmd run typecheck: 0 errors.
     - npm.cmd run lint: 0 errors, 0 warnings.
     - npm.cmd run build: 14/14 routes compiled and prerendered cleanly.
     - Bootstrap dry-run: Read-only preflight passed cleanly against bkqneudnnhvvwmtggorz.
  5. Invariants Maintained: Zero SQL migrations executed, zero database records modified, zero staff accounts created, zero secrets exposed, zero emails sent. Halted for explicit human approval for migration execution.

- 2026-10-29: Phase 3A Invitation Hardened & Phase 3B Customer/Catalog Master Architecture Completed:
  1. Invitation Flow Hardened (src/lib/auth/staff-actions.ts, InviteStaffForm.tsx):
     - Tagged provisioned Auth accounts with must_change_password: true metadata.
     - Integrated single-use cryptographic invitation setup link generation via Supabase Auth Admin generateLink().
     - Dual-mode delivery presented in UI: Option A (Single-Use Setup Link, recommended) and Option B (Direct Temporary Credentials fallback with zero plaintext DB storage).
  2. Phase 3B Master Architecture Prepared (docs/phase3/PHASE-3B-ARCHITECTURE.md):
     - Designed customer management supporting direct registration without prior enquiries (Workflows B, C, D).
     - Designed Option A master catalog (products_services table for construction machinery sales/rental, tender services, materials).
     - Statutory Indian GST place-of-supply, HSN/SAC codes, and NUMERIC(15,2) decimal monetary accuracy.
     - Separate staff navigation sections for Quotations and Billing.
  3. Automated Gates Passed Cleanly: All 8 test suites, typecheck (0 errors), lint (0 errors), and build (14/14 routes compiled).
  4. Invariants Maintained: Zero SQL migrations executed, zero database records modified, zero staff accounts created, zero emails sent. Halted at human approval gate.

- 2026-10-29: Phase 3A & Phase 3B Activation Preflight Verified:
  1. Target Environment Verified: Hard-checked against approved Supabase development project `bkqneudnnhvvwmtggorz`.
  2. Database Status Inspected: Confirmed Phase 2B (5 tables) and Phase 2D (`email_outbox`) are present and operational; confirmed Phase 3A enum and Phase 3B `products_services` are not yet applied.
  3. Preflight Quality Gates Passed (100%):
     - `npm.cmd run test:phase2d`: 41/41 PASSED
     - `npm.cmd run test:phase3a1`: 39/39 PASSED
     - `npm.cmd run test:phase3a2`: 55/55 PASSED
     - `npm.cmd run test:phase3a3`: 53/53 PASSED
     - `npm.cmd run test:phase3a5`: 45/45 PASSED
     - `npm.cmd run test:phase3b`: 47/47 PASSED
     - `npm.cmd run typecheck`: 0 errors
     - `npm.cmd run lint`: 0 errors, 0 warnings
     - `npm.cmd run build`: 18/18 routes compiled cleanly
     - `node scripts/bootstrap-super-admin.mjs --dry-run`: PASSED
  4. Post-Migration Verification Scripts Created & Registered:
     - `scripts/verify-phase3a-migration.mjs` (`npm run test:phase3a-status`)
     - `scripts/verify-phase3b-migration.mjs` (`npm run test:phase3b-status`)
     - `scripts/verify-super-admin.mjs` (`npm run test:super-admin`)
  5. Security & Safety Invariants Preserved: Zero secrets exposed, zero public auth UI leaks, zero unauthorized database mutations. Prepared for authorized execution sequence.

- 2026-10-29: Stage 3A Database Migrations Applied & Verified on Dev Sandbox (`bkqneudnnhvvwmtggorz`):
  1. User executed Step A (`ALTER TYPE public.staff_role_enum ADD VALUE IF NOT EXISTS 'super_admin'`) and Step B (`supabase/migrations/20261029120001_stage3a_step_b_rbac_enhancements.sql`) in Supabase SQL Editor.
  2. Executed `npm.cmd run test:phase3a-status`: ALL CHECKS PASSED.
     - Confirmed `'super_admin'` is present in `public.staff_role_enum`.
     - Confirmed anonymous SELECT on `public.staff_profiles` is blocked by RLS.
     - Confirmed anonymous EXECUTE denied on all 5 RPCs (`is_super_admin`, `is_active_staff`, `admin_update_staff_role`, `admin_update_staff_status`, `admin_create_staff_profile`).
     - Confirmed parameterless overloads `is_super_admin()` and `is_active_staff()` are compiled and functional.
     - Confirmed `admin_update_staff_role` and `admin_update_staff_status` enforce UNAUTHENTICATED caller checks.
     - Confirmed `admin_create_staff_profile` is compiled and enforces foreign key integrity with `auth.users`.
     - Confirmed `staff_profiles` is accessible to `service_role` (0 records currently).
  3. Regression Suites Verified Clean: `npm.cmd run test:phase3a3` (53/53 PASSED), `npm.cmd run test:phase3a5` (45/45 PASSED).
  4. Invariants Preserved: Zero accounts created, zero emails dispatched, zero git commits/pushes. Ready for human-approved initial Super Admin bootstrap.

- 2026-10-29: Phase 3C Full Quotation Management System Implemented & Verified:
  1. Exact Decimal & Indian GST Engine (`src/lib/quotation/calculations.ts`):
     - Exact half-up decimal rounding preventing IEEE 754 drift.
     - Place of supply engine: Intra-state (Delhi to Delhi: 50% CGST + 50% SGST), Inter-state (Delhi to other states: 100% IGST), Non-GST support.
     - Indian Rupee amount in words converter (`convertNumberToIndianWords`).
     - Quotation lifecycle transition validator (`isAllowedStatusTransition`).
  2. Database Architecture & Additive Migration (`supabase/migrations/20261029160000_phase3c_quotations.sql`):
     - Tables: `quotations`, `quotation_versions`, `quotation_items`, `quotation_acceptances`, `quotation_delivery_logs`.
     - Sequences & RPC: `quotation_number_seq`, `generate_quotation_number()`.
     - Strict `NUMERIC(15,2)` decimal types and RLS policies restricting access to active staff only.
     - Post-migration status verifier: `scripts/verify-phase3c-migration.mjs` (`npm run test:phase3c-status`).
  3. Server Actions & Business Logic (`src/lib/quotation/actions.ts`):
     - `createQuotationAction`, `issueQuotationAction`, `reviseQuotationAction`, `recordQuotationAcceptanceAction`, `updateQuotationStatusAction`, `recordQuotationDeliveryAction`.
     - Version locking: locks previous version snapshot and timestamps issuance.
     - Manual customer acceptance recording (channel, contact person, client PO number, notes).
     - Delivery event tracking with Resend outbox queue integration.
  4. User Interface & Printable PDF:
     - `/staff/quotations` (directory, KPI cards, search, status filters).
     - `/staff/quotations/new` & `QuotationForm.tsx` (customer selector, catalog picker, live GST calculation).
     - `/staff/quotations/[id]` & `QuotationDetailView.tsx` (detail view, version history switcher, acceptance modal).
     - `/staff/quotations/[id]/pdf` (print-optimized, branded official A4 PDF layout).
     - Updated `StaffSidebar.tsx` activating `Quotations` navigation item.
  5. Automated Verification Gates Passed (100%):
     - `npm.cmd run test:phase3c`: 72/72 PASSED.
     - `npm.cmd run test:phase3b`: 47/47 PASSED.
     - `npm.cmd run test:phase3a5`: 45/45 PASSED.
     - `npm.cmd run test:phase3a3`: 53/53 PASSED.
     - `npm.cmd run test:phase3a2`: 55/55 PASSED
     - `npm.cmd run test:phase3a1`: 39/39 PASSED.
     - `npm.cmd run test:phase2d`: 41/41 PASSED.
     - `npm.cmd run typecheck`: 0 errors.
     - `npm.cmd run lint`: 0 errors, 0 warnings.
     - `npm.cmd run build`: 20/20 routes compiled and prerendered cleanly.
  6. Invariants Preserved: Zero unapproved SQL migrations executed, zero privileged accounts created, zero emails dispatched, zero deployments, zero git commits/pushes. Ready for human review and database approvals.

- 2026-10-29: Phase 3D Billing, Invoicing & Payments System Implemented & Verified:
  1. Statutory Invoicing & Calculation Engine (`src/lib/billing/calculations.ts`, `src/lib/billing/company-config.ts`):
     - Configurable statutory company profile (`getCompanyBillingProfile()` with environment overrides; zero hardcoded Delhi assumptions).
     - Financial year boundary calculator (`getCurrentFinancialYear()`, April 1 transition, e.g. Oct 2026 -> `26-27`).
     - Exact Indian GST allocation: Intra-state (CGST + SGST) vs Inter-state (IGST).
     - Full support for Bill of Supply (Section 31(3)(c)) & Non-GST supply (0% tax).
     - Decimal precision with half-up rounding and nearest rupee grand totals.
     - Payment balance reconciliation: tracks multiple partial payments, handles status transitions (`draft` -> `issued` -> `partially_paid` -> `paid`, `overdue`, `cancelled`).
     - CGST Rule 46(b) gapless numbering format: `formatStatutoryInvoiceNumber()`.
  2. Database Architecture & Additive Migration (`supabase/migrations/20261029180000_phase3d_billing_and_payments.sql`):
     - Enums: `invoice_type_enum`, `invoice_status_enum`, `payment_method_enum`.
     - Gapless sequence engine: `public.invoice_sequence_counters` and atomic stored procedure `allocate_invoice_number(p_fy, p_series)` with `FOR UPDATE` row lock.
     - Tables: `public.invoices`, `public.invoice_items`, `public.invoice_payments`.
     - Strict `NUMERIC(15,2)` decimal constraints and positive amount checks.
     - Row Level Security (RLS) enabled on all 4 billing tables; access revoked from `PUBLIC` and `anon`; authenticated access governed by role (`super_admin`, `admin`, `billing_manager`).
     - Post-migration status verifier: `scripts/verify-phase3d-migration.mjs` (`npm run test:phase3d-status`).
  3. Server Actions & Business Workflows (`src/lib/billing/actions.ts`):
     - `createInvoiceAction`: creates draft invoice for direct sales/services (Workflows C & D).
     - `convertQuotationToInvoiceAction`: converts accepted quotation to draft invoice with snapshot preservation and duplicate conversion guard (Workflow B).
     - `issueInvoiceAction`: allocates statutory gapless invoice number via stored procedure and locks invoice.
     - `recordPaymentAction`: records payment receipts (`RCPT-YYYY-XXXXX`), reconciles balance, and updates status.
     - `cancelInvoiceAction`: voids invoice with audit reason; forbids cancellation if payments exist.
  4. User Interface & Statutory Printable PDF:
     - `/staff/billing` (Directory & KPI cards: Invoiced, Collected, Balance, Overdue; Search & Status filters).
     - `/staff/billing/new` & `InvoiceForm.tsx` (Direct invoice creation & Quotation conversion tab).
     - `/staff/billing/[id]` & `InvoiceDetailView.tsx` (Detail view, payment recording modal, void modal).
     - `/staff/billing/[id]/pdf` (Statutory A4 Tax Invoice / Bill of Supply printable layout).
     - Updated `StaffSidebar.tsx` activating `GST Invoices` navigation item.
  5. Automated Verification Gates Passed (100%):
     - `npm.cmd run test:phase3d`: 35/35 PASSED.
     - `npm.cmd run test:phase3c`: 72/72 PASSED.
     - `npm.cmd run test:phase3b`: 47/47 PASSED.
     - `npm.cmd run test:phase3a5`: 45/45 PASSED.
     - `npm.cmd run test:phase3a3`: 53/53 PASSED.
     - `npm.cmd run test:phase3a2`: 55/55 PASSED.
     - `npm.cmd run test:phase3a1`: 39/39 PASSED.
     - `npm.cmd run test:phase2d`: 41/41 PASSED.
     - `npm.cmd run test:security`: 17/17 PASSED.
     - Total Automated Assertions: 404 PASSED, 0 FAILED across all 9 test suites.
     - `npm.cmd run typecheck`: 0 errors.
     - `npm.cmd run lint`: 0 errors, 0 warnings.
     - `npm.cmd run build`: 30/30 routes compiled and prerendered cleanly.
  6. Invariants Preserved: Zero unapproved SQL migrations executed, zero privileged accounts created, zero emails dispatched, zero deployments, zero git commits/pushes. Ready for human review and database approvals.

## Agent update discipline
Record actual code changes and tests promptly. Never change 'not started' to 'completed' until verified. Mark reversed decisions superseded with date; do not erase history.


