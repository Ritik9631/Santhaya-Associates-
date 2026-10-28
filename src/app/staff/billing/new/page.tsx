import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCompanyBillingProfile } from '@/lib/billing/company-config';
import InvoiceForm from './InvoiceForm';
import Link from 'next/link';
import { ArrowLeft, Receipt } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Tax Invoice | Santhaya Associates Staff Portal',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: {
    customerId?: string;
    quotationId?: string;
  };
}

export default async function NewInvoicePage({ searchParams }: PageProps) {
  await requireStaffSession();
  const adminClient = createAdminClient();

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

  // Load Accepted Quotations for Quotation-to-Invoice conversion
  const { data: rawQuotations } = await adminClient
    .from('quotations')
    .select(`
      id,
      quotation_number,
      customer_id,
      status,
      place_of_supply_state_code,
      is_gst_applicable,
      created_at,
      customers (
        company_name
      ),
      quotation_versions (
        id,
        version_number,
        grand_total_amount
      )
    `)
    .in('status', ['accepted', 'issued'])
    .order('created_at', { ascending: false });

  const acceptedQuotations = (rawQuotations as any[]) || [];
  const companyProfile = getCompanyBillingProfile();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link
          href="/staff/billing"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-700" />
            Create GST Invoice
          </h1>
          <p className="text-sm text-slate-500">
            Issue a direct commercial tax invoice, bill of supply, or convert an accepted quotation.
          </p>
        </div>
      </div>

      <InvoiceForm
        customers={customers || []}
        catalogItems={catalogItems || []}
        acceptedQuotations={acceptedQuotations}
        defaultCustomerId={searchParams.customerId}
        defaultQuotationId={searchParams.quotationId}
        companyProfile={companyProfile}
      />
    </div>
  );
}

