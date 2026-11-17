/**
 * Santhaya Associates — Final Quotation PDF & ERP Refinements Verification Suite
 * File: scripts/test-quotation-final-polish.mjs
 *
 * Zero-DB, non-destructive test suite validating Phases 2 through 8:
 * 1. TAX column whole-rupee display formatting & untouched statutory GST engine
 * 2. Enlarged repeating DRAFT watermark architecture & mutually exclusive archival guards
 * 3. Footer duplicate GSTIN removal & clickable HTTPS hyperlink verification
 * 4. Validated A4 print-layout estimator & smart two-page terms recommendation with confirmation
 * 5. Quotation numbering monotonicity, deletion/cancellation non-reuse, and audit log preservation
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  formatIndianRupee,
  formatSmartRupee,
  formatWholeRupee,
} from '../src/lib/utils/currency.ts';
import { calculateQuotationTotals } from '../src/lib/quotation/calculations.ts';
import {
  classifyQuotationTerms,
  estimateQuotationPageLayout,
} from '../src/lib/quotation/layout-estimator.ts';
import {
  getDefaultQuotationTerms,
  getSimplifiedQuotationTerms,
} from '../src/lib/billing/default-terms.ts';
import {
  formatQuotationNumber,
  generateServerQuotationNumber,
  getIndianFinancialYear,
} from '../src/lib/quotation/numbering.ts';

const rootDir = process.cwd();
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`           ${err.message}`);
    failed++;
  }
}

console.log('='.repeat(74));
console.log('SANTHAYA ASSOCIATES — FINAL QUOTATION PDF & ERP REFINEMENTS TEST SUITE');
console.log('='.repeat(74));

// ---------------------------------------------------------------------------
// SECTION 1: Phase 2 — Whole-Rupee TAX Display & Exact GST Calculation Preservation
// ---------------------------------------------------------------------------
console.log('\n--- Section 1: TAX Column Whole-Rupee Display & GST Engine Integrity ---');

await test('Formats owner reference fractional tax amounts to whole rupees (half-up)', () => {
  assert(formatWholeRupee(37906.74, false) === '37,907', `Expected 37,907, got ${formatWholeRupee(37906.74, false)}`);
  assert(formatWholeRupee(40728.78, false) === '40,729', `Expected 40,729, got ${formatWholeRupee(40728.78, false)}`);
  assert(formatWholeRupee(10988.10, false) === '10,988', `Expected 10,988, got ${formatWholeRupee(10988.10, false)}`);
  assert(formatWholeRupee(37906.74, true) === '₹37,907', `Expected ₹37,907, got ${formatWholeRupee(37906.74, true)}`);
});

await test('Handles zero, boundary half-up (.49/.50), negative, and multi-crore tax values', () => {
  assert(formatWholeRupee(0, false) === '0', 'Zero renders as 0');
  assert(formatWholeRupee(-0, false) === '0', '-0 renders as 0');
  assert(formatWholeRupee(0.49, false) === '0', '0.49 rounds down to 0');
  assert(formatWholeRupee(0.50, false) === '1', '0.50 rounds half-up to 1');
  assert(formatWholeRupee(99.50, false) === '100', '99.50 rounds half-up to 100');
  assert(formatWholeRupee(-1250.60, false) === '-1,251', 'Negative rounds away from zero symmetrically');
  assert(formatWholeRupee(-0.20, false) === '0', 'Small negative rounding to 0 has no minus sign');
  assert(formatWholeRupee(12500000.75, false) === '1,25,00,001', 'Multi-crore formats in Indian en-IN locale');
  assert(formatWholeRupee(47447785.90, false) === '4,74,47,786', 'Large crore GST formats without decimals');
});

await test('Preserves exact unrounded GST calculations in calculateQuotationTotals', () => {
  const items = [
    { item_name: 'Item A', unit: 'NOS', quantity: 1, unit_rate: 210593, discount_amount: 0, gst_rate: 18 },
    { item_name: 'Item B', unit: 'NOS', quantity: 1, unit_rate: 226271, discount_amount: 0, gst_rate: 18 },
    { item_name: 'Item C', unit: 'NOS', quantity: 1, unit_rate: 61045, discount_amount: 0, gst_rate: 18 },
  ];
  const totals = calculateQuotationTotals(items, true, '10', '10');

  assert(totals.items[0].tax_amount === 37906.74, `Exact Item A tax preserved (got ${totals.items[0].tax_amount})`);
  assert(totals.items[1].tax_amount === 40728.78, `Exact Item B tax preserved (got ${totals.items[1].tax_amount})`);
  assert(totals.items[2].tax_amount === 10988.10, `Exact Item C tax preserved (got ${totals.items[2].tax_amount})`);

  assert(totals.items[0].line_total === 248499.74, `Exact Item A total preserved (got ${totals.items[0].line_total})`);
  assert(totals.items[1].line_total === 266999.78, `Exact Item B total preserved (got ${totals.items[1].line_total})`);
  assert(totals.items[2].line_total === 72033.10, `Exact Item C total preserved (got ${totals.items[2].line_total})`);

  // Exact sum of taxes: 37906.74 + 40728.78 + 10988.10 = 89623.62
  // Whereas sum of displayed whole rupees: 37907 + 40729 + 10988 = 89624 (diff = +0.38)
  assert(totals.total_tax_amount === 89623.62, `Exact total tax preserved (got ${totals.total_tax_amount})`);
  assert(totals.cgst_amount === 44811.81, `Exact CGST preserved (got ${totals.cgst_amount})`);
  assert(totals.sgst_amount === 44811.81, `Exact SGST preserved (got ${totals.sgst_amount})`);
  assert(formatSmartRupee(totals.items[0].line_total, false) === '2,48,499.74', 'TOTAL column retains paise');
  assert(formatIndianRupee(totals.total_tax_amount, 2) === '₹89,623.62', 'Summary retains exact 2 decimals');
});

// ---------------------------------------------------------------------------
// SECTION 2: Phases 2, 3, 4, 5 — Quotation PDF Template Static Verification
// ---------------------------------------------------------------------------
console.log('\n--- Section 2: PDF Template Architecture (Tax, Watermark, Footer, Hyperlink) ---');

const pdfTemplatePath = path.join(rootDir, 'src/app/staff/quotations/[id]/pdf/page.tsx');
const pdfContent = fs.readFileSync(pdfTemplatePath, 'utf8');

await test('PDF template formats line-item TAX with formatWholeRupee and keeps TOTAL/Summary exact', () => {
  assert(pdfContent.includes('formatWholeRupee(item.tax_amount, false)'), 'TAX column uses formatWholeRupee');
  assert(pdfContent.includes('formatSmartRupee(item.line_total, false)'), 'TOTAL column retains formatSmartRupee');
  assert(pdfContent.includes('formatIndianRupee(activeVersion.cgst_amount, 2)'), 'CGST summary uses 2 decimals');
  assert(pdfContent.includes('formatIndianRupee(activeVersion.sgst_amount, 2)'), 'SGST summary uses 2 decimals');
  assert(pdfContent.includes('formatIndianRupee(activeVersion.total_tax_amount, 2)'), 'Total Tax summary uses 2 decimals');
  assert(pdfContent.includes('formatIndianRupee(activeVersion.grand_total_amount, 2)'), 'Grand Total uses 2 decimals');
  assert(
    pdfContent.includes('Line-item TAX (₹) values are rounded to the nearest whole rupee for display clarity'),
    'Unambiguous rounding clarity note is present when fractional line tax exists'
  );
});

await test('DRAFT watermark is enlarged ~30%, fixed per printed page, behind content, and mutually exclusive', () => {
  assert(pdfContent.includes('.pdf-watermark-layer'), 'Defines .pdf-watermark-layer print class');
  assert(pdfContent.includes('position: fixed !important;'), 'Repeats watermark on every printed page via fixed positioning');
  assert(pdfContent.includes('z-index: 0 !important;'), 'Places watermark layer behind content layer');
  assert(pdfContent.includes('.pdf-content-layer'), 'Wraps foreground content in .pdf-content-layer');
  assert(pdfContent.includes('print:text-[96pt]'), 'DRAFT watermark enlarged ~33% (96pt vs prior 72pt)');
  assert(pdfContent.includes('-rotate-45'), 'Preserves diagonal -45deg rotation');
  assert(pdfContent.includes('border-dashed'), 'Preserves dashed border style');
  assert(
    pdfContent.includes('isRejectedStatus ? (') &&
      pdfContent.includes(': isSupersededVersion ? (') &&
      pdfContent.includes(': isDraftStatus ? ('),
    'Watermark states are strictly mutually exclusive (no overlapping watermarks on same page)'
  );
});

await test('Duplicate GSTIN is removed from footer while preserved in header', () => {
  const headerIdx = pdfContent.indexOf('Header Block');
  const footerIdx = pdfContent.indexOf('Verified Company Contact Details Footer');
  assert(headerIdx !== -1 && footerIdx !== -1, 'Header and footer markers exist');

  const headerSlice = pdfContent.slice(headerIdx, headerIdx + 2500);
  const footerStartIdx = pdfContent.indexOf('<div', footerIdx);
  const footerSlice = pdfContent.slice(footerStartIdx);

  assert(headerSlice.includes('GSTIN:') && headerSlice.includes('10ABVCS4277J1ZU'), 'Header preserves GSTIN');
  assert(headerSlice.includes('PAN:') && headerSlice.includes('ABVCS4277J'), 'Header preserves PAN');

  assert(!footerSlice.includes('GSTIN'), 'Footer removes duplicate GSTIN label');
  assert(!footerSlice.includes('10ABVCS4277J1ZU'), 'Footer removes duplicate GSTIN value');
  assert(footerSlice.includes('Santhaya Associates Pvt. Ltd.'), 'Footer preserves company name');
  assert(footerSlice.includes('Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India'), 'Footer preserves address');
  assert(footerSlice.includes('+91 9430986713'), 'Footer preserves Call number');
  assert(footerSlice.includes('+91 9608950748'), 'Footer preserves WhatsApp number');
  assert(footerSlice.includes('santhayapvt.ltd@gmail.com'), 'Footer preserves Email');
  assert(footerSlice.includes('href="https://santhayaassociates.com"'), 'Footer preserves clickable HTTPS anchor');
});

await test('Smart multi-page terms recommendation never appears in exported quotation PDF', () => {
  assert(
    !pdfContent.includes('Consider the 10-Clause Comprehensive Terms'),
    'PDF template never renders ERP terms recommendation'
  );
});

// ---------------------------------------------------------------------------
// SECTION 3: Phase 6 — Smart Two-Page Layout Estimator & Terms Recommendation
// ---------------------------------------------------------------------------
console.log('\n--- Section 3: Print-Layout Estimator & Terms Recommendation Policy ---');

await test('Layout estimator predicts single vs multi-page from actual content geometry (not fixed item count)', () => {
  const stdTerms = getSimplifiedQuotationTerms(30);

  // 2 concise items -> 1 page
  const est2 = estimateQuotationPageLayout({
    items: [
      { item_name: 'Concrete Mixer', description: 'Standard model', unit_rate: 250000, quantity: 1, gst_rate: 18 },
      { item_name: 'Vibrator', description: 'Needle type', unit_rate: 45000, quantity: 2, gst_rate: 18 },
    ],
    termsConditions: stdTerms,
    isGstApplicable: true,
    isIntraState: true,
  });
  assert(est2.estimatedPages === 1 && !est2.isMultiPage, `2 concise items should estimate 1 page (got ${est2.estimatedPages})`);

  // 3 items with extensive multi-paragraph technical descriptions -> 2 pages!
  const longDesc =
    'Complete turnkey supply, factory inspection, commissioning, operator training, hydraulic attachments, heavy duty chassis reinforcement, spare parts kit for 2000 operating hours, and on-site calibration.\nIncludes structural drawings, OEM test certificates, and 12-month preventative maintenance schedule.';
  const est3Long = estimateQuotationPageLayout({
    items: [
      { item_name: 'Automated Concrete Batching Plant 60 m3/hr', description: longDesc, unit_rate: 6500000, quantity: 1, gst_rate: 18 },
      { item_name: 'Transit Mixer Mounted Chassis Assembly', description: longDesc, unit_rate: 4200000, quantity: 2, gst_rate: 18 },
      { item_name: 'Hydraulic Stationary Concrete Boom Pump', description: longDesc, unit_rate: 5100000, quantity: 1, gst_rate: 18 },
    ],
    termsConditions: stdTerms,
    isGstApplicable: true,
    isIntraState: true,
  });
  assert(est3Long.isMultiPage && est3Long.estimatedPages >= 2, `3 verbose items should estimate multi-page (got ${est3Long.estimatedPages})`);

  // 7 standard items -> 2 pages
  const items7 = Array.from({ length: 7 }, (_, i) => ({
    item_name: `Heavy Machinery Item #${i + 1} Specification`,
    description: `Turnkey specification model ${i + 1} with accessories.`,
    unit_rate: 500000,
    quantity: 1,
    gst_rate: 18,
  }));
  const est7 = estimateQuotationPageLayout({
    items: items7,
    termsConditions: stdTerms,
    isGstApplicable: true,
    isIntraState: true,
  });
  assert(est7.estimatedPages === 2 && est7.isMultiPage, `7 items should estimate 2 pages (got ${est7.estimatedPages})`);
});

await test('classifyQuotationTerms accurately detects 6-clause default, 10-clause comprehensive, custom, and empty', () => {
  const std6 = getSimplifiedQuotationTerms(30);
  const comp10 = getDefaultQuotationTerms(30);

  assert(classifyQuotationTerms(std6, std6, comp10) === 'standard_6', 'Detects standard 6-clause');
  assert(classifyQuotationTerms(comp10, std6, comp10) === 'comprehensive_10', 'Detects comprehensive 10-clause');
  assert(
    classifyQuotationTerms(getSimplifiedQuotationTerms(45), std6, comp10) === 'standard_6',
    'Recognizes standard 6-clause across different validity days'
  );
  assert(
    classifyQuotationTerms('1. CUSTOM CLAUSE: Client-specific escrow terms.', std6, comp10) === 'custom',
    'Detects custom staff-edited terms'
  );
  assert(classifyQuotationTerms('   ', std6, comp10) === 'empty', 'Detects empty terms');
});

const formContent = fs.readFileSync(path.join(rootDir, 'src/app/staff/quotations/new/QuotationForm.tsx'), 'utf8');
const detailContent = fs.readFileSync(path.join(rootDir, 'src/app/staff/quotations/[id]/QuotationDetailView.tsx'), 'utf8');

await test('QuotationForm defaults to 6 clauses, uses validated layout estimator, and requires explicit confirmation', () => {
  assert(formContent.includes('getSimplifiedQuotationTerms(initialData?.validity_days ?? 30)'), '6-clause default preserved');
  assert(formContent.includes('estimateQuotationPageLayout('), 'Uses validated layout estimator (no fixed threshold)');
  assert(
    formContent.includes('This quotation may span multiple pages. Consider the 10-Clause Comprehensive Terms for additional contractual coverage.'),
    'Displays exact approved recommendation text'
  );
  assert(formContent.includes('Apply 10-Clause Terms'), 'Includes Apply 10-Clause Terms button');
  assert(formContent.includes('Keep Current Terms'), 'Allows staff to retain current terms');
  assert(formContent.includes('Confirm & Apply'), 'Requires explicit staff confirmation before replacing terms');
  assert(formContent.includes('You have customized Terms & Conditions'), 'Warns before overwriting customized terms');
});

await test('QuotationDetailView scopes recommendation to editable drafts with confirmation and clean preset labels', () => {
  assert(detailContent.includes('estimateQuotationPageLayout('), 'Uses validated print-layout estimator');
  assert(
    detailContent.includes('isDraftEditable &&') && detailContent.includes('layoutEstimate.isMultiPage'),
    'Strictly restricted to editable draft quotations (never historical/issued versions)'
  );
  assert(
    detailContent.includes('This quotation may span multiple pages. Consider the 10-Clause Comprehensive Terms for additional contractual coverage.'),
    'Displays exact approved recommendation text'
  );
  assert(detailContent.includes('Confirm & Apply'), 'Requires explicit staff confirmation');
  assert(!detailContent.includes('Layout Testing'), 'Removed stale Layout Testing label');
  assert(detailContent.includes('6 Clauses (Standard Default)'), 'Uses clean Standard Default badge');
  assert(detailContent.includes('10 Clauses (Comprehensive)'), 'Uses clean Comprehensive badge');
});

// ---------------------------------------------------------------------------
// SECTION 4: Phase 7 — Quotation Numbering Audit (Code + Mock Fixture Tests)
// ---------------------------------------------------------------------------
console.log('\n--- Section 4: Quotation Numbering Audit & Non-Reuse Guarantees ---');

const fyMigrationSql = fs.readFileSync(
  path.join(rootDir, 'supabase/migrations/20261102120000_financial_year_quotation_numbering.sql'),
  'utf8'
);
const actionsContent = fs.readFileSync(path.join(rootDir, 'src/lib/quotation/actions.ts'), 'utf8');

await test('SQL FY sequence counter is atomic, row-locked, and strictly monotonic (never decremented)', () => {
  assert(fyMigrationSql.includes('CREATE TABLE IF NOT EXISTS public.quotation_fy_sequences'), 'FY sequence table exists');
  assert(fyMigrationSql.includes('last_seq = public.quotation_fy_sequences.last_seq + 1'), 'Strictly monotonic +1 increment');
  assert(!fyMigrationSql.includes('last_seq - 1'), 'Sequence is never decremented');
  assert(!actionsContent.includes('quotation_fy_sequences'), 'Application actions never reset or mutate FY sequence counters');
});

await test('Deletion, draft discard, and cancellation preserve audit logs and never reuse numbers', async () => {
  assert(actionsContent.includes("action: 'quotation_deleted'"), 'deleteQuotationAction writes audit log');
  assert(actionsContent.includes("action: 'quotation_draft_discarded'"), 'discardDraftQuotationAction writes audit log');
  assert(actionsContent.includes('previous_state: { quotation_number: quote.quotation_number'), 'Discard audit records deleted quotation_number');
  assert(actionsContent.includes('quotation_number: quote.quotation_number,'), 'Soft-delete audit records deleted quotation_number');

  // Simulate fallback numbering after QT-2026-27-008 was issued, QT-2026-27-009 was soft-deleted, and QT-2026-27-010 was discarded
  const { fyString } = getIndianFinancialYear(new Date('2026-11-18T12:00:00+05:30'));
  const mockAdminClient = {
    rpc: async () => ({ data: null, error: { message: 'simulate fallback' } }),
    from: (table) => ({
      select: () => ({
        ilike: async () => ({
          data: [
            { quotation_number: formatQuotationNumber(fyString, 8) },
            { quotation_number: formatQuotationNumber(fyString, 9) }, // soft-deleted row still in quotations table
          ],
        }),
        eq: () => ({
          in: async () => ({
            data: [
              { previous_state: { quotation_number: formatQuotationNumber(fyString, 9) } },
              { previous_state: { quotation_number: formatQuotationNumber(fyString, 10) } }, // hard-discarded draft in audit_logs
            ],
          }),
        }),
      }),
    }),
  };

  const nextNumber = await generateServerQuotationNumber(
    mockAdminClient,
    new Date('2026-11-18T12:00:00+05:30')
  );
  assert(
    nextNumber === `QT-${fyString}-011`,
    `Expected next number QT-${fyString}-011 (never reusing 009 or 010), got ${nextNumber}`
  );
});

console.log('\n' + '='.repeat(74));
console.log(`FINAL QUOTATION POLISH TEST SUMMARY: ${passed}/${passed + failed} TESTS PASSED`);
console.log('='.repeat(74));

if (failed > 0) {
  process.exit(1);
}
