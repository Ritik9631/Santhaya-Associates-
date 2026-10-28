# Phase 2C: Comprehensive Security, RLS & Authentication Architecture Plan
## Threat Modeling, Privilege Isolation, Anti-Escalation, Immutability & Storage Security

**Project:** Santhaya Associates Pvt. Ltd. — Web Platform & Internal Operating System  
**Document:** `docs/PHASE-2C-SECURITY-PLAN.md`  
**Version:** 1.0 (Security Architecture Plan)  
**Date:** 2026-10-28  
**Status:** Architecture Proposal — Planning Only (Awaiting Human Review)  
**Security Reviewers:** Application Security Specialist, Database Security Architect  

---

## 1. Mandatory Authentication & Public Website Rule (Core Security Foundation)

In strict adherence to **RULES §25–34**, **PRD §2**, and **MEMORY.md**:

1. **Zero Client Authentication**: Public visitors, corporate clients, and tender partners must **never** be required to log in, register, or create user accounts.
2. **Zero Public Auth UI**: Do **not** display Login, Sign In, Register, Sign Up, Account, or Dashboard links anywhere in the public website header, mobile drawer, footer, service pages, or quotation intake forms.
3. **Unauthenticated Quotation Intake**: The public quotation request form at `/request-quotation` operates completely without authentication.
4. **Admin-Provisioned Staff Only**: There is **no public staff self-registration**. All staff accounts must be provisioned manually by an authorized Santhaya Associates system administrator.
5. **Server-Side Authorization**: Every private route, API endpoint, and database operation is protected by server-side identity verification and role-based authorization.
6. **No Security Through Obscurity**: Hiding URLs, applying `noindex`, or using `robots.txt` are privacy aids, not security mechanisms. All endpoints enforce cryptographic authentication and database Row Level Security.
7. **Strict Deferral**: No staff login or dashboard screens are deployed in Phase 2C. Planning and security isolation are designed now for phased execution in Phase 3.

---

## 2. Threat Modeling & Defense-in-Depth Matrix

```
┌─────────────────────────────┬───────────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────┐
│ Threat Vector               │ Potential Impact                                                  │ Architecture Defense Mechanism                    │
├─────────────────────────────┼───────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ 1. Public Form Spam & Abuse │ Flooding database with automated garbage leads; DoS on staff.     │ Decoy honeypot field + Atomic DB token-bucket     │
│                             │                                                                   │ rate limiting + salted IP hashing.                │
├─────────────────────────────┼───────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ 2. Public Data Harvesting   │ Unauthorized scraping of quotation requests or customer records.  │ REVOKE ALL table permissions from `anon`;         │
│                             │                                                                   │ RLS deny policies evaluate `false` on all tables. │
├─────────────────────────────┼───────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ 3. Staff Self-Escalation    │ A junior estimator promotes own role to `admin` or reactivates self│ Anti-escalation RLS: only active Admins can       │
│                             │                                                                   │ execute UPDATE on `staff_profiles`.               │
├─────────────────────────────┼───────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ 4. Financial Tampering      │ Altering line item prices or totals on accepted quotes/invoices.  │ Immutability triggers + versioned snapshot        │
│                             │                                                                   │ line items + double-entry balance check trigger. │
├─────────────────────────────┼───────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ 5. Audit Trail Alteration   │ Rogue actor deletes or updates logs to hide fraudulent actions.   │ BEFORE UPDATE/DELETE/TRUNCATE database trigger    │
│                             │                                                                   │ + grant revocations on `public.audit_logs`.       │
├─────────────────────────────┼───────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ 6. Document Data Leakage    │ Unauthorized public downloading of private quotation/invoice PDFs.│ Supabase Storage private buckets + short-lived    │
│                             │                                                                   │ signed expiring URLs (15-min expiration).         │
├─────────────────────────────┼───────────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
│ 7. Credential Leaks         │ Service role key or email API key exposed in browser bundle.      │ Static bundle audits (SEC-STATIC-01/03) + strict  │
│                             │                                                                   │ server-only environment variable guards.          │
└─────────────────────────────┴───────────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────┘
```

---

## 3. Effective Database Permissions & RLS Policy Matrix

Security relies on **effective database permissions** (the intersection of SQL table-level `GRANT`/`REVOKE` statements and Row Level Security `POLICY` filters):

| Database Table | Anonymous Access (`anon`) | Authenticated Staff (`authenticated`) | Service Role (`service_role`) |
| :--- | :--- | :--- | :--- |
| **`staff_profiles`** | **REVOKED (Zero Access)** | SELECT own profile or directory if active; UPDATE restricted to Admins only; INSERT/DELETE denied. | Full Administrative DML |
| **`customers`** | **REVOKED (Zero Access)** | SELECT active staff; INSERT/UPDATE Estimators & Admins; DELETE denied. | Full Operational DML |
| **`quotation_requests`**| **REVOKED (Zero Access)** | SELECT active staff; UPDATE status/assigned staff Estimators & Admins; DELETE denied. | Full Operational DML |
| **`rate_limits`** | **REVOKED (Zero Access)** | **REVOKED (Zero Access)** | Full Operational Access (via atomic stored proc) |
| **`audit_logs`** | **REVOKED (Zero Access)** | SELECT active staff for inspection; INSERT/UPDATE/DELETE denied. | INSERT only; UPDATE/DELETE/TRUNCATE revoked & trigger-blocked |
| **`products_services`**| **REVOKED (Zero Access)** | SELECT active staff; INSERT/UPDATE Estimators & Admins; DELETE Admins only. | Full Operational DML |
| **`quotations`** | **REVOKED (Zero Access)** | SELECT active staff; INSERT/UPDATE Estimators & Admins; DELETE denied. | Full Operational DML |
| **`quotation_versions`**| **REVOKED (Zero Access)**| SELECT active staff; INSERT Estimators & Admins; UPDATE/DELETE locked once accepted. | Full Operational DML |
| **`quotation_items`** | **REVOKED (Zero Access)** | SELECT active staff; INSERT Estimators & Admins; locked once version finalized. | Full Operational DML |
| **`quotation_acceptances`**| **REVOKED (Zero Access)**| SELECT active staff; INSERT Estimators & Admins; UPDATE/DELETE denied. | Full Operational DML |
| **`invoices`** | **REVOKED (Zero Access)** | SELECT active staff; INSERT/UPDATE Billing Managers & Admins; locked once issued. | Full Operational DML |
| **`invoice_items`** | **REVOKED (Zero Access)** | SELECT active staff; INSERT Billing Managers & Admins; locked once issued. | Full Operational DML |
| **`payments`** | **REVOKED (Zero Access)** | SELECT active staff; INSERT Billing Managers & Admins; UPDATE/DELETE restricted. | Full Operational DML |
| **`document_records`**| **REVOKED (Zero Access)** | SELECT active staff; INSERT active staff; UPDATE/DELETE Admins only. | Full Operational DML |
| **`email_outbox`** | **REVOKED (Zero Access)** | **REVOKED (Zero Access)** | Full Operational Access (Worker queue) |

---

## 4. Stored Procedure & Function Hardening

Every PostgreSQL function and trigger procedure enforces three mandatory security safeguards:

1. **`SECURITY DEFINER`**: Runs with the owner's defined privileges, allowing controlled access to restricted tables without granting standard users broad table rights.
2. **Fixed `search_path`**:
   ```sql
   SET search_path = public, pg_temp
   ```
   Hardcoded to prevent search-path hijacking where malicious actors inject functions into temporary schemas.
3. **Explicit Table Schema Qualification**: All table references are explicitly qualified as `public.tablename`.
4. **Owner Assignment**: Explicitly owned by database administrator:
   ```sql
   ALTER FUNCTION public.submit_quotation_request(...) OWNER TO postgres;
   ```
5. **Execution Revocation**: All internal helper functions (`is_active_staff`, `has_staff_role`, `check_rate_limit`, `cleanup_expired_rate_limits`) have execution revoked from `PUBLIC` and `anon`.

---

## 5. Private File Storage Vault & Expiring Signed URLs

### Storage Bucket Specifications
- **Bucket 1**: `quotations_private` — Generated commercial quotation PDFs.
- **Bucket 2**: `invoices_private` — Issued tax and commercial invoice PDFs.
- **Bucket 3**: `documents_private` — Signed purchase orders, client acceptance documents, technical specification sheets.

### Storage Security Policies
1. **Public Access Disabled**: All three buckets have `public = false`. Direct HTTP requests to `https://.../storage/v1/object/public/...` return HTTP 404/403.
2. **Server-Side Upload & Generation**: PDFs are compiled server-side and uploaded using the `service_role` client directly into the private bucket.
3. **Short-Lived Signed URLs**:
   ```typescript
   // On-demand URL generation with 15-minute TTL
   const { data, error } = await supabaseAdmin.storage
     .from('quotations_private')
     .createSignedUrl('QUO-2026-00001/v1.pdf', 900); // 900 seconds = 15 minutes
   ```
4. **Checksum Integrity Verification**: When files are saved, a SHA-256 hash is computed and stored in `document_records.checksum_sha256`. Upon download, integrity can be verified against file tampering.

---

## 6. Financial Immutability & Anti-Fraud Controls

### Quotation Version Immutability
- Quotation revisions are stored in `quotation_versions` with distinct `version_number` integers.
- When client acceptance is recorded, `is_accepted = true` is set.
- A database trigger blocks updates or deletions on any `quotation_versions` row or child `quotation_items` row where `is_accepted = true`.

### Invoice Financial Snapshot Immutability
- Invoices transition from `draft` to `issued`.
- Once `lifecycle_status = 'issued'`, line items, customer details, tax rates, and total amounts are **frozen**.
- Modifications require issuing an approved commercial credit note, debit note, or formal cancellation with an audit trail entry.

### Payment Ledger Invariance & Overpayment Prevention
- Direct balance updates on `invoices.paid_amount` are blocked.
- Payments can only be recorded via `INSERT INTO public.payments`.
- Database trigger `recalculate_invoice_payment_status()` recalculates paid amounts and balance due.
- If $\sum \text{Payments} > \text{Total Amount}$, the transaction is aborted with `OVERPAYMENT_NOT_ALLOWED`.

---

## 7. Zero Secret Leaks & Client Bundle Enforcement

### Environment Segregation

| Variable | Client-Side Exposure | Environment Guard |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **YES** (Public Gateway) | Validated format |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **YES** (Public Restricted) | Zero table access via RLS |
| `DEV_SUPABASE_PROJECT_REF` | Server Only | Allowlist lock |
| `SUPABASE_SERVICE_ROLE_KEY` | **STRICTLY SERVER ONLY** | Prohibited in client files |
| `RATE_LIMIT_SALT` | **STRICTLY SERVER ONLY** | Prohibited in client files |
| `TRANSACTIONAL_EMAIL_API_KEY` | **STRICTLY SERVER ONLY** | Prohibited in client files |

### Automated Code Audits (Integrated into Test Runner)
- **SEC-STATIC-01**: Automated regex scan of `.next/static/` client chunks ensuring zero occurrences of `SUPABASE_SERVICE_ROLE_KEY` or secret key tokens.
- **SEC-STATIC-02**: Automated scan of `src/app/request-quotation/` verifying public quotation intake functions without authentication redirects or auth gates.
- **SEC-STATIC-03**: Automated scan of all `'use client'` components verifying zero imports of `@/lib/supabase/admin` or administrative clients.
