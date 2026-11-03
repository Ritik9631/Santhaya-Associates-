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

async function inspectInviteMechanism() {
  console.log('='.repeat(70));
  console.log('INSPECTING SUPABASE AUTH INVITATION & EMAIL VERIFICATION MECHANISM');
  console.log('='.repeat(70));

  console.log('Target Email:', 'santhayapvt.ltd@gmail.com');
  console.log('Supabase URL:', env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Project Ref: ', env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').split('.')[0]);

  // Check how generateLink({ type: 'invite' }) works with unverified emails
  // We can check with a dummy test email that we then delete immediately to verify behavior
  console.log('\nTesting generateLink vs inviteUserByEmail API signatures...');
  console.log('Signature adminClient.auth.admin.inviteUserByEmail: ', typeof adminClient.auth.admin.inviteUserByEmail);
  console.log('Signature adminClient.auth.admin.generateLink:        ', typeof adminClient.auth.admin.generateLink);
}

inspectInviteMechanism().catch(console.error);

