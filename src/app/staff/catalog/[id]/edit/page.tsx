import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { Package, ArrowLeft } from 'lucide-react';
import { CatalogItemForm } from '../../new/CatalogItemForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Edit Catalog Item | Santhaya Associates ERP',
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

export default async function EditCatalogItemPage({ params }: PageProps) {
  const { profile } = await requireStaffSession();

  const canEdit = ['super_admin', 'admin', 'estimator', 'billing_manager'].includes(profile.role);
  if (!canEdit) {
    redirect(`/staff/catalog/${params.id}`);
  }

  const admin = createAdminClient();
  const { data: item, error } = await admin
    .from('products_services')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !item) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href={`/staff/catalog/${params.id}`}
          className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Item Details</span>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Package className="w-6 h-6 text-gold-500" />
          <span>Edit Catalog Item: {item.name}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Update SKU details, default pricing, and statutory HSN/SAC parameters.
        </p>
      </div>

      <CatalogItemForm initialData={item as any} isEdit />
    </div>
  );
}
