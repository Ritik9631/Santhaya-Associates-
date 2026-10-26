-- ==============================================================================
-- Santhaya Associates Pvt. Ltd. — Web Platform Database Migration
-- Migration: 20261026120000_phase2_schema_and_security.sql
-- Phase: 2B (Schema, Security Policies, Functions & Tamper-Resistant Auditing)
-- Status: Proposed for Review (DO NOT EXECUTE UNTIL EXPLICITLY APPROVED)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN
  CREATE TYPE public.staff_role_enum AS ENUM (
    'admin',
    'estimator',
    'billing_manager',
    'viewer'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.customer_type_enum AS ENUM (
    'government',
    'private_corporate',
    'contractor',
    'individual'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.service_category_enum AS ENUM (
    'construction_tenders',
    'construction_machinery',
    'manufacturing_machinery'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.quotation_request_status_enum AS ENUM (
    'new',
    'under_review',
    'quotation_drafted',
    'rejected',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. SEQUENCES
CREATE SEQUENCE IF NOT EXISTS public.quotation_request_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- ==============================================================================
-- 4. TABLE DEFINITIONS
-- ==============================================================================

-- Table 1: staff_profiles
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role public.staff_role_enum NOT NULL DEFAULT 'viewer'::public.staff_role_enum,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT staff_email_format_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_profiles_email ON public.staff_profiles(email);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_role_active ON public.staff_profiles(role, is_active);

-- Table 2: customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  primary_contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone VARCHAR(15) NOT NULL,
  gstin VARCHAR(15),
  billing_address TEXT,
  billing_state TEXT NOT NULL,
  client_type public.customer_type_enum NOT NULL DEFAULT 'private_corporate'::public.customer_type_enum,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT customer_phone_check CHECK (phone ~ '^[6-9]\d{9}$'),
  CONSTRAINT customer_gstin_check CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_gstin ON public.customers(gstin) WHERE gstin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_company_name ON public.customers(lower(company_name));

-- Table 3: quotation_requests
CREATE TABLE IF NOT EXISTS public.quotation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone VARCHAR(15) NOT NULL,
  gstin VARCHAR(15),
  service_category public.service_category_enum NOT NULL,
  requirement_details TEXT NOT NULL,
  quantity TEXT,
  technical_specs TEXT,
  delivery_location TEXT NOT NULL,
  notes TEXT,
  privacy_consent BOOLEAN NOT NULL DEFAULT false,
  status public.quotation_request_status_enum NOT NULL DEFAULT 'new'::public.quotation_request_status_enum,
  assigned_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  submission_ip_hash VARCHAR(64) NOT NULL,
  user_agent TEXT,
  idempotency_key UUID UNIQUE NOT NULL,
  request_payload_hash VARCHAR(64) NOT NULL,
  risk_flag VARCHAR(50) DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT quotation_privacy_check CHECK (privacy_consent = true),
  CONSTRAINT quotation_phone_check CHECK (phone ~ '^[6-9]\d{9}$'),
  CONSTRAINT quotation_gstin_check CHECK (gstin IS NULL OR gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotation_requests_ref ON public.quotation_requests(reference_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotation_requests_idempotency ON public.quotation_requests(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_status ON public.quotation_requests(status);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_category ON public.quotation_requests(service_category);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_created ON public.quotation_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_ip_hash ON public.quotation_requests(submission_ip_hash, created_at DESC);

-- Table 4: rate_limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key VARCHAR(128) PRIMARY KEY,
  tokens INT NOT NULL,
  last_refilled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON public.rate_limits(expires_at);

-- Table 5: audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  actor_type VARCHAR(20) NOT NULL,
  actor_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  actor_ip_hash VARCHAR(64),
  previous_state JSONB,
  new_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 5. TAMPER-RESISTANCE TRIGGER FOR AUDIT LOGS
-- ==============================================================================
-- Note on Immutability:
-- Triggers and grants provide robust operational tamper-resistance against normal roles,
-- application logic bugs, and compromised clients. They do NOT provide absolute protection
-- against database superusers (e.g. `postgres` role) who have root administrative privileges.
-- Superuser activities must be monitored via Cloud provider audit trails.

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries are tamper-resistant and cannot be updated, deleted, or truncated.';
END;
$$;

ALTER FUNCTION public.prevent_audit_log_mutation() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.prevent_audit_log_mutation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_audit_log_mutation() TO service_role;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE OR TRUNCATE ON public.audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- Revoke mutation grants on audit_logs table
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM PUBLIC, anon, authenticated, service_role;

-- ==============================================================================
-- 6. SECURITY DEFINER HELPER FUNCTIONS & HARDENING
-- ==============================================================================

-- Helper: Verify active staff status
CREATE OR REPLACE FUNCTION public.is_active_staff(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE id = user_id AND is_active = true
  );
$$;

ALTER FUNCTION public.is_active_staff(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_active_staff(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_staff(UUID) TO authenticated, service_role;

-- Helper: Verify staff role hierarchy
CREATE OR REPLACE FUNCTION public.has_staff_role(user_id UUID, required_roles public.staff_role_enum[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE id = user_id AND is_active = true AND role = ANY(required_roles)
  );
$$;

ALTER FUNCTION public.has_staff_role(UUID, public.staff_role_enum[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.has_staff_role(UUID, public.staff_role_enum[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_staff_role(UUID, public.staff_role_enum[]) TO authenticated, service_role;

-- Rate limiter: Atomic token bucket stored procedure
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max_tokens INT,
  p_refill_seconds INT,
  p_cost INT DEFAULT 1
)
RETURNS TABLE (allowed BOOLEAN, retry_after INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_record public.rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_tokens INT;
  v_elapsed INT;
BEGIN
  -- Row-level lock to prevent concurrency race conditions across serverless instances
  SELECT * INTO v_record FROM public.rate_limits WHERE key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (key, tokens, last_refilled_at, expires_at)
    VALUES (p_key, p_max_tokens - p_cost, v_now, v_now + (p_refill_seconds || ' seconds')::INTERVAL);
    RETURN QUERY SELECT true, 0;
    RETURN;
  END IF;

  -- Refill calculation based on elapsed time
  v_elapsed := EXTRACT(EPOCH FROM (v_now - v_record.last_refilled_at))::INT;
  v_tokens := LEAST(p_max_tokens, v_record.tokens + (v_elapsed * p_max_tokens / p_refill_seconds));

  IF v_tokens >= p_cost THEN
    UPDATE public.rate_limits
    SET tokens = v_tokens - p_cost,
        last_refilled_at = v_now,
        expires_at = v_now + (p_refill_seconds || ' seconds')::INTERVAL
    WHERE key = p_key;
    RETURN QUERY SELECT true, 0;
  ELSE
    RETURN QUERY SELECT false, (p_refill_seconds - v_elapsed);
  END IF;
END;
$$;

ALTER FUNCTION public.check_rate_limit(TEXT, INT, INT, INT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT, INT) TO service_role;

-- Rate limit maintenance: Prune expired rate limit counters
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.rate_limits
  WHERE expires_at < timezone('utc'::text, now());
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

ALTER FUNCTION public.cleanup_expired_rate_limits() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.cleanup_expired_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_limits() TO service_role;

-- Public Ingestion RPC: Restricted submission function with input restrictions & 409 conflict checks
CREATE OR REPLACE FUNCTION public.submit_quotation_request(
  p_idempotency_key UUID,
  p_request_payload_hash VARCHAR(64),
  p_business_name TEXT,
  p_contact_person TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_gstin TEXT,
  p_service_category public.service_category_enum,
  p_requirement_details TEXT,
  p_quantity TEXT,
  p_technical_specs TEXT,
  p_delivery_location TEXT,
  p_notes TEXT,
  p_privacy_consent BOOLEAN,
  p_submission_ip_hash VARCHAR(64),
  p_user_agent TEXT,
  p_risk_flag VARCHAR(50) DEFAULT 'none'
)
RETURNS TABLE (
  reference_number TEXT,
  created_at TIMESTAMPTZ,
  result_status TEXT
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
BEGIN
  -- 1. Input restriction & validation checks
  IF length(trim(p_business_name)) < 2 OR length(p_business_name) > 200 THEN
    RAISE EXCEPTION 'INVALID_INPUT: Business name must be between 2 and 200 characters.';
  END IF;
  IF length(trim(p_contact_person)) < 2 OR length(p_contact_person) > 100 THEN
    RAISE EXCEPTION 'INVALID_INPUT: Contact person must be between 2 and 100 characters.';
  END IF;
  IF p_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR length(p_email) > 254 THEN
    RAISE EXCEPTION 'INVALID_INPUT: Invalid email address format.';
  END IF;
  IF p_phone !~ '^[6-9]\d{9}$' THEN
    RAISE EXCEPTION 'INVALID_INPUT: Phone must be a valid 10-digit Indian mobile number.';
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
    -- Check if payload hash matches the original submission
    IF v_existing.request_payload_hash = p_request_payload_hash THEN
      -- Safe Replay: return existing reference number without duplicate insertion
      RETURN QUERY SELECT v_existing.reference_number, v_existing.created_at, 'replayed'::TEXT;
      RETURN;
    ELSE
      -- Conflict: Same idempotency key used with a differing payload
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

  -- 5. Insert Immutable Quotation Request Snapshot
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
    lower(trim(p_email)),
    trim(p_phone),
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
    'public_rpc',
    p_submission_ip_hash,
    jsonb_build_object(
      'reference_number', v_ref,
      'service_category', p_service_category,
      'risk_flag', p_risk_flag,
      'status', v_status
    ),
    v_created_at
  );

  RETURN QUERY SELECT v_ref, v_created_at, 'created'::TEXT;
END;
$$;

ALTER FUNCTION public.submit_quotation_request(
  UUID, VARCHAR(64), TEXT, TEXT, TEXT, TEXT, TEXT,
  public.service_category_enum, TEXT, TEXT, TEXT, TEXT, TEXT,
  BOOLEAN, VARCHAR(64), TEXT, VARCHAR(50)
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.submit_quotation_request(
  UUID, VARCHAR(64), TEXT, TEXT, TEXT, TEXT, TEXT,
  public.service_category_enum, TEXT, TEXT, TEXT, TEXT, TEXT,
  BOOLEAN, VARCHAR(64), TEXT, VARCHAR(50)
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_quotation_request(
  UUID, VARCHAR(64), TEXT, TEXT, TEXT, TEXT, TEXT,
  public.service_category_enum, TEXT, TEXT, TEXT, TEXT, TEXT,
  BOOLEAN, VARCHAR(64), TEXT, VARCHAR(50)
) TO anon, authenticated, service_role;

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- staff_profiles RLS
-- ------------------------------------------------------------------------------
-- 1. Read: Active staff can view directory; user can view own profile
CREATE POLICY "Active staff can read staff directory"
  ON public.staff_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_active_staff(auth.uid()));

-- 2. Update: ONLY active Admins can update staff profiles (anti-self-escalation)
CREATE POLICY "Only active admins can update staff profiles"
  ON public.staff_profiles FOR UPDATE TO authenticated
  USING (public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum]))
  WITH CHECK (public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum]));

-- 3. Delete: Denied across all roles
CREATE POLICY "Deny delete on staff profiles"
  ON public.staff_profiles FOR DELETE TO authenticated
  USING (false);

-- ------------------------------------------------------------------------------
-- customers RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Active staff can select customers"
  ON public.customers FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

CREATE POLICY "Estimators and Admins can insert/update customers"
  ON public.customers FOR ALL TO authenticated
  USING (public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'estimator'::public.staff_role_enum]))
  WITH CHECK (public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'estimator'::public.staff_role_enum]));

-- ------------------------------------------------------------------------------
-- quotation_requests RLS
-- ------------------------------------------------------------------------------
-- Anonymous direct table access is completely denied (ingestion happens strictly via submit_quotation_request RPC)
CREATE POLICY "Deny anonymous select on quotation_requests"
  ON public.quotation_requests FOR SELECT TO anon
  USING (false);

CREATE POLICY "Deny anonymous insert on quotation_requests"
  ON public.quotation_requests FOR INSERT TO anon
  WITH CHECK (false);

CREATE POLICY "Active staff can select quotation_requests"
  ON public.quotation_requests FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

CREATE POLICY "Estimators and Admins can update quotation_requests"
  ON public.quotation_requests FOR UPDATE TO authenticated
  USING (public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'estimator'::public.staff_role_enum]))
  WITH CHECK (public.has_staff_role(auth.uid(), ARRAY['admin'::public.staff_role_enum, 'estimator'::public.staff_role_enum]));

CREATE POLICY "Deny delete on quotation_requests"
  ON public.quotation_requests FOR DELETE TO authenticated
  USING (false);

-- ------------------------------------------------------------------------------
-- rate_limits RLS
-- ------------------------------------------------------------------------------
-- Rate limits table is accessed strictly by service_role via check_rate_limit()
CREATE POLICY "Deny public access on rate_limits"
  ON public.rate_limits FOR ALL TO PUBLIC
  USING (false);

-- ------------------------------------------------------------------------------
-- audit_logs RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Active staff can select audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_active_staff(auth.uid()));

CREATE POLICY "Deny public select on audit_logs"
  ON public.audit_logs FOR SELECT TO anon
  USING (false);

CREATE POLICY "Deny mutation on audit_logs via RLS"
  ON public.audit_logs FOR UPDATE TO authenticated
  USING (false);

-- ==============================================================================
-- 8. TABLE PERMISSIONS & GRANTS
-- ==============================================================================

-- Revoke all table-level write/read access from public/anon
REVOKE ALL ON public.staff_profiles FROM PUBLIC, anon;
REVOKE ALL ON public.customers FROM PUBLIC, anon;
REVOKE ALL ON public.quotation_requests FROM PUBLIC, anon;
REVOKE ALL ON public.rate_limits FROM PUBLIC, anon;
REVOKE ALL ON public.audit_logs FROM PUBLIC, anon;

-- Grant controlled table access to authenticated staff (further filtered by RLS)
GRANT SELECT ON public.staff_profiles TO authenticated;
GRANT UPDATE ON public.staff_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT SELECT, UPDATE ON public.quotation_requests TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- Service role has operational access for backend tasks
GRANT ALL ON public.staff_profiles TO service_role;
GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.quotation_requests TO service_role;
GRANT ALL ON public.rate_limits TO service_role;
GRANT SELECT, INSERT ON public.audit_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.quotation_request_seq TO anon, authenticated, service_role;
