/**
 * Santhaya Associates — Secure Setup Link Refresh Utility
 * File: scripts/generate-company-setup-link.mjs
 *
 * Generates a fresh, unexpired, direct single-use recovery link
 * for santhayapvt.ltd@gmail.com targeting /staff/reset-password.
 *
 * SAFETY INVARIANTS:
 * 1. Strictly targets production (flxhwgevmqvuqdjaejwa).
 * 2. Aborts immediately if development project is detected.
 * 3. Never prints tokens, passwords, or hashes to console or stdout.
 * 4. Saves link securely to gitignored .setup-link.local.txt.
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
const TARGET_EMAIL = 'santhayapvt.ltd@gmail.com';
const EXPECTED_UID = 'c555846d-1ee0-4543-bf32-a135028bc5aa';
const CANONICAL_APP_URL = 'https://santhayaassociates.com';

const envPath = path.join(ROOT_DIR, '.env.production.local');
if (!fs.existsSync(envPath)) {
  console.error('FATAL: .env.production.local missing.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/);
const serviceRoleMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)/);

const supabaseUrl = urlMatch?.[1]?.trim().replace(/^["']|["']$/g, '');
const serviceRoleKey = serviceRoleMatch?.[1]?.trim().replace(/^["']|["']$/g, '');

if (supabaseUrl.includes(DEV_PROJECT_REF)) {
  console.error('FATAL: Attempted connection to development project.');
  process.exit(1);
}

if (!supabaseUrl.includes(TARGET_PROJECT_REF)) {
  console.error(`FATAL: URL does not target production (${TARGET_PROJECT_REF}).`);
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log('='.repeat(78));
  console.log('SANTHAYA ASSOCIATES — DIRECT RECOVERY LINK GENERATOR');
  console.log(`Target:               Production (${TARGET_PROJECT_REF})`);
  console.log(`Target Account:       ${TARGET_EMAIL}`);
  console.log(`Expected UID:         ${EXPECTED_UID}`);
  console.log('='.repeat(78));

  // 1. Verify user exists in auth.users
  const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) {
    console.error('Failed to query auth.users:', listErr.message);
    process.exit(1);
  }

  const targetUser = users.users.find(u => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase());
  if (!targetUser) {
    console.error(`FATAL: User ${TARGET_EMAIL} not found in auth.users.`);
    process.exit(1);
  }

  if (targetUser.id !== EXPECTED_UID) {
    console.error(`FATAL: UID mismatch! Expected ${EXPECTED_UID}, found ${targetUser.id}.`);
    process.exit(1);
  }

  console.log(`  ✓ Auth user verified: UID ${targetUser.id}`);
  console.log(`  ✓ Confirmed at:       ${targetUser.email_confirmed_at}`);

  // 2. Verify staff profile
  const { data: profile, error: profErr } = await supabaseAdmin
    .from('staff_profiles')
    .select('id, email, role, is_active')
    .eq('id', targetUser.id)
    .single();

  if (profErr || !profile || profile.role !== 'super_admin' || !profile.is_active) {
    console.error('FATAL: Staff profile invalid or not active super_admin.');
    process.exit(1);
  }

  console.log(`  ✓ Staff profile:      role=${profile.role}, is_active=${profile.is_active}`);

  // 3. Generate fresh single-use recovery link
  console.log(`\nGenerating fresh single-use recovery link...`);
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: TARGET_EMAIL,
    options: {
      redirectTo: `${CANONICAL_APP_URL}/staff/reset-password`,
    },
  });

  if (linkErr || !linkData?.properties) {
    console.error('Failed to generate link:', linkErr?.message);
    process.exit(1);
  }

  const hashedToken = linkData.properties.hashed_token;
  if (!hashedToken) {
    console.error('FATAL: hashed_token missing in generateLink response.');
    process.exit(1);
  }

  // Construct direct scanner-safe link that points directly to /staff/reset-password
  // This bypasses Supabase /auth/v1/verify GET consumption completely!
  const directSetupLink = `${CANONICAL_APP_URL}/staff/reset-password?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`;

  // 4. Save link to local gitignored file
  const localFile = path.join(ROOT_DIR, '.setup-link.local.txt');
  fs.writeFileSync(
    localFile,
    `SANTHAYA ASSOCIATES — DIRECT COMPANY SUPER ADMIN SETUP LINK\n` +
    `Account:          ${TARGET_EMAIL}\n` +
    `UID:              ${targetUser.id}\n` +
    `Generated At:     ${new Date().toISOString()}\n` +
    `Expires:          1 hour from generation\n` +
    `Target Portal:    ${CANONICAL_APP_URL}/staff/reset-password\n\n` +
    `Direct Link:      ${directSetupLink}\n\n` +
    `Instructions:     Open this link in any browser. It will immediately open the\n` +
    `                  "Set New Password" screen on santhayaassociates.com without\n` +
    `                  triggering any prefetching or OTP_EXPIRED errors.\n`,
    { mode: 0o600 }
  );

  console.log(`  ✓ Direct recovery link generated successfully.`);
  console.log(`  ✓ Saved to: .setup-link.local.txt (gitignored)`);
  console.log(`  ✓ Zero-Token Policy: Setup link token was NOT printed to console.`);
  console.log('\n' + '='.repeat(78));
  console.log('SETUP LINK REFRESH COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(78));
}

run().catch(err => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
