import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envLocal.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
}

const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const widths = [320, 360, 390, 412, 768, 1280];
const routes = [
  '/staff/login',
  '/staff',
  '/staff/quotations',
  '/staff/billing',
  '/staff/customers',
  '/staff/catalog',
  '/staff/enquiries',
  '/staff/help/pwa'
];

async function runResponsiveTests() {
  console.log('='.repeat(70));
  console.log('SANTHAYA ASSOCIATES — PWA RESPONSIVE & HORIZONTAL OVERFLOW SUITE');
  console.log('Testing widths:', widths.join(', '));
  console.log('='.repeat(70));

  // 1. Establish session
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'heistofeverything@gmail.com'
  });
  if (linkErr) throw linkErr;

  const { data: verifyData, error: verifyErr } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  });
  if (verifyErr) throw verifyErr;

  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieVal = `base64-${Buffer.from(JSON.stringify(verifyData.session)).toString('base64')}`;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setCookie({
    name: cookieName,
    value: cookieVal,
    domain: 'localhost',
    path: '/'
  });

  let totalTests = 0;
  let passedTests = 0;
  const failures = [];

  for (const width of widths) {
    console.log(`\n--- Testing Viewport Width: ${width}px ---`);
    await page.setViewport({ width, height: 800, deviceScaleFactor: 2 });

    for (const r of routes) {
      totalTests++;
      const url = `http://localhost:3000${r}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
        const overflow = await page.evaluate(() => {
          return {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: window.innerWidth,
            hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
            overflowAmount: Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
          };
        });

        if (overflow.hasOverflow && overflow.overflowAmount > 2) {
          console.error(`  ❌ FAIL: ${r} at ${width}px overflowed by ${overflow.overflowAmount}px (scroll: ${overflow.scrollWidth}px > client: ${overflow.clientWidth}px)`);
          failures.push({ route: r, width, overflowAmount: overflow.overflowAmount });
        } else {
          console.log(`  ✓ PASS: ${r} (${width}px) — Zero horizontal overflow`);
          passedTests++;
        }
      } catch (err) {
        console.error(`  ❌ ERROR: ${r} at ${width}px failed:`, err.message);
        failures.push({ route: r, width, error: err.message });
      }
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log(`RESPONSIVE TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
  if (failures.length > 0) {
    console.log(`FAILURES (${failures.length}):`);
    failures.forEach(f => console.log(`   - ${f.route} at ${f.width}px: ${f.overflowAmount ? `${f.overflowAmount}px overflow` : f.error}`));
  }
  console.log('='.repeat(70));

  if (failures.length > 0) {
    process.exit(1);
  }
}

runResponsiveTests().catch(err => {
  console.error('Fatal responsive test error:', err);
  process.exit(1);
});

