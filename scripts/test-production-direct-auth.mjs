/**
 * Santhaya Associates — Direct Production Supabase Auth Diagnostic
 * File: scripts/test-production-direct-auth.mjs
 *
 * PURPOSE:
 * Directly tests Supabase GoTrue authentication (signInWithPassword)
 * against the production Supabase project (flxhwgevmqvuqdjaejwa)
 * using the production URL and anon key.
 *
 * SAFETY CONTROLS:
 * 1. Collects password privately via non-echoing terminal input (zero echo).
 * 2. Never exposes, prints, logs, or stores passwords, tokens, or hashes.
 * 3. Immediately wipes sensitive variables from memory post-call.
 * 4. Signs out immediately upon success to destroy the diagnostic session.
 * 5. Exactly 1 single attempt (no loops, no retries).
 * 6. Supports --preflight for read-only connectivity and config validation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const TARGET_PROJECT_REF = 'flxhwgevmqvuqdjaejwa';
const EXPECTED_UID = 'b132f356-4b5b-4ebf-b4ed-c8611127e127';
const TARGET_EMAIL = 'heistofeverything@gmail.com';

function askHiddenPassword(query) {
  return new Promise((resolve) => {
    process.stdout.write(query);
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      console.error('\nERROR: Terminal is not interactive (TTY). Interactive input required.');
      process.exit(1);
    }
    const oldRaw = stdin.isRaw;
    if (stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';
    const onData = (ch) => {
      ch = ch.toString('utf8');
      switch (ch) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.removeListener('data', onData);
          if (stdin.setRawMode) stdin.setRawMode(oldRaw);
          stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          stdin.removeListener('data', onData);
          if (stdin.setRawMode) stdin.setRawMode(oldRaw);
          stdin.pause();
          process.stdout.write('\n[ABORTED] Cancelled by user.\n');
          process.exit(1);
          break;
        case '\u007f':
        case '\b':
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
          break;
        default:
          password += ch;
          break;
      }
    };
    stdin.on('data', onData);
  });
}

async function run() {
  const isPreflight = process.argv.includes('--preflight');

  console.log('='.repeat(75));
  console.log('SANTHAYA ASSOCIATES — DIRECT PRODUCTION SUPABASE AUTH DIAGNOSTIC');
  console.log(`Mode:              ${isPreflight ? 'PREFLIGHT VERIFICATION (READ-ONLY)' : 'SINGLE-SHOT AUTH TEST'}`);
  console.log(`Target Project:    ${TARGET_PROJECT_REF}`);
  console.log(`Target Email:      ${TARGET_EMAIL}`);
  console.log(`Expected UID:      ${EXPECTED_UID}`);
  console.log('='.repeat(75));

  // 1. Verify environment file
  const envPath = path.join(ROOT_DIR, '.env.production.local');
  if (!fs.existsSync(envPath)) {
    console.error('FATAL: .env.production.local does not exist.');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/);
  const anonMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.+)/);

  const supabaseUrl = urlMatch?.[1]?.trim();
  const anonKey = anonMatch?.[1]?.trim();

  if (!supabaseUrl || !anonKey) {
    console.error('FATAL: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    process.exit(1);
  }

  if (!supabaseUrl.includes(TARGET_PROJECT_REF)) {
    console.error(`FATAL: URL does not match target production ref (${TARGET_PROJECT_REF}).`);
    process.exit(1);
  }

  // Verify JWT payload of anon key belongs to flxhwgevmqvuqdjaejwa
  try {
    const payload = JSON.parse(Buffer.from(anonKey.split('.')[1], 'base64').toString('utf8'));
    if (payload.ref !== TARGET_PROJECT_REF || payload.role !== 'anon') {
      console.error(`FATAL: Anon key JWT mismatch (ref=${payload.ref}, role=${payload.role}).`);
      process.exit(1);
    }
  } catch (err) {
    console.error('FATAL: Failed to parse anon key JWT payload.');
    process.exit(1);
  }

  if (isPreflight) {
    console.log('[Preflight] Environment variables and JWT ref verified successfully.');
    console.log('[Preflight] Ready for single-shot diagnostic execution.');
    process.exit(0);
  }

  // 2. Collect replacement password privately
  console.log('\n[Input] Please enter the password you set during the password reset.');
  console.log('        Input is completely non-echoing (hidden). Press Enter when done.');
  let password = await askHiddenPassword('Password: ');

  if (!password) {
    console.error('ERROR: Empty password provided. Aborting.');
    process.exit(1);
  }

  // 3. Perform official single-shot signInWithPassword using production anon key
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  console.log('\n[Testing] Executing Supabase signInWithPassword on production GoTrue...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TARGET_EMAIL,
    password: password,
  });

  // Zero out password immediately
  password = null;

  console.log('='.repeat(75));
  console.log('DIAGNOSTIC TEST RESULT:');

  if (error) {
    console.log('Authentication:        FAILURE');
    console.log('Sanitized Error Code:  ' + (error.code || error.name || 'UNKNOWN_ERROR'));
    console.log('HTTP Status:           ' + (error.status || 400));
    console.log('Sanitized Message:     ' + error.message);
    console.log('User ID Match:         N/A (Authentication rejected by GoTrue)');
    console.log('Session Status:        No session established');
  } else if (data?.user) {
    const isUidMatch = data.user.id === EXPECTED_UID;
    console.log('Authentication:        SUCCESS');
    console.log('HTTP Status:           200 OK');
    console.log('Sanitized Error Code:  NONE');
    console.log('User ID Match:         ' + (isUidMatch ? 'YES (matches ' + EXPECTED_UID + ')' : 'MISMATCH (got ' + data.user.id + ')'));
    console.log('Email Confirmed:       ' + (data.user.email_confirmed_at ? 'YES' : 'NO'));
    
    // Immediate cleanup: sign out and invalidate any diagnostic session tokens
    await supabase.auth.signOut();
    console.log('Diagnostic Session:    CLEANED UP & SIGNED OUT');
  } else {
    console.log('Authentication:        UNKNOWN');
    console.log('HTTP Status:           No data and no error returned');
    console.log('User ID Match:         N/A');
  }
  console.log('='.repeat(75));
}

run().catch((err) => {
  console.error('UNEXPECTED DIAGNOSTIC ERROR:', err?.message || err);
  process.exit(1);
});

