import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('===============================================================');
console.log('SANTHAYA ASSOCIATES — BATCH 4 DEFECT REMEDIATION TEST SUITE');
console.log('Validating BUG-030 through BUG-049');
console.log('===============================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

// -------------------------------------------------------------
// 1. FINANCIAL ACCURACY & GST DETERMINATION (BUG-031, BUG-033, BUG-036)
// -------------------------------------------------------------
console.log('Section 1: Indian States Dictionary & GST Place of Supply (BUG-031, BUG-033)');

import {
  INDIAN_STATES,
  resolveIndianState,
  formatPlaceOfSupply,
  isValidIndianStateCode,
} from '../src/lib/utils/indian-states.ts';

test('BUG-033: INDIAN_STATES dictionary covers all 36+ Indian states and UTs with statutory 2-digit codes', () => {
  assert(INDIAN_STATES.length >= 36, `Expected at least 36 states, got ${INDIAN_STATES.length}`);
  const bihar = INDIAN_STATES.find((s) => s.code === '10');
  assert.strictEqual(bihar?.name, 'Bihar');
  const up = INDIAN_STATES.find((s) => s.code === '09');
  assert.strictEqual(up?.name, 'Uttar Pradesh');
  const delhi = INDIAN_STATES.find((s) => s.code === '07');
  assert.strictEqual(delhi?.name, 'Delhi');
});

test('BUG-031 & BUG-033: resolveIndianState normalizes abbreviations, full names, and 2-digit codes', () => {
  assert.strictEqual(resolveIndianState('UP')?.code, '09');
  assert.strictEqual(resolveIndianState('UP')?.name, 'Uttar Pradesh');
  assert.strictEqual(resolveIndianState('up')?.code, '09');
  assert.strictEqual(resolveIndianState('09')?.code, '09');
  assert.strictEqual(resolveIndianState('Uttar Pradesh')?.code, '09');

  assert.strictEqual(resolveIndianState('BR')?.code, '10');
  assert.strictEqual(resolveIndianState('10')?.code, '10');
  assert.strictEqual(resolveIndianState('Bihar')?.code, '10');

  assert.strictEqual(resolveIndianState('DL')?.code, '07');
  assert.strictEqual(resolveIndianState('Delhi')?.code, '07');

  assert.strictEqual(resolveIndianState('XX'), null);
  assert.strictEqual(resolveIndianState(''), null);
  assert.strictEqual(resolveIndianState(null), null);
  assert.strictEqual(resolveIndianState(undefined), null);
});

test('BUG-033: formatPlaceOfSupply formats canonical "State Name (Code)" or "Pending Determination"', () => {
  assert.strictEqual(formatPlaceOfSupply('09'), 'Uttar Pradesh (09)');
  assert.strictEqual(formatPlaceOfSupply('UP'), 'Uttar Pradesh (09)');
  assert.strictEqual(formatPlaceOfSupply('10'), 'Bihar (10)');
  assert.strictEqual(formatPlaceOfSupply('Delhi'), 'Delhi (07)');
  assert.strictEqual(formatPlaceOfSupply(''), 'Pending Determination');
  assert.strictEqual(formatPlaceOfSupply(null), 'Pending Determination');
  assert.strictEqual(formatPlaceOfSupply('INVALID'), 'Pending Determination');
});

import {
  determineTaxStatus,
  calculateQuotationTotals,
} from '../src/lib/quotation/calculations.ts';

test('BUG-031: determineTaxStatus accurately classifies intra-state and inter-state with normalized state codes', () => {
  assert.strictEqual(determineTaxStatus(true, '10', '10'), 'intra_state');
  assert.strictEqual(determineTaxStatus(true, 'Bihar', '10'), 'intra_state');
  assert.strictEqual(determineTaxStatus(true, '09', '10'), 'inter_state');
  assert.strictEqual(determineTaxStatus(true, 'UP', '10'), 'inter_state');
  assert.strictEqual(determineTaxStatus(true, 'Uttar Pradesh', '10'), 'inter_state');
  assert.strictEqual(determineTaxStatus(true, '07', '10'), 'inter_state');
  assert.strictEqual(determineTaxStatus(true, '', '10'), 'undetermined');
  assert.strictEqual(determineTaxStatus(true, null, '10'), 'undetermined');
  assert.strictEqual(determineTaxStatus(false, '09', '10'), 'not_applicable');
});

test('BUG-031: calculateQuotationTotals calculates non-zero IGST for inter-state quote with state "UP"', () => {
  const items = [
    {
      item_name: 'Hydraulic Excavator Rental',
      quantity: 1,
      unit_rate: 20000,
      gst_rate: 18,
    },
  ];

  // Testing with legacy string 'UP'
  const totalsUP = calculateQuotationTotals(items, true, 'UP');
  assert.strictEqual(totalsUP.is_inter_state, true);
  assert.strictEqual(totalsUP.tax_determination, 'inter_state');
  assert.strictEqual(totalsUP.taxable_amount, 20000);
  assert.strictEqual(totalsUP.igst_amount, 3600);
  assert.strictEqual(totalsUP.total_tax_amount, 3600);
  assert.strictEqual(totalsUP.grand_total_amount, 23600);
  assert(totalsUP.amount_in_words.includes('Twenty Three Thousand Six Hundred'));

  // Testing with numeric code '09'
  const totals09 = calculateQuotationTotals(items, true, '09');
  assert.strictEqual(totals09.is_inter_state, true);
  assert.strictEqual(totals09.igst_amount, 3600);
  assert.strictEqual(totals09.grand_total_amount, 23600);

  // Testing intra-state '10' (Bihar)
  const totals10 = calculateQuotationTotals(items, true, '10');
  assert.strictEqual(totals10.is_intra_state, true);
  assert.strictEqual(totals10.cgst_amount, 1800);
  assert.strictEqual(totals10.sgst_amount, 1800);
  assert.strictEqual(totals10.total_tax_amount, 3600);
  assert.strictEqual(totals10.grand_total_amount, 23600);
});

// -------------------------------------------------------------
// 2. CURRENCY FORMATTING & AMOUNT IN WORDS (BUG-036, BUG-039, BUG-040)
// -------------------------------------------------------------
console.log('\nSection 2: Currency Compact Formatting & Amount in Words (BUG-036, BUG-039, BUG-040)');

import {
  convertNumberToIndianWords,
  formatCompactRupee,
  formatIndianRupee,
} from '../src/lib/utils/currency.ts';

test('BUG-036: convertNumberToIndianWords handles small values, Paise, Lakhs, and large multi-Crores correctly', () => {
  // Small values
  assert.strictEqual(
    convertNumberToIndianWords(20000),
    'Rupees Twenty Thousand Only'
  );

  // Value with paise
  assert.strictEqual(
    convertNumberToIndianWords(1250.5),
    'Rupees One Thousand Two Hundred and Fifty and Fifty Paise Only'
  );

  // Single paisa
  assert.strictEqual(
    convertNumberToIndianWords(100.05),
    'Rupees One Hundred and Five Paise Only'
  );

  // Lakhs
  assert.strictEqual(
    convertNumberToIndianWords(1250000),
    'Rupees Twelve Lakh Fifty Thousand Only'
  );

  // Crores
  assert.strictEqual(
    convertNumberToIndianWords(54025000),
    'Rupees Five Crore Forty Lakh Twenty Five Thousand Only'
  );

  // Multi-crores (e.g. ₹622.56 Cr)
  assert.strictEqual(
    convertNumberToIndianWords(6225555000),
    'Rupees Six Hundred and Twenty Two Crore Fifty Five Lakh Fifty Five Thousand Only'
  );
});

test('BUG-039 & BUG-040: formatCompactRupee scales neatly to ₹Cr, ₹L, ₹K without overflow', () => {
  assert.strictEqual(formatCompactRupee(0), '₹0.00');
  assert.strictEqual(formatCompactRupee(750), '₹750.00');
  assert.strictEqual(formatCompactRupee(25000), '₹25.00 K');
  assert.strictEqual(formatCompactRupee(1250000), '₹12.50 L');
  assert.strictEqual(formatCompactRupee(15000000), '₹1.50 Cr');
  assert.strictEqual(formatCompactRupee(62255550000), '₹6,225.56 Cr');
});

// -------------------------------------------------------------
// 3. FINANCIAL AGGREGATION & SEGREGATION (BUG-041, BUG-046)
// -------------------------------------------------------------
console.log('\nSection 3: Financial Aggregation & Ledger Segregation (BUG-041, BUG-046)');

import { calculateFinancialSummary } from '../src/lib/billing/financial-aggregation.ts';

test('BUG-041 & BUG-046: calculateFinancialSummary strictly excludes draft and cancelled invoices from active ledgers', () => {
  const sampleInvoices = [
    {
      id: 'inv-1',
      invoice_number: 'INV-2026-00001',
      status: 'issued',
      grand_total_amount: 100000,
      paid_amount: 0,
      balance_amount: 100000,
      due_date: '2026-12-01',
    },
    {
      id: 'inv-2',
      invoice_number: 'INV-2026-00002',
      status: 'partially_paid',
      grand_total_amount: 250000,
      paid_amount: 100000,
      balance_amount: 150000,
      due_date: '2026-10-15', // Overdue relative to 2026-11-01
    },
    {
      id: 'inv-3',
      invoice_number: 'INV-2026-00003',
      status: 'paid',
      grand_total_amount: 50000,
      paid_amount: 50000,
      balance_amount: 0,
      due_date: '2026-10-01',
    },
    {
      id: 'inv-draft',
      invoice_number: null,
      status: 'draft',
      grand_total_amount: 62255550000, // Massive draft proposal (₹6,225.56 Cr)
      paid_amount: 0,
      balance_amount: 62255550000,
      due_date: '2026-10-01',
    },
    {
      id: 'inv-cancelled',
      invoice_number: 'INV-2026-00004',
      status: 'cancelled',
      grand_total_amount: 300000,
      paid_amount: 0,
      balance_amount: 300000,
      due_date: '2026-10-01',
    },
  ];

  const summary = calculateFinancialSummary(sampleInvoices, '2026-11-01');

  // Total invoiced: 100,000 + 250,000 + 50,000 = 400,000 (DRAFT AND CANCELLED EXCLUDED!)
  assert.strictEqual(summary.totalInvoiced, 400000);

  // Collected revenue: 100,000 + 50,000 = 150,000
  assert.strictEqual(summary.collectedRevenue, 150000);

  // Outstanding balance: 100,000 + 150,000 = 250,000 (DRAFT EXCLUDED!)
  assert.strictEqual(summary.outstandingBalance, 250000);

  // Overdue count: only inv-2 is overdue (inv-draft and inv-cancelled are not counted)
  assert.strictEqual(summary.overdueCount, 1);
  assert.strictEqual(summary.overdueBalance, 150000);

  // Draft segregation metrics
  assert.strictEqual(summary.draftInvoiceCount, 1);
  assert.strictEqual(summary.draftInvoiceValue, 62255550000);
  assert.strictEqual(summary.activeInvoiceCount, 3);
  assert.strictEqual(summary.cancelledCount, 1);
});

// -------------------------------------------------------------
// 4. COMMERCIAL TERMS & CONDITIONS (BUG-038)
// -------------------------------------------------------------
console.log('\nSection 4: Professional Commercial Terms & Conditions (BUG-038)');

import {
  getDefaultQuotationTerms,
  getDefaultInvoiceTerms,
} from '../src/lib/billing/default-terms.ts';

test('BUG-038: getDefaultQuotationTerms provides comprehensive 10-clause commercial terms with jurisdiction', () => {
  const terms = getDefaultQuotationTerms(30);
  assert(terms.includes('1. VALIDITY:'));
  assert(terms.includes('30 calendar days'));
  assert(terms.includes('2. PRICES & TAXES:'));
  assert(terms.includes('3. SCOPE OF SUPPLY:'));
  assert(terms.includes('10. JURISDICTION:'));
  assert(terms.includes('Motihari, Purbi Champaran, Bihar'));
});

test('BUG-038: getDefaultInvoiceTerms provides comprehensive 7-clause statutory invoice terms', () => {
  const terms = getDefaultInvoiceTerms('2026-12-01');
  assert(terms.includes('1. PAYMENT DUE DATE:'));
  assert(terms.includes('2026-12-01'));
  assert(terms.includes('2. PAYMENT METHOD:'));
  assert(terms.includes('3. STATUTORY INVOICE:'));
  assert(terms.includes('4. DISCREPANCIES:'));
  assert(terms.includes('heistofeverything@gmail.com'));
});

// -------------------------------------------------------------
// 5. ADMIN LIFECYCLE CONTROLS (BUG-044)
// -------------------------------------------------------------
console.log('\nSection 5: Super Admin Lifecycle Controls & Actions (BUG-044)');

test('BUG-044: discardDraftQuotationAction & cancelQuotationAction are exported from quotation actions', () => {
  const qActionsContent = fs.readFileSync(path.join(rootDir, 'src/lib/quotation/actions.ts'), 'utf8');
  assert(qActionsContent.includes('export async function discardDraftQuotationAction'));
  assert(qActionsContent.includes('export async function cancelQuotationAction'));
});

test('BUG-044: discardDraftInvoiceAction is exported from billing actions', () => {
  const bActionsContent = fs.readFileSync(path.join(rootDir, 'src/lib/billing/actions.ts'), 'utf8');
  assert(bActionsContent.includes('export async function discardDraftInvoiceAction'));
});

test('BUG-044: deleteCustomerAction, archiveCustomerAction, restoreCustomerAction exist in customer actions', () => {
  const cActionsContent = fs.readFileSync(path.join(rootDir, 'src/lib/customers/actions.ts'), 'utf8');
  assert(cActionsContent.includes('export async function deleteCustomerAction'));
  assert(cActionsContent.includes('export async function archiveCustomerAction'));
  assert(cActionsContent.includes('export async function restoreCustomerAction'));
});

// -------------------------------------------------------------
// 6. DASHBOARDS, KPI CARDS & EMPTY STATES (BUG-043, BUG-048, BUG-049)
// -------------------------------------------------------------
console.log('\nSection 6: Dashboard Links, Invoicing UX & Contextual Empty States (BUG-043, BUG-048, BUG-049)');

test('BUG-043: Staff overview Outstanding Dues card links to /staff/billing?status=outstanding', () => {
  const staffPage = fs.readFileSync(path.join(rootDir, 'src/app/staff/page.tsx'), 'utf8');
  assert(staffPage.includes('href="/staff/billing?status=outstanding"'));
  assert(staffPage.includes('formatCompactRupee(totalBalanceOutstanding)'));
});

test('BUG-043 & BUG-049: Billing dashboard supports Outstanding Dues tab and contextual empty states', () => {
  const billPage = fs.readFileSync(path.join(rootDir, 'src/app/staff/billing/page.tsx'), 'utf8');
  assert(billPage.includes("{ label: 'Outstanding Dues', value: 'outstanding' }"));
  assert(billPage.includes("statusFilter === 'outstanding'"));
  assert(billPage.includes('Zero Outstanding Dues'));
  assert(billPage.includes('Draft Invoices (Unissued Proposals):'));
});

// -------------------------------------------------------------
// 7. PDF PRINT TEMPLATES (BUG-030, BUG-032, BUG-034, BUG-035, BUG-037)
// -------------------------------------------------------------
console.log('\nSection 7: Premium Document Design in PDF Templates (BUG-030, BUG-032, BUG-034, BUG-035, BUG-037)');

test('BUG-030 & BUG-034: Quotation PDF uses santhaya-symbol.png and explicit line-item GST columns', () => {
  const qPdf = fs.readFileSync(path.join(rootDir, 'src/app/staff/quotations/[id]/pdf/page.tsx'), 'utf8');
  assert(qPdf.includes('src="/santhaya-symbol.png"'));
  assert(qPdf.includes('GST %'));
  assert(qPdf.includes('Tax (₹)'));
  assert(qPdf.includes('Total (₹)'));
  assert(qPdf.includes('Client Acceptance Acknowledgment:'));
  assert(qPdf.includes('For Santhaya Associates Pvt. Ltd.'));
});

test('BUG-030 & BUG-034: Invoice PDF uses santhaya-symbol.png, explicit columns, and dual signature blocks', () => {
  const invPdf = fs.readFileSync(path.join(rootDir, 'src/app/staff/billing/[id]/pdf/page.tsx'), 'utf8');
  assert(invPdf.includes('src="/santhaya-symbol.png"'));
  assert(invPdf.includes('GST %'));
  assert(invPdf.includes('Tax (₹)'));
  assert(invPdf.includes('Customer Acknowledgment:'));
  assert(invPdf.includes('Authorized Signatory'));
});

console.log('---------------------------------------------------------------');
console.log(`ALL ${totalTests} BATCH 4 AUTOMATED REGRESSION TESTS PASSED! (${passedTests}/${totalTests})`);
console.log('===============================================================\n');
