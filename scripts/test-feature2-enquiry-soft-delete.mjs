/**
 * Santhaya Associates — Automated Verification Test Suite
 * Feature 2: Reversible Enquiry Soft-Delete & Restore in Staff ERP
 * File: scripts/test-feature2-enquiry-soft-delete.mjs
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('='.repeat(70));
console.log('SANTHAYA ASSOCIATES — FEATURE 2: ENQUIRY SOFT-DELETE & RESTORE TESTS');
console.log('='.repeat(70) + '\n');

let totalTests = 0;
let passedTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} — ${err.message}`);
    throw err;
  }
}

async function itAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} — ${err.message}`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// 1. Migration & Schema Structure Verification
// -----------------------------------------------------------------------------
console.log('--- 1. Database Schema & Additive Migration Verification ---');

it('Migration 20261108100000_add_enquiry_soft_delete.sql defines non-destructive columns and index', () => {
  const migPath = 'supabase/migrations/20261108100000_add_enquiry_soft_delete.sql';
  assert.ok(fs.existsSync(migPath), 'Migration file must exist');

  const content = fs.readFileSync(migPath, 'utf8');
  assert.ok(content.includes('ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL'), 'Adds deleted_at with NULL default');
  assert.ok(content.includes('ADD COLUMN deleted_by_staff_id UUID REFERENCES public.staff_profiles(id)'), 'Adds deleted_by_staff_id FK');
  assert.ok(content.includes('ADD COLUMN deletion_reason TEXT DEFAULT NULL'), 'Adds deletion_reason with NULL default');
  assert.ok(content.includes('CREATE INDEX IF NOT EXISTS idx_quotation_requests_deleted_at'), 'Creates index on deleted_at');
  assert.ok(content.includes('CREATE OR REPLACE FUNCTION public.guard_quotation_requests_soft_delete()'), 'Creates defense-in-depth trigger function');
  assert.ok(content.includes('CREATE TRIGGER trg_guard_quotation_requests_soft_delete'), 'Binds trigger to quotation_requests');
  assert.ok(content.includes('NOT public.is_super_admin(auth.uid())'), 'Checks is_super_admin in database trigger');
});

it('TypeScript database definitions in src/types/database.ts include soft-delete fields', () => {
  const content = fs.readFileSync('src/types/database.ts', 'utf8');
  assert.ok(content.includes('deleted_at: string | null;'), 'Row includes deleted_at');
  assert.ok(content.includes('deleted_by_staff_id: string | null;'), 'Row includes deleted_by_staff_id');
  assert.ok(content.includes('deletion_reason: string | null;'), 'Row includes deletion_reason');
});

// -----------------------------------------------------------------------------
// 2. Server Action Role Authorization Guards
// -----------------------------------------------------------------------------
console.log('\n--- 2. Server Action Role Authorization Guards ---');

it('softDeleteEnquiryAction strictly restricts deletion to Super Administrators only', () => {
  const content = fs.readFileSync('src/lib/enquiries/actions.ts', 'utf8');
  assert.ok(
    content.includes("const AUTHORIZED_DELETE_ROLES = ['super_admin']"),
    'Authorized delete roles defined as super_admin only'
  );
  assert.ok(
    content.includes("profile.role !== 'super_admin'"),
    'Checks profile.role strictly against super_admin'
  );
  assert.ok(
    content.includes('Only Super Administrators have authorization to delete quotation enquiries'),
    'Returns clear super_admin authorization error message'
  );
});

it('restoreEnquiryAction strictly restricts restoration to Super Administrators only', () => {
  const content = fs.readFileSync('src/lib/enquiries/actions.ts', 'utf8');
  assert.ok(
    content.includes("profile.role !== 'super_admin'"),
    'Strict equality check ensuring only super_admin can restore'
  );
  assert.ok(
    content.includes('Only Super Administrators have authorization to restore'),
    'Rejects ordinary administrators and staff from restoring'
  );
});

it('softDeleteEnquiryAction and restoreEnquiryAction record immutable audit log entries', () => {
  const content = fs.readFileSync('src/lib/enquiries/actions.ts', 'utf8');
  assert.ok(
    content.includes("action: 'enquiry_soft_deleted'"),
    'Records enquiry_soft_deleted in audit_logs'
  );
  assert.ok(
    content.includes("action: 'enquiry_restored'"),
    'Records enquiry_restored in audit_logs'
  );
  assert.ok(
    content.includes("entity_type: 'quotation_requests'"),
    'Targets quotation_requests entity type'
  );
});

// -----------------------------------------------------------------------------
// 3. Page Active vs. Trash Partitioning & KPI Counts
// -----------------------------------------------------------------------------
console.log('\n--- 3. Page Active vs. Trash Partitioning & Metrics ---');

it('src/app/staff/enquiries/page.tsx partitions active enquiries (.is(deleted_at, null)) from Trash', () => {
  const content = fs.readFileSync('src/app/staff/enquiries/page.tsx', 'utf8');

  // Verify query branching
  assert.ok(
    content.includes("query = query.not('deleted_at', 'is', null)"),
    'Trash view queries records where deleted_at IS NOT NULL'
  );
  assert.ok(
    content.includes("query = query.is('deleted_at', null)"),
    'Active views query records where deleted_at IS NULL'
  );

  // Verify KPI metrics exclude soft-deleted records
  assert.ok(
    content.includes('const activeRows = allRecords.filter((r) => !r.deleted_at);'),
    'Active rows strictly filter out deleted_at'
  );
  assert.ok(
    content.includes('const trashRows = allRecords.filter((r) => !!r.deleted_at);'),
    'Trash rows count deleted records'
  );
  assert.ok(
    content.includes("{ label: 'Trash', value: 'trash', count: trashCount, isTrash: true }"),
    'Trash tab is registered with trashCount badge'
  );
});

// -----------------------------------------------------------------------------
// 4. Client View Details & Confirmation Dialog UI
// -----------------------------------------------------------------------------
console.log('\n--- 4. Client View Details & Confirmation Dialog UI ---');

it('EnquiryListClient renders Delete Enquiry button inside View Details strictly for Super Administrators', () => {
  const content = fs.readFileSync('src/app/staff/enquiries/EnquiryListClient.tsx', 'utf8');
  assert.ok(
    content.includes("const canDelete = currentUserRole === 'super_admin'"),
    'Defines canDelete strictly for super_admin'
  );
  assert.ok(
    content.includes('Delete Enquiry'),
    'Renders Delete Enquiry button text'
  );
  assert.ok(
    content.includes('setShowDeleteModal(true)'),
    'Clicking Delete Enquiry opens confirmation modal'
  );
});

it('EnquiryListClient confirmation dialog displays reference number, company name, and deletion reason input', () => {
  const content = fs.readFileSync('src/app/staff/enquiries/EnquiryListClient.tsx', 'utf8');
  assert.ok(
    content.includes('showDeleteModal && selectedEnquiry'),
    'Renders modal conditionally when showDeleteModal is true'
  );
  assert.ok(
    content.includes('{selectedEnquiry.reference_number}'),
    'Displays selectedEnquiry.reference_number'
  );
  assert.ok(
    content.includes('{selectedEnquiry.business_name}'),
    'Displays selectedEnquiry.business_name'
  );
  assert.ok(
    content.includes('id="enquiry-delete-reason"'),
    'Provides deletion reason textarea'
  );
  assert.ok(
    content.includes('Confirm Soft Delete'),
    'Provides Confirm Soft Delete submission action'
  );
  assert.ok(
    content.includes('min-h-[44px]'),
    'Enforces mobile-friendly minimum 44px tap targets'
  );
});

it('EnquiryListClient renders Restore Enquiry action enabled strictly for Super Administrators', () => {
  const content = fs.readFileSync('src/app/staff/enquiries/EnquiryListClient.tsx', 'utf8');
  assert.ok(
    content.includes("const canRestore = currentUserRole === 'super_admin'"),
    'Defines canRestore strictly for super_admin'
  );
  assert.ok(
    content.includes('Restore Enquiry'),
    'Renders Restore Enquiry button'
  );
  assert.ok(
    content.includes('Restoration is restricted to Super Administrators'),
    'Displays restricted notice when user is not super_admin'
  );
});

// -----------------------------------------------------------------------------
// 5. Database Level Physical Delete Denial (RLS Security)
// -----------------------------------------------------------------------------
console.log('\n--- 5. Database Level Physical Delete Denial (RLS Security) ---');

it('Physical DELETE on quotation_requests is denied to authenticated staff via RLS', () => {
  const schemaMigration = fs.readFileSync('supabase/migrations/20261026120000_phase2_schema_and_security.sql', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(
    schemaMigration.includes('CREATE POLICY "Deny delete on quotation_requests"'),
    'Deny delete policy exists on quotation_requests'
  );
  assert.ok(
    schemaMigration.includes('ON public.quotation_requests FOR DELETE TO authenticated\n  USING (false);'),
    'Deny delete policy enforces USING (false)'
  );
});

console.log('\n' + '='.repeat(70));
console.log(`ALL ${totalTests} FEATURE 2 TESTS PASSED SUCCESSFULLY! (${passedTests}/${totalTests})`);
console.log('='.repeat(70) + '\n');
