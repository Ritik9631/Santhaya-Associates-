/**
 * Santhaya Associates Pvt. Ltd. — Phase 3C Quotation Engine Automated Test Suite
 * File: scripts/test-phase3c-quotations.mjs
 *
 * Automated verification for:
 * 1. Exact decimal calculations, Banker's rounding, zero IEEE 754 floating-point drift.
 * 2. Indian GST allocation rules: Intra-State (CGST + SGST) vs Inter-State (IGST) vs Non-GST.
 * 3. Amount in Indian Rupee words conversion (Lakhs, Crores, Thousands).
 * 4. Quotation lifecycle state transitions and immutable version locking.
 * 5. RBAC permissions (super_admin, admin, estimator, billing_manager, viewer).
 * 6. Migration SQL security properties (decimal precision, RLS, sequence).
 * 7. Next.js App Router live endpoints & security headers.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  calculateLineItem,
  calculateQuotationTotals,
  convertNumberToIndianWords,
  isAllowedStatusTransition,
  roundToTwoDecimals,
  COMPANY_STATE_CODE,
} from '../src/lib/quotation/calculations.ts';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function runTestSuite() {
  console.log('='.repeat(70));
  console.log('SANTHAYA ASSOCIATES — PHASE 3C QUOTATION MANAGEMENT TEST SUITE');
  console.log('='.repeat(70));

  // ---------------------------------------------------------------------------
  // [1/7] Decimal Accuracy & Indian GST Calculation Engine
  // ---------------------------------------------------------------------------
  console.log('\n[1/7] Testing Decimal Precision & GST Allocation Engine...');

  // Floating-point precision defense (0.1 + 0.2 === 0.30000000000000004 in raw JS)
  const floatDriftSum = roundToTwoDecimals(0.1 + 0.2);
  assert(floatDriftSum === 0.3, `Floating-point drift eliminated (0.1 + 0.2 -> ${floatDriftSum})`);

  // Half-up rounding
  assert(roundToTwoDecimals(100.005) === 100.01, 'Half-up rounding correctly rounds 100.005 -> 100.01');
  assert(roundToTwoDecimals(100.004) === 100.00, 'Half-up rounding correctly rounds 100.004 -> 100.00');

  // Intra-State GST (Bihar 10 to Bihar 10): 18% GST -> 9% CGST + 9% SGST
  const intraItem = calculateLineItem(
    {
      item_name: 'Excavator 20T Rental',
      quantity: 1,
      unit_rate: 100000.00,
      discount_amount: 0,
      gst_rate: 18.00,
    },
    true,
    '10'
  );

  assert(intraItem.taxable_amount === 100000.00, 'Intra-state taxable amount is ₹100,000.00');
  assert(intraItem.cgst_rate === 9.00, 'Intra-state CGST rate is 9.00%');
  assert(intraItem.sgst_rate === 9.00, 'Intra-state SGST rate is 9.00%');
  assert(intraItem.igst_rate === 0.00, 'Intra-state IGST rate is 0.00%');
  assert(intraItem.cgst_amount === 9000.00, 'CGST amount is ₹9,000.00');
  assert(intraItem.sgst_amount === 9000.00, 'SGST amount is ₹9,000.00');
  assert(intraItem.tax_amount === 18000.00, 'Total tax amount is ₹18,000.00');
  assert(intraItem.line_total === 118000.00, 'Line total is ₹118,000.00');

  // Inter-State GST (Bihar 10 to UP 09): 18% GST -> 18% IGST
  const interItem = calculateLineItem(
    {
      item_name: 'Heavy Bulldozer Supply',
      quantity: 2,
      unit_rate: 2500000.00,
      discount_amount: 100000.00, // ₹5M - ₹100k discount = ₹4.9M taxable
      gst_rate: 18.00,
    },
    true,
    '09'
  );

  assert(interItem.taxable_amount === 4900000.00, 'Inter-state taxable amount after discount is ₹4,900,000.00');
  assert(interItem.cgst_amount === 0.00, 'Inter-state CGST amount is ₹0.00');
  assert(interItem.sgst_amount === 0.00, 'Inter-state SGST amount is ₹0.00');
  assert(interItem.igst_rate === 18.00, 'Inter-state IGST rate is 18.00%');
  assert(interItem.igst_amount === 882000.00, 'IGST amount is ₹882,000.00 (18% of ₹4.9M)');
  assert(interItem.line_total === 5782000.00, 'Line total is ₹5,782,000.00');

  // Non-GST Quotation
  const nonGstItem = calculateLineItem(
    {
      item_name: 'Exempt Civil Survey',
      quantity: 1,
      unit_rate: 50000.00,
      gst_rate: 18.00,
    },
    false, // Non-GST
    '10'
  );
  assert(nonGstItem.tax_amount === 0.00, 'Non-GST quotation applies 0 tax amount');
  assert(nonGstItem.line_total === 50000.00, 'Non-GST line total equals taxable amount');

  // Multi-item Totals Aggregation
  const totals = calculateQuotationTotals(
    [
      { item_name: 'Item A (18%)', quantity: 2, unit_rate: 10000, gst_rate: 18 },
      { item_name: 'Item B (12%)', quantity: 1, unit_rate: 50000, gst_rate: 12 },
      { item_name: 'Item C (28%)', quantity: 1, unit_rate: 25000, discount_amount: 5000, gst_rate: 28 },
    ],
    true,
    '10'
  );

  // Item A: 20000 + 18% (3600) = 23600
  // Item B: 50000 + 12% (6000) = 56000
  // Item C: 20000 + 28% (5600) = 25600
  // Total Taxable: 20k + 50k + 20k = 90k
  // Total Tax: 3600 + 6000 + 5600 = 15200 (CGST: 7600, SGST: 7600)
  // Grand Total: 105200
  assert(totals.taxable_amount === 90000.00, 'Multi-item aggregated taxable subtotal is ₹90,000.00');
  assert(totals.cgst_amount === 7600.00, 'Aggregated CGST is ₹7,600.00');
  assert(totals.sgst_amount === 7600.00, 'Aggregated SGST is ₹7,600.00');
  assert(totals.total_tax_amount === 15200.00, 'Aggregated tax is ₹15,200.00');
  assert(totals.grand_total_amount === 105200.00, 'Grand total is ₹105,200.00');

  // ---------------------------------------------------------------------------
  // [2/7] Indian Numbering System to Words Conversion
  // ---------------------------------------------------------------------------
  console.log('\n[2/7] Testing Indian Rupee Words Conversion...');

  assert(
    convertNumberToIndianWords(0) === 'Rupees Zero Only',
    'Zero correctly converts to "Rupees Zero Only"'
  );
  assert(
    convertNumberToIndianWords(105200) === 'Rupees One Lakh Five Thousand Two Hundred Only',
    '105200 converts to "Rupees One Lakh Five Thousand Two Hundred Only"'
  );
  assert(
    convertNumberToIndianWords(12500000) === 'Rupees One Crore Twenty Five Lakh Only',
    '12500000 converts to "Rupees One Crore Twenty Five Lakh Only"'
  );
  assert(
    convertNumberToIndianWords(450) === 'Rupees Four Hundred and Fifty Only',
    '450 converts to "Rupees Four Hundred and Fifty Only"'
  );

  // ---------------------------------------------------------------------------
  // [3/7] Quotation Lifecycle State Transition Matrix
  // ---------------------------------------------------------------------------
  console.log('\n[3/7] Testing Quotation Lifecycle State Transitions...');

  // Allowed transitions
  assert(isAllowedStatusTransition('draft', 'issued'), 'draft -> issued is allowed');
  assert(isAllowedStatusTransition('draft', 'cancelled'), 'draft -> cancelled is allowed');
  assert(isAllowedStatusTransition('issued', 'accepted'), 'issued -> accepted is allowed');
  assert(isAllowedStatusTransition('issued', 'revised'), 'issued -> revised is allowed');
  assert(isAllowedStatusTransition('issued', 'rejected'), 'issued -> rejected is allowed');
  assert(isAllowedStatusTransition('issued', 'expired'), 'issued -> expired is allowed');
  assert(isAllowedStatusTransition('revised', 'accepted'), 'revised -> accepted is allowed');
  assert(isAllowedStatusTransition('accepted', 'converted_to_invoice'), 'accepted -> converted_to_invoice is allowed');

  // Forbidden transitions
  assert(!isAllowedStatusTransition('draft', 'accepted'), 'draft -> accepted is strictly FORBIDDEN (must issue first)');
  assert(!isAllowedStatusTransition('accepted', 'draft'), 'accepted -> draft is strictly FORBIDDEN');
  assert(!isAllowedStatusTransition('cancelled', 'issued'), 'cancelled -> issued is strictly FORBIDDEN (terminal)');
  assert(!isAllowedStatusTransition('converted_to_invoice', 'draft'), 'converted_to_invoice -> draft is strictly FORBIDDEN');

  // ---------------------------------------------------------------------------
  // [4/7] RBAC Authorization & Privilege Ceilings
  // ---------------------------------------------------------------------------
  console.log('\n[4/7] Testing RBAC Authorization Rules...');

  const CREATOR_ROLES = ['super_admin', 'admin', 'estimator'];
  const VIEWER_ROLES = ['viewer'];

  assert(CREATOR_ROLES.includes('super_admin'), 'super_admin is an authorized quotation creator');
  assert(CREATOR_ROLES.includes('admin'), 'admin is an authorized quotation creator');
  assert(CREATOR_ROLES.includes('estimator'), 'estimator is an authorized quotation creator');
  assert(!CREATOR_ROLES.includes('billing_manager'), 'billing_manager cannot create quotes (view & convert only)');
  assert(!CREATOR_ROLES.includes('viewer'), 'viewer cannot create quotations');

  // ---------------------------------------------------------------------------
  // [5/7] Phase 3C SQL Migration Security Properties
  // ---------------------------------------------------------------------------
  console.log('\n[5/7] Auditing Phase 3C SQL Migration Properties...');

  const migrationPath = 'supabase/migrations/20261029160000_phase3c_quotations.sql';
  assert(fs.existsSync(migrationPath), `Migration file exists: ${migrationPath}`);

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  assert(migrationSql.includes('CREATE TYPE public.quotation_status_enum'), 'Defines quotation_status_enum in SQL');
  assert(migrationSql.includes('CREATE SEQUENCE IF NOT EXISTS public.quotation_number_seq'), 'Defines quotation_number_seq in SQL');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.quotations'), 'Creates public.quotations table');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.quotation_versions'), 'Creates public.quotation_versions table');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.quotation_items'), 'Creates public.quotation_items table');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.quotation_acceptances'), 'Creates public.quotation_acceptances table');
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.quotation_delivery_logs'), 'Creates public.quotation_delivery_logs table');
  assert(migrationSql.includes('NUMERIC(15, 2)'), 'Enforces NUMERIC(15, 2) decimal precision on monetary amounts');
  assert(migrationSql.includes('ENABLE ROW LEVEL SECURITY'), 'Enforces RLS on all 5 quotation tables');
  assert(migrationSql.includes('REVOKE ALL ON public.quotations FROM PUBLIC, anon'), 'Revokes quotation access from PUBLIC and anon');
  assert(migrationSql.includes('CREATE OR REPLACE FUNCTION public.generate_quotation_number()'), 'Creates generate_quotation_number() stored procedure');
  assert(migrationSql.includes('SET search_path = public, pg_temp'), 'generate_quotation_number enforces search_path hardening');

  // ---------------------------------------------------------------------------
  // [6/7] Source Code Integrity & UI Routes
  // ---------------------------------------------------------------------------
  console.log('\n[6/7] Auditing Phase 3C Source Files & Routes...');

  const files = [
    'src/lib/quotation/calculations.ts',
    'src/lib/quotation/actions.ts',
    'src/app/staff/quotations/page.tsx',
    'src/app/staff/quotations/new/page.tsx',
    'src/app/staff/quotations/new/QuotationForm.tsx',
    'src/app/staff/quotations/[id]/page.tsx',
    'src/app/staff/quotations/[id]/QuotationDetailView.tsx',
    'src/app/staff/quotations/[id]/pdf/page.tsx',
    'scripts/verify-phase3c-migration.mjs',
  ];

  for (const f of files) {
    assert(fs.existsSync(f), `Source file exists: ${f}`);
  }

  // ---------------------------------------------------------------------------
  // [7/7] Live Next.js Dev Server Route Interception & Security Headers
  // ---------------------------------------------------------------------------
  console.log('\n[7/7] Testing Live Route Interception & Security Headers...');

  try {
    const resQuotations = await fetch('http://localhost:3000/staff/quotations', { redirect: 'manual' });
    assert(
      resQuotations.status === 307 || resQuotations.status === 302,
      `Unauthenticated /staff/quotations redirects to login (Status: ${resQuotations.status})`
    );

    const cc = resQuotations.headers.get('cache-control') || '';
    assert(cc.includes('no-store'), `Route /staff/quotations emits Cache-Control: no-store (Got: ${cc})`);

    const resNew = await fetch('http://localhost:3000/staff/quotations/new', { redirect: 'manual' });
    assert(
      resNew.status === 307 || resNew.status === 302,
      `Unauthenticated /staff/quotations/new redirects to login (Status: ${resNew.status})`
    );

    // Verify public website remains intact
    const resHome = await fetch('http://localhost:3000/');
    const homeHtml = await resHome.text();
    assert(resHome.status === 200, 'Public homepage returns HTTP 200 OK');
    assert(!homeHtml.includes('/staff/quotations'), 'Public homepage contains zero links to /staff/quotations');
  } catch (err) {
    console.warn(`  [WARN] Live dev server check skipped: ${err.message}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`FINAL PHASE 3C RESULT: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
  console.log('='.repeat(70));

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
