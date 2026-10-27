/**
 * Santhaya Associates Pvt. Ltd. — Supabase Development Sandbox Connectivity Verifier
 * File: scripts/verify-supabase-connection.mjs
 *
 * Safe, strictly read-only connectivity check for the disposable Supabase dev project.
 *
 * SAFETY RULES:
 * 1. STRICTLY READ-ONLY: Executes zero writes, zero migrations, and creates zero tables.
 * 2. NO SECRET LEAKS: Never logs, displays, or exposes anon or service_role credentials.
 * 3. STRICT ALLOWLIST LOCK: Enforces that NEXT_PUBLIC_SUPABASE_URL exactly matches DEV_SUPABASE_PROJECT_REF.
 * 4. PRODUCTION GUARD: Hard aborts on any production indicators.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// -----------------------------------------------------------------------------
// 1. LOAD .env.local
// -----------------------------------------------------------------------------
const envLocalPath = path.resolve('.env.local');
if (!fs.existsSync(envLocalPath)) {
  console.error('\n❌ ERROR: .env.local not found.');
  console.error('Please create .env.local based on .env.example with your development project credentials.\n');
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
console.log('Santhaya Associates — Development Sandbox Connection Verifier');
console.log('================================================================');

// -----------------------------------------------------------------------------
// 2. CREDENTIAL & PLACEHOLDER VALIDATION
// -----------------------------------------------------------------------------
const missing = [];
if (!supabaseUrl || supabaseUrl.includes('REPLACE_WITH_')) missing.push('NEXT_PUBLIC_SUPABASE_URL');
if (!anonKey || anonKey.includes('REPLACE_WITH_')) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
if (!serviceRoleKey || serviceRoleKey.includes('REPLACE_WITH_')) missing.push('SUPABASE_SERVICE_ROLE_KEY');
if (!devProjectRef || devProjectRef.includes('REPLACE_WITH_')) missing.push('DEV_SUPABASE_PROJECT_REF');

if (missing.length > 0) {
  console.log('\n⏳ AWAITING LOCAL CREDENTIALS:');
  console.log('   The following variable(s) in .env.local currently have placeholder values:');
  for (const m of missing) {
    console.log(`   - ${m}`);
  }
  console.log('\n   Please supply your disposable development project credentials in .env.local.');
  console.log('   (Note: .env.local is strictly git-ignored and never committed).\n');
  process.exit(2);
}

// -----------------------------------------------------------------------------
// 3. PRODUCTION & ALLOWLIST SAFETY CHECKS
// -----------------------------------------------------------------------------
const FORBIDDEN_PROD_PATTERNS = ['prod', 'production', 'live', 'main', 'santhaya.in', 'santhaya.com'];
const urlLower = supabaseUrl.toLowerCase();
const refLower = devProjectRef.toLowerCase();

const isForbidden = 
  FORBIDDEN_PROD_PATTERNS.some(p => urlLower.includes(p)) ||
  FORBIDDEN_PROD_PATTERNS.some(p => refLower.includes(p));

if (isForbidden) {
  console.error('\n🚨 SAFETY HARD ABORT: Production indicators detected:');
  console.error(`URL: ${supabaseUrl}`);
  console.error(`Project Reference: ${devProjectRef}`);
  console.error('Testing against production environments is strictly prohibited.\n');
  process.exit(1);
}

// Extract project ref from URL
let extractedRef = null;
try {
  const parsed = new URL(supabaseUrl);
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    extractedRef = 'local';
  } else {
    extractedRef = parsed.hostname.split('.')[0];
  }
} catch (err) {
  console.error('\n🚨 SAFETY ABORT: Invalid NEXT_PUBLIC_SUPABASE_URL format:', err.message);
  process.exit(1);
}

if (extractedRef !== devProjectRef) {
  console.error('\n🚨 SAFETY HARD ABORT: Project reference mismatch:');
  console.error(`  URL Project Reference:         ${extractedRef}`);
  console.error(`  Allowlisted DEV Reference:     ${devProjectRef}`);
  console.error('  The URL hostname does not match DEV_SUPABASE_PROJECT_REF in .env.local.\n');
  process.exit(1);
}

if (supabaseEnv !== 'development' || !allowTestEnv) {
  console.error('\n🚨 SAFETY ABORT: SUPABASE_ENV must be "development" and ALLOW_TEST_ENV must be "true".\n');
  process.exit(1);
}

console.log('\n[PASS] Target Environment Allowlist Check:');
console.log(`  Project Reference:         ${devProjectRef}`);
console.log(`  Target Hostname:           ${extractedRef}.supabase.co`);
console.log(`  Environment Mode:          ${supabaseEnv} (ALLOW_TEST_ENV=true)`);
console.log(`  Credentials Status:        Masked (Anon: ${anonKey.slice(0, 8)}...len=${anonKey.length}, Service: ${serviceRoleKey.slice(0, 8)}...len=${serviceRoleKey.length})`);

// -----------------------------------------------------------------------------
// 4. READ-ONLY CONNECTIVITY CHECK (Zero Writes, Zero Migrations)
// -----------------------------------------------------------------------------
async function verifyConnectivity() {
  console.log('\n--- Running Safe Read-Only Handshake Tests ---');

  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false }
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  let anonConnected = false;
  let adminConnected = false;
  let migrationApplied = false;

  // 1. Anon Gateway Check (querying non-existent probe table to verify REST API auth)
  try {
    const { data, error } = await anonClient.from('_connection_probe').select('*').limit(0);
    // PostgREST error PGRST204 (relation does not exist) or 404 confirms valid gateway handshake
    if (error && (error.code === 'PGRST204' || error.code === '42P01' || error.message.includes('relation') || error.message.includes('find'))) {
      anonConnected = true;
      console.log('  ✓ PASS: Anon Client Handshake (PostgREST Gateway accepted anon key)');
    } else if (!error) {
      anonConnected = true;
      console.log('  ✓ PASS: Anon Client Handshake (PostgREST Gateway responded 200 OK)');
    } else {
      console.error('  ✗ FAIL: Anon Client Handshake failed:', error.message);
    }
  } catch (err) {
    console.error('  ✗ FAIL: Anon Client Connection Error:', err.message);
  }

  // 2. Service Role Gateway Check
  try {
    const { data, error } = await adminClient.from('_connection_probe').select('*').limit(0);
    if (error && (error.code === 'PGRST204' || error.code === '42P01' || error.message.includes('relation') || error.message.includes('find'))) {
      adminConnected = true;
      console.log('  ✓ PASS: Service-Role Handshake (PostgREST Gateway accepted service_role key)');
    } else if (!error) {
      adminConnected = true;
      console.log('  ✓ PASS: Service-Role Handshake (PostgREST Gateway responded 200 OK)');
    } else {
      console.error('  ✗ FAIL: Service-Role Handshake failed:', error.message);
    }
  } catch (err) {
    console.error('  ✗ FAIL: Service-Role Connection Error:', err.message);
  }

  // 3. Migration Status Check (Confirm Phase 2 schema is NOT yet applied)
  try {
    const { data, error } = await adminClient.from('quotation_requests').select('id').limit(1);
    if (error && (error.code === 'PGRST204' || error.code === '42P01' || error.message.includes('relation'))) {
      migrationApplied = false;
      console.log('  ✓ PASS: Migration Check (Confirmed: Phase 2 tables do not yet exist)');
    } else if (data) {
      migrationApplied = true;
      console.log('  ℹ️  INFO: Table "quotation_requests" already exists in target sandbox.');
    }
  } catch (err) {
    migrationApplied = false;
  }

  console.log('\n================================================================');
  if (anonConnected && adminConnected) {
    console.log('CONNECTION VERIFICATION RESULT: PASS');
    console.log(`Disposable Sandbox: https://${devProjectRef}.supabase.co is reachable and verified.`);
    console.log(`Phase 2 Migrations Applied: ${migrationApplied ? 'YES' : 'NO (Ready for migration)'}`);
    console.log('================================================================\n');
    process.exit(0);
  } else {
    console.log('CONNECTION VERIFICATION RESULT: FAIL');
    console.log('Could not establish connection to the Supabase development sandbox.');
    console.log('================================================================\n');
    process.exit(1);
  }
}

verifyConnectivity().catch(err => {
  console.error('\nFatal connectivity error:', err);
  process.exit(1);
});
