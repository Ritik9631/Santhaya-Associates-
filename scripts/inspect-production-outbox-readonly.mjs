/**
 * Santhaya Associates — Read-Only Inspection of Production Email Outbox
 * File: scripts/inspect-production-outbox-readonly.mjs
 *
 * STRICTLY READ-ONLY:
 * Queries public.email_outbox on the production project flxhwgevmqvuqdjaejwa.
 * ZERO mutations, zero writes, zero state changes.
 */

import fs from 'node:fs';

const prodEnvPath = '.env.production.local';
if (!fs.existsSync(prodEnvPath)) {
  console.error('❌ Missing .env.production.local');
  process.exit(1);
}

const prodEnv = fs.readFileSync(prodEnvPath, 'utf8');
const urlMatch = prodEnv.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = prodEnv.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);

const prodUrl = urlMatch ? urlMatch[1].trim() : '';
const prodKey = keyMatch ? keyMatch[1].trim() : '';

if (!prodUrl.includes('flxhwgevmqvuqdjaejwa') || !prodKey) {
  console.error('❌ Invalid production configuration in .env.production.local');
  process.exit(1);
}

console.log('='.repeat(70));
console.log('SANTHAYA ASSOCIATES — PRODUCTION EMAIL OUTBOX READ-ONLY AUDIT');
console.log('='.repeat(70));
console.log(`Target: ${prodUrl} (flxhwgevmqvuqdjaejwa)`);
console.log('Mode:   STRICTLY READ-ONLY (GET requests only)\n');

async function auditProductionOutbox() {
  // 1. Fetch all outbox jobs (read-only)
  const res = await fetch(`${prodUrl}/rest/v1/email_outbox?select=id,recipient_email,subject,email_type,status,attempts,max_attempts,next_retry_at,created_at,processed_at&order=created_at.asc`, {
    method: 'GET',
    headers: {
      'apikey': prodKey,
      'Authorization': `Bearer ${prodKey}`,
    },
  });

  if (!res.ok) {
    console.error(`❌ HTTP Error querying production outbox: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.error(text);
    process.exit(1);
  }

  const jobs = await res.json();
  console.log(`Total rows in production email_outbox: ${jobs.length}`);

  if (jobs.length === 0) {
    console.log('✓ Production email_outbox is completely empty.');
    return;
  }

  // Aggregate by status
  const statusSummary = {};
  jobs.forEach(j => {
    const s = j.status;
    if (!statusSummary[s]) {
      statusSummary[s] = {
        count: 0,
        earliest: j.created_at,
        latest: j.created_at,
        types: {},
        domains: new Set(),
      };
    }
    statusSummary[s].count++;
    if (new Date(j.created_at) < new Date(statusSummary[s].earliest)) statusSummary[s].earliest = j.created_at;
    if (new Date(j.created_at) > new Date(statusSummary[s].latest)) statusSummary[s].latest = j.created_at;
    statusSummary[s].types[j.email_type] = (statusSummary[s].types[j.email_type] || 0) + 1;

    const atIdx = (j.recipient_email || '').indexOf('@');
    if (atIdx > 0) statusSummary[s].domains.add(j.recipient_email.slice(atIdx + 1));
  });

  console.log('\n--- Status Breakdown ---');
  Object.entries(statusSummary).forEach(([status, info]) => {
    console.log(`\nStatus: "${status.toUpperCase()}" (${info.count} jobs)`);
    console.log(`  - Earliest created_at: ${info.earliest}`);
    console.log(`  - Latest created_at:   ${info.latest}`);
    console.log(`  - Email types:`, info.types);
    console.log(`  - Recipient domains:`, Array.from(info.domains));
  });

  // Calculate safest cutoff timestamp
  const now = new Date();
  console.log('\n--- Safest Release Cutoff Analysis ---');
  const pendingOrFailed = jobs.filter(j => j.status === 'pending' || j.status === 'failed');
  console.log(`Pending or Failed jobs that could potentially dispatch: ${pendingOrFailed.length}`);

  if (pendingOrFailed.length > 0) {
    const latestPending = pendingOrFailed.reduce((max, j) => new Date(j.created_at) > new Date(max) ? j.created_at : max, pendingOrFailed[0].created_at);
    console.log(`Latest pending/failed job was created at: ${latestPending}`);
    const recommendedCutoff = new Date(new Date(latestPending).getTime() + 1000).toISOString();
    console.log(`RECOMMENDED OUTBOX_BACKLOG_CUTOFF_TIME: "${recommendedCutoff}"`);
  } else {
    console.log('Zero pending or failed jobs in production outbox.');
    console.log(`RECOMMENDED OUTBOX_BACKLOG_CUTOFF_TIME: "${now.toISOString()}"`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('READ-ONLY AUDIT COMPLETE — ZERO PRODUCTION ROWS ALTERED');
  console.log('='.repeat(70));
}

auditProductionOutbox().catch(err => {
  console.error('Audit exception:', err);
  process.exit(1);
});

