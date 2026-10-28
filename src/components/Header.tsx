'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowRight, ShieldCheck, PhoneCall } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (pathname?.startsWith('/staff')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
      {/* Top utility bar */}
      <div className="bg-navy-950 text-slate-300 text-xs py-1.5 px-4 sm:px-6 lg:px-8 border-b border-navy-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
            <span className="font-medium tracking-wide">
              Official Portal — Construction Tenders & Machinery Supply
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-500" />
              Verified Brand Assets
            </span>
            <span className="hidden md:inline">|</span>
            <span className="hidden md:flex items-center gap-1">
              <PhoneCall className="w-3 h-3 text-gold-500" />
              Inquiries: info@santhaya.com (Pending Confirmation)
            </span>
          </div>
        </div>
      </div>

      {/* Main navigation container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 md:h-24">
          {/* Logo container — strictly preserving aspect ratio and original colors */}
          <Link
            href="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded-md py-1"
            title="Santhaya Associates Pvt. Ltd. — Home"
          >
            {/* Desktop & Tablet Header Logo Lockup */}
            <div className="relative h-14 md:h-16 w-auto aspect-[1045/795] flex-shrink-0 transition-transform duration-200 group-hover:scale-[1.02]">
              <Image
                src="/santhaya-logo-header.png"
                alt="Santhaya Associates Pvt. Ltd. Official Logo"
                width={1045}
                height={795}
                priority
                className="h-full w-auto object-contain"
              />
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link
              href="/services"
              className="text-sm font-semibold text-navy-900 hover:text-gold-600 transition-colors py-2"
            >
              Services
            </Link>
            <Link
              href="/#how-we-work"
              className="text-sm font-semibold text-navy-900 hover:text-gold-600 transition-colors py-2"
            >
              How We Work
            </Link>
            <Link
              href="/about"
              className="text-sm font-semibold text-navy-900 hover:text-gold-600 transition-colors py-2"
            >
              About Us
            </Link>
            <Link
              href="/#contact"
              className="text-sm font-semibold text-navy-900 hover:text-gold-600 transition-colors py-2"
            >
              Contact
            </Link>
          </nav>

          {/* CTA & Actions */}
          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="/request-quotation"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-navy-900 text-white hover:bg-navy-950 border border-navy-800 shadow-sm transition-all duration-200 hover:shadow-md hover:border-gold-500 group"
            >
              <span>Request a Quotation</span>
              <ArrowRight className="w-4 h-4 text-gold-500 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center gap-2">
            <Link
              href="/request-quotation"
              className="text-xs font-semibold px-3 py-2 rounded-md bg-navy-900 text-white hover:bg-navy-950 transition-colors"
            >
              Get Quote
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-navy-900 hover:text-gold-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100 mb-2">
            <div className="relative h-10 w-auto aspect-[480/550] flex-shrink-0">
              <Image
                src="/santhaya-symbol.png"
                alt="Santhaya Brand Mark"
                width={480}
                height={550}
                className="h-full w-auto object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-navy-900 tracking-wider">SANTHAYA ASSOCIATES</p>
              <p className="text-[10px] text-slate-500">Building Today. Powering Tomorrow.</p>
            </div>
          </div>
          <nav className="flex flex-col space-y-2">
            <Link
              href="/services"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-base font-semibold text-navy-900 hover:bg-slate-100 hover:text-gold-600 transition-colors"
            >
              Services
            </Link>
            <Link
              href="/#how-we-work"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-base font-semibold text-navy-900 hover:bg-slate-100 hover:text-gold-600 transition-colors"
            >
              How We Work
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-base font-semibold text-navy-900 hover:bg-slate-100 hover:text-gold-600 transition-colors"
            >
              About Us
            </Link>
            <Link
              href="/#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-base font-semibold text-navy-900 hover:bg-slate-100 hover:text-gold-600 transition-colors"
            >
              Contact
            </Link>
          </nav>
          <div className="pt-2">
            <Link
              href="/request-quotation"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-navy-900 text-white hover:bg-navy-950 transition-colors shadow-sm"
            >
              <span>Request a Formal Quotation</span>
              <ArrowRight className="w-4 h-4 text-gold-500" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
