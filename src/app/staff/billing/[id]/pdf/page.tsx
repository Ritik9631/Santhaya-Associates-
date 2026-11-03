import { notFound, redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import PrintButton from '@/components/PrintButton';
import {
  determineTaxStatus,
  formatPlaceOfSupply,
  resolveIndianState,
} from '@/lib/quotation/calculations';
import { convertNumberToIndianWords, formatIndianRupee } from '@/lib/utils/currency';
import { formatIndianDate } from '@/lib/utils/date';
import {
  getDefaultInvoiceTerms,
  getSimplifiedInvoiceTerms,
} from '@/lib/billing/default-terms';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tax Invoice Print View | Santhaya Associates',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function InvoicePdfPage({ params }: PageProps) {
  try {
    await requireStaffSession();
  } catch {
    redirect(`/staff/login?redirectTo=/staff/billing/${params.id}/pdf`);
  }

  const adminClient = createAdminClient();

  // Load invoice
  const { data: invoice, error: invoiceErr } = await adminClient
    .from('invoices')
    .select('*')
    .eq('id', params.id)
    .single();

  if (invoiceErr || !invoice) {
    notFound();
  }

  // Load items
  const { data: items } = await adminClient
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', params.id)
    .order('sort_order', { ascending: true });

  const lineItems = items || [];

  // Determine statutory document title (BUG-052: Draft safeguards)
  const isDraft = invoice.status === 'draft';
  let docTitle = isDraft ? 'DRAFT — NOT A TAX INVOICE' : 'TAX INVOICE';
  let subDocTitle = isDraft
    ? 'UNISSUED DRAFT PREVIEW — Not a statutory tax invoice under Section 31 of CGST Act, 2017. Cannot be used for Input Tax Credit (ITC).'
    : 'Issued under Section 31 of CGST Act, 2017 & Rule 46 of CGST Rules, 2017';

  if (!isDraft) {
    if (invoice.invoice_type === 'bill_of_supply') {
      docTitle = 'BILL OF SUPPLY';
      subDocTitle = 'Issued under Section 31(3)(c) of CGST Act, 2017 & Rule 49 of CGST Rules, 2017';
    } else if (invoice.invoice_type === 'non_gst') {
      docTitle = 'COMMERCIAL INVOICE';
      subDocTitle = 'Non-GST Supply of Goods / Services';
    }
  }

  const isTaxInvoice = invoice.invoice_type === 'tax_invoice';

  // Supply and Tax Determination
  const supplyState = resolveIndianState(invoice.place_of_supply_state_code);
  const taxDetermination = determineTaxStatus(
    isTaxInvoice,
    invoice.place_of_supply_state_code,
    invoice.company_state_code || '10'
  );
  const isIntraState = taxDetermination === 'intra_state';
  const isInterState = taxDetermination === 'inter_state';
  const placeOfSupplyFormatted = formatPlaceOfSupply(invoice.place_of_supply_state_code);

  // Clean, professional terms and conditions (Payment, GST & Taxes, Delivery & Acceptance, Warranty, Returns & Adjustments, Dispute Resolution)
  const defaultTerms = getSimplifiedInvoiceTerms(
    invoice.due_date ? formatIndianDate(invoice.due_date) : 'as specified on this invoice'
  );
  const termsText =
    !invoice.terms_conditions ||
    invoice.terms_conditions.includes('1. PAYMENT DUE DATE:') ||
    invoice.terms_conditions.includes('1. VALIDITY')
      ? defaultTerms
      : invoice.terms_conditions;

  const termsClauses = termsText
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:py-0 print:bg-white text-slate-800">
      {/* Inject Print-Specific Page Styling to ensure clean single-page fit for standard invoices */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 portrait;
          margin: 8mm 10mm;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          html, body {
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          table {
            width: 100% !important;
            table-layout: fixed !important;
            page-break-inside: auto;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .stamp-authorization-box {
            text-align: right !important;
          }
          .stamp-align-container {
            display: flex !important;
            justify-content: flex-end !important;
            align-items: center !important;
            text-align: right !important;
            margin-left: auto !important;
            margin-right: 0 !important;
            width: 100% !important;
          }
          .stamp-image-wrapper {
            display: flex !important;
            justify-content: flex-end !important;
            align-items: center !important;
            margin-left: auto !important;
            margin-right: 0 !important;
          }
          .stamp-image-wrapper img {
            margin-left: auto !important;
            margin-right: 0 !important;
          }
        }
      `}} />

      {/* Top Floating Action Bar (Hidden during print) */}
      <div className="max-w-[850px] mx-auto mb-4 px-4 flex items-center justify-between print:hidden">
        <Link
          href={`/staff/billing/${invoice.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Billing View
        </Link>

        <PrintButton className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#10243B] hover:bg-slate-800 rounded-lg shadow-sm transition focus:ring-2 focus:ring-gold-500" />
      </div>

      {/* Main A4 Printable Sheet */}
      <div className="print-container max-w-[850px] mx-auto bg-white p-6 sm:p-7 shadow-lg border border-slate-300 print:border-none print:shadow-none print:p-0 print:max-w-none text-xs leading-normal relative overflow-hidden">
        {/* BUG-052: Repeating Diagonal Watermark for Draft Invoices */}
        {isDraft && (
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden select-none">
            <div className="text-red-500/15 print:text-red-600/20 font-black text-5xl sm:text-7xl md:text-8xl -rotate-45 tracking-widest uppercase border-4 border-dashed border-red-500/20 print:border-red-600/30 p-8 rounded-3xl text-center">
              DRAFT — NOT A TAX INVOICE
              <div className="text-xl sm:text-2xl mt-2 tracking-normal font-bold">
                Unissued Draft Preview • No Statutory Standing
              </div>
            </div>
          </div>
        )}

        {/* BUG-052: Prominent Top Notice for Draft Invoices */}
        {isDraft && (
          <div className="mb-4 p-3 bg-amber-50 border-2 border-amber-500 rounded-xl text-amber-900 text-xs font-semibold flex items-center gap-2 print:border-amber-600">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>STATUTORY NOTICE (DRAFT PREVIEW):</strong> This invoice is in <strong>Draft</strong> status and has not been formally issued. It does NOT constitute a statutory Tax Invoice under Rule 46 of CGST Rules, 2017.
            </span>
          </div>
        )}

        {/* Balanced Two-Column Header Block (BUG-030) - Header asset reference: /santhaya-logo-header.png */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-2 border-b-2 border-[#10243B] gap-3" data-header-asset="/santhaya-logo-header.png">
          <div className="flex items-start gap-3 max-w-[62%]">
            <div className="shrink-0 mt-0.5">
              <Image
                src="/santhaya-symbol.png"
                alt="Santhaya Associates Symbol"
                width={480}
                height={550}
                className="w-12 sm:w-13 h-auto aspect-[480/550] object-contain print:w-11.5 shrink-0"
                priority
                unoptimized
              />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-lg sm:text-[17pt] font-extrabold text-[#10243B] leading-tight tracking-tight">
                {invoice.company_legal_name || 'Santhaya Associates Pvt. Ltd.'}
              </h2>
              <p className="text-[9pt] text-slate-700 leading-snug">
                {invoice.company_registered_address || 'Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India'}
              </p>
              <div className="text-[9pt] text-slate-800 font-mono space-x-3 pt-0.5">
                <span><strong className="font-sans">GSTIN:</strong> {invoice.company_gstin || '10ABVCS4277J1ZU'}</span>
                <span><strong className="font-sans">PAN:</strong> {invoice.company_pan || 'ABVCS4277J'}</span>
              </div>
              <p className="text-[8.5pt] text-slate-600 font-medium pt-0.5">
                Govt. & Private Civil Infrastructure | Heavy Machinery Supply & Rentals | Turnkey EPC
              </p>
            </div>
          </div>

          <div className="sm:text-right shrink-0">
            <span
              className={`inline-block px-3 py-1 font-extrabold text-[8.5pt] tracking-widest uppercase rounded shadow-sm ${
                isDraft
                  ? 'bg-amber-500 text-slate-950 font-black border border-amber-600'
                  : 'bg-[#10243B] text-[#F4B323]'
              }`}
            >
              {docTitle}
            </span>
            <h1 className="text-xl sm:text-[22pt] font-black text-slate-900 mt-1 font-mono tracking-tight">
              {invoice.invoice_number || 'DRAFT (NOT ISSUED)'}
            </h1>
            <p className="text-[8.5pt] text-slate-500 mt-0.5 max-w-[260px] sm:ml-auto leading-tight">
              {subDocTitle}
            </p>
            <div className="mt-1 sm:text-right space-y-0.5 text-[8.5pt] text-slate-700">
              <p>
                <span className="text-slate-500 font-medium">Date:</span>{' '}
                <strong className="text-slate-900">{formatIndianDate(invoice.invoice_date)}</strong>
              </p>
              <p>
                <span className="text-slate-500 font-medium">Due Date:</span>{' '}
                <strong className="text-slate-900">{formatIndianDate(invoice.due_date)}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Bill To & Supply Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2.5 border-b border-slate-200">
          <div className="space-y-0.5">
            <p className="text-[9pt] font-bold uppercase tracking-wider text-[#10243B]">
              Details of Receiver (Billed To):
            </p>
            <p className="font-bold text-slate-900 text-sm">
              {invoice.customer_billing_name}
            </p>
            <p className="text-[9.5pt] text-slate-700 leading-relaxed whitespace-pre-line">
              {invoice.customer_billing_address || 'No billing address provided.'}
            </p>
            <div className="text-[9pt] text-slate-800 font-mono space-y-0.5 pt-0.5">
              {invoice.customer_gstin ? (
                <p><strong className="font-sans">GSTIN:</strong> {invoice.customer_gstin}</p>
              ) : (
                <p className="italic text-slate-500 font-sans">Unregistered Consumer</p>
              )}
              {invoice.customer_pan && <p><strong className="font-sans">PAN:</strong> {invoice.customer_pan}</p>}
              <p className="font-sans">
                <strong>State:</strong> {invoice.customer_state_name || 'Not Specified'} ({invoice.customer_state_code || '—'})
              </p>
            </div>
          </div>

          <div className="space-y-1 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 text-[9pt]">
            <p className="text-[8.5pt] font-bold uppercase tracking-wider text-[#10243B] mb-0.5">
              Statutory Supply Coordinates:
            </p>
            <p>
              <span className="text-slate-600 font-medium">Place of Supply:</span>{' '}
              <strong className="text-slate-900">{placeOfSupplyFormatted}</strong>
            </p>
            <p>
              <span className="text-slate-600 font-medium">Tax Nature:</span>{' '}
              {isTaxInvoice ? (
                isIntraState ? (
                  <span className="text-emerald-800 font-semibold">Intra-State Supply (CGST 9% + SGST 9%)</span>
                ) : isInterState ? (
                  <span className="text-blue-800 font-semibold">Inter-State Supply (IGST 18%)</span>
                ) : (
                  <span className="text-amber-800 font-semibold">Tax Pending Determination</span>
                )
              ) : (
                <span className="text-slate-700 font-semibold">Exempt / Non-GST Supply</span>
              )}
            </p>
            <p>
              <span className="text-slate-600 font-medium">Reverse Charge:</span>{' '}
              <span className="text-slate-800 font-semibold">No (Tax payable by supplier)</span>
            </p>
            {invoice.delivery_location && (
              <p>
                <span className="text-slate-600 font-medium">Site / Delivery Location:</span>{' '}
                <span className="text-slate-900">{invoice.delivery_location}</span>
              </p>
            )}
            {invoice.client_po_reference && (
              <p>
                <span className="text-slate-600 font-medium">Client PO Ref:</span>{' '}
                <span className="text-slate-900 font-mono font-medium">{invoice.client_po_reference}</span>
              </p>
            )}
            {invoice.financial_year && (
              <p>
                <span className="text-slate-600 font-medium">Financial Year:</span>{' '}
                <span className="text-slate-900 font-mono font-medium">FY {invoice.financial_year}</span>
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table (BUG-034: Explicit GST Rate & Tax Amount columns) */}
        <div className="my-2.5 print:my-1.5 border-2 border-slate-700 print:border-slate-800 rounded-lg overflow-hidden w-full">
          <table className="w-full text-left border-collapse table-fixed text-[9pt]">
            <thead className="bg-[#10243B] text-white font-bold border-b-2 border-slate-900">
              <tr>
                <th className="py-2 px-1 text-center w-[4%] border-r border-slate-500 text-[8.5pt] uppercase tracking-wider">#</th>
                <th className={`py-2 px-2 border-r border-slate-500 ${isTaxInvoice ? 'w-[30%]' : 'w-[44%]'} text-[8.5pt] uppercase tracking-wider`}>
                  Description of Goods / Services
                </th>
                <th className="py-2 px-1 text-center border-r border-slate-500 w-[10%] text-[8.5pt] uppercase tracking-wider">
                  HSN/SAC
                </th>
                <th className="py-2 px-1.5 text-right border-r border-slate-500 w-[10%] text-[8.5pt] uppercase tracking-wider">
                  Qty
                </th>
                <th className={`py-2 px-1.5 text-right border-r border-slate-500 ${isTaxInvoice ? 'w-[12%]' : 'w-[16%]'} text-[8.5pt] uppercase tracking-wider`}>
                  Rate (₹)
                </th>
                <th className={`py-2 px-1.5 text-right border-r border-slate-500 ${isTaxInvoice ? 'w-[12%]' : 'w-[16%]'} text-[8.5pt] uppercase tracking-wider`}>
                  Taxable (₹)
                </th>
                {isTaxInvoice && (
                  <>
                    <th className="py-2 px-1 text-center border-r border-slate-500 w-[7%] text-[8.5pt] uppercase tracking-wider">
                      GST %
                    </th>
                    <th className="py-2 px-1.5 text-right border-r border-slate-500 w-[11%] text-[8.5pt] uppercase tracking-wider">
                      Tax (₹)
                    </th>
                  </>
                )}
                <th className="py-2 px-2 text-right w-[14%] text-[8.5pt] uppercase tracking-wider">
                  Total (₹)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {lineItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/50 print:hover:bg-white border-b border-slate-300">
                  <td className="py-2 px-1 border-r border-slate-300 text-center text-slate-500 font-mono text-[8.5pt] align-top">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-2 border-r border-slate-300 align-top break-words">
                    <div className="font-bold text-slate-900 leading-snug">{item.item_name}</div>
                    {item.description && (
                      <div className="text-[8pt] text-slate-600 whitespace-pre-wrap leading-tight mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-1 border-r border-slate-300 text-center font-mono text-[8.5pt] text-slate-700 align-top">
                    {item.hsn_sac_code || '—'}
                  </td>
                  <td className="py-2 px-1.5 border-r border-slate-300 text-right font-mono font-medium text-slate-900 align-top text-[8.5pt]">
                    {Number(item.quantity).toFixed(2)} {item.unit}
                  </td>
                  <td className="py-2 px-1.5 border-r border-slate-300 text-right font-mono text-slate-900 align-top whitespace-nowrap text-[8.5pt]">
                    {formatIndianRupee(item.unit_rate, 2).replace('₹', '')}
                  </td>
                  <td className="py-2 px-1.5 border-r border-slate-300 text-right font-mono font-semibold text-slate-900 align-top whitespace-nowrap text-[8.5pt]">
                    {formatIndianRupee(item.taxable_amount, 2).replace('₹', '')}
                  </td>
                  {isTaxInvoice && (
                    <>
                      <td className="py-2 px-1 border-r border-slate-300 text-center font-mono text-slate-700 align-top text-[8.5pt]">
                        {item.gst_rate}%
                      </td>
                      <td className="py-2 px-1.5 border-r border-slate-300 text-right font-mono text-slate-900 align-top whitespace-nowrap text-[8.5pt]">
                        {formatIndianRupee(item.tax_amount, 2).replace('₹', '')}
                      </td>
                    </>
                  )}
                  <td className="py-2 px-2 text-right font-bold text-slate-900 font-mono align-top whitespace-nowrap text-[9pt]">
                    {formatIndianRupee(item.line_total, 2).replace('₹', '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation & Bank Instructions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1.5 border-b border-slate-200 pb-2.5 print-avoid-break">
          <div className="flex flex-col justify-between space-y-2">
            <div>
              <p className="text-[8.5pt] font-bold uppercase tracking-wider text-[#10243B]">
                AMOUNT IN WORDS (STATUTORY INR):
              </p>
              <p className="font-semibold text-slate-900 text-[9pt] italic mt-0.5 bg-slate-50 p-2 rounded-lg border border-slate-200 leading-snug">
                {convertNumberToIndianWords(Number(invoice.grand_total_amount))}
              </p>
            </div>

            {/* Bank Details Box (Matching Quotation Template Design) */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-[8.5pt] font-bold text-[#10243B] uppercase tracking-wider block">
                BANK DETAILS
              </span>
              <div className="text-[8.5pt] text-slate-800 leading-tight space-y-0.5 mt-0.5">
                <p>
                  <strong className="font-semibold text-slate-700">Bank Name:</strong>{' '}
                  <span className="text-slate-900 font-medium">State Bank of India</span>
                </p>
                <p>
                  <strong className="font-semibold text-slate-700">Account No.:</strong>{' '}
                  <span className="text-slate-900 font-mono font-bold tracking-wide">45696995612</span>
                </p>
                <p>
                  <strong className="font-semibold text-slate-700">IFSC Code:</strong>{' '}
                  <span className="text-slate-900 font-mono font-bold tracking-wide">SBIN0001763</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 text-[9pt] space-y-1">
            <div className="flex justify-between text-slate-700">
              <span>Gross Taxable Value:</span>
              <span className="font-mono text-slate-900 font-medium">
                {formatIndianRupee(invoice.taxable_amount, 2)}
              </span>
            </div>

            {isTaxInvoice && invoice.is_intra_state && (
              <>
                <div className="flex justify-between text-slate-700 py-0.5">
                  <span>Central GST (CGST 9%):</span>
                  <span className="font-mono text-slate-900">
                    {formatIndianRupee(invoice.cgst_amount, 2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700 py-0.5">
                  <span>State GST (SGST 9%):</span>
                  <span className="font-mono text-slate-900">
                    {formatIndianRupee(invoice.sgst_amount, 2)}
                  </span>
                </div>
              </>
            )}

            {isTaxInvoice && !invoice.is_intra_state && (
              <div className="flex justify-between text-slate-700 py-0.5">
                <span>Integrated GST (IGST 18%):</span>
                <span className="font-mono text-slate-900">
                  {formatIndianRupee(invoice.igst_amount, 2)}
                </span>
              </div>
            )}

            {isTaxInvoice && (
              <div className="flex justify-between text-slate-900 font-semibold py-0.5 border-t border-slate-200">
                <span>Total Statutory GST:</span>
                <span className="font-mono">
                  {formatIndianRupee(invoice.total_tax_amount, 2)}
                </span>
              </div>
            )}

            {Number(invoice.round_off_amount) !== 0 && (
              <div className="flex justify-between text-slate-600 text-[8.5pt]">
                <span>Round-off:</span>
                <span className="font-mono">
                  {Number(invoice.round_off_amount) > 0 ? '+' : ''}
                  {formatIndianRupee(invoice.round_off_amount, 2)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-xs font-bold text-[#10243B] pt-1 mt-0.5 border-t-2 border-[#10243B] bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs">
              <span className="tracking-wide text-[9pt]">INVOICE TOTAL (INR):</span>
              <span className="text-[15pt] font-mono font-black text-[#10243B]">
                {formatIndianRupee(invoice.grand_total_amount, 2)}
              </span>
            </div>

            {Number(invoice.paid_amount) > 0 && (
              <>
                <div className="flex justify-between text-emerald-800 font-semibold pt-0.5">
                  <span>Amount Received:</span>
                  <span className="font-mono font-medium">
                    - {formatIndianRupee(invoice.paid_amount, 2)}
                  </span>
                </div>
                <div className="flex justify-between text-amber-900 font-bold border-t border-slate-200 pt-1">
                  <span>Balance Due:</span>
                  <span className="font-mono">
                    {formatIndianRupee(invoice.balance_amount, 2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Statutory Terms & Conditions (BUG-038) */}
        <div className="pt-2 pb-2 border-b border-slate-200 text-slate-700 print-avoid-break">
          <p className="font-bold text-[#10243B] uppercase tracking-wider text-[9pt] mb-1">
            STATUTORY TERMS & CONDITIONS
          </p>
          <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 text-[8.5pt] text-slate-800 leading-tight">
            <div className={`grid grid-cols-1 ${termsClauses.length > 3 ? 'sm:grid-cols-2 print:grid-cols-2' : ''} gap-x-4 gap-y-1.5`}>
              {termsClauses.map((clause: string, idx: number) => {
                // Attempt to parse "1. HEADING: Details"
                const headingMatch = clause.match(/^(\d+)\.\s*([^:]+):\s*(.*)$/);
                if (headingMatch) {
                  return (
                    <div key={idx} className="flex items-start gap-1.5 break-inside-avoid">
                      <span className="font-bold text-[#10243B] shrink-0 w-4 text-right select-none">{headingMatch[1]}.</span>
                      <p className="flex-1 text-slate-800">
                        <strong className="font-bold text-slate-900 uppercase text-[8pt] tracking-wide">{headingMatch[2]}: </strong>
                        <span className="text-slate-700">{headingMatch[3]}</span>
                      </p>
                    </div>
                  );
                }

                // Fallback if no colon in clause
                const simpleMatch = clause.match(/^(\d+)\.\s*(.*)$/);
                if (simpleMatch) {
                  return (
                    <div key={idx} className="flex items-start gap-1.5 break-inside-avoid">
                      <span className="font-bold text-[#10243B] shrink-0 w-4 text-right select-none">{simpleMatch[1]}.</span>
                      <p className="flex-1 text-slate-700">{simpleMatch[2]}</p>
                    </div>
                  );
                }

                return (
                  <p key={idx} className="pl-4 break-inside-avoid text-slate-700">
                    {clause}
                  </p>
                );
              })}
            </div>
          </div>
          <p className="italic text-slate-500 text-[8pt] leading-tight pt-1">
            Certified that the particulars given above are true and correct and the amount indicated represents the price actually charged and there is no additional consideration flowing directly or indirectly from the buyer.
          </p>
        </div>

        {/* Dual Signatory Block (BUG-037 & Round Stamp Integration) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-[9pt] print-avoid-break">
          {/* Left: Customer Acknowledgment */}
          <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <p className="text-[8.5pt] font-bold text-slate-800 uppercase tracking-wider">
                Customer Acknowledgment:
              </p>
              <p className="text-[8pt] text-slate-500 mt-0.5 leading-tight">
                Goods / Services received in satisfactory condition. Verified for statutory payment.
              </p>
            </div>
            <div className="py-4 flex items-center justify-center text-[8pt] text-slate-400 italic">
              (Customer Signature & Company Seal)
            </div>
            <div className="border-t border-dashed border-slate-300 pt-1 flex justify-between text-[8pt] text-slate-600">
              <span>Received By: ____________________</span>
              <span>Date: ____/____/2026</span>
            </div>
          </div>

          {/* Right: Supplier Corporate Authorization with Round Stamp */}
          <div className="border border-slate-300 rounded-lg p-2.5 bg-white text-right space-y-0.5 ml-auto w-full">
            <p className="font-bold text-slate-900 uppercase text-[8.5pt] tracking-wide">
              For {invoice.company_legal_name || 'Santhaya Associates Pvt. Ltd.'}
            </p>
            <p className="text-[8pt] text-slate-500 leading-tight">
              Statutory GST Compliance & Accounts Department
            </p>

            {/* Official Circular Stamp: Displayed only for officially authorized/issued invoices */}
            <div className={`stamp-align-container py-0.5 flex items-center justify-end w-full ${!isDraft ? 'min-h-[30mm]' : 'min-h-[20px]'}`}>
              {!isDraft ? (
                <div className="stamp-image-wrapper relative flex items-center justify-end ml-auto">
                  <Image
                    src="/santhaya-round-stamp.png"
                    alt="Santhaya Associates Official Company Stamp"
                    width={1254}
                    height={1254}
                    className="w-[30mm] h-[30mm] max-w-[110px] max-h-[110px] object-contain select-none pointer-events-none ml-auto"
                    priority
                    unoptimized
                  />
                </div>
              ) : (
                <div className="py-2 flex items-center justify-end text-[8.5pt] text-slate-400 italic">
                  (Official seal affixed upon formal issuance)
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 pt-0.5 flex justify-between text-[8pt] text-slate-600">
              <span>Date: {formatIndianDate(invoice.invoice_date)}</span>
              <span className="font-semibold text-slate-800">
                {isDraft ? '(Affixed upon issuance)' : 'Authorized Signatory'}
              </span>
            </div>
          </div>
        </div>

        {/* Verified Company Contact Details Footer (High-Contrast NAP, 9pt) */}
        <div className="mt-3 pt-1 border-t-2 border-slate-300 text-center text-[9pt] text-slate-800 leading-snug print-avoid-break">
          <p className="font-semibold text-slate-900">
            Santhaya Associates Pvt. Ltd. <span className="text-slate-400 mx-1">•</span> Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India
          </p>
          <p className="text-slate-700 mt-0.5 font-medium text-[8.5pt]">
            <span><strong>Call:</strong> +91 9430986713</span>
            <span className="text-slate-400 mx-1.5">|</span>
            <span><strong>WhatsApp:</strong> +91 9608950748</span>
            <span className="text-slate-400 mx-1.5">|</span>
            <span><strong>Email:</strong> santhayapvt.ltd@gmail.com</span>
            <span className="text-slate-400 mx-1.5">|</span>
            <span className="font-mono"><strong>GSTIN:</strong> 10ABVCS4277J1ZU</span>
          </p>
        </div>
      </div>
    </div>
  );
}
