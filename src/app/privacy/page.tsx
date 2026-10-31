import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Santhaya Associates Pvt. Ltd.',
  description: 'Privacy Policy and commercial data governance for Santhaya Associates Pvt. Ltd.',
};

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-extrabold text-navy-900">Privacy Policy</h1>
          <p className="text-xs text-slate-500">Corporate Governance & Commercial Data Protection • Santhaya Associates Pvt. Ltd.</p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-200 space-y-6 text-sm text-slate-700 leading-relaxed shadow-sm">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
            <div>
              <strong>Commercial Confidentiality Statement:</strong> Santhaya Associates Pvt. Ltd. operates with strict information governance across all government bidding documents, private construction tenders, and equipment procurement specifications.
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy-900">1. Information We Collect</h2>
            <p>
              When you submit an official quotation request, we collect business identification data (enterprise name, primary contact person, corporate email, mobile number, GSTIN, and delivery location) and project requirements (equipment specifications, tender scope, and capacity parameters).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy-900">2. Purpose of Processing</h2>
            <p>
              Commercial information is processed exclusively for technical feasibility analysis, tender quotation generation, place-of-supply tax determination under CGST/SGST/IGST regulations, and contractual fulfillment.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy-900">3. Data Security & Storage</h2>
            <p>
              All customer and inquiry records are stored within an enterprise-grade encrypted database protected by Row Level Security (RLS) and strict role-based access control (RBAC). We do not monetize or share commercial data with third parties.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy-900">4. Contacting the Compliance Desk</h2>
            <p>
              For commercial data inquiries or formal compliance requests, please contact our administrative desk at: <strong>info@santhaya.com</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
