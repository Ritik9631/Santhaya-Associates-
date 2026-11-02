/**
 * Santhaya Associates — Quotation Sample HTML & PDF Generator
 * File: scripts/generate-sample-quotations.mjs
 *
 * Implements the approved Quotation PDF improvements:
 * 1. Official 32mm circular company stamp on authorized quotes; discreet placeholder on drafts
 * 2. Guaranteed 1-page fit for 1- and 2-item quotations
 * 3. High-contrast 9pt 2-line company NAP footer
 * 4. Smart Financial Summary:
 *    - Confirmed GST: CGST+SGST or IGST with Grand Total
 *    - Pending GST: 'Pending' tax, 'Subtotal Before GST', and statutory warning notice
 *    - Smart currency formatting (no .00 for integer rupees, exact decimals for paise)
 * 5. Revised 6-clause Terms & Conditions with hanging indentation
 * 6. Contact Person label (omitted when empty)
 * 7. Commercial Notes with hanging indentation
 * 8. All 10 test scenarios required by Section 8
 */

import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { formatSmartRupee, convertNumberToIndianWords } from '../src/lib/utils/currency.ts';
import { getSimplifiedQuotationTerms } from '../src/lib/billing/default-terms.ts';

const outputDir = 'C:/Users/ritik/.gemini/antigravity/brain/26a96ae2-7d28-4640-80b9-553f236fc3f0/sample_quotations';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read stamp image as base64 for standalone portable rendering
const stampBuffer = fs.readFileSync('public/santhaya-round-stamp.png');
const stampBase64 = stampBuffer.toString('base64');

// Read authentic symbol logo as base64
const symbolBuffer = fs.readFileSync('public/santhaya-symbol.png');
const symbolBase64 = symbolBuffer.toString('base64');

function generateHtml({
  quoteNumber,
  customerName,
  customerContactPerson = null,
  customerAddress = 'Industrial Area, Motihari, Bihar – 845401',
  customerGstin = '10AABCS1234F1Z5',
  customerPan = 'AABCS1234F',
  placeOfSupply = 'Bihar (10)',
  isTaxDetermined = true,
  isInterState = false,
  isGst = true,
  validityDays = 30,
  isAuthorized = true,
  items = [],
  customTerms = null,
}) {
  let subtotal = 0;
  let totalTax = 0;

  const isIntraState = isTaxDetermined && !isInterState;

  const itemsHtml = items.map((it, idx) => {
    const qty = Number(it.quantity);
    const rate = Number(it.unitRate);
    const taxable = qty * rate;
    const gstRate = isGst ? (it.gstRate || 18) : 0;
    const tax = (isGst && isTaxDetermined) ? (taxable * gstRate) / 100 : 0;
    const total = (isGst && isTaxDetermined) ? taxable + tax : taxable;

    subtotal += taxable;
    totalTax += tax;

    const qtyStr = Number.isInteger(qty) ? qty.toString() : qty.toFixed(2).replace(/\.?0+$/, '');
    const rateStr = formatSmartRupee(rate, false);
    const taxableStr = formatSmartRupee(taxable, false);
    const taxStr = isTaxDetermined ? formatSmartRupee(tax, false) : 'Pending';
    const totalStr = formatSmartRupee(total, false);

    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 3.5px 3px; text-align: center; color: #64748b; font-family: monospace; font-size: 8pt; border-right: 1px solid #e2e8f0; vertical-align: top;">${idx + 1}</td>
        <td style="padding: 3.5px 6px; border-right: 1px solid #e2e8f0; vertical-align: top; word-break: break-word;">
          <strong style="color: #0f172a; font-size: 8.5pt; display: block;">${it.name}</strong>
          ${it.desc ? `<p style="font-size: 7.5pt; color: #475569; margin: 1px 0 0; line-height: 1.2;">${it.desc}</p>` : ''}
        </td>
        <td style="padding: 3.5px 3px; text-align: center; color: #334155; font-family: monospace; font-size: 8pt; border-right: 1px solid #e2e8f0; vertical-align: top;">${it.hsn || '842952'}</td>
        <td style="padding: 3.5px 3px; text-align: right; font-family: monospace; font-weight: 500; color: #0f172a; border-right: 1px solid #e2e8f0; vertical-align: top; font-size: 8pt;">${qtyStr}</td>
        <td style="padding: 3.5px 3px; text-align: center; text-transform: uppercase; font-size: 7.5pt; color: #334155; border-right: 1px solid #e2e8f0; vertical-align: top;">${it.unit || 'NOS'}</td>
        <td style="padding: 3.5px 4px; text-align: right; font-family: monospace; color: #0f172a; border-right: 1px solid #e2e8f0; vertical-align: top; white-space: nowrap; font-size: 8pt;">${rateStr}</td>
        ${isGst ? `<td style="padding: 3.5px 4px; text-align: right; font-family: monospace; font-weight: 500; color: #0f172a; border-right: 1px solid #e2e8f0; vertical-align: top; white-space: nowrap; font-size: 8pt;">${taxableStr}</td>` : ''}
        ${isGst ? `<td style="padding: 3.5px 3px; text-align: center; font-family: monospace; color: #334155; border-right: 1px solid #e2e8f0; vertical-align: top; font-size: 8pt;">${gstRate}%</td>` : ''}
        ${isGst ? `<td style="padding: 3.5px 4px; text-align: right; font-family: monospace; color: #0f172a; border-right: 1px solid #e2e8f0; vertical-align: top; white-space: nowrap; font-size: 8pt;">${taxStr}</td>` : ''}
        <td style="padding: 3.5px 6px; text-align: right; font-family: monospace; font-weight: bold; color: #0f172a; vertical-align: top; white-space: nowrap; font-size: 8.5pt;">${totalStr}</td>
      </tr>
    `;
  }).join('');

  const grandTotal = isTaxDetermined ? subtotal + totalTax : subtotal;
  const subtotalStr = formatSmartRupee(subtotal);
  const taxTotalStr = isTaxDetermined ? formatSmartRupee(totalTax) : 'Pending';
  const grandTotalStr = formatSmartRupee(grandTotal);

  const amountWords = (isTaxDetermined || !isGst)
    ? convertNumberToIndianWords(grandTotal)
    : `${convertNumberToIndianWords(subtotal)} (Exclusive of GST)`;

  const rawTerms = customTerms || getSimplifiedQuotationTerms(validityDays);
  const termsClauses = rawTerms.split('\n').filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quotation ${quoteNumber} | Santhaya Associates</title>
  <style>
    @media print {
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
      body {
        background: white !important;
        color: #0f172a !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        margin: 0 !important;
        padding: 0 !important;
      }
      .page-sheet {
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
        border: none !important;
        box-shadow: none !important;
      }
      table {
        width: 100% !important;
        table-layout: fixed !important;
        page-break-inside: auto;
      }
      thead { display: table-header-group !important; }
      tfoot { display: table-footer-group !important; }
      tr { page-break-inside: avoid !important; break-inside: avoid !important; }
      .print-avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
      .break-inside-avoid { page-break-inside: avoid !important; break-inside: avoid !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 16px;
      background: #f1f5f9;
      color: #0f172a;
    }
    .page-sheet {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 24px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      box-sizing: border-box;
    }
    .header-badge {
      display: inline-block;
      background: #10243B;
      color: #F4B323;
      font-size: 10pt;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 3px 12px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="page-sheet">
    <!-- Header Block -->
    <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #10243B; padding-bottom: 6px; gap: 14px;">
      <div style="display: flex; gap: 12px; max-width: 65%;">
        <div style="flex-shrink: 0; margin-top: 2px;">
          <img src="data:image/png;base64,${symbolBase64}" alt="Santhaya Associates Symbol" style="width: 48px; height: auto; aspect-ratio: 480/550; object-fit: contain;" />
        </div>
        <div>
          <h2 style="margin: 0; font-size: 15pt; font-weight: bold; color: #0f172a; line-height: 1.15;">Santhaya Associates Pvt. Ltd.</h2>
          <p style="margin: 2px 0 0; font-size: 9pt; color: #334155;">Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India</p>
          <div style="margin-top: 2px; font-size: 9pt; font-family: monospace; color: #1e293b;">
            <span><strong>GSTIN:</strong> 10ABVCS4277J1ZU</span> &nbsp;
            <span><strong>PAN:</strong> ABVCS4277J</span>
          </div>
          <p style="margin: 2px 0 0; font-size: 8pt; color: #64748b;">Govt. &amp; Private Civil Infrastructure | Heavy Machinery Supply &amp; Rentals | Turnkey EPC</p>
        </div>
      </div>
      <div style="text-align: right;">
        <span class="header-badge">QUOTATION</span>
        <h1 style="margin: 2px 0 0; font-size: 18pt; font-family: monospace; font-weight: 800; color: #0f172a;">${quoteNumber}</h1>
        <div style="margin-top: 2px; font-size: 8.5pt; color: #475569; line-height: 1.25;">
          <p style="margin: 0;">Date: <strong>02 Nov 2026</strong></p>
          <p style="margin: 1px 0;">Valid Up To: <strong>02 Dec 2026</strong></p>
          <p style="margin: 0;">Place of Supply: <strong>${placeOfSupply}</strong></p>
        </div>
      </div>
    </div>

    <!-- Client & Project Info -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 6px 0; border-bottom: 1px solid #e2e8f0;">
      <div>
        <span style="font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #1e293b; display: block; margin-bottom: 1px;">QUOTATION FOR:</span>
        <p style="margin: 0; font-size: 9.5pt; font-weight: bold; color: #0f172a;">${customerName}</p>
        ${customerContactPerson ? `<p style="margin: 1px 0 0; font-size: 8.5pt; color: #334155;"><span style="color: #64748b;">Contact Person:</span> <strong>${customerContactPerson}</strong></p>` : ''}
        <p style="margin: 1px 0 0; font-size: 8pt; color: #475569;">${customerAddress}</p>
        <div style="margin-top: 1px; font-size: 8pt; font-family: monospace; color: #1e293b;">
          ${customerGstin ? `<span><strong>GSTIN:</strong> ${customerGstin}</span> &nbsp;` : ''}
          ${customerPan ? `<span><strong>PAN:</strong> ${customerPan}</span>` : ''}
        </div>
      </div>
      <div style="background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 8pt;">
        <span style="font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #1e293b; display: block; margin-bottom: 1px;">PROJECT DETAILS:</span>
        <p style="margin: 1px 0;"><strong>Delivery / Worksite:</strong> Designated Project Site, Motihari</p>
        <p style="margin: 1px 0;"><strong>Payment Terms:</strong> 100% advance against Proforma Invoice prior to dispatch</p>
        <p style="margin: 1px 0;"><strong>Statutory Tax Basis:</strong> ${isGst ? (isTaxDetermined ? (isIntraState ? '<strong style="color: #065f46;">Intra-State Supply (CGST 9% + SGST 9%)</strong>' : '<strong style="color: #1e40af;">Inter-State Supply (IGST 18%)</strong>') : '<strong style="color: #92400e;">Tax Pending (Place of Supply Undetermined)</strong>') : '<strong style="color: #475569;">Exempt / Non-GST Supply</strong>'}</p>
      </div>
    </div>

    <!-- Itemized Table (100% width, table-fixed) -->
    <div style="margin: 6px 0; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        <thead>
          <tr style="background: #10243B; color: white; font-weight: bold; font-size: 8pt;">
            <th style="padding: 4px 3px; text-align: center; width: 4%; border-right: 1px solid #334155;">#</th>
            <th style="padding: 4px 6px; text-align: left; width: ${isGst ? '27%' : '37%'}; border-right: 1px solid #334155;">Item Description</th>
            <th style="padding: 4px 3px; text-align: center; width: ${isGst ? '9%' : '11%'}; border-right: 1px solid #334155;">HSN/SAC</th>
            <th style="padding: 4px 3px; text-align: right; width: ${isGst ? '6%' : '8%'}; border-right: 1px solid #334155;">Qty</th>
            <th style="padding: 4px 3px; text-align: center; width: ${isGst ? '6%' : '8%'}; border-right: 1px solid #334155;">Unit</th>
            <th style="padding: 4px 4px; text-align: right; width: ${isGst ? '12%' : '15%'}; border-right: 1px solid #334155;">Rate (₹)</th>
            ${isGst ? '<th style="padding: 4px 4px; text-align: right; width: 12%; border-right: 1px solid #334155;">Taxable (₹)</th>' : ''}
            ${isGst ? '<th style="padding: 4px 3px; text-align: center; width: 6%; border-right: 1px solid #334155;">GST %</th>' : ''}
            ${isGst ? '<th style="padding: 4px 4px; text-align: right; width: 8%; border-right: 1px solid #334155;">Tax (₹)</th>' : ''}
            <th style="padding: 4px 6px; text-align: right; width: ${isGst ? '10%' : '17%'};">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <!-- Financial Summary, Amount in Words & Commercial Notes -->
    <div class="print-avoid-break" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 4px 0 6px; border-bottom: 1px solid #e2e8f0;">
      <div style="display: flex; flex-direction: column; justify-content: space-between;">
        <div style="background: #f8fafc; padding: 6px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 7.5pt; font-weight: bold; text-transform: uppercase; color: #10243B;">
            ${(isTaxDetermined || !isGst) ? 'AMOUNT IN WORDS (STATUTORY INR):' : 'AMOUNT IN WORDS (SUBTOTAL BEFORE GST):'}
          </p>
          <p style="margin: 2px 0 0; font-size: 8.5pt; font-weight: 600; color: #0f172a; line-height: 1.25;">
            ${amountWords}
          </p>
        </div>
        <div style="margin-top: 4px;">
          <p style="margin: 0; font-size: 7.5pt; font-weight: bold; text-transform: uppercase; color: #10243B;">COMMERCIAL NOTES:</p>
          <div style="font-size: 7.5pt; color: #475569; line-height: 1.25; margin-top: 2px;">
            <div style="display: flex; align-items: flex-start; gap: 6px; margin: 2px 0;">
              <span style="color: #F4B323; font-weight: bold; font-size: 10pt; line-height: 1; flex-shrink: 0;">•</span>
              <span style="flex: 1;">Commercial pricing is firm for the quotation validity period stated above.</span>
            </div>
            <div style="display: flex; align-items: flex-start; gap: 6px; margin: 2px 0;">
              <span style="color: #F4B323; font-weight: bold; font-size: 10pt; line-height: 1; flex-shrink: 0;">•</span>
              <span style="flex: 1;">Equipment deployment, mobilization, fuel and site logistics per agreed scope.</span>
            </div>
            <div style="display: flex; align-items: flex-start; gap: 6px; margin: 2px 0;">
              <span style="color: #F4B323; font-weight: bold; font-size: 10pt; line-height: 1; flex-shrink: 0;">•</span>
              <span style="flex: 1;">Statutory GST invoiced per Indian Goods and Services Tax legislation.</span>
            </div>
          </div>
        </div>
      </div>

      <div style="background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 8pt; line-height: 1.35;">
        <div style="display: flex; justify-content: space-between; color: #475569;">
          <span>Gross Subtotal:</span>
          <span style="font-family: monospace; color: #0f172a;">${subtotalStr}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 600; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 2px; margin-top: 2px;">
          <span>Taxable Amount:</span>
          <span style="font-family: monospace;">${subtotalStr}</span>
        </div>
        ${isGst ? (
          isTaxDetermined ? (
            isIntraState ? `
              <div style="display: flex; justify-content: space-between; color: #475569; padding: 1px 0;">
                <span>Central GST (CGST 9%):</span>
                <span style="font-family: monospace; color: #0f172a;">${formatSmartRupee(totalTax / 2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #475569; padding: 1px 0;">
                <span>State GST (SGST 9%):</span>
                <span style="font-family: monospace; color: #0f172a;">${formatSmartRupee(totalTax / 2)}</span>
              </div>
            ` : `
              <div style="display: flex; justify-content: space-between; color: #475569; padding: 1px 0;">
                <span>Integrated GST (IGST 18%):</span>
                <span style="font-family: monospace; color: #0f172a;">${formatSmartRupee(totalTax)}</span>
              </div>
            `
          ) : `
            <div style="display: flex; justify-content: space-between; align-items: center; color: #92400e; padding: 1px 0;">
              <span>Applicable GST:</span>
              <span style="font-family: monospace; font-weight: bold; background: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: 3px; border: 1px solid #fde68a; font-size: 7.5pt;">Pending Determination</span>
            </div>
          `
        ) : ''}
        <div style="display: flex; justify-content: space-between; font-weight: 600; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 2px; margin-top: 2px;">
          <span>Total Tax Amount:</span>
          <span style="font-family: monospace;">${taxTotalStr}</span>
        </div>

        <!-- Grand Total Box vs Subtotal Before GST Box -->
        ${(isTaxDetermined || !isGst) ? `
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #10243B; margin-top: 3px; padding-top: 3px; background: white; padding: 4px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <span style="font-size: 8.5pt; font-weight: bold; color: #10243B;">GRAND TOTAL (INR):</span>
            <span style="font-size: 13.5pt; font-family: monospace; font-weight: 800; color: #10243B;">${grandTotalStr}</span>
          </div>
        ` : `
          <div style="border-top: 2px solid #d97706; margin-top: 3px; padding: 4px 6px; background: white; border-radius: 4px; border: 1px solid #fde68a;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 8pt; font-weight: bold; color: #92400e;">SUBTOTAL BEFORE GST (INR):</span>
              <span style="font-size: 13pt; font-family: monospace; font-weight: 800; color: #10243B;">${subtotalStr}</span>
            </div>
            <p style="margin: 2px 0 0; font-size: 7pt; color: #b45309; line-height: 1.2;">
              * Final statutory GST and payable grand total are subject to determination upon delivery destination confirmation.
            </p>
          </div>
        `}
      </div>
    </div>

    <!-- Commercial Terms & Conditions (Revised 6-Clause Standard) -->
    <div style="padding: 4px 0 6px; border-bottom: 1px solid #e2e8f0;">
      <p style="margin: 0 0 2px; font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #10243B;">TERMS &amp; CONDITIONS</p>
      <div style="background: #f8fafc; padding: 6px 8px; border-radius: 4px; border: 1px solid #e2e8f0; font-size: 7.5pt; color: #334155; line-height: 1.25;">
        ${termsClauses.map((clause, idx) => {
          const match = clause.match(/^(\d+)\.\s*(.*)$/);
          if (match) {
            return `
              <div class="break-inside-avoid" style="display: flex; gap: 6px; margin-bottom: 2px; align-items: flex-start;">
                <strong style="color: #10243B; width: 14px; text-align: right; flex-shrink: 0;">${match[1]}.</strong>
                <span style="flex: 1;">${match[2]}</span>
              </div>
            `;
          }
          return `<div class="break-inside-avoid" style="padding-left: 20px; margin-bottom: 2px;">${clause}</div>`;
        }).join('')}
      </div>
    </div>

    <!-- Company Authorization Block with Official Company Stamp -->
    <div class="print-avoid-break" style="display: flex; justify-content: flex-end; padding-top: 4px;">
      <div style="width: 280px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: white; text-align: right; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);">
        <p style="margin: 0; font-size: 8pt; font-weight: bold; text-transform: uppercase; color: #0f172a;">
          For Santhaya Associates Pvt. Ltd.
        </p>

        <!-- Circular Stamp Placement (32mm diameter, positioned between company name and signatory line) -->
        <div style="padding: 2px 0; display: flex; align-items: center; justify-content: center; min-height: 32mm;">
          ${isAuthorized ? `
            <img
              src="data:image/png;base64,${stampBase64}"
              alt="Santhaya Associates Official Circular Company Stamp"
              style="width: 32mm; height: 32mm; max-width: 120px; max-height: 120px; object-fit: contain; pointer-events: none; user-select: none;"
            />
          ` : `
            <div style="height: 32mm; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 7.5pt; font-style: italic;">
              (Official seal affixed upon formal issuance)
            </div>
          `}
        </div>

        <div style="border-top: 1px dashed #cbd5e1; padding-top: 3px; display: flex; justify-content: space-between; font-size: 7.5pt; color: #64748b;">
          <span>Date: 02 Nov 2026</span>
          <span style="font-weight: 600; color: #1e293b;">Authorized Signatory</span>
        </div>
      </div>
    </div>

    <!-- High-Contrast 9pt 2-Line Company NAP Footer -->
    <div style="margin-top: 10px; padding-top: 6px; border-top: 2px solid #cbd5e1; text-align: center; font-size: 9pt; color: #1e293b; line-height: 1.35;" class="print-avoid-break">
      <p style="margin: 0; font-weight: 600; color: #0f172a;">
        Santhaya Associates Pvt. Ltd. <span style="color: #94a3b8; margin: 0 4px;">•</span> Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India
      </p>
      <p style="margin: 2px 0 0; color: #334155; font-weight: 500;">
        <span><strong>Tel:</strong> +91 9430986713 / +91 9608950748</span>
        <span style="color: #94a3b8; margin: 0 6px;">|</span>
        <span><strong>Email:</strong> heistofeverything@gmail.com</span>
        <span style="color: #94a3b8; margin: 0 6px;">|</span>
        <span style="font-family: monospace;"><strong>GSTIN:</strong> 10ABVCS4277J1ZU</span>
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function generateAllSamples() {
  console.log('Generating sample quotations covering all 10 scenarios...');

  const sampleSingleItem = [
    {
      name: 'Hyundai Robex 210 LC-9 Hydraulic Excavator',
      desc: 'Heavy duty crawler excavator, 0.92 cu.m bucket capacity, Cummins 6BT5.9 engine, reinforced boom, standard 1-year warranty.',
      quantity: 1,
      unitRate: 4500000,
      gstRate: 18,
      unit: 'UNIT',
      hsn: '842952',
    },
  ];

  const sampleTwoItems = [
    {
      name: 'JCB 3DX Super Backhoe Loader (BS-IV)',
      desc: '74 HP CRDI turbo engine, 1.1 cu.m loader shovel bucket, standard 6-in-1 multipurpose bucket, rear excavator arm.',
      quantity: 1,
      unitRate: 3450000,
      gstRate: 18,
      unit: 'NOS',
      hsn: '842952',
    },
    {
      name: 'Ashok Leyland 1618 Tipper Truck (10 Wheeler)',
      desc: '16-ton gross vehicle weight, 10.5 cu.m tipping body, heavy-duty box chassis, site delivery included.',
      quantity: 2,
      unitRate: 2800000,
      gstRate: 18,
      unit: 'NOS',
      hsn: '870423',
    },
  ];

  const sampleTenItems = [];
  for (let i = 1; i <= 10; i++) {
    sampleTenItems.push({
      name: `Heavy Construction Machinery Component Package #${i}`,
      desc: `Turnkey infrastructure deployment specification lot ${i} with certified load testing.`,
      quantity: i <= 2 ? 1 : 2,
      unitRate: 350000 * i,
      gstRate: 18,
      unit: 'NOS',
      hsn: '842952',
    });
  }

  const sampleThirtyItems = [];
  for (let i = 1; i <= 30; i++) {
    sampleThirtyItems.push({
      name: `Civil Infrastructure Engineering Supply Item Lot #${i.toString().padStart(2, '0')}`,
      desc: `Bridge & highway embankment structural component package specifications for stage ${i}.`,
      quantity: (i % 3) + 1,
      unitRate: 125000 * i,
      gstRate: 18,
      unit: 'NOS',
      hsn: '842952',
    });
  }

  const samplePaiseItems = [
    {
      name: 'Precision Hydraulic Hose & High-Pressure Fitting Kit',
      desc: 'Imported braided spiral hydraulic pressure lines with DIN certified couplings.',
      quantity: 15,
      unitRate: 8350.75, // Fractional rupees with paise
      gstRate: 18,
      unit: 'SETS',
      hsn: '848120',
    },
    {
      name: 'Automated Lubrication Grease Pump Assembly',
      desc: 'Multi-port computerized progressive grease distributor.',
      quantity: 2,
      unitRate: 64230.50, // Fractional rupees with paise
      gstRate: 18,
      unit: 'NOS',
      hsn: '841319',
    },
  ];

  // 1. Draft Quotation (Unstamped proof)
  const draftHtml = generateHtml({
    quoteNumber: 'QT-2026-27-001',
    customerName: 'Patna Metro Rail Corporation Ltd.',
    customerContactPerson: 'Er. Rajesh Kumar Sharma (Chief Engineer)',
    isAuthorized: false,
    isTaxDetermined: true,
    items: sampleSingleItem,
  });

  // 2. Authorized Quotation (Stamped proof)
  const authorizedHtml = generateHtml({
    quoteNumber: 'QT-2026-27-002',
    customerName: 'Patna Metro Rail Corporation Ltd.',
    customerContactPerson: 'Er. Rajesh Kumar Sharma (Chief Engineer)',
    isAuthorized: true,
    isTaxDetermined: true,
    items: sampleSingleItem,
  });

  // 3. 1-Item Quotation (1 page proof)
  const oneItemHtml = generateHtml({
    quoteNumber: 'QT-2026-27-003',
    customerName: 'Kosi Basin Water Resources Project',
    customerContactPerson: 'Shri A. K. Verma (Superintending Engineer)',
    isAuthorized: true,
    isTaxDetermined: true,
    items: sampleSingleItem,
  });

  // 4. 2-Item Quotation (1 page proof)
  const twoItemsHtml = generateHtml({
    quoteNumber: 'QT-2026-27-004',
    customerName: 'Champaran Infrastructure Developers Pvt. Ltd.',
    customerContactPerson: 'Manoj Kumar (General Manager - Procurement)',
    isAuthorized: true,
    isTaxDetermined: true,
    items: sampleTwoItems,
  });

  // 5. 10-Item Quotation (Multi-page clean break)
  const tenItemsHtml = generateHtml({
    quoteNumber: 'QT-2026-27-005',
    customerName: 'National Highways Authority of India (NHAI - PIU Muzaffarpur)',
    customerContactPerson: 'S. N. Singh (Project Director)',
    isAuthorized: true,
    isTaxDetermined: true,
    items: sampleTenItems,
  });

  // 6. 30-Item Quotation (Stress test multi-page)
  const thirtyItemsHtml = generateHtml({
    quoteNumber: 'QT-2026-27-006',
    customerName: 'Bihar State Bridge Construction Corporation (BRPNNL)',
    customerContactPerson: 'Dr. Ramesh Chandra (Managing Director)',
    isAuthorized: true,
    isTaxDetermined: true,
    items: sampleThirtyItems,
  });

  // 7. Pending GST Quotation (Place of supply undetermined)
  const pendingGstHtml = generateHtml({
    quoteNumber: 'QT-2026-27-007',
    customerName: 'Tender Evaluation Directorate, Patna',
    customerContactPerson: 'Vikramaditya Sahay (Director of Works)',
    placeOfSupply: 'Pending Determination',
    isTaxDetermined: false, // GST Pending!
    isAuthorized: false,
    items: sampleTwoItems,
  });

  // 8. Confirmed CGST/SGST Quotation (Intra-state Bihar 10)
  const confirmedCgstSgstHtml = generateHtml({
    quoteNumber: 'QT-2026-27-008',
    customerName: 'Muzaffarpur Smart City Corporation Ltd.',
    customerContactPerson: 'Sunil Kumar (Chief Executive Officer)',
    placeOfSupply: 'Bihar (10)',
    isTaxDetermined: true,
    isInterState: false, // Intra-state
    isAuthorized: true,
    items: sampleTwoItems,
  });

  // 9. Confirmed IGST Quotation (Inter-state e.g. UP 09)
  const confirmedIgstHtml = generateHtml({
    quoteNumber: 'QT-2026-27-009',
    customerName: 'Gorakhpur Industrial Development Authority (GIDA)',
    customerAddress: 'GIDA Complex, Sector 7, Gorakhpur, Uttar Pradesh – 273209',
    customerGstin: '09AABCG5432H1Z8',
    customerPan: 'AABCG5432H',
    customerContactPerson: 'P. K. Mishra (Executive Engineer)',
    placeOfSupply: 'Uttar Pradesh (09)',
    isTaxDetermined: true,
    isInterState: true, // Inter-state
    isAuthorized: true,
    items: sampleTwoItems,
  });

  // 10. Amounts with Paise Quotation
  const paiseHtml = generateHtml({
    quoteNumber: 'QT-2026-27-010',
    customerName: 'Bettiah Heavy Equipment Engineering Works',
    customerContactPerson: 'Gopal Krishna (Works Manager)',
    placeOfSupply: 'Bihar (10)',
    isTaxDetermined: true,
    isAuthorized: true,
    items: samplePaiseItems,
  });

  const allJobs = [
    { html: draftHtml, name: 'sample-quotation-draft.pdf', htmlName: 'sample-quotation-draft.html', label: '1. Draft Quotation (Unstamped)' },
    { html: authorizedHtml, name: 'sample-quotation-authorized.pdf', htmlName: 'sample-quotation-authorized.html', label: '2. Authorized Quotation (Stamped)' },
    { html: oneItemHtml, name: 'sample-quotation-1-item.pdf', htmlName: 'sample-quotation-1-item.html', label: '3. 1-Item Quotation (1 Page)' },
    { html: twoItemsHtml, name: 'sample-quotation-2-items.pdf', htmlName: 'sample-quotation-2-items.html', label: '4. 2-Item Quotation (1 Page)' },
    { html: tenItemsHtml, name: 'sample-quotation-10-items.pdf', htmlName: 'sample-quotation-10-items.html', label: '5. 10-Item Quotation (Multi-Page)' },
    { html: thirtyItemsHtml, name: 'sample-quotation-30-items.pdf', htmlName: 'sample-quotation-30-items.html', label: '6. 30-Item Quotation (Stress Test)' },
    { html: pendingGstHtml, name: 'sample-quotation-pending-gst.pdf', htmlName: 'sample-quotation-pending-gst.html', label: '7. Pending GST Quotation' },
    { html: confirmedCgstSgstHtml, name: 'sample-quotation-confirmed-cgst-sgst.pdf', htmlName: 'sample-quotation-confirmed-cgst-sgst.html', label: '8. Confirmed CGST/SGST Quotation' },
    { html: confirmedIgstHtml, name: 'sample-quotation-confirmed-igst.pdf', htmlName: 'sample-quotation-confirmed-igst.html', label: '9. Confirmed IGST Quotation' },
    { html: paiseHtml, name: 'sample-quotation-amounts-with-paise.pdf', htmlName: 'sample-quotation-amounts-with-paise.html', label: '10. Amounts with Paise Quotation' },
  ];

  for (const job of allJobs) {
    fs.writeFileSync(path.join(outputDir, job.htmlName), job.html);
  }

  console.log('Rendering 10 PDF documents via Headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  for (const job of allJobs) {
    const page = await browser.newPage();
    await page.setContent(job.html, { waitUntil: 'load' });
    const pdfPath = path.join(outputDir, job.name);
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: { top: '8mm', bottom: '8mm', left: '10mm', right: '10mm' },
      printBackground: true,
      preferCSSPageSize: true,
    });
    await page.close();
    console.log(`  ✓ ${job.label} -> ${job.name}`);
  }

  // Also take high-res preview screenshot of the 2-item quotation
  const previewPage = await browser.newPage();
  await previewPage.setViewport({ width: 850, height: 1150 });
  await previewPage.setContent(twoItemsHtml, { waitUntil: 'load' });
  const previewPath = path.join(outputDir, 'sample-quotation-two-items-preview.png');
  await previewPage.screenshot({ path: previewPath, fullPage: true });
  await previewPage.close();
  console.log(`  📸 Screenshot: sample-quotation-two-items-preview.png`);

  await browser.close();
  console.log('\nAll 10 sample quotation documents generated and verified successfully!');
}

generateAllSamples().catch(console.error);
