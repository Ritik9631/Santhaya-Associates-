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

  // Condition 1: Intra-state (Delhi '07' to Delhi '07')
  const intraTotals = calculateQuotationTotals(items, true, '07');
  assert.strictEqual(intraTotals.tax_determination, 'intra_state', 'Classified as intra_state');
  assert.strictEqual(intraTotals.is_intra_state, true, 'is_intra_state is true');
  assert.strictEqual(intraTotals.is_inter_state, false, 'is_inter_state is false');
  assert.strictEqual(intraTotals.is_tax_determined, true, 'is_tax_determined is true');
  assert.strictEqual(intraTotals.cgst_amount, 900, 'CGST is 9%');
  assert.strictEqual(intraTotals.sgst_amount, 900, 'SGST is 9%');
  assert.strictEqual(intraTotals.igst_amount, 0, 'IGST is 0 for intra-state');
  assert.strictEqual(intraTotals.total_tax_amount, 1800, 'Total tax is 1800');

  // Condition 2: Interstate (Delhi '07' to Bihar '10')
  const interTotals = calculateQuotationTotals(items, true, '10');
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

  // Condition 1: Intra-state
  const intraTotals = calculateInvoiceTotals(items, 'tax_invoice', '07', '07');
  assert.strictEqual(intraTotals.tax_determination, 'intra_state');
  assert.strictEqual(intraTotals.is_intra_state, true);
  assert.strictEqual(intraTotals.is_inter_state, false);
  assert.strictEqual(intraTotals.cgst_amount, 1800);
  assert.strictEqual(intraTotals.sgst_amount, 1800);
  assert.strictEqual(intraTotals.igst_amount, 0);

  // Condition 2: Interstate
  const interTotals = calculateInvoiceTotals(items, 'tax_invoice', '10', '07');
  assert.strictEqual(interTotals.tax_determination, 'inter_state');
  assert.strictEqual(interTotals.is_intra_state, false);
  assert.strictEqual(interTotals.is_inter_state, true);
  assert.strictEqual(interTotals.cgst_amount, 0);
  assert.strictEqual(interTotals.sgst_amount, 0);
  assert.strictEqual(interTotals.igst_amount, 3600);

  // Condition 3: Undetermined (missing empty string)
  const emptyTotals = calculateInvoiceTotals(items, 'tax_invoice', '', '07');
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
// [BUG-011] Top Utility Bar Removal & Clean Header
// -----------------------------------------------------------------------------
console.log('\n--- 3. [BUG-011] Header Top Bar Cleanup & NAP Preservation ---');

it('Header top utility bar is removed to prevent NAP repetition', () => {
  const headerCode = fs.readFileSync('src/components/Header.tsx', 'utf8');
  assert.ok(!headerCode.includes('Top utility bar'), 'Top utility bar markup removed');
  assert.ok(!headerCode.includes('Motihari, Bihar – 845401'), 'Motihari not repeated in header top bar');
  assert.ok(headerCode.includes('Request a Quotation'), 'Request a Quotation CTA preserved in header');
});

it('Footer preserves official NAP with active clickable links', () => {
  const footerCode = fs.readFileSync('src/components/Footer.tsx', 'utf8');
  assert.ok(footerCode.includes('tel:+919430986713'), 'Footer contains primary tel link');
  assert.ok(footerCode.includes('tel:+919608950748'), 'Footer contains secondary tel link');
  assert.ok(footerCode.includes('mailto:heistofeverything@gmail.com'), 'Footer contains email mailto link');
  assert.ok(footerCode.includes('Motihari, Purbi Champaran, Bihar – 845401'), 'Footer contains complete address');
});

// -----------------------------------------------------------------------------
// [BUG-012 & BUG-013] Quotation Form Copy & Spacing
// -----------------------------------------------------------------------------
console.log('\n--- 4. [BUG-012 & BUG-013] Quotation Form Friendly Copy & Layout Spacing ---');

it('Public quotation form replaces internal Phase 2D banner with customer copy', () => {
  const pageCode = fs.readFileSync('src/app/request-quotation/page.tsx', 'utf8');
  assert.ok(!pageCode.includes('Phase 2D-A Architecture: Secure Server API Integration'), 'Technical architecture heading removed');
  assert.ok(!pageCode.includes('salted IP rate limiting'), 'Internal security details removed from customer view');
  assert.ok(
    pageCode.includes('Tell us about your project, tender requirements, or machinery needs. Our team will review your request and contact you using the details provided.'),
    'Contains exact customer-friendly guidance copy'
  );
});

it('Public quotation page has tightened whitespace and scroll anchor padding', () => {
  const pageCode = fs.readFileSync('src/app/request-quotation/page.tsx', 'utf8');
  assert.ok(pageCode.includes('py-8 sm:py-10'), 'Outer padding adjusted for tighter whitespace');
  assert.ok(pageCode.includes('scroll-mt-28'), 'Form container includes sticky header scroll offset');
});

// -----------------------------------------------------------------------------
// [BUG-014] Phone Mandatory on Public Quotation Form
// -----------------------------------------------------------------------------
console.log('\n--- 5. [BUG-014] Mandatory Phone on Public Quotation Intake ---');

it('Quotation API Schema requires 10-digit Indian mobile number', () => {
  const validPayload = {
    businessName: 'Tata Projects Ltd',
    contactPerson: 'Suresh Menon',
    phone: '9820012345',
    serviceCategory: 'construction_machinery',
    requirementDetails: 'Need 20-ton excavator equipment for 6-month civil works project.',
    deliveryLocation: 'Bihar',
    privacyConsent: true,
  };

  const validRes = quotationApiSchema.safeParse(validPayload);
  assert.strictEqual(validRes.success, true, 'Valid payload with phone passes');

  // Test missing phone
  const noPhonePayload = { ...validPayload, phone: '' };
  const noPhoneRes = quotationApiSchema.safeParse(noPhonePayload);
  assert.strictEqual(noPhoneRes.success, false, 'Missing phone is rejected');

  // Test invalid phone (not starting with 6-9 or not 10 digits)
  const invalidPhonePayload = { ...validPayload, phone: '5123456789' };
  const invalidPhoneRes = quotationApiSchema.safeParse(invalidPhonePayload);
  assert.strictEqual(invalidPhoneRes.success, false, 'Invalid mobile starting with 5 is rejected');
});

it('Quotation API Schema allows optional email', () => {
  const withoutEmail = {
    businessName: 'Tata Projects Ltd',
    contactPerson: 'Suresh Menon',
    phone: '9820012345',
    email: '',
    serviceCategory: 'construction_machinery',
    requirementDetails: 'Need 20-ton excavator equipment for 6-month civil works project.',
    deliveryLocation: 'Bihar',
    privacyConsent: true,
  };
  const res = quotationApiSchema.safeParse(withoutEmail);
  assert.strictEqual(res.success, true, 'Quotation without email is valid as long as phone is provided');
});

// -----------------------------------------------------------------------------
// [BUG-015] Inbound Enquiries ERP Visibility (/staff/enquiries)
// -----------------------------------------------------------------------------
console.log('\n--- 6. [BUG-015] Inbound Enquiries ERP Visibility & Navigation ---');

it('Inbound enquiries page exists and is protected by staff session', () => {
  assert.ok(fs.existsSync('src/app/staff/enquiries/page.tsx'), '/staff/enquiries/page.tsx exists');
  assert.ok(fs.existsSync('src/app/staff/enquiries/EnquiryListClient.tsx'), 'EnquiryListClient.tsx exists');
  assert.ok(fs.existsSync('src/lib/enquiries/actions.ts'), 'src/lib/enquiries/actions.ts exists');

  const pageContent = fs.readFileSync('src/app/staff/enquiries/page.tsx', 'utf8');
  assert.ok(pageContent.includes('requireStaffSession'), 'Protected by requireStaffSession');
  assert.ok(pageContent.includes("from('quotation_requests')"), 'Queries quotation_requests table');
});

it('Staff sidebar and dashboard overview link to /staff/enquiries', () => {
  const sidebarCode = fs.readFileSync('src/app/staff/StaffSidebar.tsx', 'utf8');
  assert.ok(sidebarCode.includes("href: '/staff/enquiries'"), 'StaffSidebar links to /staff/enquiries');

  const overviewCode = fs.readFileSync('src/app/staff/page.tsx', 'utf8');
  assert.ok(overviewCode.includes("href=\"/staff/enquiries\""), 'Staff overview dashboard links to /staff/enquiries');
});

// -----------------------------------------------------------------------------
// [BUG-016] Premium Submission Success Screen
// -----------------------------------------------------------------------------
console.log('\n--- 7. [BUG-016] Premium Quotation Success Confirmation Screen ---');

it('Quotation page success screen conforms to exact wording and features', () => {
  const pageCode = fs.readFileSync('src/app/request-quotation/page.tsx', 'utf8');
  assert.ok(pageCode.includes('Your Project Journey Starts Here!'), 'Success heading matches requirement');
  assert.ok(
    pageCode.includes('Thank you for choosing Santhaya Associates Pvt. Ltd. Your quotation request has been received, and our team will review your requirements.'),
    'Success body copy matches requirement'
  );
  assert.ok(pageCode.includes('handleCopyReference'), 'Includes Copy Reference action');
  assert.ok(pageCode.includes('Back to Home'), 'Includes Back to Home link');
  assert.ok(pageCode.includes('contact your representative directly using the provided phone number'), 'States phone contact notice');
});

// -----------------------------------------------------------------------------
// [BUG-017] Customer Management Schema Compliance & Nonexistent Column Elimination
// -----------------------------------------------------------------------------
console.log('\n--- 8. [BUG-017] Customer Management Schema Compliance (No is_active/shipping_address) ---');

it('Customer listing page does not query nonexistent customers.is_active', () => {
  const pageCode = fs.readFileSync('src/app/staff/customers/page.tsx', 'utf8');
  assert.ok(!pageCode.includes('is_active'), 'Customer listing page does not reference is_active');
  assert.ok(pageCode.includes('is_verified'), 'Customer listing page references is_verified for statutory verification');
});

it('Customer actions insert and update payloads exclude nonexistent columns', () => {
  const actionsCode = fs.readFileSync('src/lib/customers/actions.ts', 'utf8');

  // Insert payload checks
  const insertPayloadMatch = actionsCode.match(/const insertPayload = \{([\s\S]*?)\};/);
  assert.ok(insertPayloadMatch, 'Found insertPayload definition in actions.ts');
  assert.ok(!insertPayloadMatch[1].includes('is_active:'), 'insertPayload must not include is_active');
  assert.ok(!insertPayloadMatch[1].includes('shipping_address:'), 'insertPayload must not include shipping_address');
  assert.ok(!insertPayloadMatch[1].includes('customer_type:'), 'insertPayload must not include customer_type');

  // Update payload checks
  const updatePayloadMatch = actionsCode.match(/const updatePayload = \{([\s\S]*?)\};/);
  assert.ok(updatePayloadMatch, 'Found updatePayload definition in actions.ts');
  assert.ok(!updatePayloadMatch[1].includes('is_active:'), 'updatePayload must not include is_active');
  assert.ok(!updatePayloadMatch[1].includes('shipping_address:'), 'updatePayload must not include shipping_address');
  assert.ok(!updatePayloadMatch[1].includes('customer_type:'), 'updatePayload must not include customer_type');
});

it('Customer detail view does not reference nonexistent is_active column', () => {
  const detailCode = fs.readFileSync('src/app/staff/customers/[id]/CustomerDetailView.tsx', 'utf8');
  assert.ok(!detailCode.includes('is_active'), 'CustomerDetailView must not reference is_active');
  assert.ok(!detailCode.includes('handleToggleStatus'), 'CustomerDetailView must not have broken toggle status handler');
  assert.ok(!detailCode.includes('toggleCustomerStatusAction'), 'CustomerDetailView must not call toggleCustomerStatusAction');
  assert.ok(!detailCode.includes("'Tamil Nadu'"), 'CustomerDetailView must not silently default unknown state to Tamil Nadu');
});

it('Database TypeScript definitions accurately reflect customers table schema', () => {
  const dbTypesCode = fs.readFileSync('src/types/database.ts', 'utf8');
  const customersTableMatch = dbTypesCode.match(/customers: \{([\s\S]*?)\n      \};/);
  assert.ok(customersTableMatch, 'Found customers table definition in database.ts');
  assert.ok(!customersTableMatch[1].includes('is_active'), 'customers table types must not include is_active');
  assert.ok(!customersTableMatch[1].includes('shipping_address'), 'customers table types must not include shipping_address');
  assert.ok(!customersTableMatch[1].includes('customer_type'), 'customers table types must not include customer_type');
});

console.log('======================================================================');
console.log(`BATCH 2 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('======================================================================');

if (failedTests > 0) {
  process.exit(1);
}

