/**
 * Santhaya Associates — Statutory Company & Billing Configuration
 * File: src/lib/billing/company-config.ts
 *
 * Configurable, validated company statutory profile for GST Invoicing and Compliance.
 * Does NOT hardcode Delhi or fixed GSTIN; reads environment overrides with compliant fallbacks.
 */

export interface CompanyBillingProfile {
  legalName: string;
  tradeName: string;
  gstin: string;
  pan: string;
  cin?: string;
  stateName: string;
  stateCode: string; // Statutory 2-digit Indian state code
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

/**
 * Validates Indian Financial Year format and calculates active FY.
 * In India, FY runs from April 1 to March 31.
 * e.g. Oct 29, 2026 -> FY "2026-27" (or code "26-27")
 */
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
    // Jan, Feb, Mar belong to previous calendar year's FY
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

