import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Santhaya Associates Pvt. Ltd.',
  description: 'Privacy Policy for Santhaya Associates Pvt. Ltd. — Commercial inquiry data handling and compliance.',
};

export default function PrivacyPage() {
  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-slate-500 mt-2">Effective Date: October 2026</p>
        </div>

        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-6 text-sm text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-navy-900">1. Information We Collect</h2>
            <p>
              Santhaya Associates Pvt. Ltd. collects business and commercial data provided voluntarily through our structured quotation request form, including business entity names, contact persons, phone numbers, email addresses, project delivery locations, and Bill of Quantities (BOQ) specifications.
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
              For commercial data inquiries or formal compliance requests, please contact our administrative desk at:{' '}
              <a href="mailto:heistofeverything@gmail.com" className="font-semibold text-gold-600 hover:text-gold-700 underline">
                heistofeverything@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
