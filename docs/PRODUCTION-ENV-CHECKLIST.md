# SANTHAYA ASSOCIATES — PRODUCTION ENVIRONMENT VARIABLE INVENTORY & SECURITY CHECKLIST

**Target Environment:** Production  
**Document Revision:** 1.0.0  
**Effective Date:** October 31, 2026  
**Audience:** DevOps Engineers, Security Reviewers, System Administrators  
**Confidentiality:** High (Never commit real values into source control)

---

## 1. PRODUCTION ENVIRONMENT VARIABLE INVENTORY

All environment variables required by the Santhaya Associates Next.js 14 application and Supabase backend are inventoried below by classification:

### 1.1 Public Client-Side Variables (`NEXT_PUBLIC_*`)
*Bundled into browser JavaScript bundles at build time. Must NEVER contain sensitive credentials.*

| Variable Name | Required | Default / Sample | Purpose & Scope |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **YES** | `https://<prod-ref>.supabase.co` | Supabase API gateway URL used by browser auth and SSR clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **YES** | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | Public anonymous JWT key. Safe for browser exposure; restricted by PostgreSQL RLS. |
| `NEXT_PUBLIC_SITE_URL` | **YES** | `https://santhaya.com` | Canonical production URL used for robots.txt, sitemap.xml, and email link generation. |

### 1.2 Server-Only Secret Variables
*Stored securely in the hosting provider's secret manager (e.g., Vercel Secrets). NEVER exposed to client bundles or browser DOM.*

| Variable Name | Required | Generation / Format | Purpose & Security Constraint |
| :--- | :---: | :--- | :--- |
| `SUPABASE_SERVICE_ROLE_KEY` | **YES** | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | Privileged Supabase key that bypasses RLS. Used **strictly server-side** for outbox processing, quotation intake, and admin tasks. |
| `RESEND_API_KEY` | **YES** | `re_1234567890abcdef...` | Resend API credential for transactional email delivery. |
| `CRON_SECRET` | **YES** | 64-char Hexadecimal | Shared bearer secret for authenticating scheduled outbox worker calls (`GET /api/cron/process-outbox`). |
| `RATE_LIMIT_SALT` | **YES** | 64-char Hexadecimal | High-entropy cryptographic salt used to hash client IP addresses before database storage. |

### 1.3 Operational Configuration & Tuning Flags
*Server-side operational parameters governing limits, fallbacks, and execution modes.*

| Variable Name | Required | Recommended Production Value | Description |
| :--- | :---: | :--- | :--- |
| `EMAIL_PROVIDER` | **YES** | `resend` | Activates `ResendEmailProvider`. In dev/test, defaults to `mock`. |
| `EMAIL_FROM_ADDRESS` | **YES** | `Santhaya Associates <inquiries@santhaya.com>` | Verified sender address shown on commercial communications. |
| `EMAIL_DAILY_LIMIT` | **YES** | `80` | Daily send volume ceiling to prevent runaway billing or free-tier exhaustion. |
| `EMAIL_MONTHLY_LIMIT` | **YES** | `2500` | Monthly send volume ceiling. |
| `ALLOW_DEV_CRON` | **NO** | `false` | Disables unauthenticated dev cron execution in production. |
| `NODE_ENV` | **YES** | `production` | Enables React production optimizations, minification, and security modes. |

---

## 2. PRODUCTION SECURITY VERIFICATION CHECKLIST

Before authorizing production deployment, verify each security checkpoint:

- [ ] **Zero Development Key Contamination:**  
  Confirm that no variables from development (`bkqneudnnhvvwmtggorz`) are copied into production. Production must use a distinct Supabase project reference.
- [ ] **Cryptographic Randomness for Secrets:**  
  Generate `RATE_LIMIT_SALT` and `CRON_SECRET` using a cryptographically secure random generator:
  ```powershell
  # Generate 64-character random hex string for CRON_SECRET / RATE_LIMIT_SALT
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] **`.gitignore` Enforces Secret Exclusion:**  
  Verify that `.gitignore` contains `.env`, `.env.local`, `.env.production`, and `*.local`.
- [ ] **Client Bundle Verification:**  
  Verify that `npm run build` does not emit warnings regarding `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in client chunks.
- [ ] **Vercel Sensitive Environment Variable Flag:**  
  In the Vercel dashboard, ensure that `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, and `RATE_LIMIT_SALT` have the **Sensitive** toggle enabled so they cannot be viewed by standard team members.

---

## 3. BUSINESS OWNER INPUT REGISTRY

The following table records the required commercial values to be finalized with the business owner prior to public launch:

| Required Commercial Value | Verified Status | Final Confirmed Production Value |
| :--- | :---: | :--- |
| **Official Corporate Entity** | Confirmed | Santhaya Associates Pvt. Ltd. |
| **Primary Production Domain** | Pending Owner Sign-off | `santhaya.com` |
| **Inquiry Email Routing** | Pending DNS Setup | `info@santhaya.com` / `inquiries@santhaya.com` |
| **Billing / Accounts Email** | Pending DNS Setup | `billing@santhaya.com` |
| **Official Office Phone** | Pending Owner Sign-off | `+91 98765 43210` (Verify real corporate line) |
| **Corporate Head Office Address** | Pending Owner Sign-off | `Plot 42, Industrial Area Phase II, New Delhi 110020` |
| **15-Digit GSTIN** | Pending Accounting Sign-off | *To be provided by Company Accountant* |
| **Corporate PAN** | Pending Accounting Sign-off | *To be provided by Company Accountant* |
| **Current Bank Account (SBI)** | Pending Finance Sign-off | *Account Number & IFSC Code to be provided* |
| **Designated Grievance Officer** | Pending Legal Sign-off | *Name & Direct Email to be provided* |

