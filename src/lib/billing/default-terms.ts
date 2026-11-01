/**
 * Santhaya Associates — Authoritative Commercial Terms and Conditions
 * File: src/lib/billing/default-terms.ts
 *
 * Provides business-appropriate, editable default terms for Commercial Quotations and Tax Invoices.
 * Configured specifically for Bihar jurisdiction (Motihari, Purbi Champaran).
 */

export function getDefaultQuotationTerms(validityDays = 30): string {
  return [
    `1. VALIDITY: This commercial quotation is valid for ${validityDays} calendar days from the date of issuance.`,
    '2. PRICES & TAXES: Prices quoted are based on current statutory duties and Indian GST slabs. Any statutory variation in GST rates prior to delivery or billing shall be to the buyer\'s account.',
    '3. SCOPE OF SUPPLY: Scope is strictly limited to the technical specifications and quantities enumerated in this document. Any additional equipment, accessories, or civil works will be quoted separately.',
    '4. DELIVERY & SCHEDULE: Delivery or dispatch timeline is subject to site readiness, receipt of agreed advance, and clear technical clearances.',
    '5. PAYMENT TERMS: Mobilization advance / milestone payments as specified in the proposal. Milestone payments must be released promptly against intermediate claims.',
    '6. FREIGHT & UNLOADING: Transit insurance and freight charges apply as per agreed commercial delivery terms. Site unloading and secure storage are the client\'s responsibility unless explicitly included.',
    '7. WARRANTY: Standard original manufacturer warranty applies for machinery and components against manufacturing defects.',
    '8. ORDER VARIATION / CANCELLATION: Any order amendment or cancellation is subject to recovery of incurred procurement, fabrication, or mobilization costs.',
    '9. FORCE MAJEURE: Neither party shall be liable for delays caused by natural calamities, severe weather, governmental restrictions, civil unrest, or events beyond reasonable operational control.',
    '10. JURISDICTION: All contractual disputes arising under this quotation are subject to the exclusive jurisdiction of the competent courts at Motihari, Purbi Champaran, Bihar, India.',
  ].join('\n');
}

export function getDefaultInvoiceTerms(dueDateText = 'as specified on this invoice'): string {
  return [
    `1. PAYMENT DUE DATE: Payment must be credited in full on or before the due date (${dueDateText}).`,
    '2. PAYMENT METHOD: Remittances should be made via RTGS, NEFT, Cheque, or verified Bank Transfer in favour of Santhaya Associates Pvt. Ltd. Cash payments are not accepted for statutory invoices.',
    '3. STATUTORY INVOICE: This document is a statutory Tax Invoice issued in compliance with the Central Goods and Services Tax (CGST) Act, 2017 and Rule 46.',
    '4. DISCREPANCIES: Any discrepancy in billing, item description, or tax attribution must be notified in writing to accounts within 7 calendar days of receipt.',
    '5. DELAYED PAYMENTS: Delayed payments are subject to commercial interest as agreed under contract or standard commercial credit terms.',
    '6. ADJUSTMENTS & CREDIT NOTES: Returns, rate adjustments, or credit notes shall be issued strictly in accordance with Section 34 of the CGST Act.',
    '7. BILLING QUERIES: For payment reconciliation or billing assistance, contact accounts at heistofeverything@gmail.com or +91 9430986713 / +91 9608950748.',
  ].join('\n');
}

