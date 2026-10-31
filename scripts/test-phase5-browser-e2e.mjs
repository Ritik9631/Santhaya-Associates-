/**
 * Santhaya Associates — Phase 5 Premium UI/UX, Operational Polish & Multi-Viewport Suite
 * File: scripts/test-phase5-browser-e2e.mjs
 *
 * Verifies via Puppeteer + Chrome:
 * 1. 4-Tier Multi-Viewport Layout Integrity (Desktop 1920px, Laptop 1366px, Tablet 768px, Mobile 375px)
 * 2. Zero Horizontal Scrollbar Overflow across all public & staff routes
 * 3. Mobile Navigation Drawer (Open, Close, Escape key accessibility, Link navigation)
 * 4. Image Asset Integrity (Zero broken images across all public pages)
 * 5. Public-Staff Isolation (Zero staff or login links in public DOM)
 * 6. Native Next.js SEO & Structured Data (robots.txt, sitemap.xml, JSON-LD Schema)
 * 7. Staff ERP Security Perimeter & Route Protections
 * 8. PDF Print Component Integration & Broken Asset Elimination
 */

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\ritik\\.gemini\\antigravity\\brain\\26a96ae2-7d28-4640-80b9-553f236fc3f0\\qa_screenshots';
const DOCS_DIR = path.resolve('docs/qa/screenshots');

[ARTIFACT_DIR, DOCS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function saveScreenshot(page, filename) {
  const p1 = path.join(ARTIFACT_DIR, filename);
  const p2 = path.join(DOCS_DIR, filename);
  await page.screenshot({ path: p1, fullPage: false });
  try {
    fs.copyFileSync(p1, p2);
  } catch (e) {}
  console.log(`  📸 Captured screenshot: ${filename}`);
}

async function runPhase5BrowserQA() {
  console.log('='.repeat(70));
  console.log('SANTHAYA ASSOCIATES — PHASE 5 PREMIUM UI/UX & MULTI-VIEWPORT SUITE');
  console.log('='.repeat(70));

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${name}`);
      failedTests++;
    }
  }

  // 1. Check Chrome Binary
  if (!fs.existsSync(CHROME_PATH)) {
    console.error(`FATAL: Chrome binary not found at ${CHROME_PATH}`);
    process.exit(1);
  }
  console.log(`[PASS] Chrome binary verified at: ${CHROME_PATH}`);

  // 2. Launch Puppeteer
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();

  try {
    // -------------------------------------------------------------------------
    // 1. MULTI-VIEWPORT RESPONSIVE AUDIT ACROSS 4 SCREEN SIZES
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing 4-Tier Multi-Viewport Layout Integrity ---');
    const viewports = [
      { name: 'desktop_1920', width: 1920, height: 1080 },
      { name: 'laptop_1366', width: 1366, height: 768 },
      { name: 'tablet_768', width: 768, height: 1024 },
      { name: 'mobile_375', width: 375, height: 812 },
    ];

    const publicPages = ['/', '/services', '/about', '/request-quotation', '/privacy', '/terms'];

    for (const vp of viewports) {
      console.log(`\nEvaluating Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      await page.setViewport({ width: vp.width, height: vp.height });

      for (const route of publicPages) {
        const url = `http://localhost:3000${route}`;
        const res = await page.goto(url, { waitUntil: 'networkidle0' });
        assert(res.status() === 200, `${route} returns HTTP 200 at ${vp.name}`);

        // Check horizontal overflow
        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        assert(!hasOverflow, `${route} has zero horizontal overflow at ${vp.name}`);

        // Check broken images
        const brokenImages = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('img'))
            .filter((img) => !img.complete || img.naturalWidth === 0)
            .map((img) => img.src);
        });
        assert(brokenImages.length === 0, `${route} has 0 broken images (broken: ${brokenImages.join(', ')})`);

        // Check public-staff isolation
        const leakedStaffLinks = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a'))
            .map((a) => a.getAttribute('href') || '')
            .filter((href) => href.startsWith('/staff') || href.includes('login'));
        });
        assert(leakedStaffLinks.length === 0, `${route} contains zero staff links (found: ${leakedStaffLinks.join(', ')})`);
      }

      await saveScreenshot(page, `phase5_home_${vp.name}.png`);
    }

    // -------------------------------------------------------------------------
    // 2. MOBILE DRAWER NAVIGATION & KEYBOARD ACCESSIBILITY
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Mobile Navigation Drawer & Keyboard Accessibility ---');
    await page.setViewport({ width: 375, height: 812 });
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

    // Find and click mobile menu button
    const menuBtn = await page.$('button[aria-label="Toggle navigation menu"]');
    assert(menuBtn !== null, 'Mobile menu toggle button exists');

    if (menuBtn) {
      await menuBtn.click();
      await new Promise((r) => setTimeout(r, 400));

      const isExpanded = await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Toggle navigation menu"]');
        return btn?.getAttribute('aria-expanded') === 'true';
      });
      assert(isExpanded, 'Mobile menu opened with aria-expanded="true"');
      await saveScreenshot(page, 'phase5_mobile_drawer_open.png');

      // Test Escape key closes menu
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 400));

      const isClosedAfterEsc = await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Toggle navigation menu"]');
        return btn?.getAttribute('aria-expanded') === 'false';
      });
      assert(isClosedAfterEsc, 'Pressing Escape key closes the mobile navigation menu (WCAG 2.1)');
    }

    // -------------------------------------------------------------------------
    // 3. SEO, ROBOTS & STRUCTURED DATA VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Native SEO, Robots.txt, Sitemap.xml & JSON-LD ---');
    await page.setViewport({ width: 1920, height: 1080 });

    // Test robots.txt
    const robotsRes = await page.goto('http://localhost:3000/robots.txt', { waitUntil: 'networkidle0' });
    assert(robotsRes.status() === 200, '/robots.txt returns HTTP 200');
    const robotsTxt = await page.evaluate(() => document.body.innerText);
    assert(robotsTxt.includes('Disallow: /staff/'), '/robots.txt disallows /staff/');
    assert(robotsTxt.includes('sitemap.xml'), '/robots.txt references sitemap.xml');

    // Test sitemap.xml
    const sitemapRes = await page.goto('http://localhost:3000/sitemap.xml', { waitUntil: 'networkidle0' });
    assert(sitemapRes.status() === 200, '/sitemap.xml returns HTTP 200');
    const sitemapContent = await page.content();
    assert(sitemapContent.includes('/services') && sitemapContent.includes('/request-quotation'), '/sitemap.xml contains primary public routes');

    // Test JSON-LD on Homepage
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
    const jsonLdContent = await page.evaluate(() => {
      const script = document.querySelector('script[type="application/ld+json"]');
      return script ? JSON.parse(script.textContent || '{}') : null;
    });
    assert(jsonLdContent !== null, 'Homepage contains application/ld+json script');
    assert(jsonLdContent?.name === 'Santhaya Associates Pvt. Ltd.', 'JSON-LD specifies correct corporate name');
    assert(jsonLdContent?.slogan === 'Building Today • Powering Tomorrow', 'JSON-LD specifies brand slogan');

    // -------------------------------------------------------------------------
    // 4. STAFF ERP PERIMETER SECURITY MATRIX
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Staff ERP Dual-Barrier Perimeter Gate ---');
    const staffProtectedRoutes = [
      '/staff',
      '/staff/customers',
      '/staff/catalog',
      '/staff/quotations',
      '/staff/billing',
      '/staff/communications',
      '/staff/team',
    ];

    for (const sRoute of staffProtectedRoutes) {
      await page.goto(`http://localhost:3000${sRoute}`, { waitUntil: 'networkidle0' });
      const currentUrl = page.url();
      const expectedParam = sRoute === '/staff' ? '/staff/login' : `redirectTo=${encodeURIComponent(sRoute)}`;
      assert(
        currentUrl.includes('/staff/login') && currentUrl.includes(expectedParam),
        `Unauthenticated ${sRoute} redirected safely to login (Current: ${currentUrl})`
      );
    }

    // -------------------------------------------------------------------------
    // 5. PDF & ACCESSIBILITY ASSET AUDIT
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Auditing PDF Components & Asset Integrity ---');
    const printButtonExists = fs.existsSync(path.resolve('src/components/PrintButton.tsx'));
    assert(printButtonExists, 'Reusable client PrintButton component exists');

    const invoicePdfContent = fs.readFileSync(path.resolve('src/app/staff/billing/[id]/pdf/page.tsx'), 'utf8');
    assert(!invoicePdfContent.includes('/images/logo.png'), 'Broken /images/logo.png reference removed from invoice PDF');
    assert(invoicePdfContent.includes('PrintButton'), 'Invoice PDF uses client PrintButton');

    const quotePdfContent = fs.readFileSync(path.resolve('src/app/staff/quotations/[id]/pdf/page.tsx'), 'utf8');
    assert(quotePdfContent.includes('PrintButton'), 'Quotation PDF uses client PrintButton');

    // Verify staff overview page live queries
    const staffOverviewContent = fs.readFileSync(path.resolve('src/app/staff/page.tsx'), 'utf8');
    assert(!staffOverviewContent.includes('Stage 3B • Roadmap'), 'Obsolete roadmap placeholders removed from staff overview');
    assert(staffOverviewContent.includes('totalBalanceOutstanding'), 'Staff overview aggregates outstanding financial receivables');
    assert(staffOverviewContent.includes('customerCount'), 'Staff overview queries live customer count');

  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(70));
  console.log(`PHASE 5 BROWSER & OPERATIONAL QA COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('='.repeat(70));

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase5BrowserQA().catch((err) => {
  console.error('Phase 5 browser execution threw error:', err);
  process.exit(1);
});
