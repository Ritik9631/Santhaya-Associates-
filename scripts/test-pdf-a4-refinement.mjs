import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import {
  formatIndianRupee,
  formatSmartRupee,
  formatWholeRupee,
} from '../src/lib/utils/currency.ts';
import { calculateQuotationTotals } from '../src/lib/quotation/calculations.ts';
import { estimateQuotationPageLayout } from '../src/lib/quotation/layout-estimator.ts';
import { getSimplifiedQuotationTerms } from '../src/lib/billing/default-terms.ts';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const brainDir = path.resolve('C:/Users/Xziant/.gemini/antigravity/brain/52967683-45c3-4caa-99ac-103441dd0e16');
const scratchDir = path.join(brainDir, 'scratch');
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

const stampBase64 = fs.readFileSync('public/santhaya-round-stamp.png').toString('base64');
const symbolBase64 = fs.readFileSync('public/santhaya-symbol.png').toString('base64');

function countPdfPages(filePath) {
  const buf = fs.readFileSync(filePath);
  const str = buf.toString('latin1');
  const countMatch = str.match(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/) || str.match(/\/Count\s+(\d+)/);
  return countMatch ? parseInt(countMatch[1], 10) : null;
}

function hasPdfHyperlink(filePath, expectedUrl) {
  const buf = fs.readFileSync(filePath);
  const str = buf.toString('latin1');
  const hasLinkSubtype = str.includes('/Subtype /Link');
  const hasUri = str.includes(`/URI (${expectedUrl})`) || str.includes(`/URI (${expectedUrl}/)`);
  return { hasLinkSubtype, hasUri };
}

function generateReadableHtml(items, isDraft = false, quoteNumber = 'QT-2026-27-008') {
  const calcInputs = items.map((it) => ({
    item_name: it.name,
    description: it.desc || '',
    hsn_sac_code: it.hsn || '842952',
    unit: it.unit || 'NOS',
    quantity: it.quantity,
    unit_rate: it.unitRate,
    discount_amount: it.discount || 0,
    gst_rate: it.gstRate,
  }));

  const totals = calculateQuotationTotals(calcInputs, true, '10', '10');
  const hasFractionalLineTax = totals.items.some(
    (item) => Math.round(Math.abs(Number(item.tax_amount || 0)) * 100) % 100 !== 0
  );

  const rows = totals.items.map((it, idx) => {
    return `
      <tr style="border-bottom: 1px solid #94a3b8; page-break-inside: avoid; break-inside: avoid; background: ${idx % 2 === 1 ? 'rgba(248,250,252,0.45)' : 'transparent'};">
        <td style="padding: 6px 4px; text-align: center; color: #64748b; font-family: monospace; font-size: 9pt; border-right: 1px solid #94a3b8; vertical-align: top;">${idx + 1}</td>
        <td style="padding: 6px 8px; border-right: 1px solid #94a3b8; vertical-align: top; word-break: break-word;">
          <p style="font-size: 10pt; font-weight: bold; color: #0f172a; margin: 0; line-height: 1.25;">${it.item_name}</p>
          ${it.description ? `<p style="font-size: 9pt; color: #475569; margin: 2px 0 0; line-height: 1.25;">${it.description}</p>` : ''}
        </td>
        <td style="padding: 6px 4px; text-align: center; color: #334155; font-family: monospace; font-size: 9pt; border-right: 1px solid #94a3b8; vertical-align: top;">${it.hsn_sac_code || '842952'}</td>
        <td style="padding: 6px 4px; text-align: right; font-family: monospace; font-weight: 600; color: #0f172a; border-right: 1px solid #94a3b8; vertical-align: top; font-size: 9.5pt;">${it.quantity}</td>
        <td style="padding: 6px 4px; text-align: center; color: #334155; text-transform: uppercase; font-size: 9pt; border-right: 1px solid #94a3b8; vertical-align: top;">${it.unit || 'NOS'}</td>
        <td class="col-rate" style="padding: 6px 3px; text-align: right; font-family: monospace; letter-spacing: -0.04em; color: #0f172a; border-right: 1px solid #94a3b8; vertical-align: top; white-space: nowrap; font-size: 8.5pt;">${formatSmartRupee(it.unit_rate, false)}</td>
        <td class="col-taxable" style="padding: 6px 3px; text-align: right; font-family: monospace; letter-spacing: -0.04em; font-weight: 600; color: #0f172a; border-right: 1px solid #94a3b8; vertical-align: top; white-space: nowrap; font-size: 8.5pt;">${formatSmartRupee(it.taxable_amount, false)}</td>
        <td style="padding: 6px 4px; text-align: center; font-family: monospace; color: #334155; border-right: 1px solid #94a3b8; vertical-align: top; font-size: 9pt;">${it.gst_rate}%</td>
        <td class="col-tax" style="padding: 6px 4px; text-align: right; font-family: monospace; color: #0f172a; border-right: 1px solid #94a3b8; vertical-align: top; white-space: nowrap; font-size: 9.5pt;">${formatWholeRupee(it.tax_amount, false)}</td>
        <td class="col-total" style="padding: 6px 4px; text-align: right; font-family: monospace; font-weight: 900; color: #020617; vertical-align: top; white-space: nowrap; font-size: 9.5pt;">${formatSmartRupee(it.line_total, false)}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quotation ${quoteNumber}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    @media print {
      html, body { width: 210mm !important; margin: 0 !important; padding: 0 !important; background: white !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 9.5pt; color: #0f172a !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .print-container { width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; background: transparent !important; }
      .pdf-watermark-layer { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100% !important; height: 100% !important; display: flex !important; align-items: center !important; justify-content: center !important; pointer-events: none !important; z-index: 0 !important; overflow: visible !important; }
      .pdf-content-layer { position: relative !important; z-index: 10 !important; }
      table { width: 100% !important; table-layout: fixed !important; page-break-inside: auto; border-collapse: collapse; }
      thead { display: table-header-group !important; }
      tfoot { display: table-footer-group !important; }
      tr { page-break-inside: avoid !important; break-inside: avoid !important; }
      .print-avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
      .stamp-authorization-box { width: 320px !important; margin-left: auto !important; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 9.5pt; color: #0f172a; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div class="print-container" style="padding: 0; max-width: 100%; position: relative;">
    ${isDraft ? `
    <!-- Enlarged Repeating Subtle Diagonal DRAFT Watermark (Phase 3: ~30% larger, fixed on every printed page, behind content) -->
    <div class="pdf-watermark-layer" style="position: absolute; inset: 0; pointer-events: none; z-index: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; user-select: none;">
      <div style="color: rgba(217, 119, 6, 0.15); font-weight: 900; font-size: 96pt; line-height: 1; transform: rotate(-45deg); letter-spacing: 0.14em; text-transform: uppercase; border: 4px dashed rgba(217, 119, 6, 0.20); padding: 40px 56px; border-radius: 24px; text-align: center;">
        DRAFT
        <div style="font-size: 19pt; margin-top: 10px; letter-spacing: normal; font-weight: 700;">Preliminary Review Only</div>
      </div>
    </div>` : ''}

    <div class="pdf-content-layer" style="position: relative; z-index: 10;">
      <!-- Header Block (GSTIN & PAN preserved in header) -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 6px; border-bottom: 2px solid #10243B; gap: 8px;">
        <div style="display: flex; gap: 10px; max-width: 62%;">
          <img src="data:image/png;base64,${symbolBase64}" style="width: 48px; height: auto; object-fit: contain;" />
          <div>
            <h2 style="font-size: 17pt; font-weight: 800; color: #10243B; margin: 0; line-height: 1.15;">Santhaya Associates Pvt. Ltd.</h2>
            <p style="font-size: 9.5pt; color: #334155; margin: 2px 0 0;">Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India</p>
            <div style="font-size: 9.5pt; font-family: monospace; color: #1e293b; margin-top: 2px;">
              <span><strong style="font-family: sans-serif;">GSTIN:</strong> 10ABVCS4277J1ZU</span>
              <span style="margin-left: 12px;"><strong style="font-family: sans-serif;">PAN:</strong> ABVCS4277J</span>
            </div>
            <p style="font-size: 9pt; color: #475569; margin: 2px 0 0; font-weight: 500;">Govt. & Private Civil Infrastructure | Heavy Machinery Supply & Rentals | Turnkey EPC</p>
          </div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 9pt; font-weight: 800; text-transform: uppercase; background: #10243B; color: #F4B323; padding: 3px 10px; border-radius: 4px; letter-spacing: 0.5px;">QUOTATION</span>
          <h1 style="font-size: 19pt; font-weight: 900; color: #0f172a; margin: 2px 0 0; font-family: monospace;">${quoteNumber}</h1>
          <div style="font-size: 9.5pt; color: #334155; margin-top: 2px; line-height: 1.3;">
            <p style="margin: 0;">Date: <strong>17 Nov 2026</strong></p>
            <p style="margin: 0;">Valid Up To: <strong>17 Dec 2026</strong></p>
            <p style="margin: 0;">Place of Supply: <strong>Bihar (10)</strong></p>
          </div>
        </div>
      </div>

      <!-- Customer & Project Info -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 6px 0; border-bottom: 1px solid #cbd5e1;">
        <div>
          <span style="font-size: 9.5pt; text-transform: uppercase; font-weight: bold; color: #10243B; letter-spacing: 0.5px;">QUOTATION FOR:</span>
          <p style="font-size: 11.5pt; font-weight: bold; color: #0f172a; margin: 2px 0 0;">Patna Metro Rail Corporation Ltd.</p>
          <p style="font-size: 10pt; color: #1e293b; margin: 2px 0 0;"><span style="color: #64748b;">Contact Person:</span> Er. Rajesh Kumar Sharma (Chief Engineer)</p>
          <p style="font-size: 9.5pt; color: #334155; margin: 2px 0 0;">Indira Bhawan, West Boring Canal Road, Patna, Bihar – 800001</p>
          <p style="font-size: 9.5pt; font-family: monospace; color: #1e293b; margin: 2px 0 0;">GSTIN: 10AAECP1234F1Z1 | PAN: AAECP1234F</p>
        </div>
        <div style="background: rgba(248, 250, 252, 0.8); padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 9.5pt; line-height: 1.35;">
          <span style="font-size: 9.5pt; text-transform: uppercase; font-weight: bold; color: #10243B;">PROJECT DETAILS:</span>
          <p style="margin: 2px 0 0;"><strong>Delivery / Worksite:</strong> Patna Metro Depot Site, New ISBT Patna</p>
          <p style="margin: 2px 0 0;"><strong>Payment Terms:</strong> 100% advance against Proforma Invoice prior to dispatch</p>
          <p style="margin: 2px 0 0;"><strong>Statutory Tax Basis:</strong> <strong style="color: #065f46;">Intra-State Supply (CGST 9% + SGST 9%)</strong></p>
        </div>
      </div>

      <!-- Table -->
      <div style="margin: 8px 0;">
        <div style="border: 1.5px solid #334155; border-radius: 6px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <thead>
              <tr style="background: #10243B; color: white; font-size: 9pt; text-transform: uppercase;">
                <th style="padding: 6px 3px; text-align: center; width: 4%; border-right: 1px solid #64748b;">#</th>
                <th style="padding: 6px 8px; text-align: left; width: 27%; border-right: 1px solid #64748b;">Item Description</th>
                <th style="padding: 6px 3px; text-align: center; width: 8%; border-right: 1px solid #64748b;">HSN/SAC</th>
                <th style="padding: 6px 3px; text-align: right; width: 5%; border-right: 1px solid #64748b;">Qty</th>
                <th style="padding: 6px 3px; text-align: center; width: 5%; border-right: 1px solid #64748b;">Unit</th>
                <th style="padding: 6px 6px; text-align: right; width: 11%; border-right: 1px solid #64748b;">Rate (₹)</th>
                <th style="padding: 6px 6px; text-align: right; width: 11%; border-right: 1px solid #64748b;">Taxable (₹)</th>
                <th style="padding: 6px 3px; text-align: center; width: 5%; border-right: 1px solid #64748b;">GST %</th>
                <th style="padding: 6px 6px; text-align: right; width: 9%; border-right: 1px solid #64748b;">Tax (₹)</th>
                <th style="padding: 6px 6px; text-align: right; width: 15%;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
        ${hasFractionalLineTax ? `<p style="margin: 4px 0 0; font-size: 8pt; color: #475569; font-style: italic; line-height: 1.3;">* Line-item TAX (₹) values are rounded to the nearest whole rupee for display clarity; statutory GST summary totals below reflect exact unrounded calculations.</p>` : ''}
      </div>

      <!-- Financial Summary (Exact 2-decimal statutory totals preserved) -->
      <div class="print-avoid-break" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 6px 0; border-bottom: 1px solid #cbd5e1;">
        <div style="display: flex; flex-direction: column; justify-content: space-between; gap: 6px;">
          <div style="background: rgba(248, 250, 252, 0.8); padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <span style="font-size: 9pt; font-weight: bold; color: #10243B; text-transform: uppercase;">AMOUNT IN WORDS (STATUTORY INR):</span>
            <p style="font-size: 9.5pt; font-weight: 600; color: #0f172a; margin: 3px 0 0; line-height: 1.3;">Statutory INR Equivalent Amount in Words</p>
          </div>
          <div style="background: rgba(248, 250, 252, 0.8); padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <span style="font-size: 9pt; font-weight: bold; color: #10243B; text-transform: uppercase;">BANK DETAILS</span>
            <div style="font-size: 9pt; color: #1e293b; margin-top: 3px; line-height: 1.35;">
              <p style="margin: 0;"><strong>Bank Name:</strong> State Bank of India</p>
              <p style="margin: 0;"><strong>Account No.:</strong> 45696995612</p>
              <p style="margin: 0;"><strong>IFSC Code:</strong> SBIN0001763</p>
            </div>
          </div>
        </div>
        <div style="background: rgba(248, 250, 252, 0.8); padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 9.5pt; line-height: 1.35;">
          <div style="display: flex; justify-content: space-between;"><span>Gross Subtotal:</span><span style="font-family: monospace;">${formatIndianRupee(totals.subtotal_amount, 2)}</span></div>
          <div style="display: flex; justify-content: space-between; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 2px;"><span>Taxable Amount:</span><span style="font-family: monospace;">${formatIndianRupee(totals.taxable_amount, 2)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Central GST (CGST):</span><span style="font-family: monospace;">${formatIndianRupee(totals.cgst_amount, 2)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>State GST (SGST):</span><span style="font-family: monospace;">${formatIndianRupee(totals.sgst_amount, 2)}</span></div>
          <div style="display: flex; justify-content: space-between; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 2px;"><span>Total Tax Amount:</span><span style="font-family: monospace;">${formatIndianRupee(totals.total_tax_amount, 2)}</span></div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #10243B; background: rgba(255,255,255,0.95); padding: 6px 8px; border-radius: 6px; margin-top: 4px;">
            <span style="font-size: 9.5pt; font-weight: bold; color: #10243B;">GRAND TOTAL (INR):</span>
            <span style="font-size: 15pt; font-family: monospace; font-weight: 900; color: #10243B;">${formatIndianRupee(totals.grand_total_amount, 2)}</span>
          </div>
        </div>
      </div>

      <!-- Terms and Conditions (6-Clause Default Standard, natural page breaks between clauses) -->
      <div style="padding: 6px 0; border-bottom: 1px solid #cbd5e1;">
        <p style="font-weight: bold; color: #10243B; font-size: 9.5pt; margin: 0 0 3px; text-transform: uppercase;">TERMS & CONDITIONS</p>
        <div style="background: rgba(248, 250, 252, 0.8); padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 9pt; line-height: 1.35;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px;">
            <div style="display: flex; gap: 4px; page-break-inside: avoid; break-inside: avoid;"><strong style="color: #10243B;">1. Validity & Pricing:</strong><span>Valid for 30 calendar days from date of issuance. Rates are based on statutory duties.</span></div>
            <div style="display: flex; gap: 4px; page-break-inside: avoid; break-inside: avoid;"><strong style="color: #10243B;">2. Scope of Supply:</strong><span>Strictly limited to technical specifications and quantities enumerated in this proposal.</span></div>
            <div style="display: flex; gap: 4px; page-break-inside: avoid; break-inside: avoid;"><strong style="color: #10243B;">3. Payment & Delivery:</strong><span>Commercial milestones follow agreed terms; timeline commences upon confirmed advance.</span></div>
            <div style="display: flex; gap: 4px; page-break-inside: avoid; break-inside: avoid;"><strong style="color: #10243B;">4. Freight & Warranty:</strong><span>Transit freight and insurance apply per agreed terms; standard OEM warranty applies.</span></div>
            <div style="display: flex; gap: 4px; page-break-inside: avoid; break-inside: avoid;"><strong style="color: #10243B;">5. Changes & Force Majeure:</strong><span>Modifications require written consent. Delays caused by force majeure are excused.</span></div>
            <div style="display: flex; gap: 4px; page-break-inside: avoid; break-inside: avoid;"><strong style="color: #10243B;">6. Governing Law:</strong><span>Governed exclusively by Indian law; jurisdiction competent courts at Motihari, Bihar.</span></div>
          </div>
        </div>
      </div>

      <!-- Company Authorization Box (32mm authentic round stamp preserved, kept strictly together) -->
      <div class="print-avoid-break" style="display: flex; justify-content: flex-end; padding-top: 6px;">
        <div class="stamp-authorization-box" style="width: 320px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; text-align: right; background: rgba(255,255,255,0.95);">
          <p style="font-size: 9pt; font-weight: bold; color: #0f172a; text-transform: uppercase; margin: 0;">For Santhaya Associates Pvt. Ltd.</p>
          <div class="stamp-align-container" style="min-height: 32mm; display: flex; align-items: center; justify-content: flex-end; padding: 2px 0;">
            <img src="data:image/png;base64,${stampBase64}" style="width: 32mm; height: 32mm; max-width: 120px; max-height: 120px; object-fit: contain;" />
          </div>
          <div style="border-top: 1px dashed #cbd5e1; padding-top: 3px; display: flex; justify-content: space-between; font-size: 9pt; color: #334155;">
            <span>Date: 17 Nov 2026</span>
            <span style="font-weight: 600; color: #1e293b;">Authorized Signatory</span>
          </div>
        </div>
      </div>

      <!-- Verified Footer with Clickable Website Link (No Duplicate GSTIN — Phase 4 & Phase 5) -->
      <div class="print-avoid-break pdf-footer" style="margin-top: 8px; padding-top: 6px; border-top: 2px solid #cbd5e1; text-align: center; font-size: 9pt; color: #1e293b; line-height: 1.35;">
        <p style="font-weight: 600; color: #0f172a; margin: 0;">Santhaya Associates Pvt. Ltd. • Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India</p>
        <p style="font-size: 9pt; color: #334155; margin: 2px 0 0;">
          <span style="white-space: nowrap;"><strong>Call:</strong> +91 9430986713</span> | <span style="white-space: nowrap;"><strong>WhatsApp:</strong> +91 9608950748</span> | <span style="white-space: nowrap;"><strong>Email:</strong> <a href="mailto:santhayapvt.ltd@gmail.com" style="color: #1e293b; text-decoration: none;">santhayapvt.ltd@gmail.com</a></span> | <span style="white-space: nowrap;"><strong>Web:</strong> <a class="footer-web-link" href="https://santhayaassociates.com" style="color: #10243B; font-weight: 600; text-decoration: underline;">https://santhayaassociates.com</a></span>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function run() {
  console.log('='.repeat(74));
  console.log('FINAL QUOTATION PDF POLISH — CHROME A4 PRINT, WATERMARK & HYPERLINK VERIFIER');
  console.log('='.repeat(74));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  // Include owner's exact fractional GST test examples + large multi-crore figures
  const baseItems = [
    {
      name: 'Concrete Batching Plant Assembly — Lot #1',
      desc: 'Heavy-duty turnkey batching unit with PLC automation panel.',
      hsn: '847431',
      quantity: 1,
      unit: 'NOS',
      unitRate: 210593, // 18% GST = 37,906.74 -> displays 37,907
      gstRate: 18,
    },
    {
      name: 'Hydraulic Excavator Attachment — Lot #2',
      desc: 'High-strength rock breaker assembly with hydraulic couplings.',
      hsn: '842952',
      quantity: 1,
      unit: 'NOS',
      unitRate: 226271, // 18% GST = 40,728.78 -> displays 40,729
      gstRate: 18,
    },
    {
      name: 'Vibratory Soil Compactor Unit — Lot #3',
      desc: 'Industrial grade drum roller with compaction meter.',
      hsn: '842940',
      quantity: 1,
      unit: 'NOS',
      unitRate: 61045, // 18% GST = 10,988.10 -> displays 10,988
      gstRate: 18,
    },
  ];

  for (let i = 4; i <= 30; i++) {
    baseItems.push({
      name: `Heavy Infrastructure Lot #${i} — Industrial Machinery Spec`,
      desc: `Turnkey specification model ${i} with standard industrial accessories.`,
      hsn: '842952',
      quantity: (i % 2) + 1,
      unit: 'NOS',
      unitRate: i === 4 ? 12500000 : i === 5 ? 8750450.75 : 350000 * i,
      gstRate: 18,
    });
  }

  const testCounts = [2, 5, 7, 10, 20, 30];
  const results = {};
  let failedAssertions = 0;

  for (const count of testCounts) {
    const items = baseItems.slice(0, count);
    const html = generateReadableHtml(items, true, 'QT-2026-27-008');
    const pdfPath = path.join(scratchDir, `final-polish-${count}-items-draft.pdf`);

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    const metrics = await page.evaluate(() => {
      const clippingIssues = [];
      document.querySelectorAll('.col-rate, .col-taxable, .col-tax, .col-total').forEach((c, idx) => {
        if (c.scrollWidth > c.clientWidth) {
          clippingIssues.push(`Cell ${idx + 1} (${c.className}): scrollWidth=${c.scrollWidth} > clientWidth=${c.clientWidth}`);
        }
      });

      const footer = document.querySelector('.pdf-footer');
      const footerText = footer ? footer.textContent : '';
      const footerHasGstin = footerText.includes('GSTIN') || footerText.includes('10ABVCS4277J1ZU');
      const webLink = document.querySelector('.footer-web-link');
      const webLinkHref = webLink ? webLink.getAttribute('href') : null;
      const webLinkRect = webLink ? webLink.getBoundingClientRect() : null;

      const taxCells = Array.from(document.querySelectorAll('.col-tax')).map((el) => el.textContent.trim());
      const anyTaxCellHasDecimal = taxCells.some((t) => t.includes('.'));

      return {
        clippingIssues,
        footerHasGstin,
        webLinkHref,
        webLinkHeight: webLinkRect ? Math.round(webLinkRect.height) : 0,
        taxCells: taxCells.slice(0, 3),
        anyTaxCellHasDecimal,
      };
    });

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: { top: '8mm', bottom: '8mm', left: '10mm', right: '10mm' },
      printBackground: true,
      preferCSSPageSize: true,
    });
    await page.close();

    const actualPages = countPdfPages(pdfPath);
    const linkCheck = hasPdfHyperlink(pdfPath, 'https://santhayaassociates.com');

    // Cross-check print-layout estimator against real Chrome A4 output
    const estimate = estimateQuotationPageLayout({
      items: items.map((it) => ({
        item_name: it.name,
        description: it.desc,
        unit_rate: it.unitRate,
        quantity: it.quantity,
        gst_rate: it.gstRate,
      })),
      termsConditions: getSimplifiedQuotationTerms(30),
      deliveryLocation: 'Patna Metro Depot Site, New ISBT Patna',
      customerAddress: 'Indira Bhawan, West Boring Canal Road, Patna, Bihar – 800001',
      paymentTerms: '100% advance against Proforma Invoice prior to dispatch',
      isGstApplicable: true,
      isIntraState: true,
    });

    const multiPageMatch = estimate.isMultiPage === (actualPages >= 2);

    if (
      metrics.clippingIssues.length > 0 ||
      metrics.footerHasGstin ||
      !linkCheck.hasLinkSubtype ||
      !linkCheck.hasUri ||
      metrics.anyTaxCellHasDecimal ||
      !multiPageMatch
    ) {
      failedAssertions++;
    }

    results[count] = {
      actualPages,
      estimatedPages: estimate.estimatedPages,
      multiPageMatch,
      clippingCount: metrics.clippingIssues.length,
      footerHasGstin: metrics.footerHasGstin,
      pdfHyperlinkOk: linkCheck.hasLinkSubtype && linkCheck.hasUri,
      wholeRupeeTaxOk: !metrics.anyTaxCellHasDecimal,
      sampleTaxDisplays: metrics.taxCells,
      pdfPath,
    };

    console.log(`\nScenario: ${count}-item DRAFT quotation`);
    console.log(`  Actual Chrome A4 Pages: ${actualPages} (Estimator predicted: ${estimate.estimatedPages}, Multi-page match: ${multiPageMatch ? '✓' : '❌'})`);
    console.log(`  TAX Column Displays (first 3): ${metrics.taxCells.join(', ')} (Decimals stripped: ${!metrics.anyTaxCellHasDecimal ? '✓' : '❌'})`);
    console.log(`  PDF Hyperlink Annotation (/URI https://santhayaassociates.com): ${linkCheck.hasLinkSubtype && linkCheck.hasUri ? '✓ VERIFIED' : '❌ MISSING'}`);
    console.log(`  Footer Free of Duplicate GSTIN: ${!metrics.footerHasGstin ? '✓ VERIFIED' : '❌ FAILED'}`);
    console.log(`  Numeric Clipping: ${metrics.clippingIssues.length === 0 ? '✓ None (0 clipping)' : '❌ ' + metrics.clippingIssues.join(', ')}`);
  }

  // Also export a clean non-draft (issued) 2-item PDF to confirm DRAFT watermark is omitted
  const issuedHtml = generateReadableHtml(baseItems.slice(0, 2), false, 'QT-2026-27-008');
  const issuedPdfPath = path.join(scratchDir, 'final-polish-2-items-issued.pdf');
  const issuedPage = await browser.newPage();
  await issuedPage.setContent(issuedHtml, { waitUntil: 'load' });
  await issuedPage.pdf({
    path: issuedPdfPath,
    format: 'A4',
    margin: { top: '8mm', bottom: '8mm', left: '10mm', right: '10mm' },
    printBackground: true,
    preferCSSPageSize: true,
  });
  await issuedPage.close();

  // Copy key exported PDFs (1-page, 2-page, 3-page, 4-page) directly into artifacts dir for visual inspection
  const artifactExports = [
    { src: path.join(scratchDir, 'final-polish-2-items-draft.pdf'), dest: path.join(brainDir, 'quotation-final-1page-draft.pdf') },
    { src: path.join(scratchDir, 'final-polish-7-items-draft.pdf'), dest: path.join(brainDir, 'quotation-final-2page-draft.pdf') },
    { src: path.join(scratchDir, 'final-polish-20-items-draft.pdf'), dest: path.join(brainDir, 'quotation-final-3page-draft.pdf') },
    { src: path.join(scratchDir, 'final-polish-30-items-draft.pdf'), dest: path.join(brainDir, 'quotation-final-4page-draft.pdf') },
  ];
  for (const exp of artifactExports) {
    fs.copyFileSync(exp.src, exp.dest);
  }

  await browser.close();

  console.log('\n' + '='.repeat(74));
  console.log('SUMMARY OF FINAL PDF POLISH VERIFICATION:');
  for (const [count, res] of Object.entries(results)) {
    console.log(
      `  ${String(count).padStart(2)} items -> ${res.actualPages} pg (est ${res.estimatedPages}) | Clipping: ${res.clippingCount} | Whole TAX: ${res.wholeRupeeTaxOk ? '✓' : '❌'} | Link URI: ${res.pdfHyperlinkOk ? '✓' : '❌'} | No Footer GSTIN: ${!res.footerHasGstin ? '✓' : '❌'}`
    );
  }
  console.log('='.repeat(74));

  if (failedAssertions > 0) {
    console.error(`\n❌ ${failedAssertions} scenario(s) failed assertions.`);
    process.exit(1);
  }
  console.log('\n✅ ALL CHROME A4 PDF POLISH SCENARIOS PASSED 100%!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
