# Santhaya Associates — Production Safety & Controlled Release Policy

> **Live Official Website:** [https://santhayaassociates.com](https://santhayaassociates.com)  
> **Production Supabase Project:** `flxhwgevmqvuqdjaejwa` (Singapore `ap-southeast-1`)  
> **Development Supabase Project:** `bkqneudnnhvvwmtggorz` (Strictly isolated sandbox)  
> **Production Git Branch:** `master`  
> **Release Baseline Commit:** `6c5a941075e153edd690063ff8e8b7e818488322`  
> **New Development Feature Branch:** `feature/enquiry-notifications-and-soft-delete`

---

## 1. Executive Summary

The Santhaya Associates Staff ERP is actively in production and in daily use by company staff. All future engineering work must follow strict **zero-regression, fail-closed, and non-destructive** operational rules:
1. **Never commit or push directly to `master`:** `master` is directly connected to Hostinger automatic production deployments.
2. **Never mutate production data during development or testing:** All write tests, schema tests, and functional experiments must target the development database (`bkqneudnnhvvwmtggorz`).
3. **No destructive database operations:** Physical record deletion (`DROP TABLE`, `DROP COLUMN`, raw `DELETE`) is strictly forbidden. All business entities use reversible soft deletion.
4. **Independent release verification:** Every release must be validated through automated test suites, linting, typechecking, and production builds before owner review and deployment.

---

## 2. Production Release Baseline

```mermaid
flowchart LR
    Baseline["Production Baseline<br/><code>6c5a941</code> (master)"] --> Deploy["Hostinger Production<br/>santhayaassociates.com"]
    Baseline -.-> Branch["Feature Branch<br/><code>feature/enquiry-notifications-and-soft-delete</code>"]
    Branch -.-> DevDB["Development DB<br/><code>bkqneudnnhvvwmtggorz</code>"]
    Deploy --> ProdDB["Production DB<br/><code>flxhwgevmqvuqdjaejwa</code>"]
```

### Verified Release Baseline Status

| Component | Verified State | Verification Method |
| :--- | :--- | :--- |
| **Git Commit SHA** | `6c5a941075e153edd690063ff8e8b7e818488322` | `git rev-parse HEAD` on `origin/master` |
| **Commit Message** | `fix(auth): decouple recovery link from GET prefetching and support direct token_hash verification` | Clean tree |
| **Hostinger Runtime** | **HTTP 200 OK — Healthy** | `/api/health/env` (Token authenticated) |
| **Production DB Ref** | `flxhwgevmqvuqdjaejwa` | Decoded JWT in runtime env guard |
| **Super Administrators** | `santhayapvt.ltd@gmail.com` (UID: `c555846d...`, Active)<br/>`heistofeverything@gmail.com` (UID: `b132f356...`, Active) | `scripts/verify-production-dual-super-admins.mjs` |
| **Custom SMTP** | Operational for Password Recovery & Staff Onboarding | Verified via Supabase Auth GoTrue |

---

## 3. Git Branching & Release Strategy

### Branch Architecture
1. **`master` (Protected Production):**
   - Reflects exclusively what is deployed and operational on `https://santhayaassociates.com`.
   - Direct commits and direct pushes to `master` are strictly disallowed.
   - Merges to `master` require:
     - 100% passing tests, lint, and build.
     - Explicit written owner approval.
2. **`feature/enquiry-notifications-and-soft-delete` (Development Feature Branch):**
   - Created from baseline `6c5a941`.
   - All code adjustments, migrations, tests, and documentation are authored here.
   - Pushes to this branch do **not** trigger Hostinger production builds.

```
master -----------------------------------------------------> [Live on Hostinger]
   \
    \---> feature/enquiry-notifications-and-soft-delete (Dev & Test on Sandbox)
```

---

## 4. Environment & Data Isolation Matrix

| Environment | Purpose | Database Target | Allowed Operations |
| :--- | :--- | :--- | :--- |
| **Development** (`feature/*`) | Local coding, automated tests, UI testing | `bkqneudnnhvvwmtggorz` | Create/drop test tables, create mock users, simulate email dispatches, reset test data. |
| **Staging / Preview** | Pre-merge verification | `bkqneudnnhvvwmtggorz` | Staging smoke tests, schema dry-runs. **Never has production keys.** |
| **Production** (`master`) | Live client operations | `flxhwgevmqvuqdjaejwa` | **Read-only health checks and reviewed, owner-approved forward migrations only.** Zero automated write tests. |

> [!CAUTION]
> **Production Protection Guard:**  
> Production credentials (`flxhwgevmqvuqdjaejwa` URL, service role key, cron secret) must **never** be injected into preview, staging, or test environments. The application's `src/lib/supabase/env.ts` guard will throw a fatal startup error if mismatched environment keys are detected.

---

## 5. Backup & Recovery Readiness

### Production Supabase (`flxhwgevmqvuqdjaejwa`) Assessment
- **Automated Snapshots:** Supabase Free Tier maintains automated daily database backups retained for **24 hours**.
- **Point-In-Time Recovery (PITR):** PITR is a Supabase Pro feature ($25/mo). Because the current project is on the Free tier, automated sub-hour rollback is not available via GUI.
- **Mandatory Pre-Release Logical Backup Procedure:**
  Before executing any schema update or major release in production, a full logical export must be archived:
  ```bash
  # Step 1: Export database schema
  pg_dump "postgresql://postgres:[PASSWORD]@db.flxhwgevmqvuqdjaejwa.supabase.co:5432/postgres" \
    --schema-only -f backups/prod_schema_$(date +%Y%m%d_%H%M%S).sql

  # Step 2: Export business data
  pg_dump "postgresql://postgres:[PASSWORD]@db.flxhwgevmqvuqdjaejwa.supabase.co:5432/postgres" \
    --data-only --exclude-table=audit_logs -f backups/prod_data_$(date +%Y%m%d_%H%M%S).sql
  ```
- **Disaster Recovery Steps:**
  1. If an erroneous transaction occurs, inspect `public.audit_logs` (which are tamper-resistant and immutable) to identify affected rows and timestamps.
  2. Restore individual corrupted table records using the pre-release export file.

---

## 6. Hostinger Deployment & Resource Limitations

1. **Deployment Pipeline:**
   - Hostinger Node.js Application is bound to `master`. A push to `origin/master` immediately triggers `npm run build` and restarts the Node process.
2. **Pull Request Previews:**
   - Hostinger does **not** offer ephemeral PR previews natively.
   - To provide staging on Hostinger, a separate subdomain (e.g., `staging.santhayaassociates.com`) must be created in hPanel, bound to a `staging` branch, and configured exclusively with development database credentials (`bkqneudnnhvvwmtggorz`).
3. **Resource & Memory Constraints:**
   - Hostinger Node.js tier operates with shared memory limits (typically 512 MB to 1 GB).
   - `next build` consumes ~350–400 MB of RAM during static generation of the 29 routes.
   - Builds should not be initiated during peak business hours (10:00 AM – 6:00 PM IST) to prevent brief resource competition.
4. **Downtime Window During Deployments:**
   - During `git pull && next build && pm2 reload`, Hostinger reloads the application. Users might experience a ~5–10 second latency spike or brief reconnect. Releases must be scheduled outside of business peak hours.

---

## 7. Pre-Deployment Test Checklist

Every pull request or release candidate must pass all items below prior to owner signoff:

- [ ] **Working Tree Clean:** `git status` shows no untracked or uncommitted files.
- [ ] **Code Linting:** `npm run lint` completes with **0 warnings and 0 errors**.
- [ ] **Type Safety:** `tsc --noEmit` completes with **0 compilation errors**.
- [ ] **Test Suites Pass:**
  - `npm test` (All sandbox unit & integration tests pass).
  - `node scripts/test-phase7-recovery-and-handover.mjs` (13/13 Pass).
  - `node scripts/test-phase7-recovery-resilience.mjs` (9/9 Pass).
- [ ] **Production Build Check:** `npm run build` succeeds locally with exit code 0.
- [ ] **Zero Credential Exposure:** No API keys, passwords, or service-role keys staged in git.
- [ ] **Database Migration Review:** Migration is purely additive (`ADD COLUMN IF NOT EXISTS`), forward-compatible, and tested on development.
- [ ] **Explicit Owner Signoff:** Written approval received from company owner.

---

## 8. Rollback Runbook

### Application Code Rollback (< 2 Minutes)
If a software bug is detected in production after deployment:
1. Revert to the known stable baseline (`6c5a941`):
   ```bash
   git revert HEAD --no-edit
   git push origin master
   ```
2. Hostinger will automatically detect the push, rebuild the stable code, and restart the server within 60 seconds.
3. Verify site health immediately at `https://santhayaassociates.com/api/health/env`.

### Schema Rollback Rules
- **Additive Migrations Only:** Never drop tables or columns. If a feature is rolled back, the new columns remain dormant in PostgreSQL without affecting legacy application code.
- **Session Continuity:** Existing staff sessions and JWTs remain valid across rollbacks because encryption keys and Supabase Auth schemas remain unchanged.

---

## 9. Proposed Implementation Plans for Upcoming Features

### Feature A: Real Resend Quotation Enquiry Notifications

#### Business Objective
When a customer submits a quotation request on `santhayaassociates.com`, an instant, formatted email notification is delivered to the company mailbox `santhayapvt.ltd@gmail.com`, and a confirmation email is delivered to the customer.

#### Architectural Safeguards
1. **Recipient Protection:** Enforce `INTERNAL_NOTIFICATION_EMAIL=santhayapvt.ltd@gmail.com` in Hostinger environment variables.
2. **Prevent Replaying Old Mock Emails:**
   - During development and earlier phases, mock jobs were recorded in `public.email_outbox`.
   - Before activating real email dispatch, run a pre-activation migration in production:
     ```sql
     UPDATE public.email_outbox
     SET status = 'dead_letter', error_detail = 'Archived prior to live email activation'
     WHERE status = 'pending' AND created_at < NOW();
     ```
   - This guarantees that the owner's inbox will **never** be flooded with old test messages.
3. **Targeted Outbox Processing:**
   - In `src/app/api/quotation-request/route.ts`, `processOutboxBatch` is called strictly with `jobIds: [newJobId]`. It dispatches only the newly generated enquiry.
4. **Verified Sender:**
   - Outbound sender: `notifications@santhayaassociates.com` (verified SPF/DKIM/DMARC in Resend).
   - Customer confirmation sender: `quotations@santhayaassociates.com`.
5. **No Interference with Supabase Auth:**
   - Forgot Password and Staff Invites continue using Supabase Custom SMTP. They remain completely independent and protected.

---

### Feature B: Soft-Delete and Restore for Quotation Enquiries

#### Business Objective
Allow administrators to archive or soft-delete spam/duplicate website enquiries from `/staff/enquiries` without deleting business records or losing historical data.

#### Architectural Safeguards
1. **Schema Design (Non-Destructive):**
   ```sql
   ALTER TABLE public.quotation_requests
     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
     ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.staff_profiles(id) DEFAULT NULL,
     ADD COLUMN IF NOT EXISTS deletion_reason TEXT DEFAULT NULL;

   CREATE INDEX IF NOT EXISTS idx_quotation_requests_active
     ON public.quotation_requests(created_at DESC)
     WHERE deleted_at IS NULL;
   ```
2. **Physical Delete Block:**
   - PostgreSQL RLS prevents `DELETE FROM quotation_requests`.
   - Deletion is strictly an `UPDATE` setting `deleted_at = NOW()`.
3. **Privilege Ceilings:**
   - Only `admin` and `super_admin` can soft-delete or restore enquiries.
   - Ordinary estimators or viewers cannot delete or hide enquiries.
4. **Audit Trail:**
   - Every deletion logs `enquiry_soft_deleted` to `public.audit_logs`.
   - Every restoration logs `enquiry_restored` to `public.audit_logs`.
5. **UI Specifications:**
   - `/staff/enquiries` defaults to active items (`deleted_at IS NULL`).
   - Admins have an "Archived / Trash" tab to view soft-deleted enquiries and click "Restore" at any time.

---

## 10. Unresolved Risks Requiring Owner Attention

1. **Supabase Free Tier Backup Limit (24 Hours):**
   - Automated daily snapshots expire after 1 day. If an issue is discovered after 48 hours, Supabase Free Tier cannot restore point-in-time data. Recommend upgrading to Supabase Pro ($25/mo) as transaction volumes grow.
2. **Hostinger Single-Node Deployment Window:**
   - Deploying updates causes a ~5–10 second connection reload during `next build`. Releases must be scheduled during low-traffic windows (e.g., after 8:00 PM IST).
3. **Pre-Purge of Historical Outbox:**
   - The production `email_outbox` table must have legacy test rows flagged as archived before enabling real notification dispatch.

---

> [!IMPORTANT]
> **Controlled Release Policy Sign-off:**  
> Development work on the two upcoming features is isolated to branch `feature/enquiry-notifications-and-soft-delete`. No code will be merged to `master` and no production SQL will be executed without explicit operator review and authorization.

