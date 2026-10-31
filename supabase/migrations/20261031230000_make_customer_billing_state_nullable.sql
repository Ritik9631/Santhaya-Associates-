-- Migration: 20261031230000_make_customer_billing_state_nullable.sql
-- Description: Make billing_state nullable in public.customers to allow optional state in staff ERP
-- Batch: Acceptance Testing Fix BUG-010
-- Author: Santhaya Engineering Team
-- Date: 2026-10-31
-- Status: PENDING EXPLICIT HUMAN APPROVAL (DO NOT RUN WITHOUT APPROVAL)

-- 1. Alter public.customers column billing_state to drop NOT NULL constraint
ALTER TABLE public.customers
  ALTER COLUMN billing_state DROP NOT NULL;

-- 2. Audit Trail Comment
COMMENT ON COLUMN public.customers.billing_state IS 'Customer statutory billing state name (optional for initial intake; Place of Supply required prior to taxable quotation or invoice issuance)';

