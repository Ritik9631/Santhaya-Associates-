# PHASE 3D — BILLING, INVOICING & PAYMENTS ARCHITECTURE

**Santhaya Associates Pvt. Ltd.**  
**Document Ref:** `docs/phase3/PHASE-3D-ARCHITECTURE.md`  
**Target Environment:** Development Sandbox `bkqneudnnhvvwmtggorz.supabase.co`  
**Status:** Completed & Automatically Verified (Pending Human SQL Migration Approval)

---

## 1. Executive Summary & Statutory Framework

Phase 3D delivers the complete enterprise billing, invoicing, and payment reconciliation system for Santhaya Associates. It is designed to strictly adhere to:
1. **Rule 46 of the Central Goods and Services Tax (CGST) Rules, 2017**:
   - Consecutive serial numbers not exceeding sixteen characters in one or multiple series.
   - Distinct, gapless sequential numbering unique for a Financial Year (April 1 to March 31).
   - Draft invoices receive NO statutory numbering. Statutory numbers (e.g., `SA/26-27/0001`) are allocated strictly upon formal issuance via atomic database row locking (`FOR UPDATE`).
2. **Indian Financial Year Structure**:
   - Financial Year transitions dynamically on April 1 (e.g., Oct 2026 -> `26-27`, Jan 2027 -> `26-27`, Apr 2027 -> `27-28`).
3. **Place of Supply Tax Allocation**:
   - Intra-State (Supplier State Code == Customer Supply State Code): CGST (50% of rate) + SGST (50% of rate).
   - Inter-State (Supplier State Code != Customer Supply State Code): IGST (100% of rate).
   - Bill of Supply (Section 31(3)(c)) & Non-GST: 0% tax rate.
4. **Exact Decimal Precision**:
   - All arithmetic conducted in exact `NUMERIC(15, 2)` monetary values with half-up rounding. Zero floating-point arithmetic.
5. **Partial Payments & Ledger Reconciliation**:
   - Invoices support multiple partial payments.
   - Automated status lifecycle: `draft` -> `issued` -> `partially_paid` -> `paid` (or `overdue` / `cancelled`).

---

## 2. Database Architecture & Schema Design

### 2.1 Enums
- `invoice_type_enum`: `'tax_invoice'`, `'bill_of_supply'`, `'non_gst'`
- `invoice_status_enum`: `'draft'`, `'issued'`, `'partially_paid'`, `'paid'`, `'overdue'`, `'cancelled'`, `'refunded'`
- `payment_method_enum`: `'bank_transfer'`, `'upi'`, `'cash'`, `'cheque'`, `'demand_draft'`, `'other'`

### 2.2 Table Specifications

#### 1. `public.invoice_sequence_counters`
- Primary Key: `(financial_year, series)`
- Enforces gapless sequential counters per FY and series.
- Protected by `allocate_invoice_number` stored procedure using `SELECT ... FOR UPDATE`.

#### 2. `public.invoices`
- `id`: UUID Primary Key.
- `invoice_number`: VARCHAR(50) UNIQUE (NULL for drafts).
- `invoice_type`: `invoice_type_enum`.
- `customer_id`: UUID FK to `customers`.
- `quotation_id`: UUID FK to `quotations` (Nullable; populates when converted from quote).
- `quotation_version_id`: UUID FK to `quotation_versions`.
- `status`: `invoice_status_enum`.
- `financial_year`: VARCHAR(10) (e.g., `26-27`).
- **Immutable Company Snapshot**: `company_legal_name`, `company_trade_name`, `company_gstin`, `company_pan`, `company_state_code`, `company_state_name`, `company_registered_address`.
- **Immutable Customer Snapshot**: `customer_billing_name`, `customer_gstin`, `customer_pan`, `customer_state_code`, `customer_state_name`, `customer_billing_address`, `delivery_location`, `client_po_reference`.
- **Monetary Totals**: `subtotal_amount`, `discount_amount`, `taxable_amount`, `cgst_amount`, `sgst_amount`, `igst_amount`, `total_tax_amount`, `round_off_amount`, `grand_total_amount`, `paid_amount`, `balance_amount` (`NUMERIC(15,2)`).
- **Terms & Signatures**: `terms_conditions`, `payment_instructions`, `notes`, `cancelled_reason`.
- **Timestamps**: `invoice_date`, `due_date`, `issued_at`, `cancelled_at`, `created_at`, `updated_at`.

#### 3. `public.invoice_items`
- `id`: UUID Primary Key.
- `invoice_id`: UUID FK to `invoices` ON DELETE CASCADE.
- `product_service_id`: UUID FK to `products_services` ON DELETE SET NULL.
- `sort_order`: INT.
- `item_name`, `description`, `hsn_sac_code`, `unit`.
- `quantity` (`NUMERIC(12,4)` > 0).
- `unit_rate`, `discount_amount`, `taxable_amount`, `gst_rate`, `cgst_rate`, `sgst_rate`, `igst_rate`, `cgst_amount`, `sgst_amount`, `igst_amount`, `tax_amount`, `line_total` (`NUMERIC(15,2)`).

#### 4. `public.invoice_payments`
- `id`: UUID Primary Key.
- `invoice_id`: UUID FK to `invoices` ON DELETE RESTRICT.
- `payment_receipt_number`: VARCHAR(50) UNIQUE (`RCPT-YYYY-XXXXX`).
- `amount`: `NUMERIC(15,2)` > 0.
- `payment_method`: `payment_method_enum`.
- `payment_date`: DATE.
- `transaction_reference`, `bank_name`, `notes`.
- `recorded_by_staff_id`: UUID FK to `staff_profiles`.

---

## 3. Server Actions & Business Workflows

### Workflow C: Direct Invoice Generation
- File: `src/lib/billing/actions.ts` -> `createInvoiceAction`
- Authorized Roles: `super_admin`, `admin`, `billing_manager`.
- Accepts customer details, invoice type, line items, and terms.
- Validates non-empty line items, positive quantities, non-negative rates.
- Snapshots company billing profile and customer details.
- Saves invoice in `draft` status (no invoice number allocated yet).

### Workflow B: Quotation-to-Invoice Conversion
- File: `src/lib/billing/actions.ts` -> `convertQuotationToInvoiceAction`
- Validates quotation is in `accepted` (or `issued`) status.
- Idempotency guard: prevents converting already-converted quotations.
- Migrates items from accepted version snapshot into invoice items.
- Updates quotation status to `converted_to_invoice`.

### Statutory Issuance
- File: `src/lib/billing/actions.ts` -> `issueInvoiceAction`
- Calls `allocate_invoice_number(financial_year, 'SA')`.
- Obtains atomic `FOR UPDATE` row lock on `invoice_sequence_counters`.
- Sets `invoice_number = 'SA/26-27/XXXX'`, `status = 'issued'`, `issued_at = now()`.

### Payment Recording & Ledger Reconciliation
- File: `src/lib/billing/actions.ts` -> `recordPaymentAction`
- Generates `RCPT-YYYY-XXXXX` receipt number.
- Reconciles paid amount and remaining balance.
- Updates invoice status to `partially_paid` or `paid`.
- Enforces overpayment prevention (payment cannot exceed balance).

### Invoice Cancellation / Void
- File: `src/lib/billing/actions.ts` -> `cancelInvoiceAction`
- Forbids cancelling invoices with recorded payments (must refund or issue credit note first).
- Sets `status = 'cancelled'`, logs required reason and timestamp.

---

## 4. User Interface Routes & Components

| Route | Purpose | Key Components |
|---|---|---|
| `/staff/billing` | Billing Directory & KPI Dashboard | Financial metrics (Invoiced, Collected, Balance, Overdue), Search, Status Tabs |
| `/staff/billing/new` | Direct Invoicing & Quotation Converter | `InvoiceForm.tsx`, Multi-item editor, Live GST breakdown, Quotation picker |
| `/staff/billing/[id]` | Detail View & Payment Reconciliation | `InvoiceDetailView.tsx`, Issue Invoice, Record Payment modal, Void modal |
| `/staff/billing/[id]/pdf` | Statutory A4 Tax Invoice / Bill of Supply | Official printable view, CGST Rule 46 compliance, Indian Rupee words |

---

## 5. Automated Verification Results

- **Test Suite:** `npm run test:phase3d` -> **35/35 Assertions Passed (100%)**
- **Typecheck:** `npm run typecheck` (`tsc --noEmit`) -> **0 Errors**
- **Linter:** `npm run lint` (`next lint`) -> **0 Warnings, 0 Errors**
- **Production Build:** `npm run build` (`next build`) -> **Compiled 30/30 routes successfully**
- **Total Repository Test Assertions:** **404 Passed, 0 Failed**

