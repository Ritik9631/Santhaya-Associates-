'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowRight, Phone, MessageSquare } from 'lucide-react';

const WHATSAPP_URL =
  'https://wa.me/919608950748?text=Hello%20Santhaya%20Associates%2C%20I%20would%20like%20to%20enquire%20about%20your%20construction%20tender%20or%20machinery%20supply%20services.';

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
          <div className="hidden lg:flex items-center gap-3 xl:gap-4">
            <a
              href="tel:+919430986713"
              className="hidden xl:inline-flex items-center gap-1.5 text-xs font-bold text-navy-900 hover:text-gold-600 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100"
              title="Call Helpline: +91 9430986713"
            >
              <Phone className="w-3.5 h-3.5 text-gold-600" />
              <span>+91 9430986713</span>
            </a>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden xl:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors py-2 px-3 rounded-lg hover:bg-emerald-50"
              title="Chat on WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </a>

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
              <p className="text-[10px] text-slate-500">Building Today • Powering Tomorrow</p>
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

          {/* Quick Direct Actions in Mobile Menu */}
          <div className="pt-2 grid grid-cols-2 gap-2">
            <a
              href="tel:+919430986713"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold bg-slate-100 text-navy-900 hover:bg-slate-200 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-gold-600" />
              <span>Call Us</span>
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </a>
          </div>

          <div className="pt-1">
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
