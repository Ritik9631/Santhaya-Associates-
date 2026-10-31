import React from 'react';
import Link from 'next/link';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Users,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  Award,
  Building2,
  FileCheck2,
  Receipt,
  Mail,
  Truck,
  TrendingUp,
  Clock,
  AlertCircle,
  FileText,
  Inbox,
} from 'lucide-react';
import { ProfileNameEditor } from './ProfileNameEditor';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Staff ERP Dashboard | Santhaya Associates Pvt. Ltd.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StaffOverviewPage() {
  const { user, profile } = await requireStaffSession();

  const isSuperAdmin = profile.role === 'super_admin';
  const isAdmin = profile.role === 'admin' || isSuperAdmin;
  const canViewFinancials = ['super_admin', 'admin', 'billing_manager'].includes(profile.role);
  const canManageQuotations = ['super_admin', 'admin', 'estimator', 'billing_manager'].includes(profile.role);

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Administrator',
    admin: 'Administrator',
    estimator: 'Tender Estimator',
    billing_manager: 'Billing & GST Manager',
    viewer: 'Auditor / Viewer',
  };

  const adminClient = createAdminClient();

  // 1. Fetch live operational KPI counts
  const [
    { count: customerCount },
    { data: enquiryRows },
    { count: catalogCount },
    { data: quoteRows },
    { data: invoiceRows },
    { data: outboxRows },
    { data: recentQuotes },
    { data: recentInvoices },
  ] = await Promise.all([
    adminClient.from('customers').select('*', { count: 'exact', head: true }),
    adminClient.from('quotation_requests').select('id, status'),
    adminClient.from('products_services').select('*', { count: 'exact', head: true }),
    adminClient.from('quotations').select('id, status'),
    canViewFinancials
      ? adminClient.from('invoices').select('id, status, grand_total_amount, balance_amount')
      : Promise.resolve({ data: [] }),
    adminClient.from('email_outbox').select('id, status'),
    adminClient
      .from('quotations')
      .select('id, quotation_number, status, grand_total_amount, created_at, customer_billing_name')
      .order('created_at', { ascending: false })
      .limit(4),
    canViewFinancials
      ? adminClient
          .from('invoices')
          .select('id, invoice_number, status, grand_total_amount, balance_amount, created_at, customer_billing_name')
          .order('created_at', { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
  ]);

  // Aggregate Inbound Enquiries
  const totalEnquiries = enquiryRows?.length || 0;
  const newEnquiries = (enquiryRows || []).filter((e: any) => e.status === 'new').length;

  // Aggregate Quotations
  const totalQuotes = quoteRows?.length || 0;
  const draftQuotes = quoteRows?.filter((q) => q.status === 'draft').length || 0;
  const issuedQuotes = quoteRows?.filter((q) => q.status === 'issued').length || 0;
  const acceptedQuotes = quoteRows?.filter((q) => q.status === 'accepted').length || 0;

  // Aggregate Invoices (Role Protected)
  const totalInvoices = invoiceRows?.length || 0;
  const issuedInvoices = invoiceRows?.filter((i) => i.status !== 'draft' && i.status !== 'cancelled').length || 0;
  const totalBalanceOutstanding = (invoiceRows || []).reduce(
    (acc, inv) => acc + Number(inv.balance_amount || 0),
    0
  );

  // Aggregate Outbox Communications
  const totalOutbox = outboxRows?.length || 0;
  const sentJobs = outboxRows?.filter((j) => j.status === 'sent').length || 0;
  const pendingJobs = outboxRows?.filter((j) => j.status === 'pending' || j.status === 'processing').length || 0;
  const failedJobs = outboxRows?.filter((j) => j.status === 'failed' || j.status === 'dead_letter').length || 0;

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-navy-950 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 border border-emerald-500/30 text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Active Staff Session Verified
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Enterprise Command Center
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome, {profile.full_name || 'Staff Member'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-300 max-w-2xl leading-relaxed">
              Santhaya Associates Pvt. Ltd. operations portal — manage construction tenders, heavy machinery proposals, statutory GST billing, and multi-channel communications.
            </p>
          </div>

          <div className="flex-shrink-0 bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 min-w-[220px] space-y-2">
            <div>
              <div className="text-[11px] uppercase font-semibold text-slate-400">Authenticated Staff</div>
              <div className="text-xs text-slate-200 font-mono truncate max-w-[220px]" title={user.email || ''}>
                {user.email}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase font-semibold text-slate-400">Assigned ERP Role</div>
              <div className="text-xs font-bold text-gold-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                <span>{roleLabels[profile.role] || profile.role}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Operational KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Inbound Enquiries KPI */}
        <Link
          href="/staff/enquiries"
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-1.5 transition group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Inbound Enquiries</span>
            <Inbox className="w-4 h-4 text-gold-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            <span>{totalEnquiries}</span>
            {newEnquiries > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-500/30">
                {newEnquiries} new
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>Public intake requests</span>
            <ArrowRight className="w-3 h-3 text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
        {/* Customers KPI */}
        <Link
          href="/staff/customers"
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-1.5 transition group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Customers</span>
            <Building2 className="w-4 h-4 text-gold-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white">{customerCount ?? 0}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>Corporate & Govt entities</span>
            <ArrowRight className="w-3 h-3 text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>

        {/* Machinery Catalog KPI */}
        <Link
          href="/staff/catalog"
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-1.5 transition group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Master Catalog</span>
            <Truck className="w-4 h-4 text-gold-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white">{catalogCount ?? 0}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>Machinery & HSN/SAC items</span>
            <ArrowRight className="w-3 h-3 text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>

        {/* Quotations KPI */}
        <Link
          href="/staff/quotations"
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-1.5 transition group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Commercial Quotes</span>
            <FileCheck2 className="w-4 h-4 text-gold-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white">{totalQuotes}</div>
          <div className="text-[11px] text-emerald-400 font-mono">
            {acceptedQuotes} accepted • {issuedQuotes} issued • {draftQuotes} draft
          </div>
        </Link>

        {/* Financial Billing KPI (Role-Governed) */}
        {canViewFinancials ? (
          <Link
            href="/staff/billing"
            className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-1.5 transition group"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Outstanding Dues</span>
              <Receipt className="w-4 h-4 text-gold-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-white">
              ₹{totalBalanceOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {issuedInvoices} active invoices • CGST Rule 46
            </div>
          </Link>
        ) : (
          <Link
            href="/staff/communications"
            className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-1.5 transition group"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Outbox Queue</span>
              <Mail className="w-4 h-4 text-gold-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-bold text-white">{totalOutbox}</div>
            <div className="text-[11px] text-slate-400 font-mono">
              {sentJobs} sent • {pendingJobs} in queue
            </div>
          </Link>
        )}
      </div>

      {/* Communications Queue Telemetry Banner (For Billing Managers & Admins) */}
      {canViewFinancials && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-navy-900 text-gold-400 border border-navy-800">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white">Outbox Queue & Multi-Channel Communications:</span>{' '}
              <span className="text-slate-300">
                {sentJobs} dispatched successfully, {pendingJobs} pending in queue,{' '}
                {failedJobs > 0 ? (
                  <span className="text-rose-400 font-semibold">{failedJobs} failed (action required)</span>
                ) : (
                  <span className="text-emerald-400">0 failures</span>
                )}
              </span>
            </div>
          </div>
          <Link
            href="/staff/communications"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition text-xs border border-slate-700 whitespace-nowrap self-start sm:self-auto"
          >
            <span>Open Communications Hub</span>
            <ArrowRight className="w-3.5 h-3.5 text-gold-400" />
          </Link>
        </div>
      )}

      {/* Active ERP Modules Launchpad */}
      <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Enterprise System Modules
          </h2>
          <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> All Modules Active & Verified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Module 1: Customers */}
          <Link
            href="/staff/customers"
            className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-gold-500/50 hover:bg-slate-800/60 transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white group-hover:text-gold-400 transition-colors">
                Customer Management
              </span>
              <Building2 className="w-4 h-4 text-gold-500" />
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Commercial client directory, GSTIN & PAN registration, contact optionality, and profile history.
            </p>
            <div className="text-[11px] text-slate-300 font-medium pt-1 flex items-center gap-1">
              <span>View {customerCount ?? 0} customers</span>
              <ArrowRight className="w-3 h-3 text-gold-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Module 2: Machinery Catalog */}
          <Link
            href="/staff/catalog"
            className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-gold-500/50 hover:bg-slate-800/60 transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white group-hover:text-gold-400 transition-colors">
                Machinery & Services Catalog
              </span>
              <Truck className="w-4 h-4 text-gold-500" />
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Heavy earthmoving fleet, civil contracting packages, HSN/SAC codes, and GST rates.
            </p>
            <div className="text-[11px] text-slate-300 font-medium pt-1 flex items-center gap-1">
              <span>View {catalogCount ?? 0} items</span>
              <ArrowRight className="w-3 h-3 text-gold-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Module 3: Quotations */}
          <Link
            href="/staff/quotations"
            className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-gold-500/50 hover:bg-slate-800/60 transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white group-hover:text-gold-400 transition-colors">
                Commercial Quotations
              </span>
              <FileCheck2 className="w-4 h-4 text-gold-500" />
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Multi-version proposals, place-of-supply tax allocation, formal acceptance tracking, and printable PDF.
            </p>
            <div className="text-[11px] text-slate-300 font-medium pt-1 flex items-center gap-1">
              <span>Manage {totalQuotes} quotations</span>
              <ArrowRight className="w-3 h-3 text-gold-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Module 4: Billing & Invoicing */}
          <Link
            href="/staff/billing"
            className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-gold-500/50 hover:bg-slate-800/60 transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white group-hover:text-gold-400 transition-colors">
                Statutory GST Billing
              </span>
              <Receipt className="w-4 h-4 text-gold-500" />
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Sequential CGST Rule 46 invoices, multi-installment payments, settlement ledgers, and printable PDF.
            </p>
            <div className="text-[11px] text-slate-300 font-medium pt-1 flex items-center gap-1">
              <span>Inspect {totalInvoices} invoices</span>
              <ArrowRight className="w-3 h-3 text-gold-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Module 5: Communications Hub */}
          <Link
            href="/staff/communications"
            className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-gold-500/50 hover:bg-slate-800/60 transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white group-hover:text-gold-400 transition-colors">
                Communications Hub
              </span>
              <Mail className="w-4 h-4 text-gold-500" />
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Transactional email outbox queue, Resend free-tier quota telemetry, worker trigger, and retry ledger.
            </p>
            <div className="text-[11px] text-slate-300 font-medium pt-1 flex items-center gap-1">
              <span>Inspect {totalOutbox} jobs</span>
              <ArrowRight className="w-3 h-3 text-gold-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Module 6: Team Administration */}
          <Link
            href="/staff/team"
            className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-gold-500/50 hover:bg-slate-800/60 transition group space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white group-hover:text-gold-400 transition-colors">
                Team & Role Governance
              </span>
              <Users className="w-4 h-4 text-gold-500" />
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Staff directory, 5-tier role hierarchy, session status, account suspension, and invitation dispatch.
            </p>
            <div className="text-[11px] text-slate-300 font-medium pt-1 flex items-center gap-1">
              <span>Manage staff accounts</span>
              <ArrowRight className="w-3 h-3 text-gold-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* Account Settings & Quick Profile Action */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Award className="w-4 h-4 text-gold-500" />
              <span>Staff Profile Details</span>
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
              Account Active
            </span>
          </div>

          <ProfileNameEditor initialName={profile.full_name || ''} />

          <div className="text-[11px] text-slate-400 space-y-1 border-t border-slate-800 pt-3">
            <p>
              <span className="text-slate-500">Staff UUID:</span>{' '}
              <span className="font-mono text-slate-300">{profile.id}</span>
            </p>
            <p>
              <span className="text-slate-500">Role Authority:</span>{' '}
              {isSuperAdmin
                ? 'Full System Super Administrator privileges across all tables and settings.'
                : isAdmin
                ? 'Staff team governance and operational execution privileges.'
                : 'Role-scoped operational permissions.'}
            </p>
          </div>
        </div>

        {/* Security Invariants Card */}
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gold-500" />
              <span>Platform Security Invariants</span>
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Verified
            </span>
          </div>

          <ul className="text-xs text-slate-300 space-y-2.5">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Dual-Barrier Perimeter:</strong> Supabase Auth JWT + PostgreSQL RLS active status verification on every route.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Single Super Admin Root:</strong> Serialized advisory locks ensure root administrator cannot be deleted or orphaned.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Public Isolation:</strong> Public website shell contains zero staff URLs, forms, or login triggers.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
