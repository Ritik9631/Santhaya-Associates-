/**
 * Santhaya Associates — Authoritative Indian States & GST State Code Dictionary
 * File: src/lib/utils/indian-states.ts
 *
 * Provides statutory 2-digit Indian GST State Codes (01 to 38, plus 97),
 * canonical state names, and robust alias resolution (e.g. 'UP' -> '09', 'Uttar Pradesh' -> '09').
 */

export interface IndianState {
  code: string;       // 2-digit statutory code, e.g. "09"
  name: string;       // Official State Name, e.g. "Uttar Pradesh"
  aliases: string[];  // Common abbreviations, e.g. ["UP", "U.P."]
}

export const INDIAN_STATES: IndianState[] = [
  { code: '01', name: 'Jammu and Kashmir', aliases: ['JK', 'J&K', 'JAMMU & KASHMIR'] },
  { code: '02', name: 'Himachal Pradesh', aliases: ['HP', 'H.P.'] },
  { code: '03', name: 'Punjab', aliases: ['PB'] },
  { code: '04', name: 'Chandigarh', aliases: ['CH'] },
  { code: '05', name: 'Uttarakhand', aliases: ['UK', 'UA', 'UTTARANCHAL'] },
  { code: '06', name: 'Haryana', aliases: ['HR'] },
  { code: '07', name: 'Delhi', aliases: ['DL', 'NCT OF DELHI', 'NEW DELHI'] },
  { code: '08', name: 'Rajasthan', aliases: ['RJ'] },
  { code: '09', name: 'Uttar Pradesh', aliases: ['UP', 'U.P.'] },
  { code: '10', name: 'Bihar', aliases: ['BR', 'BIH'] },
  { code: '11', name: 'Sikkim', aliases: ['SK'] },
  { code: '12', name: 'Arunachal Pradesh', aliases: ['AR'] },
  { code: '13', name: 'Nagaland', aliases: ['NL'] },
  { code: '14', name: 'Manipur', aliases: ['MN'] },
  { code: '15', name: 'Mizoram', aliases: ['MZ'] },
  { code: '16', name: 'Tripura', aliases: ['TR'] },
  { code: '17', name: 'Meghalaya', aliases: ['ML'] },
  { code: '18', name: 'Assam', aliases: ['AS'] },
  { code: '19', name: 'West Bengal', aliases: ['WB', 'BENGAL'] },
  { code: '20', name: 'Jharkhand', aliases: ['JH'] },
  { code: '21', name: 'Odisha', aliases: ['OD', 'OR', 'ORISSA'] },
  { code: '22', name: 'Chhattisgarh', aliases: ['CG', 'CHHATTISGARH'] },
  { code: '23', name: 'Madhya Pradesh', aliases: ['MP', 'M.P.'] },
  { code: '24', name: 'Gujarat', aliases: ['GJ'] },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu', aliases: ['DN', 'DD', 'DAMAN', 'DIU'] },
  { code: '27', name: 'Maharashtra', aliases: ['MH'] },
  { code: '29', name: 'Karnataka', aliases: ['KA'] },
  { code: '30', name: 'Goa', aliases: ['GA'] },
  { code: '31', name: 'Lakshadweep', aliases: ['LD'] },
  { code: '32', name: 'Kerala', aliases: ['KL'] },
  { code: '33', name: 'Tamil Nadu', aliases: ['TN', 'T.N.'] },
  { code: '34', name: 'Puducherry', aliases: ['PY', 'PONDICHERRY'] },
  { code: '35', name: 'Andaman and Nicobar Islands', aliases: ['AN', 'ANDAMAN & NICOBAR'] },
  { code: '36', name: 'Telangana', aliases: ['TS', 'TG'] },
  { code: '37', name: 'Andhra Pradesh', aliases: ['AP', 'A.P.'] },
  { code: '38', name: 'Ladakh', aliases: ['LA'] },
  { code: '97', name: 'Other Territory', aliases: ['OT'] },
];

/**
 * Validates whether a state code is a valid 2-digit Indian GST state code.
 */
export function isValidIndianStateCode(code: string | null | undefined): boolean {
  if (!code) return false;
  const trimmed = code.trim().padStart(2, '0');
  return INDIAN_STATES.some((s) => s.code === trimmed);
}

/**
 * Resolves any input (code '09', 'UP', 'Uttar Pradesh') to canonical Indian state.
 * Returns null if not recognized.
 */
export function resolveIndianState(input: string | null | undefined): IndianState | null {
  if (!input) return null;
  const clean = input.trim();
  if (!clean) return null;

  // 1. Direct 2-digit code match
  const padded = clean.padStart(2, '0');
  const byCode = INDIAN_STATES.find((s) => s.code === padded);
  if (byCode) return byCode;

  // 2. Exact or case-insensitive name match
  const upper = clean.toUpperCase();
  const byName = INDIAN_STATES.find(
    (s) => s.name.toUpperCase() === upper || s.name.toUpperCase().replace(/\s+/g, '') === upper.replace(/\s+/g, '')
  );
  if (byName) return byName;

  // 3. Alias / abbreviation match
  const byAlias = INDIAN_STATES.find((s) =>
    s.aliases.some((a) => a === upper || a.replace(/[^A-Z]/g, '') === upper.replace(/[^A-Z]/g, ''))
  );
  if (byAlias) return byAlias;

  return null;
}

/**
 * Formats canonical Place of Supply label: e.g. "Uttar Pradesh (09)" or "Bihar (10)".
 * If invalid or empty, returns "Pending Determination".
 */
export function formatPlaceOfSupply(codeOrName: string | null | undefined): string {
  const resolved = resolveIndianState(codeOrName);
  if (resolved) {
    return `${resolved.name} (${resolved.code})`;
  }
  return 'Pending Determination';
}

