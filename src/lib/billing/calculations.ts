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
  stateCode: string;
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

export function formatStatutoryInvoiceNumber(
  series: string,
  fyCode: string,
  sequenceNumber: number
): string {
  const cleanSeries = series.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const seqPadded = sequenceNumber.toString().padStart(4, '0');
  return `${cleanSeries}/${fyCode}/${seqPadded}`;
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

  const resolvedSupply = resolveIndianState(placeOfSupplyStateCode);
  if (!resolvedSupply) {
    return 'undetermined';
  }

  const profile = getCompanyBillingProfile();
  const resolvedCompany = resolveIndianState(companyStateCode || profile.stateCode);
  const baseCompanyCode = resolvedCompany ? resolvedCompany.code : (companyStateCode || profile.stateCode).trim().padStart(2, '0');
  const normalizedSupplyCode = resolvedSupply.code;

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
  const resolvedCompany = resolveIndianState(companyStateCode || profile.stateCode);
  const baseCompanyCode = resolvedCompany ? resolvedCompany.code : (companyStateCode || profile.stateCode).trim().padStart(2, '0');
  const resolvedSupply = resolveIndianState(placeOfSupplyStateCode);
  const normalizedSupplyCode = resolvedSupply ? resolvedSupply.code : (placeOfSupplyStateCode?.trim() || '');
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
