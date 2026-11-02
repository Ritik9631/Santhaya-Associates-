/**
 * Santhaya Associates — Automated Verification Test Suite
 * Test: Quotation PDF Redesign, Table Overflow Fix, Pagination & Financial-Year Numbering
 * File: scripts/test-quotation-redesign-and-delete.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✓ PASS: ${message}`);
}

function test(name, fn) {
  console.log(`\nTesting: ${name}`);
  try {
    fn();
  } catch (err) {
    console.error(`Test failed: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('======================================================================');
console.log('SANTHAYA ASSOCIATES — FINAL QUOTATION REDESIGN & NUMBERING TESTS');
console.log('======================================================================');

// 1. Quotation PDF Template Inspection (Phase 4 Visual Design)
test('Phase 4: Header & Authenticity Requirements', () => {
  const pdfPath = path.join(rootDir, 'src/app/staff/quotations/[id]/pdf/page.tsx');
  const content = fs.readFileSync(pdfPath, 'utf8');

  assert(content.includes('src="/santhaya-symbol.png"'), 'Uses authentic santhaya-symbol.png');
  assert(content.includes('QUOTATION'), 'Document title badge displays QUOTATION');
  assert(!content.includes('COMMERCIAL QUOTATION'), 'Old COMMERCIAL QUOTATION title removed');
  assert(!content.includes('Revision: {activeVersion.version_code}'), 'Displayed revision label removed');
  assert(content.includes('Valid Up To:'), 'Validity label replaced with "Valid Up To:"');
  assert(!content.includes('(Pending Verification)'), '(Pending Verification) removed from header');
  assert(!content.includes('State: Bihar (10)'), 'Redundant "State: Bihar (10)" removed from header line');
  assert(content.includes('10ABVCS4277J1ZU'), 'Authentic GSTIN preserved');
  assert(content.includes('ABVCS4277J'), 'Authentic PAN preserved');
  assert(content.includes('Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India'), 'Company address preserved');
});

test('Phase 4: Typography and Target Font Sizes', () => {
  const pdfPath = path.join(rootDir, 'src/app/staff/quotations/[id]/pdf/page.tsx');
  const content = fs.readFileSync(pdfPath, 'utf8');

  assert(content.includes('text-[17pt]') || content.includes('text-lg sm:text-[17pt]'), 'Company name uses 16-18 pt font');
  assert(content.includes('text-[22pt]') || content.includes('text-2xl sm:text-[22pt]'), 'Document quotation number uses 20-24 pt font');
  assert(content.includes('text-[16pt]'), 'Grand total prominent box uses 15-17 pt font');
});

test('Phase 4: Customer & Project Information Labels', () => {
  const pdfPath = path.join(rootDir, 'src/app/staff/quotations/[id]/pdf/page.tsx');
  const content = fs.readFileSync(pdfPath, 'utf8');

  assert(content.includes('QUOTATION FOR:'), 'Contains QUOTATION FOR:');
  assert(!content.includes('PROSPECTIVE CLIENT / RECIPIENT:'), 'Replaced PROSPECTIVE CLIENT / RECIPIENT');
  assert(content.includes('PROJECT DETAILS:'), 'Contains PROJECT DETAILS:');
  assert(!content.includes('ENGAGEMENT PARAMETERS:'), 'Replaced ENGAGEMENT PARAMETERS');
  assert(content.includes('break-words'), 'Long customer names and addresses have word breaking');
});

// 2. Critical PDF Table Overflow Fix (Phase 3)
test('Phase 3: Critical PDF Table Overflow Fix & Measured Column Widths', () => {
  const pdfPath = path.join(rootDir, 'src/app/staff/quotations/[id]/pdf/page.tsx');
  const content = fs.readFileSync(pdfPath, 'utf8');

  assert(content.includes('table-fixed'), 'Table enforces table-fixed layout to prevent width expansion');
  assert(content.includes('w-full'), 'Table is constrained to 100% of container width');
  assert(content.includes('w-[4%]'), '# column has fixed 4% measured width');
  assert(content.includes('w-[27%]') || content.includes('w-[37%]'), 'Item description has measured percentage width');
  assert(content.includes('w-[9%]') || content.includes('w-[11%]'), 'HSN/SAC has measured percentage width');
  assert(content.includes('w-[10%]') || content.includes('w-[17%]'), 'Total (₹) column has explicit measured percentage width');
  assert(content.includes('whitespace-nowrap'), 'Numeric monetary values prevent awkward mid-cell wraps');
  assert(content.includes('formatQuantity'), 'Imports and uses formatQuantity to clean whole numbers');
});

// 3. Amount Summary, Terms & Signatures (Phase 4)
test('Phase 4: Amount Summary and Words', () => {
  const pdfPath = path.join(rootDir, 'src/app/staff/quotations/[id]/pdf/page.tsx');
  const content = fs.readFileSync(pdfPath, 'utf8');

  assert(content.includes('AMOUNT IN WORDS (STATUTORY INR):'), 'Contains Amount in Words section');
  assert(content.includes('convertNumberToIndianWords'), 'Converts total to Indian words');
  assert(content.includes('Gross Subtotal:'), 'Contains Gross Subtotal');
  assert(content.includes('Taxable Amount:'), 'Contains Taxable Amount');
  assert(content.includes('Total Tax Amount:'), 'Contains Total Tax Amount');
  assert(content.includes('GRAND TOTAL (INR):'), 'Contains Grand Total');
});

test('Phase 4: TERMS & CONDITIONS with Hanging Indent & Single Company Authorization', () => {
  const pdfPath = path.join(rootDir, 'src/app/staff/quotations/[id]/pdf/page.tsx');
  const content = fs.readFileSync(pdfPath, 'utf8');

  assert(content.includes('TERMS & CONDITIONS'), 'Contains uppercase TERMS & CONDITIONS heading');
  assert(content.includes('For Santhaya Associates Pvt. Ltd.'), 'Contains Company Authorization block');
  assert(content.includes('Authorized Signatory'), 'Contains Authorized Signatory label');
  assert(!content.includes('Client Acceptance Acknowledgment:'), 'Client Acceptance Acknowledgment section completely removed');
  assert(!content.includes('We confirm acceptance of the scope'), 'Client acceptance text completely removed');
});

// 4. Automatic PDF Pagination Rules (Phase 5)
test('Phase 5: Automatic PDF Pagination Rules & Page Numbering', () => {
  const pdfPath = path.join(rootDir, 'src/app/staff/quotations/[id]/pdf/page.tsx');
  const content = fs.readFileSync(pdfPath, 'utf8');

  assert(content.includes('size: A4 portrait;'), '@page defines A4 portrait');
  assert(content.includes('margin: 8mm 10mm;'), '@page defines balanced compact margins');
  assert(content.includes('counter(page)'), '@page defines page counter numbering');
  assert(content.includes('thead {') && content.includes('display: table-header-group'), 'thead uses table-header-group for repeating on multi-page');
  assert(content.includes('page-break-inside: avoid') || content.includes('break-inside: avoid'), 'tr avoids page break slicing');
  assert(content.includes('print-avoid-break'), 'Totals, terms, and authorization blocks use print-avoid-break');
});

// 5. Financial-Year Numbering Logic (Phase 2)
test('Phase 2: Indian Financial Year Calculation & Formatting (numbering.ts)', async () => {
  const numberingMod = await import('../src/lib/quotation/numbering.ts');
  const { getIndianFinancialYear, formatQuotationNumber, parseQuotationNumber, formatQuantity } = numberingMod;

  // Indian FY rules: 1 April to 31 March
  const novDate = new Date('2026-11-02T12:00:00+05:30');
  const fyNov = getIndianFinancialYear(novDate);
  assert(fyNov.startYear === 2026, 'Nov 2026 start year is 2026');
  assert(fyNov.endYear === 2027, 'Nov 2026 end year is 2027');
  assert(fyNov.fyString === '2026-27', 'Nov 2026 belongs to FY 2026-27');

  const marDate = new Date('2027-03-31T23:59:59+05:30');
  const fyMar = getIndianFinancialYear(marDate);
  assert(fyMar.fyString === '2026-27', '31 Mar 2027 belongs to FY 2026-27');

  const aprDate = new Date('2027-04-01T00:00:01+05:30');
  const fyApr = getIndianFinancialYear(aprDate);
  assert(fyApr.fyString === '2027-28', '01 Apr 2027 belongs to FY 2027-28');

  // Format tests
  assert(formatQuotationNumber('2026-27', 1) === 'QT-2026-27-001', 'Sequence 1 formats to QT-2026-27-001');
  assert(formatQuotationNumber('2026-27', 42) === 'QT-2026-27-042', 'Sequence 42 formats to QT-2026-27-042');
  assert(formatQuotationNumber('2026-27', 999) === 'QT-2026-27-999', 'Sequence 999 formats to QT-2026-27-999');
  assert(formatQuotationNumber('2026-27', 1000) === 'QT-2026-27-1000', 'Sequence 1000 expands beyond 3 digits to QT-2026-27-1000');

  // Parser tests (both new and legacy)
  const parsedNew = parseQuotationNumber('QT-2026-27-001');
  assert(parsedNew?.isNewFormat === true, 'Parses QT-2026-27-001 as new format');
  assert(parsedNew?.financialYear === '2026-27', 'Parsed financial year is 2026-27');
  assert(parsedNew?.sequence === 1, 'Parsed sequence is 1');

  const parsedLegacy = parseQuotationNumber('QTN-2026-00005');
  assert(parsedLegacy?.isNewFormat === false, 'Parses QTN-2026-00005 as legacy format');
  assert(parsedLegacy?.year === '2026', 'Parsed legacy year is 2026');
  assert(parsedLegacy?.sequence === 5, 'Parsed legacy sequence is 5');

  // Quantity formatting tests
  assert(formatQuantity(5) === '5', 'formatQuantity(5) returns "5" without .00');
  assert(formatQuantity('5.00') === '5', 'formatQuantity("5.00") returns "5"');
  assert(formatQuantity(5.5) === '5.5', 'formatQuantity(5.5) returns "5.5"');
  assert(formatQuantity(12.25) === '12.25', 'formatQuantity(12.25) returns "12.25"');
  assert(formatQuantity(0) === '0', 'formatQuantity(0) returns "0"');
});

test('Phase 2: Server Action Integration with Financial Year Numbering', () => {
  const actionsPath = path.join(rootDir, 'src/lib/quotation/actions.ts');
  const content = fs.readFileSync(actionsPath, 'utf8');

  assert(content.includes('generateServerQuotationNumber'), 'Actions imports and calls generateServerQuotationNumber');
  assert(content.includes('for (let attempt = 0; attempt < 5; attempt++)'), 'Actions includes optimistic concurrency collision retry loop');
  assert(content.includes('quoteNumberToUse'), 'Uses dynamic quotation number in insertion');
});

test('Phase 2: Database Migration for Financial-Year Sequences', () => {
  const migPath = path.join(rootDir, 'supabase/migrations/20261102120000_financial_year_quotation_numbering.sql');
  assert(fs.existsSync(migPath), 'Migration file exists in supabase/migrations/');
  const content = fs.readFileSync(migPath, 'utf8');

  assert(content.includes('public.quotation_fy_sequences'), 'Defines quotation_fy_sequences table');
  assert(content.includes('generate_quotation_number()'), 'Defines generate_quotation_number() function');
  assert(content.includes("'Asia/Kolkata'"), 'Enforces Asia/Kolkata timezone in SQL function');
  assert(content.includes('QT-'), 'Generates QT- prefix in SQL function');
});

// 6. Delete Quotation Guards & UI
test('Phase 4: Delete Quotation Server Action & Safety Guards', () => {
  const actionsPath = path.join(rootDir, 'src/lib/quotation/actions.ts');
  const content = fs.readFileSync(actionsPath, 'utf8');

  assert(content.includes('export async function deleteQuotationAction'), 'deleteQuotationAction is exported');
  assert(content.includes("['super_admin', 'admin', 'estimator'].includes(profile.role)"), 'Authorized roles check in deleteQuotationAction');
  assert(content.includes("from('invoices')"), 'Checks linked invoices table before deletion');
  assert(content.includes('Cannot delete quotation'), 'Blocks deletion if linked to invoice');
  assert(content.includes("action: 'quotation_deleted'"), 'Inserts quotation_deleted audit log');
  assert(content.includes('deleted_at: deletionTimestamp'), 'Records deleted_at soft delete timestamp');
  assert(content.includes('deleted_by_staff_id: user.id'), 'Records deleted_by_staff_id');
});

test('Phase 4: Delete Quotation UI in QuotationDetailView', () => {
  const detailPath = path.join(rootDir, 'src/app/staff/quotations/[id]/QuotationDetailView.tsx');
  const content = fs.readFileSync(detailPath, 'utf8');

  assert(content.includes('deleteQuotationAction'), 'QuotationDetailView imports deleteQuotationAction');
  assert(content.includes('Delete Quotation'), 'QuotationDetailView renders Delete Quotation button');
  assert(content.includes('showDeleteModal'), 'QuotationDetailView manages showDeleteModal state');
  assert(content.includes('deleteReason'), 'QuotationDetailView captures deletion reason');
  assert(content.includes('Confirm Delete'), 'Confirmation dialog provides Confirm Delete action');
  assert(content.includes('Cancel'), 'Confirmation dialog provides Cancel action');
  assert(content.includes('quotation.quotation_number'), 'Confirmation dialog displays quotation number');
});

console.log('----------------------------------------------------------------------');
console.log(`ALL ${totalTests} VERIFICATION TESTS PASSED SUCCESSFULLY! (${passedTests}/${totalTests})`);
console.log('======================================================================\n');
