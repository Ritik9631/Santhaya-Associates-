'use client';

import React from 'react';
import { Printer } from 'lucide-react';

interface PrintButtonProps {
  className?: string;
  label?: string;
}

export default function PrintButton({
  className = 'inline-flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-lg text-xs font-semibold hover:bg-navy-950 shadow transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500',
  label = 'Print / Save as PDF',
}: PrintButtonProps) {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className={className}
      aria-label="Print or save this document as PDF"
    >
      <Printer className="w-4 h-4 text-gold-400" />
      <span>{label}</span>
    </button>
  );
}

