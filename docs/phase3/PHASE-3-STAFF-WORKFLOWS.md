# Santhaya Associates — Phase 3 Staff Workflows Specification
## Operational Lifecycle: Enquiries, Customers, Quotations, Invoicing, Payments & Delivery

**Project:** Santhaya Associates Pvt. Ltd. — Web Platform & Internal Operating System  
**Document:** `docs/phase3/PHASE-3-STAFF-WORKFLOWS.md`  
**Version:** 1.0 (Staff Operational Workflows)  
**Date:** 2026-10-28  
**Status:** Architecture Proposal — Planning Only (Awaiting Human Review)  

---

## 1. Overview of Operating Workflows

Phase 3 implements standard operating procedures for Santhaya Associates staff, spanning the commercial lifecycle from lead intake to cash receipt:

```mermaid
flowchart TD
    LEAD[Website Inbound Inquiry] --> QUAL[1. Lead Qualification]
    QUAL --> CUST[2. Customer Registration / Linking]
    CUST --> QUOTE[3. Quotation Drafting & Versioning]
    QUOTE --> ACC[4. Manual Acceptance Recording]
    ACC --> INV[5. Invoice Issuance & Tax Calculation]
    INV --> PAY[6. Payment Receipt & Ledger Reconciliation]

    OFFLINE[Phone / WhatsApp / Walk-in] --> CUST
    DIRECT_SALE[Direct Equipment Sale] --> INV
    RENTAL_SRV[Ongoing Machinery Rental] --> INV
```

---

## 2. Workflow 1: Public Enquiry Qualification & Conversion (Workflow A)

```mermaid
sequenceDiagram
    autonumber
    actor Prospect as Public Prospect
    actor Estimator as Sales Estimator
    participant Form as Public Form (/request-quotation)
    participant API as /api/quotation-request
    participant DB as PostgreSQL Database
    participant Dash as Staff Dashboard

    Prospect->>Form: Submits Inquiry (No Login Required)
    Form->>API: POST with Idempotency Key
    API->>DB: Atomic write (quotation_requests + email_outbox + audit_logs)
    DB-->>Estimator: Transactional Alert Email (Gmail)
    Estimator->>Dash: Navigates to /staff/enquiries
    Dash->>DB: Fetch New Unassigned Inquiries
    Estimator->>Dash: Clicks "Assign to Me" & sets status 'under_review'
    Estimator->>Dash: Reviews equipment specs, delivery location, notes
    Estimator->>Dash: Contacts prospect via phone/email for clarifications
    alt Valid Commercial Opportunity
        Estimator->>Dash: Clicks "Convert to Quotation"
        Dash->>Dash: Pre-fills Customer Profile (company_name, contact, phone, location)
        Dash->>Dash: Pre-fills Quotation Line Items from inquiry specs
        Estimator->>DB: Creates Quotation Draft linked to inquiry
        DB->>DB: Updates quotation_requests.status = 'quotation_drafted'
    else Spam / Unqualified Lead
        Estimator->>Dash: Sets status = 'rejected' with mandatory reason note
    end
```

### Operational Rules:
1. **Snapshots are Immutable**: Public inquiry data in `quotation_requests` is never overwritten. Staff annotations and qualification statuses are recorded in dedicated fields (`assigned_staff_id`, `status`, `notes`).
2. **Flexible Contact Qualification**: If the prospect only provided a phone number, staff conducts follow-up via phone call or WhatsApp before drafting the quotation.

---

## 3. Workflow 2: Customer Management & Non-Destructive Duplicate Handling

### 3.1 Customer Profile Creation
- **Staff-Created Flexibility**: Staff can register customers with **neither email nor phone** if only an office address or GSTIN is available (e.g. government tender authorities or walk-in machinery buyers).
- **Required Fields for Staff Intake**:
  - `company_name`: Legal or trade name (e.g. *Apex Civil Infra Pvt Ltd*).
  - `primary_contact_person`: Contact representative.
  - `billing_state`: Place of supply state (mandatory for GST place-of-supply tax logic).
  - `client_type`: Category (`government_dept`, `private_corporate`, `proprietorship_individual`, `subcontractor`).
  - `email` and `phone`: Strictly optional.

### 3.2 Duplicate Detection & Safe Merging Strategy
Automatic customer merging based on email or phone alone is strictly prohibited:

```mermaid
flowchart TD
    NEW[Staff Enters Customer Details] --> CHK{Duplicate Detection Match?}
    CHK -->|GSTIN matches existing| ALERT_GSTIN[High Confidence Match by GSTIN]
    CHK -->|PAN / Phone matches| ALERT_PHONE[Medium Confidence Match]
    CHK -->|Similar Name & State| ALERT_NAME[Potential Name Match]
    CHK -->|No match| CREATE[Insert New Customer Record]

    ALERT_GSTIN & ALERT_PHONE & ALERT_NAME --> PROMPT[Prompt Staff: Existing Record Found]
    PROMPT --> DECISION{Staff Decision}
    DECISION -->|Use Existing Record| LINK[Link Current Quote/Invoice to Existing Customer]
    DECISION -->|Confirm Separate Entity| FORCE[Create New Customer Profile with Explanatory Note]
```

- **Non-Destructive Association**: If a duplicate is identified later, historical quotation and invoice snapshots remain anchored to their original customer ID. Records are merged via reference reassignment, not by deleting customer entities.

---

## 4. Workflow 3: Product Catalog Management (Option A)

The system supports **Catalog Option A**: master saved items alongside free-form ad-hoc line items:

```mermaid
flowchart LR
    subgraph Catalog_Option_A ["Catalog Option A Architecture"]
        MASTER[Master Catalog Item<br/>products_services] -->|Auto-populates| LINE[Quotation or Invoice Line Item]
        CUSTOM[Custom / Ad-Hoc Item<br/>Entered in Form] -->|product_service_id = NULL| LINE
    end
    LINE --> SNAPSHOT[Immutable Line Snapshot<br/>Rate, Tax Rate, Description Frozen]
```

### Catalog Operational Guidelines:
1. **Master Items**: Used for standard heavy machinery fleet models (e.g. *Tata Hitachi EX200 LC Hydraulic Excavator*), standard rental rate structures (*Monthly Rig Rental - 200 Hours*), and construction materials (*Structural Steel Beams ISMB 400*).
2. **Custom / Ad-Hoc Items**: Estimators can enter custom technical work (e.g. *Specialized riverbed piling under bridge pier #4*) directly into quotation line items without adding the entry to the master catalog.
3. **Price Freezing**: When a line item is saved on a quotation or invoice, its `item_name`, `description`, `hsn_sac_code`, `unit_rate`, and `gst_rate` are copied into the line item row. Future changes to catalog pricing **never** retroactively alter historical quotes or invoices.

---

## 5. Workflow 4: Quotation Lifecycle & Multi-Version Revision Management

```mermaid
stateDiagram-v2
    [*] --> Draft : Staff drafts quote (Workflow A or B)
    Draft --> Issued : Staff finalizes & issues quote (PDF generated)
    Issued --> Draft_R1 : Client requests scope/rate revision (Creates Version R1)
    Draft_R1 --> Issued : Re-issued as QTN-XXXXX-R1
    Issued --> Accepted : Staff records manual customer acceptance
    Issued --> Rejected : Client declines proposal
    Issued --> Expired : Validity date exceeded
    Accepted --> Converted : Converted to Invoice
```

### Step-by-Step Quotation Lifecycle:
1. **Drafting (R0)**: Staff selects customer, enters delivery terms, payment terms, and line items. System computes subtotals, GST, and grand total. Status is `draft`.
2. **Issuance**: Estimator clicks "Issue Quotation". System generates official quotation version code (`QTN-2026-00042-R0`), locks the line items (`is_locked = true`), and triggers server-side PDF generation.
3. **Client Delivery**: Staff downloads PDF for manual delivery (WhatsApp / printed) or clicks "Send via Email" to dispatch via the outbox queue.
4. **Revision Handling (R1, R2)**:
   - If the client requests changes (e.g. quantity reduction or rate renegotiation), staff clicks "Create Revision".
   - System clones Version R0 into Version R1 (`QTN-2026-00042-R1`).
   - R0 remains preserved in the audit history.
   - Staff modifies R1 and issues it when ready.
5. **Manual Acceptance Recording**:
   - Customer acceptance is **recorded manually by authorized staff**.
   - Public self-serve acceptance is not supported at this stage.
   - Staff records: Acceptance Date, Channel (`whatsapp`, `email`, `signed_po`, `phone`, `in_person`), Client PO Number, and attaches the client’s signed document.
   - Quotation status transitions to `accepted`.

---

## 6. Workflow 5: GST Invoicing, Tax Calculations & Payment Tracking

```mermaid
sequenceDiagram
    autonumber
    actor BillingStaff as Billing Manager / Accountant
    participant Dash as Staff Billing Portal
    participant TaxEngine as Indian GST Engine
    participant DB as PostgreSQL Database
    participant Resend as Transactional Email Outbox

    BillingStaff->>Dash: Clicks "Create Invoice" (Direct or from Accepted Quote)
    Dash->>TaxEngine: Evaluate Place of Supply vs. Company State (Maharashtra)
    alt Same State (Intrastate)
        TaxEngine-->>Dash: Applies CGST (9%) + SGST (9%)
    else Different State (Interstate)
        TaxEngine-->>Dash: Applies IGST (18%)
    end
    BillingStaff->>Dash: Reviews line items, HSN/SAC, discounts, terms
    BillingStaff->>Dash: Clicks "Issue Statutory Tax Invoice"
    Dash->>DB: Locks sequence counter, assigns consecutive Invoice Number
    DB->>DB: Sets status = 'issued', locks invoice items against mutation
    DB->>DB: Triggers server-side PDF render to private storage
    BillingStaff->>Resend: Optional: Dispatches Invoice PDF to client email
    Note over BillingStaff,DB: Client makes payment via NEFT/RTGS
    BillingStaff->>Dash: Records Payment (Date, Mode, UTR Reference, Amount, TDS)
    Dash->>DB: Inserts into payments table
    DB->>DB: Trigger sync_invoice_payment_totals() recalculates balance_due
    DB->>DB: Automatically updates invoice status to 'partially_paid' or 'paid'
```

### Invoicing Operational Rules:
1. **Statutory Gapless Sequence**: Invoice numbers are assigned strictly upon issuance. Drafts never consume sequence numbers.
2. **Indian GST Place-of-Supply Engine**:
   - Company Origin: Maharashtra (State Code 27).
   - Intrastate Supply (Client Place of Supply in Maharashtra): Output Tax splits equally into **CGST** and **SGST**.
   - Interstate Supply (Client Place of Supply outside Maharashtra): Output Tax applies as **IGST**.
   - B2B Compliance: Client GSTIN format validated (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`).
3. **Automated Payment Balance Reconciliation**:
   - Staff inputs `amount_received` and optional `tds_deducted` (TDS under Section 194C/194I of Income Tax Act).
   - The database trigger automatically credits `total_credit = amount_received + tds_deducted`.
   - Recomputes `balance_due = grand_total - SUM(total_credit)`.
   - Transitions status to `paid` when balance reaches `0.00`.

