/**
 * Santhaya Associates — Durable Email Outbox Dispatch Worker
 * File: src/lib/email/outbox-worker.ts
 *
 * Implements resilient queue processing for background email dispatches:
 * 1. Authenticated worker execution (via internal worker secret).
 * 2. Bounded concurrency (batch size limits).
 * 3. Atomic job checkout (mitigating concurrent worker collisions).
 * 4. Exponential retry backoff (+1m, +5m, +15m, +1h -> dead_letter).
 * 5. Crash recovery (reaps abandoned 'processing' jobs older than 10 minutes).
 * 6. Duplicate-delivery mitigation (idempotency key passed to provider).
 * 7. PII scrubbing in logs.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { IEmailProvider, OutboxJob, EmailMessage, AdminEnquiryPayload } from './types';
import { getEmailProvider } from './factory';
import { renderAdminEnquiryAlert } from './templates/admin-enquiry-alert';
import { renderCustomerEnquiryConfirmation, type CustomerEnquiryConfirmationPayload } from './templates/customer-enquiry-confirmation';
import { renderQuotationDeliveryEmail, type QuotationDeliveryPayload } from './templates/quotation-delivery';
import { renderInvoiceDeliveryEmail, type InvoiceDeliveryPayload } from './templates/invoice-delivery';

export interface ProcessBatchOptions {
  batchSize?: number;
  workerSecret?: string;
  provider?: IEmailProvider;
  dailyLimit?: number;
  monthlyLimit?: number;
}

export interface ProcessBatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
  reaped: number;
  skippedDueToLimit: number;
  limitReached: boolean;
  limitType?: 'daily' | 'monthly';
  dailySent: number;
  monthlySent: number;
  jobResults: Array<{
    jobId: string;
    status: 'sent' | 'failed' | 'dead_letter';
    error?: string;
  }>;
}

// Exponential backoff schedule in seconds
const RETRY_DELAYS_SECONDS = [60, 300, 900, 3600]; // 1m, 5m, 15m, 1h
const MAX_ATTEMPTS = 5;
const STALE_PROCESSING_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Calculates next retry timestamp using the 5-stage exponential schedule.
 */
export function calculateNextRetryAt(currentAttempts: number): Date {
  const delaySec = RETRY_DELAYS_SECONDS[Math.min(currentAttempts - 1, RETRY_DELAYS_SECONDS.length - 1)] || 3600;
  return new Date(Date.now() + delaySec * 1000);
}

/**
 * Scrubs email to domain only for secure logging without PII leakage.
 */
function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return '***';
  return `***@${email.slice(atIndex + 1)}`;
}

/**
 * Builds email message payload from outbox job data.
 */
export function compileEmailMessageFromJob(job: OutboxJob): EmailMessage {
  if (job.email_type === 'enquiry_alert_admin') {
    const payload = job.payload as unknown as AdminEnquiryPayload;
    const { subject, html, text } = renderAdminEnquiryAlert(payload);
    return {
      to: job.recipient_email,
      subject,
      html,
      text,
      idempotencyKey: job.id,
      tags: {
        outbox_job_id: job.id,
        email_type: job.email_type,
        ref_number: payload.referenceNumber || '',
      },
    };
  }

  if (job.email_type === 'enquiry_confirmation_customer') {
    const payload = job.payload as unknown as CustomerEnquiryConfirmationPayload;
    const { subject, html, text } = renderCustomerEnquiryConfirmation(payload);
    return {
      to: job.recipient_email,
      subject,
      html,
      text,
      idempotencyKey: job.id,
      tags: {
        outbox_job_id: job.id,
        email_type: job.email_type,
        ref_number: payload.referenceNumber || '',
      },
    };
  }

  if (job.email_type === 'quotation_customer') {
    const payload = job.payload as unknown as QuotationDeliveryPayload;
    const { subject, html, text } = renderQuotationDeliveryEmail(payload);
    return {
      to: job.recipient_email,
      subject,
      html,
      text,
      idempotencyKey: job.id,
      tags: {
        outbox_job_id: job.id,
        email_type: job.email_type,
        quotation_number: payload.quotationNumber || '',
      },
    };
  }

  if (job.email_type === 'invoice_customer') {
    const payload = job.payload as unknown as InvoiceDeliveryPayload;
    const { subject, html, text } = renderInvoiceDeliveryEmail(payload);
    return {
      to: job.recipient_email,
      subject,
      html,
      text,
      idempotencyKey: job.id,
      tags: {
        outbox_job_id: job.id,
        email_type: job.email_type,
        invoice_number: payload.invoiceNumber || '',
      },
    };
  }

  // Fallback for custom or direct notifications
  return {
    to: job.recipient_email,
    subject: job.subject,
    html: typeof job.payload.html === 'string' ? job.payload.html : `<p>${job.subject}</p>`,
    text: typeof job.payload.text === 'string' ? job.payload.text : job.subject,
    idempotencyKey: job.id,
    tags: {
      outbox_job_id: job.id,
      email_type: job.email_type,
    },
  };
}

/**
 * Core outbox processing loop.
 */
export async function processOutboxBatch(
  adminClient: SupabaseClient,
  options: ProcessBatchOptions = {}
): Promise<ProcessBatchResult> {
  const { batchSize = 10, workerSecret, provider = getEmailProvider() } = options;

  // 1. Authenticate worker execution if secret is configured
  const expectedSecret = process.env.CRON_SECRET || process.env.OUTBOX_WORKER_SECRET;
  if (expectedSecret && workerSecret !== expectedSecret) {
    throw new Error('UNAUTHORIZED_WORKER: Invalid or missing worker secret.');
  }

  const result: ProcessBatchResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    deadLettered: 0,
    reaped: 0,
    skippedDueToLimit: 0,
    limitReached: false,
    dailySent: 0,
    monthlySent: 0,
    jobResults: [],
  };

  const now = new Date();
  const staleThreshold = new Date(now.getTime() - STALE_PROCESSING_THRESHOLD_MS).toISOString();

  // 2. Free-Tier Safeguards: Check daily & monthly dispatch counts
  const dailyLimit = options.dailyLimit ?? parseInt(process.env.EMAIL_DAILY_LIMIT || '80', 10);
  const monthlyLimit = options.monthlyLimit ?? parseInt(process.env.EMAIL_MONTHLY_LIMIT || '2500', 10);

  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  try {
    const { count: dailyCount, error: dailyErr } = await adminClient
      .from('email_outbox')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('processed_at', startOfDay);

    const { count: monthlyCount, error: monthlyErr } = await adminClient
      .from('email_outbox')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('processed_at', startOfMonth);

    result.dailySent = dailyCount ?? 0;
    result.monthlySent = monthlyCount ?? 0;

    if (!dailyErr && (dailyCount ?? 0) >= dailyLimit) {
      console.warn(`[Outbox Worker] Daily email limit reached (${dailyCount}/${dailyLimit}). Pausing outbox queue until next window.`);
      result.limitReached = true;
      result.limitType = 'daily';
      return result;
    }

    if (!monthlyErr && (monthlyCount ?? 0) >= monthlyLimit) {
      console.warn(`[Outbox Worker] Monthly email limit reached (${monthlyCount}/${monthlyLimit}). Pausing outbox queue until next month.`);
      result.limitReached = true;
      result.limitType = 'monthly';
      return result;
    }
  } catch (err) {
    console.warn('[Outbox Worker] Could not evaluate free-tier limits:', err);
  }

  // 3. Crash Recovery: Reap abandoned jobs stuck in 'processing'
  try {
    const { data: staleJobs, error: staleError } = await adminClient
      .from('email_outbox')
      .update({
        status: 'failed',
        error_message: 'WORKER_CRASH_RECOVERY: Job timed out in processing state.',
        next_retry_at: now.toISOString(),
      })
      .eq('status', 'processing')
      .lt('processed_at', staleThreshold)
      .select('id');

    if (!staleError && staleJobs) {
      result.reaped = staleJobs.length;
      if (result.reaped > 0) {
        console.warn(`[Outbox Worker] Recovered ${result.reaped} stale job(s) from crashed worker instances.`);
      }
    }
  } catch (err) {
    console.error('[Outbox Worker] Crash recovery check failed:', err);
  }

  // 4. Fetch eligible jobs: status in ('pending', 'failed') AND next_retry_at <= now()
  const { data: eligibleJobs, error: fetchError } = await adminClient
    .from('email_outbox')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lte('next_retry_at', now.toISOString())
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (fetchError) {
    console.error('[Outbox Worker] Error fetching outbox queue:', fetchError.message);
    return result;
  }

  if (!eligibleJobs || eligibleJobs.length === 0) {
    return result;
  }

  // 5. Process each job with bounded concurrency
  for (const rawJob of eligibleJobs) {
    // Check if daily quota was reached during batch execution
    if ((result.dailySent + result.succeeded) >= dailyLimit) {
      console.warn(`[Outbox Worker] Daily email limit reached during batch (${dailyLimit}). Pausing queue.`);
      result.limitReached = true;
      result.limitType = 'daily';
      result.skippedDueToLimit += (eligibleJobs.length - result.processed);
      break;
    }

    const job = rawJob as OutboxJob;
    result.processed++;

    // Mark job as 'processing' (atomic checkout with verification)
    const { data: claimedRows, error: lockError } = await adminClient
      .from('email_outbox')
      .update({
        status: 'processing',
        processed_at: now.toISOString(),
      })
      .eq('id', job.id)
      .eq('status', job.status) // Optimistic concurrency lock
      .select('id');

    if (lockError || !claimedRows || claimedRows.length !== 1) {
      // 0 rows updated means another worker claimed or modified this job concurrently; skip dispatch
      continue;
    }

    const newAttempts = job.attempts + 1;
    let dispatchSuccess = false;
    let providerMsgId: string | undefined;
    let dispatchErrorMessage: string | undefined;
    let isRetryable = true;

    try {
      const emailMessage = compileEmailMessageFromJob(job);
      const dispatchResult = await provider.sendEmail(emailMessage);

      if (dispatchResult.success) {
        dispatchSuccess = true;
        providerMsgId = dispatchResult.providerMessageId;
      } else {
        dispatchErrorMessage = dispatchResult.error?.message || 'Email dispatch failed';
        isRetryable = dispatchResult.error?.retryable ?? true;
      }
    } catch (err) {
      dispatchErrorMessage = err instanceof Error ? err.message : 'Unexpected runtime error during dispatch';
      isRetryable = true;
    }

    if (dispatchSuccess) {
      // Success transition -> 'sent'
      await adminClient
        .from('email_outbox')
        .update({
          status: 'sent',
          attempts: newAttempts,
          provider_message_id: providerMsgId,
          error_message: null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      result.succeeded++;
      result.jobResults.push({ jobId: job.id, status: 'sent' });

      console.log(
        `[Outbox Worker] Job ${job.id} [${job.email_type}] sent to ${maskEmail(job.recipient_email)} (MsgID: ${providerMsgId || 'N/A'})`
      );
    } else {
      // Failure transition -> 'failed' or 'dead_letter'
      const isDeadLetter = newAttempts >= (job.max_attempts || MAX_ATTEMPTS) || !isRetryable;
      const finalStatus: 'failed' | 'dead_letter' = isDeadLetter ? 'dead_letter' : 'failed';
      const nextRetry = isDeadLetter ? null : calculateNextRetryAt(newAttempts).toISOString();

      await adminClient
        .from('email_outbox')
        .update({
          status: finalStatus,
          attempts: newAttempts,
          next_retry_at: nextRetry,
          error_message: dispatchErrorMessage,
          processed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      if (isDeadLetter) {
        result.deadLettered++;
        result.jobResults.push({ jobId: job.id, status: 'dead_letter', error: dispatchErrorMessage });
        console.error(
          `[Outbox Worker] Job ${job.id} [${job.email_type}] DEAD_LETTER (Attempts: ${newAttempts}): ${dispatchErrorMessage}`
        );
      } else {
        result.failed++;
        result.jobResults.push({ jobId: job.id, status: 'failed', error: dispatchErrorMessage });
        console.warn(
          `[Outbox Worker] Job ${job.id} [${job.email_type}] FAILED (Attempt ${newAttempts}/${job.max_attempts || MAX_ATTEMPTS}). Next retry: ${nextRetry}`
        );
      }
    }
  }

  return result;
}
