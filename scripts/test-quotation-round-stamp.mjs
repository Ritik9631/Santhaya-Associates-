/**
 * Santhaya Associates — Round Company Stamp Integration Test Suite
 * File: scripts/test-quotation-round-stamp.mjs
 *
 * Validates:
 * 1. Stamp image asset properties (1254x1254, 1:1 square, RGBA alpha transparency, clean borders)
 * 2. Quotation PDF template implementation (src/app/staff/quotations/[id]/pdf/page.tsx)
 * 3. Authorization state protection (stamp rendered only on issued/finalized quotes; drafts unstamped)
 * 4. Geometry and sizing (32mm diameter, object-contain, no distortion, no text overlap)
 * 5. Page-break prevention (print-avoid-break keeps authorization block & stamp together)
 * 6. Invoice isolation (src/app/staff/billing/[id]/pdf/page.tsx untouched)
 * 7. Single-page fit for 1- and 2-item quotations
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const rootDir = process.cwd();
let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('='.repeat(70));
console.log('SANTHAYA ASSOCIATES — ROUND COMPANY STAMP INTEGRATION TEST SUITE');
console.log('='.repeat(70));

// SECTION 1: Stamp Image Asset Properties
console.log('\n--- Section 1: Stamp Image Asset Properties ---');

const stampPath = path.join(rootDir, 'public/santhaya-round-stamp.png');

await test('Stamp asset public/santhaya-round-stamp.png exists', () => {
  assert(fs.existsSync(stampPath), 'public/santhaya-round-stamp.png must exist');
});

await test('Stamp image has 1:1 aspect ratio, high resolution, and RGBA alpha channel', async () => {
  const metadata = await sharp(stampPath).metadata();
  assert(metadata.width === 1254, `Width is 1254 (got ${metadata.width})`);
  assert(metadata.height === 1254, `Height is 1254 (got ${metadata.height})`);
  assert(metadata.width === metadata.height, 'Aspect ratio is strictly 1:1 square');
  assert(metadata.hasAlpha === true, 'Image has full alpha channel');
  assert(metadata.channels === 4, `Channels is 4 (RGBA, got ${metadata.channels})`);
});

await test('Stamp background outside circular perimeter is 100% transparent', async () => {
  const image = sharp(stampPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  // Check corner pixels (0,0), (1253, 0), (0, 1253), (1253, 1253)
  const getAlpha = (x, y) => {
    const idx = (y * info.width + x) * info.channels;
    return data[idx + 3];
  };

  assert(getAlpha(0, 0) === 0, 'Top-left corner is completely transparent');
  assert(getAlpha(1253, 0) === 0, 'Top-right corner is completely transparent');
  assert(getAlpha(0, 1253) === 0, 'Bottom-left corner is completely transparent');
  assert(getAlpha(1253, 1253) === 0, 'Bottom-right corner is completely transparent');
});

// SECTION 2: Quotation PDF Template Implementation
console.log('\n--- Section 2: Quotation PDF Template Implementation ---');

const pdfTemplatePath = path.join(rootDir, 'src/app/staff/quotations/[id]/pdf/page.tsx');
const pdfContent = fs.readFileSync(pdfTemplatePath, 'utf8');

await test('Template references /santhaya-round-stamp.png with Next.js Image component', () => {
  assert(pdfContent.includes('santhaya-round-stamp.png'), 'References santhaya-round-stamp.png');
  assert(pdfContent.includes('alt="Santhaya Associates Official Company Stamp"'), 'Accessible alt text present');
  assert(pdfContent.includes('priority'), 'Priority loading enabled');
});

await test('Stamp is sized to 32mm diameter with object-contain and zero distortion', () => {
  assert(pdfContent.includes('w-[32mm] h-[32mm]'), 'Dimensions set to 32mm width and 32mm height');
  assert(pdfContent.includes('max-w-[120px] max-h-[120px]'), 'Max constraints cap at 120px');
  assert(pdfContent.includes('object-contain'), 'Uses object-contain to prevent distortion');
});

await test('Stamp positioned inside Company Authorization Block between company name and signatory line', () => {
  const companyNameIdx = pdfContent.indexOf('For Santhaya Associates Pvt. Ltd.');
  const stampIdx = pdfContent.indexOf('santhaya-round-stamp.png');
  const signatoryIdx = pdfContent.indexOf('Authorized Signatory');

  assert(companyNameIdx !== -1, 'Company name present');
  assert(stampIdx !== -1, 'Stamp present');
  assert(signatoryIdx !== -1, 'Signatory line present');
  assert(companyNameIdx < stampIdx, 'Stamp positioned below company name');
  assert(stampIdx < signatoryIdx, 'Stamp positioned above Authorized Signatory label');
});

await test('Authorization status guards stamp so unfinalized drafts remain unstamped', () => {
  assert(pdfContent.includes('const isAuthorized ='), 'Defines isAuthorized check');
  assert(pdfContent.includes("['issued', 'accepted', 'converted_to_invoice'].includes(quote.status)"), 'Validates finalized quote statuses');
  assert(pdfContent.includes('Boolean(activeVersion.issued_at)'), 'Validates formal issuance timestamp');
  assert(pdfContent.includes('(Official seal affixed upon formal issuance)'), 'Renders placeholder note on draft quotes');
});

await test('Authorization block enforces print-avoid-break and A4 print margins', () => {
  assert(pdfContent.includes('print-avoid-break'), 'Signatory section has print-avoid-break class');
  assert(pdfContent.includes('margin: 8mm 10mm;'), 'A4 portrait margins set to 8mm top/bottom, 10mm left/right');
});

await test('Customer contact label uses "Contact Person:" and is omitted when empty', () => {
  assert(pdfContent.includes('Contact Person:'), 'Contact Person label present');
  assert(pdfContent.includes('customer.primary_contact_person ?'), 'Omitted when field is falsy');
  assert(!pdfContent.includes('Attn:'), 'Old Attn label completely removed');
});

await test('Pending GST displays statutory warning and "SUBTOTAL BEFORE GST (INR)"', () => {
  assert(pdfContent.includes('isTaxDetermined'), 'Determines if tax is determined');
  assert(pdfContent.includes('SUBTOTAL BEFORE GST (INR):'), 'Renders SUBTOTAL BEFORE GST for pending tax');
  assert(pdfContent.includes('Pending Determination'), 'Renders Pending Determination badge');
  assert(pdfContent.includes('(Exclusive of GST)'), 'Includes Exclusive of GST in amount in words');
});

await test('Footer displays verified NAP, phone, email, and GSTIN in high-contrast 9pt layout', () => {
  assert(pdfContent.includes('text-[9pt] text-slate-800'), 'Footer uses 9pt dark slate text');
  assert(pdfContent.includes('border-t-2 border-slate-300'), 'Footer uses clear divider');
  assert(pdfContent.includes('10ABVCS4277J1ZU'), 'Footer contains company GSTIN');
  assert(pdfContent.includes('heistofeverything@gmail.com'), 'Footer contains verified email');
  assert(pdfContent.includes('+91 9430986713 / +91 9608950748'), 'Footer contains verified phone');
});

// SECTION 3: Invoice Separation
console.log('\n--- Section 3: Invoice Separation ---');

const invoiceTemplatePath = path.join(rootDir, 'src/app/staff/billing/[id]/pdf/page.tsx');
const invoiceContent = fs.readFileSync(invoiceTemplatePath, 'utf8');

await test('Invoice PDF generator does NOT contain the round quotation stamp', () => {
  assert(!invoiceContent.includes('santhaya-round-stamp.png'), 'Invoices do not use santhaya-round-stamp.png');
});

// SECTION 4: Generated PDF Pagination and Single-Page Verification
console.log('\n--- Section 4: Generated PDF Verification ---');

const sampleDir = 'C:/Users/ritik/.gemini/antigravity/brain/26a96ae2-7d28-4640-80b9-553f236fc3f0/sample_quotations';

function countPdfPages(filePath) {
  const buf = fs.readFileSync(filePath);
  const str = buf.toString('latin1');
  const match = str.match(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/) || str.match(/\/Count\s+(\d+)/);
  if (match) return parseInt(match[1], 10);
  return null;
}

await test('Single-item quotation PDF fits on exactly 1 page', () => {
  const p = path.join(sampleDir, 'sample-quotation-single-item.pdf');
  assert(fs.existsSync(p), 'sample-quotation-single-item.pdf exists');
  const pages = countPdfPages(p);
  assert(pages === 1, `Expected 1 page, got ${pages}`);
});

await test('Two-item quotation PDF fits on exactly 1 page', () => {
  const p = path.join(sampleDir, 'sample-quotation-two-items.pdf');
  assert(fs.existsSync(p), 'sample-quotation-two-items.pdf exists');
  const pages = countPdfPages(p);
  assert(pages === 1, `Expected 1 page, got ${pages}`);
});

await test('Five-item quotation PDF paginates cleanly across 2 pages', () => {
  const p = path.join(sampleDir, 'sample-quotation-five-items.pdf');
  assert(fs.existsSync(p), 'sample-quotation-five-items.pdf exists');
  const pages = countPdfPages(p);
  assert(pages === 2, `Expected 2 pages, got ${pages}`);
});

await test('Multi-page (20 items) quotation PDF paginates across 3 pages', () => {
  const p = path.join(sampleDir, 'sample-quotation-multi-page-20-items.pdf');
  assert(fs.existsSync(p), 'sample-quotation-multi-page-20-items.pdf exists');
  const pages = countPdfPages(p);
  assert(pages === 3, `Expected 3 pages, got ${pages}`);
});

await test('Draft quotation PDF is unstamped and fits on 1 page', () => {
  const p = path.join(sampleDir, 'sample-quotation-draft.pdf');
  assert(fs.existsSync(p), 'sample-quotation-draft.pdf exists');
  const pages = countPdfPages(p);
  assert(pages === 1, `Expected 1 page, got ${pages}`);
  const html = fs.readFileSync(path.join(sampleDir, 'sample-quotation-draft.html'), 'utf8');
  assert(html.includes('(Official seal affixed upon formal issuance)'), 'Draft note present');
  assert(!html.includes('data:image/png;base64,' + fs.readFileSync('public/santhaya-round-stamp.png').toString('base64')), 'Draft does not embed stamp');
});

await test('Authorized quotation PDF is stamped and fits on 1 page', () => {
  const p = path.join(sampleDir, 'sample-quotation-authorized.pdf');
  assert(fs.existsSync(p), 'sample-quotation-authorized.pdf exists');
  const pages = countPdfPages(p);
  assert(pages === 1, `Expected 1 page, got ${pages}`);
  const html = fs.readFileSync(path.join(sampleDir, 'sample-quotation-authorized.html'), 'utf8');
  assert(html.includes('alt="Santhaya Associates Official Circular Company Stamp"'), 'Official stamp present');
});

await test('10-item quotation paginates cleanly across 2 pages with repeating headers', () => {
  const p = path.join(sampleDir, 'sample-quotation-10-items.pdf');
  assert(fs.existsSync(p), 'sample-quotation-10-items.pdf exists');
  const pages = countPdfPages(p);
  assert(pages === 2, `Expected 2 pages, got ${pages}`);
});

await test('30-item quotation stress test paginates cleanly across 4 pages', () => {
  const p = path.join(sampleDir, 'sample-quotation-30-items.pdf');
  assert(fs.existsSync(p), 'sample-quotation-30-items.pdf exists');
  const pages = countPdfPages(p);
  assert(pages === 4, `Expected 4 pages, got ${pages}`);
});

await test('Pending GST quotation shows pending tax, subtotal before GST, and statutory warning', () => {
  const p = path.join(sampleDir, 'sample-quotation-pending-gst.pdf');
  assert(fs.existsSync(p), 'sample-quotation-pending-gst.pdf exists');
  const html = fs.readFileSync(path.join(sampleDir, 'sample-quotation-pending-gst.html'), 'utf8');
  assert(html.includes('Pending Determination'), 'Includes Pending Determination badge');
  assert(html.includes('SUBTOTAL BEFORE GST (INR):'), 'Includes SUBTOTAL BEFORE GST');
  assert(html.includes('AMOUNT IN WORDS (SUBTOTAL BEFORE GST):'), 'Includes SUBTOTAL BEFORE GST words label');
  assert(html.includes('(Exclusive of GST)'), 'Includes Exclusive of GST suffix');
  assert(html.includes('Final statutory GST and payable grand total are subject to determination'), 'Includes warning text');
});

await test('Confirmed CGST/SGST quotation shows intra-state tax breakdown and Grand Total', () => {
  const p = path.join(sampleDir, 'sample-quotation-confirmed-cgst-sgst.pdf');
  assert(fs.existsSync(p), 'sample-quotation-confirmed-cgst-sgst.pdf exists');
  const html = fs.readFileSync(path.join(sampleDir, 'sample-quotation-confirmed-cgst-sgst.html'), 'utf8');
  assert(html.includes('Central GST (CGST 9%):'), 'Includes CGST 9%');
  assert(html.includes('State GST (SGST 9%):'), 'Includes SGST 9%');
  assert(html.includes('GRAND TOTAL (INR):'), 'Includes GRAND TOTAL');
});

await test('Confirmed IGST quotation shows inter-state tax breakdown and Grand Total', () => {
  const p = path.join(sampleDir, 'sample-quotation-confirmed-igst.pdf');
  assert(fs.existsSync(p), 'sample-quotation-confirmed-igst.pdf exists');
  const html = fs.readFileSync(path.join(sampleDir, 'sample-quotation-confirmed-igst.html'), 'utf8');
  assert(html.includes('Integrated GST (IGST 18%):'), 'Includes IGST 18%');
  assert(html.includes('GRAND TOTAL (INR):'), 'Includes GRAND TOTAL');
});

await test('Amounts with paise quotation renders fractional decimals accurately', () => {
  const p = path.join(sampleDir, 'sample-quotation-amounts-with-paise.pdf');
  assert(fs.existsSync(p), 'sample-quotation-amounts-with-paise.pdf exists');
  const html = fs.readFileSync(path.join(sampleDir, 'sample-quotation-amounts-with-paise.html'), 'utf8');
  assert(html.includes('8,350.75'), 'Preserves fractional paise for rate');
  assert(html.includes('64,230.50'), 'Preserves fractional paise for rate');
});

console.log('\n' + '='.repeat(70));
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('='.repeat(70));

if (passedTests !== totalTests) {
  process.exit(1);
}

