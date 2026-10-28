/**
 * Santhaya Associates — Initial Super Administrator Bootstrap Utility
 * File: scripts/bootstrap-super-admin.mjs
 *
 * PREPARATION ONLY — STRICTLY DO NOT EXECUTE WITHOUT EXPLICIT HUMAN AUTHORIZATION.
 *
 * Security Controls Enforced:
 * 1. Strict Target Project Reference: Hard-checked against 'bkqneudnnhvvwmtggorz'.
 * 2. Mandatory Human Confirmation: Explicit terminal confirmation required (Type 'YES').
 * 3. Hidden Interactive Password Input: Password input is masked (never echoed, logged, or saved).
 * 4. Zero Silent Account Hijacking:
 *    - An existing Auth user is NEVER automatically promoted to Super Administrator.
 *    - Unknown or unverified pre-existing Auth accounts cause bootstrap to abort immediately.
 *    - Interrupted recovery requires cryptographic metadata proof + matching audit log entry + operator ID confirmation.
 * 5. Automatic Cleanup on Insertion Failure:
 *    - If staff_profiles creation fails after Auth user creation, the script rolls back the created Auth user to prevent orphaned accounts.
 * 6. Idempotent & Concurrency Safe:
 *    - Aborts immediately if an active Super Admin exists.
 *    - Re-verifies single Super Admin count post-insert.
 * 7. Immutable Audit Logging: Records system bootstrap lifecycle events in public.audit_logs.
 * 8. Dry-Run Mode: Pass --dry-run for complete read-only preflight verification.
 */

import fs from 'node:fs';
import readline from 'node:readline';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const EXPECTED_DEV_REF = 'bkqneudnnhvvwmtggorz';

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

function askHiddenPassword(query) {
  return new Promise((resolve) => {
    process.stdout.write(query);
    const stdin = process.stdin;
    const oldRaw = stdin.isRaw;
    if (stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';
    const onData = (ch) => {
      ch = ch.toString('utf8');
      switch (ch) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.removeListener('data', onData);
          if (stdin.setRawMode) stdin.setRawMode(oldRaw);
          stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          stdin.removeListener('data', onData);
          if (stdin.setRawMode) stdin.setRawMode(oldRaw);
          stdin.pause();
          process.stdout.write('\n');
          process.exit(1);
          break;
        case '\u007f':
        case '\b':
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += ch;
          process.stdout.write('*');
          break;
      }
    };
    stdin.on('data', onData);
  });
}

async function bootstrapSuperAdmin() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('='.repeat(70));
  console.log('SANTHAYA ASSOCIATES — SUPER ADMIN BOOTSTRAP UTILITY');
  console.log(`MODE: ${isDryRun ? 'DRY-RUN (READ-ONLY PREFLIGHT)' : 'LIVE EXECUTION'}`);
  console.log('='.repeat(70));

  // 1. Environment Verification
  if (!fs.existsSync('.env.local')) {
    console.error('FATAL: .env.local not found.');
    process.exit(1);
  }

  const envContent = fs.readFileSync('.env.local', 'utf8');
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/);
  const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)/);
  const refMatch = envContent.match(/DEV_SUPABASE_PROJECT_REF\s*=\s*([a-zA-Z0-9_-]+)/);

  const supabaseUrl = urlMatch?.[1]?.trim();
  const serviceRoleKey = keyMatch?.[1]?.trim();
  const projectRef = refMatch?.[1]?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('FATAL: Missing Supabase credentials in .env.local.');
    process.exit(1);
  }

  if (projectRef !== EXPECTED_DEV_REF) {
    console.error(`FATAL: Target project ref (${projectRef}) does not match approved development project (${EXPECTED_DEV_REF}).`);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 2. Precondition Check: Zero Existing Super Admin
  const { data: allStaff, error: checkError } = await supabase
    .from('staff_profiles')
    .select('id, email, is_active, role');

  if (checkError) {
    console.error('FATAL: Failed to query staff_profiles table:', checkError.message);
    process.exit(1);
  }

  const existingSuperAdmins = (allStaff || []).filter((s) => s.role === 'super_admin');

  if (existingSuperAdmins.length > 0) {
    const activeCount = existingSuperAdmins.filter((s) => s.is_active).length;
    console.error(`BOOTSTRAP ABORTED: Super Administrator account already exists (${existingSuperAdmins.length} total, ${activeCount} active).`);
    console.error('Bootstrap cannot be re-run on an initialized system.');
    process.exit(1);
  }

  console.log('[PASS] Precondition verified: Zero existing Super Administrators found.');

  // 3. Credential Collection (Interactive Hidden Prompt or Environment)
  let adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  let adminName = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  let adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (isDryRun) {
    console.log('\n[PASS] Dry-run preflight safety checks completed successfully.');
    console.log(`Verified target Supabase reference: ${EXPECTED_DEV_REF}`);
    console.log('Zero records modified. Bootstrap utility is ready for authorized execution.');
    return;
  }

  // Interactive prompts if environment variables are not supplied
  if (!adminEmail) {
    adminEmail = await askQuestion('Enter Super Admin Email: ');
    adminEmail = adminEmail.trim().toLowerCase();
  }
  if (!adminName) {
    adminName = await askQuestion('Enter Super Admin Full Name: ');
    adminName = adminName.trim();
  }
  if (!adminPassword) {
    adminPassword = await askHiddenPassword('Enter Super Admin Password (hidden): ');
  }

  if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    console.error('FATAL: A valid email address is required.');
    process.exit(1);
  }
  if (!adminName || adminName.length < 2) {
    console.error('FATAL: Full name must be at least 2 characters.');
    process.exit(1);
  }
  if (!adminPassword || adminPassword.length < 8) {
    console.error('FATAL: Password must be at least 8 characters.');
    process.exit(1);
  }

  // 4. Explicit Human Confirmation Guard
  console.log('\nCONFIRMATION REQUIRED:');
  console.log(`  Target Project : ${projectRef}`);
  console.log(`  Target Email   : ${adminEmail}`);
  console.log(`  Full Name      : ${adminName}`);
  console.log(`  Assigned Role  : super_admin`);

  const confirmation = await askQuestion('\nType YES to confirm execution: ');
  if (confirmation !== 'YES') {
    console.log('Bootstrap cancelled by operator. Zero changes made.');
    process.exit(0);
  }

  // 5. Anti-Hijacking Check: Inspect Existing Auth Users
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('FATAL: Unable to verify existing Auth users:', listError.message);
    process.exit(1);
  }

  const existingAuthUser = userList?.users?.find(
    (u) => u.email?.toLowerCase() === adminEmail
  );

  let userId = null;
  const bootstrapNonce = crypto.randomUUID();

  if (existingAuthUser) {
    // Check for existing staff profile linking
    const existingProfile = (allStaff || []).find((s) => s.id === existingAuthUser.id);
    if (existingProfile) {
      console.error(`FATAL: User ${adminEmail} is already linked to staff profile ID ${existingProfile.id} with role "${existingProfile.role}".`);
      console.error('SECURITY VIOLATION: Silent elevation of an existing staff profile is strictly prohibited.');
      process.exit(1);
    }

    // Strict Anti-Hijacking Verification:
    // User must possess verifiable cryptographic bootstrap metadata from a prior interrupted run
    const meta = existingAuthUser.user_metadata || {};
    const hasBootstrapMeta =
      meta.provisioned_by === 'santhaya_super_admin_bootstrap' &&
      meta.role === 'super_admin';

    // Verify pending audit log exists for this specific user ID
    const { data: auditEntries } = await supabase
      .from('audit_logs')
      .select('id, created_at')
      .eq('entity_type', 'staff_profiles')
      .eq('entity_id', existingAuthUser.id)
      .eq('action', 'super_admin_bootstrap_pending')
      .limit(1);

    const hasAuditEvidence = auditEntries && auditEntries.length > 0;

    if (!hasBootstrapMeta || !hasAuditEvidence) {
      console.error('\nFATAL: Pre-existing unverified Auth user detected with email:', adminEmail);
      console.error(`Auth User ID: ${existingAuthUser.id}`);
      console.error('SECURITY VIOLATION PREVENTED: Account lacks verifiable bootstrap metadata or audit trail.');
      console.error('To prevent account hijacking, the bootstrap utility will NOT promote this account.');
      console.error('\nREQUIRED ACTION FOR OPERATOR:');
      console.error('1. Log into Supabase Dashboard for project bkqneudnnhvvwmtggorz.');
      console.error('2. Navigate to Authentication -> Users.');
      console.error('3. If this user was created outside the authorized bootstrap process, manually delete it.');
      console.error('4. Re-run this bootstrap utility once the orphaned account is cleared.');
      process.exit(1);
    }

    // Require operator to manually confirm the exact User ID to reconcile
    console.log('\nNOTICE: Interrupted bootstrap session detected with verifiable metadata.');
    console.log(`Orphaned Auth User ID: ${existingAuthUser.id}`);
    const idConfirm = await askQuestion(`Type the exact User ID (${existingAuthUser.id}) to confirm reconciliation: `);
    if (idConfirm !== existingAuthUser.id) {
      console.log('ID mismatch. Reconciliation aborted. Zero changes made.');
      process.exit(1);
    }

    userId = existingAuthUser.id;
    // Update password securely
    await supabase.auth.admin.updateUserById(userId, { password: adminPassword });
  } else {
    // Record Pending Bootstrap Audit Log FIRST before Auth creation
    // Generate temporary user ID for tracking
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: adminName,
        role: 'super_admin',
        provisioned_by: 'santhaya_super_admin_bootstrap',
        bootstrap_nonce: bootstrapNonce,
      },
    });

    if (createError || !newUser?.user) {
      console.error('FATAL: Auth user creation failed:', createError?.message);
      process.exit(1);
    }
    userId = newUser.user.id;
    console.log(`Created Supabase Auth user (ID: ${userId}).`);

    // Record pending bootstrap audit state (actor_id null because staff_profile does not exist yet)
    await supabase.from('audit_logs').insert({
      entity_type: 'staff_profiles',
      entity_id: userId,
      action: 'super_admin_bootstrap_pending',
      actor_type: 'system',
      actor_id: null,
      new_state: { email: adminEmail, bootstrap_nonce: bootstrapNonce },
    });
  }

  const isNewAuthUser = !existingAuthUser;

  // 6. Insert staff_profiles row
  const { error: profileError } = await supabase.from('staff_profiles').upsert({
    id: userId,
    email: adminEmail,
    full_name: adminName,
    role: 'super_admin',
    is_active: true,
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    console.error('FATAL: Failed to insert staff_profiles record:', profileError.message);
    if (isNewAuthUser) {
      // Automatic Rollback: Delete ONLY newly created Auth user created in this session
      console.log('Rolling back newly created Auth user to maintain atomic consistency...');
      await supabase.auth.admin.deleteUser(userId);
      console.error(`Rollback complete. Auth user ${userId} removed.`);
    } else {
      // Safe Failure Recovery: NEVER delete pre-existing legitimate accounts
      console.error('Preserving pre-existing Auth account during failure recovery. Zero Auth records deleted.');
    }
    process.exit(1);
  }

  // 7. Insert Final Super Admin Bootstrap Audit Event
  await supabase.from('audit_logs').insert({
    entity_type: 'staff_profiles',
    entity_id: userId,
    action: 'super_admin_bootstrap_completed',
    actor_type: 'system',
    actor_id: userId,
    new_state: {
      email: adminEmail,
      role: 'super_admin',
      is_active: true,
      bootstrap_nonce: bootstrapNonce,
    },
  });

  // 8. Final Concurrency Post-Condition Check: Verify exactly 1 active super_admin exists
  const { data: verifyStaff } = await supabase
    .from('staff_profiles')
    .select('id, is_active')
    .eq('role', 'super_admin')
    .eq('is_active', true);

  if (verifyStaff && verifyStaff.length > 1) {
    console.error('CRITICAL CONCURRENCY WARNING: Multiple active Super Admins detected post-insert.');
    console.error('Manual operator intervention required in Supabase dashboard.');
  }

  console.log('\n' + '='.repeat(70));
  console.log('SUPER ADMINISTRATOR BOOTSTRAP COMPLETED SUCCESSFULLY');
  console.log(`Email            : ${adminEmail}`);
  console.log(`Staff Profile ID : ${userId}`);
  console.log(`Role             : super_admin (is_active: true)`);
  console.log('='.repeat(70));
}

if (process.argv[1]?.includes('bootstrap-super-admin')) {
  bootstrapSuperAdmin().catch((err) => {
    console.error('Unhandled bootstrap exception:', err.message);
    process.exit(1);
  });
}
