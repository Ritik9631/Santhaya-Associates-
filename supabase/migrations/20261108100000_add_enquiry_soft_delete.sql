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

-- 5. RLS Policy: Super Admins can update quotation_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'quotation_requests' 
      AND policyname = 'Super Admins can update quotation_requests'
  ) THEN
    CREATE POLICY "Super Admins can update quotation_requests"
      ON public.quotation_requests FOR UPDATE TO authenticated
      USING (public.is_super_admin(auth.uid()))
      WITH CHECK (public.is_super_admin(auth.uid()));
  END IF;
END $$;

-- 6. Trigger to strictly enforce Super Admin authorization on direct soft deletion and restoration
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

-- 7. Atomic Stored Procedure: Soft Delete with Audit Log in a single transaction
CREATE OR REPLACE FUNCTION public.soft_delete_quotation_request(
  p_enquiry_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_acting_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff_id UUID;
  v_existing public.quotation_requests%ROWTYPE;
  v_now TIMESTAMPTZ := now();
  v_clean_reason TEXT := NULLIF(trim(p_reason), '');
BEGIN
  v_staff_id := COALESCE(auth.uid(), p_acting_user_id);

  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: No authenticated user session or actor ID provided.';
  END IF;

  IF NOT public.is_super_admin(v_staff_id) THEN
    RAISE EXCEPTION 'Access denied: Only active Super Administrators can delete quotation enquiries.';
  END IF;

  SELECT * INTO v_existing
  FROM public.quotation_requests
  WHERE id = p_enquiry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enquiry record not found.';
  END IF;

  IF v_existing.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'This enquiry has already been moved to Trash.';
  END IF;

  UPDATE public.quotation_requests
  SET
    deleted_at = v_now,
    deleted_by_staff_id = v_staff_id,
    deletion_reason = v_clean_reason,
    updated_at = v_now
  WHERE id = p_enquiry_id;

  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    action,
    actor_type,
    actor_id,
    previous_state,
    new_state
  ) VALUES (
    'quotation_requests',
    p_enquiry_id,
    'enquiry_soft_deleted',
    'staff',
    v_staff_id,
    jsonb_build_object('deleted_at', NULL, 'status', v_existing.status),
    jsonb_build_object('deleted_at', v_now, 'deleted_by_staff_id', v_staff_id, 'deletion_reason', v_clean_reason)
  );

  RETURN jsonb_build_object('success', true, 'id', p_enquiry_id, 'deleted_at', v_now);
END;
$$;

ALTER FUNCTION public.soft_delete_quotation_request(UUID, TEXT, UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.soft_delete_quotation_request(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_quotation_request(UUID, TEXT, UUID) TO authenticated, service_role;

-- 8. Atomic Stored Procedure: Restore with Audit Log in a single transaction
CREATE OR REPLACE FUNCTION public.restore_quotation_request(
  p_enquiry_id UUID,
  p_acting_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff_id UUID;
  v_existing public.quotation_requests%ROWTYPE;
  v_now TIMESTAMPTZ := now();
BEGIN
  v_staff_id := COALESCE(auth.uid(), p_acting_user_id);

  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: No authenticated user session or actor ID provided.';
  END IF;

  IF NOT public.is_super_admin(v_staff_id) THEN
    RAISE EXCEPTION 'Access denied: Only active Super Administrators can restore quotation enquiries.';
  END IF;

  SELECT * INTO v_existing
  FROM public.quotation_requests
  WHERE id = p_enquiry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enquiry record not found.';
  END IF;

  IF v_existing.deleted_at IS NULL THEN
    RAISE EXCEPTION 'This enquiry is not in the Trash.';
  END IF;

  UPDATE public.quotation_requests
  SET
    deleted_at = NULL,
    deleted_by_staff_id = NULL,
    deletion_reason = NULL,
    updated_at = v_now
  WHERE id = p_enquiry_id;

  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    action,
    actor_type,
    actor_id,
    previous_state,
    new_state
  ) VALUES (
    'quotation_requests',
    p_enquiry_id,
    'enquiry_restored',
    'staff',
    v_staff_id,
    jsonb_build_object('deleted_at', v_existing.deleted_at, 'deletion_reason', v_existing.deletion_reason),
    jsonb_build_object('deleted_at', NULL, 'restored_at', v_now, 'restored_by', v_staff_id)
  );

  RETURN jsonb_build_object('success', true, 'id', p_enquiry_id);
END;
$$;

ALTER FUNCTION public.restore_quotation_request(UUID, UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.restore_quotation_request(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_quotation_request(UUID, UUID) TO authenticated, service_role;



