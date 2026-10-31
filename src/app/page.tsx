import React from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Truck,
  Cog,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Layers,
  Sparkles,
} from 'lucide-react';

const jsonLdData = {
  '@context': 'https://schema.org',
  '@type': 'Corporation',
  name: 'Santhaya Associates Pvt. Ltd.',
  alternateName: 'Santhaya Associates',
  slogan: 'Building Today • Powering Tomorrow',
  description:
    'Santhaya Associates Pvt. Ltd. — Specialized industrial enterprise partner for Government & Private Construction Tenders, Construction Machinery Supply, and Manufacturing Machinery Supply.',
  url: 'https://santhaya.com',
  logo: 'https://santhaya.com/santhaya-logo-header.png',
  telephone: ['+919430986713', '+919608950748'],
  email: 'heistofeverything@gmail.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Gopalpur',
    addressLocality: 'Motihari',
    addressRegion: 'Bihar',
    postalCode: '845401',
    addressCountry: 'IN',
  },
  knowsAbout: [
    'Government Construction Tenders',
    'Private Infrastructure Bidding',
    'Construction Machinery Fleet Supply',
    'Manufacturing Industrial Equipment',
  ],
};

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />
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
                Santhaya Associates Pvt. Ltd. is your specialized industrial enterprise partner for{' '}
                <strong>Government & Private Construction Tenders</strong>,{' '}
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

            {/* Right Column: Premium Industrial Visual Composition (BUG-003) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-lg bg-navy-900/90 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-navy-700/80 shadow-2xl relative overflow-hidden space-y-4">
                {/* Subtle blueprint grid overlay & gold glow */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] pointer-events-none" />
                <div className="absolute -top-24 -right-24 w-52 h-52 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Technical Header Bar */}
                <div className="relative z-10 flex items-center justify-between pb-3.5 border-b border-navy-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-300 font-mono tracking-wider text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-gold-400" />
                    <span>OPERATIONAL CAPABILITY</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    DEPLOYMENT READY
                  </span>
                </div>

                {/* 3 Industrial Capability Cards */}
                <div className="relative z-10 space-y-3">
                  {/* Card 1: Infrastructure Tenders */}
                  <div className="p-3.5 rounded-xl bg-navy-950/70 border border-navy-800/80 hover:border-gold-500/30 transition-all flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-white truncate">Civil & Govt Tenders</h3>
                        <span className="text-[10px] text-gold-400/90 font-mono">PWD / CPWD</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        BOQ technical feasibility, bidding compliance, and infrastructure contract execution.
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Construction Machinery Supply */}
                  <div className="p-3.5 rounded-xl bg-navy-950/70 border border-navy-800/80 hover:border-gold-500/30 transition-all flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-white truncate">Construction Machinery</h3>
                        <span className="text-[10px] text-gold-400/90 font-mono">HEAVY FLEET</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Earthmoving machinery, lifting cranes, batching plants, and site transit equipment.
                      </p>
                    </div>
                  </div>

                  {/* Card 3: Manufacturing Machinery Supply */}
                  <div className="p-3.5 rounded-xl bg-navy-950/70 border border-navy-800/80 hover:border-gold-500/30 transition-all flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Cog className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-white truncate">Manufacturing Units</h3>
                        <span className="text-[10px] text-gold-400/90 font-mono">INDUSTRIAL</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        High-precision CNC tooling, automated production machinery, and plant assembly units.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Technical Bottom Metrics Bar */}
                <div className="relative z-10 pt-3 border-t border-navy-800/80 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-navy-950/50">
                    <p className="text-xs font-bold text-gold-400 font-mono">100%</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">BOQ Compliance</p>
                  </div>
                  <div className="p-2 rounded-lg bg-navy-950/50">
                    <p className="text-xs font-bold text-gold-400 font-mono">Pan-India</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Fleet Reach</p>
                  </div>
                  <div className="p-2 rounded-lg bg-navy-950/50">
                    <p className="text-xs font-bold text-gold-400 font-mono">Statutory</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">GST Compliant</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Services Section (Scope Locked) */}
      <section id="services" className="py-20 bg-slate-50 scroll-mt-24">
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
      <section id="how-we-work" className="py-20 bg-white border-y border-slate-200 scroll-mt-24">
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

      {/* Comprehensive Direct Business Contact Section (BUG-004, BUG-005, BUG-006) */}
      <section id="contact" className="py-20 bg-navy-950 text-white relative overflow-hidden scroll-mt-24 border-t border-navy-800">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold tracking-widest text-gold-400 uppercase">
              Direct Business Communication
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Contact Our Engineering & Procurement Desk
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Connect directly with our team for government tender bidding, civil contracting partnerships, and industrial machinery procurement.
            </p>
          </div>

          {/* 3 Contact Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Registered Office Address */}
            <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-800 hover:border-gold-500/40 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Registered Business Office</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India
                </p>
              </div>
              <p className="text-[11px] text-gold-400/80 font-medium pt-4 mt-4 border-t border-navy-800/80">
                Official Corporate Registration
              </p>
            </div>

            {/* Card 2: Phone Helplines */}
            <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-800 hover:border-gold-500/40 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Direct Phone Helplines</h3>
                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Primary Contact</span>
                    <a
                      href="tel:+919430986713"
                      className="text-gold-400 hover:text-gold-300 font-bold transition-colors inline-block mt-0.5"
                    >
                      +91 9430986713
                    </a>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Secondary Contact</span>
                    <a
                      href="tel:+919608950748"
                      className="text-slate-200 hover:text-gold-300 font-medium transition-colors inline-block mt-0.5"
                    >
                      +91 9608950748
                    </a>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gold-400/80 font-medium pt-4 mt-4 border-t border-navy-800/80">
                Tender Support & Fleet Dispatch
              </p>
            </div>

            {/* Card 3: Email Communication */}
            <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-800 hover:border-gold-500/40 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Commercial Inquiries & RFPs</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Send project drawings, technical BOQs, and formal tender inquiries directly to our administrative desk:
                </p>
                <div className="pt-1">
                  <a
                    href="mailto:heistofeverything@gmail.com"
                    className="text-gold-400 hover:text-gold-300 font-semibold text-xs sm:text-sm transition-colors break-all"
                  >
                    heistofeverything@gmail.com
                  </a>
                </div>
              </div>
              <p className="text-[11px] text-gold-400/80 font-medium pt-4 mt-4 border-t border-navy-800/80">
                BOQ Review & Statutory Invoicing
              </p>
            </div>
          </div>

          {/* Submission Action Banner */}
          <div className="p-8 rounded-2xl bg-navy-900 border border-navy-800 text-center space-y-4 max-w-4xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Need a Formal Line-Item Quotation?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto">
              Use our structured quotation portal to submit your equipment quantities, site delivery constraints, or tender timelines for an official proposal.
            </p>
            <div className="pt-2">
              <Link
                href="/request-quotation"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg text-sm font-bold bg-gold-500 hover:bg-gold-400 text-navy-950 transition-all duration-200 shadow-xl shadow-gold-500/20 group"
              >
                <span>Request a Formal Quotation</span>
                <ArrowRight className="w-4 h-4 text-navy-950 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
