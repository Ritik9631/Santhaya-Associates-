import { notFound, redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PrintButton from '@/components/PrintButton';
import { convertNumberToIndianWords } from '@/lib/quotation/calculations';
import { formatIndianDate } from '@/lib/utils/date';
import { formatIndianRupee } from '@/lib/utils/currency';

interface PageProps {
  params: {
    id: string;
  };
}

export const dynamic = 'force-dynamic';

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

  if (quoteErr || !quote) {
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

  // Supplier state is Bihar (10)
  const isIntraState = quote.place_of_supply_state_code === '10';

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:py-0 print:px-0 text-slate-900">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
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

      {/* Official Quotation Document Container (A4 Printable) */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-md p-6 sm:p-8 md:p-10 print:border-none print:shadow-none print:p-0 print:max-w-none text-xs leading-normal">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b-2 border-[#10243B] gap-4">
          <div className="space-y-1 max-w-[62%]">
            <div className="flex items-center gap-2 mb-2">
              <Image
                src="/santhaya-logo-header.png"
                alt="Santhaya Associates Pvt. Ltd."
                width={200}
                height={65}
                className="h-14 sm:h-16 w-auto object-contain print:h-12"
                priority
              />
            </div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Santhaya Associates Pvt. Ltd.
            </h2>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India
            </p>
            <div className="text-[11px] text-slate-700 font-mono space-x-3 pt-0.5">
              <span><strong>GSTIN:</strong> 10ABVCS4277J1ZU</span>
              <span><strong>State:</strong> Bihar (10)</span>
            </div>
            <p className="text-[10px] text-slate-500 pt-0.5">
              Govt. & Private Construction Tenders | Machinery Supply & Rentals | Civil Infrastructure
            </p>
          </div>

          <div className="sm:text-right shrink-0">
            <span className="inline-block bg-[#10243B] text-[#F4B323] text-xs font-bold tracking-wider uppercase px-3 py-1 rounded shadow-sm">
              COMMERCIAL QUOTATION
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-2 font-mono">
              {quote.quotation_number}
            </h1>
            <p className="text-xs font-semibold text-slate-600">
              Revision: {activeVersion.version_code}
            </p>
            <div className="text-xs text-slate-600 mt-2 space-y-0.5">
              <p>
                <span className="text-slate-500">Date:</span>{' '}
                {formatIndianDate(activeVersion.created_at)}
              </p>
              <p>
                <span className="text-slate-500">Validity:</span>{' '}
                {activeVersion.validity_days} Days ({formatIndianDate(activeVersion.expires_at)})
              </p>
              <p>
                <span className="text-slate-500">Place of Supply:</span> State Code {quote.place_of_supply_state_code || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Client & Coordinates Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 border-b border-slate-200">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
              PROSPECTIVE CLIENT / RECEIVER:
            </span>
            <p className="text-sm font-bold text-slate-900">{customer.company_name}</p>
            <p className="text-xs font-medium text-slate-700">Attn: {customer.primary_contact_person}</p>
            {customer.billing_address && (
              <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
                {customer.billing_address}
              </p>
            )}
            <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
              {customer.gstin && <p><strong>GSTIN:</strong> {customer.gstin}</p>}
              {customer.pan && <p><strong>PAN:</strong> {customer.pan}</p>}
              {customer.phone && <p><strong>Phone:</strong> {customer.phone}</p>}
              {customer.email && <p><strong>Email:</strong> {customer.email}</p>}
            </div>
          </div>

          <div className="space-y-1 bg-slate-50/70 p-3 rounded border border-slate-200 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
              ENGAGEMENT COORDINATES:
            </span>
            <p>
              <span className="font-semibold text-slate-700">Delivery / Worksite:</span>{' '}
              {activeVersion.delivery_location || 'Designated worksite location'}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Payment Terms:</span>{' '}
              {activeVersion.payment_terms || 'As per contractual milestones'}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Tax Basis:</span>{' '}
              {quote.is_gst_applicable ? (
                isIntraState ? 'Intra-State Supply (CGST + SGST)' : 'Inter-State Supply (IGST)'
              ) : (
                'Non-GST Supply'
              )}
            </p>
          </div>
        </div>

        {/* Quotation Line Items Table */}
        <div className="my-3 overflow-hidden border border-slate-200 rounded">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="bg-slate-100/80 font-bold text-slate-800 border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 text-center w-8">#</th>
                <th className="py-2 px-3">Item Description</th>
                <th className="py-2 px-3 text-center w-16">HSN/SAC</th>
                <th className="py-2 px-3 text-center w-14">Qty</th>
                <th className="py-2 px-3 text-center w-14">Unit</th>
                <th className="py-2 px-3 text-right w-20">Unit Rate (₹)</th>
                <th className="py-2 px-3 text-right w-22">Taxable (₹)</th>
                {quote.is_gst_applicable && (
                  <th className="py-2 px-3 text-right w-18">GST</th>
                )}
                <th className="py-2 px-3 text-right w-24">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lineItems.map((item: any, idx: number) => (
                <tr key={item.id} className="hover:bg-slate-50/50 print:hover:bg-white">
                  <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <p className="font-semibold text-slate-900">{item.item_name}</p>
                    {item.description && (
                      <p className="text-[10px] text-slate-500 mt-0.5 whitespace-pre-line">{item.description}</p>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-600 font-mono text-[10px]">
                    {item.hsn_sac_code || '—'}
                  </td>
                  <td className="py-2 px-3 text-center font-mono">
                    {Number(item.quantity).toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-600 uppercase text-[10px]">
                    {item.unit}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">
                    {formatIndianRupee(item.unit_rate, 2).replace('₹', '')}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-medium">
                    {formatIndianRupee(item.taxable_amount, 2).replace('₹', '')}
                  </td>
                  {quote.is_gst_applicable && (
                    <td className="py-2 px-3 text-right text-slate-700 font-mono text-[10px]">
                      <div>{formatIndianRupee(item.tax_amount, 2).replace('₹', '')}</div>
                      <span className="text-[9px] text-slate-400">({item.gst_rate}%)</span>
                    </td>
                  )}
                  <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                    {formatIndianRupee(item.line_total, 2).replace('₹', '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Amount in Words */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 pb-3 border-b border-slate-200 print:break-inside-avoid">
          <div className="flex flex-col justify-between space-y-2">
            <div>
              <p className="text-[10px] font-bold text-[#10243B] uppercase tracking-wider">
                AMOUNT IN WORDS (STATUTORY INR):
              </p>
              <p className="text-xs font-semibold text-slate-800 mt-0.5 italic bg-slate-50 p-2.5 rounded border border-slate-200">
                {convertNumberToIndianWords(activeVersion.grand_total_amount)}
              </p>
            </div>

            <div className="text-[10px] text-slate-500 leading-relaxed space-y-0.5">
              <p>* Rates quoted above are inclusive of standard handling and loading.</p>
              <p>* Transport & transit insurance as per agreed delivery terms.</p>
              <p>* Statutory GST charged as per applicable Indian Tax slabs.</p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Gross Subtotal:</span>
              <span className="font-mono text-slate-900">
                {formatIndianRupee(activeVersion.subtotal_amount)}
              </span>
            </div>

            {Number(activeVersion.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Total Discount Applied:</span>
                <span className="font-mono">
                  - {formatIndianRupee(activeVersion.discount_amount)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-slate-700 pt-1 border-t border-slate-200">
              <span className="font-semibold">Taxable Amount:</span>
              <span className="font-semibold text-slate-900 font-mono">
                {formatIndianRupee(activeVersion.taxable_amount)}
              </span>
            </div>

            {quote.is_gst_applicable && (
              <>
                {isIntraState ? (
                  <>
                    <div className="flex justify-between text-slate-600 py-0.5">
                      <span>Central GST (CGST):</span>
                      <span className="font-mono text-slate-900">
                        {formatIndianRupee(activeVersion.cgst_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 py-0.5">
                      <span>State GST (SGST):</span>
                      <span className="font-mono text-slate-900">
                        {formatIndianRupee(activeVersion.sgst_amount)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-600 py-0.5">
                    <span>Integrated GST (IGST):</span>
                    <span className="font-mono text-slate-900">
                      {formatIndianRupee(activeVersion.igst_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-700 font-medium py-0.5 border-t border-slate-200">
                  <span>Total Tax Amount:</span>
                  <span className="font-mono text-slate-900">
                    {formatIndianRupee(activeVersion.total_tax_amount)}
                  </span>
                </div>
              </>
            )}

            {Number(activeVersion.round_off_amount) !== 0 && (
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>Round-off:</span>
                <span className="font-mono">
                  {Number(activeVersion.round_off_amount) > 0 ? '+' : ''}
                  {formatIndianRupee(activeVersion.round_off_amount)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm font-bold text-[#10243B] pt-1.5 border-t-2 border-[#10243B]">
              <span>GRAND TOTAL (INR):</span>
              <span className="text-base text-[#10243B] font-mono">
                {formatIndianRupee(activeVersion.grand_total_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Commercial Terms & Conditions */}
        <div className="pt-2 pb-3 border-b border-slate-200 text-[10px] text-slate-600 space-y-1 print:break-inside-avoid">
          <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
            Terms & Conditions:
          </p>
          <p className="leading-relaxed whitespace-pre-line">
            {activeVersion.terms_conditions ||
              '1. Quotation validity strictly as specified above.\n2. Payment terms as agreed per milestone.\n3. All disputes subject to Motihari, Bihar jurisdiction.'}
          </p>
        </div>

        {/* Authorization & Signatory */}
        <div className="grid grid-cols-2 gap-8 pt-4 text-[11px] print:break-inside-avoid">
          <div>
            <p className="text-[10px] text-slate-400">Client Acceptance Acknowledgment:</p>
            <div className="h-10 print:h-8"></div>
            <div className="border-t border-dashed border-slate-300 pt-1 text-[10px] text-slate-500">
              Authorized Signature & Company Seal
            </div>
          </div>

          <div className="text-right">
            <p className="font-bold text-slate-900 uppercase">
              For Santhaya Associates Pvt. Ltd.
            </p>
            <div className="h-10 print:h-8"></div>
            <div className="border-t border-dashed border-slate-300 pt-1 text-[10px] text-slate-500">
              Authorized Estimator / Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
