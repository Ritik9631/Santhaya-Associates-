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
  Building2,
  Target,
  Cpu,
  PhoneCall,
  Clock,
  Sparkles,
  MessageSquare,
  BadgeCheck,
  Scale,
  Award,
  Compass,
} from 'lucide-react';
import FAQAccordion from '@/components/FAQAccordion';

const WHATSAPP_URL =
  'https://wa.me/919608950748?text=Hello%20Santhaya%20Associates%2C%20I%20would%20like%20to%20enquire%20about%20your%20construction%20tender%20or%20machinery%20supply%20services.';

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
  email: 'santhayapvt.ltd@gmail.com',
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

      {/* =========================================================================
          1. HERO SECTION
          High-impact industrial heading, clear supporting text, distinct CTAs,
          click-to-call/WhatsApp actions, and an engineering technical spec panel
          replacing the repetitive service list.
         ========================================================================= */}
      <section className="relative bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 text-white overflow-hidden py-16 md:py-24 border-b border-navy-800">
        {/* Subtle background grid pattern */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Hero Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-800/90 border border-gold-500/40 text-gold-400 text-xs font-semibold tracking-wide uppercase shadow-sm">
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
                Santhaya Associates Pvt. Ltd. delivers specialized industrial execution and procurement solutions for infrastructure contractors, civil departments, and industrial manufacturing plants across India.
              </p>

              {/* Action Buttons: Primary & Secondary */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                <Link
                  href="/request-quotation"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-bold bg-gold-500 hover:bg-gold-400 text-navy-950 transition-all duration-200 shadow-lg shadow-gold-500/20 hover:shadow-gold-500/30 group"
                >
                  <span>Request a Quotation</span>
                  <ArrowRight className="w-4 h-4 text-navy-950 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="#services"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold bg-navy-800/80 hover:bg-navy-800 text-slate-200 hover:text-white border border-navy-700 transition-all duration-200"
                >
                  <span>Explore Our Services</span>
                </Link>
              </div>

              {/* Direct Instant Contact Actions (Call & WhatsApp) */}
              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
                <span className="text-slate-400 font-medium">Direct Inquiries:</span>
                <a
                  href="tel:+919430986713"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-navy-850 border border-navy-700 text-slate-200 hover:text-gold-400 hover:border-gold-500/40 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-gold-400" />
                  <span className="font-semibold">+91 9430986713</span>
                </a>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-900/60 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold">WhatsApp Desk</span>
                </a>
              </div>

              {/* Highlights badge bar */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-navy-800/80 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-gold-400 flex-shrink-0" />
                  <span>Strict BOQ Feasibility</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <BadgeCheck className="w-4 h-4 text-gold-400 flex-shrink-0" />
                  <span>Statutory GST Compliant</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <PhoneCall className="w-4 h-4 text-gold-400 flex-shrink-0" />
                  <span>Direct Engineering Desk</span>
                </div>
              </div>
            </div>

            {/* Right Column: Industrial Technical Specification & Governance Dossier
                (Redesigned to present technical governance dimensions rather than repeating the 3 services) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-lg bg-navy-900/90 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-navy-700/80 shadow-2xl relative overflow-hidden space-y-4">
                {/* Blueprint grid overlay & subtle gold glow */}
                <div
                  className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] pointer-events-none"
                  aria-hidden="true"
                />
                <div
                  className="absolute -top-24 -right-24 w-52 h-52 bg-gold-500/10 rounded-full blur-3xl pointer-events-none"
                  aria-hidden="true"
                />

                {/* Technical Header Bar */}
                <div className="relative z-10 flex items-center justify-between pb-3.5 border-b border-navy-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-300 font-mono tracking-wider text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-gold-400" />
                    <span>OPERATIONAL GOVERNANCE</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-navy-950 border border-gold-500/40 text-gold-400 text-[10px] font-semibold tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
                    REGISTERED ENTERPRISE
                  </span>
                </div>

                {/* 4 Technical Governance Dimensions */}
                <div className="relative z-10 space-y-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-navy-950/70 border border-navy-800 hover:border-gold-500/30 transition-all flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-xs sm:text-sm">
                        BOQ & Technical Bidding Analysis
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Itemized schedule breakdown, feasibility verification, and compliance assessment for public and private infrastructure tenders.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-navy-950/70 border border-navy-800 hover:border-gold-500/30 transition-all flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-xs sm:text-sm">
                        Requirement-Based Machinery Logistics
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Capacity-matched sourcing for heavy earthmoving, site transit, concrete plants, and industrial tooling.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-navy-950/70 border border-navy-800 hover:border-gold-500/30 transition-all flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-xs sm:text-sm">
                        Statutory GST & Commercial Rigor
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Transparent line-item quotation workflows with authentic tax determination and formal commercial invoicing.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-navy-950/70 border border-navy-800 hover:border-gold-500/30 transition-all flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-xs sm:text-sm">
                        Direct Desk Communication
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Immediate communication with knowledgeable operations personnel via phone, WhatsApp, or official quotation portal.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Technical Bottom Details Bar */}
                <div className="relative z-10 pt-3 border-t border-navy-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gold-400" />
                    <span>Motihari, Bihar</span>
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="font-mono text-gold-400/90">CIN Registered</span>
                  <span className="text-slate-500">•</span>
                  <span>Pan-India Scope</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. THREE CORE SERVICES SECTION
          Strictly preserves the 3 categories:
          1. Government & Private Construction Tenders
          2. Construction Machinery Supply
          3. Manufacturing Machinery Supply
         ========================================================================= */}
      <section id="services" className="py-20 bg-slate-50 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold tracking-widest text-gold-600 uppercase">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
              Three Specialized Industrial Disciplines
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Engineered specifically for government contractors, commercial developers, and industrial manufacturing plants requiring dependable execution and statutory compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Service 1: Government & Private Construction Tenders */}
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
                <ul className="space-y-2.5 pt-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Public sector civil tenders (PWD, CPWD, Municipal Corporations)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Commercial, industrial, and institutional infrastructure contracts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Rigorous tender documentation, milestone planning & statutory governance</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href="/request-quotation?category=construction-tenders"
                  className="text-xs font-bold text-navy-900 hover:text-gold-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
                >
                  <span>Enquire for Tenders</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gold-500" />
                </Link>
                <span className="text-[11px] font-mono text-slate-600 uppercase">
                  Civil & Public Works
                </span>
              </div>
            </div>

            {/* Service 2: Construction Machinery Supply */}
            <div className="bg-white rounded-xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-navy-50 text-navy-900 flex items-center justify-center border border-navy-100 group-hover:bg-navy-900 group-hover:text-gold-400 transition-colors">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-navy-900">
                  Construction Machinery Supply
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Requirement-based sourcing, mobilization, and deployment of heavy-duty construction machinery and transit equipment for large-scale infrastructure and civil sites.
                </p>
                <ul className="space-y-2.5 pt-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Heavy earthmoving fleets: excavators, backhoe loaders & motor graders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Site lifting & transit units: mobile cranes, tower cranes & dumpers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Concrete production: batching plants, transit mixers & compaction equipment</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href="/request-quotation?category=construction-machinery"
                  className="text-xs font-bold text-navy-900 hover:text-gold-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
                >
                  <span>Inquire Machinery Fleet</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gold-500" />
                </Link>
                <span className="text-[11px] font-mono text-slate-600 uppercase">
                  Heavy Fleet
                </span>
              </div>
            </div>

            {/* Service 3: Manufacturing Machinery Supply */}
            <div className="bg-white rounded-xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-navy-50 text-navy-900 flex items-center justify-center border border-navy-100 group-hover:bg-navy-900 group-hover:text-gold-400 transition-colors">
                  <Cog className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-navy-900">
                  Manufacturing Machinery Supply
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Procurement and delivery of industrial production systems, high-precision machining centers, and automated manufacturing lines for industrial plants.
                </p>
                <ul className="space-y-2.5 pt-2 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Precision CNC tooling, lathe machinery & fabrication systems</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Automated industrial production & continuous assembly lines</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Customized factory plant equipment engineered to production targets</span>
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href="/request-quotation?category=manufacturing-machinery"
                  className="text-xs font-bold text-navy-900 hover:text-gold-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-all"
                >
                  <span>Enquire for Industrial Machinery</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gold-500" />
                </Link>
                <span className="text-[11px] font-mono text-slate-600 uppercase">
                  Industrial Plant
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. WHY CHOOSE SANTHAYA ASSOCIATES SECTION
          4 professional benefit cards focused on service approach:
          1. Tender-Focused Approach
          2. Construction & Industrial Understanding
          3. Requirement-Based Machinery Solutions
          4. Direct Business Communication
         ========================================================================= */}
      <section id="why-choose-us" className="py-20 bg-white border-t border-slate-200 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold tracking-widest text-gold-600 uppercase">
              Proven Service Approach
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
              Why Choose Santhaya Associates?
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              We combine technical diligence, commercial transparency, and grounded domain knowledge to execute infrastructure and machinery procurement without unnecessary friction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Benefit Card 1: Tender-Focused Approach */}
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-gold-500/40 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-lg bg-navy-900 text-gold-400 flex items-center justify-center shadow-sm">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-navy-900">
                  Tender-Focused Approach
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Structured evaluation of Bill of Quantities (BOQ), tender specifications, and bidding parameters to ensure precise alignment with public works and private infrastructure requirements.
                </p>
              </div>
              <p className="text-[11px] font-semibold text-gold-600 uppercase tracking-wider pt-2 border-t border-slate-200/80">
                Rigorous BOQ Alignment
              </p>
            </div>

            {/* Benefit Card 2: Construction & Industrial Understanding */}
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-gold-500/40 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-lg bg-navy-900 text-gold-400 flex items-center justify-center shadow-sm">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-navy-900">
                  Construction & Industrial Understanding
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Practical domain insight into heavy site operations, material handling constraints, and industrial manufacturing workflows for dependable project execution.
                </p>
              </div>
              <p className="text-[11px] font-semibold text-gold-600 uppercase tracking-wider pt-2 border-t border-slate-200/80">
                Jobsite-Proven Insights
              </p>
            </div>

            {/* Benefit Card 3: Requirement-Based Machinery Solutions */}
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-gold-500/40 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-lg bg-navy-900 text-gold-400 flex items-center justify-center shadow-sm">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-navy-900">
                  Requirement-Based Machinery Solutions
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Tailored sourcing and supply matching exact operational capacities, equipment specifications, and deployment schedules rather than one-size-fits-all inventory.
                </p>
              </div>
              <p className="text-[11px] font-semibold text-gold-600 uppercase tracking-wider pt-2 border-t border-slate-200/80">
                Capacity-Matched Supply
              </p>
            </div>

            {/* Benefit Card 4: Direct Business Communication */}
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-gold-500/40 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-lg bg-navy-900 text-gold-400 flex items-center justify-center shadow-sm">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-navy-900">
                  Direct Business Communication
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Transparent, direct access to experienced management and procurement desks without intermediary layers, ensuring rapid response and accountable support.
                </p>
              </div>
              <p className="text-[11px] font-semibold text-gold-600 uppercase tracking-wider pt-2 border-t border-slate-200/80">
                Direct Desk Accountability
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. HOW WE WORK — PROCUREMENT & DELIVERY LIFECYCLE
          Concise 4-step process overview without duplicating content
         ========================================================================= */}
      <section id="how-we-work" className="py-20 bg-slate-50 border-t border-slate-200 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold tracking-widest text-gold-600 uppercase">
              Operational Transparency
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
              Structured Procurement & Delivery Process
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Our structured approach ensures complete technical compliance, transparent pricing, and dependable site delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="relative p-6 rounded-xl bg-white border border-slate-200/90 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-navy-900/20 font-mono">01</span>
                <h3 className="text-base font-bold text-navy-900 mt-2">
                  Specification Review
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  Client submits BOQ, technical drawings, or equipment operational parameters via our structured quotation intake, direct call, or WhatsApp.
                </p>
              </div>
              <div className="text-[10px] text-slate-600 font-mono pt-3 border-t border-slate-100">
                STAGE 1 • INTAKE
              </div>
            </div>

            <div className="relative p-6 rounded-xl bg-white border border-slate-200/90 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-navy-900/20 font-mono">02</span>
                <h3 className="text-base font-bold text-navy-900 mt-2">
                  Engineering Feasibility
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  Our technical team evaluates capacity matching, manufacturer certifications, delivery timelines, and logistics feasibility.
                </p>
              </div>
              <div className="text-[10px] text-slate-600 font-mono pt-3 border-t border-slate-100">
                STAGE 2 • EVALUATION
              </div>
            </div>

            <div className="relative p-6 rounded-xl bg-white border border-slate-200/90 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-navy-900/20 font-mono">03</span>
                <h3 className="text-base font-bold text-navy-900 mt-2">
                  Formal Quotation
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  Issuance of verified, line-item quotations with transparent commercial terms, statutory GST determination, and delivery milestones.
                </p>
              </div>
              <div className="text-[10px] text-slate-600 font-mono pt-3 border-t border-slate-100">
                STAGE 3 • FORMAL PROPOSAL
              </div>
            </div>

            <div className="relative p-6 rounded-xl bg-white border border-slate-200/90 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-3xl font-black text-navy-900/20 font-mono">04</span>
                <h3 className="text-base font-bold text-navy-900 mt-2">
                  Execution & Dispatch
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">
                  Contract finalization, rigorous pre-dispatch inspection, site mobilization, and operational handover with ongoing coordination.
                </p>
              </div>
              <div className="text-[10px] text-slate-600 font-mono pt-3 border-t border-slate-100">
                STAGE 4 • MOBILIZATION
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. CLIENT TRUST & OUR COMMITMENT SECTION
          Authenticity Requirement (Prompt 7):
          - Option B selected: Neutral "Our Commitment to Clients" without fabricated reviews.
          - No invented reviews, no fake star ratings, no Review schema.
          - Commented sample card layout preserved for future authenticated testimonials.
         ========================================================================= */}
      <section id="our-commitment" className="py-20 bg-white border-t border-slate-200 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold tracking-widest text-gold-600 uppercase">
              Corporate Governance
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
              Our Commitment to Clients
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              We believe long-term business partnerships are earned through consistent execution, prompt direct communication, and strict technical adherence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Commitment Pillar 1 */}
            <div className="p-8 rounded-xl bg-slate-50 border border-slate-200/90 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-navy-900 text-gold-400 flex items-center justify-center">
                  <Scale className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-navy-900">
                  Commercial Integrity & Clear Terms
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Every quotation and invoice is strictly itemized with no hidden fees or ambiguous stipulations. Our commercial terms are transparent and aligned with statutory requirements from day one.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200/80 text-[11px] font-semibold text-navy-900">
                Transparent Line-Item Accountability
              </div>
            </div>

            {/* Commitment Pillar 2 */}
            <div className="p-8 rounded-xl bg-slate-50 border border-slate-200/90 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-navy-900 text-gold-400 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-navy-900">
                  Operational & Logistics Discipline
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  We prioritize milestone adherence, verified equipment condition, and proactive communication from initial intake through final site delivery and operational handover.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200/80 text-[11px] font-semibold text-navy-900">
                Scheduled Mobilization & Oversight
              </div>
            </div>

            {/* Commitment Pillar 3 */}
            <div className="p-8 rounded-xl bg-slate-50 border border-slate-200/90 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-navy-900 text-gold-400 flex items-center justify-center">
                  <BadgeCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-navy-900">
                  Statutory & Regulatory Rigor
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Complete compliance with Indian GST taxation, state transport guidelines, and official public works bidding standards, ensuring our partners operate with total legal assurance.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200/80 text-[11px] font-semibold text-navy-900">
                Government & Private Bidding Compliance
              </div>
            </div>
          </div>

          {/* Reassuring Corporate Note */}
          <div className="mt-10 p-6 rounded-xl bg-navy-950 text-white text-center max-w-3xl mx-auto space-y-2 border border-navy-800">
            <p className="text-sm sm:text-base font-semibold text-slate-200">
              &ldquo;Building Today • Powering Tomorrow&rdquo;
            </p>
            <p className="text-xs text-slate-400">
              Santhaya Associates Pvt. Ltd. • Registered Corporate Entity • Gopalpur, Motihari, Bihar
            </p>
          </div>

          {/* =========================================================================
              AUTHENTICITY SAFEGUARD NOTE & SAMPLE TESTIMONIAL CARDS (PREPARED BUT INACTIVE):
              Per requirements, we do NOT fabricate testimonials or attribute invented quotes.
              The following sample cards are preserved as design templates for when genuine
              client reviews are formally approved and verified:

              <!-- SAMPLE TESTIMONIAL CARDS (READY FOR AUTHENTICATED CONTENT):
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
                <div className="p-6 rounded-xl bg-white border border-slate-200 space-y-3">
                  <p className="text-xs text-slate-500 italic">"Sample testimonial placeholder pending verified client feedback."</p>
                  <p className="text-xs font-bold text-navy-900">Rajesh Kumar — Sample Client</p>
                </div>
                <div className="p-6 rounded-xl bg-white border border-slate-200 space-y-3">
                  <p className="text-xs text-slate-500 italic">"Sample testimonial placeholder pending verified client feedback."</p>
                  <p className="text-xs font-bold text-navy-900">Priya Sharma — Sample Client</p>
                </div>
                <div className="p-6 rounded-xl bg-white border border-slate-200 space-y-3">
                  <p className="text-xs text-slate-500 italic">"Sample testimonial placeholder pending verified client feedback."</p>
                  <p className="text-xs font-bold text-navy-900">Amit Verma — Sample Client</p>
                </div>
              </div>
              -->
             ========================================================================= */}
        </div>
      </section>

      {/* =========================================================================
          6. FREQUENTLY ASKED QUESTIONS (FAQ) SECTION
          Accessible accordion with keyboard support, ARIA attributes, and 6
          authoritative answers grounded in actual business scope.
         ========================================================================= */}
      <section id="faq" className="py-20 bg-slate-50 border-t border-slate-200 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold tracking-widest text-gold-600 uppercase">
              Clarifications & Inquiries
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900">
              Frequently Asked Questions
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Find quick answers regarding our tender participation, equipment supply, quotation workflows, and direct communication channels.
            </p>
          </div>

          <FAQAccordion />
        </div>
      </section>

      {/* =========================================================================
          7. CONTACT OUR ENGINEERING & PROCUREMENT DESK & FINAL CTA
          Action-oriented contact area with Call, WhatsApp, Email, Office address,
          and final quotation action banner.
         ========================================================================= */}
      <section
        id="contact"
        className="py-20 bg-navy-950 text-white relative overflow-hidden scroll-mt-24 border-t border-navy-800"
      >
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
          {/* Section Header */}
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

          {/* 3 Contact Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Action Card 1: Direct Phone Helpline */}
            <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-800 hover:border-gold-500/40 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Direct Phone Helplines</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Call our desk directly for urgent project inquiries, machinery fleet availability, and immediate tender coordination.
                </p>
                <div className="space-y-1.5 pt-1 text-xs sm:text-sm">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                      Primary Contact:
                    </span>
                    <a
                      href="tel:+919430986713"
                      className="text-gold-400 hover:text-gold-300 font-bold transition-colors inline-block mt-0.5"
                    >
                      +91 9430986713
                    </a>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                      Secondary Contact:
                    </span>
                    <a
                      href="tel:+919608950748"
                      className="text-slate-200 hover:text-gold-300 font-medium transition-colors inline-block mt-0.5"
                    >
                      +91 9608950748
                    </a>
                  </div>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-navy-800/80">
                <a
                  href="tel:+919430986713"
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold bg-navy-800 hover:bg-navy-750 text-slate-200 hover:text-white border border-navy-700 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-gold-400" />
                  <span>Call Primary Helpline</span>
                </a>
              </div>
            </div>

            {/* Action Card 2: WhatsApp Business Chat */}
            <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">WhatsApp Business Chat</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Send equipment queries, share preliminary BOQ details, and get quick answers directly from our operations desk.
                </p>
                <div className="pt-1">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                    WhatsApp Desk:
                  </span>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-300 hover:text-emerald-200 font-bold text-xs sm:text-sm transition-colors inline-block mt-0.5"
                  >
                    +91 9608950748
                  </a>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-navy-800/80">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-600/50 transition-colors shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Message on WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Action Card 3: Commercial Email & RFP Desk */}
            <div className="p-6 rounded-2xl bg-navy-900/90 border border-navy-800 hover:border-gold-500/40 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Commercial Inquiries & RFPs</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Transmit project drawings, technical BOQs, and formal tender inquiries directly to our administrative desk:
                </p>
                <div className="pt-1">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                    Corporate Email:
                  </span>
                  <a
                    href="mailto:santhayapvt.ltd@gmail.com"
                    className="text-gold-400 hover:text-gold-300 font-semibold text-xs sm:text-sm transition-colors break-all inline-block mt-0.5"
                  >
                    santhayapvt.ltd@gmail.com
                  </a>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-navy-800/80">
                <a
                  href="mailto:santhayapvt.ltd@gmail.com"
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold bg-navy-800 hover:bg-navy-750 text-slate-200 hover:text-white border border-navy-700 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-gold-400" />
                  <span>Compose Email</span>
                </a>
              </div>
            </div>
          </div>

          {/* Registered Office Banner */}
          <div className="p-5 sm:p-6 rounded-xl bg-navy-900/70 border border-navy-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  Registered Business Office
                </p>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India
                </p>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 font-mono bg-navy-950 px-3 py-1.5 rounded-md border border-navy-800">
              Corporate Legal Entity • Bihar
            </span>
          </div>

          {/* Final Line-Item Quotation Action Banner */}
          <div className="p-8 rounded-2xl bg-gradient-to-r from-navy-900 via-navy-850 to-navy-900 border border-gold-500/30 text-center space-y-4 max-w-4xl mx-auto shadow-2xl relative">
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Need a Formal Line-Item Quotation?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Submit your project scope, equipment quantities, or tender timelines through our structured portal to receive an official, GST-compliant commercial proposal.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/request-quotation"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg text-sm font-bold bg-gold-500 hover:bg-gold-400 text-navy-950 transition-all duration-200 shadow-xl shadow-gold-500/20 group"
              >
                <span>Request a Formal Quotation</span>
                <ArrowRight className="w-4 h-4 text-navy-950 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
