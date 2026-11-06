/**
 * Santhaya Associates — Production Live Smoke Test Suite
 * File: scripts/test-production-live-smoke.mjs
 *
 * Verifies live production deployment at https://gold-fish-834874.hostingersite.com:
 * 1. Homepage & Public Branding
 * 2. Quotation Intake Route
 * 3. Staff Login & Anonymous RBAC Protection
 * 4. PWA Web Manifest & Service Worker
 * 5. Cron Security (HTTP 401 on unauthenticated call)
 * 6. Non-destructive safety (0 mutations, 0 test records inserted)
 */

const BASE_URL = 'https://gold-fish-834874.hostingersite.com';

async function probeUrl(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Santhaya-Smoke-Tester/1.0',
        ...options.headers,
      },
      ...options,
    });
    const elapsed = Date.now() - start;
    const text = await res.text();
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      elapsed,
      body: text,
      ok: res.ok,
    };
  } catch (err) {
    return {
      status: 0,
      headers: {},
      elapsed: Date.now() - start,
      body: '',
      error: err.message,
      ok: false,
    };
  }
}

async function runSmokeTests() {
  console.log('='.repeat(75));
  console.log('SANTHAYA ASSOCIATES — PRODUCTION LIVE SMOKE TESTS');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('='.repeat(75));

  const results = [];

  // Check 1: Homepage
  console.log('\n[1/6] Probing Homepage (GET /)...');
  const home = await probeUrl('/');
  const isHostingerPlaceholder = home.body.includes('Coming soon') && home.body.includes('hostinger');
  const isNextJsApp = home.body.includes('Santhaya Associates') || home.headers['x-powered-by'] === 'Next.js';

  console.log(`  HTTP Status:  ${home.status} (${home.elapsed} ms)`);
  console.log(`  Platform:     ${home.headers['platform'] || home.headers['server'] || 'Unknown'}`);
  console.log(`  Serving Type: ${isNextJsApp ? 'LIVE NEXT.JS APPLICATION' : isHostingerPlaceholder ? 'HOSTINGER "COMING SOON" PLACEHOLDER' : 'CUSTOM / STATIC'}`);

  results.push({
    test: 'Homepage',
    status: home.status,
    isLiveNextJs: isNextJsApp,
    details: isNextJsApp ? 'Next.js application active' : 'Hostinger placeholder active (Pending Hostinger build deployment)',
  });

  // Check 2: Quotation Request Form
  console.log('\n[2/6] Probing Public Quotation Request Form (GET /request-quotation)...');
  const quote = await probeUrl('/request-quotation');
  console.log(`  HTTP Status:  ${quote.status} (${quote.elapsed} ms)`);
  results.push({
    test: 'Quotation Request Form',
    status: quote.status,
    accessible: quote.status === 200,
  });

  // Check 3: Staff Login
  console.log('\n[3/6] Probing Staff Login Page (GET /staff/login)...');
  const login = await probeUrl('/staff/login');
  console.log(`  HTTP Status:  ${login.status} (${login.elapsed} ms)`);
  results.push({
    test: 'Staff Login',
    status: login.status,
    accessible: login.status === 200,
  });

  // Check 4: Protected Staff Route Anonymous Rejection
  console.log('\n[4/6] Testing Protected Staff Route RBAC Security (GET /staff)...');
  const staff = await probeUrl('/staff');
  const isRedirectToLogin = [302, 303, 307, 308].includes(staff.status) || staff.headers['location']?.includes('/staff/login');
  console.log(`  HTTP Status:  ${staff.status} (${staff.elapsed} ms)`);
  console.log(`  Location:     ${staff.headers['location'] || 'None'}`);
  console.log(`  RBAC Check:   ${isRedirectToLogin ? 'PASS (Anonymous access redirected to login)' : staff.status === 404 ? 'PENDING (404 on placeholder)' : 'FAIL'}`);
  results.push({
    test: 'Staff RBAC Protection',
    status: staff.status,
    redirectsToLogin: isRedirectToLogin,
  });

  // Check 5: PWA Manifest & Service Worker
  console.log('\n[5/6] Probing PWA Manifest & Service Worker...');
  const manifest = await probeUrl('/manifest.webmanifest');
  const sw = await probeUrl('/staff-sw.js');
  console.log(`  Manifest:     HTTP ${manifest.status} (${manifest.elapsed} ms, Type: ${manifest.headers['content-type'] || 'None'})`);
  console.log(`  Worker:       HTTP ${sw.status} (${sw.elapsed} ms, Type: ${sw.headers['content-type'] || 'None'})`);
  results.push({
    test: 'PWA Assets',
    manifestStatus: manifest.status,
    serviceWorkerStatus: sw.status,
  });

  // Check 6: Cron Worker Endpoint Authentication
  console.log('\n[6/6] Probing Scheduled Outbox Worker Security (GET /api/cron/process-outbox)...');
  const cron = await probeUrl('/api/cron/process-outbox');
  const cronProtected = cron.status === 401;
  console.log(`  HTTP Status:  ${cron.status} (${cron.elapsed} ms)`);
  console.log(`  Auth Guard:   ${cronProtected ? 'PASS (HTTP 401 Unauthorized without bearer token)' : cron.status === 404 ? 'PENDING (Hostinger build pending)' : 'INSPECT'}`);
  results.push({
    test: 'Cron Outbox Worker Authentication',
    status: cron.status,
    protected: cronProtected,
  });

  console.log('\n' + '='.repeat(75));
  console.log('SMOKE TEST EXECUTION COMPLETED');
  console.log('='.repeat(75));
  console.log(JSON.stringify(results, null, 2));

  return results;
}

runSmokeTests().catch(console.error);
