import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import QuotationForm from './QuotationForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Commercial Quotation | Santhaya Associates Staff Portal',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: {
    customerId?: string;
    enquiryId?: string;
  };
}

export default async function NewQuotationPage({ searchParams }: PageProps) {
  await requireStaffSession();
  const adminClient = createAdminClient();

  // Load Customers
  const { data: customers } = await adminClient
    .from('customers')
    .select('id, company_name, primary_contact_person, gstin, state, state_code')
    .order('company_name', { ascending: true });

  // Load Catalog Items
  const { data: catalogItems } = await adminClient
    .from('products_services')
    .select('id, sku, name, default_unit_price, applicable_gst_rate, hsn_sac_code, unit_of_measurement, item_type')
    .eq('is_active', true)
    .order('name', { ascending: true });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link
          href="/staff/quotations"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create New Quotation</h1>
          <p className="text-sm text-slate-500">
            Generate an official commercial proposal with statutory GST allocation and multi-item line pricing.
          </p>
        </div>
      </div>

      <QuotationForm
        customers={customers || []}
        catalogItems={catalogItems || []}
        defaultCustomerId={searchParams.customerId}
        defaultEnquiryId={searchParams.enquiryId}
      />
    </div>
  );
}

