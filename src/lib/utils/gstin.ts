/**
 * Santhaya Associates — Indian GSTIN & PAN Utilities
 * File: src/lib/utils/gstin.ts
 *
 * Implements:
 * 1. Statutory 15-character GSTIN structure verification
 * 2. Official Indian Modulo 36 checksum calculation & verification
 * 3. 10-character Indian PAN extraction (characters 3-12)
 * 4. Client & server GSTIN/PAN conflict detection
 *
 * No external paid verification APIs or unverified claims.
 */

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Calculates the 15th character checksum of an Indian GSTIN using
 * the official Modulo 36 algorithm.
 *
 * @param gstin14 - The first 14 characters of the GSTIN
 * @returns The expected 15th checksum character (0-9 or A-Z)
 */
export function calculateGstinChecksum(gstin14: string): string {
  if (!gstin14 || gstin14.length !== 14) return '';
  const clean = gstin14.toUpperCase();
  let sum = 0;

  for (let i = 0; i < 14; i++) {
    const charIndex = GSTIN_CHARS.indexOf(clean[i]);
    if (charIndex === -1) return '';

    // Alternating weights: Position 1 (index 0) = 1, Position 2 (index 1) = 2, etc.
    const factor = i % 2 === 0 ? 1 : 2;
    const product = charIndex * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }

  const remainder = sum % 36;
  const checkCode = (36 - remainder) % 36;
  return GSTIN_CHARS[checkCode];
}

/**
 * Validates both structure and the 15th Modulo 36 checksum character of an Indian GSTIN.
 *
 * Structure:
 * - 2 digits (State Code)
 * - 5 letters (PAN letters)
 * - 4 digits (PAN numbers)
 * - 1 letter (PAN last letter)
 * - 1 alphanumeric (entity code)
 * - 1 character 'Z' (default)
 * - 1 alphanumeric (checksum)
 */
export function validateGstinChecksum(gstin: string): boolean {
  if (!gstin || typeof gstin !== 'string') return false;
  const clean = gstin.trim().toUpperCase();

  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(clean)) {
    return false;
  }

  const expectedChecksum = calculateGstinChecksum(clean.slice(0, 14));
  return clean[14] === expectedChecksum;
}

/**
 * Validates the statutory 10-character Indian PAN format.
 * Format: 5 uppercase letters, 4 digits, 1 uppercase letter.
 */
export function validatePanFormat(pan: string): boolean {
  if (!pan || typeof pan !== 'string') return false;
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase());
}

/**
 * Extracts and returns the 10-character PAN embedded in a valid 15-character GSTIN.
 * Returns null if GSTIN is malformed or fails the checksum test.
 */
export function extractPanFromGstin(gstin: string): string | null {
  if (!gstin || typeof gstin !== 'string') return null;
  const clean = gstin.trim().toUpperCase();

  if (!validateGstinChecksum(clean)) {
    return null;
  }

  const pan = clean.slice(2, 12);
  return validatePanFormat(pan) ? pan : null;
}

/**
 * Validates GSTIN and PAN combination, checking for format compliance,
 * checksum correctness, and ensuring that any manually entered PAN
 * strictly matches the PAN embedded in the GSTIN (characters 3-12).
 */
export function validateGstinAndPanMatch(
  gstin?: string | null,
  pan?: string | null
): { valid: boolean; derivedPan?: string; error?: string } {
  const cleanGstin = gstin?.trim().toUpperCase() || null;
  const cleanPan = pan?.trim().toUpperCase() || null;

  // Neither provided: valid
  if (!cleanGstin && !cleanPan) {
    return { valid: true };
  }

  // Only PAN provided
  if (!cleanGstin && cleanPan) {
    if (!validatePanFormat(cleanPan)) {
      return {
        valid: false,
        error: 'Invalid PAN format. Must be 10 alphanumeric characters (e.g. ABCDE1234F).',
      };
    }
    return { valid: true };
  }

  // GSTIN provided
  if (cleanGstin) {
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGstin)) {
      return {
        valid: false,
        error: 'Invalid GSTIN format. Expected 15-character statutory format.',
      };
    }

    if (!validateGstinChecksum(cleanGstin)) {
      return {
        valid: false,
        error: 'Invalid GSTIN checksum character. Please verify the 15-digit GSTIN.',
      };
    }

    const derivedPan = cleanGstin.slice(2, 12);

    // If PAN is also provided, check for conflicts
    if (cleanPan && cleanPan !== derivedPan) {
      return {
        valid: false,
        error: `Statutory Conflict: The entered PAN (${cleanPan}) does not match characters 3–12 of the GSTIN (${derivedPan}).`,
      };
    }

    return { valid: true, derivedPan };
  }

  return { valid: true };
}

