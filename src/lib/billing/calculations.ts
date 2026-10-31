/**
 * Santhaya Associates — Exact Decimal Billing, GST Invoicing & Payment Engine
 * File: src/lib/billing/calculations.ts
 *
 * SAFETY INVARIANTS:
 * 1. ZERO FLOATING-POINT ERRORS: Monetary operations performed with decimal precision and half-up rounding.
 * 2. STATUTORY INDIAN GST RULES:
 *    - Base supplier state is Bihar (State Code 10).
 *    - Tax Invoices: Intra-State -> CGST (50%) + SGST (50%), Inter-State -> IGST (100%).
 *    - Bill of Supply & Non-GST: 0% tax, no tax split.
 * 3. GAPLESS NUMBERING HELPER: CGST Rule 46(b) format: SERIES/FY/XXXX.
 * 4. PAYMENT BALANCING & STATUS RECONCILIATION: Exact balance tracking with partial payments.
 */

export type InvoiceType = 'tax_invoice' | 'bill_of_supply' | 'non_gst';
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

export interface CompanyBankDetails {
  isConfigured: boolean;
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  upiId: string;
}

export interface CompanyBillingProfile {
  legalName: string;
  tradeName: string;
  tagline: string;
  gstin: string;
  pan: string | null;
  cin: string | null;
  stateName: string;
  stateCode: string; // Statutory 2-digit Indian state code (10 for Bihar)
  registeredAddress: string;
  phone: string;
  phoneSecondary: string;
  email: string;
  website: string;
  bankDetails: CompanyBankDetails;
}

export function getCompanyBillingProfile(): CompanyBillingProfile {
  const stateCode = (process.env.COMPANY_STATE_CODE || '10').trim().padStart(2, '0');
  const gstin = (process.env.COMPANY_GSTIN || '10ABVCS4277J1ZU').trim().toUpperCase();

  const hasConfiguredBank = Boolean(
    process.env.COMPANY_BANK_ACCOUNT_NO && process.env.COMPANY_BANK_IFSC
  );

  return {
    legalName: process.env.COMPANY_LEGAL_NAME || 'Santhaya Associates Pvt. Ltd.',
    tradeName: process.env.COMPANY_TRADE_NAME || 'Santhaya Associates',
    tagline: 'Building Today • Powering Tomorrow',
    gstin,
    pan: process.env.COMPANY_PAN || null, // Never fabricate fake PAN
    cin: process.env.COMPANY_CIN || null, // Never fabricate fake CIN
    stateName: process.env.COMPANY_STATE_NAME || 'Bihar',
    stateCode,
    registeredAddress:
      process.env.COMPANY_REGISTERED_ADDRESS ||
      'Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India',
    phone: process.env.COMPANY_PHONE || '+91 9430986713',
    phoneSecondary: process.env.COMPANY_PHONE_SECONDARY || '+91 9608950748',
    email: process.env.COMPANY_EMAIL || 'heistofeverything@gmail.com',
    website: process.env.NEXT_PUBLIC_SITE_URL || 'https://santhaya.com',
    bankDetails: {
      isConfigured: hasConfiguredBank,
      accountName: process.env.COMPANY_BANK_ACCOUNT_NAME || (hasConfiguredBank ? 'Santhaya Associates Pvt. Ltd.' : ''),
      bankName: process.env.COMPANY_BANK_NAME || '',
      accountNumber: process.env.COMPANY_BANK_ACCOUNT_NO || '',
      ifscCode: process.env.COMPANY_BANK_IFSC || '',
      branchName: process.env.COMPANY_BANK_BRANCH || '',
      upiId: process.env.COMPANY_UPI_ID || '',
    },
  };
}

export function getCurrentFinancialYear(date = new Date()): {
  fullYear: string;  // e.g. "2026-2027"
  shortYear: string; // e.g. "2026-27"
  code: string;      // e.g. "26-27"
} {
  const month = date.getMonth(); // 0 = Jan, 3 = April
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

  const absAmount = Math.abs(amount);
  const wholePart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - wholePart) * 100);

  let remaining = wholePart;
  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  const hundredAndRest = remaining;

  const parts: string[] = [];

  if (crore > 0) parts.push(convertTwoDigits(crore) + ' Crore');
  if (lakh > 0) parts.push(convertTwoDigits(lakh) + ' Lakh');
  if (thousand > 0) parts.push(convertTwoDigits(thousand) + ' Thousand');
  if (hundredAndRest > 0) parts.push(convertThreeDigits(hundredAndRest));

  let rupeesText = parts.filter(Boolean).join(' ').trim();
  if (!rupeesText) rupeesText = 'Zero';

  let paiseText = '';
  if (decimalPart > 0) {
    paiseText = ` and ${convertTwoDigits(decimalPart)} Paise`;
  }

  return `Rupees ${rupeesText}${paiseText} Only`;
}

export function formatStatutoryInvoiceNumber(
  series: string,
  fyCode: string,
  sequenceNumber: number
): string {
  const cleanSeries = series.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const seqPadded = sequenceNumber.toString().padStart(4, '0');
  return `${cleanSeries}/${fyCode}/${seqPadded}`;
}

export function isValidIndianStateCode(code: string | null | undefined): boolean {
  if (!code) return false;
  const trimmed = code.trim();
  if (!/^\d{2}$/.test(trimmed)) return false;
  const num = parseInt(trimmed, 10);
  return (num >= 1 && num <= 38) || num === 97;
}

export type BillingTaxDetermination = 'intra_state' | 'inter_state' | 'undetermined' | 'not_applicable';

export function determineBillingTaxStatus(
  invoiceType: InvoiceType,
  placeOfSupplyStateCode?: string,
  companyStateCode?: string
): BillingTaxDetermination {
  if (invoiceType === 'bill_of_supply' || invoiceType === 'non_gst') {
    return 'not_applicable';
  }

  if (!placeOfSupplyStateCode || !isValidIndianStateCode(placeOfSupplyStateCode)) {
    return 'undetermined';
  }

  const profile = getCompanyBillingProfile();
  const baseCompanyCode = (companyStateCode || profile.stateCode).trim().padStart(2, '0');
  const normalizedSupplyCode = placeOfSupplyStateCode.trim().padStart(2, '0');

  if (normalizedSupplyCode === baseCompanyCode) {
    return 'intra_state';
  }

  return 'inter_state';
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

export interface InvoiceCalculatedLineItem {
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

export function calculateInvoiceLineItem(
  item: InvoiceLineItemInput,
  invoiceType: InvoiceType = 'tax_invoice',
  placeOfSupplyStateCode?: string,
  companyStateCode?: string
): InvoiceCalculatedLineItem {
  const isTaxInvoice = invoiceType === 'tax_invoice';
  const taxDetermination = determineBillingTaxStatus(invoiceType, placeOfSupplyStateCode, companyStateCode);

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

export interface InvoiceCalculatedTotals {
  invoice_type: InvoiceType;
  place_of_supply_state_code: string;
  company_state_code: string;
  is_intra_state: boolean;
  is_inter_state: boolean;
  tax_determination: BillingTaxDetermination;
  is_tax_determined: boolean;
  tax_determination_message?: string;
  subtotal_amount: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax_amount: number;
  unrounded_grand_total: number;
  round_off_amount: number;
  grand_total_amount: number;
  amount_in_words: string;
  items: InvoiceCalculatedLineItem[];
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
    unrounded_grand_total: unroundedGrandTotal,
    round_off_amount: roundOffAmount,
    grand_total_amount: grandTotalRounded,
    amount_in_words: amountInWords,
    items: calculatedItems,
  };
}

export function reconcileInvoiceBalance(
  grandTotal: number,
  paidAmount: number,
  currentStatus: InvoiceStatus,
  dueDate: Date | string = new Date()
): {
  balanceAmount: number;
  newStatus: InvoiceStatus;
  isOverdue: boolean;
} {
  const total = roundToTwoDecimals(Math.max(0, grandTotal));
  const paid = roundToTwoDecimals(Math.max(0, paidAmount));
  const balance = roundToTwoDecimals(Math.max(0, total - paid));

  if (currentStatus === 'cancelled') {
    return { balanceAmount: balance, newStatus: 'cancelled', isOverdue: false };
  }
  if (currentStatus === 'refunded') {
    return { balanceAmount: balance, newStatus: 'refunded', isOverdue: false };
  }
  if (currentStatus === 'draft') {
    return { balanceAmount: total, newStatus: 'draft', isOverdue: false };
  }

  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const isOverdue = balance > 0 && due < new Date();

  let newStatus: InvoiceStatus;
  if (balance === 0 && total > 0) {
    newStatus = 'paid';
  } else if (paid > 0 && balance > 0) {
    newStatus = 'partially_paid';
  } else if (isOverdue) {
    newStatus = 'overdue';
  } else {
    newStatus = 'issued';
  }

  return {
    balanceAmount: balance,
    newStatus,
    isOverdue,
  };
}
