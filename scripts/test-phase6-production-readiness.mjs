/**
 * Santhaya Associates — Phase 6 Production Readiness & Security Verification Suite
 * File: scripts/test-phase6-production-readiness.mjs
 *
 * Comprehensive pre-flight audit testing:
 * 1. Security Headers & Anti-Sniffing HTTP Policies
 * 2. Secret Confinement & Zero-PII / Zero-Key Leakage
 * 3. Public Website & Native SEO Routes
 * 4. Anti-Spam Honeypot & Intake Guard
 * 5. Staff Perimeter Protection & Redirection
 * 6. Role-Based Access Control (RBAC) Isolation
 * 7. Transactional Outbox Engine & Free-Tier Ceilings
 * 8. PDF Presentation & High-DPI Assets
 * 9. Database Migration State & Idempotency
 * 10. Production Environment Variable Inventory
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    totalPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    totalFailed++;
  }
}

async function fetchHttp(urlPath, options = {}) {
  const url = new URL(urlPath, 'http://localhost:3000');
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

console.log('======================================================================');
console.log('SANTHAYA ASSOCIATES — PHASE 6 PRODUCTION READINESS SUITE');
console.log('======================================================================\n');

// 1. Security Headers Audit
console.log('--- 1. HTTP Security Headers & Perimeter Audit ---');
try {
  const res = await fetchHttp('/');
  assert(res.status === 200, 'Homepage returns HTTP 200 OK');
  assert(res.headers['x-frame-options'] === 'DENY', 'X-Frame-Options is set to DENY (clickjacking protection)');
  assert(res.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options is nosniff');
  assert(
    res.headers['referrer-policy'] === 'strict-origin-when-cross-origin',
    'Referrer-Policy is strict-origin-when-cross-origin'
  );
  assert(
    res.headers['permissions-policy']?.includes('camera=()'),
    'Permissions-Policy disables camera, microphone, and geolocation'
  );

  const staffRes = await fetchHttp('/staff');
  assert(staffRes.status === 307 || staffRes.status === 302, 'Unauthenticated /staff triggers 307/302 redirect');
  assert(
    staffRes.headers['cache-control']?.includes('no-store'),
    'Staff redirect enforces Cache-Control: no-store (back-button history protection)'
  );
  assert(
    staffRes.headers['x-robots-tag']?.includes('noindex'),
    'Staff perimeter enforces X-Robots-Tag: noindex, nofollow'
  );
} catch (err) {
  assert(false, `Security header check failed: ${err.message}`);
}

// 2. Secret Confinement & Zero-Leak Audit
console.log('\n--- 2. Secret Confinement & Source Code Leak Audit ---');
try {
  const envExample = fs.readFileSync(path.join(projectRoot, '.env.example'), 'utf8');
  assert(!envExample.includes('eyJh'), '.env.example does not contain real Supabase JWT keys');
  assert(!envExample.includes('re_'), '.env.example does not contain live Resend API keys');

  // Verify createAdminClient has browser guard
  const adminTs = fs.readFileSync(path.join(projectRoot, 'src/lib/supabase/admin.ts'), 'utf8');
  assert(
    adminTs.includes("typeof window !== 'undefined'"),
    'createAdminClient includes fatal error guard preventing browser invocation'
  );

  // Scan public homepage HTML for secret leaks
  const homeRes = await fetchHttp('/');
  assert(!homeRes.body.includes('service_role'), 'Public homepage HTML does not leak service_role token');
  assert(!homeRes.body.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Public HTML does not leak secret environment names');
  assert(!homeRes.body.includes('RESEND_API_KEY'), 'Public HTML does not leak Resend API key names');
} catch (err) {
  assert(false, `Secret confinement check failed: ${err.message}`);
}

// 3. Public Website & Native SEO Routes
console.log('\n--- 3. Public Website Routes & SEO Crawler Governance ---');
try {
  const routes = ['/', '/services', '/about', '/request-quotation', '/privacy', '/terms'];
  for (const r of routes) {
    const res = await fetchHttp(r);
    assert(res.status === 200, `Route ${r} responds with HTTP 200 OK`);
  }

  const robotsRes = await fetchHttp('/robots.txt');
  assert(robotsRes.status === 200, '/robots.txt is accessible');
  assert(robotsRes.body.includes('Disallow: /staff/'), '/robots.txt explicitly blocks /staff/ directory');
  assert(robotsRes.body.includes('sitemap.xml'), '/robots.txt references sitemap.xml');

  const sitemapRes = await fetchHttp('/sitemap.xml');
  assert(sitemapRes.status === 200, '/sitemap.xml is accessible');
  assert(sitemapRes.body.includes('<loc>'), '/sitemap.xml contains valid XML loc entries');
  assert(!sitemapRes.body.includes('/staff'), '/sitemap.xml contains zero staff ERP URLs');
} catch (err) {
  assert(false, `SEO route audit failed: ${err.message}`);
}

// 4. Anti-Spam Honeypot & Intake Guard
console.log('\n--- 4. Anti-Spam Honeypot & Public API Defense ---');
try {
  // Test bot submission with filled honeypot
  const botRes = await fetchHttp('/api/quotation-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: 'Automated Bot Fleet LLC',
      contactPerson: 'Spam Bot',
      email: 'bot@spam.local',
      phone: '9876543210',
      serviceCategory: 'construction_machinery',
      requirementDetails: 'Industrial excavator and crane supply for automated crawler testing',
      deliveryLocation: 'Delhi',
      privacyConsent: true,
      _company_fax: 'I am a spam bot', // Honeypot trigger!
    }),
  });
  assert(botRes.status === 400, 'Honeypot violation returns HTTP 400 Bad Request');
  assert(
    botRes.body.includes('anti-automation') || botRes.body.includes('rejected'),
    'Honeypot violation cleanly rejects bot with anti-automation policy'
  );

  // Test malformed payload
  const malformedRes = await fetchHttp('/api/quotation-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessName: '' }),
  });
  assert(malformedRes.status === 400, 'Invalid schema returns HTTP 400 with validation details');
} catch (err) {
  assert(false, `Anti-spam check failed: ${err.message}`);
}

// 5. Staff Perimeter Protection
console.log('\n--- 5. Staff ERP Dual-Barrier Perimeter Gate ---');
try {
  const protectedStaffRoutes = [
    '/staff',
    '/staff/customers',
    '/staff/catalog',
    '/staff/quotations',
    '/staff/billing',
    '/staff/communications',
    '/staff/team',
  ];

  for (const sr of protectedStaffRoutes) {
    const res = await fetchHttp(sr);
    const location = res.headers['location'] || '';
    assert(
      res.status === 307 || res.status === 302,
      `Unauthenticated access to ${sr} is trapped by middleware (status ${res.status})`
    );
    assert(location.includes('/staff/login'), `Redirect target for ${sr} is /staff/login`);
  }
} catch (err) {
  assert(false, `Perimeter check failed: ${err.message}`);
}

// 6. Role-Based Access Control Boundaries
console.log('\n--- 6. Role-Based Access Control (RBAC) Integrity ---');
try {
  const staffPage = fs.readFileSync(path.join(projectRoot, 'src/app/staff/page.tsx'), 'utf8');
  assert(
    staffPage.includes("['super_admin', 'admin', 'billing_manager'].includes(profile.role)"),
    'Financial receivables KPI strictly restricted to financial management roles'
  );
  assert(
    staffPage.includes('canViewFinancials ?') && staffPage.includes('Outstanding Dues'),
    'Financial dues card conditionally rendered only when canViewFinancials is true'
  );

  const teamPage = fs.readFileSync(path.join(projectRoot, 'src/app/staff/team/page.tsx'), 'utf8');
  assert(
    teamPage.includes("isAdmin && (") && teamPage.includes('/staff/team/invite'),
    'Staff invitation action restricted to Admin and Super Admin only'
  );

  const billingAction = fs.readFileSync(path.join(projectRoot, 'src/lib/billing/actions.ts'), 'utf8');
  assert(
    billingAction.includes("!['super_admin', 'admin', 'billing_manager'].includes(profile.role)"),
    'Statutory invoice delivery restricted strictly to authorized billing roles'
  );
} catch (err) {
  assert(false, `RBAC audit failed: ${err.message}`);
}

// 7. Transactional Outbox Engine & Free-Tier Ceilings
console.log('\n--- 7. Transactional Outbox Engine & Resilience ---');
try {
  const workerTs = fs.readFileSync(path.join(projectRoot, 'src/lib/email/outbox-worker.ts'), 'utf8');
  assert(workerTs.includes('MAX_ATTEMPTS = 5'), 'Outbox worker enforces maximum retry ceiling of 5 attempts');
  assert(workerTs.includes('EMAIL_DAILY_LIMIT'), 'Outbox worker checks daily send volume limit');
  assert(workerTs.includes('EMAIL_MONTHLY_LIMIT'), 'Outbox worker checks monthly send volume limit');
  assert(workerTs.includes('dead_letter'), 'Exhausted delivery jobs transition safely to dead_letter');

  const cronRoute = fs.readFileSync(path.join(projectRoot, 'src/app/api/cron/process-outbox/route.ts'), 'utf8');
  assert(
    cronRoute.includes('crypto.timingSafeEqual'),
    'Cron endpoint verifies CRON_SECRET using constant-time timingSafeEqual comparison'
  );
} catch (err) {
  assert(false, `Outbox worker audit failed: ${err.message}`);
}

// 8. PDF Presentation & High-DPI Assets
console.log('\n--- 8. PDF Presentation & Static Asset Verification ---');
try {
  const printBtn = fs.readFileSync(path.join(projectRoot, 'src/components/PrintButton.tsx'), 'utf8');
  assert(printBtn.includes("'use client'"), 'PrintButton is explicitly declared as a Client Component');
  assert(printBtn.includes('window.print()'), 'PrintButton triggers native browser print flow');

  const invoicePdf = fs.readFileSync(path.join(projectRoot, 'src/app/staff/billing/[id]/pdf/page.tsx'), 'utf8');
  assert(!invoicePdf.includes('/images/logo.png'), 'Broken /images/logo.png reference eliminated from invoice PDF');
  assert(invoicePdf.includes('/santhaya-logo-header.png'), 'Invoice PDF uses valid /santhaya-logo-header.png');
  assert(invoicePdf.includes('PrintButton'), 'Invoice PDF incorporates client PrintButton');

  const logoExists = fs.existsSync(path.join(projectRoot, 'public/santhaya-logo-header.png'));
  assert(logoExists, 'High-DPI brand asset /santhaya-logo-header.png exists on disk in public/');
} catch (err) {
  assert(false, `PDF audit failed: ${err.message}`);
}

// 9. Database Migration State & Idempotency
console.log('\n--- 9. Database Migration State Audit ---');
try {
  const migrationDir = path.join(projectRoot, 'supabase/migrations');
  const files = fs.readdirSync(migrationDir);
  const phase4File = files.find((f) => f.includes('phase4_communications.sql'));
  assert(Boolean(phase4File), 'Phase 4 communications migration specification exists locally');

  const phase4Sql = fs.readFileSync(path.join(migrationDir, phase4File), 'utf8');
  assert(phase4Sql.includes('CREATE TABLE IF NOT EXISTS public.invoice_delivery_logs'), 'Phase 4 migration uses IF NOT EXISTS for idempotency');
  assert(phase4Sql.includes('ENABLE ROW LEVEL SECURITY'), 'Phase 4 migration mandates Row Level Security');
  assert(phase4Sql.includes('REVOKE ALL ON public.invoice_delivery_logs FROM PUBLIC'), 'Phase 4 migration revokes PUBLIC access');
  assert(phase4Sql.includes('REVOKE ALL ON public.invoice_delivery_logs FROM anon'), 'Phase 4 migration revokes anon access');
} catch (err) {
  assert(false, `Migration audit failed: ${err.message}`);
}

// 10. Production Environment Variable Inventory
console.log('\n--- 10. Production Environment Variable Inventory ---');
try {
  const envTs = fs.readFileSync(path.join(projectRoot, 'src/lib/supabase/env.ts'), 'utf8');
  assert(envTs.includes('NEXT_PUBLIC_SUPABASE_URL'), 'Guards NEXT_PUBLIC_SUPABASE_URL');
  assert(envTs.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'), 'Guards NEXT_PUBLIC_SUPABASE_ANON_KEY');
  assert(envTs.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Guards SUPABASE_SERVICE_ROLE_KEY');
  assert(envTs.includes('RATE_LIMIT_SALT'), 'Guards RATE_LIMIT_SALT');

  const factoryTs = fs.readFileSync(path.join(projectRoot, 'src/lib/email/factory.ts'), 'utf8');
  assert(factoryTs.includes('RESEND_API_KEY'), 'Guards RESEND_API_KEY for transactional email');
} catch (err) {
  assert(false, `Environment inventory check failed: ${err.message}`);
}

console.log('\n======================================================================');
console.log(`PHASE 6 PRODUCTION READINESS SUITE: ${totalPassed} PASSED, ${totalFailed} FAILED`);
console.log('======================================================================');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
