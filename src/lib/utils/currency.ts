/**
 * Santhaya Associates — Standard Indian Currency Formatting Utilities
 * File: src/lib/utils/currency.ts
 *
 * Implements Indian locale currency formatting (e.g. ₹1,23,456.78)
 * and compact scale representation (e.g. ₹62.26 Cr, ₹12.50 L) for KPI dashboards.
 */

/**
 * Formats a number into Indian Rupee string with specified decimal places.
 * e.g. 10000000 -> "₹1,00,00,000.00"
 */
export function formatIndianRupee(
  amount: number | string | null | undefined,
  decimals = 2
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return '₹0.00';

  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Formats large amounts into human-readable compact Indian scales:
 * >= 1,00,00,000 (1 Crore): "₹62.26 Cr"
 * >= 1,00,000 (1 Lakh):    "₹12.50 L"
 * >= 1,000 (1 Thousand):   "₹50.00 K"
 * < 1,000:                 "₹950.00"
 */
export function formatCompactRupee(
  amount: number | string | null | undefined
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  if (isNaN(num) || num === 0) {
    return '₹0.00';
  }

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 10000000) {
    const cr = absNum / 10000000;
    return `${sign}₹${cr.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Cr`;
  } else if (absNum >= 100000) {
    const lk = absNum / 100000;
    return `${sign}₹${lk.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} L`;
  } else if (absNum >= 1000) {
    const k = absNum / 1000;
    return `${sign}₹${k.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} K`;
  } else {
    return `${sign}₹${absNum.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}
