import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { ArrowLeft } from 'lucide-react';
import { CustomerDetailView } from './CustomerDetailView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Customer Details | Santhaya Associates ERP',
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

export default async function CustomerDetailPage({ params }: PageProps) {
  const { profile } = await requireStaffSession();

  const admin = createAdminClient();
  const { data: customer, error } = await admin
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !customer) {
    notFound();
  }

  const { data: auditLogs } = await admin
    .from('audit_logs')
    .select('id, action, created_at, new_state')
    .eq('entity_type', 'customers')
    .eq('entity_id', params.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const canEdit = ['super_admin', 'admin', 'estimator', 'billing_manager'].includes(profile.role);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/staff/customers"
        className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Customer Directory</span>
      </Link>

      <CustomerDetailView
        customer={customer as any}
        auditLogs={(auditLogs || []) as any}
        canEdit={canEdit}
        userRole={profile.role}
      />
    </div>
  );
}

