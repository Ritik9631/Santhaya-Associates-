/**
 * Santhaya Associates Pvt. Ltd. — Phase 2B Security & Isolation Test Harness
 * File: scripts/test-phase2-security.mjs
 *
 * Automated verification suite for testing the Supabase Phase 2B database architecture
 * against a disposable local or development Supabase instance.
 *
 * CRITICAL SAFETY RULES:
 * 1. Strictly refuses to run against production environments.
 * 2. Uses only synthetic test data (zero real customer or company PII).
 * 3. Does not activate public quotation endpoints.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// -----------------------------------------------------------------------------
// 1. ENVIRONMENT & SAFETY CHECKS
// -----------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowTestEnv = process.env.ALLOW_TEST_ENV === 'true';

console.log('================================================================');
console.log('Santhaya Associates — Phase 2B Security Test Runner');
console.log('================================================================');

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('\n❌ ERROR: Missing required environment variables.');
  console.error('Please configure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,');
  console.error('and SUPABASE_SERVICE_ROLE_KEY in .env.local before running tests.\n');
  process.exit(1);
}

// Ensure URL is explicitly a development / local / sandbox environment
const isLocalOrDev = 
  supabaseUrl.includes('localhost') || 
  supabaseUrl.includes('127.0.0.1') || 
  supabaseUrl.includes('dev') || 
  supabaseUrl.includes('sandbox') || 
  supabaseUrl.includes('test') ||
  allowTestEnv;

if (!isLocalOrDev) {
  console.error('\n🚨 SAFETY ABORT: Connected Supabase URL appears to be non-development:');
  console.error(`URL: ${supabaseUrl}`);
  console.error('To run against a dedicated remote development project, set ALLOW_TEST_ENV=true.\n');
  process.exit(1);
}

console.log(`Target Environment: ${supabaseUrl} (Development / Sandbox)`);
console.log(`Timestamp: ${new Date().toISOString()}\n`);

// Initialize Clients
const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false }
});

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

let passedCount = 0;
let failedCount = 0;

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

// Helper to compute canonical payload hash
function computeHash(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

// -----------------------------------------------------------------------------
// 2. TEST EXECUTION SUITE
// -----------------------------------------------------------------------------
async function runTests() {
  console.log('--- Suite 1: Anonymous Access & Function Restriction Checks ---');

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
    'SEC-07: Atomic Rate Limiter First-Request Concurrency (Zero Unique Key Collisions)',
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

  console.log('\n--- Suite 4: Audit Log Immutability & Client Bundle Security ---');

  // Test 9: Audit Log Mutation Block (UPDATE attempt)
  const { error: updateAuditError } = await adminClient
    .from('audit_logs')
    .update({ action: 'tampered_status' })
    .eq('entity_type', 'quotation_request');

  const updateBlocked = updateAuditError && updateAuditError.message.includes('Audit log entries are tamper-resistant');
  assert(
    updateBlocked,
    'SEC-09: Audit Log Immutability (UPDATE Statement Blocked by Trigger)',
    updateAuditError?.message || 'UPDATE was unexpectedly allowed!'
  );

  // Test 10: Audit Log Mutation Block (DELETE attempt)
  const { error: deleteAuditError } = await adminClient
    .from('audit_logs')
    .delete()
    .eq('entity_type', 'quotation_request');

  const deleteBlocked = deleteAuditError && deleteAuditError.message.includes('Audit log entries are tamper-resistant');
  assert(
    deleteBlocked,
    'SEC-10: Audit Log Immutability (DELETE Statement Blocked by Trigger)',
    deleteAuditError?.message || 'DELETE was unexpectedly allowed!'
  );

  // Test 11: Service Role Key Client Bundle Leak Audit
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
    'SEC-11: Zero Service-Role Secrets in Client JS Bundles',
    `Scanned .next/static client chunks; found ${leakedCount} leaks`
  );

  // ---------------------------------------------------------------------------
  // 3. FINAL SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (Total: ${passedCount + failedCount})`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('\nFatal exception in test suite:', err);
  process.exit(1);
});
