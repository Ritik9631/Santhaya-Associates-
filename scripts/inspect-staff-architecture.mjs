import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// Load .env.local
const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envLocal.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function inspect() {
  console.log('='.repeat(70));
  console.log('SANTHAYA ASSOCIATES — STAFF ARCHITECTURE & AUTH INSPECTION');
  console.log('Target Sandbox:', supabaseUrl);
  console.log('='.repeat(70));

  // 1. Inspect auth.users
  const { data: usersData, error: usersErr } = await adminClient.auth.admin.listUsers();
  if (usersErr) throw usersErr;
  console.log(`\n1. Existing auth.users (${usersData.users.length}):`);
  usersData.users.forEach(u => {
    console.log(`   - ID: ${u.id}`);
    console.log(`     Email: ${u.email}`);
    console.log(`     Email Confirmed At: ${u.email_confirmed_at}`);
    console.log(`     Created At: ${u.created_at}`);
    console.log(`     Last Sign In: ${u.last_sign_in_at}`);
    console.log(`     App Metadata:`, u.app_metadata);
    console.log(`     User Metadata:`, u.user_metadata);
  });

  // 2. Inspect staff_profiles
  const { data: profiles, error: profErr } = await adminClient
    .from('staff_profiles')
    .select('*');
  if (profErr) throw profErr;
  console.log(`\n2. Existing staff_profiles (${profiles.length}):`);
  profiles.forEach(p => {
    console.log(`   - ID: ${p.id}`);
    console.log(`     Email: ${p.email}`);
    console.log(`     Name: ${p.full_name}`);
    console.log(`     Role: ${p.role}`);
    console.log(`     Active: ${p.is_active}`);
    console.log(`     Created At: ${p.created_at}`);
    console.log(`     Updated At: ${p.updated_at}`);
  });

  // 3. Inspect audit_logs schema & recent entries
  const { data: logs, error: logsErr } = await adminClient
    .from('audit_logs')
    .select('*')
    .eq('entity_type', 'staff_profiles')
    .order('created_at', { ascending: false })
    .limit(5);
  if (logsErr) throw logsErr;
  console.log(`\n3. Recent staff_profiles audit_logs (${logs.length}):`);
  logs.forEach(l => {
    console.log(`   - Action: ${l.action} | Entity: ${l.entity_id} | Actor: ${l.actor_id} | At: ${l.created_at}`);
    console.log(`     New State:`, l.new_state);
  });

  // 4. Check if santhayapvt.ltd@gmail.com exists anywhere
  const targetEmail = 'santhayapvt.ltd@gmail.com';
  const userExists = usersData.users.some(u => u.email === targetEmail);
  const profileExists = profiles.some(p => p.email === targetEmail);
  console.log(`\n4. Target User Status (${targetEmail}):`);
  console.log(`   - Exists in auth.users: ${userExists ? 'YES' : 'NO'}`);
  console.log(`   - Exists in staff_profiles: ${profileExists ? 'YES' : 'NO'}`);
}

inspect().catch(console.error);

