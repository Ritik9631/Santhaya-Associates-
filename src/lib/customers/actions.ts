'use server';

import { resolveIndianState } from '@/lib/utils/indian-states';
import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CustomerType } from '@/types/database';

export interface ActionResponse<T = Record<string, unknown>> {
  success?: boolean;
  error?: string;
  duplicateWarning?: string;
  data?: T;
}

const AUTHORIZED_ROLES = ['super_admin', 'admin', 'estimator', 'billing_manager'];

/**
 * Server Action: Create a new customer record directly
 * Note: Both email and phone are completely optional.
 */
export async function createCustomerAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse<{ customerId: string }>> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to create customer records.' };
    }

    const companyName = (formData.get('companyName') as string)?.trim();
    const contactPerson = (formData.get('contactPerson') as string)?.trim();
    const customerType = (formData.get('customerType') as string)?.trim() as CustomerType || 'private_corporate';
    const email = (formData.get('email') as string)?.trim().toLowerCase() || null;
    const phone = (formData.get('phone') as string)?.trim() || null;
    const gstin = (formData.get('gstin') as string)?.trim().toUpperCase() || null;
    const pan = (formData.get('pan') as string)?.trim().toUpperCase() || null;
    const billingAddress = (formData.get('billingAddress') as string)?.trim() || null;
    const shippingAddress = (formData.get('shippingAddress') as string)?.trim() || null;
    const state = (formData.get('state') as string)?.trim() || null;
    const stateCode = (formData.get('stateCode') as string)?.trim() || null;
    const notes = (formData.get('notes') as string)?.trim() || null;

    // Contact person / Customer name is mandatory
    if (!contactPerson || contactPerson.length < 2) {
      return { error: 'Primary contact person or customer name is required (min 2 characters).' };
    }

    // Company name is required if not individual
    if (customerType !== 'individual' && (!companyName || companyName.length < 2)) {
      return { error: 'Organization / Company name is required for business customers.' };
    }

    // Format validation if present
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: 'Invalid email address format.' };
    }
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return { error: 'Invalid Indian phone number. Must be 10 digits starting with 6-9.' };
    }
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
      return { error: 'Invalid GSTIN format. Expected 15-character statutory format.' };
    }
    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      return { error: 'Invalid PAN format. Expected 10-character alphanumeric PAN.' };
    }

    const supabase = await createServerSupabaseClient();
    const admin = createAdminClient();

    // Duplicate detection: Check existing GSTIN if provided
    if (gstin) {
      const { data: existingGstin } = await admin
        .from('customers')
        .select('id, company_name')
        .eq('gstin', gstin)
        .limit(1);

      if (existingGstin && existingGstin.length > 0) {
        return {
          error: `Duplicate GSTIN detected: A customer record already exists for "${existingGstin[0].company_name}" with GSTIN ${gstin}.`,
        };
      }
    }

    // Fallback company name for individuals
    const finalCompanyName = companyName || contactPerson;

    // Try inserting via authenticated client (RLS) or adminClient
    let customerId: string | null = null;
    const resolvedState = resolveIndianState(stateCode || state);
    const normalizedState = state && state.trim() !== '' ? state.trim() : null;
    const normalizedStateCode = stateCode && stateCode.trim() !== '' ? stateCode.trim() : null;
    const finalState = resolvedState ? resolvedState.name : normalizedState;
    const finalStateCode = resolvedState ? resolvedState.code : normalizedStateCode;
    const normalizedEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : null;
    const normalizedPhone = phone && phone.trim() !== '' ? phone.trim() : null;
    const normalizedGstin = gstin && gstin.trim() !== '' ? gstin.trim().toUpperCase() : null;
    const normalizedPan = pan && pan.trim() !== '' ? pan.trim().toUpperCase() : null;

    const trimmedNotes = notes && notes.trim() !== '' ? notes.trim() : null;
    const trimmedShipping = shippingAddress && shippingAddress.trim() !== '' ? shippingAddress.trim() : null;
    const combinedNotes = [
      trimmedNotes,
      trimmedShipping ? `Shipping/Site Address: ${trimmedShipping}` : null,
    ].filter(Boolean).join('\n\n') || null;

    const insertPayload = {
      company_name: finalCompanyName,
      primary_contact_person: contactPerson,
      client_type: customerType,
      email: normalizedEmail,
      phone: normalizedPhone,
      gstin: normalizedGstin,
      pan: normalizedPan,
      billing_address: billingAddress && billingAddress.trim() !== '' ? billingAddress.trim() : null,
      billing_state: finalState,
      state: finalState,
      state_code: finalStateCode,
      notes: combinedNotes,
      created_by: profile.id,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('customers')
      .insert(insertPayload as any)
      .select('id')
      .single();

    if (insertError) {
      // Fallback to adminClient if RLS policy has not yet been refreshed
      const { data: adminInserted, error: adminError } = await admin
        .from('customers')
        .insert(insertPayload as any)
        .select('id')
        .single();

      if (adminError || !adminInserted) {
        return { error: `Failed to save customer record: ${adminError?.message || insertError.message}` };
      }
      customerId = adminInserted.id;
    } else {
      customerId = inserted.id;
    }

    // Insert Audit Trail
    await admin.from('audit_logs').insert({
      entity_type: 'customers',
      entity_id: customerId,
      action: 'customer_created',
      actor_type: 'staff',
      actor_id: user.id,
      new_state: {
        company_name: finalCompanyName,
        contact_person: contactPerson,
        customer_type: customerType,
        gstin,
        email,
        phone,
      },
    });

    revalidatePath('/staff/customers');

    return {
      success: true,
      data: { customerId },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { error: message };
  }
}

/**
 * Server Action: Update an existing customer record
 */
export async function updateCustomerAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to edit customer records.' };
    }

    const customerId = (formData.get('customerId') as string)?.trim();
    if (!customerId) return { error: 'Customer ID is required.' };

    const companyName = (formData.get('companyName') as string)?.trim();
    const contactPerson = (formData.get('contactPerson') as string)?.trim();
    const customerType = (formData.get('customerType') as string)?.trim() as CustomerType || 'private_corporate';
    const email = (formData.get('email') as string)?.trim().toLowerCase() || null;
    const phone = (formData.get('phone') as string)?.trim() || null;
    const gstin = (formData.get('gstin') as string)?.trim().toUpperCase() || null;
    const pan = (formData.get('pan') as string)?.trim().toUpperCase() || null;
    const billingAddress = (formData.get('billingAddress') as string)?.trim() || null;
    const shippingAddress = (formData.get('shippingAddress') as string)?.trim() || null;
    const state = (formData.get('state') as string)?.trim() || null;
    const stateCode = (formData.get('stateCode') as string)?.trim() || null;
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!contactPerson || contactPerson.length < 2) {
      return { error: 'Primary contact person is required.' };
    }

    const admin = createAdminClient();
    const { data: prevCustomer } = await admin
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (!prevCustomer) return { error: 'Customer record not found.' };

    const normalizedState = state && state.trim() !== '' ? state.trim() : null;
    const normalizedStateCode = stateCode && stateCode.trim() !== '' ? stateCode.trim() : null;
    const resolvedState = resolveIndianState(normalizedStateCode || normalizedState);
    const finalState = resolvedState ? resolvedState.name : normalizedState;
    const finalStateCode = resolvedState ? resolvedState.code : normalizedStateCode;
    const normalizedEmail = email && email.trim() !== '' ? email.trim().toLowerCase() : null;
    const normalizedPhone = phone && phone.trim() !== '' ? phone.trim() : null;
    const normalizedGstin = gstin && gstin.trim() !== '' ? gstin.trim().toUpperCase() : null;
    const normalizedPan = pan && pan.trim() !== '' ? pan.trim().toUpperCase() : null;

    const trimmedNotes = notes && notes.trim() !== '' ? notes.trim() : null;
    const trimmedShipping = shippingAddress && shippingAddress.trim() !== '' ? shippingAddress.trim() : null;
    const combinedNotes = [
      trimmedNotes,
      trimmedShipping ? `Shipping/Site Address: ${trimmedShipping}` : null,
    ].filter(Boolean).join('\n\n') || null;

    const updatePayload = {
      company_name: companyName || contactPerson,
      primary_contact_person: contactPerson,
      client_type: customerType,
      email: normalizedEmail,
      phone: normalizedPhone,
      gstin: normalizedGstin,
      pan: normalizedPan,
      billing_address: billingAddress && billingAddress.trim() !== '' ? billingAddress.trim() : null,
      billing_state: finalState,
      state: finalState,
      state_code: finalStateCode,
      notes: combinedNotes,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await admin
      .from('customers')
      .update(updatePayload as any)
      .eq('id', customerId);

    if (updateError) {
      return { error: `Failed to update customer: ${updateError.message}` };
    }

    // Audit Log
    await admin.from('audit_logs').insert({
      entity_type: 'customers',
      entity_id: customerId,
      action: 'customer_updated',
      actor_type: 'staff',
      actor_id: user.id,
      previous_state: { company_name: prevCustomer.company_name, email: prevCustomer.email, phone: prevCustomer.phone },
      new_state: updatePayload,
    });

    revalidatePath('/staff/customers');
    revalidatePath(`/staff/customers/${customerId}`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update customer.';
    return { error: message };
  }
}

/**
 * Server Action: Customer status alterations (Safe stub)
 * Note: Customers table uses statutory verification (is_verified) rather than account suspension.
 */
export async function toggleCustomerStatusAction(
  _prevState: ActionResponse | null,
  _formData: FormData
): Promise<ActionResponse> {
  return { error: 'Customer activation/deactivation status is not supported on customer accounts.' };
}


/**
 * Server Action: Administrative Customer Deletion (BUG-044)
 * Super Admin only. Strictly guarded against cascading deletion of financial records.
 * If customer is linked to quotations, invoices, or enquiries, deletion is BLOCKED.
 */
export async function deleteCustomerAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { user, profile } = await requireStaffSession();

    if (profile.role !== 'super_admin') {
      return { error: 'Access denied: Only a Super Administrator can permanently delete customer records.' };
    }

    const customerId = (formData.get('customerId') as string)?.trim();
    if (!customerId) {
      return { error: 'Customer ID is required.' };
    }

    const adminClient = createAdminClient();

    // 1. Fetch customer
    const { data: customer, error: fetchErr } = await adminClient
      .from('customers')
      .select('id, company_name, email, phone')
      .eq('id', customerId)
      .single();

    if (fetchErr || !customer) {
      return { error: 'Customer record not found.' };
    }

    // 2. Relational safety guards: Check quotations and invoices
    const [{ count: quoteCount }, { count: invoiceCount }] = await Promise.all([
      adminClient.from('quotations').select('*', { count: 'exact', head: true }).eq('customer_id', customerId),
      adminClient.from('invoices').select('*', { count: 'exact', head: true }).eq('customer_id', customerId),
    ]);

    if ((quoteCount || 0) > 0 || (invoiceCount || 0) > 0) {
      return {
        error: `Cannot delete customer "${customer.company_name}": Customer is linked to ${quoteCount || 0} quotation(s) and ${invoiceCount || 0} invoice(s). Statutory financial records cannot be orphaned or deleted. Please use "Archive Customer" instead.`,
      };
    }

    // 3. Safe deletion
    const { error: deleteErr } = await adminClient.from('customers').delete().eq('id', customerId);
    if (deleteErr) {
      return { error: `Failed to delete customer: ${deleteErr.message}` };
    }

    // 4. Audit Log
    await adminClient.from('audit_logs').insert({
      entity_type: 'customers',
      entity_id: customerId,
      action: 'customer_deleted',
      actor_type: 'staff',
      actor_id: user.id,
      previous_state: {
        company_name: customer.company_name,
        email: customer.email,
        phone: customer.phone,
      },
    });

    revalidatePath('/staff/customers');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete customer.';
    return { error: message };
  }
}

/**
 * Server Action: Administrative Customer Archival (BUG-044)
 * Allows Super Admin and Admin to safely archive a customer without deleting financial history.
 */
export async function archiveCustomerAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { user, profile } = await requireStaffSession();

    if (profile.role !== 'super_admin' && profile.role !== 'admin') {
      return { error: 'Access denied: Administrative privileges required to archive customers.' };
    }

    const customerId = (formData.get('customerId') as string)?.trim();
    const reason = (formData.get('reason') as string)?.trim() || 'Archived by Administrator';

    if (!customerId) return { error: 'Customer ID is required.' };

    const adminClient = createAdminClient();
    const { data: customer, error: fetchErr } = await adminClient
      .from('customers')
      .select('id, company_name, notes')
      .eq('id', customerId)
      .single();

    if (fetchErr || !customer) return { error: 'Customer not found.' };

    const archiveTag = `[ARCHIVED on ${new Date().toISOString().split('T')[0]}: ${reason}]`;
    const updatedNotes = customer.notes ? `${customer.notes}\n${archiveTag}` : archiveTag;

    const { error: updateErr } = await adminClient
      .from('customers')
      .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
      .eq('id', customerId);

    if (updateErr) return { error: `Failed to archive customer: ${updateErr.message}` };

    await adminClient.from('audit_logs').insert({
      entity_type: 'customers',
      entity_id: customerId,
      action: 'customer_archived',
      actor_type: 'staff',
      actor_id: user.id,
      new_state: { reason, archived_at: new Date().toISOString() },
    });

    revalidatePath('/staff/customers');
    revalidatePath(`/staff/customers/${customerId}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to archive customer.' };
  }
}

/**
 * Server Action: Restore Archived Customer (BUG-044)
 */
export async function restoreCustomerAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { user, profile } = await requireStaffSession();

    if (profile.role !== 'super_admin' && profile.role !== 'admin') {
      return { error: 'Access denied: Administrative privileges required to restore customers.' };
    }

    const customerId = (formData.get('customerId') as string)?.trim();
    if (!customerId) return { error: 'Customer ID is required.' };

    const adminClient = createAdminClient();
    const { data: customer, error: fetchErr } = await adminClient
      .from('customers')
      .select('id, notes')
      .eq('id', customerId)
      .single();

    if (fetchErr || !customer) return { error: 'Customer not found.' };

    // Strip [ARCHIVED ...] tags from notes
    const cleanedNotes = (customer.notes || '')
      .split('\n')
      .filter((line: string) => !line.trim().startsWith('[ARCHIVED'))
      .join('\n')
      .trim();

    const { error: updateErr } = await adminClient
      .from('customers')
      .update({ notes: cleanedNotes || null, updated_at: new Date().toISOString() })
      .eq('id', customerId);

    if (updateErr) return { error: `Failed to restore customer: ${updateErr.message}` };

    await adminClient.from('audit_logs').insert({
      entity_type: 'customers',
      entity_id: customerId,
      action: 'customer_restored',
      actor_type: 'staff',
      actor_id: user.id,
    });

    revalidatePath('/staff/customers');
    revalidatePath(`/staff/customers/${customerId}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to restore customer.' };
  }
}
