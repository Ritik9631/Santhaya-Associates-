-- ==============================================================================
-- Santhaya Associates — Soft Deletion and Audit Columns for Quotation Requests
-- File: supabase/migrations/20261108100000_add_enquiry_soft_delete.sql
--
-- Target Database: Supabase Development Project (bkqneudnnhvvwmtggorz)
-- Scope:
-- 1. Add deleted_at (TIMESTAMPTZ) to public.quotation_requests for safe soft deletion.
-- 2. Add deleted_by_staff_id (UUID) referencing public.staff_profiles(id).
-- 3. Add deletion_reason (TEXT) for regulatory audit and compliance.
-- 4. Create an index on deleted_at to accelerate active enquiry queries.
--
-- STATUS: Additive, Non-Destructive Schema Enhancement.
-- Existing active enquiries remain unaffected (deleted_at defaults to NULL).
-- ==============================================================================

DO $$
BEGIN
  -- 1. Add deleted_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quotation_requests' 
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.quotation_requests 
      ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  -- 2. Add deleted_by_staff_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quotation_requests' 
      AND column_name = 'deleted_by_staff_id'
  ) THEN
    ALTER TABLE public.quotation_requests 
      ADD COLUMN deleted_by_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL DEFAULT NULL;
  END IF;

  -- 3. Add deletion_reason column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quotation_requests' 
      AND column_name = 'deletion_reason'
  ) THEN
    ALTER TABLE public.quotation_requests 
      ADD COLUMN deletion_reason TEXT DEFAULT NULL;
  END IF;
END $$;

-- 4. Index for fast active list and trash filtering
CREATE INDEX IF NOT EXISTS idx_quotation_requests_deleted_at ON public.quotation_requests(deleted_at);

-- 5. Trigger to strictly enforce Super Admin authorization on soft deletion and restoration
CREATE OR REPLACE FUNCTION public.guard_quotation_requests_soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Detect modifications to soft-delete tracking columns
  IF (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at) OR
     (OLD.deleted_by_staff_id IS DISTINCT FROM NEW.deleted_by_staff_id) OR
     (OLD.deletion_reason IS DISTINCT FROM NEW.deletion_reason) THEN

    -- When executed in an authenticated Supabase user context, enforce Super Admin check
    IF auth.uid() IS NOT NULL AND NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Access denied: Only active Super Administrators can soft-delete or restore quotation enquiries.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_quotation_requests_soft_delete ON public.quotation_requests;
CREATE TRIGGER trg_guard_quotation_requests_soft_delete
  BEFORE UPDATE ON public.quotation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_quotation_requests_soft_delete();


