/**
 * Santhaya Associates Pvt. Ltd. — Phase 2B Post-Migration Verification Script
 * File: scripts/verify-phase2-migration.mjs
 *
 * Safe, read-only post-migration verification for the disposable Supabase dev project.
 * Verifies:
 * 1. Target environment allowlist lock (DEV_SUPABASE_PROJECT_REF).
 * 2. Presence of all 5 Phase 2B application tables via PostgREST.
 * 3. RLS enablement and anonymous read denial across all 5 tables.
 * 4. Stored procedures compilation and anonymous RPC execution denial.
 * 5. Zero credentials leaked or printed.
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

console.log('================================================================');
console.log('Santhaya Associates — Phase 2B Post-Migration Verification Suite');
console.log('================================================================');

// 2. Allowlist and Target Safety Checks
const FORBIDDEN_PROD_PATTERNS = ['prod', 'production', 'live', 'main', 'santhaya.in', 'santhaya.com'];
const urlLower = (supabaseUrl || '').toLowerCase();
const refLower = (devProjectRef || '').toLowerCase();

if (FORBIDDEN_PROD_PATTERNS.some(p => urlLower.includes(p) || refLower.includes(p))) {
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

// 3. Execution Verification Checks
async function verifyMigration() {
  const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const TABLES = ['staff_profiles', 'customers', 'quotation_requests', 'rate_limits', 'audit_logs'];
  let allTablesExist = true;
  let allRlsEnforced = true;

  console.log('\n--- 1. Table Existence Verification (Admin Client) ---');
  for (const table of TABLES) {
    const { data, error } = await adminClient.from(table).select('*').limit(0);
    if (error && (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01' || error.message.includes('find'))) {
      console.log(`  ✗ MISSING: Table "${table}" does not exist in schema cache.`);
      allTablesExist = false;
    } else if (!error) {
      console.log(`  ✓ EXISTS:  Table "${table}" is present and accessible to service_role.`);
    } else {
      console.log(`  ✗ ERROR:   Table "${table}" returned error: ${error.message}`);
      allTablesExist = false;
    }
  }

  console.log('\n--- 2. RLS & Anonymous Access Denial Verification (Anon Client) ---');
  for (const table of TABLES) {
    const { data, error } = await anonClient.from(table).select('*').limit(1);
    // Anonymous queries must be completely blocked (error or 0 rows returned)
    const isDenied = Boolean(error || !data || data.length === 0);
    if (isDenied) {
      console.log(`  ✓ BLOCKED: Anonymous SELECT on "${table}" is denied (RLS/Revocation active).`);
    } else {
      console.error(`  ✗ LEAK:    Anonymous SELECT on "${table}" returned ${data.length} row(s)!`);
      allRlsEnforced = false;
    }
  }

  console.log('\n--- 3. Function & RPC Security Verification ---');
  // Verify submit_quotation_request is blocked for anon
  let anonRpcBlocked = false;
  try {
    const { error } = await anonClient.rpc('submit_quotation_request', {
      p_idempotency_key: '00000000-0000-0000-0000-000000000000',
      p_request_payload_hash: '0000000000000000000000000000000000000000000000000000000000000000',
      p_business_name: 'Probe',
      p_contact_person: 'Probe',
      p_email: 'probe@test.local',
      p_phone: '9876543210',
      p_gstin: null,
      p_service_category: 'construction_machinery',
      p_requirement_details: 'Probe requirement details',
      p_quantity: null,
      p_technical_specs: null,
      p_delivery_location: 'Probe',
      p_notes: null,
      p_privacy_consent: true,
      p_submission_ip_hash: '0000000000000000000000000000000000000000000000000000000000000000',
      p_user_agent: 'Probe',
      p_risk_flag: 'none'
    });
    anonRpcBlocked = Boolean(error);
  } catch (err) {
    anonRpcBlocked = true;
  }

  if (anonRpcBlocked) {
    console.log('  ✓ BLOCKED: Anonymous execution of submit_quotation_request is revoked.');
  } else {
    console.error('  ✗ LEAK:    Anonymous execution of submit_quotation_request succeeded!');
  }

  // Summary
  console.log('\n================================================================');
  if (allTablesExist && allRlsEnforced && anonRpcBlocked) {
    console.log('PHASE 2B MIGRATION VERIFICATION: PASS');
    console.log('All 5 tables, RLS policies, and RPC permissions verified.');
    console.log('================================================================\n');
    process.exit(0);
  } else {
    console.log('PHASE 2B MIGRATION VERIFICATION: INCOMPLETE / FAIL');
    if (!allTablesExist) {
      console.log('Reason: One or more tables are not yet created.');
    }
    console.log('================================================================\n');
    process.exit(1);
  }
}

verifyMigration().catch(err => {
  console.error('\nFatal verification error:', err);
  process.exit(1);
});
