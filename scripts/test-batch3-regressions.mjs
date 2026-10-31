/**
 * Santhaya Associates — Batch 3 Bug Fixes & Regressions Verification Suite
 * File: scripts/test-batch3-regressions.mjs
 *
 * Verifies BUG-018 through BUG-028:
 * - BUG-018: High-contrast form inputs, selects, and labels (WCAG AA compliant)
 * - BUG-019: Clean A4 print layout, staff chrome hidden on print, enlarged logo
 * - BUG-020: Draft quotation & invoice editing with statutory Rule 46 lock
 * - BUG-021: Dark theme top header contrast in detail views
 * - BUG-022: Authoritative Bihar (10) supplier config, Motihari address, safe payment instructions
 * - BUG-023: Line items table sizing, font-mono alignment, no clipped columns
 * - BUG-024: Indian Rupee formatting (formatIndianRupee & formatCompactRupee)
 * - BUG-025: Overdue KPI card neutral/reassuring state when zero
 * - BUG-026: Page heading contrast across Staff ERP pages
 * - BUG-027: Standard Indian date formatting without UTC boundary shifting
 * - BUG-028: Reusable TaxBreakdownCard with statutory GST breakdown and status badge
 */

import assert from 'node:assert';
import fs from 'node:fs';
import {
  getCompanyBillingProfile,
  getPaymentInstructions,
} from '../src/lib/billing/company-config.ts';
import {
  formatIndianDate,
  formatIndianDateTime,
} from '../src/lib/utils/date.ts';
import {
  formatIndianRupee,
  formatCompactRupee,
} from '../src/lib/utils/currency.ts';
import {
  formInputClasses,
  formSelectClasses,
  formLabelClasses,
} from '../src/components/ui/form-styles.ts';

console.log('======================================================================');
console.log('BATCH 3 REGRESSION & VERIFICATION BATTERY (BUG-018 to BUG-028)');
console.log('======================================================================\n');

let passedTests = 0;
let failedTests = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name} — ${err.message}`);
    failedTests++;
  }
}

// -----------------------------------------------------------------------------
// [BUG-018] High-Contrast Form Inputs & WCAG AA Compliance
// -----------------------------------------------------------------------------
console.log('--- 1. [BUG-018] Shared High-Contrast Form Styles ---');

it('Shared form styles define high-contrast dark text on white backgrounds', () => {
  assert.ok(formInputClasses.includes('bg-white'), 'formInputClasses has bg-white');
  assert.ok(formInputClasses.includes('text-slate-900'), 'formInputClasses has text-slate-900');
  assert.ok(formInputClasses.includes('border-slate-300'), 'formInputClasses has border-slate-300');
  assert.ok(formInputClasses.includes('placeholder:text-slate-400'), 'formInputClasses has readable placeholder');

  assert.ok(formSelectClasses.includes('bg-white'), 'formSelectClasses has bg-white');
  assert.ok(formSelectClasses.includes('text-slate-900'), 'formSelectClasses has text-slate-900');
  assert.ok(formLabelClasses.includes('text-slate-700'), 'formLabelClasses has high contrast text');
});

it('QuotationForm and InvoiceForm import and apply shared form styles', () => {
  const quoteForm = fs.readFileSync('src/app/staff/quotations/new/QuotationForm.tsx', 'utf8');
  assert.ok(quoteForm.includes('formInputClasses'), 'QuotationForm imports formInputClasses');
  assert.ok(quoteForm.includes('formSelectClasses'), 'QuotationForm imports formSelectClasses');
  assert.ok(quoteForm.includes('tableInputClasses'), 'QuotationForm imports tableInputClasses');

  const invForm = fs.readFileSync('src/app/staff/billing/new/InvoiceForm.tsx', 'utf8');
  assert.ok(invForm.includes('formInputClasses'), 'InvoiceForm imports formInputClasses');
  assert.ok(invForm.includes('formSelectClasses'), 'InvoiceForm imports formSelectClasses');
  assert.ok(invForm.includes('tableInputClasses'), 'InvoiceForm imports tableInputClasses');
});

// -----------------------------------------------------------------------------
// [BUG-019 & BUG-022] Print Layout & Authoritative Bihar Supplier Profile
// -----------------------------------------------------------------------------
console.log('\n--- 2. [BUG-019 & BUG-022] Print Layout & Authoritative Bihar Supplier Profile ---');

it('Staff layout completely hides app navigation chrome on print', () => {
  const layoutCode = fs.readFileSync('src/app/staff/layout.tsx', 'utf8');
  assert.ok(layoutCode.includes('print:hidden'), 'Staff layout includes print:hidden on top nav/sidebar/footer');
  assert.ok(layoutCode.includes('print:p-0'), 'Staff layout removes padding on print');
  assert.ok(layoutCode.includes('print:bg-white'), 'Staff layout forces white background on print');
});

it('Authoritative supplier config defaults to Bihar (10), Motihari address, and GSTIN 10ABVCS4277J1ZU', () => {
  const profile = getCompanyBillingProfile();
  assert.strictEqual(profile.legalName, 'Santhaya Associates Pvt. Ltd.');
  assert.strictEqual(profile.gstin, '10ABVCS4277J1ZU');
  assert.strictEqual(profile.stateCode, '10');
  assert.strictEqual(profile.stateName, 'Bihar');
  assert.ok(profile.registeredAddress.includes('Motihari'), 'Address contains Motihari');
  assert.ok(profile.registeredAddress.includes('845401'), 'Address contains PIN 845401');
  assert.strictEqual(profile.phone, '+91 9430986713');
});

it('Safe payment instructions do not invent or fabricate bank account numbers', () => {
  const profile = getCompanyBillingProfile();
  assert.strictEqual(profile.bankDetails.isConfigured, false, 'Default payment instructions marked as unconfigured');
  const instructions = getPaymentInstructions(profile);
  assert.ok(!instructions.includes('398472910482'), 'No fabricated bank account numbers');
  assert.ok(instructions.includes('contact accounts at heistofeverything@gmail.com'), 'Safe guidance message returned');
});

it('Quotation and Invoice PDF views enforce A4 portrait print geometry', () => {
  const invPdf = fs.readFileSync('src/app/staff/billing/[id]/pdf/page.tsx', 'utf8');
  assert.ok(invPdf.includes('size: A4 portrait;'), 'Invoice PDF has A4 portrait print style');
  assert.ok(invPdf.includes('margin: 8mm 10mm;'), 'Invoice PDF has compact margins');
  assert.ok(invPdf.includes('Motihari'), 'Invoice PDF displays Motihari address');

  const quotePdf = fs.readFileSync('src/app/staff/quotations/[id]/pdf/page.tsx', 'utf8');
  assert.ok(quotePdf.includes('size: A4 portrait;'), 'Quotation PDF has A4 portrait print style');
  assert.ok(quotePdf.includes('margin: 8mm 10mm;'), 'Quotation PDF has compact margins');
  assert.ok(quotePdf.includes('Motihari'), 'Quotation PDF displays Motihari address');
});

// -----------------------------------------------------------------------------
// [BUG-020] Draft Quotation & Invoice Editing
// -----------------------------------------------------------------------------
console.log('\n--- 3. [BUG-020] Draft Quotation & Invoice Editing Actions & Pages ---');

it('updateDraftQuotationAction guards against non-draft status and updates line items', () => {
  const actionsCode = fs.readFileSync('src/lib/quotation/actions.ts', 'utf8');
  assert.ok(actionsCode.includes('updateDraftQuotationAction'), 'Exports updateDraftQuotationAction');
  assert.ok(actionsCode.includes("quote.status !== 'draft'"), 'Blocks editing for non-draft quotation');
  assert.ok(actionsCode.includes('version.is_locked'), 'Blocks editing for locked version');
  assert.ok(actionsCode.includes('quotation_draft_updated'), 'Logs quotation_draft_updated audit event');
});

it('updateDraftInvoiceAction guards against issued invoices (Rule 46) and updates draft items', () => {
  const actionsCode = fs.readFileSync('src/lib/billing/actions.ts', 'utf8');
  assert.ok(actionsCode.includes('updateDraftInvoiceAction'), 'Exports updateDraftInvoiceAction');
  assert.ok(actionsCode.includes("prevInvoice.status !== 'draft'"), 'Blocks editing for non-draft invoice under Rule 46');
  assert.ok(actionsCode.includes('invoice_draft_updated'), 'Logs invoice_draft_updated audit event');
});

it('Edit draft server pages exist for both quotations and invoices', () => {
  const quoteEditPage = fs.readFileSync('src/app/staff/quotations/[id]/edit/page.tsx', 'utf8');
  assert.ok(quoteEditPage.includes('EditDraftQuotation') || quoteEditPage.includes('EditQuotationPage'));
  assert.ok(quoteEditPage.includes("quote.status !== 'draft'"), 'Redirects non-draft quotations');

  const invEditPage = fs.readFileSync('src/app/staff/billing/[id]/edit/page.tsx', 'utf8');
  assert.ok(invEditPage.includes('EditInvoicePage'));
  assert.ok(invEditPage.includes("invoice.status !== 'draft'"), 'Redirects non-draft invoices');
});

// -----------------------------------------------------------------------------
// [BUG-021 & BUG-026] High Contrast Headers across Staff ERP
// -----------------------------------------------------------------------------
console.log('\n--- 4. [BUG-021 & BUG-026] Staff ERP Contrast & Headings ---');

it('QuotationDetailView and InvoiceDetailView feature high-contrast headers', () => {
  const quoteDetail = fs.readFileSync('src/app/staff/quotations/[id]/QuotationDetailView.tsx', 'utf8');
  assert.ok(quoteDetail.includes('text-2xl font-bold text-white'), 'QuotationDetailView h1 is white text');
  assert.ok(quoteDetail.includes('text-slate-400 mt-1'), 'QuotationDetailView subtitle is high contrast');

  const invDetail = fs.readFileSync('src/app/staff/billing/[id]/InvoiceDetailView.tsx', 'utf8');
  assert.ok(invDetail.includes('text-2xl font-bold text-white'), 'InvoiceDetailView h1 is white text');
  assert.ok(invDetail.includes('text-slate-400 mt-1'), 'InvoiceDetailView subtitle is high contrast');
});

it('Staff Billing and Quotations directory pages use white text headings', () => {
  const billingPage = fs.readFileSync('src/app/staff/billing/page.tsx', 'utf8');
  assert.ok(billingPage.includes('text-2xl font-bold text-white'), 'Billing page heading is white');

  const quotePage = fs.readFileSync('src/app/staff/quotations/page.tsx', 'utf8');
  assert.ok(quotePage.includes('text-2xl font-bold text-white'), 'Quotations page heading is white');
});

// -----------------------------------------------------------------------------
// [BUG-023] Line Items Table Column Sizing & Alignment
// -----------------------------------------------------------------------------
console.log('\n--- 5. [BUG-023] Table Column Sizing & Currency Alignment ---');

it('Line items tables in detail views use min-w-[850px] and font-mono for monetary columns', () => {
  const quoteDetail = fs.readFileSync('src/app/staff/quotations/[id]/QuotationDetailView.tsx', 'utf8');
  assert.ok(quoteDetail.includes('min-w-[850px]'), 'QuotationDetailView table has min-w-[850px]');
  assert.ok(quoteDetail.includes('font-mono'), 'QuotationDetailView uses font-mono for amounts');

  const invDetail = fs.readFileSync('src/app/staff/billing/[id]/InvoiceDetailView.tsx', 'utf8');
  assert.ok(invDetail.includes('min-w-[850px]'), 'InvoiceDetailView table has min-w-[850px]');
  assert.ok(invDetail.includes('font-mono'), 'InvoiceDetailView uses font-mono for amounts');
});

// -----------------------------------------------------------------------------
// [BUG-024 & BUG-025] Currency Formatting & Overdue Reassurance State
// -----------------------------------------------------------------------------
console.log('\n--- 6. [BUG-024 & BUG-025] Currency Utilities & Overdue Neutral State ---');

it('formatIndianRupee accurately applies Indian numbering system commas', () => {
  assert.strictEqual(formatIndianRupee(1000), '₹1,000.00');
  assert.strictEqual(formatIndianRupee(100000), '₹1,00,000.00');
  assert.strictEqual(formatIndianRupee(6226000), '₹62,26,000.00');
  assert.strictEqual(formatIndianRupee(150000000), '₹15,00,00,000.00');
  assert.strictEqual(formatIndianRupee(0), '₹0.00');
});

it('formatCompactRupee scales large amounts for KPI cards', () => {
  assert.strictEqual(formatCompactRupee(150000000), '₹15.00 Cr');
  assert.strictEqual(formatCompactRupee(6226000), '₹62.26 L');
  assert.strictEqual(formatCompactRupee(50000), '₹50.00 K');
  assert.strictEqual(formatCompactRupee(950), '₹950.00');
});

it('Billing directory page handles overdueCount === 0 with reassuring neutral/emerald state', () => {
  const billingPage = fs.readFileSync('src/app/staff/billing/page.tsx', 'utf8');
  assert.ok(billingPage.includes('All payments on schedule'), 'Reassuring text present when zero');
  assert.ok(billingPage.includes("overdueCount > 0 ? 'text-rose-700' : 'text-emerald-700'"), 'Conditional color based on overdue count');
});

// -----------------------------------------------------------------------------
// [BUG-027] Indian Standard Date Formatting
// -----------------------------------------------------------------------------
console.log('\n--- 7. [BUG-027] Indian Standard Date Utilities ---');

it('formatIndianDate formats YYYY-MM-DD strings without UTC boundary shifts', () => {
  assert.strictEqual(formatIndianDate('2026-10-31'), '31 Oct 2026');
  assert.strictEqual(formatIndianDate('2026-01-01'), '01 Jan 2026');
  assert.strictEqual(formatIndianDate('2026-12-25'), '25 Dec 2026');
  assert.strictEqual(formatIndianDate(null), '—');
});

it('formatIndianDateTime formats ISO timestamps with readable Indian format', () => {
  const formatted = formatIndianDateTime('2026-10-31T14:30:00Z');
  assert.ok(formatted.includes('31 Oct 2026') || formatted.includes('01 Nov 2026'), 'Includes date components');
});

// -----------------------------------------------------------------------------
// [BUG-028] Statutory Tax Breakdown Card
// -----------------------------------------------------------------------------
console.log('\n--- 8. [BUG-028] Statutory Tax Breakdown Card ---');

it('TaxBreakdownCard component exists with subtotal, tax breakdown, and badge', () => {
  const cardCode = fs.readFileSync('src/components/ui/TaxBreakdownCard.tsx', 'utf8');
  assert.ok(cardCode.includes('TaxBreakdownCard'), 'Exports TaxBreakdownCard');
  assert.ok(cardCode.includes('Taxable Value'), 'Displays Taxable Value');
  assert.ok(cardCode.includes('Central GST (CGST)'), 'Displays CGST row');
  assert.ok(cardCode.includes('State GST (SGST)'), 'Displays SGST row');
  assert.ok(cardCode.includes('Integrated GST (IGST)'), 'Displays IGST row');
  assert.ok(cardCode.includes('amountInWords'), 'Displays statutory amount in words');
  assert.ok(cardCode.includes('Tax Determination Pending'), 'Handles undetermined status');
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n======================================================================');
console.log(`TOTAL TESTS: ${passedTests + failedTests}`);
console.log(`PASSED:      ${passedTests}`);
console.log(`FAILED:      ${failedTests}`);
console.log('======================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
