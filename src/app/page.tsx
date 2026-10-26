import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FileCheck2,
  Truck,
  Cog,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  Layers,
  Wrench,
  HelpCircle,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 text-white overflow-hidden py-16 md:py-24 border-b border-navy-800">
        {/* Subtle background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Hero Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-800/80 border border-gold-500/30 text-gold-400 text-xs font-semibold tracking-wide uppercase">
                <span className="w-2 h-2 rounded-full bg-gold-400 animate-ping" />
                Building Today • Powering Tomorrow
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Industrial Scale.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-gold-300 to-amber-200">
                  Precision Execution.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                Santhaya Associates Pvt. Ltd. is your specialized industrial enterprise partner for
                <strong> Government & Private Construction Tenders</strong>,{' '}
                <strong>Construction Machinery Supply</strong>, and{' '}
                <strong>Manufacturing Machinery Supply</strong>.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link
                  href="/request-quotation"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-bold bg-gold-500 hover:bg-gold-400 text-navy-950 transition-all duration-200 shadow-lg shadow-gold-500/20 hover:shadow-gold-500/30 group"
                >
                  <span>Request a Quotation</span>
                  <ArrowRight className="w-4 h-4 text-navy-950 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/services"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold bg-navy-800/80 hover:bg-navy-800 text-slate-200 hover:text-white border border-navy-700 transition-all duration-200"
                >
                  <span>Explore 3 Core Services</span>
                </Link>
              </div>

              {/* Highlights badge bar */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-navy-800/80 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-gold-400 flex-shrink-0" />
                  <span>Strict BOQ Compliance</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Truck className="w-4 h-4 text-gold-400 flex-shrink-0" />
                  <span>Heavy Fleet Supply</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Cog className="w-4 h-4 text-gold-400 flex-shrink-0" />
                  <span>Industrial Plant Units</span>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Reference Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    <span className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Official Visual Reference
                  </span>
                </div>

                {/* Brand Reference image — displayed intact with zero distortion */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-white border border-slate-100 shadow-inner">
                  <Image
                    src="/full-brand-reference.png"
                    alt="Santhaya Associates Pvt. Ltd. Official Brand Identity Reference"
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    priority
                    className="object-contain p-2"
                  />
                </div>

                <div className="text-center pt-1">
                  <p className="text-xs font-bold text-navy-900 tracking-wide">
                    SANTHAYA ASSOCIATES PVT. LTD.
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Construction Tenders • Heavy Machinery • Manufacturing Units
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Services Section (Scope Locked) */}
      <section id="services" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold tracking-widest text-gold-600 uppercase">
              Exclusive Business Scope
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
              Three Core Industrial Capabilities
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Tailored specifically to contractors, government procurement cells, infrastructure developers, and industrial manufacturing plants.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1: Government & Private Construction Tenders */}
            <div className="bg-white rounded-xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-navy-50 text-navy-900 flex items-center justify-center border border-navy-100 group-hover:bg-navy-900 group-hover:text-gold-400 transition-colors">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-navy-900">
                  Government & Private Construction Tenders
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  End-to-end tender participation, technical bidding compliance, BOQ feasibility assessment, and project execution support for public works departments and private commercial developments.
                </p>
                <ul className="space-y-2 pt-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0" />
                    <span>Public works (PWD, CPWD, Municipal)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0" />
                    <span>Commercial & institutional civil structures</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0" />
                    <span>Rigorous tender documentation & milestones</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100">
                <Link
                  href="/request-quotation?category=construction-tenders"
                  className="text-xs font-bold text-navy-900 hover:text-gold-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
                >
                  <span>Request Tender Quote</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gold-500" />
                </Link>
              </div>
            </div>

            {/* Pillar 2: Construction Machinery Supply */}
            <div className="bg-white rounded-xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-navy-50 text-navy-900 flex items-center justify-center border border-navy-100 group-hover:bg-navy-900 group-hover:text-gold-400 transition-colors">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-navy-900">
                  Construction Machinery Supply
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Supply and deployment of heavy-duty construction machinery, earthmoving fleets, lifting equipment, and concrete processing units for site infrastructure and contracting demands.
                </p>
                <ul className="space-y-2 pt-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0" />
                    <span>Excavators, backhoe loaders & motor graders</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0" />
                    <span>Mobile & crawler cranes, tower cranes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0" />
                    <span>Batching plants, transit mixers & compactors</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100">
                <Link
                  href="/request-quotation?category=construction-machinery"
                  className="text-xs font-bold text-navy-900 hover:text-gold-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
                >
                  <span>Inquire Machinery Fleet</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gold-500" />
                </Link>
              </div>
            </div>

            {/* Pillar 3: Manufacturing Machinery Supply */}
            <div className="bg-white rounded-xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-navy-50 text-navy-900 flex items-center justify-center border border-navy-100 group-hover:bg-navy-900 group-hover:text-gold-400 transition-colors">
                  <Cog className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-navy-900">
                  Manufacturing Machinery Supply
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Procurement and supply of precision manufacturing equipment, heavy industrial tooling, automated production lines, and fabrication machinery for industrial manufacturing plants.
                </p>
                <ul className="space-y-2 pt-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0" />
                    <span>Industrial tooling & fabrication systems</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0" />
                    <span>Precision CNC & automated manufacturing units</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0" />
                    <span>Factory assembly & industrial processing plants</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100">
                <Link
                  href="/request-quotation?category=manufacturing-machinery"
                  className="text-xs font-bold text-navy-900 hover:text-gold-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
                >
                  <span>Request Industrial Machinery</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gold-500" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How We Work Section */}
      <section id="how-we-work" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold tracking-widest text-gold-600 uppercase">
              Transparent Methodology
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
              Procurement & Delivery Lifecycle
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Our structured approach ensures complete technical compliance, transparent pricing, and dependable site delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="relative p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-3xl font-black text-navy-900/20">01</span>
              <h3 className="text-base font-bold text-navy-900">Specification Review</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Client submits BOQ, technical drawings, or equipment operational parameters via our structured quotation intake.
              </p>
            </div>

            <div className="relative p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-3xl font-black text-navy-900/20">02</span>
              <h3 className="text-base font-bold text-navy-900">Engineering Feasibility</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our technical team evaluates capacity matching, manufacturer certifications, delivery timelines, and logistics.
              </p>
            </div>

            <div className="relative p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-3xl font-black text-navy-900/20">03</span>
              <h3 className="text-base font-bold text-navy-900">Formal Quotation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Issuance of verified, line-item quotations with transparent commercial terms, warranty details, and delivery milestones.
              </p>
            </div>

            <div className="relative p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-3xl font-black text-navy-900/20">04</span>
              <h3 className="text-base font-bold text-navy-900">Execution & Dispatch</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Contract finalization, rigorous pre-dispatch inspection, site delivery, and operational handover with ongoing support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner Section */}
      <section id="contact" className="py-16 bg-navy-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            Initiate Your Tender Requirement or Machinery Sourcing
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            Submit your project specifications or machinery requirements. Our team will review the technical scope and prepare a comprehensive commercial quotation.
          </p>
          <div className="pt-2">
            <Link
              href="/request-quotation"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-base font-bold bg-gold-500 hover:bg-gold-400 text-navy-950 transition-all duration-200 shadow-xl shadow-gold-500/20 group"
            >
              <span>Submit Quotation Request</span>
              <ArrowRight className="w-5 h-5 text-navy-950 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
