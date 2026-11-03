import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

async function runPwaTestSuite() {
  console.log('='.repeat(70));
  console.log('SANTHAYA ASSOCIATES — COMPLETE PWA AUTOMATED TEST SUITE');
  console.log('='.repeat(70));

  let total = 0;
  let passed = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  // -------------------------------------------------------------
  // SECTION 1: MANIFEST VALIDATION
  // -------------------------------------------------------------
  console.log('\n--- Section 1: Web App Manifest Properties ---');

  const manifestPath = path.resolve('public/staff-manifest.json');
  await test('Manifest file exists at public/staff-manifest.json', () => {
    assert.ok(fs.existsSync(manifestPath), 'staff-manifest.json must exist');
  });

  const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
  let manifest;
  await test('Manifest is valid JSON', () => {
    manifest = JSON.parse(manifestRaw);
    assert.ok(manifest, 'Parsed manifest');
  });

  await test('Application name is "Santhaya Staff"', () => {
    assert.strictEqual(manifest.name, 'Santhaya Staff');
    assert.strictEqual(manifest.short_name, 'Santhaya Staff');
  });

  await test('Description matches official specification', () => {
    assert.strictEqual(manifest.description, 'Secure staff management portal for Santhaya Associates Pvt. Ltd.');
  });

  await test('Start URL and Scope are strictly bound to /staff', () => {
    assert.strictEqual(manifest.start_url, '/staff');
    assert.strictEqual(manifest.scope, '/staff');
  });

  await test('Display mode is standalone', () => {
    assert.strictEqual(manifest.display, 'standalone');
  });

  await test('Theme color and background color match corporate navy (#0F172A)', () => {
    assert.strictEqual(manifest.theme_color.toUpperCase(), '#0F172A');
    assert.strictEqual(manifest.background_color.toUpperCase(), '#0F172A');
  });

  await test('Manifest contains no confidential tokens, secrets, or PII', () => {
    assert.ok(!manifestRaw.includes('secret'), 'No secret keyword');
    assert.ok(!manifestRaw.includes('password'), 'No password keyword');
    assert.ok(!manifestRaw.includes('supabase'), 'No database URLs in manifest');
  });

  // -------------------------------------------------------------
  // SECTION 2: ICON ASSET VALIDATION
  // -------------------------------------------------------------
  console.log('\n--- Section 2: PWA Icon Geometry & Formats ---');

  await test('Manifest declares required icon sizes (192x192, 512x512, maskable)', () => {
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 4, 'Has at least 4 icons');
    const sizes = manifest.icons.map(i => i.sizes);
    assert.ok(sizes.includes('192x192'), 'Includes 192x192');
    assert.ok(sizes.includes('512x512'), 'Includes 512x512');
    const maskable = manifest.icons.filter(i => i.purpose === 'maskable');
    assert.ok(maskable.length >= 2, 'Has at least 2 maskable icons');
  });

  for (const icon of manifest.icons) {
    const iconPath = path.resolve('public', icon.src.replace(/^\//, ''));
    await test(`Icon ${icon.src} (${icon.sizes}, ${icon.purpose}) exists on disk`, () => {
      assert.ok(fs.existsSync(iconPath), `${iconPath} must exist`);
    });

    await test(`Icon ${icon.src} has correct PNG dimensions`, async () => {
      const meta = await sharp(iconPath).metadata();
      const [w, h] = icon.sizes.split('x').map(Number);
      assert.strictEqual(meta.width, w, `Width must match ${w}`);
      assert.strictEqual(meta.height, h, `Height must match ${h}`);
      assert.strictEqual(meta.format, 'png', 'Must be PNG');
    });
  }

  // -------------------------------------------------------------
  // SECTION 3: SERVICE WORKER & SECURITY
  // -------------------------------------------------------------
  console.log('\n--- Section 3: Service Worker & Caching Security ---');

  const swPath = path.resolve('public/staff-sw.js');
  await test('Dedicated service worker exists at public/staff-sw.js', () => {
    assert.ok(fs.existsSync(swPath), 'staff-sw.js must exist');
  });

  const swContent = fs.readFileSync(swPath, 'utf8');

  await test('Service worker enforces strict network-only for /staff and ERP requests', () => {
    assert.ok(swContent.includes('fetch(request)'), 'Fetches from live network');
    assert.ok(!swContent.includes('cache.put(request'), 'Never caches dynamic private requests');
  });

  await test('Service worker never caches passwords, tokens, or private ERP models', () => {
    // Check that STATIC_ASSETS only contains static public assets
    assert.ok(!swContent.includes("'/staff/'"), 'No staff routes in STATIC_ASSETS');
    assert.ok(!swContent.includes("'/api/'"), 'No API routes in STATIC_ASSETS');
    assert.ok(!swContent.includes('supabase.co'), 'No Supabase URLs cached');
    assert.ok(!swContent.includes('cache.put('), 'Zero dynamic caching via cache.put');
  });

  await test('Service worker handles CLEAR_CACHES message for clean sign-out', () => {
    assert.ok(swContent.includes('CLEAR_CACHES'), 'Listens for CLEAR_CACHES action');
    assert.ok(swContent.includes('caches.delete'), 'Deletes caches on logout message');
  });

  const offlineHtmlPath = path.resolve('public/staff-offline.html');
  await test('Offline fallback page exists with zero confidential data leaks', () => {
    assert.ok(fs.existsSync(offlineHtmlPath), 'staff-offline.html exists');
    const offlineHtml = fs.readFileSync(offlineHtmlPath, 'utf8');
    assert.ok(offlineHtml.includes('Internet Connection Required'), 'Clear offline title');
    assert.ok(offlineHtml.includes('Zero Offline Data Exposure'), 'Explicit data governance notice');
    assert.ok(!offlineHtml.includes('token'), 'No tokens');
  });

  // -------------------------------------------------------------
  // SECTION 4: ROUTE SEGREGATION & METADATA
  // -------------------------------------------------------------
  console.log('\n--- Section 4: Public vs Staff Manifest Segregation ---');

  const rootLayoutPath = path.resolve('src/app/layout.tsx');
  const rootLayout = fs.readFileSync(rootLayoutPath, 'utf8');
  await test('Public root layout does NOT promote or link the staff manifest', () => {
    assert.ok(!rootLayout.includes('staff-manifest.json'), 'Root layout does not declare staff-manifest.json');
  });

  const staffLayoutPath = path.resolve('src/app/staff/layout.tsx');
  const staffLayout = fs.readFileSync(staffLayoutPath, 'utf8');
  await test('Staff layout declares staff-manifest.json and standalone configuration', () => {
    assert.ok(staffLayout.includes('/staff-manifest.json'), 'Staff layout links staff-manifest.json');
    assert.ok(staffLayout.includes('appleWebApp'), 'Staff layout configures appleWebApp');
  });

  const staffLoginPath = path.resolve('src/app/(staff-auth)/staff/login/page.tsx');
  const staffLogin = fs.readFileSync(staffLoginPath, 'utf8');
  await test('Staff login page declares staff-manifest.json for unauthenticated installability', () => {
    assert.ok(staffLogin.includes('/staff-manifest.json'), 'Staff login page links staff-manifest.json');
  });

  // -------------------------------------------------------------
  // SECTION 5: LIVE HTTP HEADERS & SERVING
  // -------------------------------------------------------------
  console.log('\n--- Section 5: Live HTTP Headers & Manifest Verification ---');

  const base = 'http://localhost:3000';

  await test('Manifest serves with HTTP 200 and application/manifest+json Content-Type', async () => {
    const res = await fetch(`${base}/staff-manifest.json`);
    assert.strictEqual(res.status, 200, `HTTP status ${res.status}`);
    const ctype = res.headers.get('content-type') || '';
    assert.ok(ctype.includes('manifest+json') || ctype.includes('application/json'), `Content-Type: ${ctype}`);
    const json = await res.json();
    assert.strictEqual(json.name, 'Santhaya Staff');
  });

  await test('Service worker serves with HTTP 200, javascript Content-Type, and Service-Worker-Allowed header', async () => {
    const res = await fetch(`${base}/staff-sw.js`);
    assert.strictEqual(res.status, 200, `HTTP status ${res.status}`);
    const swAllowed = res.headers.get('service-worker-allowed');
    assert.strictEqual(swAllowed, '/staff', `Service-Worker-Allowed: ${swAllowed}`);
    const cacheCtrl = res.headers.get('cache-control') || '';
    assert.ok(cacheCtrl.includes('no-store') || cacheCtrl.includes('no-cache'), `Cache-Control: ${cacheCtrl}`);
    const text = await res.text();
    assert.ok(text.includes('santhaya-staff-static-v1'), 'Valid SW script served');
  });

  await test('Offline fallback serves with HTTP 200 and text/html Content-Type', async () => {
    const res = await fetch(`${base}/staff-offline.html`);
    assert.strictEqual(res.status, 200, `HTTP status ${res.status}`);
    const text = await res.text();
    assert.ok(text.includes('Internet Connection Required'));
  });

  await test('Staff protected routes return Cache-Control: no-store', async () => {
    const res = await fetch(`${base}/staff`, { redirect: 'manual' });
    // Should be redirect (307/302) to /staff/login with no-store
    assert.ok([307, 302, 303].includes(res.status), `Redirects unauthenticated staff (status: ${res.status})`);
    const cacheCtrl = res.headers.get('cache-control') || '';
    assert.ok(cacheCtrl.includes('no-store'), 'Includes no-store header');
  });

  await test('Public homepage (/) does not include staff-manifest link in HTML', async () => {
    const res = await fetch(`${base}/`);
    const html = await res.text();
    assert.ok(!html.includes('/staff-manifest.json'), 'Public homepage HTML has no staff-manifest link');
  });

  await test('Staff login (/staff/login) includes staff-manifest link in HTML', async () => {
    const res = await fetch(`${base}/staff/login`);
    const html = await res.text();
    assert.ok(html.includes('/staff-manifest.json'), 'Staff login HTML includes staff-manifest link');
  });

  console.log('\n' + '='.repeat(70));
  console.log(`PWA TEST SUITE SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log('='.repeat(70));

  if (passed !== total) {
    process.exit(1);
  }
}

runPwaTestSuite().catch(err => {
  console.error('Fatal PWA test suite error:', err);
  process.exit(1);
});
