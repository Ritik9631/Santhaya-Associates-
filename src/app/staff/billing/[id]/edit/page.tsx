import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCompanyBillingProfile } from '@/lib/billing/company-config';
import { ArrowLeft, FileEdit, AlertTriangle } from 'lucide-react';
import InvoiceForm, { type InitialInvoiceData } from '../../new/InvoiceForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit Draft Invoice | Santhaya Associates ERP',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditInvoicePage({ params }: PageProps) {
  const { profile } = await requireStaffSession();

  const canEdit = ['super_admin', 'admin', 'billing_manager'].includes(profile.role);
  if (!canEdit) {
    redirect(`/staff/billing/${params.id}`);
  }

  const adminClient = createAdminClient();

  // Load invoice
  const { data: invoice, error: invoiceErr } = await adminClient
    .from('invoices')
    .select(`
      id,
      invoice_number,
      customer_id,
      invoice_type,
      status,
      invoice_date,
      due_date,
      place_of_supply_state_code,
      delivery_location,
      client_po_reference,
      terms_conditions,
      payment_instructions,
      notes,
      is_intra_state
    `)
    .eq('id', params.id)
    .single();

  if (invoiceErr || !invoice) {
    notFound();
  }

  // Guard: Under Indian GST Rule 46, only Draft invoices can be modified
  if (invoice.status !== 'draft') {
    redirect(`/staff/billing/${params.id}`);
  }

  // Load line items
  const { data: rawItems } = await adminClient
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoice.id)
    .order('sort_order', { ascending: true });

  // Load Customers
  const { data: customers } = await adminClient
    .from('customers')
    .select('id, company_name, primary_contact_person, gstin, pan, billing_address, state, state_code')
    .order('company_name', { ascending: true });

  // Load Catalog Items
  const { data: catalogItems } = await adminClient
    .from('products_services')
    .select('id, sku, name, default_unit_price, applicable_gst_rate, hsn_sac_code, unit_of_measurement, item_type')
    .eq('is_active', true)
    .order('name', { ascending: true });

  const companyProfile = getCompanyBillingProfile();

  const initialItems = (rawItems || []).map((it) => ({
    product_service_id: it.product_service_id || null,
    item_name: it.item_name,
    description: it.description || '',
    hsn_sac_code: it.hsn_sac_code || '',
    unit: it.unit || 'unit',
    quantity: Number(it.quantity) || 1,
    unit_rate: Number(it.unit_rate) || 0,
    discount_amount: Number(it.discount_amount) || 0,
    gst_rate: Number(it.gst_rate) || 18,
  }));

  const initialData: InitialInvoiceData = {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    customer_id: invoice.customer_id,
    invoice_type: invoice.invoice_type as any,
    invoice_date: invoice.invoice_date ? invoice.invoice_date.split('T')[0] : new Date().toISOString().split('T')[0],
    due_date: invoice.due_date ? invoice.due_date.split('T')[0] : new Date().toISOString().split('T')[0],
    placeOfSupplyStateCode: invoice.place_of_supply_state_code || '10',
    delivery_location: invoice.delivery_location || '',
    client_po_reference: invoice.client_po_reference || '',
    terms_conditions: invoice.terms_conditions || '',
    payment_instructions: invoice.payment_instructions || '',
    notes: invoice.notes || '',
    items: initialItems,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link
          href={`/staff/billing/${invoice.id}`}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileEdit className="w-6 h-6 text-emerald-400" />
            Edit Draft Invoice: {invoice.invoice_number || 'Draft'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Modify client coordinates, line items, rates, and tax terms before formal issuance under GST Rule 46.
          </p>
        </div>
      </div>

      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2.5 text-xs text-amber-300">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          Editing is permitted while the invoice is in <strong>Draft</strong> status. Issued invoices are legally immutable tax records and cannot be altered.
        </span>
      </div>

      <InvoiceForm
        customers={customers || []}
        catalogItems={catalogItems || []}
        acceptedQuotations={[]}
        companyProfile={companyProfile}
        isEdit={true}
        initialData={initialData}
      />
    </div>
  );
}

