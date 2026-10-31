import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Shield, Target, ArrowRight, FileCheck2, Building2, CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | Santhaya Associates Pvt. Ltd.',
  description:
    'About Santhaya Associates Pvt. Ltd. — Specializing in government and private construction tenders, construction machinery supply, and manufacturing machinery.',
};

export default function AboutPage() {
  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy-100 text-navy-900 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5 text-gold-600" />
            Corporate Overview
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-navy-900 tracking-tight">
            About Santhaya Associates
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Santhaya Associates Pvt. Ltd. is an industrial enterprise dedicated to precision execution across civil infrastructure tenders and heavy industrial machinery procurement.
          </p>
        </div>

        {/* Brand & Mission section (BUG-002, BUG-005, BUG-007, BUG-008) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-navy-900">
                Precision Infrastructure & Machinery Procurement
              </h2>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                Modern construction and industrial manufacturing demand absolute reliability, robust procurement pipelines, and rigorous statutory compliance. Santhaya Associates Pvt. Ltd. was established to serve as a focused corporate vehicle addressing three essential pillars:
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-200">
                <CheckCircle2 className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-navy-900">Civil & Infrastructure Tenders</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Participating in government and private civil works with stringent BOQ review and execution governance.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-200">
                <CheckCircle2 className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-navy-900">Construction Machinery Supply</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Supplying heavy earthmoving, lifting, and concrete processing equipment for major project sites.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-200">
                <CheckCircle2 className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-navy-900">Manufacturing Machinery Supply</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Connecting manufacturing plants and fabrication shops with verified high-performance production equipment.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4 text-center">
              <div className="relative w-40 h-40 mx-auto aspect-[480/550]">
                <Image
                  src="/santhaya-symbol.png"
                  alt="Santhaya Associates Symbol"
                  width={480}
                  height={550}
                  className="object-contain"
                />
              </div>
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-sm font-bold text-navy-900 tracking-wide">
                  SANTHAYA ASSOCIATES PVT. LTD.
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Registered Legal Entity • Bihar, India
                </p>
                <div className="mt-3 inline-block px-3 py-1 rounded bg-navy-50 text-[11px] font-semibold text-navy-900">
                  Motihari, Purbi Champaran – 845401
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Corporate Status & Governance Note */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gold-600" />
            <h3 className="text-base font-bold text-navy-900">Corporate Integrity & Disclosure</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            In accordance with Santhaya Associates governance guidelines, our online portal displays only verified capabilities and authentic corporate assets. Unverified claims, fabricated client testimonials, or artificial awards are strictly prohibited. All commercial documentation, BOQ assessments, and statutory invoicing adhere to established Indian procurement standards.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-navy-950 text-white rounded-2xl p-8 sm:p-12 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold">Ready to Partner on Your Next Tender or Machinery Need?</h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            Contact our engineering and procurement team for technical review and quotation drafting.
          </p>
          <div>
            <Link
              href="/request-quotation"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg text-sm font-bold bg-gold-500 hover:bg-gold-400 text-navy-950 transition-colors shadow-lg shadow-gold-500/20"
            >
              <span>Submit Project Requirements</span>
              <ArrowRight className="w-4 h-4 text-navy-950" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
