'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createQuotationAction } from '@/lib/quotation/actions';
import {
  calculateQuotationTotals,
  type LineItemInput,
  type QuotationTotals,
} from '@/lib/quotation/calculations';
import { Plus, Trash2, Calculator, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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

interface QuotationFormProps {
  customers: CustomerOption[];
  catalogItems: CatalogOption[];
  defaultCustomerId?: string;
  defaultEnquiryId?: string;
}

export default function QuotationForm({
  customers,
  catalogItems,
  defaultCustomerId,
  defaultEnquiryId,
}: QuotationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form State
  const defaultCust = customers.find((c) => c.id === defaultCustomerId) || customers[0];
  const [customerId, setCustomerId] = useState(defaultCustomerId || (customers[0]?.id || ''));
  const [enquiryId, setEnquiryId] = useState(defaultEnquiryId || '');
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState(defaultCust?.state_code || '');
  const [isGstApplicable, setIsGstApplicable] = useState(true);
  const [validityDays, setValidityDays] = useState(30);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(
    '100% advance against Proforma Invoice or 30 days credit on approved LC'
  );
  const [termsConditions, setTermsConditions] = useState('');
  const [notes, setNotes] = useState('');

  // Line items state
  const [items, setItems] = useState<LineItemInput[]>([
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
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Compute live totals
  const totals: QuotationTotals = calculateQuotationTotals(
    items,
    isGstApplicable,
    placeOfSupplyStateCode
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError('Please select or create a customer.');
      return;
    }
    if (!deliveryLocation) {
      setError('Please provide a delivery location or site address.');
      return;
    }
    if (items.some((i) => !i.item_name.trim())) {
      setError('All line items must have a valid item name.');
      return;
    }

    const formData = new FormData();
    formData.append('customerId', customerId);
    if (enquiryId) formData.append('enquiryId', enquiryId);
    formData.append('placeOfSupplyStateCode', placeOfSupplyStateCode);
    formData.append('isGstApplicable', isGstApplicable ? 'true' : 'false');
    formData.append('validityDays', validityDays.toString());
    formData.append('deliveryLocation', deliveryLocation);
    formData.append('paymentTerms', paymentTerms);
    if (termsConditions) formData.append('termsConditions', termsConditions);
    if (notes) formData.append('notes', notes);
    formData.append('itemsJson', JSON.stringify(items));

    startTransition(async () => {
      const res = await createQuotationAction(null, formData);
      if (res.error) {
        setError(res.error);
      } else if (res.data?.quotationId) {
        router.push(`/staff/quotations/${res.data.quotationId}`);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Unable to create quotation</h4>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* 1. Client & Commercial Scope */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
          <span>1. Customer & Place of Supply</span>
          <Link
            href="/staff/customers/new"
            className="text-xs font-semibold text-[#10243B] hover:underline"
          >
            + Register New Customer
          </Link>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Client / Organization <span className="text-red-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10243B]"
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Place of Supply (State Code) <span className="text-red-500">*</span>
            </label>
            <select
              value={placeOfSupplyStateCode}
              onChange={(e) => setPlaceOfSupplyStateCode(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10243B]"
            >
              <option value="">-- Place of Supply Pending (Required for Taxable Quote) --</option>
              <option value="07">07 — Delhi (Intra-State: CGST + SGST)</option>
              <option value="09">09 — Uttar Pradesh (Inter-State: IGST)</option>
              <option value="06">06 — Haryana (Inter-State: IGST)</option>
              <option value="10">10 — Bihar (Inter-State: IGST)</option>
              <option value="08">08 — Rajasthan (Inter-State: IGST)</option>
              <option value="19">19 — West Bengal (Inter-State: IGST)</option>
              <option value="27">27 — Maharashtra (Inter-State: IGST)</option>
              <option value="23">23 — Madhya Pradesh (Inter-State: IGST)</option>
              <option value="24">24 — Gujarat (Inter-State: IGST)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Validity Period (Days)
            </label>
            <input
              type="number"
              min="1"
              max="180"
              value={validityDays}
              onChange={(e) => setValidityDays(parseInt(e.target.value, 10) || 30)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10243B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Delivery Destination / Site <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Project Site, Sector 62, Noida"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#10243B]"
            />
          </div>
        </div>
      </div>

      {/* 2. Quotation Line Items Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">2. Itemized Products & Services</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Add catalog items or custom line items with exact decimal pricing and GST.
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
              className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 relative group"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700">Line Item #{index + 1}</span>
                {catalogItems.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Pick from Catalog:</span>
                    <select
                      onChange={(e) => handleSelectCatalogItem(index, e.target.value)}
                      defaultValue=""
                      className="bg-white border border-slate-300 rounded text-xs px-2 py-1 text-slate-700 focus:outline-none"
                    >
                      <option value="" disabled>-- Select Catalog Item --</option>
                      {catalogItems.map((c) => (
                        <option key={c.id} value={c.id}>
                          [{c.sku}] {c.name} (₹{c.default_unit_price})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="text-red-600 hover:text-red-800 p-1 rounded"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Item / Service Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hydraulic Excavator 20T Supply"
                    value={item.item_name}
                    onChange={(e) => handleUpdateItem(index, 'item_name', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 84295200"
                    value={item.hsn_sac_code || ''}
                    onChange={(e) => handleUpdateItem(index, 'hsn_sac_code', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-sm font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={item.unit || 'unit'}
                    onChange={(e) => handleUpdateItem(index, 'unit', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Unit Rate (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={item.unit_rate}
                    onChange={(e) => handleUpdateItem(index, 'unit_rate', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-sm font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Discount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.discount_amount || 0}
                    onChange={(e) => handleUpdateItem(index, 'discount_amount', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-sm text-slate-900"
                  />
                </div>

                {isGstApplicable && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                      GST Rate (%)
                    </label>
                    <select
                      value={item.gst_rate || 18}
                      onChange={(e) => handleUpdateItem(index, 'gst_rate', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm text-slate-900"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                    Line Total (₹)
                  </label>
                  <div className="w-full bg-slate-100 border border-slate-300 rounded px-2.5 py-1.5 text-sm font-bold text-slate-900 text-right">
                    ₹{totals.items[index]?.line_total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Live Financial Summary & Indian Word Total */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-6 shadow-md">
        <h3 className="text-base font-bold text-[#F4B323] mb-4 pb-2 border-b border-slate-800 flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          <span>3. Live Quotation Totals & GST Allocation</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          <div className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Amount in Words:
              </p>
              <p className="text-sm font-semibold text-amber-200 mt-1 italic bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                {totals.amount_in_words}
              </p>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <p>
                • Supply Nature:{' '}
                {!isGstApplicable
                  ? 'Non-GST Commercial Quotation'
                  : totals.tax_determination === 'intra_state'
                  ? 'Intra-State (Delhi to Delhi: CGST + SGST)'
                  : totals.tax_determination === 'inter_state'
                  ? 'Inter-State (IGST)'
                  : 'Undetermined (Place of Supply Pending)'}
              </p>
              <p>• Rounding: Standard statutory round-off applied.</p>
            </div>
          </div>

          <div className="space-y-2 bg-slate-800/40 p-4 rounded-lg border border-slate-700/60 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Gross Subtotal:</span>
              <span className="font-semibold text-white">₹{totals.subtotal_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {totals.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Total Discount:</span>
                <span>- ₹{totals.discount_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-200 pt-1 border-t border-slate-700">
              <span className="font-semibold">Taxable Subtotal:</span>
              <span className="font-semibold">₹{totals.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            {isGstApplicable && (
              <>
                {totals.tax_determination === 'undetermined' ? (
                  <div className="bg-amber-950/60 border border-amber-600/60 text-amber-300 p-2.5 rounded text-xs space-y-1 my-1">
                    <p className="font-semibold text-amber-200">⚠️ Tax Determination Pending (Undetermined)</p>
                    <p className="text-[11px] text-amber-300/90 leading-relaxed">
                      Place of Supply is not specified or invalid. GST cannot be determined or issued until a valid 2-digit State Code is provided.
                    </p>
                  </div>
                ) : totals.is_intra_state ? (
                  <>
                    <div className="flex justify-between text-slate-400">
                      <span>Central GST (CGST):</span>
                      <span>₹{totals.cgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>State GST (SGST):</span>
                      <span>₹{totals.sgst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-400">
                    <span>Integrated GST (IGST):</span>
                    <span>₹{totals.igst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between items-center text-sm font-bold text-[#F4B323] pt-3 border-t-2 border-slate-700">
              <span className="text-white">Grand Total (INR):</span>
              <span className="text-lg">
                {totals.tax_determination === 'undetermined' && isGstApplicable ? (
                  <span className="text-amber-300 text-sm font-medium">
                    ₹{totals.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} + GST (Pending)
                  </span>
                ) : (
                  `₹${totals.grand_total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Terms, Conditions & Notes */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
          4. Commercial Terms & Internal Notes
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Payment Terms
            </label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Special Terms & Conditions (Optional)
            </label>
            <textarea
              rows={2}
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              placeholder="e.g. Transit insurance included, unloading at client scope."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Link
          href="/staff/quotations"
          className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-[#10243B] text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition shadow disabled:opacity-50"
        >
          {isPending ? 'Generating Quotation Draft...' : 'Create Quotation Draft'}
        </button>
      </div>
    </form>
  );
}

