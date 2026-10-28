-- ==============================================================================
-- Santhaya Associates — Phase 3D Billing, Invoicing & Payments Migration
-- File: supabase/migrations/20261029180000_phase3d_billing_and_payments.sql
--
-- Target Database: Supabase Development Project (bkqneudnnhvvwmtggorz)
-- Scope:
-- 1. Create invoice_type_enum, invoice_status_enum, payment_method_enum.
-- 2. Create invoice_sequence_counters for gapless CGST Rule 46(b) numbering.
-- 3. Stored procedure allocate_invoice_number(p_fy, p_series) with row lock.
-- 4. Create public.invoices (master invoicing table).
-- 5. Create public.invoice_items (item lines with exact decimal accuracy).
-- 6. Create public.invoice_payments (partial/full payment receipts ledger).
-- 7. Create payment_number_seq and generate_payment_number().
-- 8. Enforce Row Level Security (RLS) restricting access strictly to active staff.
-- 9. Atomic procedures issue_invoice() and record_invoice_payment() for transactional integrity.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENUMS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_type_enum') THEN
    CREATE TYPE public.invoice_type_enum AS ENUM (
      'tax_invoice',
      'bill_of_supply',
      'non_gst'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status_enum') THEN
    CREATE TYPE public.invoice_status_enum AS ENUM (
      'draft',
      'issued',
      'partially_paid',
      'paid',
      'overdue',
      'cancelled',
      'refunded'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
    CREATE TYPE public.payment_method_enum AS ENUM (
      'bank_transfer',
      'upi',
      'cash',
      'cheque',
      'demand_draft',
      'other'
    );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. GAPLESS INVOICE NUMBERING ENGINE (CGST RULE 46(b))
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_sequence_counters (
  financial_year VARCHAR(10) NOT NULL,
  series VARCHAR(20) NOT NULL DEFAULT 'SA',
  last_number BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (financial_year, series)
);

CREATE OR REPLACE FUNCTION public.allocate_invoice_number(
  p_fy TEXT,
  p_series TEXT DEFAULT 'SA'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_series TEXT := COALESCE(NULLIF(trim(p_series), ''), 'SA');
  v_fy TEXT := COALESCE(NULLIF(trim(p_fy), ''), '26-27');
  v_curr_num BIGINT;
  v_next_num BIGINT;
  v_formatted TEXT;
BEGIN
  -- Row lock for update prevents race conditions across concurrent invoice issuances
  SELECT last_number INTO v_curr_num
  FROM public.invoice_sequence_counters
  WHERE financial_year = v_fy AND series = v_series
  FOR UPDATE;

  IF NOT FOUND THEN
    v_next_num := 1;
    INSERT INTO public.invoice_sequence_counters (financial_year, series, last_number, updated_at)
    VALUES (v_fy, v_series, v_next_num, timezone('utc'::text, now()));
  ELSE
    v_next_num := v_curr_num + 1;
    UPDATE public.invoice_sequence_counters
    SET last_number = v_next_num, updated_at = timezone('utc'::text, now())
    WHERE financial_year = v_fy AND series = v_series;
  END IF;

  -- Formats as SERIES/FY/0001 (e.g. SA/26-27/0001)
  v_formatted := v_series || '/' || v_fy || '/' || lpad(v_next_num::text, 4, '0');
  RETURN v_formatted;
END;
$$;

ALTER FUNCTION public.allocate_invoice_number(TEXT, TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.allocate_invoice_number(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allocate_invoice_number(TEXT, TEXT) TO authenticated, service_role;

-- Receipt numbering sequence
CREATE SEQUENCE IF NOT EXISTS public.payment_receipt_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_payment_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_year TEXT := to_char(now(), 'YYYY');
  v_seq BIGINT;
BEGIN
  v_seq := nextval('public.payment_receipt_seq');
  RETURN 'RCPT-' || v_year || '-' || lpad(v_seq::text, 5, '0');
END;
$$;

ALTER FUNCTION public.generate_payment_receipt_number() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.generate_payment_receipt_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_payment_receipt_number() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. TABLE: public.invoices (MASTER)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE, -- NULL for drafts; populated strictly upon issuance
  invoice_type public.invoice_type_enum NOT NULL DEFAULT 'tax_invoice',
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  quotation_version_id UUID REFERENCES public.quotation_versions(id) ON DELETE SET NULL,
  status public.invoice_status_enum NOT NULL DEFAULT 'draft',
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  financial_year VARCHAR(10) NOT NULL,
  
  -- Statutory Company Snapshot (Preserved per invoice)
  company_legal_name VARCHAR(255) NOT NULL,
  company_trade_name VARCHAR(255) NOT NULL,
  company_gstin VARCHAR(20) NOT NULL,
  company_pan VARCHAR(20) NOT NULL,
  company_state_code VARCHAR(2) NOT NULL DEFAULT '07',
  company_state_name VARCHAR(100) NOT NULL DEFAULT 'Delhi',
  company_registered_address TEXT NOT NULL,
  
  -- Statutory Customer Snapshot
  customer_billing_name VARCHAR(255) NOT NULL,
  customer_gstin VARCHAR(20),
  customer_pan VARCHAR(20),
  customer_state_code VARCHAR(2) NOT NULL DEFAULT '07',
  customer_state_name VARCHAR(100) NOT NULL DEFAULT 'Delhi',
  customer_billing_address TEXT NOT NULL,
  delivery_location TEXT,
  client_po_reference VARCHAR(100),
  
  -- Place of Supply & Tax Treatment
  place_of_supply_state_code VARCHAR(2) NOT NULL DEFAULT '07',
  is_intra_state BOOLEAN NOT NULL DEFAULT true,
  
  -- Financial Totals (Exact NUMERIC 15,2)
  subtotal_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  taxable_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  cgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  sgst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  igst_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  round_off_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  grand_total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  balance_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  
  -- Statutory Terms & Payment Instructions
  terms_conditions TEXT,
  payment_instructions TEXT,
  notes TEXT,
  cancelled_reason TEXT,
  
  -- Audit & Lifecycle Timestamps
  issued_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by_staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT chk_invoice_positive_totals CHECK (
    subtotal_amount >= 0.00 AND
    taxable_amount >= 0.00 AND
    grand_total_amount >= 0.00 AND
    paid_amount >= 0.00 AND
    balance_amount >= 0.00
  )
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_quote ON public.invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON public.invoices(created_by_staff_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(invoice_date);

-- ------------------------------------------------------------------------------
-- 4. TABLE: public.invoice_items (LINE ITEMS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_service_id UUID REFERENCES public.products_services(id) ON DELETE SET NULL,
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
  
  CONSTRAINT chk_invoice_item_quantity CHECK (quantity > 0),
  CONSTRAINT chk_invoice_item_rate CHECK (unit_rate >= 0),
  CONSTRAINT chk_invoice_item_taxable CHECK (taxable_amount >= 0),
  CONSTRAINT chk_invoice_item_total CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON public.invoice_items(product_service_id);

-- ------------------------------------------------------------------------------
-- 5. TABLE: public.invoice_payments (PAYMENT LEDGER)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  payment_receipt_number VARCHAR(50) NOT NULL UNIQUE,
  amount NUMERIC(15, 2) NOT NULL,
  payment_method public.payment_method_enum NOT NULL DEFAULT 'bank_transfer',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_reference VARCHAR(150),
  bank_name VARCHAR(150),
  notes TEXT,
  recorded_by_staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT chk_payment_amount_positive CHECK (amount > 0.00)
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_date ON public.invoice_payments(payment_date);

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) & GRANTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.invoice_sequence_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Revoke all access from PUBLIC and anon
REVOKE ALL ON public.invoice_sequence_counters FROM PUBLIC, anon;
REVOKE ALL ON public.invoices FROM PUBLIC, anon;
REVOKE ALL ON public.invoice_items FROM PUBLIC, anon;
REVOKE ALL ON public.invoice_payments FROM PUBLIC, anon;

-- Grant table privileges to authenticated and service_role
GRANT SELECT, INSERT, UPDATE ON public.invoice_sequence_counters TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT SELECT, INSERT ON public.invoice_payments TO authenticated;

GRANT ALL ON public.invoice_sequence_counters TO service_role;
GRANT ALL ON public.invoices TO service_role;
GRANT ALL ON public.invoice_items TO service_role;
GRANT ALL ON public.invoice_payments TO service_role;

-- RLS: Active staff can SELECT all invoices and related tables
CREATE POLICY "Active staff can select invoice_sequence_counters"
  ON public.invoice_sequence_counters FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

CREATE POLICY "Active staff can select invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

CREATE POLICY "Active staff can select invoice_items"
  ON public.invoice_items FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

CREATE POLICY "Active staff can select invoice_payments"
  ON public.invoice_payments FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

-- RLS: Super Admin, Admin, and Billing Manager can INSERT/UPDATE invoices & counters
CREATE POLICY "Authorized staff can modify invoice_sequence_counters"
  ON public.invoice_sequence_counters FOR ALL TO authenticated
  USING (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'billing_manager'::public.staff_role_enum])
    )
  )
  WITH CHECK (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'billing_manager'::public.staff_role_enum])
    )
  );

CREATE POLICY "Authorized staff can modify invoices"
  ON public.invoices FOR ALL TO authenticated
  USING (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'billing_manager'::public.staff_role_enum])
    )
  )
  WITH CHECK (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'billing_manager'::public.staff_role_enum])
    )
  );

CREATE POLICY "Authorized staff can modify invoice_items"
  ON public.invoice_items FOR ALL TO authenticated
  USING (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'billing_manager'::public.staff_role_enum])
    )
  )
  WITH CHECK (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'billing_manager'::public.staff_role_enum])
    )
  );

CREATE POLICY "Authorized staff can record invoice_payments"
  ON public.invoice_payments FOR ALL TO authenticated
  USING (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'billing_manager'::public.staff_role_enum])
    )
  )
  WITH CHECK (
    public.is_active_staff(auth.uid()) AND
    (
      public.is_super_admin(auth.uid()) OR
      public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'billing_manager'::public.staff_role_enum])
    )
  );

-- ------------------------------------------------------------------------------
-- 7. ATOMIC TRANSACTIONAL PROCEDURES (CONCURRENCY & OVERPAYMENT SHIELD)
-- ------------------------------------------------------------------------------

-- Procedure: issue_invoice(p_invoice_id UUID)
-- Atomically locks invoice, checks status, allocates sequence number, updates invoice, and writes audit log.
CREATE OR REPLACE FUNCTION public.issue_invoice(
  p_invoice_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_fy TEXT;
  v_status public.invoice_status_enum;
  v_invoice_number TEXT;
  v_staff_id UUID := auth.uid();
BEGIN
  -- Authenticated staff check
  IF v_staff_id IS NOT NULL AND NOT (
    public.is_super_admin(v_staff_id) OR
    public.has_staff_role(v_staff_id, ARRAY['admin'::public.staff_role_enum, 'billing_manager'::public.staff_role_enum])
  ) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to issue invoices.';
  END IF;

  -- Lock invoice row for update
  SELECT financial_year, status INTO v_fy, v_status
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice with ID % not found.', p_invoice_id;
  END IF;

  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft invoices can be issued. Current status: %', v_status;
  END IF;

  -- Atomically allocate sequential invoice number (locked in invoice_sequence_counters)
  v_invoice_number := public.allocate_invoice_number(v_fy, 'SA');

  -- Update invoice state
  UPDATE public.invoices
  SET
    invoice_number = v_invoice_number,
    status = 'issued',
    issued_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_invoice_id;

  -- Record immutable audit log
  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    action,
    actor_type,
    actor_id,
    previous_state,
    new_state
  ) VALUES (
    'invoice',
    p_invoice_id,
    'issue_invoice',
    'staff',
    v_staff_id,
    jsonb_build_object('status', 'draft', 'invoice_number', null),
    jsonb_build_object('status', 'issued', 'invoice_number', v_invoice_number)
  );

  RETURN v_invoice_number;
END;
$$;

ALTER FUNCTION public.issue_invoice(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.issue_invoice(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_invoice(UUID) TO authenticated, service_role;

-- Procedure: record_invoice_payment(...)
-- Atomically locks invoice, guards against concurrent overpayment, records receipt, and writes audit log.
CREATE OR REPLACE FUNCTION public.record_invoice_payment(
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_method public.payment_method_enum,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_txn_reference TEXT DEFAULT NULL,
  p_bank_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_grand_total NUMERIC(15,2);
  v_paid NUMERIC(15,2);
  v_balance NUMERIC(15,2);
  v_status public.invoice_status_enum;
  v_due_date DATE;
  v_new_paid NUMERIC(15,2);
  v_new_balance NUMERIC(15,2);
  v_new_status public.invoice_status_enum;
  v_receipt_number TEXT;
  v_payment_id UUID := gen_random_uuid();
  v_staff_id UUID := auth.uid();
BEGIN
  -- Authenticated staff check
  IF v_staff_id IS NOT NULL AND NOT (
    public.is_super_admin(v_staff_id) OR
    public.has_staff_role(v_staff_id, ARRAY['admin'::public.staff_role_enum, 'billing_manager'::public.staff_role_enum])
  ) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to record payments.';
  END IF;

  IF p_amount <= 0.00 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero.';
  END IF;

  -- Lock invoice row for update: prevents concurrent double payments
  SELECT grand_total_amount, paid_amount, balance_amount, status, due_date
  INTO v_grand_total, v_paid, v_balance, v_status, v_due_date
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice with ID % not found.', p_invoice_id;
  END IF;

  IF v_status = 'draft' THEN
    RAISE EXCEPTION 'Cannot record payments on draft invoices. Issue the invoice first.';
  END IF;

  IF v_status IN ('cancelled', 'refunded') THEN
    RAISE EXCEPTION 'Cannot record payments on % invoices.', v_status;
  END IF;

  IF v_balance <= 0.00 THEN
    RAISE EXCEPTION 'Invoice is already fully settled.';
  END IF;

  -- Overpayment guard (0.01 tolerance for paise rounding)
  IF p_amount > (v_balance + 0.01) THEN
    RAISE EXCEPTION 'Payment amount (₹%) exceeds current balance (₹%).', p_amount, v_balance;
  END IF;

  -- Generate receipt number
  v_receipt_number := public.generate_payment_receipt_number();

  -- Record payment receipt
  INSERT INTO public.invoice_payments (
    id,
    invoice_id,
    payment_receipt_number,
    amount,
    payment_method,
    payment_date,
    transaction_reference,
    bank_name,
    notes,
    recorded_by_staff_id
  ) VALUES (
    v_payment_id,
    p_invoice_id,
    v_receipt_number,
    p_amount,
    p_method,
    p_payment_date,
    p_txn_reference,
    p_bank_name,
    p_notes,
    COALESCE(v_staff_id, (SELECT created_by_staff_id FROM public.invoices WHERE id = p_invoice_id))
  );

  -- Reconcile balance and new status
  v_new_paid := round(v_paid + p_amount, 2);
  v_new_balance := GREATEST(0.00, round(v_grand_total - v_new_paid, 2));

  IF v_new_balance <= 0.00 THEN
    v_new_status := 'paid';
  ELSE
    v_new_status := 'partially_paid';
  END IF;

  -- Update invoice balance & status
  UPDATE public.invoices
  SET
    paid_amount = v_new_paid,
    balance_amount = v_new_balance,
    status = v_new_status,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_invoice_id;

  -- Audit log
  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    action,
    actor_type,
    actor_id,
    previous_state,
    new_state
  ) VALUES (
    'invoice_payment',
    v_payment_id,
    'record_payment',
    'staff',
    v_staff_id,
    jsonb_build_object('paid_amount', v_paid, 'balance_amount', v_balance, 'status', v_status),
    jsonb_build_object('paid_amount', v_new_paid, 'balance_amount', v_new_balance, 'status', v_new_status, 'receipt_number', v_receipt_number)
  );

  RETURN jsonb_build_object(
    'receipt_number', v_receipt_number,
    'paid_amount', v_new_paid,
    'balance_amount', v_new_balance,
    'status', v_new_status
  );
END;
$$;

ALTER FUNCTION public.record_invoice_payment(UUID, NUMERIC, public.payment_method_enum, DATE, TEXT, TEXT, TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.record_invoice_payment(UUID, NUMERIC, public.payment_method_enum, DATE, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(UUID, NUMERIC, public.payment_method_enum, DATE, TEXT, TEXT, TEXT) TO authenticated, service_role;
