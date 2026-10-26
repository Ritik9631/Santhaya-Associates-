import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, FileText, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-slate-300 border-t border-navy-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-auto aspect-[480/550] flex-shrink-0 bg-white p-1 rounded-md">
                <Image
                  src="/santhaya-symbol.png"
                  alt="Santhaya Associates Symbol"
                  width={480}
                  height={550}
                  className="h-full w-auto object-contain"
                />
              </div>
              <div>
                <p className="text-base font-bold text-white tracking-wide">
                  SANTHAYA ASSOCIATES
                </p>
                <p className="text-xs text-gold-400 font-medium">PVT. LTD.</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Industrial infrastructure partner specializing exclusively in government and private construction tenders, heavy construction machinery supply, and high-precision manufacturing equipment.
            </p>
            <p className="text-xs font-semibold text-gold-400 tracking-wider">
              BUILDING TODAY • POWERING TOMORROW
            </p>
          </div>

          {/* Core Services Column */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-navy-800 pb-2">
              Approved Service Scope
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <Link
                  href="/services#construction-tenders"
                  className="hover:text-gold-400 transition-colors flex items-center justify-between group"
                >
                  <span>Government & Private Tenders</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-gold-400" />
                </Link>
              </li>
              <li>
                <Link
                  href="/services#construction-machinery"
                  className="hover:text-gold-400 transition-colors flex items-center justify-between group"
                >
                  <span>Construction Machinery Supply</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-gold-400" />
                </Link>
              </li>
              <li>
                <Link
                  href="/services#manufacturing-machinery"
                  className="hover:text-gold-400 transition-colors flex items-center justify-between group"
                >
                  <span>Manufacturing Machinery Supply</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-gold-400" />
                </Link>
              </li>
              <li>
                <Link
                  href="/request-quotation"
                  className="text-gold-400 hover:text-gold-300 font-medium transition-colors flex items-center gap-1 mt-2"
                >
                  <FileText className="w-3 h-3" />
                  Request Official Quotation
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links Column */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-navy-800 pb-2">
              Navigation & Compliance
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <Link href="/about" className="hover:text-gold-400 transition-colors">
                  About the Company
                </Link>
              </li>
              <li>
                <Link href="/#how-we-work" className="hover:text-gold-400 transition-colors">
                  Procurement Workflow
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-gold-400 transition-colors">
                  Privacy Policy (Placeholder)
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-gold-400 transition-colors">
                  Terms of Service (Placeholder)
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Verification Column */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-navy-800 pb-2">
              Corporate Details
            </h3>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-300">Registered Office:</span>
                  <p className="text-[11px] text-amber-300/80">Pending formal confirmation</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-300">Inquiries:</span>
                  <p className="text-[11px] text-amber-300/80">contact@santhaya.local (Unverified)</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-300">Helpline:</span>
                  <p className="text-[11px] text-amber-300/80">+91 (Pending Official Allocation)</p>
                </div>
              </li>
              <li className="pt-2 border-t border-navy-800/80">
                <span className="inline-block text-[10px] uppercase font-semibold tracking-wider text-slate-400 bg-navy-900 px-2 py-1 rounded border border-navy-800">
                  GSTIN: Verification in Progress
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & disclaimer */}
        <div className="mt-12 pt-8 border-t border-navy-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} Santhaya Associates Pvt. Ltd. All rights reserved.
          </p>
          <p className="text-[11px] text-slate-400 text-center sm:text-right">
            Phase 1 Web Deployment • Official Visual Reference: <code className="text-gold-400">full-brand-reference.png</code>
          </p>
        </div>
      </div>
    </footer>
  );
}
