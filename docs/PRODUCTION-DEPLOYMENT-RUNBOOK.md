# SANTHAYA ASSOCIATES — PRODUCTION DEPLOYMENT RUNBOOK

**Target System:** Santhaya Associates Enterprise Platform  
**Target Environment:** Production  
**Document Revision:** 1.0.0  
**Effective Date:** October 31, 2026  
**Audience:** DevOps Engineers, Database Administrators, System Integrators  
**Execution Authorization:** Requires explicit business owner sign-off prior to execution.

---

## 1. PRE-DEPLOYMENT PREREQUISITES & OWNER DECISIONS

Before initiating production cutover, the following prerequisites must be confirmed and provisioned by the project owner:

- [ ] **Custom Domain Registered:** Active domain ownership (e.g., `santhaya.com`) with DNS access on Cloudflare, Route53, GoDaddy, or Namecheap.
- [ ] **Hosting Account Provisioned:** Active team/organization account on **Vercel** (recommended) or AWS/GCP/Railway.
- [ ] **Production Supabase Account:** Dedicated Supabase organization with billing enabled (Pro plan recommended for automated PITR daily backups).
- [ ] **Resend Transactional Email Account:** Active account at [resend.com](https://resend.com) with API key generated.
- [ ] **Corporate Business Registry Verified:** Registered corporate legal name, address, GSTIN, PAN, and authorized bank account details.

---

## 2. PRODUCTION SUPABASE PROJECT SETUP

### 2.1 Project Creation & Region Selection
1. Navigate to the Supabase Management Console (`https://supabase.com/dashboard`).
2. Click **New Project**.
3. **Organization:** Select the official Santhaya Associates organization.
4. **Project Name:** `santhaya-associates-prod`
5. **Database Password:** Generate a cryptographically strong, 32-character random passphrase. Store securely in the corporate password vault (1Password / Bitwarden).
6. **Region:** Select **Mumbai, India (`ap-south-1`)** for minimal latency and data residency compliance with Indian commercial regulations.
7. **Pricing Plan:** Select **Free** or **Pro**. The Free plan is 100% functional for production; the Pro plan ($25/mo) is an optional upgrade if automated Point-in-Time Recovery (PITR) is desired.

### 2.2 Point-in-Time Recovery (PITR) & Pooling
1. **Backups:** If using the Pro plan, toggle **Point-in-Time Recovery (PITR)** to **ON** under **Database Settings -> Backups**. If using the Free plan, configure automated daily snapshot exports via `pg_dump` or the Supabase CLI.
2. Under **Database Settings -> Connection Pooling**, confirm **Supavisor** is enabled:
   - Use **Transaction Mode** on port `6543` for serverless Next.js Server Actions.
   - Use **Session Mode** on port `5432` for administrative migration scripts and DDL.

---

## 3. ORDERED DATABASE MIGRATION EXECUTION

Migrations must be applied in strict chronological order. Each migration must complete without errors before executing the next.

> [!CAUTION]
> Never run `supabase db reset` on production. Run migrations sequentially using the Supabase CLI (`supabase db push`) or the Supabase SQL Editor.

```
+---------------------------------------------------------------------------------------+
|                             ORDERED MIGRATION SEQUENCE                                |
|                                                                                       |
|  [Step 1] 20261026120000_phase2_schema_and_security.sql                              |
|           - Creates staff_profiles, audit_logs, rate_limit_buckets, quotation_requests|
|                                     |                                                 |
|  [Step 2] 20261028120000_phase2d_email_outbox.sql                                     |
|           - Creates email_outbox, email_status enum, optimistic locks                 |
|                                     |                                                 |
|  [Step 3] 20261029120000_stage3a_step_a_add_super_admin_enum.sql                      |
|           - Extends staff_role enum with 'super_admin'                                |
|                                     |                                                 |
|  [Step 4] 20261029120001_stage3a_step_b_rbac_enhancements.sql                         |
|           - Adds RBAC functions, require_super_admin() security procedure             |
|                                     |                                                 |
|  [Step 5] 20261029140000_phase3b_catalog_and_customer_enhancements.sql                |
|           - Creates products_services catalog, adds pan/state/state_code to customers |
|                                     |                                                 |
|  [Step 6] 20261029160000_phase3c_quotations.sql                                       |
|           - Creates quotations, quotation_items, revisions, PO tracking               |
|                                     |                                                 |
|  [Step 7] 20261029180000_phase3d_billing_and_payments.sql                             |
|           - Creates invoices, invoice_items, payments, gapless allocator SA/26-27/0001|
|                                     |                                                 |
|  [Step 8] 20261031120000_phase4_communications.sql                                   |
|           - Creates dedicated invoice_delivery_logs table and delivery channels enum  |
+---------------------------------------------------------------------------------------+
```

### 3.1 Migration Verification Queries
After executing Step 8, run the following verification query in the Supabase SQL Editor:
```sql
SELECT 
  table_name, 
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'staff_profiles', 
    'audit_logs', 
    'quotation_requests', 
    'email_outbox', 
    'customers', 
    'products_services', 
    'quotations', 
    'invoices', 
    'payments', 
    'invoice_delivery_logs'
  )
ORDER BY table_name;
```
*Expected Result:* All 10 tables must return with positive column counts, confirming complete schema activation.

---

## 4. PRODUCTION SUPER ADMINISTRATOR PROVISIONING

To establish the initial Super Administrator without exposing credentials in web logs or source control:

1. On a secure operations terminal, set temporary environment variables pointing to production:
   ```powershell
   $env:NEXT_PUBLIC_SUPABASE_URL = "https://<prod-project-id>.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY = "<prod-service-role-key>"
   ```
2. Run the interactive bootstrap utility:
   ```powershell
   node scripts/bootstrap-super-admin.mjs
   ```
3. Enter the production Super Administrator email, secure password (minimum 14 characters), and full legal name when prompted.
4. Verify account creation:
   ```powershell
   node scripts/verify-super-admin.mjs
   ```
   *Expected Result:* Exactly 1 active Super Administrator verified.
5. Clear the environment variables from the operations session:
   ```powershell
   Remove-Item env:NEXT_PUBLIC_SUPABASE_URL
   Remove-Item env:SUPABASE_SERVICE_ROLE_KEY
   ```

---

## 5. RESEND TRANSACTIONAL EMAIL DOMAIN VERIFICATION

1. In the Resend Console (`https://resend.com/domains`), click **Add Domain**.
2. Enter the official apex domain: `santhaya.com`.
3. Add the generated DNS records to the DNS provider:
   - **DKIM:** TXT record (`resend._domainkey.santhaya.com`)
   - **SPF:** TXT record (`santhaya.com` $\rightarrow$ `v=spf1 include:amazonses.com ~all`)
   - **DMARC:** TXT record (`_dmarc.santhaya.com` $\rightarrow$ `v=DMARC1; p=none;`)
   - **MX:** Optional (if inbound mail routed through Google Workspace or Microsoft 365).
4. Click **Verify Records** in Resend until status displays **Verified**.

---

## 6. HOSTING PLATFORM DEPLOYMENT (VERCEL)

*Note on Plan Tiers: Vercel Hobby (Free plan) is 100% supported for all Next.js 14 App Router, Server Actions, and Edge Middleware features. Vercel Pro is an optional team convenience.*

### 6.1 Project Import & Repository Link
1. In the Vercel Dashboard, select **Add New Project**.
2. Connect the GitHub repository: `https://github.com/Ritik9631/Santhaya-Associates-.git`.
3. Select branch: `master`.
4. Framework Preset: **Next.js**.
5. Root Directory: `Santhaya-Associates` (if subfolder) or repository root.

### 6.2 Environment Variables Configuration
Configure the following production environment variables in the Vercel Project Settings:

| Key | Type | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Plaintext | Production Supabase URL (`https://<prod>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Plaintext | Production Supabase anonymous public key |
| `NEXT_PUBLIC_SITE_URL` | Plaintext | `https://santhaya.com` (Production canonical URL) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Production Supabase service-role secret key |
| `RESEND_API_KEY` | Secret | Production Resend API Key (`re_...`) |
| `EMAIL_FROM_ADDRESS` | Plaintext | `Santhaya Associates <inquiries@santhaya.com>` |
| `EMAIL_PROVIDER` | Plaintext | `resend` |
| `RATE_LIMIT_SALT` | Secret | 64-character random hexadecimal salt |
| `CRON_SECRET` | Secret | 64-character random hexadecimal secret |
| `EMAIL_DAILY_LIMIT` | Plaintext | `80` (or plan ceiling) |
| `EMAIL_MONTHLY_LIMIT` | Plaintext | `2500` (or plan ceiling) |
| `NODE_ENV` | Plaintext | `production` |

### 6.3 Vercel Cron Configuration
Ensure `vercel.json` exists in the repository root or configure the Vercel Cron schedule:
```json
{
  "crons": [
    {
      "path": "/api/cron/process-outbox",
      "schedule": "*/2 * * * *"
    }
  ]
}
```
*Note:* Vercel will automatically attach the `Authorization: Bearer <CRON_SECRET>` header to all cron requests.

---

## 7. AUTOMATED SMOKE TESTING & VERIFICATION

After deployment completes, execute the following smoke tests against the live production URL (`https://santhaya.com`):

### 7.1 Public Surface Checks
```powershell
# 1. Verify Homepage returns 200 and security headers
curl -I https://santhaya.com

# Expected Headers:
# HTTP/2 200
# x-frame-options: DENY
# x-content-type-options: nosniff
# referrer-policy: strict-origin-when-cross-origin

# 2. Verify robots.txt blocks /staff/
curl https://santhaya.com/robots.txt

# 3. Verify sitemap.xml is accessible
curl https://santhaya.com/sitemap.xml
```

### 7.2 Staff Perimeter Interception Check
```powershell
# Verify unauthenticated /staff is redirected to /staff/login
curl -I https://santhaya.com/staff

# Expected Headers:
# HTTP/2 307 (or 302)
# location: /staff/login
# cache-control: no-store, no-cache, must-revalidate, proxy-revalidate
# x-robots-tag: noindex, nofollow
```

### 7.3 Outbox Worker Cron Authentication Check
```powershell
# 1. Unauthenticated request must return 401 Unauthorized
curl -I https://santhaya.com/api/cron/process-outbox
# Expected: HTTP/2 401

# 2. Authenticated request must return 200 OK with batch telemetry
curl -H "Authorization: Bearer <PROD_CRON_SECRET>" https://santhaya.com/api/cron/process-outbox
# Expected: HTTP/2 200 {"success":true,"processed":0,"failed":0,...}
```

---

## 8. POST-DEPLOYMENT MONITORING & OPERATIONAL HANDOVER

1. **Supabase Realtime & Metrics:** Monitor connection pool count, CPU utilization, and transaction rollbacks under **Supabase Reports**.
2. **Vercel Log Drain:** Monitor Edge Middleware execution times, function invocation errors, and 4xx/5xx status rates under **Vercel Logs**.
3. **Staff Operations Handover:**
   - Log into `https://santhaya.com/staff/login` with the provisioned Super Admin credentials.
   - Navigate to `/staff/team/invite` to provision accounts for authorized company staff (Admins, Estimators, Billing Managers).
   - Confirm outbox status on `/staff/communications`.
4. **Sign-off:** DevOps engineer and business owner sign off on the production deployment log.

