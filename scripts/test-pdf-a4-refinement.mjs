import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const scratchDir = path.resolve('C:/Users/Xziant/.gemini/antigravity/brain/52967683-45c3-4caa-99ac-103441dd0e16/scratch');
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

function generateOptimizedHtml(items, quoteNumber = 'QT-2026-27-002') {
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
      <tr style="border-bottom: 1px solid #94a3b8;">
        <td style="padding: 2.5px 3px; text-align: center; color: #64748b; font-family: monospace; font-size: 8.5pt; border-right: 1px solid #94a3b8; vertical-align: top;">${idx + 1}</td>
        <td style="padding: 2.5px 6px; border-right: 1px solid #94a3b8; vertical-align: top; word-break: break-word;">
          <p style="font-size: 9pt; font-weight: bold; color: #0f172a; margin: 0; line-height: 1.15;">${it.name}</p>
          ${it.desc ? `<p style="font-size: 8pt; color: #475569; margin: 1px 0 0; line-height: 1.15;">${it.desc}</p>` : ''}
        </td>
        <td style="padding: 2.5px 3px; text-align: center; color: #334155; font-family: monospace; font-size: 8.5pt; border-right: 1px solid #94a3b8; vertical-align: top;">${it.hsn || '842952'}</td>
        <td style="padding: 2.5px 3px; text-align: right; font-family: monospace; font-weight: 600; color: #0f172a; border-right: 1px solid #94a3b8; vertical-align: top; font-size: 8.5pt;">${it.quantity}</td>
        <td style="padding: 2.5px 3px; text-align: center; color: #334155; text-transform: uppercase; font-size: 8pt; border-right: 1px solid #94a3b8; vertical-align: top;">${it.unit || 'NOS'}</td>
        <td class="col-rate" style="padding: 2.5px 5px; text-align: right; font-family: monospace; color: #0f172a; border-right: 1px solid #94a3b8; vertical-align: top; white-space: nowrap; font-size: 8.5pt;">${formatIndianNum(it.unitRate)}</td>
        <td class="col-taxable" style="padding: 2.5px 5px; text-align: right; font-family: monospace; font-weight: 600; color: #0f172a; border-right: 1px solid #94a3b8; vertical-align: top; white-space: nowrap; font-size: 8.5pt;">${formatIndianNum(taxable)}</td>
        <td style="padding: 2.5px 3px; text-align: center; font-family: monospace; color: #334155; border-right: 1px solid #94a3b8; vertical-align: top; font-size: 8.5pt;">${it.gstRate}%</td>
        <td class="col-tax" style="padding: 2.5px 5px; text-align: right; font-family: monospace; color: #0f172a; border-right: 1px solid #94a3b8; vertical-align: top; white-space: nowrap; font-size: 8.5pt;">${formatIndianNum(tax)}</td>
        <td class="col-total" style="padding: 2.5px 5px; text-align: right; font-family: monospace; font-weight: 900; color: #020617; vertical-align: top; white-space: nowrap; font-size: 9pt;">${formatIndianNum(lineTotal)}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Optimized Layout</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    @media print {
      html, body { width: 210mm !important; margin: 0 !important; padding: 0 !important; background: white !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 8.5pt; }
      table { width: 100% !important; table-layout: fixed !important; page-break-inside: auto; border-collapse: collapse; }
      thead { display: table-header-group !important; }
      tfoot { display: table-footer-group !important; }
      tr { page-break-inside: avoid !important; break-inside: avoid !important; }
      .print-avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
      .stamp-authorization-box { width: 320px !important; margin-left: auto !important; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 8.5pt; color: #0f172a; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div style="padding: 0; max-width: 100%; position: relative;">
    <!-- Header Block (Clean QUOTATION title, No orange banner, No R2, original ref QT-2026-27-002, discreet draft status) -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 4px; border-bottom: 2px solid #10243B; gap: 8px;">
      <div style="display: flex; gap: 10px; max-width: 62%;">
        <img src="data:image/png;base64,${symbolBase64}" style="width: 42px; height: auto; object-contain: contain;" />
        <div>
          <h2 style="font-size: 15pt; font-weight: 800; color: #10243B; margin: 0; line-height: 1.1;">Santhaya Associates Pvt. Ltd.</h2>
          <p style="font-size: 8.5pt; color: #334155; margin: 2px 0 0;">Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India</p>
          <div style="font-size: 8.5pt; font-family: monospace; color: #1e293b; margin-top: 1px;">
            <span><strong style="font-family: sans-serif;">GSTIN:</strong> 10ABVCS4277J1ZU</span>
            <span style="margin-left: 10px;"><strong style="font-family: sans-serif;">PAN:</strong> ABVCS4277J</span>
          </div>
          <p style="font-size: 8pt; color: #475569; margin: 1px 0 0;">Govt. & Private Civil Infrastructure | Heavy Machinery Supply & Rentals | Turnkey EPC</p>
        </div>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 8.5pt; font-weight: 800; text-transform: uppercase; background: #10243B; color: #F4B323; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px;">QUOTATION</span>
        <h1 style="font-size: 18pt; font-weight: 900; color: #0f172a; margin: 1px 0 0; font-family: monospace;">${quoteNumber}</h1>
        <div style="font-size: 8pt; color: #334155; margin-top: 1px; line-height: 1.25;">
          <p style="margin: 0;">Date: <strong>17 Nov 2026</strong></p>
          <p style="margin: 0;">Valid Up To: <strong>17 Dec 2026</strong></p>
          <p style="margin: 0;">Place of Supply: <strong>Bihar (10)</strong></p>
          <p style="margin: 0;">Status: <span style="font-weight: 600; color: #475569; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 0 4px; border-radius: 3px; font-size: 7.5pt;">Draft (Unissued)</span></p>
        </div>
      </div>
    </div>

    <!-- Customer & Project Info -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 4px 0; border-bottom: 1px solid #e2e8f0;">
      <div>
        <span style="font-size: 8.5pt; text-transform: uppercase; font-weight: bold; color: #10243B; letter-spacing: 0.5px;">QUOTATION FOR:</span>
        <p style="font-size: 10.5pt; font-weight: bold; color: #0f172a; margin: 1px 0 0;">Patna Metro Rail Corporation Ltd.</p>
        <p style="font-size: 9pt; color: #1e293b; margin: 1px 0 0;"><span style="color: #64748b;">Contact Person:</span> Er. Rajesh Kumar Sharma (Chief Engineer)</p>
        <p style="font-size: 8.5pt; color: #334155; margin: 1px 0 0;">Indira Bhawan, West Boring Canal Road, Patna, Bihar – 800001</p>
        <p style="font-size: 8.5pt; font-family: monospace; color: #1e293b; margin: 1px 0 0;">GSTIN: 10AAECP1234F1Z1 | PAN: AAECP1234F</p>
      </div>
      <div style="background: #f8fafc; padding: 6px; border-radius: 5px; border: 1px solid #e2e8f0; font-size: 8.5pt; line-height: 1.25;">
        <span style="font-size: 8.5pt; text-transform: uppercase; font-weight: bold; color: #10243B;">PROJECT DETAILS:</span>
        <p style="margin: 1px 0 0;"><strong>Delivery / Worksite:</strong> Patna Metro Depot Site, New ISBT Patna</p>
        <p style="margin: 1px 0 0;"><strong>Payment Terms:</strong> 100% advance against Proforma Invoice prior to dispatch</p>
        <p style="margin: 1px 0 0;"><strong>Statutory Tax Basis:</strong> <strong style="color: #065f46;">Intra-State Supply (CGST 9% + SGST 9%)</strong></p>
      </div>
    </div>

    <!-- Table (Phase 4: Optimized Widths: Rate 11%, Taxable 11%, Total 15%) -->
    <div style="margin: 4px 0; border: 1.5px solid #334155; border-radius: 5px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        <thead>
          <tr style="background: #10243B; color: white; font-size: 8pt; text-transform: uppercase;">
            <th style="padding: 4px 3px; text-align: center; width: 4%; border-right: 1px solid #64748b;">#</th>
            <th style="padding: 4px 6px; text-align: left; width: 27%; border-right: 1px solid #64748b;">Item Description</th>
            <th style="padding: 4px 3px; text-align: center; width: 8%; border-right: 1px solid #64748b;">HSN/SAC</th>
            <th style="padding: 4px 3px; text-align: right; width: 5%; border-right: 1px solid #64748b;">Qty</th>
            <th style="padding: 4px 3px; text-align: center; width: 5%; border-right: 1px solid #64748b;">Unit</th>
            <th style="padding: 4px 5px; text-align: right; width: 11%; border-right: 1px solid #64748b;">Rate (₹)</th>
            <th style="padding: 4px 5px; text-align: right; width: 11%; border-right: 1px solid #64748b;">Taxable (₹)</th>
            <th style="padding: 4px 3px; text-align: center; width: 5%; border-right: 1px solid #64748b;">GST %</th>
            <th style="padding: 4px 5px; text-align: right; width: 9%; border-right: 1px solid #64748b;">Tax (₹)</th>
            <th style="padding: 4px 5px; text-align: right; width: 15%;">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    <!-- Financial Summary -->
    <div class="print-avoid-break" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 4px 0; border-bottom: 1px solid #e2e8f0;">
      <div style="display: flex; flex-direction: column; justify-content: space-between; gap: 4px;">
        <div style="background: #f8fafc; padding: 6px; border-radius: 5px; border: 1px solid #e2e8f0;">
          <span style="font-size: 8pt; font-weight: bold; color: #10243B; text-transform: uppercase;">AMOUNT IN WORDS (STATUTORY INR):</span>
          <p style="font-size: 9pt; font-weight: 600; color: #0f172a; margin: 2px 0 0; line-height: 1.2;">Statutory INR Equivalent Amount in Words</p>
        </div>
        <div style="background: #f8fafc; padding: 6px; border-radius: 5px; border: 1px solid #e2e8f0;">
          <span style="font-size: 8pt; font-weight: bold; color: #10243B; text-transform: uppercase;">BANK DETAILS</span>
          <div style="font-size: 8pt; color: #1e293b; margin-top: 2px; line-height: 1.25;">
            <p style="margin: 0;"><strong>Bank Name:</strong> State Bank of India</p>
            <p style="margin: 0;"><strong>Account No.:</strong> 45696995612</p>
            <p style="margin: 0;"><strong>IFSC Code:</strong> SBIN0001763</p>
          </div>
        </div>
      </div>
      <div style="background: #f8fafc; padding: 6px; border-radius: 5px; border: 1px solid #e2e8f0; font-size: 8.5pt; line-height: 1.3;">
        <div style="display: flex; justify-content: space-between;"><span>Gross Subtotal:</span><span style="font-family: monospace;">₹${formatIndianNum(subtotal)}</span></div>
        <div style="display: flex; justify-content: space-between; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 1px;"><span>Taxable Amount:</span><span style="font-family: monospace;">₹${formatIndianNum(subtotal)}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>Central GST (CGST 9%):</span><span style="font-family: monospace;">₹${formatIndianNum(totalTax / 2)}</span></div>
        <div style="display: flex; justify-content: space-between;"><span>State GST (SGST 9%):</span><span style="font-family: monospace;">₹${formatIndianNum(totalTax / 2)}</span></div>
        <div style="display: flex; justify-content: space-between; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 1px;"><span>Total Tax Amount:</span><span style="font-family: monospace;">₹${formatIndianNum(totalTax)}</span></div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #10243B; background: white; padding: 4px 6px; border-radius: 5px; margin-top: 3px;">
          <span style="font-size: 8.5pt; font-weight: bold; color: #10243B;">GRAND TOTAL (INR):</span>
          <span style="font-size: 13.5pt; font-family: monospace; font-weight: 900; color: #10243B;">${formatIndianRupeeWithPaise(grandTotal)}</span>
        </div>
      </div>
    </div>

    <!-- Terms and Conditions -->
    <div style="padding: 4px 0; border-bottom: 1px solid #e2e8f0;">
      <p style="font-weight: bold; color: #10243B; font-size: 8.5pt; margin: 0 0 2px; text-transform: uppercase;">TERMS & CONDITIONS</p>
      <div style="background: #f8fafc; padding: 6px; border-radius: 5px; border: 1px solid #e2e8f0; font-size: 8pt; line-height: 1.2;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px 14px;">
          <div style="display: flex; gap: 4px;"><strong style="color: #10243B;">1. Validity:</strong><span>30 days from quotation date.</span></div>
          <div style="display: flex; gap: 4px;"><strong style="color: #10243B;">2. Delivery:</strong><span>10-15 working days from advance.</span></div>
          <div style="display: flex; gap: 4px;"><strong style="color: #10243B;">3. Payment:</strong><span>100% advance against Proforma Invoice.</span></div>
          <div style="display: flex; gap: 4px;"><strong style="color: #10243B;">4. Warranty:</strong><span>12 months OEM warranty on major components.</span></div>
          <div style="display: flex; gap: 4px;"><strong style="color: #10243B;">5. Taxes:</strong><span>GST as applicable at statutory rates.</span></div>
          <div style="display: flex; gap: 4px;"><strong style="color: #10243B;">6. Jurisdiction:</strong><span>Motihari, East Champaran, Bihar.</span></div>
        </div>
      </div>
    </div>

    <!-- Authorization Box (32mm stamp preserved) -->
    <div class="print-avoid-break" style="display: flex; justify-content: flex-end; padding-top: 4px;">
      <div class="stamp-authorization-box" style="width: 320px; border: 1px solid #cbd5e1; border-radius: 5px; padding: 5px 8px; text-align: right; background: white;">
        <p style="font-size: 8pt; font-weight: bold; color: #0f172a; text-transform: uppercase; margin: 0;">For Santhaya Associates Pvt. Ltd.</p>
        <div class="stamp-align-container" style="min-height: 32mm; display: flex; align-items: center; justify-content: flex-end; padding: 1px 0;">
          <img src="data:image/png;base64,${stampBase64}" style="width: 32mm; height: 32mm; max-width: 120px; max-height: 120px; object-contain: contain;" />
        </div>
        <div style="border-top: 1px dashed #cbd5e1; padding-top: 2px; display: flex; justify-content: space-between; font-size: 8pt; color: #475569;">
          <span>Date: 17 Nov 2026</span>
          <span style="font-weight: 600; color: #1e293b;">Authorized Signatory</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="print-avoid-break" style="margin-top: 4px; padding-top: 3px; border-top: 2px solid #cbd5e1; text-align: center; font-size: 8pt; color: #1e293b; line-height: 1.25;">
      <p style="font-weight: 600; color: #0f172a; margin: 0;">Santhaya Associates Pvt. Ltd. • Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India</p>
      <p style="font-size: 7.5pt; color: #334155; margin: 1px 0 0;">
        <span><strong>Call:</strong> +91 9430986713</span> | <span><strong>WhatsApp:</strong> +91 9608950748</span> | <span><strong>Email:</strong> santhayapvt.ltd@gmail.com</span> | <span style="font-family: monospace;"><strong>GSTIN:</strong> 10ABVCS4277J1ZU</span>
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function run() {
  console.log('='.repeat(70));
  console.log('COMPREHENSIVE MULTI-SCENARIO PDF & COLUMN WIDTH VERIFIER');
  console.log('='.repeat(70));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const testCases = [
    { count: 1, expectedPages: 1, name: '1-item quotation' },
    { count: 2, expectedPages: 1, name: '2-item quotation' },
    { count: 5, expectedPages: 1, name: '5-item quotation' },
    { count: 7, expectedPages: 1, name: '7-item quotation (USER TARGET)' },
    { count: 10, expectedPages: 2, name: '10-item quotation' },
    { count: 20, expectedPages: 2, name: '20-item quotation' },
    { count: 30, expectedPages: 3, name: '30-item quotation' },
  ];

  const baseItems = [];
  for (let i = 1; i <= 30; i++) {
    baseItems.push({
      name: `Heavy Construction & Engineering Machinery Lot #${i}`,
      desc: `Industrial infrastructure supply specification standard package ${i}.`,
      hsn: '842952',
      quantity: (i % 2) + 1,
      unit: 'NOS',
      unitRate: 1500000 * i, // Reaches multi-crore amounts!
      gstRate: 18,
    });
  }

  // Add a multi-crore and high-paise test item
  baseItems[0].unitRate = 12500000; // 1.25 Crore rate
  baseItems[1].unitRate = 8750450.75; // 87.5 Lakh with paise

  let allPassed = true;

  for (const tc of testCases) {
    const items = baseItems.slice(0, tc.count);
    const html = generateOptimizedHtml(items);
    const pdfPath = path.join(scratchDir, `test-${tc.count}-items.pdf`);

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    // Test for table cell clipping on wide numbers
    const clippingChecks = await page.evaluate(() => {
      const issues = [];
      const rateCells = document.querySelectorAll('.col-rate');
      rateCells.forEach((c, idx) => {
        if (c.scrollWidth > c.clientWidth) {
          issues.push(`Rate cell ${idx + 1} clipped: scrollWidth=${c.scrollWidth} > clientWidth=${c.clientWidth}`);
        }
      });
      const taxableCells = document.querySelectorAll('.col-taxable');
      taxableCells.forEach((c, idx) => {
        if (c.scrollWidth > c.clientWidth) {
          issues.push(`Taxable cell ${idx + 1} clipped: scrollWidth=${c.scrollWidth} > clientWidth=${c.clientWidth}`);
        }
      });
      const totalCells = document.querySelectorAll('.col-total');
      totalCells.forEach((c, idx) => {
        if (c.scrollWidth > c.clientWidth) {
          issues.push(`Total cell ${idx + 1} clipped: scrollWidth=${c.scrollWidth} > clientWidth=${c.clientWidth}`);
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
    const pass = actualPages === tc.expectedPages && clippingChecks.length === 0;
    if (!pass) allPassed = false;

    console.log(`\nTest: ${tc.name}`);
    console.log(`  Page count: actual=${actualPages}, expected=${tc.expectedPages} -> ${actualPages === tc.expectedPages ? '✓ PASS' : '❌ FAIL'}`);
    console.log(`  Clipping issues: ${clippingChecks.length === 0 ? '✓ NONE' : '❌ ' + clippingChecks.join(', ')}`);
  }

  // Also take a full page screenshot of the 7-item quotation to verify visual appearance
  const screenshotPage = await browser.newPage();
  await screenshotPage.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  const items7 = baseItems.slice(0, 7);
  await screenshotPage.setContent(generateOptimizedHtml(items7), { waitUntil: 'load' });
  const screenshotPath = path.join(scratchDir, 'quotation-7-items-visual.png');
  await screenshotPage.screenshot({ path: screenshotPath, fullPage: true });
  await screenshotPage.close();
  console.log(`\n📸 High-resolution visual screenshot saved: ${screenshotPath}`);

  await browser.close();

  console.log('\n' + '='.repeat(70));
  if (allPassed) {
    console.log('✅ ALL TEST SCENARIOS PASSED WITH ZERO CLIPPING AND PERFECT PAGE COUNTS!');
  } else {
    console.log('❌ SOME TESTS FAILED. CHECK LOGS ABOVE.');
  }
  console.log('='.repeat(70));
}

run().catch(console.error);
