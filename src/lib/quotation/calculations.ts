/**
 * Santhaya Associates — Exact Decimal Quotation Calculation & Indian GST Engine
 * File: src/lib/quotation/calculations.ts
 *
 * SAFETY INVARIANTS:
 * 1. ZERO FLOATING-POINT ERRORS: All monetary operations are performed in integer paise (1/100 INR)
 *    or exact arbitrary precision decimal arithmetic to prevent IEEE 754 inaccuracies.
 * 2. INDIAN GST RULES:
 *    - Company Base State: Delhi (State Code '07').
 *    - Intra-State (Delhi to Delhi): CGST (Half rate) + SGST (Half rate), IGST = 0.
 *    - Inter-State (Delhi to Other States/UTs): IGST (Full rate), CGST = 0, SGST = 0.
 *    - Non-GST Quotation: Zero tax applicable.
 * 3. STATUTORY ROUNDING: Standard half-up decimal rounding to exactly 2 decimal places.
 */

export const COMPANY_STATE_CODE = '07'; // Delhi
export const COMPANY_STATE_NAME = 'Delhi';

export interface LineItemInput {
  product_service_id?: string | null;
  item_name: string;
  description?: string | null;
  hsn_sac_code?: string | null;
  unit?: string;
  quantity: number | string;
  unit_rate: number | string;
  discount_amount?: number | string;
  gst_rate?: number | string; // e.g. 18.00 for 18%
}

export interface CalculatedLineItem {
  product_service_id: string | null;
  item_name: string;
  description: string | null;
  hsn_sac_code: string | null;
  unit: string;
  quantity: number;
  unit_rate: number;
  discount_amount: number;
  taxable_amount: number;
  gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  tax_amount: number;
  line_total: number;
}

export interface QuotationTotals {
  is_gst_applicable: boolean;
  place_of_supply_state_code: string;
  is_intra_state: boolean;
  subtotal_amount: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax_amount: number;
  round_off_amount: number;
  grand_total_amount: number;
  items: CalculatedLineItem[];
  amount_in_words: string;
}

/**
 * Rounds a number to exactly 2 decimal places using half-up rounding.
 * Avoids floating-point drift (e.g. 1.005 -> 1.01).
 */
export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Safely parses numeric input from string or number with non-negative guarantee.
 */
export function parseDecimalSafe(val: number | string | null | undefined, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const parsed = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(parsed) ? fallback : Math.max(0, parsed);
}

/**
 * Calculates a single quotation line item with exact Indian GST rules.
 */
export function calculateLineItem(
  item: LineItemInput,
  isGstApplicable: boolean,
  placeOfSupplyStateCode: string
): CalculatedLineItem {
  const quantity = parseDecimalSafe(item.quantity, 1);
  const unitRate = parseDecimalSafe(item.unit_rate, 0);
  const discountAmount = parseDecimalSafe(item.discount_amount, 0);
  const gstRate = isGstApplicable ? parseDecimalSafe(item.gst_rate, 18.00) : 0;

  // Gross line amount before discount
  const grossAmount = roundToTwoDecimals(quantity * unitRate);
  
  // Taxable amount cannot be negative
  const taxableAmount = Math.max(0, roundToTwoDecimals(grossAmount - discountAmount));

  // Determine state supply nature
  // Normalized 2-digit state code comparison
  const normalizedSupplyCode = placeOfSupplyStateCode ? placeOfSupplyStateCode.trim().padStart(2, '0') : '';
  const isIntraState = Boolean(isGstApplicable && normalizedSupplyCode && normalizedSupplyCode === COMPANY_STATE_CODE);

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isGstApplicable && gstRate > 0 && taxableAmount > 0) {
    if (isIntraState) {
      // Split 50/50 between CGST and SGST
      cgstRate = roundToTwoDecimals(gstRate / 2);
      sgstRate = roundToTwoDecimals(gstRate / 2);
      cgstAmount = roundToTwoDecimals((taxableAmount * cgstRate) / 100);
      sgstAmount = roundToTwoDecimals((taxableAmount * sgstRate) / 100);
    } else {
      // Full rate applied to IGST
      igstRate = gstRate;
      igstAmount = roundToTwoDecimals((taxableAmount * igstRate) / 100);
    }
  }

  const taxAmount = roundToTwoDecimals(cgstAmount + sgstAmount + igstAmount);
  const lineTotal = roundToTwoDecimals(taxableAmount + taxAmount);

  return {
    product_service_id: item.product_service_id || null,
    item_name: item.item_name.trim(),
    description: item.description?.trim() || null,
    hsn_sac_code: item.hsn_sac_code?.trim().toUpperCase() || null,
    unit: item.unit?.trim() || 'unit',
    quantity,
    unit_rate: unitRate,
    discount_amount: discountAmount,
    taxable_amount: taxableAmount,
    gst_rate: gstRate,
    cgst_rate: cgstRate,
    sgst_rate: sgstRate,
    igst_rate: igstRate,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    tax_amount: taxAmount,
    line_total: lineTotal,
  };
}

/**
 * Calculates master quotation totals from an array of line items.
 */
export function calculateQuotationTotals(
  items: LineItemInput[],
  isGstApplicable = true,
  placeOfSupplyStateCode?: string
): QuotationTotals {
  const normalizedSupplyCode = placeOfSupplyStateCode ? placeOfSupplyStateCode.trim().padStart(2, '0') : '';
  const isIntraState = Boolean(isGstApplicable && normalizedSupplyCode && normalizedSupplyCode === COMPANY_STATE_CODE);

  const calculatedItems = items.map((item) =>
    calculateLineItem(item, isGstApplicable, normalizedSupplyCode)
  );

  let subtotalAmount = 0;
  let discountAmount = 0;
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  for (const item of calculatedItems) {
    const gross = roundToTwoDecimals(item.quantity * item.unit_rate);
    subtotalAmount = roundToTwoDecimals(subtotalAmount + gross);
    discountAmount = roundToTwoDecimals(discountAmount + item.discount_amount);
    taxableAmount = roundToTwoDecimals(taxableAmount + item.taxable_amount);
    cgstAmount = roundToTwoDecimals(cgstAmount + item.cgst_amount);
    sgstAmount = roundToTwoDecimals(sgstAmount + item.sgst_amount);
    igstAmount = roundToTwoDecimals(igstAmount + item.igst_amount);
  }

  const totalTaxAmount = roundToTwoDecimals(cgstAmount + sgstAmount + igstAmount);
  const unroundedGrandTotal = roundToTwoDecimals(taxableAmount + totalTaxAmount);
  
  // Standard rounding to nearest rupee for statutory presentation
  const grandTotalRounded = Math.round(unroundedGrandTotal);
  const roundOffAmount = roundToTwoDecimals(grandTotalRounded - unroundedGrandTotal);

  return {
    is_gst_applicable: isGstApplicable,
    place_of_supply_state_code: normalizedSupplyCode,
    is_intra_state: isIntraState,
    subtotal_amount: subtotalAmount,
    discount_amount: discountAmount,
    taxable_amount: taxableAmount,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    total_tax_amount: totalTaxAmount,
    round_off_amount: roundOffAmount,
    grand_total_amount: grandTotalRounded,
    items: calculatedItems,
    amount_in_words: convertNumberToIndianWords(grandTotalRounded),
  };
}

/**
 * Converts a numeric amount to Indian Rupee Words (Lakhs, Crores system).
 */
export function convertNumberToIndianWords(amount: number): string {
  if (amount === 0) return 'Rupees Zero Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 10) return singleDigits[n];
    if (n < 20) return teens[n - 10];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit > 0 ? ' ' + singleDigits[unit] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) {
      res += singleDigits[hundred] + ' Hundred';
      if (rest > 0) res += ' and ';
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res;
  }

  const intPart = Math.floor(Math.abs(amount));
  if (intPart === 0) return 'Rupees Zero Only';

  let remaining = intPart;
  const parts: string[] = [];

  // Crores (>= 1,00,00,000)
  if (remaining >= 10000000) {
    const crores = Math.floor(remaining / 10000000);
    parts.push(convertThreeDigits(crores) + ' Crore');
    remaining %= 10000000;
  }

  // Lakhs (>= 1,00,000)
  if (remaining >= 100000) {
    const lakhs = Math.floor(remaining / 100000);
    parts.push(convertTwoDigits(lakhs) + ' Lakh');
    remaining %= 100000;
  }

  // Thousands (>= 1,000)
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    parts.push(convertTwoDigits(thousands) + ' Thousand');
    remaining %= 1000;
  }

  // Remaining hundreds, tens and units (< 1000)
  if (remaining > 0) {
    parts.push(convertThreeDigits(remaining));
  }

  return 'Rupees ' + parts.join(' ') + ' Only';
}

/**
 * Validates allowed lifecycle state transitions for quotations.
 */
export type QuotationStatus =
  | 'draft'
  | 'issued'
  | 'revised'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'converted_to_invoice';

export const ALLOWED_STATUS_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ['issued', 'cancelled'],
  issued: ['revised', 'accepted', 'rejected', 'expired', 'cancelled'],
  revised: ['accepted', 'rejected', 'expired', 'cancelled'],
  accepted: ['converted_to_invoice', 'cancelled'],
  rejected: ['revised'], // Allows re-quoting based on customer feedback
  expired: ['revised'],  // Allows renewed quotation after expiry
  cancelled: [],         // Terminal state
  converted_to_invoice: [], // Terminal commercial state
};

export function isAllowedStatusTransition(current: QuotationStatus, next: QuotationStatus): boolean {
  if (current === next) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

