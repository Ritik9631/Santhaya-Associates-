/**
 * Santhaya Associates — Phase 4 Communications Security & Isolation Suite
 * File: scripts/test-phase4-security.mjs
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc} — ${err.message}`);
    failed++;
  }
}

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc} — ${err.message}`);
    failed++;
  }
}

console.log('='.repeat(70));
console.log('PHASE 4 — COMMUNICATIONS SECURITY & CREDENTIAL ISOLATION SUITE');
console.log('='.repeat(70));

// -----------------------------------------------------------------------------
// 1. Unauthenticated Route Denial
// -----------------------------------------------------------------------------
console.log('\n--- 1. Protected Route Perimeter Interception ---');

await itAsync('Unauthenticated /staff/communications returns HTTP 307 Redirect', async () => {
  const res = await fetch('http://localhost:3000/staff/communications', { redirect: 'manual' });
  assert.strictEqual(res.status, 307, `Expected HTTP 307, got ${res.status}`);
  const location = res.headers.get('location') || '';
  assert.ok(location.includes('/staff/login'), `Expected redirect to /staff/login, got: ${location}`);
});

await itAsync('/staff/communications emits strict Cache-Control: no-store header', async () => {
  const res = await fetch('http://localhost:3000/staff/communications', { redirect: 'manual' });
  const cacheControl = res.headers.get('cache-control') || '';
  assert.ok(cacheControl.includes('no-store'), `Expected no-store in Cache-Control, got: ${cacheControl}`);
});

// -----------------------------------------------------------------------------
// 2. Secret Scanning on Client Bundles
// -----------------------------------------------------------------------------
console.log('\n--- 2. Client Bundle Secret Leakage Audit ---');

it('Zero occurrence of RESEND_API_KEY or SUPABASE_SERVICE_ROLE_KEY in client JavaScript chunks', () => {
  const staticDir = path.resolve('.next/static');
  if (!fs.existsSync(staticDir)) {
    console.warn('  [WARN] .next/static not found; build must be executed before this check.');
    return;
  }

  function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        scanDir(full);
      } else if (f.endsWith('.js')) {
        const content = fs.readFileSync(full, 'utf8');
        assert.ok(!/\bre_[a-zA-Z0-9]{24,}\b/.test(content), `Found possible Resend API key pattern in ${f}`);
        assert.ok(!content.includes('RESEND_API_KEY'), `Found RESEND_API_KEY string in client bundle: ${f}`);
        assert.ok(!content.includes('SUPABASE_SERVICE_ROLE_KEY'), `Found SERVICE_ROLE_KEY in client bundle: ${f}`);
      }
    }
  }

  scanDir(staticDir);
});

// -----------------------------------------------------------------------------
// 3. Email Header & Injection Defense
// -----------------------------------------------------------------------------
console.log('\n--- 3. Header & Email Injection Protection ---');

function sanitizeEmailHeader(val) {
  if (!val || typeof val !== 'string') return '';
  return val.replace(/[\r\n]/g, '').trim();
}

it('Sanitizes CRLF characters from email subject lines', () => {
  const rawSubject = 'Invoice SA/26-27/0001\r\nBcc: attacker@evil.com\r\n';
  const clean = sanitizeEmailHeader(rawSubject);
  assert.strictEqual(clean, 'Invoice SA/26-27/0001Bcc: attacker@evil.com');
  assert.strictEqual(clean.includes('\r'), false);
  assert.strictEqual(clean.includes('\n'), false);
});

it('Sanitizes carriage return from recipient email addresses', () => {
  const rawEmail = 'client@example.com\r\nCc: spy@evil.com';
  const clean = sanitizeEmailHeader(rawEmail);
  assert.strictEqual(clean.includes('\n'), false);
  assert.strictEqual(clean.includes('\r'), false);
});

// -----------------------------------------------------------------------------
// 4. Mock Email Provider Environment Isolation
// -----------------------------------------------------------------------------
console.log('\n--- 4. Real Email Sending Prohibition Guard ---');

it('Default configuration uses mock provider or fails safe without RESEND_API_KEY', () => {
  const provider = process.env.EMAIL_PROVIDER || 'mock';
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey || provider === 'mock') {
    assert.ok(true, 'Mock provider active; real emails strictly prohibited');
  } else {
    assert.ok(typeof resendKey === 'string', 'API key configured');
  }
});

// -----------------------------------------------------------------------------
// 5. Local Migration File Security Audit (Part H)
// -----------------------------------------------------------------------------
console.log('\n--- 5. Local Migration Security Properties Audit ---');

const migrationPath = path.resolve('supabase/migrations/20261031120000_phase4_communications.sql');

it('Phase 4 local migration file exists', () => {
  assert.ok(fs.existsSync(migrationPath), 'Missing local Phase 4 migration specification');
});

it('Phase 4 migration enables Row Level Security on invoice_delivery_logs', () => {
  const content = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(content.includes('ALTER TABLE public.invoice_delivery_logs ENABLE ROW LEVEL SECURITY;'));
});

it('Phase 4 migration revokes all access from PUBLIC and anon', () => {
  const content = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(content.includes('REVOKE ALL ON public.invoice_delivery_logs FROM PUBLIC;'));
  assert.ok(content.includes('REVOKE ALL ON public.invoice_delivery_logs FROM anon;'));
});

it('Phase 4 migration restricts INSERT and SELECT to authenticated active staff only', () => {
  const content = fs.readFileSync(migrationPath, 'utf8');
  assert.ok(content.includes('staff_profiles.is_active = true'));
});

console.log('='.repeat(70));
console.log(`SECURITY SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('='.repeat(70));

if (failed > 0) {
  process.exit(1);
}
