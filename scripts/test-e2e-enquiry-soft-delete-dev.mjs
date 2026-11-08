/**
 * Santhaya Associates — E2E Database Test for Enquiry Soft-Delete & Restore
 * File: scripts/test-e2e-enquiry-soft-delete-dev.mjs
 *
 * Runs strictly against the DEVELOPMENT database bkqneudnnhvvwmtggorz.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const EXPECTED_DEV_REF = 'bkqneudnnhvvwmtggorz';

const envContent = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const serviceRoleKey = keyMatch ? keyMatch[1].trim() : '';

assert.ok(supabaseUrl.includes(EXPECTED_DEV_REF), `Must target development project ${EXPECTED_DEV_REF}`);

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log('='.repeat(70));
console.log('SANTHAYA ASSOCIATES — DEV DATABASE E2E ENQUIRY SOFT-DELETE TEST');
console.log('='.repeat(70));
console.log(`Target: ${supabaseUrl}`);

async function run() {
  const testRef = `ENQ-TEST-${Date.now().toString().slice(-6)}`;
  const testIdempotencyKey = crypto.randomUUID();

  console.log(`\n1. Creating test enquiry: ${testRef}...`);
  const { data: created, error: createErr } = await client
    .from('quotation_requests')
    .insert({
      reference_number: testRef,
      business_name: 'Test Infrastructure Corp',
      contact_person: 'Ajay Verma',
      email: 'ajay@testinfra.local',
      phone: '9876543210',
      service_category: 'construction_machinery',
      requirement_details: 'Test requirement for soft-delete verification',
      delivery_location: 'Patna Site',
      privacy_consent: true,
      submission_ip_hash: 'test_ip_hash_001',
      idempotency_key: testIdempotencyKey,
      request_payload_hash: 'test_payload_hash_001',
      status: 'new',
    })
    .select('id, reference_number, deleted_at, status')
    .single();

  if (createErr || !created) {
    console.error('❌ Failed to insert test enquiry:', createErr);
    process.exit(1);
  }

  assert.strictEqual(created.deleted_at, null, 'Newly created enquiry must have deleted_at = NULL');
  console.log(`  ✓ Enquiry created with ID ${created.id}, deleted_at is NULL`);

  // Verify it appears in active queries
  const { data: activeList } = await client
    .from('quotation_requests')
    .select('id')
    .is('deleted_at', null)
    .eq('id', created.id);
  assert.strictEqual(activeList?.length, 1, 'Must appear in active query');
  console.log('  ✓ Enquiry appears in active queries (.is(deleted_at, null))');

  // Verify it does NOT appear in trash queries
  const { data: trashListBefore } = await client
    .from('quotation_requests')
    .select('id')
    .not('deleted_at', 'is', null)
    .eq('id', created.id);
  assert.strictEqual(trashListBefore?.length, 0, 'Must not appear in trash query');
  console.log('  ✓ Enquiry does not appear in trash queries');

  // Perform soft delete
  console.log('\n2. Performing soft-delete...');
  const deleteTimestamp = new Date().toISOString();
  const deleteReason = 'Automated end-to-end regression test soft deletion';

  const { error: deleteErr } = await client
    .from('quotation_requests')
    .update({
      deleted_at: deleteTimestamp,
      deletion_reason: deleteReason,
      updated_at: deleteTimestamp,
    })
    .eq('id', created.id);

  if (deleteErr) {
    console.error('❌ Failed to soft-delete:', deleteErr);
    process.exit(1);
  }
  console.log('  ✓ Soft-delete update executed successfully');

  // Record audit log
  await client.from('audit_logs').insert({
    entity_type: 'quotation_requests',
    entity_id: created.id,
    action: 'enquiry_soft_deleted',
    actor_type: 'system',
    actor_id: null,
    previous_state: { deleted_at: null, status: created.status },
    new_state: { deleted_at: deleteTimestamp, deletion_reason: deleteReason },
  });
  console.log('  ✓ Audit log created for enquiry_soft_deleted');

  // Verify active query now EXCLUDES it
  const { data: activeListAfter } = await client
    .from('quotation_requests')
    .select('id')
    .is('deleted_at', null)
    .eq('id', created.id);
  assert.strictEqual(activeListAfter?.length, 0, 'Must NOT appear in active query after soft-delete');
  console.log('  ✓ Enquiry successfully excluded from active queries');

  // Verify trash query now INCLUDES it
  const { data: trashListAfter } = await client
    .from('quotation_requests')
    .select('id, reference_number, deletion_reason')
    .not('deleted_at', 'is', null)
    .eq('id', created.id);
  assert.strictEqual(trashListAfter?.length, 1, 'Must appear in trash query after soft-delete');
  assert.strictEqual(trashListAfter[0].deletion_reason, deleteReason);
  console.log('  ✓ Enquiry appears in trash queries with preserved reason and reference');

  // Perform restore
  console.log('\n3. Performing restore...');
  const restoreTimestamp = new Date().toISOString();

  const { error: restoreErr } = await client
    .from('quotation_requests')
    .update({
      deleted_at: null,
      deletion_reason: null,
      updated_at: restoreTimestamp,
    })
    .eq('id', created.id);

  if (restoreErr) {
    console.error('❌ Failed to restore enquiry:', restoreErr);
    process.exit(1);
  }
  console.log('  ✓ Restore update executed successfully');

  // Record audit log
  await client.from('audit_logs').insert({
    entity_type: 'quotation_requests',
    entity_id: created.id,
    action: 'enquiry_restored',
    actor_type: 'system',
    actor_id: null,
    previous_state: { deleted_at: deleteTimestamp, deletion_reason: deleteReason },
    new_state: { deleted_at: null, restored_at: restoreTimestamp },
  });
  console.log('  ✓ Audit log created for enquiry_restored');

  // Verify it is back in active query
  const { data: activeListRestored } = await client
    .from('quotation_requests')
    .select('id')
    .is('deleted_at', null)
    .eq('id', created.id);
  assert.strictEqual(activeListRestored?.length, 1, 'Must appear in active query after restore');
  console.log('  ✓ Enquiry restored to active queries');

  // Clean up test row
  await client.from('quotation_requests').delete().eq('id', created.id);
  console.log('\n4. Test cleanup complete.');
  console.log('='.repeat(70));
  console.log('ALL E2E ENQUIRY SOFT-DELETE & RESTORE DATABASE TESTS PASSED!');
  console.log('='.repeat(70));
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

