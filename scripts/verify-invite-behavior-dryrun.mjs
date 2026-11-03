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

async function dryRunInvite() {
  console.log('='.repeat(70));
  console.log('DRY RUN: VERIFYING INVITATION & EMAIL CONFIRMATION STATUS');
  console.log('='.repeat(70));

  const testEmail = `test-temp-probe-${Date.now()}@testprobe.internal`;

  console.log(`\n1. Calling adminClient.auth.admin.generateLink({ type: 'invite', email: '${testEmail}' })...`);
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email: testEmail,
    options: {
      redirectTo: 'http://localhost:3000/staff/login'
    }
  });

  if (linkErr) {
    console.error('generateLink error:', linkErr);
    return;
  }

  const userId = linkData.user.id;
  console.log('   ✓ User created in auth.users with ID:', userId);
  console.log('   ✓ Email confirmed at:', linkData.user.email_confirmed_at);
  console.log('   ✓ Is email confirmed?:', Boolean(linkData.user.email_confirmed_at));

  // Verify in auth.users
  const { data: userRecord, error: userRecordErr } = await adminClient.auth.admin.getUserById(userId);
  if (userRecordErr) throw userRecordErr;
  console.log('   ✓ Database auth.users email_confirmed_at:', userRecord.user.email_confirmed_at);
  console.log('   ✓ Confirmation sent at:', userRecord.user.confirmation_sent_at);
  console.log('   ✓ Recovery / Invite link generated securely: YES (not logged)');

  // Clean up test probe immediately
  console.log('\n2. Cleaning up test probe user from auth.users...');
  const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
  if (delErr) throw delErr;
  console.log('   ✓ Test probe user deleted cleanly. Zero leftover artifacts.');
}

dryRunInvite().catch(console.error);

