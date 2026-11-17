/**
 * Santhaya Associates — Validated A4 Print-Layout Estimator & Terms Policy Helpers
 * File: src/lib/quotation/layout-estimator.ts
 *
 * Calibrated against actual Chrome A4 portrait PDF rendering (210mm × 297mm,
 * margins 8mm top/bottom and 10mm left/right, 9–10pt body typography).
 *
 * Purpose:
 * - Reliably predict whether a quotation will span 2 or more A4 pages based on
 *   actual content geometry (line-item counts, description wrapping, customer/project
 *   metadata, GST summary rows, terms clauses, 32mm stamp block, and footer),
 *   rather than relying on a naive fixed item-count threshold.
 * - Determine whether the current terms match the 6-Clause Standard, 10-Clause
 *   Comprehensive, or staff-customized terms so existing/custom terms are never
 *   overwritten without explicit confirmation.
 */

export interface LayoutEstimateItemInput {
  item_name?: string | null;
  description?: string | null;
  discount_amount?: number | string | null;
  gst_rate?: number | string | null;
  unit_rate?: number | string | null;
  quantity?: number | string | null;
}

export interface QuotationLayoutEstimateInput {
  items: LayoutEstimateItemInput[];
  termsConditions?: string | null;
  deliveryLocation?: string | null;
  customerAddress?: string | null;
  paymentTerms?: string | null;
  isGstApplicable?: boolean;
  isIntraState?: boolean;
  hasDiscount?: boolean;
}

export interface QuotationLayoutEstimateResult {
  estimatedPages: number;
  isMultiPage: boolean;
  estimatedHeightPx: number;
  singlePageCapacityPx: number;
  breakdown: {
    headerAndMetaPx: number;
    tablePx: number;
    summaryPx: number;
    termsPx: number;
    signatoryAndFooterPx: number;
  };
}

// A4 portrait at 96 DPI: 297mm = 1122.5px; minus 16mm (8mm top + 8mm bottom) = 281mm ≈ 1062px.
// Continuation capacity accounts for repeated <thead> and non-splittable row/summary/signatory blocks.
const A4_PRINTABLE_HEIGHT_PX = 1062;
const CONTINUATION_PAGE_CAPACITY_PX = 800;

function estimateWrappedLines(text: string | null | undefined, charsPerLine: number): number {
  if (!text || !text.trim()) return 0;
  const paragraphs = text.split(/\r?\n/);
  let totalLines = 0;
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      totalLines += 1;
    } else {
      totalLines += Math.max(1, Math.ceil(trimmed.length / charsPerLine));
    }
  }
  return totalLines;
}

/**
 * Estimates the A4 printed page count for a quotation based on its actual content geometry.
 */
export function estimateQuotationPageLayout(
  input: QuotationLayoutEstimateInput
): QuotationLayoutEstimateResult {
  const items = Array.isArray(input.items) ? input.items : [];
  const isGstApplicable = input.isGstApplicable ?? true;

  // 1. Company header (~78px) + Customer & Project grid (~98px base)
  const extraAddrLines = Math.max(0, estimateWrappedLines(input.customerAddress, 48) - 2);
  const extraDeliveryLines = Math.max(0, estimateWrappedLines(input.deliveryLocation, 38) - 1);
  const extraPaymentLines = Math.max(0, estimateWrappedLines(input.paymentTerms, 40) - 1);
  const headerAndMetaPx =
    78 + 98 + extraAddrLines * 14 + extraDeliveryLines * 14 + extraPaymentLines * 14;

  // 2. Items table header (~32px) + individual rows
  // Description column is 27% of usable A4 width when GST applies (~26 title chars / ~32 desc chars per line)
  // or 37% when Non-GST (~36 title chars / ~44 desc chars per line)
  const titleCharsPerLine = isGstApplicable ? 26 : 36;
  const descCharsPerLine = isGstApplicable ? 32 : 44;

  let tableRowsPx = 0;
  let anyDiscount = Boolean(input.hasDiscount);
  let anyFractionalTax = false;

  for (const item of items) {
    const titleLines = Math.max(1, estimateWrappedLines(item.item_name || 'Item', titleCharsPerLine));
    const descLines = estimateWrappedLines(item.description, descCharsPerLine);
    const discountAmt = Number(item.discount_amount || 0);
    if (discountAmt > 0) anyDiscount = true;

    const rate = Number(item.unit_rate || 0);
    const qty = Number(item.quantity || 0);
    const gstRate = Number(item.gst_rate || 0);
    if (isGstApplicable && gstRate > 0 && rate > 0 && qty > 0) {
      const taxable = Math.max(0, rate * qty - discountAmt);
      const rawTax = Math.round(taxable * gstRate) / 100;
      if (Math.round(Math.abs(rawTax) * 100) % 100 !== 0) {
        anyFractionalTax = true;
      }
    }

    const textHeight = titleLines * 14 + (descLines > 0 ? descLines * 12.5 + 2 : 0);
    const discountHeight = discountAmt > 0 ? 11 : 0;
    // Vertical padding + border
    const rowHeight = Math.max(32, textHeight + 13, 30 + discountHeight);
    tableRowsPx += rowHeight;
  }

  const taxRoundingNotePx = anyFractionalTax ? 16 : 0;
  const tablePx = 32 + tableRowsPx + taxRoundingNotePx;

  // 3. Financial summary + Amount in Words + Bank Details (2-column print-avoid-break grid)
  const leftSummaryPx = 152; // Amount in Words (~60px) + gap (6px) + Bank Details (~86px)
  const rightSummaryPx =
    (isGstApplicable ? (input.isIntraState !== false ? 155 : 138) : 108) +
    (anyDiscount ? 16 : 0);
  const summaryPx = Math.max(leftSummaryPx, rightSummaryPx) + 14;

  // 4. Terms & Conditions (2-column grid when > 4 clauses, 1-column when <= 4)
  const clauses = (input.termsConditions || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let termsBodyPx = 0;
  if (clauses.length > 4) {
    // 2-column grid: ~68 chars per column line at 9pt
    for (let i = 0; i < clauses.length; i += 2) {
      const leftLines = Math.max(1, estimateWrappedLines(clauses[i], 68));
      const rightLines = clauses[i + 1] ? Math.max(1, estimateWrappedLines(clauses[i + 1], 68)) : 0;
      termsBodyPx += Math.max(leftLines, rightLines) * 14 + 4;
    }
  } else {
    for (const clause of clauses) {
      termsBodyPx += Math.max(1, estimateWrappedLines(clause, 128)) * 14 + 4;
    }
  }
  const termsPx = clauses.length > 0 ? 32 + termsBodyPx : 0;

  // 5. Company Authorization Block (32mm round stamp + border + signature line ≈ 162px) + Footer (~46px)
  const signatoryAndFooterPx = 162 + 46;

  const estimatedHeightPx = Math.round(
    headerAndMetaPx + tablePx + summaryPx + termsPx + signatoryAndFooterPx
  );

  // Page count estimation calibrated to Chrome A4 print pagination
  let estimatedPages = 1;
  if (estimatedHeightPx > A4_PRINTABLE_HEIGHT_PX) {
    const remainingHeight = estimatedHeightPx - A4_PRINTABLE_HEIGHT_PX;
    estimatedPages = 1 + Math.ceil(remainingHeight / CONTINUATION_PAGE_CAPACITY_PX);
  }

  return {
    estimatedPages,
    isMultiPage: estimatedPages >= 2,
    estimatedHeightPx,
    singlePageCapacityPx: A4_PRINTABLE_HEIGHT_PX,
    breakdown: {
      headerAndMetaPx: Math.round(headerAndMetaPx),
      tablePx: Math.round(tablePx),
      summaryPx: Math.round(summaryPx),
      termsPx: Math.round(termsPx),
      signatoryAndFooterPx,
    },
  };
}

function normalizeTermsText(text: string | null | undefined): string {
  return (text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Classifies the active quotation terms as 'standard_6', 'comprehensive_10', 'empty', or 'custom'.
 */
export function classifyQuotationTerms(
  termsText: string | null | undefined,
  standard6Text: string,
  comprehensive10Text: string
): 'standard_6' | 'comprehensive_10' | 'empty' | 'custom' {
  const normalized = normalizeTermsText(termsText);
  if (!normalized) return 'empty';

  const standard6 = normalizeTermsText(standard6Text);
  const comprehensive10 = normalizeTermsText(comprehensive10Text);

  if (normalized === comprehensive10) return 'comprehensive_10';
  if (normalized === standard6) return 'standard_6';

  // Also check against validity-day variants (e.g. if validityDays was edited after terms loaded)
  const stripValidityNumber = (s: string) =>
    s.replace(/valid for \d+ calendar days/i, 'valid for N calendar days');
  if (stripValidityNumber(normalized) === stripValidityNumber(comprehensive10)) {
    return 'comprehensive_10';
  }
  if (stripValidityNumber(normalized) === stripValidityNumber(standard6)) {
    return 'standard_6';
  }

  return 'custom';
}
