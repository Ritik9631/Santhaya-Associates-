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
const artifactDir = path.resolve('C:/Users/ritik/.gemini/antigravity/brain/26a96ae2-7d28-4640-80b9-553f236fc3f0/actual_route_tests');
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

function inspectPdfGeometry(filePath) {
  const buf = fs.readFileSync(filePath);
  const str = buf.toString('latin1');
  const countMatch = str.match(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/) || str.match(/\/Count\s+(\d+)/);
  const mediaBoxMatch = str.match(/\/MediaBox\s*\[\s*([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s*\]/);

  const pageCount = countMatch ? parseInt(countMatch[1], 10) : null;
  const mediaBox = mediaBoxMatch ? {
    widthPt: parseFloat(mediaBoxMatch[3]),
    heightPt: parseFloat(mediaBoxMatch[4]),
    widthMm: (parseFloat(mediaBoxMatch[3]) * 25.4 / 72).toFixed(1),
    heightMm: (parseFloat(mediaBoxMatch[4]) * 25.4 / 72).toFixed(1),
  } : null;

  return { pageCount, mediaBox };
}

async function verify() {
  console.log('='.repeat(70));
  console.log('SANTHAYA ASSOCIATES — QUOTATION TEMPLATE UPDATE VERIFICATION');
  console.log('Reference Quotation: QT-2026-27-010 (Issued) & QT-2026-27-007 (Draft)');
  console.log('='.repeat(70));

  console.log('\n[1/5] Establishing authenticated staff session for Super Admin...');
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'heistofeverything@gmail.com',
  });
  if (linkErr) throw linkErr;

  const { data: verifyData, error: verifyErr } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });
  if (verifyErr) throw verifyErr;

  const projectRef = 'bkqneudnnhvvwmtggorz';
  const cookieName = `sb-${projectRef}-auth-token`;
  const sessionStr = JSON.stringify(verifyData.session);
  const base64Session = Buffer.from(sessionStr).toString('base64');
  const cookieVal = `base64-${base64Session}`;

  console.log('  ✓ Staff session verified for Super Admin.');

  console.log('\n[2/5] Launching Chrome headless browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
  await page.setCookie({
    name: cookieName,
    value: cookieVal,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  });

  // TEST 1: Reference Quotation QT-2026-27-010 (Issued)
  console.log('\n[3/5] Testing Reference Quotation QT-2026-27-010 (Issued)...');
  const quote10Id = '42e453bd-0323-4c44-b7f5-a5b19268ba79';
  const quote10Url = `http://localhost:3000/staff/quotations/${quote10Id}/pdf`;
  await page.goto(quote10Url, { waitUntil: 'networkidle0' });

  // DOM content assertions
  const domChecks10 = await page.evaluate(() => {
    const text = document.body.innerText;
    const hasCommercialNotes = text.includes('COMMERCIAL NOTES');
    const hasBankDetails = text.includes('BANK DETAILS');
    const hasSbi = text.includes('State Bank of India');
    const hasAccountNo = text.includes('45696995612');
    const hasIfsc = text.includes('SBIN0001763');
    const hasCallLabel = text.includes('Call:') && text.includes('+91 9430986713');
    const hasWhatsAppLabel = text.includes('WhatsApp:') && text.includes('+91 9608950748');

    // Stamp alignment check
    const stampImg = document.querySelector('img[alt*="Company Stamp"]');
    const stampBox = document.querySelector('.stamp-authorization-box');
    let stampAlignedRight = false;
    if (stampImg && stampBox) {
      const imgRect = stampImg.getBoundingClientRect();
      const boxRect = stampBox.getBoundingClientRect();
      // Stamp should be near the right edge of stampBox
      const rightDiff = Math.abs(boxRect.right - imgRect.right);
      stampAlignedRight = rightDiff < 30; // Within 30px of right margin (padding)
    }

    return {
      hasCommercialNotes,
      hasBankDetails,
      hasSbi,
      hasAccountNo,
      hasIfsc,
      hasCallLabel,
      hasWhatsAppLabel,
      hasStamp: Boolean(stampImg),
      stampAlignedRight,
    };
  });

  console.log('  - Commercial Notes absent:', !domChecks10.hasCommercialNotes ? '✓ YES (ABSENT)' : '✗ FAILED');
  console.log('  - Bank Details heading:', domChecks10.hasBankDetails ? '✓ PRESENT' : '✗ MISSING');
  console.log('  - Bank Name (State Bank of India):', domChecks10.hasSbi ? '✓ PRESENT' : '✗ MISSING');
  console.log('  - Account No. (45696995612):', domChecks10.hasAccountNo ? '✓ PRESENT' : '✗ MISSING');
  console.log('  - IFSC Code (SBIN0001763):', domChecks10.hasIfsc ? '✓ PRESENT' : '✗ MISSING');
  console.log('  - Call label (+91 9430986713):', domChecks10.hasCallLabel ? '✓ PRESENT' : '✗ MISSING');
  console.log('  - WhatsApp label (+91 9608950748):', domChecks10.hasWhatsAppLabel ? '✓ PRESENT' : '✗ MISSING');
  console.log('  - Official Round Stamp present:', domChecks10.hasStamp ? '✓ PRESENT' : '✗ MISSING');
  console.log('  - Round Stamp right-aligned in authorization block:', domChecks10.stampAlignedRight ? '✓ YES (RIGHT-ALIGNED)' : '✗ NO');

  // Export Screenshot & PDF for QT-2026-27-010
  const pdf10Path = path.join(artifactDir, 'qt-2026-27-010-actual-issued.pdf');
  const png10Path = path.join(artifactDir, 'qt-2026-27-010-actual-issued-preview.png');
  await page.screenshot({ path: png10Path, fullPage: true });

  await page.emulateMediaType('print');
  await page.pdf({
    path: pdf10Path,
    format: 'A4',
    printBackground: true,
    margin: { top: '8mm', bottom: '8mm', left: '10mm', right: '10mm' },
  });

  const geo10 = inspectPdfGeometry(pdf10Path);
  console.log(`  - Exported PDF Page Count: ${geo10.pageCount} page(s)`);
  console.log(`  - Exported PDF Dimensions: ${geo10.mediaBox.widthMm}mm × ${geo10.mediaBox.heightMm}mm (A4 = 210 × 297mm)`);

  // TEST 2: Draft Quotation QT-2026-27-007 (Draft)
  console.log('\n[4/5] Testing Draft Quotation QT-2026-27-007 (Draft)...');
  const quote7Id = 'fb5cb2c0-3d29-4e9e-a0de-a15ad405b4a1';
  const quote7Url = `http://localhost:3000/staff/quotations/${quote7Id}/pdf`;
  await page.emulateMediaType('screen');
  await page.goto(quote7Url, { waitUntil: 'networkidle0' });

  const domChecks7 = await page.evaluate(() => {
    const text = document.body.innerText;
    const hasCommercialNotes = text.includes('COMMERCIAL NOTES');
    const hasBankDetails = text.includes('BANK DETAILS');
    const hasSbi = text.includes('State Bank of India');
    const hasAccountNo = text.includes('45696995612');
    const hasIfsc = text.includes('SBIN0001763');
    const hasCallLabel = text.includes('Call:') && text.includes('+91 9430986713');
    const hasWhatsAppLabel = text.includes('WhatsApp:') && text.includes('+91 9608950748');
    const hasSealPlaceholder = text.includes('Official seal affixed upon formal issuance');
    const stampImg = document.querySelector('img[alt*="Company Stamp"]');

    return {
      hasCommercialNotes,
      hasBankDetails,
      hasSbi,
      hasAccountNo,
      hasIfsc,
      hasCallLabel,
      hasWhatsAppLabel,
      hasSealPlaceholder,
      hasStamp: Boolean(stampImg),
    };
  });

  console.log('  - Commercial Notes absent:', !domChecks7.hasCommercialNotes ? '✓ YES (ABSENT)' : '✗ FAILED');
  console.log('  - Bank Details heading:', domChecks7.hasBankDetails ? '✓ PRESENT' : '✗ MISSING');
  console.log('  - Bank Name (State Bank of India):', domChecks7.hasSbi ? '✓ PRESENT' : '✗ MISSING');
  console.log('  - Account No. (45696995612):', domChecks7.hasAccountNo ? '✓ PRESENT' : '✗ MISSING');
  console.log('  - IFSC Code (SBIN0001763):', domChecks7.hasIfsc ? '✓ PRESENT' : '✗ MISSING');
  console.log('  - Call label (+91 9430986713):', domChecks7.hasCallLabel ? '✓ PRESENT' : '✗ MISSING');
  console.log('  - WhatsApp label (+91 9608950748):', domChecks7.hasWhatsAppLabel ? '✓ PRESENT' : '✗ MISSING');
  console.log('  - Draft seal placeholder note present:', domChecks7.hasSealPlaceholder ? '✓ YES' : '✗ MISSING');
  console.log('  - Unstamped (Draft):', !domChecks7.hasStamp ? '✓ STRICTLY UNSTAMPED' : '✗ UNEXPECTED STAMP');

  // Export Screenshot & PDF for QT-2026-27-007
  const pdf7Path = path.join(artifactDir, 'qt-2026-27-007-actual-draft.pdf');
  const png7Path = path.join(artifactDir, 'qt-2026-27-007-actual-draft-preview.png');
  await page.screenshot({ path: png7Path, fullPage: true });

  await page.emulateMediaType('print');
  await page.pdf({
    path: pdf7Path,
    format: 'A4',
    printBackground: true,
    margin: { top: '8mm', bottom: '8mm', left: '10mm', right: '10mm' },
  });

  const geo7 = inspectPdfGeometry(pdf7Path);
  console.log(`  - Exported PDF Page Count: ${geo7.pageCount} page(s)`);
  console.log(`  - Exported PDF Dimensions: ${geo7.mediaBox.widthMm}mm × ${geo7.mediaBox.heightMm}mm (A4 = 210 × 297mm)`);

  await browser.close();

  console.log('\n[5/5] Final Verification Summary:');
  const allPassed =
    !domChecks10.hasCommercialNotes &&
    domChecks10.hasBankDetails &&
    domChecks10.hasSbi &&
    domChecks10.hasAccountNo &&
    domChecks10.hasIfsc &&
    domChecks10.hasCallLabel &&
    domChecks10.hasWhatsAppLabel &&
    domChecks10.hasStamp &&
    domChecks10.stampAlignedRight &&
    geo10.pageCount === 1 &&
    !domChecks7.hasCommercialNotes &&
    domChecks7.hasBankDetails &&
    domChecks7.hasCallLabel &&
    domChecks7.hasWhatsAppLabel &&
    domChecks7.hasSealPlaceholder &&
    !domChecks7.hasStamp &&
    geo7.pageCount === 1;

  if (allPassed) {
    console.log('  🎉 ALL QUOTATION TEMPLATE REQUIREMENTS VERIFIED 100% SUCCESSFULLY!');
  } else {
    console.error('  ❌ ONE OR MORE VERIFICATION CHECKS FAILED.');
    process.exit(1);
  }
}

verify().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});

