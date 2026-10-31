-- Santhaya Associates — Phase 4 Communications & Document Delivery Ledger
-- Migration: 20261031120000_phase4_communications.sql
-- Status: LOCAL MIGRATION SPECIFICATION (Do NOT apply without separate owner approval)
--
-- Scope:
-- 1. Create invoice_delivery_channel_enum
-- 2. Create public.invoice_delivery_logs table for dedicated invoice dispatch audit trails
-- 3. Row Level Security, public revokes, and authenticated access policies

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_delivery_channel_enum') THEN
    CREATE TYPE public.invoice_delivery_channel_enum AS ENUM (
      'download',
      'email',
      'phone',
      'whatsapp',
      'in_person'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.invoice_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  delivery_channel public.invoice_delivery_channel_enum NOT NULL,
  recipient_email TEXT,
  recipient_phone VARCHAR(20),
  delivery_status VARCHAR(50) NOT NULL DEFAULT 'sent',
  notes TEXT,
  recorded_by_staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performant audit queries
CREATE INDEX IF NOT EXISTS idx_invoice_delivery_logs_invoice_id ON public.invoice_delivery_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_delivery_logs_created_at ON public.invoice_delivery_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.invoice_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Revoke all access from PUBLIC and anon
REVOKE ALL ON public.invoice_delivery_logs FROM PUBLIC;
REVOKE ALL ON public.invoice_delivery_logs FROM anon;

-- Grants for authenticated staff
GRANT SELECT, INSERT ON public.invoice_delivery_logs TO authenticated;

-- Policies: Authenticated active staff can view and insert delivery logs
CREATE POLICY invoice_delivery_logs_select_policy ON public.invoice_delivery_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles
      WHERE staff_profiles.id = auth.uid()
        AND staff_profiles.is_active = true
    )
  );

CREATE POLICY invoice_delivery_logs_insert_policy ON public.invoice_delivery_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles
      WHERE staff_profiles.id = auth.uid()
        AND staff_profiles.is_active = true
    )
  );

