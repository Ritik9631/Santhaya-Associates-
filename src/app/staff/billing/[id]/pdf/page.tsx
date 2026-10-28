import { notFound, redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import Image from 'next/image';
import Link from 'next/link';
import { Printer, ArrowLeft } from 'lucide-react';
import { convertNumberToIndianWords } from '@/lib/quotation/calculations';
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

  return (
    <div className="min-h-screen bg-slate-100 py-6 print:py-0 print:bg-white text-slate-800">
      {/* Top Floating Action Bar (Hidden during print) */}
      <div className="max-w-[850px] mx-auto mb-4 px-4 flex items-center justify-between print:hidden">
        <Link
          href={`/staff/billing/${invoice.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Billing View
        </Link>

        <button
          onClick={() => {}}
          // Note: In client, window.print() can be triggered
          className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition"
        >
          <Printer className="w-4 h-4" />
          Print / Save as PDF
        </button>
      </div>

      {/* Main A4 Printable Sheet */}
      <div className="max-w-[850px] mx-auto bg-white p-8 md:p-12 shadow-lg border border-slate-300 print:border-none print:shadow-none print:p-6 print:max-w-none text-xs leading-normal">
        {/* Header Block */}
        <div className="border-b-2 border-emerald-800 pb-5">
          <div className="flex justify-between items-start">
            <div className="space-y-1 max-w-[60%]">
              <div className="flex items-center gap-2 mb-2">
                <Image
                  src="/images/logo.png"
                  alt="Santhaya Associates"
                  width={140}
                  height={45}
                  priority
                  className="h-9 w-auto object-contain"
                />
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {invoice.company_legal_name}
              </h2>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {invoice.company_registered_address}
              </p>
              <div className="text-[11px] text-slate-700 font-mono space-x-3 pt-1">
                <span><strong>GSTIN:</strong> {invoice.company_gstin}</span>
                <span><strong>PAN:</strong> {invoice.company_pan}</span>
                <span><strong>State:</strong> {invoice.company_state_name} ({invoice.company_state_code})</span>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-emerald-800 text-white font-bold text-sm tracking-wider uppercase rounded">
                {docTitle}
              </span>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-tight">
                {subDocTitle}
              </p>
              <div className="mt-3 text-right">
                <p className="text-xs font-bold text-slate-900 font-mono">
                  {invoice.invoice_number || 'DRAFT (NOT ISSUED)'}
                </p>
                <p className="text-[11px] text-slate-600">
                  <strong>Date:</strong> {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}
                </p>
                <p className="text-[11px] text-slate-600">
                  <strong>Due Date:</strong> {new Date(invoice.due_date).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To & Supply Metadata */}
        <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Details of Receiver (Billed To):
            </p>
            <p className="font-bold text-slate-900 text-sm">
              {invoice.customer_billing_name}
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {invoice.customer_billing_address}
            </p>
            <div className="text-[11px] text-slate-700 font-mono space-y-0.5 pt-1">
              {invoice.customer_gstin ? (
                <p><strong>GSTIN:</strong> {invoice.customer_gstin}</p>
              ) : (
                <p className="italic text-slate-500">Unregistered Consumer</p>
              )}
              {invoice.customer_pan && <p><strong>PAN:</strong> {invoice.customer_pan}</p>}
              <p>
                <strong>State:</strong> {invoice.customer_state_name} ({invoice.customer_state_code})
              </p>
            </div>
          </div>

          <div className="space-y-1 bg-slate-50/70 p-3 rounded border border-slate-200 text-[11px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Supply & Delivery Coordinates:
            </p>
            <div className="grid grid-cols-2 gap-1 text-slate-700">
              <span className="font-semibold">Place of Supply:</span>
              <span className="font-mono">
                State Code {invoice.place_of_supply_state_code}
                {invoice.is_intra_state ? ' (Intra-State)' : ' (Inter-State)'}
              </span>

              <span className="font-semibold">Reverse Charge:</span>
              <span>No</span>

              <span className="font-semibold">Financial Year:</span>
              <span className="font-mono">20{invoice.financial_year}</span>

              {invoice.client_po_reference && (
                <>
                  <span className="font-semibold">Client PO Ref:</span>
                  <span className="font-mono">{invoice.client_po_reference}</span>
                </>
              )}

              {invoice.delivery_location && (
                <>
                  <span className="font-semibold">Site Destination:</span>
                  <span>{invoice.delivery_location}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="pt-4 pb-2">
          <table className="w-full text-left border-collapse border border-slate-300 text-[11px]">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-800 text-[10px] uppercase border-b border-slate-300">
                <th className="p-2 border-r border-slate-300 w-8 text-center">#</th>
                <th className="p-2 border-r border-slate-300">Description of Goods / Services</th>
                <th className="p-2 border-r border-slate-300 w-16 text-center">HSN/SAC</th>
                <th className="p-2 border-r border-slate-300 w-16 text-right">Qty</th>
                <th className="p-2 border-r border-slate-300 w-20 text-right">Rate (₹)</th>
                <th className="p-2 border-r border-slate-300 w-20 text-right">Taxable (₹)</th>
                {isTaxInvoice && invoice.is_intra_state && (
                  <>
                    <th className="p-2 border-r border-slate-300 w-16 text-right">CGST</th>
                    <th className="p-2 border-r border-slate-300 w-16 text-right">SGST</th>
                  </>
                )}
                {isTaxInvoice && !invoice.is_intra_state && (
                  <th className="p-2 border-r border-slate-300 w-20 text-right">IGST</th>
                )}
                <th className="p-2 text-right w-24">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="p-2 border-r border-slate-200 text-center text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="p-2 border-r border-slate-200">
                    <p className="font-bold text-slate-900">{item.item_name}</p>
                    {item.description && (
                      <p className="text-[10px] text-slate-500 mt-0.5">{item.description}</p>
                    )}
                  </td>
                  <td className="p-2 border-r border-slate-200 text-center font-mono">
                    {item.hsn_sac_code || '—'}
                  </td>
                  <td className="p-2 border-r border-slate-200 text-right whitespace-nowrap">
                    {Number(item.quantity).toFixed(2)} {item.unit}
                  </td>
                  <td className="p-2 border-r border-slate-200 text-right">
                    {Number(item.unit_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2 border-r border-slate-200 text-right font-medium">
                    {Number(item.taxable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  {isTaxInvoice && invoice.is_intra_state && (
                    <>
                      <td className="p-2 border-r border-slate-200 text-right text-[10px]">
                        <div>₹{Number(item.cgst_amount).toFixed(2)}</div>
                        <div className="text-slate-400">({item.cgst_rate}%)</div>
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right text-[10px]">
                        <div>₹{Number(item.sgst_amount).toFixed(2)}</div>
                        <div className="text-slate-400">({item.sgst_rate}%)</div>
                      </td>
                    </>
                  )}
                  {isTaxInvoice && !invoice.is_intra_state && (
                    <td className="p-2 border-r border-slate-200 text-right text-[10px]">
                      <div>₹{Number(item.igst_amount).toFixed(2)}</div>
                      <div className="text-slate-400">({item.igst_rate}%)</div>
                    </td>
                  )}
                  <td className="p-2 text-right font-bold text-slate-900">
                    {Number(item.line_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation & Bank Instructions Grid */}
        <div className="grid grid-cols-2 gap-6 pt-4 border-b border-slate-200 pb-4">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Amount in Words:
              </p>
              <p className="font-semibold text-slate-800 text-[11px] italic font-serif mt-0.5">
                {convertNumberToIndianWords(Number(invoice.grand_total_amount))}
              </p>
            </div>

            {/* Bank Payment Instructions */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] space-y-1">
              <p className="font-bold text-slate-800 uppercase text-[10px]">
                Bank Payment Details for Electronic Transfer (NEFT/RTGS):
              </p>
              <pre className="font-mono text-[10px] text-slate-700 whitespace-pre-wrap">
                {invoice.payment_instructions}
              </pre>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Total Taxable Value:</span>
              <span className="font-semibold text-slate-900">
                ₹{Number(invoice.taxable_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {isTaxInvoice && invoice.is_intra_state && (
              <>
                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span>Central GST (CGST):</span>
                  <span className="font-semibold text-slate-900">
                    ₹{Number(invoice.cgst_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                  <span>State GST (SGST):</span>
                  <span className="font-semibold text-slate-900">
                    ₹{Number(invoice.sgst_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}

            {isTaxInvoice && !invoice.is_intra_state && (
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Integrated GST (IGST):</span>
                <span className="font-semibold text-slate-900">
                  ₹{Number(invoice.igst_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {Number(invoice.round_off_amount) !== 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-500 text-[10px]">
                <span>Round-off:</span>
                <span>
                  {Number(invoice.round_off_amount) > 0 ? '+' : ''}
                  ₹{Number(invoice.round_off_amount).toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between py-1.5 border-t-2 border-slate-800 text-sm font-bold text-slate-900">
              <span>TOTAL INVOICE VALUE:</span>
              <span className="text-base text-emerald-800">
                ₹{Number(invoice.grand_total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {invoice.paid_amount > 0 && (
              <>
                <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                  <span>Amount Paid / Received:</span>
                  <span>
                    -₹{Number(invoice.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-amber-800 font-bold border-t border-slate-200 pt-1">
                  <span>Balance Due:</span>
                  <span>
                    ₹{Number(invoice.balance_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Statutory Terms & Conditions */}
        <div className="pt-3 pb-6 border-b border-slate-200 text-[10px] text-slate-600 space-y-1">
          <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Terms & Conditions:
          </p>
          <p>{invoice.terms_conditions || 'Payment due within 30 days from invoice date. Subject to Delhi jurisdiction.'}</p>
          <p className="italic text-slate-500 pt-1">
            Certified that the particulars given above are true and correct and the amount indicated represents the price actually charged and there is no additional consideration flowing directly or indirectly from the buyer.
          </p>
        </div>

        {/* Authorized Signatory Block */}
        <div className="grid grid-cols-2 gap-8 pt-6 text-[11px]">
          <div>
            <p className="text-[10px] text-slate-400">Customer Acknowledgment:</p>
            <div className="h-16"></div>
            <div className="border-t border-dashed border-slate-300 pt-1 text-[10px] text-slate-500">
              Customer Seal & Signature
            </div>
          </div>

          <div className="text-right">
            <p className="font-bold text-slate-900 uppercase">
              For {invoice.company_legal_name}
            </p>
            <div className="h-16"></div>
            <div className="border-t border-dashed border-slate-300 pt-1 text-[10px] text-slate-500">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

