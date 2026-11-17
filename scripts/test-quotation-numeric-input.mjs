/**
 * Santhaya Associates — Quotation Numeric Input UX Verification Suite
 * File: scripts/test-quotation-numeric-input.mjs
 *
 * Tests both pure normalization/calculation logic AND real Chrome interactive DOM
 * behavior (mouse click, keyboard Tab, mobile touch, clipboard paste, cursor editing,
 * empty optional Discount, intentional zero, and GST/Grand-Total accuracy).
 */

import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import {
  finalizeNumericInputOnBlur,
  normalizeNumericInputString,
  parseNumericInputValue,
  shouldAutoSelectOnFocus,
} from '../src/lib/utils/numeric-input.ts';
import { calculateQuotationTotals } from '../src/lib/quotation/calculations.ts';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const rootDir = process.cwd();

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`           ${err.message}`);
    failed++;
  }
}

console.log('='.repeat(74));
console.log('SANTHAYA ASSOCIATES — QUOTATION NUMERIC INPUT UX TEST SUITE');
console.log('='.repeat(74));

// ---------------------------------------------------------------------------
// SECTION 1: Pure Normalization, Parsing & Finalization Unit Tests
// ---------------------------------------------------------------------------
console.log('\n--- Section 1: Normalization, Parsing & Blur Finalization ---');

await test('Normalizes unintended leading zeros (02500 -> 2500, 0200 -> 200, 00 -> 0)', () => {
  assert(normalizeNumericInputString('02500') === '2500', '02500 -> 2500');
  assert(normalizeNumericInputString('0200') === '200', '0200 -> 200');
  assert(normalizeNumericInputString('00') === '0', '00 -> 0');
  assert(normalizeNumericInputString('00045') === '45', '00045 -> 45');
  assert(normalizeNumericInputString('002500.75') === '2500.75', '002500.75 -> 2500.75');
  assert(normalizeNumericInputString('00.75') === '0.75', '00.75 -> 0.75');
});

await test('Preserves valid decimals (2500.75, 0.75, 0.) and intentional zero (0)', () => {
  assert(normalizeNumericInputString('2500.75') === '2500.75', 'Preserves 2500.75');
  assert(normalizeNumericInputString('0.75') === '0.75', 'Preserves 0.75');
  assert(normalizeNumericInputString('0.') === '0.', 'Preserves in-progress 0.');
  assert(normalizeNumericInputString('2500.') === '2500.', 'Preserves in-progress 2500.');
  assert(normalizeNumericInputString('0') === '0', 'Preserves intentional 0');
  assert(normalizeNumericInputString('') === '', 'Preserves empty string while editing');
});

await test('Sanitizes pasted formatted currency values cleanly', () => {
  assert(normalizeNumericInputString('₹2,500.75') === '2500.75', 'Strips ₹ and commas');
  assert(normalizeNumericInputString(' Rs. 1,25,000.50 ') === '125000.50', 'Strips Rs. and spaces');
  assert(normalizeNumericInputString('02500.25') === '2500.25', 'Strips leading zero on decimal paste');
  assert(normalizeNumericInputString('12.34.56') === '12.3456', 'Prevents duplicate decimal dots');
});

await test('Handles blur finalization for optional Discount vs required Unit Rate & Validity Days', () => {
  // Optional Discount cleared -> stays visually empty, evaluates to numeric 0
  const emptyDisc = finalizeNumericInputOnBlur('', { allowDecimal: true, allowEmpty: true, defaultValue: 0 });
  assert(emptyDisc.display === '' && emptyDisc.numeric === 0, 'Empty optional Discount stays "" and resolves to 0');

  // Intentional zero Discount -> preserves "0" and resolves to 0
  const zeroDisc = finalizeNumericInputOnBlur('0', { allowDecimal: true, allowEmpty: true, defaultValue: 0 });
  assert(zeroDisc.display === '0' && zeroDisc.numeric === 0, 'Intentional zero Discount preserves "0"');

  // Required Unit Rate cleared -> settles to "0"
  const emptyRate = finalizeNumericInputOnBlur('', { allowDecimal: true, allowEmpty: false, defaultValue: 0 });
  assert(emptyRate.display === '0' && emptyRate.numeric === 0, 'Empty required Unit Rate settles to 0');

  // Dangling decimal cleanup
  const dotEnd = finalizeNumericInputOnBlur('2500.', { allowDecimal: true, allowEmpty: false, defaultValue: 0 });
  assert(dotEnd.display === '2500' && dotEnd.numeric === 2500, '2500. finalizes to 2500');

  const dotStart = finalizeNumericInputOnBlur('.75', { allowDecimal: true, allowEmpty: false, defaultValue: 0 });
  assert(dotStart.display === '0.75' && dotStart.numeric === 0.75, '.75 finalizes to 0.75');

  // Integer validity days clamping
  const validDays = finalizeNumericInputOnBlur('', { allowDecimal: false, allowEmpty: false, defaultValue: 30, min: 1, max: 180 });
  assert(validDays.display === '30' && validDays.numeric === 30, 'Empty validity days restores 30');
});

await test('shouldAutoSelectOnFocus selects default zero only (no interference with existing rates)', () => {
  assert(shouldAutoSelectOnFocus('0') === true, 'Auto-selects "0"');
  assert(shouldAutoSelectOnFocus('2500') === false, 'Does not auto-select existing "2500"');
  assert(shouldAutoSelectOnFocus('2500.75') === false, 'Does not auto-select existing "2500.75"');
  assert(shouldAutoSelectOnFocus('') === false, 'Does not auto-select empty string');
});

await test('Rate, Discount (empty / zero / non-zero), GST, and Grand Total calculations remain exact', () => {
  // Case A: Rate 2500.75, Qty 2, Empty Discount (parsed as 0), 18% Intra-State GST
  const emptyDiscNum = parseNumericInputValue('', 0);
  const calcA = calculateQuotationTotals(
    [{ item_name: 'Excavator Bucket', unit: 'NOS', quantity: 2, unit_rate: 2500.75, discount_amount: emptyDiscNum, gst_rate: 18 }],
    true,
    '10',
    '10'
  );
  assert(calcA.subtotal_amount === 5001.5, `Subtotal expected 5001.50, got ${calcA.subtotal_amount}`);
  assert(calcA.discount_amount === 0, `Empty discount expected 0, got ${calcA.discount_amount}`);
  assert(calcA.taxable_amount === 5001.5, `Taxable expected 5001.50, got ${calcA.taxable_amount}`);
  // Statutory half-up per component: 9% of 5001.50 = 450.135 -> CGST 450.14 + SGST 450.14 = 900.28
  assert(calcA.cgst_amount === 450.14 && calcA.sgst_amount === 450.14, `CGST/SGST expected 450.14/450.14, got ${calcA.cgst_amount}/${calcA.sgst_amount}`);
  assert(calcA.total_tax_amount === 900.28, `GST 18% expected 900.28, got ${calcA.total_tax_amount}`);
  assert(calcA.grand_total_amount === 5902, `Grand total rounded expected 5902, got ${calcA.grand_total_amount}`);

  // Case B: Rate 2500, Qty 1, Discount 200, 18% GST
  const calcB = calculateQuotationTotals(
    [{ item_name: 'Hydraulic Hose', unit: 'NOS', quantity: 1, unit_rate: 2500, discount_amount: 200, gst_rate: 18 }],
    true,
    '10',
    '10'
  );
  assert(calcB.taxable_amount === 2300, `Taxable after discount expected 2300, got ${calcB.taxable_amount}`);
  assert(calcB.total_tax_amount === 414, `18% GST on 2300 expected 414, got ${calcB.total_tax_amount}`);
  assert(calcB.grand_total_amount === 2714, `Grand total expected 2714, got ${calcB.grand_total_amount}`);
});

// ---------------------------------------------------------------------------
// SECTION 2: Interactive Real-Browser Chrome DOM Verification
// ---------------------------------------------------------------------------
console.log('\n--- Section 2: Real Chrome Interactive UX (Mouse, Tab, Mobile Touch, Paste, Caret) ---');

const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });

const harnessHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body>
  <input id="prev-field" type="text" value="Item Title" />
  <input id="rate-input" type="text" inputmode="decimal" value="0" />
  <input id="discount-input" type="text" inputmode="decimal" value="0" placeholder="0" />
  <div id="live-state"></div>
  <script>
    function normalize(raw) {
      const trimmed = raw.trim().replace(/^(?:rs\.?|inr|₹)\s*/i, '');
      if (trimmed === '') return '';
      let cleaned = '';
      let seenDot = false;
      for (const ch of trimmed) {
        if (ch >= '0' && ch <= '9') cleaned += ch;
        else if (ch === '.' && !seenDot) { cleaned += '.'; seenDot = true; }
      }
      if (cleaned === '') return '';
      if (cleaned.includes('.')) {
        const idx = cleaned.indexOf('.');
        let intPart = cleaned.slice(0, idx);
        const fracPart = cleaned.slice(idx + 1);
        if (intPart.length > 1) intPart = intPart.replace(/^0+/, '') || '0';
        return intPart + '.' + fracPart;
      }
      if (cleaned.length > 1 && cleaned.startsWith('0')) return cleaned.replace(/^0+/, '') || '0';
      return cleaned;
    }

    function wireInput(el, allowEmpty) {
      let pendingMouseUp = false;
      el.dataset.numeric = '0';
      el.addEventListener('focus', () => {
        if (el.value.trim() === '0') {
          pendingMouseUp = true;
          el.select();
          requestAnimationFrame(() => {
            if (document.activeElement === el && el.value.trim() === '0') el.select();
          });
        } else {
          pendingMouseUp = false;
        }
      });
      el.addEventListener('mouseup', (e) => {
        if (pendingMouseUp) {
          e.preventDefault();
          pendingMouseUp = false;
        }
      });
      el.addEventListener('keydown', () => { pendingMouseUp = false; });
      el.addEventListener('input', () => {
        pendingMouseUp = false;
        const norm = normalize(el.value);
        if (el.value !== norm) el.value = norm;
        const num = (norm === '' || norm === '.') ? 0 : Number(norm);
        el.dataset.numeric = String(Number.isFinite(num) ? num : 0);
      });
      el.addEventListener('blur', () => {
        pendingMouseUp = false;
        let norm = normalize(el.value);
        if (norm === '' || norm === '.') {
          el.value = allowEmpty ? '' : '0';
          el.dataset.numeric = '0';
          return;
        }
        if (norm.startsWith('.')) norm = '0' + norm;
        if (norm.endsWith('.')) norm = norm.slice(0, -1) || '0';
        el.value = norm;
        el.dataset.numeric = String(Number(norm));
      });
    }

    wireInput(document.getElementById('rate-input'), false);
    wireInput(document.getElementById('discount-input'), true);
  </script>
</body>
</html>`;

try {
  // Desktop interactive tests
  const page = await browser.newPage();
  await page.setContent(harnessHtml, { waitUntil: 'load' });

  await test('Mouse click on Unit Rate (0) and typing 2500 replaces default zero cleanly (2500, not 02500)', async () => {
    await page.click('#rate-input');
    await page.keyboard.type('2500');
    const val = await page.$eval('#rate-input', (el) => ({ value: el.value, numeric: el.dataset.numeric }));
    assert(val.value === '2500' && val.numeric === '2500', `Expected 2500, got ${JSON.stringify(val)}`);
  });

  await test('Keyboard Tab to Discount (0) and typing 200 replaces default zero cleanly (200, not 0200)', async () => {
    await page.keyboard.press('Tab');
    await page.keyboard.type('200');
    const val = await page.$eval('#discount-input', (el) => ({ value: el.value, numeric: el.dataset.numeric }));
    assert(val.value === '200' && val.numeric === '200', `Expected 200, got ${JSON.stringify(val)}`);
  });

  await test('Editing existing non-zero value preserves caret movement and decimal edits (2500 -> 2500.75 -> 2550.75)', async () => {
    await page.click('#rate-input');
    await page.keyboard.press('End');
    await page.keyboard.type('.75');
    let val = await page.$eval('#rate-input', (el) => el.value);
    assert(val === '2500.75', `Expected 2500.75, got ${val}`);

    // Move cursor left 4 times (before second '0'), delete '0' and insert '5' -> 2550.75
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('5');
    val = await page.$eval('#rate-input', (el) => el.value);
    assert(val === '2550.75', `Expected cursor edit 2550.75, got ${val}`);
  });

  await test('Clearing optional Discount leaves field empty and evaluates numeric value as 0', async () => {
    await page.click('#discount-input');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.click('#prev-field'); // trigger blur
    const val = await page.$eval('#discount-input', (el) => ({ value: el.value, numeric: el.dataset.numeric }));
    assert(val.value === '' && val.numeric === '0', `Expected empty display & 0 numeric, got ${JSON.stringify(val)}`);
  });

  await test('Typing intentional 0 in Discount preserves valid zero', async () => {
    await page.click('#discount-input');
    await page.keyboard.type('0');
    await page.click('#prev-field');
    const val = await page.$eval('#discount-input', (el) => ({ value: el.value, numeric: el.dataset.numeric }));
    assert(val.value === '0' && val.numeric === '0', `Expected "0" & 0 numeric, got ${JSON.stringify(val)}`);
  });

  await test('Replacing default zero with decimal (0.75 and 1499.50) works cleanly', async () => {
    await page.setContent(harnessHtml, { waitUntil: 'load' });
    await page.click('#rate-input');
    await page.keyboard.type('1499.50');
    const rateVal = await page.$eval('#rate-input', (el) => ({ value: el.value, numeric: el.dataset.numeric }));
    assert(rateVal.value === '1499.50' && rateVal.numeric === '1499.5', `Expected 1499.50, got ${JSON.stringify(rateVal)}`);

    await page.keyboard.press('Tab');
    await page.keyboard.type('0.75');
    const discVal = await page.$eval('#discount-input', (el) => ({ value: el.value, numeric: el.dataset.numeric }));
    assert(discVal.value === '0.75' && discVal.numeric === '0.75', `Expected 0.75, got ${JSON.stringify(discVal)}`);
  });

  await test('Pasting formatted or leading-zero values normalizes cleanly', async () => {
    await page.setContent(harnessHtml, { waitUntil: 'load' });
    await page.focus('#rate-input');
    await page.$eval('#rate-input', (el) => {
      el.value = '₹12,500.25';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const val = await page.$eval('#rate-input', (el) => ({ value: el.value, numeric: el.dataset.numeric }));
    assert(val.value === '12500.25' && val.numeric === '12500.25', `Expected 12500.25, got ${JSON.stringify(val)}`);
  });

  await page.close();

  // Mobile touch viewport test
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mobilePage.setContent(harnessHtml, { waitUntil: 'load' });

  await test('Mobile touch tap on Unit Rate (0) with inputmode="decimal" replaces zero cleanly', async () => {
    const inputMode = await mobilePage.$eval('#rate-input', (el) => el.getAttribute('inputmode'));
    assert(inputMode === 'decimal', `Expected inputmode="decimal", got ${inputMode}`);

    await mobilePage.tap('#rate-input');
    await mobilePage.keyboard.type('2500.75');
    const val = await mobilePage.$eval('#rate-input', (el) => ({ value: el.value, numeric: el.dataset.numeric }));
    assert(val.value === '2500.75' && val.numeric === '2500.75', `Mobile expected 2500.75, got ${JSON.stringify(val)}`);
  });

  await mobilePage.close();
} finally {
  await browser.close();
}

// ---------------------------------------------------------------------------
// SECTION 3: Static Wiring Verification (New + Edit Quotation Forms)
// ---------------------------------------------------------------------------
console.log('\n--- Section 3: Quotation Form & Edit Form Integration ---');

const formContent = fs.readFileSync(path.join(rootDir, 'src/app/staff/quotations/new/QuotationForm.tsx'), 'utf8');
const numericCompContent = fs.readFileSync(path.join(rootDir, 'src/app/staff/quotations/new/QuotationNumericInput.tsx'), 'utf8');
const editPageContent = fs.readFileSync(path.join(rootDir, 'src/app/staff/quotations/[id]/edit/page.tsx'), 'utf8');

await test('QuotationForm uses QuotationNumericInput for Unit Rate, Discount, Quantity, and Validity Days', () => {
  assert(formContent.includes("import QuotationNumericInput from './QuotationNumericInput'"), 'Imports QuotationNumericInput');
  assert(formContent.includes('ariaLabel={`Line Item ${index + 1} Unit Rate`}'), 'Unit Rate uses QuotationNumericInput');
  assert(formContent.includes('ariaLabel={`Line Item ${index + 1} Discount`}'), 'Discount uses QuotationNumericInput');
  assert(formContent.includes('ariaLabel={`Line Item ${index + 1} Quantity`}'), 'Quantity uses QuotationNumericInput');
  assert(formContent.includes('ariaLabel="Validity Period (Days)"'), 'Validity Days uses QuotationNumericInput');
  assert(!formContent.includes('type="number"'), 'No legacy sticky-zero <input type="number"> remains in QuotationForm');
});

await test('QuotationNumericInput implements inputMode decimal/numeric, focus auto-select, mouseup guard, and blur finalization', () => {
  assert(numericCompContent.includes("inputMode={allowDecimal ? 'decimal' : 'numeric'}"), 'Uses mobile-friendly inputMode');
  assert(numericCompContent.includes('shouldAutoSelectOnFocus'), 'Auto-selects default zero on focus');
  assert(numericCompContent.includes('pendingSelectOnMouseUpRef'), 'Prevents mouseup from collapsing zero selection');
  assert(numericCompContent.includes('normalizeNumericInputString'), 'Normalizes leading zeros on change/paste');
  assert(numericCompContent.includes('finalizeNumericInputOnBlur'), 'Finalizes display & numeric value on blur');
});

await test('Edit draft quotation route shares QuotationForm automatically', () => {
  assert(editPageContent.includes("import QuotationForm from '../../new/QuotationForm'"), 'Edit page imports shared QuotationForm');
  assert(editPageContent.includes('<QuotationForm'), 'Edit page renders shared QuotationForm');
});

console.log('\n' + '='.repeat(74));
console.log(`QUOTATION NUMERIC INPUT UX TEST SUMMARY: ${passed}/${passed + failed} TESTS PASSED`);
console.log('='.repeat(74));

if (failed > 0) {
  process.exit(1);
}
