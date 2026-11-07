/**
 * Santhaya Associates — Production Super Admin Password Reset Utility
 * File: scripts/reset-production-super-admin-password.mjs
 *
 * PURPOSE:
 * Securely updates the password for the authorized production Super Admin
 * (heistofeverything@gmail.com, UID: b132f356-4b5b-4ebf-b4ed-c8611127e127)
 * using the Supabase Auth Admin API (updateUserById).
 *
 * SECURITY CONTROLS:
 * 1. Target Lock: Strictly targets production project 'flxhwgevmqvuqdjaejwa'.
 *    Refuses to execute if pointing to development or an unexpected project.
 * 2. Identity Lock: Strictly targets UID 'b132f356-4b5b-4ebf-b4ed-c8611127e127'
 *    and verifies email is exactly 'heistofeverything@gmail.com'.
 * 3. Role Integrity Check: Verifies corresponding staff_profiles record is active
 *    with role 'super_admin'. Zero schema or table modifications permitted.
 * 4. Zero Credential Exposure:
 *    - Replacement password is collected via private non-echoing terminal raw mode.
 *    - Never echoed, logged, displayed, or written to disk/logs/Git.
 *    - In-memory variables are zeroed out immediately post-transmission.
 * 5. Preflight Mode: Supports --preflight for read-only validation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const TARGET_PROJECT_REF = 'flxhwgevmqvuqdjaejwa';
const TARGET_SUPER_ADMIN_UID = 'b132f356-4b5b-4ebf-b4ed-c8611127e127';
const TARGET_SUPER_ADMIN_EMAIL = 'heistofeverything@gmail.com';
const DEV_PROJECT_REF = 'bkqneudnnhvvwmtggorz';

function askHiddenPassword(query) {
  return new Promise((resolve) => {
    process.stdout.write(query);
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      console.error('\nERROR: Terminal is not interactive (TTY). Interactive input required.');
      process.exit(1);
    }
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
          process.stdout.write('\n[ABORTED] Operation cancelled by user.\n');
          process.exit(1);
          break;
        case '\u007f':
        case '\b':
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
          break;
        default:
          password += ch;
          break;
      }
    };
    stdin.on('data', onData);
  });
}

async function run() {
  const isPreflight = process.argv.includes('--preflight');

  console.log('='.repeat(75));
  console.log('SANTHAYA ASSOCIATES — PRODUCTION SUPER ADMIN PASSWORD RESET');
  console.log(`Mode: ${isPreflight ? 'PREFLIGHT VERIFICATION (READ-ONLY)' : 'INTERACTIVE LIVE RESET'}`);
  console.log(`Target Production Project Ref: ${TARGET_PROJECT_REF}`);
  console.log(`Target Super Admin UID:       ${TARGET_SUPER_ADMIN_UID}`);
  console.log(`Target Super Admin Email:     ${TARGET_SUPER_ADMIN_EMAIL}`);
  console.log('='.repeat(75));

  // 1. Verify environment configuration
  const envPath = path.join(ROOT_DIR, '.env.production.local');
  if (!fs.existsSync(envPath)) {
    console.error('FATAL: .env.production.local does not exist.');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/);
  const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)/);

  const supabaseUrl = urlMatch?.[1]?.trim();
  const serviceRoleKey = keyMatch?.[1]?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('FATAL: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  if (supabaseUrl.includes(DEV_PROJECT_REF)) {
    console.error('CRITICAL SAFETY BLOCK: URL references development project! Refusing to proceed.');
    process.exit(1);
  }

  if (!supabaseUrl.includes(TARGET_PROJECT_REF)) {
    console.error(`FATAL: URL does not match target production ref (${TARGET_PROJECT_REF}).`);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 2. Read-only verification of Auth user
  console.log('[1/4] Verifying production auth.users record...');
  const { data: userRes, error: userErr } = await supabase.auth.admin.getUserById(TARGET_SUPER_ADMIN_UID);
  if (userErr || !userRes?.user) {
    console.error('FATAL: Failed to find target user in auth.users:', userErr?.message || 'User not found');
    process.exit(1);
  }

  const user = userRes.user;
  if (user.email !== TARGET_SUPER_ADMIN_EMAIL) {
    console.error(`CRITICAL MISMATCH: User email (${user.email}) does not match target (${TARGET_SUPER_ADMIN_EMAIL}).`);
    process.exit(1);
  }

  if (!user.email_confirmed_at) {
    console.error('FATAL: Super Admin email is not confirmed.');
    process.exit(1);
  }

  console.log(`   ✓ Auth user confirmed (Created: ${user.created_at}, Confirmed: ${user.email_confirmed_at})`);

  // 3. Read-only verification of staff_profiles record
  console.log('[2/4] Verifying production public.staff_profiles record...');
  const { data: profile, error: profErr } = await supabase
    .from('staff_profiles')
    .select('id, email, role, is_active')
    .eq('id', TARGET_SUPER_ADMIN_UID)
    .maybeSingle();

  if (profErr || !profile) {
    console.error('FATAL: Staff profile record not found:', profErr?.message || 'Profile missing');
    process.exit(1);
  }

  if (profile.role !== 'super_admin' || !profile.is_active) {
    console.error(`FATAL: Profile role/active mismatch (role=${profile.role}, is_active=${profile.is_active}).`);
    process.exit(1);
  }

  console.log(`   ✓ Staff profile confirmed (role: ${profile.role}, active: ${profile.is_active})`);

  // 4. Preflight completion or Password Collection
  if (isPreflight) {
    console.log('[3/4] Preflight verification complete.');
    console.log('[4/4] ALL SECURITY PRECONDITIONS PASSED.');
    console.log('Ready for live execution with interactive private password input.');
    process.exit(0);
  }

  console.log('[3/4] Collecting replacement password (non-echoing input)...');
  console.log('   Keystrokes will be completely hidden. Type carefully.');

  let pass1 = await askHiddenPassword('Enter new Super Admin password: ');
  if (!pass1 || pass1.length < 8) {
    console.error('FATAL: Password must be at least 8 characters in length.');
    process.exit(1);
  }

  let pass2 = await askHiddenPassword('Confirm new Super Admin password: ');
  if (pass1 !== pass2) {
    console.error('FATAL: Passwords do not match. Aborting.');
    pass1 = null;
    pass2 = null;
    process.exit(1);
  }

  // 5. Execute updateUserById
  console.log('[4/4] Updating password via Supabase Auth Admin API...');
  const { data: updateRes, error: updateErr } = await supabase.auth.admin.updateUserById(
    TARGET_SUPER_ADMIN_UID,
    { password: pass1 }
  );

  // Immediately wipe sensitive variables
  pass1 = null;
  pass2 = null;

  if (updateErr) {
    console.error('FATAL: Password update failed:', updateErr.message);
    process.exit(1);
  }

  console.log('   ✓ Password update successful!');

  // 6. Final Read-Only Verification
  const { data: postVerify } = await supabase.auth.admin.getUserById(TARGET_SUPER_ADMIN_UID);
  console.log('='.repeat(75));
  console.log('SUCCESS: Super Admin password reset completed successfully.');
  console.log(`Account:       ${TARGET_SUPER_ADMIN_EMAIL}`);
  console.log(`UID:           ${TARGET_SUPER_ADMIN_UID}`);
  console.log(`Updated At:    ${postVerify?.user?.updated_at}`);
  console.log(`Status:        CONFIRMED & READY FOR LOGIN`);
  console.log('='.repeat(75));
}

run().catch((err) => {
  console.error('UNEXPECTED EXCEPTION:', err?.message || err);
  process.exit(1);
});

