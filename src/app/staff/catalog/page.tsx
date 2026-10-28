import React from 'react';
import Link from 'next/link';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { Package, Plus, Search, CheckCircle2, XCircle, ArrowRight, Tag, Percent } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Machinery & Services Catalog | Santhaya Associates ERP',
  robots: {
    index: false,
    follow: false,
  },
};

interface PageProps {
  searchParams?: {
    q?: string;
    type?: string;
    status?: string;
  };
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const { profile } = await requireStaffSession();

  const query = searchParams?.q?.toLowerCase() || '';
  const typeFilter = searchParams?.type || 'all';
  const statusFilter = searchParams?.status || 'all';

  const canManageCatalog = ['super_admin', 'admin', 'estimator', 'billing_manager'].includes(profile.role);

  const admin = createAdminClient();
  let dbQuery = admin
    .from('products_services')
    .select('id, sku, name, category, item_type, default_unit_price, hsn_sac_code, applicable_gst_rate, unit_of_measurement, is_active, created_at')
    .order('created_at', { ascending: false });

  if (typeFilter !== 'all') {
    dbQuery = dbQuery.eq('item_type', typeFilter);
  }
  if (statusFilter === 'active') {
    dbQuery = dbQuery.eq('is_active', true);
  } else if (statusFilter === 'inactive') {
    dbQuery = dbQuery.eq('is_active', false);
  }

  const { data: catalogList, error } = await dbQuery;

  const filteredItems = (catalogList || []).filter((item) => {
    if (!query) return true;
    return (
      item.sku?.toLowerCase().includes(query) ||
      item.name?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query) ||
      item.hsn_sac_code?.toLowerCase().includes(query)
    );
  });

  const typeLabels: Record<string, string> = {
    product: 'Machinery / Good',
    service: 'Tender / Civil Service',
    rental: 'Equipment Rental',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Package className="w-6 h-6 text-gold-500" />
            <span>Machinery & Service Catalog</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Construction machinery supply, manufacturing machinery, rental equipment, and tender services.
          </p>
        </div>

        {canManageCatalog && (
          <Link
            href="/staff/catalog/new"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-900 bg-gold-400 hover:bg-gold-300 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Catalog Item</span>
          </Link>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form method="GET" className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by SKU, item name, category, or HSN/SAC code..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
            />
          </div>
          <select
            name="type"
            defaultValue={typeFilter}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-gold-500"
          >
            <option value="all">All Classifications</option>
            <option value="product">Machinery / Goods</option>
            <option value="rental">Equipment Rental</option>
            <option value="service">Tender / Services</option>
          </select>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-white font-medium transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs">
          Unable to query catalog database: {error.message}
        </div>
      )}

      {/* Catalog Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th scope="col" className="px-5 py-3.5 font-semibold">SKU / Item Name</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Category</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Default Rate</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">HSN / SAC</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">GST Rate</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No matching catalog items found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gold-400 text-[11px] uppercase">{item.sku}</span>
                      </div>
                      <div className="text-xs text-slate-200 mt-0.5">
                        {item.name}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      <div>{item.category}</div>
                      <div className="text-[10px] text-slate-400">
                        {typeLabels[item.item_type] || item.item_type}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-mono text-slate-200 font-semibold">
                      ₹{Number(item.default_unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span className="text-[10px] text-slate-400 font-normal"> / {item.unit_of_measurement}</span>
                    </td>

                    <td className="px-5 py-4 font-mono text-[11px] text-slate-400">
                      {item.hsn_sac_code || '—'}
                    </td>

                    <td className="px-5 py-4 font-mono text-[11px] text-gold-400">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-gold-500/10 border border-gold-500/30">
                        <Percent className="w-2.5 h-2.5" />
                        {Number(item.applicable_gst_rate).toFixed(1)}%
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-400">
                          <XCircle className="w-3.5 h-3.5" /> Inactive
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/staff/catalog/${item.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

