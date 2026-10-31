'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createQuotationAction, updateDraftQuotationAction } from '@/lib/quotation/actions';
import {
  calculateQuotationTotals,
  type LineItemInput,
  type QuotationTotals,
} from '@/lib/quotation/calculations';
import { Plus, Trash2, CheckCircle2, AlertCircle, ArrowLeft, FileCheck } from 'lucide-react';
import Link from 'next/link';
import {
  formInputClasses,
  formSelectClasses,
  formLabelClasses,
  tableInputClasses,
  tableSelectClasses,
} from '@/components/ui/form-styles';
import { TaxBreakdownCard } from '@/components/ui/TaxBreakdownCard';

interface CustomerOption {
  id: string;
  company_name: string;
  primary_contact_person: string;
  gstin?: string | null;
  state?: string | null;
  state_code?: string | null;
}

interface CatalogOption {
  id: string;
  sku: string;
  name: string;
  default_unit_price: number;
  applicable_gst_rate: number;
  hsn_sac_code?: string | null;
  unit_of_measurement?: string;
  item_type: string;
}

export interface InitialQuotationData {
  id: string;
  quotation_number: string;
  customer_id: string;
  place_of_supply_state_code: string | null;
  is_gst_applicable: boolean;
  validity_days: number;
  delivery_location: string;
  payment_terms: string;
  terms_conditions?: string | null;
  notes?: string | null;
  items: LineItemInput[];
}

interface QuotationFormProps {
  customers: CustomerOption[];
  catalogItems: CatalogOption[];
  defaultCustomerId?: string;
  defaultEnquiryId?: string;
  isEdit?: boolean;
  initialData?: InitialQuotationData;
}

export default function QuotationForm({
  customers,
  catalogItems,
  defaultCustomerId,
  defaultEnquiryId,
  isEdit = false,
  initialData,
}: QuotationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form State
  const defaultCust = customers.find((c) => c.id === (initialData?.customer_id || defaultCustomerId)) || customers[0];
  const [customerId, setCustomerId] = useState(
    initialData?.customer_id || defaultCustomerId || (customers[0]?.id || '')
  );
  const [enquiryId, setEnquiryId] = useState(defaultEnquiryId || '');
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState(
    initialData?.place_of_supply_state_code ?? (defaultCust?.state_code || '')
  );
  const [isGstApplicable, setIsGstApplicable] = useState(initialData?.is_gst_applicable ?? true);
  const [validityDays, setValidityDays] = useState(initialData?.validity_days ?? 30);
  const [deliveryLocation, setDeliveryLocation] = useState(initialData?.delivery_location || '');
  const [paymentTerms, setPaymentTerms] = useState(
    initialData?.payment_terms ||
      '100% advance against Proforma Invoice or 30 days credit on approved LC'
  );
  const [termsConditions, setTermsConditions] = useState(initialData?.terms_conditions || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Line items state
  const [items, setItems] = useState<LineItemInput[]>(
    initialData?.items && initialData.items.length > 0
      ? initialData.items
      : [
          {
            item_name: '',
            description: '',
            hsn_sac_code: '',
            unit: 'unit',
            quantity: 1,
            unit_rate: 0,
            discount_amount: 0,
            gst_rate: 18,
          },
        ]
  );

  // Update place of supply when customer changes
  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const selected = customers.find((c) => c.id === id);
    setPlaceOfSupplyStateCode(selected?.state_code || '');
  };

  // Add line item
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        item_name: '',
        description: '',
        hsn_sac_code: '',
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

  // Populate from catalog selection
  const handleSelectCatalogItem = (index: number, catalogId: string) => {
    const selected = catalogItems.find((c) => c.id === catalogId);
    if (!selected) return;

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        product_service_id: selected.id,
        item_name: selected.name,
        hsn_sac_code: selected.hsn_sac_code || '',
        unit: selected.unit_of_measurement || 'unit',
        unit_rate: selected.default_unit_price,
        gst_rate: selected.applicable_gst_rate,
      };
      return copy;
    });
  };

  // Update item field
  const handleUpdateItem = (index: number, field: keyof LineItemInput, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]:
          field === 'quantity' || field === 'unit_rate' || field === 'discount_amount' || field === 'gst_rate'
            ? parseFloat(value) || 0
            : value,
      };
      return copy;
    });
  };

  // Recalculate live totals using supplier state Bihar (10)
  const totals: QuotationTotals = calculateQuotationTotals(
    items,
    isGstApplicable,
    placeOfSupplyStateCode
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

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    if (isEdit && initialData?.id) {
      formData.append('quotationId', initialData.id);
    }
    formData.append('customerId', customerId);
    if (enquiryId) formData.append('enquiryId', enquiryId);
    formData.append('placeOfSupplyStateCode', placeOfSupplyStateCode);
    formData.append('isGstApplicable', String(isGstApplicable));
    formData.append('validityDays', String(validityDays));
    formData.append('deliveryLocation', deliveryLocation);
    formData.append('paymentTerms', paymentTerms);
    if (termsConditions) formData.append('termsConditions', termsConditions);
    if (notes) formData.append('notes', notes);
    formData.append('itemsJson', JSON.stringify(items));

    startTransition(async () => {
      if (isEdit) {
        const res = await updateDraftQuotationAction(null, formData);
        if (res.error) {
          setError(res.error);
        } else if (res.data?.quotationId) {
          router.push(`/staff/quotations/${res.data.quotationId}`);
        }
      } else {
        const res = await createQuotationAction(null, formData);
        if (res.error) {
          setError(res.error);
        } else if (res.data?.quotationId) {
          router.push(`/staff/quotations/${res.data.quotationId}`);
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">{isEdit ? 'Quotation update failed' : 'Quotation creation failed'}</h4>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* 1. Customer Selection & Quotation Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-[#10243B] uppercase tracking-wider">
            1. Client & Commercial Coordinates
          </h3>
          <Link
            href="/staff/customers/new"
            className="text-xs font-semibold text-[#10243B] hover:underline"
          >
            + Register New Customer
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className={formLabelClasses}>
              Select Client / Organization <span className="text-red-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              required
              className={formSelectClasses}
            >
              <option value="" disabled>-- Select Existing Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name} ({c.primary_contact_person}) {c.gstin ? `— GSTIN: ${c.gstin}` : ''}
                </option>
              ))}
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
            >
              <option value="">-- Place of Supply Pending (Required for Taxable Quote) --</option>
              <option value="10">10 — Bihar (Intra-State: CGST + SGST)</option>
              <option value="07">07 — Delhi (Inter-State: IGST)</option>
              <option value="09">09 — Uttar Pradesh (Inter-State: IGST)</option>
              <option value="06">06 — Haryana (Inter-State: IGST)</option>
              <option value="20">20 — Jharkhand (Inter-State: IGST)</option>
              <option value="19">19 — West Bengal (Inter-State: IGST)</option>
              <option value="21">21 — Odisha (Inter-State: IGST)</option>
              <option value="08">08 — Rajasthan (Inter-State: IGST)</option>
              <option value="27">27 — Maharashtra (Inter-State: IGST)</option>
              <option value="23">23 — Madhya Pradesh (Inter-State: IGST)</option>
              <option value="24">24 — Gujarat (Inter-State: IGST)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 pt-4 border-t border-slate-100">
          <div>
            <label className={formLabelClasses}>
              GST Application
            </label>
            <div className="flex items-center gap-3 mt-2">
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={isGstApplicable}
                  onChange={(e) => setIsGstApplicable(e.target.checked)}
                  className="rounded text-[#10243B] focus:ring-[#10243B] w-4 h-4"
                />
                <span className="font-medium text-slate-900">
                  {isGstApplicable ? 'Taxable Supply (GST Applicable)' : 'Exempt / Non-GST'}
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className={formLabelClasses}>
              Validity Period (Days)
            </label>
            <input
              type="number"
              min="1"
              max="180"
              value={validityDays}
              onChange={(e) => setValidityDays(parseInt(e.target.value, 10) || 30)}
              className={formInputClasses}
            />
          </div>

          <div>
            <label className={formLabelClasses}>
              Delivery Destination / Site <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Project Site, Sector 62, Noida"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              className={formInputClasses}
            />
          </div>
        </div>
      </div>

      {/* 2. Quotation Line Items Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#10243B] uppercase tracking-wider">
              2. Machinery, Rentals & Service Line Items
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select standard machinery from master catalog or input custom procurement items.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10243B] text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Line Item
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="p-4 border border-slate-200 rounded-lg bg-slate-50/70 space-y-3 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Line Item #{index + 1}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-600 hover:text-red-800 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>

              {catalogItems.length > 0 && (
                <div className="w-full md:w-1/3">
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Autofill From Master Catalog
                  </label>
                  <select
                    onChange={(e) => handleSelectCatalogItem(index, e.target.value)}
                    defaultValue=""
                    className={tableSelectClasses}
                  >
                    <option value="">-- Choose Machinery / Item --</option>
                    {catalogItems.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.sku}) — ₹{cat.default_unit_price.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Item Description / Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 20-Ton Hydraulic Excavator with Operator"
                    value={item.item_name}
                    onChange={(e) => handleUpdateItem(index, 'item_name', e.target.value)}
                    className={tableInputClasses}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 84295200"
                    value={item.hsn_sac_code || ''}
                    onChange={(e) => handleUpdateItem(index, 'hsn_sac_code', e.target.value)}
                    className={tableInputClasses}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                    className={tableInputClasses}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={item.unit || 'unit'}
                    onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}
                    className={tableInputClasses}
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
                    required
                    value={item.unit_rate}
                    onChange={(e) => handleUpdateItem(index, 'unit_rate', e.target.value)}
                    className={tableInputClasses}
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
                    value={item.discount_amount || 0}
                    onChange={(e) => handleUpdateItem(index, 'discount_amount', e.target.value)}
                    className={tableInputClasses}
                  />
                </div>

                {isGstApplicable && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      GST Rate (%)
                    </label>
                    <select
                      value={item.gst_rate || 18}
                      onChange={(e) => handleUpdateItem(index, 'gst_rate', e.target.value)}
                      className={tableSelectClasses}
                    >
                      <option value="0">0% (Nil)</option>
                      <option value="5">5% (Concessional)</option>
                      <option value="12">12% (Standard Low)</option>
                      <option value="18">18% (Standard Services/Machinery)</option>
                      <option value="28">28% (Luxury/Special)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Line Total (₹)
                  </label>
                  <div className="w-full bg-slate-100 border border-slate-300 rounded px-2.5 py-2 text-xs font-bold text-slate-900 text-right font-mono">
                    ₹{totals.items[index]?.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Live Financial Summary Card */}
      <TaxBreakdownCard
        title="3. Live Quotation Financial & GST Totals"
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
        isGstApplicable={isGstApplicable}
        taxDetermination={totals.tax_determination}
        rateBreakdown={rateBreakdownList}
        isDark={true}
      />

      {/* 4. Commercial & Payment Terms */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-[#10243B] uppercase tracking-wider pb-2 border-b border-slate-100">
          4. Commercial Terms & Internal Notes
        </h3>

        <div>
          <label className={formLabelClasses}>
            Payment Terms
          </label>
          <input
            type="text"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            className={formInputClasses}
          />
        </div>

        <div>
          <label className={formLabelClasses}>
            Quotation Terms & Conditions (Visible to Client)
          </label>
          <textarea
            rows={3}
            placeholder="Statutory warranties, delivery schedule, escalation clauses..."
            value={termsConditions}
            onChange={(e) => setTermsConditions(e.target.value)}
            className={formInputClasses}
          />
        </div>

        <div>
          <label className={formLabelClasses}>
            Internal Remarks / Estimator Notes (Staff Only)
          </label>
          <textarea
            rows={2}
            placeholder="Subcontractor cost assumptions, tender margin notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={formInputClasses}
          />
        </div>
      </div>

      {/* Form Submission Actions */}
      <div className="flex items-center justify-between pt-4">
        <Link
          href={isEdit && initialData?.id ? `/staff/quotations/${initialData.id}` : '/staff/quotations'}
          className="text-sm font-semibold text-slate-400 hover:text-white transition"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#10243B] text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition shadow disabled:opacity-50"
        >
          {isPending ? (
            <span>{isEdit ? 'Saving Changes...' : 'Generating Quotation...'}</span>
          ) : (
            <>
              <FileCheck className="w-4 h-4 text-gold-400" />
              <span>{isEdit ? 'Save Changes to Draft' : 'Save as Draft Quotation'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
