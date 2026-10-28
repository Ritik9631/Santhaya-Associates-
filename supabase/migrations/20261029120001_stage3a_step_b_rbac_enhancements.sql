-- ==============================================================================
-- Santhaya Associates — Stage 3A-3 Step B: Staff Auth & RBAC Security Enhancements
-- File: supabase/migrations/20261029120001_stage3a_step_b_rbac_enhancements.sql
--
-- Target Database: Supabase Development Project (bkqneudnnhvvwmtggorz)
-- Scope:
-- 1. Revoke broad direct UPDATE permissions on staff_profiles from authenticated users.
-- 2. Enforce column-level permissions (staff can only edit their own full_name).
-- 3. Deploy controlled, audited administrative RPC functions:
--    - admin_update_staff_role(): Anti-self-escalation, role hierarchy, sole super admin guard, advisory lock.
--    - admin_update_staff_status(): Anti-self-deactivation, sole super admin guard, advisory lock.
--    - admin_create_staff_profile(): Staff profile creation with role hierarchy validation.
--    - is_super_admin(): Fast helpers (UUID overload and parameterless auth.uid() overload).
--    - is_active_staff(): Parameterless convenience overload for auth.uid().
-- 4. Hardened security definer configuration (search_path = public, pg_temp, OWNER TO postgres).
--
-- PREREQUISITE:
-- Stage 3A Step A (ALTER TYPE public.staff_role_enum ADD VALUE 'super_admin')
-- MUST be executed and committed BEFORE running this script.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN staff_profiles DIRECT UPDATE PERMISSIONS
-- ------------------------------------------------------------------------------
-- Drop the broad UPDATE policy that allowed any admin to mutate all columns
DROP POLICY IF EXISTS "Only active admins can update staff profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Active staff can update own profile name" ON public.staff_profiles;

-- Revoke all table-level UPDATE privileges from authenticated role
REVOKE UPDATE ON public.staff_profiles FROM authenticated;

-- Grant column-level UPDATE strictly on non-security fields (full_name, updated_at)
GRANT UPDATE (full_name, updated_at) ON public.staff_profiles TO authenticated;

-- Allow active staff to update ONLY their own display name
CREATE POLICY "Active staff can update own full_name"
  ON public.staff_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() AND public.is_active_staff(auth.uid()))
  WITH CHECK (id = auth.uid() AND public.is_active_staff(auth.uid()));

-- ------------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS: is_super_admin() and is_active_staff() overloads
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role public.staff_role_enum;
  v_active BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT role, is_active INTO v_role, v_active
  FROM public.staff_profiles
  WHERE id = p_user_id;

  RETURN (v_role = 'super_admin'::public.staff_role_enum AND v_active IS TRUE);
END;
$$;

ALTER FUNCTION public.is_super_admin(UUID) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_super_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated, service_role;

-- Parameterless convenience overload: evaluates auth.uid()
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_super_admin(auth.uid());
$$;

ALTER FUNCTION public.is_super_admin() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

-- Parameterless convenience overload for active staff check on auth.uid()
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_active_staff(auth.uid());
$$;

ALTER FUNCTION public.is_active_staff() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_active_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_staff() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. ADMINISTRATIVE RPC: admin_update_staff_role()
-- ------------------------------------------------------------------------------
-- Securely changes a staff member's role with:
-- 1. Anti-Self-Escalation: Caller cannot modify their own role.
-- 2. Role Hierarchy: Only super_admin can assign super_admin or modify a super_admin.
-- 3. Admin Boundaries: Ordinary admin can only assign/modify estimator, billing_manager, viewer.
-- 4. Sole Super Admin Protection: Cannot demote the last active super_admin.
-- 5. Concurrency Serialization: pg_advisory_xact_lock prevents race condition demotions.
-- 6. Immutable Audit Log: Records actor, target, previous role, and new role.
CREATE OR REPLACE FUNCTION public.admin_update_staff_role(
  p_target_user_id UUID,
  p_new_role public.staff_role_enum
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_role public.staff_role_enum;
  v_caller_active BOOLEAN;
  v_target_role public.staff_role_enum;
  v_target_active BOOLEAN;
  v_super_admin_count INT;
BEGIN
  -- 1. Input Validation
  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: Target user ID cannot be null.';
  END IF;
  IF p_new_role IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: New role cannot be null.';
  END IF;

  -- 2. Authentication & Caller Privilege Check
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required for staff administration.';
  END IF;

  SELECT role, is_active INTO v_caller_role, v_caller_active
  FROM public.staff_profiles
  WHERE id = v_caller_id;

  IF v_caller_role IS NULL OR v_caller_active IS NOT TRUE THEN
    RAISE EXCEPTION 'FORBIDDEN: Only active staff can perform administration.';
  END IF;

  IF v_caller_role NOT IN ('super_admin'::public.staff_role_enum, 'admin'::public.staff_role_enum) THEN
    RAISE EXCEPTION 'FORBIDDEN: Insufficient permissions to modify staff roles.';
  END IF;

  -- 3. Anti-Self-Escalation Check
  IF p_target_user_id = v_caller_id THEN
    RAISE EXCEPTION 'FORBIDDEN: Staff members cannot modify their own role.';
  END IF;

  -- 4. Target Staff Verification
  SELECT role, is_active INTO v_target_role, v_target_active
  FROM public.staff_profiles
  WHERE id = p_target_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Target staff profile does not exist.';
  END IF;

  -- 5. Super Admin Boundary Checks
  IF p_new_role = 'super_admin'::public.staff_role_enum AND v_caller_role != 'super_admin'::public.staff_role_enum THEN
    RAISE EXCEPTION 'FORBIDDEN: Only a Super Administrator can assign the super_admin role.';
  END IF;

  IF v_target_role = 'super_admin'::public.staff_role_enum AND v_caller_role != 'super_admin'::public.staff_role_enum THEN
    RAISE EXCEPTION 'FORBIDDEN: Only a Super Administrator can modify another Super Administrator.';
  END IF;

  -- 6. Ordinary Admin Boundaries
  IF v_caller_role = 'admin'::public.staff_role_enum THEN
    IF p_new_role IN ('admin'::public.staff_role_enum, 'super_admin'::public.staff_role_enum) THEN
      RAISE EXCEPTION 'FORBIDDEN: Ordinary Administrators cannot grant administrative roles.';
    END IF;
    IF v_target_role IN ('admin'::public.staff_role_enum, 'super_admin'::public.staff_role_enum) THEN
      RAISE EXCEPTION 'FORBIDDEN: Ordinary Administrators cannot modify administrator accounts.';
    END IF;
  END IF;

  -- 7. Sole Super Admin Protection (Prevent lock-out & concurrency race conditions)
  IF v_target_role = 'super_admin'::public.staff_role_enum AND p_new_role != 'super_admin'::public.staff_role_enum THEN
    -- Transaction-scoped advisory lock serializes concurrent transactions across the whole database
    PERFORM pg_advisory_xact_lock(847291048291);

    -- Acquire row locks on active super admins to serialize concurrent demotion attempts
    PERFORM 1
    FROM public.staff_profiles
    WHERE role = 'super_admin'::public.staff_role_enum AND is_active = true
    FOR UPDATE;

    SELECT count(*) INTO v_super_admin_count
    FROM public.staff_profiles
    WHERE role = 'super_admin'::public.staff_role_enum AND is_active = true;

    IF v_super_admin_count <= 1 THEN
      RAISE EXCEPTION 'CONFLICT: Cannot demote the sole active Super Administrator.';
    END IF;
  END IF;

  -- 8. Perform Role Update
  UPDATE public.staff_profiles
  SET
    role = p_new_role,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_target_user_id;

  -- 9. Insert Immutable Audit Log Record
  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    action,
    actor_type,
    actor_id,
    previous_state,
    new_state
  ) VALUES (
    'staff_profiles',
    p_target_user_id,
    'staff_role_updated',
    'staff',
    v_caller_id,
    jsonb_build_object('role', v_target_role::text),
    jsonb_build_object('role', p_new_role::text)
  );

  RETURN true;
END;
$$;

ALTER FUNCTION public.admin_update_staff_role(UUID, public.staff_role_enum) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_update_staff_role(UUID, public.staff_role_enum) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_staff_role(UUID, public.staff_role_enum) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. ADMINISTRATIVE RPC: admin_update_staff_status()
-- ------------------------------------------------------------------------------
-- Securely activates or deactivates a staff member with:
-- 1. Anti-Self-Deactivation: Caller cannot deactivate their own account.
-- 2. Role Hierarchy: Ordinary admin cannot deactivate an admin or super_admin.
-- 3. Sole Super Admin Protection: Cannot deactivate the last active super_admin.
-- 4. Concurrency Serialization: pg_advisory_xact_lock prevents race conditions.
-- 5. Immutable Audit Log: Records actor, target, previous status, and new status.
CREATE OR REPLACE FUNCTION public.admin_update_staff_status(
  p_target_user_id UUID,
  p_is_active BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_role public.staff_role_enum;
  v_caller_active BOOLEAN;
  v_target_role public.staff_role_enum;
  v_target_active BOOLEAN;
  v_super_admin_count INT;
BEGIN
  -- 1. Input Validation
  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: Target user ID cannot be null.';
  END IF;
  IF p_is_active IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: is_active status cannot be null.';
  END IF;

  -- 2. Authentication & Caller Privilege Check
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required for staff administration.';
  END IF;

  SELECT role, is_active INTO v_caller_role, v_caller_active
  FROM public.staff_profiles
  WHERE id = v_caller_id;

  IF v_caller_role IS NULL OR v_caller_active IS NOT TRUE THEN
    RAISE EXCEPTION 'FORBIDDEN: Only active staff can perform administration.';
  END IF;

  IF v_caller_role NOT IN ('super_admin'::public.staff_role_enum, 'admin'::public.staff_role_enum) THEN
    RAISE EXCEPTION 'FORBIDDEN: Insufficient permissions to modify staff status.';
  END IF;

  -- 3. Anti-Self-Deactivation Check
  IF p_target_user_id = v_caller_id AND p_is_active IS FALSE THEN
    RAISE EXCEPTION 'FORBIDDEN: Staff members cannot deactivate their own account.';
  END IF;

  -- 4. Target Staff Verification
  SELECT role, is_active INTO v_target_role, v_target_active
  FROM public.staff_profiles
  WHERE id = p_target_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Target staff profile does not exist.';
  END IF;

  -- 5. Role Hierarchy Checks
  IF v_caller_role = 'admin'::public.staff_role_enum THEN
    IF v_target_role IN ('admin'::public.staff_role_enum, 'super_admin'::public.staff_role_enum) THEN
      RAISE EXCEPTION 'FORBIDDEN: Ordinary Administrators cannot modify administrator account status.';
    END IF;
  END IF;

  IF v_target_role = 'super_admin'::public.staff_role_enum AND v_caller_role != 'super_admin'::public.staff_role_enum THEN
    RAISE EXCEPTION 'FORBIDDEN: Only a Super Administrator can modify another Super Administrator.';
  END IF;

  -- 6. Sole Super Admin Protection (Prevent lock-out & concurrency race conditions)
  IF v_target_role = 'super_admin'::public.staff_role_enum AND p_is_active IS FALSE THEN
    -- Transaction-scoped advisory lock serializes concurrent transactions across the whole database
    PERFORM pg_advisory_xact_lock(847291048291);

    -- Acquire row locks on active super admins to serialize concurrent deactivation attempts
    PERFORM 1
    FROM public.staff_profiles
    WHERE role = 'super_admin'::public.staff_role_enum AND is_active = true
    FOR UPDATE;

    SELECT count(*) INTO v_super_admin_count
    FROM public.staff_profiles
    WHERE role = 'super_admin'::public.staff_role_enum AND is_active = true;

    IF v_super_admin_count <= 1 THEN
      RAISE EXCEPTION 'CONFLICT: Cannot deactivate the sole active Super Administrator.';
    END IF;
  END IF;

  -- 7. Perform Status Update
  UPDATE public.staff_profiles
  SET
    is_active = p_is_active,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_target_user_id;

  -- 8. Insert Immutable Audit Log Record
  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    action,
    actor_type,
    actor_id,
    previous_state,
    new_state
  ) VALUES (
    'staff_profiles',
    p_target_user_id,
    'staff_status_updated',
    'staff',
    v_caller_id,
    jsonb_build_object('is_active', v_target_active),
    jsonb_build_object('is_active', p_is_active)
  );

  RETURN true;
END;
$$;

ALTER FUNCTION public.admin_update_staff_status(UUID, BOOLEAN) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_update_staff_status(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_staff_status(UUID, BOOLEAN) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. ADMINISTRATIVE RPC: admin_create_staff_profile()
-- ------------------------------------------------------------------------------
-- Links a newly provisioned auth.users ID to public.staff_profiles.
-- Validates:
-- 1. Caller is an active super_admin or admin.
-- 2. Ordinary admin can only provision estimator, billing_manager, or viewer.
-- 3. Super admin can provision any role up to super_admin.
-- 4. Records creation in audit_logs.
CREATE OR REPLACE FUNCTION public.admin_create_staff_profile(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role public.staff_role_enum
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_role public.staff_role_enum;
  v_caller_active BOOLEAN;
  v_new_id UUID;
BEGIN
  -- 1. Input Validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: User ID cannot be null.';
  END IF;
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: Email cannot be empty.';
  END IF;
  IF p_full_name IS NULL OR length(trim(p_full_name)) = 0 THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: Full name cannot be empty.';
  END IF;
  IF p_role IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: Role cannot be null.';
  END IF;

  -- 2. Caller Validation (Service role caller bypasses caller check for initial bootstrap)
  IF v_caller_id IS NOT NULL THEN
    SELECT role, is_active INTO v_caller_role, v_caller_active
    FROM public.staff_profiles
    WHERE id = v_caller_id;

    IF v_caller_role IS NULL OR v_caller_active IS NOT TRUE THEN
      RAISE EXCEPTION 'FORBIDDEN: Only active staff can provision staff profiles.';
    END IF;

    IF v_caller_role NOT IN ('super_admin'::public.staff_role_enum, 'admin'::public.staff_role_enum) THEN
      RAISE EXCEPTION 'FORBIDDEN: Insufficient permissions to provision staff profiles.';
    END IF;

    -- Ordinary admin boundary check
    IF v_caller_role = 'admin'::public.staff_role_enum AND p_role IN ('admin'::public.staff_role_enum, 'super_admin'::public.staff_role_enum) THEN
      RAISE EXCEPTION 'FORBIDDEN: Ordinary Administrators cannot provision Administrator or Super Administrator accounts.';
    END IF;
  END IF;

  -- 3. Insert Profile Record
  INSERT INTO public.staff_profiles (
    id,
    email,
    full_name,
    role,
    is_active
  ) VALUES (
    p_user_id,
    lower(trim(p_email)),
    trim(p_full_name),
    p_role,
    true
  )
  RETURNING id INTO v_new_id;

  -- 4. Insert Audit Log
  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    action,
    actor_type,
    actor_id,
    previous_state,
    new_state
  ) VALUES (
    'staff_profiles',
    v_new_id,
    'staff_created',
    CASE WHEN v_caller_id IS NOT NULL THEN 'staff' ELSE 'system' END,
    v_caller_id,
    NULL,
    jsonb_build_object(
      'email', lower(trim(p_email)),
      'full_name', trim(p_full_name),
      'role', p_role::text,
      'is_active', true
    )
  );

  RETURN v_new_id;
END;
$$;

ALTER FUNCTION public.admin_create_staff_profile(UUID, TEXT, TEXT, public.staff_role_enum) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_create_staff_profile(UUID, TEXT, TEXT, public.staff_role_enum) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_staff_profile(UUID, TEXT, TEXT, public.staff_role_enum) TO authenticated, service_role;

