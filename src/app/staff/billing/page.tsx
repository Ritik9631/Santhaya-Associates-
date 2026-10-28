import Link from 'next/link';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  IndianRupee,
  FileCheck,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Billing & GST Invoices | Santhaya Associates Staff Portal',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
  };
}

export default async function BillingDirectoryPage({ searchParams }: PageProps) {
  await requireStaffSession();
  const adminClient = createAdminClient();

  const searchQuery = searchParams.q?.trim().toLowerCase() || '';
  const statusFilter = searchParams.status?.trim() || '';

  // Query invoices
  let query = adminClient
    .from('invoices')
    .select(`
      id,
      invoice_number,
      invoice_type,
      status,
      invoice_date,
      due_date,
      financial_year,
      customer_billing_name,
      customer_gstin,
      grand_total_amount,
      paid_amount,
      balance_amount,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter as any);
  }

  const { data: rawInvoices, error } = await query;
  const allInvoices = (rawInvoices as any[]) || [];

  // Filter in memory for search query
  const filteredInvoices = allInvoices.filter((inv: any) => {
    if (!searchQuery) return true;
    const num = inv.invoice_number?.toLowerCase() || '';
    const cust = inv.customer_billing_name?.toLowerCase() || '';
    const gstin = inv.customer_gstin?.toLowerCase() || '';
    return num.includes(searchQuery) || cust.includes(searchQuery) || gstin.includes(searchQuery);
  });

  // Calculate Financial KPIs across non-cancelled invoices
  const activeInvoices = allInvoices.filter((inv: any) => inv.status !== 'cancelled');
  const todayStr = new Date().toISOString().split('T')[0];

  const totalInvoiced = activeInvoices.reduce((sum, inv) => sum + Number(inv.grand_total_amount || 0), 0);
  const totalCollected = activeInvoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
  const totalOutstanding = activeInvoices.reduce((sum, inv) => sum + Number(inv.balance_amount || 0), 0);
  const overdueCount = activeInvoices.filter((inv) => inv.balance_amount > 0 && inv.due_date < todayStr).length;

  const statusColors: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-800 border-amber-300',
    issued: 'bg-blue-100 text-blue-800 border-blue-300',
    partially_paid: 'bg-purple-100 text-purple-800 border-purple-300',
    paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    overdue: 'bg-rose-100 text-rose-800 border-rose-300',
    cancelled: 'bg-slate-200 text-slate-700 border-slate-300',
    refunded: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  };

  const tabs = [
    { label: 'All Invoices', value: '' },
    { label: 'Drafts', value: 'draft' },
    { label: 'Issued', value: 'issued' },
    { label: 'Partially Paid', value: 'partially_paid' },
    { label: 'Paid', value: 'paid' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-7 h-7 text-emerald-700" />
            Billing & Invoicing
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Statutory Indian GST tax invoices, bills of supply, and payment ledger tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/staff/billing/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoiced</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              ₹{totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">{activeInvoices.length} active invoices</p>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected Revenue</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              ₹{totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              {totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0}% recovery rate
            </p>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Balance</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              ₹{totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">Pending customer settlement</p>
          </div>
          <div className="w-11 h-11 bg-amber-50 text-amber-700 rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue Invoices</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{overdueCount}</p>
            <p className="text-xs text-rose-600 mt-1">Exceeded payment due date</p>
          </div>
          <div className="w-11 h-11 bg-rose-50 text-rose-700 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {tabs.map((tab) => {
              const isActive = (tab.value === '' && !statusFilter) || statusFilter === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={`/staff/billing?${new URLSearchParams({
                    ...(searchQuery ? { q: searchQuery } : {}),
                    ...(tab.value ? { status: tab.value } : {}),
                  }).toString()}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Search Box */}
          <form method="GET" className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={searchQuery}
              placeholder="Search invoice #, customer..."
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          </form>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Invoice Details</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date / Due</th>
                <th className="px-4 py-3 text-right">Grand Total</th>
                <th className="px-4 py-3 text-right">Balance Due</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-700">No invoices found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchQuery
                        ? 'No invoices match your search query.'
                        : 'Generate a new invoice or convert an accepted quotation.'}
                    </p>
                    <div className="mt-4">
                      <Link
                        href="/staff/billing/new"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create Invoice
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isOverdue = inv.balance_amount > 0 && inv.due_date < todayStr && inv.status !== 'cancelled';
                  const displayStatus = isOverdue ? 'overdue' : inv.status;
                  const badgeColor = statusColors[displayStatus] || statusColors.draft;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/staff/billing/${inv.id}`}
                          className="font-semibold text-slate-900 hover:text-emerald-700 flex items-center gap-1.5"
                        >
                          {inv.invoice_number || 'DRAFT (Unissued)'}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span className="capitalize">{inv.invoice_type.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>FY {inv.financial_year}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 line-clamp-1">{inv.customer_billing_name}</p>
                        <p className="text-xs text-slate-500 font-mono">
                          {inv.customer_gstin ? `GST: ${inv.customer_gstin}` : 'Unregistered'}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-xs">
                        <p className="text-slate-800">{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</p>
                        <p className={`text-[11px] ${isOverdue ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
                          Due: {new Date(inv.due_date).toLocaleDateString('en-IN')}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        ₹{Number(inv.grand_total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-semibold ${
                            inv.balance_amount > 0 ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          ₹{Number(inv.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        {inv.paid_amount > 0 && inv.balance_amount > 0 && (
                          <p className="text-[10px] text-slate-500">
                            Paid: ₹{Number(inv.paid_amount).toLocaleString('en-IN')}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider ${badgeColor}`}
                        >
                          {displayStatus.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <Link
                          href={`/staff/billing/${inv.id}/pdf`}
                          target="_blank"
                          title="Print / View PDF"
                          className="inline-flex items-center p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100"
                        >
                          <Printer className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/staff/billing/${inv.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                        >
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

