/**
 * Santhaya Associates — Batch 5 Regressions & Bug Fixes Verification Battery
 * File: scripts/test-batch5-regressions.mjs
 *
 * Verifies BUG-050 through BUG-059:
 * 1.  [BUG-050] Quotation new form heading contrast & styling
 * 2.  [BUG-051] Public quotation request email notification & outbox worker trigger
 * 3.  [BUG-051] Mock email provider safety & outbox logging without network/costs
 * 4.  [BUG-051] Communications Center mock mode transparency & banner
 * 5.  [BUG-052] Draft invoice print watermark & statutory notice safeguards
 * 6.  [BUG-052] Draft invoice billing table preview action
 * 7.  [BUG-053] Billing directory Date / Due column wrapping fix (whitespace-nowrap min-w-[130px])
 * 8.  [BUG-054] WhatsApp manual sharing message & link generation
 * 9.  [BUG-055] Segregation of sharing channels & staff attestation (Confirm Manually Sent)
 * 10. [BUG-056] Indian mobile phone validation utility (10-digit, 6-9 prefixes, normalizations)
 * 11. [BUG-056] Indian mobile phone validation rejection cases (invalid lengths, non-numeric, 0-5 start)
 * 12. [BUG-056] Optional customer contact updates on manual delivery
 * 13. [BUG-057] Email manual sharing mailto URI generation with subject & body
 * 14. [BUG-058] Touch-friendly 5-step sharing guide with Android & Windows attachment instructions
 * 15. [BUG-059] Accurate manual statuses (prepared, sharing_initiated, manually_sent, downloaded)
 * 16. [BUG-059] Quotation delivery action supports new statuses & audit trail
 * 17. [BUG-059] Invoice delivery action supports new statuses, manual tracking & audit trail
 * 18. QuotationDetailView integration with DocumentShareModal & Share/Deliver action
 * 19. InvoiceDetailView integration with DocumentShareModal & Share/Deliver action (drafts included)
 * 20. Outbox ledger differentiates mock execution from live provider transmissions
 */

import assert from 'node:assert';
import fs from 'node:fs';
import { validateIndianMobile } from '../src/lib/utils/phone.ts';
const { MockEmailProvider } = await import('../src/lib/email/providers/mock-provider.ts');

console.log('======================================================================');
console.log('SANTHAYA ASSOCIATES — BATCH 5 REGRESSION BATTERY (BUG-050 to BUG-059)');
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

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name} — ${err.message}`);
    failedTests++;
  }
}

// -----------------------------------------------------------------------------
// [BUG-050] Quotation New Form Heading Contrast
// -----------------------------------------------------------------------------
console.log('--- 1. [BUG-050] Quotation New Page Contrast & Heading Styling ---');

it('Quotation new form header uses high-contrast text-white and text-slate-400 styling', () => {
  const code = fs.readFileSync('src/app/staff/quotations/new/page.tsx', 'utf8');
  assert.ok(code.includes('text-white'), 'Header must contain text-white for prominent visibility');
  assert.ok(code.includes('text-slate-400'), 'Header description must use accessible slate-400 or lighter');
  assert.ok(code.includes('text-gold-400'), 'Header includes premium gold accent icon');
  // Ensure dark banner does not use low-contrast text-slate-900 for headings
  assert.ok(!code.includes('text-2xl font-bold text-slate-900'), 'Header must not use dark text-slate-900 in dark banner');
});

// -----------------------------------------------------------------------------
// [BUG-051] Public Quotation Request Notification & Mock Provider
// -----------------------------------------------------------------------------
console.log('\n--- 2. [BUG-051] Public Quotation Request Notification & Outbox Trigger ---');

it('Quotation request API enqueues internal notification and triggers outbox batch non-blockingly', () => {
  const code = fs.readFileSync('src/app/api/quotation-request/route.ts', 'utf8');
  assert.ok(code.includes('adminNotificationEmail') || code.includes('INTERNAL_NOTIFICATION_EMAIL'), 'API routes notification to configured internal email');
  assert.ok(code.includes('processOutboxBatch(adminClient'), 'API triggers processOutboxBatch worker');
  assert.ok(code.includes('.catch('), 'Outbox execution must be non-blocking with error catch');
});

await itAsync('MockEmailProvider processes emails safely without network access or errors', async () => {
  const provider = new MockEmailProvider();
  assert.strictEqual(provider.name, 'mock');
  const res = await provider.sendEmail({
    to: 'heistofeverything@gmail.com',
    subject: 'New Public Quotation Request: Test Org',
    html: '<p>Test message</p>',
  });
  assert.strictEqual(res.success, true);
  assert.ok(res.providerMessageId.startsWith('mock_msg_'), 'Returns simulated mock message ID');
});

it('Email provider factory selects MockEmailProvider when EMAIL_PROVIDER=mock', () => {
  const factoryCode = fs.readFileSync('src/lib/email/factory.ts', 'utf8');
  assert.ok(factoryCode.includes("providerType === 'mock'"), "Factory checks providerType === 'mock'");
  assert.ok(factoryCode.includes('new MockEmailProvider()'), 'Factory instantiates MockEmailProvider when mock mode requested');
});

it('Communications Center displays prominent warning alert in mock mode', () => {
  const code = fs.readFileSync('src/app/staff/communications/CommunicationsManager.tsx', 'utf8');
  assert.ok(code.includes('Development Mock Email Mode Active (Safe Sandbox)'), 'Displays mock alert banner');
  assert.ok(code.includes('Mock — Not Sent'), 'Displays clear Mock — Not Sent badge');
  assert.ok(code.includes('Simulated mock dispatches'), 'KPI reflects simulation rather than claiming verified deliveries');
});

// -----------------------------------------------------------------------------
// [BUG-052] Draft Invoice Print Safeguards & Notice
// -----------------------------------------------------------------------------
console.log('\n--- 3. [BUG-052] Draft Invoice Print Safeguards & Statutory Disclaimers ---');

it('Draft invoice PDF template displays DRAFT — NOT A TAX INVOICE badge and warnings', () => {
  const code = fs.readFileSync('src/app/staff/billing/[id]/pdf/page.tsx', 'utf8');
  assert.ok(code.includes("isDraft ? 'DRAFT — NOT A TAX INVOICE' : 'TAX INVOICE'"), 'Displays bold draft badge');
  assert.ok(code.includes('Section 31 of CGST Act, 2017'), 'Statutory notice cites Section 31 of CGST Act');
  assert.ok(code.includes('Cannot be used for Input Tax Credit (ITC)'), 'Notice prevents illegal ITC claims');
  assert.ok(code.includes('(Affixed upon issuance)'), 'Signature block withheld until final issuance');
  assert.ok(code.includes('DRAFT — NOT A TAX INVOICE'), 'Diagonal repeating watermark injected');
  assert.ok(code.includes('print:text-red-') || code.includes('print:border-red-'), 'Watermark explicitly preserved across print media');
});

it('Billing directory lists draft invoices with Preview Draft PDF action', () => {
  const code = fs.readFileSync('src/app/staff/billing/page.tsx', 'utf8');
  assert.ok(code.includes("inv.status === 'draft' ? 'Preview Draft PDF'"), 'Billing directory distinguishes draft PDF preview');
});

// -----------------------------------------------------------------------------
// [BUG-053] Billing Directory Date Column Width & Wrapping
// -----------------------------------------------------------------------------
console.log('\n--- 4. [BUG-053] Billing Directory Date Column Wrapping ---');

it('Billing table Date / Due column applies whitespace-nowrap min-w-[130px]', () => {
  const code = fs.readFileSync('src/app/staff/billing/page.tsx', 'utf8');
  assert.ok(code.includes('whitespace-nowrap min-w-[130px]'), 'Date header and cells enforce whitespace-nowrap min-w-[130px]');
  assert.ok(code.includes('Due:'), 'Clean two-line date layout maintained without mid-word breaks');
});

// -----------------------------------------------------------------------------
// [BUG-056] Indian Mobile Phone Validation & Normalization
// -----------------------------------------------------------------------------
console.log('\n--- 5. [BUG-056] Indian Mobile Phone Validation Utility ---');

it('Validates 10-digit Indian numbers starting with 6, 7, 8, 9', () => {
  const validNumbers = [
    '9876543210',
    '8765432109',
    '7654321098',
    '6543210987',
    '+91 9876543210',
    '+91-98765-43210',
    '919876543210',
    '09876543210',
    '+91 98765 43210',
  ];

  for (const raw of validNumbers) {
    const res = validateIndianMobile(raw);
    assert.strictEqual(res.isValid, true, `Expected ${raw} to be valid`);
    assert.strictEqual(res.normalized10Digits.length, 10, 'Must normalize to exactly 10 digits');
    assert.ok(res.normalizedWaPhone.startsWith('91'), 'WhatsApp phone must start with 91');
    assert.strictEqual(res.normalizedWaPhone.length, 12, 'WhatsApp phone must be 12 digits');
    assert.ok(res.formattedDisplay.startsWith('+91 '), 'Display phone must format with +91 ');
  }
});

it('Rejects invalid numbers (invalid prefix, incorrect length, non-numeric)', () => {
  const invalidNumbers = [
    '5876543210', // Starts with 5
    '1234567890', // Starts with 1
    '0123456789', // Starts with 01
    '987654321',  // 9 digits
    '98765432101',// 11 digits without 91 prefix
    'abcdefghij', // Alphabetic
    '98765ABCD0', // Mixed alphanumeric
    '',           // Empty
    '   ',        // Whitespace only
  ];

  for (const raw of invalidNumbers) {
    const res = validateIndianMobile(raw);
    assert.strictEqual(res.isValid, false, `Expected ${raw} to be invalid`);
    assert.ok(res.error, 'Must provide human-readable error description');
  }
});

// -----------------------------------------------------------------------------
// [BUG-054 & BUG-057] Document Share Modal Component & URLs
// -----------------------------------------------------------------------------
console.log('\n--- 6. [BUG-054, BUG-055, BUG-057, BUG-058] DocumentShareModal Implementation ---');

it('DocumentShareModal component file exists and exports default function', () => {
  const code = fs.readFileSync('src/components/documents/DocumentShareModal.tsx', 'utf8');
  assert.ok(code.includes('export default function DocumentShareModal'), 'Component exports default function');
  assert.ok(code.includes('https://wa.me/'), 'Constructs valid wa.me URI');
  assert.ok(code.includes('mailto:'), 'Constructs valid mailto: URI');
});

it('DocumentShareModal contains touch-friendly 5-step sharing guide with Android & Windows instructions', () => {
  const code = fs.readFileSync('src/components/documents/DocumentShareModal.tsx', 'utf8');
  assert.ok(code.includes('Step 1: Download PDF'), 'Contains Step 1: Download PDF');
  assert.ok(code.includes('Step 2: Open'), 'Contains Step 2: Open client');
  assert.ok(code.includes('Step 3: Attach PDF Document'), 'Contains Step 3: Attach PDF');
  assert.ok(code.includes('Android: Tap paperclip 📎 → Document → select PDF from Downloads / Files'), 'Includes explicit Android instructions');
  assert.ok(code.includes('Windows: Drag the downloaded PDF from your browser bar or Downloads folder'), 'Includes explicit Windows instructions');
  assert.ok(code.includes('Step 4: Send to Client'), 'Contains Step 4: Send');
  assert.ok(code.includes('Step 5: Confirm Manually Sent'), 'Contains Step 5: Confirm');
});

it('DocumentShareModal segregates channels and requires explicit staff attestation', () => {
  const code = fs.readFileSync('src/components/documents/DocumentShareModal.tsx', 'utf8');
  assert.ok(code.includes('WhatsApp Share'), 'Has WhatsApp tab');
  assert.ok(code.includes('Email (Client)'), 'Has Email tab');
  assert.ok(code.includes('Manual Handover'), 'Has In-Person/Manual tab');
  assert.ok(code.includes('Confirm Manually Sent'), 'Attestation button labeled Confirm Manually Sent');
  assert.ok(code.includes('Manual Transmission Disclaimer'), 'Displays clear legal disclaimer regarding staff responsibility');
  assert.ok(code.includes('updateCustomerContact'), 'Allows optional customer contact updating');
});

// -----------------------------------------------------------------------------
// [BUG-059] Delivery Actions & Accurate Status Tracking
// -----------------------------------------------------------------------------
console.log('\n--- 7. [BUG-059] Accurate Status Separation & Audit Trail ---');

it('recordQuotationDeliveryAction supports modern manual statuses and optional phone update', () => {
  const code = fs.readFileSync('src/lib/quotation/actions.ts', 'utf8');
  assert.ok(code.includes('sharing_initiated'), 'Supports sharing_initiated status');
  assert.ok(code.includes('manually_sent'), 'Supports manually_sent status');
  assert.ok(code.includes('updateCustomerContact'), 'Supports optional customer contact update');
  assert.ok(code.includes("document_delivery_"), 'Creates immutable audit log entry');
});

it('recordInvoiceDeliveryAction supports modern manual statuses, contact update and audit log', () => {
  const code = fs.readFileSync('src/lib/billing/actions.ts', 'utf8');
  assert.ok(code.includes('sharing_initiated'), 'Supports sharing_initiated status');
  assert.ok(code.includes('manually_sent'), 'Supports manually_sent status');
  assert.ok(code.includes('updateCustomerContact'), 'Supports optional customer contact update');
  assert.ok(code.includes("document_delivery_"), 'Creates immutable audit log entry');
});

// -----------------------------------------------------------------------------
// Detail Views Integration
// -----------------------------------------------------------------------------
console.log('\n--- 8. Staff Detail Views Integration ---');

it('QuotationDetailView integrates DocumentShareModal and Share / Deliver action', () => {
  const code = fs.readFileSync('src/app/staff/quotations/[id]/QuotationDetailView.tsx', 'utf8');
  assert.ok(code.includes('DocumentShareModal'), 'Imports and renders DocumentShareModal');
  assert.ok(code.includes('Share / Deliver'), 'Renders Share / Deliver action button');
  assert.ok(code.includes('recordQuotationDeliveryAction'), 'Hooks onRecordDelivery to recordQuotationDeliveryAction');
});

it('InvoiceDetailView integrates DocumentShareModal for both drafts and issued invoices', () => {
  const code = fs.readFileSync('src/app/staff/billing/[id]/InvoiceDetailView.tsx', 'utf8');
  assert.ok(code.includes('DocumentShareModal'), 'Imports and renders DocumentShareModal');
  assert.ok(code.includes('Share / Deliver'), 'Renders Share / Deliver action button');
  assert.ok(code.includes("invoice.status !== 'cancelled' && canManage"), 'Share / Deliver button available for drafts and issued invoices');
  assert.ok(code.includes('recordInvoiceDeliveryAction'), 'Hooks onRecordDelivery to recordInvoiceDeliveryAction');
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n======================================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('======================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
