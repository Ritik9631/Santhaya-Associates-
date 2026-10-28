-- ==============================================================================
-- Santhaya Associates — Stage 3A Read-Only Post-Migration Verification Queries
-- File: supabase/migrations/verify_stage3a.sql
--
-- Safe to execute in Supabase SQL Editor. Performs 0 writes and 0 modifications.
-- ==============================================================================

-- 1. Check enum values in public.staff_role_enum
SELECT
  t.typname AS enum_name,
  e.enumlabel AS enum_value,
  e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'staff_role_enum'
ORDER BY e.enumsortorder;

-- 2. Verify existence and security properties of Stage 3A RPC functions
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS argument_types,
  pg_get_function_result(p.oid) AS return_type,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'INVOKER' END AS security_type,
  r.rolname AS owner_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_roles r ON p.proowner = r.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_super_admin',
    'is_active_staff',
    'admin_update_staff_role',
    'admin_update_staff_status',
    'admin_create_staff_profile'
  )
ORDER BY p.proname;

-- 3. Verify function EXECUTE permissions (anon vs authenticated)
SELECT
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_super_admin',
    'is_active_staff',
    'admin_update_staff_role',
    'admin_update_staff_status',
    'admin_create_staff_profile'
  )
ORDER BY routine_name, grantee;

-- 4. Verify RLS policies on public.staff_profiles
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'staff_profiles'
ORDER BY policyname;

-- 5. Verify column-level privileges on public.staff_profiles
SELECT
  table_name,
  column_name,
  grantee,
  privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'staff_profiles'
ORDER BY column_name, grantee;

