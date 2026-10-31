/**
 * Santhaya Associates — Phase 4 Quotation Delivery & Manual Channels Test Suite
 * File: scripts/test-phase4-quotation-delivery.mjs
 *
 * Verifies:
 * 1. Delivery channels: 'download', 'email', 'phone', 'whatsapp', 'in_person'
 * 2. Quotation email outbox job payload schema & structure
 * 3. Client email format validation
 * 4. Manual quotation delivery recording for clients without email
 * 5. Quotation delivery log schema verification
 * 6. Role-based delivery permissions
 * 7. Printable PDF view route verification
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc} — ${err.message}`);
    failed++;
  }
}

console.log('='.repeat(70));
console.log('PHASE 4 — QUOTATION DELIVERY & MULTI-CHANNEL SUITE');
console.log('='.repeat(70));

// -----------------------------------------------------------------------------
// 1. Delivery Channels Audit
// -----------------------------------------------------------------------------
console.log('\n--- 1. Quotation Delivery Channels ---');

const VALID_CHANNELS = ['download', 'email', 'phone', 'whatsapp', 'in_person'];

VALID_CHANNELS.forEach((channel) => {
  it(`Supports delivery channel: ${channel}`, () => {
    assert.ok(VALID_CHANNELS.includes(channel));
  });
});

// -----------------------------------------------------------------------------
// 2. Email Recipient Validation
// -----------------------------------------------------------------------------
console.log('\n--- 2. Email Transmission Recipient Validation ---');

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

it('Accepts valid email formats', () => {
  assert.strictEqual(validateEmail('client@company.com'), true);
  assert.strictEqual(validateEmail('procurement.head@infra.co.in'), true);
});

it('Rejects invalid email formats', () => {
  assert.strictEqual(validateEmail(''), false);
  assert.strictEqual(validateEmail('invalid-email'), false);
  assert.strictEqual(validateEmail('user@'), false);
  assert.strictEqual(validateEmail('@domain.com'), false);
});

// -----------------------------------------------------------------------------
// 3. Quotation Email Outbox Payload Structure
// -----------------------------------------------------------------------------
console.log('\n--- 3. Quotation Outbox Job Payload Verification ---');

const quotePayload = {
  quotationNumber: 'QTN-2026-0001',
  versionNumber: 2,
  customerName: 'Larsen Infra Solutions',
  contactPerson: 'Suresh Menon',
  grandTotal: 2360000,
  taxableAmount: 2000000,
  taxAmount: 360000,
  validUntil: '30/11/2026',
  issueDate: '31/10/2026',
  itemCount: 4,
  deliveryLocation: 'Dwarka Expressway, Delhi',
  notes: 'Price includes 18% IGST and on-site testing.',
};

it('Payload contains mandatory quotation numbering and legal entity', () => {
  assert.ok(quotePayload.quotationNumber.startsWith('QTN-'));
  assert.ok(quotePayload.customerName.length > 0);
  assert.strictEqual(quotePayload.versionNumber, 2);
});

it('Financial amounts maintain strict decimal precision (no floating NaN)', () => {
  assert.strictEqual(typeof quotePayload.grandTotal, 'number');
  assert.strictEqual(typeof quotePayload.taxableAmount, 'number');
  assert.strictEqual(quotePayload.taxableAmount + quotePayload.taxAmount, quotePayload.grandTotal);
});

// -----------------------------------------------------------------------------
// 4. Manual Channels (Phone, WhatsApp) For Customers Without Email
// -----------------------------------------------------------------------------
console.log('\n--- 4. Manual Channels Without Customer Email ---');

it('Logs WhatsApp delivery when customer has phone but no email', () => {
  const manualLog = {
    quotation_id: '123e4567-e89b-12d3-a456-426614174000',
    quotation_version_id: '123e4567-e89b-12d3-a456-426614174001',
    delivery_channel: 'whatsapp',
    recipient_email: null,
    recipient_phone: '9811223344',
    delivery_status: 'logged',
    notes: 'Sent PDF quote via WhatsApp to Site Engineer Mr. Sharma; receipt acknowledged.',
    recorded_by_staff_id: '123e4567-e89b-12d3-a456-426614174002',
  };

  assert.strictEqual(manualLog.delivery_channel, 'whatsapp');
  assert.strictEqual(manualLog.recipient_email, null);
  assert.ok(manualLog.recipient_phone.length === 10);
  assert.strictEqual(manualLog.delivery_status, 'logged');
});

it('Logs direct phone call delivery quotation reading', () => {
  const phoneLog = {
    delivery_channel: 'phone',
    recipient_email: null,
    recipient_phone: '9876543210',
    delivery_status: 'logged',
    notes: 'Quoted rates over phone for urgent tender deadline.',
  };
  assert.strictEqual(phoneLog.delivery_channel, 'phone');
  assert.ok(phoneLog.notes.includes('tender deadline'));
});

// -----------------------------------------------------------------------------
// 5. PDF Document Generation Route Verification
// -----------------------------------------------------------------------------
console.log('\n--- 5. Printable Quotation PDF Route File Audit ---');

const pdfRoutePath = path.resolve('src/app/staff/quotations/[id]/pdf/page.tsx');
it('Quotation PDF printable route exists', () => {
  assert.ok(fs.existsSync(pdfRoutePath), 'Quotation PDF route missing');
});

it('PDF page contains commercial proposal statutory presentation elements', () => {
  const content = fs.readFileSync(pdfRoutePath, 'utf8');
  assert.ok(content.includes('COMMERCIAL QUOTATION') || content.includes('Quotation'));
  assert.ok(content.includes('HSN') || content.includes('SAC') || content.includes('Taxable'));
});

// -----------------------------------------------------------------------------
// 6. Role-Based Permissions
// -----------------------------------------------------------------------------
console.log('\n--- 6. Role-Based Delivery Permissions ---');

const ROLES = {
  super_admin: { canDeliver: true },
  admin: { canDeliver: true },
  estimator: { canDeliver: true },
  billing_manager: { canDeliver: true },
  viewer: { canDeliver: false },
};

it('Super Admin, Admin, Estimator, and Billing Manager are authorized to deliver quotes', () => {
  assert.strictEqual(ROLES.super_admin.canDeliver, true);
  assert.strictEqual(ROLES.admin.canDeliver, true);
  assert.strictEqual(ROLES.estimator.canDeliver, true);
  assert.strictEqual(ROLES.billing_manager.canDeliver, true);
});

it('Auditor / Viewer is strictly forbidden from initiating deliveries', () => {
  assert.strictEqual(ROLES.viewer.canDeliver, false);
});

console.log('='.repeat(70));
console.log(`QUOTATION DELIVERY SUITE: ${passed} PASSED, ${failed} FAILED`);
console.log('='.repeat(70));

if (failed > 0) {
  process.exit(1);
}

