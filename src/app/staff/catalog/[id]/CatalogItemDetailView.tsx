'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toggleCatalogItemStatusAction } from '@/lib/catalog/actions';
import {
  Package,
  Edit2,
  CheckCircle2,
  XCircle,
  Tag,
  Percent,
  History,
  AlertTriangle,
  Loader2,
  Cpu,
} from 'lucide-react';

interface CatalogItemDetailViewProps {
  item: {
    id: string;
    sku: string;
    name: string;
    category: string;
    item_type: string;
    description?: string | null;
    unit_of_measurement: string;
    default_unit_price: number;
    hsn_sac_code?: string | null;
    applicable_gst_rate: number;
    technical_specifications?: Record<string, unknown>;
    is_active?: boolean;
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

export function CatalogItemDetailView({ item, auditLogs, canEdit }: CatalogItemDetailViewProps) {
  const [isActive, setIsActive] = useState(item.is_active ?? true);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleToggleStatus = async () => {
    setShowConfirm(false);
    setLoading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('itemId', item.id);
    formData.append('isActive', String(!isActive));

    const res = await toggleCatalogItemStatusAction(null, formData);
    setLoading(false);

    if (res.error) {
      setFeedback(res.error);
    } else {
      setIsActive(!isActive);
      setFeedback(`Item ${!isActive ? 'activated' : 'deactivated'} successfully.`);
    }
  };

  const typeLabels: Record<string, string> = {
    product: 'Machinery / Goods',
    service: 'Tender / Civil Service',
    rental: 'Equipment Rental',
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-lg text-gold-400">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-gold-400 text-xs uppercase px-2 py-0.5 rounded bg-gold-500/10 border border-gold-500/30">
                  {item.sku}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-white">{item.name}</h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Category: <span className="text-slate-200 font-medium">{item.category}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Classification</span>
              <span className="text-slate-300 font-semibold">{typeLabels[item.item_type] || item.item_type}</span>
            </div>

            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">Status</span>
              {isActive ? (
                <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </span>
              ) : (
                <span className="text-rose-400 font-semibold inline-flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Inactive
                </span>
              )}
            </div>

            {canEdit && (
              <div className="flex gap-2">
                <Link
                  href={`/staff/catalog/${item.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Item</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                    isActive
                      ? 'bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-800/60'
                      : 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-200 border border-emerald-800/60'
                  }`}
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            )}
          </div>
        </div>

        {feedback && (
          <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-gold-500/30 text-gold-300 text-xs">
            {feedback}
          </div>
        )}

        {/* Pricing & GST Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-6 text-xs text-slate-400">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block text-[11px] uppercase font-semibold">Default Selling / Rental Rate</span>
            <div className="font-mono text-white font-bold text-lg mt-0.5">
              ₹{Number(item.default_unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              <span className="text-xs text-slate-400 font-normal"> / {item.unit_of_measurement}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block text-[11px] uppercase font-semibold">Statutory HSN / SAC Code</span>
            <div className="font-mono text-gold-400 font-bold text-lg mt-0.5">
              {item.hsn_sac_code || 'Unspecified'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block text-[11px] uppercase font-semibold">Applicable GST Tax Rate</span>
            <div className="font-mono text-gold-400 font-bold text-lg mt-0.5 flex items-center gap-1">
              <Percent className="w-4 h-4 text-gold-500" />
              <span>{Number(item.applicable_gst_rate).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {item.description && (
          <div className="mt-5 pt-4 border-t border-slate-800 text-xs">
            <span className="text-slate-500 block text-[11px] uppercase font-semibold">Commercial Description</span>
            <p className="text-slate-300 mt-1 whitespace-pre-wrap">{item.description}</p>
          </div>
        )}

        {/* Technical Specifications */}
        {item.technical_specifications && (
          <div className="mt-5 pt-4 border-t border-slate-800 text-xs space-y-1.5">
            <span className="text-slate-500 block text-[11px] uppercase font-semibold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-gold-400" />
              <span>Technical Specifications</span>
            </span>
            <div className="font-mono text-[11px] text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 whitespace-pre-wrap">
              {JSON.stringify(item.technical_specifications, null, 2)}
            </div>
          </div>
        )}
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
          <p className="text-xs text-slate-400 py-2">No historical mutations logged for this catalog item.</p>
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

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl border border-gold-500/30 bg-slate-900 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-gold-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-sm font-bold text-white">
                Confirm Item {isActive ? 'Deactivation' : 'Activation'}
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to {isActive ? 'deactivate' : 'activate'}{' '}
              <strong>{item.name}</strong> ({item.sku})?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                className="px-4 py-1.5 rounded-lg bg-gold-400 hover:bg-gold-300 text-slate-900 font-semibold text-xs transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

