'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { inviteStaffAction, ActionResponse } from '@/lib/auth/staff-actions';
import {
  UserPlus,
  ShieldAlert,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
  KeyRound,
  Shield,
} from 'lucide-react';
import type { StaffRole } from '@/types/database';

interface InviteStaffFormProps {
  callerRole: StaffRole;
}

export function InviteStaffForm({ callerRole }: InviteStaffFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    email: string;
    temporaryPassword: string;
    inviteLink?: string | null;
    role: StaffRole;
    fullName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const isSuperAdmin = callerRole === 'super_admin';

  // Role ceiling: Ordinary admins can only invite estimator, billing_manager, or viewer
  const availableRoles: { value: StaffRole; label: string; description: string }[] = isSuperAdmin
    ? [
        { value: 'viewer', label: 'Auditor / Viewer', description: 'Read-only access to tenders, quotations, and invoices.' },
        { value: 'estimator', label: 'Tender Estimator', description: 'Prepare tender submissions and draft quotations.' },
        { value: 'billing_manager', label: 'Billing & GST Manager', description: 'Manage GST tax invoices, payments, and statutory ledgers.' },
        { value: 'admin', label: 'Administrator', description: 'Manage staff, approve quotations, and configure system settings.' },
        { value: 'super_admin', label: 'Super Administrator', description: 'Full system ownership, role delegation, and security authority.' },
      ]
    : [
        { value: 'viewer', label: 'Auditor / Viewer', description: 'Read-only access to tenders, quotations, and invoices.' },
        { value: 'estimator', label: 'Tender Estimator', description: 'Prepare tender submissions and draft quotations.' },
        { value: 'billing_manager', label: 'Billing & GST Manager', description: 'Manage GST tax invoices, payments, and statutory ledgers.' },
      ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await inviteStaffAction(null, formData);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setResult(res.data);
    }
  };

  const copyCredentials = () => {
    if (!result) return;
    const text = `Santhaya Associates Staff ERP Login Credentials:\nPortal: /staff/login\nEmail: ${result.email}\nTemporary Password: ${result.temporaryPassword}\nAssigned Role: ${result.role}\n\nNotice: Password must be changed upon first login.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const copyInviteLink = () => {
    if (!result?.inviteLink) return;
    navigator.clipboard.writeText(result.inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  if (result) {
    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/90 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Staff Account Provisioned Successfully</h2>
            <p className="text-xs text-slate-400">
              Authentication identity and staff profile have been safely created.
            </p>
          </div>
        </div>

        {/* Option A: Single-Use Secure Setup Link */}
        {result.inviteLink && (
          <div className="rounded-xl bg-slate-950 border border-gold-500/30 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gold-400 tracking-wider">
                <Shield className="w-4 h-4" />
                <span>Single-Use Password Setup Link (Recommended)</span>
              </div>
              <button
                type="button"
                onClick={copyInviteLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-900 bg-gold-400 hover:bg-gold-300 transition-colors"
              >
                {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{linkCopied ? 'Link Copied' : 'Copy Setup Link'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-300">
              This cryptographic link permits the employee to establish their own password securely without transmitting plaintext credentials.
            </p>
            <div className="font-mono text-[11px] text-slate-400 bg-slate-900 p-2.5 rounded border border-slate-800 break-all select-all">
              {result.inviteLink}
            </div>
          </div>
        )}

        {/* Option B: Ephemeral Credentials Card */}
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-300 tracking-wider">
              <KeyRound className="w-4 h-4 text-gold-400" />
              <span>Direct Credentials Fallback</span>
            </div>
            <button
              type="button"
              onClick={copyCredentials}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Credentials'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Staff Name</span>
              <span className="font-semibold text-white">{result.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Assigned Role</span>
              <span className="font-semibold text-gold-400 uppercase">{result.role}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Login Email</span>
              <span className="font-mono text-slate-200">{result.email}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Temporary Password</span>
              <span className="font-mono text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 select-all">
                {result.temporaryPassword}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Account tagged with <code className="text-slate-300">must_change_password: true</code>. Not stored in database plaintext.</span>
          </div>
        </div>

        <div className="rounded-xl bg-amber-950/40 border border-amber-500/30 p-4 text-xs text-amber-200 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Zero-Email Outbound Policy:</strong> In accordance with development safety rules, automated external invitation emails are disabled. Please share these credentials directly and securely with the employee. This temporary password will not be displayed again.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Link
            href="/staff/team"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Staff Directory</span>
          </Link>

          <button
            onClick={() => {
              setResult(null);
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Another Member</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6 shadow-xl">
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label htmlFor="fullName" className="block text-xs font-semibold text-slate-300">
            Full Name <span className="text-gold-400">*</span>
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            minLength={2}
            maxLength={100}
            disabled={loading}
            placeholder="e.g. Rajesh Kumar"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-semibold text-slate-300">
            Corporate Email Address <span className="text-gold-400">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            disabled={loading}
            placeholder="e.g. rajesh@santhaya.com"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Role Selection */}
      <div className="space-y-2">
        <label htmlFor="role" className="block text-xs font-semibold text-slate-300">
          Assign ERP Role <span className="text-gold-400">*</span>
        </label>
        <p className="text-[11px] text-slate-400">
          Role privileges are enforced via PostgreSQL Row Level Security and server-side RPC functions.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {availableRoles.map((roleOpt) => (
            <label
              key={roleOpt.value}
              className="relative flex items-start gap-3 p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-950 hover:border-slate-700 cursor-pointer transition-colors"
            >
              <input
                type="radio"
                name="role"
                value={roleOpt.value}
                required
                defaultChecked={roleOpt.value === 'estimator'}
                disabled={loading}
                className="mt-0.5 text-gold-500 focus:ring-gold-500"
              />
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-gold-400" />
                  <span>{roleOpt.label}</span>
                </div>
                <div className="text-[11px] text-slate-400">{roleOpt.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Security Notice */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="font-semibold text-slate-300 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-gold-400" />
          <span>Security Governance Policy</span>
        </div>
        <p>
          Staff accounts cannot self-register. A secure, high-entropy temporary password will be generated upon submission. All administrative invitations are recorded in the immutable audit log.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-slate-800 pt-5">
        <Link
          href="/staff/team"
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-slate-900 bg-gold-400 hover:bg-gold-300 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Provisioning Staff Account...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Create Staff Member</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

