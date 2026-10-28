import React from 'react';
import Link from 'next/link';
import { requireStaffSession } from '@/lib/auth/session';
import { ShieldCheck, CheckCircle2, Lock, Users, UserPlus, ArrowRight, ShieldAlert, Award } from 'lucide-react';
import { ProfileNameEditor } from './ProfileNameEditor';

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

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Administrator',
    admin: 'Administrator',
    estimator: 'Tender Estimator',
    billing_manager: 'Billing & GST Manager',
    viewer: 'Auditor / Viewer',
  };

  return (
    <div className="space-y-8">
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
                Stage 3A Master ERP
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome, {profile.full_name || 'Staff Member'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-300 max-w-2xl">
              Private enterprise operating portal for Santhaya Associates Pvt. Ltd.
              Government & private construction tenders, machinery supply quotations, and GST billing.
            </p>
          </div>

          <div className="flex-shrink-0 bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 min-w-[220px] space-y-2">
            <div>
              <div className="text-[11px] uppercase font-semibold text-slate-400">Authenticated Email</div>
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

      {/* Account Settings & Team Quick Actions */}
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
            <p><span className="text-slate-500">Staff ID:</span> <span className="font-mono text-slate-400">{profile.id}</span></p>
            <p><span className="text-slate-500">Permissions:</span> {isSuperAdmin ? 'Full System Super Administrator privileges.' : isAdmin ? 'Staff management & operational privileges.' : 'Operational role privileges.'}</p>
          </div>
        </div>

        {/* Team Administration Card */}
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-gold-500" />
              <span>Staff Team & Access</span>
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Stage 3A-5
            </span>
          </div>

          <p className="text-xs text-slate-300">
            View staff directory, manage role assignments, activate or suspend accounts, and provision new staff invitations.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/staff/team"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-gold-400" />
              <span>Staff Directory</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            {isAdmin && (
              <Link
                href="/staff/team/invite"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-900 bg-gold-400 hover:bg-gold-300 transition-colors shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite Staff Member</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Security Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 space-y-3">
          <div className="flex items-center gap-2 text-gold-400">
            <Lock className="w-5 h-5 text-gold-500" />
            <h3 className="font-semibold text-sm text-white">Dual-Barrier Protection</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Every staff route validates both Supabase Auth credentials and the PostgreSQL <code className="text-slate-200">staff_profiles</code> active status record.
          </p>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" /> Enforced by Next.js App Router Middleware
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 space-y-3">
          <div className="flex items-center gap-2 text-gold-400">
            <ShieldCheck className="w-5 h-5 text-gold-500" />
            <h3 className="font-semibold text-sm text-white">Serialized Super Admin Security</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Administrative role and status changes are serialized with PostgreSQL transaction-scoped advisory locks, preventing removal of the last Super Administrator.
          </p>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" /> Database Advisory Locking & RPC Guards
          </div>
        </div>

        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-5 space-y-3">
          <div className="flex items-center gap-2 text-gold-400">
            <ShieldAlert className="w-5 h-5 text-gold-500" />
            <h3 className="font-semibold text-sm text-white">Zero Public Auth UI</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The public marketing website remains completely isolated with zero login links. All staff management routes emit strict <code className="text-slate-200">no-store</code> and <code className="text-slate-200">noindex</code> headers.
          </p>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" /> Marketing Shell Completely Decoupled
          </div>
        </div>
      </div>

      {/* ERP Modules Launchpad (Stages 3B - 3E) */}
      <div className="rounded-xl bg-slate-900/40 border border-slate-800 p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Core ERP System Modules
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-slate-900/90 border border-gold-500/40 space-y-1.5">
            <div className="font-semibold text-gold-400">Stage 3A • Active</div>
            <div className="text-slate-200 font-medium">Staff ERP & RBAC</div>
            <div className="text-slate-400 text-[11px]">Authentication, session guard, role hierarchy & team directory.</div>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800/80 space-y-1.5 opacity-70">
            <div className="font-semibold text-slate-400">Stage 3B • Roadmap</div>
            <div className="text-slate-200 font-medium">Tender Estimations</div>
            <div className="text-slate-400 text-[11px]">Tender requirements, contractor bids, cost estimation.</div>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800/80 space-y-1.5 opacity-70">
            <div className="font-semibold text-slate-400">Stage 3C • Roadmap</div>
            <div className="text-slate-200 font-medium">Machinery Catalog</div>
            <div className="text-slate-400 text-[11px]">Construction & industrial machinery specs, rental/purchase pricing.</div>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/40 border border-slate-800/80 space-y-1.5 opacity-70">
            <div className="font-semibold text-slate-400">Stages 3D–3E • Roadmap</div>
            <div className="text-slate-200 font-medium">Quotations & GST Billing</div>
            <div className="text-slate-400 text-[11px]">Dynamic line items, PDF generation, place-of-supply tax calculations.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
