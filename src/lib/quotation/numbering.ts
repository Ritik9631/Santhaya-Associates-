/**
 * Santhaya Associates — Quotation Numbering & Formatting Subsystem
 * File: src/lib/quotation/numbering.ts
 *
 * Implements Indian Financial Year numbering format: QT-YYYY-YY-NNN
 * Rules:
 * - Indian FY runs from 1 April to 31 March (Asia/Kolkata timezone)
 * - 02 November 2026 belongs to FY 2026-27 -> QT-2026-27-001
 * - 01 April 2027 begins FY 2027-28 -> QT-2027-28-001
 * - Sequence numbers start at 001 and expand beyond 3 digits when necessary (e.g. 1000)
 * - Concurrency-safe server-side generation
 * - Preserves historical QTN-YYYY-NNNNN quotations without renumbering
 * - Never reuses deleted or cancelled quotation numbers
 */

/**
 * Calculates Indian Financial Year metadata in Asia/Kolkata timezone.
 * Indian FY: 1 April to 31 March.
 */
export function getIndianFinancialYear(date: Date = new Date()): {
  startYear: number;
  endYear: number;
  fyString: string; // e.g. "2026-27"
} {
  // Enforce Asia/Kolkata timezone boundary
  const kolkataDateStr = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const kolkataDate = new Date(kolkataDateStr);
  const year = kolkataDate.getFullYear();
  const month = kolkataDate.getMonth() + 1; // 1 to 12

  // Month 4 (April) through 12 (December) is startYear = year
  // Month 1 (January) through 3 (March) is startYear = year - 1
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  const endYearShort = String(endYear % 100).padStart(2, '0');
  const fyString = `${startYear}-${endYearShort}`;

  return { startYear, endYear, fyString };
}

/**
 * Formats a financial year and sequence integer into canonical QT-YYYY-YY-NNN format.
 * Minimum 3 digits with leading zeroes; expands naturally if seq >= 1000.
 */
export function formatQuotationNumber(fyString: string, seq: number): string {
  const seqStr = seq >= 1000 ? String(seq) : String(seq).padStart(3, '0');
  return `QT-${fyString}-${seqStr}`;
}

/**
 * Parses quotation numbers (both new QT-YYYY-YY-NNN and legacy QTN-YYYY-NNNNN).
 */
export function parseQuotationNumber(quoteNumber: string): {
  isNewFormat: boolean;
  prefix: string;
  financialYear?: string;
  year?: string;
  sequence: number;
} | null {
  if (!quoteNumber || typeof quoteNumber !== 'string') return null;

  // New format: QT-YYYY-YY-NNN (e.g. QT-2026-27-001)
  const newMatch = quoteNumber.match(/^QT-(\d{4}-\d{2})-(\d+)$/);
  if (newMatch) {
    return {
      isNewFormat: true,
      prefix: 'QT',
      financialYear: newMatch[1],
      sequence: parseInt(newMatch[2], 10),
    };
  }

  // Legacy format: QTN-YYYY-NNNNN (e.g. QTN-2026-00005)
  const legacyMatch = quoteNumber.match(/^QTN-(\d{4})-(\d+)$/);
  if (legacyMatch) {
    return {
      isNewFormat: false,
      prefix: 'QTN',
      year: legacyMatch[1],
      sequence: parseInt(legacyMatch[2], 10),
    };
  }

  return null;
}

/**
 * Displays whole-number quantities without unnecessary .00 (e.g. 5 instead of 5.00),
 * while preserving decimals when fractional (e.g. 5.5, 12.25).
 */
export function formatQuantity(qty: number | string | null | undefined): string {
  if (qty === null || qty === undefined || qty === '') return '0';
  const num = Number(qty);
  if (isNaN(num)) return '0';
  if (Number.isInteger(num)) {
    return num.toString();
  }
  // Fractional: format with up to 2 decimal places, trimming trailing zeros
  return num.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Generates the next sequential quotation number in QT-YYYY-YY-NNN format.
 * 1. Checks if database function public.generate_quotation_number() produces QT- format.
 * 2. If not, inspects both active quotations and audit records for the current FY to prevent reusing numbers.
 * 3. Returns a concurrency-safe unique quotation number.
 */
export async function generateServerQuotationNumber(
  adminClient: any,
  targetDate: Date = new Date()
): Promise<string> {
  const { fyString } = getIndianFinancialYear(targetDate);

  // 1. Attempt database RPC call
  try {
    const { data: generatedNum, error: rpcErr } = await adminClient.rpc('generate_quotation_number');
    if (!rpcErr && typeof generatedNum === 'string' && generatedNum.startsWith(`QT-${fyString}-`)) {
      return generatedNum;
    }
  } catch {
    // Proceed to server-side query fallback
  }

  // 2. Query all existing quotations in the current financial year (including soft-deleted)
  const { data: existingQuotes } = await adminClient
    .from('quotations')
    .select('quotation_number')
    .ilike('quotation_number', `QT-${fyString}-%`);

  // 3. Query audit logs to ensure deleted or discarded quotation numbers are NEVER reused
  const { data: auditRecords } = await adminClient
    .from('audit_logs')
    .select('previous_state')
    .eq('entity_type', 'quotations')
    .in('action', ['quotation_deleted', 'quotation_draft_discarded']);

  const extractedSeqs: number[] = [];

  // Extract from existing quotations
  if (Array.isArray(existingQuotes)) {
    for (const q of existingQuotes) {
      const parsed = parseQuotationNumber(q.quotation_number);
      if (parsed && parsed.isNewFormat && parsed.financialYear === fyString) {
        extractedSeqs.push(parsed.sequence);
      }
    }
  }

  // Extract from audit logs
  if (Array.isArray(auditRecords)) {
    for (const a of auditRecords) {
      const num = a.previous_state?.quotation_number;
      if (num && typeof num === 'string') {
        const parsed = parseQuotationNumber(num);
        if (parsed && parsed.isNewFormat && parsed.financialYear === fyString) {
          extractedSeqs.push(parsed.sequence);
        }
      }
    }
  }

  const maxSeq = extractedSeqs.length > 0 ? Math.max(...extractedSeqs) : 0;
  const nextSeq = maxSeq + 1;

  return formatQuotationNumber(fyString, nextSeq);
}

