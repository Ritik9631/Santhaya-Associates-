/**
 * Santhaya Associates — Quotation PDF Final Refinements & Customer GSTIN->PAN Test Suite
 * File: scripts/test-quotation-refinements.mjs
 *
 * Validates:
 * 1. Indian GSTIN Modulo 36 checksum & PAN derivation
 * 2. GSTIN and PAN conflict detection (client and server)
 * 3. Smart Currency Formatting (omitting .00 for whole rupees, retaining paise)
 * 4. Quotation PDF Template structure (single page fit, commercial notes, typography, footer)
 * 5. Customer Form client auto-population and reactive handling
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  calculateGstinChecksum,
  validateGstinChecksum,
  validatePanFormat,
  extractPanFromGstin,
  validateGstinAndPanMatch,
} from '../src/lib/utils/gstin.ts';
import { formatSmartRupee, formatIndianRupee } from '../src/lib/utils/currency.ts';

const rootDir = process.cwd();
let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('='.repeat(70));
console.log('SANTHAYA ASSOCIATES — QUOTATION FINAL REFINEMENTS TEST SUITE');
console.log('='.repeat(70));

// SECTION 1: GSTIN Modulo 36 Checksum & PAN Extraction
console.log('\n--- Section 1: GSTIN Modulo 36 Checksum & PAN Extraction ---');

test('Validates authentic Bihar GSTIN 10ABVCS4277J1ZU with checksum U', () => {
  assert(validateGstinChecksum('10ABVCS4277J1ZU') === true, '10ABVCS4277J1ZU is valid');
  assert(calculateGstinChecksum('10ABVCS4277J1Z') === 'U', 'Expected checksum is U');
});

test('Validates other authentic Indian GSTINs with Modulo 36 checksums', () => {
  assert(validateGstinChecksum('27AAPFU0939F1ZV') === true, 'Maharashtra GSTIN is valid');
  assert(validateGstinChecksum('29AABCU9603R1ZJ') === true, 'Karnataka GSTIN is valid');
});

test('Rejects GSTIN with corrupted checksum character', () => {
  assert(validateGstinChecksum('10ABVCS4277J1ZA') === false, 'Corrupted checksum rejected');
  assert(validateGstinChecksum('10ABVCS4277J1Z0') === false, 'Zero checksum rejected');
});

test('Rejects malformed or incomplete GSTIN strings', () => {
  assert(validateGstinChecksum('') === false, 'Empty string rejected');
  assert(validateGstinChecksum('10ABVCS4277J1Z') === false, '14 chars rejected');
  assert(validateGstinChecksum('10ABVCS4277J1ZUU') === false, '16 chars rejected');
  assert(validateGstinChecksum('101BVCS4277J1ZU') === false, 'Invalid state code format rejected');
});

test('Extracts statutory 10-character PAN from valid GSTIN', () => {
  const pan1 = extractPanFromGstin('10ABVCS4277J1ZU');
  assert(pan1 === 'ABVCS4277J', `Extracted PAN ABVCS4277J, got ${pan1}`);
  assert(validatePanFormat(pan1) === true, 'Derived PAN has valid 10-char format');

  const pan2 = extractPanFromGstin('27AAPFU0939F1ZV');
  assert(pan2 === 'AAPFU0939F', `Extracted PAN AAPFU0939F, got ${pan2}`);
});

test('Returns null when extracting PAN from invalid GSTIN', () => {
  assert(extractPanFromGstin('10ABVCS4277J1ZA') === null, 'Corrupt checksum returns null');
  assert(extractPanFromGstin('INVALID') === null, 'Invalid format returns null');
});

// SECTION 2: GSTIN and PAN Consistency & Conflict Detection
console.log('\n--- Section 2: GSTIN & PAN Conflict Detection ---');

test('Accepts valid GSTIN with empty PAN and derives PAN', () => {
  const res = validateGstinAndPanMatch('10ABVCS4277J1ZU', null);
  assert(res.valid === true, 'Result is valid');
  assert(res.derivedPan === 'ABVCS4277J', 'Derived PAN is returned');
});

test('Accepts valid GSTIN with matching PAN', () => {
  const res = validateGstinAndPanMatch('10ABVCS4277J1ZU', 'ABVCS4277J');
  assert(res.valid === true, 'Matching PAN accepted');
  assert(res.derivedPan === 'ABVCS4277J', 'Derived PAN is returned');
});

test('Strictly rejects conflicting manual PAN with detailed error', () => {
  const res = validateGstinAndPanMatch('10ABVCS4277J1ZU', 'ABCDE1234F');
  assert(res.valid === false, 'Conflicting PAN rejected');
  assert(res.error?.includes('Statutory Conflict'), 'Error indicates Statutory Conflict');
  assert(res.error?.includes('ABCDE1234F'), 'Error mentions entered PAN');
  assert(res.error?.includes('ABVCS4277J'), 'Error mentions derived PAN');
});

test('Accepts valid standalone PAN when GSTIN is not provided', () => {
  const res = validateGstinAndPanMatch(null, 'ABCDE1234F');
  assert(res.valid === true, 'Standalone valid PAN accepted');
});

test('Rejects invalid standalone PAN format', () => {
  const res = validateGstinAndPanMatch(null, 'INVALID123');
  assert(res.valid === false, 'Invalid standalone PAN rejected');
});

// SECTION 3: Smart Currency Formatting (formatSmartRupee)
console.log('\n--- Section 3: Smart Currency Formatting ---');

test('Omits .00 for whole integer rupee amounts', () => {
  assert(formatSmartRupee(26000) === '₹26,000', `Expected ₹26,000, got ${formatSmartRupee(26000)}`);
  assert(formatSmartRupee('26000.00') === '₹26,000', 'String 26000.00 -> ₹26,000');
  assert(formatSmartRupee(500) === '₹500', '500 -> ₹500');
  assert(formatSmartRupee(0) === '₹0', '0 -> ₹0');
});

test('Omits symbol when includeSymbol is false', () => {
  assert(formatSmartRupee(26000, false) === '26,000', `Expected 26,000, got ${formatSmartRupee(26000, false)}`);
  assert(formatSmartRupee(1250.50, false) === '1,250.50', '1250.50 without symbol -> 1,250.50');
});

test('Preserves exact 2 decimal places for fractional amounts with paise', () => {
  assert(formatSmartRupee(1250.50) === '₹1,250.50', `Expected ₹1,250.50, got ${formatSmartRupee(1250.50)}`);
  assert(formatSmartRupee(1250.05) === '₹1,250.05', 'Retains single digit paise');
  assert(formatSmartRupee(0.75) === '₹0.75', 'Fractional zero rupee');
});

test('Applies standard Indian numbering system commas (en-IN)', () => {
  assert(formatSmartRupee(10000000) === '₹1,00,00,000', '1 Crore has Indian comma format');
  assert(formatSmartRupee(100000) === '₹1,00,000', '1 Lakh has Indian comma format');
});

test('Handles negative numbers cleanly', () => {
  assert(formatSmartRupee(-26000) === '-₹26,000', 'Negative whole number');
  assert(formatSmartRupee(-1250.50) === '-₹1,250.50', 'Negative fractional number');
});

// SECTION 4: Quotation PDF Page Architecture & Single-Page Fit
console.log('\n--- Section 4: Quotation PDF Template Architecture ---');

const pdfContent = fs.readFileSync(path.join(rootDir, 'src/app/staff/quotations/[id]/pdf/page.tsx'), 'utf8');

test('Uses formatSmartRupee for item rates and formatIndianRupee for financial summary', () => {
  assert(pdfContent.includes('formatSmartRupee'), 'Imports formatSmartRupee');
  assert(pdfContent.includes('formatSmartRupee(item.unit_rate, false)'), 'Item rate uses formatSmartRupee');
  assert(pdfContent.includes('formatSmartRupee(item.line_total, false)'), 'Item total uses formatSmartRupee');
  assert(pdfContent.includes('formatIndianRupee(activeVersion.grand_total_amount, 2)'), 'Grand total enforces 2 decimal places');
});

test('Replaces bold/italics with clean normal typography for Amount in Words', () => {
  assert(pdfContent.includes('AMOUNT IN WORDS (STATUTORY INR):'), 'Has statutory amount in words label');
  assert(pdfContent.includes('convertNumberToIndianWords(activeVersion.grand_total_amount)'), 'Converts to Indian words');
  assert(!pdfContent.includes('italic bg-slate-50 p-2.5 rounded'), 'Removed awkward heavy italic styling');
});

test('Features dedicated Bank Details section replacing Commercial Notes', () => {
  assert(!pdfContent.includes('COMMERCIAL NOTES:'), 'Commercial Notes completely removed');
  assert(pdfContent.includes('BANK DETAILS'), 'Has BANK DETAILS heading');
  assert(pdfContent.includes('State Bank of India'), 'Bank Name present');
  assert(pdfContent.includes('45696995612'), 'Account No. present');
  assert(pdfContent.includes('SBIN0001763'), 'IFSC Code present');
  assert(pdfContent.includes('Call:'), 'Call label present in footer');
  assert(pdfContent.includes('WhatsApp:'), 'WhatsApp label present in footer');
});

test('Terms and Conditions allows natural multi-page pagination with break-inside-avoid per clause', () => {
  assert(pdfContent.includes('TERMS & CONDITIONS'), 'Has TERMS & CONDITIONS heading');
  assert(pdfContent.includes('break-inside-avoid'), 'Individual clauses have break-inside-avoid');
  assert(pdfContent.includes('text-slate-800'), 'Uses readable text color for single page fit');
});

test('Widens Company Authorization Block to 76-80 width', () => {
  assert(pdfContent.includes('md:w-80'), 'Signatory block widened to md:w-80');
  assert(pdfContent.includes('Authorized Signatory'), 'Authorized Signatory label present');
});

test('Renders verified subtle company footer at bottom of document', () => {
  assert(pdfContent.includes('Gopalpur, Motihari, Purbi Champaran, Bihar – 845401'), 'Office location in footer');
  assert(pdfContent.includes('santhayapvt.ltd@gmail.com'), 'Verified email in footer');
  assert(pdfContent.includes('+91 9430986713') && pdfContent.includes('+91 9608950748'), 'Verified phone numbers in footer');
});

test('Payment terms are cleaned to prevent contradictory advance/credit phrasing', () => {
  assert(pdfContent.includes('cleanPaymentTerms'), 'Uses cleaned payment terms');
  assert(pdfContent.includes('replace('), 'Replaces contradictory advance/credit phrasing');
});

// SECTION 5: Customer Form & Server Actions
console.log('\n--- Section 5: Customer Form & Server Actions ---');

const formContent = fs.readFileSync(path.join(rootDir, 'src/app/staff/customers/new/CustomerForm.tsx'), 'utf8');
const actionContent = fs.readFileSync(path.join(rootDir, 'src/lib/customers/actions.ts'), 'utf8');

test('CustomerForm manages controlled GSTIN and PAN state', () => {
  assert(formContent.includes('const [gstin, setGstin] = useState'), 'Has controlled gstin state');
  assert(formContent.includes('const [pan, setPan] = useState'), 'Has controlled pan state');
  assert(formContent.includes('const [panIsAutoDerived, setPanIsAutoDerived]'), 'Tracks auto-derived status');
  assert(formContent.includes('handleGstinChange'), 'Has handleGstinChange handler');
  assert(formContent.includes('handlePanChange'), 'Has handlePanChange handler');
});

test('CustomerForm displays verification badge and conflict warning', () => {
  assert(formContent.includes('Checksum Verified'), 'Displays Checksum Verified badge');
  assert(formContent.includes('Auto-derived from GSTIN'), 'Displays Auto-derived from GSTIN badge');
  assert(formContent.includes('panConflictWarning'), 'Displays conflict warning when mismatch exists');
});

test('Server actions validate GSTIN/PAN and auto-derive PAN if omitted', () => {
  assert(actionContent.includes('validateGstinAndPanMatch(gstin, pan)'), 'Actions invoke validateGstinAndPanMatch');
  assert(actionContent.includes('gstinPanResult.derivedPan'), 'Actions auto-derive PAN from GSTIN');
});

console.log('\n' + '='.repeat(70));
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('='.repeat(70));

if (passedTests !== totalTests) {
  process.exit(1);
}

