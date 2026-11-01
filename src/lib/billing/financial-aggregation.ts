/**
 * Santhaya Associates — Authoritative Financial Aggregation Service
 * File: src/lib/billing/financial-aggregation.ts
 *
 * Implements strict, single-source-of-truth financial aggregation rules:
 * 1. ACTIVE RECEIVABLES EXCLUSIONS: Draft, voided, and cancelled invoices are strictly excluded
 *    from Total Invoiced, Collected Revenue, Outstanding Balance, and Overdue Balance.
 * 2. SEPARATE DRAFT INFORMATIONAL METRIC: Draft invoices are tracked as a separate informational
 *    metric (`draftInvoiceValue` and `draftInvoiceCount`) and never mixed into ledger receivables.
 * 3. DECIMAL ACCURACY: Rounding to 2 decimal places to prevent floating-point drift.
 */

export function roundToTwoDecimals(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export interface InvoiceRecordInput {
  id?: string;
  invoice_number?: string | null;
  status: string;
  grand_total_amount?: number | string | null;
  paid_amount?: number | string | null;
  balance_amount?: number | string | null;
  due_date?: string | null;
  created_at?: string | null;
}

export interface FinancialSummary {
  // Authoritative Receivables Metrics (Issued Invoices Only)
  totalInvoiced: number;
  collectedRevenue: number;
  outstandingBalance: number;
  overdueBalance: number;
  overdueCount: number;

  // Informational Draft Metrics (Strictly Segregated)
  draftInvoiceValue: number;
  draftInvoiceCount: number;

  // Status Counts
  totalInvoicesCount: number;
  activeInvoiceCount: number;
  issuedCount: number;
  partiallyPaidCount: number;
  paidCount: number;
  cancelledCount: number;
}

/**
 * Checks if an invoice status qualifies as an active, legally issued invoice for receivables.
 */
export function isEligibleIssuedInvoice(status: string): boolean {
  return status === 'issued' || status === 'partially_paid' || status === 'paid';
}

/**
 * Aggregates financial totals from a list of invoice records.
 */
export function calculateFinancialSummary(
  invoices: InvoiceRecordInput[] = [],
  referenceDate: Date | string = new Date()
): FinancialSummary {
  const todayStr =
    typeof referenceDate === 'string'
      ? referenceDate.split('T')[0]
      : referenceDate.toISOString().split('T')[0];

  let totalInvoiced = 0;
  let collectedRevenue = 0;
  let outstandingBalance = 0;
  let overdueBalance = 0;
  let overdueCount = 0;

  let draftInvoiceValue = 0;
  let draftInvoiceCount = 0;

  let issuedCount = 0;
  let partiallyPaidCount = 0;
  let paidCount = 0;
  let cancelledCount = 0;

  for (const inv of invoices) {
    const status = (inv.status || '').toLowerCase().trim();
    const grandTotal = Number(inv.grand_total_amount || 0);
    const paid = Number(inv.paid_amount || 0);
    const balance = Number(inv.balance_amount || 0);

    if (status === 'draft') {
      draftInvoiceCount++;
      draftInvoiceValue = roundToTwoDecimals(draftInvoiceValue + grandTotal);
    } else if (status === 'cancelled' || status === 'void' || status === 'refunded') {
      cancelledCount++;
    } else if (isEligibleIssuedInvoice(status)) {
      // Eligible active issued invoice
      totalInvoiced = roundToTwoDecimals(totalInvoiced + grandTotal);
      collectedRevenue = roundToTwoDecimals(collectedRevenue + paid);
      outstandingBalance = roundToTwoDecimals(outstandingBalance + balance);

      if (status === 'issued') {
        issuedCount++;
      } else if (status === 'partially_paid') {
        partiallyPaidCount++;
      } else if (status === 'paid') {
        paidCount++;
      }

      // Overdue check
      if (balance > 0 && inv.due_date && inv.due_date < todayStr) {
        overdueCount++;
        overdueBalance = roundToTwoDecimals(overdueBalance + balance);
      }
    }
  }

  return {
    totalInvoiced,
    collectedRevenue,
    outstandingBalance,
    overdueBalance,
    overdueCount,
    draftInvoiceValue,
    draftInvoiceCount,
    totalInvoicesCount: invoices.length,
    activeInvoiceCount: issuedCount + partiallyPaidCount + paidCount,
    issuedCount,
    partiallyPaidCount,
    paidCount,
    cancelledCount,
  };
}
