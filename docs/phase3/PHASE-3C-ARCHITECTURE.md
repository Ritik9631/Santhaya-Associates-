# PHASE-3C-ARCHITECTURE.md — Quotation Management & Versioning System
**Project**: Santhaya Associates Pvt. Ltd.  
**Phase**: Phase 3C (Quotations, Multi-Item Pricing, Versioning, and GST Allocation)  
**Status**: Implementation Complete & Verified | Awaiting Database Migration Approval  
**Environment Lock**: Development Sandbox (`bkqneudnnhvvwmtggorz`)

---

## 1. Executive Summary

Phase 3C establishes the comprehensive commercial quotation management subsystem for Santhaya Associates. It unifies operations across:
1. **Government & Private Construction Tenders** (complex multi-item line bills, site destinations, bid validity)
2. **Construction Machinery Supply** (equipment sales, dynamic GST rates, HSN 8429/8479)
3. **Manufacturing Machinery Supply** (turnkey equipment, commercial payment terms)
4. **Machinery Rentals** (rental terms, daily/monthly rates, operator inclusion clauses)

---

## 2. Decoupled Commercial Workflows Supported

* **Workflow A (Enquiry-to-Quotation)**: Converts incoming public website leads from `quotation_requests` to formal proposals (`enquiry_id` populated).
* **Workflow B (Direct Quotation Without Website Enquiry)**: Initiated directly by staff for phone inquiries, WhatsApp leads, in-person walk-ins, or tender bid invitations (`enquiry_id` is strictly `NULLABLE`).
* **Contact Optionality**: Conforms to Santhaya Associates business rules where customers can be registered and quoted even if email or phone is unavailable.

---

## 3. Financial Precision & Exact Decimal Engine

To eliminate IEEE 754 floating-point inaccuracies, all financial operations are governed by `src/lib/quotation/calculations.ts`:
* **Data Types**: `NUMERIC(15, 2)` for prices, subtotals, tax amounts, and totals; `NUMERIC(12, 4)` for quantities; `NUMERIC(5, 2)` for GST rates.
* **Rounding Standard**: Exact half-up rounding (`roundToTwoDecimals`) preventing ₹0.01 drift.
* **Indian GST Allocation Engine**:
  * Base Company Location: **Delhi (State Code `07`)**.
  * **Intra-State Supply (Delhi to Delhi)**: CGST (50% of tax slab) + SGST (50% of tax slab), IGST = 0.
  * **Inter-State Supply (Delhi to Other States/UTs)**: IGST (100% of tax slab), CGST = 0, SGST = 0.
  * **Non-GST Supply**: 0% tax rate across all line items.
* **Statutory Amount in Words**: Custom Indian Rupee word converter supporting Crores, Lakhs, Thousands, Hundreds, and Units (`convertNumberToIndianWords`).

---

## 4. Quotation Lifecycle & Versioning Invariants

### Allowed Lifecycle Transitions
```
[draft] ──► [issued] ──► [accepted] ──► [converted_to_invoice]
   │           │
   │           ├──► [revised] ──► [accepted]
   │           ├──► [rejected] ──► [revised]
   │           ├──► [expired] ──► [revised]
   │           └──► [cancelled]
   └──► [cancelled]
```

### Versioning & Snapshot Immutability
* **Master Record (`public.quotations`)**: Maintains the canonical quotation reference number (`QTN-YYYY-XXXXX`), customer reference, current status, and pointer to `current_version_number`.
* **Version Snapshot (`public.quotation_versions`)**: Each revision creates a discrete, immutable record (e.g. `QTN-2026-00001-R0`, `QTN-2026-00001-R1`).
* **Locking**: Once a version is issued or accepted, its status is marked `is_locked = true` and `issued_at` is permanently timestamped. Subsequent modifications require creating a new revision, preserving prior commercial offers for legal and audit compliance.

---

## 5. Staff Role-Based Access Control (RBAC) Matrix

| Operation / Capability | Super Admin | Admin | Estimator | Billing Manager | Viewer | Public / Anon |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **View Quotation Directory** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Create New Quotation Draft** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Edit Draft Line Items** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Issue Quotation to Client** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create Quotation Revision** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Record Customer Acceptance** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Download Official PDF** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Convert Quote to Invoice (Phase 3D)** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |

---

## 6. PDF Printable Template

Implemented at `/staff/quotations/[id]/pdf`:
* Branded layout featuring official logo `santhaya-logo-header.png`, Deep Navy (`#10243B`), and Industrial Gold (`#F4B323`).
* Complete statutory tax breakdown (HSN/SAC, CGST, SGST, IGST, Round-Off).
* Grand total in figures and Indian words.
* Standard commercial terms & conditions (validity, payment, delivery, arbitration in Delhi).
* Dual signature placeholders (Client Acceptance Seal and Santhaya Associates Authorized Signatory).
* Responsive print stylesheet (`@media print`) enabling seamless browser print-to-PDF.

---

## 7. Migration & Verification Scripts

* **Prepared SQL Migration**: `supabase/migrations/20261029160000_phase3c_quotations.sql`
* **Automated Post-Migration Verifier**: `scripts/verify-phase3c-migration.mjs` (`npm run test:phase3c-status`)
* **Phase 3C Test Harness**: `scripts/test-phase3c-quotations.mjs` (`npm run test:phase3c`, 72 assertions passed)

