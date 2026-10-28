import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import InvoiceDetailView from './InvoiceDetailView';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Invoice Details | Santhaya Associates Staff Portal',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const session = await requireStaffSession();
  const adminClient = createAdminClient();

  // 1. Fetch Invoice
  const { data: invoice, error: invoiceErr } = await adminClient
    .from('invoices')
    .select('*')
    .eq('id', params.id)
    .single();

  if (invoiceErr || !invoice) {
    notFound();
  }

  // 2. Fetch Invoice Items
  const { data: items, error: itemsErr } = await adminClient
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', params.id)
    .order('sort_order', { ascending: true });

  // 3. Fetch Payments Ledger
  const { data: payments, error: paymentsErr } = await adminClient
    .from('invoice_payments')
    .select(`
      *,
      staff_profiles:recorded_by_staff_id (
        full_name,
        email
      )
    `)
    .eq('invoice_id', params.id)
    .order('created_at', { ascending: false });

  // 4. Fetch Linked Quotation if present
  let linkedQuotation = null;
  if (invoice.quotation_id) {
    const { data: quote } = await adminClient
      .from('quotations')
      .select('id, quotation_number, status')
      .eq('id', invoice.quotation_id)
      .single();
    linkedQuotation = quote;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <InvoiceDetailView
        invoice={invoice}
        items={items || []}
        payments={payments || []}
        linkedQuotation={linkedQuotation}
        currentUserRole={session.profile.role}
      />
    </div>
  );
}

