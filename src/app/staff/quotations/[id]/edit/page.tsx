import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { ArrowLeft, FileEdit, AlertTriangle } from 'lucide-react';
import QuotationForm from '../../new/QuotationForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit Draft Quotation | Santhaya Associates ERP',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditQuotationPage({ params }: PageProps) {
  const { profile } = await requireStaffSession();

  const canEdit = ['super_admin', 'admin', 'estimator', 'billing_manager'].includes(profile.role);
  if (!canEdit) {
    redirect(`/staff/quotations/${params.id}`);
  }

  const adminClient = createAdminClient();

  // Load quotation with versions and items
  const { data: quote, error: quoteErr } = await adminClient
    .from('quotations')
    .select(`
      id,
      quotation_number,
      customer_id,
      status,
      current_version_number,
      place_of_supply_state_code,
      is_gst_applicable,
      notes,
      quotation_versions (
        id,
        version_number,
        version_code,
        is_locked,
        validity_days,
        delivery_location,
        payment_terms,
        terms_conditions
      )
    `)
    .eq('id', params.id)
    .single();

  if (quoteErr || !quote) {
    notFound();
  }

  // Guard: Only draft quotations can be edited
  if (quote.status !== 'draft') {
    redirect(`/staff/quotations/${params.id}`);
  }

  const rawQuote: any = quote;
  const activeVersion =
    rawQuote.quotation_versions?.find((v: any) => v.version_number === quote.current_version_number) ||
    rawQuote.quotation_versions?.[0];

  if (!activeVersion || activeVersion.is_locked) {
    redirect(`/staff/quotations/${params.id}`);
  }

  // Load line items for active version
  const { data: rawItems } = await adminClient
    .from('quotation_items')
    .select('*')
    .eq('quotation_version_id', activeVersion.id)
    .order('sort_order', { ascending: true });

  // Load customers
  const { data: customers } = await adminClient
    .from('customers')
    .select('id, company_name, primary_contact_person, gstin, state, state_code')
    .order('company_name', { ascending: true });

  // Load catalog items
  const { data: catalogItems } = await adminClient
    .from('products_services')
    .select('id, sku, name, default_unit_price, applicable_gst_rate, hsn_sac_code, unit_of_measurement, item_type')
    .eq('is_active', true)
    .order('name', { ascending: true });

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

  const initialData = {
    id: quote.id,
    quotation_number: quote.quotation_number,
    customer_id: quote.customer_id,
    place_of_supply_state_code: quote.place_of_supply_state_code,
    is_gst_applicable: quote.is_gst_applicable,
    validity_days: activeVersion.validity_days || 30,
    delivery_location: activeVersion.delivery_location || '',
    payment_terms: activeVersion.payment_terms || '',
    terms_conditions: activeVersion.terms_conditions || '',
    notes: quote.notes || '',
    items: initialItems,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link
          href={`/staff/quotations/${quote.id}`}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileEdit className="w-6 h-6 text-gold-400" />
            Edit Draft Quotation: {quote.quotation_number}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Modify client coordinates, line items, rates, and commercial terms before formal issuance.
          </p>
        </div>
      </div>

      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2.5 text-xs text-amber-300">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          Editing is permitted while the quotation is in <strong>Draft</strong> status. Upon official issuance, line items and pricing will be permanently locked.
        </span>
      </div>

      <QuotationForm
        customers={(customers || []) as any}
        catalogItems={(catalogItems || []) as any}
        isEdit={true}
        initialData={initialData}
      />
    </div>
  );
}
