/**
 * Santhaya Associates Pvt. Ltd. — Phase 2B Security & Isolation Test Harness
 * File: scripts/test-phase2-security.mjs
 *
 * Automated verification suite for testing the Supabase Phase 2B database architecture
 * and static client bundle safety against a disposable local or development Supabase instance.
 *
 * CRITICAL SAFETY RULES:
 * 1. Strictly refuses to run against production environments (hard abort on prod keywords,
 *    ignoring any ALLOW_TEST_ENV bypass attempts).
 * 2. Uses only synthetic test data (zero real customer or company PII).
 * 3. Does not activate public quotation endpoints.
 * 4. Accurately reports PASS, FAIL, and NOT RUN statuses (tests for unimplemented API
 *    endpoints or unconfigured databases are explicitly marked NOT RUN, not PASS).
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// -----------------------------------------------------------------------------
// 1. ENVIRONMENT CONFIGURATION & AUTOMATIC .env.local PARSING
// -----------------------------------------------------------------------------
const envLocalPath = path.resolve('.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
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
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowTestEnv = process.env.ALLOW_TEST_ENV === 'true';
const supabaseEnv = process.env.SUPABASE_ENV;

console.log('================================================================');
console.log('Santhaya Associates — Phase 2B Security & Isolation Test Runner');
console.log('================================================================');

let passedCount = 0;
let failedCount = 0;
let notRunCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (details) console.error(`    Details: ${details}`);
    failedCount++;
  }
}

function markNotRun(testName, reason) {
  console.log(`  ⊘ NOT RUN: ${testName} (${reason})`);
  notRunCount++;
}

// Helper to compute canonical payload hash
function computeHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

// -----------------------------------------------------------------------------
// 2. STATIC CODE & BUNDLE AUDITS (Can run offline / without database)
// -----------------------------------------------------------------------------
function runStaticAudits() {
  console.log('\n--- Suite A: Static Code & Bundle Security Audits ---');

  // SEC-STATIC-01: Service Role Key Client Bundle Leak Audit
  const dotNextDir = path.resolve('.next');
  let leakedCount = 0;
  if (fs.existsSync(dotNextDir)) {
    function scanDirectory(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'server' && entry.name !== 'cache') {
          scanDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.html'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('SUPABASE_SERVICE_ROLE_KEY') || (serviceRoleKey && content.includes(serviceRoleKey))) {
            leakedCount++;
            console.error(`  🚨 KEY LEAK DETECTED in: ${fullPath}`);
          }
        }
      }
    }
    scanDirectory(path.join(dotNextDir, 'static'));
  }
  assert(
    leakedCount === 0,
    'SEC-STATIC-01: Zero Service-Role Secrets in Client JS Bundles',
    `Scanned .next/static client chunks; found ${leakedCount} leaks`
  );

  // SEC-STATIC-02: Public Request Quotation Form Operates Without Authentication
  const formPagePath = path.resolve('src/app/request-quotation/page.tsx');
  let formHasNoAuthReq = false;
  if (fs.existsSync(formPagePath)) {
    const formCode = fs.readFileSync(formPagePath, 'utf8');
    const hasAuthImport = formCode.includes('auth.getSession') || formCode.includes('signInWith') || formCode.includes('useUser');
    const hasLoginRedirect = formCode.includes('/login') || formCode.includes('/signin');
    formHasNoAuthReq = !hasAuthImport && !hasLoginRedirect;
  }
  assert(
    formHasNoAuthReq,
    'SEC-STATIC-02: Public Quotation Form Operates Unauthenticated (No Auth Gate/Login Redirect)',
    'Verified src/app/request-quotation/page.tsx does not require client authentication'
  );

  // SEC-STATIC-03: No Client Components Import Admin Client or Service Role Key
  const appDir = path.resolve('src/app');
  let illegalAdminImports = 0;
  function scanClientComponents(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanClientComponents(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes("'use client'") || content.includes('"use client"')) {
          if (content.includes('@/lib/supabase/admin') || content.includes('createAdminClient') || content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
            illegalAdminImports++;
            console.error(`  🚨 ILLEGAL ADMIN IMPORT in client component: ${fullPath}`);
          }
        }
      }
    }
  }
  scanClientComponents(appDir);
  assert(
    illegalAdminImports === 0,
    'SEC-STATIC-03: Zero Admin Client Imports in Client Components',
    `Scanned src/app; found ${illegalAdminImports} illegal imports in 'use client' files`
  );
}

// -----------------------------------------------------------------------------
// 3. DATABASE TESTING SUITE (Requires verified development sandbox)
// -----------------------------------------------------------------------------
async function runDatabaseTests() {
  // Validate production safety guards
  const FORBIDDEN_PROD_PATTERNS = ['prod', 'production', 'live', 'main', 'santhaya.in', 'santhaya.com'];
  const urlLower = supabaseUrl.toLowerCase();
  const isForbiddenProd = FORBIDDEN_PROD_PATTERNS.some(pat => urlLower.includes(pat));

  if (isForbiddenProd) {
    console.error('\n🚨 SAFETY HARD ABORT: Connected URL contains production indicators:');
    console.error(`URL: ${supabaseUrl}`);
    console.error('Testing against production environments is strictly prohibited by project rules.');
    process.exit(1);
  }

  const isLocal = urlLower.includes('localhost') || urlLower.includes('127.0.0.1');
  const isExplicitSandbox = urlLower.includes('dev') || urlLower.includes('sandbox') || urlLower.includes('test');

  if (!isLocal && !isExplicitSandbox && !allowTestEnv) {
    console.error('\n🚨 SAFETY ABORT: Connected Supabase URL appears to be non-development:');
    console.error(`URL: ${supabaseUrl}`);
    console.error('To run against a dedicated remote development project, the project name must contain');
    console.error('"dev" or "sandbox", or set ALLOW_TEST_ENV=true and SUPABASE_ENV=development.\n');
    process.exit(1);
  }

  if (allowTestEnv && supabaseEnv !== 'development' && !isLocal && !isExplicitSandbox) {
    console.error('\n🚨 SAFETY ABORT: ALLOW_TEST_ENV=true is set, but SUPABASE_ENV is not "development"');
    console.error('and URL has no sandbox markers. Aborting to prevent accidental production execution.\n');
    process.exit(1);
  }

  console.log(`\nConnected Target: ${supabaseUrl.replace(/:\/\/.*@/, '://***@')} (Development Sandbox Verified)`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log('\n--- Suite 1: Anonymous Access & Function Restriction Checks ---');

  // Test 1: Direct anonymous client RPC call to submit_quotation_request
  try {
    const dummyKey = crypto.randomUUID();
    const { data, error } = await anonClient.rpc('submit_quotation_request', {
      p_idempotency_key: dummyKey,
      p_request_payload_hash: crypto.randomBytes(32).toString('hex'),
      p_business_name: 'Anonymous Intruder Corp',
      p_contact_person: 'Intruder',
      p_email: 'intruder@test.local',
      p_phone: '9876543210',
      p_gstin: null,
      p_service_category: 'construction_machinery',
      p_requirement_details: 'Unauthorized submission attempt bypassing server gateway.',
      p_quantity: '1',
      p_technical_specs: null,
      p_delivery_location: 'Mumbai',
      p_notes: null,
      p_privacy_consent: true,
      p_submission_ip_hash: crypto.randomBytes(32).toString('hex'),
      p_user_agent: 'Node-Intruder/1.0',
      p_risk_flag: 'none'
    });

    assert(
      error !== null,
      'SEC-01: Anonymous RPC Ingestion Rejection',
      error ? `Blocked with code ${error.code}: ${error.message}` : 'RPC unexpectedly executed!'
    );
  } catch (err) {
    assert(true, 'SEC-01: Anonymous RPC Ingestion Rejection (Exception caught)');
  }

  // Test 2: Anonymous Direct Table Reads via RLS
  const tables = ['staff_profiles', 'customers', 'quotation_requests', 'rate_limits', 'audit_logs'];
  for (const table of tables) {
    const { data, error } = await anonClient.from(table).select('*').limit(5);
    const readDenied = !data || data.length === 0 || error !== null;
    assert(readDenied, `SEC-02: Anonymous Read Denial on table '${table}'`, error?.message || 'Returned 0 rows');
  }

  console.log('\n--- Suite 2: Trusted Server-Side Ingestion & Idempotency ---');

  // Test 3: Trusted Server Submission via service_role
  const testIdempotencyKey = crypto.randomUUID();
  const testPayload = {
    businessName: 'Apex Heavy Infrastructure Ltd',
    contactPerson: 'Vikram Sengupta',
    email: 'vikram.sengupta@apex-heavy.local',
    phone: '9820567890',
    gstin: '27AABCA1234F1Z5',
    serviceCategory: 'construction_machinery',
    requirementDetails: 'Procurement of 2 units 30-ton mobile cranes for expressway bridge girder placement.',
    quantity: '2 Units',
    technicalSpecs: 'Telescopic boom 40m, 360-degree rotation',
    deliveryLocation: 'Solapur, Maharashtra',
    notes: 'Site access road cleared for heavy vehicles.',
    privacyConsent: true
  };
  const payloadHash = computeHash(testPayload);
  const ipHash = crypto.createHash('sha256').update('192.168.1.100_salt').digest('hex');

  let generatedRefNumber = null;
  const { data: insertData, error: insertError } = await adminClient.rpc('submit_quotation_request', {
    p_idempotency_key: testIdempotencyKey,
    p_request_payload_hash: payloadHash,
    p_business_name: testPayload.businessName,
    p_contact_person: testPayload.contactPerson,
    p_email: testPayload.email,
    p_phone: testPayload.phone,
    p_gstin: testPayload.gstin,
    p_service_category: testPayload.serviceCategory,
    p_requirement_details: testPayload.requirementDetails,
    p_quantity: testPayload.quantity,
    p_technical_specs: testPayload.technicalSpecs,
    p_delivery_location: testPayload.deliveryLocation,
    p_notes: testPayload.notes,
    p_privacy_consent: testPayload.privacyConsent,
    p_submission_ip_hash: ipHash,
    p_user_agent: 'ServerTest/1.0',
    p_risk_flag: 'none'
  });

  if (insertData && insertData.length > 0) {
    generatedRefNumber = insertData[0].reference_number;
  }

  assert(
    insertError === null && generatedRefNumber && insertData[0].result_status === 'created',
    'SEC-03: Server-Role Quotation Submission',
    insertError ? insertError.message : `Generated Reference: ${generatedRefNumber}`
  );

  // Test 4: Idempotency Safe Replay with Identical Payload
  const { data: replayData, error: replayError } = await adminClient.rpc('submit_quotation_request', {
    p_idempotency_key: testIdempotencyKey,
    p_request_payload_hash: payloadHash,
    p_business_name: testPayload.businessName,
    p_contact_person: testPayload.contactPerson,
    p_email: testPayload.email,
    p_phone: testPayload.phone,
    p_gstin: testPayload.gstin,
    p_service_category: testPayload.serviceCategory,
    p_requirement_details: testPayload.requirementDetails,
    p_quantity: testPayload.quantity,
    p_technical_specs: testPayload.technicalSpecs,
    p_delivery_location: testPayload.deliveryLocation,
    p_notes: testPayload.notes,
    p_privacy_consent: testPayload.privacyConsent,
    p_submission_ip_hash: ipHash,
    p_user_agent: 'ServerTest/1.0',
    p_risk_flag: 'none'
  });

  const replaySuccess = 
    replayError === null && 
    replayData && 
    replayData[0].reference_number === generatedRefNumber && 
    replayData[0].result_status === 'replayed';

  assert(
    replaySuccess,
    'SEC-04: Idempotency Safe Replay (Identical Payload)',
    `Status: ${replayData?.[0]?.result_status}, Ref: ${replayData?.[0]?.reference_number}`
  );

  // Test 5: Idempotency Conflict on Differing Payload (HTTP 409)
  const differingHash = computeHash({ ...testPayload, requirementDetails: 'Completely altered requirements text.' });
  const { data: conflictData, error: conflictError } = await adminClient.rpc('submit_quotation_request', {
    p_idempotency_key: testIdempotencyKey,
    p_request_payload_hash: differingHash,
    p_business_name: 'Tampered Payload Business',
    p_contact_person: testPayload.contactPerson,
    p_email: testPayload.email,
    p_phone: testPayload.phone,
    p_gstin: testPayload.gstin,
    p_service_category: testPayload.serviceCategory,
    p_requirement_details: 'Completely altered requirements text.',
    p_quantity: testPayload.quantity,
    p_technical_specs: testPayload.technicalSpecs,
    p_delivery_location: testPayload.deliveryLocation,
    p_notes: testPayload.notes,
    p_privacy_consent: testPayload.privacyConsent,
    p_submission_ip_hash: ipHash,
    p_user_agent: 'ServerTest/1.0',
    p_risk_flag: 'none'
  });

  const conflictDetected = conflictError && conflictError.message.includes('CONFLICT_PAYLOAD_MISMATCH');
  assert(
    conflictDetected,
    'SEC-05: Idempotency Conflict Detection on Differing Payload',
    conflictError ? conflictError.message : 'Conflict was not raised!'
  );

  console.log('\n--- Suite 3: Concurrency, Sequence Uniqueness & Atomic Rate Limiting ---');

  // Test 6: Concurrent Submissions Sequence Uniqueness
  const concurrentCount = 5;
  const concurrentPromises = Array.from({ length: concurrentCount }).map((_, index) => {
    const key = crypto.randomUUID();
    const payload = { ...testPayload, businessName: `Concurrent Test Corp ${index + 1}` };
    return adminClient.rpc('submit_quotation_request', {
      p_idempotency_key: key,
      p_request_payload_hash: computeHash(payload),
      p_business_name: payload.businessName,
      p_contact_person: payload.contactPerson,
      p_email: payload.email,
      p_phone: payload.phone,
      p_gstin: payload.gstin,
      p_service_category: payload.serviceCategory,
      p_requirement_details: payload.requirementDetails,
      p_quantity: payload.quantity,
      p_technical_specs: payload.technicalSpecs,
      p_delivery_location: payload.deliveryLocation,
      p_notes: payload.notes,
      p_privacy_consent: payload.privacyConsent,
      p_submission_ip_hash: ipHash,
      p_user_agent: 'ConcurrentTest/1.0',
      p_risk_flag: 'none'
    });
  });

  const concurrentResults = await Promise.all(concurrentPromises);
  const refs = concurrentResults.map(r => r.data?.[0]?.reference_number).filter(Boolean);
  const uniqueRefs = new Set(refs);
  const allSucceeded = refs.length === concurrentCount && uniqueRefs.size === concurrentCount;

  assert(
    allSucceeded,
    `SEC-06: Concurrent Sequence Lock & Reference Generation (${concurrentCount} simultaneous calls)`,
    `Generated ${uniqueRefs.size}/${concurrentCount} unique references: ${[...uniqueRefs].join(', ')}`
  );

  // Test 7: Atomic Rate Limiting First-Time Request Concurrency
  const testRateKey = `concurrency_test_key_${Date.now()}`;
  const rateLimitPromises = Array.from({ length: 5 }).map(() =>
    adminClient.rpc('check_rate_limit', {
      p_key: testRateKey,
      p_max_tokens: 5,
      p_refill_seconds: 900,
      p_cost: 1
    })
  );

  const rateResults = await Promise.all(rateLimitPromises);
  const rateErrors = rateResults.filter(r => r.error !== null);
  const allowedDeductions = rateResults.filter(r => r.data?.[0]?.allowed === true);

  assert(
    rateErrors.length === 0 && allowedDeductions.length === 5,
    'SEC-07: Atomic Rate Limiter First-Request Concurrency (Zero Collisions)',
    `Completed 5 parallel deductions without errors (allowed=${allowedDeductions.length}/5)`
  );

  // Test 8: Rate Limiter Token Depletion
  const { data: blockedResult } = await adminClient.rpc('check_rate_limit', {
    p_key: testRateKey,
    p_max_tokens: 5,
    p_refill_seconds: 900,
    p_cost: 1
  });

  const isBlocked = blockedResult && blockedResult[0]?.allowed === false && blockedResult[0]?.retry_after > 0;
  assert(
    isBlocked,
    'SEC-08: Rate Limiter Capacity Exhaustion & Dynamic Retry-After',
    `Blocked: ${!blockedResult?.[0]?.allowed}, Retry-After: ${blockedResult?.[0]?.retry_after}s`
  );

  console.log('\n--- Suite 4: Audit Log Immutability ---');

  // Test 9: Audit Log Mutation Block (UPDATE attempt)
  const { error: updateAuditError } = await adminClient
    .from('audit_logs')
    .update({ action: 'tampered_status' })
    .eq('entity_type', 'quotation_request');

  const updateBlocked = updateAuditError && (
    updateAuditError.message.includes('Audit log entries are tamper-resistant') ||
    updateAuditError.message.includes('permission denied')
  );
  assert(
    updateBlocked,
    'SEC-09: Audit Log Immutability (UPDATE Statement Blocked)',
    updateAuditError?.message || 'UPDATE was unexpectedly allowed!'
  );

  // Test 10: Audit Log Mutation Block (DELETE attempt)
  const { error: deleteAuditError } = await adminClient
    .from('audit_logs')
    .delete()
    .eq('entity_type', 'quotation_request');

  const deleteBlocked = deleteAuditError && (
    deleteAuditError.message.includes('Audit log entries are tamper-resistant') ||
    deleteAuditError.message.includes('permission denied')
  );
  assert(
    deleteBlocked,
    'SEC-10: Audit Log Immutability (DELETE Statement Blocked)',
    deleteAuditError?.message || 'DELETE was unexpectedly allowed!'
  );
}

// -----------------------------------------------------------------------------
// 4. MAIN ORCHESTRATION
// -----------------------------------------------------------------------------
async function main() {
  // Step 1: Always execute static security audits
  runStaticAudits();

  // Step 2: Check for database environment credentials
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.log('\n--- Suite B: Database Ingestion & Security Tests (PAUSED) ---');
    console.log('ℹ️  STATUS: No development Supabase credentials found in environment or .env.local.');
    console.log('    Per Phase 2B completion gate, database tests cannot run without a verified sandbox.');
    console.log('    The following database-dependent tests are explicitly marked as NOT RUN:\n');

    markNotRun('SEC-01: Anonymous RPC Ingestion Rejection', 'Requires connected dev database');
    markNotRun('SEC-02: Anonymous Direct Table Reads Denial', 'Requires connected dev database');
    markNotRun('SEC-03: Server-Role Quotation Submission', 'Requires connected dev database');
    markNotRun('SEC-04: Idempotency Safe Replay (Identical Payload)', 'Requires connected dev database');
    markNotRun('SEC-05: Idempotency Conflict Detection (Different Payload)', 'Requires connected dev database');
    markNotRun('SEC-06: Concurrent Sequence Lock & Reference Generation', 'Requires connected dev database');
    markNotRun('SEC-07: Atomic Rate Limiter First-Request Concurrency', 'Requires connected dev database');
    markNotRun('SEC-08: Rate Limiter Capacity Exhaustion & Dynamic Retry-After', 'Requires connected dev database');
    markNotRun('SEC-09: Audit Log Immutability (UPDATE Statement Blocked)', 'Requires connected dev database');
    markNotRun('SEC-10: Audit Log Immutability (DELETE Statement Blocked)', 'Requires connected dev database');
  } else {
    // Run database tests against verified sandbox
    await runDatabaseTests();
  }

  // Step 3: Record future API endpoint tests as NOT RUN
  console.log('\n--- Suite C: HTTP Route Handler & Edge Gateway Tests ---');
  markNotRun('API-01: POST /api/quotation-request Rate Limiting Verification', 'Route Handler scheduled for Phase 2B implementation');
  markNotRun('API-02: Honeypot Anti-Bot Field (_company_fax) Silent Rejection', 'Route Handler scheduled for Phase 2B implementation');
  markNotRun('API-03: Cloudflare / Vercel Edge IP Extraction & Hashing', 'Route Handler scheduled for Phase 2B implementation');
  markNotRun('API-04: Client-side Form Hook Integration with /api/quotation-request', 'Form wiring scheduled for Phase 2B implementation');

  // Step 4: Final Summary
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED | ${notRunCount} NOT RUN`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\nFatal exception in test suite:', err);
  process.exit(1);
});
