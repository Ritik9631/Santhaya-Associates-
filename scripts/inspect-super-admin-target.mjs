import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const getVar = (n) => {
  const m = env.match(new RegExp(n + '=(.*)'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
};
const adminClient = createClient(getVar('NEXT_PUBLIC_SUPABASE_URL'), getVar('SUPABASE_SERVICE_ROLE_KEY'));

async function inspect() {
  console.log('='.repeat(70));
  console.log('INSPECTING SUPABASE AUTH USERS & STAFF PROFILES');
  console.log('Target Email to Check: santhayapvt.ltd@gmail.com');
  console.log('='.repeat(70));

  // 1. Check all Auth Users
  const { data: authData, error: authErr } = await adminClient.auth.admin.listUsers();
  if (authErr) {
    console.error('Error listing auth users:', authErr);
    return;
  }
  console.log(`\nTotal Supabase Auth Users: ${authData.users.length}`);
  for (const u of authData.users) {
    console.log(`- ID: ${u.id} | Email: ${u.email} | Confirmed: ${u.email_confirmed_at ? 'YES' : 'NO'} | Last Sign In: ${u.last_sign_in_at || 'Never'}`);
  }

  // 2. Check all Staff Profiles
  const { data: profiles, error: profErr } = await adminClient.from('staff_profiles').select('*');
  if (profErr) {
    console.error('Error listing staff profiles:', profErr);
    return;
  }
  console.log(`\nTotal Staff Profiles: ${profiles.length}`);
  for (const p of profiles) {
    console.log(`- ID: ${p.id} | Name: ${p.full_name} | Email: ${p.email} | Role: ${p.role} | Active: ${p.is_active}`);
  }

  // 3. Specifically search for santhayapvt.ltd@gmail.com
  const targetEmail = 'santhayapvt.ltd@gmail.com';
  const matchingAuthUser = authData.users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());
  const matchingProfile = profiles.find(p => p.email?.toLowerCase() === targetEmail.toLowerCase());

  console.log('\n--- TARGET EMAIL STATUS ---');
  console.log(`Email: ${targetEmail}`);
  console.log(`Exists in auth.users: ${matchingAuthUser ? `YES (ID: ${matchingAuthUser.id})` : 'NO'}`);
  console.log(`Exists in staff_profiles: ${matchingProfile ? `YES (ID: ${matchingProfile.id}, Role: ${matchingProfile.role})` : 'NO'}`);

  // 4. Inspect existing super_admin accounts
  const superAdmins = profiles.filter(p => p.role === 'super_admin');
  console.log(`\nTotal existing Super Admin accounts: ${superAdmins.length}`);
  for (const sa of superAdmins) {
    console.log(`- Super Admin: ${sa.full_name} (${sa.email}) [Active: ${sa.is_active}]`);
  }
}

inspect().catch(console.error);

