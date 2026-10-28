import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/session';
import { Package, ArrowLeft } from 'lucide-react';
import { CatalogItemForm } from './CatalogItemForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Add Catalog Item | Santhaya Associates ERP',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewCatalogItemPage() {
  const { profile } = await requireStaffSession();

  const canManageCatalog = ['super_admin', 'admin', 'estimator', 'billing_manager'].includes(profile.role);
  if (!canManageCatalog) {
    redirect('/staff/catalog');
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/staff/catalog"
          className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Catalog</span>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Package className="w-6 h-6 text-gold-500" />
          <span>Add Machinery or Service Item</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Define inventory equipment, rental rates, or tender services with statutory HSN/SAC codes.
        </p>
      </div>

      <CatalogItemForm />
    </div>
  );
}

