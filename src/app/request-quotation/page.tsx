'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Send,
  Info,
  RotateCcw,
} from 'lucide-react';

const quotationSchema = z.object({
  businessName: z.string().min(2, 'Business or organization name is required'),
  contactPerson: z.string().min(2, 'Contact person name is required'),
  email: z.string().email('Please enter a valid business email address'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number (e.g., 9876543210)'),
  gstin: z
    .string()
    .trim()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      'Invalid GSTIN format (15 characters alphanumeric, e.g. 29ABCDE1234F1Z5)'
    )
    .optional()
    .or(z.literal('')),
  serviceCategory: z.enum(
    ['construction-tenders', 'construction-machinery', 'manufacturing-machinery'],
    {
      errorMap: () => ({ message: 'Please select an approved service category' }),
    }
  ),
  requirementDetails: z
    .string()
    .min(10, 'Please provide specific requirements (minimum 10 characters)'),
  quantity: z.string().optional(),
  technicalSpecs: z.string().optional(),
  deliveryLocation: z.string().min(2, 'Delivery state or location is required'),
  notes: z.string().optional(),
  privacyConsent: z.literal(true, {
    errorMap: () => ({
      message: 'You must acknowledge the demo data notice and terms to test validation',
    }),
  }),
});

type QuotationFormData = z.infer<typeof quotationSchema>;

export default function RequestQuotationPage() {
  const [formData, setFormData] = useState<Partial<QuotationFormData>>({
    serviceCategory: 'construction-tenders',
    privacyConsent: false as any,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validatedData, setValidatedData] = useState<QuotationFormData | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidatedData(null);

    const result = quotationSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
    } else {
      setErrors({});
      setValidatedData(result.data);
    }
  };

  const handleReset = () => {
    setFormData({
      businessName: '',
      contactPerson: '',
      email: '',
      phone: '',
      gstin: '',
      serviceCategory: 'construction-tenders',
      requirementDetails: '',
      quantity: '',
      technicalSpecs: '',
      deliveryLocation: '',
      notes: '',
      privacyConsent: false as any,
    });
    setErrors({});
    setValidatedData(null);
  };

  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Page Heading */}
        <div className="space-y-2 border-b border-slate-200 pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy-100 text-navy-900 text-xs font-semibold">
            <FileText className="w-3.5 h-3.5 text-gold-600" />
            Official Quotation Intake
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight">
            Request an Industrial Quotation
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Submit technical requirements, tender specifications, or machinery fleet requests to Santhaya Associates Pvt. Ltd.
          </p>
        </div>

        {/* Phase 1 Non-Operational Demo Warning (PRD Rule 4 / RULES Rule 8) */}
        <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-5 shadow-sm space-y-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wide">
                Phase 1 Demonstration Mode — Non-Operational Form
              </h2>
              <p className="text-xs text-amber-800 leading-relaxed mt-1">
                This form demonstrates client-side schema validation for testing purposes only. 
                <strong> No data is transmitted to an email server or stored in a database.</strong> Database persistence, automated email alerts, and staff review workflows are planned for Phase 2. Do not enter confidential commercial secrets.
              </p>
            </div>
          </div>
        </div>

        {/* Validation Success State (Explicitly does NOT claim fake submission) */}
        {validatedData && (
          <div className="rounded-xl bg-emerald-50 border-2 border-emerald-300 p-5 shadow-sm space-y-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-emerald-950">
                  Client Validation Succeeded (Demo Simulation)
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  All <strong>{validatedData.businessName}</strong> fields conformed strictly to the Zod schema validation rules.
                  As stated in project governance, no backend request was created.
                </p>
              </div>
            </div>
            <div className="bg-white/80 p-3 rounded-lg border border-emerald-200 text-xs text-emerald-900 font-mono overflow-x-auto">
              <p className="font-semibold mb-1 text-[11px] uppercase tracking-wider text-emerald-700">Validated Input Snapshot:</p>
              <pre>{JSON.stringify({ ...validatedData, privacyConsent: true }, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* The Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-8">
          {/* Section 1: Business Identification */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-navy-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Building className="w-4 h-4 text-gold-500" />
              1. Business & Contact Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="businessName" className="block text-xs font-semibold text-slate-700 mb-1">
                  Business / Enterprise Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="businessName"
                  value={formData.businessName || ''}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="e.g. Apex Civil Infra Pvt Ltd"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all ${
                    errors.businessName ? 'border-red-400 bg-red-50/30' : 'border-slate-300 bg-white'
                  }`}
                />
                {errors.businessName && <p className="text-xs text-red-600 mt-1">{errors.businessName}</p>}
              </div>

              <div>
                <label htmlFor="contactPerson" className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="contactPerson"
                  value={formData.contactPerson || ''}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Full Name"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all ${
                    errors.contactPerson ? 'border-red-400 bg-red-50/30' : 'border-slate-300 bg-white'
                  }`}
                />
                {errors.contactPerson && <p className="text-xs text-red-600 mt-1">{errors.contactPerson}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@company.com"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all ${
                    errors.email ? 'border-red-400 bg-red-50/30' : 'border-slate-300 bg-white'
                  }`}
                />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 mb-1">
                  Indian Mobile / Phone (10 Digits) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-500 font-semibold">
                    +91
                  </span>
                  <input
                    type="tel"
                    id="phone"
                    maxLength={10}
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="9876543210"
                    className={`w-full pl-11 pr-3.5 py-2.5 rounded-lg border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all ${
                      errors.phone ? 'border-red-400 bg-red-50/30' : 'border-slate-300 bg-white'
                    }`}
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="gstin" className="block text-xs font-semibold text-slate-700 mb-1">
                  GSTIN (Optional — 15 Characters)
                </label>
                <input
                  type="text"
                  id="gstin"
                  maxLength={15}
                  value={formData.gstin || ''}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all uppercase ${
                    errors.gstin ? 'border-red-400 bg-red-50/30' : 'border-slate-300 bg-white'
                  }`}
                />
                {errors.gstin && <p className="text-xs text-red-600 mt-1">{errors.gstin}</p>}
              </div>
            </div>
          </div>

          {/* Section 2: Service & Technical Scope */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-navy-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gold-500" />
              2. Scope of Requirements
            </h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="serviceCategory" className="block text-xs font-semibold text-slate-700 mb-1">
                  Approved Service Scope Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="serviceCategory"
                  value={formData.serviceCategory}
                  onChange={(e) => setFormData({ ...formData, serviceCategory: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500"
                >
                  <option value="construction-tenders">Government & Private Construction Tenders</option>
                  <option value="construction-machinery">Construction Machinery Supply</option>
                  <option value="manufacturing-machinery">Manufacturing Machinery Supply</option>
                </select>
                {errors.serviceCategory && (
                  <p className="text-xs text-red-600 mt-1">{errors.serviceCategory}</p>
                )}
              </div>

              <div>
                <label htmlFor="requirementDetails" className="block text-xs font-semibold text-slate-700 mb-1">
                  Item / Project Requirement Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="requirementDetails"
                  rows={3}
                  value={formData.requirementDetails || ''}
                  onChange={(e) => setFormData({ ...formData, requirementDetails: e.target.value })}
                  placeholder="Describe the machinery model, tender title, civil work package, or industrial specification..."
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all ${
                    errors.requirementDetails ? 'border-red-400 bg-red-50/30' : 'border-slate-300 bg-white'
                  }`}
                />
                {errors.requirementDetails && (
                  <p className="text-xs text-red-600 mt-1">{errors.requirementDetails}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="quantity" className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimated Quantity / Units (Optional)
                  </label>
                  <input
                    type="text"
                    id="quantity"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="e.g. 2 Excavators / 1 Batching Plant"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>

                <div>
                  <label htmlFor="deliveryLocation" className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery State / Site Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="deliveryLocation"
                    value={formData.deliveryLocation || ''}
                    onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                    placeholder="e.g. Maharashtra / Karnataka"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all ${
                      errors.deliveryLocation ? 'border-red-400 bg-red-50/30' : 'border-slate-300 bg-white'
                    }`}
                  />
                  {errors.deliveryLocation && (
                    <p className="text-xs text-red-600 mt-1">{errors.deliveryLocation}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="technicalSpecs" className="block text-xs font-semibold text-slate-700 mb-1">
                  Technical Specifications / Capacity Requirements (Optional)
                </label>
                <textarea
                  id="technicalSpecs"
                  rows={2}
                  value={formData.technicalSpecs || ''}
                  onChange={(e) => setFormData({ ...formData, technicalSpecs: e.target.value })}
                  placeholder="e.g. 20-ton operating weight, Euro IV emission standard, hydraulic flow rates..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Privacy & Demo Acknowledgment */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="privacyConsent"
                checked={!!formData.privacyConsent}
                onChange={(e) => setFormData({ ...formData, privacyConsent: e.target.checked as any })}
                className="w-4 h-4 mt-0.5 rounded border-slate-300 text-navy-900 focus:ring-gold-500"
              />
              <label htmlFor="privacyConsent" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                I understand this is a <span className="font-semibold text-navy-900">Phase 1 non-operational demonstration form</span>. I confirm that this submission validates client-side schemas only and does not transmit confidential financial or personal data.
              </label>
            </div>
            {errors.privacyConsent && (
              <p className="text-xs text-red-600 pl-7">{errors.privacyConsent}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Form
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-navy-900 hover:bg-navy-950 text-white shadow-md hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
            >
              <Send className="w-4 h-4 text-gold-400" />
              <span>Validate & Simulate Demo Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
