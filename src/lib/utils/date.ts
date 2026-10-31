/**
 * Santhaya Associates — Standard Indian Date Formatting Utilities
 * File: src/lib/utils/date.ts
 *
 * Implements unambiguous Indian business date formatting (DD MMM YYYY, e.g. "31 Oct 2026").
 * Safe against UTC timezone boundary shifts for pure date strings ("YYYY-MM-DD").
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Formats a date string, timestamp, or Date object as "DD MMM YYYY" (e.g. "31 Oct 2026").
 * Returns "—" for missing or invalid dates.
 */
export function formatIndianDate(input: string | Date | null | undefined): string {
  if (!input) return '—';

  // Handle pure date strings ("YYYY-MM-DD") without UTC timezone boundary shifting
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const isoDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateMatch) {
      const year = isoDateMatch[1];
      const monthIdx = parseInt(isoDateMatch[2], 10) - 1;
      const day = isoDateMatch[3];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
      }
    }
  }

  const dateObj = typeof input === 'string' ? new Date(input) : input;
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return '—';
  }

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Formats a date-time string as "DD MMM YYYY, hh:mm A" (e.g. "31 Oct 2026, 02:30 PM").
 */
export function formatIndianDateTime(input: string | Date | null | undefined): string {
  if (!input) return '—';

  const dateObj = typeof input === 'string' ? new Date(input) : input;
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return '—';
  }

  const datePart = formatIndianDate(dateObj);
  let hours = dateObj.getHours();
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const formattedHours = String(hours).padStart(2, '0');

  return `${datePart}, ${formattedHours}:${minutes} ${ampm}`;
}

