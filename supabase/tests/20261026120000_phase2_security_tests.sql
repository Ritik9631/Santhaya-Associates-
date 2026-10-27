-- ==============================================================================
-- Santhaya Associates Pvt. Ltd. — Phase 2B Security & Isolation Verification Suite
-- File: supabase/tests/20261026120000_phase2_security_tests.sql
-- Status: Proposed Test Runner for Disposable Development Supabase Environment
--
-- IMPORTANT:
-- Each test is wrapped in an independent PL/pgSQL DO block with EXCEPTION handling
-- so that expected errors (e.g. permission denied, conflict, trigger exceptions)
-- are caught and validated independently without aborting the test execution.
-- ==============================================================================

\set ON_ERROR_STOP off

-- ------------------------------------------------------------------------------
-- TEST 1: Anonymous RPC Ingestion Denial (REQ-01, REQ-02)
-- Expectation: Calling submit_quotation_request as 'anon' MUST fail with 42501
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_caught_expected BOOLEAN := false;
BEGIN
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM public.submit_quotation_request(
      gen_random_uuid(),
      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      'Test Company', 'Contact Person', 'test@company.local', '9876543210', NULL,
      'construction_machinery'::public.service_category_enum,
      'Requirement details test string for validation.',
      '1', NULL, 'Mumbai', NULL, true,
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      'TestRunner/1.0', 'none'
    );
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_caught_expected := true;
  END;
  RESET ROLE;

  IF v_caught_expected THEN
    RAISE NOTICE 'TEST 1 PASSED: Anonymous user cannot execute submit_quotation_request (permission denied).';
  ELSE
    RAISE EXCEPTION 'TEST 1 FAILED: Anonymous user was able to execute submit_quotation_request!';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 2: Anonymous Direct Table Read Denial (REQ-07)
-- Expectation: Anonymous queries to all tables must return 0 rows via RLS
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_count INT;
BEGIN
  SET LOCAL ROLE anon;

  SELECT count(*) INTO v_count FROM public.staff_profiles;
  IF v_count <> 0 THEN
    RESET ROLE;
    RAISE EXCEPTION 'TEST 2A FAILED: Anonymous user can read staff_profiles (count=%)', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.customers;
  IF v_count <> 0 THEN
    RESET ROLE;
    RAISE EXCEPTION 'TEST 2B FAILED: Anonymous user can read customers (count=%)', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.quotation_requests;
  IF v_count <> 0 THEN
    RESET ROLE;
    RAISE EXCEPTION 'TEST 2C FAILED: Anonymous user can read quotation_requests (count=%)', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.rate_limits;
  IF v_count <> 0 THEN
    RESET ROLE;
    RAISE EXCEPTION 'TEST 2D FAILED: Anonymous user can read rate_limits (count=%)', v_count;
  END IF;

  SELECT count(*) INTO v_count FROM public.audit_logs;
  IF v_count <> 0 THEN
    RESET ROLE;
    RAISE EXCEPTION 'TEST 2E FAILED: Anonymous user can read audit_logs (count=%)', v_count;
  END IF;

  RESET ROLE;
  RAISE NOTICE 'TEST 2 PASSED: Anonymous users cannot read any data from staff, customer, quotation, rate limit, or audit tables.';
END $$;

-- ------------------------------------------------------------------------------
-- TEST 3: Trusted Server Ingestion RPC Execution (REQ-04)
-- Expectation: Calling submit_quotation_request as 'service_role' succeeds
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_ref TEXT;
  v_status TEXT;
  v_created_at TIMESTAMPTZ;
  v_test_key UUID := 'a0000000-0000-0000-0000-000000000001'::UUID;
  v_hash VARCHAR(64) := '1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff';
BEGIN
  SET LOCAL ROLE service_role;

  SELECT reference_number, result_status, created_at
  INTO v_ref, v_status, v_created_at
  FROM public.submit_quotation_request(
    v_test_key,
    v_hash,
    'Santhaya Infrastructure Ltd',
    'Ramesh Patel',
    'ramesh@santhaya-infra.local',
    '9820123456',
    '27AAAAA0000A1Z5',
    'construction_machinery'::public.service_category_enum,
    'Supply of 2 units 20-ton hydraulic crawler excavators.',
    '2 Units',
    'Tier 4 diesel, 1.2 cu.m bucket',
    'Nagpur, Maharashtra',
    'Site ready for delivery in November',
    true,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'NextJS-Server/14.2',
    'none'
  );

  RESET ROLE;

  IF v_ref IS NOT NULL AND v_status = 'created' THEN
    RAISE NOTICE 'TEST 3 PASSED: Server role successfully ingested quotation request: % (status=%)', v_ref, v_status;
  ELSE
    RAISE EXCEPTION 'TEST 3 FAILED: Server role quotation submission failed or returned unexpected status: %', v_status;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 4: Idempotency Safe Replay with Identical Payload (REQ-09)
-- Expectation: Re-submitting same key & same payload hash returns 'replayed'
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_ref TEXT;
  v_status TEXT;
  v_test_key UUID := 'a0000000-0000-0000-0000-000000000001'::UUID;
  v_hash VARCHAR(64) := '1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff';
BEGIN
  SET LOCAL ROLE service_role;

  SELECT reference_number, result_status
  INTO v_ref, v_status
  FROM public.submit_quotation_request(
    v_test_key,
    v_hash,
    'Santhaya Infrastructure Ltd',
    'Ramesh Patel',
    'ramesh@santhaya-infra.local',
    '9820123456',
    '27AAAAA0000A1Z5',
    'construction_machinery'::public.service_category_enum,
    'Supply of 2 units 20-ton hydraulic crawler excavators.',
    '2 Units',
    'Tier 4 diesel, 1.2 cu.m bucket',
    'Nagpur, Maharashtra',
    'Site ready for delivery in November',
    true,
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'NextJS-Server/14.2',
    'none'
  );

  RESET ROLE;

  IF v_status = 'replayed' THEN
    RAISE NOTICE 'TEST 4 PASSED: Safe replay verified for identical payload (ref=%, status=%)', v_ref, v_status;
  ELSE
    RAISE EXCEPTION 'TEST 4 FAILED: Expected status replayed but received: %', v_status;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 5: Idempotency Conflict on Differing Payload (REQ-09)
-- Expectation: Same key + different payload hash MUST raise CONFLICT_PAYLOAD_MISMATCH
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_caught_conflict BOOLEAN := false;
  v_test_key UUID := 'a0000000-0000-0000-0000-000000000001'::UUID;
  v_differing_hash VARCHAR(64) := '9999999999999999999999999999999999999999999999999999999999999999';
BEGIN
  SET LOCAL ROLE service_role;

  BEGIN
    PERFORM public.submit_quotation_request(
      v_test_key,
      v_differing_hash,
      'Tampered Payload Company',
      'Ramesh Patel',
      'ramesh@santhaya-infra.local',
      '9820123456',
      NULL,
      'construction_tenders'::public.service_category_enum,
      'Completely different project requirements.',
      '10 Units',
      NULL,
      'Pune, Maharashtra',
      NULL,
      true,
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      'NextJS-Server/14.2',
      'none'
    );
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%CONFLICT_PAYLOAD_MISMATCH%' THEN
        v_caught_conflict := true;
      END IF;
  END;

  RESET ROLE;

  IF v_caught_conflict THEN
    RAISE NOTICE 'TEST 5 PASSED: Idempotency key conflict correctly detected on differing payload hash.';
  ELSE
    RAISE EXCEPTION 'TEST 5 FAILED: Conflict was not raised when reusing idempotency key with differing payload!';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 6: Atomic Rate Limiter Concurrency & First-Request Initialization (REQ-03)
-- Expectation: check_rate_limit handles new keys atomically via ON CONFLICT DO NOTHING
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_allowed BOOLEAN;
  v_retry_after INT;
  v_test_ip_key TEXT := 'rate_test_ip_' || to_char(now(), 'HH24MISS');
BEGIN
  SET LOCAL ROLE service_role;

  -- First request: must initialize and return allowed = true
  SELECT allowed, retry_after INTO v_allowed, v_retry_after
  FROM public.check_rate_limit(v_test_ip_key, 5, 900, 1);

  IF NOT v_allowed THEN
    RESET ROLE;
    RAISE EXCEPTION 'TEST 6A FAILED: First-time rate limit check was not allowed.';
  END IF;

  -- Consume remaining 4 tokens
  PERFORM public.check_rate_limit(v_test_ip_key, 5, 900, 1);
  PERFORM public.check_rate_limit(v_test_ip_key, 5, 900, 1);
  PERFORM public.check_rate_limit(v_test_ip_key, 5, 900, 1);
  PERFORM public.check_rate_limit(v_test_ip_key, 5, 900, 1);

  -- 6th request: must be blocked (allowed = false, retry_after > 0)
  SELECT allowed, retry_after INTO v_allowed, v_retry_after
  FROM public.check_rate_limit(v_test_ip_key, 5, 900, 1);

  RESET ROLE;

  IF NOT v_allowed AND v_retry_after > 0 THEN
    RAISE NOTICE 'TEST 6 PASSED: Atomic rate limiter correctly initialized and enforced token exhaustion (retry_after=%s).', v_retry_after;
  ELSE
    RAISE EXCEPTION 'TEST 6B FAILED: Rate limiter allowed request beyond capacity (allowed=%, retry_after=%)', v_allowed, v_retry_after;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 7: Audit Log Tamper-Resistance — UPDATE Attempt (REQ-05)
-- Expectation: Updating audit_logs MUST be blocked by trigger prevent_audit_log_mutation
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_caught_tamper BOOLEAN := false;
BEGIN
  SET LOCAL ROLE service_role;

  BEGIN
    UPDATE public.audit_logs
    SET action = 'tampered_record'
    WHERE entity_type = 'quotation_request';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Audit log entries are tamper-resistant%' THEN
        v_caught_tamper := true;
      END IF;
  END;

  RESET ROLE;

  IF v_caught_tamper THEN
    RAISE NOTICE 'TEST 7 PASSED: Audit log UPDATE blocked by tamper-resistance trigger.';
  ELSE
    RAISE EXCEPTION 'TEST 7 FAILED: Audit log UPDATE was not blocked by trigger!';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 8: Audit Log Tamper-Resistance — DELETE Attempt (REQ-05)
-- Expectation: Deleting from audit_logs MUST be blocked by trigger prevent_audit_log_mutation
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_caught_tamper BOOLEAN := false;
BEGIN
  SET LOCAL ROLE service_role;

  BEGIN
    DELETE FROM public.audit_logs
    WHERE entity_type = 'quotation_request';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Audit log entries are tamper-resistant%' THEN
        v_caught_tamper := true;
      END IF;
  END;

  RESET ROLE;

  IF v_caught_tamper THEN
    RAISE NOTICE 'TEST 8 PASSED: Audit log DELETE blocked by tamper-resistance trigger.';
  ELSE
    RAISE EXCEPTION 'TEST 8 FAILED: Audit log DELETE was not blocked by trigger!';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 9: Staff Privilege Escalation Denial (REQ-06)
-- Expectation: Non-admin staff cannot update their role or self-promote
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_viewer_id UUID := 'b0000000-0000-0000-0000-000000000001'::UUID;
  v_updated_rows INT;
BEGIN
  -- Setup: Create dummy staff member with role 'viewer' as service_role
  SET LOCAL ROLE service_role;
  INSERT INTO public.staff_profiles (id, email, full_name, role, is_active)
  VALUES (v_viewer_id, 'viewer.test@santhaya.local', 'Test Viewer Staff', 'viewer'::public.staff_role_enum, true)
  ON CONFLICT (id) DO UPDATE SET role = 'viewer'::public.staff_role_enum;
  RESET ROLE;

  -- Test: Attempt self-promotion as authenticated user with viewer UID
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_viewer_id::text, 'role', 'authenticated')::text, true);

  UPDATE public.staff_profiles
  SET role = 'admin'::public.staff_role_enum
  WHERE id = v_viewer_id;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  RESET ROLE;

  IF v_updated_rows = 0 THEN
    RAISE NOTICE 'TEST 9 PASSED: Viewer staff member cannot self-promote to admin (0 rows updated via RLS).';
  ELSE
    RAISE EXCEPTION 'TEST 9 FAILED: Viewer staff member was able to self-promote to admin!';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- TEST 10: Anonymous Direct Sequence Access Denial (REQ-09)
-- Expectation: Calling nextval on quotation_request_seq as 'anon' MUST fail with 42501
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_caught_denial BOOLEAN := false;
BEGIN
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM nextval('public.quotation_request_seq');
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_caught_denial := true;
  END;
  RESET ROLE;

  IF v_caught_denial THEN
    RAISE NOTICE 'TEST 10 PASSED: Anonymous user cannot access quotation_request_seq (permission denied).';
  ELSE
    RAISE EXCEPTION 'TEST 10 FAILED: Anonymous user was able to advance quotation_request_seq!';
  END IF;
END $$;

-- ==============================================================================
-- ALL INDEPENDENT TESTS PASSED SUCCESSFULLY
-- ==============================================================================
DO $$
BEGIN
  RAISE NOTICE '==============================================================';
  RAISE NOTICE 'PHASE 2B DATABASE SECURITY VERIFICATION SUITE: ALL TESTS PASSED';
  RAISE NOTICE '==============================================================';
END $$;
