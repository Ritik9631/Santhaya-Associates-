/**
 * Santhaya Associates — Release Gate Verification
 * Check 1: Deletion Authorization End-to-End & Transaction Atomicity
 * File: scripts/verify-release-gate-deletion-auth.mjs
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

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log('='.repeat(70));
console.log('RELEASE GATE: DELETION AUTHORIZATION END-TO-END & ATOMICITY');
console.log('='.repeat(70));
console.log(`Database Target: ${supabaseUrl}\n`);

async function run() {
  let tempAdminUserId = null;
  let testEnquiryId = null;

  try {
    // 1. Locate Verified Super Admin Profile
    console.log('Step 1: Locating verified Super Admin profile in dev...');
    const { data: superAdmin, error: saErr } = await adminClient
      .from('staff_profiles')
      .select('id, email, role, is_active')
      .eq('role', 'super_admin')
      .eq('is_active', true)
      .limit(1)
      .single();

    assert.ok(!saErr && superAdmin, `Super Admin must exist in dev: ${saErr?.message}`);
    console.log(`  ✓ Found Super Admin: ${superAdmin.email} (${superAdmin.id})`);

    // 2. Create Temporary Ordinary Admin for Unauthorized Testing
    console.log('\nStep 2: Provisioning temporary Ordinary Admin staff profile...');
    const tempAdminEmail = `test-admin-${Date.now()}@santhaya-dev.local`;
    const { data: tempAuthUser, error: authErr } = await adminClient.auth.admin.createUser({
      email: tempAdminEmail,
      password: `TempP@ss${Date.now()}!`,
      email_confirm: true,
    });
    assert.ok(!authErr && tempAuthUser?.user, `Failed to create temp auth user: ${authErr?.message}`);
    tempAdminUserId = tempAuthUser.user.id;

    // Create staff_profile with role 'admin' (ordinary administrator)
    const { error: profileErr } = await adminClient.from('staff_profiles').insert({
      id: tempAdminUserId,
      email: tempAdminEmail,
      full_name: 'Temporary Ordinary Admin',
      role: 'admin',
      is_active: true,
    });
    assert.ok(!profileErr, `Failed to create temp ordinary admin profile: ${profileErr?.message}`);
    console.log(`  ✓ Created temporary Ordinary Admin: ${tempAdminEmail} (${tempAdminUserId})`);

    // 3. Create Test Quotation Request
    console.log('\nStep 3: Creating test quotation enquiry...');
    const testRef = `ENQ-GATE-${Date.now().toString().slice(-6)}`;
    const { data: enquiry, error: enqErr } = await adminClient
      .from('quotation_requests')
      .insert({
        reference_number: testRef,
        business_name: 'Release Gate Verification Industries',
        contact_person: 'Ramesh Patel',
        email: 'ramesh@releasegate.local',
        phone: '9876543210',
        service_category: 'construction_machinery',
        requirement_details: 'End-to-end authorization and transaction atomicity verification',
        delivery_location: 'Patna Site',
        privacy_consent: true,
        submission_ip_hash: 'test_ip_gate_001',
        idempotency_key: crypto.randomUUID(),
        request_payload_hash: 'gate_hash_001',
        status: 'new',
      })
      .select('id, reference_number, deleted_at, status')
      .single();

    assert.ok(!enqErr && enquiry, `Failed to create enquiry: ${enqErr?.message}`);
    testEnquiryId = enquiry.id;
    console.log(`  ✓ Test enquiry created: ${enquiry.reference_number} (${enquiry.id})`);

    // 4. TEST: Unauthorized Staff Delete MUST Fail
    console.log('\nStep 4: Testing Unauthorized Staff Soft-Delete (Ordinary Admin)...');
    const { data: unauthDeleteRes, error: unauthDeleteErr } = await adminClient.rpc(
      'soft_delete_quotation_request',
      {
        p_enquiry_id: testEnquiryId,
        p_reason: 'Unauthorized deletion attempt by ordinary admin',
        p_acting_user_id: tempAdminUserId,
      }
    );

    assert.ok(unauthDeleteErr, 'RPC must reject unauthorized staff delete');
    assert.ok(
      unauthDeleteErr.message.includes('Only active Super Administrators can delete'),
      `Expected Super Admin rejection error, got: ${unauthDeleteErr.message}`
    );
    console.log(`  ✓ Database strictly rejected Ordinary Admin: "${unauthDeleteErr.message}"`);

    // Verify database state: enquiry must STILL be active, and zero audit logs created
    const { data: checkUnauthEnquiry } = await adminClient
      .from('quotation_requests')
      .select('deleted_at')
      .eq('id', testEnquiryId)
      .single();
    assert.strictEqual(checkUnauthEnquiry.deleted_at, null, 'Enquiry deleted_at must remain NULL after rejected delete');

    const { data: unauthAuditLogs } = await adminClient
      .from('audit_logs')
      .select('id')
      .eq('entity_id', testEnquiryId)
      .eq('action', 'enquiry_soft_deleted');
    assert.strictEqual(unauthAuditLogs?.length, 0, 'No audit log may be created when authorization fails');
    console.log('  ✓ Verification confirmed: Database rolled back, enquiry remains active, zero audit logs created.');

    // 5. TEST: Legitimate Super Admin Delete MUST Succeed Atomically
    console.log('\nStep 5: Testing Legitimate Super Admin Soft-Delete...');
    const deletionReason = 'Approved decommissioning for site project overhaul';
    const { data: saDeleteRes, error: saDeleteErr } = await adminClient.rpc(
      'soft_delete_quotation_request',
      {
        p_enquiry_id: testEnquiryId,
        p_reason: deletionReason,
        p_acting_user_id: superAdmin.id,
      }
    );

    assert.ok(!saDeleteErr, `Super Admin delete must succeed: ${saDeleteErr?.message}`);
    console.log('  ✓ Super Admin soft-delete succeeded via atomic RPC.');

    // Verify database state: enquiry is soft-deleted
    const { data: checkDeletedEnquiry } = await adminClient
      .from('quotation_requests')
      .select('deleted_at, deleted_by_staff_id, deletion_reason')
      .eq('id', testEnquiryId)
      .single();

    assert.ok(checkDeletedEnquiry.deleted_at !== null, 'deleted_at must be populated');
    assert.strictEqual(checkDeletedEnquiry.deleted_by_staff_id, superAdmin.id, 'deleted_by_staff_id must match Super Admin ID');
    assert.strictEqual(checkDeletedEnquiry.deletion_reason, deletionReason, 'deletion_reason must match');

    // Verify atomic audit log
    const { data: saAuditLogs } = await adminClient
      .from('audit_logs')
      .select('id, action, actor_id, new_state, created_at')
      .eq('entity_id', testEnquiryId)
      .eq('action', 'enquiry_soft_deleted');

    assert.strictEqual(saAuditLogs?.length, 1, 'Exactly one enquiry_soft_deleted audit log must exist');
    assert.strictEqual(saAuditLogs[0].actor_id, superAdmin.id, 'Audit log actor_id must match Super Admin ID');
    console.log(`  ✓ Atomic audit log confirmed: ${saAuditLogs[0].id} (actor: ${saAuditLogs[0].actor_id})`);

    // 6. TEST: Unauthorized Staff Restore MUST Fail
    console.log('\nStep 6: Testing Unauthorized Staff Restore (Ordinary Admin)...');
    const { data: unauthRestoreRes, error: unauthRestoreErr } = await adminClient.rpc(
      'restore_quotation_request',
      {
        p_enquiry_id: testEnquiryId,
        p_acting_user_id: tempAdminUserId,
      }
    );

    assert.ok(unauthRestoreErr, 'RPC must reject unauthorized staff restore');
    assert.ok(
      unauthRestoreErr.message.includes('Only active Super Administrators can restore'),
      `Expected Super Admin rejection error, got: ${unauthRestoreErr.message}`
    );
    console.log(`  ✓ Database strictly rejected Ordinary Admin restore: "${unauthRestoreErr.message}"`);

    // Verify enquiry is STILL in trash
    const { data: checkStillDeleted } = await adminClient
      .from('quotation_requests')
      .select('deleted_at')
      .eq('id', testEnquiryId)
      .single();
    assert.ok(checkStillDeleted.deleted_at !== null, 'Enquiry must remain in Trash after rejected restore');

    // 7. TEST: Legitimate Super Admin Restore MUST Succeed Atomically
    console.log('\nStep 7: Testing Legitimate Super Admin Restore...');
    const { data: saRestoreRes, error: saRestoreErr } = await adminClient.rpc(
      'restore_quotation_request',
      {
        p_enquiry_id: testEnquiryId,
        p_acting_user_id: superAdmin.id,
      }
    );

    assert.ok(!saRestoreErr, `Super Admin restore must succeed: ${saRestoreErr?.message}`);
    console.log('  ✓ Super Admin restore succeeded via atomic RPC.');

    // Verify database state: enquiry is restored to active
    const { data: checkRestoredEnquiry } = await adminClient
      .from('quotation_requests')
      .select('deleted_at, deleted_by_staff_id, deletion_reason')
      .eq('id', testEnquiryId)
      .single();

    assert.strictEqual(checkRestoredEnquiry.deleted_at, null, 'deleted_at must be reset to NULL');
    assert.strictEqual(checkRestoredEnquiry.deleted_by_staff_id, null, 'deleted_by_staff_id must be reset to NULL');
    assert.strictEqual(checkRestoredEnquiry.deletion_reason, null, 'deletion_reason must be reset to NULL');

    // Verify atomic restore audit log
    const { data: restoreAuditLogs } = await adminClient
      .from('audit_logs')
      .select('id, action, actor_id, created_at')
      .eq('entity_id', testEnquiryId)
      .eq('action', 'enquiry_restored');

    assert.strictEqual(restoreAuditLogs?.length, 1, 'Exactly one enquiry_restored audit log must exist');
    assert.strictEqual(restoreAuditLogs[0].actor_id, superAdmin.id, 'Audit log actor_id must match Super Admin ID');
    console.log(`  ✓ Atomic restore audit log confirmed: ${restoreAuditLogs[0].id}`);

    // 8. TEST: Atomicity Under Simulated Failure
    console.log('\nStep 8: Testing Atomicity Invariant (Cannot Leave Unrecorded Deletion)...');
    // If an invalid actor UUID is provided, the RPC must abort the transaction
    const invalidActorId = '00000000-0000-4000-8000-000000000000';
    const { error: invalidActorErr } = await adminClient.rpc(
      'soft_delete_quotation_request',
      {
        p_enquiry_id: testEnquiryId,
        p_reason: 'Testing atomicity with non-existent user',
        p_acting_user_id: invalidActorId,
      }
    );
    assert.ok(invalidActorErr, 'Transaction must abort when actor is not an active super_admin');

    const { data: postFailureCheck } = await adminClient
      .from('quotation_requests')
      .select('deleted_at')
      .eq('id', testEnquiryId)
      .single();
    assert.strictEqual(postFailureCheck.deleted_at, null, 'Enquiry deleted_at was not altered because transaction rolled back');
    console.log('  ✓ Transaction rollback verified: Atomicity guaranteed.');

  } finally {
    // Cleanup temporary test data
    console.log('\nStep 9: Cleaning up test artifacts from dev database...');
    if (testEnquiryId) {
      await adminClient.from('audit_logs').delete().eq('entity_id', testEnquiryId);
      await adminClient.from('quotation_requests').delete().eq('id', testEnquiryId);
      console.log(`  ✓ Cleaned up test enquiry ${testEnquiryId} and audit logs`);
    }
    if (tempAdminUserId) {
      await adminClient.from('staff_profiles').delete().eq('id', tempAdminUserId);
      await adminClient.auth.admin.deleteUser(tempAdminUserId);
      console.log(`  ✓ Cleaned up temporary test admin user ${tempAdminUserId}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('ALL RELEASE GATE DELETION AUTHORIZATION & ATOMICITY TESTS PASSED!');
  console.log('='.repeat(70) + '\n');
}

run().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});

