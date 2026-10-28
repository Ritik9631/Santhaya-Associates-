# Phase 2C: Comprehensive Implementation Roadmap & Gate Control
## Phased Rollout from Public Enquiry Ingestion to Enterprise Billing

**Project:** Santhaya Associates Pvt. Ltd. — Web Platform & Internal Operating System  
**Document:** `docs/PHASE-2C-IMPLEMENTATION-ROADMAP.md`  
**Version:** 1.0 (Master Implementation Roadmap)  
**Date:** 2026-10-28  
**Status:** Architecture Proposal — Planning Only (Awaiting Human Review)  

---

## 1. Phased Delivery Overview & Gate Model

In strict compliance with **RULES §2** and **AGENTS.md**, the platform evolves in sequential, individually reviewable phases. No agent or automated pipeline may advance to a subsequent phase without explicit human approval.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASED EXECUTION ROADMAP                        │
├───────────────┬────────────────────────────────────────────────────────┤
│ Phase 2C      │ Architecture & Consolidated Planning (Current)         │
│ (CURRENT)     │ Deliverables: Architecture, DB, Email, Security plans. │
│               │ Status: COMPLETED — HALTED FOR HUMAN REVIEW            │
├───────────────┼────────────────────────────────────────────────────────┤
│ Phase 2D      │ Public Enquiry Persistence & Durable Gmail Alerting    │
│ (NEXT STEP)   │ Wire form to /api/quotation-request, honeypot, DB      │
│               │ rate-limiter, atomic outbox, live receipt badge.       │
├───────────────┼────────────────────────────────────────────────────────┤
│ Phase 3A      │ Staff Authentication & Customer Management             │
│               │ Private login (/staff/login), 10 dashboard sections,   │
│               │ lead qualification, master customer directory, RBAC.  │
├───────────────┼────────────────────────────────────────────────────────┤
│ Phase 3B      │ Product Catalog & Quotation Lifecycle                  │
│               │ Catalog Option A, direct quotes, multi-versioning,     │
│               │ manual acceptance, PDF generator, email dispatch.      │
├───────────────┼────────────────────────────────────────────────────────┤
│ Phase 3C      │ Billing, GST Invoicing & Payment Tracking              │
│               │ Direct invoices, quote conversion, accountant GST gate,│
│               │ invoice PDFs, progressive payments, balance trigger.   │
├───────────────┼────────────────────────────────────────────────────────┤
│ Phase 3D      │ Integration Testing, Audit & Go-Live Readiness         │
│               │ Full multi-workflow QA, tax rounding audit, backup/    │
│               │ PITR drill, accessibility audit, written go-live gate. │
└───────────────┴────────────────────────────────────────────────────────┘
```

---

## 2. Phase 2C — Architecture Planning (CURRENT PHASE)

- **Goal**: Consolidate business workflows, database schema additions, email integration, and security boundaries into executable plans.
- **Scope**:
  - Four independent business workflows (Workflows A, B, C, D).
  - 10 staff dashboard sections.
  - Catalog Option A (saved catalog items + custom line items).
  - Decoupled quotation and invoice schema plans.
  - Durable email outbox and Gmail receiving architecture.
  - Security threat modeling and RLS matrix.
- **Affected Files**:
  - `docs/PHASE-2C-ARCHITECTURE.md` (Created)
  - `docs/PHASE-2C-DATABASE-PLAN.md` (Created)
  - `docs/PHASE-2C-EMAIL-PLAN.md` (Created)
  - `docs/PHASE-2C-SECURITY-PLAN.md` (Created)
  - `docs/PHASE-2C-IMPLEMENTATION-ROADMAP.md` (Created)
  - `MEMORY.md` (Updated)
- **Status**: **COMPLETED**. Halted for human review.

---

## 3. Phase 2D — Enquiry Persistence & Durable Gmail Notifications

- **Goal**: Connect the public quotation intake form to live database persistence with anti-spam protections and durable Gmail notification delivery.
- **Scope**:
  - Implement Next.js Route Handler `src/app/api/quotation-request/route.ts`.
  - Implement server-side Zod validation with sanitized text normalization.
  - Implement anti-bot decoy honeypot field (`_company_fax`) with silent fake-success discard.
  - Implement trusted edge IP extraction (`x-real-ip` / `x-vercel-forwarded-for`) with salted SHA-256 hash.
  - Integrate atomic PostgreSQL rate-limiter `public.check_rate_limit`.
  - Add additive migration for `public.email_outbox` table and sequence.
  - Update `public.submit_quotation_request` RPC to atomically insert the enquiry and enqueue an outbox job in a single transaction.
  - Implement transactional email dispatcher worker using the provider-independent adapter (`src/lib/email/*`).
  - Wire frontend form `src/app/request-quotation/page.tsx` with client-generated UUID v4 `Idempotency-Key` and replace demo warning with verified live reference badge.
- **Files Likely to Change**:
  - `src/app/api/quotation-request/route.ts` (New)
  - `src/lib/email/types.ts` (New)
  - `src/lib/email/provider.ts` (New)
  - `src/lib/email/templates/enquiry-alert.tsx` (New)
  - `src/app/request-quotation/page.tsx` (Update)
  - `supabase/migrations/20261028120000_phase2d_email_outbox.sql` (New)
- **Dependencies**: Transactional email SDK (e.g. `resend` or `@aws-sdk/client-ses`), `crypto`.
- **Security Controls**:
  - Honeypot decoy blocks bot submissions without captcha friction.
  - Salted SHA-256 hash prevents IP exposure in database.
  - Client-side form has zero access to server keys.
  - Public website remains 100% accessible without visitor login.
- **Tests**:
  - Verify SEC-01 through SEC-05 against live sandbox.
  - Verify honeypot rejection, sub-1.0s risk flagging, and atomic rate limiter exhaustion.
  - Verify outbox row creation and delivery to company Gmail.
- **Approval Gate**: Human review of live submission receipt badge, database record, and test email delivery before advancing to Phase 3A.

---

## 4. Phase 3A — Staff Dashboard & Customer Management

- **Goal**: Implement secure staff authentication and the foundational customer directory.
- **Scope**:
  - Private staff login screen at `/staff/login` using `@supabase/ssr` server actions and HTTP-only session cookies.
  - Private dashboard layout at `/staff/dashboard` incorporating the 10 navigation sections.
  - `noindex, nofollow` metadata and XML sitemap exclusions.
  - Role-based authorization guard in Next.js middleware and server layout checking `staff_profiles.is_active` and assigned role.
  - Enquiry Management view: List, filter, inspect technical requirements, review bot signals, and assign staff.
  - Customer Management view: Master customer registry, legal names, GSTIN validation, place of supply, addresses, and history.
  - Qualification engine: Link an inquiry to an existing customer or provision a new customer row.
- **Files Likely to Change**:
  - `src/app/staff/login/page.tsx` (New)
  - `src/app/staff/dashboard/layout.tsx` (New)
  - `src/app/staff/dashboard/overview/page.tsx` (New)
  - `src/app/staff/dashboard/enquiries/page.tsx` (New)
  - `src/app/staff/dashboard/customers/page.tsx` (New)
  - `src/middleware.ts` (New/Update)
  - `src/components/dashboard/*` (New)
- **Security Controls**:
  - Zero public auth links.
  - Admin-provisioned staff accounts only (no public signups).
  - Anti-self-escalation enforced via RLS.
  - Session cookies configured `httpOnly: true, secure: true, sameSite: 'lax'`.
- **Tests**:
  - Verify unauthorized access to `/staff/dashboard` redirects to `/staff/login`.
  - Verify inactive staff accounts are immediately denied access.
  - Verify estimators cannot perform admin tasks.
- **Approval Gate**: User approval of staff authentication, navigation, and customer registry before Phase 3B.

---

## 5. Phase 3B — Product Catalog & Quotation Lifecycle

- **Goal**: Implement Catalog Option A, direct quotes, multi-versioning, manual acceptance, and PDF generation.
- **Scope**:
  - Additive migration for `products_services`, `quotations`, `quotation_versions`, `quotation_items`, `quotation_acceptances`.
  - Product Catalog view: Manage machinery, rental equipment, materials, transport, and service rates with default HSN/SAC and tax codes.
  - Workflow B (Direct Quotation): Create quotation directly without website inquiry (`enquiry_id IS NULL`).
  - Workflow A (Enquiry-to-Quotation): Create quotation from qualified web enquiry.
  - Custom line-item support: Add custom items directly to quotes with optional "Save to Catalog" button.
  - Quotation versioning engine: Modifying a quotation creates a new `quotation_versions` row.
  - Manual acceptance dialog: Record date, method, signatory, and upload PO/proof.
  - Server-side PDF generation: Navy/Gold branded commercial quotation PDF.
  - Private Supabase Storage bucket `quotations_private` with short-lived signed URLs.
  - Email dispatch: Send quotation PDF to customer via transactional outbox.
- **Files Likely to Change**:
  - `src/app/staff/dashboard/catalog/page.tsx` (New)
  - `src/app/staff/dashboard/quotations/page.tsx` (New)
  - `src/app/staff/dashboard/quotations/create/page.tsx` (New)
  - `src/app/staff/dashboard/quotations/[id]/page.tsx` (New)
  - `src/lib/pdf/quotation-pdf.tsx` (New)
  - `supabase/migrations/20261029120000_phase3b_catalog_and_quotations.sql` (New)
- **Security Controls**:
  - Accepted quotation versions are locked against mutation.
  - Line-item prices are frozen in snapshots, immune to subsequent catalog edits.
  - Private storage bucket prevents unauthorized document access.
- **Tests**:
  - Verify direct quotation creation without enquiry.
  - Verify custom item creation and snapshot freezing.
  - Verify version incrementing upon edit.
  - Verify signed PDF download URL expires after 15 minutes.
- **Approval Gate**: User review and verification of quotation workflow, versioning, and PDF layout before Phase 3C.

---

## 6. Phase 3C — Billing, GST Invoices & Payment Tracking

- **Goal**: Implement independent invoicing, quotation-to-invoice conversion, GST tax calculation, and payment tracking.
- **Scope**:
  - Additive migration for `invoices`, `invoice_items`, `payments`, `document_records`.
  - Workflow C & D (Direct Invoice / Service Billing): Create invoice directly without quotation (`quotation_id IS NULL`).
  - Workflow A & B (Quotation Conversion): Convert accepted quotation version to invoice draft.
  - Decimal-safe tax calculation engine: Calculate CGST, SGST, IGST based on Supplier State vs Place of Supply.
  - **Statutory Review Gate**: Certified Indian Chartered Accountant sign-off on tax classifications, HSN/SAC codes, and invoice numbering.
  - Invoice issuance lock: Transition from `draft` to `issued` freezes financial values permanently.
  - Invoice PDF generation and private storage in `invoices_private`.
  - Payment tracking: Record full/partial bank transfers, NEFT/RTGS UTR numbers, and cheque receipts.
  - Database trigger `recalculate_invoice_payment_status()` updates balances and prevents overpayment.
- **Files Likely to Change**:
  - `src/app/staff/dashboard/billing/page.tsx` (New)
  - `src/app/staff/dashboard/billing/create/page.tsx` (New)
  - `src/app/staff/dashboard/billing/[id]/page.tsx` (New)
  - `src/app/staff/dashboard/payments/page.tsx` (New)
  - `src/lib/tax/gst-engine.ts` (New)
  - `src/lib/pdf/invoice-pdf.tsx` (New)
  - `supabase/migrations/20261030120000_phase3c_billing_and_payments.sql` (New)
- **Security Controls**:
  - Issued invoices are immutable financial snapshots.
  - Double-entry trigger strictly prevents $\sum \text{Payments} > \text{Invoice Total}$.
  - Sequential invoice series protected by database locks against gaps.
- **Tests**:
  - Verify direct invoice creation without quotation.
  - Verify intra-state (CGST+SGST) vs inter-state (IGST) tax allocation.
  - Verify overpayment prevention trigger.
  - Verify partial payment balance tracking.
- **Approval Gate**: Certified accountant sign-off and user approval of invoice calculations and payment tracking before Phase 3D.

---

## 7. Phase 3D — Integration Testing & Release Readiness

- **Goal**: Comprehensive end-to-end multi-workflow verification and production readiness certification.
- **Scope**:
  - Automated test suite validating all 4 independent workflows (Workflows A, B, C, D).
  - 100-case financial rounding simulation verifying zero decimal drift.
  - Email outbox failure injection and retry recovery test.
  - Headless Chrome accessibility audit (WCAG AA compliance) and Core Web Vitals audit.
  - Mobile responsiveness audit across 375px, 768px, 1366px, and 1920px viewports.
  - Database backup, disaster recovery, and point-in-time recovery (PITR) documentation.
  - Pre-deployment security audit (verifying zero secret key leakage in production build).
- **Deliverables**: Comprehensive Final QA and Compliance Report.
- **Approval Gate**: Written user authorization prior to any production deployment.
