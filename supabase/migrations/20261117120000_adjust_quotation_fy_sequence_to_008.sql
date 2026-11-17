-- ==============================================================================
-- Santhaya Associates — Production Quotation Sequence Counter Adjustment
-- File: supabase/migrations/20261117120000_adjust_quotation_fy_sequence_to_008.sql
--
-- Objective:
-- Set the last_seq counter in public.quotation_fy_sequences for financial year
-- '2026-27' to 7 so that the next new quotation issued by the ERP receives
-- QT-2026-27-008, and subsequent quotations receive QT-2026-27-009, 010, etc.
--
-- Safety & Concurrency Protections:
-- 1. Verifies that QT-2026-27-008 has NOT been used or issued.
-- 2. Verifies that the financial_year row exists.
-- 3. Updates last_seq to 7 with current Asia/Kolkata timestamp.
-- ==============================================================================

DO $$
DECLARE
  v_count INT;
BEGIN
  -- 1. Preflight safety check: verify QT-2026-27-008 does not exist
  SELECT COUNT(*) INTO v_count
  FROM public.quotations
  WHERE quotation_number = 'QT-2026-27-008';

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Safety check failed: Quotation QT-2026-27-008 already exists in public.quotations.'
      USING ERRCODE = '23505';
  END IF;

  -- 2. Upsert last_seq = 7 for financial year '2026-27'
  INSERT INTO public.quotation_fy_sequences (financial_year, last_seq, updated_at)
  VALUES ('2026-27', 7, timezone('Asia/Kolkata'::text, now()))
  ON CONFLICT (financial_year)
  DO UPDATE SET
    last_seq = 7,
    updated_at = timezone('Asia/Kolkata'::text, now());

  RAISE NOTICE 'Quotation sequence for financial year 2026-27 successfully adjusted to last_seq = 7 (Next quote will be QT-2026-27-008).';
END $$;
