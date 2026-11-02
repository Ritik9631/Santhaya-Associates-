-- ==============================================================================
-- Santhaya Associates — Soft Deletion and Audit Columns for Quotations
-- File: supabase/migrations/20261102100000_add_quotation_soft_delete.sql
--
-- Target Database: Supabase Development Project (bkqneudnnhvvwmtggorz)
-- Scope:
-- 1. Add deleted_at (TIMESTAMPTZ) to public.quotations for safe soft deletion.
-- 2. Add deleted_by_staff_id (UUID) referencing public.staff_profiles(id).
-- 3. Add deletion_reason (TEXT) for regulatory audit compliance.
-- 4. Create an index on deleted_at to accelerate active quotation queries.
--
-- STATUS: PREPARED FOR HUMAN REVIEW & EXPLICIT APPROVAL (DO NOT RUN AUTOMATICALLY)
-- ==============================================================================

DO $$
BEGIN
  -- 1. Add deleted_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quotations' 
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.quotations 
      ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  -- 2. Add deleted_by_staff_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quotations' 
      AND column_name = 'deleted_by_staff_id'
  ) THEN
    ALTER TABLE public.quotations 
      ADD COLUMN deleted_by_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL DEFAULT NULL;
  END IF;

  -- 3. Add deletion_reason column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quotations' 
      AND column_name = 'deletion_reason'
  ) THEN
    ALTER TABLE public.quotations 
      ADD COLUMN deletion_reason TEXT DEFAULT NULL;
  END IF;
END $$;

-- 4. Index for fast active list filtering
CREATE INDEX IF NOT EXISTS idx_quotations_deleted_at ON public.quotations(deleted_at);

