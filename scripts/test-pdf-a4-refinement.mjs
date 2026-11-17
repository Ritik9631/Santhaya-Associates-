import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

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

function formatIndianNum(val) {
  const num = Number(val);
  return num.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

function formatIndianRupeeWithPaise(val) {
  const num = Number(val);
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function generateReadableHtml(items, isDraft = false, quoteNumber = 'QT-2026-27-008') {
  let subtotal = 0;
  let totalTax = 0;
  items.forEach(it => {
    const taxable = it.quantity * it.unitRate;
    const tax = taxable * (it.gstRate / 100);
    subtotal += taxable;
    totalTax += tax;
  });
  const grandTotal = subtotal + totalTax;

  const rows = items.map((it, idx) => {
    const taxable = it.quantity * it.unitRate;
    const tax = taxable * (it.gstRate / 100);
    const lineTotal = taxable + tax;
    return `
      <tr style="border-bottom: 1px solid #94a3b8; page-break-inside: avoid; break-inside: avoid;">
        <td style="padding: 6px 4px; text-align: center; color: #64748b; font-family: monospace; font-size: 9pt; border-right: 1px solid #94a3b8; vertical-align: top;">${idx + 1}</td>
        <td style="padding: 6px 8px; border-right: 1px solid #94a3b8; vertical-align: top; word-break: break-word;">
          <p style="font-size: 10pt; font-weight: bold; color: #0f172a; margin: 0; line-height: 1.25;">${it.name}</p>
          ${it.desc ? `<p style="font-size: 9pt; color: #475569; margin: 2px 0 0; line-height: 1.25;">${it.desc}</p>` : ''}
        </td>
        <td style="padding: 6px 4px; text-align: center; color: #334155; font-family: monospace; font-size: 9pt; border-right: 1px solid #94a3b8; vertical-align: top;">${it.hsn || '842952'}</td>
        <td style="padding: 6px 4px; text-align: right; font-family: monospace; font-weight: 600; color: #0f172a; border-right: 1px solid #94a3b8; vertical-align: top; font-size: 9.5pt;">${it.quantity}</td>
        <td style="padding: 6px 4px; text-align: center; color: #334155; text-transform: uppercase; font-size: 9pt; border-right: 1px solid #94a3b8; vertical-align: top;">${it.unit || 'NOS'}</td>
        <td class="col-rate" style="padding: 6px 4px; text-align: right; font-family: monospace; color: #0f172a; border-right: 1px solid #94a3b8; vertical-align: top; white-space: nowrap; font-size: 9pt;">${formatIndianNum(it.unitRate)}</td>
        <td class="col-taxable" style="padding: 6px 4px; text-align: right; font-family: monospace; font-weight: 600; color: #0f172a; border-right: 1px solid #94a3b8; vertical-align: top; white-space: nowrap; font-size: 9pt;">${formatIndianNum(taxable)}</td>
        <td style="padding: 6px 4px; text-align: center; font-family: monospace; color: #334155; border-right: 1px solid #94a3b8; vertical-align: top; font-size: 9pt;">${it.gstRate}%</td>
        <td class="col-tax" style="padding: 6px 4px; text-align: right; font-family: monospace; color: #0f172a; border-right: 1px solid #94a3b8; vertical-align: top; white-space: nowrap; font-size: 9pt;">${formatIndianNum(tax)}</td>
        <td class="col-total" style="padding: 6px 4px; text-align: right; font-family: monospace; font-weight: 900; color: #020617; vertical-align: top; white-space: nowrap; font-size: 9.5pt;">${formatIndianNum(lineTotal)}</td>
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
  <div style="padding: 0; max-width: 100%; position: relative;">
    ${isDraft ? `
    <!-- Subtle Diagonal DRAFT Watermark (Restored per Phase 2) -->
    <div style="position: absolute; inset: 0; pointer-events: none; z-index: 10; display: flex; align-items: center; justify-content: center; overflow: hidden; user-select: none;">
      <div style="color: rgba(217, 119, 6, 0.12); font-weight: 900; font-size: 72pt; transform: rotate(-45deg); letter-spacing: 0.15em; text-transform: uppercase; border: 4px dashed rgba(217, 119, 6, 0.15); padding: 30px 50px; border-radius: 24px; text-align: center;">
        DRAFT
        <div style="font-size: 18pt; margin-top: 10px; letter-spacing: normal; font-weight: 700;">Preliminary Review Only</div>
      </div>
    </div>` : ''}

    <!-- Header Block (Clean QUOTATION title, No orange banner, No R2, original ref QT-2026-27-008, no Draft (Unissued) text) -->
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

    <!-- Customer & Project Info (Readable 9.5pt-11.5pt typography) -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 6px 0; border-bottom: 1px solid #cbd5e1;">
      <div>
        <span style="font-size: 9.5pt; text-transform: uppercase; font-weight: bold; color: #10243B; letter-spacing: 0.5px;">QUOTATION FOR:</span>
        <p style="font-size: 11.5pt; font-weight: bold; color: #0f172a; margin: 2px 0 0;">Patna Metro Rail Corporation Ltd.</p>
        <p style="font-size: 10pt; color: #1e293b; margin: 2px 0 0;"><span style="color: #64748b;">Contact Person:</span> Er. Rajesh Kumar Sharma (Chief Engineer)</p>
        <p style="font-size: 9.5pt; color: #334155; margin: 2px 0 0;">Indira Bhawan, West Boring Canal Road, Patna, Bihar – 800001</p>
        <p style="font-size: 9.5pt; font-family: monospace; color: #1e293b; margin: 2px 0 0;">GSTIN: 10AAECP1234F1Z1 | PAN: AAECP1234F</p>
      </div>
      <div style="background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 9.5pt; line-height: 1.35;">
        <span style="font-size: 9.5pt; text-transform: uppercase; font-weight: bold; color: #10243B;">PROJECT DETAILS:</span>
        <p style="margin: 2px 0 0;"><strong>Delivery / Worksite:</strong> Patna Metro Depot Site, New ISBT Patna</p>
        <p style="margin: 2px 0 0;"><strong>Payment Terms:</strong> 100% advance against Proforma Invoice prior to dispatch</p>
        <p style="margin: 2px 0 0;"><strong>Statutory Tax Basis:</strong> <strong style="color: #065f46;">Intra-State Supply (CGST 9% + SGST 9%)</strong></p>
      </div>
    </div>

    <!-- Table (Readable Padding: py-2 px-1.5, Font 9.5-10pt, Sums to 100%) -->
    <div style="margin: 8px 0; border: 1.5px solid #334155; border-radius: 6px; overflow: hidden;">
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

    <!-- Financial Summary (Amount in Words & Bank Details) -->
    <div class="print-avoid-break" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 6px 0; border-bottom: 1px solid #cbd5e1;">
      <div style="display: flex; flex-direction: column; justify-content: space-between; gap: 6px;">
        <div style="background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <span style="font-size: 9pt; font-weight: bold; color: #10243B; text-transform: uppercase;">AMOUNT IN WORDS (STATUTORY INR):</span>
          <p style="font-size: 9.5pt; font-weight: 600; color: #0f172a; margin: 3px 0 0; line-height: 1.3;">Statutory INR Equivalent Amount in Words</p>
        </div>
        <div style="background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
          <span style="font-size: 9pt; font-weight: bold; color: #10243B; text-transform: uppercase;">BANK DETAILS</span>
          <div style="font-size: 9pt; color: #1e293b; margin-top: 3px; line-height: 1.35;">
            <p style="margin: 0;"><strong>Bank Name:</strong> State Bank of India</p>
            <p style="margin: 0;"><strong>Account No.:</strong> 45696995612</p>
            <p style="margin: 0;"><strong>IFSC Code:</strong> SBIN0001763</p>
          </div>
        </div>
      </div>
      <div style="background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 9.5pt; line-height: 1.35;">
        <div style="display: flex; justify-content: space-between;"><span>Gross Subtotal:</span><span style="font-family: monospace;">₹${formatIndianNum(subtotal)}</span></div>
        <div style="display: flex; justify-content: space-between; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 2px;"><span>Taxable Amount:</span><span style="font-family: monospace;">₹${formatIndianNum(subtotal)}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>Central GST (CGST 9%):</span><span style="font-family: monospace;">₹${formatIndianNum(totalTax / 2)}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>State GST (SGST 9%):</span><span style="font-family: monospace;">₹${formatIndianNum(totalTax / 2)}</span></div>
        <div style="display: flex; justify-content: space-between; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 2px;"><span>Total Tax Amount:</span><span style="font-family: monospace;">₹${formatIndianNum(totalTax)}</span></div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #10243B; background: white; padding: 6px 8px; border-radius: 6px; margin-top: 4px;">
          <span style="font-size: 9.5pt; font-weight: bold; color: #10243B;">GRAND TOTAL (INR):</span>
          <span style="font-size: 15pt; font-family: monospace; font-weight: 900; color: #10243B;">${formatIndianRupeeWithPaise(grandTotal)}</span>
        </div>
      </div>
    </div>

    <!-- Terms and Conditions (6-Clause Default Standard, allows clean page breaks between clauses) -->
    <div style="padding: 6px 0; border-bottom: 1px solid #cbd5e1;">
      <p style="font-weight: bold; color: #10243B; font-size: 9.5pt; margin: 0 0 3px; text-transform: uppercase;">TERMS & CONDITIONS</p>
      <div style="background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 9pt; line-height: 1.35;">
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
      <div class="stamp-authorization-box" style="width: 320px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; text-align: right; background: white;">
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

    <!-- Verified Footer with Clickable Website Link (Phase 6) -->
    <div class="print-avoid-break" style="margin-top: 8px; padding-top: 6px; border-top: 2px solid #cbd5e1; text-align: center; font-size: 9pt; color: #1e293b; line-height: 1.35;">
      <p style="font-weight: 600; color: #0f172a; margin: 0;">Santhaya Associates Pvt. Ltd. • Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India</p>
      <p style="font-size: 8.5pt; color: #334155; margin: 2px 0 0;">
        <span><strong>Call:</strong> +91 9430986713</span> | <span><strong>WhatsApp:</strong> +91 9608950748</span> | <span><strong>Email:</strong> santhayapvt.ltd@gmail.com</span> | <span><strong>Web:</strong> <a href="https://santhayaassociates.com" style="color: #10243B; font-weight: 600; text-decoration: underline;">https://santhayaassociates.com</a></span> | <span style="font-family: monospace;"><strong>GSTIN:</strong> 10ABVCS4277J1ZU</span>
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function run() {
  console.log('='.repeat(70));
  console.log('COMPREHENSIVE READABILITY & SMART PAGINATION A4 VERIFIER');
  console.log('='.repeat(70));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const baseItems = [];
  for (let i = 1; i <= 30; i++) {
    baseItems.push({
      name: `Heavy Infrastructure Lot #${i} — Heavy Duty Equipment Spec`,
      desc: `High-durability turnkey specification model ${i} with complete industrial accessories.`,
      hsn: '842952',
      quantity: (i % 2) + 1,
      unit: 'NOS',
      unitRate: 1500000 * i,
      gstRate: 18,
    });
  }

  // Include multi-crore amounts to test numeric fit without clipping
  baseItems[0].unitRate = 12500000; // 1.25 Cr
  baseItems[1].unitRate = 8750450.75; // 87.5 L with paise

  const testCounts = [2, 5, 7, 10, 20, 30];
  const results = {};

  for (const count of testCounts) {
    const items = baseItems.slice(0, count);
    const html = generateReadableHtml(items, count === 7, 'QT-2026-27-008');
    const pdfPath = path.join(scratchDir, `test-readability-${count}-items.pdf`);

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    // Test for clipping
    const clippingIssues = await page.evaluate(() => {
      const issues = [];
      document.querySelectorAll('.col-rate, .col-taxable, .col-total').forEach((c, idx) => {
        if (c.scrollWidth > c.clientWidth) {
          issues.push(`Cell ${idx + 1} (${c.className}): scrollWidth=${c.scrollWidth} > clientWidth=${c.clientWidth}`);
        }
      });
      return issues;
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
    results[count] = { actualPages, clippingIssues };

    console.log(`\nScenario: ${count}-item quotation`);
    console.log(`  Actual Pages: ${actualPages}`);
    console.log(`  Clipping Issues: ${clippingIssues.length === 0 ? '✓ None (0 clipping)' : '❌ ' + clippingIssues.join(', ')}`);
  }

  // Capture high-resolution visual screenshot of 7-item quotation with watermark
  const page7 = await browser.newPage();
  await page7.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  const html7 = generateReadableHtml(baseItems.slice(0, 7), true, 'QT-2026-27-008');
  await page7.setContent(html7, { waitUntil: 'load' });
  const visualScreenshotPath = path.join(brainDir, 'quotation-readability-visual.png');
  await page7.screenshot({ path: visualScreenshotPath, fullPage: true });
  await page7.close();
  console.log(`\n📸 High-resolution visual screenshot saved: ${visualScreenshotPath}`);

  // Capture high-resolution visual screenshot of 2-item quotation
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  const html2 = generateReadableHtml(baseItems.slice(0, 2), false, 'QT-2026-27-008');
  await page2.setContent(html2, { waitUntil: 'load' });
  const visualScreenshot2Path = path.join(brainDir, 'quotation-2-items-visual.png');
  await page2.screenshot({ path: visualScreenshot2Path, fullPage: true });
  await page2.close();
  console.log(`📸 High-resolution visual screenshot saved: ${visualScreenshot2Path}`);

  await browser.close();

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY OF READABLE PAGINATION RESULTS:');
  for (const [count, res] of Object.entries(results)) {
    console.log(`  ${count} items -> ${res.actualPages} page(s) | Clipping: ${res.clippingIssues.length === 0 ? '0' : res.clippingIssues.length}`);
  }
  console.log('='.repeat(70));
}

run().catch(console.error);
