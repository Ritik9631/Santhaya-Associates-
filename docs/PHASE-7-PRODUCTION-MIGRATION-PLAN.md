# SANTHAYA ASSOCIATES — PHASE 7: PRODUCTION MIGRATION EXECUTION PLAN

**Target Project:** `flxhwgevmqvuqdjaejwa` (Production Supabase, Singapore `ap-southeast-1`)  
**Source Repository:** `https://github.com/Ritik9631/Santhaya-Associates-.git`  
**Target Branch:** `master`  
**Execution Tool:** Supabase Web Dashboard SQL Editor  
**Status:** **AUDIT & PREPARATION ONLY — AWAITING EXPLICIT HUMAN APPROVAL PRIOR TO EXECUTION**  

---

## 1. Pre-Migration Prerequisites & Safety Protocols

Before executing any SQL statements on `flxhwgevmqvuqdjaejwa`, verify:

1. **Active Project Confirmation:** Ensure the active project selected in the Supabase Dashboard is **`flxhwgevmqvuqdjaejwa`** (Singapore `ap-southeast-1`), NOT `bkqneudnnhvvwmtggorz` (Development).
2. **Sequential Step-by-Step Execution:** Execute each step sequentially. Do not combine files.
3. **Stage 3A Separate Commit:** Step 3 (`20261029120000_stage3a_step_a_add_super_admin_enum.sql`) **MUST** be run and committed before Step 4 (`20261029120001_stage3a_step_b_rbac_enhancements.sql`).
4. **Monolithic Stage 3A Exclusion:** The file `20261029120000_stage3a_staff_auth_enhancements.sql` **MUST BE SKIPPED**.
5. **Clean Start Guarantee:** No test transactions, mock quotations, or sample customers should be seeded into production.

### 1.1 Pre-Migration Read-Only SQL State Verification

Execute these read-only SQL queries in the Supabase SQL Editor on **`flxhwgevmqvuqdjaejwa`** *before* running Step 1 to confirm the project is in a clean baseline state:

```sql
-- Query 1: Verify Zero Application Tables in public schema
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public';
-- Expected: 0 rows (or only default empty extensions if pre-installed)

-- Query 2: Verify Zero Custom Enum Types
SELECT typname 
FROM pg_type t 
JOIN pg_namespace n ON t.typnamespace = n.oid 
WHERE n.nspname = 'public' AND t.typtype = 'e';
-- Expected: 0 rows

-- Query 3: Verify Zero Custom Functions in public schema
SELECT proname 
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid 
WHERE n.nspname = 'public';
-- Expected: 0 rows

-- Query 4: Verify Auth Users Table
SELECT id, email, created_at FROM auth.users;
-- Expected: 0 rows (or only the authorized invited owner)
```

---

## 2. Step-by-Step SQL Migration Execution Plan

Execute the SQL migration files in the exact order below via the **Supabase SQL Editor**:

```
[Step 1] Core Schema & Security (Phase 2)
   │
[Step 2] Email Outbox Subsystem (Phase 2D)
   │
[Step 3] Add 'super_admin' to Enum (Stage 3A Step A) ───► MUST COMMIT FIRST
   │
[Step 4] RBAC & Administrative RPCs (Stage 3A Step B)
   │
[Step 5] Products/Services Catalog & Customers (Phase 3B)
   │
[Step 6] Quotation Management Subsystem (Phase 3C)
   │
[Step 7] GST Invoicing & Payments (Phase 3D)
   │
[Step 8] Communications & Invoice Delivery Logs (Phase 4)
   │
[Step 9] Customer Billing State Nullability Fix
   │
[Step 10] Quotation Soft Deletion & Audit Columns
   │
[Step 11] Indian Financial Year Quotation Numbering Subsystem
```

---

### Step 1: Core Foundation, Enums, Tables & Security
- **File:** `supabase/migrations/20261026120000_phase2_schema_and_security.sql`
- **Scope:** Creates `uuid-ossp` and `pgcrypto` extensions, 4 core enum types, 5 initial tables (`staff_profiles`, `customers`, `quotation_requests`, `rate_limits`, `audit_logs`), immutable audit trigger, RLS policies, and core helper functions.
- **Verification Query:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('staff_profiles', 'customers', 'quotation_requests', 'rate_limits', 'audit_logs');
-- Expected: 5 rows returned, rowsecurity = true for all.
```

---

### Step 2: Transactional Email Outbox Subsystem
- **File:** `supabase/migrations/20261028120000_phase2d_email_outbox.sql`
- **Scope:** Creates `email_status_enum`, `email_outbox` table, atomic enquiry submission RPC (`submit_quotation_request_atomic`), and concurrency-safe outbox claiming RPC (`claim_email_outbox_batch`).
- **Verification Query:**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'email_outbox' AND column_name IN ('status', 'retry_count', 'payload');
-- Expected: 3 rows confirming table and column creation.
```

---

### Step 3: Extend Staff Role Enum (Stage 3A Step A)
- **File:** `supabase/migrations/20261029120000_stage3a_step_a_add_super_admin_enum.sql`
- **Scope:** Adds `'super_admin'` to `public.staff_role_enum`.
- **CRITICAL EXECUTION NOTE:** Run this single statement alone and ensure it commits successfully before proceeding to Step 4.
- **Verification Query:**
```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'public.staff_role_enum'::regtype;
-- Expected: 'admin', 'estimator', 'billing_manager', 'viewer', 'super_admin'
```

---

### Step 4: Staff Authentication, RBAC & Administrative RPCs (Stage 3A Step B)
- **File:** `supabase/migrations/20261029120001_stage3a_step_b_rbac_enhancements.sql`
- **Scope:** Deploys hardened administrative RPCs (`is_super_admin`, `admin_update_staff_role`, `admin_update_staff_status`, `admin_create_staff_profile`), restricts direct `staff_profiles` updates to `full_name`, and secures execution permissions.
- **Verification Query:**
```sql
SELECT proname, prosecdef, rolname 
FROM pg_proc p 
JOIN pg_roles r ON p.proowner = r.oid 
WHERE proname IN ('is_super_admin', 'admin_update_staff_role', 'admin_update_staff_status', 'admin_create_staff_profile');
-- Expected: 5 rows (including is_super_admin overload), all prosecdef = true (SECURITY DEFINER).
```

---

### Step 5: Customer Statutory Enhancements & Master Catalog
- **File:** `supabase/migrations/20261029140000_phase3b_catalog_and_customer_enhancements.sql`
- **Scope:** Adds PAN regex verification and state tracking to `customers`, creates `products_services` master catalog table with strict numeric precision, and configures role-based catalog access.
- **Verification Query:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'products_services';
-- Expected: 1 row, rowsecurity = true.
```

---

### Step 6: Quotation Management Subsystem
- **File:** `supabase/migrations/20261029160000_phase3c_quotations.sql`
- **Scope:** Creates `quotation_status_enum`, `quotation_delivery_channel_enum`, and 5 quotation tables (`quotations`, `quotation_versions`, `quotation_items`, `quotation_acceptances`, `quotation_delivery_logs`) with granular RLS.
- **Verification Query:**
```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('quotations', 'quotation_versions', 'quotation_items', 'quotation_acceptances', 'quotation_delivery_logs');
-- Expected: 5 rows returned.
```

---

### Step 7: GST Invoicing, Sequence Counters & Payments
- **File:** `supabase/migrations/20261029180000_phase3d_billing_and_payments.sql`
- **Scope:** Creates `invoice_type_enum`, `invoice_status_enum`, `payment_method_enum`, `invoice_sequence_counters`, `invoices`, `invoice_items`, `invoice_payments`, gapless numbering RPC (`allocate_invoice_number`), and invoice settlement functions.
- **Verification Query:**
```sql
SELECT proname 
FROM pg_proc 
WHERE proname IN ('allocate_invoice_number', 'issue_invoice', 'record_invoice_payment');
-- Expected: 3 rows returned.
```

---

### Step 8: Client Communications & Invoice Delivery Audit
- **File:** `supabase/migrations/20261031120000_phase4_communications.sql`
- **Scope:** Creates `invoice_delivery_channel_enum` and `invoice_delivery_logs` audit table for tracking email, whatsapp, and download transmissions.
- **Verification Query:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'invoice_delivery_logs';
-- Expected: 1 row, rowsecurity = true.
```

---

### Step 9: Customer Billing State Nullability Fix
- **File:** `supabase/migrations/20261031230000_make_customer_billing_state_nullable.sql`
- **Scope:** Relaxes `billing_state` `NOT NULL` constraint in `public.customers` to support initial intake of leads before official place of supply is assigned.
- **Verification Query:**
```sql
SELECT is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customers' AND column_name = 'billing_state';
-- Expected: 'YES'
```

---

### Step 10: Quotation Soft Deletion & Audit Columns
- **File:** `supabase/migrations/20261102100000_add_quotation_soft_delete.sql`
- **Scope:** Adds `deleted_at`, `deleted_by_staff_id`, `deletion_reason` to `public.quotations` and creates performance index `idx_quotations_deleted_at`.
- **Verification Query:**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'quotations' 
  AND column_name IN ('deleted_at', 'deleted_by_staff_id', 'deletion_reason');
-- Expected: 3 rows returned.
```

---

### Step 11: Indian Financial Year Quotation Numbering Subsystem
- **File:** `supabase/migrations/20261102120000_financial_year_quotation_numbering.sql`
- **Scope:** Creates `public.quotation_fy_sequences` table and updates `generate_quotation_number()` to generate format `QT-YYYY-YY-NNN` (e.g. `QT-2026-27-001`) based on the statutory 1 April – 31 March fiscal cycle.
- **Verification Query:**
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quotation_fy_sequences';
-- Expected: 1 row returned.
```

---

## 3. Post-Migration Master Verification Suite

Run this complete read-only SQL validation script in the Supabase SQL Editor once all 11 steps are complete:

```sql
-- ==============================================================================
-- Santhaya Associates — Production Database Master Verification Suite
-- Target: flxhwgevmqvuqdjaejwa (Production)
-- Mode: 100% Read-Only (0 writes, 0 mutations)
-- ==============================================================================

-- 1. Table Count & RLS Verification (Must return 18 tables, all with rowsecurity = true)
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 2. Verify Zero Business Transactions (Clean Production Start)
SELECT 'staff_profiles' AS tbl, count(*) FROM public.staff_profiles
UNION ALL SELECT 'customers', count(*) FROM public.customers
UNION ALL SELECT 'quotation_requests', count(*) FROM public.quotation_requests
UNION ALL SELECT 'quotations', count(*) FROM public.quotations
UNION ALL SELECT 'quotation_versions', count(*) FROM public.quotation_versions
UNION ALL SELECT 'quotation_items', count(*) FROM public.quotation_items
UNION ALL SELECT 'invoices', count(*) FROM public.invoices
UNION ALL SELECT 'invoice_items', count(*) FROM public.invoice_items
UNION ALL SELECT 'invoice_payments', count(*) FROM public.invoice_payments
UNION ALL SELECT 'email_outbox', count(*) FROM public.email_outbox
UNION ALL SELECT 'audit_logs', count(*) FROM public.audit_logs;
-- Expected: All counts must be 0 prior to user onboarding.

-- 3. Verify RPC Function Security (All must be SECURITY DEFINER with search_path = public, pg_temp)
SELECT 
  proname, 
  prosecdef,
  proconfig
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'is_super_admin',
    'is_active_staff',
    'admin_update_staff_role',
    'admin_update_staff_status',
    'admin_create_staff_profile',
    'generate_quotation_number',
    'allocate_invoice_number',
    'issue_invoice',
    'record_invoice_payment',
    'claim_email_outbox_batch',
    'submit_quotation_request_atomic'
  )
ORDER BY proname;

-- 4. Test Indian FY Quotation Number Generator Function
-- (Safe test: call the function to verify formatting QT-YYYY-YY-NNN)
SELECT public.generate_quotation_number() AS sample_quotation_number;
-- Expected: 'QT-2026-27-001' (or current fiscal year equivalent)
```

---

## 4. Production Administrator Onboarding Procedure

To preserve security and prevent bypass of authentication checks, **do not create the initial production administrator through arbitrary SQL inserts**.

Follow this official onboarding workflow:

### Step 1: Create Authorized Auth User in Supabase Dashboard
1. In the Supabase Dashboard for `flxhwgevmqvuqdjaejwa`, navigate to **Authentication** -> **Users**.
2. Click **Invite User** or **Add User** -> **Create User**.
3. Enter the authorized Super Admin email:
   - Current Authorized Admin: `heistofeverything@gmail.com`
   *(Note: The email `santhayapvt.ltd@gmail.com` remains deferred until the business owner confirms mailbox access).*
4. Set a strong, temporary password or send an invitation email for verification.
5. Copy the generated **User UID** (UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

### Step 1.5: Pre-Elevation Auth User Identity Verification
Run this query in the SQL Editor to strictly verify the Auth user's identity and confirmed status before assigning permissions:

```sql
SELECT 
  id, 
  email, 
  email_confirmed_at, 
  last_sign_in_at, 
  created_at 
FROM auth.users 
WHERE email = 'heistofeverything@gmail.com';
-- Verification Checkpoints:
-- 1. id must match the UUID copied from Step 1.
-- 2. email must be exactly 'heistofeverything@gmail.com'.
-- 3. email_confirmed_at must be populated (if user has accepted invite).
```

### Step 2: Elevate to Super Admin Role via SQL Editor
Run the following SQL statement in the Supabase SQL Editor, replacing `<USER_UID>` with the verified UUID from Step 1.5:

```sql
INSERT INTO public.staff_profiles (
  id,
  email,
  full_name,
  role,
  is_active
) VALUES (
  '<USER_UID>'::UUID,
  'heistofeverything@gmail.com',
  'Santhaya Super Admin',
  'super_admin'::public.staff_role_enum,
  true
)
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin'::public.staff_role_enum,
  is_active = true,
  updated_at = timezone('Asia/Kolkata'::text, now());
```

### Step 3: Verify Super Admin Access
Run the verification query:
```sql
SELECT id, email, full_name, role, is_active 
FROM public.staff_profiles 
WHERE role = 'super_admin';
-- Expected: 1 row showing the active Super Admin.
```

The initial Super Admin can now securely log in at `/staff/login` and invite additional team members via the Staff Management UI (`/staff/team/invite`).

---

## 5. Future Company-Email Transition Runbook (`santhayapvt.ltd@gmail.com`)

When the business owner confirms full mailbox access to `santhayapvt.ltd@gmail.com`, execute this non-disruptive transition protocol:

### Phase A: Mailbox Access Verification Checkpoint
- [ ] Confirm owner can log in to `santhayapvt.ltd@gmail.com` and receive inbound verification emails.

### Phase B: Onboard New Super Admin Account
1. The active Super Admin (`heistofeverything@gmail.com`) logs into `/staff/login`.
2. Navigates to **Staff Management** -> **Invite Team Member** (`/staff/team/invite`).
3. Sends an invitation to `santhayapvt.ltd@gmail.com` with role: **Super Admin**.
4. The owner accepts the invitation email sent to `santhayapvt.ltd@gmail.com`, establishes a permanent secure password, and signs into `/staff/login`.
5. Run read-only verification query:
   ```sql
   SELECT id, email, full_name, role, is_active 
   FROM public.staff_profiles 
   WHERE email IN ('heistofeverything@gmail.com', 'santhayapvt.ltd@gmail.com');
   -- Expected: Both accounts active with role = 'super_admin'.
   ```

### Phase C: Transition Internal Notifications
1. In Hostinger hPanel -> Environment Variables, update:
   ```
   INTERNAL_NOTIFICATION_EMAIL=santhayapvt.ltd@gmail.com
   ```
2. Trigger application reload. All subsequent new enquiry alerts will route directly to `santhayapvt.ltd@gmail.com`.

### Phase D: Optional Break-Glass Account Retention
- `heistofeverything@gmail.com` may either be retained as a secondary emergency/disaster recovery Super Admin, or demoted/deactivated via the Staff Management UI once `santhayapvt.ltd@gmail.com` is established. Sole super admin guards prevent accidental lockout.


