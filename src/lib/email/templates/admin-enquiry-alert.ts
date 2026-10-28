/**
 * Santhaya Associates — Admin Enquiry Email Alert Template
 * File: src/lib/email/templates/admin-enquiry-alert.ts
 *
 * Professional, brand-aligned HTML and plain-text template delivered to the
 * corporate Gmail / Google Workspace inbox for real-time lead notification.
 */

import type { AdminEnquiryPayload } from '../types';

export function renderAdminEnquiryAlert(payload: AdminEnquiryPayload): {
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
  const subject = `[New Inquiry] ${payload.referenceNumber} — ${payload.businessName} (${categoryName})`;

  const text = `
SANTHAYA ASSOCIATES PVT. LTD. — OFFICIAL INBOUND LEAD NOTIFICATION
===================================================================

Reference Number:   ${payload.referenceNumber}
Submission Time:    ${payload.submittedAt}
Service Category:   ${categoryName}
Risk Classification: ${payload.riskFlag.toUpperCase()}

1. CLIENT IDENTIFICATION
------------------------
Business / Enterprise: ${payload.businessName}
Contact Person:        ${payload.contactPerson}
Official Email:        ${payload.email ? payload.email : 'Not Provided'}
Verified Mobile:       ${payload.phone ? `+91 ${payload.phone}` : 'Not Provided'}
GSTIN:                 ${payload.gstin || 'Not Provided / Unregistered'}

2. SCOPE OF REQUIREMENTS
------------------------
Project / Item Details:
${payload.requirementDetails}

Estimated Quantity:    ${payload.quantity || 'Not specified'}
Technical Specs:       ${payload.technicalSpecs || 'Not specified'}
Delivery / Site State: ${payload.deliveryLocation}
Additional Notes:      ${payload.notes || 'None'}

===================================================================
Action Required: Review enquiry in private Staff Dashboard and initialize quotation draft.
This notification was automatically dispatched from the secure Santhaya web platform.
`.trim();

  const isRisk = payload.riskFlag !== 'none';

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
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #E2E8F0;" cellspacing="0" cellpadding="0">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #10243B; padding: 24px 28px; text-align: left; border-bottom: 3px solid #F4B323;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em;">
                      SANTHAYA ASSOCIATES
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #CBD5E1; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
                      Commercial Quotation Intake Alert
                    </p>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(244, 179, 35, 0.15); color: #F4B323; border: 1px solid #F4B323; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 700; font-family: monospace;">
                      ${payload.referenceNumber}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            isRisk
              ? `
          <!-- Risk Flag Alert Banner -->
          <tr>
            <td style="background-color: #FEF3C7; padding: 12px 28px; border-bottom: 1px solid #FCD34D;">
              <p style="margin: 0; font-size: 12px; color: #92400E; font-weight: 600;">
                ⚠️ Security Notice: Intake flagged for review (${payload.riskFlag.toUpperCase()}). Verify commercial legitimacy prior to quoting.
              </p>
            </td>
          </tr>
          `
              : ''
          }

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px;">
              <!-- Section 1: Client Overview -->
              <h2 style="margin: 0 0 14px 0; font-size: 13px; font-weight: 700; color: #10243B; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #F1F5F9; padding-bottom: 6px;">
                1. Client Contact Details
              </h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="6" style="margin-bottom: 24px; font-size: 13px;">
                <tr>
                  <td width="35%" style="color: #64748B; font-weight: 600;">Business Enterprise:</td>
                  <td width="65%" style="color: #0F172A; font-weight: 700;">${payload.businessName}</td>
                </tr>
                <tr>
                  <td style="color: #64748B; font-weight: 600;">Contact Person:</td>
                  <td style="color: #0F172A;">${payload.contactPerson}</td>
                </tr>
                <tr>
                  <td style="color: #64748B; font-weight: 600;">Official Email:</td>
                  <td>${
                    payload.email
                      ? `<a href="mailto:${payload.email}" style="color: #10243B; text-decoration: underline; font-weight: 600;">${payload.email}</a>`
                      : '<span style="color: #94A3B8;">Not provided</span>'
                  }</td>
                </tr>
                <tr>
                  <td style="color: #64748B; font-weight: 600;">Mobile Phone:</td>
                  <td>${
                    payload.phone
                      ? `<a href="tel:+91${payload.phone}" style="color: #10243B; text-decoration: underline; font-weight: 600;">+91 ${payload.phone}</a>`
                      : '<span style="color: #94A3B8;">Not provided</span>'
                  }</td>
                </tr>
                <tr>
                  <td style="color: #64748B; font-weight: 600;">GSTIN:</td>
                  <td style="color: #0F172A; font-family: monospace;">${payload.gstin || '<span style="color: #94A3B8;">Not provided</span>'}</td>
                </tr>
              </table>

              <!-- Section 2: Requirements Scope -->
              <h2 style="margin: 0 0 14px 0; font-size: 13px; font-weight: 700; color: #10243B; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #F1F5F9; padding-bottom: 6px;">
                2. Scope of Requirements
              </h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="6" style="margin-bottom: 24px; font-size: 13px;">
                <tr>
                  <td width="35%" style="color: #64748B; font-weight: 600;">Service Category:</td>
                  <td width="65%" style="color: #0F172A; font-weight: 600;">${categoryName}</td>
                </tr>
                <tr>
                  <td style="color: #64748B; font-weight: 600; vertical-align: top;">Requirement Details:</td>
                  <td style="color: #0F172A; line-height: 1.5; white-space: pre-wrap;">${payload.requirementDetails}</td>
                </tr>
                ${
                  payload.quantity
                    ? `
                <tr>
                  <td style="color: #64748B; font-weight: 600;">Estimated Quantity:</td>
                  <td style="color: #0F172A;">${payload.quantity}</td>
                </tr>`
                    : ''
                }
                ${
                  payload.technicalSpecs
                    ? `
                <tr>
                  <td style="color: #64748B; font-weight: 600; vertical-align: top;">Technical Specs:</td>
                  <td style="color: #0F172A; line-height: 1.5;">${payload.technicalSpecs}</td>
                </tr>`
                    : ''
                }
                <tr>
                  <td style="color: #64748B; font-weight: 600;">Site / Delivery State:</td>
                  <td style="color: #0F172A; font-weight: 600;">${payload.deliveryLocation}</td>
                </tr>
                ${
                  payload.notes
                    ? `
                <tr>
                  <td style="color: #64748B; font-weight: 600;">Additional Notes:</td>
                  <td style="color: #0F172A;">${payload.notes}</td>
                </tr>`
                    : ''
                }
              </table>

              <!-- Action Callout -->
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748B;">
                  Enquiry logged in PostgreSQL database. Review enquiry in the private staff dashboard to initialize Quotation Draft v1.
                </p>
                <span style="display: inline-block; background-color: #10243B; color: #FFFFFF; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 6px; text-decoration: none;">
                  Status: Registered & Pending Review
                </span>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F1F5F9; padding: 16px 28px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8;">
              <p style="margin: 0;">Santhaya Associates Pvt. Ltd. — Internal Operating System</p>
              <p style="margin: 4px 0 0 0;">Automated lead delivery to corporate Gmail. Do not reply directly to this automated alert.</p>
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
