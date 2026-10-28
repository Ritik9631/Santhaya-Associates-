'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  issueInvoiceAction,
  recordPaymentAction,
  cancelInvoiceAction,
} from '@/lib/billing/actions';
import type { StaffRole, PaymentMethod } from '@/types/database';
import {
  Receipt,
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Ban,
  Clock,
  Send,
  Building,
  Calendar,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface InvoiceDetailViewProps {
  invoice: any;
  items: any[];
  payments: any[];
  linkedQuotation: any | null;
  currentUserRole: StaffRole;
}

export default function InvoiceDetailView({
  invoice,
  items,
  payments,
  linkedQuotation,
  currentUserRole,
}: InvoiceDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState(invoice.balance_amount.toString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionReference, setTransactionReference] = useState('');
  const [bankName, setBankName] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Cancel Form
  const [cancelReason, setCancelReason] = useState('');

  const canManage = ['super_admin', 'admin', 'billing_manager'].includes(currentUserRole);

  const statusColors: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-800 border-amber-300',
    issued: 'bg-blue-100 text-blue-800 border-blue-300',
    partially_paid: 'bg-purple-100 text-purple-800 border-purple-300',
    paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    overdue: 'bg-rose-100 text-rose-800 border-rose-300',
    cancelled: 'bg-slate-200 text-slate-700 border-slate-300',
    refunded: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  };

  const isOverdue =
    invoice.balance_amount > 0 &&
    new Date(invoice.due_date) < new Date() &&
    invoice.status !== 'cancelled' &&
    invoice.status !== 'draft';

  const displayStatus = isOverdue ? 'overdue' : invoice.status;

  // Handle Formal Issue
  const handleIssue = async () => {
    if (!confirm('Formally issue this invoice? A gapless statutory invoice number (Rule 46(b)) will be allocated.')) {
      return;
    }
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('invoiceId', invoice.id);
      const res = await issueInvoiceAction(null, formData);
      if (res.error) {
        setServerError(res.error);
      } else {
        router.refresh();
      }
    });
  };

  // Handle Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('invoiceId', invoice.id);
      formData.append('amount', paymentAmount);
      formData.append('paymentMethod', paymentMethod);
      formData.append('paymentDate', paymentDate);
      formData.append('transactionReference', transactionReference);
      formData.append('bankName', bankName);
      formData.append('notes', paymentNotes);

      const res = await recordPaymentAction(null, formData);
      if (res.error) {
        setServerError(res.error);
      } else {
        setShowPaymentModal(false);
        router.refresh();
      }
    });
  };

  // Handle Cancel Invoice
  const handleCancelInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('invoiceId', invoice.id);
      formData.append('reason', cancelReason);

      const res = await cancelInvoiceAction(null, formData);
      if (res.error) {
        setServerError(res.error);
      } else {
        setShowCancelModal(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/staff/billing"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {invoice.invoice_number || 'Draft Invoice (Unissued)'}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider ${
                  statusColors[displayStatus] || statusColors.draft
                }`}
              >
                {displayStatus.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Type: <span className="capitalize font-medium text-slate-700">{invoice.invoice_type.replace('_', ' ')}</span> • FY {invoice.financial_year} • Created: {new Date(invoice.created_at).toLocaleDateString('en-IN')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === 'draft' && canManage && (
            <button
              onClick={handleIssue}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold transition shadow-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isPending ? 'Allocating Number...' : 'Issue Invoice'}
            </button>
          )}

          {invoice.status !== 'draft' && invoice.status !== 'cancelled' && invoice.balance_amount > 0 && canManage && (
            <button
              onClick={() => {
                setPaymentAmount(invoice.balance_amount.toString());
                setShowPaymentModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-semibold transition shadow-sm"
            >
              <CreditCard className="w-4 h-4" />
              Record Payment
            </button>
          )}

          <Link
            href={`/staff/billing/${invoice.id}/pdf`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </Link>

          {invoice.status !== 'cancelled' && invoice.paid_amount === 0 && canManage && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1 px-3 py-2 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold transition"
            >
              <Ban className="w-3.5 h-3.5" />
              Void Invoice
            </button>
          )}
        </div>
      </div>

      {serverError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-800 font-medium">{serverError}</div>
        </div>
      )}

      {/* Linked Quotation Banner */}
      {linkedQuotation && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>
              Generated from Quotation: <strong className="font-semibold">{linkedQuotation.quotation_number}</strong>
            </span>
          </div>
          <Link
            href={`/staff/quotations/${linkedQuotation.id}`}
            className="text-blue-700 hover:text-blue-900 font-semibold underline"
          >
            View Original Quotation
          </Link>
        </div>
      )}

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supplier Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Supplier (Santhaya Associates)</p>
          <p className="font-bold text-slate-900 text-sm">{invoice.company_legal_name}</p>
          <p className="text-xs text-slate-600 font-mono">GSTIN: {invoice.company_gstin}</p>
          <p className="text-xs text-slate-600 font-mono">PAN: {invoice.company_pan}</p>
          <p className="text-xs text-slate-500 leading-relaxed">{invoice.company_registered_address}</p>
          <p className="text-xs text-slate-600">State: {invoice.company_state_name} ({invoice.company_state_code})</p>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Billed Customer</p>
          <p className="font-bold text-slate-900 text-sm">{invoice.customer_billing_name}</p>
          <p className="text-xs text-slate-600 font-mono">
            {invoice.customer_gstin ? `GSTIN: ${invoice.customer_gstin}` : 'Unregistered Consumer'}
          </p>
          {invoice.customer_pan && <p className="text-xs text-slate-600 font-mono">PAN: {invoice.customer_pan}</p>}
          <p className="text-xs text-slate-500 leading-relaxed">{invoice.customer_billing_address}</p>
          {invoice.delivery_location && (
            <p className="text-xs text-slate-700">
              <strong>Site Destination:</strong> {invoice.delivery_location}
            </p>
          )}
        </div>

        {/* Financial Balance Summary */}
        <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Settlement Ledger</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Grand Total:</span>
                <span className="font-semibold text-white">
                  ₹{Number(invoice.grand_total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-xs text-emerald-400">
                <span>Total Collected:</span>
                <span className="font-semibold">
                  ₹{Number(invoice.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-slate-800 pt-1 text-amber-400">
                <span>Balance Due:</span>
                <span>
                  ₹{Number(invoice.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>Due Date:</span>
            <span className={isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-200'}>
              {new Date(invoice.due_date).toLocaleDateString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Invoice Line Items</h2>
          <span className="text-xs text-slate-500">{items.length} items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100/60 uppercase font-semibold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Item Description</th>
                <th className="px-4 py-2.5">HSN/SAC</th>
                <th className="px-4 py-2.5 text-right">Qty</th>
                <th className="px-4 py-2.5 text-right">Unit Rate</th>
                <th className="px-4 py-2.5 text-right">Discount</th>
                <th className="px-4 py-2.5 text-right">Taxable</th>
                <th className="px-4 py-2.5 text-right">GST %</th>
                <th className="px-4 py-2.5 text-right">Tax (₹)</th>
                <th className="px-4 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 text-slate-400">{it.sort_order}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {it.item_name}
                    {it.description && <p className="text-[11px] text-slate-400 font-normal">{it.description}</p>}
                  </td>
                  <td className="px-4 py-2 font-mono">{it.hsn_sac_code || '—'}</td>
                  <td className="px-4 py-2 text-right">
                    {Number(it.quantity).toFixed(2)} {it.unit}
                  </td>
                  <td className="px-4 py-2 text-right">
                    ₹{Number(it.unit_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-right text-emerald-700">
                    {it.discount_amount > 0 ? `₹${Number(it.discount_amount).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    ₹{Number(it.taxable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-right">{it.gst_rate}%</td>
                  <td className="px-4 py-2 text-right">
                    ₹{Number(it.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-900">
                    ₹{Number(it.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-medium text-slate-800 border-t border-slate-200">
              <tr>
                <td colSpan={6} className="px-4 py-2 text-right text-slate-500">Totals:</td>
                <td className="px-4 py-2 text-right font-bold">
                  ₹{Number(invoice.taxable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-2 text-right"></td>
                <td className="px-4 py-2 text-right font-bold text-slate-700">
                  ₹{Number(invoice.total_tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-2 text-right font-bold text-emerald-800">
                  ₹{Number(invoice.grand_total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payments Ledger Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Payments & Collections Ledger
            </h2>
          </div>
          <span className="text-xs text-slate-500">{payments.length} payments recorded</span>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No payments recorded yet</p>
            <p className="mt-1">
              {invoice.status === 'draft'
                ? 'Payments can be recorded once the invoice is issued.'
                : 'Click "Record Payment" to log customer bank transfers, UPI, or cheque receipts.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/60 uppercase font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Receipt #</th>
                  <th className="px-4 py-2.5">Payment Date</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5">Reference / Bank</th>
                  <th className="px-4 py-2.5">Recorded By</th>
                  <th className="px-4 py-2.5 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                      {p.payment_receipt_number}
                    </td>
                    <td className="px-4 py-2.5">{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2.5 capitalize">{p.payment_method.replace('_', ' ')}</td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {p.transaction_reference || '—'} {p.bank_name ? `(${p.bank_name})` : ''}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {p.staff_profiles?.full_name || 'Staff'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                      ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ----------------- RECORD PAYMENT MODAL ----------------- */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-700" />
                Record Customer Payment
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Amount (₹) * (Max: ₹{invoice.balance_amount.toLocaleString('en-IN')})
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={invoice.balance_amount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full text-base font-bold text-emerald-700 rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                  >
                    <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="upi">UPI Payment</option>
                    <option value="cheque">Cheque</option>
                    <option value="demand_draft">Demand Draft</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction Reference / UTR #
                </label>
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="e.g. UTR19482049184"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank, SBI"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. 50% milestone advance payment"
                  className="w-full text-xs rounded-lg border border-slate-300 p-2"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50"
                >
                  {isPending ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- VOID / CANCEL MODAL ----------------- */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-rose-800 flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600" />
                Void / Cancel Invoice
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCancelInvoice} className="space-y-4">
              <p className="text-xs text-slate-600">
                Are you sure you want to cancel this invoice? This will mark the record as cancelled with an audit trail reason.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cancellation Reason *
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Revised order specs received from client, re-issuing new invoice."
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Keep Invoice
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50"
                >
                  {isPending ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

