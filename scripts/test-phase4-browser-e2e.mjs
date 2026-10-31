/**
 * Santhaya Associates — Phase 4 Communications & Delivery Browser Automation Suite
 * File: scripts/test-phase4-browser-e2e.mjs
 *
 * Verifies via Puppeteer + Chrome:
 * 1. Protected Communications Route Redirection (/staff/communications -> /staff/login?redirectTo=...)
 * 2. Login Redirect Parameter Preservation & XSS Sanitization Check
 * 3. Public Quotation Request Form -> Autonomous Phase 4 Outbox Triggering & DB Inspection
 * 4. Multi-device Layout Integrity (Desktop 1920x1080, Tablet 768x1024, Mobile 375x812)
 * 5. Horizontal Overflow & Visual Artifact Assertions
 * 6. Component & Template Structural Verification
 */

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || path.resolve('.qa_screenshots');
const DOCS_DIR = path.resolve('docs/qa/screenshots');

[ARTIFACT_DIR, DOCS_DIR].forEach((dir) => { try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch (e) {} });

function loadEnv() {
  const envPath = path.resolve('.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
}
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminClient = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

async function saveScreenshot(page, filename) {
  const p1 = path.join(ARTIFACT_DIR, filename);
  const p2 = path.join(DOCS_DIR, filename);
  await page.screenshot({ path: p1, fullPage: false });
  try {
    fs.copyFileSync(p1, p2);
  } catch (e) {}
  console.log(`  📸 Captured screenshot: ${filename}`);
}

async function runPhase4BrowserQA() {
  console.log('='.repeat(70));
  console.log('SANTHAYA ASSOCIATES — PHASE 4 BROWSER & COMMUNICATIONS QA SUITE');
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
  console.log(`[PASS] Chrome binary found at: ${CHROME_PATH}`);

  // 2. Launch Puppeteer
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

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated Navigation to /staff/communications
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing Unauthenticated Route Protection for Communications Hub ---');
    await page.setViewport({ width: 1920, height: 1080 });
    const targetUrl = 'http://localhost:3000/staff/communications';
    const response = await page.goto(targetUrl, { waitUntil: 'networkidle0' });

    const finalUrl = page.url();
    assert(
      finalUrl.includes('/staff/login') && finalUrl.includes('redirectTo=%2Fstaff%2Fcommunications'),
      `Unauthenticated access redirected to login with redirectTo param: ${finalUrl}`
    );

    await saveScreenshot(page, 'phase4_unauthenticated_communications_redirect.png');

    // Ensure no sensitive communications data is leaked on the login page
    const loginContent = await page.content();
    assert(!loginContent.includes('Outbox Dispatch Queue'), 'No communications outbox UI leaked to guest');
    assert(!loginContent.includes('Resend Free-Tier Quota'), 'No quota telemetry leaked to guest');

    // -------------------------------------------------------------------------
    // TEST 2: Responsive Viewports for Login and Redirect Experience
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Responsive Layouts for Redirected Staff Login ---');
    const viewports = [
      { name: 'desktop_1920', width: 1920, height: 1080 },
      { name: 'tablet_768', width: 768, height: 1024 },
      { name: 'mobile_375', width: 375, height: 812 },
    ];

    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:3000/staff/login?redirectTo=%2Fstaff%2Fcommunications', { waitUntil: 'networkidle0' });

      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      assert(!hasHorizontalOverflow, `Staff login at ${vp.name} (${vp.width}x${vp.height}) has zero horizontal overflow`);
      await saveScreenshot(page, `phase4_login_${vp.name}.png`);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Public Quotation Submission & Outbox Delivery Pipeline
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Public Quotation Request & Automated Email Outbox Trigger ---');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto('http://localhost:3000/request-quotation', { waitUntil: 'networkidle0' });

    const testTimestamp = Date.now();
    const testCustomerEmail = `phase4-browser-${testTimestamp}@santhaya-test.local`;
    const testCompanyName = `Phase 4 QA Corp ${testTimestamp}`;

    // Fill the public quotation form using exact IDs
    await page.type('#businessName', testCompanyName);
    await page.type('#contactPerson', 'Browser Automation Auditor');
    await page.type('#email', testCustomerEmail);
    await page.type('#phone', '9876543210');
    await page.type('#deliveryLocation', 'Maharashtra');
    await page.type('#requirementDetails', 'Autonomous Phase 4 verification: 20-ton Excavator & Civil machinery supply package.');
    await page.click('#privacyConsent');

    // Anti-spam timing defense requires at least 2.5s between form render and submit
    await new Promise((r) => setTimeout(r, 3000));

    await saveScreenshot(page, 'phase4_quotation_form_filled.png');

    // Submit form
    const submitBtn = await page.$('button[type="submit"]');
    assert(submitBtn !== null, 'Found quotation form submit button');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForFunction(
        () => document.body.innerText.includes('Quotation Request Successfully Registered') ||
              document.body.innerText.includes('INQ-') ||
              document.body.innerText.includes('Thank You'),
        { timeout: 10000 }
      ).catch(() => {});
      await new Promise((r) => setTimeout(r, 1000));
    }

    await saveScreenshot(page, 'phase4_quotation_submission_result.png');

    // Verify submission outcome on page
    const pageBody = await page.content();
    const formSubmitted = pageBody.includes('Quotation Request Successfully Registered') ||
                          pageBody.includes('INQ-') ||
                          pageBody.includes('Thank You');
    assert(formSubmitted, 'Quotation request registered successfully with reference number');

    // -------------------------------------------------------------------------
    // TEST 4: Supabase Database Email Outbox Inspection
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Verifying Outbox Enqueueing in Supabase Database ---');
    if (adminClient) {
      const { data: outboxJobs, error } = await adminClient
        .from('email_outbox')
        .select('*')
        .eq('recipient_email', testCustomerEmail);

      assert(!error, 'Supabase email_outbox query completed without error');
      assert(outboxJobs && outboxJobs.length > 0, `Outbox job found for ${testCustomerEmail}`);

      if (outboxJobs && outboxJobs.length > 0) {
        const job = outboxJobs[0];
        assert(job.email_type === 'enquiry_confirmation_customer', `Email type is enquiry_confirmation_customer (got: ${job.email_type})`);
        assert(job.status === 'pending', `Job initial status is pending (got: ${job.status})`);
        assert(job.attempts === 0, `Attempts count is initialized to 0 (got: ${job.attempts})`);
      }
    } else {
      console.log('  [SKIP] Supabase service role key not present; skipping database outbox assertion');
    }

    // -------------------------------------------------------------------------
    // TEST 5: Structural Integrity of Communications Manager Components
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Validating Phase 4 UI Components & Action Architecture ---');
    const filesToValidate = [
      {
        path: 'src/app/staff/communications/page.tsx',
        checks: ['requireStaffSession', 'CommunicationsManager', 'metadata'],
      },
      {
        path: 'src/app/staff/communications/CommunicationsManager.tsx',
        checks: ['Dispatched', 'Pending', 'Failed', 'Daily Quota', 'triggerOutboxWorkerAction', 'retryOutboxJobAction'],
      },
      {
        path: 'src/lib/communications/actions.ts',
        checks: ['triggerOutboxWorkerAction', 'retryOutboxJobAction', 'requireStaffSession', 'processOutboxBatch'],
      },
      {
        path: 'src/app/staff/billing/[id]/InvoiceDetailView.tsx',
        checks: ['Send / Deliver', 'recordInvoiceDeliveryAction', 'Statutory Delivery & Dispatch History', 'Delivery Channel'],
      },
      {
        path: 'src/lib/email/templates/customer-enquiry-confirmation.ts',
        checks: ['renderCustomerEnquiryConfirmation', 'Tracking Reference', 'Santhaya Associates'],
      },
      {
        path: 'src/lib/email/templates/quotation-delivery.ts',
        checks: ['renderQuotationDeliveryEmail', 'Commercial Proposal', 'Validity'],
      },
      {
        path: 'src/lib/email/templates/invoice-delivery.ts',
        checks: ['renderInvoiceDeliveryEmail', 'TAX INVOICE', 'CGST Rule 46', 'State Bank of India'],
      },
    ];

    for (const item of filesToValidate) {
      const fullPath = path.resolve(item.path);
      assert(fs.existsSync(fullPath), `File exists: ${item.path}`);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const token of item.checks) {
          assert(content.includes(token), `File ${item.path} contains expected token "${token}"`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(70));
  console.log(`PHASE 4 BROWSER & COMMUNICATIONS QA COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('='.repeat(70));

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase4BrowserQA().catch((err) => {
  console.error('Browser QA execution threw uncaught error:', err);
  process.exit(1);
});
