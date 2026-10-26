# MEMORY.md — Project continuity log
Updated: 2026-10-27 | Phase: 2 Planning | Implementation status: Phase 1 Completed & Approved; Phase 2 Planning

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
- [ ] User review and approval of migration SQL file and Phase 2B implementation report.
- [ ] Phase 2B execution: apply database schema migrations and RLS policies on Supabase.
- [ ] Phase 2B execution: implement server-side validation pipeline and `/api/quotation-request` route handler.
- [ ] Phase 2B execution: connect client form to live API endpoint and verify live submission receipt badge.
- [ ] Phase 2B execution: run integration test suite (SEC-01 through SEC-15).
- [ ] Phase 3 staff auth/roles/dashboard.
- [ ] Phase 4 quotation PDFs and lifecycle.
- [ ] Phase 5 GST invoices, orders and payment tracking after professional review.
- [ ] Phase 6 security, accessibility, backup, compliance and deployment checks.

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

## Agent update discipline
Record actual code changes and tests promptly. Never change 'not started' to 'completed' until verified. Mark reversed decisions superseded with date; do not erase history.
