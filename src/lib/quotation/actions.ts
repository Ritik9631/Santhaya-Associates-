'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  calculateQuotationTotals,
  isAllowedStatusTransition,
  isValidIndianStateCode,
  type LineItemInput,
  type QuotationStatus,
  type QuotationTotals,
} from './calculations';
import type { QuotationDeliveryChannel } from '@/types/database';

export interface ActionResponse<T = Record<string, unknown>> {
  success?: boolean;
  error?: string;
  data?: T;
}

const AUTHORIZED_CREATOR_ROLES = ['super_admin', 'admin', 'estimator'];
const AUTHORIZED_MANAGER_ROLES = ['super_admin', 'admin', 'estimator', 'billing_manager'];

/**
 * Server Action: Create a new quotation directly (Workflows A, B)
 */
export async function createQuotationAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse<{ quotationId: string; quotationNumber: string }>> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_CREATOR_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to create quotations.' };
    }

    const customerId = (formData.get('customerId') as string)?.trim();
    const enquiryId = (formData.get('enquiryId') as string)?.trim() || null;
    const rawSupplyCode = (formData.get('placeOfSupplyStateCode') as string)?.trim();
    const placeOfSupplyStateCode = rawSupplyCode ? rawSupplyCode.padStart(2, '0') : '';
    const isGstApplicable = formData.get('isGstApplicable') !== 'false';
    const validityDays = parseInt((formData.get('validityDays') as string) || '30', 10);
    const deliveryLocation = (formData.get('deliveryLocation') as string)?.trim();
    const paymentTerms = (formData.get('paymentTerms') as string)?.trim() || '100% advance against Proforma Invoice or 30 days credit on approved LC';
    const termsConditions = (formData.get('termsConditions') as string)?.trim() || null;
    const notes = (formData.get('notes') as string)?.trim() || null;
    const itemsRaw = formData.get('itemsJson') as string;

    if (!customerId) {
      return { error: 'Customer selection is required.' };
    }
    if (!deliveryLocation || deliveryLocation.length < 2) {
      return { error: 'Delivery location / Site destination is required.' };
    }

    let items: LineItemInput[] = [];
    try {
      items = JSON.parse(itemsRaw || '[]');
    } catch {
      return { error: 'Invalid line items payload.' };
    }

    if (!items || items.length === 0) {
      return { error: 'At least one line item is required to generate a quotation.' };
    }

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      if (!item.item_name || item.item_name.trim().length < 2) {
        return { error: `Line item #${idx + 1}: Name is required.` };
      }
      if (Number(item.quantity) <= 0) {
        return { error: `Line item #${idx + 1}: Quantity must be greater than zero.` };
      }
      if (Number(item.unit_rate) < 0) {
        return { error: `Line item #${idx + 1}: Unit rate cannot be negative.` };
      }
    }

    // Exact decimal calculations
    const totals: QuotationTotals = calculateQuotationTotals(
      items,
      isGstApplicable,
      placeOfSupplyStateCode
    );

    const adminClient = createAdminClient();

    // Verify Customer exists
    const { data: customer, error: custErr } = await adminClient
      .from('customers')
      .select('id, company_name')
      .eq('id', customerId)
      .single();

    if (custErr || !customer) {
      return { error: 'Selected customer record could not be found in the database.' };
    }

    // Generate Sequential Quotation Number: QTN-YYYY-XXXXX
    const year = new Date().getFullYear();
    let quoteNumber = `QTN-${year}-${Date.now().toString().slice(-5)}`;
    try {
      const { data: generatedNum } = await adminClient.rpc('generate_quotation_number');
      if (generatedNum) quoteNumber = generatedNum;
    } catch {
      // Fallback format if migration is pending in dev
    }

    const versionCode = `${quoteNumber}-R0`;
    const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Attempt database insertion
    const { data: newQuotation, error: quoteErr } = await adminClient
      .from('quotations')
      .insert({
        quotation_number: quoteNumber,
        customer_id: customerId,
        enquiry_id: enquiryId,
        status: 'draft',
        place_of_supply_state_code: placeOfSupplyStateCode,
        is_gst_applicable: isGstApplicable,
        current_version_number: 1,
        created_by_staff_id: user.id,
        notes,
      })
      .select('id, quotation_number')
      .single();

    if (quoteErr) {
      return { error: `Database error creating quotation: ${quoteErr.message}` };
    }

    // Insert Version 1 snapshot
    const { data: newVersion, error: versionErr } = await adminClient
      .from('quotation_versions')
      .insert({
        quotation_id: newQuotation.id,
        version_number: 1,
        version_code: versionCode,
        validity_days: validityDays,
        expires_at: expiresAt,
        delivery_location: deliveryLocation,
        payment_terms: paymentTerms,
        terms_conditions: termsConditions,
        subtotal_amount: totals.subtotal_amount,
        discount_amount: totals.discount_amount,
        taxable_amount: totals.taxable_amount,
        cgst_amount: totals.cgst_amount,
        sgst_amount: totals.sgst_amount,
        igst_amount: totals.igst_amount,
        total_tax_amount: totals.total_tax_amount,
        round_off_amount: totals.round_off_amount,
        grand_total_amount: totals.grand_total_amount,
        is_locked: false,
        created_by_staff_id: user.id,
      })
      .select('id')
      .single();

    if (versionErr) {
      // Rollback master
      await adminClient.from('quotations').delete().eq('id', newQuotation.id);
      return { error: `Failed to create initial quotation version: ${versionErr.message}` };
    }

    // Insert Line items
    const lineItemRows = totals.items.map((item, idx) => ({
      quotation_version_id: newVersion.id,
      product_service_id: item.product_service_id,
      sort_order: idx + 1,
      item_name: item.item_name,
      description: item.description,
      hsn_sac_code: item.hsn_sac_code,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      discount_amount: item.discount_amount,
      taxable_amount: item.taxable_amount,
      gst_rate: item.gst_rate,
      cgst_rate: item.cgst_rate,
      sgst_rate: item.sgst_rate,
      igst_rate: item.igst_rate,
      cgst_amount: item.cgst_amount,
      sgst_amount: item.sgst_amount,
      igst_amount: item.igst_amount,
      tax_amount: item.tax_amount,
      line_total: item.line_total,
    }));

    const { error: itemsErr } = await adminClient.from('quotation_items').insert(lineItemRows);
    if (itemsErr) {
      return { error: `Failed to store quotation line items: ${itemsErr.message}` };
    }

    // Audit log
    await adminClient.from('audit_logs').insert({
      entity_type: 'quotations',
      entity_id: newQuotation.id,
      action: 'quotation_created',
      actor_type: 'staff',
      actor_id: user.id,
      new_state: {
        quotation_number: quoteNumber,
        version: 1,
        grand_total: totals.grand_total_amount,
        customer: customer.company_name,
      },
    });

    revalidatePath('/staff/quotations');
    revalidatePath(`/staff/quotations/${newQuotation.id}`);

    return {
      success: true,
      data: { quotationId: newQuotation.id, quotationNumber: quoteNumber },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error creating quotation.';
    return { error: message };
  }
}

/**
 * Server Action: Issue quotation to client (Locks version, transitions draft -> issued)
 */
export async function issueQuotationAction(quotationId: string): Promise<ActionResponse> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_CREATOR_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to issue quotations.' };
    }

    const adminClient = createAdminClient();

    const { data: quote, error: quoteErr } = await adminClient
      .from('quotations')
      .select('id, quotation_number, status, current_version_number, is_gst_applicable, place_of_supply_state_code')
      .eq('id', quotationId)
      .single();

    if (quoteErr || !quote) {
      return { error: 'Quotation not found.' };
    }

    if (!isAllowedStatusTransition(quote.status as QuotationStatus, 'issued')) {
      return { error: `Cannot issue quotation: Transition from '${quote.status}' to 'issued' is not permitted.` };
    }

    // Financial safeguard: Place of Supply is mandatory and must be valid for taxable quotations
    if (quote.is_gst_applicable && (!quote.place_of_supply_state_code || !isValidIndianStateCode(quote.place_of_supply_state_code))) {
      return {
        error:
          'Cannot issue taxable quotation: Place of Supply state code is required and must be a valid 2-digit Indian State Code (01-38, 97) to determine CGST/SGST vs IGST. Please update the quotation with a valid Place of Supply before issuing.',
      };
    }

    // Lock current version and set issued timestamp
    const now = new Date().toISOString();
    await adminClient
      .from('quotation_versions')
      .update({ is_locked: true, issued_at: now })
      .eq('quotation_id', quotationId)
      .eq('version_number', quote.current_version_number);

    // Update master status
    const { error: updateErr } = await adminClient
      .from('quotations')
      .update({ status: 'issued', updated_at: now })
      .eq('id', quotationId);

    if (updateErr) {
      return { error: `Failed to issue quotation: ${updateErr.message}` };
    }

    // Audit log
    await adminClient.from('audit_logs').insert({
      entity_type: 'quotations',
      entity_id: quotationId,
      action: 'quotation_issued',
      actor_type: 'staff',
      actor_id: user.id,
      previous_state: { status: quote.status },
      new_state: { status: 'issued', issued_at: now, version: quote.current_version_number },
    });

    revalidatePath('/staff/quotations');
    revalidatePath(`/staff/quotations/${quotationId}`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error issuing quotation.';
    return { error: message };
  }
}

/**
 * Server Action: Create quotation revision (Locks previous version, creates V+1)
 */
export async function reviseQuotationAction(
  quotationId: string,
  updatedItems?: LineItemInput[]
): Promise<ActionResponse<{ newVersionNumber: number }>> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_CREATOR_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to revise quotations.' };
    }

    const adminClient = createAdminClient();

    const { data: quote, error: quoteErr } = await adminClient
      .from('quotations')
      .select('*, quotation_versions(*)')
      .eq('id', quotationId)
      .single();

    if (quoteErr || !quote) {
      return { error: 'Quotation not found.' };
    }

    const currentVersionNum = quote.current_version_number;
    const newVersionNum = currentVersionNum + 1;
    const newVersionCode = `${quote.quotation_number}-R${newVersionNum - 1}`;

    // Get current version details
    const currentVersion = (quote as any).quotation_versions?.find(
      (v: { version_number: number }) => v.version_number === currentVersionNum
    );

    if (!currentVersion) {
      return { error: 'Current quotation version snapshot could not be loaded.' };
    }

    // Get existing line items if updated items not supplied
    let itemsToClone: LineItemInput[] = [];
    if (updatedItems && updatedItems.length > 0) {
      itemsToClone = updatedItems;
    } else {
      const { data: existingItems } = await adminClient
        .from('quotation_items')
        .select('*')
        .eq('quotation_version_id', currentVersion.id);

      itemsToClone = (existingItems || []).map((i: any) => ({
        product_service_id: i.product_service_id,
        item_name: i.item_name,
        description: i.description,
        hsn_sac_code: i.hsn_sac_code,
        unit: i.unit,
        quantity: i.quantity,
        unit_rate: i.unit_rate,
        discount_amount: i.discount_amount,
        gst_rate: i.gst_rate,
      }));
    }

    const totals = calculateQuotationTotals(
      itemsToClone,
      quote.is_gst_applicable,
      quote.place_of_supply_state_code
    );

    const expiresAt = new Date(Date.now() + (currentVersion.validity_days || 30) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Lock previous version
    await adminClient
      .from('quotation_versions')
      .update({ is_locked: true })
      .eq('id', currentVersion.id);

    // Insert new version
    const { data: newVersion, error: newVerErr } = await adminClient
      .from('quotation_versions')
      .insert({
        quotation_id: quotationId,
        version_number: newVersionNum,
        version_code: newVersionCode,
        validity_days: currentVersion.validity_days,
        expires_at: expiresAt,
        delivery_location: currentVersion.delivery_location,
        payment_terms: currentVersion.payment_terms,
        terms_conditions: currentVersion.terms_conditions,
        subtotal_amount: totals.subtotal_amount,
        discount_amount: totals.discount_amount,
        taxable_amount: totals.taxable_amount,
        cgst_amount: totals.cgst_amount,
        sgst_amount: totals.sgst_amount,
        igst_amount: totals.igst_amount,
        total_tax_amount: totals.total_tax_amount,
        round_off_amount: totals.round_off_amount,
        grand_total_amount: totals.grand_total_amount,
        is_locked: false,
        created_by_staff_id: user.id,
      })
      .select('id')
      .single();

    if (newVerErr) {
      return { error: `Failed to create quotation revision: ${newVerErr.message}` };
    }

    // Insert Cloned Line Items
    const lineItemRows = totals.items.map((item, idx) => ({
      quotation_version_id: newVersion.id,
      product_service_id: item.product_service_id,
      sort_order: idx + 1,
      item_name: item.item_name,
      description: item.description,
      hsn_sac_code: item.hsn_sac_code,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      discount_amount: item.discount_amount,
      taxable_amount: item.taxable_amount,
      gst_rate: item.gst_rate,
      cgst_rate: item.cgst_rate,
      sgst_rate: item.sgst_rate,
      igst_rate: item.igst_rate,
      cgst_amount: item.cgst_amount,
      sgst_amount: item.sgst_amount,
      igst_amount: item.igst_amount,
      tax_amount: item.tax_amount,
      line_total: item.line_total,
    }));

    await adminClient.from('quotation_items').insert(lineItemRows);

    // Update master current version & status
    await adminClient
      .from('quotations')
      .update({
        current_version_number: newVersionNum,
        status: 'revised',
        updated_at: new Date().toISOString(),
      })
      .eq('id', quotationId);

    // Audit log
    await adminClient.from('audit_logs').insert({
      entity_type: 'quotations',
      entity_id: quotationId,
      action: 'quotation_revised',
      actor_type: 'staff',
      actor_id: user.id,
      previous_state: { version: currentVersionNum },
      new_state: { version: newVersionNum, version_code: newVersionCode },
    });

    revalidatePath('/staff/quotations');
    revalidatePath(`/staff/quotations/${quotationId}`);

    return { success: true, data: { newVersionNumber: newVersionNum } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error revising quotation.';
    return { error: message };
  }
}

/**
 * Server Action: Manually record customer commercial acceptance
 */
export async function recordQuotationAcceptanceAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_MANAGER_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to record quotation acceptance.' };
    }

    const quotationId = (formData.get('quotationId') as string)?.trim();
    const contactName = (formData.get('contactName') as string)?.trim();
    const acceptanceChannel = ((formData.get('acceptanceChannel') as string)?.trim() || 'phone') as QuotationDeliveryChannel;
    const clientPoReference = (formData.get('clientPoReference') as string)?.trim() || null;
    const staffNotes = (formData.get('staffNotes') as string)?.trim() || null;

    if (!quotationId) {
      return { error: 'Quotation ID is required.' };
    }
    if (!contactName || contactName.length < 2) {
      return { error: 'Accepting contact person or client representative name is required.' };
    }

    const adminClient = createAdminClient();

    const { data: quote, error: quoteErr } = await adminClient
      .from('quotations')
      .select('id, quotation_number, status, current_version_number')
      .eq('id', quotationId)
      .single();

    if (quoteErr || !quote) {
      return { error: 'Quotation not found.' };
    }

    if (!isAllowedStatusTransition(quote.status as QuotationStatus, 'accepted')) {
      return { error: `Cannot accept quotation in current status: '${quote.status}'.` };
    }

    // Get current version id
    const { data: currentVersion } = await adminClient
      .from('quotation_versions')
      .select('id')
      .eq('quotation_id', quotationId)
      .eq('version_number', quote.current_version_number)
      .single();

    if (!currentVersion) {
      return { error: 'Active quotation version snapshot not found.' };
    }

    // Record acceptance entry
    const { error: acceptErr } = await adminClient.from('quotation_acceptances').insert({
      quotation_id: quotationId,
      quotation_version_id: currentVersion.id,
      accepted_by_contact_name: contactName,
      acceptance_channel: acceptanceChannel,
      client_po_reference: clientPoReference,
      recorded_by_staff_id: user.id,
      staff_notes: staffNotes,
    });

    if (acceptErr) {
      return { error: `Failed to record acceptance: ${acceptErr.message}` };
    }

    // Update status to accepted
    await adminClient
      .from('quotations')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', quotationId);

    // Audit log
    await adminClient.from('audit_logs').insert({
      entity_type: 'quotations',
      entity_id: quotationId,
      action: 'quotation_accepted',
      actor_type: 'staff',
      actor_id: user.id,
      new_state: {
        status: 'accepted',
        accepted_by: contactName,
        channel: acceptanceChannel,
        po_reference: clientPoReference,
      },
    });

    revalidatePath('/staff/quotations');
    revalidatePath(`/staff/quotations/${quotationId}`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error recording acceptance.';
    return { error: message };
  }
}

/**
 * Server Action: Update quotation status (reject, cancel, expire)
 */
export async function updateQuotationStatusAction(
  quotationId: string,
  newStatus: QuotationStatus,
  reason?: string
): Promise<ActionResponse> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_MANAGER_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to modify quotation status.' };
    }

    const adminClient = createAdminClient();

    const { data: quote, error: quoteErr } = await adminClient
      .from('quotations')
      .select('id, quotation_number, status')
      .eq('id', quotationId)
      .single();

    if (quoteErr || !quote) {
      return { error: 'Quotation not found.' };
    }

    if (!isAllowedStatusTransition(quote.status as QuotationStatus, newStatus)) {
      return { error: `Invalid transition from '${quote.status}' to '${newStatus}'.` };
    }

    await adminClient
      .from('quotations')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', quotationId);

    await adminClient.from('audit_logs').insert({
      entity_type: 'quotations',
      entity_id: quotationId,
      action: `quotation_${newStatus}`,
      actor_type: 'staff',
      actor_id: user.id,
      previous_state: { status: quote.status },
      new_state: { status: newStatus, reason: reason || null },
    });

    revalidatePath('/staff/quotations');
    revalidatePath(`/staff/quotations/${quotationId}`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error updating quotation status.';
    return { error: message };
  }
}

/**
 * Server Action: Record quotation delivery (PDF download, email outbox queue, phone, whatsapp)
 */
export async function recordQuotationDeliveryAction(
  quotationId: string,
  deliveryChannel: QuotationDeliveryChannel,
  details?: { recipientEmail?: string; recipientPhone?: string; notes?: string }
): Promise<ActionResponse> {
  try {
    const { user, profile } = await requireStaffSession();
    const adminClient = createAdminClient();

    const { data: quote } = await adminClient
      .from('quotations')
      .select('id, quotation_number, current_version_number, customers ( company_name, primary_contact_person )')
      .eq('id', quotationId)
      .single();

    if (!quote) return { error: 'Quotation not found.' };

    const { data: version } = await adminClient
      .from('quotation_versions')
      .select('id, grand_total_amount, taxable_amount, total_tax_amount, expires_at, issued_at, delivery_location')
      .eq('quotation_id', quotationId)
      .eq('version_number', quote.current_version_number)
      .single();

    if (!version) return { error: 'Quotation version not found.' };

    // If channel is email, validate recipient and enqueue outbox job
    if (deliveryChannel === 'email') {
      const email = details?.recipientEmail?.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: 'Valid recipient email address is required for email delivery.' };
      }

      const customerName = (quote.customers as any)?.company_name || 'Valued Client';
      const contactPerson = (quote.customers as any)?.primary_contact_person || null;

      await adminClient.from('email_outbox').insert({
        recipient_email: email.toLowerCase(),
        subject: `Commercial Quotation ${quote.quotation_number} — Santhaya Associates Pvt. Ltd.`,
        email_type: 'quotation_customer',
        related_entity_type: 'quotation',
        related_entity_id: quotationId,
        payload: {
          quotationNumber: quote.quotation_number,
          versionNumber: quote.current_version_number,
          customerName,
          contactPerson,
          grandTotal: Number(version.grand_total_amount || 0),
          taxableAmount: Number(version.taxable_amount || 0),
          taxAmount: Number(version.total_tax_amount || 0),
          validUntil: version.expires_at ? new Date(version.expires_at).toLocaleDateString('en-IN') : '30 days from issue',
          issueDate: version.issued_at ? new Date(version.issued_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
          itemCount: 1,
          deliveryLocation: version.delivery_location || 'Site Location',
          notes: details?.notes || null,
        },
      });
    }

    // Record delivery log in quotation_delivery_logs
    await adminClient.from('quotation_delivery_logs').insert({
      quotation_id: quotationId,
      quotation_version_id: version.id,
      delivery_channel: deliveryChannel,
      recipient_email: details?.recipientEmail?.trim() || null,
      recipient_phone: details?.recipientPhone?.trim() || null,
      delivery_status: deliveryChannel === 'email' ? 'enqueued' : deliveryChannel === 'download' ? 'downloaded' : 'logged',
      notes: details?.notes?.trim() || null,
      recorded_by_staff_id: user.id,
    });

    revalidatePath(`/staff/quotations/${quotationId}`);
    revalidatePath('/staff/communications');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error logging delivery.';
    return { error: message };
  }
}
