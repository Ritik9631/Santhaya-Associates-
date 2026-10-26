import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Santhaya Associates Pvt. Ltd.',
  description: 'Terms of Service and commercial conditions for Santhaya Associates Pvt. Ltd.',
};

export default function TermsPage() {
  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-2 border-b border-slate-200 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-900 hover:text-gold-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-extrabold text-navy-900">Terms of Service (Placeholder)</h1>
          <p className="text-xs text-slate-500">Last updated: October 26, 2026 • Phase 1 Documentation</p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-200 space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <strong>Placeholder Notice:</strong> These Terms of Service serve as a Phase 1 structural placeholder. Formal contractual terms, arbitration clauses, and Indian contract law provisions will be integrated prior to commercial production launch.
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy-900">1. Scope of Quotations</h2>
            <p>
              All online quotation requests generated via this portal represent preliminary price estimations subject to technical drawing review, physical site inspection, equipment availability, and mutual execution of a formal commercial contract.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy-900">2. Machinery Deployment & Logistics</h2>
            <p>
              Machinery mobilization, operator provisions, transit insurance, and fuel terms are governed strictly by individual contract schedules agreed upon at the time of purchase order or lease agreement issuance.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy-900">3. Statutory & GST Compliance</h2>
            <p>
              Santhaya Associates Pvt. Ltd. complies with all applicable Central and State Goods & Services Tax (GST) statutes. Formal tax invoices will reflect verified HSN/SAC codes and legal place-of-supply classifications.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
