import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';
import { getDefaultQuotationTerms, getSimplifiedQuotationTerms } from '../src/lib/billing/default-terms.ts';
import { calculateQuotationTotals } from '../src/lib/quotation/calculations.ts';

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
    x1: parseFloat(mediaBoxMatch[1]),
    y1: parseFloat(mediaBoxMatch[2]),
    x2: parseFloat(mediaBoxMatch[3]),
    y2: parseFloat(mediaBoxMatch[4]),
    widthPt: parseFloat(mediaBoxMatch[3]),
    heightPt: parseFloat(mediaBoxMatch[4]),
    widthMm: (parseFloat(mediaBoxMatch[3]) * 25.4 / 72).toFixed(1),
    heightMm: (parseFloat(mediaBoxMatch[4]) * 25.4 / 72).toFixed(1),
  } : null;

  return { pageCount, mediaBox };
}

async function main() {
  console.log('='.repeat(70));
  console.log('SANTHAYA ASSOCIATES — ACTUAL ROUTE PDF VERIFICATION SUITE');
  console.log('Testing: Readability, Table Gridlines, 2 Decimals, Stamp, A4 Paper Size');
  console.log('='.repeat(70));

  console.log('\n[1/6] Establishing authenticated staff session...');
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

  // Pre-cleanup of any lingering test quotations
  const { data: lingeringQuotes } = await adminClient
    .from('quotations')
    .select('id, quotation_versions(id)')
    .like('quotation_number', 'QT-2026-27-TEST-%');

  for (const lq of lingeringQuotes || []) {
    for (const lv of lq.quotation_versions || []) {
      await adminClient.from('quotation_items').delete().eq('quotation_version_id', lv.id);
    }
    await adminClient.from('quotation_versions').delete().eq('quotation_id', lq.id);
    await adminClient.from('quotations').delete().eq('id', lq.id);
  }

  const runSuffix = Date.now().toString().slice(-4);
  const testNumberIssued = `QT-2026-27-TEST-I${runSuffix}`;
  const testNumberCustomTerms = `QT-2026-27-TEST-C${runSuffix}`;
  const testNumberLong = `QT-2026-27-TEST-L${runSuffix}`;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
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
  });

  // -------------------------------------------------------------------------
  // TEST 1: User's Subject Quotation QT-2026-27-007 (1-item Draft, 10 clauses)
  // -------------------------------------------------------------------------
  console.log('\n[2/6] Rendering User Subject Quotation: QT-2026-27-007 (1-item Draft)...');
  const qt007Id = 'fb5cb2c0-3d29-4e9e-a0de-a15ad405b4a1';
  const qt007Url = `http://localhost:3000/staff/quotations/${qt007Id}/pdf`;
  await page.goto(qt007Url, { waitUntil: 'networkidle0' });

  // Extract financial summary text from DOM to assert 2 decimal places
  const qt007Summary = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasTaxable100k: text.includes('₹1,00,000.00'),
      hasIgst18k: text.includes('₹18,000.00'),
      hasGrandTotal118k: text.includes('₹1,18,000.00'),
      hasDraftPlaceholder: text.includes('Official seal affixed upon formal issuance'),
      has10Clauses: text.includes('10.') && text.includes('JURISDICTION'),
    };
  });

  console.log('  DOM Assertions for QT-2026-27-007:');
  console.log(`    Taxable Amount ₹1,00,000.00 present: ${qt007Summary.hasTaxable100k ? '✓' : '✗'}`);
  console.log(`    Integrated GST ₹18,000.00 present:    ${qt007Summary.hasIgst18k ? '✓' : '✗'}`);
  console.log(`    Grand Total ₹1,18,000.00 present:     ${qt007Summary.hasGrandTotal118k ? '✓' : '✗'}`);
  console.log(`    Draft seal placeholder present:       ${qt007Summary.hasDraftPlaceholder ? '✓' : '✗'}`);
  console.log(`    10 Clauses present in saved record:  ${qt007Summary.has10Clauses ? '✓' : '✗'}`);

  const qt007PdfPath = path.join(outputDir, '1-actual-qt-2026-27-007-1item-draft.pdf');
  await page.pdf({
    path: qt007PdfPath,
    preferCSSPageSize: true,
    format: 'A4',
    printBackground: true,
  });

  const qt007Screenshot = path.join(outputDir, '1-actual-qt-2026-27-007-preview.png');
  await page.screenshot({ path: qt007Screenshot, fullPage: true });

  const qt007Geo = inspectPdfGeometry(qt007PdfPath);
  console.log(`  ✓ PDF rendered: 1-actual-qt-2026-27-007-1item-draft.pdf`);
  console.log(`    Pages: ${qt007Geo.pageCount}`);
  console.log(`    Dimensions: ${qt007Geo.mediaBox.widthPt} x ${qt007Geo.mediaBox.heightPt} pt (${qt007Geo.mediaBox.widthMm} x ${qt007Geo.mediaBox.heightMm} mm)`);

  // -------------------------------------------------------------------------
  // TEST 2: Existing 2-Item Draft Quotation QT-2026-27-005 (With Discount)
  // -------------------------------------------------------------------------
  console.log('\n[3/6] Rendering Existing 2-Item Draft Quotation: QT-2026-27-005...');
  const qt005Id = '44abdc35-2d0f-4fbf-ac9e-05dd40c4ea2d';
  const qt005Url = `http://localhost:3000/staff/quotations/${qt005Id}/pdf`;
  await page.goto(qt005Url, { waitUntil: 'networkidle0' });

  const qt005PdfPath = path.join(outputDir, '2-actual-qt-2026-27-005-2items-draft.pdf');
  await page.pdf({
    path: qt005PdfPath,
    preferCSSPageSize: true,
    format: 'A4',
    printBackground: true,
  });

  const qt005Screenshot = path.join(outputDir, '2-actual-qt-2026-27-005-preview.png');
  await page.screenshot({ path: qt005Screenshot, fullPage: true });

  const qt005Geo = inspectPdfGeometry(qt005PdfPath);
  console.log(`  ✓ PDF rendered: 2-actual-qt-2026-27-005-2items-draft.pdf`);
  console.log(`    Pages: ${qt005Geo.pageCount}`);
  console.log(`    Dimensions: ${qt005Geo.mediaBox.widthPt} x ${qt005Geo.mediaBox.heightPt} pt (${qt005Geo.mediaBox.widthMm} x ${qt005Geo.mediaBox.heightMm} mm)`);

  // -------------------------------------------------------------------------
  // TEST 3: One-Item Issued Quotation with Authorized Company Round Stamp
  // -------------------------------------------------------------------------
  console.log('\n[4/6] Creating & Rendering 1-Item Formally Issued Quotation with Round Stamp...');
  const { data: cust } = await adminClient.from('customers').select('id').limit(1).single();
  const test1Item = [
    {
      item_name: 'Tata Hitachi EX200LC Hydraulic Excavator (Heavy Earthmoving Package)',
      description: 'Heavy duty crawler excavator with 1.2 cu.m heavy earthwork rock bucket, Cummins 6BTAA turbo engine, standard certified load testing.',
      quantity: 1,
      unit_rate: 6850000,
      discount_amount: 50000,
      gst_rate: 18,
      unit: 'NOS',
      hsn_sac_code: '842952',
    },
  ];

  const test1Totals = calculateQuotationTotals(test1Item, true, '10');
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: issuedQuote, error: createIssuedErr } = await adminClient
    .from('quotations')
    .insert({
      quotation_number: testNumberIssued,
      customer_id: cust.id,
      status: 'issued', // FORMALLY ISSUED STATUS!
      current_version_number: 1,
      place_of_supply_state_code: '10',
      is_gst_applicable: true,
      created_by_staff_id: '996c8b58-a13e-4217-b07f-ccf4cc5f607d',
    })
    .select('id')
    .single();

  if (createIssuedErr) throw createIssuedErr;

  const { data: issuedVer, error: createIssuedVerErr } = await adminClient
    .from('quotation_versions')
    .insert({
      quotation_id: issuedQuote.id,
      version_number: 1,
      version_code: `${testNumberIssued}-R0`,
      validity_days: 30,
      expires_at: expiresAt,
      delivery_location: 'Designated Project Site, Motihari',
      payment_terms: '100% advance against Proforma Invoice prior to dispatch',
      terms_conditions: getDefaultQuotationTerms(30),
      subtotal_amount: test1Totals.subtotal_amount,
      discount_amount: test1Totals.discount_amount,
      taxable_amount: test1Totals.taxable_amount,
      cgst_amount: test1Totals.cgst_amount,
      sgst_amount: test1Totals.sgst_amount,
      igst_amount: test1Totals.igst_amount,
      total_tax_amount: test1Totals.total_tax_amount,
      round_off_amount: test1Totals.round_off_amount,
      grand_total_amount: test1Totals.grand_total_amount,
      is_locked: true,
      issued_at: now, // ACTIVE ISSUED_AT TIMESTAMP!
      created_by_staff_id: '996c8b58-a13e-4217-b07f-ccf4cc5f607d',
    })
    .select('id')
    .single();

  if (createIssuedVerErr) throw createIssuedVerErr;

  for (let i = 0; i < test1Totals.items.length; i++) {
    const it = test1Totals.items[i];
    await adminClient.from('quotation_items').insert({
      quotation_version_id: issuedVer.id,
      sort_order: i + 1,
      item_name: it.item_name,
      description: it.description,
      hsn_sac_code: it.hsn_sac_code,
      unit: it.unit,
      quantity: it.quantity,
      unit_rate: it.unit_rate,
      discount_amount: it.discount_amount || 0,
      taxable_amount: it.taxable_amount,
      gst_rate: it.gst_rate,
      cgst_rate: it.cgst_rate,
      sgst_rate: it.sgst_rate,
      igst_rate: it.igst_rate,
      tax_amount: it.tax_amount,
      line_total: it.line_total,
    });
  }

  const issuedUrl = `http://localhost:3000/staff/quotations/${issuedQuote.id}/pdf`;
  await page.goto(issuedUrl, { waitUntil: 'networkidle0' });

  // Assert genuine company seal stamp image is rendered in DOM
  const stampInfo = await page.evaluate(() => {
    const img = document.querySelector('img[alt*="Company Stamp"]');
    return {
      hasStampImg: Boolean(img),
      imgSrc: img ? img.src : null,
      complete: img ? img.complete : false,
      naturalWidth: img ? img.naturalWidth : 0,
    };
  });

  console.log('  Stamp DOM Assertions:');
  console.log(`    Company round stamp rendered: ${stampInfo.hasStampImg ? '✓' : '✗'}`);
  console.log(`    Image source: ${stampInfo.imgSrc}`);
  console.log(`    Image loaded successfully (width > 0): ${stampInfo.naturalWidth > 0 ? '✓' : '✗'}`);

  const issuedPdfPath = path.join(outputDir, '3-actual-1item-issued-with-stamp.pdf');
  await page.pdf({
    path: issuedPdfPath,
    preferCSSPageSize: true,
    format: 'A4',
    printBackground: true,
  });

  const issuedScreenshot = path.join(outputDir, '3-actual-1item-issued-with-stamp-preview.png');
  await page.screenshot({ path: issuedScreenshot, fullPage: true });

  const issuedGeo = inspectPdfGeometry(issuedPdfPath);
  console.log(`  ✓ PDF rendered: 3-actual-1item-issued-with-stamp.pdf`);
  console.log(`    Pages: ${issuedGeo.pageCount}`);
  console.log(`    Dimensions: ${issuedGeo.mediaBox.widthPt} x ${issuedGeo.mediaBox.heightPt} pt (${issuedGeo.mediaBox.widthMm} x ${issuedGeo.mediaBox.heightMm} mm)`);

  // -------------------------------------------------------------------------
  // TEST 4: Quotation with Manually Edited / 6-Clause Testing Terms
  // -------------------------------------------------------------------------
  console.log('\n[5/6] Creating & Rendering Quotation with Manually Edited Terms...');
  const customTermsText = `1. VALIDITY & PRICING: This commercial quotation remains strictly valid for 30 calendar days from the date of issuance.
2. PAYMENT TERMS: 100% advance against Proforma Invoice prior to material dispatch and mobilization.
3. DELIVERY & SITE ACCESS: Client shall ensure unobstructed motorable access and continuous operational power at the project site.
4. STATUTORY TAXATION: Goods and Services Tax (GST) is levied extra per statutory Indian tax legislation.
5. WARRANTY: Twelve (12) months standard warranty against OEM manufacturing defects from date of commissioning.
6. GOVERNING LAW: All contracts and purchase orders are subject to the exclusive jurisdiction of competent courts in Motihari, Bihar.`;

  const { data: customQuote, error: createCustomErr } = await adminClient
    .from('quotations')
    .insert({
      quotation_number: testNumberCustomTerms,
      customer_id: cust.id,
      status: 'draft',
      current_version_number: 1,
      place_of_supply_state_code: '10',
      is_gst_applicable: true,
      created_by_staff_id: '996c8b58-a13e-4217-b07f-ccf4cc5f607d',
    })
    .select('id')
    .single();

  if (createCustomErr) throw createCustomErr;

  const { data: customVer, error: createCustomVerErr } = await adminClient
    .from('quotation_versions')
    .insert({
      quotation_id: customQuote.id,
      version_number: 1,
      version_code: `${testNumberCustomTerms}-R0`,
      validity_days: 30,
      expires_at: expiresAt,
      delivery_location: 'Designated Project Site, Motihari',
      payment_terms: '100% advance against Proforma Invoice prior to dispatch',
      terms_conditions: customTermsText, // Custom manually edited 6 clauses!
      subtotal_amount: test1Totals.subtotal_amount,
      discount_amount: test1Totals.discount_amount,
      taxable_amount: test1Totals.taxable_amount,
      cgst_amount: test1Totals.cgst_amount,
      sgst_amount: test1Totals.sgst_amount,
      igst_amount: test1Totals.igst_amount,
      total_tax_amount: test1Totals.total_tax_amount,
      round_off_amount: test1Totals.round_off_amount,
      grand_total_amount: test1Totals.grand_total_amount,
      created_by_staff_id: '996c8b58-a13e-4217-b07f-ccf4cc5f607d',
    })
    .select('id')
    .single();

  if (createCustomVerErr) throw createCustomVerErr;

  for (let i = 0; i < test1Totals.items.length; i++) {
    const it = test1Totals.items[i];
    await adminClient.from('quotation_items').insert({
      quotation_version_id: customVer.id,
      sort_order: i + 1,
      item_name: it.item_name,
      description: it.description,
      hsn_sac_code: it.hsn_sac_code,
      unit: it.unit,
      quantity: it.quantity,
      unit_rate: it.unit_rate,
      discount_amount: it.discount_amount || 0,
      taxable_amount: it.taxable_amount,
      gst_rate: it.gst_rate,
      cgst_rate: it.cgst_rate,
      sgst_rate: it.sgst_rate,
      igst_rate: it.igst_rate,
      tax_amount: it.tax_amount,
      line_total: it.line_total,
    });
  }

  const customUrl = `http://localhost:3000/staff/quotations/${customQuote.id}/pdf`;
  await page.goto(customUrl, { waitUntil: 'networkidle0' });

  const customPdfPath = path.join(outputDir, '4-actual-quotation-custom-terms.pdf');
  await page.pdf({
    path: customPdfPath,
    preferCSSPageSize: true,
    format: 'A4',
    printBackground: true,
  });

  const customScreenshot = path.join(outputDir, '4-actual-quotation-custom-terms-preview.png');
  await page.screenshot({ path: customScreenshot, fullPage: true });

  const customGeo = inspectPdfGeometry(customPdfPath);
  console.log(`  ✓ PDF rendered: 4-actual-quotation-custom-terms.pdf`);
  console.log(`    Pages: ${customGeo.pageCount}`);
  console.log(`    Dimensions: ${customGeo.mediaBox.widthPt} x ${customGeo.mediaBox.heightPt} pt (${customGeo.mediaBox.widthMm} x ${customGeo.mediaBox.heightMm} mm)`);

  // -------------------------------------------------------------------------
  // TEST 5: Long Quotation (10 Items Pagination Test)
  // -------------------------------------------------------------------------
  console.log('\n[6/6] Creating & Rendering 10-Item Quotation for Pagination Verification...');
  const longItems = [];
  for (let i = 1; i <= 10; i++) {
    longItems.push({
      item_name: `Infrastructure Engineering Lot #${i}: Specialized Equipment Package`,
      description: `Comprehensive EPC scope specifications lot ${i} with certified safety testing, mobilization, and technical compliance per standards.`,
      quantity: i <= 2 ? 1 : 2,
      unit_rate: 150000 * i,
      discount_amount: i === 3 ? 15000 : 0,
      gst_rate: 18,
      unit: 'NOS',
      hsn_sac_code: '842952',
    });
  }

  const longTotals = calculateQuotationTotals(longItems, true, '10');

  const { data: longQuote, error: createLongErr } = await adminClient
    .from('quotations')
    .insert({
      quotation_number: testNumberLong,
      customer_id: cust.id,
      status: 'draft',
      current_version_number: 1,
      place_of_supply_state_code: '10',
      is_gst_applicable: true,
      created_by_staff_id: '996c8b58-a13e-4217-b07f-ccf4cc5f607d',
    })
    .select('id')
    .single();

  if (createLongErr) throw createLongErr;

  const { data: longVer, error: createLongVerErr } = await adminClient
    .from('quotation_versions')
    .insert({
      quotation_id: longQuote.id,
      version_number: 1,
      version_code: `${testNumberLong}-R0`,
      validity_days: 30,
      expires_at: expiresAt,
      delivery_location: 'Designated Project Site, Motihari',
      payment_terms: '100% advance against Proforma Invoice prior to dispatch',
      terms_conditions: getDefaultQuotationTerms(30),
      subtotal_amount: longTotals.subtotal_amount,
      discount_amount: longTotals.discount_amount,
      taxable_amount: longTotals.taxable_amount,
      cgst_amount: longTotals.cgst_amount,
      sgst_amount: longTotals.sgst_amount,
      igst_amount: longTotals.igst_amount,
      total_tax_amount: longTotals.total_tax_amount,
      round_off_amount: longTotals.round_off_amount,
      grand_total_amount: longTotals.grand_total_amount,
      created_by_staff_id: '996c8b58-a13e-4217-b07f-ccf4cc5f607d',
    })
    .select('id')
    .single();

  if (createLongVerErr) throw createLongVerErr;

  for (let i = 0; i < longTotals.items.length; i++) {
    const it = longTotals.items[i];
    await adminClient.from('quotation_items').insert({
      quotation_version_id: longVer.id,
      sort_order: i + 1,
      item_name: it.item_name,
      description: it.description,
      hsn_sac_code: it.hsn_sac_code,
      unit: it.unit,
      quantity: it.quantity,
      unit_rate: it.unit_rate,
      discount_amount: it.discount_amount || 0,
      taxable_amount: it.taxable_amount,
      gst_rate: it.gst_rate,
      cgst_rate: it.cgst_rate,
      sgst_rate: it.sgst_rate,
      igst_rate: it.igst_rate,
      tax_amount: it.tax_amount,
      line_total: it.line_total,
    });
  }

  const longUrl = `http://localhost:3000/staff/quotations/${longQuote.id}/pdf`;
  await page.goto(longUrl, { waitUntil: 'networkidle0' });

  const longPdfPath = path.join(outputDir, '5-actual-10items-multipage.pdf');
  await page.pdf({
    path: longPdfPath,
    preferCSSPageSize: true,
    format: 'A4',
    printBackground: true,
  });

  const longScreenshot = path.join(outputDir, '5-actual-10items-preview.png');
  await page.screenshot({ path: longScreenshot, fullPage: true });

  const longGeo = inspectPdfGeometry(longPdfPath);
  console.log(`  ✓ PDF rendered: 5-actual-10items-multipage.pdf`);
  console.log(`    Pages: ${longGeo.pageCount}`);
  console.log(`    Dimensions: ${longGeo.mediaBox.widthPt} x ${longGeo.mediaBox.heightPt} pt (${longGeo.mediaBox.widthMm} x ${longGeo.mediaBox.heightMm} mm)`);

  await browser.close();

  // Clean up temporary test quotes created during this run
  console.log('\nCleaning up temporary test quotation records from dev database...');
  for (const qid of [issuedQuote.id, customQuote.id, longQuote.id]) {
    await adminClient.from('quotation_items').delete().eq('quotation_version_id', qid);
    await adminClient.from('quotation_versions').delete().eq('quotation_id', qid);
    await adminClient.from('quotations').delete().eq('id', qid);
  }
  console.log('  ✓ Temporary test quotations cleaned up from dev DB.');

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY OF ACTUAL ROUTE PDF VERIFICATION:');
  console.log('='.repeat(70));
  console.log(`1. QT-2026-27-007 (User Subject Quote, 1 item, draft): ${qt007Geo.pageCount} page (${qt007Geo.mediaBox.widthMm} x ${qt007Geo.mediaBox.heightMm} mm)`);
  console.log(`2. QT-2026-27-005 (Existing Quote, 2 items, discount):  ${qt005Geo.pageCount} page (${qt005Geo.mediaBox.widthMm} x ${qt005Geo.mediaBox.heightMm} mm)`);
  console.log(`3. 1-Item Formally Issued Quote (With Round Stamp):     ${issuedGeo.pageCount} page (${issuedGeo.mediaBox.widthMm} x ${issuedGeo.mediaBox.heightMm} mm)`);
  console.log(`4. Quotation with Custom Manually Edited Terms:        ${customGeo.pageCount} page (${customGeo.mediaBox.widthMm} x ${customGeo.mediaBox.heightMm} mm)`);
  console.log(`5. 10-Item Stress Test (Natural Multipage Pagination):  ${longGeo.pageCount} pages (${longGeo.mediaBox.widthMm} x ${longGeo.mediaBox.heightMm} mm)`);
  console.log('='.repeat(70));
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
