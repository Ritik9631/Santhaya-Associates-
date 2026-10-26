# MEMORY.md — Project continuity log
Updated: 2026-10-26 | Phase: 0 preparation | Implementation status: NOT STARTED

## Confirmed decisions
- Project: Santhaya Associates corporate website plus staff-only quotation and GST billing system.
- Public quotation requests require no client login; staff manage quotations.
- Business areas: government/private construction tenders, construction machinery supply, manufacturing machinery supply.
- Stack: Next.js App Router + strict TypeScript + Tailwind + shadcn/ui; Supabase PostgreSQL/Auth/RLS planned; Vercel hosting; GitHub; server-generated PDFs and transactional email later.
- Brand palette: navy #10243B, gold #F4B323, white #FFFFFF; use actual company logo when supplied.
- Indian GST invoicing planned; place-of-supply, tax classifications and invoice obligations require accountant validation.
- Work in sequential phases with explicit human approval before proceeding.

## Implemented features
None. No application scaffold or backend has been verified.

## Completed tasks
- 2026-10-26: Prepared Santhaya-only starter documentation and preserved the technical executive summary as reference.
- 2026-10-26: Initialized local Git repository and created initial commit for asset and history traceability.
- 2026-10-26: Verified genuine brand assets in `public/`:
  - `santhaya-logo-header.png` (1045x795, 1.314 aspect ratio, RGB): Used for website header with strict aspect ratio preservation.
  - `santhaya-symbol.png` (480x550, 0.873 aspect ratio, RGB): Used as compact brand icon in mobile menu, footer, and browser icons.
  - `full-brand-reference.png` (1254x1254, 1.000 aspect ratio, RGB): Featured on homepage showcase as official visual reference.
- 2026-10-26: Verified runtime environment: Node v24.18.1, npm 11.16.0 (via `npm.cmd` on Windows).
- 2026-10-26: Scaffolding completed: Next.js 14 App Router, TypeScript strict mode, Tailwind CSS with palette (`#10243B`, `#F4B323`, `#FFFFFF`).
- 2026-10-26: Built responsive Header component (`src/components/Header.tsx`) using `santhaya-logo-header.png` (`aspect-[1045/795]`, `object-contain`), desktop navigation, mobile drawer with `santhaya-symbol.png`, and quotation CTA.
- 2026-10-26: Built Footer component (`src/components/Footer.tsx`) with brand symbol, 3-pillar links, and unverified address/phone/GSTIN marked clearly as sample placeholders.
- 2026-10-26: Built Homepage (`src/app/page.tsx`), Services page (`src/app/services/page.tsx`), About page (`src/app/about/page.tsx`), Privacy placeholder (`src/app/privacy/page.tsx`), and Terms placeholder (`src/app/terms/page.tsx`).
- 2026-10-26: Built non-operational demo quotation form (`/request-quotation`) with Zod client validation, prominent demo banner, and no false submission claims.
- 2026-10-26: QA gate executed:
  - `npm run typecheck`: Passed (0 errors)
  - `npm run lint`: Passed (0 errors)
  - `npm run build`: Passed (9/9 routes prerendered)
  - HTTP server test: All endpoints returned status 200 with verified brand image references.

## Current phase and pending tasks
- [x] Place genuine logo asset in `public/` if available.
- [x] User approval of Phase 1 architecture and file structure.
- [x] Phase 1 scaffold: Next.js App Router + TypeScript + Tailwind CSS.
- [x] Implement responsive website header with `santhaya-logo-header.png` and `santhaya-symbol.png` (no distortion, preserved colors #10243B / #F4B323).
- [x] Public pages (Home with 3 verified pillars, About, Services, How We Work, Privacy, Terms).
- [x] Non-operational demo quotation form (`/request-quotation`) with client validation and explicit non-saving notice.
- [x] Phase 1 lint/typecheck/build, navigation, responsive, and accessibility QA.
- [ ] User review and Phase 1 completion gate approval.
- [ ] Phase 2 secure Supabase persistence and anti-spam.
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
Supabase planned; no tables, migrations, endpoints or policies implemented. Phase 1 operates strictly client-side for demonstration.

## Reusable components
- `Header`: Responsive brand header with desktop nav, mobile drawer, and CTA.
- `Footer`: Comprehensive corporate footer with scope lock, unverified disclaimer, and compliance links.

## Assumptions / awaiting confirmation
Exact legal name confirmed as "Santhaya Associates Pvt. Ltd." via official logo asset. Official registered office address, phone, email, GSTIN, domain, and staff roles remain configurable placeholders.

## Session log
- 2026-10-26: Confirmed construction tenders and machinery supply as exclusive business scope.
- 2026-10-26: Inspected authentic brand assets in `public/`.
- 2026-10-26: Received user approval for Phase 1 scaffolding. Implemented responsive header, homepage, 3 service pillars, about page, legal placeholders, and demo quotation form. Completed typecheck, lint, build, and HTTP verification. All checks passed.

## Agent update discipline
Record actual code changes and tests promptly. Never change 'not started' to 'completed' until verified. Mark reversed decisions superseded with date; do not erase history.
