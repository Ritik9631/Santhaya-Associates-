-- ==============================================================================
-- Santhaya Associates — Production Quotation Sequence Counter Adjustment
-- File: supabase/migrations/20261117120000_adjust_quotation_fy_sequence_to_008.sql
--
-- Objective:
-- Set the last_seq counter in public.quotation_fy_sequences for financial year
-- '2026-27' to 7 so that the next new quotation issued by the ERP receives
-- QT-2026-27-008, and subsequent quotations receive QT-2026-27-009, 010, etc.
--
-- Strict Safety & Concurrency Protections:
-- 1. Verifies that last_seq for '2026-27' has not already advanced to 7 or beyond.
-- 2. Verifies that quotation QT-2026-27-008 (or higher) does NOT exist.
-- 3. Refuses to run (raises exception) if production state has changed unexpectedly.
-- 4. Advances counter without altering or renumbering any existing quotation record.
-- 5. Performs atomic upsert with exclusive row lock.
-- ==============================================================================

DO $$
DECLARE
  v_current_last_seq BIGINT;
  v_count INT;
BEGIN
  -- 1. Preflight check: Ensure sequence has not already advanced past expected state
  SELECT last_seq INTO v_current_last_seq
  FROM public.quotation_fy_sequences
  WHERE financial_year = '2026-27';

  IF v_current_last_seq IS NOT NULL AND v_current_last_seq >= 7 THEN
    RAISE EXCEPTION 'Safety check failed: quotation_fy_sequences for 2026-27 is already at last_seq = % (expected < 7). Production state has changed unexpectedly.', v_current_last_seq
      USING ERRCODE = '22000';
  END IF;

  -- 2. Preflight check: Verify no quotation QT-2026-27-008 or higher already exists
  SELECT COUNT(*) INTO v_count
  FROM public.quotations
  WHERE quotation_number >= 'QT-2026-27-008'
    AND quotation_number LIKE 'QT-2026-27-%';

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Safety check failed: Quotation QT-2026-27-008 or higher already exists in public.quotations. Production state has changed unexpectedly.'
      USING ERRCODE = '23505';
  END IF;

  -- 3. Atomic upsert: Set last_seq = 7 for financial year '2026-27'
  INSERT INTO public.quotation_fy_sequences (financial_year, last_seq, updated_at)
  VALUES ('2026-27', 7, timezone('Asia/Kolkata'::text, now()))
  ON CONFLICT (financial_year)
  DO UPDATE SET
    last_seq = 7,
    updated_at = timezone('Asia/Kolkata'::text, now());

  RAISE NOTICE 'Quotation sequence for financial year 2026-27 successfully adjusted to last_seq = 7 (Next quotation will be QT-2026-27-008).';
END $$;
