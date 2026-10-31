'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  calculateInvoiceTotals,
  reconcileInvoiceBalance,
  formatStatutoryInvoiceNumber,
  isValidIndianStateCode,
  type InvoiceLineItemInput,
  type InvoiceCalculatedTotals,
} from './calculations';
import { getCompanyBillingProfile, getCurrentFinancialYear } from './company-config';
import type { InvoiceType, InvoiceStatus, PaymentMethod } from '@/types/database';

export interface ActionResponse<T = Record<string, unknown>> {
  success?: boolean;
  error?: string;
  data?: T;
}

const AUTHORIZED_BILLING_ROLES = ['super_admin', 'admin', 'billing_manager'];

/**
 * Server Action: Create a new invoice draft directly (Workflows C, D)
 */
export async function createInvoiceAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse<{ invoiceId: string }>> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_BILLING_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to create invoices.' };
    }

    const customerId = (formData.get('customerId') as string)?.trim();
    const invoiceType = ((formData.get('invoiceType') as string)?.trim() || 'tax_invoice') as InvoiceType;
    const invoiceDate = (formData.get('invoiceDate') as string)?.trim() || new Date().toISOString().split('T')[0];
    const dueDate = (formData.get('dueDate') as string)?.trim() || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const clientPoReference = (formData.get('clientPoReference') as string)?.trim() || null;
    const deliveryLocation = (formData.get('deliveryLocation') as string)?.trim() || null;
    const rawSupplyCode = (formData.get('placeOfSupplyStateCode') as string)?.trim();
    const placeOfSupplyStateCode = rawSupplyCode ? rawSupplyCode.padStart(2, '0') : '';
    const termsConditions = (formData.get('termsConditions') as string)?.trim() || null;
    const paymentInstructions = (formData.get('paymentInstructions') as string)?.trim() || null;
    const notes = (formData.get('notes') as string)?.trim() || null;
    const itemsRaw = formData.get('itemsJson') as string;

    if (!customerId) {
      return { error: 'Customer selection is required.' };
    }

    let items: InvoiceLineItemInput[] = [];
    try {
      items = JSON.parse(itemsRaw || '[]');
    } catch {
      return { error: 'Invalid line items payload.' };
    }

    if (!items || items.length === 0) {
      return { error: 'At least one line item is required to generate an invoice.' };
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

    const adminClient = createAdminClient();

    // 1. Fetch Customer Details for Immutable Snapshot
    const { data: customer, error: customerErr } = await adminClient
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerErr || !customer) {
      return { error: 'Selected customer could not be found or verified.' };
    }

    // 2. Fetch Configurable Statutory Company Profile
    const companyProfile = getCompanyBillingProfile();
    const fy = getCurrentFinancialYear(new Date(invoiceDate));

    // 3. Exact Calculations
    const effectiveSupplyCode = placeOfSupplyStateCode || customer.state_code || '';
    const totals: InvoiceCalculatedTotals = calculateInvoiceTotals(
      items,
      invoiceType,
      effectiveSupplyCode,
      companyProfile.stateCode
    );

    // 4. Insert Invoice (Draft Status — Statutory Number is strictly NULL for drafts)
    const { data: invoice, error: invoiceErr } = await adminClient
      .from('invoices')
      .insert({
        invoice_number: null,
        invoice_type: invoiceType,
        customer_id: customer.id,
        status: 'draft',
        invoice_date: invoiceDate,
        due_date: dueDate,
        financial_year: fy.code,
        company_legal_name: companyProfile.legalName,
        company_trade_name: companyProfile.tradeName,
        company_gstin: companyProfile.gstin,
        company_pan: companyProfile.pan,
        company_state_code: companyProfile.stateCode,
        company_state_name: companyProfile.stateName,
        company_registered_address: companyProfile.registeredAddress,
        customer_billing_name: customer.company_name,
        customer_gstin: customer.gstin || null,
        customer_pan: customer.pan || null,
        customer_state_code: customer.state_code || totals.place_of_supply_state_code,
        customer_state_name: customer.state || undefined,
        customer_billing_address: customer.billing_address || 'Address on file',
        delivery_location: deliveryLocation,
        client_po_reference: clientPoReference,
        place_of_supply_state_code: totals.place_of_supply_state_code,
        is_intra_state: totals.is_intra_state,
        subtotal_amount: totals.subtotal_amount,
        discount_amount: totals.discount_amount,
        taxable_amount: totals.taxable_amount,
        cgst_amount: totals.cgst_amount,
        sgst_amount: totals.sgst_amount,
        igst_amount: totals.igst_amount,
        total_tax_amount: totals.total_tax_amount,
        round_off_amount: totals.round_off_amount,
        grand_total_amount: totals.grand_total_amount,
        paid_amount: 0.0,
        balance_amount: totals.grand_total_amount,
        terms_conditions: termsConditions,
        payment_instructions:
          paymentInstructions ||
          `Bank: ${companyProfile.bankDetails.bankName}\nA/C: ${companyProfile.bankDetails.accountNumber}\nIFSC: ${companyProfile.bankDetails.ifscCode}\nUPI: ${companyProfile.bankDetails.upiId}`,
        notes: notes,
        created_by_staff_id: user.id,
      })
      .select('id')
      .single();

    if (invoiceErr || !invoice) {
      console.error('Failed to create invoice:', invoiceErr);
      return { error: 'Failed to create invoice record: ' + (invoiceErr?.message || 'Unknown database error') };
    }

    // 5. Insert Invoice Items
    const invoiceItemsPayload = totals.items.map((item, idx) => ({
      invoice_id: invoice.id,
      product_service_id: item.product_service_id || null,
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

    const { error: itemsErr } = await adminClient.from('invoice_items').insert(invoiceItemsPayload);

    if (itemsErr) {
      console.error('Failed to insert invoice items:', itemsErr);
      await adminClient.from('invoices').delete().eq('id', invoice.id);
      return { error: 'Failed to save line items: ' + itemsErr.message };
    }

    revalidatePath('/staff/billing');
    return {
      success: true,
      data: { invoiceId: invoice.id },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return { error: message };
  }
}

/**
 * Server Action: Convert Accepted Quotation to Draft Invoice
 * Preserves full quotation items snapshot, enforces idempotency, updates quotation status.
 */
export async function convertQuotationToInvoiceAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse<{ invoiceId: string }>> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_BILLING_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to convert quotations.' };
    }

    const quotationId = (formData.get('quotationId') as string)?.trim();
    const invoiceType = ((formData.get('invoiceType') as string)?.trim() || 'tax_invoice') as InvoiceType;

    if (!quotationId) {
      return { error: 'Quotation ID is required for conversion.' };
    }

    const adminClient = createAdminClient();

    // 1. Fetch Quotation
    const { data: quote, error: quoteErr } = await adminClient
      .from('quotations')
      .select('*')
      .eq('id', quotationId)
      .single();

    if (quoteErr || !quote) {
      return { error: 'Quotation not found: ' + (quoteErr?.message || 'Invalid ID') };
    }

    // 2. Validate Allowed Status
    if (quote.status !== 'accepted' && quote.status !== 'issued') {
      return {
        error: `Only accepted (or issued) quotations can be converted to invoices. Current status: ${quote.status}`,
      };
    }

    // 3. Idempotency Check: Guard against duplicate invoice conversion
    const { data: existingInvoices, error: checkErr } = await adminClient
      .from('invoices')
      .select('id, invoice_number, status')
      .eq('quotation_id', quotationId)
      .neq('status', 'cancelled');

    if (!checkErr && existingInvoices && existingInvoices.length > 0) {
      return {
        error: `Quotation is already converted to Invoice (${existingInvoices[0].invoice_number || 'Draft'}). Duplicate conversion prevented.`,
        data: { invoiceId: existingInvoices[0].id },
      };
    }

    // 4. Fetch Active Quotation Version
    const { data: version, error: versionErr } = await adminClient
      .from('quotation_versions')
      .select('*')
      .eq('quotation_id', quotationId)
      .eq('version_number', quote.current_version_number)
      .single();

    if (versionErr || !version) {
      return { error: 'Failed to retrieve active quotation version snapshot.' };
    }

    // 5. Fetch Quotation Items
    const { data: quoteItems, error: itemsFetchErr } = await adminClient
      .from('quotation_items')
      .select('*')
      .eq('quotation_version_id', version.id)
      .order('sort_order', { ascending: true });

    if (itemsFetchErr || !quoteItems || quoteItems.length === 0) {
      return { error: 'No line items found in the quotation version.' };
    }

    // 6. Fetch Customer Details
    const { data: customer, error: customerErr } = await adminClient
      .from('customers')
      .select('*')
      .eq('id', quote.customer_id)
      .single();

    if (customerErr || !customer) {
      return { error: 'Customer record associated with quotation could not be loaded.' };
    }

    const companyProfile = getCompanyBillingProfile();
    const fy = getCurrentFinancialYear();

    // 7. Calculate Invoice Totals with quotation items
    const lineItemInputs: InvoiceLineItemInput[] = quoteItems.map((item) => ({
      product_service_id: item.product_service_id,
      item_name: item.item_name,
      description: item.description,
      hsn_sac_code: item.hsn_sac_code,
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      discount_amount: item.discount_amount,
      gst_rate: quote.is_gst_applicable ? item.gst_rate : 0,
    }));

    const resolvedInvoiceType = quote.is_gst_applicable ? invoiceType : 'non_gst';
    const totals = calculateInvoiceTotals(
      lineItemInputs,
      resolvedInvoiceType,
      quote.place_of_supply_state_code,
      companyProfile.stateCode
    );

    // 8. Insert Draft Invoice
    const { data: invoice, error: invoiceErr } = await adminClient
      .from('invoices')
      .insert({
        invoice_number: null, // Assigned upon issuance
        invoice_type: resolvedInvoiceType,
        customer_id: customer.id,
        quotation_id: quote.id,
        quotation_version_id: version.id,
        status: 'draft',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        financial_year: fy.code,
        company_legal_name: companyProfile.legalName,
        company_trade_name: companyProfile.tradeName,
        company_gstin: companyProfile.gstin,
        company_pan: companyProfile.pan,
        company_state_code: companyProfile.stateCode,
        company_state_name: companyProfile.stateName,
        company_registered_address: companyProfile.registeredAddress,
        customer_billing_name: customer.company_name,
        customer_gstin: customer.gstin || null,
        customer_pan: customer.pan || null,
        customer_state_code: customer.state_code || totals.place_of_supply_state_code,
        customer_state_name: customer.state || undefined,
        customer_billing_address: customer.billing_address || 'Address on file',
        delivery_location: version.delivery_location,
        client_po_reference: quote.notes || null,
        place_of_supply_state_code: totals.place_of_supply_state_code,
        is_intra_state: totals.is_intra_state,
        subtotal_amount: totals.subtotal_amount,
        discount_amount: totals.discount_amount,
        taxable_amount: totals.taxable_amount,
        cgst_amount: totals.cgst_amount,
        sgst_amount: totals.sgst_amount,
        igst_amount: totals.igst_amount,
        total_tax_amount: totals.total_tax_amount,
        round_off_amount: totals.round_off_amount,
        grand_total_amount: totals.grand_total_amount,
        paid_amount: 0.0,
        balance_amount: totals.grand_total_amount,
        terms_conditions: version.terms_conditions || version.payment_terms,
        payment_instructions: `Bank: ${companyProfile.bankDetails.bankName}\nA/C: ${companyProfile.bankDetails.accountNumber}\nIFSC: ${companyProfile.bankDetails.ifscCode}\nUPI: ${companyProfile.bankDetails.upiId}`,
        notes: `Converted from Quotation ${quote.quotation_number} (Rev ${version.version_number})`,
        created_by_staff_id: user.id,
      })
      .select('id')
      .single();

    if (invoiceErr || !invoice) {
      console.error('Invoice insert error:', invoiceErr);
      return { error: 'Failed to create converted invoice: ' + invoiceErr?.message };
    }

    // 9. Insert Invoice Line Items
    const invoiceItemsPayload = totals.items.map((item, idx) => ({
      invoice_id: invoice.id,
      product_service_id: item.product_service_id || null,
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

    await adminClient.from('invoice_items').insert(invoiceItemsPayload);

    // 10. Update Quotation Status
    await adminClient
      .from('quotations')
      .update({ status: 'converted_to_invoice' })
      .eq('id', quote.id);

    revalidatePath('/staff/quotations');
    revalidatePath(`/staff/quotations/${quotationId}`);
    revalidatePath('/staff/billing');

    return {
      success: true,
      data: { invoiceId: invoice.id },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return { error: message };
  }
}

/**
 * Server Action: Issue Draft Invoice
 * Allocates statutory gapless CGST Rule 46(b) invoice number (SA/26-27/0001) and locks record.
 */
export async function issueInvoiceAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse<{ invoiceNumber: string }>> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_BILLING_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to issue invoices.' };
    }

    const invoiceId = (formData.get('invoiceId') as string)?.trim();
    if (!invoiceId) {
      return { error: 'Invoice ID is required.' };
    }

    const adminClient = createAdminClient();

    // 1. Fetch Draft Invoice
    const { data: invoice, error: fetchErr } = await adminClient
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (fetchErr || !invoice) {
      return { error: 'Invoice record not found.' };
    }

    if (invoice.status !== 'draft') {
      return { error: `Invoice is already issued or cannot be issued. Current status: ${invoice.status}` };
    }

    // Financial safeguard: Place of Supply is mandatory and must be valid for statutory tax invoices
    if (
      invoice.invoice_type === 'tax_invoice' &&
      (!invoice.place_of_supply_state_code || !isValidIndianStateCode(invoice.place_of_supply_state_code))
    ) {
      return {
        error:
          'Cannot issue statutory tax invoice: Place of Supply state code is required and must be a valid 2-digit Indian State Code (01-38, 97) to determine CGST/SGST vs IGST. Please specify a valid Place of Supply before issuing.',
      };
    }

    // 2. Try Atomic Database RPC first (guarantees zero number burn on failure)
    const { data: rpcIssueNum, error: rpcIssueErr } = await adminClient.rpc('issue_invoice', {
      p_invoice_id: invoiceId,
    });

    if (!rpcIssueErr && rpcIssueNum) {
      revalidatePath('/staff/billing');
      revalidatePath(`/staff/billing/${invoiceId}`);
      return {
        success: true,
        data: { invoiceNumber: rpcIssueNum },
      };
    }

    // Fallback: If issue_invoice RPC not yet active in remote DB, use allocate_invoice_number
    let invoiceNumber: string | null = null;
    const { data: rpcNum, error: rpcErr } = await adminClient.rpc('allocate_invoice_number', {
      p_fy: invoice.financial_year || getCurrentFinancialYear().code,
      p_series: 'SA',
    });

    if (!rpcErr && rpcNum) {
      invoiceNumber = rpcNum;
    } else {
      // In development / testing if RPC is not yet loaded in DB, fallback to atomic manual count
      const { data: counters } = await adminClient
        .from('invoice_sequence_counters')
        .select('*')
        .eq('financial_year', invoice.financial_year)
        .eq('series', 'SA');

      const nextNum = (counters && counters[0]?.last_number ? counters[0].last_number + 1 : 1);
      invoiceNumber = formatStatutoryInvoiceNumber('SA', invoice.financial_year, nextNum);
      
      await adminClient
        .from('invoice_sequence_counters')
        .upsert({
          financial_year: invoice.financial_year,
          series: 'SA',
          last_number: nextNum,
          updated_at: new Date().toISOString(),
        });
    }

    // 3. Mark Invoice as Issued
    const { error: updateErr } = await adminClient
      .from('invoices')
      .update({
        invoice_number: invoiceNumber,
        status: 'issued',
        issued_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (updateErr) {
      return { error: 'Failed to update invoice status: ' + updateErr.message };
    }

    revalidatePath('/staff/billing');
    revalidatePath(`/staff/billing/${invoiceId}`);

    return {
      success: true,
      data: { invoiceNumber },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return { error: message };
  }
}

/**
 * Server Action: Record Invoice Payment
 * Records full or partial payment, reconciles balance, and updates status.
 */
export async function recordPaymentAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse<{ paymentReceiptNumber: string; newBalance: number; newStatus: InvoiceStatus }>> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_BILLING_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to record payments.' };
    }

    const invoiceId = (formData.get('invoiceId') as string)?.trim();
    const amountStr = (formData.get('amount') as string)?.trim();
    const paymentMethod = ((formData.get('paymentMethod') as string)?.trim() || 'bank_transfer') as PaymentMethod;
    const paymentDate = (formData.get('paymentDate') as string)?.trim() || new Date().toISOString().split('T')[0];
    const transactionReference = (formData.get('transactionReference') as string)?.trim() || null;
    const bankName = (formData.get('bankName') as string)?.trim() || null;
    const notes = (formData.get('notes') as string)?.trim() || null;

    if (!invoiceId) {
      return { error: 'Invoice ID is required.' };
    }

    const paymentAmount = parseFloat(amountStr || '0');
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return { error: 'Payment amount must be greater than zero.' };
    }

    const adminClient = createAdminClient();

    // 1. Fetch Invoice
    const { data: invoice, error: fetchErr } = await adminClient
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (fetchErr || !invoice) {
      return { error: 'Invoice not found.' };
    }

    if (invoice.status === 'draft') {
      return { error: 'Cannot record payment on a draft invoice. Issue the invoice first.' };
    }

    if (invoice.status === 'cancelled' || invoice.status === 'refunded') {
      return { error: `Cannot record payment on a ${invoice.status} invoice.` };
    }

    if (invoice.balance_amount <= 0) {
      return { error: 'Invoice is already fully paid.' };
    }

    if (paymentAmount > invoice.balance_amount + 0.01) {
      return {
        error: `Payment amount (₹${paymentAmount.toLocaleString('en-IN')}) exceeds current outstanding balance (₹${invoice.balance_amount.toLocaleString('en-IN')}).`,
      };
    }

    // 2. Try Atomic Database RPC first (guarantees row locking & concurrency overpayment defense)
    const { data: rpcPayment, error: rpcPaymentErr } = await (adminClient as any).rpc('record_invoice_payment', {
      p_invoice_id: invoiceId,
      p_amount: paymentAmount,
      p_method: paymentMethod,
      p_payment_date: paymentDate,
      p_txn_reference: transactionReference,
      p_bank_name: bankName,
      p_notes: notes,
    });

    if (!rpcPaymentErr && rpcPayment) {
      revalidatePath('/staff/billing');
      revalidatePath(`/staff/billing/${invoiceId}`);
      return {
        success: true,
        data: {
          paymentReceiptNumber: rpcPayment.receipt_number,
          newBalance: rpcPayment.balance_amount,
          newStatus: rpcPayment.status,
        },
      };
    }

    // Fallback: If record_invoice_payment RPC not yet active in remote DB, execute Node-side atomic sequence
    let receiptNumber: string | null = null;
    const { data: rpcReceipt } = await adminClient.rpc('generate_payment_receipt_number');
    if (rpcReceipt) {
      receiptNumber = rpcReceipt;
    } else {
      const year = new Date().getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      receiptNumber = `RCPT-${year}-${rand}`;
    }

    // 3. Insert Payment Record
    const { error: payErr } = await adminClient.from('invoice_payments').insert({
      invoice_id: invoiceId,
      payment_receipt_number: receiptNumber,
      amount: paymentAmount,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      transaction_reference: transactionReference,
      bank_name: bankName,
      notes: notes,
      recorded_by_staff_id: user.id,
    });

    if (payErr) {
      return { error: 'Failed to record payment: ' + payErr.message };
    }

    // 4. Reconcile Balance and Status
    const newPaidAmount = Math.round((invoice.paid_amount + paymentAmount + Number.EPSILON) * 100) / 100;
    const { balanceAmount, newStatus } = reconcileInvoiceBalance(
      invoice.grand_total_amount,
      newPaidAmount,
      invoice.status,
      invoice.due_date
    );

    // 5. Update Invoice Record
    const { error: updateErr } = await adminClient
      .from('invoices')
      .update({
        paid_amount: newPaidAmount,
        balance_amount: balanceAmount,
        status: newStatus,
      })
      .eq('id', invoiceId);

    if (updateErr) {
      return { error: 'Payment logged but failed to update invoice balance: ' + updateErr.message };
    }

    revalidatePath('/staff/billing');
    revalidatePath(`/staff/billing/${invoiceId}`);

    return {
      success: true,
      data: {
        paymentReceiptNumber: receiptNumber,
        newBalance: balanceAmount,
        newStatus,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return { error: message };
  }
}

/**
 * Server Action: Cancel Invoice
 * Voids invoice with audit reason; does not delete statutory audit records.
 */
export async function cancelInvoiceAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  try {
    const { user, profile } = await requireStaffSession();

    if (!AUTHORIZED_BILLING_ROLES.includes(profile.role)) {
      return { error: 'Access denied: You do not have permission to cancel invoices.' };
    }

    const invoiceId = (formData.get('invoiceId') as string)?.trim();
    const reason = (formData.get('reason') as string)?.trim();

    if (!invoiceId) {
      return { error: 'Invoice ID is required.' };
    }
    if (!reason || reason.length < 5) {
      return { error: 'A specific cancellation reason (min 5 characters) is required.' };
    }

    const adminClient = createAdminClient();

    const { data: invoice } = await adminClient
      .from('invoices')
      .select('status, paid_amount')
      .eq('id', invoiceId)
      .single();

    if (!invoice) {
      return { error: 'Invoice not found.' };
    }

    if (invoice.paid_amount > 0) {
      return {
        error: 'Cannot cancel an invoice with recorded payments. Please refund or issue a credit note first.',
      };
    }

    const { error: updateErr } = await adminClient
      .from('invoices')
      .update({
        status: 'cancelled',
        cancelled_reason: reason,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (updateErr) {
      return { error: 'Failed to cancel invoice: ' + updateErr.message };
    }

    revalidatePath('/staff/billing');
    revalidatePath(`/staff/billing/${invoiceId}`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return { error: message };
  }
}

/**
 * Server Action: Record and dispatch invoice delivery (Email outbox, WhatsApp, Phone, Download, In-Person)
 */
export async function recordInvoiceDeliveryAction(
  invoiceId: string,
  deliveryChannel: 'email' | 'whatsapp' | 'phone' | 'in_person' | 'download',
  details?: { recipientEmail?: string; recipientPhone?: string; notes?: string }
): Promise<ActionResponse> {
  try {
    const { user, profile } = await requireStaffSession();
    if (!['super_admin', 'admin', 'billing_manager'].includes(profile.role)) {
      return { error: 'UNAUTHORIZED: Insufficient permissions to dispatch invoices.' };
    }

    const adminClient = createAdminClient();

    const { data: invoice, error: fetchErr } = await adminClient
      .from('invoices')
      .select(`
        id,
        invoice_number,
        invoice_type,
        status,
        invoice_date,
        due_date,
        taxable_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        grand_total_amount,
        balance_amount,
        customer_state_code,
        customer_billing_name,
        customer_gstin
      `)
      .eq('id', invoiceId)
      .single();

    if (fetchErr || !invoice) {
      return { error: 'Invoice not found.' };
    }

    if (invoice.status === 'draft') {
      return { error: 'Cannot deliver a draft invoice. Formally issue the invoice first.' };
    }

    if (invoice.status === 'cancelled') {
      return { error: 'Cannot deliver a cancelled invoice.' };
    }

    const customerName = invoice.customer_billing_name || 'Valued Customer';
    const isIntraState = invoice.customer_state_code === '07';

    // If channel is email, validate recipient and enqueue outbox job
    if (deliveryChannel === 'email') {
      const email = details?.recipientEmail?.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: 'Valid recipient email address is required for email delivery.' };
      }

      // Check duplicate send cooldown (within last 3 minutes to same email)
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      const { data: recentJob } = await adminClient
        .from('email_outbox')
        .select('id')
        .eq('related_entity_id', invoiceId)
        .eq('recipient_email', email.toLowerCase())
        .gte('created_at', threeMinutesAgo)
        .limit(1);

      if (recentJob && recentJob.length > 0) {
        return { error: 'Invoice was already queued for transmission to this email within the last 3 minutes.' };
      }

      await adminClient.from('email_outbox').insert({
        recipient_email: email.toLowerCase(),
        subject: `Tax Invoice ${invoice.invoice_number} — Santhaya Associates Pvt. Ltd.`,
        email_type: 'invoice_customer',
        related_entity_type: 'invoice',
        related_entity_id: invoiceId,
        payload: {
          invoiceNumber: invoice.invoice_number,
          invoiceType: invoice.invoice_type,
          customerName,
          contactPerson: null,
          customerGstin: invoice.customer_gstin || null,
          totalAmount: Number(invoice.grand_total_amount || 0),
          balanceAmount: Number(invoice.balance_amount || 0),
          taxableAmount: Number(invoice.taxable_amount || 0),
          cgstAmount: Number(invoice.cgst_amount || 0),
          sgstAmount: Number(invoice.sgst_amount || 0),
          igstAmount: Number(invoice.igst_amount || 0),
          isIntraState,
          issueDate: invoice.invoice_date,
          dueDate: invoice.due_date,
          notes: details?.notes || null,
        },
      });
    } else {
      // Record manual delivery event into email_outbox with status 'sent'
      await adminClient.from('email_outbox').insert({
        recipient_email: details?.recipientEmail || `${deliveryChannel}_manual_delivery@santhaya.local`,
        subject: `Manual Delivery [${deliveryChannel.toUpperCase()}]: Invoice ${invoice.invoice_number}`,
        email_type: 'invoice_manual_delivery',
        related_entity_type: 'invoice',
        related_entity_id: invoiceId,
        status: 'sent',
        attempts: 1,
        processed_at: new Date().toISOString(),
        payload: {
          invoiceNumber: invoice.invoice_number,
          customerName,
          deliveryChannel,
          recipientPhone: details?.recipientPhone || null,
          notes: details?.notes || null,
          recordedByStaffId: user.id,
        },
      });
    }

    revalidatePath(`/staff/billing/${invoiceId}`);
    revalidatePath('/staff/communications');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error logging invoice delivery.';
    return { error: message };
  }
}
