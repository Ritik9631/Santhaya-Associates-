'use client';

import React from 'react';
import Link from 'next/link';
import {
  Building2,
  Edit2,
  ShieldCheck,
  FileSpreadsheet,
  Receipt,
  Mail,
  Phone,
  MapPin,
  History,
} from 'lucide-react';
import type { CustomerType } from '@/types/database';

interface CustomerDetailViewProps {
  customer: {
    id: string;
    company_name: string;
    primary_contact_person: string;
    customer_type?: CustomerType;
    client_type?: CustomerType;
    email?: string | null;
    phone?: string | null;
    gstin?: string | null;
    pan?: string | null;
    billing_address?: string | null;
    shipping_address?: string | null;
    billing_state?: string | null;
    state?: string | null;
    state_code?: string | null;
    notes?: string | null;
    is_verified?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  auditLogs: Array<{
    id: string;
    action: string;
    created_at: string;
    new_state: Record<string, unknown> | null;
  }>;
  canEdit: boolean;
}

export function CustomerDetailView({ customer, auditLogs, canEdit }: CustomerDetailViewProps) {
  const typeLabels: Record<string, string> = {
    private_corporate: 'Private Corporate / Commercial',
    government: 'Government / Public Sector',
    contractor: 'Infrastructure Contractor',
    individual: 'Individual / Proprietorship',
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-lg text-gold-400">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white">{customer.company_name}</h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Primary Contact: <span className="text-slate-200 font-medium">{customer.primary_contact_person}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Classification</span>
              <span className="text-slate-300 font-semibold">
                {typeLabels[customer.customer_type || customer.client_type || 'private_corporate']}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Statutory Verification</span>
              {customer.is_verified ? (
                <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              ) : (
                <span className="text-slate-400 font-semibold inline-flex items-center gap-1">
                  Unverified
                </span>
              )}
            </div>

            {canEdit && (
              <div className="flex gap-2">
                <Link
                  href={`/staff/customers/${customer.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Statutory & Contact Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 text-xs text-slate-400">
          <div>
            <span className="text-slate-500 block text-[11px] uppercase font-semibold">Statutory GSTIN</span>
            <span className="font-mono text-gold-400 font-semibold text-sm">
              {customer.gstin || 'Unregistered / Not Provided'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] uppercase font-semibold">Statutory PAN</span>
            <span className="font-mono text-slate-200 font-semibold text-sm">
              {customer.pan || '—'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] uppercase font-semibold">Email</span>
            <span className="text-slate-200 inline-flex items-center gap-1 font-mono">
              <Mail className="w-3 h-3 text-slate-500" />
              {customer.email || 'None Provided'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] uppercase font-semibold">Phone</span>
            <span className="text-slate-200 inline-flex items-center gap-1 font-mono">
              <Phone className="w-3 h-3 text-slate-500" />
              {customer.phone || 'None Provided'}
            </span>
          </div>
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-slate-800 mt-5 text-xs text-slate-400">
          <div className="space-y-1">
            <span className="text-slate-500 block text-[11px] uppercase font-semibold flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Registered Billing Address
            </span>
            <p className="text-slate-300 whitespace-pre-wrap">{customer.billing_address || 'No billing address recorded.'}</p>
            <p className="text-slate-500 text-[11px]">
              State: {customer.state ? `${customer.state}${customer.state_code ? ` (Code: ${customer.state_code})` : ''}` : 'Not Specified'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 block text-[11px] uppercase font-semibold flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Shipping / Worksite Address
            </span>
            <p className="text-slate-300 whitespace-pre-wrap">
              {customer.shipping_address || 'Same as billing address or designated per order / quotation.'}
            </p>
          </div>
        </div>

        {customer.notes && (
          <div className="mt-5 pt-4 border-t border-slate-800 text-xs">
            <span className="text-slate-500 block text-[11px] uppercase font-semibold">Internal Remarks / Terms</span>
            <p className="text-slate-300 mt-1 whitespace-pre-wrap">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* Downstream Operations Modules Link Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <FileSpreadsheet className="w-4 h-4 text-gold-400" />
              <span>Customer Quotations</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Stage 3C Ready
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Direct tender and machinery quotation drafts associated with this customer will appear here.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>GST Invoices & Billing</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Stage 3D Ready
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Statutory tax invoices and payment ledgers associated with this customer will appear here.
          </p>
        </div>
      </div>

      {/* Audit History Timeline */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <History className="w-4 h-4 text-gold-500" />
            <span>Audit History</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">Immutable Records</span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">No historical mutations logged for this customer record.</p>
        ) : (
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-mono text-gold-400 uppercase text-[11px] font-semibold">{log.action}</span>
                  {log.new_state && (
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {JSON.stringify(log.new_state)}
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                  {new Date(log.created_at).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
