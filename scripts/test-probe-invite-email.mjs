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

async function dryRunInviteUserByEmail() {
  const testEmail = `probe-invite-${Date.now()}@example.com`;
  console.log(`Testing inviteUserByEmail('${testEmail}')...`);
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(testEmail);
  if (error) {
    console.log('inviteUserByEmail returned error:', error.message);
  } else {
    console.log('inviteUserByEmail succeeded! User ID:', data.user.id);
    console.log('Email confirmed at:', data.user.email_confirmed_at);
    await adminClient.auth.admin.deleteUser(data.user.id);
    console.log('Deleted probe user.');
  }
}

dryRunInviteUserByEmail().catch(console.error);

