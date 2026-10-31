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

it('Quotation calculation does not assume intra-state if Place of Supply is missing', () => {
  const items = [{ item_name: 'Test Drill', quantity: 1, unit_rate: 10000, gst_rate: 18 }];
  // When placeOfSupplyStateCode is empty string
  const totals = calculateQuotationTotals(items, true, '');
  assert.strictEqual(totals.is_intra_state, false, 'Missing place of supply must not assume intra-state');
  assert.strictEqual(totals.cgst_amount, 0, 'No CGST calculated when place of supply is undetermined');
  assert.strictEqual(totals.sgst_amount, 0, 'No SGST calculated when place of supply is undetermined');
});

it('Billing calculation does not assume intra-state if Place of Supply is missing', () => {
  const items = [{ item_name: 'Service Work', quantity: 1, unit_rate: 20000, gst_rate: 18 }];
  const totals = calculateInvoiceTotals(items, 'tax_invoice', '', '07');
  assert.strictEqual(totals.is_intra_state, false, 'Missing place of supply in invoice calculation must not assume intra-state');
  assert.strictEqual(totals.cgst_amount, 0, 'No CGST when place of supply is empty');
  assert.strictEqual(totals.sgst_amount, 0, 'No SGST when place of supply is empty');
});

it('Quotation issuance action blocks issuance when taxable quotation lacks Place of Supply', () => {
  const code = fs.readFileSync('src/lib/quotation/actions.ts', 'utf8');
  assert.ok(
    code.includes('quote.is_gst_applicable && (!quote.place_of_supply_state_code || quote.place_of_supply_state_code.trim() === \'\')'),
    'issueQuotationAction checks for mandatory place_of_supply_state_code'
  );
  assert.ok(
    code.includes('Cannot issue taxable quotation: Place of Supply state code is required'),
    'Provides descriptive error blocking issuance'
  );
});

it('Invoice issuance action blocks issuance when tax_invoice lacks Place of Supply', () => {
  const code = fs.readFileSync('src/lib/billing/actions.ts', 'utf8');
  assert.ok(
    code.includes("invoice.invoice_type === 'tax_invoice' &&\n      (!invoice.place_of_supply_state_code || invoice.place_of_supply_state_code.trim() === '')"),
    'issueInvoiceAction checks for mandatory place_of_supply_state_code'
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

console.log('======================================================================');
console.log(`BATCH 2 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('======================================================================');

if (failedTests > 0) {
  process.exit(1);
}

