import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Santhaya Associates Pvt. Ltd.',
  description: 'Privacy Policy and data governance for Santhaya Associates Pvt. Ltd.',
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
          <h1 className="text-3xl font-extrabold text-navy-900">Privacy Policy (Placeholder)</h1>
          <p className="text-xs text-slate-500">Last updated: October 26, 2026 • Phase 1 Documentation</p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-200 space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <strong>Placeholder Notice:</strong> This privacy policy document is a formal placeholder for Phase 1. Final legal terms and data retention policies will be enacted upon Phase 2 database integration and legal counsel review.
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy-900">1. Information Governance</h2>
            <p>
              Santhaya Associates Pvt. Ltd. respects user privacy and commercial confidentiality. In this Phase 1 demonstration phase, quotation requests are validated purely in the browser client and are not recorded in persistent storage.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy-900">2. Commercial Inquiries & Data Handling</h2>
            <p>
              Upon activation of production services in subsequent phases, business identification details, GSTIN, technical specifications, and contact records will be processed solely for quotation generation, contract execution, and statutory GST compliance under applicable Indian laws.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy-900">3. Contacting the Data Controller</h2>
            <p>
              For inquiries regarding data protection and commercial terms, contact: privacy@santhaya.local (Official corporate contact pending final domain provisioning).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
