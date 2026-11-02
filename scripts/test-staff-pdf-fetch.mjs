import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const getVar = (name) => {
  const m = env.match(new RegExp(name + '=(.*)'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
};

const client = createClient(getVar('NEXT_PUBLIC_SUPABASE_URL'), getVar('SUPABASE_SERVICE_ROLE_KEY'));

const anonClient = createClient(getVar('NEXT_PUBLIC_SUPABASE_URL'), getVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

async function test() {
  const { data: linkData, error: linkErr } = await client.auth.admin.generateLink({
    type: 'magiclink',
    email: 'heistofeverything@gmail.com'
  });
  if (linkErr) {
    console.error('linkErr:', linkErr);
    return;
  }
  const token_hash = linkData.properties.hashed_token;
  const { data: verifyData, error: verifyErr } = await anonClient.auth.verifyOtp({
    token_hash,
    type: 'magiclink'
  });
  if (verifyErr) {
    console.error('verifyErr:', verifyErr);
    return;
  }
  console.log('Session established:', verifyData.session ? 'YES' : 'NO');
  if (verifyData.session) {
    const projectRef = 'bkqneudnnhvvwmtggorz';
    const cookieName = `sb-${projectRef}-auth-token`;
    const sessionStr = JSON.stringify(verifyData.session);
    const base64Session = Buffer.from(sessionStr).toString('base64');
    const cookieVal = `base64-${base64Session}`;

    // Test fetch with cookie
    const res = await fetch('http://localhost:3000/staff/quotations/44abdc35-2d0f-4fbf-ac9e-05dd40c4ea2d/pdf', {
      headers: {
        Cookie: `${cookieName}=${cookieVal};`,
      },
      redirect: 'manual',
    });
    console.log('HTTP response status:', res.status);
    console.log('Location header:', res.headers.get('location'));
    const text = await res.text();
    console.log('Response body contains QT-2026-27-005:', text.includes('QT-2026-27-005'));
    console.log('Response body contains Vishal Traders:', text.includes('Vishal Traders'));
  }
}

test().catch(console.error);
