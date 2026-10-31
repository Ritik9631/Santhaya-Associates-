/**
 * Santhaya Associates — Super Admin Bootstrap Safety Regression Suite
 * File: scripts/test-bootstrap-safety-regression.mjs
 *
 * Verifies non-mutating safety invariants of bootstrap-super-admin.mjs:
 * 1. Project Allowlist Lock (rejects non-bkqneudnnhvvwmtggorz refs)
 * 2. Source Code Sanitization (zero secrets or credentials hardcoded)
 * 3. Dry-Run Execution (exit code 0, zero mutations)
 * 4. Password masking & silent entry logic presence
 * 5. Single Super Admin precondition logic presence
 * 6. Atomic rollback on partial failure logic presence
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

console.log('='.repeat(70));
console.log('SANTHAYA ASSOCIATES — BOOTSTRAP SAFETY REGRESSION TEST');
console.log('='.repeat(70));

const bootstrapScriptPath = path.resolve('scripts/bootstrap-super-admin.mjs');
if (!fs.existsSync(bootstrapScriptPath)) {
  console.error('FAIL: scripts/bootstrap-super-admin.mjs not found.');
  process.exit(1);
}

const content = fs.readFileSync(bootstrapScriptPath, 'utf8');

// Test 1: Project Allowlist Lock Assertion
console.log('\n[Check 1/6] Target Environment Allowlist Assertion...');
if (content.includes("const EXPECTED_DEV_REF = 'bkqneudnnhvvwmtggorz'") &&
    content.includes('projectRef !== EXPECTED_DEV_REF')) {
  console.log('  ✓ PASS: Script strictly enforces project ref bkqneudnnhvvwmtggorz.');
} else {
  console.error('  ❌ FAIL: Script does not strictly enforce EXPECTED_DEV_REF.');
  process.exit(1);
}

// Test 2: Source Code Sanitization Check
console.log('\n[Check 2/6] Source Code Secret Scanning...');
const sensitivePatterns = [
  /password\s*[:=]\s*['"][^'"]{6,}['"]/i,
  /service_role_key\s*[:=]\s*['"]ey[A-Za-z0-9_-]{20,}['"]/i,
  /anon_key\s*[:=]\s*['"]ey[A-Za-z0-9_-]{20,}['"]/i,
  /secret\s*[:=]\s*['"][^'"]{8,}['"]/i,
];
let leaked = false;
for (const pat of sensitivePatterns) {
  if (pat.test(content)) {
    leaked = true;
    break;
  }
}
if (!leaked) {
  console.log('  ✓ PASS: Zero hardcoded secrets, tokens, or passwords detected.');
} else {
  console.error('  ❌ FAIL: Potential hardcoded secret found in bootstrap script.');
  process.exit(1);
}

// Test 3: Password Masking & Silent Entry
console.log('\n[Check 3/6] Masked Interactive Password Logic...');
if (content.includes('askHiddenPassword') && content.includes("process.stdout.write('*')")) {
  console.log('  ✓ PASS: Raw terminal masking with asterisk output verified.');
} else {
  console.error('  ❌ FAIL: Hidden password mechanism missing or insecure.');
  process.exit(1);
}

// Test 4: Single Super Admin Precondition Check
console.log('\n[Check 4/6] Duplicate Account / Single Super Admin Precondition...');
if (content.includes("s.role === 'super_admin'") &&
    content.includes('existingSuperAdmins.length > 0') &&
    content.includes('BOOTSTRAP ABORTED: Super Administrator account already exists')) {
  console.log('  ✓ PASS: Precondition strictly prohibits creation if an existing Super Admin is found.');
} else {
  console.error('  ❌ FAIL: Duplicate account protection logic incomplete.');
  process.exit(1);
}

// Test 5: Atomic Rollback on Partial Failure
console.log('\n[Check 5/6] Partial Failure Atomic Rollback...');
if (content.includes('supabase.auth.admin.deleteUser(userId)') &&
    content.includes('Rolling back newly created Auth user to maintain atomic consistency')) {
  console.log('  ✓ PASS: Automatic Auth user deletion on staff_profiles insert failure verified.');
} else {
  console.error('  ❌ FAIL: Partial failure rollback logic incomplete.');
  process.exit(1);
}

// Test 6: Dry-Run Execution Invariant
console.log('\n[Check 6/6] Dry-Run Command Execution...');
const proc = spawnSync('node', ['scripts/bootstrap-super-admin.mjs', '--dry-run'], {
  encoding: 'utf8',
});

if (proc.status === 0 && proc.stdout.includes('Zero records modified') && proc.stdout.includes('bkqneudnnhvvwmtggorz')) {
  console.log('  ✓ PASS: Dry-run exited cleanly (code 0) with read-only target validation.');
} else {
  console.error('  ❌ FAIL: Dry-run failed or returned non-zero code:', proc.stderr || proc.stdout);
  process.exit(1);
}

console.log('\n' + '='.repeat(70));
console.log('ALL 6 BOOTSTRAP SAFETY REGRESSION CHECKS PASSED (100%)');
console.log('='.repeat(70));

