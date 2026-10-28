import React from 'react';
import Link from 'next/link';
import { requireStaffSession } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Users, UserPlus, Shield, ArrowRight, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import type { StaffRole } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Staff Directory | Santhaya Associates ERP',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StaffTeamPage() {
  const { profile: currentProfile } = await requireStaffSession();

  const isSuperAdmin = currentProfile.role === 'super_admin';
  const isAdmin = currentProfile.role === 'admin' || isSuperAdmin;

  const supabase = await createServerSupabaseClient();
  const { data: staffList, error } = await supabase
    .from('staff_profiles')
    .select('id, email, full_name, role, is_active, created_at')
    .order('created_at', { ascending: false });

  const roleColors: Record<StaffRole, { bg: string; text: string; border: string }> = {
    super_admin: { bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-500/30' },
    admin: { bg: 'bg-blue-950/60', text: 'text-blue-300', border: 'border-blue-500/30' },
    estimator: { bg: 'bg-gold-500/10', text: 'text-gold-400', border: 'border-gold-500/30' },
    billing_manager: { bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-500/30' },
    viewer: { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' },
  };

  const roleLabels: Record<StaffRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Administrator',
    estimator: 'Estimator',
    billing_manager: 'Billing Manager',
    viewer: 'Viewer / Auditor',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/staff"
              className="text-slate-400 hover:text-slate-200 text-xs inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-gold-500" />
            <span>Staff Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Internal Santhaya Associates personnel, role assignments, and account authorization statuses.
          </p>
        </div>

        {isAdmin && (
          <Link
            href="/staff/team/invite"
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-900 bg-gold-400 hover:bg-gold-300 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite New Staff</span>
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs">
          Unable to load staff directory: {error.message}
        </div>
      )}

      {/* Staff Table / List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th scope="col" className="px-5 py-3.5 font-semibold">Staff Member</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Assigned Role</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Account Status</th>
                <th scope="col" className="px-5 py-3.5 font-semibold hidden md:table-cell">Joined Date</th>
                <th scope="col" className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {(!staffList || staffList.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    No staff records found in the directory.
                  </td>
                </tr>
              ) : (
                staffList.map((member) => {
                  const roleStyle = roleColors[member.role as StaffRole] || roleColors.viewer;
                  const isSelf = member.id === currentProfile.id;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
                            {(member.full_name?.[0] || member.email?.[0] || 'S').toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span>{member.full_name || 'Unnamed Staff'}</span>
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-gold-400 border border-slate-700 font-normal">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{roleLabels[member.role as StaffRole] || member.role}</span>
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {member.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Suspended</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-400 hidden md:table-cell font-mono text-[11px]">
                        {member.created_at
                          ? new Date(member.created_at).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {isAdmin ? (
                          <Link
                            href={`/staff/team/${member.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                          >
                            <span>Manage</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                          </Link>
                        ) : (
                          <span className="text-[11px] text-slate-400">View Only</span>
                        )}
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

