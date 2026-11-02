import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const getVar = (name) => {
  const m = env.match(new RegExp(name + '=(.*)'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
};

const anonClient = createClient(getVar('NEXT_PUBLIC_SUPABASE_URL'), getVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
const adminClient = createClient(getVar('NEXT_PUBLIC_SUPABASE_URL'), getVar('SUPABASE_SERVICE_ROLE_KEY'));

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDir = path.resolve('C:/Users/ritik/.gemini/antigravity/brain/26a96ae2-7d28-4640-80b9-553f236fc3f0/real_route_pdfs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function inspectPdfGeometry(filePath) {
  const buf = fs.readFileSync(filePath);
  const str = buf.toString('latin1');
  const countMatch = str.match(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/) || str.match(/\/Count\s+(\d+)/);
  const mediaBoxMatch = str.match(/\/MediaBox\s*\[\s*([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s*\]/);

  const pageCount = countMatch ? parseInt(countMatch[1], 10) : null;
  const mediaBox = mediaBoxMatch ? {
    x1: parseFloat(mediaBoxMatch[1]),
    y1: parseFloat(mediaBoxMatch[2]),
    x2: parseFloat(mediaBoxMatch[3]),
    y2: parseFloat(mediaBoxMatch[4]),
    widthPt: parseFloat(mediaBoxMatch[3]),
    heightPt: parseFloat(mediaBoxMatch[4]),
  } : null;

  return { pageCount, mediaBox };
}

async function run() {
  console.log('Generating session for Super Admin...');
  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'heistofeverything@gmail.com'
  });
  const { data: verifyData } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  });

  const projectRef = 'bkqneudnnhvvwmtggorz';
  const cookieName = `sb-${projectRef}-auth-token`;
  const sessionStr = JSON.stringify(verifyData.session);
  const base64Session = Buffer.from(sessionStr).toString('base64');
  const cookieVal = `base64-${base64Session}`;

  console.log('Launching Puppeteer Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const page = await browser.newPage();
  await page.setCookie({
    name: cookieName,
    value: cookieVal,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
  });

  const quotationId = '44abdc35-2d0f-4fbf-ac9e-05dd40c4ea2d'; // QT-2026-27-005
  const url = `http://localhost:3000/staff/quotations/${quotationId}/pdf`;
  console.log(`Navigating to actual route: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle0' });

  // 1. Render PDF without format argument (relying on CSS @page size)
  const cssPdfPath = path.join(outputDir, 'qt-2026-27-005-css-default.pdf');
  await page.pdf({
    path: cssPdfPath,
    preferCSSPageSize: true,
    printBackground: true,
  });
  console.log(`Saved CSS-driven PDF: ${cssPdfPath}`);

  // 2. Render PDF with explicit format A4
  const a4PdfPath = path.join(outputDir, 'qt-2026-27-005-explicit-a4.pdf');
  await page.pdf({
    path: a4PdfPath,
    format: 'A4',
    margin: { top: '8mm', bottom: '8mm', left: '10mm', right: '10mm' },
    preferCSSPageSize: true,
    printBackground: true,
  });
  console.log(`Saved Explicit A4 PDF: ${a4PdfPath}`);

  // 3. Render PDF with US Letter (to simulate browser default Letter)
  const letterPdfPath = path.join(outputDir, 'qt-2026-27-005-letter.pdf');
  await page.pdf({
    path: letterPdfPath,
    format: 'Letter',
    margin: { top: '8mm', bottom: '8mm', left: '10mm', right: '10mm' },
    preferCSSPageSize: false,
    printBackground: true,
  });
  console.log(`Saved Letter PDF: ${letterPdfPath}`);

  // Take screenshot of web view
  const previewPath = path.join(outputDir, 'qt-2026-27-005-live-route-view.png');
  await page.screenshot({ path: previewPath, fullPage: true });
  console.log(`Saved Live Route Screenshot: ${previewPath}`);

  await browser.close();

  console.log('\n--- PDF Geometry Analysis ---');
  for (const [name, p] of [
    ['CSS-driven PDF', cssPdfPath],
    ['Explicit A4 PDF', a4PdfPath],
    ['Letter PDF', letterPdfPath],
  ]) {
    const geo = inspectPdfGeometry(p);
    console.log(`${name}:`);
    console.log(`  Page count: ${geo.pageCount}`);
    if (geo.mediaBox) {
      console.log(`  MediaBox: [${geo.mediaBox.x1}, ${geo.mediaBox.y1}, ${geo.mediaBox.x2}, ${geo.mediaBox.y2}]`);
      console.log(`  Dimensions in pt: ${geo.mediaBox.widthPt} x ${geo.mediaBox.heightPt} pt`);
      console.log(`  Dimensions in mm: ${(geo.mediaBox.widthPt * 25.4 / 72).toFixed(1)} x ${(geo.mediaBox.heightPt * 25.4 / 72).toFixed(1)} mm`);
    }
  }
}

run().catch(console.error);

