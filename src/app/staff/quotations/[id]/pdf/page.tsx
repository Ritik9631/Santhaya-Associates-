import { notFound, redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import Image from 'next/image';
import Link from 'next/link';
import { Printer, ArrowLeft } from 'lucide-react';
import { convertNumberToIndianWords } from '@/lib/quotation/calculations';

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
    state: 'Delhi',
    state_code: '07',
  };

  const isIntraState = quote.place_of_supply_state_code === '07';

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:py-0 print:px-0">
      {/* Top Action Toolbar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/staff/quotations/${quote.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg px-3.5 py-2 shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quotation View
        </Link>

        <button
          onClick={() => {
            if (typeof window !== 'undefined') window.print();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#10243B] text-white rounded-lg text-sm font-semibold hover:bg-slate-800 shadow transition"
        >
          <Printer className="w-4 h-4" />
          Print / Save as PDF
        </button>
      </div>

      {/* Official Quotation Document Container (A4 Printable) */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-md p-8 md:p-12 print:border-none print:shadow-none print:p-6 print:max-w-none text-slate-900">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-6 border-b-2 border-[#10243B] gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/santhaya-logo-header.png"
                alt="Santhaya Associates Pvt. Ltd."
                width={140}
                height={50}
                className="h-12 w-auto object-contain"
                priority
              />
            </div>
            <p className="text-xs text-slate-600 mt-2 max-w-sm">
              Govt. & Private Construction Tenders | Machinery Supply & Rentals | Heavy Infrastructure Solutions
            </p>
            <div className="text-[11px] text-slate-500 mt-2 space-y-0.5 leading-relaxed">
              <p>Registered Office: Delhi, India</p>
              <p>GSTIN: 07AAAAA0000A1Z5 | PAN: AAAAA0000A</p>
              <p>Contact: +91 96319 82431 | info@santhaya.com</p>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="inline-block bg-[#10243B] text-[#F4B323] text-xs font-bold tracking-wider uppercase px-3 py-1 rounded">
              COMMERCIAL QUOTATION
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-2">
              {quote.quotation_number}
            </h1>
            <p className="text-xs font-semibold text-slate-600">
              Revision: {activeVersion.version_code}
            </p>
            <div className="text-xs text-slate-600 mt-2 space-y-1">
              <p>
                <span className="text-slate-500">Date:</span>{' '}
                {new Date(activeVersion.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <p>
                <span className="text-slate-500">Valid Until:</span>{' '}
                {new Date(activeVersion.expires_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })} ({activeVersion.validity_days} Days)
              </p>
              <p>
                <span className="text-slate-500">Place of Supply:</span>{' '}
                {quote.place_of_supply_state_code} ({isIntraState ? 'Intra-State: Delhi' : 'Inter-State'})
              </p>
            </div>
          </div>
        </div>

        {/* Client & Destination Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
          <div>
            <h3 className="font-bold text-[#10243B] uppercase tracking-wider text-[11px] mb-2">
              QUOTATION ISSUED TO (CLIENT):
            </h3>
            <p className="text-sm font-bold text-slate-900">{customer.company_name}</p>
            <p className="text-slate-700 font-medium mt-0.5">Attn: {customer.primary_contact_person}</p>
            {customer.billing_address && (
              <p className="text-slate-600 mt-1 whitespace-pre-line">{customer.billing_address}</p>
            )}
            <div className="mt-2 space-y-0.5 text-slate-600">
              {customer.gstin && <p><span className="font-semibold text-slate-700">GSTIN:</span> {customer.gstin}</p>}
              {customer.pan && <p><span className="font-semibold text-slate-700">PAN:</span> {customer.pan}</p>}
              {customer.phone && <p><span className="font-semibold text-slate-700">Phone:</span> {customer.phone}</p>}
              {customer.email && <p><span className="font-semibold text-slate-700">Email:</span> {customer.email}</p>}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-[#10243B] uppercase tracking-wider text-[11px] mb-2">
              COMMERCIAL & DELIVERY TERMS:
            </h3>
            <div className="space-y-1.5 text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Destination:</span>{' '}
                {activeVersion.delivery_location}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Payment Terms:</span>{' '}
                {activeVersion.payment_terms}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Tax Type:</span>{' '}
                {quote.is_gst_applicable
                  ? isIntraState
                    ? 'CGST + SGST Applicable'
                    : 'IGST Applicable'
                  : 'Exempt / Non-GST Supply'}
              </p>
              {quote.notes && (
                <p className="text-slate-500 italic mt-2">
                  <span className="font-semibold text-slate-700 not-italic">Notes:</span> {quote.notes}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Line Items Table */}
        <div className="py-6 overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-[#10243B] text-white">
              <tr>
                <th className="py-2.5 px-3 font-semibold text-center w-10">#</th>
                <th className="py-2.5 px-3 font-semibold">Item & Specifications</th>
                <th className="py-2.5 px-3 font-semibold text-center w-20">HSN/SAC</th>
                <th className="py-2.5 px-3 font-semibold text-center w-16">Qty</th>
                <th className="py-2.5 px-3 font-semibold text-center w-16">Unit</th>
                <th className="py-2.5 px-3 font-semibold text-right w-24">Rate (₹)</th>
                <th className="py-2.5 px-3 font-semibold text-right w-24">Taxable (₹)</th>
                {quote.is_gst_applicable && (
                  <th className="py-2.5 px-3 font-semibold text-right w-24">Tax (₹)</th>
                )}
                <th className="py-2.5 px-3 font-semibold text-right w-28">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lineItems.map((item: any, idx: number) => (
                <tr key={item.id || idx} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-center text-slate-500">{idx + 1}</td>
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-slate-900">{item.item_name}</p>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5 whitespace-pre-line">{item.description}</p>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-[11px]">
                    {item.hsn_sac_code || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-medium text-slate-900">
                    {Number(item.quantity).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600 uppercase text-[11px]">
                    {item.unit}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                    ₹{Number(item.unit_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                    ₹{Number(item.taxable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  {quote.is_gst_applicable && (
                    <td className="py-2.5 px-3 text-right text-slate-700">
                      ₹{Number(item.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span className="block text-[10px] text-slate-500">@{item.gst_rate}%</span>
                    </td>
                  )}
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    ₹{Number(item.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Amount in Words */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 pb-6 border-b border-slate-200">
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#10243B] uppercase tracking-wider">
                AMOUNT IN WORDS (STATUTORY INR):
              </p>
              <p className="text-xs font-semibold text-slate-800 mt-1 italic bg-slate-50 p-3 rounded border border-slate-200">
                {convertNumberToIndianWords(activeVersion.grand_total_amount)}
              </p>
            </div>

            <div className="mt-4 text-[11px] text-slate-500 leading-relaxed">
              <p>* Rates quoted above are inclusive of standard packing.</p>
              <p>* Transport & transit insurance as per agreed delivery terms.</p>
              <p>* Statutory GST charged as per applicable Indian Tax slabs.</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Gross Subtotal:</span>
              <span className="font-medium text-slate-900">
                ₹{Number(activeVersion.subtotal_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {Number(activeVersion.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Total Discount Applied:</span>
                <span className="font-medium">
                  - ₹{Number(activeVersion.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between text-slate-700 pt-1 border-t border-slate-200">
              <span className="font-semibold">Taxable Amount:</span>
              <span className="font-semibold text-slate-900">
                ₹{Number(activeVersion.taxable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {quote.is_gst_applicable && (
              <>
                {isIntraState ? (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Central GST (CGST):</span>
                      <span className="font-medium text-slate-900">
                        ₹{Number(activeVersion.cgst_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>State GST (SGST):</span>
                      <span className="font-medium text-slate-900">
                        ₹{Number(activeVersion.sgst_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-600">
                    <span>Integrated GST (IGST):</span>
                    <span className="font-medium text-slate-900">
                      ₹{Number(activeVersion.igst_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </>
            )}

            {Number(activeVersion.round_off_amount) !== 0 && (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Round-off:</span>
                <span>
                  {Number(activeVersion.round_off_amount) > 0 ? '+' : ''}
                  ₹{Number(activeVersion.round_off_amount).toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm font-bold text-[#10243B] pt-2 border-t-2 border-[#10243B]">
              <span>GRAND TOTAL (INR):</span>
              <span className="text-base text-[#10243B]">
                ₹{Number(activeVersion.grand_total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Commercial Terms & Conditions */}
        <div className="pt-6 pb-8 border-b border-slate-200 text-[11px] text-slate-600 space-y-2">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
            Terms & Conditions:
          </h4>
          <ol className="list-decimal list-inside space-y-1 leading-relaxed">
            <li>
              <strong>Validity:</strong> This quotation remains valid for {activeVersion.validity_days} days from date of issuance.
            </li>
            <li>
              <strong>Payment Terms:</strong> {activeVersion.payment_terms}.
            </li>
            <li>
              <strong>Delivery / Handover:</strong> Delivery schedule commences strictly upon confirmation of advance payment / purchase order.
            </li>
            <li>
              <strong>Inspection & Testing:</strong> Equipment inspection may be conducted at manufacturer premises prior to dispatch.
            </li>
            <li>
              <strong>Arbitration:</strong> All contracts and disputes are subject strictly to the jurisdiction of courts in Delhi, India.
            </li>
          </ol>
          {activeVersion.terms_conditions && (
            <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200 text-slate-700">
              <span className="font-semibold">Special Conditions:</span> {activeVersion.terms_conditions}
            </div>
          )}
        </div>

        {/* Signatures & Execution Section */}
        <div className="grid grid-cols-2 gap-8 pt-8 text-xs">
          <div className="flex flex-col justify-between h-28 border-r border-slate-200 pr-6">
            <div>
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                CUSTOMER ACCEPTANCE CONFIRMATION:
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Authorized Signature & Company Seal
              </p>
            </div>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-500 text-[10px]">
              Name, Designation & Date
            </div>
          </div>

          <div className="flex flex-col justify-between h-28 pl-6 sm:text-right">
            <div>
              <p className="font-bold text-[#10243B] uppercase tracking-wider text-[11px]">
                FOR SANTHAYA ASSOCIATES PVT. LTD.
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Authorized Signatory
              </p>
            </div>
            <div className="border-t border-dashed border-slate-400 pt-1 text-slate-500 text-[10px]">
              Managing Director / Authorized Representative
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
