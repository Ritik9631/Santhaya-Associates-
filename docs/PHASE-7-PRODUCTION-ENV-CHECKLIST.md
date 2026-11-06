# SANTHAYA ASSOCIATES — PHASE 7: PRODUCTION ENVIRONMENT VARIABLE CHECKLIST

**Target Project:** `flxhwgevmqvuqdjaejwa` (Production Supabase, Singapore `ap-southeast-1`)  
**Target Hosting:** Hostinger Business / Cloud Next.js Hosting (Node.js Web Apps)  
**Security Policy:** Strict Zero-Secret-Exposure (Variable names, descriptions, and safe placeholders only)  
**Document Revision:** 1.0.0  
**Effective Date:** November 6, 2026  

---

## 1. Classification & Scope Overview

All environment variables required by the Santhaya Associates Next.js application, Staff ERP, and Progressive Web App are categorized into three distinct security tiers:

1. **Public Client-Side Variables (`NEXT_PUBLIC_*`):** Embedded into browser JavaScript bundles at build time. Must **NEVER** contain database credentials, service-role keys, or private API secrets.
2. **Server-Only Secret Variables:** Injected strictly into the Node.js server runtime by Hostinger hPanel. Never visible to client browsers or delivered in HTML payloads.
3. **Operational Configuration Flags:** Govern email provider routing, daily throughput quotas, security salts, and environment modes.

---

## 2. Environment Variable Inventory & Specifications

### 2.1 Public Client-Side Variables

These variables are consumed by `@supabase/ssr` browser clients, PWA service workers, metadata generation, and sitemaps.

| Variable Name | Required | Safe Placeholder / Example | Purpose & Security Scope |
|---|:---:|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **YES** | `https://flxhwgevmqvuqdjaejwa.supabase.co` | Supabase API gateway URL for the production project. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **YES** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...` | Public anonymous JWT token. Safe for browser exposure; restricted by PostgreSQL RLS. |
| `NEXT_PUBLIC_SITE_URL` | **YES** | `https://santhaya.com` | Canonical production domain URL used for SEO, robots.txt, sitemaps, and email links. |

---

### 2.2 Server-Only Secret Variables

These credentials must be stored securely in the Hostinger hPanel Environment Variables configuration. **Never commit these values to Git or paste them into chat transcripts.**

| Variable Name | Required | Safe Placeholder / Example | Purpose & Security Scope |
|---|:---:|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | **YES** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...` | Privileged Supabase key that bypasses RLS. Used **strictly server-side** by Next.js Server Actions and `/api/cron/process-outbox`. |
| `RESEND_API_KEY` | **YES** | `re_prod_xxxxxxxxxxxxxxxxxxxxxxxx` | Resend API credential for transactional email dispatch. |
| `CRON_SECRET` | **YES** | `0123456789abcdef0123456789abcdef...` | High-entropy 64-character hex secret for authenticating scheduled outbox worker calls. |
| `RATE_LIMIT_SALT` | **YES** | `fedcba9876543210fedcba9876543210...` | Cryptographic 64-character hex salt used to hash client IP addresses before database storage. |

---

### 2.3 Operational Configuration & Tuning Flags

| Variable Name | Required | Recommended Production Value | Purpose & Description |
|---|:---:|:---:|---|
| `EMAIL_PROVIDER` | **YES** | `resend` | Activates live `ResendEmailProvider`. (Dev defaults to `mock`). |
| `EMAIL_FROM_ADDRESS` | **YES** | `Santhaya Associates <santhayapvt.ltd@gmail.com>` | Official verified sender address on public transactional emails. |
| `INTERNAL_NOTIFICATION_EMAIL` | **YES** | `heistofeverything@gmail.com` | Temporary internal notification destination receiving real-time enquiry alerts while `santhayapvt.ltd@gmail.com` is inaccessible. |
| `EMAIL_DAILY_LIMIT` | **YES** | `80` | Daily send volume ceiling to prevent free-tier exhaustion or runaway billing. |
| `EMAIL_MONTHLY_LIMIT` | **YES** | `2500` | Monthly transactional email cap. |
| `ALLOW_DEV_CRON` | **NO** | `false` | Explicitly disables unauthenticated developer cron calls in production. |
| `NODE_ENV` | **YES** | `production` | Enables React production optimizations, bundling minification, and security headers. |

---

## 3. Secret Generation Protocol

For `CRON_SECRET` and `RATE_LIMIT_SALT`, generate cryptographically random 64-character hexadecimal strings on a secure local terminal:

```bash
# Generate 64-character random hex string for CRON_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate 64-character random hex string for RATE_LIMIT_SALT:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Hostinger hPanel Configuration Instructions

### 4.1 Entering Environment Variables in Hostinger
1. Log in to the **Hostinger hPanel**.
2. Navigate to **Websites** -> Select your Santhaya Associates domain -> **Node.js Web App** (or **Advanced** -> **Environment Variables** depending on selected plan).
3. Add each of the variables listed in Section 2 with their production values.
4. Ensure no surrounding quotation marks or extraneous spaces are included.
5. Save the configuration and trigger a clean build/restart.

### 4.2 Configuring Hostinger Outbox Worker Cron Job
To ensure transactional customer notifications and staff quotation alerts are processed automatically every 5 minutes:

1. In Hostinger hPanel, navigate to **Advanced** -> **Cron Jobs**.
2. Select **Custom** command.
3. Set the schedule to every 5 minutes: `*/5 * * * *`.
4. Enter the curl execution command:
   ```bash
   curl -s -X GET "https://<your-domain>/api/cron/process-outbox" -H "Authorization: Bearer <CRON_SECRET>" > /dev/null 2>&1
   ```
   *(Replace `<your-domain>` with your production domain and `<CRON_SECRET>` with your actual secret).*
5. Click **Save**.

---

## 5. Security & Isolation Verification Checklist

Before opening the application to staff or public traffic, complete this checklist:

- [ ] **Zero Development Credential Leakage:** Verify that no credentials containing the development project reference `bkqneudnnhvvwmtggorz` exist in the Hostinger environment.
- [ ] **Client Bundle Verification:** Confirm that inspecting browser network headers or JavaScript bundles on the live site reveals **zero occurrences** of `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY`.
- [ ] **Cron Authentication Test:** Confirm that an unauthenticated HTTP GET to `/api/cron/process-outbox` returns `HTTP 401 Unauthorized`.
- [ ] **Rate Limiting Active:** Confirm that submitting multiple rapid enquiry requests from the same IP activates sliding-window rate limiting.
- [ ] **`.gitignore` Integrity:** Confirm that `.env.local` remains strictly untracked in Git.

