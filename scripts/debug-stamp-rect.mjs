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

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

async function run() {
  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'heistofeverything@gmail.com'
  });
  const { data: verifyData } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  });

  const cookieName = 'sb-bkqneudnnhvvwmtggorz-auth-token';
  const cookieVal = `base64-${Buffer.from(JSON.stringify(verifyData.session)).toString('base64')}`;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
  await page.setCookie({ name: cookieName, value: cookieVal, domain: 'localhost', path: '/' });

  // Get QT-2026-27-010 id
  const { data: quote } = await adminClient.from('quotations').select('id').eq('quotation_number', 'QT-2026-27-010').single();
  await page.goto(`http://localhost:3000/staff/quotations/${quote.id}/pdf`, { waitUntil: 'networkidle0' });

  const rects = await page.evaluate(() => {
    const stampImg = document.querySelector('img[alt*="Company Stamp"]');
    const stampBox = document.querySelector('.stamp-authorization-box');
    return {
      stampImg: stampImg ? {
        src: stampImg.src,
        rect: stampImg.getBoundingClientRect()
      } : null,
      stampBox: stampBox ? stampBox.getBoundingClientRect() : null
    };
  });

  console.log('Rects:', JSON.stringify(rects, null, 2));
  if (rects.stampImg && rects.stampBox) {
    console.log('box.right - img.right =', rects.stampBox.right - rects.stampImg.rect.right);
  }
  await browser.close();
}

run().catch(console.error);

