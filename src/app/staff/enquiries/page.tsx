import React from 'react';
import Link from 'next/link';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  Inbox,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { EnquiryListClient, type EnquiryItem } from './EnquiryListClient';
import type { QuotationRequestStatus } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Inbound Enquiries | Santhaya Associates ERP',
  robots: {
    index: false,
    follow: false,
  },
};

interface PageProps {
  searchParams?: {
    q?: string;
    status?: string;
  };
}

export default async function StaffEnquiriesPage({ searchParams }: PageProps) {
  const { profile } = await requireStaffSession();

  const searchQuery = searchParams?.q?.toLowerCase().trim() || '';
  const statusFilter = (searchParams?.status || 'all').trim();
  const isTrashTab = statusFilter === 'trash';

  const canManage = ['super_admin', 'admin', 'estimator', 'billing_manager'].includes(profile.role);

  const admin = createAdminClient();

  // Query quotation_requests with soft-delete partitioning
  let query = admin
    .from('quotation_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (isTrashTab) {
    // Only soft-deleted records in Trash
    query = query.not('deleted_at', 'is', null);
  } else {
    // Active enquiries exclude soft-deleted records
    query = query.is('deleted_at', null);

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as QuotationRequestStatus);
    }
  }

  const { data: rawList, error } = await query;
  const allRows: EnquiryItem[] = (rawList as any[]) || [];

  // Filter in memory if search query provided
  const filteredList = allRows.filter((item) => {
    if (!searchQuery) return true;
    return (
      item.reference_number?.toLowerCase().includes(searchQuery) ||
      item.business_name?.toLowerCase().includes(searchQuery) ||
      item.contact_person?.toLowerCase().includes(searchQuery) ||
      item.phone?.toLowerCase().includes(searchQuery) ||
      item.email?.toLowerCase().includes(searchQuery) ||
      item.delivery_location?.toLowerCase().includes(searchQuery)
    );
  });

  // Calculate metrics (partitioning active vs trash)
  const { data: allStatusData } = await admin
    .from('quotation_requests')
    .select('id, status, deleted_at');

  const allRecords = (allStatusData as any[]) || [];
  const activeRows = allRecords.filter((r) => !r.deleted_at);
  const trashRows = allRecords.filter((r) => !!r.deleted_at);

  const totalCount = activeRows.length;
  const newCount = activeRows.filter((r) => r.status === 'new').length;
  const underReviewCount = activeRows.filter((r) => r.status === 'under_review').length;
  const draftedCount = activeRows.filter((r) => r.status === 'quotation_drafted').length;
  const trashCount = trashRows.length;

  const tabs: { label: string; value: string; count?: number; isTrash?: boolean }[] = [
    { label: 'All Enquiries', value: 'all', count: totalCount },
    { label: 'New Intake', value: 'new', count: newCount },
    { label: 'Under Review', value: 'under_review', count: underReviewCount },
    { label: 'Quotation Drafted', value: 'quotation_drafted', count: draftedCount },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Archived', value: 'archived' },
    { label: 'Trash', value: 'trash', count: trashCount, isTrash: true },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gold-950/50 border border-gold-500/30 text-gold-400 text-xs font-semibold mb-2">
            <Inbox className="w-3.5 h-3.5" />
            <span>Public Intake Gateway</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Inbound Quotation Enquiries</h1>
          <p className="text-xs text-slate-400 mt-1">
            Persisted public customer quotation inquiries received via the commercial portal.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 block font-medium">Total Inbound</span>
          <span className="text-2xl font-black text-white mt-1 block">{totalCount}</span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Lifetime Requests</span>
        </div>

        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 font-semibold">New Intake</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <span className="text-2xl font-black text-amber-300 mt-1 block">{newCount}</span>
          <span className="text-[11px] text-amber-400/70 mt-0.5 block">Awaiting First Review</span>
        </div>

        <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30">
          <span className="text-xs text-blue-400 font-semibold block">Under Review</span>
          <span className="text-2xl font-black text-blue-300 mt-1 block">{underReviewCount}</span>
          <span className="text-[11px] text-blue-400/70 mt-0.5 block">Estimator Triage Active</span>
        </div>

        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30">
          <span className="text-xs text-purple-400 font-semibold block">Quotation Drafted</span>
          <span className="text-2xl font-black text-purple-300 mt-1 block">{draftedCount}</span>
          <span className="text-[11px] text-purple-400/70 mt-0.5 block">Converted to Draft Quote</span>
        </div>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <form method="GET" action="/staff/enquiries" className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder="Search by reference, company, contact person, phone, email, or site..."
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500"
          />
          {statusFilter !== 'all' && (
            <input type="hidden" name="status" value={statusFilter} />
          )}
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((tab) => {
            const isActive = statusFilter === tab.value;
            const queryParams = new URLSearchParams();
            if (searchQuery) queryParams.set('q', searchQuery);
            if (tab.value !== 'all') queryParams.set('status', tab.value);
            const href = `/staff/enquiries${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

            return (
              <Link
                key={tab.value}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? tab.isTrash
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-gold-400 text-slate-900 shadow-sm'
                    : tab.isTrash
                    ? 'bg-rose-950/30 border border-rose-500/30 text-rose-400 hover:text-white hover:bg-rose-900/40'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tab.isTrash && <Trash2 className="w-3 h-3 text-current" />}
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? tab.isTrash
                          ? 'bg-rose-900 text-white'
                          : 'bg-slate-900 text-gold-400'
                        : tab.isTrash
                        ? 'bg-rose-900/60 text-rose-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main List */}
      <EnquiryListClient
        enquiries={filteredList}
        canManage={canManage}
        currentUserRole={profile.role}
        isTrashTab={isTrashTab}
      />
    </div>
  );
}

