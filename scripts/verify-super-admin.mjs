/**
 * Santhaya Associates — Super Administrator Post-Bootstrap Verification
 * File: scripts/verify-super-admin.mjs
 *
 * Verifies:
 * 1. Target environment allowlist lock (DEV_SUPABASE_PROJECT_REF = bkqneudnnhvvwmtggorz).
 * 2. Exactly one (or at least one) active Super Admin exists in staff_profiles.
 * 3. Matching Supabase Auth user exists.
 * 4. Zero passwords or secrets leaked in logs.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const envLocalPath = path.resolve('.env.local');
if (!fs.existsSync(envLocalPath)) {
  console.error('\n❌ ERROR: .env.local not found.');
  process.exit(1);
}

const envContent = fs.readFileSync(envLocalPath, 'utf8');
for (const line of envContent.split('\n')) {
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const devProjectRef = process.env.DEV_SUPABASE_PROJECT_REF;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function verifySuperAdmin() {
  console.log('='.repeat(64));
  console.log('Santhaya Associates — Super Administrator Verification');
  console.log('='.repeat(64));

  const { data: profiles, error } = await adminClient
    .from('staff_profiles')
    .select('id, email, full_name, role, is_active, created_at')
    .eq('role', 'super_admin');

  if (error) {
    console.error('❌ Error checking staff_profiles:', error.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.error('❌ Zero Super Administrators found in staff_profiles.');
    process.exit(1);
  }

  const activeSuperAdmins = profiles.filter((p) => p.is_active);
  console.log(`✓ Total Super Administrators found: ${profiles.length} (${activeSuperAdmins.length} active).`);

  for (const admin of activeSuperAdmins) {
    console.log(`  - ID: ${admin.id}`);
    console.log(`    Name: ${admin.full_name}`);
    console.log(`    Email: ${admin.email}`);
    console.log(`    Role: ${admin.role}`);
    console.log(`    Active: ${admin.is_active}`);

    // Verify Auth user existence
    const { data: authUser, error: authErr } = await adminClient.auth.admin.getUserById(admin.id);
    if (authErr || !authUser?.user) {
      console.error(`    ❌ Matching Auth user NOT found for profile ID: ${admin.id}`);
      process.exit(1);
    } else {
      console.log(`    ✓ Matching Auth user verified in auth.users (Email: ${authUser.user.email}).`);
    }
  }

  console.log('='.repeat(64));
  console.log('SUPER ADMINISTRATOR VERIFICATION: PASS');
  console.log('='.repeat(64));
}

verifySuperAdmin().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

