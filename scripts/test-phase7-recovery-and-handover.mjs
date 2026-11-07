/**
 * Santhaya Associates — Password Recovery & Client Handover Verification Suite
 * File: scripts/test-phase7-recovery-and-handover.mjs
 *
 * Verifies:
 * 1. Canonical App URL resolution (enforcing https://santhayaassociates.com)
 * 2. Self-service password recovery routes & forms (/staff/forgot-password, /staff/auth/callback, /staff/reset-password)
 * 3. Middleware route allowlist for auth recovery
 * 4. Zero password exposure in staff invitation and team management UI
 * 5. Password reset & reinvite action handlers with role-ceiling guards
 * 6. Super Admin dual-onboarding script preflight integrity
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
console.log('SANTHAYA ASSOCIATES — PASSWORD RECOVERY & CLIENT HANDOVER VERIFICATION');
console.log('='.repeat(78));

// 1. CANONICAL APP URL TESTS
console.log('\n[SECTION 1] Canonical App URL Resolution...');
const appUrlModulePath = path.join(ROOT_DIR, 'src', 'lib', 'utils', 'app-url.ts');
runTest('App URL resolver module exists', () => {
  assert(fs.existsSync(appUrlModulePath), 'src/lib/utils/app-url.ts must exist');
});

const appUrlContent = fs.readFileSync(appUrlModulePath, 'utf8');
runTest('App URL strictly enforces https://santhayaassociates.com in production fallback', () => {
  assert(appUrlContent.includes('https://santhayaassociates.com'), 'Must contain production domain fallback');
  assert(appUrlContent.includes('export function getAppUrl'), 'Must export getAppUrl');
});

// 2. ROUTE & COMPONENT VERIFICATION
console.log('\n[SECTION 2] Self-Service Recovery Routes & UI Architecture...');

const forgotPassPage = path.join(ROOT_DIR, 'src', 'app', '(staff-auth)', 'staff', 'forgot-password', 'page.tsx');
const forgotPassForm = path.join(ROOT_DIR, 'src', 'app', '(staff-auth)', 'staff', 'forgot-password', 'ForgotPasswordForm.tsx');
const authCallbackRoute = path.join(ROOT_DIR, 'src', 'app', '(staff-auth)', 'staff', 'auth', 'callback', 'route.ts');
const resetPassPage = path.join(ROOT_DIR, 'src', 'app', '(staff-auth)', 'staff', 'reset-password', 'page.tsx');
const resetPassForm = path.join(ROOT_DIR, 'src', 'app', '(staff-auth)', 'staff', 'reset-password', 'ResetPasswordForm.tsx');
const loginFormPath = path.join(ROOT_DIR, 'src', 'app', '(staff-auth)', 'staff', 'login', 'LoginForm.tsx');

runTest('Forgot Password route & form exist', () => {
  assert(fs.existsSync(forgotPassPage), 'forgot-password/page.tsx must exist');
  assert(fs.existsSync(forgotPassForm), 'forgot-password/ForgotPasswordForm.tsx must exist');
});

runTest('Auth callback route exists and handles PKCE/OTP recovery exchange', () => {
  assert(fs.existsSync(authCallbackRoute), 'staff/auth/callback/route.ts must exist');
  const callbackContent = fs.readFileSync(authCallbackRoute, 'utf8');
  assert(callbackContent.includes('exchangeCodeForSession') || callbackContent.includes('verifyOtp'), 'Must exchange code or verify OTP');
  assert(callbackContent.includes('setAll'), 'Must persist auth cookies via setAll');
  assert(callbackContent.includes('cookiesToSet'), 'Must properly forward cookies to redirect response');
});

runTest('Reset Password route & form exist', () => {
  assert(fs.existsSync(resetPassPage), 'reset-password/page.tsx must exist');
  assert(fs.existsSync(resetPassForm), 'reset-password/ResetPasswordForm.tsx must exist');
  const resetFormContent = fs.readFileSync(resetPassForm, 'utf8');
  assert(resetFormContent.includes('resetStaffPasswordAction'), 'Must invoke resetStaffPasswordAction');
  assert(resetFormContent.includes('name="password"'), 'Must contain password field');
  assert(resetFormContent.includes('name="confirmPassword"'), 'Must contain confirm password field');
});

runTest('Login Form provides accessible link to Forgot Password', () => {
  assert(fs.existsSync(loginFormPath), 'LoginForm.tsx must exist');
  const loginContent = fs.readFileSync(loginFormPath, 'utf8');
  assert(loginContent.includes('/staff/forgot-password'), 'Must link to /staff/forgot-password');
  assert(loginContent.toLowerCase().includes('forgot password'), 'Must display accessible label');
});

// 3. MIDDLEWARE SECURITY ALLOWLIST
console.log('\n[SECTION 3] Middleware Route Protection & Allowlist...');
const middlewarePath = path.join(ROOT_DIR, 'src', 'middleware.ts');
const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');

runTest('Middleware explicitly allows all auth lifecycle routes', () => {
  assert(middlewareContent.includes('/staff/login'), 'Must allow /staff/login');
  assert(middlewareContent.includes('/staff/forgot-password'), 'Must allow /staff/forgot-password');
  assert(middlewareContent.includes('/staff/auth/callback'), 'Must allow /staff/auth/callback');
  assert(middlewareContent.includes('/staff/reset-password'), 'Must allow /staff/reset-password');
});

runTest('Middleware protects authenticated staff routes with getUser()', () => {
  assert(middlewareContent.includes('supabase.auth.getUser()'), 'Must verify cryptographic session with getUser()');
  assert(middlewareContent.includes("matcher: ['/staff/:path*']"), 'Must protect /staff/:path*');
});

// 4. ZERO PASSWORD EXPOSURE IN UI
console.log('\n[SECTION 4] Zero Password Exposure & UI Governance...');
const inviteFormPath = path.join(ROOT_DIR, 'src', 'app', 'staff', 'team', 'invite', 'InviteStaffForm.tsx');
const staffDetailPath = path.join(ROOT_DIR, 'src', 'app', 'staff', 'team', '[id]', 'StaffDetailManager.tsx');

runTest('InviteStaffForm does not display plaintext temporary password', () => {
  const inviteContent = fs.readFileSync(inviteFormPath, 'utf8');
  assert(!inviteContent.includes('result.temporaryPassword'), 'Must not display result.temporaryPassword in UI');
  assert(inviteContent.includes('result.inviteLink'), 'Must support secure single-use inviteLink');
  assert(inviteContent.includes('Zero-Password Exposure') || inviteContent.includes('Zero-Password'), 'Must document zero-password policy');
});

runTest('StaffDetailManager includes Security & Account Recovery Card', () => {
  const detailContent = fs.readFileSync(staffDetailPath, 'utf8');
  assert(detailContent.includes('Security & Account Recovery') || detailContent.includes('Security &amp; Account Recovery'), 'Must render Security card');
  assert(detailContent.includes('sendStaffPasswordResetAction'), 'Must integrate sendStaffPasswordResetAction');
  assert(detailContent.includes('resendStaffInviteAction'), 'Must integrate resendStaffInviteAction');
  assert(detailContent.includes('Send Password Reset Email'), 'Must render reset button');
  assert(detailContent.includes('Resend Setup Invitation'), 'Must render reinvite button');
});

// 5. SERVER ACTION LOGIC & ROLE CEILINGS
console.log('\n[SECTION 5] Backend Server Actions & Privilege Ceilings...');
const recoveryActionsPath = path.join(ROOT_DIR, 'src', 'lib', 'auth', 'recovery-actions.ts');
const staffActionsPath = path.join(ROOT_DIR, 'src', 'lib', 'auth', 'staff-actions.ts');

runTest('Recovery actions implement rate limiting and secure password update', () => {
  assert(fs.existsSync(recoveryActionsPath), 'recovery-actions.ts must exist');
  const recoveryContent = fs.readFileSync(recoveryActionsPath, 'utf8');
  assert(recoveryContent.includes('requestPasswordRecoveryAction'), 'Must export requestPasswordRecoveryAction');
  assert(recoveryContent.includes('resetStaffPasswordAction'), 'Must export resetStaffPasswordAction');
  assert(recoveryContent.includes('rateLimitMap') || recoveryContent.includes('rateLimit'), 'Must include rate limiting defense');
  assert(recoveryContent.includes('audit_logs'), 'Must record audit log on password reset');
});

runTest('Staff actions enforce privilege ceilings on reset and reinvite', () => {
  const staffActionsContent = fs.readFileSync(staffActionsPath, 'utf8');
  assert(staffActionsContent.includes('sendStaffPasswordResetAction'), 'Must export sendStaffPasswordResetAction');
  assert(staffActionsContent.includes('resendStaffInviteAction'), 'Must export resendStaffInviteAction');
  assert(staffActionsContent.includes('Privilege ceiling'), 'Must enforce privilege ceiling checks');
  assert(staffActionsContent.includes('Cannot reset password for a deactivated staff account'), 'Must block resets on suspended accounts');
});

// 6. ONBOARDING SCRIPT PREFLIGHT
console.log('\n[SECTION 6] Company Super Admin Onboarding Utility...');
const onboardingScriptPath = path.join(ROOT_DIR, 'scripts', 'onboard-company-super-admin.mjs');

runTest('Onboarding utility exists and safeguards development database', () => {
  assert(fs.existsSync(onboardingScriptPath), 'scripts/onboard-company-super-admin.mjs must exist');
  const scriptContent = fs.readFileSync(onboardingScriptPath, 'utf8');
  assert(scriptContent.includes('bkqneudnnhvvwmtggorz'), 'Must recognize development project ref to prevent accidental connection');
  assert(scriptContent.includes('flxhwgevmqvuqdjaejwa'), 'Must target production project ref');
  assert(scriptContent.includes('heistofeverything@gmail.com'), 'Must verify existing backup Super Admin');
  assert(scriptContent.includes('santhayapvt.ltd@gmail.com'), 'Must target company Super Admin email');
  assert(scriptContent.includes('--execute'), 'Must require explicit --execute flag');
});

console.log('\n' + '='.repeat(78));
console.log(`TEST SUITE RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
console.log('='.repeat(78));

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
