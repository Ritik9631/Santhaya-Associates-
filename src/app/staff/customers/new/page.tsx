import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/session';
import { Building2, ArrowLeft } from 'lucide-react';
import { CustomerForm } from './CustomerForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Register New Customer | Santhaya Associates ERP',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewCustomerPage() {
  const { profile } = await requireStaffSession();

  const canManageCustomers = ['super_admin', 'admin', 'estimator', 'billing_manager'].includes(profile.role);
  if (!canManageCustomers) {
    redirect('/staff/customers');
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/staff/customers"
          className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Customers</span>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Building2 className="w-6 h-6 text-gold-500" />
          <span>Register New Customer Record</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Direct client creation for tenders, direct machinery sales, or equipment rental billing.
        </p>
      </div>

      <CustomerForm />
    </div>
  );
}

