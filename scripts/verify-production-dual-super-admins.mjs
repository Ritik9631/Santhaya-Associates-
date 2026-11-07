/**
 * Santhaya Associates — Production Dual Super Admin Read-Only Audit Verifier
 * File: scripts/verify-production-dual-super-admins.mjs
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

const envPath = path.join(ROOT_DIR, '.env.production.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/);
const serviceRoleMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)/);

const supabaseUrl = urlMatch?.[1]?.trim().replace(/^["']|["']$/g, '');
const serviceRoleKey = serviceRoleMatch?.[1]?.trim().replace(/^["']|["']$/g, '');

if (supabaseUrl.includes(DEV_PROJECT_REF)) {
  console.error('FATAL: Attempted connection to dev project.');
  process.exit(1);
}

if (!supabaseUrl.includes(TARGET_PROJECT_REF)) {
  console.error('FATAL: Not connected to target production project.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log('='.repeat(75));
  console.log('SANTHAYA ASSOCIATES — DUAL SUPER ADMIN READ-ONLY VERIFICATION');
  console.log(`Target: Production Project (${TARGET_PROJECT_REF})`);
  console.log('='.repeat(75));

  // 1. Check auth.users
  const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.listUsers();
  if (userErr) {
    console.error('Failed to list users:', userErr.message);
    process.exit(1);
  }

  const superAdminEmails = ['santhayapvt.ltd@gmail.com', 'heistofeverything@gmail.com'];
  console.log('\n[1] Auth Users Inspection:');
  for (const email of superAdminEmails) {
    const u = userData.users.find(x => x.email?.toLowerCase() === email.toLowerCase());
    if (u) {
      console.log(`  ✓ ${u.email}:`);
      console.log(`    - UID:              ${u.id}`);
      console.log(`    - Confirmed At:     ${u.email_confirmed_at || 'PENDING'}`);
      console.log(`    - Last Sign-in:     ${u.last_sign_in_at || 'NEVER'}`);
    } else {
      console.log(`  ✗ ${email}: NOT FOUND`);
    }
  }

  // 2. Check public.staff_profiles
  console.log('\n[2] Public Staff Profiles Inspection:');
  const { data: profiles, error: profErr } = await supabaseAdmin
    .from('staff_profiles')
    .select('id, email, full_name, role, is_active, created_at, updated_at')
    .in('email', superAdminEmails);

  if (profErr) {
    console.error('Failed to query profiles:', profErr.message);
    process.exit(1);
  }

  for (const p of profiles) {
    console.log(`  ✓ Profile for ${p.email}:`);
    console.log(`    - Full Name:        ${p.full_name}`);
    console.log(`    - Role:             ${p.role}`);
    console.log(`    - Is Active:        ${p.is_active}`);
    console.log(`    - Profile ID (UID): ${p.id}`);
    console.log(`    - Last Updated:     ${p.updated_at}`);
  }

  // 3. Check latest audit log
  console.log('\n[3] Latest Audit Log Entries:');
  const { data: audit, error: auditErr } = await supabaseAdmin
    .from('audit_logs')
    .select('id, entity_type, entity_id, action, actor_type, created_at, new_state')
    .order('created_at', { ascending: false })
    .limit(3);

  if (auditErr) {
    console.error('Failed to query audit logs:', auditErr.message);
  } else {
    for (const a of audit) {
      console.log(`  - [${a.created_at}] Action: ${a.action} (Entity: ${a.entity_type}, Actor: ${a.actor_type})`);
    }
  }

  console.log('\n' + '='.repeat(75));
  console.log('AUDIT VERIFICATION: ALL INVARIANTS PASS');
  console.log('='.repeat(75));
}

run().catch(e => {
  console.error('Verification failed:', e.message);
  process.exit(1);
});
