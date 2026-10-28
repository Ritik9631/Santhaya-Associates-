'use client';

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Building,
  Mail,
  RotateCcw,
  Send,
  Loader2,
  ShieldCheck,
  Clock,
} from 'lucide-react';

const quotationBaseSchema = z.object({
  businessName: z
    .string({ required_error: 'Business or organization name is required' })
    .trim()
    .min(2, 'Business or organization name is required (minimum 2 characters)')
    .max(200, 'Business name must not exceed 200 characters'),
  contactPerson: z
    .string({ required_error: 'Contact person name is required' })
    .trim()
    .min(2, 'Contact person name is required (minimum 2 characters)')
    .max(100, 'Contact person must not exceed 100 characters'),
  email: z
    .string()
    .trim()
    .max(254, 'Email must not exceed 254 characters')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal('')),
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
    .string({ required_error: 'Project or machinery requirement details are required' })
    .trim()
    .min(10, 'Please provide specific requirements (minimum 10 characters)')
    .max(5000, 'Requirement details must not exceed 5000 characters'),
  quantity: z.string().trim().max(200).optional(),
  technicalSpecs: z.string().trim().max(2000).optional(),
  deliveryLocation: z
    .string({ required_error: 'Delivery state or location is required' })
    .trim()
    .min(2, 'Delivery state or location is required')
    .max(500, 'Delivery location must not exceed 500 characters'),
  notes: z.string().trim().max(1000).optional(),
  privacyConsent: z.literal(true, {
    errorMap: () => ({
      message: 'You must acknowledge the privacy notice to submit quotation inquiry',
    }),
  }),
});

const quotationSchema = quotationBaseSchema.superRefine((data, ctx) => {
  const hasEmail = Boolean(data.email && data.email.trim() !== '');
  const hasPhone = Boolean(data.phone && data.phone.trim() !== '');

  if (!hasEmail && !hasPhone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please provide at least one contact method (email or phone).',
      path: ['email'],
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please provide at least one contact method (email or phone).',
      path: ['phone'],
    });
  }

  if (hasEmail) {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(data.email!.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a valid business email address (e.g. name@company.com)',
        path: ['email'],
      });
    }
  }

  if (hasPhone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(data.phone!.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)',
        path: ['phone'],
      });
    }
  }
});

type QuotationFormData = z.infer<typeof quotationSchema>;

interface SubmissionResponse {
  referenceNumber: string;
  createdAt: string;
  status: 'created' | 'replayed';
}

export default function RequestQuotationPage() {
  const [formData, setFormData] = useState<Partial<QuotationFormData>>({
    serviceCategory: 'construction-tenders',
    privacyConsent: false as any,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<SubmissionResponse | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [rateLimitWait, setRateLimitWait] = useState<number | null>(null);

  // Anti-Spam Hidden Honeypot & Timing
  const [honeypot, setHoneypot] = useState('');
  const [formRenderTs, setFormRenderTs] = useState<number>(Date.now());
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');

  useEffect(() => {
    setFormRenderTs(Date.now());
    // Generate UUID v4 for idempotent submission
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      setIdempotencyKey(crypto.randomUUID());
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setRateLimitWait(null);

    // 1. Client-Side Validation
    const result = quotationSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      // 2. Submit to Secure Server API Gateway
      const payload = {
        ...result.data,
        idempotencyKey,
        _company_fax: honeypot,
        _form_render_ts: formRenderTs,
      };

      const res = await fetch('/api/quotation-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json().catch(() => ({}));

      if (res.status === 429) {
        const retryAfter = responseData.retryAfterSeconds || 60;
        setRateLimitWait(retryAfter);
        setServerError(`Rate limit exceeded. Please wait ${retryAfter} seconds before re-submitting.`);
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        if (responseData.details) {
          setErrors(responseData.details);
        }
        setServerError(responseData.error || `Server returned error (${res.status}).`);
        setIsSubmitting(false);
        return;
      }

      // Success
      setSubmissionSuccess({
        referenceNumber: responseData.referenceNumber,
        createdAt: responseData.createdAt,
        status: responseData.status,
      });
      setIsSubmitting(false);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Network error communicating with server.');
      setIsSubmitting(false);
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
    setSubmissionSuccess(null);
    setServerError(null);
    setRateLimitWait(null);
    setHoneypot('');
    setFormRenderTs(Date.now());
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      setIdempotencyKey(crypto.randomUUID());
    }
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

        {/* Phase 2D-A Preparation Notice */}
        <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-5 shadow-sm space-y-2">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-blue-950 uppercase tracking-wide">
                Phase 2D-A Architecture: Secure Server API Integration
              </h2>
              <p className="text-xs text-blue-900 leading-relaxed mt-1">
                This intake form is prepared with server-side Zod validation, honeypot anti-spam defense, salted IP rate limiting, and atomic idempotency keys. Live remote database persistence and background transactional email notifications will be activated upon human authorization of Phase 2D-B.
              </p>
            </div>
          </div>
        </div>

        {/* Rate Limit Alert */}
        {rateLimitWait && (
          <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-4 shadow-sm flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-950">Too Many Requests</h3>
              <p className="text-xs text-amber-800 mt-1">
                Network rate limit reached. Please wait {rateLimitWait} seconds before submitting again.
              </p>
            </div>
          </div>
        )}

        {/* Server Error Alert */}
        {serverError && !rateLimitWait && (
          <div className="rounded-xl bg-red-50 border-2 border-red-300 p-4 shadow-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-950">Submission Error</h3>
              <p className="text-xs text-red-800 mt-1">{serverError}</p>
            </div>
          </div>
        )}

        {/* Verified Submission Success State */}
        {submissionSuccess && (
          <div className="rounded-xl bg-emerald-50 border-2 border-emerald-300 p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-emerald-950">
                  Quotation Request Successfully Registered
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Your industrial requirement has been received and registered under official reference number:
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Official Inbound Reference
                </span>
                <span className="text-2xl font-black text-navy-950 font-mono tracking-tight">
                  {submissionSuccess.referenceNumber}
                </span>
              </div>
              <div className="text-left sm:text-right text-xs text-slate-500">
                <p>Status: <span className="font-semibold text-emerald-700 capitalize">{submissionSuccess.status}</span></p>
                <p>Timestamp: {new Date(submissionSuccess.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
              </div>
            </div>

            <div className="text-xs text-emerald-900 bg-emerald-100/60 p-3 rounded-lg leading-relaxed">
              Our engineering estimating desk will inspect your specifications and prepare Quotation Draft v1. You may quote reference <strong className="font-mono">{submissionSuccess.referenceNumber}</strong> in any direct communications.
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-emerald-900 bg-emerald-200 hover:bg-emerald-300 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Submit Another Quotation Request
              </button>
            </div>
          </div>
        )}

        {/* The Form */}
        {!submissionSuccess && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-8">
            {/* Anti-Spam Hidden Honeypot Field (Hidden from humans via CSS) */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <label htmlFor="_company_fax">Leave this field blank</label>
              <input
                type="text"
                id="_company_fax"
                name="_company_fax"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all ${
                      errors.contactPerson ? 'border-red-400 bg-red-50/30' : 'border-slate-300 bg-white'
                    }`}
                  />
                  {errors.contactPerson && <p className="text-xs text-red-600 mt-1">{errors.contactPerson}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Email Address <span className="text-slate-400 font-normal">(Email or Phone required)</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@company.com"
                    disabled={isSubmitting}
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500 transition-all ${
                      errors.email ? 'border-red-400 bg-red-50/30' : 'border-slate-300 bg-white'
                    }`}
                  />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 mb-1">
                    Indian Mobile / Phone (10 Digits) <span className="text-slate-400 font-normal">(Email or Phone required)</span>
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
                      disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Privacy & Acknowledgment */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="privacyConsent"
                  checked={!!formData.privacyConsent}
                  onChange={(e) => setFormData({ ...formData, privacyConsent: e.target.checked as any })}
                  disabled={isSubmitting}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 text-navy-900 focus:ring-gold-500"
                />
                <label htmlFor="privacyConsent" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                  I confirm that the commercial details provided are accurate and authorize Santhaya Associates Pvt. Ltd. to contact our representative with an official commercial quotation.
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
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Form
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-navy-900 hover:bg-navy-950 text-white shadow-md hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 text-gold-400 animate-spin" />
                    <span>Submitting Quotation Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-gold-400" />
                    <span>Submit Official Quotation Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
