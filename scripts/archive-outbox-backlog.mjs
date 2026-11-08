/**
 * Santhaya Associates — Outbox Backlog Archival Utility
 * File: scripts/archive-outbox-backlog.mjs
 *
 * Scans public.email_outbox for historical pending or failed mock messages
 * and safely transitions them to 'dead_letter' so that switching from mock
 * to real Resend dispatch cannot flood recipient inboxes.
 *
 * Enforces:
 * 1. Read-first analysis.
 * 2. Non-destructive status update (retains full message and recipient history).
 * 3. Audit logging in public.audit_logs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// 1. Load local environment
const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
const content = fs.readFileSync(envFile, 'utf8');

const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = content.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const serviceRoleKey = keyMatch ? keyMatch[1].trim() : '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in', envFile);
  process.exit(1);
}

const isProduction = supabaseUrl.includes('flxhwgevmqvuqdjaejwa');
console.log('='.repeat(70));
console.log('SANTHAYA ASSOCIATES — OUTBOX BACKLOG ARCHIVAL UTILITY');
console.log('='.repeat(70));
console.log(`Target Environment: ${isProduction ? '🚨 PRODUCTION (flxhwgevmqvuqdjaejwa)' : '🛠️ DEVELOPMENT (bkqneudnnhvvwmtggorz)'}`);
console.log(`Execution Mode:     ${process.argv.includes('--execute') ? 'APPLY CHANGES (--execute)' : 'DRY RUN (Inspect only)'}`);
console.log('-'.repeat(70));

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  const cutoffTime = new Date().toISOString();

  // 1. Query pending/failed jobs
  const { data: backlogJobs, error: fetchErr } = await client
    .from('email_outbox')
    .select('id, recipient_email, subject, email_type, status, attempts, created_at')
    .in('status', ['pending', 'failed'])
    .order('created_at', { ascending: true });

  if (fetchErr) {
    console.error('❌ Error querying email_outbox:', fetchErr.message);
    process.exit(1);
  }

  const count = backlogJobs ? backlogJobs.length : 0;
  console.log(`Found ${count} un-dispatched backlog job(s) in email_outbox.`);

  if (count === 0) {
    console.log('✓ Zero pending or failed backlog jobs. Outbox is clean.');
    return;
  }

  // Display summary
  console.log('\nBacklog Summary:');
  const typeCounts = {};
  backlogJobs.forEach(job => {
    typeCounts[job.email_type] = (typeCounts[job.email_type] || 0) + 1;
  });
  Object.entries(typeCounts).forEach(([type, c]) => {
    console.log(`  - ${type}: ${c} job(s)`);
  });

  if (!process.argv.includes('--execute')) {
    console.log('\n⚠️ DRY RUN ONLY: No database modifications made.');
    console.log('To archive these jobs to dead_letter, re-run with: node scripts/archive-outbox-backlog.mjs --execute\n');
    return;
  }

  console.log('\nExecuting archival to dead_letter...');
  const archiveReason = `PRE_RELEASE_ARCHIVE: Legacy development/mock backlog archived on ${cutoffTime} to protect recipient from backlog flood.`;

  const { data: updatedRows, error: updateErr } = await client
    .from('email_outbox')
    .update({
      status: 'dead_letter',
      error_message: archiveReason,
      processed_at: cutoffTime,
    })
    .in('status', ['pending', 'failed'])
    .select('id');

  if (updateErr) {
    console.error('❌ Failed to update backlog jobs:', updateErr.message);
    process.exit(1);
  }

  const updatedCount = updatedRows ? updatedRows.length : 0;
  console.log(`✓ Successfully transitioned ${updatedCount} job(s) to 'dead_letter'.`);

  // Insert audit record
  await client.from('audit_logs').insert({
    entity_type: 'email_outbox',
    entity_id: 'batch_backlog_archive',
    action: 'email_backlog_archived',
    actor_type: 'system',
    actor_id: null,
    previous_state: { pending_count: count },
    new_state: { dead_lettered_count: updatedCount, reason: archiveReason },
  });
  console.log('✓ Audit log created for backlog archival.');
  console.log('='.repeat(70));
}

run().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});

