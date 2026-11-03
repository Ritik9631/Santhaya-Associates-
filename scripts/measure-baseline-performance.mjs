import http from 'http';
import fs from 'fs';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const getVar = (n) => {
  const m = env.match(new RegExp(n + '=(.*)'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
};
const adminClient = createClient(getVar('NEXT_PUBLIC_SUPABASE_URL'), getVar('SUPABASE_SERVICE_ROLE_KEY'));
const anonClient = createClient(getVar('NEXT_PUBLIC_SUPABASE_URL'), getVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function measureHttpRoute(path) {
  return new Promise((resolve) => {
    const start = performance.now();
    let ttfb = 0;
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      ttfb = performance.now() - start;
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const total = performance.now() - start;
        resolve({
          path,
          statusCode: res.statusCode,
          ttfbMs: Math.round(ttfb),
          totalMs: Math.round(total),
          bytes: Buffer.byteLength(data, 'utf8')
        });
      });
    });
    req.on('error', (err) => {
      resolve({ path, statusCode: 0, error: err.message });
    });
  });
}

async function main() {
  console.log('='.repeat(70));
  console.log('SANTHAYA ASSOCIATES — BASELINE PERFORMANCE AUDIT');
  console.log('='.repeat(70));

  console.log('\n--- 1. HTTP Endpoint Response Times (Server-Side TTFB & Payload Size) ---');
  const publicRoutes = ['/', '/services', '/about', '/request-quotation', '/staff/login'];
  const publicResults = [];
  for (const r of publicRoutes) {
    const res = await measureHttpRoute(r);
    publicResults.push(res);
    console.log(`  ${r.padEnd(22)} | HTTP ${res.statusCode} | TTFB: ${res.ttfbMs}ms | Total: ${res.totalMs}ms | Size: ${(res.bytes/1024).toFixed(1)} KB`);
  }

  console.log('\n--- 2. Authenticated Staff Route Performance (with Supabase SSR Session) ---');
  // Generate magiclink session
  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'heistofeverything@gmail.com'
  });
  const { data: verifyData } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  });
  const cookieVal = `base64-${Buffer.from(JSON.stringify(verifyData.session)).toString('base64')}`;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setCookie({
    name: 'sb-bkqneudnnhvvwmtggorz-auth-token',
    value: cookieVal,
    domain: 'localhost',
    path: '/',
    httpOnly: true
  });

  const staffRoutes = [
    '/staff',
    '/staff/quotations',
    '/staff/billing',
    '/staff/customers',
    '/staff/enquiries',
    '/staff/catalog',
    '/staff/communications',
    '/staff/billing/e5296c68-e58d-49d0-9f9d-908c74c8d6c1/pdf'
  ];

  const browserResults = [];
  for (const r of staffRoutes) {
    const start = performance.now();
    await page.goto(`http://localhost:3000${r}`, { waitUntil: 'domcontentloaded' });
    const domLoaded = performance.now() - start;

    const navTiming = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      if (perf) {
        return {
          responseStart: Math.round(perf.responseStart),
          domContentLoaded: Math.round(perf.domContentLoadedEventEnd),
          loadComplete: Math.round(perf.loadEventEnd),
          transferSize: perf.transferSize
        };
      }
      return null;
    });

    browserResults.push({ path: r, domLoadedMs: Math.round(domLoaded), navTiming });
    console.log(`  ${r.padEnd(52)} | DOM Ready: ${Math.round(domLoaded)}ms | Server TTFB: ${navTiming?.responseStart || 0}ms`);
  }

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log('BASELINE PERFORMANCE MEASUREMENT COMPLETE');
  console.log('='.repeat(70));
}

main().catch(console.error);

