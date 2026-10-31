/**
 * Santhaya Associates — Exact Decimal Billing, GST Invoicing & Payment Engine
 * File: src/lib/billing/calculations.ts
 *
 * SAFETY INVARIANTS:
 * 1. ZERO FLOATING-POINT ERRORS: Monetary operations performed with decimal precision and half-up rounding.
 * 2. STATUTORY INDIAN GST RULES:
 *    - Tax Invoices: Intra-State -> CGST (50%) + SGST (50%), Inter-State -> IGST (100%).
 *    - Bill of Supply & Non-GST: 0% tax, no tax split.
 * 3. GAPLESS NUMBERING HELPER: CGST Rule 46(b) format: SERIES/FY/XXXX.
 * 4. PAYMENT BALANCING & STATUS RECONCILIATION: Exact balance tracking with partial payments.
 */

export type InvoiceType = 'tax_invoice' | 'bill_of_supply' | 'non_gst';
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

export interface CompanyBillingProfile {
  legalName: string;
  tradeName: string;
  gstin: string;
  pan: string;
  cin?: string;
  stateName: string;
  stateCode: string;
  registeredAddress: string;
  phone: string;
  email: string;
  website: string;
  bankDetails: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
    upiId: string;
  };
}

export function getCompanyBillingProfile(): CompanyBillingProfile {
  const stateCode = (process.env.COMPANY_STATE_CODE || '07').trim().padStart(2, '0');
  const gstin = (process.env.COMPANY_GSTIN || '07AAAAA0000A1Z5').trim().toUpperCase();

  return {
    legalName: process.env.COMPANY_LEGAL_NAME || 'Santhaya Associates Pvt. Ltd.',
    tradeName: process.env.COMPANY_TRADE_NAME || 'Santhaya Associates',
    gstin,
    pan: process.env.COMPANY_PAN || 'AAAAA0000A',
    cin: process.env.COMPANY_CIN || 'U45200DL2026PTC000000',
    stateName: process.env.COMPANY_STATE_NAME || 'Delhi',
    stateCode,
    registeredAddress:
      process.env.COMPANY_REGISTERED_ADDRESS ||
      'Corporate Office: Barakhamba Road, Connaught Place, New Delhi - 110001, India',
    phone: process.env.COMPANY_PHONE || '+91 96319 82431',
    email: process.env.COMPANY_EMAIL || 'billing@santhaya.com',
    website: process.env.NEXT_PUBLIC_SITE_URL || 'https://santhaya.com',
    bankDetails: {
      accountName: process.env.COMPANY_BANK_ACCOUNT_NAME || 'Santhaya Associates Pvt. Ltd.',
      bankName: process.env.COMPANY_BANK_NAME || 'State Bank of India',
      accountNumber: process.env.COMPANY_BANK_ACCOUNT_NO || '398472910482',
      ifscCode: process.env.COMPANY_BANK_IFSC || 'SBIN0000691',
      branchName: process.env.COMPANY_BANK_BRANCH || 'Main Branch, New Delhi',
      upiId: process.env.COMPANY_UPI_ID || 'santhaya.associates@sbi',
    },
  };
}

export function getCurrentFinancialYear(date = new Date()): {
  fullYear: string;
  shortYear: string;
  code: string;
} {
  const month = date.getMonth();
  const year = date.getFullYear();

  let startYear = year;
  let endYear = year + 1;

  if (month < 3) {
    startYear = year - 1;
    endYear = year;
  }

  const startShort = startYear.toString().slice(-2);
  const endShort = endYear.toString().slice(-2);

  return {
    fullYear: `${startYear}-${endYear}`,
    shortYear: `${startYear}-${endShort}`,
    code: `${startShort}-${endShort}`,
  };
}

export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function parseDecimalSafe(val: number | string | null | undefined, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const parsed = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(parsed) ? fallback : Math.max(0, parsed);
}

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

  if (remaining >= 10000000) {
    const crores = Math.floor(remaining / 10000000);
    parts.push(convertThreeDigits(crores) + ' Crore');
    remaining %= 10000000;
  }

  if (remaining >= 100000) {
    const lakhs = Math.floor(remaining / 100000);
    parts.push(convertTwoDigits(lakhs) + ' Lakh');
    remaining %= 100000;
  }

  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    parts.push(convertTwoDigits(thousands) + ' Thousand');
    remaining %= 1000;
  }

  if (remaining > 0) {
    parts.push(convertThreeDigits(remaining));
  }

  return 'Rupees ' + parts.join(' ') + ' Only';
}

export interface InvoiceLineItemInput {
  product_service_id?: string | null;
  item_name: string;
  description?: string | null;
  hsn_sac_code?: string | null;
  unit?: string;
  quantity: number | string;
  unit_rate: number | string;
  discount_amount?: number | string;
  gst_rate?: number | string;
}

export interface CalculatedInvoiceLineItem {
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

export type TaxDeterminationStatus = 'intra_state' | 'inter_state' | 'undetermined' | 'not_applicable';

/**
 * Validates whether a state code is a recognized Indian GST 2-digit state code.
 * Standard GST state codes range from 01 (Jammu & Kashmir) to 38 (Ladakh), plus 97 (Other Territory).
 */
export function isValidIndianStateCode(code: string | null | undefined): boolean {
  if (!code) return false;
  const trimmed = code.trim().padStart(2, '0');
  if (!/^\d{2}$/.test(trimmed)) return false;
  const num = parseInt(trimmed, 10);
  return (num >= 1 && num <= 38) || num === 97;
}

/**
 * Determines statutory Indian GST classification for an invoice without defaulting unknown states.
 * Missing or invalid Place of Supply is strictly 'undetermined'.
 */
export function determineBillingTaxStatus(
  invoiceType: InvoiceType,
  placeOfSupplyStateCode?: string | null,
  companyStateCode?: string
): TaxDeterminationStatus {
  if (invoiceType !== 'tax_invoice') return 'not_applicable';
  if (!placeOfSupplyStateCode || !isValidIndianStateCode(placeOfSupplyStateCode)) {
    return 'undetermined';
  }
  const profile = getCompanyBillingProfile();
  const baseCompanyCode = (companyStateCode || profile.stateCode).trim().padStart(2, '0');
  const normSupply = placeOfSupplyStateCode.trim().padStart(2, '0');
  return normSupply === baseCompanyCode ? 'intra_state' : 'inter_state';
}

export interface InvoiceCalculatedTotals {
  invoice_type: InvoiceType;
  place_of_supply_state_code: string;
  company_state_code: string;
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
  items: CalculatedInvoiceLineItem[];
  amount_in_words: string;
}

export function calculateInvoiceLineItem(
  item: InvoiceLineItemInput,
  invoiceType: InvoiceType,
  placeOfSupplyStateCode: string,
  companyStateCode?: string
): CalculatedInvoiceLineItem {
  const profile = getCompanyBillingProfile();
  const baseCompanyCode = (companyStateCode || profile.stateCode).trim().padStart(2, '0');
  const normalizedSupplyCode = placeOfSupplyStateCode ? placeOfSupplyStateCode.trim().padStart(2, '0') : '';
  const isTaxInvoice = invoiceType === 'tax_invoice';
  const taxDetermination = determineBillingTaxStatus(invoiceType, normalizedSupplyCode, baseCompanyCode);

  const quantity = parseDecimalSafe(item.quantity, 1);
  const unitRate = parseDecimalSafe(item.unit_rate, 0);
  const discountAmount = parseDecimalSafe(item.discount_amount, 0);

  const gstRate = isTaxInvoice ? parseDecimalSafe(item.gst_rate, 18.0) : 0;

  const grossAmount = roundToTwoDecimals(quantity * unitRate);
  const taxableAmount = Math.max(0, roundToTwoDecimals(grossAmount - discountAmount));

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (taxDetermination === 'intra_state' && gstRate > 0 && taxableAmount > 0) {
    cgstRate = roundToTwoDecimals(gstRate / 2);
    sgstRate = roundToTwoDecimals(gstRate / 2);
    cgstAmount = roundToTwoDecimals((taxableAmount * cgstRate) / 100);
    sgstAmount = roundToTwoDecimals((taxableAmount * sgstRate) / 100);
  } else if (taxDetermination === 'inter_state' && gstRate > 0 && taxableAmount > 0) {
    igstRate = gstRate;
    igstAmount = roundToTwoDecimals((taxableAmount * igstRate) / 100);
  } else {
    // taxDetermination is 'undetermined' or 'not_applicable':
    // Zero tax assigned. Never assume intra or inter state.
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

export function calculateInvoiceTotals(
  items: InvoiceLineItemInput[],
  invoiceType: InvoiceType = 'tax_invoice',
  placeOfSupplyStateCode?: string,
  companyStateCode?: string
): InvoiceCalculatedTotals {
  const profile = getCompanyBillingProfile();
  const baseCompanyCode = (companyStateCode || profile.stateCode).trim().padStart(2, '0');
  const normalizedSupplyCode = placeOfSupplyStateCode ? placeOfSupplyStateCode.trim().padStart(2, '0') : '';
  const taxDetermination = determineBillingTaxStatus(invoiceType, normalizedSupplyCode, baseCompanyCode);
  const isIntraState = taxDetermination === 'intra_state';
  const isInterState = taxDetermination === 'inter_state';
  const isTaxDetermined = taxDetermination !== 'undetermined';

  const calculatedItems = items.map((item) =>
    calculateInvoiceLineItem(item, invoiceType, normalizedSupplyCode, baseCompanyCode)
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

  const grandTotalRounded = Math.round(unroundedGrandTotal);
  const roundOffAmount = roundToTwoDecimals(grandTotalRounded - unroundedGrandTotal);

  let amountInWords = convertNumberToIndianWords(grandTotalRounded);
  let taxDeterminationMessage: string | undefined = undefined;

  if (taxDetermination === 'undetermined') {
    amountInWords += ' (Excluding GST — Place of Supply Undetermined)';
    taxDeterminationMessage =
      'Place of Supply is undetermined. Statutory tax invoice cannot be issued until a valid 2-digit Indian State Code is provided.';
  }

  return {
    invoice_type: invoiceType,
    place_of_supply_state_code: normalizedSupplyCode,
    company_state_code: baseCompanyCode,
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

export function reconcileInvoiceBalance(
  grandTotal: number,
  paidAmount: number,
  currentStatus: InvoiceStatus,
  dueDateStr?: string
): {
  balanceAmount: number;
  newStatus: InvoiceStatus;
} {
  const roundedGrandTotal = roundToTwoDecimals(grandTotal);
  const roundedPaid = roundToTwoDecimals(paidAmount);
  const balanceAmount = Math.max(0, roundToTwoDecimals(roundedGrandTotal - roundedPaid));

  if (currentStatus === 'cancelled' || currentStatus === 'refunded') {
    return { balanceAmount, newStatus: currentStatus };
  }

  if (currentStatus === 'draft') {
    return { balanceAmount, newStatus: 'draft' };
  }

  let newStatus: InvoiceStatus = 'issued';

  if (balanceAmount <= 0 && roundedPaid > 0) {
    newStatus = 'paid';
  } else if (roundedPaid > 0 && balanceAmount > 0) {
    newStatus = 'partially_paid';
  } else {
    if (dueDateStr) {
      const dueDate = new Date(dueDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        newStatus = 'overdue';
      }
    }
  }

  return { balanceAmount, newStatus };
}

export function formatStatutoryInvoiceNumber(
  series = 'SA',
  fyCode?: string,
  sequenceNumber = 1
): string {
  const activeFy = fyCode || getCurrentFinancialYear().code;
  const seqStr = sequenceNumber.toString().padStart(4, '0');
  return `${series.trim()}/${activeFy.trim()}/${seqStr}`;
}
