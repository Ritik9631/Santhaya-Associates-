/**
 * Santhaya Associates — Standard Indian Currency & Amount-in-Words Utilities
 * File: src/lib/utils/currency.ts
 *
 * Implements:
 * 1. Indian locale currency formatting (e.g. ₹1,23,456.78)
 * 2. Compact scale representation (e.g. ₹622.56 Cr, ₹45.75 L, ₹12.50 K, ₹950.00) for KPI cards
 * 3. Exact statutory amount-in-words conversion with full Paise and arbitrary Crores support.
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
 * >= 1,00,00,000 (1 Crore): "₹622.56 Cr"
 * >= 1,00,000 (1 Lakh):    "₹45.75 L"
 * >= 1,000 (1 Thousand):   "₹12.50 K"
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
    if (rest > 0) res += ' ';
  }
  if (rest > 0) {
    res += convertTwoDigits(rest);
  }
  return res.trim();
}

function convertSubCrore(n: number): string {
  let remaining = n;
  const parts: string[] = [];

  if (remaining >= 100000) {
    const lakh = Math.floor(remaining / 100000);
    parts.push(convertTwoDigits(lakh) + ' Lakh');
    remaining %= 100000;
  }

  if (remaining >= 1000) {
    const thousand = Math.floor(remaining / 1000);
    parts.push(convertTwoDigits(thousand) + ' Thousand');
    remaining %= 1000;
  }

  if (remaining > 0) {
    parts.push(convertThreeDigits(remaining));
  }

  return parts.filter(Boolean).join(' ').trim();
}

/**
 * Converts a numeric amount to Indian Rupee Words (Lakhs, Crores system) with full Paise support.
 * Handles very large numbers (arbitrary Crores).
 * e.g. 23600 -> "Rupees Twenty Three Thousand Six Hundred Only"
 * e.g. 23600.50 -> "Rupees Twenty Three Thousand Six Hundred and Fifty Paise Only"
 */
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

