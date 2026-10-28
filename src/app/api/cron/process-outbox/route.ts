/**
 * Santhaya Associates — Authenticated Scheduled Outbox Worker Endpoint
 * File: src/app/api/cron/process-outbox/route.ts
 *
 * Dedicated, authenticated endpoint for processing the transactional email outbox:
 * - Triggered by scheduled cron jobs (e.g. Vercel Cron, GitHub Actions, or pg_cron).
 * - Enforces constant-time authentication against CRON_SECRET / OUTBOX_WORKER_SECRET.
 * - Enforces bounded batch sizes to prevent memory exhaustion and provider throttling.
 * - Protects Resend free-tier quota limits (daily & monthly caps).
 * - Zero PII exposure in responses or logs.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { processOutboxBatch } from '@/lib/email/outbox-worker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Constant-time string comparison to defend against timing attacks.
 */
function secureCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Authenticates request secret against configured environment secret.
 */
function authenticateCronRequest(req: NextRequest): boolean {
  const expectedSecret = process.env.CRON_SECRET || process.env.OUTBOX_WORKER_SECRET;
  if (!expectedSecret) {
    // If no secret is configured in the environment, deny execution in production
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    // Allow local development execution if explicitly enabled
    return process.env.ALLOW_DEV_CRON === 'true';
  }

  // Check Authorization: Bearer <secret>
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (secureCompare(token, expectedSecret)) {
      return true;
    }
  }

  // Check X-Cron-Secret header
  const customHeader = req.headers.get('x-cron-secret') || '';
  if (customHeader && secureCompare(customHeader.trim(), expectedSecret)) {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  return handleWorkerExecution(req);
}

export async function POST(req: NextRequest) {
  return handleWorkerExecution(req);
}

async function handleWorkerExecution(req: NextRequest) {
  const startTime = Date.now();

  // 1. Strict Authentication Gate
  if (!authenticateCronRequest(req)) {
    return NextResponse.json(
      {
        success: false,
        error: 'UNAUTHORIZED: Missing or invalid worker authentication secret.',
      },
      { status: 401 }
    );
  }

  // 2. Parse and bound batchSize query parameter
  const searchParams = req.nextUrl.searchParams;
  const rawBatchSize = parseInt(searchParams.get('batchSize') || '10', 10);
  const batchSize = Math.max(1, Math.min(isNaN(rawBatchSize) ? 10 : rawBatchSize, 20)); // Bounded [1, 20]

  try {
    const adminClient = createAdminClient();
    const result = await processOutboxBatch(adminClient, {
      batchSize,
      workerSecret: process.env.CRON_SECRET || process.env.OUTBOX_WORKER_SECRET,
    });

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      deadLettered: result.deadLettered,
      reaped: result.reaped,
      skippedDueToLimit: result.skippedDueToLimit,
      limitReached: result.limitReached,
      limitType: result.limitType || null,
      dailySent: result.dailySent,
      monthlySent: result.monthlySent,
      durationMs,
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const message = err instanceof Error ? err.message : 'Unknown outbox worker error';
    console.error('[Cron Outbox Worker] Internal execution error:', message);

    return NextResponse.json(
      {
        success: false,
        error: 'WORKER_EXECUTION_FAILED',
        durationMs,
      },
      { status: 500 }
    );
  }
}
