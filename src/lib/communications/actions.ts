'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { processOutboxBatch } from '@/lib/email/outbox-worker';

export interface ActionResponse<T = unknown> {
  success?: boolean;
  error?: string;
  data?: T;
}

/**
 * Server Action: Manually triggers the outbox worker loop to dispatch pending emails immediately.
 */
export async function triggerOutboxWorkerAction(): Promise<ActionResponse<{
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
  reaped: number;
  limitReached: boolean;
  dailySent: number;
}>> {
  try {
    const { profile } = await requireStaffSession();
    if (!profile.is_active) {
      return { error: 'Your staff account is inactive.' };
    }

    const adminClient = createAdminClient();
    const batchResult = await processOutboxBatch(adminClient, {
      batchSize: 20,
    });

    revalidatePath('/staff/communications');
    revalidatePath('/staff/billing');
    revalidatePath('/staff/quotations');

    return {
      success: true,
      data: {
        processed: batchResult.processed,
        succeeded: batchResult.succeeded,
        failed: batchResult.failed,
        deadLettered: batchResult.deadLettered,
        reaped: batchResult.reaped,
        limitReached: batchResult.limitReached,
        dailySent: batchResult.dailySent,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected worker execution failure.';
    return { error: message };
  }
}

/**
 * Server Action: Resets a failed or dead-letter outbox job for immediate redelivery retry.
 */
export async function retryOutboxJobAction(jobId: string): Promise<ActionResponse> {
  try {
    const { profile } = await requireStaffSession();
    if (!['super_admin', 'admin', 'billing_manager'].includes(profile.role)) {
      return { error: 'UNAUTHORIZED: Insufficient permissions to retry outbox jobs.' };
    }

    const adminClient = createAdminClient();
    const { error: updateErr } = await adminClient
      .from('email_outbox')
      .update({
        status: 'pending',
        attempts: 0,
        next_retry_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', jobId);

    if (updateErr) {
      return { error: 'Failed to reset outbox job: ' + updateErr.message };
    }

    revalidatePath('/staff/communications');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error resetting job.';
    return { error: message };
  }
}

