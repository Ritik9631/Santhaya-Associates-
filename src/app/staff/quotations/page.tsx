import Link from 'next/link';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quotation Management | Santhaya Associates Staff Portal',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
  };
}

export default async function QuotationsDirectoryPage({ searchParams }: PageProps) {
  const session = await requireStaffSession();
  const adminClient = createAdminClient();

  const searchQuery = searchParams.q?.trim().toLowerCase() || '';
  const statusFilter = searchParams.status?.trim() || '';

  // Query quotations
  let query = adminClient
    .from('quotations')
    .select(`
      id,
      quotation_number,
      status,
      current_version_number,
      place_of_supply_state_code,
      created_at,
      updated_at,
      customers (
        company_name,
        primary_contact_person
      ),
      quotation_versions (
        version_number,
        version_code,
        grand_total_amount,
        delivery_location,
        validity_days,
        expires_at
      )
    `)
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter as any);
  }

  const { data: rawQuotations, error } = await query;
  const allQuotations = (rawQuotations as any[]) || [];

  // Filter in memory for search query (customer name or quotation number)
  const filteredQuotations = allQuotations.filter((q: any) => {
    if (!searchQuery) return true;
    const num = q.quotation_number?.toLowerCase() || '';
    const cust = q.customers?.company_name?.toLowerCase() || '';
    const contact = q.customers?.primary_contact_person?.toLowerCase() || '';
    return num.includes(searchQuery) || cust.includes(searchQuery) || contact.includes(searchQuery);
  });

  // KPI Metrics
  const totalCount = allQuotations.length;
  const draftCount = allQuotations.filter((q: any) => q.status === 'draft').length;
  const issuedCount = allQuotations.filter((q: any) => q.status === 'issued' || q.status === 'revised').length;
  const acceptedCount = allQuotations.filter((q: any) => q.status === 'accepted').length;
  const conversionRate = totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0;

  const statusColors: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-800 border-amber-300',
    issued: 'bg-blue-100 text-blue-800 border-blue-300',
    revised: 'bg-purple-100 text-purple-800 border-purple-300',
    accepted: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    rejected: 'bg-rose-100 text-rose-800 border-rose-300',
    expired: 'bg-slate-200 text-slate-700 border-slate-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
    converted_to_invoice: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  };

  const tabs = [
    { label: 'All Quotations', value: '' },
    { label: 'Drafts', value: 'draft' },
    { label: 'Issued / Pending', value: 'issued' },
    { label: 'Revised', value: 'revised' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Rejected / Cancelled', value: 'rejected' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotation Management</h1>
          <p className="text-sm text-slate-500">
            Create, track, version, and manage commercial proposals with statutory Indian GST calculations.
          </p>
        </div>

        {session.profile.role !== 'viewer' && (
          <Link
            href="/staff/quotations/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#10243B] text-white rounded-lg text-sm font-semibold hover:bg-slate-800 shadow transition"
          >
            <Plus className="w-4 h-4" />
            Create Quotation
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Quotes</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Drafts</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{draftCount}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Issued / Out</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{issuedCount}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Accepted</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{acceptedCount}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm col-span-2 md:col-span-1">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Conversion</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-2xl font-bold text-indigo-700">{conversionRate}%</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
          {tabs.map((tab) => {
            const isActive = (!statusFilter && tab.value === '') || statusFilter === tab.value;
            return (
              <Link
                key={tab.value}
                href={tab.value ? `/staff/quotations?status=${tab.value}` : '/staff/quotations'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#10243B] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <form method="GET" className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search by quotation number, client name, or contact person..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10243B]"
          />
        </form>
      </div>

      {/* Quotations Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {filteredQuotations.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-900">No quotations found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {searchQuery || statusFilter
                ? 'No commercial quotations match your search filters.'
                : 'Get started by creating your first commercial quotation for tender services or machinery.'}
            </p>
            {session.profile.role !== 'viewer' && (
              <Link
                href="/staff/quotations/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#10243B] text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
              >
                <Plus className="w-4 h-4" />
                Create New Quotation
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Quotation #</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Client Organization</th>
                  <th className="py-3 px-4 font-semibold">Destination</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Grand Total (₹)</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.map((q: any) => {
                  const currentVer =
                    q.quotation_versions?.find((v: any) => v.version_number === q.current_version_number) ||
                    q.quotation_versions?.[0] ||
                    {};

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition group">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <Link
                          href={`/staff/quotations/${q.id}`}
                          className="hover:text-blue-700 flex items-center gap-1.5"
                        >
                          <span>{q.quotation_number}</span>
                          <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                            {currentVer.version_code || `R0`}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {new Date(q.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{q.customers?.company_name || '—'}</p>
                        <p className="text-[11px] text-slate-500">{q.customers?.primary_contact_person}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {currentVer.delivery_location || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                            statusColors[q.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {q.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        ₹{Number(currentVer.grand_total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/staff/quotations/${q.id}/pdf`}
                            target="_blank"
                            className="p-1 text-slate-400 hover:text-slate-700"
                            title="Print / View PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/staff/quotations/${q.id}`}
                            className="p-1 text-slate-400 hover:text-slate-900"
                            title="View Quotation"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
