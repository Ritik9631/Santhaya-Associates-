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
  HardHat,
  Factory,
  Layers,
  Scale,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Services | Santhaya Associates Pvt. Ltd.',
  description:
    'Core industrial capabilities: Government & Private Construction Tenders, Construction Machinery Supply, and Manufacturing Machinery Supply.',
};

export default function ServicesPage() {
  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy-100 text-navy-900 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-gold-600" />
            Approved Core Capabilities
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-navy-900 tracking-tight">
            Industrial Services & Machinery Supply
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Santhaya Associates Pvt. Ltd. provides specialized contracting, heavy machinery deployment, and industrial manufacturing systems. Every project is executed with technical compliance and line-item transparency.
          </p>
        </div>

        {/* Pillar 1: Government & Private Construction Tenders */}
        <section
          id="construction-tenders"
          className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 shadow-sm scroll-mt-24 space-y-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-navy-50 text-navy-900 flex items-center justify-center border border-navy-100">
                <FileCheck2 className="w-6 h-6 text-gold-600" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
                Government & Private Construction Tenders
              </h2>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                We participate in, manage, and execute complex civil and infrastructure tenders for public bodies (PWD, CPWD, Urban Development Authorities) and major private industrial developers. From comprehensive Bill of Quantities (BOQ) review to structured milestone completion, we ensure zero compliance variance.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-navy-900 font-bold text-sm">
                    <Scale className="w-4 h-4 text-gold-600" />
                    <span>Public Works Tenders</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Civil infrastructure, road networks, municipal drainage, public institutional facilities, and utility installations with strict adherence to state & central procurement guidelines.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-navy-900 font-bold text-sm">
                    <HardHat className="w-4 h-4 text-gold-600" />
                    <span>Private Contracting</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Industrial sheds, warehouse complexes, corporate foundations, and commercial site development executed on turnkey or package-bidding structures.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-navy-950 text-white rounded-xl p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gold-400">
                  Key Bidding Highlights
                </h3>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Technical BOQ & drawing analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Statutory safety & labor compliance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Documented project milestone timelines</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/request-quotation?category=construction-tenders"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold bg-gold-500 hover:bg-gold-400 text-navy-950 transition-colors"
              >
                <span>Request Tender Quotation</span>
                <ArrowRight className="w-3.5 h-3.5 text-navy-950" />
              </Link>
            </div>
          </div>
        </section>

        {/* Pillar 2: Construction Machinery Supply */}
        <section
          id="construction-machinery"
          className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 shadow-sm scroll-mt-24 space-y-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-navy-50 text-navy-900 flex items-center justify-center border border-navy-100">
                <Truck className="w-6 h-6 text-gold-600" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
                Construction Machinery Supply
              </h2>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                We supply dependable, high-capacity construction equipment and heavy vehicles across India. Whether for highway earthworks, bridge construction, or multi-level civil works, our machinery options are backed by manufacturer verification and maintenance support.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <h4 className="text-xs font-bold text-navy-900 uppercase">Earthmoving</h4>
                  <p className="text-xs text-slate-600">
                    Tracked excavators (10T–50T), backhoes, bulldozers, wheel loaders.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <h4 className="text-xs font-bold text-navy-900 uppercase">Lifting Fleet</h4>
                  <p className="text-xs text-slate-600">
                    Hydraulic mobile cranes, rough-terrain cranes, crawler lifting rigs.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <h4 className="text-xs font-bold text-navy-900 uppercase">Concrete & Road</h4>
                  <p className="text-xs text-slate-600">
                    Batching units, transit mixers, tandem vibratory rollers, pavers.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-navy-950 text-white rounded-xl p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gold-400">
                  Fleet Sourcing Terms
                </h3>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Outright procurement or structured lease</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Pre-dispatch technical condition audit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Pan-India transit logistics & insurance</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/request-quotation?category=construction-machinery"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold bg-gold-500 hover:bg-gold-400 text-navy-950 transition-colors"
              >
                <span>Request Machinery Quote</span>
                <ArrowRight className="w-3.5 h-3.5 text-navy-950" />
              </Link>
            </div>
          </div>
        </section>

        {/* Pillar 3: Manufacturing Machinery Supply */}
        <section
          id="manufacturing-machinery"
          className="bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 shadow-sm scroll-mt-24 space-y-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-navy-50 text-navy-900 flex items-center justify-center border border-navy-100">
                <Cog className="w-6 h-6 text-gold-600" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
                Manufacturing Machinery Supply
              </h2>
              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                Engineering-grade equipment for manufacturing units, industrial fabrication facilities, metalworking plants, and automated assembly operations. We bridge technical plant specifications with qualified industrial manufacturers.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-navy-900 font-bold text-sm">
                    <Factory className="w-4 h-4 text-gold-600" />
                    <span>Production Line Systems</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Automated conveyors, material handling gantries, pneumatic processing rigs, and heavy-duty factory assembly installations.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-navy-900 font-bold text-sm">
                    <Cog className="w-4 h-4 text-gold-600" />
                    <span>Tooling & CNC Equipment</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    High-precision CNC machining centers, industrial lathes, hydraulic press brakes, and metal fabrication machinery.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-navy-950 text-white rounded-xl p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gold-400">
                  Industrial Equipment Scope
                </h3>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Custom factory specification matching</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Manufacturer warranty & test certificates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                    <span>Installation guidance & tooling support</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/request-quotation?category=manufacturing-machinery"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-bold bg-gold-500 hover:bg-gold-400 text-navy-950 transition-colors"
              >
                <span>Request Manufacturing Quote</span>
                <ArrowRight className="w-3.5 h-3.5 text-navy-950" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
