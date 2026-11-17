/**
 * Santhaya Associates — Quotation Numeric Input Normalization Utilities
 * File: src/lib/utils/numeric-input.ts
 *
 * Pure, framework-agnostic helpers for numeric form inputs (Unit Rate, Discount,
 * Quantity, Validity Days) to prevent sticky-zero bugs ("02500", "0200") across
 * desktop mouse clicks, keyboard Tab navigation, clipboard paste, and mobile touch
 * keyboards while preserving exact decimal values and intentional zeros.
 */

export interface NormalizeNumericOptions {
  allowDecimal?: boolean;
}

export interface FinalizeNumericOptions {
  allowDecimal?: boolean;
  allowEmpty?: boolean;
  defaultValue?: number;
  min?: number;
  max?: number;
}

/**
 * Normalizes a live user input string for non-negative numeric fields:
 * - Strips currency symbols, commas, whitespace, and non-numeric characters (paste-safe).
 * - Preserves empty string "" while editing (so staff can clear fields naturally).
 * - Preserves intentional "0", "0.", "0.75", ".75", and valid decimals like "2500.75".
 * - Eliminates unintended leading zeros: "02500" -> "2500", "0200" -> "200", "00" -> "0", "00.75" -> "0.75".
 */
export function normalizeNumericInputString(
  raw: string,
  options: NormalizeNumericOptions = {}
): string {
  const { allowDecimal = true } = options;

  if (typeof raw !== 'string') return '';
  // Strip leading currency prefixes (e.g. "₹", "Rs.", "Rs", "INR") before scanning for decimals
  const trimmed = raw.trim().replace(/^(?:rs\.?|inr|₹)\s*/i, '');
  if (trimmed === '') return '';

  // Keep only digits (and first decimal point when allowDecimal is true)
  let cleaned = '';
  let seenDecimal = false;

  for (const ch of trimmed) {
    if (ch >= '0' && ch <= '9') {
      cleaned += ch;
    } else if (allowDecimal && ch === '.' && !seenDecimal) {
      cleaned += '.';
      seenDecimal = true;
    }
  }

  if (cleaned === '') return '';

  if (allowDecimal && cleaned.includes('.')) {
    const dotIndex = cleaned.indexOf('.');
    let intPart = cleaned.slice(0, dotIndex);
    const fracPart = cleaned.slice(dotIndex + 1);

    // Collapse multiple leading zeros before decimal point ("00.75" -> "0.75", "02500.75" -> "2500.75")
    if (intPart.length > 1) {
      intPart = intPart.replace(/^0+/, '') || '0';
    }

    return `${intPart}.${fracPart}`;
  }

  // Integer-only path: strip unintended leading zeros while keeping a single "0"
  if (cleaned.length > 1 && cleaned.startsWith('0')) {
    return cleaned.replace(/^0+/, '') || '0';
  }

  return cleaned;
}

/**
 * Parses a live or normalized numeric string into a finite non-negative number.
 * Empty string "" and standalone "." evaluate cleanly to `fallback` (default 0).
 */
export function parseNumericInputValue(raw: string, fallback = 0): number {
  const normalized = normalizeNumericInputString(raw, { allowDecimal: true });
  if (normalized === '' || normalized === '.') {
    return fallback;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

/**
 * Finalizes the display string and numeric value when the field loses focus (onBlur).
 * - Cleans dangling decimal points ("2500." -> "2500", ".75" -> "0.75").
 * - Allows optional fields (e.g. Discount) to remain visually empty "" while resolving to 0.
 * - Preserves intentional "0" and valid decimals like "2500.75".
 */
export function finalizeNumericInputOnBlur(
  raw: string,
  options: FinalizeNumericOptions = {}
): { display: string; numeric: number } {
  const {
    allowDecimal = true,
    allowEmpty = false,
    defaultValue = 0,
    min,
    max,
  } = options;

  const normalized = normalizeNumericInputString(raw, { allowDecimal });

  if (normalized === '' || normalized === '.') {
    if (allowEmpty) {
      return { display: '', numeric: defaultValue };
    }
    return { display: String(defaultValue), numeric: defaultValue };
  }

  let cleaned = normalized;
  if (cleaned.startsWith('.')) {
    cleaned = `0${cleaned}`;
  }
  if (cleaned.endsWith('.')) {
    cleaned = cleaned.slice(0, -1) || '0';
  }

  let numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) {
    return allowEmpty
      ? { display: '', numeric: defaultValue }
      : { display: String(defaultValue), numeric: defaultValue };
  }

  if (typeof min === 'number' && numeric < min) {
    numeric = min;
    cleaned = String(min);
  }
  if (typeof max === 'number' && numeric > max) {
    numeric = max;
    cleaned = String(max);
  }

  // If integer-only, ensure integer representation
  if (!allowDecimal) {
    numeric = Math.trunc(numeric);
    cleaned = String(numeric);
  }

  return { display: cleaned, numeric };
}

/**
 * Determines whether focusing the input should automatically select its current value.
 * Auto-selects when the input holds a default zero ("0") so typing immediately replaces it,
 * without interfering with caret placement when editing existing non-zero rates (e.g. "2500.75").
 */
export function shouldAutoSelectOnFocus(displayValue: string): boolean {
  return displayValue.trim() === '0';
}

/**
 * Formats an initial or programmatically updated numeric prop into a clean input string.
 */
export function formatNumericPropForInput(
  value: number | null | undefined,
  allowEmptyZero = false
): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return allowEmptyZero ? '' : '0';
  }
  const num = Number(value);
  if (num === 0 && allowEmptyZero) {
    return '';
  }
  return String(num);
}
