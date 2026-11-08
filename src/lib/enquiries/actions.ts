'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import type { QuotationRequestStatus } from '@/types/database';

export interface ActionResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
}

const AUTHORIZED_ROLES = ['super_admin', 'admin', 'estimator', 'billing_manager'];

/**
 * Update the triage status of an inbound public quotation request enquiry.
 */
export async function updateEnquiryStatusAction(
  enquiryId: string,
  newStatus: QuotationRequestStatus
): Promise<ActionResponse> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to update enquiry status.' };
    }

    if (!enquiryId) {
      return { error: 'Enquiry ID is required.' };
    }

    const admin = createAdminClient();

    // Fetch existing record
    const { data: existing, error: fetchErr } = await admin
      .from('quotation_requests')
      .select('id, reference_number, status, business_name')
      .eq('id', enquiryId)
      .single();

    if (fetchErr || !existing) {
      return { error: 'Enquiry record not found.' };
    }

    const now = new Date().toISOString();

    const { error: updateErr } = await admin
      .from('quotation_requests')
      .update({
        status: newStatus,
        assigned_staff_id: profile.id,
        updated_at: now,
      })
      .eq('id', enquiryId);

    if (updateErr) {
      return { error: `Failed to update status: ${updateErr.message}` };
    }

    // Insert audit log
    await admin.from('audit_logs').insert({
      entity_type: 'quotation_requests',
      entity_id: enquiryId,
      action: 'enquiry_status_updated',
      actor_type: 'staff',
      actor_id: user.id,
      previous_state: { status: existing.status },
      new_state: { status: newStatus, updated_by: profile.id, updated_at: now },
    });

    revalidatePath('/staff/enquiries');
    revalidatePath('/staff');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error updating enquiry';
    return { error: message };
  }
}

const AUTHORIZED_DELETE_ROLES = ['super_admin'];

/**
 * Reversibly soft-deletes a quotation enquiry.
 * Strictly restricted to Super Administrators.
 */
export async function softDeleteEnquiryAction(
  enquiryId: string,
  reason?: string
): Promise<ActionResponse> {
  try {
    const { user, profile } = await requireStaffSession();

    if (profile.role !== 'super_admin') {
      return { error: 'Access denied: Only Super Administrators have authorization to delete quotation enquiries.' };
    }

    if (!enquiryId || typeof enquiryId !== 'string') {
      return { error: 'Enquiry ID is required.' };
    }

    const admin = createAdminClient();

    // Verify record exists and is not already deleted
    const { data: existing, error: fetchErr } = await admin
      .from('quotation_requests')
      .select('id, reference_number, business_name, status, deleted_at')
      .eq('id', enquiryId)
      .single();

    if (fetchErr || !existing) {
      return { error: 'Enquiry record not found.' };
    }

    if (existing.deleted_at) {
      return { error: 'This enquiry has already been moved to Trash.' };
    }

    const now = new Date().toISOString();
    const cleanReason = reason && typeof reason === 'string' && reason.trim().length > 0
      ? reason.trim()
      : null;

    // Execute atomic stored procedure: guarantees soft-delete and immutable audit log commit in a single database transaction
    const { error: rpcErr } = await (admin.rpc as any)(
      'soft_delete_quotation_request',
      {
        p_enquiry_id: enquiryId,
        p_reason: cleanReason,
        p_acting_user_id: user.id,
      }
    );

    if (rpcErr) {
      // If RPC is missing during rolling deployment before migration runs, fallback gracefully
      if (rpcErr.message?.includes('does not exist') || rpcErr.code === '42883') {
        const { error: updateErr } = await admin
          .from('quotation_requests')
          .update({
            deleted_at: now,
            deleted_by_staff_id: profile.id,
            deletion_reason: cleanReason,
            updated_at: now,
          } as any)
          .eq('id', enquiryId);

        if (updateErr) {
          return { error: `Failed to soft-delete enquiry: ${updateErr.message}` };
        }

        await admin.from('audit_logs').insert({
          entity_type: 'quotation_requests',
          entity_id: enquiryId,
          action: 'enquiry_soft_deleted',
          actor_type: 'staff',
          actor_id: user.id,
          previous_state: { deleted_at: null, status: existing.status },
          new_state: {
            deleted_at: now,
            deleted_by_staff_id: profile.id,
            deletion_reason: cleanReason,
          },
        });
      } else {
        return { error: `Failed to soft-delete enquiry: ${rpcErr.message}` };
      }
    }

    revalidatePath('/staff/enquiries');
    revalidatePath('/staff');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error during enquiry soft-deletion';
    return { error: message };
  }
}

/**
 * Restores a soft-deleted quotation enquiry back to active status.
 * Strictly restricted to Super Administrators.
 */
export async function restoreEnquiryAction(enquiryId: string): Promise<ActionResponse> {
  try {
    const { user, profile } = await requireStaffSession();

    // Strict role guard: only super_admin can restore
    if (profile.role !== 'super_admin') {
      return { error: 'Access denied: Only Super Administrators have authorization to restore deleted quotation enquiries.' };
    }

    if (!enquiryId || typeof enquiryId !== 'string') {
      return { error: 'Enquiry ID is required.' };
    }

    const admin = createAdminClient();

    // Fetch existing record to verify it is deleted
    const { data: existing, error: fetchErr } = await admin
      .from('quotation_requests')
      .select('id, reference_number, business_name, status, deleted_at, deletion_reason')
      .eq('id', enquiryId)
      .single();

    if (fetchErr || !existing) {
      return { error: 'Enquiry record not found.' };
    }

    if (!existing.deleted_at) {
      return { error: 'This enquiry is not in the Trash.' };
    }

    const now = new Date().toISOString();

    // Execute atomic stored procedure: guarantees restore and immutable audit log commit in a single database transaction
    const { error: rpcErr } = await (admin.rpc as any)(
      'restore_quotation_request',
      {
        p_enquiry_id: enquiryId,
        p_acting_user_id: user.id,
      }
    );

    if (rpcErr) {
      if (rpcErr.message?.includes('does not exist') || rpcErr.code === '42883') {
        const { error: updateErr } = await admin
          .from('quotation_requests')
          .update({
            deleted_at: null,
            deleted_by_staff_id: null,
            deletion_reason: null,
            updated_at: now,
          } as any)
          .eq('id', enquiryId);

        if (updateErr) {
          return { error: `Failed to restore enquiry: ${updateErr.message}` };
        }

        await admin.from('audit_logs').insert({
          entity_type: 'quotation_requests',
          entity_id: enquiryId,
          action: 'enquiry_restored',
          actor_type: 'staff',
          actor_id: user.id,
          previous_state: {
            deleted_at: existing.deleted_at,
            deletion_reason: existing.deletion_reason,
          },
          new_state: {
            deleted_at: null,
            restored_by: profile.id,
            restored_at: now,
          },
        });
      } else {
        return { error: `Failed to restore enquiry: ${rpcErr.message}` };
      }
    }

    revalidatePath('/staff/enquiries');
    revalidatePath('/staff');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error during enquiry restoration';
    return { error: message };
  }
}

