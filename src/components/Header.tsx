'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowRight, MapPin, PhoneCall, Mail } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  if (pathname?.startsWith('/staff')) {
    return null;
  }

  const isHomeActive = pathname === '/';
  const isServicesActive = pathname === '/services';
  const isAboutActive = pathname === '/about';

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
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gold-500" />
              <span>Motihari, Bihar – 845401</span>
            </span>
            <span className="hidden md:inline text-navy-700">|</span>
            <a
              href="tel:+919430986713"
              className="hidden md:flex items-center gap-1.5 hover:text-gold-400 transition-colors"
              title="Call Santhaya Associates Primary Helpline"
            >
              <PhoneCall className="w-3 h-3 text-gold-500" />
              <span>+91 9430986713</span>
            </a>
            <span className="hidden xl:inline text-navy-700">|</span>
            <a
              href="mailto:heistofeverything@gmail.com"
              className="hidden xl:flex items-center gap-1.5 hover:text-gold-400 transition-colors"
              title="Email Santhaya Associates"
            >
              <Mail className="w-3 h-3 text-gold-500" />
              <span>heistofeverything@gmail.com</span>
            </a>
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

          {/* Desktop Navigation Links (BUG-001) */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-6 xl:gap-8">
            <Link
              href="/"
              aria-current={isHomeActive ? 'page' : undefined}
              className={`text-sm font-semibold transition-all py-2 relative ${
                isHomeActive
                  ? 'text-navy-950 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gold-500 after:rounded-full'
                  : 'text-navy-900 hover:text-gold-600'
              }`}
            >
              Home
            </Link>
            <Link
              href="/services"
              aria-current={isServicesActive ? 'page' : undefined}
              className={`text-sm font-semibold transition-all py-2 relative ${
                isServicesActive
                  ? 'text-navy-950 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gold-500 after:rounded-full'
                  : 'text-navy-900 hover:text-gold-600'
              }`}
            >
              Services
            </Link>
            <Link
              href="/#how-we-work"
              className="text-sm font-semibold text-navy-900 hover:text-gold-600 transition-colors py-2 relative"
            >
              How We Work
            </Link>
            <Link
              href="/about"
              aria-current={isAboutActive ? 'page' : undefined}
              className={`text-sm font-semibold transition-all py-2 relative ${
                isAboutActive
                  ? 'text-navy-950 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gold-500 after:rounded-full'
                  : 'text-navy-900 hover:text-gold-600'
              }`}
            >
              About Us
            </Link>
            <Link
              href="/#contact"
              className="text-sm font-semibold text-navy-900 hover:text-gold-600 transition-colors py-2 relative"
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
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-lg text-navy-900 hover:text-gold-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
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
              <p className="text-xs font-bold text-navy-900 tracking-wider">SANTHAYA ASSOCIATES PVT. LTD.</p>
              <p className="text-[10px] text-slate-500">Construction Tenders & Machinery Supply</p>
            </div>
          </div>
          <nav aria-label="Mobile Navigation" className="flex flex-col space-y-1.5">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              aria-current={isHomeActive ? 'page' : undefined}
              className={`px-3 py-2 rounded-md text-base font-semibold transition-colors ${
                isHomeActive
                  ? 'border-l-4 border-gold-500 bg-gold-50/70 text-navy-950 font-bold'
                  : 'text-navy-900 hover:bg-slate-100 hover:text-gold-600'
              }`}
            >
              Home
            </Link>
            <Link
              href="/services"
              onClick={() => setMobileMenuOpen(false)}
              aria-current={isServicesActive ? 'page' : undefined}
              className={`px-3 py-2 rounded-md text-base font-semibold transition-colors ${
                isServicesActive
                  ? 'border-l-4 border-gold-500 bg-gold-50/70 text-navy-950 font-bold'
                  : 'text-navy-900 hover:bg-slate-100 hover:text-gold-600'
              }`}
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
              aria-current={isAboutActive ? 'page' : undefined}
              className={`px-3 py-2 rounded-md text-base font-semibold transition-colors ${
                isAboutActive
                  ? 'border-l-4 border-gold-500 bg-gold-50/70 text-navy-950 font-bold'
                  : 'text-navy-900 hover:bg-slate-100 hover:text-gold-600'
              }`}
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
