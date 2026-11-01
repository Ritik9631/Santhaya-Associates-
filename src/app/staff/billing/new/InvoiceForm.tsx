'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  createInvoiceAction,
  updateDraftInvoiceAction,
  convertQuotationToInvoiceAction,
} from '@/lib/billing/actions';
import { INDIAN_STATES, resolveIndianState } from '@/lib/utils/indian-states';
import { getDefaultInvoiceTerms } from '@/lib/billing/default-terms';
import {
  calculateInvoiceTotals,
  isValidIndianStateCode,
  type InvoiceLineItemInput,
} from '@/lib/billing/calculations';
import { getPaymentInstructions, type CompanyBillingProfile } from '@/lib/billing/company-config';
import type { InvoiceType } from '@/types/database';
import {
  Plus,
  Trash2,
  FileCheck,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import {
  formInputClasses,
  formSelectClasses,
  formTextareaClasses,
  formLabelClasses,
  tableInputClasses,
  tableSelectClasses,
} from '@/components/ui/form-styles';
import { TaxBreakdownCard } from '@/components/ui/TaxBreakdownCard';

export interface InitialInvoiceData {
  id: string;
  invoice_number?: string | null;
  customer_id: string;
  invoice_type: InvoiceType;
  invoice_date: string;
  due_date: string;
  placeOfSupplyStateCode: string;
  delivery_location?: string | null;
  client_po_reference?: string | null;
  terms_conditions?: string | null;
  payment_instructions?: string | null;
  notes?: string | null;
  items: InvoiceLineItemInput[];
}

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
  isEdit?: boolean;
  initialData?: InitialInvoiceData;
}

export default function InvoiceForm({
  customers,
  catalogItems,
  acceptedQuotations,
  defaultCustomerId,
  defaultQuotationId,
  companyProfile,
  isEdit = false,
  initialData,
}: InvoiceFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'direct' | 'convert'>(
    isEdit ? 'direct' : (defaultQuotationId ? 'convert' : 'direct')
  );
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // Direct Invoice Form State
  const defaultCustId = initialData?.customer_id || defaultCustomerId || (customers[0]?.id || '');
  const [customerId, setCustomerId] = useState(defaultCustId);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(initialData?.invoice_type || 'tax_invoice');
  const [invoiceDate, setInvoiceDate] = useState(
    initialData?.invoice_date || new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(
    initialData?.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [clientPoReference, setClientPoReference] = useState(initialData?.client_po_reference || '');
  const [deliveryLocation, setDeliveryLocation] = useState(initialData?.delivery_location || '');
  const [termsConditions, setTermsConditions] = useState(
    initialData?.terms_conditions || getDefaultInvoiceTerms(dueDate)
  );
  const [paymentInstructions, setPaymentInstructions] = useState(
    initialData?.payment_instructions || getPaymentInstructions(companyProfile)
  );
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Selected customer object
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId]
  );

  const defaultSupplyResolved = resolveIndianState(initialData?.placeOfSupplyStateCode || selectedCustomer?.state_code || selectedCustomer?.state);
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState(
    defaultSupplyResolved ? defaultSupplyResolved.code : ''
  );

  // Line items state
  const [items, setItems] = useState<InvoiceLineItemInput[]>(
    initialData?.items && initialData.items.length > 0
      ? initialData.items
      : [
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
        ]
  );

  // Convert Quotation Form State
  const [selectedQuotationId, setSelectedQuotationId] = useState(
    defaultQuotationId || (acceptedQuotations[0]?.id || '')
  );
  const [convertInvoiceType, setConvertInvoiceType] = useState<InvoiceType>('tax_invoice');

  // Sync place of supply when customer changes
  const handleCustomerChange = (newCustId: string) => {
    setCustomerId(newCustId);
    const cust = customers.find((c) => c.id === newCustId);
    const resolved = resolveIndianState(cust?.state_code || cust?.state);
    setPlaceOfSupplyStateCode(resolved?.code || '');
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
        hsn_sac_code: cat.hsn_sac_code || '',
        unit: cat.unit_of_measurement || 'unit',
        unit_rate: cat.default_unit_price || 0,
        gst_rate: cat.applicable_gst_rate !== null ? cat.applicable_gst_rate : 18,
      };
      return copy;
    });
  };

  // Live Totals Calculation with verified Bihar (10) supplier state
  const effectiveSupplyCode = placeOfSupplyStateCode || selectedCustomer?.state_code || '';
  const totals = calculateInvoiceTotals(
    items,
    invoiceType,
    effectiveSupplyCode,
    companyProfile.stateCode || '10'
  );

  // Group line items by rate for breakdown
  const rateBreakdownMap = new Map<number, { taxable: number; tax: number; cgst: number; sgst: number; igst: number }>();
  totals.items.forEach((it) => {
    const rate = it.gst_rate || 0;
    const cur = rateBreakdownMap.get(rate) || { taxable: 0, tax: 0, cgst: 0, sgst: 0, igst: 0 };
    cur.taxable += it.taxable_amount;
    cur.tax += it.tax_amount;
    cur.cgst += it.cgst_amount || 0;
    cur.sgst += it.sgst_amount || 0;
    cur.igst += it.igst_amount || 0;
    rateBreakdownMap.set(rate, cur);
  });

  const rateBreakdownList = Array.from(rateBreakdownMap.entries()).map(([rate, vals]) => ({
    gstRate: rate,
    taxableAmount: vals.taxable,
    cgstAmount: vals.cgst,
    sgstAmount: vals.sgst,
    igstAmount: vals.igst,
    totalTax: vals.tax,
  }));

  // Handle Direct Invoice Submission
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const formData = new FormData();
    if (isEdit && initialData?.id) {
      formData.append('invoiceId', initialData.id);
    }
    formData.append('customerId', customerId);
    formData.append('invoiceType', invoiceType);
    formData.append('invoiceDate', invoiceDate);
    formData.append('dueDate', dueDate);
    formData.append('placeOfSupplyStateCode', placeOfSupplyStateCode);
    formData.append('deliveryLocation', deliveryLocation);
    formData.append('clientPoReference', clientPoReference);
    formData.append('termsConditions', termsConditions);
    formData.append('paymentInstructions', paymentInstructions);
    formData.append('notes', notes);
    formData.append('itemsJson', JSON.stringify(items));

    startTransition(async () => {
      if (isEdit) {
        const res = await updateDraftInvoiceAction(null, formData);
        if (res.error) {
          setServerError(res.error);
        } else if (res.data?.invoiceId) {
          router.push(`/staff/billing/${res.data.invoiceId}`);
        }
      } else {
        const res = await createInvoiceAction(null, formData);
        if (res.error) {
          setServerError(res.error);
        } else if (res.data?.invoiceId) {
          router.push(`/staff/billing/${res.data.invoiceId}`);
        }
      }
    });
  };

  // Handle Convert Quotation Submission
  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const formData = new FormData();
    formData.append('quotationId', selectedQuotationId);
    formData.append('invoiceType', convertInvoiceType);

    startTransition(async () => {
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
      {/* Mode Switcher Tabs (Only shown in creation mode) */}
      {!isEdit && (
        <div className="flex border-b border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('direct');
              setServerError(null);
            }}
            className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'direct'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
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
                ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-4 h-4 text-blue-400" />
            Convert from Accepted Quotation
            {acceptedQuotations.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-medium">
                {acceptedQuotations.length} available
              </span>
            )}
          </button>
        </div>
      )}

      {serverError && (
        <div className="p-4 bg-rose-950/70 border border-rose-800/80 rounded-xl text-rose-200 flex items-start gap-3 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="font-medium">{serverError}</div>
        </div>
      )}

      {/* ----------------- DIRECT INVOICE FORM (OR EDIT DRAFT) ----------------- */}
      {activeTab === 'direct' && (
        <form onSubmit={handleDirectSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              1. Customer & Statutory Supply Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className={formLabelClasses}>
                  Customer / Entity <span className="text-red-500">*</span>
                </label>
                <select
                  value={customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className={formSelectClasses}
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
                <label className={formLabelClasses}>
                  Invoice Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                  className={formSelectClasses}
                >
                  <option value="tax_invoice">Tax Invoice (Standard GST)</option>
                  <option value="bill_of_supply">Bill of Supply (Composition/Exempt)</option>
                  <option value="non_gst">Non-GST Invoice</option>
                </select>
              </div>

              <div>
                <label className={formLabelClasses}>
                  Place of Supply (State Code) <span className="text-red-500">*</span>
                </label>
                <select
                  value={placeOfSupplyStateCode}
                  onChange={(e) => setPlaceOfSupplyStateCode(e.target.value)}
                  className={formSelectClasses}
                  required
                >
                  <option value="">-- Select Place of Supply (Required) --</option>
                  {INDIAN_STATES.map((st) => (
                    <option key={st.code} value={st.code}>
                      {st.code} — {st.name} {st.code === (companyProfile.stateCode || '10') ? '(Intra-State: CGST+SGST)' : '(Inter-State: IGST)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              <div>
                <label className={formLabelClasses}>
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={formInputClasses}
                  required
                />
              </div>

              <div>
                <label className={formLabelClasses}>
                  Payment Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={formInputClasses}
                  required
                />
              </div>

              <div>
                <label className={formLabelClasses}>
                  Client PO Reference
                </label>
                <input
                  type="text"
                  value={clientPoReference}
                  onChange={(e) => setClientPoReference(e.target.value)}
                  placeholder="e.g. PO-2026/8492"
                  className={formInputClasses}
                />
              </div>
            </div>

            <div>
              <label className={formLabelClasses}>
                Site / Delivery Destination
              </label>
              <input
                type="text"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder="Project Site, Expressway Sector 18, Noida"
                className={formInputClasses}
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  2. Invoice Line Items & Tax Rates
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Input machinery supply, equipment rental periods, or tender service items.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#10243B] text-white rounded-lg hover:bg-slate-800 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase">Item #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-600 hover:text-rose-800 text-xs font-semibold inline-flex items-center gap-1"
                        title="Delete item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    )}
                  </div>

                  {catalogItems.length > 0 && (
                    <div className="w-full sm:w-1/2">
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        Autofill from Catalog
                      </label>
                      <select
                        onChange={(e) => handleSelectCatalogItem(idx, e.target.value)}
                        value={item.product_service_id || ''}
                        className={tableSelectClasses}
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
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                        Item / Machinery Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                        placeholder="e.g. 20-Ton Hydraulic Excavator Monthly Rental"
                        className={tableInputClasses}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                        HSN / SAC Code
                      </label>
                      <input
                        type="text"
                        value={item.hsn_sac_code || ''}
                        onChange={(e) => handleItemChange(idx, 'hsn_sac_code', e.target.value)}
                        placeholder="8429 / 9973"
                        className={tableInputClasses}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={item.unit || ''}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        placeholder="month / day / unit"
                        className={tableInputClasses}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className={tableInputClasses}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                        Unit Rate (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_rate}
                        onChange={(e) => handleItemChange(idx, 'unit_rate', parseFloat(e.target.value) || 0)}
                        className={tableInputClasses}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                        Discount (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.discount_amount}
                        onChange={(e) => handleItemChange(idx, 'discount_amount', parseFloat(e.target.value) || 0)}
                        className={tableInputClasses}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                        GST Tax Rate (%)
                      </label>
                      <select
                        value={item.gst_rate}
                        onChange={(e) => handleItemChange(idx, 'gst_rate', parseFloat(e.target.value) || 0)}
                        disabled={invoiceType !== 'tax_invoice'}
                        className={tableSelectClasses}
                      >
                        <option value={0}>0% (Exempt)</option>
                        <option value={5}>5% (Concessional)</option>
                        <option value={12}>12% (Standard Low)</option>
                        <option value={18}>18% (Standard Rate)</option>
                        <option value={28}>28% (Special Rate)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Live Financial Summary Card */}
          <TaxBreakdownCard
            title="3. Live Invoice Financial & GST Totals"
            subtotalAmount={totals.subtotal_amount}
            discountAmount={totals.discount_amount}
            taxableAmount={totals.taxable_amount}
            cgstAmount={totals.cgst_amount}
            sgstAmount={totals.sgst_amount}
            igstAmount={totals.igst_amount}
            totalTaxAmount={totals.total_tax_amount}
            roundOffAmount={totals.round_off_amount}
            grandTotalAmount={totals.grand_total_amount}
            amountInWords={totals.amount_in_words}
            isGstApplicable={invoiceType === 'tax_invoice'}
            taxDetermination={totals.tax_determination}
            rateBreakdown={rateBreakdownList}
            isDark={true}
          />

          {/* 4. Commercial Terms & Instructions */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              4. Payment Instructions & Remarks
            </h2>

            <div>
              <label className={formLabelClasses}>
                Commercial Terms & Conditions
              </label>
              <textarea
                rows={2}
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                className={formTextareaClasses}
              />
            </div>

            <div>
              <label className={formLabelClasses}>
                Bank Payment Coordinates
              </label>
              <textarea
                rows={3}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                className={formTextareaClasses}
              />
            </div>

            <div>
              <label className={formLabelClasses}>
                Internal Remarks (Staff Only)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Purchase orders, contract milestone notes, credit approvals..."
                className={formTextareaClasses}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4">
            <Link
              href={isEdit && initialData?.id ? `/staff/billing/${initialData.id}` : '/staff/billing'}
              className="text-sm font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-sm transition shadow disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              <span>{isPending ? 'Saving...' : isEdit ? 'Save Changes to Draft' : 'Save Draft Invoice'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ----------------- CONVERT QUOTATION FORM ----------------- */}
      {activeTab === 'convert' && !isEdit && (
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
              <label className={formLabelClasses}>
                Select Accepted Quotation <span className="text-red-500">*</span>
              </label>
              {acceptedQuotations.length === 0 ? (
                <div className="p-4 bg-amber-50 text-amber-900 text-xs rounded-lg border border-amber-200">
                  No accepted quotations currently available for conversion. Issue and accept quotations in the Quotations module first.
                </div>
              ) : (
                <select
                  value={selectedQuotationId}
                  onChange={(e) => setSelectedQuotationId(e.target.value)}
                  className={formSelectClasses}
                  required
                >
                  <option value="" disabled>Select accepted quotation...</option>
                  {acceptedQuotations.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quotation_number} — {q.customer_name} (₹{Number(q.grand_total_amount).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className={formLabelClasses}>
                Target Invoice Type <span className="text-red-500">*</span>
              </label>
              <select
                value={convertInvoiceType}
                onChange={(e) => setConvertInvoiceType(e.target.value as InvoiceType)}
                className={formSelectClasses}
              >
                <option value="tax_invoice">Tax Invoice (Standard GST)</option>
                <option value="bill_of_supply">Bill of Supply</option>
                <option value="non_gst">Non-GST Invoice</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Link
              href="/staff/billing"
              className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isPending || acceptedQuotations.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold text-sm transition shadow disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
              <span>{isPending ? 'Converting...' : 'Generate Invoice from Quotation'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
