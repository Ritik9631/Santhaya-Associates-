'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  createInvoiceAction,
  convertQuotationToInvoiceAction,
  type ActionResponse,
} from '@/lib/billing/actions';
import {
  calculateInvoiceTotals,
  type InvoiceLineItemInput,
} from '@/lib/billing/calculations';
import type { CompanyBillingProfile } from '@/lib/billing/company-config';
import type { InvoiceType } from '@/types/database';
import {
  Plus,
  Trash2,
  FileCheck,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface InvoiceFormProps {
  customers: Array<{
    id: string;
    company_name: string;
    primary_contact_person: string;
    gstin: string | null;
    pan?: string | null;
    billing_address?: string | null;
    state?: string | null;
    state_code?: string | null;
  }>;
  catalogItems: Array<{
    id: string;
    sku: string;
    name: string;
    default_unit_price: number | null;
    applicable_gst_rate: number | null;
    hsn_sac_code: string | null;
    unit_of_measurement: string | null;
  }>;
  acceptedQuotations: Array<any>;
  defaultCustomerId?: string;
  defaultQuotationId?: string;
  companyProfile: CompanyBillingProfile;
}

export default function InvoiceForm({
  customers,
  catalogItems,
  acceptedQuotations,
  defaultCustomerId,
  defaultQuotationId,
  companyProfile,
}: InvoiceFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'direct' | 'convert'>(defaultQuotationId ? 'convert' : 'direct');
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // Direct Invoice Form State
  const [customerId, setCustomerId] = useState(defaultCustomerId || (customers[0]?.id || ''));
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('tax_invoice');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [clientPoReference, setClientPoReference] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [termsConditions, setTermsConditions] = useState(
    'Payment due within 30 days from invoice date. Overdue amounts subject to 18% annual interest.'
  );
  const [paymentInstructions, setPaymentInstructions] = useState(
    `Bank: ${companyProfile.bankDetails.bankName}\nA/C: ${companyProfile.bankDetails.accountNumber}\nIFSC: ${companyProfile.bankDetails.ifscCode}\nUPI: ${companyProfile.bankDetails.upiId}`
  );
  const [notes, setNotes] = useState('');

  // Selected customer object
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId]
  );

  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState(
    selectedCustomer?.state_code || companyProfile.stateCode
  );

  // Line items state
  const [items, setItems] = useState<InvoiceLineItemInput[]>([
    {
      product_service_id: null,
      item_name: '',
      description: '',
      hsn_sac_code: '8429',
      unit: 'month',
      quantity: 1,
      unit_rate: 50000,
      discount_amount: 0,
      gst_rate: 18,
    },
  ]);

  // Convert Quotation Form State
  const [selectedQuotationId, setSelectedQuotationId] = useState(
    defaultQuotationId || (acceptedQuotations[0]?.id || '')
  );
  const [convertInvoiceType, setConvertInvoiceType] = useState<InvoiceType>('tax_invoice');

  // Sync place of supply when customer changes
  const handleCustomerChange = (newCustId: string) => {
    setCustomerId(newCustId);
    const cust = customers.find((c) => c.id === newCustId);
    if (cust?.state_code) {
      setPlaceOfSupplyStateCode(cust.state_code);
    }
  };

  // Add line item
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        product_service_id: null,
        item_name: '',
        description: '',
        hsn_sac_code: '8429',
        unit: 'unit',
        quantity: 1,
        unit_rate: 0,
        discount_amount: 0,
        gst_rate: 18,
      },
    ]);
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Update item field
  const handleItemChange = (index: number, field: keyof InvoiceLineItemInput, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Catalog item quick picker
  const handleSelectCatalogItem = (index: number, catalogId: string) => {
    if (!catalogId) return;
    const cat = catalogItems.find((c) => c.id === catalogId);
    if (!cat) return;

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        product_service_id: cat.id,
        item_name: cat.name,
        hsn_sac_code: cat.hsn_sac_code || copy[index].hsn_sac_code,
        unit: cat.unit_of_measurement || 'unit',
        unit_rate: cat.default_unit_price || copy[index].unit_rate,
        gst_rate: cat.applicable_gst_rate !== null ? cat.applicable_gst_rate : copy[index].gst_rate,
      };
      return copy;
    });
  };

  // Real-time calculations
  const totals = useMemo(() => {
    return calculateInvoiceTotals(
      items,
      invoiceType,
      placeOfSupplyStateCode,
      companyProfile.stateCode
    );
  }, [items, invoiceType, placeOfSupplyStateCode, companyProfile.stateCode]);

  // Handle Direct Invoice Submission
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('customerId', customerId);
      formData.append('invoiceType', invoiceType);
      formData.append('invoiceDate', invoiceDate);
      formData.append('dueDate', dueDate);
      formData.append('placeOfSupplyStateCode', placeOfSupplyStateCode);
      formData.append('clientPoReference', clientPoReference);
      formData.append('deliveryLocation', deliveryLocation);
      formData.append('termsConditions', termsConditions);
      formData.append('paymentInstructions', paymentInstructions);
      formData.append('notes', notes);
      formData.append('itemsJson', JSON.stringify(items));

      const res: ActionResponse<{ invoiceId: string }> = await createInvoiceAction(null, formData);

      if (res.error) {
        setServerError(res.error);
      } else if (res.data?.invoiceId) {
        router.push(`/staff/billing/${res.data.invoiceId}`);
      }
    });
  };

  // Handle Quotation Conversion Submission
  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!selectedQuotationId) {
      setServerError('Please select an accepted quotation to convert.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('quotationId', selectedQuotationId);
      formData.append('invoiceType', convertInvoiceType);

      const res = await convertQuotationToInvoiceAction(null, formData);

      if (res.error) {
        setServerError(res.error);
      } else if (res.data?.invoiceId) {
        router.push(`/staff/billing/${res.data.invoiceId}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            setActiveTab('direct');
            setServerError(null);
          }}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'direct'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          Direct GST Invoice
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('convert');
            setServerError(null);
          }}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'convert'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RefreshCw className="w-4 h-4 text-blue-600" />
          Convert from Accepted Quotation
          {acceptedQuotations.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 rounded-full font-medium">
              {acceptedQuotations.length} available
            </span>
          )}
        </button>
      </div>

      {serverError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-800 font-medium">{serverError}</div>
        </div>
      )}

      {/* ----------------- TAB 1: DIRECT INVOICE FORM ----------------- */}
      {activeTab === 'direct' && (
        <form onSubmit={handleDirectSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              1. Customer & Statutory Supply Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Customer / Entity *
                </label>
                <select
                  value={customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 p-2.5 bg-white focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="" disabled>Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} {c.gstin ? `(${c.gstin})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Invoice Type *
                </label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                  className="w-full text-sm rounded-lg border border-slate-300 p-2.5 bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="tax_invoice">Tax Invoice (Standard GST)</option>
                  <option value="bill_of_supply">Bill of Supply (Composition/Exempt)</option>
                  <option value="non_gst">Non-GST Invoice</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Place of Supply State Code *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={2}
                    value={placeOfSupplyStateCode}
                    onChange={(e) => setPlaceOfSupplyStateCode(e.target.value)}
                    placeholder="07"
                    className="w-20 text-sm rounded-lg border border-slate-300 p-2.5 text-center font-mono focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <div className="text-xs text-slate-500 flex items-center">
                    {placeOfSupplyStateCode === companyProfile.stateCode ? (
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded">
                        Intra-State (CGST + SGST)
                      </span>
                    ) : (
                      <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded">
                        Inter-State (IGST)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Payment Due Date *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Client PO Reference
                </label>
                <input
                  type="text"
                  value={clientPoReference}
                  onChange={(e) => setClientPoReference(e.target.value)}
                  placeholder="e.g. PO-2026/8492"
                  className="w-full text-sm rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Site / Delivery Destination
              </label>
              <input
                type="text"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder="Project Site, Expressway Sector 18, Noida"
                className="w-full text-sm rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">2. Line Items & Tax Breakdown</h2>
                <p className="text-xs text-slate-500">
                  Item rates, units, discounts, and HSN/SAC codes.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Item #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded"
                        title="Delete item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {catalogItems.length > 0 && (
                    <div className="w-full sm:w-1/2">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Autofill from Catalog
                      </label>
                      <select
                        onChange={(e) => handleSelectCatalogItem(idx, e.target.value)}
                        value={item.product_service_id || ''}
                        className="w-full text-xs rounded border border-slate-300 p-1.5 bg-white"
                      >
                        <option value="">-- Choose machinery or service --</option>
                        {catalogItems.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} ({cat.sku})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Item / Machinery Name *
                      </label>
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                        placeholder="e.g. 20-Ton Hydraulic Excavator Monthly Rental"
                        className="w-full text-sm rounded border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        HSN / SAC Code
                      </label>
                      <input
                        type="text"
                        value={item.hsn_sac_code || ''}
                        onChange={(e) => handleItemChange(idx, 'hsn_sac_code', e.target.value)}
                        placeholder="8429 / 9973"
                        className="w-full text-sm rounded border border-slate-300 p-2 font-mono uppercase focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={item.unit || ''}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        placeholder="month / day / unit"
                        className="w-full text-sm rounded border border-slate-300 p-2 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.0001"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full text-sm rounded border border-slate-300 p-2 text-right focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Unit Rate (₹) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.unit_rate}
                        onChange={(e) => handleItemChange(idx, 'unit_rate', e.target.value)}
                        className="w-full text-sm rounded border border-slate-300 p-2 text-right focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Discount (₹)
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.discount_amount || 0}
                        onChange={(e) => handleItemChange(idx, 'discount_amount', e.target.value)}
                        className="w-full text-sm rounded border border-slate-300 p-2 text-right focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        GST Rate (%) {invoiceType !== 'tax_invoice' && '(0% Exempt)'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        disabled={invoiceType !== 'tax_invoice'}
                        value={invoiceType === 'tax_invoice' ? item.gst_rate || 18 : 0}
                        onChange={(e) => handleItemChange(idx, 'gst_rate', e.target.value)}
                        className="w-full text-sm rounded border border-slate-300 p-2 text-right disabled:bg-slate-100 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statutory Calculations & Grand Total Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Statutory Terms & Payment Instructions
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  rows={2}
                  value={termsConditions}
                  onChange={(e) => setTermsConditions(e.target.value)}
                  className="w-full text-xs rounded border border-slate-300 p-2 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Settlement Details (Printed on Invoice)
                </label>
                <textarea
                  rows={3}
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  className="w-full text-xs rounded border border-slate-300 p-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Staff Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes visible to staff only"
                  className="w-full text-xs rounded border border-slate-300 p-2"
                />
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
                  Tax & Commercial Summary
                </h3>

                <div className="flex justify-between text-xs text-slate-300">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {totals.discount_amount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-400">
                    <span>Discount:</span>
                    <span>-₹{totals.discount_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex justify-between text-xs text-slate-300 border-t border-slate-800 pt-1">
                  <span>Taxable Value:</span>
                  <span>₹{totals.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {totals.is_intra_state ? (
                  <>
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>CGST (Central Tax):</span>
                      <span>₹{totals.cgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>SGST (State Tax):</span>
                      <span>₹{totals.sgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>IGST (Integrated Tax):</span>
                    <span>₹{totals.igst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {totals.round_off_amount !== 0 && (
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Round-off:</span>
                    <span>{totals.round_off_amount > 0 ? `+₹${totals.round_off_amount}` : `-₹${Math.abs(totals.round_off_amount)}`}</span>
                  </div>
                )}

                <div className="flex justify-between text-lg font-bold text-white border-t border-slate-700 pt-2">
                  <span>Grand Total:</span>
                  <span>₹{totals.grand_total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <p className="text-[11px] text-slate-400 italic font-serif">
                  {totals.amount_in_words}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition-colors shadow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <FileCheck className="w-4 h-4" />
                  {isPending ? 'Saving Draft...' : 'Save Draft Invoice'}
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-2">
                  Rule 46(b) Notice: Statutory invoice number will be gaplessly allocated upon formal issuance.
                </p>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ----------------- TAB 2: CONVERT QUOTATION FORM ----------------- */}
      {activeTab === 'convert' && (
        <form onSubmit={handleConvertSubmit} className="max-w-2xl bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Convert Accepted Commercial Quotation
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Transform an accepted customer quotation into a draft GST Tax Invoice. All line items, rates, and customer details are automatically migrated.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Select Accepted Quotation *
              </label>
              {acceptedQuotations.length === 0 ? (
                <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200">
                  No accepted quotations currently available for conversion. Issue and accept quotations in the Quotations module first.
                </div>
              ) : (
                <select
                  value={selectedQuotationId}
                  onChange={(e) => setSelectedQuotationId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 p-2.5 bg-white focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="" disabled>Choose quotation...</option>
                  {acceptedQuotations.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quotation_number} — {q.customers?.company_name} (Status: {q.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Invoice Classification
              </label>
              <select
                value={convertInvoiceType}
                onChange={(e) => setConvertInvoiceType(e.target.value as InvoiceType)}
                className="w-full text-sm rounded-lg border border-slate-300 p-2.5 bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="tax_invoice">Tax Invoice (Standard GST)</option>
                <option value="bill_of_supply">Bill of Supply (Exempt / Nil-Rated)</option>
                <option value="non_gst">Non-GST Invoice</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Creates a linked draft invoice. Prevents duplicate conversion.
            </p>
            <button
              type="submit"
              disabled={isPending || acceptedQuotations.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-sm transition-colors shadow disabled:opacity-50"
            >
              {isPending ? 'Converting...' : 'Convert to Invoice'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
