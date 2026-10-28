import { notFound, redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import QuotationDetailView from './QuotationDetailView';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quotation Details | Santhaya Associates Staff Portal',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function QuotationDetailPage({ params }: PageProps) {
  let session;
  try {
    session = await requireStaffSession();
  } catch {
    redirect(`/staff/login?redirectTo=/staff/quotations/${params.id}`);
  }

  const adminClient = createAdminClient();

  const { data: quote, error: quoteErr } = await adminClient
    .from('quotations')
    .select(`
      *,
      customers (
        id,
        company_name,
        primary_contact_person,
        email,
        phone,
        gstin,
        pan,
        billing_address,
        state,
        state_code
      ),
      quotation_versions (
        id,
        version_number,
        version_code,
        validity_days,
        expires_at,
        delivery_location,
        payment_terms,
        terms_conditions,
        subtotal_amount,
        discount_amount,
        taxable_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        total_tax_amount,
        round_off_amount,
        grand_total_amount,
        is_locked,
        issued_at,
        created_at,
        quotation_items (
          id,
          sort_order,
          item_name,
          description,
          hsn_sac_code,
          unit,
          quantity,
          unit_rate,
          discount_amount,
          taxable_amount,
          gst_rate,
          cgst_rate,
          sgst_rate,
          igst_rate,
          cgst_amount,
          sgst_amount,
          igst_amount,
          tax_amount,
          line_total
        )
      ),
      quotation_acceptances (
        id,
        accepted_at,
        accepted_by_contact_name,
        acceptance_channel,
        client_po_reference,
        staff_notes
      ),
      quotation_delivery_logs (
        id,
        delivery_channel,
        recipient_email,
        recipient_phone,
        delivery_status,
        notes,
        created_at
      )
    `)
    .eq('id', params.id)
    .single();

  if (quoteErr || !quote) {
    notFound();
  }

  return <QuotationDetailView quotation={quote} userRole={session.profile.role} />;
}

