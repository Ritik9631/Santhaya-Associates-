import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { formatIndianRupee } from '@/lib/utils/currency';

export interface RateTaxSummary {
  gstRate: number;
  taxableAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalTax: number;
}

export interface TaxBreakdownProps {
  title?: string;
  subtotalAmount: number;
  discountAmount?: number;
  taxableAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalTaxAmount: number;
  roundOffAmount?: number;
  grandTotalAmount: number;
  amountInWords?: string;
  isGstApplicable?: boolean;
  taxDetermination: 'intra_state' | 'inter_state' | 'undetermined' | 'not_applicable';
  rateBreakdown?: RateTaxSummary[];
  className?: string;
  isDark?: boolean;
}

export function TaxBreakdownCard({
  title = 'Financial & Statutory Tax Summary',
  subtotalAmount,
  discountAmount = 0,
  taxableAmount,
  cgstAmount = 0,
  sgstAmount = 0,
  igstAmount = 0,
  totalTaxAmount,
  roundOffAmount = 0,
  grandTotalAmount,
  amountInWords,
  isGstApplicable = true,
  taxDetermination,
  rateBreakdown = [],
  className = '',
  isDark = false,
}: TaxBreakdownProps) {
  const isUndetermined = isGstApplicable && taxDetermination === 'undetermined';
  const isIntraState = taxDetermination === 'intra_state';
  const isInterState = taxDetermination === 'inter_state';

  const containerClasses = isDark
    ? 'bg-slate-900 border border-slate-800 text-white p-5 rounded-xl shadow-lg'
    : 'bg-white border border-slate-200 text-slate-900 p-5 rounded-xl shadow-sm';

  const labelClasses = isDark ? 'text-slate-400' : 'text-slate-600';
  const valueClasses = isDark ? 'text-white font-medium font-mono' : 'text-slate-900 font-medium font-mono';
  const borderClasses = isDark ? 'border-slate-800' : 'border-slate-100';

  return (
    <div className={`${containerClasses} ${className} space-y-4`}>
      <div className={`flex items-center justify-between pb-3 border-b ${borderClasses}`}>
        <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gold-400' : 'text-[#10243B]'}`}>
          {title}
        </h3>

        {/* Tax Determination Status Badge */}
        {isUndetermined ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            Tax Determination Pending
          </span>
        ) : isIntraState ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            Intra-State (CGST + SGST)
          </span>
        ) : isInterState ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
            Inter-State (IGST)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            Non-GST / Exempt
          </span>
        )}
      </div>

      {isUndetermined && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2.5 text-xs text-amber-300">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Valid Place of Supply Required:</span>
            Tax cannot be computed without a valid 2-digit Indian State Code. Issuance is strictly blocked until Place of Supply is specified.
          </div>
        </div>
      )}

      <div className="space-y-2 text-xs">
        {/* Gross Subtotal */}
        <div className="flex justify-between items-center">
          <span className={labelClasses}>Gross Subtotal:</span>
          <span className={valueClasses}>{formatIndianRupee(subtotalAmount)}</span>
        </div>

        {/* Discount (if any) */}
        {discountAmount > 0 && (
          <div className="flex justify-between items-center text-emerald-500">
            <span>Trade Discount Applied:</span>
            <span className="font-mono font-medium">- {formatIndianRupee(discountAmount)}</span>
          </div>
        )}

        {/* Taxable Amount */}
        <div className={`flex justify-between items-center pt-1.5 border-t ${borderClasses}`}>
          <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Taxable Value:</span>
          <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>
            {formatIndianRupee(taxableAmount)}
          </span>
        </div>

        {/* Multi-Rate Breakdown Table (if available) */}
        {rateBreakdown.length > 0 && isGstApplicable && !isUndetermined && (
          <div className={`py-2 px-3 rounded-lg ${isDark ? 'bg-slate-950/60' : 'bg-slate-50'} border ${borderClasses} space-y-1.5`}>
            <span className={`block text-[11px] font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              GST Slabs Breakdown:
            </span>
            {rateBreakdown.map((r) => (
              <div key={r.gstRate} className="flex justify-between text-[11px]">
                <span className={labelClasses}>
                  Taxable @ {r.gstRate}% ({formatIndianRupee(r.taxableAmount)}):
                </span>
                <span className={valueClasses}>
                  {isIntraState
                    ? `CGST: ${formatIndianRupee(r.cgstAmount || 0)} + SGST: ${formatIndianRupee(r.sgstAmount || 0)}`
                    : `IGST: ${formatIndianRupee(r.igstAmount || 0)}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Applicable GST Breakdown */}
        {isGstApplicable && !isUndetermined && (
          <>
            {isIntraState ? (
              <>
                <div className="flex justify-between items-center">
                  <span className={labelClasses}>Central GST (CGST):</span>
                  <span className={valueClasses}>{formatIndianRupee(cgstAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={labelClasses}>State GST (SGST):</span>
                  <span className={valueClasses}>{formatIndianRupee(sgstAmount)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <span className={labelClasses}>Integrated GST (IGST):</span>
                <span className={valueClasses}>{formatIndianRupee(igstAmount)}</span>
              </div>
            )}

            <div className={`flex justify-between items-center pt-1 border-t ${borderClasses}`}>
              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Total GST Amount:</span>
              <span className={`font-semibold ${isDark ? 'text-gold-400' : 'text-slate-900'} font-mono`}>
                {formatIndianRupee(totalTaxAmount)}
              </span>
            </div>
          </>
        )}

        {/* Round-off (if non-zero) */}
        {roundOffAmount !== 0 && (
          <div className="flex justify-between items-center text-[11px] text-slate-500">
            <span>Round-off Adjustment:</span>
            <span className="font-mono">
              {roundOffAmount > 0 ? `+${formatIndianRupee(roundOffAmount)}` : `-${formatIndianRupee(Math.abs(roundOffAmount))}`}
            </span>
          </div>
        )}

        {/* Grand Total */}
        <div className={`flex justify-between items-center pt-2.5 border-t-2 ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
          <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Grand Total (INR):
          </span>
          <span className={`text-lg font-bold font-mono ${isDark ? 'text-gold-400' : 'text-emerald-700'}`}>
            {isUndetermined ? (
              <span className="text-amber-500 text-sm font-semibold">
                {formatIndianRupee(taxableAmount)} + GST (Pending)
              </span>
            ) : (
              formatIndianRupee(grandTotalAmount)
            )}
          </span>
        </div>

        {/* Amount in Words */}
        {amountInWords && (
          <div className={`pt-2 border-t ${borderClasses} text-[11px] italic font-serif leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <span className="font-sans font-semibold not-italic block uppercase text-[10px] text-slate-400">
              Amount in Words:
            </span>
            {amountInWords}
          </div>
        )}
      </div>
    </div>
  );
}

