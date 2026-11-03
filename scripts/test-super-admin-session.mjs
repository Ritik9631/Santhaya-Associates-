import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

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

const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testSuperAdminSession() {
  console.log('='.repeat(70));
  console.log('VERIFYING EXISTING SUPER ADMIN AUTHORIZED CALLER STATUS');
  console.log('='.repeat(70));

  // 1. Establish session for existing Super Admin
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'heistofeverything@gmail.com'
  });
  if (linkErr) throw linkErr;

  const { data: authData, error: verifyErr } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  });
  if (verifyErr) throw verifyErr;

  const userClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    }
  });

  // 2. Check is_super_admin() RPC
  const { data: isSuper, error: superErr } = await userClient.rpc('is_super_admin');
  console.log('Caller User ID:     ', authData.user.id);
  console.log('Caller Email:       ', authData.user.email);
  console.log('is_super_admin() RPC:', isSuper, superErr ? `(Error: ${superErr.message})` : '✓ SUCCESS');

  // 3. Check staff_profiles access via RLS
  const { data: profiles, error: profErr } = await userClient.from('staff_profiles').select('*');
  console.log('Can read staff_profiles via RLS:', Boolean(profiles), profErr ? `(Error: ${profErr.message})` : `✓ Found ${profiles.length} profiles`);
}

testSuperAdminSession().catch(console.error);

