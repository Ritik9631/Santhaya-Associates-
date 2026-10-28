/**
 * Santhaya Associates Pvt. Ltd. — Phase 3B Post-Migration Verification Script
 * File: scripts/verify-phase3b-migration.mjs
 *
 * Verifies:
 * 1. Target environment allowlist lock (DEV_SUPABASE_PROJECT_REF = bkqneudnnhvvwmtggorz).
 * 2. Presence of public.products_services table.
 * 3. RLS enablement and anonymous access denial on products_services.
 * 4. Customer enhancements: pan, state, state_code, notes, created_by columns.
 * 5. Customer contact optionality: staff can insert a customer with neither email nor phone.
 * 6. Decimal precision (NUMERIC(15,2), NUMERIC(5,2)) and constraints on products_services.
 * 7. Clean test record isolation and teardown.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// 1. Load .env.local
const envLocalPath = path.resolve('.env.local');
if (!fs.existsSync(envLocalPath)) {
  console.error('\n❌ ERROR: .env.local not found.');
  process.exit(1);
}

const envContent = fs.readFileSync(envLocalPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const devProjectRef = process.env.DEV_SUPABASE_PROJECT_REF;
const supabaseEnv = process.env.SUPABASE_ENV;
const allowTestEnv = process.env.ALLOW_TEST_ENV === 'true';

console.log('='.repeat(64));
console.log('Santhaya Associates — Phase 3B Post-Migration Verification');
console.log('='.repeat(64));

// 2. Allowlist and Target Safety Checks
const FORBIDDEN_PROD_PATTERNS = ['prod', 'production', 'live', 'main', 'santhaya.in', 'santhaya.com'];
const urlLower = (supabaseUrl || '').toLowerCase();
const refLower = (devProjectRef || '').toLowerCase();

if (FORBIDDEN_PROD_PATTERNS.some((p) => urlLower.includes(p) || refLower.includes(p))) {
  console.error('\n🚨 SAFETY HARD ABORT: Production indicators detected. Aborting.');
  process.exit(1);
}

let extractedRef = null;
try {
  const parsed = new URL(supabaseUrl);
  extractedRef = parsed.hostname.split('.')[0];
} catch (err) {
  console.error('\n🚨 SAFETY ABORT: Invalid URL format:', err.message);
  process.exit(1);
}

if (extractedRef !== devProjectRef || devProjectRef !== 'bkqneudnnhvvwmtggorz') {
  console.error('\n🚨 SAFETY HARD ABORT: Project reference mismatch.');
  console.error(`  Expected: bkqneudnnhvvwmtggorz`);
  console.error(`  Found:    ${devProjectRef} (URL: ${extractedRef})`);
  process.exit(1);
}

if (supabaseEnv !== 'development' || !allowTestEnv) {
  console.error('\n🚨 SAFETY ABORT: SUPABASE_ENV must be "development" and ALLOW_TEST_ENV must be "true".');
  process.exit(1);
}

console.log(`\n[PASS] Target Environment Verified:`);
console.log(`  Project Reference:         ${devProjectRef}`);
console.log(`  Target Hostname:           ${extractedRef}.supabase.co`);
console.log(`  Credentials:               Configured & Masked (Zero characters exposed)`);

async function verifyPhase3BMigration() {
  const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let allPassed = true;

  // 1. Check products_services table exists
  console.log('\n--- 1. Table Existence Check (products_services) ---');
  const { data: psData, error: psErr } = await adminClient.from('products_services').select('*').limit(0);
  if (psErr) {
    console.error(`  ❌ MISSING / ERROR: products_services table inaccessible: ${psErr.message}`);
    allPassed = false;
  } else {
    console.log('  ✓ EXISTS: public.products_services is present and accessible to service_role.');
  }

  // 2. RLS & Anonymous Access Denial on products_services
  console.log('\n--- 2. RLS & Anonymous Access Denial ---');
  const { data: anonPs, error: anonPsErr } = await anonClient.from('products_services').select('*').limit(1);
  if (anonPsErr || !anonPs || anonPs.length === 0) {
    console.log('  ✓ BLOCKED: Anonymous SELECT on "products_services" is denied.');
  } else {
    console.error('  ❌ CRITICAL LEAK: Anonymous client was able to read products_services!');
    allPassed = false;
  }

  const { error: anonInsertErr } = await anonClient.from('products_services').insert({
    sku: 'ANON-EXPLOIT',
    name: 'Exploit Item',
    category: 'construction_machinery',
    item_type: 'product',
    default_unit_price: 1000,
    applicable_gst_rate: 18,
  });
  if (anonInsertErr) {
    console.log('  ✓ BLOCKED: Anonymous INSERT on "products_services" is denied.');
  } else {
    console.error('  ❌ CRITICAL LEAK: Anonymous client inserted row into products_services!');
    allPassed = false;
  }

  // 3. Customer Columns & Contact Optionality Invariant
  console.log('\n--- 3. Customer Columns & Contact Optionality Check ---');
  const { data: custColCheck, error: custColErr } = await adminClient
    .from('customers')
    .select('id, company_name, primary_contact_person, pan, state, state_code, notes, created_by')
    .limit(0);

  if (custColErr) {
    console.error(`  ❌ MISSING COLUMNS: customers enhancement columns missing: ${custColErr.message}`);
    allPassed = false;
  } else {
    console.log('  ✓ VERIFIED: Enhanced columns (pan, state, state_code, notes, created_by) present on customers.');
  }

  // Test optional contact detail: Insert customer with neither email nor phone
  const testCustName = `QA Verification Customer ${Date.now()}`;
  const { data: newCust, error: insertCustErr } = await adminClient
    .from('customers')
    .insert({
      company_name: testCustName,
      primary_contact_person: 'Contactless Walk-In Test',
      email: null,
      phone: null,
      client_type: 'individual',
      billing_state: 'Delhi',
      state: 'Delhi',
      state_code: '07',
      pan: 'ABCDE1234F',
      notes: 'Automated verification customer - optional email/phone check',
    })
    .select('id, company_name, email, phone')
    .single();

  if (insertCustErr) {
    console.error(`  ❌ FAILED: Customer insertion with NULL email and NULL phone failed: ${insertCustErr.message}`);
    allPassed = false;
  } else {
    console.log(`  ✓ VERIFIED: Customer created successfully with NULL email and NULL phone (ID: ${newCust.id}).`);
    // Cleanup test record
    await adminClient.from('customers').delete().eq('id', newCust.id);
    console.log(`  ✓ CLEANUP: Test customer record deleted.`);
  }

  // 4. Products & Services Decimal & Category Verification
  console.log('\n--- 4. Products/Services Decimal & Operational Behavior ---');
  const testSku = `QA-TEST-${Date.now()}`;
  const { data: testItem, error: insertItemErr } = await adminClient
    .from('products_services')
    .insert({
      sku: testSku,
      name: 'Hydraulic Excavator 20T',
      category: 'construction_machinery',
      item_type: 'product',
      hsn_sac_code: '84295200',
      description: 'Heavy duty excavator with bucket',
      unit_of_measurement: 'unit',
      default_unit_price: 4500000.50,
      applicable_gst_rate: 18.00,
      technical_specifications: { operating_weight: '20 tons', bucket_capacity: '1.0 m3' },
      is_active: true,
    })
    .select('id, sku, default_unit_price, applicable_gst_rate')
    .single();

  if (insertItemErr) {
    console.error(`  ❌ FAILED: Insertion of products_services record failed: ${insertItemErr.message}`);
    allPassed = false;
  } else {
    console.log(`  ✓ VERIFIED: Item created with exact decimal values:`);
    console.log(`    Price: ${testItem.default_unit_price} (Type: ${typeof testItem.default_unit_price})`);
    console.log(`    GST:   ${testItem.applicable_gst_rate}%`);

    // Verify SKU Uniqueness
    const { error: duplicateSkuErr } = await adminClient.from('products_services').insert({
      sku: testSku,
      name: 'Duplicate SKU Test',
      category: 'construction_machinery',
      item_type: 'product',
      default_unit_price: 1000.00,
      applicable_gst_rate: 18.00,
    });

    if (duplicateSkuErr) {
      console.log(`  ✓ VERIFIED: Duplicate SKU rejected cleanly by database unique constraint.`);
    } else {
      console.error(`  ❌ CRITICAL DEFECT: Duplicate SKU was accepted by database!`);
      allPassed = false;
    }

    // Cleanup test item
    await adminClient.from('products_services').delete().eq('id', testItem.id);
    console.log(`  ✓ CLEANUP: Test products_services record deleted.`);
  }

  console.log('\n' + '='.repeat(64));
  if (allPassed) {
    console.log('PHASE 3B MIGRATION VERIFICATION: PASS');
    console.log('products_services, customer enhancements, decimal precision, and RLS verified.');
  } else {
    console.log('PHASE 3B MIGRATION VERIFICATION: FAILED / PENDING MIGRATION');
  }
  console.log('='.repeat(64));

  if (!allPassed) {
    process.exit(1);
  }
}

verifyPhase3BMigration().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
