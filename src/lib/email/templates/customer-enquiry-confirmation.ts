/**
 * Santhaya Associates — Customer Quotation Request Confirmation Template
 * File: src/lib/email/templates/customer-enquiry-confirmation.ts
 *
 * Professional, brand-aligned HTML and plain-text template delivered to the client
 * confirming that their inquiry was received with a unique tracking reference.
 */

export interface CustomerEnquiryConfirmationPayload {
  referenceNumber: string;
  businessName: string;
  contactPerson: string;
  serviceCategory: string;
  submittedAt: string;
}

export function renderCustomerEnquiryConfirmation(payload: CustomerEnquiryConfirmationPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const categoryLabels: Record<string, string> = {
    construction_tenders: 'Government & Private Construction Tenders',
    construction_machinery: 'Construction Machinery Supply',
    manufacturing_machinery: 'Manufacturing Machinery Supply',
    'construction-tenders': 'Government & Private Construction Tenders',
    'construction-machinery': 'Construction Machinery Supply',
    'manufacturing-machinery': 'Manufacturing Machinery Supply',
  };

  const categoryName = categoryLabels[payload.serviceCategory] || payload.serviceCategory;
  const subject = `Quotation Request Received — Santhaya Associates [Ref: ${payload.referenceNumber}]`;

  const text = `
SANTHAYA ASSOCIATES PVT. LTD. — QUOTATION INQUIRY CONFIRMATION
=============================================================

Dear ${payload.contactPerson},

Thank you for your commercial quotation inquiry with Santhaya Associates Pvt. Ltd.
We have successfully registered your request in our estimation queue.

YOUR INQUIRY DETAILS
--------------------
Reference Number:  ${payload.referenceNumber}
Business Name:     ${payload.businessName}
Service Category:  ${categoryName}
Submitted On:      ${payload.submittedAt}

WHAT HAPPENS NEXT?
------------------
1. Our engineering and tender estimation department will evaluate your project requirements and specifications.
2. A formal commercial proposal or tender quote with applicable statutory GST will be prepared.
3. Our team will contact you or issue the quotation within 24 to 48 business hours.

NEED IMMEDIATE ASSISTANCE?
--------------------------
For urgent tender submissions or machinery procurement inquiries:
Corporate Office: B-102, Okhla Industrial Area, Phase-I, New Delhi - 110020
Direct Inquiries: inquiries@santhaya.com | +91 11 4567 8900
Website: https://santhaya.com

Thank you for choosing Santhaya Associates Pvt. Ltd.
Industrial Machinery Supply & Tender Construction Specialists
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
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0;" cellspacing="0" cellpadding="0">
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
                      Industrial Construction & Machinery Supply
                    </p>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(244, 179, 35, 0.15); color: #F4B323; border: 1px solid #F4B323; border-radius: 6px; padding: 5px 12px; font-size: 11px; font-weight: 700; font-family: monospace;">
                      ${payload.referenceNumber}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #10243B;">
                Inquiry Received Successfully
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Dear <strong>${payload.contactPerson}</strong>, thank you for reaching out to Santhaya Associates Pvt. Ltd. We have received your commercial inquiry for <strong>${payload.businessName}</strong>.
              </p>

              <!-- Reference Card -->
              <table role="presentation" width="100%" style="background-color: #F1F5F9; border-radius: 8px; border: 1px solid #CBD5E1; margin-bottom: 24px;" cellspacing="0" cellpadding="16">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Tracking Reference</div>
                    <div style="font-size: 16px; font-weight: 800; color: #10243B; font-family: monospace;">${payload.referenceNumber}</div>
                    <div style="margin-top: 12px; font-size: 12px; color: #475569;">
                      <strong>Category:</strong> ${categoryName}<br>
                      <strong>Logged At:</strong> ${payload.submittedAt}
                    </div>
                  </td>
                </tr>
              </table>

              <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B;">
                Next Steps
              </h3>
              <ul style="margin: 0 0 24px 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #475569;">
                <li>Our technical estimators will review your machinery requirements and site location.</li>
                <li>A comprehensive commercial proposal with statutory GST calculations will be prepared.</li>
                <li>We will dispatch the official quotation within <strong>24 to 48 business hours</strong>.</li>
              </ul>

              <div style="background-color: #FEF9C3; border: 1px solid #FDE047; border-radius: 6px; padding: 12px 16px; font-size: 12px; color: #854D0E; line-height: 1.5;">
                <strong>Urgent Tender?</strong> If you have an urgent tender submission deadline, please quote reference <strong>${payload.referenceNumber}</strong> when contacting our desk at <strong>+91 11 4567 8900</strong>.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; font-size: 11px; color: #94A3B8; text-align: center; line-height: 1.5;">
              Santhaya Associates Pvt. Ltd. • CIN: U45200DL2026PTC123456 • GSTIN: 07AABCS1429B1Z8<br>
              Corporate Office: B-102, Okhla Industrial Area, Phase-I, New Delhi - 110020<br>
              This is an automated commercial intake confirmation.
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

