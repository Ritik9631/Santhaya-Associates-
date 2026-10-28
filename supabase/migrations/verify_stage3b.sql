-- ==============================================================================
-- Santhaya Associates — Phase 3B Read-Only Post-Migration Verification Queries
-- File: supabase/migrations/verify_stage3b.sql
--
-- Safe to execute in Supabase SQL Editor. Performs 0 writes and 0 modifications.
-- ==============================================================================

-- 1. Verify products_services table columns and exact numeric precision
SELECT
  column_name,
  data_type,
  numeric_precision,
  numeric_scale,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products_services'
ORDER BY ordinal_position;

-- 2. Verify products_services constraints (Check constraints & Unique SKU)
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.products_services'::regclass;

-- 3. Verify RLS enablement on products_services
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname = 'products_services';

-- 4. Verify RLS policies on products_services
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'products_services'
ORDER BY policyname;

-- 5. Verify customer table enhanced columns and types
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customers'
  AND column_name IN ('pan', 'state', 'state_code', 'notes', 'created_by', 'email', 'phone')
ORDER BY column_name;

-- 6. Verify customer constraints (including PAN check and absence of contact requirement)
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.customers'::regclass;

-- 7. Verify RLS policies on customers
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'customers'
ORDER BY policyname;

