'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resolveIndianState, formatPlaceOfSupply } from '@/lib/utils/indian-states';
import { determineTaxStatus } from '@/lib/quotation/calculations';
import { Trash2 } from 'lucide-react';
import {
  FileText,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  XCircle,
  Copy,
  ChevronDown,
  Phone,
  Mail,
  UserCheck,
  History,
  FileSpreadsheet,
  FileEdit,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import {
  issueQuotationAction,
  reviseQuotationAction,
  recordQuotationAcceptanceAction,
  updateQuotationStatusAction,
  recordQuotationDeliveryAction,
  discardDraftQuotationAction,
} from '@/lib/quotation/actions';
import { convertNumberToIndianWords } from '@/lib/quotation/calculations';
import { formatIndianDate, formatIndianDateTime } from '@/lib/utils/date';
import { formatIndianRupee } from '@/lib/utils/currency';
import { TaxBreakdownCard, type RateTaxSummary } from '@/components/ui/TaxBreakdownCard';
import type { QuotationStatus, StaffRole } from '@/types/database';

interface QuotationDetailViewProps {
  quotation: any;
  userRole: StaffRole;
}

export default function QuotationDetailView({ quotation, userRole }: QuotationDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeVersionNumber, setActiveVersionNumber] = useState(quotation.current_version_number);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  // Acceptance Form State
  const [acceptContactName, setAcceptContactName] = useState(quotation.customers?.primary_contact_person || '');
  const [acceptChannel, setAcceptChannel] = useState('phone');
  const [acceptPoRef, setAcceptPoRef] = useState('');
  const [acceptNotes, setAcceptNotes] = useState('');

  // Delivery Modal State
  const [deliveryChannel, setDeliveryChannel] = useState('email');
  const [deliveryEmail, setDeliveryEmail] = useState(quotation.customers?.email || '');
  const [deliveryPhone, setDeliveryPhone] = useState(quotation.customers?.phone || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const versions = quotation.quotation_versions || [];
  const activeVersion =
    versions.find((v: any) => v.version_number === activeVersionNumber) ||
    versions[versions.length - 1] ||
    {};

  const lineItems = activeVersion.quotation_items || [];
  const customer = quotation.customers || {};
  const acceptances = quotation.quotation_acceptances || [];
  const deliveryLogs = quotation.quotation_delivery_logs || [];

  const isCurrentVersion = activeVersionNumber === quotation.current_version_number;
  // Supplier base state is Bihar (10). Resolved against Indian states dictionary.
  const supplyState = resolveIndianState(quotation.place_of_supply_state_code);
  const isIntraState = supplyState?.code === '10';
  const placeOfSupplyFormatted = formatPlaceOfSupply(quotation.place_of_supply_state_code);
  const canEdit = ['super_admin', 'admin', 'estimator', 'billing_manager'].includes(userRole);
  const isDraftEditable = quotation.status === 'draft' && isCurrentVersion && !activeVersion.is_locked;

  // Status badge styling
  const statusColors: Record<string, string> = {
    draft: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    issued: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    revised: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    accepted: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    rejected: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    expired: 'bg-slate-700 text-slate-300 border-slate-600',
    cancelled: 'bg-red-500/20 text-red-300 border-red-500/40',
    converted_to_invoice: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  };

  const handleIssue = () => {
    if (!confirm('Are you sure you want to officially issue this quotation? Line items will be permanently locked.')) return;
    setError(null);
    startTransition(async () => {
      const res = await issueQuotationAction(quotation.id);
      if (res.error) setError(res.error);
    });
  };

  const handleRevise = () => {
    if (!confirm('Create a new revision for this quotation? Current version will be locked as historical snapshot.')) return;
    setError(null);
    startTransition(async () => {
      const res = await reviseQuotationAction(quotation.id);
      if (res.error) setError(res.error);
    });
  };

  const handleAcceptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.append('quotationId', quotation.id);
    formData.append('contactName', acceptContactName);
    formData.append('acceptanceChannel', acceptChannel);
    if (acceptPoRef) formData.append('clientPoReference', acceptPoRef);
    if (acceptNotes) formData.append('staffNotes', acceptNotes);

    startTransition(async () => {
      const res = await recordQuotationAcceptanceAction(null, formData);
      if (res.error) {
        setError(res.error);
      } else {
        setShowAcceptModal(false);
      }
    });
  };

  const handleDeliverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await recordQuotationDeliveryAction(quotation.id, deliveryChannel as any, {
        recipientEmail: deliveryEmail,
        recipientPhone: deliveryPhone,
        notes: deliveryNotes,
      });
      if (res.error) {
        setError(res.error);
      } else {
        setShowDeliveryModal(false);
      }
    });
  };

  const handleDiscardDraft = () => {
    if (!confirm('Are you sure you want to discard this draft quotation? All draft line items and revision records will be permanently removed.')) return;
    setError(null);
    startTransition(async () => {
      const res = await discardDraftQuotationAction(quotation.id);
      if (res.error) {
        setError(res.error);
      } else {
        router.push('/staff/quotations');
      }
    });
  };

  const handleStatusChange = (newStatus: QuotationStatus) => {
    const reason = prompt(`Enter reason for marking this quotation as ${newStatus}:`);
    if (reason === null) return;
    setError(null);
    startTransition(async () => {
      const res = await updateQuotationStatusAction(quotation.id, newStatus, reason);
      if (res.error) setError(res.error);
    });
  };

  // Group line items for tax rate breakdown in TaxBreakdownCard
  const rateBreakdownMap = new Map<number, { taxableAmount: number; taxAmount: number }>();
  lineItems.forEach((it: any) => {
    const rate = Number(it.gst_rate) || 0;
    const taxable = Number(it.taxable_amount) || 0;
    const tax = Number(it.tax_amount) || 0;
    const prev = rateBreakdownMap.get(rate) || { taxableAmount: 0, taxAmount: 0 };
    rateBreakdownMap.set(rate, {
      taxableAmount: prev.taxableAmount + taxable,
      taxAmount: prev.taxAmount + tax,
    });
  });

  const rateBreakdowns: RateTaxSummary[] = Array.from(rateBreakdownMap.entries()).map(([rate, vals]) => ({
    gstRate: rate,
    taxableAmount: vals.taxableAmount,
    cgstAmount: isIntraState ? vals.taxAmount / 2 : 0,
    sgstAmount: isIntraState ? vals.taxAmount / 2 : 0,
    igstAmount: !isIntraState ? vals.taxAmount : 0,
    totalTax: vals.taxAmount,
  }));

  const totalTaxAmount = Number(activeVersion.total_tax_amount || 0);
  const cgstAmount = isIntraState ? totalTaxAmount / 2 : 0;
  const sgstAmount = isIntraState ? totalTaxAmount / 2 : 0;
  const igstAmount = !isIntraState ? totalTaxAmount : 0;

  return (
    <div className="space-y-6 max-w-6xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Action failed</h4>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Header Bar — High Contrast Dark Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/staff/quotations"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Back to Quotations"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{quotation.quotation_number}</h1>
              <span
                className={`text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                  statusColors[quotation.status] || 'bg-slate-700 text-slate-300'
                }`}
              >
                {quotation.status.replace('_', ' ')}
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono">
                {activeVersion.version_code || `V${activeVersionNumber}`}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Client: <strong className="text-slate-200">{customer.company_name}</strong> • Place of Supply: State{' '}
              <span className="font-mono text-gold-400">{quotation.place_of_supply_state_code || 'Unspecified'}</span>{' '}
              ({isIntraState ? 'Bihar / Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}) • Created:{' '}
              {formatIndianDate(quotation.created_at)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* BUG-020: Edit Draft Quotation */}
          {isDraftEditable && canEdit && (
            <Link
              href={`/staff/quotations/${quotation.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gold-400 hover:bg-gold-300 text-slate-900 rounded-lg text-xs font-bold transition shadow-sm"
            >
              <FileEdit className="w-3.5 h-3.5" />
              Edit Draft
            </Link>
          )}

          {!isDraftEditable && quotation.status !== 'draft' && (
            <div
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800/80 border border-slate-700 text-slate-400 rounded-lg text-xs"
              title="Issued quotations are immutable snapshots. Create a new revision to change commercial terms."
            >
              <Lock className="w-3 h-3 text-slate-500" />
              <span>Locked Snapshot</span>
            </div>
          )}

          <Link
            href={`/staff/quotations/${quotation.id}/pdf`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF / Print View
          </Link>

          <button
            onClick={() => setShowDeliveryModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <Send className="w-3.5 h-3.5" />
            Log Delivery
          </button>

          {quotation.status === 'draft' && isCurrentVersion && canEdit && (
            <button
              onClick={handleDiscardDraft}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-200 border border-rose-700/60 rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              Discard Draft
            </button>
          )}

          {quotation.status === 'draft' && isCurrentVersion && canEdit && (
            <button
              onClick={handleIssue}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isPending ? 'Issuing...' : 'Issue Quotation'}
            </button>
          )}

          {(quotation.status === 'issued' || quotation.status === 'revised') && isCurrentVersion && canEdit && (
            <>
              <button
                onClick={() => setShowAcceptModal(true)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Record Acceptance
              </button>

              <button
                onClick={handleRevise}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 shadow transition disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" />
                Create Revision (R{quotation.current_version_number})
              </button>

              <button
                onClick={() => handleStatusChange('rejected')}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold transition"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject
              </button>
            </>
          )}

          {quotation.status !== 'cancelled' && quotation.status !== 'accepted' && canEdit && (
            <button
              onClick={() => handleStatusChange('cancelled')}
              disabled={isPending}
              className="px-2.5 py-2 text-slate-400 hover:text-red-400 text-xs font-medium"
            >
              Cancel Quote
            </button>
          )}
        </div>
      </div>

      {/* Version Selector Bar (If multiple versions exist) */}
      {versions.length > 1 && (
        <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-purple-300 font-semibold">
            <History className="w-4 h-4 text-purple-400" />
            <span>Revision History ({versions.length} versions generated):</span>
          </div>

          <div className="flex items-center gap-2">
            {versions.map((v: any) => (
              <button
                key={v.id}
                onClick={() => setActiveVersionNumber(v.version_number)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  activeVersionNumber === v.version_number
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-900 text-purple-300 hover:bg-slate-800 border border-purple-500/30'
                }`}
              >
                {v.version_code || `R${v.version_number - 1}`}
                {v.version_number === quotation.current_version_number && ' (Latest)'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quotation Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Information Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-xs space-y-3">
          <h3 className="font-bold text-[#10243B] uppercase tracking-wider text-[11px] pb-2 border-b border-slate-100">
            Client Details
          </h3>
          <div>
            <p className="text-sm font-bold text-slate-900">{customer.company_name}</p>
            <p className="text-slate-600 font-medium">Attn: {customer.primary_contact_person || 'Purchasing Department'}</p>
            {customer.billing_address && (
              <p className="text-slate-500 mt-1 whitespace-pre-line leading-relaxed">{customer.billing_address}</p>
            )}
          </div>
          <div className="space-y-1 text-slate-600 pt-2 border-t border-slate-100">
            {customer.gstin && <p><span className="font-semibold text-slate-700">GSTIN:</span> <span className="font-mono">{customer.gstin}</span></p>}
            {customer.pan && <p><span className="font-semibold text-slate-700">PAN:</span> <span className="font-mono">{customer.pan}</span></p>}
            {customer.phone && <p><span className="font-semibold text-slate-700">Phone:</span> {customer.phone}</p>}
            {customer.email && <p><span className="font-semibold text-slate-700">Email:</span> {customer.email}</p>}
          </div>
        </div>

        {/* Commercial Terms Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-xs space-y-2.5">
          <h3 className="font-bold text-[#10243B] uppercase tracking-wider text-[11px] pb-2 border-b border-slate-100">
            Commercial Parameters
          </h3>
          <p><span className="font-semibold text-slate-700">Place of Supply:</span> <span className="font-medium text-slate-900">{placeOfSupplyFormatted}</span> {!supplyState && quotation.is_gst_applicable ? <span className="text-amber-600 font-semibold">(Pending Determination)</span> : ''}</p>
          <p><span className="font-semibold text-slate-700">Delivery Destination:</span> {activeVersion.delivery_location || 'Ex-Works / Unspecified'}</p>
          <p><span className="font-semibold text-slate-700">Payment Terms:</span> {activeVersion.payment_terms || 'Standard 30 Days'}</p>
          <p>
            <span className="font-semibold text-slate-700">Validity:</span> {activeVersion.validity_days || 30} Days (Expires:{' '}
            {activeVersion.expires_at ? formatIndianDate(activeVersion.expires_at) : '30 days from issue'})
          </p>
          <p>
            <span className="font-semibold text-slate-700">Lock Status:</span>{' '}
            {activeVersion.is_locked ? (
              <span className="text-blue-700 font-semibold">Locked Snapshot</span>
            ) : (
              <span className="text-amber-700 font-semibold">Editable Draft</span>
            )}
          </p>
        </div>

        {/* Quick Grand Total Card */}
        <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 shadow-sm text-xs space-y-2 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gold-400 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
              Quotation Total
            </h3>
            <div className="space-y-1.5 mt-2">
              <div className="flex justify-between text-slate-400">
                <span>Taxable Value:</span>
                <span className="font-mono text-slate-200">{formatIndianRupee(activeVersion.taxable_amount || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total GST:</span>
                <span className="font-mono text-slate-200">{formatIndianRupee(activeVersion.total_tax_amount || 0)}</span>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400">Grand Total (Rounded):</span>
            <p className="text-xl font-bold text-gold-400 font-mono">
              {formatIndianRupee(activeVersion.grand_total_amount || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
          <span>Itemized Products & Services ({lineItems.length} items)</span>
          <span className="text-xs text-slate-500 font-mono">Snapshot: {activeVersion.version_code || 'V1'}</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-[850px] w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="py-2.5 px-3 font-semibold text-center w-10">#</th>
                <th className="py-2.5 px-3 font-semibold min-w-[200px]">Item & Details</th>
                <th className="py-2.5 px-3 font-semibold text-center w-24">HSN/SAC</th>
                <th className="py-2.5 px-3 font-semibold text-right w-20">Qty</th>
                <th className="py-2.5 px-3 font-semibold text-center w-16">Unit</th>
                <th className="py-2.5 px-3 font-semibold text-right w-28">Rate (₹)</th>
                <th className="py-2.5 px-3 font-semibold text-right w-24">Discount</th>
                <th className="py-2.5 px-3 font-semibold text-right w-28">Taxable (₹)</th>
                <th className="py-2.5 px-3 font-semibold text-right w-24">GST (₹)</th>
                <th className="py-2.5 px-3 font-semibold text-right w-32">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lineItems.map((item: any, idx: number) => (
                <tr key={item.id || idx} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-slate-900">{item.item_name}</p>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600 font-mono">{item.hsn_sac_code || '—'}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-900 font-mono">{Number(item.quantity).toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-center text-slate-600 uppercase">{item.unit}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                    {formatIndianRupee(item.unit_rate || 0)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                    {Number(item.discount_amount) > 0 ? formatIndianRupee(item.discount_amount) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                    {formatIndianRupee(item.taxable_amount || 0)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                    {formatIndianRupee(item.tax_amount || 0)}
                    <span className="block text-[10px] text-slate-400 font-sans">@{item.gst_rate}%</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatIndianRupee(item.line_total || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statutory Tax Breakdown Card (BUG-028) */}
      <TaxBreakdownCard
        title="Quotation Statutory Tax & Financial Summary"
        subtotalAmount={Number(activeVersion.taxable_amount || 0)}
        discountAmount={0}
        taxableAmount={Number(activeVersion.taxable_amount || 0)}
        cgstAmount={cgstAmount}
        sgstAmount={sgstAmount}
        igstAmount={igstAmount}
        totalTaxAmount={totalTaxAmount}
        roundOffAmount={Number(activeVersion.round_off_amount || 0)}
        grandTotalAmount={Number(activeVersion.grand_total_amount || 0)}
        amountInWords={convertNumberToIndianWords(activeVersion.grand_total_amount || 0)}
        isGstApplicable={quotation.is_gst_applicable}
        taxDetermination={determineTaxStatus(quotation.is_gst_applicable, quotation.place_of_supply_state_code, '10')}
        rateBreakdown={rateBreakdowns}
        isDark={false}
      />

      {/* Acceptance Record Section (If accepted) */}
      {acceptances.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-sm text-xs space-y-2">
          <h3 className="font-bold text-emerald-900 uppercase tracking-wider text-[11px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            Client Acceptance Confirmation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-emerald-950 pt-2 border-t border-emerald-200">
            <div>
              <span className="text-emerald-700 font-semibold">Accepted By:</span> {acceptances[0].accepted_by_contact_name}
            </div>
            <div>
              <span className="text-emerald-700 font-semibold">Channel:</span> {acceptances[0].acceptance_channel}
            </div>
            <div>
              <span className="text-emerald-700 font-semibold">PO Reference:</span> {acceptances[0].client_po_reference || 'N/A'}
            </div>
            {acceptances[0].staff_notes && (
              <div className="md:col-span-3 text-emerald-800 italic">
                Notes: {acceptances[0].staff_notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Acceptance Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Client Acceptance</h3>
              <button
                onClick={() => setShowAcceptModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAcceptSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Accepting Client Name / Signatory <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={acceptContactName}
                  onChange={(e) => setAcceptContactName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Confirmation Channel <span className="text-red-500">*</span>
                </label>
                <select
                  value={acceptChannel}
                  onChange={(e) => setAcceptChannel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm text-slate-900"
                >
                  <option value="phone">Phone Confirmation</option>
                  <option value="whatsapp">WhatsApp Written Confirmation</option>
                  <option value="email">Email Confirmation / Work Order</option>
                  <option value="in_person">In-Person Signed Agreement</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Client PO Reference / Work Order # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO/2026/SA/089"
                  value={acceptPoRef}
                  onChange={(e) => setAcceptPoRef(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Staff Internal Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Client agreed on 30-day payment cycle, advance token received."
                  value={acceptNotes}
                  onChange={(e) => setAcceptNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAcceptModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700"
                >
                  Confirm Acceptance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Log Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Log Quotation Delivery</h3>
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeliverySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Delivery Channel <span className="text-red-500">*</span>
                </label>
                <select
                  value={deliveryChannel}
                  onChange={(e) => setDeliveryChannel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm text-slate-900"
                >
                  <option value="email">Email Transmission</option>
                  <option value="whatsapp">WhatsApp PDF Transmission</option>
                  <option value="phone">Phone Discussion / Quoted</option>
                  <option value="in_person">In-Person Handover / Printed</option>
                  <option value="download">Direct Staff PDF Download</option>
                </select>
              </div>

              {deliveryChannel === 'email' && (
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    value={deliveryEmail}
                    onChange={(e) => setDeliveryEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              )}

              {deliveryChannel === 'whatsapp' && (
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Recipient Phone Number
                  </label>
                  <input
                    type="text"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Delivery Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sent PDF to managing director via email."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-[#10243B] text-white rounded font-semibold hover:bg-slate-800"
                >
                  Log Delivery Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
