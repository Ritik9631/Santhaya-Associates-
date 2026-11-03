'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Phone, MessageSquare, FileText } from 'lucide-react';

const WHATSAPP_URL =
  'https://wa.me/919608950748?text=Hello%20Santhaya%20Associates%2C%20I%20would%20like%20to%20enquire%20about%20your%20construction%20tender%20or%20machinery%20supply%20services.';

export default function MobileQuickContactBar() {
  const pathname = usePathname();

  // Hide on staff ERP routes
  if (pathname?.startsWith('/staff')) {
    return null;
  }

  return (
    <aside
      aria-label="Quick Contact Actions"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-navy-950/95 backdrop-blur-md border-t border-navy-800/90 shadow-2xl px-3 py-2"
    >
      <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
        {/* Call Action */}
        <a
          href="tel:+919430986713"
          className="flex flex-col items-center justify-center min-h-[44px] py-1 px-2 rounded-lg bg-navy-900 border border-navy-700/80 text-slate-200 active:bg-navy-800 hover:text-white transition-colors"
          aria-label="Call Santhaya Associates at +91 9430986713"
        >
          <Phone className="w-4 h-4 text-gold-400 mb-0.5" aria-hidden="true" />
          <span className="text-[11px] font-semibold tracking-tight">Call Us</span>
        </a>

        {/* WhatsApp Action */}
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center min-h-[44px] py-1 px-2 rounded-lg bg-emerald-950/70 border border-emerald-600/40 text-emerald-200 active:bg-emerald-900 hover:text-white transition-colors"
          aria-label="Chat with Santhaya Associates on WhatsApp at +91 9608950748"
        >
          <MessageSquare className="w-4 h-4 text-emerald-400 mb-0.5" aria-hidden="true" />
          <span className="text-[11px] font-semibold tracking-tight">WhatsApp</span>
        </a>

        {/* Request Quotation Action */}
        <Link
          href="/request-quotation"
          className="flex flex-col items-center justify-center min-h-[44px] py-1 px-2 rounded-lg bg-gold-500 text-navy-950 font-bold active:bg-gold-400 shadow-sm transition-colors"
          aria-label="Request an industrial quotation"
        >
          <FileText className="w-4 h-4 text-navy-950 mb-0.5" aria-hidden="true" />
          <span className="text-[11px] font-bold tracking-tight">Get Quote</span>
        </Link>
      </div>
    </aside>
  );
}

