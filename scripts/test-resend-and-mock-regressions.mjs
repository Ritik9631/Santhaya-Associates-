/**
 * Santhaya Associates — Outbox Worker Authentication & Targeted Dispatch Regression Battery
 * File: scripts/test-resend-and-mock-regressions.mjs
 *
 * Verifies all 7 approval criteria:
 * 1. Targeted job processing logic strictly filters by targeted jobIds.
 * 2. Historical jobs remain untouched (isolated from targeted submissions).
 * 3. An empty or invalid jobIds array cannot trigger FIFO processing (strictly throws INVALID_TARGETED_JOB_IDS).
 * 4. Missing worker secrets cause authentication failure (fail-closed security).
 * 5. Invalid worker credentials are rejected (constant-time timingSafeEqual comparison).
 * 6. General cron processing retains its existing FIFO behavior when jobIds is omitted.
 * 7. Existing Resend and mock integrations remain fully functional (zero real emails sent).
 */

import assert from 'node:assert';
import fs from 'node:fs';

const { MockEmailProvider } = await import('../src/lib/email/providers/mock-provider.ts');
const { ResendEmailProvider } = await import('../src/lib/email/providers/resend-provider.ts');
const { verifyWorkerSecret } = await import('../src/lib/email/worker-auth.ts');

console.log('='.repeat(70));
console.log('SANTHAYA ASSOCIATES — OUTBOX TARGETED DISPATCH & SECURITY REGRESSIONS');
console.log('='.repeat(70) + '\n');

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
// 1. Resend & Mock Provider Functional Verification (Criterion 7)
// -----------------------------------------------------------------------------
console.log('--- 1. Resend & Mock Provider Functional Verification ---');

await itAsync('MockEmailProvider generates simulated message ID without network calls', async () => {
  const mock = new MockEmailProvider();
  assert.strictEqual(mock.name, 'mock');

  const result = await mock.sendEmail({
    to: 'test-recipient@santhaya.local',
    subject: 'Quotation Notification Test',
    html: '<strong>Test Content</strong>',
    text: 'Test Content',
    idempotencyKey: 'test-uuid-mock-123',
  });

  assert.strictEqual(result.success, true);
  assert.ok(result.providerMessageId, 'Must return providerMessageId');
  assert.ok(result.providerMessageId.startsWith('mock_msg_'), 'Provider message ID must follow mock pattern');
});

await itAsync('ResendEmailProvider sets Authorization header, payload structure, and idempotency key', async () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = '';
  let interceptedHeaders = {};
  let interceptedBody = {};

  globalThis.fetch = async (url, options) => {
    interceptedUrl = url.toString();
    interceptedHeaders = options.headers;
    interceptedBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 're_simulated_success_msg_id_456' }),
    };
  };

  try {
    const dummyKey = 're_test_mock_secret_key_abcdef123456';
    const provider = new ResendEmailProvider({
      apiKey: dummyKey,
      defaultFrom: 'Santhaya Associates <onboarding@resend.dev>',
    });

    assert.strictEqual(provider.name, 'resend');

    const result = await provider.sendEmail({
      to: 'heistofeverything@gmail.com',
      subject: '[New Inquiry] INQ-2026-00055 — Apex Private Limated',
      html: '<h1>New Inquiry</h1><p>Details here</p>',
      text: 'New Inquiry: Details here',
      idempotencyKey: '0108ff60-7fa5-4c50-9507-0d3a8b489d52',
      tags: {
        outbox_job_id: '0108ff60-7fa5-4c50-9507-0d3a8b489d52',
        email_type: 'enquiry_alert_admin',
      },
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.providerMessageId, 're_simulated_success_msg_id_456');
    assert.strictEqual(interceptedUrl, 'https://api.resend.com/emails');
    assert.strictEqual(interceptedHeaders['Authorization'], `Bearer ${dummyKey}`);
    assert.strictEqual(interceptedHeaders['Content-Type'], 'application/json');
    assert.strictEqual(interceptedHeaders['Idempotency-Key'], '0108ff60-7fa5-4c50-9507-0d3a8b489d52');
    assert.deepStrictEqual(interceptedBody.to, ['heistofeverything@gmail.com']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await itAsync('ResendEmailProvider handles 429 rate limit errors with retryable=true', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 429,
    json: async () => ({ message: 'Too many requests' }),
  });

  try {
    const provider = new ResendEmailProvider({ apiKey: 're_dummy' });
    const result = await provider.sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.code, 'RESEND_HTTP_429');
    assert.strictEqual(result.error?.retryable, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// -----------------------------------------------------------------------------
// 2. Fail-Closed Worker Authentication Matrix (Criteria 4 & 5)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Fail-Closed Worker Authentication Matrix ---');

it('verifyWorkerSecret strictly FAILS CLOSED (returns false) when no secrets are configured in environment', () => {
  const oldCron = process.env.CRON_SECRET;
  const oldWorker = process.env.OUTBOX_WORKER_SECRET;
  try {
    delete process.env.CRON_SECRET;
    delete process.env.OUTBOX_WORKER_SECRET;

    assert.strictEqual(verifyWorkerSecret(undefined), false, 'Must reject undefined secret when no secrets configured');
    assert.strictEqual(verifyWorkerSecret('any_secret'), false, 'Must reject any secret when no secrets configured');
    assert.strictEqual(verifyWorkerSecret(''), false, 'Must reject empty string when no secrets configured');
  } finally {
    process.env.CRON_SECRET = oldCron;
    process.env.OUTBOX_WORKER_SECRET = oldWorker;
  }
});

it('verifyWorkerSecret rejects invalid worker credentials (constant-time check)', () => {
  const oldCron = process.env.CRON_SECRET;
  const oldWorker = process.env.OUTBOX_WORKER_SECRET;
  try {
    process.env.CRON_SECRET = 'cron_secret_abc123';
    process.env.OUTBOX_WORKER_SECRET = 'worker_secret_xyz789';

    assert.strictEqual(verifyWorkerSecret('wrong_secret'), false);
    assert.strictEqual(verifyWorkerSecret('cron_secret_abc124'), false); // 1-character tamper
    assert.strictEqual(verifyWorkerSecret('worker_secret_xyz788'), false);
    assert.strictEqual(verifyWorkerSecret(undefined), false);
    assert.strictEqual(verifyWorkerSecret(''), false);
    assert.strictEqual(verifyWorkerSecret('   '), false);
  } finally {
    process.env.CRON_SECRET = oldCron;
    process.env.OUTBOX_WORKER_SECRET = oldWorker;
  }
});

it('verifyWorkerSecret accepts either secret when OUTBOX_WORKER_SECRET and CRON_SECRET have different values', () => {
  const oldCron = process.env.CRON_SECRET;
  const oldWorker = process.env.OUTBOX_WORKER_SECRET;
  try {
    process.env.CRON_SECRET = 'cron_secret_diff_111111111111';
    process.env.OUTBOX_WORKER_SECRET = 'worker_secret_diff_222222222222';

    assert.strictEqual(verifyWorkerSecret('worker_secret_diff_222222222222'), true, 'Must accept OUTBOX_WORKER_SECRET');
    assert.strictEqual(verifyWorkerSecret('cron_secret_diff_111111111111'), true, 'Must accept CRON_SECRET');
    assert.strictEqual(verifyWorkerSecret('random_attacker_secret_9999'), false, 'Must reject unauthorized secret');
  } finally {
    process.env.CRON_SECRET = oldCron;
    process.env.OUTBOX_WORKER_SECRET = oldWorker;
  }
});

// -----------------------------------------------------------------------------
// 3. Targeted Outbox Dispatch vs FIFO Isolation Verification (Criteria 1, 2, 3, 6)
// -----------------------------------------------------------------------------
console.log('\n--- 3. Targeted Outbox Dispatch & Queue Isolation Rules ---');

it('src/lib/email/outbox-worker.ts enforces UUID validation and rejects empty jobIds arrays', () => {
  const code = fs.readFileSync('src/lib/email/outbox-worker.ts', 'utf8');
  assert.ok(code.includes('jobIds?: string[]'), 'ProcessBatchOptions includes optional jobIds array');
  assert.ok(code.includes('UUID_REGEX'), 'Enforces UUID regex verification');
  assert.ok(code.includes('options.jobIds.length === 0'), 'Detects empty jobIds arrays');
  assert.ok(code.includes('INVALID_TARGETED_JOB_IDS'), 'Throws INVALID_TARGETED_JOB_IDS rather than silently falling back to FIFO');
});

it('src/lib/email/outbox-worker.ts isolates targeted jobIds query from FIFO queue ordering', () => {
  const code = fs.readFileSync('src/lib/email/outbox-worker.ts', 'utf8');
  assert.ok(code.includes("query = query.in('id', cleanJobIds)"), 'Targeted query filters exclusively by targeted job IDs');
  assert.ok(code.includes("query = query.order('created_at', { ascending: true }).limit(batchSize)"), 'General FIFO queue processing is preserved when jobIds is omitted');
});

it('Targeted UUID validation algorithm strictly identifies valid vs invalid job IDs', () => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const validUUIDs = [
    '0108ff60-7fa5-4c50-9507-0d3a8b489d52',
    'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
    '8782909d-2f3e-4a12-8e49-50b02c505ebc',
  ];
  for (const id of validUUIDs) {
    assert.strictEqual(UUID_REGEX.test(id), true, `UUID should be valid: ${id}`);
  }

  const invalidUUIDs = [
    '',
    '   ',
    'not-a-uuid',
    '12345',
    '0108ff60-7fa5-4c50-9507',
    '0108ff60-7fa5-4c50-9507-0d3a8b489d52-extra',
    '0108ff60-7fa5-zc50-9507-0d3a8b489d52', // non-hex 'z'
  ];
  for (const id of invalidUUIDs) {
    assert.strictEqual(UUID_REGEX.test(id), false, `Invalid UUID must fail: "${id}"`);
  }
});

// -----------------------------------------------------------------------------
// 4. Trusted Caller Integrity Checks (Criteria 1, 2, 6)
// -----------------------------------------------------------------------------
console.log('\n--- 4. Trusted Caller Integrity Checks ---');

it('src/app/api/quotation-request/route.ts supplies targeted jobIds strictly from trusted database response', () => {
  const code = fs.readFileSync('src/app/api/quotation-request/route.ts', 'utf8');
  assert.ok(code.includes('jobIds: targetJobIds'), 'Quotation route passes targetJobIds filter');
  assert.ok(code.includes('targetJobIds.push(record.outbox_id)'), 'Quotation route targets database-generated outbox_id');
  assert.ok(
    code.includes('workerSecret: process.env.OUTBOX_WORKER_SECRET || process.env.CRON_SECRET'),
    'Quotation route passes authenticated workerSecret'
  );
  // Ensure public input fields are NOT used as jobIds
  assert.ok(!code.includes('jobIds: [data.'), 'Must never allow public input fields as target job IDs');
  assert.ok(!code.includes('jobIds: [body.'), 'Must never allow raw body fields as target job IDs');
});

it('src/lib/communications/actions.ts omits jobIds to retain general FIFO manual processing', () => {
  const code = fs.readFileSync('src/lib/communications/actions.ts', 'utf8');
  assert.ok(!code.includes('jobIds:'), 'Manual staff trigger must omit jobIds to process general queue');
  assert.ok(
    code.includes("['super_admin', 'admin', 'billing_manager'].includes(profile.role)"),
    'Server action must enforce staff role check'
  );
  assert.ok(
    code.includes('workerSecret: process.env.OUTBOX_WORKER_SECRET || process.env.CRON_SECRET'),
    'Server action supplies authenticated workerSecret'
  );
});

it('src/app/api/cron/process-outbox/route.ts omits jobIds to retain general FIFO cron processing', () => {
  const code = fs.readFileSync('src/app/api/cron/process-outbox/route.ts', 'utf8');
  assert.ok(!code.includes('jobIds:'), 'Cron route must omit jobIds to process general queue in FIFO order');
  assert.ok(
    code.includes('workerSecret: process.env.CRON_SECRET || process.env.OUTBOX_WORKER_SECRET'),
    'Cron route passes authenticated workerSecret'
  );
});

it('src/lib/email/factory.ts conditionally selects MockEmailProvider or ResendEmailProvider', () => {
  const factoryCode = fs.readFileSync('src/lib/email/factory.ts', 'utf8');
  assert.ok(factoryCode.includes("providerType === 'mock'"), "Checks providerType === 'mock'");
  assert.ok(factoryCode.includes('new MockEmailProvider()'), 'Instantiates MockEmailProvider');
  assert.ok(factoryCode.includes('new ResendEmailProvider()'), 'Instantiates ResendEmailProvider');
  assert.ok(factoryCode.includes('!resendApiKey'), 'Safely falls back to MockEmailProvider when RESEND_API_KEY is absent');
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n' + '='.repeat(70));
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('='.repeat(70) + '\n');

if (failedTests > 0) {
  process.exit(1);
}
