import React from 'react';
import Link from 'next/link';
import { requireStaffSession } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Building2, Plus, Search, CheckCircle2, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import type { CustomerType } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Customer Directory | Santhaya Associates ERP',
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

export default async function CustomersPage({ searchParams }: PageProps) {
  const { profile } = await requireStaffSession();

  const query = searchParams?.q?.toLowerCase() || '';
  const typeFilter = searchParams?.type || 'all';
  const statusFilter = searchParams?.status || 'all';

  const canManageCustomers = ['super_admin', 'admin', 'estimator', 'billing_manager'].includes(profile.role);

  const admin = createAdminClient();
  let dbQuery = admin
    .from('customers')
    .select('id, company_name, primary_contact_person, email, phone, gstin, client_type, is_verified, created_at')
    .order('created_at', { ascending: false });

  if (typeFilter !== 'all') {
    dbQuery = dbQuery.eq('client_type', typeFilter as CustomerType);
  }
  if (statusFilter === 'verified') {
    dbQuery = dbQuery.eq('is_verified', true);
  } else if (statusFilter === 'unverified') {
    dbQuery = dbQuery.eq('is_verified', false);
  }

  const { data: customerList, error } = await dbQuery;

  // In-memory text filter if search query is provided
  const filteredCustomers = (customerList || []).filter((c) => {
    if (!query) return true;
    return (
      c.company_name?.toLowerCase().includes(query) ||
      c.primary_contact_person?.toLowerCase().includes(query) ||
      c.gstin?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.phone?.includes(query)
    );
  });

  const typeLabels: Record<string, string> = {
    all: 'All Types',
    private_corporate: 'Private Corporate',
    government: 'Government',
    contractor: 'Contractor',
    individual: 'Individual',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-gold-500" />
            <span>Customer Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Commercial clients, government entities, statutory GSTINs, and direct registration.
          </p>
        </div>

        {canManageCustomers && (
          <Link
            href="/staff/customers/new"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-900 bg-gold-400 hover:bg-gold-300 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register Customer</span>
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
              placeholder="Search by company, contact person, GSTIN, phone, or email..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
            />
          </div>
          <select
            name="type"
            defaultValue={typeFilter}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-gold-500"
          >
            <option value="all">All Types</option>
            <option value="private_corporate">Private Corporate</option>
            <option value="government">Government</option>
            <option value="contractor">Contractor</option>
            <option value="individual">Individual</option>
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
          Unable to query customer database: {error.message}
        </div>
      )}

      {/* Customers Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th scope="col" className="px-5 py-3.5 font-semibold">Company / Client Name</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Contact Person</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Statutory GSTIN</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Client Type</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Statutory Verification</th>
                <th scope="col" className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No matching customer records found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span>{cust.company_name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {cust.email || cust.phone ? `${cust.email || 'No email'} • ${cust.phone || 'No phone'}` : 'No direct contact details'}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-300">
                      {cust.primary_contact_person}
                    </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-gold-400">
                      {cust.gstin || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {typeLabels[cust.client_type as string] || cust.client_type || 'Corporate'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {cust.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/staff/customers/${cust.id}`}
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
