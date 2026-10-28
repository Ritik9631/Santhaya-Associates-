# Santhaya Associates — Phase 3B Master Architecture & Implementation Specification
## Customer Management & Master Product/Service Catalog

**Document Version**: 1.0.0  
**Phase**: Stage 3B Preparation  
**Status**: Architecture Approved for Review  
**Target Database**: Supabase Development (`bkqneudnnhvvwmtggorz`)  
**Strict Implementation Invariant**: PREPARATION ONLY. Strictly no SQL migrations or feature implementations until Phase 3A is fully approved and activated.

---

## 1. Executive Summary & Business Scope

Phase 3B expands the Santhaya Associates Staff ERP from authentication and administration into **operational enterprise data management**:
1. **Customer Management System**:
   - Enables staff to maintain statutory and commercial client profiles (Government bodies, corporate contractors, private developers, individuals).
   - Supports **Workflow B, C, and D** (Direct phone/WhatsApp inquiries, direct machinery sales, and service billings) by enabling direct customer registration **without requiring a prior website enquiry**.
   - Preserves optionality: Clients may provide Email only, Phone only, or Both (enforced by the `customer_contact_check` constraint).
2. **Master Product & Service Catalog (Option A Architecture)**:
   - Implements a unified `products_services` table covering all three company pillars:
     - Construction Machinery Supply (excavators, loaders, cranes, concrete mixers, compaction rollers, rentals and sales).
     - Manufacturing Machinery Supply (industrial fabrication, material handling equipment).
     - Construction Tender Services (civil estimation, contract drafting, project liaison).
   - Enforces precision financial types (`NUMERIC(15,2)` for prices and `NUMERIC(5,2)` for GST tax rates).
   - Associates statutory Indian HSN codes (goods) and SAC codes (services) with dynamic place-of-supply tax calculations.
3. **Downstream ERP Compatibility**:
   - Designed to seamlessly feed into **Phase 3C (Direct & Enquiry Quotations with PDF generation)** and **Phase 3D (GST Billing & Statutory Invoicing)**.

---

## 2. Database Architecture & Schema Specification

### 2.1 Customer Schema Enhancements (`public.customers`)
The base table created in Phase 2 will be refined with enhanced constraints, indexing, and foreign key relations:

```sql
-- Enhanced public.customers definition
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    primary_contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    gstin VARCHAR(15),
    pan VARCHAR(10),
    billing_address TEXT,
    shipping_address TEXT,
    state_code VARCHAR(2), -- Indian State Code (e.g., '33' for Tamil Nadu, '29' for Karnataka)
    customer_type public.customer_type_enum NOT NULL DEFAULT 'private_corporate',
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT customer_contact_check CHECK (
        (email IS NOT NULL AND length(trim(email)) > 0) OR
        (phone IS NOT NULL AND length(trim(phone)) > 0)
    )
);

-- Fast search & duplicate prevention indexes
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON public.customers USING gin (to_tsvector('english', company_name));
CREATE INDEX IF NOT EXISTS idx_customers_gstin ON public.customers(gstin) WHERE gstin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON public.customers(is_active);
```

### 2.2 Master Product & Service Catalog (`public.products_services`)
Implements the scope-locked master inventory and services catalog:

```sql
CREATE TYPE public.catalog_item_type_enum AS ENUM (
    'machinery_sale',
    'machinery_rental',
    'construction_material',
    'tender_service',
    'custom_service'
);

CREATE TABLE IF NOT EXISTS public.products_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    item_type public.catalog_item_type_enum NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    unit_of_measurement VARCHAR(50) NOT NULL DEFAULT 'unit', -- 'unit', 'day', 'month', 'metric_ton', 'cum', 'sqft', 'hour'
    default_unit_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    hsn_sac_code VARCHAR(10), -- 4-8 digit HSN or 6 digit SAC
    applicable_gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00, -- 18.00, 28.00, 12.00, 5.00, 0.00
    technical_specifications JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_services_sku ON public.products_services(sku);
CREATE INDEX IF NOT EXISTS idx_products_services_name ON public.products_services USING gin (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_products_services_type ON public.products_services(item_type);
CREATE INDEX IF NOT EXISTS idx_products_services_active ON public.products_services(is_active);
```

---

## 3. Row Level Security & Access Control

Both tables enforce strict Row Level Security. Standard operational staff have role-governed access:

| User Role | Customer Permissions | Catalog Permissions | Staff Management |
|---|---|---|---|
| **Super Admin** | Full SELECT, INSERT, UPDATE, DELETE | Full SELECT, INSERT, UPDATE, DELETE | Full Access |
| **Admin** | Full SELECT, INSERT, UPDATE | Full SELECT, INSERT, UPDATE | Full Access |
| **Tender Estimator** | SELECT, INSERT, UPDATE | SELECT, INSERT, UPDATE | None (Read-only Directory) |
| **Billing Manager** | SELECT, INSERT, UPDATE | SELECT, INSERT, UPDATE | None (Read-only Directory) |
| **Auditor / Viewer** | SELECT (Read-only) | SELECT (Read-only) | None (Read-only Directory) |
| **Anonymous / Public** | DENIED (0 access) | DENIED (0 access) | DENIED (0 access) |

---

## 4. Navigation Architecture & UI Routes

The staff dashboard navigation maintains distinct operational domains:

```
/staff/
├── (Overview Dashboard)
├── team/                    [Stage 3A-5 - Active]
│   ├── invite/
│   └── [id]/
├── customers/               [Stage 3B - Next]
│   ├── new/                 (Direct customer registration)
│   ├── [id]/                (Customer profile, statutory GST, history)
│   └── [id]/edit/           (Address and contact updates)
├── catalog/                 [Stage 3B - Next]
│   ├── new/                 (Add machinery or service)
│   ├── [id]/                (Specifications, pricing, HSN/SAC)
│   └── [id]/edit/
├── quotations/              [Stage 3C - Future]
└── billing/                 [Stage 3D - Future]
```

---

## 5. Automated Testing Strategy for Phase 3B

1. **Schema & Constraint Tests**:
   - Validate `customer_contact_check` (rejects missing contact methods; allows single or both).
   - Validate `sku` unique constraint and format.
   - Validate decimal monetary precision (rejects floating point rounding errors).
2. **RBAC & Authorization Matrix Tests**:
   - Viewer role cannot mutate customer or catalog records.
   - Estimator and Billing Manager can create/edit items.
   - Anonymous caller receives HTTP 401/403.
3. **Workflow Integration Tests**:
   - Direct customer creation without website enquiry.
   - Duplicate detection on GSTIN and company name.
   - Audit trail creation on all insertions and updates.

---

## 6. Implementation Phasing & Risks

1. **Chartered Accountant GST Review**: Place-of-supply rules (IGST vs CGST+SGST) and HSN/SAC classifications must be reviewed by the company's statutory accountant prior to live production billing.
2. **Approval Gate Requirement**: Stage 3B database migrations and code implementation will strictly commence only after Stage 3A migration and Super Admin provisioning receive human authorization.

