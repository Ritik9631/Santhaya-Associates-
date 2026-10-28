'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import {
  issueQuotationAction,
  reviseQuotationAction,
  recordQuotationAcceptanceAction,
  updateQuotationStatusAction,
  recordQuotationDeliveryAction,
} from '@/lib/quotation/actions';
import { convertNumberToIndianWords } from '@/lib/quotation/calculations';
import type { QuotationStatus, StaffRole } from '@/types/database';

interface QuotationDetailViewProps {
  quotation: any;
  userRole: StaffRole;
}

export default function QuotationDetailView({ quotation, userRole }: QuotationDetailViewProps) {
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
  const isIntraState = quotation.place_of_supply_state_code === '07';

  // Status badge styling
  const statusColors: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-800 border-amber-300',
    issued: 'bg-blue-100 text-blue-800 border-blue-300',
    revised: 'bg-purple-100 text-purple-800 border-purple-300',
    accepted: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    rejected: 'bg-rose-100 text-rose-800 border-rose-300',
    expired: 'bg-slate-200 text-slate-700 border-slate-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
    converted_to_invoice: 'bg-indigo-100 text-indigo-800 border-indigo-300',
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

  const handleStatusChange = (newStatus: QuotationStatus) => {
    const reason = prompt(`Enter reason for marking this quotation as ${newStatus}:`);
    if (reason === null) return;
    setError(null);
    startTransition(async () => {
      const res = await updateQuotationStatusAction(quotation.id, newStatus, reason);
      if (res.error) setError(res.error);
    });
  };

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

      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{quotation.quotation_number}</h1>
            <span
              className={`text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${
                statusColors[quotation.status] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {quotation.status.replace('_', ' ')}
            </span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
              Version: {activeVersion.version_code || `V${activeVersionNumber}`}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Client: <strong className="text-slate-800">{customer.company_name}</strong> | Place of Supply: State{' '}
            <span className="font-mono">{quotation.place_of_supply_state_code}</span> ({isIntraState ? 'Delhi / Intra-State' : 'Inter-State'})
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/staff/quotations/${quotation.id}/pdf`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF / Print View
          </Link>

          <button
            onClick={() => setShowDeliveryModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
          >
            <Send className="w-3.5 h-3.5" />
            Log Delivery
          </button>

          {quotation.status === 'draft' && isCurrentVersion && (
            <button
              onClick={handleIssue}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#10243B] text-white rounded-lg text-xs font-semibold hover:bg-slate-800 shadow transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Issue Quotation
            </button>
          )}

          {(quotation.status === 'issued' || quotation.status === 'revised') && isCurrentVersion && (
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
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 shadow transition disabled:opacity-50"
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

          {quotation.status !== 'cancelled' && quotation.status !== 'accepted' && (
            <button
              onClick={() => handleStatusChange('cancelled')}
              disabled={isPending}
              className="px-2.5 py-2 text-slate-500 hover:text-red-700 text-xs font-medium"
            >
              Cancel Quote
            </button>
          )}
        </div>
      </div>

      {/* Version Selector Bar (If multiple versions exist) */}
      {versions.length > 1 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-purple-900 font-semibold">
            <History className="w-4 h-4 text-purple-700" />
            <span>Revision History ({versions.length} versions generated):</span>
          </div>

          <div className="flex items-center gap-2">
            {versions.map((v: any) => (
              <button
                key={v.id}
                onClick={() => setActiveVersionNumber(v.version_number)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  activeVersionNumber === v.version_number
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'bg-white text-purple-800 hover:bg-purple-100 border border-purple-200'
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
            <p className="text-slate-600 font-medium">Attn: {customer.primary_contact_person}</p>
            {customer.billing_address && (
              <p className="text-slate-500 mt-1 whitespace-pre-line">{customer.billing_address}</p>
            )}
          </div>
          <div className="space-y-1 text-slate-600 pt-2 border-t border-slate-100">
            {customer.gstin && <p><span className="font-semibold text-slate-700">GSTIN:</span> {customer.gstin}</p>}
            {customer.pan && <p><span className="font-semibold text-slate-700">PAN:</span> {customer.pan}</p>}
            {customer.phone && <p><span className="font-semibold text-slate-700">Phone:</span> {customer.phone}</p>}
            {customer.email && <p><span className="font-semibold text-slate-700">Email:</span> {customer.email}</p>}
          </div>
        </div>

        {/* Commercial Terms Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-xs space-y-2.5">
          <h3 className="font-bold text-[#10243B] uppercase tracking-wider text-[11px] pb-2 border-b border-slate-100">
            Commercial Parameters
          </h3>
          <p><span className="font-semibold text-slate-700">Delivery Destination:</span> {activeVersion.delivery_location}</p>
          <p><span className="font-semibold text-slate-700">Payment Terms:</span> {activeVersion.payment_terms}</p>
          <p>
            <span className="font-semibold text-slate-700">Validity:</span> {activeVersion.validity_days} Days (Expires:{' '}
            {activeVersion.expires_at})
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

        {/* Totals Quick Card */}
        <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-5 shadow-sm text-xs space-y-2 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-[#F4B323] uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
              Quotation Financial Total
            </h3>
            <div className="space-y-1.5 mt-2">
              <div className="flex justify-between text-slate-400">
                <span>Taxable Value:</span>
                <span>₹{Number(activeVersion.taxable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total GST:</span>
                <span>₹{Number(activeVersion.total_tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400">Grand Total (Rounded):</span>
            <p className="text-xl font-bold text-[#F4B323]">
              ₹{Number(activeVersion.grand_total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
          <span>Itemized Products & Services ({lineItems.length} items)</span>
          <span className="text-xs text-slate-500 font-mono">Snapshot: {activeVersion.version_code}</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="py-2 px-3 font-semibold text-center w-10">#</th>
                <th className="py-2 px-3 font-semibold">Item & Details</th>
                <th className="py-2 px-3 font-semibold text-center w-20">HSN/SAC</th>
                <th className="py-2 px-3 font-semibold text-center w-16">Qty</th>
                <th className="py-2 px-3 font-semibold text-center w-16">Unit</th>
                <th className="py-2 px-3 font-semibold text-right w-24">Rate (₹)</th>
                <th className="py-2 px-3 font-semibold text-right w-20">Discount</th>
                <th className="py-2 px-3 font-semibold text-right w-24">Taxable (₹)</th>
                <th className="py-2 px-3 font-semibold text-right w-24">GST (₹)</th>
                <th className="py-2 px-3 font-semibold text-right w-28">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lineItems.map((item: any, idx: number) => (
                <tr key={item.id || idx} className="hover:bg-slate-50/60">
                  <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <p className="font-semibold text-slate-900">{item.item_name}</p>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-600 font-mono">{item.hsn_sac_code || '—'}</td>
                  <td className="py-2 px-3 text-center font-medium text-slate-900">{Number(item.quantity).toFixed(2)}</td>
                  <td className="py-2 px-3 text-center text-slate-600 uppercase">{item.unit}</td>
                  <td className="py-2 px-3 text-right font-medium text-slate-900">
                    ₹{Number(item.unit_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600">
                    {Number(item.discount_amount) > 0 ? `₹${Number(item.discount_amount).toFixed(2)}` : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-slate-900">
                    ₹{Number(item.taxable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-700">
                    ₹{Number(item.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    <span className="block text-[10px] text-slate-400">@{item.gst_rate}%</span>
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">
                    ₹{Number(item.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

