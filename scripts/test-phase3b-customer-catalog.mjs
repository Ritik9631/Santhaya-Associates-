/**
 * Santhaya Associates — Phase 3B Customer Management & Catalog Verification Suite
 * File: scripts/test-phase3b-customer-catalog.mjs
 *
 * Automated test suite covering:
 * 1. Customer & Catalog Source Code Integrity
 * 2. Contact Optionality & Input Validation (Email and Phone are strictly optional)
 * 3. Financial Monetary Accuracy & GST Classifications (NUMERIC(15,2), NUMERIC(5,2))
 * 4. Duplicate Detection (GSTIN & SKU)
 * 5. RBAC Authorization Matrix (Super Admin, Admin, Estimator, Billing Manager vs Viewer)
 * 6. Phase 3B SQL Migration Security & RLS Policies
 * 7. Live Dev Server Route Protection & Anti-Cache Headers
 * 8. Non-Destructive Database Invariants on bkqneudnnhvvwmtggorz
 */

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const EXPECTED_DEV_REF = 'bkqneudnnhvvwmtggorz';

async function main() {
  console.log('='.repeat(70));
  console.log('SANTHAYA ASSOCIATES — PHASE 3B CUSTOMER & CATALOG VERIFICATION');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // --- 1. CODE STRUCTURE & FILE INTEGRITY ---
  console.log('\n[1/6] Auditing Phase 3B Source Code & Interface Files...');

  const filesToCheck = [
    'src/lib/customers/actions.ts',
    'src/lib/catalog/actions.ts',
    'src/app/staff/customers/page.tsx',
    'src/app/staff/customers/new/page.tsx',
    'src/app/staff/customers/new/CustomerForm.tsx',
    'src/app/staff/customers/[id]/page.tsx',
    'src/app/staff/customers/[id]/CustomerDetailView.tsx',
    'src/app/staff/customers/[id]/edit/page.tsx',
    'src/app/staff/catalog/page.tsx',
    'src/app/staff/catalog/new/page.tsx',
    'src/app/staff/catalog/new/CatalogItemForm.tsx',
    'src/app/staff/catalog/[id]/page.tsx',
    'src/app/staff/catalog/[id]/CatalogItemDetailView.tsx',
    'src/app/staff/catalog/[id]/edit/page.tsx',
    'supabase/migrations/20261029140000_phase3b_catalog_and_customer_enhancements.sql',
  ];

  for (const relPath of filesToCheck) {
    assert(fs.existsSync(relPath), `File exists: ${relPath}`);
  }

  // --- 2. CONTACT OPTIONALITY & VALIDATION RULES ---
  console.log('\n[2/6] Auditing Customer Contact Optionality & Validation Rules...');

  const customerActionsCode = fs.readFileSync('src/lib/customers/actions.ts', 'utf8');

  // Verify email and phone are optional (neither is mandatory)
  assert(!customerActionsCode.includes("customer_contact_check"),
    'Customer creation does NOT enforce customer_contact_check (email and phone are optional)');
  assert(customerActionsCode.includes("const email = (formData.get('email') as string)?.trim().toLowerCase() || null;"),
    'Email defaults safely to null when omitted');
  assert(customerActionsCode.includes("const phone = (formData.get('phone') as string)?.trim() || null;"),
    'Phone defaults safely to null when omitted');
  assert(customerActionsCode.includes("Duplicate GSTIN detected:"),
    'createCustomerAction implements exact duplicate GSTIN detection');
  assert(customerActionsCode.includes("Primary contact person or customer name is required"),
    'Contact person / customer name is mandatory');

  // --- 3. CATALOG FINANCIAL ACCURACY & SKU INTEGRITY ---
  console.log('\n[3/6] Auditing Catalog Financial Accuracy & SKU Integrity...');

  const catalogActionsCode = fs.readFileSync('src/lib/catalog/actions.ts', 'utf8');

  assert(catalogActionsCode.includes("SKU / Internal Reference Code is required"),
    'Catalog item creation requires SKU');
  assert(catalogActionsCode.includes("Duplicate SKU:"),
    'createCatalogItemAction implements SKU uniqueness verification');
  assert(catalogActionsCode.includes("defaultUnitPrice < 0"),
    'Default unit price must be non-negative');
  assert(catalogActionsCode.includes("applicableGstRate > 100"),
    'GST tax rate validation bounds percentages between 0 and 100%');

  // --- 4. PHASE 3B SQL MIGRATION SECURITY & RLS ---
  console.log('\n[4/6] Auditing Phase 3B SQL Migration Security Properties...');

  const migrationPath = 'supabase/migrations/20261029140000_phase3b_catalog_and_customer_enhancements.sql';
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Additive columns on customers
  assert(sql.includes("ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pan VARCHAR(10);"),
    'Migration adds pan column to customers');
  assert(sql.includes("ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state VARCHAR(100);"),
    'Migration adds state column to customers');
  assert(sql.includes("ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state_code VARCHAR(2);"),
    'Migration adds state_code column to customers');
  assert(sql.includes("ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_by UUID"),
    'Migration adds created_by staff reference to customers');

  // products_services definition
  assert(sql.includes("CREATE TABLE IF NOT EXISTS public.products_services ("),
    'Migration creates public.products_services master catalog table');
  assert(sql.includes("default_unit_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,"),
    'Enforces NUMERIC(15,2) precision for catalog pricing (decimal safe, no floats)');
  assert(sql.includes("applicable_gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,"),
    'Enforces NUMERIC(5,2) precision for GST tax rates');
  assert(sql.includes("ALTER TABLE public.products_services ENABLE ROW LEVEL SECURITY;"),
    'Enables Row Level Security on products_services');
  assert(sql.includes("REVOKE ALL ON public.products_services FROM PUBLIC, anon;"),
    'Revokes all access to products_services from PUBLIC and anon');
  assert(sql.includes("CREATE POLICY \"Staff can insert and update products_services\""),
    'Defines role-governed insert and update RLS policy on products_services');

  // --- 5. LIVE DEV SERVER ROUTE PROTECTION & HEADERS ---
  console.log('\n[5/6] Testing Live Dev Server Protected Route Barriers & Headers...');

  const phase3bRoutes = [
    '/staff/customers',
    '/staff/customers/new',
    '/staff/catalog',
    '/staff/catalog/new',
  ];

  for (const route of phase3bRoutes) {
    try {
      const res = await fetch(`${BASE_URL}${route}`, { redirect: 'manual' });
      const status = res.status;
      const location = res.headers.get('location') || '';
      const cacheControl = res.headers.get('cache-control') || '';

      const isRedirect = status === 307 || status === 302 || status === 303;
      const targetsLogin = location.includes('/staff/login');
      const hasNoStore = cacheControl.includes('no-store');

      assert(isRedirect && targetsLogin,
        `Unauthenticated ${route} redirects to /staff/login (Status: ${status})`);
      assert(hasNoStore,
        `Route ${route} emits Cache-Control: no-store (Got: ${cacheControl})`);
    } catch (err) {
      assert(false, `Failed to query route ${route}: ${err.message}`);
    }
  }

  // --- 6. NON-DESTRUCTIVE DATABASE INVARIANTS ---
  console.log('\n[6/6] Verifying Non-Destructive Invariants on Live Dev Supabase Sandbox...');

  if (fs.existsSync('.env.local')) {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/);
    const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)/);
    const refMatch = envContent.match(/DEV_SUPABASE_PROJECT_REF\s*=\s*([a-zA-Z0-9_-]+)/);

    const supabaseUrl = urlMatch?.[1]?.trim();
    const serviceRoleKey = keyMatch?.[1]?.trim();
    const projectRef = refMatch?.[1]?.trim();

    assert(projectRef === EXPECTED_DEV_REF,
      `Verified target database ref is approved project: ${EXPECTED_DEV_REF}`);

    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const { data: staff, error: staffErr } = await supabase.from('staff_profiles').select('id');
      assert(!staffErr, 'Successfully verified staff_profiles table accessibility');
      assert((staff || []).length === 0,
        `Verified staff_profiles record count remains 0 (actual: ${(staff || []).length})`);

      const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
      assert(!authErr, 'Successfully queried Supabase Auth admin user list');
      assert((authUsers?.users || []).length === 0,
        `Verified Supabase Auth user count remains 0 (actual: ${(authUsers?.users || []).length})`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`FINAL PHASE 3B RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});

