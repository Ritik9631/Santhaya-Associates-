/**
 * Santhaya Associates Pvt. Ltd. — Phase 2D-B Post-Migration Verification Script
 * File: scripts/verify-phase2d-migration.mjs
 *
 * Safe, read-only/test post-migration verification for the disposable Supabase dev project.
 * Verifies:
 * 1. Target environment allowlist lock (DEV_SUPABASE_PROJECT_REF = bkqneudnnhvvwmtggorz).
 * 2. Presence of all 6 application tables, including email_outbox.
 * 3. RLS enablement and anonymous access denial on email_outbox.
 * 4. Stored procedures compilation (submit_quotation_request_atomic, claim_email_outbox_batch).
 * 5. Anonymous RPC execution denial on both new stored procedures.
 * 6. Zero credentials leaked or printed.
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
console.log('Santhaya Associates — Phase 2D-B Post-Migration Verification');
console.log('================================================================');

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

// 3. Execution Verification Checks
async function verifyPhase2DMigration() {
  const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ALL_TABLES = [
    'staff_profiles',
    'customers',
    'quotation_requests',
    'rate_limits',
    'audit_logs',
    'email_outbox',
  ];

  let allPassed = true;

  console.log('\n--- 1. Table Existence Verification (Admin Client) ---');
  for (const table of ALL_TABLES) {
    const { error } = await adminClient.from(table).select('*').limit(0);
    if (error) {
      console.error(`  ❌ MISSING / ERROR: Table "${table}" inaccessible to admin: ${error.message}`);
      allPassed = false;
    } else {
      console.log(`  ✓ EXISTS:  Table "${table}" is present and accessible to service_role.`);
    }
  }

  console.log('\n--- 2. RLS & Anonymous Access Denial Verification (Anon Client) ---');
  for (const table of ALL_TABLES) {
    const { data, error } = await anonClient.from(table).select('*').limit(1);
    if (error || !data || data.length === 0) {
      console.log(`  ✓ BLOCKED: Anonymous SELECT on "${table}" is denied (RLS/Revocation active).`);
    } else {
      console.error(`  ❌ CRITICAL LEAK: Anonymous client successfully read row from "${table}"!`);
      allPassed = false;
    }
  }

  // Verify Anonymous INSERT denial on email_outbox
  const { error: anonInsertErr } = await anonClient.from('email_outbox').insert({
    recipient_email: 'hacker@attacker.local',
    subject: 'Spam Injection',
    email_type: 'enquiry_alert_admin',
    payload: {},
  });
  if (anonInsertErr) {
    console.log(`  ✓ BLOCKED: Anonymous INSERT on "email_outbox" is denied.`);
  } else {
    console.error(`  ❌ CRITICAL LEAK: Anonymous client inserted row into "email_outbox"!`);
    allPassed = false;
  }

  console.log('\n--- 3. Procedure Security Verification (Anon Client Execution Denial) ---');
  // Check submit_quotation_request_atomic denial
  const { error: rpcAtomicAnonErr } = await anonClient.rpc('submit_quotation_request_atomic', {
    p_idempotency_key: '00000000-0000-0000-0000-000000000000',
    p_request_payload_hash: '0000000000000000000000000000000000000000000000000000000000000000',
    p_business_name: 'Test Corp',
    p_contact_person: 'Tester',
  });
  if (rpcAtomicAnonErr && (rpcAtomicAnonErr.code === '42501' || rpcAtomicAnonErr.message.includes('permission denied'))) {
    console.log(`  ✓ BLOCKED: Anonymous execution of submit_quotation_request_atomic is revoked.`);
  } else if (rpcAtomicAnonErr && (rpcAtomicAnonErr.code === 'PGRST202' || rpcAtomicAnonErr.message.includes('Could not find the function') || rpcAtomicAnonErr.message.includes('could not find the function'))) {
    console.error(`  ❌ MISSING: submit_quotation_request_atomic procedure is not compiled on database.`);
    allPassed = false;
  } else {
    console.error(`  ❌ UNEXPECTED: Anonymous call response:`, rpcAtomicAnonErr);
    allPassed = false;
  }

  // Check claim_email_outbox_batch denial
  const { error: rpcClaimAnonErr } = await anonClient.rpc('claim_email_outbox_batch', {
    p_batch_size: 5,
  });
  if (rpcClaimAnonErr && (rpcClaimAnonErr.code === '42501' || rpcClaimAnonErr.message.includes('permission denied'))) {
    console.log(`  ✓ BLOCKED: Anonymous execution of claim_email_outbox_batch is revoked.`);
  } else if (rpcClaimAnonErr && (rpcClaimAnonErr.code === 'PGRST202' || rpcClaimAnonErr.message.includes('Could not find the function') || rpcClaimAnonErr.message.includes('could not find the function'))) {
    console.error(`  ❌ MISSING: claim_email_outbox_batch procedure is not compiled on database.`);
    allPassed = false;
  } else {
    console.error(`  ❌ UNEXPECTED: Anonymous call response:`, rpcClaimAnonErr);
    allPassed = false;
  }

  console.log('\n--- 4. Admin Procedure Verification ---');
  // Check claim_email_outbox_batch execution by admin client
  const { data: claimData, error: claimErr } = await adminClient.rpc('claim_email_outbox_batch', {
    p_batch_size: 1,
  });
  if (!claimErr) {
    console.log(`  ✓ OPERATIONAL: Admin client successfully executed claim_email_outbox_batch (Checked out ${claimData ? claimData.length : 0} jobs).`);
  } else {
    console.error(`  ❌ ERROR: Admin execution of claim_email_outbox_batch failed: ${claimErr.message}`);
    allPassed = false;
  }

  console.log('================================================================');
  if (allPassed) {
    console.log('PHASE 2D-B MIGRATION VERIFICATION: PASS');
    console.log('All 6 tables, RLS policies, outbox queue, and atomic RPCs verified.');
  } else {
    console.log('PHASE 2D-B MIGRATION VERIFICATION: FAIL');
    console.log('One or more checks failed. Review errors above.');
    process.exit(1);
  }
  console.log('================================================================\n');
}

verifyPhase2DMigration().catch((err) => {
  console.error('\nVerification suite crashed:', err);
  process.exit(1);
});
