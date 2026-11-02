/**
 * Santhaya Associates — Indian Mobile Number Validation & Normalization Utility
 * File: src/lib/utils/phone.ts
 *
 * Implements strict Indian statutory mobile phone parsing:
 * 1. Supports 10-digit national numbers beginning with [6-9].
 * 2. Supports prefixes: +91, 91, 0.
 * 3. Normalizes to canonical international format '91XXXXXXXXXX' for WhatsApp wa.me links.
 * 4. Normalizes to readable display format '+91 XXXXX XXXXX'.
 * 5. Rejects non-Indian, malformed, or incomplete numbers with clear error messages.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  raw: string;
  normalized: string | null;          // '919430986713' (for wa.me)
  normalizedWaPhone: string | null;    // '919430986713' (alias for wa.me)
  normalized10Digits: string | null;   // '9430986713' (for DB storage)
  displayFormatted: string | null;     // '+91 94309 86713'
  formattedDisplay: string | null;     // '+91 94309 86713' (alias)
  error?: string;
}

/**
 * Validates and normalizes an Indian mobile phone number.
 */
export function validateIndianMobile(input: string | null | undefined): PhoneValidationResult {
  const raw = (input || '').trim();

  if (!raw) {
    return {
      isValid: false,
      raw,
      normalized: null,
      normalizedWaPhone: null,
      normalized10Digits: null,
      displayFormatted: null,
      formattedDisplay: null,
      error: 'Phone number is required.',
    };
  }

  // Strip all non-digit characters except leading '+'
  const cleaned = raw.replace(/[\s\-\(\)\.]/g, '');

  let digits = cleaned;
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  }

  // If prefixed with 91 and 12 digits total
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  // At this point, digits must be exactly 10 digits
  if (digits.length !== 10) {
    return {
      isValid: false,
      raw,
      normalized: null,
      normalizedWaPhone: null,
      normalized10Digits: null,
      displayFormatted: null,
      formattedDisplay: null,
      error: `Invalid length: Expected 10-digit Indian mobile number, got ${digits.length} digits.`,
    };
  }

  // Indian mobile numbers must start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(digits)) {
    return {
      isValid: false,
      raw,
      normalized: null,
      normalizedWaPhone: null,
      normalized10Digits: null,
      displayFormatted: null,
      formattedDisplay: null,
      error: 'Invalid prefix: Indian mobile numbers must begin with 6, 7, 8, or 9.',
    };
  }

  // Must be strictly 10 numeric characters
  if (!/^\d{10}$/.test(digits)) {
    return {
      isValid: false,
      raw,
      normalized: null,
      normalizedWaPhone: null,
      normalized10Digits: null,
      displayFormatted: null,
      formattedDisplay: null,
      error: 'Invalid format: Phone number must contain digits only.',
    };
  }

  const normalized = `91${digits}`;
  const displayFormatted = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;

  return {
    isValid: true,
    raw,
    normalized,
    normalizedWaPhone: normalized,
    normalized10Digits: digits,
    displayFormatted,
    formattedDisplay: displayFormatted,
  };
}

/**
 * Returns formatted Indian phone number or fallback string.
 */
export function formatIndianMobile(input: string | null | undefined): string {
  const res = validateIndianMobile(input);
  return res.isValid && res.displayFormatted ? res.displayFormatted : (input || '—');
}
