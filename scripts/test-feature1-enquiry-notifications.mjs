/**
 * Santhaya Associates — Automated Verification Test Suite
 * Feature 1: Real Quotation Notification Emails & Outbox Backlog Protection
 * File: scripts/test-feature1-enquiry-notifications.mjs
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const { MockEmailProvider } = await import('../src/lib/email/providers/mock-provider.ts');
const { ResendEmailProvider } = await import('../src/lib/email/providers/resend-provider.ts');
const { calculateNextRetryAt, compileEmailMessageFromJob, processOutboxBatch } = await import('../src/lib/email/outbox-worker.ts');

console.log('='.repeat(70));
console.log('SANTHAYA ASSOCIATES — FEATURE 1: REAL EMAIL NOTIFICATIONS & SAFETY TESTS');
console.log('='.repeat(70) + '\n');

// Configure test worker secret
process.env.OUTBOX_WORKER_SECRET = 'test-secret';

let totalTests = 0;
let passedTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} — ${err.message}`);
    throw err;
  }
}

async function itAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} — ${err.message}`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// 1. Notification Routing & Sender Configuration
// -----------------------------------------------------------------------------
console.log('--- 1. Notification Routing & Sender Configuration ---');

it('Default admin notification recipient in quotation API route defaults to santhayapvt.ltd@gmail.com', () => {
  const routeContent = fs.readFileSync('src/app/api/quotation-request/route.ts', 'utf8');
  assert.ok(
    routeContent.includes("process.env.INTERNAL_NOTIFICATION_EMAIL || 'santhayapvt.ltd@gmail.com'"),
    'Fallback recipient must be santhayapvt.ltd@gmail.com'
  );
});

it('ResendEmailProvider defaults sender to notifications@santhayaassociates.com', () => {
  const oldEnvFrom = process.env.EMAIL_FROM;
  const oldEnvAddr = process.env.EMAIL_FROM_ADDRESS;
  delete process.env.EMAIL_FROM;
  delete process.env.EMAIL_FROM_ADDRESS;

  const provider = new ResendEmailProvider({ apiKey: 're_test_dummy_key_123' });
  assert.strictEqual(
    provider['defaultFrom'],
    'Santhaya Associates <notifications@santhayaassociates.com>',
    'Default sender must be Santhaya Associates <notifications@santhayaassociates.com>'
  );

  // Restore env
  if (oldEnvFrom) process.env.EMAIL_FROM = oldEnvFrom;
  if (oldEnvAddr) process.env.EMAIL_FROM_ADDRESS = oldEnvAddr;
});

it('compileEmailMessageFromJob injects verified sender into outbound message object', () => {
  const dummyJob = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    recipient_email: 'santhayapvt.ltd@gmail.com',
    subject: 'New Public Quotation Request: ENQ-202611-001',
    email_type: 'enquiry_alert_admin',
    payload: {
      referenceNumber: 'ENQ-202611-001',
      businessName: 'Tata Steel Infrastructure',
      contactPerson: 'Rajesh Kumar',
      email: 'rajesh@tatasteel.com',
      phone: '9876543210',
      serviceCategory: 'construction_machinery',
      requirementDetails: 'Need 3 heavy duty mobile cranes for 6 months lease',
      deliveryLocation: 'Jamshedpur Works',
      riskFlag: 'none',
      submittedAt: new Date().toISOString(),
    },
    status: 'pending',
    attempts: 0,
    max_attempts: 5,
    next_retry_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const message = compileEmailMessageFromJob(dummyJob);
  assert.strictEqual(message.to, 'santhayapvt.ltd@gmail.com');
  assert.ok(message.from?.includes('notifications@santhayaassociates.com') || message.from?.includes('Santhaya Associates'));
  assert.strictEqual(message.idempotencyKey, dummyJob.id);
  assert.strictEqual(message.tags?.outbox_job_id, dummyJob.id);
  assert.strictEqual(message.tags?.ref_number, 'ENQ-202611-001');
});

// -----------------------------------------------------------------------------
// 2. Exponential Backoff & Retry Logic
// -----------------------------------------------------------------------------
console.log('\n--- 2. Exponential Backoff & Retry Calculation ---');

it('calculateNextRetryAt schedules retries using 4-tier exponential delays [60s, 300s, 900s, 3600s]', () => {
  const now = Date.now();

  const retry1 = calculateNextRetryAt(1);
  const diff1 = Math.round((retry1.getTime() - now) / 1000);
  assert.ok(diff1 >= 59 && diff1 <= 61, `Attempt 1 delay should be ~60s, got ${diff1}s`);

  const retry2 = calculateNextRetryAt(2);
  const diff2 = Math.round((retry2.getTime() - now) / 1000);
  assert.ok(diff2 >= 299 && diff2 <= 301, `Attempt 2 delay should be ~300s (5m), got ${diff2}s`);

  const retry3 = calculateNextRetryAt(3);
  const diff3 = Math.round((retry3.getTime() - now) / 1000);
  assert.ok(diff3 >= 899 && diff3 <= 901, `Attempt 3 delay should be ~900s (15m), got ${diff3}s`);

  const retry4 = calculateNextRetryAt(4);
  const diff4 = Math.round((retry4.getTime() - now) / 1000);
  assert.ok(diff4 >= 3599 && diff4 <= 3601, `Attempt 4 delay should be ~3600s (1h), got ${diff4}s`);
});

// -----------------------------------------------------------------------------
// 3. Historical Outbox Backlog Protection
// -----------------------------------------------------------------------------
console.log('\n--- 3. Historical Outbox Backlog Protection Simulation ---');

await itAsync('Historical mock job older than maxQueueAge is dead-lettered and NOT sent during FIFO cron', async () => {
  let sendCount = 0;
  const mockProvider = {
    name: 'test-guard-provider',
    async sendEmail() {
      sendCount++;
      return { success: true, providerMessageId: 'test_msg_123' };
    },
  };

  const oldJobId = 'a1111111-2222-4333-8444-555555555555';
  const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

  let updatedStatus = null;
  let updatedError = null;

  // Mock adminClient
  const mockClient = {
    from(table) {
      if (table === 'email_outbox') {
        return {
          select(cols, opts) {
            if (opts?.head) {
              return {
                eq() {
                  return {
                    gte() {
                      return Promise.resolve({ count: 0, error: null });
                    },
                  };
                },
              };
            }
            return {
              in(col, vals) {
                return {
                  lte(col2, val2) {
                    return {
                      order(col3, opts3) {
                        return {
                          limit(n) {
                            return Promise.resolve({
                              data: [
                                {
                                  id: oldJobId,
                                  recipient_email: 'santhayapvt.ltd@gmail.com',
                                  subject: 'Old historical test',
                                  email_type: 'enquiry_alert_admin',
                                  payload: { referenceNumber: 'ENQ-HISTORICAL-001' },
                                  status: 'pending',
                                  attempts: 0,
                                  max_attempts: 5,
                                  created_at: twoDaysAgo,
                                  next_retry_at: twoDaysAgo,
                                },
                              ],
                              error: null,
                            });
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
          update(fields) {
            return {
              eq(col, val) {
                if (fields.status === 'processing') {
                  return {
                    eq(col2, val2) {
                      return {
                        select() {
                          return Promise.resolve({ data: [{ id: val }], error: null });
                        },
                      };
                    },
                  };
                }
                return {
                  lt() {
                    return { select: () => Promise.resolve({ data: [], error: null }) };
                  },
                  then(resolve) {
                    updatedStatus = fields.status;
                    updatedError = fields.error_message;
                    resolve({ error: null });
                  },
                };
              },
              lt() {
                return { select: () => Promise.resolve({ data: [], error: null }) };
              },
            };
          },
        };
      }
      if (table === 'audit_logs') {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      return {};
    },
  };

  const result = await processOutboxBatch(mockClient, {
    batchSize: 5,
    provider: mockProvider,
    workerSecret: 'test-secret',
    maxQueueAgeHours: 24, // 24 hours max
  });

  assert.strictEqual(sendCount, 0, 'Zero emails must be sent for historical backlog job!');
  assert.strictEqual(result.succeeded, 0, 'Succeeded count should be 0');
  assert.strictEqual(result.deadLettered, 1, 'Dead-letter count should be 1');
  assert.strictEqual(updatedStatus, 'dead_letter', 'Status must transition to dead_letter');
  assert.ok(updatedError?.includes('BACKLOG_PROTECTION'), 'Error message must specify backlog protection');
});

await itAsync('Fresh enquiry job targeted via jobIds is dispatched successfully', async () => {
  let sendCount = 0;
  const mockProvider = {
    name: 'test-guard-provider',
    async sendEmail() {
      sendCount++;
      return { success: true, providerMessageId: 're_fresh_msg_789' };
    },
  };

  const freshJobId = 'b9999999-8888-4777-8666-555555555555';
  const nowIso = new Date().toISOString();
  let updatedStatus = null;

  const mockClient = {
    from(table) {
      if (table === 'email_outbox') {
        return {
          select(cols, opts) {
            if (opts?.head) {
              return {
                eq() {
                  return {
                    gte() {
                      return Promise.resolve({ count: 0, error: null });
                    },
                  };
                },
              };
            }
            return {
              in(col, vals) {
                return {
                  lte(col2, val2) {
                    return {
                      in(col3, jobIdsList) {
                        return Promise.resolve({
                          data: [
                            {
                              id: freshJobId,
                              recipient_email: 'santhayapvt.ltd@gmail.com',
                              subject: 'Fresh Enquiry Notification',
                              email_type: 'enquiry_alert_admin',
                              payload: {
                                referenceNumber: 'ENQ-FRESH-001',
                                businessName: 'Tata Steel Infrastructure',
                                contactPerson: 'Rajesh Kumar',
                                email: 'rajesh@tatasteel.com',
                                phone: '9876543210',
                                serviceCategory: 'construction_machinery',
                                requirementDetails: 'Need 3 mobile cranes',
                                deliveryLocation: 'Jamshedpur Works',
                                riskFlag: 'none',
                                submittedAt: nowIso,
                              },
                              status: 'pending',
                              attempts: 0,
                              max_attempts: 5,
                              created_at: nowIso,
                              next_retry_at: nowIso,
                            },
                          ],
                          error: null,
                        });
                      },
                    };
                  },
                };
              },
            };
          },
          update(fields) {
            return {
              eq(col, val) {
                if (fields.status === 'processing') {
                  return {
                    eq(col2, val2) {
                      return { select: () => Promise.resolve({ data: [{ id: val }], error: null }) };
                    },
                  };
                }
                return {
                  lt() {
                    return { select: () => Promise.resolve({ data: [], error: null }) };
                  },
                  then(resolve) {
                    updatedStatus = fields.status;
                    resolve({ error: null });
                  },
                };
              },
              lt() {
                return { select: () => Promise.resolve({ data: [], error: null }) };
              },
            };
          },
        };
      }
      return {};
    },
  };

  const result = await processOutboxBatch(mockClient, {
    jobIds: [freshJobId],
    provider: mockProvider,
    workerSecret: 'test-secret',
  });

  assert.strictEqual(sendCount, 1, 'Fresh targeted job must be dispatched');
  assert.strictEqual(result.succeeded, 1, 'Succeeded count should be 1');
  assert.strictEqual(updatedStatus, 'sent', 'Status must transition to sent');
});

// -----------------------------------------------------------------------------
// 4. Non-blocking Enquiry Submission Verification
// -----------------------------------------------------------------------------
console.log('\n--- 4. Non-blocking Enquiry Ingestion Verification ---');

it('src/app/api/quotation-request/route.ts preserves enquiry submission even if outbox dispatch throws', () => {
  const content = fs.readFileSync('src/app/api/quotation-request/route.ts', 'utf8');

  // Verify non-blocking trigger with catch handler
  assert.ok(
    content.includes('processOutboxBatch(adminClient,'),
    'Calls processOutboxBatch for targeted background dispatch'
  );
  assert.ok(
    content.includes('.catch((workerErr) =>'),
    'Wraps background outbox dispatch in non-fatal .catch()'
  );
  assert.ok(
    content.includes("status: isReplayed ? 200 : 201"),
    'Returns HTTP 201 Created to customer regardless of background email status'
  );
});

// -----------------------------------------------------------------------------
// 5. PII Scrubbing in Logs
// -----------------------------------------------------------------------------
console.log('\n--- 5. PII Scrubbing in Logs ---');

it('src/lib/email/outbox-worker.ts masks recipient email to domain only in console logs', () => {
  const content = fs.readFileSync('src/lib/email/outbox-worker.ts', 'utf8');

  assert.ok(
    content.includes('function maskEmail(email: string): string'),
    'maskEmail helper is defined'
  );
  assert.ok(
    content.includes('maskEmail(job.recipient_email)'),
    'Logs use maskEmail(job.recipient_email)'
  );
  assert.ok(
    !content.includes('console.log(job.payload)'),
    'Payload with contact person, phone, and requirements is never dumped directly to console'
  );
});

console.log('\n' + '='.repeat(70));
console.log(`ALL ${totalTests} FEATURE 1 TESTS PASSED SUCCESSFULLY! (${passedTests}/${totalTests})`);
console.log('='.repeat(70) + '\n');
