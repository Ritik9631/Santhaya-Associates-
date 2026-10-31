# SANTHAYA ASSOCIATES — PRODUCTION ROLLBACK & DISASTER RECOVERY RUNBOOK

**Target System:** Santhaya Associates Enterprise Platform  
**Target Environment:** Production  
**Document Revision:** 1.0.0  
**Effective Date:** October 31, 2026  
**Audience:** Site Reliability Engineers, DevOps Engineers, Database Administrators  
**Incident Classification:** Severity 1 (Outage) / Severity 2 (Degraded Operation)

---

## 1. INCIDENT SEVERITY CLASSIFICATIONS & OBJECTIVES

| Severity Level | Definition | Recovery Time Objective (RTO) | Recovery Point Objective (RPO) |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Complete platform unavailability, database connectivity failure, or data corruption | $< 30\text{ minutes}$ | $< 5\text{ minutes}$ (via Supabase PITR) |
| **SEV-2 (Major)** | Transactional email failure, billing sequence deadlock, or staff ERP login failure | $< 60\text{ minutes}$ | Zero data loss (outbox persistence) |
| **SEV-3 (Minor)** | Visual regression, minor UI bug, non-blocking telemetry discrepancy | Next deployment cycle | Zero data loss |

---

## 2. SCENARIO A: APPLICATION / FRONT-END RELEASE FAILURE

If a newly deployed front-end version causes runtime crashes, hydration errors, or broken navigation:

### 2.1 Instant Rollback via Vercel Console
1. Open the Vercel Dashboard for the Santhaya Associates project.
2. Navigate to the **Deployments** tab.
3. Identify the last known stable deployment (e.g., commit SHA `afd7b2907886200c640890ad5beebf90ec101eb3`).
4. Click the three dots (`...`) next to the stable deployment and select **Instant Rollback**.
5. Confirm the rollback dialog.
6. *Outcome:* Vercel instantly re-routes edge traffic to the previous immutable build artifact within 5 seconds without rebuilding.

### 2.2 Instant Rollback via Vercel CLI
```powershell
# List recent deployments
vercel deployment ls

# Promote previous deployment directly to production
vercel alias set <previous-deployment-url> santhaya.com
```

### 2.3 Post-Rollback Action
- Freeze production deployments.
- Replicate the defect in the local development environment using `npm run build` and `npm run test:phase5-browser`.
- Author a fix and verify via automated test suites before re-deploying.

---

## 3. SCENARIO B: TRANSACTIONAL EMAIL / OUTBOX DELIVERY OUTAGE

If Resend experiences an outage, API key revocation, or free-tier quota exhaustion:

### 3.1 Immediate Mitigation: Graceful Queue Holding
The Santhaya Associates platform architecture decouples request ingestion from outbound delivery via the `email_outbox` table. 
- **Customer Experience:** Public quotation submissions and staff quotation/invoice generation continue functioning normally. The UI enqueues delivery jobs into `email_outbox` in status `pending`.
- **Automatic Resilience:** The outbox worker automatically retries failed jobs at intervals of **1 minute**, **5 minutes**, **15 minutes**, and **1 hour**. No jobs are lost during an upstream provider outage.

### 3.2 Mitigation Steps for Sustained Resend Outage
1. In the Vercel Project Settings, temporarily update:
   ```env
   EMAIL_PROVIDER=mock
   ```
2. Redeploy or restart the environment.
3. The system transitions to `MockEmailProvider`, preventing worker thrashing while logging dispatch attempts in-memory.
4. Once Resend resolves the outage, restore:
   ```env
   EMAIL_PROVIDER=resend
   ```
5. Authorized staff can trigger batch re-delivery on `/staff/communications` by clicking **Trigger Outbox Dispatch**.

---

## 4. SCENARIO C: DATABASE CORRUPTION OR DATA REGRESSION

If a destructive database operation occurs or corrupted data compromises ledger balances:

### 4.1 Point-in-Time Recovery (PITR) Execution (Supabase Pro)
*Note: If operating on the Supabase Free plan, PITR is not available; proceed directly to Section 4.2 to restore from the latest automated or manual `pg_dump` snapshot.*

If Supabase Pro is active, continuous Write-Ahead Log (WAL) archiving allows rollback to any minute within the past 7 days:

1. Navigate to **Supabase Dashboard -> Database -> Backups -> Point in Time**.
2. Select the precise timestamp prior to the incident (e.g., `2026-10-31 10:15:00 UTC`).
3. Click **Restore to this point**.
4. Supabase will provision a restored database instance from the exact WAL snapshot.
5. Update `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel to point to the restored instance if a new project URL was created.

### 4.2 Restoring from Daily Snapshot Dump
If restoring from an automated daily backup (`pg_dump`):
```powershell
# Restore public schema from compressed snapshot
pg_restore -h db.<project-ref>.supabase.co -U postgres -d postgres -v -c -F c santhaya_prod_backup_<date>.dump
```

---

## 5. LIMITATIONS OF DDL ROLLBACK & WHY "DOWN MIGRATIONS" ARE RESTRICTED

> [!WARNING]
> Dropping tables or columns (`DROP TABLE`, `ALTER TABLE ... DROP COLUMN`) in a production database containing real commercial records is strictly prohibited.

### 5.1 Why Down Migrations Risk Catastrophic Data Loss
- If `20261029180000_phase3d_billing_and_payments.sql` were rolled back by dropping the `invoices` table, all generated tax invoices, sequential sequence counters, and payment reconciliation records would be permanently destroyed.
- Even if recreated, statutory CGST Rule 46 gapless numbering continuity would be irreparably broken.

### 5.2 Approved Schema Rollback Pattern: "Roll Forward"
Instead of destructive `DROP` scripts, production schema defects must be resolved by authoring an additive "Roll Forward" migration:
1. Deprecate problematic columns rather than dropping them (`ALTER TABLE ... RENAME COLUMN col TO col_deprecated`).
2. Adjust RLS policies or triggers to relax conflicting constraints.
3. Apply the corrective migration forward.

---

## 6. EMERGENCY MAINTENANCE MODE

If the platform must be taken offline temporarily for emergency investigation:

### 6.1 Enabling Edge Maintenance Mode in Next.js Middleware
To serve an immediate HTTP 503 Service Unavailable page without shutting down the infrastructure, deploy an environment variable flag in Vercel:
```env
MAINTENANCE_MODE=true
```
In `src/middleware.ts`, verify or add:
```typescript
if (process.env.MAINTENANCE_MODE === 'true' && !request.nextUrl.pathname.startsWith('/maintenance')) {
  return new NextResponse(
    `<!DOCTYPE html>
     <html lang="en">
     <head><title>System Maintenance | Santhaya Associates</title></head>
     <body style="font-family:sans-serif;text-align:center;padding:50px;background:#10243B;color:#fff;">
       <h1>Santhaya Associates Enterprise Platform</h1>
       <p>The system is currently undergoing scheduled engineering maintenance.</p>
       <p>Commercial services will resume shortly. Inquiries: info@santhaya.com</p>
     </body>
     </html>`,
    {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Retry-After': '300',
      },
    }
  );
}
```

---

## 7. POST-INCIDENT REVIEW (PIR) PROTOCOL

Within 24 hours of resolving a SEV-1 or SEV-2 incident:
1. Conduct an engineering blameless post-mortem meeting.
2. Document root cause, timeline of events, detection delay, and remediation actions.
3. Author regression test scripts replicating the failure mode and incorporate them into the automated test battery (`npm run test:*`).
4. Update this runbook with newly discovered failure modes.

