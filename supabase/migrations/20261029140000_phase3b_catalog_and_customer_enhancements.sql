-- ==============================================================================
-- Santhaya Associates — Phase 3B Customer Management & Master Catalog Migration
-- File: supabase/migrations/20261029140000_phase3b_catalog_and_customer_enhancements.sql
--
-- Target Database: Supabase Development Project (bkqneudnnhvvwmtggorz)
-- Scope:
-- 1. Additive enhancements to public.customers (pan, state, state_code, notes, created_by).
-- 2. Create public.products_services master catalog table (construction/manufacturing machinery, rentals, tender services).
-- 3. Enforce strict decimal accuracy: NUMERIC(15,2) for unit prices, NUMERIC(5,2) for GST tax rates.
-- 4. Deploy granular Row Level Security (RLS) for Super Admin, Admin, Estimator, Billing Manager, and Viewer.
-- 5. Revoke anonymous access; grant controlled operational access to authenticated staff.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADDITIVE ENHANCEMENTS TO public.customers
-- ------------------------------------------------------------------------------
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pan VARCHAR(10);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state_code VARCHAR(2);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL;

-- Ensure PAN formatting check (if present, must match standard 10-char alphanumeric Indian PAN)
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customer_pan_format_check;
ALTER TABLE public.customers ADD CONSTRAINT customer_pan_format_check
  CHECK (pan IS NULL OR pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$');

-- Update RLS policies on customers to include super_admin and billing_manager
DROP POLICY IF EXISTS "Active staff can select customers" ON public.customers;
DROP POLICY IF EXISTS "Estimators and Admins can insert/update customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can insert and update customers" ON public.customers;

-- Active staff with any recognized role can select customers
CREATE POLICY "Active staff can select customers"
  ON public.customers FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

-- Super Admin, Admin, Estimator, and Billing Manager can insert/update customers
CREATE POLICY "Staff can insert and update customers"
  ON public.customers FOR ALL TO authenticated
  USING (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'estimator'::public.staff_role_enum, 'billing_manager'::public.staff_role_enum])
    )
  )
  WITH CHECK (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'estimator'::public.staff_role_enum, 'billing_manager'::public.staff_role_enum])
    )
  );

-- ------------------------------------------------------------------------------
-- 2. CREATE public.products_services (MASTER CATALOG)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  item_type VARCHAR(50) NOT NULL DEFAULT 'product', -- 'product', 'service', 'rental'
  description TEXT,
  unit_of_measurement VARCHAR(50) NOT NULL DEFAULT 'unit',
  default_unit_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  hsn_sac_code VARCHAR(10),
  applicable_gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  technical_specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT products_services_price_check CHECK (default_unit_price >= 0.00),
  CONSTRAINT products_services_gst_rate_check CHECK (applicable_gst_rate >= 0.00 AND applicable_gst_rate <= 100.00)
);

-- Indexing for fast search, filter, and pagination
CREATE INDEX IF NOT EXISTS idx_products_services_sku ON public.products_services(sku);
CREATE INDEX IF NOT EXISTS idx_products_services_name ON public.products_services(lower(name));
CREATE INDEX IF NOT EXISTS idx_products_services_category ON public.products_services(category);
CREATE INDEX IF NOT EXISTS idx_products_services_item_type ON public.products_services(item_type);
CREATE INDEX IF NOT EXISTS idx_products_services_is_active ON public.products_services(is_active);

-- Enable Row Level Security
ALTER TABLE public.products_services ENABLE ROW LEVEL SECURITY;

-- Deny public and anonymous access
REVOKE ALL ON public.products_services FROM PUBLIC, anon;

-- Grant controlled table access to authenticated staff (further filtered by RLS)
GRANT SELECT, INSERT, UPDATE ON public.products_services TO authenticated;
GRANT ALL ON public.products_services TO service_role;

-- RLS: Active staff can select catalog items
CREATE POLICY "Active staff can select products_services"
  ON public.products_services FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

-- RLS: Super Admin, Admin, Estimator, and Billing Manager can insert/update catalog items
CREATE POLICY "Staff can insert and update products_services"
  ON public.products_services FOR ALL TO authenticated
  USING (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'estimator'::public.staff_role_enum, 'billing_manager'::public.staff_role_enum])
    )
  )
  WITH CHECK (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'estimator'::public.staff_role_enum, 'billing_manager'::public.staff_role_enum])
    )
  );

