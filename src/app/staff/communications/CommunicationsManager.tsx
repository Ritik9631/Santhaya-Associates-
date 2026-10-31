'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Send,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Skull,
  ShieldCheck,
  Filter,
  FileSpreadsheet,
  Receipt,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import {
  triggerOutboxWorkerAction,
  retryOutboxJobAction,
} from '@/lib/communications/actions';
import type { StaffRole } from '@/types/database';

interface CommunicationsManagerProps {
  initialJobs: any[];
  quotationLogs: any[];
  dailySent: number;
  dailyLimit: number;
  providerName: string;
  currentUserRole: StaffRole;
}

export default function CommunicationsManager({
  initialJobs,
  quotationLogs,
  dailySent,
  dailyLimit,
  providerName,
  currentUserRole,
}: CommunicationsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canManage = ['super_admin', 'admin', 'billing_manager'].includes(currentUserRole);

  // Compute KPI metrics
  const totalJobs = initialJobs.length;
  const sentJobs = initialJobs.filter((j) => j.status === 'sent').length;
  const pendingJobs = initialJobs.filter((j) => j.status === 'pending' || j.status === 'processing').length;
  const failedJobs = initialJobs.filter((j) => j.status === 'failed' || j.status === 'dead_letter').length;

  const handleTriggerWorker = () => {
    setActionMessage(null);
    startTransition(async () => {
      const res = await triggerOutboxWorkerAction();
      if (res.error) {
        setActionMessage({ type: 'error', text: res.error });
      } else if (res.data) {
        const d = res.data;
        setActionMessage({
          type: 'success',
          text: `Worker completed: ${d.processed} processed, ${d.succeeded} dispatched, ${d.failed} failed, ${d.reaped} stale recovered.`,
        });
        router.refresh();
      }
    });
  };

  const handleRetryJob = (jobId: string) => {
    setActionMessage(null);
    startTransition(async () => {
      const res = await retryOutboxJobAction(jobId);
      if (res.error) {
        setActionMessage({ type: 'error', text: res.error });
      } else {
        setActionMessage({ type: 'success', text: 'Job reset to pending status for immediate retry.' });
        router.refresh();
      }
    });
  };

  // Filtered jobs
  const filteredJobs = initialJobs.filter((job) => {
    if (filterStatus !== 'all' && job.status !== filterStatus) return false;
    if (filterType === 'enquiries' && !job.email_type.includes('enquiry')) return false;
    if (filterType === 'quotations' && !job.email_type.includes('quotation')) return false;
    if (filterType === 'invoices' && !job.email_type.includes('invoice')) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Trigger */}
      <div className="bg-gradient-to-r from-slate-900 via-navy-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold-500/20 text-gold-400 border border-gold-500/30">
              <Mail className="w-3.5 h-3.5" />
              Stage 4 Communications Hub
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Provider: <strong className="text-slate-200 capitalize">{providerName}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Client & Staff Communications Center
          </h1>
          <p className="mt-1 text-xs text-slate-300 max-w-2xl leading-relaxed">
            Durable transactional email outbox, automated client quotation & invoice transmissions, manual phone/WhatsApp logs, and Resend delivery safeguards.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {canManage && (
            <button
              onClick={handleTriggerWorker}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-slate-950 text-xs font-bold transition shadow-lg shadow-gold-500/10 disabled:opacity-60"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
              <span>{isPending ? 'Executing Worker...' : 'Process Outbox Now'}</span>
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs leading-relaxed">{actionMessage.text}</div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sent Tile */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Dispatched / Sent</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{sentJobs}</div>
          <div className="text-[11px] text-emerald-400 font-mono">100% verified deliveries</div>
        </div>

        {/* Pending Queue Tile */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">In Queue / Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{pendingJobs}</div>
          <div className="text-[11px] text-amber-400 font-mono">Awaiting scheduled cron or manual dispatch</div>
        </div>

        {/* Failed / Dead-Letter Tile */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Failed / Dead Letter</span>
            <Skull className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white">{failedJobs}</div>
          <div className="text-[11px] text-rose-400 font-mono">
            {failedJobs > 0 ? 'Retry eligible' : 'Zero dead-lettered jobs'}
          </div>
        </div>

        {/* Free-Tier Quota Tile */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Daily Quota Usage</span>
            <ShieldCheck className="w-4 h-4 text-gold-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {dailySent} <span className="text-xs font-normal text-slate-400">/ {dailyLimit} sent</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-gold-400 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (dailySent / dailyLimit) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          {/* Category Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mr-1">Category:</span>
            {[
              { id: 'all', label: 'All Jobs' },
              { id: 'enquiries', label: 'Inquiries' },
              { id: 'quotations', label: 'Quotations' },
              { id: 'invoices', label: 'Tax Invoices' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterType(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  filterType === cat.id
                    ? 'bg-gold-400 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-gold-400 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="dead_letter">Dead Letter</option>
            </select>
          </div>
        </div>
      </div>

      {/* Outbox Dispatch Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-gold-400" />
            Outbox Dispatch Ledger ({filteredJobs.length} records)
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">
            Optimistic row checkout & exponential retry backoff active
          </span>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">No outbox jobs match the selected filter.</p>
            <p>New customer inquiries, quotation dispatches, and invoice emails will be recorded here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/90 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Recipient</th>
                  <th className="py-3 px-4 font-semibold">Subject / Details</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Attempts</th>
                  <th className="py-3 px-4 font-semibold">Logged At</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-semibold">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {job.email_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200">
                      {job.recipient_email}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-300" title={job.subject}>
                      {job.subject}
                      {job.error_message && (
                        <div className="text-rose-400 text-[10px] truncate" title={job.error_message}>
                          Error: {job.error_message}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          job.status === 'sent'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : job.status === 'failed' || job.status === 'dead_letter'
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {job.attempts} / {job.max_attempts || 5}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(job.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {(job.status === 'failed' || job.status === 'dead_letter') && canManage && (
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-semibold border border-slate-700 transition"
                        >
                          <RotateCw className="w-3 h-3 text-gold-400" />
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Delivery Logs Summary (Phone / WhatsApp / In-Person) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            Manual Client Delivery Logs ({quotationLogs.length} records)
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">
            Phone, WhatsApp, & In-person handovers for customers without email
          </span>
        </div>

        {quotationLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No manual delivery records logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/90 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Channel</th>
                  <th className="py-3 px-4 font-semibold">Recipient Contact</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Recorded By</th>
                  <th className="py-3 px-4 font-semibold">Logged At</th>
                  <th className="py-3 px-4 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {quotationLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-gold-400 uppercase text-[11px]">
                      {log.delivery_channel}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200">
                      {log.recipient_phone || log.recipient_email || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        {log.delivery_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {log.staff_profiles?.full_name || 'Staff Member'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(log.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-slate-400 italic">
                      {log.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

