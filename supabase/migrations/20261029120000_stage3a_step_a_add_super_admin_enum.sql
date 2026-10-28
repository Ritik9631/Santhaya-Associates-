-- ==============================================================================
-- Santhaya Associates — Stage 3A-3 Step A: Enum Extension
-- File: supabase/migrations/20261029120000_stage3a_step_a_add_super_admin_enum.sql
--
-- Target Database: Supabase Development Project (bkqneudnnhvvwmtggorz)
-- Scope: Add 'super_admin' to public.staff_role_enum.
--
-- EXECUTION INSTRUCTION:
-- In PostgreSQL, ALTER TYPE ... ADD VALUE cannot be executed in the same transaction
-- block that subsequently references the new value.
-- Run this statement first in the Supabase SQL Editor.
-- Once committed ("Success. No rows returned"), proceed to Step B.
-- ==============================================================================

ALTER TYPE public.staff_role_enum ADD VALUE IF NOT EXISTS 'super_admin';

