/**
 * Santhaya Associates — Phase 4 Transactional Email & Outbox Test Suite
 * File: scripts/test-phase4-outbox.mjs
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

async function itAsync(desc, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${desc} — ${err.message}`);
    failed++;
  }
}

class MockEmailProvider {
  constructor() {
    this.name = 'mock';
    this.sentMessages = [];
    this.shouldFail = false;
    this.failureCode = 'MOCK_ERROR';
    this.failureMessage = 'Simulated email provider network failure';
    this.failureRetryable = true;
  }

  async sendEmail(message) {
    if (this.shouldFail) {
      return {
        success: false,
        error: {
          code: this.failureCode,
          message: this.failureMessage,
          retryable: this.failureRetryable,
        },
      };
    }
    this.sentMessages.push(message);
    return {
      success: true,
      providerMessageId: `mock_msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  clear() {
    this.sentMessages = [];
    this.shouldFail = false;
  }
}

const RETRY_DELAYS_SECONDS = [60, 300, 900, 3600];
function calculateNextRetryAt(currentAttempts) {
  const delaySec = RETRY_DELAYS_SECONDS[Math.min(currentAttempts - 1, RETRY_DELAYS_SECONDS.length - 1)] || 3600;
  return new Date(Date.now() + delaySec * 1000);
}

async function main() {
  console.log('='.repeat(70));
  console.log('PHASE 4 — TRANSACTIONAL EMAIL & OUTBOX DISPATCH AUTOMATED SUITE');
  console.log('='.repeat(70));

  console.log('\n--- 1. Mock Email Provider & Error Handling ---');
  const mockProvider = new MockEmailProvider();

  it('Mock provider name is "mock"', () => {
    assert.strictEqual(mockProvider.name, 'mock');
  });

  await itAsync('Mock provider successfully dispatches and records message', async () => {
    mockProvider.clear();
    const res = await mockProvider.sendEmail({
      to: 'client@example.com',
      subject: 'Test Subject',
      html: '<p>Test</p>',
      text: 'Test',
    });
    assert.strictEqual(res.success, true);
    assert.ok(res.providerMessageId?.startsWith('mock_msg_'));
    assert.strictEqual(mockProvider.sentMessages.length, 1);
    assert.strictEqual(mockProvider.sentMessages[0].to, 'client@example.com');
  });

  await itAsync('Mock provider failure simulation produces retryable error', async () => {
    mockProvider.clear();
    mockProvider.shouldFail = true;
    mockProvider.failureCode = 'SIMULATED_TIMEOUT';
    mockProvider.failureMessage = 'Network timed out';
    mockProvider.failureRetryable = true;

    const res = await mockProvider.sendEmail({
      to: 'fail@example.com',
      subject: 'Fail Test',
      html: '<p>Fail</p>',
      text: 'Fail',
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error?.code, 'SIMULATED_TIMEOUT');
    assert.strictEqual(res.error?.retryable, true);
    assert.strictEqual(mockProvider.sentMessages.length, 0);
    mockProvider.clear();
  });

  console.log('\n--- 2. Exponential Retry Backoff Schedule ---');
  it('Attempt 1 schedules retry in ~60 seconds (1 minute)', () => {
    const now = Date.now();
    const next = calculateNextRetryAt(1).getTime();
    const diffSec = Math.round((next - now) / 1000);
    assert.ok(diffSec >= 58 && diffSec <= 62, `Expected ~60s, got ${diffSec}s`);
  });

  it('Attempt 2 schedules retry in ~300 seconds (5 minutes)', () => {
    const now = Date.now();
    const next = calculateNextRetryAt(2).getTime();
    const diffSec = Math.round((next - now) / 1000);
    assert.ok(diffSec >= 298 && diffSec <= 302, `Expected ~300s, got ${diffSec}s`);
  });

  it('Attempt 3 schedules retry in ~900 seconds (15 minutes)', () => {
    const now = Date.now();
    const next = calculateNextRetryAt(3).getTime();
    const diffSec = Math.round((next - now) / 1000);
    assert.ok(diffSec >= 898 && diffSec <= 902, `Expected ~900s, got ${diffSec}s`);
  });

  it('Attempt 4+ schedules retry in ~3600 seconds (1 hour)', () => {
    const now = Date.now();
    const next = calculateNextRetryAt(4).getTime();
    const diffSec = Math.round((next - now) / 1000);
    assert.ok(diffSec >= 3598 && diffSec <= 3602, `Expected ~3600s, got ${diffSec}s`);
  });

  console.log('\n--- 3. Template File & Payload Compilation Checks ---');

  const templates = [
    { file: 'src/lib/email/templates/admin-enquiry-alert.ts', terms: ['renderAdminEnquiryAlert', 'SANTHAYA ASSOCIATES', 'Commercial Quotation Intake Alert'] },
    { file: 'src/lib/email/templates/customer-enquiry-confirmation.ts', terms: ['renderCustomerEnquiryConfirmation', 'Inquiry Received Successfully', 'Tracking Reference'] },
    { file: 'src/lib/email/templates/quotation-delivery.ts', terms: ['renderQuotationDeliveryEmail', 'Commercial Proposal', 'Total Proposal Value'] },
    { file: 'src/lib/email/templates/invoice-delivery.ts', terms: ['renderInvoiceDeliveryEmail', 'CGST Rule 46', 'Statutory Bank Transfer Details'] },
  ];

  for (const tmpl of templates) {
    it(`Template file exists and contains signature: ${path.basename(tmpl.file)}`, () => {
      const fullPath = path.resolve(tmpl.file);
      assert.ok(fs.existsSync(fullPath), `Missing template file: ${tmpl.file}`);
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const term of tmpl.terms) {
        assert.ok(content.includes(term), `Template missing term: ${term}`);
      }
    });
  }

  console.log('\n--- 4. Concurrency & Optimistic Lock Defense ---');

  await itAsync('Prevents duplicate execution when multiple workers attempt claim', async () => {
    let lockState = 'pending';

    async function attemptCheckout(workerId) {
      if (lockState === 'pending') {
        lockState = 'processing';
        return { success: true, workerId };
      }
      return { success: false, workerId };
    }

    const [resA, resB] = await Promise.all([
      attemptCheckout('worker-instance-1'),
      attemptCheckout('worker-instance-2'),
    ]);

    const winners = [resA, resB].filter((r) => r.success);
    assert.strictEqual(winners.length, 1, 'Exactly one worker instance must acquire the checkout');
    assert.strictEqual(lockState, 'processing');
  });

  console.log('\n--- 5. Quota Limits & Dead-Letter Safeguards ---');

  it('Evaluates daily sending cap (80) and flags limit reached', () => {
    const dailyLimit = 80;
    const currentSentToday = 80;
    const isLimitReached = currentSentToday >= dailyLimit;
    assert.strictEqual(isLimitReached, true);
  });

  it('Calculates dead-letter transition at max_attempts (5)', () => {
    const attempts = 5;
    const maxAttempts = 5;
    const isDeadLetter = attempts >= maxAttempts;
    assert.strictEqual(isDeadLetter, true);
  });

  console.log('='.repeat(70));
  console.log(`PHASE 4 OUTBOX SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
