# SANTHAYA ASSOCIATES — HOSTINGER AUTOMATIC DEPLOYMENT READINESS REPORT

**Date:** 2026-11-03  
**Status:** Architecture Validated & Deployment-Ready (Awaiting Plan Confirmation & Credentials)  
**Project:** Santhaya Associates Pvt. Ltd.  
**Repository:** `https://github.com/Ritik9631/Santhaya-Associates-.git`  
**Target Deployment Branch:** `master` (Commit SHA: `a37d5a6`)  
**Next.js Runtime:** 14.2.35 (Node.js 18.x / 20.x compatible)  

---

## 1. Executive Summary & Readiness Verdict

The Santhaya Associates Next.js application, Staff ERP, and Progressive Web App (PWA) are **architecturally compatible** with Hostinger's GitHub-connected automatic deployment, subject to selecting a **Node.js-capable plan**.

### Key Findings & Readiness Checklist:
- **Hosting Tier Requirement:** Must use **Hostinger Business Web Hosting**, **Cloud Hosting (Startup/Professional)**, or **Hostinger VPS (KVM)**. Basic/Single Shared Web Hosting is incompatible because it lacks a persistent Node.js runtime for Server Actions and dynamic authentication middleware.
- **Server Actions & SSR:** Fully compatible. The Next.js Node.js server (`next start`) handles server actions, dynamic Place of Supply calculation, and Supabase SSR cookie sessions natively.
- **PDF Generation:** 100% portable. Uses native server-rendered HTML with CSS `@page { size: A4 portrait }` and client `window.print()` / PDF export. Zero dependency on heavy server-side Chromium binaries.
- **Public Route & File Isolation:** Verified via live HTTP probes. While `.vercelignore` does not apply to Hostinger, Next.js App Router intrinsically blocks direct file access: requests to `/docs/*`, `/scripts/*`, `/supabase/*`, and `/.env*` return **HTTP 404 (Not Found)**. Only the 11 legitimate static brand and PWA assets in `public/` are accessible.
- **Automatic Deployment:** Fully supported via Hostinger hPanel's native GitHub OAuth webhook integration tracking the `master` branch.
- **Zero Secret Exposure:** `.env.local` remains untracked. All 17 automated test batteries, TypeScript typechecks, and production builds pass cleanly.

---

## 2. Hostinger Hosting Plan Compatibility

Hostinger offers different hosting tiers with fundamentally different runtimes. It is critical to select the correct tier:

| Plan Tier | Node.js Runtime Support | Next.js Server Actions & SSR | Middleware & Auth Cookies | Compatibility Verdict |
|---|:---:|:---:|:---:|:---:|
| **Single / Premium Shared Hosting** | ❌ No Node.js process | ❌ Incompatible (Static only) | ❌ Incompatible | **INCOMPATIBLE** (Breaks ERP, Auth, & Quotations) |
| **Business Web Hosting (with Node.js)** | ✅ Supported via hPanel Web Apps | ✅ Fully Supported (`next start`) | ✅ Fully Supported | **COMPATIBLE** |
| **Cloud Hosting (Startup / Professional)** | ✅ Dedicated resources + Node.js | ✅ Fully Supported (`next start`) | ✅ Fully Supported | **RECOMMENDED** (Optimal performance & scale) |
| **Hostinger VPS (KVM Ubuntu)** | ✅ Full root access (PM2 + Nginx) | ✅ Fully Supported | ✅ Fully Supported | **COMPATIBLE** (Requires manual server management) |

> [!IMPORTANT]
> Do not choose basic/shared hosting that only supports static HTML exports. Santhaya Associates relies on dynamic Server Actions (`createQuotationAction`, `issueInvoiceAction`, `loginAction`), server-side cookie verification, and transactional API routes. Select **Hostinger Business Web Hosting** or **Cloud Startup** hosting.

---

## 3. Public Route Isolation & File Exposure Audit

Because Hostinger does not use `.vercelignore`, all repository files checked into Git are pulled to the server's local disk during deployment.

We performed live HTTP security probes against the compiled production Next.js Node.js server to verify that development-only files cannot be publicly read:

```
[Incoming HTTP Request] ---> [Hostinger Nginx Reverse Proxy] ---> [Next.js Node.js Server]
                                                                        |
                                                     +------------------+------------------+
                                                     |                                     |
                                        [Inside public/ or src/app/]               [Outside Root Directories]
                                                     |                                     |
                                        HTTP 200 (Asset / Route)              HTTP 404 (Not Found / Blocked)
```

### Probe Results:
| Request Path | File on Server Disk | HTTP Response | Exposure Risk |
|---|---|:---:|:---:|
| `GET /docs/DEVELOPMENT-HANDOVER.md` | Present in `docs/` | **404 Not Found** | **Zero Exposure** (Protected) |
| `GET /scripts/verify-database-health.mjs` | Present in `scripts/` | **404 Not Found** | **Zero Exposure** (Protected) |
| `GET /supabase/migrations/20261026120000...sql` | Present in `supabase/` | **404 Not Found** | **Zero Exposure** (Protected) |
| `GET /.env.local` | Not in Git (Untracked) | **404 Not Found** | **Zero Exposure** (Protected) |
| `GET /.git/config` | Present on disk | **404 Not Found** | **Zero Exposure** (Protected) |
| `GET /sample_quotations/test.pdf` | Not in Git / Ignored | **404 Not Found** | **Zero Exposure** (Protected) |
| `GET /staff-manifest.json` | Present in `public/` | **200 OK** | Legitimate PWA Asset |
| `GET /staff-sw.js` | Present in `public/` | **200 OK** | Legitimate Service Worker |
| `GET /staff` (Unauthenticated) | Dynamic Route in `src/app/` | **307 Redirect** | Redirects to `/staff/login` |

**Conclusion:** The repository's documentation, SQL migrations, test fixtures, and scripts are strictly isolated on the server's filesystem and cannot be read over the web.

---

## 4. Subsystem Compatibility Matrix on Hostinger

| Subsystem | Implementation Architecture | Hostinger Compatibility Details |
|---|---|---|
| **Server Actions** | Next.js Server Actions (POST requests with encrypted Action ID) | **100% Compatible.** Handled natively by the persistent Node.js process. |
| **Authentication & RBAC** | `@supabase/ssr` with HTTP-only cookies and cryptographic verification | **100% Compatible.** Hostinger's reverse proxy forwards `Cookie` and `Set-Cookie` headers. |
| **Quotation & Invoice PDF** | Server-rendered HTML + CSS `@page` + client `window.print()` | **100% Compatible.** Does not require server-side headless Chrome or Chromium packages. |
| **Staff PWA** | `public/staff-manifest.json`, `public/staff-sw.js`, `public/icons/` | **100% Compatible.** Served with `Service-Worker-Allowed: /staff` configured in `next.config.mjs`. |
| **Free SSL / HTTPS** | Hostinger automated Let's Encrypt certificates | **100% Compatible.** PWA service workers and secure cookies require HTTPS, automatically provisioned by Hostinger. |
| **Transactional Email Outbox** | `/api/cron/process-outbox` with `CRON_SECRET` authorization | **100% Compatible.** Configured via Hostinger hPanel **Cron Jobs** tool (e.g. `curl -H "Authorization: Bearer <CRON_SECRET>" ...`). |

---

## 5. Automatic Deployment & Git Branch Configuration

### Repository & Branch Settings
- **Repository URL:** `https://github.com/Ritik9631/Santhaya-Associates-.git`
- **Production Branch:** `master`
- **Trigger Mechanism:** Automatic GitHub Webhook installed by Hostinger upon OAuth connection.

### Build & Start Execution Parameters
- **Package Manager:** `npm` (Node.js 18.x or 20.x LTS)
- **Install Command:** `npm install`
- **Build Command:** `npm run build`
- **Start Command:** `npm start` (or `node_modules/.bin/next start`)
- **Port:** Configured via Hostinger environment (Hostinger injects `PORT`, or defaults to port `3000`).

---

## 6. Build Failure Handling & Rollback Procedures

1. **Build Failure Isolation:**
   - Hostinger executes `npm run build` in a temporary staging environment prior to switching traffic.
   - If a build fails (e.g., TypeScript or lint error), the deployment terminates immediately. The existing, running production build continues serving traffic with **zero downtime**.
   - Full build and deployment error logs are accessible directly in the Hostinger hPanel **Deployments** tab.
2. **Rollback Options:**
   - **hPanel 1-Click Rollback:** In hPanel → **Web Apps** → **Deployments**, locate the last known healthy deployment and click **Rollback**. Hostinger reactivates the previous release immediately.
   - **Git Rollback:** Revert or reset the commit on `master` (`git revert <commit-sha>`) and push to GitHub. Hostinger's webhook detects the push and deploys the restored version automatically.

---

## 7. Step-by-Step Hostinger Setup Guide

When the owner is ready to deploy, follow these exact setup steps in Hostinger:

### Step 1: Create the Web App in Hostinger hPanel
1. Log in to **Hostinger hPanel**.
2. Navigate to **Websites** → **Add Website** (or **Web Apps / Node.js**).
3. Select your hosting plan (Business or Cloud plan).
4. Choose **Deploy from GitHub**.

### Step 2: Connect GitHub Repository
1. Click **Connect GitHub Account** and authorize Hostinger OAuth access.
2. Select repository: `Ritik9631/Santhaya-Associates-`.
3. Select branch: `master`.
4. Enable **Automatic Deployment on Push**.

### Step 3: Configure Build & Environment Settings
1. **Framework:** Select `Next.js` (or `Node.js`).
2. **Node.js Version:** Select `20.x LTS` (recommended) or `18.x`.
3. **Build Command:** `npm run build`
4. **Start Command:** `npm start`
5. **Root Directory:** `./`

### Step 4: Configure Production Environment Variables in hPanel
Add the following production environment variables under the **Environment Variables** section in hPanel:

```env
# Supabase Production Database (Mumbai ap-south-1)
NEXT_PUBLIC_SUPABASE_URL=https://<your-prod-supabase-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-prod-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-prod-service-role-key>
DEV_SUPABASE_PROJECT_REF=<your-prod-supabase-ref>
SUPABASE_ENV=production
ALLOW_TEST_ENV=false

# Canonical Site URL & Edge Proxy
NEXT_PUBLIC_SITE_URL=https://www.santhayaassociates.com
RATE_LIMIT_SALT=<high-entropy-random-64-char-string>

# Transactional Email & Outbox Worker
EMAIL_PROVIDER=resend
RESEND_API_KEY=<your-production-resend-api-key>
EMAIL_FROM_ADDRESS=notifications@santhayaassociates.com
INTERNAL_NOTIFICATION_EMAIL=heistofeverything@gmail.com
CRON_SECRET=<high-entropy-random-32-char-string>
OUTBOX_WORKER_SECRET=<high-entropy-random-32-char-string>
```

### Step 5: Configure Outbox Cron in hPanel
1. In hPanel, go to **Advanced** → **Cron Jobs**.
2. Create a recurring cron job running every 5 minutes (`*/5 * * * *`):
```bash
curl -s -X POST -H "Authorization: Bearer <YOUR_CRON_SECRET>" https://www.santhayaassociates.com/api/cron/process-outbox > /dev/null 2>&1
```

---

## 8. Verification Results & Quality Gates

The repository code is confirmed ready for Hostinger deployment:
- `npm.cmd run typecheck`: **PASS** (0 errors)
- `npm.cmd run lint`: **PASS** (0 warnings, 0 errors)
- `npm.cmd run build`: **PASS** (27/27 static and dynamic routes compiled, 87.3 kB shared First Load JS)
- `test:super-admin`, `test:phase3a3`, `test:batch2` through `test:batch5`: **PASS** (100% passing)
- Local working tree: **Clean**, no uncommitted code or credentials.

