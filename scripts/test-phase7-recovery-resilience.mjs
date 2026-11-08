/**
 * Santhaya Associates — Password Recovery Resilience & Anti-Prefetching Test Suite
 * File: scripts/test-phase7-recovery-resilience.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
    failedTests++;
  }
}

console.log('='.repeat(78));
console.log('SANTHAYA ASSOCIATES — RECOVERY RESILIENCE & ANTI-PREFETCH VERIFICATION');
console.log('='.repeat(78));

// 1. CALLBACK ROUTE RESILIENCE
console.log('\n[SECTION 1] Auth Callback Route (/staff/auth/callback)...');
const callbackPath = path.join(ROOT_DIR, 'src', 'app', '(staff-auth)', 'staff', 'auth', 'callback', 'route.ts');
const callbackContent = fs.readFileSync(callbackPath, 'utf8');

runTest('Callback intercepts explicit Supabase errors and redirects to expired alert', () => {
  assert(callbackContent.includes('error='), 'Must check error query param');
  assert(callbackContent.includes('/staff/forgot-password?error=expired'), 'Must redirect to expired alert');
});

runTest('Callback forwards token_hash to reset-password without burning token on GET', () => {
  assert(callbackContent.includes('tokenHash'), 'Must check tokenHash');
  assert(callbackContent.includes('/staff/reset-password'), 'Must forward to /staff/reset-password');
  // Confirm verifyOtp is NOT called inside callback on GET (prevents prefetch burning)
  assert(!callbackContent.includes('supabase.auth.verifyOtp'), 'Must NOT call verifyOtp on GET in callback');
});

runTest('Callback returns HTML client bridge to capture implicit grant hash fragments', () => {
  assert(callbackContent.includes('window.location.hash'), 'Must inspect window.location.hash');
  assert(callbackContent.includes('access_token='), 'Must handle access_token in hash');
  assert(callbackContent.includes('otp_expired'), 'Must handle otp_expired in hash');
});

// 2. RESET PASSWORD FORM & SERVER ACTION
console.log('\n[SECTION 2] Reset Password Form & Server Action...');
const resetFormPath = path.join(ROOT_DIR, 'src', 'app', '(staff-auth)', 'staff', 'reset-password', 'ResetPasswordForm.tsx');
const resetFormContent = fs.readFileSync(resetFormPath, 'utf8');
const recoveryActionsPath = path.join(ROOT_DIR, 'src', 'lib', 'auth', 'recovery-actions.ts');
const recoveryActionsContent = fs.readFileSync(recoveryActionsPath, 'utf8');

runTest('ResetPasswordForm renders when tokenHash prop is supplied', () => {
  assert(resetFormContent.includes('initialTokenHash'), 'Must accept initialTokenHash');
  assert(resetFormContent.includes('name="tokenHash"'), 'Must submit tokenHash in hidden field');
});

runTest('ResetPasswordForm hydrates client session from URL hash if present', () => {
  assert(resetFormContent.includes('window.location.hash'), 'Must check client hash');
  assert(resetFormContent.includes('setSession'), 'Must hydrate session via setSession');
});

runTest('resetStaffPasswordAction verifies token_hash during human form submit', () => {
  assert(recoveryActionsContent.includes('tokenHash'), 'Must read tokenHash from formData');
  assert(recoveryActionsContent.includes('verifyOtp'), 'Must execute verifyOtp on POST submit');
  assert(recoveryActionsContent.includes('updateUser'), 'Must execute updateUser with new password');
  assert(recoveryActionsContent.includes('signOut'), 'Must sign out temporary session upon completion');
});

// 3. STAFF ACTIONS DIRECT SETUP LINKS
console.log('\n[SECTION 3] Direct Scanner-Safe Links in Staff Actions...');
const staffActionsPath = path.join(ROOT_DIR, 'src', 'lib', 'auth', 'staff-actions.ts');
const staffActionsContent = fs.readFileSync(staffActionsPath, 'utf8');

runTest('Staff actions prioritize hashed_token for direct scanner-safe link generation', () => {
  assert(staffActionsContent.includes('linkData?.properties?.hashed_token'), 'Must check hashed_token');
  assert(staffActionsContent.includes('/staff/reset-password?token_hash='), 'Must build direct link to /staff/reset-password');
});

// 4. SECURITY & EXPOSURE CONTROLS
console.log('\n[SECTION 4] Security Invariants & Git Protection...');
const gitignorePath = path.join(ROOT_DIR, '.gitignore');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

runTest('.setup-link.local.txt is strictly gitignored', () => {
  assert(gitignoreContent.includes('.setup-link.local.txt'), 'Must contain .setup-link.local.txt');
  assert(gitignoreContent.includes('*.local.txt'), 'Must contain *.local.txt');
});

runTest('Generate company setup link script does not print secrets to stdout', () => {
  const genScriptPath = path.join(ROOT_DIR, 'scripts', 'generate-company-setup-link.mjs');
  const genScriptContent = fs.readFileSync(genScriptPath, 'utf8');
  assert(!genScriptContent.includes('console.log(directSetupLink)'), 'Must not console.log directSetupLink');
  assert(genScriptContent.includes('.setup-link.local.txt'), 'Must save to local file');
});

console.log('\n' + '='.repeat(78));
console.log(`TEST SUITE RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
console.log('='.repeat(78));

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
