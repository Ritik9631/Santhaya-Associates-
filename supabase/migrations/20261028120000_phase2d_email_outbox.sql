-- ==============================================================================
-- Santhaya Associates Pvt. Ltd. — Phase 2D Database Migration
-- File: supabase/migrations/20261028120000_phase2d_email_outbox.sql
--
-- STATUS: PREPARATION ONLY — DO NOT APPLY WITHOUT EXPLICIT HUMAN AUTHORIZATION
--
-- Scope:
-- 1. Create email_status_enum ('pending', 'processing', 'sent', 'failed', 'dead_letter').
-- 2. Create public.email_outbox table with resilient retry & checkout columns.
-- 3. Enable RLS and restrict access exclusively to service_role (0 access for anon & authenticated).
-- 4. Create atomic stored procedure: submit_quotation_request_atomic
--    Guarantees atomic commit of: quotation_requests + audit_logs + email_outbox.
-- ==============================================================================

-- 1. Create Email Outbox Status Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_status_enum') THEN
    CREATE TYPE public.email_status_enum AS ENUM (
      'pending',
      'processing',
      'sent',
      'failed',
      'dead_letter'
    );
  END IF;
END $$;

-- 2. Create Email Outbox Table
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  email_type VARCHAR(50) NOT NULL, -- 'enquiry_alert_admin', 'quotation_customer', 'invoice_customer'
  payload JSONB NOT NULL,
  status public.email_status_enum NOT NULL DEFAULT 'pending'::public.email_status_enum,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  provider_message_id TEXT,
  error_message TEXT,
  related_entity_type VARCHAR(50), -- 'quotation_request', 'quotation', 'invoice'
  related_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  processed_at TIMESTAMPTZ
);

-- Partial index for high-performance outbox worker polling
CREATE INDEX IF NOT EXISTS idx_email_outbox_queue 
  ON public.email_outbox(status, next_retry_at) 
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_email_outbox_related 
  ON public.email_outbox(related_entity_type, related_entity_id);

-- 3. Security & Row Level Security (RLS)
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

-- Revoke all table-level access from anonymous and general authenticated users
REVOKE ALL ON public.email_outbox FROM PUBLIC, anon, authenticated;

-- Service role has operational access for backend outbox worker
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_outbox TO service_role;

-- Deny policy for authenticated (Defense-in-depth)
DROP POLICY IF EXISTS "Deny all client operations on email_outbox" ON public.email_outbox;
CREATE POLICY "Deny all client operations on email_outbox"
  ON public.email_outbox FOR ALL TO public
  USING (false)
  WITH CHECK (false);

-- ==============================================================================
-- 4. SCHEMA AMENDMENTS FOR FLEXIBLE CONTACT METHODS
--
-- Business Requirements:
-- 1. Public website enquiries must provide at least one contact method (email or phone).
-- 2. Staff can create customer records without mandatory email or phone.
-- ==============================================================================

-- Allow either email or phone in public quotation_requests (Single-Contact Intake)
ALTER TABLE public.quotation_requests ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.quotation_requests ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.quotation_requests DROP CONSTRAINT IF EXISTS quotation_phone_check;
ALTER TABLE public.quotation_requests ADD CONSTRAINT quotation_phone_check CHECK (phone IS NULL OR phone ~ '^[6-9]\d{9}$');
ALTER TABLE public.quotation_requests DROP CONSTRAINT IF EXISTS quotation_contact_check;
ALTER TABLE public.quotation_requests ADD CONSTRAINT quotation_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL);

-- Allow staff to create customer records without mandatory email or phone
ALTER TABLE public.customers ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customer_phone_check;
ALTER TABLE public.customers ADD CONSTRAINT customer_phone_check CHECK (phone IS NULL OR phone ~ '^[6-9]\d{9}$');

-- ==============================================================================
-- 5. ATOMIC INGESTION PROCEDURE: submit_quotation_request_atomic
--
-- Atomically inserts:
-- 1. quotation_requests record
-- 2. audit_logs entry
-- 3. email_outbox job
--
-- Guarantees zero dropped notifications and zero partial database states.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.submit_quotation_request_atomic(
  p_idempotency_key UUID,
  p_request_payload_hash VARCHAR(64),
  p_business_name TEXT,
  p_contact_person TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_gstin TEXT DEFAULT NULL,
  p_service_category public.service_category_enum DEFAULT 'construction_tenders'::public.service_category_enum,
  p_requirement_details TEXT DEFAULT '',
  p_quantity TEXT DEFAULT NULL,
  p_technical_specs TEXT DEFAULT NULL,
  p_delivery_location TEXT DEFAULT '',
  p_notes TEXT DEFAULT NULL,
  p_privacy_consent BOOLEAN DEFAULT true,
  p_submission_ip_hash VARCHAR(64) DEFAULT '',
  p_user_agent TEXT DEFAULT NULL,
  p_risk_flag VARCHAR(50) DEFAULT 'none',
  p_admin_notification_email TEXT DEFAULT 'inquiries@santhaya.local'
)
RETURNS TABLE (
  reference_number TEXT,
  created_at TIMESTAMPTZ,
  result_status TEXT,
  outbox_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.quotation_requests%ROWTYPE;
  v_ref TEXT;
  v_status public.quotation_request_status_enum := 'new'::public.quotation_request_status_enum;
  v_created_at TIMESTAMPTZ;
  v_new_id UUID;
  v_outbox_id UUID;
BEGIN
  -- 1. Input restriction & validation checks
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'INVALID_INPUT: Idempotency key cannot be null.';
  END IF;
  IF p_request_payload_hash IS NULL OR length(p_request_payload_hash) <> 64 THEN
    RAISE EXCEPTION 'INVALID_INPUT: Request payload hash must be a 64-character SHA-256 hex string.';
  END IF;
  IF p_submission_ip_hash IS NULL OR length(p_submission_ip_hash) <> 64 THEN
    RAISE EXCEPTION 'INVALID_INPUT: Submission IP hash must be a 64-character SHA-256 hex string.';
  END IF;
  IF length(trim(p_business_name)) < 2 OR length(p_business_name) > 200 THEN
    RAISE EXCEPTION 'INVALID_INPUT: Business name must be between 2 and 200 characters.';
  END IF;
  IF length(trim(p_contact_person)) < 2 OR length(p_contact_person) > 100 THEN
    RAISE EXCEPTION 'INVALID_INPUT: Contact person must be between 2 and 100 characters.';
  END IF;

  -- Conditional contact validation: At least one contact method must be provided
  IF (p_email IS NULL OR trim(p_email) = '') AND (p_phone IS NULL OR trim(p_phone) = '') THEN
    RAISE EXCEPTION 'INVALID_INPUT: At least one contact method (valid phone number or official email) is required.';
  END IF;

  -- Validate email format if provided
  IF p_email IS NOT NULL AND trim(p_email) <> '' THEN
    IF trim(p_email) !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR length(trim(p_email)) > 254 THEN
      RAISE EXCEPTION 'INVALID_INPUT: Invalid email address format.';
    END IF;
  END IF;

  -- Validate phone format if provided
  IF p_phone IS NOT NULL AND trim(p_phone) <> '' THEN
    IF trim(p_phone) !~ '^[6-9]\d{9}$' THEN
      RAISE EXCEPTION 'INVALID_INPUT: Phone must be a valid 10-digit Indian mobile number.';
    END IF;
  END IF;

  IF p_gstin IS NOT NULL AND p_gstin <> '' AND p_gstin !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$' THEN
    RAISE EXCEPTION 'INVALID_INPUT: Invalid GSTIN format.';
  END IF;
  IF length(trim(p_requirement_details)) < 10 OR length(p_requirement_details) > 5000 THEN
    RAISE EXCEPTION 'INVALID_INPUT: Requirement details must be between 10 and 5000 characters.';
  END IF;
  IF length(trim(p_delivery_location)) < 2 OR length(p_delivery_location) > 500 THEN
    RAISE EXCEPTION 'INVALID_INPUT: Delivery location must be between 2 and 500 characters.';
  END IF;
  IF NOT p_privacy_consent THEN
    RAISE EXCEPTION 'INVALID_INPUT: Privacy consent is mandatory.';
  END IF;

  -- 2. Idempotency Check
  SELECT * INTO v_existing FROM public.quotation_requests
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    -- Check if payload hash matches original submission
    IF v_existing.request_payload_hash = p_request_payload_hash THEN
      -- Safe Replay: Find associated outbox job if exists
      SELECT id INTO v_outbox_id FROM public.email_outbox
      WHERE related_entity_type = 'quotation_request' AND related_entity_id = v_existing.id
      LIMIT 1;

      RETURN QUERY SELECT v_existing.reference_number, v_existing.created_at, 'replayed'::TEXT, v_outbox_id;
      RETURN;
    ELSE
      -- Conflict: Same idempotency key used with differing payload
      RAISE EXCEPTION 'CONFLICT_PAYLOAD_MISMATCH: Idempotency key already used with a different request payload.';
    END IF;
  END IF;

  -- 3. Risk Flagging
  IF p_risk_flag = 'rapid_submission' THEN
    v_status := 'under_review'::public.quotation_request_status_enum;
  END IF;

  -- 4. Reference Number Generation (e.g. INQ-2026-00001)
  v_ref := 'INQ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.quotation_request_seq')::text, 5, '0');
  v_created_at := timezone('utc'::text, now());

  -- 5. Insert Quotation Request Snapshot
  INSERT INTO public.quotation_requests (
    reference_number,
    business_name,
    contact_person,
    email,
    phone,
    gstin,
    service_category,
    requirement_details,
    quantity,
    technical_specs,
    delivery_location,
    notes,
    privacy_consent,
    status,
    submission_ip_hash,
    user_agent,
    idempotency_key,
    request_payload_hash,
    risk_flag,
    created_at,
    updated_at
  ) VALUES (
    v_ref,
    trim(p_business_name),
    trim(p_contact_person),
    NULLIF(lower(trim(p_email)), ''),
    NULLIF(trim(p_phone), ''),
    NULLIF(upper(trim(p_gstin)), ''),
    p_service_category,
    trim(p_requirement_details),
    NULLIF(trim(p_quantity), ''),
    NULLIF(trim(p_technical_specs), ''),
    trim(p_delivery_location),
    NULLIF(trim(p_notes), ''),
    p_privacy_consent,
    v_status,
    p_submission_ip_hash,
    p_user_agent,
    p_idempotency_key,
    p_request_payload_hash,
    p_risk_flag,
    v_created_at,
    v_created_at
  ) RETURNING id INTO v_new_id;

  -- 6. Insert Append-Only Audit Log Entry Atomically
  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    action,
    actor_type,
    actor_ip_hash,
    new_state,
    created_at
  ) VALUES (
    'quotation_request',
    v_new_id,
    'submitted',
    'server_api',
    p_submission_ip_hash,
    jsonb_build_object(
      'reference_number', v_ref,
      'service_category', p_service_category,
      'risk_flag', p_risk_flag,
      'status', v_status
    ),
    v_created_at
  );

  -- 7. Insert Durable Email Outbox Notification Atomically
  INSERT INTO public.email_outbox (
    recipient_email,
    subject,
    email_type,
    payload,
    status,
    related_entity_type,
    related_entity_id,
    created_at
  ) VALUES (
    p_admin_notification_email,
    '[New Inquiry] ' || v_ref || ' — ' || trim(p_business_name),
    'enquiry_alert_admin',
    jsonb_build_object(
      'referenceNumber', v_ref,
      'businessName', trim(p_business_name),
      'contactPerson', trim(p_contact_person),
      'email', NULLIF(lower(trim(p_email)), ''),
      'phone', NULLIF(trim(p_phone), ''),
      'gstin', NULLIF(upper(trim(p_gstin)), ''),
      'serviceCategory', p_service_category,
      'requirementDetails', trim(p_requirement_details),
      'quantity', NULLIF(trim(p_quantity), ''),
      'technicalSpecs', NULLIF(trim(p_technical_specs), ''),
      'deliveryLocation', trim(p_delivery_location),
      'notes', NULLIF(trim(p_notes), ''),
      'riskFlag', p_risk_flag,
      'submittedAt', to_char(v_created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    'pending',
    'quotation_request',
    v_new_id,
    v_created_at
  ) RETURNING id INTO v_outbox_id;

  RETURN QUERY SELECT v_ref, v_created_at, 'created'::TEXT, v_outbox_id;
END;
$$;

ALTER FUNCTION public.submit_quotation_request_atomic(
  UUID, VARCHAR(64), TEXT, TEXT, TEXT, TEXT, TEXT, 
  public.service_category_enum, TEXT, TEXT, TEXT, TEXT, TEXT, 
  BOOLEAN, VARCHAR(64), TEXT, VARCHAR(50), TEXT
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.submit_quotation_request_atomic(
  UUID, VARCHAR(64), TEXT, TEXT, TEXT, TEXT, TEXT, 
  public.service_category_enum, TEXT, TEXT, TEXT, TEXT, TEXT, 
  BOOLEAN, VARCHAR(64), TEXT, VARCHAR(50), TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_quotation_request_atomic(
  UUID, VARCHAR(64), TEXT, TEXT, TEXT, TEXT, TEXT, 
  public.service_category_enum, TEXT, TEXT, TEXT, TEXT, TEXT, 
  BOOLEAN, VARCHAR(64), TEXT, VARCHAR(50), TEXT
) TO service_role;

-- ==============================================================================
-- 6. QUEUE BATCH CHECKOUT PROCEDURE: claim_email_outbox_batch
--
-- Uses PostgreSQL FOR UPDATE SKIP LOCKED for high-concurrency atomic checkout.
-- Guarantees multiple worker instances never process the same email job.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.claim_email_outbox_batch(p_batch_size INT DEFAULT 10)
RETURNS SETOF public.email_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.email_outbox
  SET status = 'processing',
      processed_at = timezone('utc'::text, now())
  WHERE id IN (
    SELECT id
    FROM public.email_outbox
    WHERE status IN ('pending', 'failed')
      AND next_retry_at <= timezone('utc'::text, now())
      AND attempts < max_attempts
    ORDER BY created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

ALTER FUNCTION public.claim_email_outbox_batch(INT) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.claim_email_outbox_batch(INT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_email_outbox_batch(INT) TO service_role;
