# Santhaya Associates — Phase 3 Implementation Roadmap & Gate Control
## Staged Implementation Plan from Authentication to Enterprise Invoicing

**Project:** Santhaya Associates Pvt. Ltd. — Web Platform & Internal Operating System  
**Document:** `docs/phase3/PHASE-3-IMPLEMENTATION-ROADMAP.md`  
**Version:** 1.0 (Implementation Roadmap & Gate Control)  
**Date:** 2026-10-28  
**Status:** Architecture Proposal — Planning Only (Awaiting Human Review)  

---

## 1. Phased Stage Breakdown

In compliance with **RULES §2** and **AGENTS.md**, Phase 3 is divided into five sequential, testable stages. No stage may begin without explicit human review and approval of the preceding stage's test results.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASE 3 STAGED EXECUTION                        │
├───────────────┬────────────────────────────────────────────────────────┤
│ Stage 3A      │ Staff Authentication, Sessions & Administration        │
│               │ /staff/login, middleware session guard, staff_profiles │
│               │ RBAC, admin invitation modal, active/inactive control. │
├───────────────┼────────────────────────────────────────────────────────┤
│ Stage 3B      │ Customer CRM & Website Enquiry Qualification           │
│               │ /staff/enquiries, /staff/customers, lead qualification │
│               │ duplicate detection, optional contact intake.          │
├───────────────┼────────────────────────────────────────────────────────┤
│ Stage 3C      │ Master Catalog & Quotation Lifecycle (Option A)        │
│               │ /staff/catalog, /staff/quotations, multi-versioning,   │
│               │ line item price freezing, manual acceptance recording. │
├───────────────┼────────────────────────────────────────────────────────┤
│ Stage 3D      │ Billing, Indian GST Invoicing & Payment Tracking       │
│               │ /staff/billing, gapless sequence, CGST/SGST/IGST,      │
│               │ payment recording trigger, balance reconciliation.     │
├───────────────┼────────────────────────────────────────────────────────┤
│ Stage 3E      │ PDF Generation, Storage Security & System QA           │
│               │ Server-rendered PDFs, private storage, signed URLs,    │
│               │ outbox email dispatch, end-to-end multi-workflow QA.   │
└───────────────┴────────────────────────────────────────────────────────┘
```

---

## 2. Stage-by-Stage Detailed Specifications

### Stage 3A: Staff Authentication, Session Infrastructure & Staff Admin
- **Objective**: Establish the protected private domain. Implement staff-only login, session cookie management, role authorization, and staff user administration.
- **Dependencies**: `@supabase/ssr`, Next.js Middleware.
- **Files Likely to Change**:
  - `src/middleware.ts` (Implement session check and redirect unauthenticated requests away from `/staff/*`).
  - `src/app/(staff-auth)/staff/login/page.tsx` (Staff login form).
  - `src/app/staff/layout.tsx` (Protected app shell, sidebar navigation, user badge, logout action).
  - `src/app/staff/settings/staff/page.tsx` (Super Admin user roster, role assignment, active/inactive toggle).
  - `src/lib/auth/session.ts` (Server-side session verification helper).
- **Database Changes**:
  - None required (uses existing `public.staff_profiles` and `public.staff_role_enum`).
  - Add RLS policy allowing Super Admins to invite and update staff profiles.
- **Security Requirements**:
  - `auth.signUp` disabled permanently.
  - Creating an auth user without an active `staff_profiles` row grants zero access.
  - Active session required on all `/staff/*` paths.
- **Test Plan**:
  - Attempt login with invalid credentials → error displayed.
  - Login as active staff → redirected to `/staff/dashboard`.
  - Toggle staff `is_active = false` → session rejected immediately on next page load.
  - Attempt accessing `/staff/settings/staff` as Estimator → HTTP 403 Forbidden.
- **Rollback Consideration**: Revert middleware and layout files; remove test staff auth users.
- **Human Approval Checkpoint**: Review login behavior, session persistence, and role enforcement before proceeding to Stage 3B.

---

### Stage 3B: Customer CRM & Website Enquiry Qualification
- **Objective**: Implement enquiry review pipeline and customer management with duplicate detection.
- **Dependencies**: Stage 3A complete.
- **Files Likely to Change**:
  - `src/app/staff/enquiries/page.tsx` (Filterable inquiry list).
  - `src/app/staff/enquiries/[id]/page.tsx` (Detail view, staff notes, quote conversion button).
  - `src/app/staff/customers/page.tsx` (Customer directory, search, duplicate warnings).
  - `src/app/staff/customers/new/page.tsx` (Customer creation form with optional email/phone).
  - `src/app/staff/customers/[id]/page.tsx` (Customer detail view, linked quotes, invoices).
  - `src/lib/customers/duplicate-check.ts` (GSTIN/phone similarity check).
- **Database Changes**:
  - None required (uses existing `public.customers` and `public.quotation_requests`).
  - Apply RLS policies on `public.customers` allowing active staff to SELECT, INSERT, UPDATE.
- **Security Requirements**:
  - Staff customer intake allows NULL email and NULL phone.
  - Customer records visible only to authenticated active staff.
  - Customer delete restricted to Super Admins.
- **Test Plan**:
  - View public enquiries submitted during Phase 2D (`INQ-2026-00001`, `INQ-2026-00002`).
  - Add internal qualification notes to an inquiry.
  - Create a customer profile with only company name, billing state, and address (no phone/email).
  - Enter an existing GSTIN → verify duplicate warning prompt triggers.
- **Human Approval Checkpoint**: Verify customer and inquiry management workflows before proceeding to Stage 3C.

---

### Stage 3C: Master Catalog & Quotation Lifecycle (Option A)
- **Objective**: Implement reusable catalog items, quotation draft builder, multi-version revisions, and manual customer acceptance recording.
- **Dependencies**: Stage 3B complete.
- **Files Likely to Change**:
  - `src/app/staff/catalog/page.tsx` (Catalog list, rates, unit types).
  - `src/app/staff/catalog/new/page.tsx` (Create catalog item).
  - `src/app/staff/quotations/page.tsx` (Quotations list, status filters).
  - `src/app/staff/quotations/new/page.tsx` (Quotation builder form with custom + catalog items).
  - `src/app/staff/quotations/[id]/page.tsx` (Version switcher, details, acceptance modal).
  - `src/app/staff/quotations/[id]/revision/page.tsx` (Create revision R1, R2).
- **Database Changes**:
  - Add additive migration creating `public.products_services`, `public.quotations`, `public.quotation_versions`, `public.quotation_items`, `public.quotation_acceptances`.
  - Add RLS policies for active staff.
- **Security Requirements**:
  - Quotation items lock upon issuance (`is_locked = true`).
  - Quotation customer acceptance recorded manually by staff with audit logs.
  - `quotations.enquiry_id` is strictly nullable (supports direct quotes via Workflow B).
- **Test Plan**:
  - Create a quotation from a website inquiry (Workflow A).
  - Create a direct quotation without an inquiry (Workflow B).
  - Add a custom line item not present in the master catalog.
  - Issue version R0 → create revision R1 → confirm R0 is locked and immutable.
  - Record manual acceptance on R1 with PO number → verify status transitions to `accepted`.
- **Human Approval Checkpoint**: Verify quote drafting, revision cloning, and manual acceptance before proceeding to Stage 3D.

---

### Stage 3D: Billing, Indian GST Invoicing & Payment Reconciliation
- **Objective**: Implement tax invoice builder, Indian GST computation engine (CGST/SGST/IGST), gapless sequence allocation, payment recording, and balance reconciliation.
- **Dependencies**: Stage 3C complete.
- **Files Likely to Change**:
  - `src/app/staff/billing/page.tsx` (Invoice list, payment status filters).
  - `src/app/staff/billing/new/page.tsx` (Invoice builder — direct or from accepted quote).
  - `src/app/staff/billing/[id]/page.tsx` (Invoice view, tax breakdown, payment modal).
  - `src/lib/tax/gst-engine.ts` (Place of supply tax computation rules).
- **Database Changes**:
  - Add additive migration creating `public.invoices`, `public.invoice_items`, `public.payments`.
  - Add database triggers: `sync_invoice_payment_totals()` and `prevent_issued_invoice_mutation()`.
  - Add RLS policies for billing managers and admins.
- **Security Requirements**:
  - Invoice numbers assigned only at issuance (`status = 'issued'`).
  - Issued invoices are locked against subtotal/tax changes (alterations require formal Credit Notes).
  - Balance due automatically recalculated by trigger upon payment insertion.
- **Test Plan**:
  - Convert accepted quote from Stage 3C into an invoice draft.
  - Create a direct invoice without a quotation (Workflow C/D).
  - Test intrastate customer (Maharashtra) → verify 9% CGST + 9% SGST applied.
  - Test interstate customer (Gujarat) → verify 18% IGST applied.
  - Issue invoice → verify statutory gapless sequence assigned.
  - Record partial payment → verify `balance_due` decrements and status is `partially_paid`.
  - Record remaining balance + TDS credit → verify status transitions to `paid`.
- **Human Approval Checkpoint**: Verify GST tax breakdowns, invoice issuance locking, and payment reconciliation before proceeding to Stage 3E.

---

### Stage 3E: Server-Side PDF Generation, Storage Security & System QA
- **Objective**: Implement branded PDF generation for quotes and invoices, private bucket storage, signed URL downloads, Resend document email delivery, and end-to-end multi-workflow verification.
- **Dependencies**: Stage 3D complete.
- **Files Likely to Change**:
  - `src/lib/pdf/render-quotation.tsx` (Quotation PDF template with Navy/Gold branding).
  - `src/lib/pdf/render-invoice.tsx` (Tax Invoice PDF template with GSTIN, HSN, bank details).
  - `src/app/api/documents/[id]/download/route.ts` (Authenticated signed URL endpoint).
  - `src/lib/email/templates/quotation-delivery.ts` (Client quote email template).
  - `src/lib/email/templates/invoice-delivery.ts` (Client invoice email template).
- **Database Changes**:
  - Add additive migration creating `public.document_records`.
  - Configure Supabase Storage private bucket `private-documents`.
- **Security Requirements**:
  - Documents stored in private bucket (`public = false`).
  - Downloads route through authenticated endpoint issuing 15-minute temporary signed URLs.
  - SHA-256 checksum recorded for every generated document.
- **Test Plan**:
  - Generate and download a Quotation PDF → verify visual alignment and branding.
  - Generate and download a Tax Invoice PDF → verify tax breakdown and HSN summary table.
  - Trigger email delivery of quotation to client → verify outbox job created and dispatched.
  - Run full QA across all four workflows (Workflows A, B, C, D).
- **Human Approval Checkpoint**: Final review of all Phase 3 deliverables prior to deployment readiness.

