import React from 'react';
import Link from 'next/link';
import { FileCheck2, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Santhaya Associates Pvt. Ltd.',
  description: 'Commercial Terms and Conditions for Santhaya Associates Pvt. Ltd.',
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
          <h1 className="text-3xl font-extrabold text-navy-900">Terms of Service</h1>
          <p className="text-xs text-slate-500">Commercial Bidding & Machinery Supply Terms • Santhaya Associates Pvt. Ltd.</p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-200 space-y-6 text-sm text-slate-700 leading-relaxed shadow-sm">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-start gap-3">
            <FileCheck2 className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
            <div>
              <strong>Commercial Governance:</strong> All quotation proposals, tender participations, machinery leasing agreements, and statutory GST invoices issued by Santhaya Associates Pvt. Ltd. are subject to Indian commercial laws and statutory tax provisions.
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy-900">1. Quotations & Validity</h2>
            <p>
              Commercial quotations are issued based on prevailing manufacturer pricing, freight tariffs, and site delivery locations. Quotations are formally valid for the duration specified on the document (typically 30 calendar days) and are subject to written purchase order acceptance.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy-900">2. Statutory Taxation & Compliance</h2>
            <p>
              All Tax Invoices comply strictly with Section 31 and Rule 46 of the Central Goods and Services Tax (CGST) Act, 2017. Applicable GST rates (CGST, SGST, IGST) are calculated based on the designated place of supply.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy-900">3. Machinery Supply & Handover</h2>
            <p>
              Equipment deliveries undergo structured pre-dispatch inspection (PDI). Site mobilization, operational training, and maintenance obligations follow agreed commercial contract milestones.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy-900">4. Jurisdiction</h2>
            <p>
              Any disputes arising from commercial contracts or procurement engagements are subject to the exclusive jurisdiction of the competent courts in Motihari, Bihar, India.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
