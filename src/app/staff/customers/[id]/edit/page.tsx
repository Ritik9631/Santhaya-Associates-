import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { Building2, ArrowLeft } from 'lucide-react';
import { CustomerForm } from '../../new/CustomerForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Edit Customer | Santhaya Associates ERP',
  robots: {
    index: false,
    follow: false,
  },
};

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditCustomerPage({ params }: PageProps) {
  const { profile } = await requireStaffSession();

  const canEdit = ['super_admin', 'admin', 'estimator', 'billing_manager'].includes(profile.role);
  if (!canEdit) {
    redirect(`/staff/customers/${params.id}`);
  }

  const admin = createAdminClient();
  const { data: customer, error } = await admin
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !customer) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/staff/customers/${params.id}`}
          className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Customer Profile</span>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Building2 className="w-6 h-6 text-gold-500" />
          <span>Edit Customer: {customer.company_name}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Update statutory details, GSTIN/PAN, and business addresses.
        </p>
      </div>

      <CustomerForm initialData={customer as any} isEdit />
    </div>
  );
}
