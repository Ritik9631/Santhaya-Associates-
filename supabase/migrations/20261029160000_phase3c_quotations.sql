-- ==============================================================================
-- Santhaya Associates — Phase 3C Quotation Management Engine Migration
-- File: supabase/migrations/20261029160000_phase3c_quotations.sql
--
-- Target Database: Supabase Development Project (bkqneudnnhvvwmtggorz)
-- Scope:
-- 1. Create quotation_status_enum, quotation_delivery_channel_enum.
-- 2. Create quotation numbering sequence (QTN-YYYY-XXXXX format).
-- 3. Create public.quotations (master table).
-- 4. Create public.quotation_versions (immutable version snapshots).
-- 5. Create public.quotation_items (line items with decimal accuracy).
-- 6. Create public.quotation_acceptances (manual customer acceptance records).
-- 7. Create public.quotation_delivery_logs (delivery tracking).
-- 8. Enforce Row Level Security (RLS) restricting access strictly to active staff.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUMS AND SEQUENCES
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quotation_status_enum') THEN
    CREATE TYPE public.quotation_status_enum AS ENUM (
      'draft',
      'issued',
      'revised',
      'accepted',
      'rejected',
      'expired',
      'cancelled',
      'converted_to_invoice'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quotation_delivery_channel_enum') THEN
    CREATE TYPE public.quotation_delivery_channel_enum AS ENUM (
      'download',
      'email',
      'phone',
      'whatsapp',
      'in_person'
    );
  END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.quotation_number_seq START WITH 1 INCREMENT BY 1;

-- Function: Generates sequential quotation numbers (QTN-YYYY-XXXXX)
CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_year TEXT := to_char(now(), 'YYYY');
  v_seq BIGINT;
  v_formatted TEXT;
BEGIN
  v_seq := nextval('public.quotation_number_seq');
  v_formatted := 'QTN-' || v_year || '-' || lpad(v_seq::text, 5, '0');
  RETURN v_formatted;
END;
$$;

ALTER FUNCTION public.generate_quotation_number() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.generate_quotation_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_quotation_number() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. TABLE: public.quotations (MASTER)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  enquiry_id UUID REFERENCES public.quotation_requests(id) ON DELETE SET NULL, -- Strictly NULLABLE (Workflow B)
  status public.quotation_status_enum NOT NULL DEFAULT 'draft',
  place_of_supply_state_code VARCHAR(2) NOT NULL DEFAULT '07', -- Default Delhi
  is_gst_applicable BOOLEAN NOT NULL DEFAULT true,
  current_version_number INT NOT NULL DEFAULT 1,
  created_by_staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_quotations_number ON public.quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON public.quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON public.quotations(created_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_quotations_enquiry ON public.quotations(enquiry_id);

-- ------------------------------------------------------------------------------
-- 3. TABLE: public.quotation_versions (IMMUTABLE SNAPSHOTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quotation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  version_code VARCHAR(60) NOT NULL, -- e.g. QTN-2026-00001-R0
  validity_days INT NOT NULL DEFAULT 30,
  expires_at DATE NOT NULL,
  delivery_location TEXT NOT NULL,
  payment_terms TEXT NOT NULL DEFAULT '100% advance against Proforma Invoice or 30 days credit on approved LC',
  terms_conditions TEXT,
  subtotal_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  cgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  sgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  igst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  round_off_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  grand_total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  issued_at TIMESTAMPTZ,
  created_by_staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_quotation_version UNIQUE (quotation_id, version_number),
  CONSTRAINT chk_quotation_version_positive_totals CHECK (
    subtotal_amount >= 0.00 AND
    taxable_amount >= 0.00 AND
    grand_total_amount >= 0.00
  )
);

CREATE INDEX IF NOT EXISTS idx_quotation_versions_quote ON public.quotation_versions(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_versions_code ON public.quotation_versions(version_code);

-- ------------------------------------------------------------------------------
-- 4. TABLE: public.quotation_items (LINE ITEMS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_version_id UUID NOT NULL REFERENCES public.quotation_versions(id) ON DELETE CASCADE,
  product_service_id UUID REFERENCES public.products_services(id) ON DELETE SET NULL, -- Strictly NULLABLE for custom items
  sort_order INT NOT NULL DEFAULT 0,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  hsn_sac_code VARCHAR(10),
  unit VARCHAR(50) NOT NULL DEFAULT 'unit',
  quantity NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
  unit_rate NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  cgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 9.00,
  sgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 9.00,
  igst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  cgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  sgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  igst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  line_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_quote_item_quantity CHECK (quantity > 0),
  CONSTRAINT chk_quote_item_rate CHECK (unit_rate >= 0),
  CONSTRAINT chk_quote_item_taxable CHECK (taxable_amount >= 0),
  CONSTRAINT chk_quote_item_total CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quotation_items_version ON public.quotation_items(quotation_version_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_product ON public.quotation_items(product_service_id);

-- ------------------------------------------------------------------------------
-- 5. TABLE: public.quotation_acceptances (MANUAL ACCEPTANCE RECORDING)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quotation_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE RESTRICT,
  quotation_version_id UUID NOT NULL REFERENCES public.quotation_versions(id) ON DELETE RESTRICT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  accepted_by_contact_name VARCHAR(150) NOT NULL,
  acceptance_channel public.quotation_delivery_channel_enum NOT NULL DEFAULT 'phone',
  client_po_reference VARCHAR(100),
  recorded_by_staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  staff_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_quotation_acceptances_quote ON public.quotation_acceptances(quotation_id);

-- ------------------------------------------------------------------------------
-- 6. TABLE: public.quotation_delivery_logs (DELIVERY TRACKING)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quotation_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  quotation_version_id UUID NOT NULL REFERENCES public.quotation_versions(id) ON DELETE CASCADE,
  delivery_channel public.quotation_delivery_channel_enum NOT NULL,
  recipient_email TEXT,
  recipient_phone VARCHAR(20),
  delivery_status VARCHAR(50) NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'failed', 'downloaded'
  notes TEXT,
  recorded_by_staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_quotation_delivery_quote ON public.quotation_delivery_logs(quotation_id);

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) & GRANTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Revoke all access from PUBLIC and anon
REVOKE ALL ON public.quotations FROM PUBLIC, anon;
REVOKE ALL ON public.quotation_versions FROM PUBLIC, anon;
REVOKE ALL ON public.quotation_items FROM PUBLIC, anon;
REVOKE ALL ON public.quotation_acceptances FROM PUBLIC, anon;
REVOKE ALL ON public.quotation_delivery_logs FROM PUBLIC, anon;

-- Grant table privileges to authenticated and service_role
GRANT SELECT, INSERT, UPDATE ON public.quotations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quotation_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quotation_acceptances TO authenticated;
GRANT SELECT, INSERT ON public.quotation_delivery_logs TO authenticated;

GRANT ALL ON public.quotations TO service_role;
GRANT ALL ON public.quotation_versions TO service_role;
GRANT ALL ON public.quotation_items TO service_role;
GRANT ALL ON public.quotation_acceptances TO service_role;
GRANT ALL ON public.quotation_delivery_logs TO service_role;

-- RLS: Active staff can SELECT all quotation records
CREATE POLICY "Active staff can select quotations"
  ON public.quotations FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

CREATE POLICY "Active staff can select quotation_versions"
  ON public.quotation_versions FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

CREATE POLICY "Active staff can select quotation_items"
  ON public.quotation_items FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

CREATE POLICY "Active staff can select quotation_acceptances"
  ON public.quotation_acceptances FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

CREATE POLICY "Active staff can select quotation_delivery_logs"
  ON public.quotation_delivery_logs FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

-- RLS: Super Admin, Admin, and Estimator can INSERT and UPDATE quotations
CREATE POLICY "Authorized staff can insert/update quotations"
  ON public.quotations FOR ALL TO authenticated
  USING (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'estimator'::public.staff_role_enum])
    )
  )
  WITH CHECK (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'estimator'::public.staff_role_enum])
    )
  );

CREATE POLICY "Authorized staff can insert/update quotation_versions"
  ON public.quotation_versions FOR ALL TO authenticated
  USING (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'estimator'::public.staff_role_enum])
    )
  )
  WITH CHECK (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'estimator'::public.staff_role_enum])
    )
  );

CREATE POLICY "Authorized staff can insert/update/delete quotation_items"
  ON public.quotation_items FOR ALL TO authenticated
  USING (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'estimator'::public.staff_role_enum])
    )
  )
  WITH CHECK (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'estimator'::public.staff_role_enum])
    )
  );

CREATE POLICY "Authorized staff can record quotation_acceptances"
  ON public.quotation_acceptances FOR ALL TO authenticated
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

CREATE POLICY "Authorized staff can log quotation_delivery"
  ON public.quotation_delivery_logs FOR ALL TO authenticated
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

