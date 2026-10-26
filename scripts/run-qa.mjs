import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\ritik\\.gemini\\antigravity-ide\\brain\\bf993f6a-d384-486b-9291-3ad4d951a4cb\\qa_screenshots';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function runQA() {
  console.log('🚀 Starting Santhaya Associates Phase 1 Automated QA...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.toString());
  });

  const results = {
    viewports: {},
    routes: {},
    images: [],
    links: [],
    formTests: {},
    consoleErrors: [],
  };

  const routes = ['/', '/services', '/about', '/request-quotation', '/privacy', '/terms'];

  // 1. Test all routes on Desktop (1920x1080)
  await page.setViewport({ width: 1920, height: 1080 });
  console.log('🌐 Testing all routes on Desktop (1920x1080)...');

  for (const route of routes) {
    const url = `http://localhost:3000${route}`;
    const response = await page.goto(url, { waitUntil: 'networkidle0' });
    const status = response.status();
    const title = await page.title();

    // Check images on page
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.src);
    });

    // Check logo dimensions and aspect ratio
    const logoInfo = await page.evaluate(() => {
      const headerImg = document.querySelector('header img');
      if (!headerImg) return null;
      const rect = headerImg.getBoundingClientRect();
      return {
        src: headerImg.src,
        renderedWidth: rect.width,
        renderedHeight: rect.height,
        aspectRatio: rect.width / rect.height,
        naturalWidth: headerImg.naturalWidth,
        naturalHeight: headerImg.naturalHeight,
      };
    });

    results.routes[route] = {
      status,
      title,
      brokenImages,
      logoInfo,
    };

    console.log(`  ✓ Route: ${route} | Status: ${status} | Broken Images: ${brokenImages.length}`);
  }

  // 2. Capture Desktop Screenshots
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'homepage_desktop_1920.png'),
    fullPage: false,
  });
  console.log('  📸 Captured homepage_desktop_1920.png');

  await page.goto('http://localhost:3000/request-quotation', { waitUntil: 'networkidle0' });
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'quotation_desktop_1920.png'),
    fullPage: false,
  });
  console.log('  📸 Captured quotation_desktop_1920.png');

  // 3. Test Viewport Responsive Layouts
  const viewports = [
    { name: 'laptop_1366', width: 1366, height: 768 },
    { name: 'tablet_768', width: 768, height: 1024 },
    { name: 'mobile_375', width: 375, height: 812 },
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });

    // Check horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    results.viewports[vp.name] = {
      width: vp.width,
      height: vp.height,
      hasHorizontalOverflow,
    };

    if (vp.name === 'mobile_375') {
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'homepage_mobile_375.png'),
        fullPage: false,
      });
      console.log('  📸 Captured homepage_mobile_375.png');

      // Test mobile hamburger menu
      const mobileButton = await page.$('button[aria-label="Toggle navigation menu"]');
      if (mobileButton) {
        await mobileButton.click();
        await new Promise((r) => setTimeout(r, 300));
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, 'mobile_menu_open_375.png'),
          fullPage: false,
        });
        console.log('  📸 Captured mobile_menu_open_375.png');
      }

      // Mobile quotation page
      await page.goto('http://localhost:3000/request-quotation', { waitUntil: 'networkidle0' });
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'quotation_mobile_375.png'),
        fullPage: false,
      });
      console.log('  📸 Captured quotation_mobile_375.png');
    }
  }

  // 4. Functional Testing on /request-quotation
  console.log('📝 Testing Form & Validation logic...');
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:3000/request-quotation', { waitUntil: 'networkidle0' });

  // Helper for React controlled inputs
  async function fillInput(selector, value) {
    await page.focus(selector);
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    if (value) {
      await page.type(selector, value);
    }
  }

  // A. Check Demo Warning Banner exists
  const hasDemoWarning = await page.evaluate(() => {
    return document.body.innerText.includes('PHASE 1 DEMONSTRATION MODE');
  });

  // B. Trigger Empty Submission
  const submitButton = await page.$('button[type="submit"]');
  await submitButton.click();
  await new Promise((r) => setTimeout(r, 300));

  const emptySubmissionErrors = await page.evaluate(() => {
    const errorEls = Array.from(document.querySelectorAll('.text-red-600'));
    return errorEls.map((el) => el.innerText.trim());
  });

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'quotation_validation_errors.png'),
    fullPage: false,
  });
  console.log('  📸 Captured quotation_validation_errors.png');

  // C. Test invalid phone, invalid email, invalid GSTIN
  await fillInput('#businessName', 'Santhaya Infra Corp');
  await fillInput('#contactPerson', 'Rajesh Sharma');
  await fillInput('#email', 'invalid-email');
  await fillInput('#phone', '12345'); // invalid Indian phone
  await fillInput('#gstin', 'INVALIDGSTIN');
  await fillInput('#requirementDetails', 'Need 2 heavy crawler cranes');
  await fillInput('#deliveryLocation', 'Pune, Maharashtra');
  await submitButton.click();
  await new Promise((r) => setTimeout(r, 300));

  const invalidFieldErrors = await page.evaluate(() => {
    const errorEls = Array.from(document.querySelectorAll('.text-red-600'));
    return errorEls.map((el) => el.innerText.trim());
  });

  // D. Fill valid data and test simulation success
  await fillInput('#email', 'procurement@santhayainfra.com');
  await fillInput('#phone', '9876543210');
  await fillInput('#gstin', '27ABCDE1234F1Z5');
  await page.click('#privacyConsent');
  await submitButton.click();
  await new Promise((r) => setTimeout(r, 400));

  const successNotice = await page.evaluate(() => {
    const successEl = document.querySelector('.bg-emerald-50');
    return successEl ? successEl.innerText.trim() : null;
  });

  // Scroll up so the success banner is clearly captured
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await new Promise((r) => setTimeout(r, 200));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'quotation_validation_success.png'),
    fullPage: false,
  });
  console.log('  📸 Captured quotation_validation_success.png');

  results.formTests = {
    hasDemoWarning,
    emptySubmissionErrorCount: emptySubmissionErrors.length,
    emptySubmissionErrors,
    invalidFieldErrors,
    successNoticeFound: !!successNotice,
    successNoticeText: successNotice,
  };

  results.consoleErrors = consoleErrors;

  await browser.close();

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'qa_results.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );

  console.log('✅ QA script completed successfully. Results saved to qa_results.json');
}

runQA().catch((err) => {
  console.error('❌ QA Script Error:', err);
  process.exit(1);
});
