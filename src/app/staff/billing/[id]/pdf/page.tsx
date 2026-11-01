import { notFound, redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PrintButton from '@/components/PrintButton';
import {
  determineTaxStatus,
  formatPlaceOfSupply,
  resolveIndianState,
} from '@/lib/quotation/calculations';
import { convertNumberToIndianWords, formatIndianRupee } from '@/lib/utils/currency';
import { formatIndianDate } from '@/lib/utils/date';
import { getDefaultInvoiceTerms } from '@/lib/billing/default-terms';
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

  // Determine statutory document title
  let docTitle = 'TAX INVOICE';
  let subDocTitle = 'Issued under Section 31 of CGST Act, 2017 & Rule 46 of CGST Rules, 2017';
  if (invoice.invoice_type === 'bill_of_supply') {
    docTitle = 'BILL OF SUPPLY';
    subDocTitle = 'Issued under Section 31(3)(c) of CGST Act, 2017';
  } else if (invoice.invoice_type === 'non_gst') {
    docTitle = 'COMMERCIAL INVOICE';
    subDocTitle = 'Non-GST Supply of Goods / Services';
  }

  const isTaxInvoice = invoice.invoice_type === 'tax_invoice';

  // Format bank payment instructions safely without fake bank data
  const rawInstructions = invoice.payment_instructions || '';
  const hasFakeBankDetails =
    rawInstructions.includes('398472910482') ||
    rawInstructions.includes('SBIN0000691') ||
    rawInstructions.includes('Main Branch, New Delhi');

  const safePaymentInstructions = hasFakeBankDetails || !rawInstructions.trim()
    ? 'Bank transfer details provided upon quotation acceptance / formal contract execution.\nFor RTGS/NEFT remittance coordinates, contact accounts at heistofeverything@gmail.com / +91 9430986713.'
    : rawInstructions;

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

  const defaultTerms = getDefaultInvoiceTerms(invoice.due_date);
  const termsText = invoice.terms_conditions || defaultTerms;

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:py-0 print:bg-white text-slate-800">
      {/* Inject Print-Specific Page Styling to ensure clean single-page fit for standard invoices */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            background: white !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
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
      <div className="max-w-[850px] mx-auto bg-white p-6 sm:p-8 shadow-lg border border-slate-300 print:border-none print:shadow-none print:p-0 print:max-w-none text-xs leading-normal">
        {/* Balanced Two-Column Header Block (BUG-030) - Header asset reference: /santhaya-logo-header.png */}
        <div className="border-b-2 border-[#10243B] pb-3.5" data-header-asset="/santhaya-logo-header.png">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-start gap-3.5 max-w-[62%]">
              <div className="shrink-0 mt-0.5">
                <Image
                  src="/santhaya-symbol.png"
                  alt="Santhaya Associates Symbol"
                  width={48}
                  height={48}
                  className="w-11 h-11 object-contain print:w-10 print:h-10"
                  priority
                />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-slate-900 leading-tight tracking-tight">
                  {invoice.company_legal_name || 'Santhaya Associates Pvt. Ltd.'}
                </h2>
                <p className="text-[11px] text-slate-700 leading-snug">
                  {invoice.company_registered_address || 'Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India'}
                </p>
                <div className="text-[11px] text-slate-800 font-mono space-x-3 pt-0.5">
                  <span><strong>GSTIN:</strong> {invoice.company_gstin || '10ABVCS4277J1ZU'}</span>
                  <span><strong>State:</strong> {invoice.company_state_name || 'Bihar'} ({invoice.company_state_code || '10'})</span>
                  <span><strong>PAN:</strong> {invoice.company_pan || 'ABVCS4277J'}</span>
                </div>
                <p className="text-[10px] text-slate-600 font-medium pt-0.5">
                  Civil Engineering Infrastructure | Heavy Machinery Fleet | Turnkey Construction
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block px-3 py-1 bg-[#10243B] text-[#F4B323] font-bold text-xs tracking-wider uppercase rounded shadow-sm">
                {docTitle}
              </span>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[210px] leading-tight">
                {subDocTitle}
              </p>
              <div className="mt-1.5 text-right space-y-0.5">
                <p className="text-sm font-bold text-slate-900 font-mono">
                  {invoice.invoice_number || 'DRAFT (NOT ISSUED)'}
                </p>
                <p className="text-[11px] text-slate-700">
                  <strong>Date:</strong> {formatIndianDate(invoice.invoice_date)}
                </p>
                <p className="text-[11px] text-slate-700">
                  <strong>Due Date:</strong> {formatIndianDate(invoice.due_date)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To & Supply Metadata */}
        <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-200">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Details of Receiver (Billed To):
            </p>
            <p className="font-bold text-slate-900 text-sm">
              {invoice.customer_billing_name}
            </p>
            <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">
              {invoice.customer_billing_address || 'No billing address provided.'}
            </p>
            <div className="text-[11px] text-slate-800 font-mono space-y-0.5 pt-0.5">
              {invoice.customer_gstin ? (
                <p><strong>GSTIN:</strong> {invoice.customer_gstin}</p>
              ) : (
                <p className="italic text-slate-500">Unregistered Consumer</p>
              )}
              {invoice.customer_pan && <p><strong>PAN:</strong> {invoice.customer_pan}</p>}
              <p>
                <strong>State:</strong> {invoice.customer_state_name || 'Not Specified'} ({invoice.customer_state_code || '—'})
              </p>
            </div>
          </div>

          <div className="space-y-1 bg-slate-50 p-3 rounded border border-slate-200 text-[11px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Statutory Supply Coordinates:
            </p>
            <p>
              <strong>Place of Supply:</strong>{' '}
              <strong className="text-slate-900">{placeOfSupplyFormatted}</strong>
            </p>
            <p>
              <strong>Tax Nature:</strong>{' '}
              {isTaxInvoice ? (
                isIntraState ? (
                  <span className="text-emerald-800 font-semibold">Intra-State (CGST 9% + SGST 9%)</span>
                ) : isInterState ? (
                  <span className="text-blue-800 font-semibold">Inter-State (IGST 18%)</span>
                ) : (
                  <span className="text-amber-800 font-semibold">Tax Pending Determination</span>
                )
              ) : (
                <span className="text-slate-700 font-semibold">Exempt / Non-GST Supply</span>
              )}
            </p>
            {invoice.delivery_location && (
              <p>
                <strong>Site / Delivery Location:</strong> {invoice.delivery_location}
              </p>
            )}
            {invoice.client_po_reference && (
              <p>
                <strong>Client PO Ref:</strong> {invoice.client_po_reference}
              </p>
            )}
            {invoice.financial_year && (
              <p>
                <strong>Financial Year:</strong> FY {invoice.financial_year}
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table (BUG-034: Explicit GST Rate & Tax Amount columns) */}
        <div className="my-3 overflow-hidden border border-slate-300 rounded">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
              <tr>
                <th className="py-2 px-2.5 border-r border-slate-200 w-8 text-center">#</th>
                <th className="py-2 px-3 border-r border-slate-200">Description of Goods / Services</th>
                <th className="py-2 px-2.5 border-r border-slate-200 w-16 text-center">HSN/SAC</th>
                <th className="py-2 px-2.5 border-r border-slate-200 w-14 text-right">Qty</th>
                <th className="py-2 px-2.5 border-r border-slate-200 w-20 text-right">Rate (₹)</th>
                <th className="py-2 px-2.5 border-r border-slate-200 w-22 text-right">Taxable (₹)</th>
                {isTaxInvoice && (
                  <>
                    <th className="py-2 px-2 border-r border-slate-200 w-14 text-center">GST %</th>
                    <th className="py-2 px-2.5 border-r border-slate-200 w-20 text-right">Tax (₹)</th>
                  </>
                )}
                <th className="py-2 px-3 w-24 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lineItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/50 print:hover:bg-white">
                  <td className="py-2 px-2.5 border-r border-slate-200 text-center text-slate-500 font-mono">{idx + 1}</td>
                  <td className="py-2 px-3 border-r border-slate-200">
                    <div className="font-semibold text-slate-900">{item.item_name}</div>
                    {item.description && (
                      <div className="text-[10px] text-slate-600 whitespace-pre-wrap leading-tight">{item.description}</div>
                    )}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono text-[10px]">
                    {item.hsn_sac_code || '—'}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono font-medium text-slate-900">
                    {Number(item.quantity).toFixed(2)} {item.unit}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono text-slate-900">
                    {formatIndianRupee(item.unit_rate, 2).replace('₹', '')}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono font-medium text-slate-900">
                    {formatIndianRupee(item.taxable_amount, 2).replace('₹', '')}
                  </td>
                  {isTaxInvoice && (
                    <>
                      <td className="py-2 px-2 border-r border-slate-200 text-center font-mono text-slate-700">
                        {item.gst_rate}%
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200 text-right font-mono text-slate-900">
                        {formatIndianRupee(item.tax_amount, 2).replace('₹', '')}
                      </td>
                    </>
                  )}
                  <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                    {formatIndianRupee(item.line_total, 2).replace('₹', '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation & Bank Instructions Grid */}
        <div className="grid grid-cols-2 gap-4 pt-1.5 border-b border-slate-200 pb-3 print:break-inside-avoid">
          <div className="space-y-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Amount in Words (Statutory INR):
              </p>
              <p className="font-semibold text-slate-900 text-[11px] italic mt-0.5 bg-slate-50 p-2.5 rounded border border-slate-200">
                {convertNumberToIndianWords(Number(invoice.grand_total_amount))}
              </p>
            </div>

            {/* Bank Payment Instructions */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] space-y-1">
              <p className="font-bold text-slate-800 uppercase text-[9px] tracking-wider">
                Bank Remittance Coordinates:
              </p>
              <pre className="font-sans text-[10px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                {safePaymentInstructions}
              </pre>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-700">
              <span>Gross Taxable Value:</span>
              <span className="font-mono text-slate-900 font-medium">
                {formatIndianRupee(invoice.taxable_amount)}
              </span>
            </div>

            {isTaxInvoice && invoice.is_intra_state && (
              <>
                <div className="flex justify-between text-slate-700 py-0.5">
                  <span>Central GST (CGST 9%):</span>
                  <span className="font-mono text-slate-900">
                    {formatIndianRupee(invoice.cgst_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700 py-0.5">
                  <span>State GST (SGST 9%):</span>
                  <span className="font-mono text-slate-900">
                    {formatIndianRupee(invoice.sgst_amount)}
                  </span>
                </div>
              </>
            )}

            {isTaxInvoice && !invoice.is_intra_state && (
              <div className="flex justify-between text-slate-700 py-0.5">
                <span>Integrated GST (IGST 18%):</span>
                <span className="font-mono text-slate-900">
                  {formatIndianRupee(invoice.igst_amount)}
                </span>
              </div>
            )}

            {isTaxInvoice && (
              <div className="flex justify-between text-slate-900 font-semibold py-0.5 border-t border-slate-200">
                <span>Total Statutory GST:</span>
                <span className="font-mono">
                  {formatIndianRupee(invoice.total_tax_amount)}
                </span>
              </div>
            )}

            {Number(invoice.round_off_amount) !== 0 && (
              <div className="flex justify-between text-slate-600 text-[10px]">
                <span>Round-off:</span>
                <span className="font-mono">
                  {Number(invoice.round_off_amount) > 0 ? '+' : ''}
                  {formatIndianRupee(invoice.round_off_amount)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm font-bold text-[#10243B] pt-1.5 border-t-2 border-[#10243B]">
              <span>INVOICE TOTAL (INR):</span>
              <span className="text-base font-mono">
                {formatIndianRupee(invoice.grand_total_amount)}
              </span>
            </div>

            {Number(invoice.paid_amount) > 0 && (
              <>
                <div className="flex justify-between text-emerald-800 font-semibold pt-0.5">
                  <span>Amount Received:</span>
                  <span className="font-mono">
                    - {formatIndianRupee(invoice.paid_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-amber-900 font-bold border-t border-slate-200 pt-1">
                  <span>Balance Due:</span>
                  <span className="font-mono">
                    {formatIndianRupee(invoice.balance_amount)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Statutory Terms & Conditions (BUG-038) */}
        <div className="pt-2 pb-3 border-b border-slate-200 text-[10px] text-slate-700 space-y-1 print:break-inside-avoid">
          <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
            Statutory Terms & Conditions:
          </p>
          <div className="leading-relaxed whitespace-pre-line text-slate-700 bg-slate-50/70 p-2.5 rounded border border-slate-200">
            {termsText}
          </div>
          <p className="italic text-slate-500 text-[9px] leading-tight pt-0.5">
            Certified that the particulars given above are true and correct and the amount indicated represents the price actually charged and there is no additional consideration flowing directly or indirectly from the buyer.
          </p>
        </div>

        {/* Dual Signatory Block (BUG-037) */}
        <div className="grid grid-cols-2 gap-8 pt-4 text-[11px] print:break-inside-avoid">
          <div className="border border-slate-200 rounded p-3 bg-slate-50/50">
            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
              Customer Acknowledgment:
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Goods/Services received in good condition. Certified for statutory payment.
            </p>
            <div className="h-10 print:h-8"></div>
            <div className="border-t border-dashed border-slate-300 pt-1 flex justify-between text-[10px] text-slate-600">
              <span>Customer Signature & Seal</span>
              <span>Date: ____/____/2026</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded p-3 bg-slate-50/50 text-right">
            <p className="font-bold text-slate-900 uppercase">
              For {invoice.company_legal_name || 'Santhaya Associates Pvt. Ltd.'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Statutory GST Compliance & Accounts Department
            </p>
            <div className="h-10 print:h-8"></div>
            <div className="border-t border-dashed border-slate-300 pt-1 flex justify-between text-[10px] text-slate-600">
              <span>Date: {formatIndianDate(invoice.invoice_date)}</span>
              <span>Authorized Signatory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
