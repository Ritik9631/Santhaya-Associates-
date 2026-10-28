'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { updateStaffRoleAction, updateStaffStatusAction } from '@/lib/auth/staff-actions';
import {
  Shield,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Check,
  ArrowLeft,
  UserCheck,
  History,
  Lock,
} from 'lucide-react';
import type { StaffRole } from '@/types/database';

interface TargetStaff {
  id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuditEntry {
  id: string;
  action: string;
  created_at: string;
  actor_id: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
}

interface StaffDetailManagerProps {
  callerId: string;
  callerRole: StaffRole;
  target: TargetStaff;
  auditLogs: AuditEntry[];
}

export function StaffDetailManager({
  callerId,
  callerRole,
  target,
  auditLogs,
}: StaffDetailManagerProps) {
  const isSuperAdmin = callerRole === 'super_admin';
  const isSelf = callerId === target.id;
  const isTargetSuper = target.role === 'super_admin';
  const isTargetAdmin = target.role === 'admin' || isTargetSuper;

  // Role modification permission: Only Super Admin can change roles, and cannot change own role
  const canModifyRole = isSuperAdmin && !isSelf;

  // Status modification permission: Super Admin can modify anyone except self; Ordinary Admin can modify non-admins
  const canModifyStatus = !isSelf && (isSuperAdmin || (!isTargetAdmin && callerRole === 'admin'));

  const [selectedRole, setSelectedRole] = useState<StaffRole>(target.role);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleFeedback, setRoleFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);

  const [statusLoading, setStatusLoading] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

  const roleLabels: Record<StaffRole, string> = {
    super_admin: 'Super Administrator',
    admin: 'Administrator',
    estimator: 'Tender Estimator',
    billing_manager: 'Billing & GST Manager',
    viewer: 'Auditor / Viewer',
  };

  const handleRoleSubmit = async () => {
    setShowRoleConfirm(false);
    setRoleLoading(true);
    setRoleFeedback(null);

    const formData = new FormData();
    formData.append('targetUserId', target.id);
    formData.append('newRole', selectedRole);

    const res = await updateStaffRoleAction(null, formData);
    setRoleLoading(false);

    if (res.error) {
      setRoleFeedback({ message: res.error, isError: true });
      setSelectedRole(target.role);
    } else {
      setRoleFeedback({ message: `Role updated to ${roleLabels[selectedRole]} successfully.`, isError: false });
    }
  };

  const handleStatusSubmit = async () => {
    setShowStatusConfirm(false);
    setStatusLoading(true);
    setStatusFeedback(null);

    const newStatus = !target.is_active;
    const formData = new FormData();
    formData.append('targetUserId', target.id);
    formData.append('isActive', String(newStatus));

    const res = await updateStaffStatusAction(null, formData);
    setStatusLoading(false);

    if (res.error) {
      setStatusFeedback({ message: res.error, isError: true });
    } else {
      setStatusFeedback({
        message: `Account ${newStatus ? 'activated' : 'suspended'} successfully.`,
        isError: false,
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Target Member Summary Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-lg text-gold-400">
              {(target.full_name?.[0] || target.email?.[0] || 'S').toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">{target.full_name || 'Unnamed Staff'}</h1>
                {isSelf && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-gold-400 border border-slate-700">
                    Your Account
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{target.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Current Role</span>
              <span className="text-gold-400 font-bold">{roleLabels[target.role] || target.role}</span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Account Status</span>
              {target.is_active ? (
                <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </span>
              ) : (
                <span className="text-rose-400 font-semibold inline-flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Suspended
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 text-xs text-slate-400">
          <div>
            <span className="text-slate-500 block text-[11px]">Staff Profile ID</span>
            <span className="font-mono text-slate-300 select-all text-[11px] truncate block">{target.id}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Account Created</span>
            <span className="text-slate-300">
              {target.created_at ? new Date(target.created_at).toLocaleString('en-IN') : '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Last Updated</span>
            <span className="text-slate-300">
              {target.updated_at ? new Date(target.updated_at).toLocaleString('en-IN') : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Role & Status Management Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Role Management Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-gold-500" />
              <span>Modify Assigned Role</span>
            </h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              Super Admin Only
            </span>
          </div>

          {roleFeedback && (
            <div
              className={`p-3 rounded-lg text-xs ${
                roleFeedback.isError
                  ? 'bg-rose-950/60 border border-rose-500/30 text-rose-300'
                  : 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
              }`}
            >
              {roleFeedback.message}
            </div>
          )}

          {!canModifyRole ? (
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
              <Lock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <span>
                {isSelf
                  ? 'Anti-Self-Escalation: You cannot modify your own role.'
                  : 'Role changes require active Super Administrator privileges.'}
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="roleSelect" className="block text-xs text-slate-300 font-medium">
                  Select New Role
                </label>
                <select
                  id="roleSelect"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as StaffRole)}
                  disabled={roleLoading}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="viewer">Auditor / Viewer</option>
                  <option value="estimator">Tender Estimator</option>
                  <option value="billing_manager">Billing & GST Manager</option>
                  <option value="admin">Administrator</option>
                  <option value="super_admin">Super Administrator</option>
                </select>
              </div>

              {selectedRole !== target.role && (
                <button
                  type="button"
                  onClick={() => setShowRoleConfirm(true)}
                  disabled={roleLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-900 bg-gold-400 hover:bg-gold-300 transition-colors disabled:opacity-50"
                >
                  {roleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                  <span>Save Role Change</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Status Management Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-gold-500" />
              <span>Account Status & Access</span>
            </h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              Admin & Super Admin
            </span>
          </div>

          {statusFeedback && (
            <div
              className={`p-3 rounded-lg text-xs ${
                statusFeedback.isError
                  ? 'bg-rose-950/60 border border-rose-500/30 text-rose-300'
                  : 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
              }`}
            >
              {statusFeedback.message}
            </div>
          )}

          {!canModifyStatus ? (
            <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
              <Lock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <span>
                {isSelf
                  ? 'Anti-Self-Deactivation: You cannot deactivate your own account.'
                  : !isSuperAdmin && isTargetAdmin
                  ? 'Privilege ceiling: Ordinary administrators cannot suspend administrator accounts.'
                  : 'Status changes require administrator privileges.'}
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                {target.is_active
                  ? 'Suspending this staff account will immediately revoke all access to internal ERP modules and terminate active sessions.'
                  : 'Activating this account will restore access to authorized modules based on assigned role permissions.'}
              </p>

              <button
                type="button"
                onClick={() => setShowStatusConfirm(true)}
                disabled={statusLoading}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                  target.is_active
                    ? 'bg-rose-900 hover:bg-rose-800 text-rose-100 border border-rose-700/60'
                    : 'bg-emerald-900 hover:bg-emerald-800 text-emerald-100 border border-emerald-700/60'
                }`}
              >
                {statusLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : target.is_active ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{target.is_active ? 'Suspend Staff Account' : 'Reactivate Staff Account'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Role Confirmation Modal */}
      {showRoleConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl border border-gold-500/30 bg-slate-900 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-gold-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-sm font-bold text-white">Confirm Role Assignment</h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to change the role for <strong>{target.full_name}</strong> from{' '}
              <span className="text-slate-400 font-semibold">{roleLabels[target.role]}</span> to{' '}
              <span className="text-gold-400 font-bold">{roleLabels[selectedRole]}</span>?
            </p>
            <p className="text-[11px] text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800">
              This action is serialized with a database advisory lock and will be permanently recorded in the immutable audit log.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRoleConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRoleSubmit}
                className="px-4 py-1.5 rounded-lg bg-gold-400 hover:bg-gold-300 text-slate-900 font-semibold text-xs transition-colors"
              >
                Confirm Role Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Confirmation Modal */}
      {showStatusConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl border border-rose-500/30 bg-slate-900 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-sm font-bold text-white">
                Confirm Account {target.is_active ? 'Suspension' : 'Reactivation'}
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to {target.is_active ? 'suspend' : 'reactivate'} the account for{' '}
              <strong>{target.full_name}</strong> ({target.email})?
            </p>
            {target.is_active && (
              <p className="text-[11px] text-rose-300 bg-rose-950/50 p-3 rounded-lg border border-rose-500/30">
                The employee will be immediately locked out of all protected routes and cannot log in until reactivated.
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStatusConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusSubmit}
                className={`px-4 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                  target.is_active
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-900'
                }`}
              >
                Confirm {target.is_active ? 'Suspension' : 'Reactivation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Timeline */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <History className="w-4 h-4 text-gold-500" />
            <span>Audit Trail for this Profile</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">
            Immutable PostgreSQL Records
          </span>
        </div>

        {(!auditLogs || auditLogs.length === 0) ? (
          <p className="text-xs text-slate-400 py-3">No audit history entries recorded for this profile yet.</p>
        ) : (
          <div className="space-y-2.5">
            {auditLogs.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-200 flex items-center gap-2">
                    <span className="font-mono text-gold-400 uppercase text-[11px]">{entry.action}</span>
                  </div>
                  {entry.new_state && (
                    <div className="text-[11px] text-slate-400 font-mono">
                      {JSON.stringify(entry.new_state)}
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                  {entry.created_at ? new Date(entry.created_at).toLocaleString('en-IN') : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

