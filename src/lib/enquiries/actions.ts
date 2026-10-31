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

