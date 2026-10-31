'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createCustomerAction, updateCustomerAction } from '@/lib/customers/actions';
import { Building2, AlertCircle, Loader2, ArrowLeft, ShieldCheck, Check } from 'lucide-react';
import type { CustomerType } from '@/types/database';

interface CustomerFormProps {
  initialData?: {
    id: string;
    company_name: string;
    primary_contact_person: string;
    customer_type?: CustomerType;
    client_type?: CustomerType;
    email?: string | null;
    phone?: string | null;
    gstin?: string | null;
    pan?: string | null;
    billing_address?: string | null;
    shipping_address?: string | null;
    state?: string | null;
    state_code?: string | null;
    notes?: string | null;
  };
  isEdit?: boolean;
}

export function CustomerForm({ initialData, isEdit }: CustomerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerType, setCustomerType] = useState<CustomerType>(
    initialData?.customer_type || initialData?.client_type || 'private_corporate'
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    if (isEdit && initialData?.id) {
      formData.append('customerId', initialData.id);
      const res = await updateCustomerAction(null, formData);
      setLoading(false);
      if (res.error) {
        setError(res.error);
      } else {
        router.push(`/staff/customers/${initialData.id}`);
      }
    } else {
      const res = await createCustomerAction(null, formData);
      setLoading(false);
      if (res.error) {
        setError(res.error);
      } else if (res.data?.customerId) {
        router.push(`/staff/customers/${res.data.customerId}`);
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

      {/* Customer Classification */}
      <div className="space-y-1.5">
        <label htmlFor="customerType" className="block text-xs font-semibold text-slate-300">
          Customer Classification <span className="text-gold-400">*</span>
        </label>
        <select
          id="customerType"
          name="customerType"
          value={customerType}
          onChange={(e) => setCustomerType(e.target.value as CustomerType)}
          disabled={loading}
          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
        >
          <option value="private_corporate">Private Corporate / Commercial Enterprise</option>
          <option value="government">Government Department / Public Sector Agency</option>
          <option value="contractor">Civil / Infrastructure Contractor</option>
          <option value="individual">Individual / Proprietorship</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Company Name */}
        <div className="space-y-1.5">
          <label htmlFor="companyName" className="block text-xs font-semibold text-slate-300">
            {customerType === 'individual' ? 'Business / Trading Name (Optional)' : 'Company / Organization Name'}
            {customerType !== 'individual' && <span className="text-gold-400"> *</span>}
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            required={customerType !== 'individual'}
            defaultValue={initialData?.company_name || ''}
            disabled={loading}
            placeholder={customerType === 'individual' ? 'e.g. Ramesh Traders' : 'e.g. L&T Construction Ltd.'}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>

        {/* Primary Contact Person */}
        <div className="space-y-1.5">
          <label htmlFor="contactPerson" className="block text-xs font-semibold text-slate-300">
            Primary Contact Person <span className="text-gold-400">*</span>
          </label>
          <input
            id="contactPerson"
            name="contactPerson"
            type="text"
            required
            minLength={2}
            defaultValue={initialData?.primary_contact_person || ''}
            disabled={loading}
            placeholder="e.g. K. V. Sundaram"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Optional Contact Methods Callout */}
      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400">
        <span className="text-slate-300 font-semibold block text-[11px] uppercase tracking-wider mb-0.5">
          Direct Customer Notice
        </span>
        Both Email and Phone are completely optional. Customer records may be provisioned without contact details for walk-in or manual records.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Email (Optional) */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-semibold text-slate-300">
            Email Address <span className="text-slate-500 text-[11px]">(Optional)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={initialData?.email || ''}
            disabled={loading}
            placeholder="e.g. procurement@company.com"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>

        {/* Phone (Optional) */}
        <div className="space-y-1.5">
          <label htmlFor="phone" className="block text-xs font-semibold text-slate-300">
            Phone Number <span className="text-slate-500 text-[11px]">(Optional — 10 Digits)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={initialData?.phone || ''}
            disabled={loading}
            placeholder="e.g. 9876543210"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Statutory Tax Identifiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* GSTIN */}
        <div className="space-y-1.5">
          <label htmlFor="gstin" className="block text-xs font-semibold text-slate-300">
            Statutory GSTIN <span className="text-slate-500 text-[11px]">(Optional — 15 Characters)</span>
          </label>
          <input
            id="gstin"
            name="gstin"
            type="text"
            maxLength={15}
            defaultValue={initialData?.gstin || ''}
            disabled={loading}
            placeholder="e.g. 33AAAAA0000A1Z5"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 font-mono text-xs text-gold-400 placeholder-slate-500 uppercase focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>

        {/* PAN */}
        <div className="space-y-1.5">
          <label htmlFor="pan" className="block text-xs font-semibold text-slate-300">
            Statutory PAN <span className="text-slate-500 text-[11px]">(Optional — 10 Characters)</span>
          </label>
          <input
            id="pan"
            name="pan"
            type="text"
            maxLength={10}
            defaultValue={initialData?.pan || ''}
            disabled={loading}
            placeholder="e.g. ABCDE1234F"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 font-mono text-xs text-gold-400 placeholder-slate-500 uppercase focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Address Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label htmlFor="billingAddress" className="block text-xs font-semibold text-slate-300">
            Billing Address
          </label>
          <textarea
            id="billingAddress"
            name="billingAddress"
            rows={2}
            defaultValue={initialData?.billing_address || ''}
            disabled={loading}
            placeholder="Registered statutory business address"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="shippingAddress" className="block text-xs font-semibold text-slate-300">
            Shipping / Worksite Address
          </label>
          <textarea
            id="shippingAddress"
            name="shippingAddress"
            rows={2}
            defaultValue={initialData?.shipping_address || ''}
            disabled={loading}
            placeholder="Construction site or delivery location"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* State & State Code */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <label htmlFor="state" className="block text-xs font-semibold text-slate-300">
            State (Place of Supply) <span className="text-slate-500 text-[11px]">(Optional)</span>
          </label>
          <input
            id="state"
            name="state"
            type="text"
            defaultValue={initialData?.state || ''}
            disabled={loading}
            placeholder="e.g. Bihar / Maharashtra"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="stateCode" className="block text-xs font-semibold text-slate-300">
            State Code <span className="text-slate-500 text-[11px]">(Optional — 2 Digits)</span>
          </label>
          <input
            id="stateCode"
            name="stateCode"
            type="text"
            maxLength={2}
            defaultValue={initialData?.state_code || ''}
            disabled={loading}
            placeholder="e.g. 10"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 font-mono text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label htmlFor="notes" className="block text-xs font-semibold text-slate-300">
          Internal Customer Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          defaultValue={initialData?.notes || ''}
          disabled={loading}
          placeholder="Credit terms, special tender requirements, or verified staff remarks"
          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-slate-800 pt-5">
        <Link
          href="/staff/customers"
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
              <span>Saving Customer...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>{isEdit ? 'Update Customer' : 'Save Customer Record'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

