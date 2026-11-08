/**
 * Santhaya Associates — Password Recovery Diagnostics
 * File: scripts/diagnose-recovery-links.mjs
 *
 * Inspects Supabase GoTrue recovery link generation properties
 * without exposing sensitive tokens or credentials.
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
  console.log('SANTHAYA ASSOCIATES — RECOVERY LINK STRUCTURE DIAGNOSTIC');
  console.log(`Target Project: ${TARGET_PROJECT_REF}`);
  console.log('='.repeat(75));

  const email = 'santhayapvt.ltd@gmail.com';
  const redirectTo = 'https://santhayaassociates.com/staff/auth/callback?next=/staff/reset-password';

  console.log(`\nTesting generateLink({ type: 'recovery' }) for ${email}...`);
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  });

  if (error) {
    console.error('generateLink error:', error.message);
    process.exit(1);
  }

  const props = data.properties || {};
  console.log('Properties keys present:', Object.keys(props));
  console.log('Verification type:      ', props.verification_type);
  console.log('Has action_link:        ', Boolean(props.action_link));
  console.log('Has hashed_token:       ', Boolean(props.hashed_token));
  console.log('Has email_otp:          ', Boolean(props.email_otp));
  
  if (props.action_link) {
    try {
      const parsedUrl = new URL(props.action_link);
      console.log('Action Link Hostname:   ', parsedUrl.hostname);
      console.log('Action Link Path:       ', parsedUrl.pathname);
      console.log('Action Link Query Params:');
      for (const [key, value] of parsedUrl.searchParams.entries()) {
        if (key === 'token') {
          console.log(`  - ${key}: [MASKED, length=${value.length}]`);
        } else {
          console.log(`  - ${key}: ${value}`);
        }
      }
    } catch (e) {
      console.log('Unable to parse action_link:', e.message);
    }
  }

  if (props.hashed_token) {
    console.log(`Hashed Token Length:     ${props.hashed_token.length} chars (Available for direct token_hash routing)`);
  }

  console.log('\n' + '='.repeat(75));
  console.log('DIAGNOSTIC COMPLETE');
  console.log('='.repeat(75));
}

run().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
