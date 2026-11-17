-- ==============================================================================
-- Santhaya Associates — Stored Procedure: Reopen Rejected Quotation Subsystem
-- File: supabase/migrations/20261117100000_add_reopen_rejected_quotation.sql
--
-- Objective:
-- 1. Provide an atomic, Super Admin-only procedure to safely reopen accidentally
--    rejected commercial quotations.
-- 2. Strictly preserve the original quotation number, customer details, tax rates,
--    discounts, and historical revision records.
-- 3. Lock the rejected version as an immutable snapshot (is_locked = true).
-- 4. Create an editable draft revision (N+1, is_locked = false) with cloned line items.
-- 5. Record an immutable audit log entry in public.audit_logs capturing actor,
--    timestamp, reason, and state transitions.
-- 6. Enforce strict role-based access control (Super Admin only).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.reopen_rejected_quotation(
  p_quotation_id UUID,
  p_reason TEXT,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_role public.staff_role_enum;
  v_actor_active BOOLEAN;
  v_quote RECORD;
  v_current_version RECORD;
  v_new_version_num INT;
  v_new_version_code TEXT;
  v_new_version_id UUID;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_new_expires_at DATE;
  v_invoice_count INT;
BEGIN
  -- ---------------------------------------------------------------------------
  -- 1. AUTHORIZATION CHECK: Super Admin Only
  -- ---------------------------------------------------------------------------
  SELECT role, is_active
  INTO v_actor_role, v_actor_active
  FROM public.staff_profiles
  WHERE id = p_actor_id;

  IF NOT FOUND OR v_actor_active IS NOT TRUE OR v_actor_role != 'super_admin'::public.staff_role_enum THEN
    RAISE EXCEPTION 'Access denied: Only active Super Administrators can reopen rejected quotations.'
      USING ERRCODE = '42501';
  END IF;

  -- Validate reason (minimum 5 characters)
  IF p_reason IS NULL OR trim(p_reason) = '' OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A valid reason (minimum 5 characters) is required to reopen a rejected quotation.'
      USING ERRCODE = '22023';
  END IF;

  -- ---------------------------------------------------------------------------
  -- 2. QUOTATION ELIGIBILITY & CONCURRENCY LOCK
  -- ---------------------------------------------------------------------------
  SELECT *
  INTO v_quote
  FROM public.quotations
  WHERE id = p_quotation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation with ID % not found.', p_quotation_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Rejection check: Only 'rejected' quotations can be reopened
  IF v_quote.status != 'rejected'::public.quotation_status_enum THEN
    RAISE EXCEPTION 'Cannot reopen quotation: Current status is % (only rejected quotations can be reopened).', v_quote.status
      USING ERRCODE = '22000';
  END IF;

  -- Soft-delete check
  IF v_quote.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot reopen deleted quotation: Quotation is in Trash.'
      USING ERRCODE = '22000';
  END IF;

  -- Invoiced check: Verify no active invoice references this quotation
  SELECT COUNT(*)
  INTO v_invoice_count
  FROM public.invoices
  WHERE quotation_id = p_quotation_id;

  IF v_invoice_count > 0 THEN
    RAISE EXCEPTION 'Cannot reopen quotation: An invoice has already been issued for this quotation.'
      USING ERRCODE = '22000';
  END IF;

  -- ---------------------------------------------------------------------------
  -- 3. LOAD & LOCK CURRENT REJECTED VERSION SNAPSHOT
  -- ---------------------------------------------------------------------------
  SELECT *
  INTO v_current_version
  FROM public.quotation_versions
  WHERE quotation_id = p_quotation_id
    AND version_number = v_quote.current_version_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Current quotation version snapshot (V%) could not be loaded.', v_quote.current_version_number
      USING ERRCODE = 'P0002';
  END IF;

  -- Lock the rejected version so it remains an immutable historical snapshot
  UPDATE public.quotation_versions
  SET is_locked = true
  WHERE id = v_current_version.id;

  -- ---------------------------------------------------------------------------
  -- 4. CREATE NEW EDITABLE DRAFT REVISION (N+1)
  -- ---------------------------------------------------------------------------
  v_new_version_num := v_quote.current_version_number + 1;
  v_new_version_code := v_quote.quotation_number || '-R' || (v_new_version_num - 1)::TEXT;
  v_new_expires_at := (v_now + (COALESCE(v_current_version.validity_days, 30) || ' days')::INTERVAL)::DATE;

  INSERT INTO public.quotation_versions (
    quotation_id,
    version_number,
    version_code,
    validity_days,
    expires_at,
    delivery_location,
    payment_terms,
    terms_conditions,
    subtotal_amount,
    discount_amount,
    taxable_amount,
    cgst_amount,
    sgst_amount,
    igst_amount,
    total_tax_amount,
    round_off_amount,
    grand_total_amount,
    is_locked,
    issued_at,
    created_by_staff_id,
    created_at
  ) VALUES (
    p_quotation_id,
    v_new_version_num,
    v_new_version_code,
    v_current_version.validity_days,
    v_new_expires_at,
    v_current_version.delivery_location,
    v_current_version.payment_terms,
    v_current_version.terms_conditions,
    v_current_version.subtotal_amount,
    v_current_version.discount_amount,
    v_current_version.taxable_amount,
    v_current_version.cgst_amount,
    v_current_version.sgst_amount,
    v_current_version.igst_amount,
    v_current_version.total_tax_amount,
    v_current_version.round_off_amount,
    v_current_version.grand_total_amount,
    false, -- Editable draft
    NULL,  -- Not yet issued
    p_actor_id,
    v_now
  )
  RETURNING id INTO v_new_version_id;

  -- ---------------------------------------------------------------------------
  -- 5. CLONE ALL LINE ITEMS INTO NEW REVISION
  -- ---------------------------------------------------------------------------
  INSERT INTO public.quotation_items (
    quotation_version_id,
    product_service_id,
    sort_order,
    item_name,
    description,
    hsn_sac_code,
    unit,
    quantity,
    unit_rate,
    discount_amount,
    taxable_amount,
    gst_rate,
    cgst_rate,
    sgst_rate,
    igst_rate,
    cgst_amount,
    sgst_amount,
    igst_amount,
    tax_amount,
    line_total
  )
  SELECT
    v_new_version_id,
    product_service_id,
    sort_order,
    item_name,
    description,
    hsn_sac_code,
    unit,
    quantity,
    unit_rate,
    discount_amount,
    taxable_amount,
    gst_rate,
    cgst_rate,
    sgst_rate,
    igst_rate,
    cgst_amount,
    sgst_amount,
    igst_amount,
    tax_amount,
    line_total
  FROM public.quotation_items
  WHERE quotation_version_id = v_current_version.id
  ORDER BY sort_order ASC;

  -- ---------------------------------------------------------------------------
  -- 6. UPDATE MASTER QUOTATION: SET DRAFT STATUS & ADVANCE VERSION NUMBER
  -- ---------------------------------------------------------------------------
  UPDATE public.quotations
  SET
    current_version_number = v_new_version_num,
    status = 'draft'::public.quotation_status_enum,
    updated_at = v_now
  WHERE id = p_quotation_id;

  -- ---------------------------------------------------------------------------
  -- 7. WRITE IMMUTABLE AUDIT LOG ENTRY
  -- ---------------------------------------------------------------------------
  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    action,
    actor_type,
    actor_id,
    previous_state,
    new_state
  ) VALUES (
    'quotations',
    p_quotation_id,
    'quotation_reopened',
    'staff',
    p_actor_id,
    jsonb_build_object(
      'status', 'rejected',
      'version', v_quote.current_version_number,
      'version_code', v_current_version.version_code
    ),
    jsonb_build_object(
      'status', 'draft',
      'version', v_new_version_num,
      'version_code', v_new_version_code,
      'reason', trim(p_reason),
      'reopened_at', v_now
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'quotationId', p_quotation_id,
    'quotationNumber', v_quote.quotation_number,
    'previousVersion', v_quote.current_version_number,
    'newVersionNumber', v_new_version_num,
    'versionCode', v_new_version_code,
    'status', 'draft'
  );
END;
$$;

-- Security Hardening: Revoke from public/anon/authenticated, grant strictly to service_role
ALTER FUNCTION public.reopen_rejected_quotation(UUID, TEXT, UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reopen_rejected_quotation(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_rejected_quotation(UUID, TEXT, UUID) TO service_role;
