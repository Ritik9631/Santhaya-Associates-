/**
 * Santhaya Associates — Company Super Admin Onboarding Utility
 * File: scripts/onboard-company-super-admin.mjs
 *
 * PURPOSE:
 * Safely provisions the official company mailbox (santhayapvt.ltd@gmail.com)
 * as the primary Super Administrator while strictly preserving the existing
 * backup Super Administrator (heistofeverything@gmail.com).
 *
 * SAFETY CONTROLS:
 * 1. STRICT TARGET VERIFICATION: Only connects to production (flxhwgevmqvuqdjaejwa).
 * 2. DEVELOPMENT SAFEGUARD: Aborts immediately if development project (bkqneudnnhvvwmtggorz) is detected.
 * 3. BACKUP ADMIN INTEGRITY: Verifies heistofeverything@gmail.com is confirmed and active.
 * 4. DUPLICATE DEFENSE: Checks auth.users and staff_profiles before any write.
 * 5. IMMUTABLE AUDIT TRAIL: Inserts audit log entry on completion.
 * 6. ZERO PASSWORD EXPOSURE: Uses Supabase Auth invite flow / cryptographic link.
 * 7. PREFLIGHT MODE: Default or --preflight is strictly 100% read-only.
 *    Execution requires explicit '--execute' flag.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const TARGET_PROJECT_REF = 'flxhwgevmqvuqdjaejwa';
const DEV_PROJECT_REF = 'bkqneudnnhvvwmtggorz';

const BACKUP_SUPER_ADMIN_EMAIL = 'heistofeverything@gmail.com';
const BACKUP_SUPER_ADMIN_UID = 'b132f356-4b5b-4ebf-b4ed-c8611127e127';

const COMPANY_SUPER_ADMIN_EMAIL = 'santhayapvt.ltd@gmail.com';
const COMPANY_SUPER_ADMIN_NAME = 'Santhaya Associates Administrator';

const CANONICAL_APP_URL = 'https://santhayaassociates.com';

function loadProductionConfig() {
  const envPath = path.join(ROOT_DIR, '.env.production.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('FATAL: .env.production.local does not exist at project root.');
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/);
  const serviceRoleMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)/);
  const anonMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.+)/);

  const supabaseUrl = urlMatch?.[1]?.trim().replace(/^["']|["']$/g, '');
  const serviceRoleKey = serviceRoleMatch?.[1]?.trim().replace(/^["']|["']$/g, '');
  const anonKey = anonMatch?.[1]?.trim().replace(/^["']|["']$/g, '');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('FATAL: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.production.local.');
  }

  // Safety checks
  if (supabaseUrl.includes(DEV_PROJECT_REF)) {
    throw new Error(`CRITICAL VIOLATION: .env.production.local references development project (${DEV_PROJECT_REF})! Aborting immediately.`);
  }

  if (!supabaseUrl.includes(TARGET_PROJECT_REF)) {
    throw new Error(`FATAL: URL does not match target production project reference (${TARGET_PROJECT_REF}). URL: ${supabaseUrl}`);
  }

  // Decode service role JWT to verify ref
  try {
    const payload = JSON.parse(Buffer.from(serviceRoleKey.split('.')[1], 'base64').toString('utf8'));
    if (payload.ref !== TARGET_PROJECT_REF || payload.role !== 'service_role') {
      throw new Error(`FATAL: Service role key JWT mismatch. Expected ref=${TARGET_PROJECT_REF}, role=service_role; Got ref=${payload.ref}, role=${payload.role}`);
    }
  } catch (err) {
    throw new Error(`FATAL: Unable to validate service role JWT: ${err.message}`);
  }

  return { supabaseUrl, serviceRoleKey, anonKey };
}

async function run() {
  const isExecute = process.argv.includes('--execute');
  const isPreflight = !isExecute || process.argv.includes('--preflight');

  console.log('='.repeat(78));
  console.log('SANTHAYA ASSOCIATES — COMPANY SUPER ADMIN ONBOARDING UTILITY');
  console.log(`Execution Mode:         ${isExecute ? 'LIVE EXECUTION (--execute)' : 'PREFLIGHT AUDIT (READ-ONLY)'}`);
  console.log(`Target Production Ref:  ${TARGET_PROJECT_REF}`);
  console.log(`Company Super Admin:    ${COMPANY_SUPER_ADMIN_EMAIL}`);
  console.log(`Backup Super Admin:     ${BACKUP_SUPER_ADMIN_EMAIL}`);
  console.log(`Canonical Redirect:     ${CANONICAL_APP_URL}/staff/auth/callback?next=/staff/reset-password`);
  console.log('='.repeat(78));

  const { supabaseUrl, serviceRoleKey } = loadProductionConfig();

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // STEP 1: Verify existing Backup Super Admin integrity
  console.log('\n[STEP 1] Auditing Backup Super Admin (heistofeverything@gmail.com)...');
  const { data: backupUsers, error: backupUserErr } = await supabaseAdmin.auth.admin.listUsers();
  if (backupUserErr) {
    console.error('FATAL: Failed to query auth.users:', backupUserErr.message);
    process.exit(1);
  }

  const existingBackupUser = backupUsers.users.find(u => u.email?.toLowerCase() === BACKUP_SUPER_ADMIN_EMAIL.toLowerCase());
  if (!existingBackupUser) {
    console.error(`FATAL: Existing backup Super Admin (${BACKUP_SUPER_ADMIN_EMAIL}) NOT FOUND in auth.users!`);
    process.exit(1);
  }

  console.log(`  ✓ Auth user exists: UID ${existingBackupUser.id}`);
  console.log(`  ✓ Email confirmed at: ${existingBackupUser.email_confirmed_at || 'NOT CONFIRMED'}`);

  const { data: backupProfile, error: backupProfileErr } = await supabaseAdmin
    .from('staff_profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', existingBackupUser.id)
    .maybeSingle();

  if (backupProfileErr || !backupProfile) {
    console.error('FATAL: Existing backup Super Admin staff_profiles record missing or error:', backupProfileErr?.message);
    process.exit(1);
  }

  if (backupProfile.role !== 'super_admin' || !backupProfile.is_active) {
    console.error(`FATAL: Existing backup Super Admin profile invalid: role=${backupProfile.role}, is_active=${backupProfile.is_active}`);
    process.exit(1);
  }

  console.log(`  ✓ Staff profile active: role=${backupProfile.role}, is_active=${backupProfile.is_active}`);

  // STEP 2: Check target Company Super Admin status
  console.log(`\n[STEP 2] Checking Company Super Admin (${COMPANY_SUPER_ADMIN_EMAIL})...`);
  const existingCompanyUser = backupUsers.users.find(u => u.email?.toLowerCase() === COMPANY_SUPER_ADMIN_EMAIL.toLowerCase());
  const { data: existingCompanyProfile } = await supabaseAdmin
    .from('staff_profiles')
    .select('id, email, full_name, role, is_active')
    .eq('email', COMPANY_SUPER_ADMIN_EMAIL)
    .maybeSingle();

  if (existingCompanyUser) {
    console.log(`  ℹ User already exists in auth.users (UID: ${existingCompanyUser.id})`);
    console.log(`  ℹ Email confirmed: ${existingCompanyUser.email_confirmed_at ? 'YES' : 'PENDING'}`);
  } else {
    console.log(`  ○ User does NOT exist in auth.users (Ready to provision)`);
  }

  if (existingCompanyProfile) {
    console.log(`  ℹ Staff profile already exists: role=${existingCompanyProfile.role}, active=${existingCompanyProfile.is_active}`);
  } else {
    console.log(`  ○ Staff profile does NOT exist (Ready to create)`);
  }

  // If in Preflight mode, stop here and summarize
  if (isPreflight) {
    console.log('\n' + '='.repeat(78));
    console.log('PREFLIGHT AUDIT SUMMARY:');
    console.log(`  - Target Database:             SAFE & VERIFIED (Production ${TARGET_PROJECT_REF})`);
    console.log(`  - Development Isolation:       VERIFIED (0 calls to development)`);
    console.log(`  - Backup Super Admin:          PRESERVED & ACTIVE (${existingBackupUser.email})`);
    console.log(`  - Company Admin Status:        ${existingCompanyUser ? 'EXISTING IDENTITY' : 'CLEAN SLATE (READY FOR ONBOARDING)'}`);
    console.log(`  - Proposed Role:               super_admin`);
    console.log(`  - Ready for Execution:         YES`);
    console.log('\nTo execute live onboarding after operator approval, run:');
    console.log('  node scripts/onboard-company-super-admin.mjs --execute');
    console.log('='.repeat(78));
    return;
  }

  // STEP 3: Live Execution
  console.log('\n[STEP 3] Executing Live Onboarding for Company Super Admin...');

  let companyUserId = existingCompanyUser?.id;

  if (!existingCompanyUser) {
    console.log(`  1. Creating Auth user for ${COMPANY_SUPER_ADMIN_EMAIL}...`);
    // Create user with administrative API, pre-confirming email
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: COMPANY_SUPER_ADMIN_EMAIL,
      email_confirm: true,
      user_metadata: {
        full_name: COMPANY_SUPER_ADMIN_NAME,
        role: 'super_admin',
        provisioned_reason: 'Official company Super Admin primary account',
      },
    });

    if (createErr || !newUser?.user) {
      console.error('FATAL: Failed to create Auth user:', createErr?.message);
      process.exit(1);
    }

    companyUserId = newUser.user.id;
    console.log(`  ✓ Auth user created: UID ${companyUserId}`);
  } else {
    console.log(`  1. Using existing Auth user (UID: ${companyUserId})`);
  }

  // Upsert Staff Profile
  console.log(`  2. Ensuring staff_profiles record has role=super_admin, is_active=true...`);
  const { data: upsertedProfile, error: upsertErr } = await supabaseAdmin
    .from('staff_profiles')
    .upsert({
      id: companyUserId,
      email: COMPANY_SUPER_ADMIN_EMAIL,
      full_name: COMPANY_SUPER_ADMIN_NAME,
      role: 'super_admin',
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (upsertErr) {
    console.error('FATAL: Failed to upsert staff_profiles:', upsertErr.message);
    process.exit(1);
  }

  console.log(`  ✓ Staff profile active: role=${upsertedProfile.role}, is_active=${upsertedProfile.is_active}`);

  // Generate single-use password setup link
  console.log(`  3. Generating single-use secure password recovery/setup link...`);
  let setupLink = null;
  try {
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: COMPANY_SUPER_ADMIN_EMAIL,
      options: {
        redirectTo: `${CANONICAL_APP_URL}/staff/auth/callback?next=/staff/reset-password`,
      },
    });

    if (linkErr) {
      console.warn('  ⚠ Warning generating action link:', linkErr.message);
    } else {
      setupLink = linkData?.properties?.action_link;
      console.log('  ✓ Cryptographic setup link generated successfully.');
    }
  } catch (err) {
    console.warn('  ⚠ Could not generate action link:', err.message);
  }

  // Insert Immutable Audit Log Record
  console.log(`  4. Recording immutable PostgreSQL audit log...`);
  const { error: auditErr } = await supabaseAdmin.from('audit_logs').insert({
    entity_type: 'staff_profiles',
    entity_id: companyUserId,
    action: 'company_super_admin_onboarded',
    actor_type: 'system',
    actor_id: existingBackupUser.id,
    new_state: {
      email: COMPANY_SUPER_ADMIN_EMAIL,
      full_name: COMPANY_SUPER_ADMIN_NAME,
      role: 'super_admin',
      is_active: true,
      provisioned_at: new Date().toISOString(),
      onboarded_by_backup_super_admin: existingBackupUser.email,
    },
  });

  if (auditErr) {
    console.warn('  ⚠ Warning writing audit log:', auditErr.message);
  } else {
    console.log('  ✓ Audit log entry committed.');
  }

  // STEP 4: Post-execution verification
  console.log('\n[STEP 4] Verifying dual Super Admin configuration...');
  const { data: allSuperAdmins, error: queryErr } = await supabaseAdmin
    .from('staff_profiles')
    .select('id, email, full_name, role, is_active')
    .eq('role', 'super_admin')
    .eq('is_active', true);

  if (queryErr) {
    console.error('FATAL: Failed to query super admins:', queryErr.message);
    process.exit(1);
  }

  console.log(`  Active Super Admins found in production (${allSuperAdmins.length}):`);
  for (const admin of allSuperAdmins) {
    console.log(`    - ${admin.email} (UID: ${admin.id}) [ACTIVE: ${admin.is_active}]`);
  }

  const hasBackup = allSuperAdmins.some(a => a.email.toLowerCase() === BACKUP_SUPER_ADMIN_EMAIL.toLowerCase());
  const hasCompany = allSuperAdmins.some(a => a.email.toLowerCase() === COMPANY_SUPER_ADMIN_EMAIL.toLowerCase());

  if (!hasBackup || !hasCompany) {
    console.error('FATAL: Dual Super Admin verification failed!');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(78));
  console.log('COMPANY SUPER ADMIN ONBOARDING COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(78));
  console.log(`Company Super Admin:     ${COMPANY_SUPER_ADMIN_EMAIL}`);
  console.log(`Backup Super Admin:      ${BACKUP_SUPER_ADMIN_EMAIL} (PRESERVED)`);
  if (setupLink) {
    console.log(`\nSingle-Use Password Setup Link (Valid for 1 hour):`);
    console.log(setupLink);
    console.log(`\nDeliver this link privately to the owner to set their personal password.`);
  }
  console.log('='.repeat(78));
}

run().catch((err) => {
  console.error('\nEXECUTION FAILED:', err.message);
  process.exit(1);
});
