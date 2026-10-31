/**
 * Santhaya Associates — Commercial Quotation Delivery Email Template
 * File: src/lib/email/templates/quotation-delivery.ts
 *
 * Professional proposal presentation delivered to clients with statutory
 * place-of-supply breakdown and proposal details.
 */

export interface QuotationDeliveryPayload {
  quotationNumber: string;
  versionNumber: number;
  customerName: string;
  contactPerson?: string | null;
  grandTotal: number;
  taxableAmount: number;
  taxAmount: number;
  validUntil: string;
  issueDate: string;
  itemCount: number;
  deliveryLocation: string;
  downloadUrl?: string | null;
  notes?: string | null;
}

export function renderQuotationDeliveryEmail(payload: QuotationDeliveryPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const formattedTotal = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(payload.grandTotal);

  const formattedTaxable = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(payload.taxableAmount);

  const formattedTax = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(payload.taxAmount);

  const subject = `Commercial Quotation ${payload.quotationNumber} — Santhaya Associates Pvt. Ltd.`;

  const text = `
SANTHAYA ASSOCIATES PVT. LTD. — OFFICIAL COMMERCIAL PROPOSAL
============================================================

Quotation Number: ${payload.quotationNumber} (Revision v${payload.versionNumber})
Issue Date:       ${payload.issueDate}
Valid Until:      ${payload.validUntil}
Delivery Site:    ${payload.deliveryLocation}

PROPOSAL FOR:
${payload.customerName}
${payload.contactPerson ? `Attn: ${payload.contactPerson}` : ''}

FINANCIAL SUMMARY
-----------------
Line Items:       ${payload.itemCount} items
Taxable Subtotal: ${formattedTaxable}
Applicable GST:   ${formattedTax}
Grand Total (INR):${formattedTotal}

${payload.notes ? `Staff Remarks: ${payload.notes}\n` : ''}
${payload.downloadUrl ? `Direct PDF Document: ${payload.downloadUrl}\n` : ''}
ACCEPTANCE & INSTRUCTIONS
-------------------------
To confirm this quotation or submit your Purchase Order (PO):
1. Reply directly to this email or contact our tender estimation desk.
2. Provide your formal PO Number and authorized acceptance signatory.

Santhaya Associates Pvt. Ltd.
Corporate Office: B-102, Okhla Industrial Area, Phase-I, New Delhi - 110020
Direct: +91 11 4567 8900 | inquiries@santhaya.com
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
                      Commercial Proposal & Tender Quotation
                    </p>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(244, 179, 35, 0.15); color: #F4B323; border: 1px solid #F4B323; border-radius: 6px; padding: 5px 12px; font-size: 12px; font-weight: 800; font-family: monospace;">
                      ${payload.quotationNumber}
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
                We are pleased to submit our formal commercial quotation for <strong>${payload.customerName}</strong>. Please review the proposal details below:
              </p>

              <!-- Proposal Details Card -->
              <table role="presentation" width="100%" style="background-color: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0; margin-bottom: 24px;" cellspacing="0" cellpadding="16">
                <tr>
                  <td>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="4" style="font-size: 13px;">
                      <tr>
                        <td style="color: #64748B; width: 40%;">Proposal Reference:</td>
                        <td style="font-weight: 700; color: #10243B; font-family: monospace;">${payload.quotationNumber} (v${payload.versionNumber})</td>
                      </tr>
                      <tr>
                        <td style="color: #64748B;">Date of Issue:</td>
                        <td style="font-weight: 600; color: #1E293B;">${payload.issueDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748B;">Validity Period:</td>
                        <td style="font-weight: 600; color: #1E293B;">Valid until ${payload.validUntil}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748B;">Delivery Location:</td>
                        <td style="font-weight: 600; color: #1E293B;">${payload.deliveryLocation}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748B;">Scope of Supply:</td>
                        <td style="font-weight: 600; color: #1E293B;">${payload.itemCount} item(s) specified</td>
                      </tr>
                    </table>

                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px dashed #CBD5E1;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="4" style="font-size: 13px;">
                        <tr>
                          <td style="color: #64748B;">Taxable Subtotal:</td>
                          <td align="right" style="font-weight: 600; color: #1E293B;">${formattedTaxable}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748B;">Statutory GST:</td>
                          <td align="right" style="font-weight: 600; color: #1E293B;">${formattedTax}</td>
                        </tr>
                        <tr style="font-size: 16px;">
                          <td style="font-weight: 800; color: #10243B; padding-top: 8px;">Total Proposal Value:</td>
                          <td align="right" style="font-weight: 800; color: #059669; padding-top: 8px;">${formattedTotal}</td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>

              ${
                payload.notes
                  ? `<div style="background-color: #F1F5F9; border-left: 3px solid #10243B; padding: 12px 16px; font-size: 12px; color: #334155; margin-bottom: 24px;">
                      <strong>Special Terms:</strong> ${payload.notes}
                    </div>`
                  : ''
              }

              <!-- Acceptance Callout -->
              <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #065F46;">
                  Formal Acceptance Process
                </h4>
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #047857;">
                  To accept this proposal, please issue your client Purchase Order (PO) or reply to this communication with your confirmation. Our team will promptly acknowledge and schedule mobilization.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; font-size: 11px; color: #94A3B8; text-align: center; line-height: 1.5;">
              Santhaya Associates Pvt. Ltd. • CIN: U45200DL2026PTC123456 • GSTIN: 07AABCS1429B1Z8<br>
              B-102, Okhla Industrial Area, Phase-I, New Delhi - 110020 • inquiries@santhaya.com
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

