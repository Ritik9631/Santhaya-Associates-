/**
 * Santhaya Associates — GST Tax Invoice Delivery Email Template
 * File: src/lib/email/templates/invoice-delivery.ts
 *
 * Formal statutory tax invoice presentation delivered to clients with
 * breakdown of taxable value, CGST/SGST/IGST, balance due, and bank payment instructions.
 */

export interface InvoiceDeliveryPayload {
  invoiceNumber: string;
  invoiceType: 'tax_invoice' | 'bill_of_supply' | 'non_gst';
  customerName: string;
  contactPerson?: string | null;
  customerGstin?: string | null;
  totalAmount: number;
  balanceAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  isIntraState: boolean;
  issueDate: string;
  dueDate: string;
  downloadUrl?: string | null;
  notes?: string | null;
}

export function renderInvoiceDeliveryEmail(payload: InvoiceDeliveryPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const formattedTotal = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(payload.totalAmount);

  const formattedBalance = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(payload.balanceAmount);

  const formattedTaxable = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(payload.taxableAmount);

  const invoiceTypeTitle =
    payload.invoiceType === 'tax_invoice'
      ? 'TAX INVOICE'
      : payload.invoiceType === 'bill_of_supply'
      ? 'BILL OF SUPPLY'
      : 'INVOICE';

  const subject = `${invoiceTypeTitle} ${payload.invoiceNumber} — Santhaya Associates Pvt. Ltd.`;

  const text = `
SANTHAYA ASSOCIATES PVT. LTD. — OFFICIAL ${invoiceTypeTitle}
============================================================

Invoice Number:   ${payload.invoiceNumber}
Date of Issue:    ${payload.issueDate}
Payment Due Date: ${payload.dueDate}
Supplier GSTIN:   07AABCS1429B1Z8

BILLED TO:
Legal Entity:     ${payload.customerName}
${payload.contactPerson ? `Attention:        ${payload.contactPerson}\n` : ''}GSTIN / PAN:      ${payload.customerGstin || 'Unregistered'}

FINANCIAL & STATUTORY BREAKDOWN
-------------------------------
Taxable Amount:   ${formattedTaxable}
${
  payload.isIntraState
    ? `CGST (Intra-state): ₹${payload.cgstAmount.toFixed(2)}\nSGST (Intra-state): ₹${payload.sgstAmount.toFixed(2)}`
    : `IGST (Inter-state): ₹${payload.igstAmount.toFixed(2)}`
}
Total Invoice Amount: ${formattedTotal}
Balance Outstanding:  ${formattedBalance}

${payload.notes ? `Remarks: ${payload.notes}\n` : ''}
OFFICIAL SETTLEMENT BANK DETAILS
--------------------------------
Account Name:   SANTHAYA ASSOCIATES PRIVATE LIMITED
Bank:           State Bank of India
Account Number: 398200100045231
IFSC Code:      SBIN0001234
Branch:         Okhla Industrial Area, New Delhi
UPI ID:         santhaya.billing@sbi

Please cite Invoice Number [${payload.invoiceNumber}] in your payment narration.

Santhaya Associates Pvt. Ltd.
Corporate Office: B-102, Okhla Industrial Area, Phase-I, New Delhi - 110020
Direct: +91 11 4567 8900 | billing@santhaya.com
`.trim();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0;" cellspacing="0" cellpadding="0">
          <!-- Header -->
          <tr>
            <td style="background-color: #10243B; padding: 28px 32px; border-bottom: 3px solid #F4B323;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em;">
                      SANTHAYA ASSOCIATES
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #F4B323; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">
                      Official ${invoiceTypeTitle} (CGST Rule 46)
                    </p>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(244, 179, 35, 0.15); color: #F4B323; border: 1px solid #F4B323; border-radius: 6px; padding: 5px 12px; font-size: 12px; font-weight: 800; font-family: monospace;">
                      ${payload.invoiceNumber}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Dear <strong>${payload.contactPerson || payload.customerName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Please find attached the official ${invoiceTypeTitle} issued for <strong>${payload.customerName}</strong>.
              </p>

              <!-- Invoice Breakdown Card -->
              <table role="presentation" width="100%" style="background-color: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0; margin-bottom: 24px;" cellspacing="0" cellpadding="16">
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="4" style="font-size: 13px;">
                      <tr>
                        <td style="color: #64748B; width: 40%;">Invoice Number:</td>
                        <td style="font-weight: 700; color: #10243B; font-family: monospace;">${payload.invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748B;">Date of Issue:</td>
                        <td style="font-weight: 600; color: #1E293B;">${payload.issueDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748B;">Payment Due Date:</td>
                        <td style="font-weight: 600; color: #DC2626;">${payload.dueDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748B;">Customer GSTIN:</td>
                        <td style="font-weight: 600; color: #1E293B; font-family: monospace;">${payload.customerGstin || 'Not Registered'}</td>
                      </tr>
                    </table>

                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed #CBD5E1;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="4" style="font-size: 13px;">
                        <tr>
                          <td style="color: #64748B;">Taxable Subtotal:</td>
                          <td align="right" style="font-weight: 600; color: #1E293B;">${formattedTaxable}</td>
                        </tr>
                        ${
                          payload.isIntraState
                            ? `<tr>
                                <td style="color: #64748B;">CGST (Central Tax 50%):</td>
                                <td align="right" style="font-weight: 600; color: #1E293B;">₹${payload.cgstAmount.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td style="color: #64748B;">SGST (State Tax 50%):</td>
                                <td align="right" style="font-weight: 600; color: #1E293B;">₹${payload.sgstAmount.toFixed(2)}</td>
                              </tr>`
                            : `<tr>
                                <td style="color: #64748B;">IGST (Integrated Tax 100%):</td>
                                <td align="right" style="font-weight: 600; color: #1E293B;">₹${payload.igstAmount.toFixed(2)}</td>
                              </tr>`
                        }
                        <tr style="font-size: 15px;">
                          <td style="font-weight: 800; color: #10243B; padding-top: 8px;">Total Invoiced:</td>
                          <td align="right" style="font-weight: 800; color: #10243B; padding-top: 8px;">${formattedTotal}</td>
                        </tr>
                        <tr style="font-size: 15px;">
                          <td style="font-weight: 800; color: #DC2626;">Balance Due:</td>
                          <td align="right" style="font-weight: 800; color: #DC2626;">${formattedBalance}</td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Bank Account Instructions -->
              <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.05em;">
                  Statutory Bank Transfer Details (RTGS / NEFT / IMPS)
                </h4>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="3" style="font-size: 12px; color: #15803D;">
                  <tr>
                    <td style="width: 35%; font-weight: 600;">Account Name:</td>
                    <td>SANTHAYA ASSOCIATES PRIVATE LIMITED</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600;">Bank Name:</td>
                    <td>State Bank of India</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600;">Account Number:</td>
                    <td style="font-family: monospace; font-weight: 700;">398200100045231</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600;">IFSC Code:</td>
                    <td style="font-family: monospace; font-weight: 700;">SBIN0001234</td>
                  </tr>
                  <tr>
                    <td style="font-weight: 600;">Branch:</td>
                    <td>Okhla Industrial Area, New Delhi - 110020</td>
                  </tr>
                </table>
              </div>

              <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">
                Please ensure the invoice number (<strong>${payload.invoiceNumber}</strong>) is cited in your remittance instructions. For settlement queries, contact <strong>billing@santhaya.com</strong>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; font-size: 11px; color: #94A3B8; text-align: center; line-height: 1.5;">
              Santhaya Associates Pvt. Ltd. • CIN: U45200DL2026PTC123456 • GSTIN: 07AABCS1429B1Z8<br>
              Corporate Office: B-102, Okhla Industrial Area, Phase-I, New Delhi - 110020
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return { subject, html, text };
}

