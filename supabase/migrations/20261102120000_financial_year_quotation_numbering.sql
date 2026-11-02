-- ==============================================================================
-- Santhaya Associates — Indian Financial Year Quotation Numbering Subsystem
-- File: supabase/migrations/20261102120000_financial_year_quotation_numbering.sql
--
-- Format: QT-YYYY-YY-NNN (e.g. QT-2026-27-001)
-- Rules:
-- 1. Financial year in Asia/Kolkata timezone: 1 April to 31 March
-- 2. Concurrency-safe atomic sequence tracking per financial year
-- 3. Sequence numbers start at 001 and expand beyond 3 digits if needed
-- 4. Preserves all existing historical QTN-YYYY-NNNNN quotations without renumbering
--
-- STATUS: PREPARED FOR HUMAN REVIEW & EXPLICIT APPROVAL (DO NOT RUN AUTOMATICALLY)
-- ==============================================================================

-- 1. Table for tracking sequential numbers per financial year
CREATE TABLE IF NOT EXISTS public.quotation_fy_sequences (
  financial_year VARCHAR(10) PRIMARY KEY, -- e.g. '2026-27'
  last_seq BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Kolkata'::text, now())
);

-- 2. Function: Generates sequential quotation numbers (QT-YYYY-YY-NNN)
CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := timezone('Asia/Kolkata'::text, now());
  v_cal_year INT := EXTRACT(YEAR FROM v_now)::INT;
  v_cal_month INT := EXTRACT(MONTH FROM v_now)::INT;
  v_start_year INT;
  v_end_year_short TEXT;
  v_fy TEXT;
  v_seq BIGINT;
  v_formatted TEXT;
BEGIN
  -- Indian Financial Year: 1 April to 31 March
  IF v_cal_month >= 4 THEN
    v_start_year := v_cal_year;
  ELSE
    v_start_year := v_cal_year - 1;
  END IF;

  v_end_year_short := lpad(((v_start_year + 1) % 100)::TEXT, 2, '0');
  v_fy := v_start_year::TEXT || '-' || v_end_year_short; -- e.g. '2026-27'

  -- Atomic upsert and increment (concurrency-safe with row lock)
  INSERT INTO public.quotation_fy_sequences (financial_year, last_seq, updated_at)
  VALUES (v_fy, 1, v_now)
  ON CONFLICT (financial_year)
  DO UPDATE SET
    last_seq = public.quotation_fy_sequences.last_seq + 1,
    updated_at = v_now
  RETURNING last_seq INTO v_seq;

  -- Format: QT-YYYY-YY-NNN (minimum 3 digits, expands if >= 1000)
  IF v_seq >= 1000 THEN
    v_formatted := 'QT-' || v_fy || '-' || v_seq::TEXT;
  ELSE
    v_formatted := 'QT-' || v_fy || '-' || lpad(v_seq::TEXT, 3, '0');
  END IF;

  RETURN v_formatted;
END;
$$;

ALTER FUNCTION public.generate_quotation_number() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.generate_quotation_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_quotation_number() TO authenticated, service_role;

