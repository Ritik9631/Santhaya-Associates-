# Santhaya Associates — Phase 3 Risks, Compliance & Open Decisions
## Statutory Indian GST Questions, Dependency Security Strategy & Management Decisions

**Project:** Santhaya Associates Pvt. Ltd. — Web Platform & Internal Operating System  
**Document:** `docs/phase3/PHASE-3-RISKS-AND-OPEN-DECISIONS.md`  
**Version:** 1.0 (Risks & Decisions Register)  
**Date:** 2026-10-28  
**Status:** Architecture Proposal — Planning Only (Awaiting Human Review)  

---

## 1. Decision Status Classification

To maintain documentation integrity (**AGENTS.md**), project specifications are explicitly classified into four categories:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DECISION CLASSIFICATION                         │
├─────────────────────────┬──────────────────────────────────────────────┤
│ 1. Verified Implemented │ Built, tested, and actively functioning now. │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 2. Approved Proposed    │ Formally approved architecture ready for     │
│                         │ implementation upon stage authorization.     │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 3. Accountant Sign-off  │ Indian tax and statutory invoicing policies  │
│    Required             │ requiring certified CA verification.         │
├─────────────────────────┼──────────────────────────────────────────────┤
│ 4. Business Management  │ Commercial terms, credit limits, and banking │
│    Sign-off Required    │ policies requiring owner/director approval.  │
└─────────────────────────┴──────────────────────────────────────────────┘
```

---

## 2. Category Breakdown

### 2.1 Category 1: Verified Implemented Architecture
- Next.js 14 App Router public website with authentic brand assets (`santhaya-logo-header.png`, `santhaya-symbol.png`).
- Zero public login/register UI anywhere on public routes.
- Unauthenticated public quotation intake form wired to `/api/quotation-request`.
- Atomic database ingestion (`submit_quotation_request_atomic`) committing to `quotation_requests`, `audit_logs`, and `email_outbox` in a single transaction.
- Server-side bot protections: anti-spam honeypot (`_company_fax`), salted IP hashing, and atomic PostgreSQL token-bucket rate limiter (`check_rate_limit`).
- Durable email outbox queue with exponential retry schedule (+1m, +5m, +15m, +1h), `FOR UPDATE SKIP LOCKED` batch claiming, and crash recovery.
- Resend transactional email integration: tested and verified in both offline mock mode (`mock_msg_...`) and live sandbox mode (`01a183be-...` UUID).

### 2.2 Category 2: Approved Proposed Architecture
- Four decoupled commercial workflows: Workflow A (Enquiry → Quote → Invoice), Workflow B (Direct Quote), Workflow C (Direct Sale), Workflow D (Standalone Service).
- Protected staff login (`/staff/login`) and 10-section sidebar dashboard (`/staff/*`).
- Staff RBAC with 5 roles: `super_admin`, `admin`, `estimator`, `billing_manager`, `viewer`.
- Dual-barrier staff access: Supabase Auth session + `public.staff_profiles` where `is_active = true`.
- Flexible staff customer intake allowing NULL email and NULL phone.
- Master Product Catalog (Option A) supporting saved machinery fleet rates alongside ad-hoc custom line items.
- Multi-version quotation lifecycle (`QTN-YYYY-XXXXX-RN`) with immutable price snapshots.
- Manual staff recording of customer quotation acceptance (no public self-serve acceptance).
- Automatic invoice payment reconciliation trigger (`sync_invoice_payment_totals()`).
- Private storage bucket (`private-documents`) with 15-minute signed download URLs.

---

## 3. Statutory Indian GST Compliance Questions (Accountant Sign-Off Required)

The following regulatory requirements must be reviewed and certified by Santhaya Associates' appointed Indian Chartered Accountant (CA) prior to issuing live tax invoices in Stage 3D:

| Regulatory Area | Statutory Reference | Technical Implication & Recommendation | Open Decision for Accountant |
| :--- | :--- | :--- | :--- |
| **1. Gapless Invoice Numbering** | Rule 46(b) of CGST Rules 2017 | Sequence numbers cannot be assigned to drafts. Numbers must be allocated consecutively at the exact moment of issuance. | Confirm proposed financial-year format (e.g. `SA/26-27/0001` or `INV-2627-0001`). |
| **2. Non-GST Invoicing** | Section 31 of CGST Act | When is a commercial bill / non-GST bill permissible versus a mandatory GST Tax Invoice? | Confirm whether Santhaya Associates deals in any fully exempt supplies (e.g. certain agricultural land clearing), or if all commercial transactions must carry GSTIN. |
| **3. Composite vs. Mixed Supply** | Section 8 of CGST Act | Contracts bundling machinery supply, transport logistics, and on-site operating crew have complex tax rates. | Confirm whether equipment rental with operator is classified under SAC 9973 (Leasing/rental without operator: 18%) or SAC 9954 (Construction services with operator: 18% or variable). |
| **4. Place of Supply for Movable Machinery** | Section 10(1)(a) vs. Section 12(2) of IGST Act | Cranes or excavators mobilized from Maharashtra to job sites in other states (e.g. Gujarat, Karnataka). | Confirm whether tax is determined by client's registered billing office (IGST) or by the physical delivery site of the equipment. |
| **5. E-Invoicing Applicability** | Rule 48(4) of CGST Rules 2017 | E-invoicing via Government IRP (Invoice Registration Portal) is mandatory if aggregate annual turnover exceeds ₹5 Crores in any preceding FY. | Confirm current annual turnover to determine whether Phase 3 must integrate real-time IRN and QR code generation. |
| **6. TDS Under GST & Income Tax** | Section 51 CGST Act; Sec 194C / 194I Income Tax Act | Government departments and large private EPC contractors deduct 2% GST TDS and 1%–2% Income Tax TDS from payments. | Confirm ledger crediting formula: `total_credit = amount_received + tds_deducted` against invoice balance. |

---

## 4. Business Management & Commercial Decisions (Director Sign-Off Required)

| Operational Policy | Proposed Default | Alternative Option | Decision Needed From Management |
| :--- | :--- | :--- | :--- |
| **Default Quotation Validity** | 30 Calendar Days | 15 Days (for volatile steel/fuel prices) or 60 Days | Set standard quotation expiration window. |
| **Standard Payment Terms** | 100% advance against Proforma Invoice or 30 days credit on approved Bank Guarantee | 50% advance + 50% on dispatch | Set standard default payment terms on quotation builder. |
| **Bank Account for Invoices** | Bank Name, Branch, Account No, IFSC Code, Account Name | Virtual Account Numbers for automated reconciliation | Provide authentic corporate bank details to print on invoice footer. |
| **Credit Limit Enforcements** | Soft warning when customer has > ₹10 Lakhs in overdue invoices | Hard block preventing new quote issuance | Define credit control policy for repeat contractors. |

---

## 5. Dependency Security Strategy (npm audit Findings)

### 5.1 Assessment of Current Audit Findings
`npm audit --json` identified 6 vulnerabilities (5 High, 1 Critical):
1. **Critical: `next` (`14.2.35`) — GHSA-2464-fhr4-w9xw**:
   - *Vulnerability*: Unauthenticated RCE in Next.js Image Optimization API when SVG files are processed via query parameters.
   - *Risk Analysis*: Santhaya Associates does not use remote SVGs or user-uploaded SVG images. Local brand assets are static PNGs.
   - *Architectural Mitigation*: In `next.config.mjs`, explicitly set `images: { dangerouslyAllowSVG: false }` and `unoptimized: true` during local development.
2. **High: `postcss` (`8.4.31`, bundled under Next.js) — GHSA-6g55-p6wh-862q**: Path traversal via source map auto-loading. Confined to build-time compilation.
3. **High: `zod` (`3.23.8`) — GHSA-mrhx-c7xc-m3w5**: Memory exhaustion on unbounded constrained collections. Santhaya schemas only parse bounded scalar fields.
4. **High: `glob` / `eslint-config-next` — GHSA-5j98-mcp5-4vw2**: CLI command injection. Development-only dependency.

### 5.2 Controlled Remediation Plan
- **Rule**: Do **not** run `npm audit fix --force`. Upgrading to Next.js 16 or Zod 4 introduces breaking changes across Next.js App Router and existing schemas.
- **Remediation Phase**: Schedule a dedicated dependency upgrade and regression testing phase after Phase 3 feature development is completed and verified against the stable baseline.

---

## 6. Infrastructure & Deployment Readiness Decisions

1. **Supabase CLI Migration Reconciliation**:
   - When the Supabase CLI is connected, run:
     ```bash
     npx supabase migration repair --status applied 20261026120000
     npx supabase migration repair --status applied 20261028120000
     ```
   - This records the manually applied Phase 2B and Phase 2D migrations in `supabase_migrations.schema_migrations` without re-running DDL.
2. **Resend Production Domain Verification**:
   - The development environment uses `onboarding@resend.dev`, which can only deliver to the single email address registered with the Resend account.
   - Before deploying Phase 3 to production, Santhaya Associates must add DNS records (DKIM, SPF, MX) for `santhaya.com` (or official corporate domain) in Resend to enable sending quote and invoice PDFs to arbitrary client email addresses.
3. **Scheduled Cron Worker**:
   - Locally, the outbox worker is triggered on-demand via authenticated HTTP calls.
   - In production on Vercel, configure `vercel.json` with a recurring 1-minute schedule (`* * * * *`) hitting `/api/cron/process-outbox` with `CRON_SECRET`.

