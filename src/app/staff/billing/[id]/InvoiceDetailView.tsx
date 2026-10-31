'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  issueInvoiceAction,
  recordPaymentAction,
  cancelInvoiceAction,
  recordInvoiceDeliveryAction,
} from '@/lib/billing/actions';
import { convertNumberToIndianWords } from '@/lib/quotation/calculations';
import { formatIndianDate, formatIndianDateTime } from '@/lib/utils/date';
import { formatIndianRupee } from '@/lib/utils/currency';
import { TaxBreakdownCard, type RateTaxSummary } from '@/components/ui/TaxBreakdownCard';
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
  FileEdit,
  Lock,
} from 'lucide-react';

interface InvoiceDetailViewProps {
  invoice: any;
  items: any[];
  payments: any[];
  linkedQuotation: any | null;
  currentUserRole: StaffRole;
  deliveryLogs?: any[];
}

export default function InvoiceDetailView({
  invoice,
  items,
  payments,
  linkedQuotation,
  currentUserRole,
  deliveryLogs = [],
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

  // Delivery Modal State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryChannel, setDeliveryChannel] = useState<'email' | 'whatsapp' | 'phone' | 'in_person' | 'download'>('email');
  const [deliveryEmail, setDeliveryEmail] = useState(invoice.customers?.email || '');
  const [deliveryPhone, setDeliveryPhone] = useState(invoice.customers?.phone || '');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliverySuccessMessage, setDeliverySuccessMessage] = useState<string | null>(null);

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setDeliverySuccessMessage(null);
    startTransition(async () => {
      const res = await recordInvoiceDeliveryAction(invoice.id, deliveryChannel, {
        recipientEmail: deliveryEmail,
        recipientPhone: deliveryPhone,
        notes: deliveryNotes,
      });
      if (res.error) {
        setServerError(res.error);
      } else {
        setDeliverySuccessMessage(`Invoice transmission recorded successfully via ${deliveryChannel.toUpperCase()}.`);
        setShowDeliveryModal(false);
        router.refresh();
      }
    });
  };

  const canManage = ['super_admin', 'admin', 'billing_manager'].includes(currentUserRole);

  const statusColors: Record<string, string> = {
    draft: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    issued: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    partially_paid: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    paid: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    overdue: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    cancelled: 'bg-slate-700 text-slate-300 border-slate-600',
    refunded: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
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

  const isIntraState = invoice.is_intra_state ?? (invoice.customer_state_code === '10');

  // Group line items for tax rate breakdown in TaxBreakdownCard
  const rateBreakdownMap = new Map<number, { taxableAmount: number; taxAmount: number }>();
  items.forEach((it: any) => {
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

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Navigation & Status Header — High Contrast Dark Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/staff/billing"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Back to Invoices"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">
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
            <p className="text-xs text-slate-400 mt-1">
              Type: <span className="capitalize font-medium text-slate-200">{invoice.invoice_type.replace('_', ' ')}</span> • FY {invoice.financial_year} • Created: {formatIndianDate(invoice.created_at)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* BUG-020: Edit Draft Invoice Action */}
          {invoice.status === 'draft' && canManage && (
            <Link
              href={`/staff/billing/${invoice.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              <FileEdit className="w-3.5 h-3.5" />
              Edit Draft
            </Link>
          )}

          {invoice.status !== 'draft' && (
            <div
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800/80 border border-slate-700 text-slate-400 rounded-lg text-xs"
              title="Issued invoices are legally immutable tax records under GST Rule 46."
            >
              <Lock className="w-3 h-3 text-slate-500" />
              <span>Locked Tax Invoice</span>
            </div>
          )}

          {invoice.status === 'draft' && canManage && (
            <button
              onClick={handleIssue}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition shadow-sm disabled:opacity-50"
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
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition shadow-sm"
            >
              <CreditCard className="w-4 h-4" />
              Record Payment
            </button>
          )}

          {invoice.status !== 'draft' && invoice.status !== 'cancelled' && canManage && (
            <button
              onClick={() => setShowDeliveryModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition shadow-sm"
            >
              <Send className="w-4 h-4" />
              Send / Deliver
            </button>
          )}

          <Link
            href={`/staff/billing/${invoice.id}/pdf`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </Link>

          {invoice.status !== 'cancelled' && invoice.paid_amount === 0 && canManage && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1 px-3 py-2 text-rose-400 hover:bg-rose-950/40 border border-rose-500/30 rounded-lg text-xs font-semibold transition"
            >
              <Ban className="w-3.5 h-3.5" />
              Void Invoice
            </button>
          )}
        </div>
      </div>

      {deliverySuccessMessage && (
        <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-300 font-medium">{deliverySuccessMessage}</div>
        </div>
      )}
      {serverError && (
        <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-300 font-medium">{serverError}</div>
        </div>
      )}

      {/* Linked Quotation Banner */}
      {linkedQuotation && (
        <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-lg flex items-center justify-between text-xs text-blue-300">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
            <span>
              Generated from Quotation: <strong className="font-semibold text-white">{linkedQuotation.quotation_number}</strong>
            </span>
          </div>
          <Link
            href={`/staff/quotations/${linkedQuotation.id}`}
            className="text-gold-400 hover:text-gold-300 font-semibold underline"
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
          <p className="text-xs text-slate-500 leading-relaxed">{invoice.customer_billing_address || '—'}</p>
          {invoice.delivery_location && (
            <p className="text-xs text-slate-700">
              <strong>Site Destination:</strong> {invoice.delivery_location}
            </p>
          )}
        </div>

        {/* Financial Balance Summary */}
        <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3 border border-slate-800">
          <div>
            <p className="text-xs font-bold text-gold-400 uppercase tracking-wider">Settlement Ledger</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Grand Total:</span>
                <span className="font-semibold text-white font-mono">
                  {formatIndianRupee(invoice.grand_total_amount)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-emerald-400">
                <span>Total Collected:</span>
                <span className="font-semibold font-mono">
                  {formatIndianRupee(invoice.paid_amount)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-slate-800 pt-1 text-amber-400">
                <span>Balance Due:</span>
                <span className="font-mono">
                  {formatIndianRupee(invoice.balance_amount)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>Due Date:</span>
            <span className={isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-200'}>
              {formatIndianDate(invoice.due_date)}
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
          <table className="min-w-[850px] w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100/60 uppercase font-semibold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2.5 text-center w-10">#</th>
                <th className="px-3.5 py-2.5 min-w-[200px]">Item Description</th>
                <th className="px-3.5 py-2.5 text-center w-24">HSN/SAC</th>
                <th className="px-3.5 py-2.5 text-right w-20">Qty</th>
                <th className="px-3.5 py-2.5 text-right w-28">Unit Rate</th>
                <th className="px-3.5 py-2.5 text-right w-24">Discount</th>
                <th className="px-3.5 py-2.5 text-right w-28">Taxable</th>
                <th className="px-3.5 py-2.5 text-right w-20">GST %</th>
                <th className="px-3.5 py-2.5 text-right w-24">Tax (₹)</th>
                <th className="px-3.5 py-2.5 text-right w-32">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50/50">
                  <td className="px-3.5 py-2 text-center text-slate-400 font-mono">{it.sort_order}</td>
                  <td className="px-3.5 py-2 font-medium text-slate-900">
                    {it.item_name}
                    {it.description && <p className="text-[11px] text-slate-400 font-normal">{it.description}</p>}
                  </td>
                  <td className="px-3.5 py-2 text-center font-mono">{it.hsn_sac_code || '—'}</td>
                  <td className="px-3.5 py-2 text-right font-mono">
                    {Number(it.quantity).toFixed(2)} {it.unit}
                  </td>
                  <td className="px-3.5 py-2 text-right font-mono">
                    {formatIndianRupee(it.unit_rate)}
                  </td>
                  <td className="px-3.5 py-2 text-right font-mono text-emerald-700">
                    {Number(it.discount_amount) > 0 ? formatIndianRupee(it.discount_amount) : '—'}
                  </td>
                  <td className="px-3.5 py-2 text-right font-mono font-medium">
                    {formatIndianRupee(it.taxable_amount)}
                  </td>
                  <td className="px-3.5 py-2 text-right">{it.gst_rate}%</td>
                  <td className="px-3.5 py-2 text-right font-mono">
                    {formatIndianRupee(it.tax_amount)}
                  </td>
                  <td className="px-3.5 py-2 text-right font-mono font-semibold text-slate-900">
                    {formatIndianRupee(it.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-medium text-slate-800 border-t border-slate-200">
              <tr>
                <td colSpan={6} className="px-3.5 py-2 text-right text-slate-500">Totals:</td>
                <td className="px-3.5 py-2 text-right font-mono font-bold">
                  {formatIndianRupee(invoice.taxable_amount)}
                </td>
                <td className="px-3.5 py-2 text-right"></td>
                <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-700">
                  {formatIndianRupee(invoice.total_tax_amount)}
                </td>
                <td className="px-3.5 py-2 text-right font-mono font-bold text-emerald-800">
                  {formatIndianRupee(invoice.grand_total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Statutory Tax Breakdown Card (BUG-028) */}
      <TaxBreakdownCard
        title="Invoice Statutory Tax & Financial Summary"
        subtotalAmount={Number(invoice.taxable_amount || 0)}
        discountAmount={0}
        taxableAmount={Number(invoice.taxable_amount || 0)}
        cgstAmount={Number(invoice.cgst_amount || 0)}
        sgstAmount={Number(invoice.sgst_amount || 0)}
        igstAmount={Number(invoice.igst_amount || 0)}
        totalTaxAmount={Number(invoice.total_tax_amount || 0)}
        roundOffAmount={Number(invoice.round_off_amount || 0)}
        grandTotalAmount={Number(invoice.grand_total_amount || 0)}
        amountInWords={convertNumberToIndianWords(invoice.grand_total_amount || 0)}
        isGstApplicable={true}
        taxDetermination={
          !invoice.place_of_supply_state_code
            ? 'undetermined'
            : isIntraState
            ? 'intra_state'
            : 'inter_state'
        }
        rateBreakdown={rateBreakdowns}
        isDark={false}
      />

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
                    <td className="px-4 py-2.5">{formatIndianDate(p.payment_date)}</td>
                    <td className="px-4 py-2.5 capitalize">{p.payment_method.replace('_', ' ')}</td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {p.transaction_reference || '—'} {p.bank_name ? `(${p.bank_name})` : ''}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {p.staff_profiles?.full_name || 'Staff'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-700">
                      {formatIndianRupee(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Statutory Delivery & Dispatch History */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-gold-500" />
            Statutory Delivery & Dispatch History
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {deliveryLogs.length} logged transmissions
          </span>
        </div>

        {deliveryLogs.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            No formal deliveries recorded for this invoice yet. Click &quot;Send / Deliver&quot; to queue email or record manual handover.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                  <th className="py-2.5 px-3 font-semibold">Channel</th>
                  <th className="py-2.5 px-3 font-semibold">Recipient / Contact</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Logged At</th>
                  <th className="py-2.5 px-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveryLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                      {log.email_type === 'invoice_customer' ? 'EMAIL TRANSMISSION' : (log.payload?.deliveryChannel || 'MANUAL HANDOVER').toUpperCase()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-mono">
                      {log.recipient_email}
                      {log.payload?.recipientPhone && <div className="text-slate-400 text-[10px]">Phone: {log.payload.recipientPhone}</div>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.status === 'sent'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : log.status === 'failed'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {formatIndianDateTime(log.created_at)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {log.payload?.notes || log.error_message || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
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
                  Payment Amount (₹) * (Max: {formatIndianRupee(invoice.balance_amount)})
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
                  placeholder="e.g. State Bank of India"
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
                  placeholder="e.g. Milestone advance payment"
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

      {/* Invoice Delivery Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-gold-500" />
                Dispatch / Log Invoice Delivery
              </h3>
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeliverySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Delivery Channel <span className="text-red-500">*</span>
                </label>
                <select
                  value={deliveryChannel}
                  onChange={(e) => setDeliveryChannel(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm text-slate-900"
                >
                  <option value="email">Email Transmission (Outbox Queue)</option>
                  <option value="whatsapp">WhatsApp PDF Transmission</option>
                  <option value="phone">Phone Discussion / Notification</option>
                  <option value="in_person">In-Person Handover / Printed</option>
                  <option value="download">Direct Staff PDF Download</option>
                </select>
              </div>

              {deliveryChannel === 'email' && (
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">
                    Recipient Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={deliveryEmail}
                    onChange={(e) => setDeliveryEmail(e.target.value)}
                    placeholder="client@company.com"
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
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">
                  Delivery Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Sent formal Tax Invoice to accounts department."
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
                  className="px-4 py-2 bg-[#10243B] text-white rounded font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPending ? 'Logging...' : 'Confirm Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void / Cancel Modal */}
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
