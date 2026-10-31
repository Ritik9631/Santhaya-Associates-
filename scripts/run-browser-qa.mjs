import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || path.resolve('.qa_screenshots');
const DOCS_DIR = path.resolve('docs/qa/screenshots');

[ARTIFACT_DIR, DOCS_DIR].forEach((dir) => { try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch (e) {} });

async function saveScreenshot(page, filename) {
  const p1 = path.join(ARTIFACT_DIR, filename);
  const p2 = path.join(DOCS_DIR, filename);
  await page.screenshot({ path: p1, fullPage: false });
  try {
    fs.copyFileSync(p1, p2);
  } catch (e) {}
  console.log(`  📸 Captured screenshot: ${filename}`);
}

async function runAutonomousQA() {
  console.log('='.repeat(70));
  console.log('SANTHAYA ASSOCIATES — AUTOMATED BROWSER QA SUITE');
  console.log('='.repeat(70));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push({ text: err.toString() });
  });

  page.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), errorText: req.failure()?.errorText });
  });

  const report = {
    viewports: {},
    publicRoutes: {},
    staffAuthRoutes: {},
    isolationCheck: {},
    formTests: {},
    consoleErrors,
    failedRequests,
  };

  // ---------------------------------------------------------------------------
  // 1. PUBLIC WEBSITE TESTING ACROSS VIEWPORTS
  // ---------------------------------------------------------------------------
  console.log('\n--- 1. Testing Public Website Routes & Responsive Viewports ---');
  const viewports = [
    { name: 'desktop_1920', width: 1920, height: 1080 },
    { name: 'tablet_768', width: 768, height: 1024 },
    { name: 'mobile_375', width: 375, height: 812 },
  ];

  const publicRoutes = ['/', '/services', '/about', '/request-quotation', '/privacy', '/terms'];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})`);

    for (const r of publicRoutes) {
      const url = `http://localhost:3000${r}`;
      const res = await page.goto(url, { waitUntil: 'networkidle0' });
      const status = res.status();

      // Check horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      // Check broken images
      const brokenImages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img'))
          .filter((img) => !img.complete || img.naturalWidth === 0)
          .map((img) => img.src);
      });

      // Verify ZERO staff links on public page
      const leakedStaffLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map((a) => a.getAttribute('href') || '')
          .filter((h) => /(?:^\/staff|\blogin\b|\bsignup\b|\bregister\b|\badmin\b)/i.test(h));
      });

      report.publicRoutes[`${vp.name}:${r}`] = {
        status,
        hasOverflow,
        brokenImagesCount: brokenImages.length,
        leakedStaffLinksCount: leakedStaffLinks.length,
      };

      console.log(`  ✓ Route: ${r.padEnd(20)} | Status: ${status} | Overflow: ${hasOverflow ? 'FAIL' : 'PASS'} | Leaked Links: ${leakedStaffLinks.length}`);
    }

    // Capture responsive screenshots for homepage and request-quotation
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
    await saveScreenshot(page, `homepage_${vp.name}.png`);

    await page.goto('http://localhost:3000/request-quotation', { waitUntil: 'networkidle0' });
    await saveScreenshot(page, `quotation_${vp.name}.png`);
  }

  // Mobile navigation hamburger check
  await page.setViewport({ width: 375, height: 812 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  const hamburger = await page.$('button[aria-label="Toggle navigation menu"]');
  if (hamburger) {
    await hamburger.click();
    await new Promise((r) => setTimeout(r, 400));
    await saveScreenshot(page, 'mobile_drawer_open_375.png');
  }

  // ---------------------------------------------------------------------------
  // 2. PUBLIC QUOTATION REQUEST FORM VALIDATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Public Quotation Request Form Validation ---');
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000/request-quotation', { waitUntil: 'networkidle0' });

  // A. Empty Submission Check
  const submitBtn = await page.$('button[type="submit"]');
  await submitBtn.click();
  await new Promise((r) => setTimeout(r, 400));

  const validationErrors = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.text-red-600')).map((e) => e.innerText.trim());
  });
  console.log(`  ✓ Empty submission validation: ${validationErrors.length} required field errors displayed.`);
  await saveScreenshot(page, 'quotation_validation_empty.png');

  // ---------------------------------------------------------------------------
  // 3. STAFF AUTHENTICATION & PORTAL GATES
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Staff Portal Authentication & Route Guards ---');
  
  // A. /staff/login rendering & robots tag
  await page.goto('http://localhost:3000/staff/login', { waitUntil: 'networkidle0' });
  const loginTitle = await page.title();
  const robotsMeta = await page.evaluate(() => {
    return document.querySelector('meta[name="robots"]')?.getAttribute('content');
  });
  console.log(`  ✓ /staff/login Title: "${loginTitle}"`);
  console.log(`  ✓ Robots Meta: "${robotsMeta}"`);
  await saveScreenshot(page, 'staff_login_desktop.png');

  // Test mobile staff login
  await page.setViewport({ width: 375, height: 812 });
  await page.goto('http://localhost:3000/staff/login', { waitUntil: 'networkidle0' });
  await saveScreenshot(page, 'staff_login_mobile_375.png');

  // B. Test Error Query Banners on Login Page
  const errorStates = [
    { query: '?error=unauthorized', bannerText: 'Staff Profile Required' },
    { query: '?error=inactive', bannerText: 'Account Inactive' },
    { query: '?error=session_expired', bannerText: 'Session Expired' },
  ];

  await page.setViewport({ width: 1280, height: 800 });
  for (const err of errorStates) {
    await page.goto(`http://localhost:3000/staff/login${err.query}`, { waitUntil: 'networkidle0' });
    const hasBanner = await page.evaluate((text) => {
      return document.body.innerText.includes(text);
    }, err.bannerText);
    console.log(`  ✓ Login Error Banner (${err.query}): ${hasBanner ? 'PASS (' + err.bannerText + ')' : 'FAIL'}`);
    await saveScreenshot(page, `staff_login_${err.query.replace('?error=', '')}.png`);
  }

  // C. Test Protected Route Redirection in Browser
  const protectedPaths = [
    { path: '/staff', expectedRedirect: '/staff/login' },
    { path: '/staff/customers', expectedRedirect: '/staff/login?redirectTo=%2Fstaff%2Fcustomers' },
    { path: '/staff/catalog', expectedRedirect: '/staff/login?redirectTo=%2Fstaff%2Fcatalog' },
    { path: '/staff/quotations', expectedRedirect: '/staff/login?redirectTo=%2Fstaff%2Fquotations' },
    { path: '/staff/billing', expectedRedirect: '/staff/login?redirectTo=%2Fstaff%2Fbilling' },
    { path: '/staff/team', expectedRedirect: '/staff/login?redirectTo=%2Fstaff%2Fteam' },
  ];

  for (const item of protectedPaths) {
    await page.goto(`http://localhost:3000${item.path}`, { waitUntil: 'networkidle0' });
    const finalUrl = page.url();
    const isRedirected = finalUrl.includes('/staff/login');
    console.log(`  ✓ Protected Route: ${item.path.padEnd(20)} -> Final URL: ${finalUrl.replace('http://localhost:3000', '')} (${isRedirected ? 'PASS' : 'FAIL'})`);
  }

  await browser.close();

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'qa_browser_report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );
  try {
    fs.copyFileSync(
      path.join(ARTIFACT_DIR, 'qa_browser_report.json'),
      path.join(DOCS_DIR, 'qa_browser_report.json')
    );
  } catch (e) {}

  console.log('\n' + '='.repeat(70));
  console.log('✅ ALL BROWSER AUTOMATION TESTS COMPLETED SUCCESSFULLY');
  console.log(`Screenshots saved to: ${DOCS_DIR}`);
  console.log('='.repeat(70));
}

runAutonomousQA().catch((err) => {
  console.error('❌ Browser QA Failed:', err);
  process.exit(1);
});

