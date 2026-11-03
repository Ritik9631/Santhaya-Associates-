# BATCH 5 MANUAL ACCEPTANCE TESTING LOG
**System:** Santhaya Associates Staff ERP & Public Portal  
**Target Environment:** Development Sandbox (`bkqneudnnhvvwmtggorz`)  
**Commit:** `f11a1bbf961973f0e6c4ebfc1a9707ee25c18cda`  
**Date:** 2026-11-03  

This log tracks manual acceptance testing for Batch 5 (BUG-050 through BUG-059).  
*Rule: Do not invent results. Do not mark items as passed until confirmed by manual verification.*

---

## Acceptance Test Summary

| Test ID | Bug ID | Description | Status | Tested By | Notes / Bug Assigned |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TEST-01** | BUG-050 | Quotation creation header readability & high-contrast styling | `PASS` | Manual User | Verified: Bold dark navy title, visible subtitle, clear contrast |
| **TEST-02** | BUG-051 | Public enquiry submission & mock notification outbox behavior | `READY FOR RETEST` | Manual User | Targeted fix applied: Multi-secret auth & caller secret passing fixed; 14 tests passing; pending manual verification |
| **TEST-03** | BUG-052 | Draft invoice PDF high-contrast watermark & statutory notice | `PENDING` | Manual User | Awaiting verification |
| **TEST-04** | BUG-053 | Invoice date stacking, column spacing & zero horizontal overflow | `PENDING` | Manual User | Awaiting verification |
| **TEST-05** | BUG-054 | WhatsApp share dialog recipient, message text & PDF download | `PENDING` | Manual User | Awaiting verification |
| **TEST-06** | BUG-055 | Manual delivery confirmation workflow & audit trail separation | `PENDING` | Manual User | Awaiting verification |
| **TEST-07** | BUG-056 | Indian phone number validation, E.164 +91 formatting & preservation | `PENDING` | Manual User | Awaiting verification |
| **TEST-08** | BUG-057 | Email client sharing subject/body generation & fallback copying | `PENDING` | Manual User | Awaiting verification |
| **TEST-09** | BUG-058 | OS-specific PDF attachment guide readability & touch targets | `PENDING` | Manual User | Awaiting verification |
| **TEST-10** | BUG-059 | Communication delivery statuses & audit logging fidelity | `PENDING` | Manual User | Awaiting verification |

---

## Detailed Test Logs

### TEST 1 — BUG-050: Quotation Creation Header Readability & High-Contrast Styling
- **Page:** `/staff/quotations/new`
- **Action:** Open page and inspect the header banner, title, subtitle, badges, and input contrast.
- **Expected Result:**
  - "Create New Quotation" heading is bold, dark navy (`#10243B`), and crisp.
  - Subtitle is clearly visible with strong contrast against background.
  - Breadcrumbs and return link have clear contrast and readable focus outlines.
  - Form layout renders cleanly on both desktop and mobile viewports.
- **Actual Result:** Verified by user. Header is readable, bold, and high-contrast across viewports.
- **Status:** `PASS`
- **Screenshots:** Confirmed by manual review.
- **Remediation / Bug Assigned:** None (Resolved).

---

### TEST 2 — BUG-051: Public Enquiry Submission & Mock Outbox Behavior
- **Pages:** Public request quotation form (`/`) and `/staff/communications`
- **Action:** Submit a test enquiry via the public form, then inspect staff outbox records.
- **Expected Result:**
  - Form submits successfully with instant user feedback.
  - Enquiry record appears in public enquiries.
  - Outbox job is created with `status: pending` or `status: sent` under `EMAIL_PROVIDER=mock`.
  - Mock email is correctly labeled `Mock — Not Sent` in UI without false claims of live dispatch.
- **Actual Result:**
  - Enquiry created successfully (`INQ-2026-00055`, Apex Private Limated).
  - Outbox record `0108ff60-7fa5-4c50-9507-0d3a8b489d52` created in `email_outbox` (`enquiry_alert_admin`, recipient `heistofeverything@gmail.com`).
  - Worker dispatch failed with `UNAUTHORIZED_WORKER: Invalid or missing worker secret.` because `src/app/api/quotation-request/route.ts` did not pass `workerSecret` to `processOutboxBatch`.
  - Outbox job remained `status: 'pending'` (0 attempts) instead of being processed to `sent`.
  - As a result, it displays as `pending` instead of `Mock — Not Sent` in Communications Center.
- **Status:** `READY FOR RETEST`
- **Root Cause & Targeted Fix:**
  - Root Cause: In `src/app/api/quotation-request/route.ts` (and `src/lib/communications/actions.ts`), `processOutboxBatch` was invoked without supplying the configured `workerSecret`, while `outbox-worker.ts` rejected calls if `CRON_SECRET` and `OUTBOX_WORKER_SECRET` differed or were missing.
  - Targeted Fix:
    1. Created `src/lib/email/worker-auth.ts` (`verifyWorkerSecret`) supporting constant-time multi-secret verification (`OUTBOX_WORKER_SECRET` and `CRON_SECRET`) with `crypto.timingSafeEqual`.
    2. Updated `src/app/api/quotation-request/route.ts` to supply `workerSecret: process.env.OUTBOX_WORKER_SECRET || process.env.CRON_SECRET`.
    3. Updated `src/lib/communications/actions.ts` to supply `workerSecret: process.env.OUTBOX_WORKER_SECRET || process.env.CRON_SECRET` and added staff role authorization guard (`super_admin`, `admin`, `billing_manager`).
    4. Verified all 14 tests in `scripts/test-resend-and-mock-regressions.mjs` (zero real network calls, zero emails sent, full Resend integration preserved).
  - Ready for manual retest in development mock mode.

---

### TEST 3 — BUG-052: Draft Invoice PDF High-Contrast Watermark
- **Page:** `/staff/billing` (Draft Invoice View / PDF Route)
- **Action:** Open a draft invoice PDF preview.
- **Expected Result:**
  - Prominent diagonal watermark "DRAFT — NOT A TAX INVOICE" rendered in light red/amber across page.
  - Warning banner stating document is a draft and cannot be used for GST input tax credit.
  - Print/PDF preview contains watermark; issued invoices remain clean without watermark.
- **Actual Result:** Pending manual verification.
- **Status:** `PENDING`

---

### TEST 4 — BUG-053: Invoice Date Stacking & Column Spacing
- **Page:** `/staff/billing`
- **Action:** Open an invoice detail view.
- **Expected Result:**
  - Invoice date displays on one clean line.
  - Due date displays cleanly beneath invoice date.
  - Table columns have sufficient padding with zero overlapping.
  - Page has no unintended horizontal scrollbar or clipping.
- **Actual Result:** Pending manual verification.
- **Status:** `PENDING`

---

### TEST 5 — BUG-054: WhatsApp Share Dialog & PDF Download
- **Page:** `/staff/quotations` or `/staff/billing` (Share / Deliver button on issued record)
- **Action:** Click "Share / Deliver", select WhatsApp channel.
- **Expected Result:**
  - Customer name and mobile number populate accurately.
  - Invalid mobile numbers trigger helpful inline validation.
  - "Open WhatsApp" launches `api.whatsapp.com/send` or `whatsapp://send` with pre-composed professional text.
  - PDF download button downloads document for manual attachment.
  - No false claim of automated delivery.
- **Actual Result:** Pending manual verification.
- **Status:** `PENDING`

---

### TEST 6 — BUG-055: Manual Delivery Confirmation Workflow & Audit Trail
- **Page:** `/staff/quotations` or `/staff/billing` (Share Modal)
- **Action:** Initiate share, then click "Confirm Manually Sent".
- **Expected Result:**
  - Opening the share link does NOT automatically mark delivery confirmed.
  - "Confirm Manually Sent" button requires explicit staff action and records notes.
  - Audit log captures staff ID, timestamp, channel, and status `manually_sent`.
- **Actual Result:** Pending manual verification.
- **Status:** `PENDING`

---

### TEST 7 — BUG-056: Indian Phone Number Validation & Formatting
- **Page:** `/staff/customers` or Share Dialog
- **Action:** Enter Indian mobile numbers with varying formats (`9876543210`, `+91 98765 43210`, `09876543210`, invalid `12345`).
- **Expected Result:**
  - Valid 10-digit Indian numbers starting with 6, 7, 8, or 9 formatted cleanly to `+91 XXXXX XXXXX`.
  - Invalid numbers rejected with clear error.
  - Existing customer phone records preserved without silent corruption.
- **Actual Result:** Pending manual verification.
- **Status:** `PENDING`

---

### TEST 8 — BUG-057: Email Client Sharing & Fallback Copying
- **Page:** Document Share Modal (Email Client tab)
- **Action:** Select "Email Client" sharing.
- **Expected Result:**
  - Pre-fills recipient, subject, and professional body with document details.
  - "Launch Email Client" triggers `mailto:` URI.
  - "Copy Subject" and "Copy Body" buttons copy formatted text with feedback.
  - PDF download button available to attach file.
- **Actual Result:** Pending manual verification.
- **Status:** `PENDING`

---

### TEST 9 — BUG-058: OS-Specific PDF Attachment Guide
- **Page:** Document Share Modal
- **Action:** Toggle Windows Desktop and Android instructions.
- **Expected Result:**
  - Clear step-by-step instructions on saving PDF and attaching in WhatsApp Web/Desktop or Android.
  - Readability is crisp with strong contrast and touch-friendly buttons.
- **Actual Result:** Pending manual verification.
- **Status:** `PENDING`

---

### TEST 10 — BUG-059: Communication Delivery Statuses & Evidence Verification
- **Page:** `/staff/communications`
- **Action:** Inspect delivery status badges and timeline.
- **Expected Result:**
  - Statuses accurately distinguish `prepared`, `sharing_initiated`, `manually_confirmed_sent`, `sent_mock`, and `delivered`.
  - Status `delivered` only appears when definitive webhook evidence exists.
- **Actual Result:** Pending manual verification.
- **Status:** `PENDING`

