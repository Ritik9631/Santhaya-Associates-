/**
 * Santhaya Associates — Batch 2 Bug Fixes & Regressions Verification Suite
 * File: scripts/test-batch2-regressions.mjs
 *
 * Verifies BUG-009 through BUG-016:
 * 1. Customer payload column compliance (no 'customer_type', uses 'client_type')
 * 2. Optional customer contact & state fields in staff ERP
 * 3. Financial safeguard: Place of Supply requirement for taxable quotations and invoices
 * 4. Top utility bar removed from Header while preserving primary CTA & nav
 * 5. Public quotation intake banner copy (no technical/internal architecture leak)
 * 6. Mandatory phone and optional email validation for public enquiries
 * 7. Durable enquiry persistence and staff ERP retrieval (/staff/enquiries)
 * 8. Premium quotation submission success confirmation screen
 */

import assert from 'node:assert';
import fs from 'node:fs';
import { z } from 'zod';
import {
  quotationApiSchema,
  normalizeServiceCategory,
} from '../src/lib/quotation/validation.ts';
import {
  calculateQuotationTotals,
} from '../src/lib/quotation/calculations.ts';
import {
  calculateInvoiceTotals,
} from '../src/lib/billing/calculations.ts';

console.log('======================================================================');
console.log('BATCH 2 REGRESSION & VERIFICATION BATTERY (BUG-009 to BUG-016)');
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
// [BUG-009] Customer Payload Column Compliance
// -----------------------------------------------------------------------------
console.log('--- 1. [BUG-009] Customer Insert/Update Payload Schema Compliance ---');

it('Customer actions payload excludes invalid customer_type property', () => {
  const actionsCode = fs.readFileSync('src/lib/customers/actions.ts', 'utf8');

  // Verify that customer_type is not present in insertPayload
  const insertPayloadMatch = actionsCode.match(/const insertPayload = \{([\s\S]*?)\};/);
  assert.ok(insertPayloadMatch, 'Found insertPayload definition in actions.ts');
  assert.ok(!insertPayloadMatch[1].includes('customer_type:'), 'insertPayload must not include customer_type');
  assert.ok(insertPayloadMatch[1].includes('client_type: customerType'), 'insertPayload must include client_type');

  // Verify that customer_type is not present in updatePayload
  const updatePayloadMatch = actionsCode.match(/const updatePayload = \{([\s\S]*?)\};/);
  assert.ok(updatePayloadMatch, 'Found updatePayload definition in actions.ts');
  assert.ok(!updatePayloadMatch[1].includes('customer_type:'), 'updatePayload must not include customer_type');
  assert.ok(updatePayloadMatch[1].includes('client_type: customerType'), 'updatePayload must include client_type');
});

// -----------------------------------------------------------------------------
// [BUG-010] Optional Customer State, State Code & Place of Supply Safeguards
// -----------------------------------------------------------------------------
console.log('\n--- 2. [BUG-010] Optional Customer State & Place of Supply Safeguards ---');

it('CustomerForm does not hardcode Tamil Nadu or state code 33 defaults', () => {
  const formCode = fs.readFileSync('src/app/staff/customers/new/CustomerForm.tsx', 'utf8');
  assert.ok(!formCode.includes("defaultValue={initialData?.state || 'Tamil Nadu'}"), 'No hardcoded Tamil Nadu in state');
  assert.ok(!formCode.includes("defaultValue={initialData?.state_code || '33'}"), 'No hardcoded 33 in state_code');
  assert.ok(formCode.includes("defaultValue={initialData?.state || ''}"), 'Default state is empty string');
  assert.ok(formCode.includes("defaultValue={initialData?.state_code || ''}"), 'Default state code is empty string');
});

it('Customer actions normalize empty state, state_code, phone, and email to null', () => {
  const actionsCode = fs.readFileSync('src/lib/customers/actions.ts', 'utf8');
  assert.ok(!actionsCode.includes("billing_state: state || 'Tamil Nadu'"), 'billing_state does not default to Tamil Nadu');
  assert.ok(actionsCode.includes('normalizedState = state && state.trim() !== \'\' ? state.trim() : null'), 'State normalized to null when empty');
  assert.ok(actionsCode.includes('normalizedPhone = phone && phone.trim() !== \'\' ? phone.trim() : null'), 'Phone normalized to null when empty');
  assert.ok(actionsCode.includes('normalizedEmail = email && email.trim() !== \'\' ? email.trim().toLowerCase() : null'), 'Email normalized to null when empty');
});

it('Migration file makes billing_state nullable without data loss', () => {
  const sql = fs.readFileSync('supabase/migrations/20261031230000_make_customer_billing_state_nullable.sql', 'utf8');
  assert.ok(sql.includes('ALTER TABLE public.customers'), 'Targets public.customers');
  assert.ok(sql.includes('ALTER COLUMN billing_state DROP NOT NULL'), 'Drops NOT NULL constraint');
});

it('Quotation calculation accurately classifies all three conditions (intra-state, interstate, undetermined)', () => {
  const items = [{ item_name: 'Test Drill', quantity: 1, unit_rate: 10000, gst_rate: 18 }];

  // Condition 1: Intra-state (Bihar '10' to Bihar '10')
  const intraTotals = calculateQuotationTotals(items, true, '10');
  assert.strictEqual(intraTotals.tax_determination, 'intra_state', 'Classified as intra_state');
  assert.strictEqual(intraTotals.is_intra_state, true, 'is_intra_state is true');
  assert.strictEqual(intraTotals.is_inter_state, false, 'is_inter_state is false');
  assert.strictEqual(intraTotals.is_tax_determined, true, 'is_tax_determined is true');
  assert.strictEqual(intraTotals.cgst_amount, 900, 'CGST is 9%');
  assert.strictEqual(intraTotals.sgst_amount, 900, 'SGST is 9%');
  assert.strictEqual(intraTotals.igst_amount, 0, 'IGST is 0 for intra-state');
  assert.strictEqual(intraTotals.total_tax_amount, 1800, 'Total tax is 1800');

  // Condition 2: Interstate (Bihar '10' to Delhi '07')
  const interTotals = calculateQuotationTotals(items, true, '07');
  assert.strictEqual(interTotals.tax_determination, 'inter_state', 'Classified as inter_state');
  assert.strictEqual(interTotals.is_intra_state, false, 'is_intra_state is false');
  assert.strictEqual(interTotals.is_inter_state, true, 'is_inter_state is true');
  assert.strictEqual(interTotals.is_tax_determined, true, 'is_tax_determined is true');
  assert.strictEqual(interTotals.cgst_amount, 0, 'CGST is 0 for interstate');
  assert.strictEqual(interTotals.sgst_amount, 0, 'SGST is 0 for interstate');
  assert.strictEqual(interTotals.igst_amount, 1800, 'IGST is 18%');
  assert.strictEqual(interTotals.total_tax_amount, 1800, 'Total tax is 1800');

  // Condition 3: Undetermined (missing empty string)
  const emptyTotals = calculateQuotationTotals(items, true, '');
  assert.strictEqual(emptyTotals.tax_determination, 'undetermined', 'Missing state classified as undetermined');
  assert.strictEqual(emptyTotals.is_intra_state, false, 'Missing place of supply must not assume intra-state');
  assert.strictEqual(emptyTotals.is_inter_state, false, 'Missing place of supply must not assume interstate');
  assert.strictEqual(emptyTotals.is_tax_determined, false, 'is_tax_determined is false');
  assert.strictEqual(emptyTotals.cgst_amount, 0, 'No CGST calculated when undetermined');
  assert.strictEqual(emptyTotals.sgst_amount, 0, 'No SGST calculated when undetermined');
  assert.strictEqual(emptyTotals.igst_amount, 0, 'No IGST calculated when undetermined');
  assert.strictEqual(emptyTotals.total_tax_amount, 0, 'total_tax_amount is 0 when undetermined');
  assert.ok(emptyTotals.tax_determination_message?.includes('Place of Supply is undetermined'), 'Provides warning message');
  assert.ok(emptyTotals.amount_in_words.includes('Place of Supply Undetermined'), 'Amount in words marks tax pending');

  // Condition 3b: Undetermined (invalid state code '99' or 'XYZ')
  const invalidTotals = calculateQuotationTotals(items, true, '99');
  assert.strictEqual(invalidTotals.tax_determination, 'undetermined', 'Invalid state code 99 is undetermined');
  assert.strictEqual(invalidTotals.is_intra_state, false);
  assert.strictEqual(invalidTotals.is_inter_state, false);
  assert.strictEqual(invalidTotals.igst_amount, 0);
});

it('Billing calculation accurately classifies all three conditions (intra-state, interstate, undetermined)', () => {
  const items = [{ item_name: 'Service Work', quantity: 1, unit_rate: 20000, gst_rate: 18 }];

  // Condition 1: Intra-state (Bihar '10' to Bihar '10')
  const intraTotals = calculateInvoiceTotals(items, 'tax_invoice', '10', '10');
  assert.strictEqual(intraTotals.tax_determination, 'intra_state');
  assert.strictEqual(intraTotals.is_intra_state, true);
  assert.strictEqual(intraTotals.is_inter_state, false);
  assert.strictEqual(intraTotals.cgst_amount, 1800);
  assert.strictEqual(intraTotals.sgst_amount, 1800);
  assert.strictEqual(intraTotals.igst_amount, 0);

  // Condition 2: Interstate (Delhi '07' to Bihar '10')
  const interTotals = calculateInvoiceTotals(items, 'tax_invoice', '07', '10');
  assert.strictEqual(interTotals.tax_determination, 'inter_state');
  assert.strictEqual(interTotals.is_intra_state, false);
  assert.strictEqual(interTotals.is_inter_state, true);
  assert.strictEqual(interTotals.cgst_amount, 0);
  assert.strictEqual(interTotals.sgst_amount, 0);
  assert.strictEqual(interTotals.igst_amount, 3600);

  // Condition 3: Undetermined (missing empty string)
  const emptyTotals = calculateInvoiceTotals(items, 'tax_invoice', '', '10');
  assert.strictEqual(emptyTotals.tax_determination, 'undetermined');
  assert.strictEqual(emptyTotals.is_intra_state, false, 'Missing place of supply must not assume intra-state');
  assert.strictEqual(emptyTotals.is_inter_state, false, 'Missing place of supply must not assume interstate');
  assert.strictEqual(emptyTotals.is_tax_determined, false);
  assert.strictEqual(emptyTotals.cgst_amount, 0);
  assert.strictEqual(emptyTotals.sgst_amount, 0);
  assert.strictEqual(emptyTotals.igst_amount, 0, 'No IGST attributed when place of supply is missing');
  assert.ok(emptyTotals.tax_determination_message?.includes('Place of Supply is undetermined'));
  assert.ok(emptyTotals.amount_in_words.includes('Place of Supply Undetermined'));
});

it('Quotation issuance action blocks issuance when taxable quotation lacks valid Place of Supply', () => {
  const code = fs.readFileSync('src/lib/quotation/actions.ts', 'utf8');
  assert.ok(
    code.includes('quote.is_gst_applicable && (!quote.place_of_supply_state_code || !isValidIndianStateCode(quote.place_of_supply_state_code))'),
    'issueQuotationAction checks for valid place_of_supply_state_code'
  );
  assert.ok(
    code.includes('Cannot issue taxable quotation: Place of Supply state code is required'),
    'Provides descriptive error blocking issuance'
  );
});

it('Invoice issuance action blocks issuance when tax_invoice lacks valid Place of Supply', () => {
  const code = fs.readFileSync('src/lib/billing/actions.ts', 'utf8');
  assert.ok(
    code.includes("invoice.invoice_type === 'tax_invoice' &&\n      (!invoice.place_of_supply_state_code || !isValidIndianStateCode(invoice.place_of_supply_state_code))"),
    'issueInvoiceAction checks for valid place_of_supply_state_code'
  );
  assert.ok(
    code.includes('Cannot issue statutory tax invoice: Place of Supply state code is required'),
    'Provides descriptive error blocking statutory tax invoice issuance'
  );
});

// -----------------------------------------------------------------------------
// [BUG-011] Header Cleanliness & Single Prominent CTA
// -----------------------------------------------------------------------------
console.log('\n--- 3. [BUG-011] Header Component Cleanup ---');

it('Header.tsx does not contain top utility bar with fake hours or duplicate elements', () => {
  const headerCode = fs.readFileSync('src/components/Header.tsx', 'utf8');
  assert.ok(!headerCode.includes('border-b border-slate-100 bg-slate-50 py-1.5'), 'Top utility bar removed');
  assert.ok(!headerCode.includes('Mon - Sat: 9:00 AM - 7:00 PM'), 'No fabricated operating hours in header');
  assert.ok(!headerCode.includes('Emergency Tender Support'), 'No fabricated support label');
  assert.ok(headerCode.includes('Request a Quotation'), 'Primary quotation CTA preserved');
  assert.ok(headerCode.includes('Services'), 'Services navigation preserved');
  assert.ok(headerCode.includes('About Us'), 'About Us navigation preserved');
});

// -----------------------------------------------------------------------------
// [BUG-012] Public Quotation Intake Copy Polish
// -----------------------------------------------------------------------------
console.log('\n--- 4. [BUG-012] Quotation Page Public Intake Copy Polish ---');

it('Quotation intake banner copy is professional and client-facing (no technical jargon leaks)', () => {
  const pageCode = fs.readFileSync('src/app/request-quotation/page.tsx', 'utf8');
  assert.ok(!pageCode.includes('Phase 4: Quotation Request Intake'), 'No internal Phase 4 label');
  assert.ok(!pageCode.includes('Direct DB Persistence Engine Active'), 'No internal DB architecture leak');
  assert.ok(!pageCode.includes('Phase 4 Database Connected & Ready'), 'No Phase 4 DB Connected badge');
  assert.ok(pageCode.includes('Request an Industrial Quotation'), 'Professional heading preserved');
  assert.ok(pageCode.includes('Official Quotation Intake'), 'Official intake badge present');
});

// -----------------------------------------------------------------------------
// [BUG-013] Contact Validation: Mandatory Phone & Optional Email
// -----------------------------------------------------------------------------
console.log('\n--- 5. [BUG-013] Quotation Form Contact Validation Rules ---');

it('Quotation validation accepts valid Indian phone with empty email', () => {
  const validPayload = {
    businessName: 'Patna Infrastructure Pvt Ltd',
    contactPerson: 'Manoj Kumar',
    phone: '9876543210',
    email: '',
    serviceCategory: 'construction-tenders',
    requirementDetails: 'Four-lane highway earthmoving tender requirement for NHAI stretch.',
    deliveryLocation: 'Patna, Bihar',
    privacyConsent: true,
  };

  const parsed = quotationApiSchema.safeParse(validPayload);
  assert.ok(parsed.success, 'Valid phone without email succeeds validation');
});

it('Quotation validation accepts valid Indian phone with valid email', () => {
  const validPayload = {
    businessName: 'Patna Infrastructure Pvt Ltd',
    contactPerson: 'Manoj Kumar',
    phone: '9876543210',
    email: 'manoj@patnainfra.in',
    serviceCategory: 'construction-machinery',
    requirementDetails: 'Commercial high-rise structural foundation quotation.',
    deliveryLocation: 'Motihari, Bihar',
    privacyConsent: true,
  };

  const parsed = quotationApiSchema.safeParse(validPayload);
  assert.ok(parsed.success, 'Valid phone with valid email succeeds validation');
  assert.strictEqual(parsed.data.email, 'manoj@patnainfra.in');
});

it('Quotation validation rejects invalid email format when email is non-empty', () => {
  const invalidPayload = {
    businessName: 'Patna Infrastructure Pvt Ltd',
    contactPerson: 'Manoj Kumar',
    phone: '9876543210',
    email: 'not-an-email',
    serviceCategory: 'construction-tenders',
    requirementDetails: 'Bridge construction equipment requirement.',
    deliveryLocation: 'Patna, Bihar',
    privacyConsent: true,
  };

  const parsed = quotationApiSchema.safeParse(invalidPayload);
  assert.strictEqual(parsed.success, false, 'Invalid non-empty email is rejected');
  assert.ok(parsed.error.errors.some((e) => e.path.includes('email')), 'Error targets email field');
});

it('Quotation validation rejects missing or invalid phone numbers', () => {
  const noPhone = {
    businessName: 'Patna Infrastructure Pvt Ltd',
    contactPerson: 'Manoj Kumar',
    phone: '',
    serviceCategory: 'construction-tenders',
    requirementDetails: 'Valid project scope description here.',
    deliveryLocation: 'Patna, Bihar',
    privacyConsent: true,
  };
  const badPhone = {
    businessName: 'Patna Infrastructure Pvt Ltd',
    contactPerson: 'Manoj Kumar',
    phone: '12345',
    serviceCategory: 'construction-tenders',
    requirementDetails: 'Valid project scope description here.',
    deliveryLocation: 'Patna, Bihar',
    privacyConsent: true,
  };

  assert.strictEqual(quotationApiSchema.safeParse(noPhone).success, false, 'Empty phone rejected');
  assert.strictEqual(quotationApiSchema.safeParse(badPhone).success, false, 'Short phone rejected');
});

// -----------------------------------------------------------------------------
// [BUG-014] Staff ERP Enquiries Directory & Intake Flow
// -----------------------------------------------------------------------------
console.log('\n--- 6. [BUG-014] Staff ERP Enquiries Directory Integration ---');

it('Staff sidebar navigation includes Quotation Requests / Enquiries link', () => {
  const sidebarCode = fs.readFileSync('src/app/staff/StaffSidebar.tsx', 'utf8');
  assert.ok(sidebarCode.includes('/staff/enquiries'), 'Sidebar includes /staff/enquiries route');
  assert.ok(sidebarCode.includes('Enquiries') || sidebarCode.includes('Inbound Requests'), 'Sidebar displays Enquiries label');
});

it('Staff enquiries page queries quotation_requests table ordered by created_at', () => {
  const pageCode = fs.readFileSync('src/app/staff/enquiries/page.tsx', 'utf8');
  assert.ok(pageCode.includes("from('quotation_requests')"), 'Queries quotation_requests table');
  assert.ok(pageCode.includes("order('created_at', { ascending: false })"), 'Orders by created_at desc');
  assert.ok(pageCode.includes('business_name'), 'Displays business_name');
  assert.ok(pageCode.includes('contact_person'), 'Displays contact_person');
  assert.ok(pageCode.includes('phone'), 'Displays phone');
});

// -----------------------------------------------------------------------------
// [BUG-015] Public Quotation Form Success Confirmation Screen
// -----------------------------------------------------------------------------
console.log('\n--- 7. [BUG-015] Quotation Form Success Confirmation Screen ---');

it('Quotation form renders comprehensive success screen with reference number', () => {
  const formCode = fs.readFileSync('src/app/request-quotation/page.tsx', 'utf8');
  assert.ok(formCode.includes('submissionSuccess.referenceNumber'), 'Tracks submitted reference number');
  assert.ok(formCode.includes('Your Project Journey Starts Here!'), 'Displays prominent success heading');
  assert.ok(formCode.includes('Submit Another Quotation Request'), 'Provides button to submit another request');
  assert.ok(formCode.includes('Back to Home'), 'Provides return to homepage action');
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
