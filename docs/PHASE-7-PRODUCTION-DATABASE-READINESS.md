# SANTHAYA ASSOCIATES — PHASE 7: PRODUCTION DATABASE READINESS AUDIT

**Target Production Supabase Project:** `flxhwgevmqvuqdjaejwa`  
**Target Region:** `ap-southeast-1` (Singapore)  
**Development Supabase Project:** `bkqneudnnhvvwmtggorz` (Preserved 100% intact)  
**Hosting Target:** Hostinger Next.js Hosting (Node.js Web Apps)  
**Repository & Branch:** `https://github.com/Ritik9631/Santhaya-Associates-.git` on `master`  
**Document Revision:** 1.0.0  
**Audit Date:** November 6, 2026  
**Audit Verdict:** **READY FOR CONTROLLED PRODUCTION MIGRATION** (Subject to approved sequential execution and human Super Admin onboarding)

---

## 1. Executive Summary & Audit Scope

This readiness audit establishes the complete, verified, and safe database migration roadmap for the new production Supabase project (`flxhwgevmqvuqdjaejwa`).

The audit strictly adheres to zero-mutation safety rules:
1. **Zero Development Alteration:** The development database (`bkqneudnnhvvwmtggorz`) remains completely unaffected, retaining all historical transactions (13 quotations, 3 invoices, 1 payment, 6 customers, 57 enquiries, 76 email outbox jobs, and 99 audit logs).
2. **Zero Premature Production Mutation:** No SQL execution, automated migration (`supabase db push`/`reset`), or data copying has occurred against `flxhwgevmqvuqdjaejwa`.
3. **Zero Secret Leakage:** No database passwords, service-role keys, or JWT tokens are exposed, logged, or checked into Git.
4. **Clean Production Start:** The production database schema will be initialized with **zero business transactions**, starting counters from official baseline sequences.

---

## 2. Migration Files Inventory & Reconciliation

A comprehensive audit of the repository's `supabase/migrations/` directory identified **14 total files**:
- **12 Migration SQL Files**
- **2 Read-Only Verification SQL Scripts** (`verify_stage3a.sql`, `verify_stage3b.sql`)

### 2.1 Complete File Inventory & Status

| # | File Name | Size | Scope & Subsystems | Production Status |
|---|---|---|---|---|
| 1 | `20261026120000_phase2_schema_and_security.sql` | 25.7 KB | Core extensions, 4 enums, `staff_profiles`, `customers`, `quotation_requests`, `rate_limits`, `audit_logs`, immutable triggers, RLS. | **APPROVED (Step 1)** |
| 2 | `20261028120000_phase2d_email_outbox.sql` | 14.8 KB | `email_status_enum`, `email_outbox` table, atomic enquiry submission RPC, `claim_email_outbox_batch` with row-locking. | **APPROVED (Step 2)** |
| 3 | `20261029120000_stage3a_staff_auth_enhancements.sql` | 18.9 KB | Monolithic Stage 3A script combining enum addition and RBAC RPCs. | **EXCLUDE FROM PROD** (Fails in PostgreSQL due to transactional enum restriction) |
| 4 | `20261029120000_stage3a_step_a_add_super_admin_enum.sql` | 822 B | Extends `staff_role_enum` with `'super_admin'`. | **APPROVED (Step 3 - Commit Separately)** |
| 5 | `20261029120001_stage3a_step_b_rbac_enhancements.sql` | 18.4 KB | Hardened RBAC RPCs (`is_super_admin`, `admin_update_staff_role`, `admin_update_staff_status`, `admin_create_staff_profile`), column-level RLS. | **APPROVED (Step 4)** |
| 6 | `20261029140000_phase3b_catalog_and_customer_enhancements.sql` | 6.4 KB | Customer statutory fields (`pan`, `state`, `state_code`), `products_services` master catalog, RLS updates. | **APPROVED (Step 5)** |
| 7 | `20261029160000_phase3c_quotations.sql` | 15.9 KB | `quotation_status_enum`, `quotations`, `quotation_versions`, `quotation_items`, `quotation_acceptances`, `quotation_delivery_logs`. | **APPROVED (Step 6)** |
| 8 | `20261029180000_phase3d_billing_and_payments.sql` | 23.4 KB | GST Invoicing, `invoice_sequence_counters`, `invoices`, `invoice_items`, `invoice_payments`, gapless Rule 46 numbering RPC, payments. | **APPROVED (Step 7)** |
| 9 | `20261031120000_phase4_communications.sql` | 2.5 KB | `invoice_delivery_channel_enum`, `invoice_delivery_logs` audit table, communications RLS. | **APPROVED (Step 8)** |
| 10 | `20261031230000_make_customer_billing_state_nullable.sql` | 781 B | Relaxes `customers.billing_state` NOT NULL constraint for initial customer intake. | **APPROVED (Step 9)** |
| 11 | `20261102100000_add_quotation_soft_delete.sql` | 1.9 KB | Adds `deleted_at`, `deleted_by_staff_id`, `deletion_reason` to `quotations`, creates filtering index. | **APPROVED (Step 10)** |
| 12 | `20261102120000_financial_year_quotation_numbering.sql` | 2.7 KB | `quotation_fy_sequences` table, Indian FY quotation numbering RPC (`QT-YYYY-YY-NNN`). | **APPROVED (Step 11)** |
| — | `verify_stage3a.sql` | 2.2 KB | Read-only verification queries for Stage 3A RBAC. | Verification Only (0 writes) |
| — | `verify_stage3b.sql` | 2.2 KB | Read-only verification queries for Stage 3B Catalog. | Verification Only (0 writes) |

### 2.2 Reconciliation & Deduplication Analysis

#### Critical Finding 1: The Stage 3A Enum Dependency Conflict
- In PostgreSQL, executing `ALTER TYPE public.staff_role_enum ADD VALUE 'super_admin';` inside a transaction block prevents any subsequent command in the same block from using `'super_admin'`. Attempting to execute `20261029120000_stage3a_staff_auth_enhancements.sql` as a single script produces:
  ```
  ERROR: unsafe use of new value "super_admin" of enum type staff_role_enum
  ```
- **Reconciliation Resolution:** The repository contains the proper two-step breakdown:
  1. `20261029120000_stage3a_step_a_add_super_admin_enum.sql`
  2. `20261029120001_stage3a_step_b_rbac_enhancements.sql`
- **Execution Rule:** Step A must be run and committed in the Supabase SQL Editor first. Step B must be run immediately after. The monolithic file `20261029120000_stage3a_staff_auth_enhancements.sql` **must be completely excluded** from the production deployment run.

#### Critical Finding 2: Customer `billing_state` Nullability
- During Phase 4 acceptance testing, customer creation without immediate state assignment failed because `billing_state` was defined `NOT NULL` in Phase 2. Migration `20261031230000_make_customer_billing_state_nullable.sql` was applied in development to allow preliminary customer intake prior to invoice generation.
- **Resolution:** This migration is included as Step 9 in the production sequence.

#### Critical Finding 3: Quotation Soft Deletion & Indian FY Numbering
- Quotation management was enhanced in Phase 6 with regulatory soft-deletion (`deleted_at`, `deleted_by_staff_id`, `deletion_reason`) and statutory Indian Financial Year numbering (`QT-YYYY-YY-NNN` conforming to 1 April – 31 March fiscal cycle).
- **Resolution:** Migrations `20261102100000_add_quotation_soft_delete.sql` and `20261102120000_financial_year_quotation_numbering.sql` are included as Steps 10 and 11.

---

## 3. Required Production Schema Objects Inventory

Upon completing the 11 approved migration steps, the production database will contain the following verified objects:

### 3.1 Tables (18 Tables Total)

1. `public.staff_profiles`: Staff accounts, role assignments, active flags, audit timestamps.
2. `public.customers`: Client business entities, GSTIN, PAN, addresses, contact details, creator tracking.
3. `public.quotation_requests`: Public enquiries, service category, project description, budget, client details.
4. `public.rate_limits`: Anti-abuse sliding-window rate limit counters.
5. `public.audit_logs`: Append-only, tamper-resistant system audit trail.
6. `public.email_outbox`: Transactional email queue, retry counters, payloads, delivery statuses.
7. `public.products_services`: Master catalog of construction/manufacturing machinery and services.
8. `public.quotations`: Formal quotation master records, status, financial totals, soft-delete tracking.
9. `public.quotation_versions`: Historical immutable snapshot archive of revised quotations.
10. `public.quotation_items`: Line items with HSN/SAC codes, quantities, rates, and GST calculations.
11. `public.quotation_acceptances`: Formal client acceptance, PO numbers, advance payments, and sign-offs.
12. `public.quotation_delivery_logs`: Delivery dispatch logs across email, whatsapp, print, and portal.
13. `public.invoice_sequence_counters`: Concurrency-safe atomic financial year sequence counters.
14. `public.invoices`: Tax Invoices, Bills of Supply, GST totals, place of supply, payment balances.
15. `public.invoice_items`: Invoiced line items, HSN/SAC codes, CGST, SGST, IGST calculations.
16. `public.invoice_payments`: Payment receipts, transaction references, NEFT/RTGS/UPI/Cheque methods.
17. `public.invoice_delivery_logs`: Audit trail for invoice transmissions to clients.
18. `public.quotation_fy_sequences`: Concurrency-safe atomic sequence tracking per Indian Financial Year.

### 3.2 Enum Types (11 Types Total)

1. `public.staff_role_enum`: `'admin'`, `'estimator'`, `'billing_manager'`, `'viewer'`, `'super_admin'`
2. `public.customer_type_enum`: `'government'`, `'private_corporate'`, `'contractor'`, `'individual'`
3. `public.service_category_enum`: `'construction_tenders'`, `'construction_machinery'`, `'manufacturing_machinery'`
4. `public.quotation_request_status_enum`: `'new'`, `'under_review'`, `'quotation_drafted'`, `'rejected'`, `'archived'`
5. `public.email_status_enum`: `'pending'`, `'processing'`, `'sent'`, `'failed'`, `'retry'`
6. `public.quotation_status_enum`: `'draft'`, `'pending_approval'`, `'approved'`, `'sent_to_customer'`, `'accepted'`, `'rejected'`, `'expired'`, `'cancelled'`
7. `public.quotation_delivery_channel_enum`: `'email'`, `'whatsapp'`, `'physical_print'`, `'portal'`
8. `public.invoice_type_enum`: `'tax_invoice'`, `'bill_of_supply'`, `'proforma'`, `'credit_note'`, `'debit_note'`
9. `public.invoice_status_enum`: `'draft'`, `'issued'`, `'partially_paid'`, `'paid'`, `'cancelled'`, `'overdue'`
10. `public.payment_method_enum`: `'neft_rtgs'`, `'cheque'`, `'upi'`, `'cash'`, `'credit_card'`, `'other'`
11. `public.invoice_delivery_channel_enum`: `'email'`, `'whatsapp'`, `'download_pdf'`, `'manual'`

### 3.3 Database Sequences (2 Active Sequences)

1. `public.quotation_request_seq`: Generates human-readable enquiry request numbers (`QR-1001`, `QR-1002`, ...).
2. `public.payment_receipt_seq`: Generates sequential payment voucher numbers (`REC-0001`, `REC-0002`, ...).

*(Note: Quotations use atomic table `quotation_fy_sequences`; Invoices use atomic table `invoice_sequence_counters` to guarantee gapless compliance with CGST Rule 46).*

### 3.4 Stored Procedures & Functions (19 Functions Total)

| Function Name | Return Type | Security | Purpose |
|---|---|---|---|
| `prevent_audit_log_mutation()` | `TRIGGER` | Definer | Rejects any UPDATE or DELETE statement against `audit_logs`. |
| `is_active_staff(UUID)` | `BOOLEAN` | Definer | Validates whether a specific user ID is an active staff member. |
| `is_active_staff()` | `BOOLEAN` | Definer | Parameterless overload checking `auth.uid()`. |
| `has_staff_role(UUID, staff_role_enum[])` | `BOOLEAN` | Definer | Evaluates user role membership against authorized roles. |
| `is_super_admin(UUID)` | `BOOLEAN` | Definer | Validates whether a specific user ID holds the `super_admin` role. |
| `is_super_admin()` | `BOOLEAN` | Definer | Parameterless overload checking `auth.uid()`. |
| `check_rate_limit(TEXT, INT, INT, INT)` | `BOOLEAN` | Definer | Anti-abuse sliding-window rate limit evaluation. |
| `cleanup_expired_rate_limits()` | `INT` | Definer | Maintenance purge of expired rate limit buckets. |
| `submit_quotation_request(...)` | `JSON` | Definer | Legacy public enquiry intake function. |
| `submit_quotation_request_atomic(...)` | `JSON` | Definer | Atomic enquiry intake + email outbox queueing in a single transaction. |
| `claim_email_outbox_batch(INT)` | `SETOF email_outbox` | Definer | Concurrency-safe job reservation using `FOR UPDATE SKIP LOCKED`. |
| `admin_update_staff_role(UUID, staff_role_enum)` | `JSON` | Definer | Audited role change with sole super admin protection. |
| `admin_update_staff_status(UUID, BOOLEAN)` | `JSON` | Definer | Audited deactivation/activation with self-deactivation guard. |
| `admin_create_staff_profile(UUID, TEXT, TEXT, staff_role_enum)` | `JSON` | Definer | Audited profile creation enforcing role hierarchy. |
| `generate_quotation_number()` | `TEXT` | Definer | Generates concurrency-safe Indian FY quotation numbers (`QT-YYYY-YY-NNN`). |
| `allocate_invoice_number(TEXT, TEXT)` | `TEXT` | Definer | Generates gapless GST invoice numbers (`SA/YY-YY/NNNN`) per Rule 46. |
| `generate_payment_receipt_number()` | `TEXT` | Definer | Generates sequential payment voucher identifiers. |
| `issue_invoice(UUID, UUID)` | `JSON` | Definer | Locks draft invoice, allocates gapless number, transitions status to `'issued'`. |
| `record_invoice_payment(...)` | `JSON` | Definer | Records payment, updates invoice `total_paid` and `balance_due`, updates status. |

---

## 4. Database Security & Access Control Analysis

### 4.1 Row-Level Security (RLS) Enforcement
- **100% Table Coverage:** All 18 production tables have `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` explicitly declared.
- **Zero Anonymous Table Reads:** The `anon` role is revoked from direct `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on all 18 tables. Public users cannot read customer lists, quotations, invoices, or staff accounts.
- **Controlled Public Entry Point:** Public interaction is restricted exclusively to `submit_quotation_request_atomic(...)`, which enforces client-side and server-side rate limits and writes only to `quotation_requests` and `email_outbox`.

### 4.2 Privileged Role Isolation
- **Role Hierarchy Enforcement:**
  - `super_admin`: Full management of all modules, staff invitations, and role assignments. Protected against self-deactivation and demotion.
  - `admin`: Operational management of catalog, customers, quotations, and staff (cannot modify or create super admins).
  - `billing_manager`: Quotation issuance, GST Invoice generation, payment recording, and delivery dispatch.
  - `estimator`: Quotation drafting, catalog lookup, and customer intake. Cannot issue invoices or modify staff profiles.
  - `viewer`: Read-only operational oversight across approved entities.
- **Tamper-Resistant Auditing:**
  - Direct modifications to `audit_logs` are blocked at the database engine level via `trg_audit_logs_immutable`. Even administrators cannot delete or alter audit history.

### 4.3 Client vs Server Secret Isolation
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Safe for browser client bundles; protected by RLS.
- `SUPABASE_SERVICE_ROLE_KEY`: **Strictly server-side**. Used only by Next.js Server Actions and `/api/cron/process-outbox`. It is never exported, leaked in HTML, or delivered to client browsers.

---

## 5. Hostinger Runtime & Geographic Compatibility

### 5.1 Hostinger Node.js Environment
- **Node.js Process:** Hostinger Business Web Hosting and Cloud Hosting provide persistent Node.js runtimes (`next start`).
- **Middleware & Cookies:** `@supabase/ssr` cookies operate seamlessly with Hostinger's reverse proxy, maintaining secure HTTP-only sessions for staff users.
- **Server Actions:** All quotation creation, invoice issuance, and payment actions execute on the Node.js server without static export limitations.

### 5.2 Network Latency Optimization
- **Production Supabase Region:** `ap-southeast-1` (Singapore).
- **Hostinger Target:** Singapore or Mumbai datacenter nodes.
- **Latency Advantage:** Round-trip time between Hostinger's Asia infrastructure and Supabase Singapore is expected to be under **30 ms**, drastically improving database query latency compared to cross-continental regions.

### 5.3 Background Outbox Processing
- Hostinger hPanel includes a native **Cron Jobs** scheduler.
- Scheduled trigger every 5 minutes:
  ```bash
  curl -s -X GET "https://<your-domain>/api/cron/process-outbox" -H "Authorization: Bearer <CRON_SECRET>"
  ```
- This ensures transactional customer acknowledgments and staff notifications are processed reliably without requiring external cron services.

---

## 6. Production Database Readiness Verdict

| Audit Checkpoint | Status | Details |
|---|:---:|---|
| Migration Sequencing Resolved | **PASSED** | 11-step ordered sequence established; monolithic Stage 3A excluded. |
| Schema Completeness | **PASSED** | 18 tables, 11 enums, 2 sequences, 19 RPCs verified. |
| RLS & Security Rules | **PASSED** | 100% RLS coverage; anonymous access blocked; immutable audit trail. |
| Hostinger Compatibility | **PASSED** | Architecture validated for Hostinger Business/Cloud Node.js runtime. |
| Data Sanitization | **PASSED** | Clean production start with 0 business transactions verified. |
| Secret Separation | **PASSED** | Zero credentials in repo; `.env.local` untracked; safe checklist provided. |

**Final Recommendation:** Proceed to execute the ordered migration plan in `docs/PHASE-7-PRODUCTION-MIGRATION-PLAN.md` in the Supabase SQL Editor of `flxhwgevmqvuqdjaejwa`.

