/**
 * Santhaya Associates — Authoritative Statutory Supplier Configuration
 * File: src/lib/billing/company-config.ts
 *
 * Authoritative, verified company statutory profile for Quotations, Invoicing, and GST Compliance.
 * Reflects verified registered business details in Motihari, Bihar (State Code 10).
 * Does not invent fake PAN, CIN, or banking credentials.
 */

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

/**
 * Returns formatted bank payment instructions.
 * If bank details are not configured in environment, returns safe instruction without fabricated accounts.
 */
export function getPaymentInstructions(profile = getCompanyBillingProfile()): string {
  if (profile.bankDetails.isConfigured) {
    return [
      `Beneficiary: ${profile.bankDetails.accountName}`,
      `Bank: ${profile.bankDetails.bankName}`,
      `Account No: ${profile.bankDetails.accountNumber}`,
      `IFSC Code: ${profile.bankDetails.ifscCode}`,
      profile.bankDetails.branchName ? `Branch: ${profile.bankDetails.branchName}` : null,
      profile.bankDetails.upiId ? `UPI ID: ${profile.bankDetails.upiId}` : null,
    ].filter(Boolean).join('\n');
  }

  return 'Bank transfer details provided upon quotation acceptance / formal contract execution.\nFor RTGS/NEFT remittance coordinates, contact accounts at heistofeverything@gmail.com.';
}

/**
 * Validates Indian Financial Year format and calculates active FY.
 * In India, FY runs from April 1 to March 31.
 * e.g. Oct 2026 -> FY "2026-27" (or code "26-27")
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
