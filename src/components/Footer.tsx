'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Mail, Phone, MapPin, FileText, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith('/staff')) {
    return null;
  }

  return (
    <footer className="bg-navy-950 text-slate-300 border-t border-navy-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Section 1: Company Identity (BUG-006, BUG-007, BUG-008) */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-auto aspect-[480/550] flex-shrink-0 bg-white p-1 rounded-md">
                <Image
                  src="/santhaya-symbol.png"
                  alt="Santhaya Associates Symbol"
                  width={480}
                  height={550}
                  loading="eager"
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
              Industrial infrastructure enterprise specializing exclusively in government and private construction tenders, heavy construction machinery supply, and high-precision manufacturing equipment.
            </p>
            <p className="text-[11px] text-slate-400">
              Corporate Office: Gopalpur, Motihari, Bihar – 845401
            </p>
          </div>

          {/* Section 2: Our Services (BUG-006) */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-navy-800 pb-2">
              Our Services
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
                  <FileText className="w-3.5 h-3.5" />
                  <span>Request Official Quotation</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Section 3: Quick Links (BUG-006) */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-navy-800 pb-2">
              Quick Links
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li>
                <Link href="/" className="hover:text-gold-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-gold-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-gold-400 transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/#how-we-work" className="hover:text-gold-400 transition-colors">
                  How We Work
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="hover:text-gold-400 transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-gold-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-gold-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Section 4: Contact Information (BUG-004, BUG-005, BUG-006) */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-navy-800 pb-2">
              Contact Information
            </h3>
            <ul className="space-y-3.5 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Registered Address:</span>
                  <p className="text-xs text-slate-200 leading-relaxed mt-0.5">
                    Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Direct Helplines:</span>
                  <div className="space-y-0.5 mt-0.5">
                    <a
                      href="tel:+919430986713"
                      className="hover:text-gold-400 transition-colors text-slate-200 font-medium block"
                    >
                      +91 9430986713
                    </a>
                    <a
                      href="tel:+919608950748"
                      className="hover:text-gold-400 transition-colors text-slate-300 block"
                    >
                      +91 9608950748
                    </a>
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-gold-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Commercial Email:</span>
                  <a
                    href="mailto:heistofeverything@gmail.com"
                    className="hover:text-gold-400 transition-colors text-slate-200 block break-all mt-0.5"
                  >
                    heistofeverything@gmail.com
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & disclaimer (BUG-005, BUG-006) */}
        <div className="mt-12 pt-8 border-t border-navy-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} Santhaya Associates Pvt. Ltd. All rights reserved.
          </p>
          <p className="text-[11px] text-slate-400 text-center sm:text-right">
            Registered Legal Entity • Bihar, India
          </p>
        </div>
      </div>
    </footer>
  );
}
