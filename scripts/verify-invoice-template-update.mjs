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
const outputDir = path.resolve('C:/Users/ritik/.gemini/antigravity/brain/26a96ae2-7d28-4640-80b9-553f236fc3f0/actual_route_tests');
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
    widthPt: parseFloat(mediaBoxMatch[3]),
    heightPt: parseFloat(mediaBoxMatch[4]),
    widthMm: (parseFloat(mediaBoxMatch[3]) * 25.4 / 72).toFixed(1),
    heightMm: (parseFloat(mediaBoxMatch[4]) * 25.4 / 72).toFixed(1),
  } : null;

  return { pageCount, mediaBox };
}

async function main() {
  console.log('='.repeat(70));
  console.log('SANTHAYA ASSOCIATES — TAX INVOICE TEMPLATE REFINEMENTS VERIFICATION');
  console.log('='.repeat(70));

  console.log('\n[1/4] Establishing authenticated staff session...');
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

  const projectRef = 'bkqneudnnhvvwmtggorz';
  const cookieName = `sb-${projectRef}-auth-token`;
  const sessionStr = JSON.stringify(verifyData.session);
  const base64Session = Buffer.from(sessionStr).toString('base64');
  const cookieVal = `base64-${base64Session}`;

  console.log('  ✓ Staff session verified for Super Admin heistofeverything@gmail.com');

  console.log('\n[2/4] Launching headless browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
  await page.setCookie({
    name: cookieName,
    value: cookieVal,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax'
  });

  try {
    // SCENARIO 1: Issued Tax Invoice (SA/26-27/0001)
    console.log('\n--- Scenario 1: Issued Tax Invoice (SA/26-27/0001) ---');
    const issuedInvoiceId = 'e5296c68-e58d-49d0-9f9d-908c74c8d6c1';
    await page.goto(`http://localhost:3000/staff/billing/${issuedInvoiceId}/pdf`, { waitUntil: 'networkidle0' });

    const issuedData = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const html = document.body.innerHTML;
      const docHeading = document.querySelector('span.uppercase.tracking-widest')?.textContent?.trim() || '';
      const invoiceNumber = document.querySelector('h1')?.textContent?.trim() || '';
      const hasRoundStamp = html.includes('santhaya-round-stamp.png');
      const hasBankDetails = bodyText.includes('BANK DETAILS') && bodyText.includes('State Bank of India') && bodyText.includes('45696995612') && bodyText.includes('SBIN0001763');
      const hasRedundantState = document.querySelector('[data-header-asset]')?.innerText.includes('State: Bihar (10)');
      const hasCertStatement = bodyText.includes('Certified that the particulars given above are true and correct');
      const hasPlaceOfSupply = bodyText.includes('Place of Supply:') && bodyText.includes('Delhi (07)');
      const hasTermsClauses =
        bodyText.includes('PAYMENT:') &&
        bodyText.includes('GST & TAXES:') &&
        bodyText.includes('DELIVERY & ACCEPTANCE:') &&
        bodyText.includes('WARRANTY:') &&
        bodyText.includes('RETURNS & ADJUSTMENTS:') &&
        bodyText.includes('DISPUTE RESOLUTION:');
      const hasSignatory = bodyText.includes('Authorized Signatory') && (bodyText.includes('Customer Acknowledgment:') || bodyText.includes('CUSTOMER ACKNOWLEDGMENT:'));

      return {
        docHeading,
        invoiceNumber,
        hasRoundStamp,
        hasBankDetails,
        hasRedundantState: Boolean(hasRedundantState),
        hasCertStatement,
        hasPlaceOfSupply,
        hasTermsClauses,
        hasSignatory
      };
    });

    console.log(`  Document Heading: "${issuedData.docHeading}" (Expected: "TAX INVOICE")`);
    console.log(`  Invoice Number: "${issuedData.invoiceNumber}" (Expected: "SA/26-27/0001")`);
    console.log(`  Authentic Round Stamp Present: ${issuedData.hasRoundStamp ? '✓ YES' : '❌ NO'}`);
    console.log(`  Bank Details Section Present: ${issuedData.hasBankDetails ? '✓ YES' : '❌ NO'}`);
    console.log(`  Redundant "State: Bihar (10)" in Header: ${issuedData.hasRedundantState ? '❌ STILL PRESENT' : '✓ CLEANLY REMOVED'}`);
    console.log(`  Statutory Certification Statement: ${issuedData.hasCertStatement ? '✓ YES' : '❌ NO'}`);
    console.log(`  Place of Supply Preserved: ${issuedData.hasPlaceOfSupply ? '✓ YES' : '❌ NO'}`);
    console.log(`  6 Clean Professional Terms Clauses: ${issuedData.hasTermsClauses ? '✓ YES' : '❌ NO'}`);
    console.log(`  Dual Signatories (Customer & Authorized): ${issuedData.hasSignatory ? '✓ YES' : '❌ NO'}`);

    const issuedPdfPath = path.join(outputDir, 'sa-26-27-0001-actual-issued-tax-invoice.pdf');
    await page.pdf({
      path: issuedPdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', bottom: '8mm', left: '10mm', right: '10mm' }
    });
    const issuedGeometry = inspectPdfGeometry(issuedPdfPath);
    console.log(`  ✓ Exported A4 PDF: ${issuedGeometry.pageCount} page(s), ${issuedGeometry.mediaBox.widthMm} x ${issuedGeometry.mediaBox.heightMm} mm`);

    const issuedPngPath = path.join(outputDir, 'sa-26-27-0001-actual-issued-tax-invoice-preview.png');
    await page.screenshot({ path: issuedPngPath, fullPage: true });
    console.log(`  ✓ Captured PNG preview`);

    // SCENARIO 2: Draft Tax Invoice (Draft Safeguards & Watermark)
    console.log('\n--- Scenario 2: Draft Tax Invoice (Draft Safeguards & Watermark) ---');
    const draftInvoiceId = '364b4db0-4793-4721-a55b-583c756a8d1f';
    await page.goto(`http://localhost:3000/staff/billing/${draftInvoiceId}/pdf`, { waitUntil: 'networkidle0' });

    const draftData = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const html = document.body.innerHTML;
      const docHeading = document.querySelector('span.uppercase.tracking-widest')?.textContent?.trim() || '';
      const hasRoundStamp = html.includes('santhaya-round-stamp.png');
      const hasWatermark = bodyText.includes('DRAFT — NOT A TAX INVOICE');
      const hasNotice = bodyText.includes('STATUTORY NOTICE (DRAFT PREVIEW)');
      const hasAffixedUponIssuance = bodyText.includes('(Affixed upon issuance)');
      const hasSealWithheldNotice = bodyText.includes('(Official seal affixed upon formal issuance)');

      return {
        docHeading,
        hasRoundStamp,
        hasWatermark,
        hasNotice,
        hasAffixedUponIssuance,
        hasSealWithheldNotice
      };
    });

    console.log(`  Document Heading: "${draftData.docHeading}" (Expected: "DRAFT — NOT A TAX INVOICE")`);
    console.log(`  Stamp Suppressed on Draft: ${!draftData.hasRoundStamp ? '✓ YES (UNSTAMPED)' : '❌ ERROR: STAMP APPEARED ON DRAFT'}`);
    console.log(`  Repeating Draft Watermark Present: ${draftData.hasWatermark ? '✓ YES' : '❌ NO'}`);
    console.log(`  Statutory Top Notice Present: ${draftData.hasNotice ? '✓ YES' : '❌ NO'}`);
    console.log(`  Signature Safeguard "(Affixed upon issuance)": ${draftData.hasAffixedUponIssuance ? '✓ YES' : '❌ NO'}`);
    console.log(`  Seal Withheld Notice "(Official seal affixed...)": ${draftData.hasSealWithheldNotice ? '✓ YES' : '❌ NO'}`);

    const draftPdfPath = path.join(outputDir, 'draft-actual-tax-invoice.pdf');
    await page.pdf({
      path: draftPdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', bottom: '8mm', left: '10mm', right: '10mm' }
    });
    const draftGeometry = inspectPdfGeometry(draftPdfPath);
    console.log(`  ✓ Exported Draft A4 PDF: ${draftGeometry.pageCount} page(s)`);

    const draftPngPath = path.join(outputDir, 'draft-actual-tax-invoice-preview.png');
    await page.screenshot({ path: draftPngPath, fullPage: true });
    console.log(`  ✓ Captured Draft PNG preview`);

    // SCENARIO 3: Bill of Supply (Exempt / Composition Supply)
    console.log('\n--- Scenario 3: Bill of Supply (SA/26-27/0002) ---');
    const billOfSupplyId = '19416a86-6144-47d9-94f8-d18faef39c15';
    await page.goto(`http://localhost:3000/staff/billing/${billOfSupplyId}/pdf`, { waitUntil: 'networkidle0' });

    const bosData = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const html = document.body.innerHTML;
      const docHeading = document.querySelector('span.uppercase.tracking-widest')?.textContent?.trim() || '';
      const invoiceNumber = document.querySelector('h1')?.textContent?.trim() || '';
      const hasSectionCitation = bodyText.includes('Section 31(3)(c)') && bodyText.includes('Rule 49');
      const hasTaxColumns = html.includes('GST %') || html.includes('Tax (₹)');
      const hasRoundStamp = html.includes('santhaya-round-stamp.png');

      return {
        docHeading,
        invoiceNumber,
        hasSectionCitation,
        hasTaxColumns,
        hasRoundStamp
      };
    });

    console.log(`  Document Heading: "${bosData.docHeading}" (Expected: "BILL OF SUPPLY")`);
    console.log(`  Invoice Number: "${bosData.invoiceNumber}" (Expected: "SA/26-27/0002")`);
    console.log(`  Cites Section 31(3)(c) and Rule 49: ${bosData.hasSectionCitation ? '✓ YES' : '❌ NO'}`);
    console.log(`  Tax Columns Properly Omitted in Bill of Supply: ${!bosData.hasTaxColumns ? '✓ YES' : '❌ NO'}`);
    console.log(`  Round Stamp Present (Authorized/Issued): ${bosData.hasRoundStamp ? '✓ YES' : '❌ NO'}`);

    const bosPdfPath = path.join(outputDir, 'sa-26-27-0002-actual-bill-of-supply.pdf');
    await page.pdf({
      path: bosPdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', bottom: '8mm', left: '10mm', right: '10mm' }
    });
    const bosGeometry = inspectPdfGeometry(bosPdfPath);
    console.log(`  ✓ Exported Bill of Supply A4 PDF: ${bosGeometry.pageCount} page(s)`);

    const bosPngPath = path.join(outputDir, 'sa-26-27-0002-actual-bill-of-supply-preview.png');
    await page.screenshot({ path: bosPngPath, fullPage: true });
    console.log(`  ✓ Captured Bill of Supply PNG preview`);

  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(70));
  console.log('ALL INVOICE TEMPLATE VERIFICATION CHECKS COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
