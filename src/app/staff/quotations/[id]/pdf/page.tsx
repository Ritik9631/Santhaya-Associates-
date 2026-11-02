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
import {
  convertNumberToIndianWords,
  formatIndianRupee,
  formatSmartRupee,
} from '@/lib/utils/currency';
import { formatIndianDate } from '@/lib/utils/date';
import { getDefaultQuotationTerms, getSimplifiedQuotationTerms } from '@/lib/billing/default-terms';
import { formatQuantity } from '@/lib/quotation/numbering';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quotation Print View | Santhaya Associates',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function QuotationPdfPage({ params }: PageProps) {
  try {
    await requireStaffSession();
  } catch {
    redirect(`/staff/login?redirectTo=/staff/quotations/${params.id}/pdf`);
  }

  const adminClient = createAdminClient();

  // Load quotation with versions, items, customer
  const { data: quote, error: quoteErr } = await adminClient
    .from('quotations')
    .select(`
      *,
      customers (
        company_name,
        primary_contact_person,
        email,
        phone,
        gstin,
        pan,
        billing_address,
        state,
        state_code
      ),
      quotation_versions (
        id,
        version_number,
        version_code,
        validity_days,
        expires_at,
        delivery_location,
        payment_terms,
        terms_conditions,
        subtotal_amount,
        discount_amount,
        taxable_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        total_tax_amount,
        round_off_amount,
        grand_total_amount,
        issued_at,
        created_at
      )
    `)
    .eq('id', params.id)
    .single();

  if (quoteErr || !quote || (quote as any).deleted_at || (quote as any).notes?.includes('[DELETED')) {
    notFound();
  }

  const rawQuote: any = quote;

  // Active version snapshot
  const activeVersion =
    rawQuote.quotation_versions?.find(
      (v: any) => v.version_number === quote.current_version_number
    ) || rawQuote.quotation_versions?.[0];

  if (!activeVersion) {
    notFound();
  }

  // Load line items for this version
  const { data: items } = await adminClient
    .from('quotation_items')
    .select('*')
    .eq('quotation_version_id', activeVersion.id)
    .order('sort_order', { ascending: true });

  const lineItems = items || [];
  const customer = rawQuote.customers || {
    company_name: 'Valued Client',
    primary_contact_person: 'Procurement Department',
    billing_address: 'Direct Client',
    state: 'Not Specified',
    state_code: null,
  };

  // Tax and supply determination
  const supplyState = resolveIndianState(quote.place_of_supply_state_code);
  const taxDetermination = determineTaxStatus(
    quote.is_gst_applicable,
    quote.place_of_supply_state_code,
    '10'
  );
  const isIntraState = taxDetermination === 'intra_state';
  const isInterState = taxDetermination === 'inter_state';
  const isTaxDetermined = taxDetermination !== 'undetermined';
  const placeOfSupplyFormatted = formatPlaceOfSupply(quote.place_of_supply_state_code);

  const defaultTerms = getSimplifiedQuotationTerms(activeVersion.validity_days || 30);
  const rawTermsText = activeVersion.terms_conditions || defaultTerms;
  const termsClauses = rawTermsText
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  // Clean payment terms to prevent contradictory statements on client document
  const rawPaymentTerms = activeVersion.payment_terms || '100% advance against Proforma Invoice prior to dispatch';
  const cleanPaymentTerms = rawPaymentTerms.replace(
    '100% advance against Proforma Invoice or 30 days credit on approved LC',
    '100% advance against Proforma Invoice prior to dispatch'
  );

  // Authorization status for corporate seal application:
  // Stamp is only rendered on finalized/authorized quotations ('issued', 'accepted', 'converted_to_invoice' or having active issued_at)
  // Draft quotations ('draft') remain strictly unstamped per statutory corporate governance rules.
  const isAuthorized =
    ['issued', 'accepted', 'converted_to_invoice'].includes(quote.status) ||
    Boolean(activeVersion.issued_at);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:py-0 print:px-0 text-slate-900 font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 portrait;
          margin: 8mm 10mm;
          @bottom-right {
            content: "Page " counter(page) " of " counter(pages);
            font-size: 8pt;
            font-family: inherit;
            color: #64748b;
          }
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
          .quotation-grid-table,
          .quotation-grid-table th,
          .quotation-grid-table td {
            border-color: #475569 !important;
          }
          .stamp-authorization-box {
            width: 320px !important;
            max-width: 320px !important;
            margin-left: auto !important;
            margin-right: 0 !important;
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

      {/* Top Action Toolbar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/staff/quotations/${quote.id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg px-3.5 py-2 shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quotation View
        </Link>

        <PrintButton className="inline-flex items-center gap-2 px-4 py-2 bg-[#10243B] text-white rounded-lg text-xs font-semibold hover:bg-slate-800 shadow transition focus:ring-2 focus:ring-gold-500" />
      </div>

      {/* Draft Status Notice Banner (Hidden in Print) */}
      {!isAuthorized && (
        <div className="max-w-4xl mx-auto mb-4 bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-amber-900 print:hidden shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="font-bold uppercase tracking-wider bg-amber-200 text-amber-950 px-2 py-0.5 rounded text-[10px]">
              DRAFT STATUS
            </span>
            <span>
              This quotation is currently an unissued draft. The official company round seal and authorized signatory are affixed upon formal issuance.
            </span>
          </div>
          <Link
            href={`/staff/quotations/${quote.id}`}
            className="shrink-0 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition"
          >
            Review & Issue
          </Link>
        </div>
      )}

      {/* Official Quotation Document Container (A4 Printable) */}
      <div className="print-container max-w-4xl mx-auto bg-white border border-slate-200 shadow-md p-6 sm:p-7 print:border-none print:shadow-none print:p-0 print:max-w-none text-slate-900 leading-normal">
        {/* Header Block (Authentic Logo, Company Hierarchy, QUOTATION Badge, FY Number) */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-1.5 print:pb-1 border-b-2 border-[#10243B] gap-2.5">
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
                Santhaya Associates Pvt. Ltd.
              </h2>
              <p className="text-[9pt] text-slate-700 leading-snug">
                Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India
              </p>
              <div className="text-[9pt] text-slate-800 font-mono space-x-3 pt-0.5">
                <span><strong className="font-sans">GSTIN:</strong> 10ABVCS4277J1ZU</span>
                <span><strong className="font-sans">PAN:</strong> ABVCS4277J</span>
              </div>
              <p className="text-[8.5pt] text-slate-600 font-medium pt-0.5">
                Govt. & Private Civil Infrastructure | Heavy Machinery Supply & Rentals | Turnkey EPC
              </p>
            </div>
          </div>

          <div className="sm:text-right shrink-0">
            <span className="inline-block bg-[#10243B] text-[#F4B323] text-[8.5pt] font-extrabold tracking-widest uppercase px-2.5 py-0.5 rounded shadow-sm">
              QUOTATION
            </span>
            <h1 className="text-xl sm:text-[22pt] font-black text-slate-900 mt-0.5 font-mono tracking-tight">
              {quote.quotation_number}
            </h1>
            <div className="text-[8.5pt] text-slate-700 mt-0.5 space-y-0.5">
              <p>
                <span className="text-slate-500 font-medium">Date:</span>{' '}
                <strong className="text-slate-900">{formatIndianDate(activeVersion.created_at)}</strong>
              </p>
              <p>
                <span className="text-slate-500 font-medium">Valid Up To:</span>{' '}
                <strong className="text-slate-900">{formatIndianDate(activeVersion.expires_at)}</strong>
              </p>
              <p>
                <span className="text-slate-500 font-medium">Place of Supply:</span>{' '}
                <strong className="text-slate-900">{placeOfSupplyFormatted}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Customer & Project Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-1.5 border-b border-slate-200">
          <div>
            <span className="text-[9pt] uppercase font-bold text-[#10243B] tracking-wider block mb-0.5">
              QUOTATION FOR:
            </span>
            <p className="text-[11pt] font-bold text-slate-900 break-words leading-tight">{customer.company_name}</p>
            {customer.primary_contact_person ? (
              <p className="text-[9.5pt] font-medium text-slate-800 mt-0.5">
                <span className="text-slate-500 font-normal">Contact Person:</span> {customer.primary_contact_person}
              </p>
            ) : null}
            {customer.billing_address && (
              <p className="text-[9pt] text-slate-700 mt-0.5 whitespace-pre-line leading-tight break-words">
                {customer.billing_address}
              </p>
            )}
            <div className="text-[9pt] text-slate-800 mt-0.5 space-y-0.5 font-mono">
              {(customer.gstin || customer.pan) && (
                <p>
                  {customer.gstin && <span><strong className="font-sans">GSTIN:</strong> {customer.gstin}</span>}
                  {customer.gstin && customer.pan && <span className="mx-2 text-slate-400">|</span>}
                  {customer.pan && <span><strong className="font-sans">PAN:</strong> {customer.pan}</span>}
                </p>
              )}
              {(customer.phone || customer.email) && (
                <p className="font-sans">
                  {customer.phone && <span><strong>Phone:</strong> {customer.phone}</span>}
                  {customer.phone && customer.email && <span className="mx-2 text-slate-400">|</span>}
                  {customer.email && <span><strong>Email:</strong> {customer.email}</span>}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-0.5 bg-slate-50/70 p-2 rounded-lg border border-slate-200 text-[9pt]">
            <span className="text-[9pt] uppercase font-bold text-[#10243B] tracking-wider block mb-0.5">
              PROJECT DETAILS:
            </span>
            <p className="leading-tight">
              <span className="font-semibold text-slate-700">Delivery / Worksite:</span>{' '}
              <span className="text-slate-900 font-medium break-words">{activeVersion.delivery_location || 'Designated worksite location'}</span>
            </p>
            <p className="leading-tight">
              <span className="font-semibold text-slate-700">Payment Terms:</span>{' '}
              <span className="text-slate-900 font-medium break-words">{cleanPaymentTerms}</span>
            </p>
            <p className="leading-tight">
              <span className="font-semibold text-slate-700">Statutory Tax Basis:</span>{' '}
              {quote.is_gst_applicable ? (
                isTaxDetermined ? (
                  <strong className={isIntraState ? 'text-emerald-800' : 'text-blue-800'}>
                    {isIntraState ? 'Intra-State Supply (CGST 9% + SGST 9%)' : 'Inter-State Supply (IGST 18%)'}
                  </strong>
                ) : (
                  <strong className="text-amber-800">Tax Pending (Place of Supply Undetermined)</strong>
                )
              ) : (
                <strong className="text-slate-700">Exempt / Non-GST Supply</strong>
              )}
            </p>
          </div>
        </div>

        {/* Itemized Table (Crisp Borders, Visible Column Gridlines, Readable 9.5-10pt Body) */}
        <div className="my-2.5 print:my-1 border-2 border-slate-700 print:border-slate-800 rounded-lg overflow-hidden w-full">
          <table className="quotation-grid-table w-full text-left border-collapse table-fixed">
            <thead className="bg-[#10243B] text-white font-bold border-b-2 border-slate-900">
              <tr>
                <th className="py-1.5 print:py-1 px-1 text-center w-[4%] border-r border-slate-500 text-[8.5pt] uppercase tracking-wider">#</th>
                <th className={`py-1.5 print:py-1 px-2 border-r border-slate-500 ${quote.is_gst_applicable ? 'w-[27%]' : 'w-[37%]'} text-[8.5pt] uppercase tracking-wider`}>
                  Item Description
                </th>
                <th className={`py-1.5 print:py-1 px-1 text-center border-r border-slate-500 ${quote.is_gst_applicable ? 'w-[8%]' : 'w-[9%]'} text-[8.5pt] uppercase tracking-wider`}>
                  HSN/SAC
                </th>
                <th className={`py-1.5 print:py-1 px-1 text-right border-r border-slate-500 ${quote.is_gst_applicable ? 'w-[5%]' : 'w-[6%]'} text-[8.5pt] uppercase tracking-wider`}>
                  Qty
                </th>
                <th className={`py-1.5 print:py-1 px-1 text-center border-r border-slate-500 ${quote.is_gst_applicable ? 'w-[5%]' : 'w-[6%]'} text-[8.5pt] uppercase tracking-wider`}>
                  Unit
                </th>
                <th className={`py-1.5 print:py-1 px-1.5 text-right border-r border-slate-500 ${quote.is_gst_applicable ? 'w-[10%]' : 'w-[15%]'} text-[8.5pt] uppercase tracking-wider`}>
                  Rate (₹)
                </th>
                {quote.is_gst_applicable && (
                  <th className="py-1.5 print:py-1 px-1.5 text-right border-r border-slate-500 w-[10%] text-[8.5pt] uppercase tracking-wider">
                    Taxable (₹)
                  </th>
                )}
                {quote.is_gst_applicable && (
                  <>
                    <th className="py-1.5 print:py-1 px-1 text-center border-r border-slate-500 w-[5%] text-[8.5pt] uppercase tracking-wider">
                      GST %
                    </th>
                    <th className="py-1.5 print:py-1 px-1.5 text-right border-r border-slate-500 w-[9%] text-[8.5pt] uppercase tracking-wider">
                      Tax (₹)
                    </th>
                  </>
                )}
                <th className={`py-1.5 print:py-1 px-1.5 text-right ${quote.is_gst_applicable ? 'w-[17%]' : 'w-[17%]'} text-[8.5pt] uppercase tracking-wider`}>
                  Total (₹)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-400 print:divide-slate-500">
              {lineItems.map((item: any, idx: number) => {
                const grossAmount = Number(item.quantity) * Number(item.unit_rate);
                const discountAmt = Number(item.discount_amount) || 0;
                const hasDiscount = discountAmt > 0;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 print:hover:bg-white border-b border-slate-400 print:border-slate-500">
                    <td className="py-1.5 print:py-1 px-1 text-center text-slate-500 border-r border-slate-400 print:border-slate-500 font-mono text-[8.5pt] align-top">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 print:py-1 px-2 border-r border-slate-400 print:border-slate-500 align-top break-words">
                      <p className="text-[9.5pt] font-bold text-slate-900 leading-snug">{item.item_name}</p>
                      {item.description && (
                        <p className="text-[8.5pt] text-slate-600 mt-0.5 whitespace-pre-line leading-tight">
                          {item.description}
                        </p>
                      )}
                      {hasDiscount && (
                        <p className="text-[8.5pt] text-emerald-800 font-medium mt-0.5 leading-tight">
                          Gross: ₹{formatSmartRupee(grossAmount, false)} • Less Disc: -₹{formatSmartRupee(discountAmt, false)}
                        </p>
                      )}
                    </td>
                    <td className="py-1.5 print:py-1 px-1 text-center text-slate-700 font-mono text-[8.5pt] border-r border-slate-400 print:border-slate-500 align-top">
                      {item.hsn_sac_code || '—'}
                    </td>
                    <td className="py-1.5 print:py-1 px-1 text-right font-mono font-semibold text-slate-900 border-r border-slate-400 print:border-slate-500 align-top text-[9pt]">
                      {formatQuantity(item.quantity)}
                    </td>
                    <td className="py-1.5 print:py-1 px-1 text-center text-slate-700 uppercase text-[8.5pt] border-r border-slate-400 print:border-slate-500 align-top">
                      {item.unit}
                    </td>
                    <td className="py-1.5 print:py-1 px-1.5 text-right font-mono text-slate-900 border-r border-slate-400 print:border-slate-500 align-top whitespace-nowrap text-[9pt]">
                      {formatSmartRupee(item.unit_rate, false)}
                    </td>
                    {quote.is_gst_applicable && (
                      <td className="py-1.5 print:py-1 px-1.5 text-right font-mono font-semibold text-slate-900 border-r border-slate-400 print:border-slate-500 align-top whitespace-nowrap text-[9pt]">
                        <div>{formatSmartRupee(item.taxable_amount, false)}</div>
                        {hasDiscount && (
                          <div className="text-[8pt] text-emerald-700 font-sans font-medium leading-none mt-0.5">
                            (-₹{formatSmartRupee(discountAmt, false)})
                          </div>
                        )}
                      </td>
                    )}
                    {quote.is_gst_applicable && (
                      <>
                        <td className="py-1.5 print:py-1 px-1 text-center font-mono text-slate-700 border-r border-slate-400 print:border-slate-500 align-top text-[8.5pt]">
                          {item.gst_rate}%
                        </td>
                        <td className="py-1.5 print:py-1 px-1.5 text-right font-mono border-r border-slate-400 print:border-slate-500 align-top whitespace-nowrap text-[9pt]">
                          {isTaxDetermined ? (
                            <span className="text-slate-900">{formatSmartRupee(item.tax_amount, false)}</span>
                          ) : (
                            <span className="text-amber-800 text-[8pt] italic font-sans font-medium">Pending</span>
                          )}
                        </td>
                      </>
                    )}
                    <td className="py-1.5 print:py-1 px-1.5 text-right font-black text-slate-950 font-mono align-top whitespace-nowrap text-[9.5pt]">
                      {isTaxDetermined || !quote.is_gst_applicable
                        ? formatSmartRupee(item.line_total, false)
                        : formatSmartRupee(item.taxable_amount, false)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Financial Summary, Amount in Words & Commercial Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1.5 pb-1.5 border-b border-slate-200 print-avoid-break">
          <div className="flex flex-col justify-between space-y-1.5">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="text-[8.5pt] font-bold text-[#10243B] uppercase tracking-wider block">
                {isTaxDetermined || !quote.is_gst_applicable
                  ? 'AMOUNT IN WORDS (STATUTORY INR):'
                  : 'AMOUNT IN WORDS (SUBTOTAL BEFORE GST):'}
              </span>
              <p className="text-[9.5pt] font-semibold text-slate-900 mt-0.5 leading-snug">
                {isTaxDetermined || !quote.is_gst_applicable
                  ? convertNumberToIndianWords(activeVersion.grand_total_amount)
                  : `${convertNumberToIndianWords(activeVersion.taxable_amount)} (Exclusive of GST)`}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-[8.5pt] font-bold text-[#10243B] uppercase tracking-wider block">
                COMMERCIAL NOTES:
              </span>
              <div className="text-[8.5pt] text-slate-700 leading-tight space-y-0.5 pl-0.5">
                <div className="flex items-start gap-1.5">
                  <span className="text-[#FDAE04] font-black text-sm shrink-0 leading-none mt-0.5 select-none">•</span>
                  <span className="flex-1">Commercial pricing is firm for the quotation validity period stated above.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-[#FDAE04] font-black text-sm shrink-0 leading-none mt-0.5 select-none">•</span>
                  <span className="flex-1">Equipment deployment, mobilization, fuel and site logistics per agreed scope.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-[#FDAE04] font-black text-sm shrink-0 leading-none mt-0.5 select-none">•</span>
                  <span className="flex-1">Statutory GST invoiced per Indian Goods and Services Tax legislation.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary: STRICT TWO DECIMAL PLACES ENFORCEMENT */}
          <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-200 text-[9pt] space-y-0.5">
            <div className="flex justify-between text-slate-700">
              <span>Gross Subtotal:</span>
              <span className="font-mono text-slate-900 font-medium">
                {formatIndianRupee(activeVersion.subtotal_amount, 2)}
              </span>
            </div>

            {Number(activeVersion.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-800">
                <span>Total Discount Applied:</span>
                <span className="font-mono font-medium">
                  - {formatIndianRupee(activeVersion.discount_amount, 2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-slate-900 pt-0.5 border-t border-slate-200 font-semibold">
              <span>Taxable Amount:</span>
              <span className="font-mono">
                {formatIndianRupee(activeVersion.taxable_amount, 2)}
              </span>
            </div>

            {quote.is_gst_applicable && (
              <>
                {isTaxDetermined ? (
                  isIntraState ? (
                    <>
                      <div className="flex justify-between text-slate-700 py-0.5">
                        <span>Central GST (CGST):</span>
                        <span className="font-mono text-slate-900">
                          {formatIndianRupee(activeVersion.cgst_amount, 2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-700 py-0.5">
                        <span>State GST (SGST):</span>
                        <span className="font-mono text-slate-900">
                          {formatIndianRupee(activeVersion.sgst_amount, 2)}
                        </span>
                      </div>
                    </>
                  ) : isInterState ? (
                    <div className="flex justify-between text-slate-700 py-0.5">
                      <span>Integrated GST (IGST):</span>
                      <span className="font-mono text-slate-900">
                        {formatIndianRupee(activeVersion.igst_amount, 2)}
                      </span>
                    </div>
                  ) : null
                ) : (
                  <div className="flex justify-between items-center text-amber-800 py-0.5 font-medium">
                    <span>Applicable GST:</span>
                    <span className="font-mono font-bold bg-amber-100 text-amber-900 text-[8pt] px-2 py-0.5 rounded border border-amber-300">
                      Pending Determination
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-slate-900 font-semibold py-0.5 border-t border-slate-200">
                  <span>Total Tax Amount:</span>
                  <span className="font-mono">
                    {isTaxDetermined ? (
                      formatIndianRupee(activeVersion.total_tax_amount, 2)
                    ) : (
                      <span className="text-amber-800 font-bold">Pending</span>
                    )}
                  </span>
                </div>
              </>
            )}

            {isTaxDetermined && Number(activeVersion.round_off_amount) !== 0 && (
              <div className="flex justify-between text-slate-600 text-[8.5pt]">
                <span>Round-off:</span>
                <span className="font-mono">
                  {Number(activeVersion.round_off_amount) > 0 ? '+' : ''}
                  {formatIndianRupee(activeVersion.round_off_amount, 2)}
                </span>
              </div>
            )}

            {/* Grand Total Box vs Subtotal Before GST Box */}
            {isTaxDetermined || !quote.is_gst_applicable ? (
              <div className="flex justify-between items-center text-xs font-bold text-[#10243B] pt-1 mt-0.5 border-t-2 border-[#10243B] bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs">
                <span className="tracking-wide text-[9pt]">GRAND TOTAL (INR):</span>
                <span className="text-[16pt] font-mono font-black text-[#10243B]">
                  {formatIndianRupee(activeVersion.grand_total_amount, 2)}
                </span>
              </div>
            ) : (
              <div className="space-y-0.5 pt-1 mt-0.5 border-t-2 border-amber-600 bg-white p-1.5 rounded-lg border border-amber-300">
                <div className="flex justify-between items-center text-xs font-bold text-[#10243B]">
                  <span className="tracking-wide text-amber-900 text-[8.5pt]">SUBTOTAL BEFORE GST (INR):</span>
                  <span className="text-[12.5pt] font-mono font-black text-[#10243B]">
                    {formatIndianRupee(activeVersion.taxable_amount, 2)}
                  </span>
                </div>
                <p className="text-[7.5pt] text-amber-800 leading-tight">
                  * Notice: Place of Supply is pending confirmation. Applicable statutory GST and final invoice payable amount are subject to determination upon delivery destination confirmation.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Commercial Terms & Conditions (Clear Bold Headings, 2-Column Responsive Grid, Readable Text) */}
        <div className="pt-1.5 pb-1.5 border-b border-slate-200">
          <p className="font-bold text-[#10243B] uppercase tracking-wider text-[9pt] mb-0.5">
            TERMS & CONDITIONS
          </p>
          <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-200 text-[8.5pt] text-slate-800 leading-tight">
            <div className={`grid grid-cols-1 ${termsClauses.length > 4 ? 'sm:grid-cols-2 print:grid-cols-2' : ''} gap-x-4 gap-y-1`}>
              {termsClauses.map((clause: string, idx: number) => {
                // Attempt to parse "1. HEADING: Details"
                const headingMatch = clause.match(/^(\d+)\.\s*([^:]+):\s*(.*)$/);
                if (headingMatch) {
                  return (
                    <div key={idx} className="flex items-start gap-1.5 break-inside-avoid">
                      <span className="font-bold text-[#10243B] shrink-0 w-5 text-right select-none">{headingMatch[1]}.</span>
                      <p className="flex-1 text-slate-800">
                        <strong className="font-bold text-slate-900">{headingMatch[2]}: </strong>
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
                      <span className="font-bold text-[#10243B] shrink-0 w-5 text-right select-none">{simpleMatch[1]}.</span>
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
        </div>

        {/* Company Authorization Block (Genuine Round Stamp, Clean Geometry) */}
        <div className="flex justify-end pt-1.5 text-[9pt] print-avoid-break">
          <div className="stamp-authorization-box w-full sm:w-80 md:w-80 print:w-80 border border-slate-300 rounded-lg p-2 print:p-1.5 bg-white text-right space-y-0.5 ml-auto">
            <p className="font-bold text-slate-900 uppercase text-[8.5pt] tracking-wide">
              For Santhaya Associates Pvt. Ltd.
            </p>

            {/* Official Circular Stamp: Displayed only for officially authorized/issued quotations */}
            <div className={`stamp-align-container py-0.5 flex items-center justify-end w-full ${isAuthorized ? 'min-h-[32mm]' : 'min-h-[20px]'}`}>
              {isAuthorized ? (
                <div className="stamp-image-wrapper relative flex items-center justify-end ml-auto">
                  <Image
                    src="/branding/santhaya-round-stamp.png"
                    alt="Santhaya Associates Official Company Stamp"
                    width={1254}
                    height={1254}
                    className="w-[32mm] h-[32mm] max-w-[120px] max-h-[120px] object-contain select-none pointer-events-none ml-auto"
                    priority
                    unoptimized
                  />
                </div>
              ) : (
                <div className="py-0.5 flex items-center justify-end text-[8.5pt] text-slate-400 italic">
                  (Official seal affixed upon formal issuance)
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 pt-0.5 flex justify-between text-[8.5pt] text-slate-600">
              <span>Date: {formatIndianDate(activeVersion.issued_at || activeVersion.created_at)}</span>
              <span className="font-semibold text-slate-800">Authorized Signatory</span>
            </div>
          </div>
        </div>

        {/* Verified Company Contact Details Footer (High-Contrast NAP, 9pt) */}
        <div className="mt-2 pt-1 border-t-2 border-slate-300 text-center text-[9pt] text-slate-800 leading-snug print-avoid-break">
          <p className="font-semibold text-slate-900">
            Santhaya Associates Pvt. Ltd. <span className="text-slate-400 mx-1">•</span> Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India
          </p>
          <p className="text-slate-700 mt-0.5 font-medium text-[8.5pt]">
            <span><strong>Tel:</strong> +91 9430986713 / +91 9608950748</span>
            <span className="text-slate-400 mx-1.5">|</span>
            <span><strong>Email:</strong> heistofeverything@gmail.com</span>
            <span className="text-slate-400 mx-1.5">|</span>
            <span className="font-mono"><strong>GSTIN:</strong> 10ABVCS4277J1ZU</span>
          </p>
        </div>
      </div>
    </div>
  );
}
