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

## Current phase and pending tasks
- [ ] User review/approval of starter documentation and unresolved business questions.
- [ ] Place genuine logo asset in `public/` if available.
- [ ] Open workspace in Antigravity and run Phase 1 prompt after approval.
- [ ] Phase 1 scaffold, public website and non-operational demo quotation form.
- [ ] Phase 1 lint/typecheck/build, navigation, responsive and validation QA.
- [ ] Phase 2 secure Supabase persistence and anti-spam.
- [ ] Phase 3 staff auth/roles/dashboard.
- [ ] Phase 4 quotation PDFs and lifecycle.
- [ ] Phase 5 GST invoices, orders and payment tracking after professional review.
- [ ] Phase 6 security, accessibility, backup, compliance and deployment checks.

## Design decisions
Brand palette confirmed; final logo, typography, imagery and copy pending.

## API and database decisions
Supabase planned; no tables, migrations, endpoints or policies implemented. Initial conceptual entities: customers, requests, quotations, quotation_items, sales_orders, invoices, invoice_items, payments, audit_logs, staff roles.

## Reusable components
None implemented.

## Assumptions / awaiting confirmation
Exact legal name including 'Pvt. Ltd.', logo file, address, phone, email, GSTIN, domain, staff roles, approved content, invoice requirements and applicable tax classifications.

## Session log
- 2026-10-26: Confirmed construction tenders and machinery supply as exclusive business scope; development not started.

## Agent update discipline
Record actual code changes and tests promptly. Never change 'not started' to 'completed' until verified. Mark reversed decisions superseded with date; do not erase history.
