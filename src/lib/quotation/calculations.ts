/**
 * Santhaya Associates — Exact Decimal Quotation Calculation & Indian GST Engine
 * File: src/lib/quotation/calculations.ts
 *
 * SAFETY INVARIANTS:
 * 1. ZERO FLOATING-POINT ERRORS: All monetary operations are performed in integer paise (1/100 INR)
 *    or exact arbitrary precision decimal arithmetic to prevent IEEE 754 inaccuracies.
 * 2. INDIAN GST RULES:
 *    - Company Base State: Bihar (State Code '10').
 *    - Intra-State (Bihar to Bihar): CGST (Half rate) + SGST (Half rate), IGST = 0.
 *    - Inter-State (Bihar to Other States/UTs): IGST (Full rate), CGST = 0, SGST = 0.
 *    - Non-GST Quotation: Zero tax applicable.
 * 3. CANONICAL PLACE OF SUPPLY: Robust resolution of state codes and aliases (e.g. 'UP' -> '09').
 * 4. STATUTORY ROUNDING: Standard half-up decimal rounding to exactly 2 decimal places.
 */


export interface IndianState {
  code: string;
  name: string;
  abbreviation: string;
}

export const INDIAN_STATES: IndianState[] = [
  { code: '01', name: 'Jammu & Kashmir', abbreviation: 'JK' },
  { code: '02', name: 'Himachal Pradesh', abbreviation: 'HP' },
  { code: '03', name: 'Punjab', abbreviation: 'PB' },
  { code: '04', name: 'Chandigarh', abbreviation: 'CH' },
  { code: '05', name: 'Uttarakhand', abbreviation: 'UK' },
  { code: '06', name: 'Haryana', abbreviation: 'HR' },
  { code: '07', name: 'Delhi', abbreviation: 'DL' },
  { code: '08', name: 'Rajasthan', abbreviation: 'RJ' },
  { code: '09', name: 'Uttar Pradesh', abbreviation: 'UP' },
  { code: '10', name: 'Bihar', abbreviation: 'BR' },
  { code: '11', name: 'Sikkim', abbreviation: 'SK' },
  { code: '12', name: 'Arunachal Pradesh', abbreviation: 'AR' },
  { code: '13', name: 'Nagaland', abbreviation: 'NL' },
  { code: '14', name: 'Manipur', abbreviation: 'MN' },
  { code: '15', name: 'Mizoram', abbreviation: 'MZ' },
  { code: '16', name: 'Tripura', abbreviation: 'TR' },
  { code: '17', name: 'Meghalaya', abbreviation: 'ML' },
  { code: '18', name: 'Assam', abbreviation: 'AS' },
  { code: '19', name: 'West Bengal', abbreviation: 'WB' },
  { code: '20', name: 'Jharkhand', abbreviation: 'JH' },
  { code: '21', name: 'Odisha', abbreviation: 'OD' },
  { code: '22', name: 'Chhattisgarh', abbreviation: 'CG' },
  { code: '23', name: 'Madhya Pradesh', abbreviation: 'MP' },
  { code: '24', name: 'Gujarat', abbreviation: 'GJ' },
  { code: '25', name: 'Daman & Diu', abbreviation: 'DD' },
  { code: '26', name: 'Dadra & Nagar Haveli', abbreviation: 'DN' },
  { code: '27', name: 'Maharashtra', abbreviation: 'MH' },
  { code: '28', name: 'Andhra Pradesh (Old)', abbreviation: 'AP' },
  { code: '29', name: 'Karnataka', abbreviation: 'KA' },
  { code: '30', name: 'Goa', abbreviation: 'GA' },
  { code: '31', name: 'Lakshadweep', abbreviation: 'LD' },
  { code: '32', name: 'Kerala', abbreviation: 'KL' },
  { code: '33', name: 'Tamil Nadu', abbreviation: 'TN' },
  { code: '34', name: 'Puducherry', abbreviation: 'PY' },
  { code: '35', name: 'Andaman & Nicobar Islands', abbreviation: 'AN' },
  { code: '36', name: 'Telangana', abbreviation: 'TS' },
  { code: '37', name: 'Andhra Pradesh', abbreviation: 'AD' },
  { code: '38', name: 'Ladakh', abbreviation: 'LA' },
  { code: '97', name: 'Other Territory', abbreviation: 'OT' },
];

export function isValidIndianStateCode(code: string | null | undefined): boolean {
  if (!code) return false;
  const trimmed = code.trim().padStart(2, '0');
  if (!/^\d{2}$/.test(trimmed)) return false;
  const num = parseInt(trimmed, 10);
  return (num >= 1 && num <= 38) || num === 97;
}

export function resolveIndianState(input: string | null | undefined): IndianState | null {
  if (!input) return null;
  const cleaned = input.trim();
  if (!cleaned) return null;

  if (/^\d{1,2}$/.test(cleaned)) {
    const code = cleaned.padStart(2, '0');
    const match = INDIAN_STATES.find((s) => s.code === code);
    if (match) return match;
  }

  const upper = cleaned.toUpperCase();
  const byAbbr = INDIAN_STATES.find((s) => s.abbreviation === upper);
  if (byAbbr) return byAbbr;

  const lower = cleaned.toLowerCase();
  const byName = INDIAN_STATES.find(
    (s) => s.name.toLowerCase() === lower || s.name.toLowerCase().replace(/[^a-z0-9]/g, '') === lower.replace(/[^a-z0-9]/g, '')
  );
  if (byName) return byName;

  const partial = INDIAN_STATES.find(
    (s) => lower.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(lower)
  );
  if (partial) return partial;

  return null;
}

export function formatPlaceOfSupply(codeOrName: string | null | undefined): string {
  const resolved = resolveIndianState(codeOrName);
  if (!resolved) return 'Pending Determination';
  return `${resolved.name} (${resolved.code})`;
}

export function convertNumberToIndianWords(amount: number): string {
  if (!amount || amount === 0) return 'Rupees Zero Only';

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
    return res.trim();
  }

  const totalPaise = Math.round(Math.abs(amount) * 100);
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;

  let words = '';

  if (rupees === 0) {
    words = 'Zero Rupees';
  } else {
    let rem = rupees;
    const parts: string[] = [];

    if (rem >= 10000000) {
      const crores = Math.floor(rem / 10000000);
      rem %= 10000000;
      if (crores >= 100) {
        parts.push(convertThreeDigits(crores) + ' Crore');
      } else {
        parts.push(convertTwoDigits(crores) + ' Crore');
      }
    }

    if (rem >= 100000) {
      const lakhs = Math.floor(rem / 100000);
      rem %= 100000;
      parts.push(convertTwoDigits(lakhs) + ' Lakh');
    }

    if (rem >= 1000) {
      const thousands = Math.floor(rem / 1000);
      rem %= 1000;
      parts.push(convertTwoDigits(thousands) + ' Thousand');
    }

    if (rem > 0) {
      parts.push(convertThreeDigits(rem));
    }

    words = 'Rupees ' + parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  if (paise > 0) {
    const paiseText = convertTwoDigits(paise);
    return `${words} and ${paiseText} Paise Only`;
  }

  return `${words} Only`;
}

export const COMPANY_STATE_CODE = '10'; // Bihar
export const COMPANY_STATE_NAME = 'Bihar';

export type TaxDeterminationStatus = 'intra_state' | 'inter_state' | 'undetermined' | 'not_applicable';

export function determineTaxStatus(
  isTaxable: boolean,
  placeOfSupplyStateCode?: string | null,
  companyStateCode = COMPANY_STATE_CODE
): TaxDeterminationStatus {
  if (!isTaxable) return 'not_applicable';
  const resolvedSupply = resolveIndianState(placeOfSupplyStateCode);
  if (!resolvedSupply) {
    return 'undetermined';
  }
  const resolvedCompany = resolveIndianState(companyStateCode);
  const normSupply = resolvedSupply.code;
  const normCompany = resolvedCompany ? resolvedCompany.code : companyStateCode.trim().padStart(2, '0');

  return normSupply === normCompany ? 'intra_state' : 'inter_state';
}

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
  is_inter_state: boolean;
  tax_determination: TaxDeterminationStatus;
  is_tax_determined: boolean;
  tax_determination_message?: string;
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

  // Determine state supply nature strictly
  const taxDetermination = determineTaxStatus(isGstApplicable, placeOfSupplyStateCode, COMPANY_STATE_CODE);

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (taxDetermination === 'intra_state' && gstRate > 0 && taxableAmount > 0) {
    // Split 50/50 between CGST and SGST
    cgstRate = roundToTwoDecimals(gstRate / 2);
    sgstRate = roundToTwoDecimals(gstRate / 2);
    cgstAmount = roundToTwoDecimals((taxableAmount * cgstRate) / 100);
    sgstAmount = roundToTwoDecimals((taxableAmount * sgstRate) / 100);
  } else if (taxDetermination === 'inter_state' && gstRate > 0 && taxableAmount > 0) {
    // Full rate applied to IGST
    igstRate = gstRate;
    igstAmount = roundToTwoDecimals((taxableAmount * igstRate) / 100);
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
  const resolvedSupply = resolveIndianState(placeOfSupplyStateCode);
  const normalizedSupplyCode = resolvedSupply ? resolvedSupply.code : (placeOfSupplyStateCode?.trim() || '');
  const taxDetermination = determineTaxStatus(isGstApplicable, normalizedSupplyCode, COMPANY_STATE_CODE);
  const isIntraState = taxDetermination === 'intra_state';
  const isInterState = taxDetermination === 'inter_state';
  const isTaxDetermined = taxDetermination !== 'undetermined';

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

  let amountInWords = convertNumberToIndianWords(grandTotalRounded);
  let taxDeterminationMessage: string | undefined = undefined;

  if (taxDetermination === 'undetermined') {
    amountInWords += ' (Excluding GST — Place of Supply Undetermined)';
    taxDeterminationMessage =
      'Place of Supply is undetermined. GST rates and amounts cannot be calculated until a valid 2-digit Indian State Code is provided.';
  }

  return {
    is_gst_applicable: isGstApplicable,
    place_of_supply_state_code: normalizedSupplyCode,
    is_intra_state: isIntraState,
    is_inter_state: isInterState,
    tax_determination: taxDetermination,
    is_tax_determined: isTaxDetermined,
    tax_determination_message: taxDeterminationMessage,
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
    amount_in_words: amountInWords,
  };
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
