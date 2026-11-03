/**
 * Santhaya Associates — Outbox Worker Authentication Utility
 * File: src/lib/email/worker-auth.ts
 *
 * Verifies internal worker secrets using constant-time comparisons.
 * Supports both OUTBOX_WORKER_SECRET and CRON_SECRET even when configured with differing values.
 * Strictly fails closed if neither secret is configured in the environment.
 */

import crypto from 'node:crypto';

/**
 * Validates a worker secret against configured environment secrets.
 * Returns true only if the provided secret matches either OUTBOX_WORKER_SECRET or CRON_SECRET.
 * Strictly FAILS CLOSED (returns false) if neither secret is configured in the environment.
 * Uses timingSafeEqual to eliminate timing side-channel attacks.
 */
export function verifyWorkerSecret(workerSecret: string | undefined): boolean {
  const validSecrets = [process.env.OUTBOX_WORKER_SECRET, process.env.CRON_SECRET].filter(
    (s): s is string => typeof s === 'string' && s.trim().length > 0
  );

  // FAIL-CLOSED: If neither OUTBOX_WORKER_SECRET nor CRON_SECRET is configured,
  // strictly reject worker execution. Zero bypass environment variables permitted.
  if (validSecrets.length === 0) {
    return false;
  }

  // If secret is missing or empty when guards are configured
  if (!workerSecret || typeof workerSecret !== 'string' || workerSecret.trim().length === 0) {
    return false;
  }

  const providedBuffer = Buffer.from(workerSecret);
  return validSecrets.some((secret) => {
    const secretBuffer = Buffer.from(secret);
    if (secretBuffer.length !== providedBuffer.length) {
      return false;
    }
    try {
      return crypto.timingSafeEqual(secretBuffer, providedBuffer);
    } catch {
      return false;
    }
  });
}
