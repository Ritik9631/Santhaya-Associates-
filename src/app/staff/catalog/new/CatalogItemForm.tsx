'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createCatalogItemAction, updateCatalogItemAction } from '@/lib/catalog/actions';
import { Package, AlertCircle, Loader2, Check, ShieldCheck } from 'lucide-react';

interface CatalogItemFormProps {
  initialData?: {
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
  };
  isEdit?: boolean;
}

export function CatalogItemForm({ initialData, isEdit }: CatalogItemFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [itemType, setItemType] = useState(initialData?.item_type || 'product');
  const [gstRate, setGstRate] = useState(String(initialData?.applicable_gst_rate ?? 18.0));

  const standardCategories = [
    'Construction Machinery (Sales)',
    'Manufacturing & Industrial Machinery',
    'Heavy Equipment (Rental)',
    'Construction Tender Services',
    'Civil Engineering Consultancy',
    'Aggregates & Construction Materials',
    'Other Approved Services',
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    if (isEdit && initialData?.id) {
      formData.append('itemId', initialData.id);
      const res = await updateCatalogItemAction(null, formData);
      setLoading(false);
      if (res.error) {
        setError(res.error);
      } else {
        router.push(`/staff/catalog/${initialData.id}`);
      }
    } else {
      const res = await createCatalogItemAction(null, formData);
      setLoading(false);
      if (res.error) {
        setError(res.error);
      } else if (res.data?.itemId) {
        router.push(`/staff/catalog/${res.data.itemId}`);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6 shadow-xl">
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Item Classification */}
      <div className="space-y-1.5">
        <label htmlFor="itemType" className="block text-xs font-semibold text-slate-300">
          Catalog Classification <span className="text-gold-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { value: 'product', label: 'Machinery / Goods', desc: 'Outright machinery and equipment sales' },
            { value: 'rental', label: 'Equipment Rental', desc: 'Hourly, daily, or monthly equipment lease' },
            { value: 'service', label: 'Tender / Services', desc: 'Tender estimation, contracts, and consultancy' },
          ].map((typeOpt) => (
            <label
              key={typeOpt.value}
              className={`p-3 rounded-xl border cursor-pointer transition-colors flex items-start gap-2.5 ${
                itemType === typeOpt.value
                  ? 'bg-gold-500/10 border-gold-500/40 text-gold-400'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="itemType"
                value={typeOpt.value}
                checked={itemType === typeOpt.value}
                onChange={() => setItemType(typeOpt.value)}
                className="mt-0.5 text-gold-500 focus:ring-gold-500"
              />
              <div className="space-y-0.5">
                <div className="text-xs font-semibold">{typeOpt.label}</div>
                <div className="text-[10px] text-slate-400">{typeOpt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* SKU */}
        <div className="space-y-1.5">
          <label htmlFor="sku" className="block text-xs font-semibold text-slate-300">
            SKU / Internal Item Code <span className="text-gold-400">*</span>
          </label>
          <input
            id="sku"
            name="sku"
            type="text"
            required
            disabled={loading || isEdit}
            defaultValue={initialData?.sku || ''}
            placeholder="e.g. MACH-EXC-20T"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 font-mono text-xs text-gold-400 placeholder-slate-500 uppercase focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>

        {/* Item Name */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-xs font-semibold text-slate-300">
            Item / Service Name <span className="text-gold-400">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            defaultValue={initialData?.name || ''}
            disabled={loading}
            placeholder="e.g. Hydraulic Excavator 20-Ton Class"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Category */}
        <div className="space-y-1.5">
          <label htmlFor="category" className="block text-xs font-semibold text-slate-300">
            Operational Category <span className="text-gold-400">*</span>
          </label>
          <input
            id="category"
            name="category"
            type="text"
            required
            list="categoryOptions"
            defaultValue={initialData?.category || 'Construction Machinery (Sales)'}
            disabled={loading}
            placeholder="Select or enter category"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
          <datalist id="categoryOptions">
            {standardCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        {/* Unit of Measurement */}
        <div className="space-y-1.5">
          <label htmlFor="unitOfMeasurement" className="block text-xs font-semibold text-slate-300">
            Unit of Measurement <span className="text-gold-400">*</span>
          </label>
          <select
            id="unitOfMeasurement"
            name="unitOfMeasurement"
            defaultValue={initialData?.unit_of_measurement || 'unit'}
            disabled={loading}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="unit">unit (Each / Number)</option>
            <option value="hour">hour (Operating / Rental Hour)</option>
            <option value="day">day (Shift / Day)</option>
            <option value="month">month (Monthly Lease)</option>
            <option value="metric_ton">metric_ton (MT)</option>
            <option value="cum">cum (Cubic Metre)</option>
            <option value="sqft">sqft (Square Feet)</option>
            <option value="lot">lot (Lump-sum Contract)</option>
          </select>
        </div>
      </div>

      {/* Pricing and GST Rates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Default Unit Price */}
        <div className="space-y-1.5">
          <label htmlFor="defaultUnitPrice" className="block text-xs font-semibold text-slate-300">
            Default Unit Price (₹ INR) <span className="text-gold-400">*</span>
          </label>
          <input
            id="defaultUnitPrice"
            name="defaultUnitPrice"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={initialData?.default_unit_price ?? 0.0}
            disabled={loading}
            placeholder="0.00"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>

        {/* HSN/SAC Code */}
        <div className="space-y-1.5">
          <label htmlFor="hsnSacCode" className="block text-xs font-semibold text-slate-300">
            HSN / SAC Code <span className="text-slate-500 text-[11px]">(Statutory)</span>
          </label>
          <input
            id="hsnSacCode"
            name="hsnSacCode"
            type="text"
            maxLength={10}
            defaultValue={initialData?.hsn_sac_code || ''}
            disabled={loading}
            placeholder="e.g. 8429 (Goods) / 9983 (Services)"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 font-mono text-xs text-gold-400 placeholder-slate-500 uppercase focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>

        {/* GST Rate */}
        <div className="space-y-1.5">
          <label htmlFor="applicableGstRate" className="block text-xs font-semibold text-slate-300">
            Applicable GST Rate (%) <span className="text-gold-400">*</span>
          </label>
          <select
            id="applicableGstRate"
            name="applicableGstRate"
            value={gstRate}
            onChange={(e) => setGstRate(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 font-mono text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
          >
            <option value="18.00">18.00% (Standard Machinery & Services)</option>
            <option value="28.00">28.00% (Specialized Heavy Machinery / Vehicles)</option>
            <option value="12.00">12.00% (Selected Fabrication & Equipment)</option>
            <option value="5.00">5.00% (Concessional Construction Supplies)</option>
            <option value="0.00">0.00% (Exempt / Non-GST)</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-xs font-semibold text-slate-300">
          Commercial Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initialData?.description || ''}
          disabled={loading}
          placeholder="Detailed description for quotation line items and invoice specifications"
          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
        />
      </div>

      {/* Technical Specifications */}
      <div className="space-y-1.5">
        <label htmlFor="specifications" className="block text-xs font-semibold text-slate-300">
          Technical Specifications <span className="text-slate-500 text-[11px]">(JSON format or technical remarks)</span>
        </label>
        <textarea
          id="specifications"
          name="specifications"
          rows={3}
          defaultValue={
            initialData?.technical_specifications
              ? JSON.stringify(initialData.technical_specifications, null, 2)
              : '{\n  "enginePower": "150 HP",\n  "operatingWeight": "21000 kg",\n  "bucketCapacity": "1.0 cum"\n}'
          }
          disabled={loading}
          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 font-mono text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-slate-800 pt-5">
        <Link
          href="/staff/catalog"
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-slate-900 bg-gold-400 hover:bg-gold-300 transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Catalog Item...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>{isEdit ? 'Update Item' : 'Add Item to Catalog'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

