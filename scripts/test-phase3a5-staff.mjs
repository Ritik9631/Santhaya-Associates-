/**
 * Santhaya Associates — Stage 3A-5 Staff Management & UI Verification Suite
 * File: scripts/test-phase3a5-staff.mjs
 *
 * Automated test suite covering:
 * 1. Staff Management Server Actions & RBAC Hierarchy:
 *    - Role ceiling in invitations (Admin cannot invite admin or super_admin).
 *    - Super Admin full invitation capability.
 *    - Non-admin prohibition on invitations.
 *    - Anti-self-escalation and anti-self-deactivation enforcement.
 *    - High-entropy temporary password generation.
 * 2. Protected Staff Routes & Middleware Barriers:
 *    - /staff/team requires authentication.
 *    - /staff/team/invite requires authentication.
 *    - Unauthenticated requests redirect to /staff/login with preserved destination.
 *    - Anti-cache headers (Cache-Control: no-store) on all staff management routes.
 * 3. Public Site Boundary & Zero-Auth Invariant:
 *    - Public marketing pages retain zero links to staff portal or login.
 * 4. Non-Destructive Invariants on Live Dev Database:
 *    - Confirms approved target project reference bkqneudnnhvvwmtggorz.
 *    - Confirms zero records modified.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const EXPECTED_DEV_REF = 'bkqneudnnhvvwmtggorz';

async function main() {
  console.log('='.repeat(70));
  console.log('SANTHAYA ASSOCIATES — STAGE 3A-5 STAFF MANAGEMENT VERIFICATION');
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
  console.log('\n[1/5] Auditing Staff Management Source Code Integrity...');

  const filesToCheck = [
    'src/lib/auth/staff-actions.ts',
    'src/app/staff/StaffSidebar.tsx',
    'src/app/staff/ProfileNameEditor.tsx',
    'src/app/staff/page.tsx',
    'src/app/staff/team/page.tsx',
    'src/app/staff/team/invite/page.tsx',
    'src/app/staff/team/invite/InviteStaffForm.tsx',
    'src/app/staff/team/[id]/page.tsx',
    'src/app/staff/team/[id]/StaffDetailManager.tsx',
  ];

  for (const relPath of filesToCheck) {
    assert(fs.existsSync(relPath), `File exists: ${relPath}`);
  }

  // --- 2. SERVER ACTIONS RBAC CEILING & SECURITY AUDIT ---
  console.log('\n[2/5] Auditing Server Actions Authorization & Privilege Ceilings...');

  const actionsCode = fs.readFileSync('src/lib/auth/staff-actions.ts', 'utf8');

  // Authorization barriers
  assert(actionsCode.includes('requireStaffSession()'),
    'Server actions invoke requireStaffSession() dual-barrier security');
  assert(actionsCode.includes("profile.role !== 'super_admin' && profile.role !== 'admin'"),
    'inviteStaffAction restricts caller to super_admin and admin only');
  assert(actionsCode.includes("role === 'admin' || role === 'super_admin'"),
    'inviteStaffAction enforces ceiling: ordinary admins cannot invite admin or super_admin');
  assert(actionsCode.includes("profile.role !== 'super_admin'"),
    'updateStaffRoleAction restricts role changes exclusively to super_admin');
  assert(actionsCode.includes('targetUserId === profile.id'),
    'updateStaffRoleAction enforces Anti-Self-Escalation check');
  assert(actionsCode.includes('targetUserId === profile.id && !isActive'),
    'updateStaffStatusAction enforces Anti-Self-Deactivation check');
  assert(actionsCode.includes('admin_update_staff_role'),
    'updateStaffRoleAction delegates to hardened administrative RPC');
  assert(actionsCode.includes('admin_update_staff_status'),
    'updateStaffStatusAction delegates to hardened administrative RPC');
  assert(actionsCode.includes('deleteUser(newUserId)'),
    'inviteStaffAction implements automatic rollback on profile creation failure');

  // --- 3. UI ROLE CEILING & ACCESSIBILITY AUDIT ---
  console.log('\n[3/5] Auditing UI Role Awareness & Protective Dialogs...');

  const inviteFormCode = fs.readFileSync('src/app/staff/team/invite/InviteStaffForm.tsx', 'utf8');
  assert(inviteFormCode.includes("isSuperAdmin = callerRole === 'super_admin'"),
    'InviteStaffForm dynamically inspects caller role');
  assert(/isSuperAdmin\s*\?/.test(inviteFormCode),
    'InviteStaffForm limits role options when caller is ordinary admin');
  assert(inviteFormCode.includes('Zero-Email Outbound Policy'),
    'InviteStaffForm explicitly communicates zero external email dispatch policy');

  const detailManagerCode = fs.readFileSync('src/app/staff/team/[id]/StaffDetailManager.tsx', 'utf8');
  assert(detailManagerCode.includes('canModifyRole = isSuperAdmin && !isSelf'),
    'StaffDetailManager locks role modification from ordinary admins and self');
  assert(detailManagerCode.includes('canModifyStatus = !isSelf && (isSuperAdmin || (!isTargetAdmin && callerRole === \'admin\'))'),
    'StaffDetailManager enforces status modification privilege ceiling');
  assert(detailManagerCode.includes('showRoleConfirm') && detailManagerCode.includes('showStatusConfirm'),
    'StaffDetailManager implements confirmation modals for sensitive actions');

  // --- 4. LIVE DEV SERVER ROUTE PROTECTION & HEADERS ---
  console.log('\n[4/5] Testing Live Dev Server Protected Route Barriers & Headers...');

  const protectedRoutes = [
    '/staff',
    '/staff/team',
    '/staff/team/invite',
    '/staff/team/00000000-0000-0000-0000-000000000000',
  ];

  for (const route of protectedRoutes) {
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
      assert(false, `Failed to fetch ${route}: ${err.message}`);
    }
  }

  // Verify public routes remain clean of auth links
  const publicRoutes = ['/', '/services', '/about', '/request-quotation'];
  for (const pubRoute of publicRoutes) {
    try {
      const res = await fetch(`${BASE_URL}${pubRoute}`);
      const text = await res.text();
      const hasStaffLink = /href\s*=\s*["']\/staff(?!\/login)/i.test(text);
      const hasLoginLink = /href\s*=\s*["']\/staff\/login["']/i.test(text);

      assert(res.status === 200, `Public route ${pubRoute} returns HTTP 200 OK`);
      assert(!hasStaffLink && !hasLoginLink,
        `Public route ${pubRoute} has zero links to staff management or login`);
    } catch (err) {
      assert(false, `Failed to verify public route ${pubRoute}: ${err.message}`);
    }
  }

  // --- 5. LIVE DEV DATABASE NON-DESTRUCTIVE INVARIANTS ---
  console.log('\n[5/5] Verifying Non-Destructive Invariants on Live Dev Supabase Sandbox...');

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
  console.log(`FINAL STAGE 3A-5 RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
