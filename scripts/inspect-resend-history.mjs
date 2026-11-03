import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const envLocalPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const envVars = {};
for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envVars[key] = val;
  }
}

const client = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function inspectHistory() {
  console.log('='.repeat(70));
  console.log('RESEND INTEGRATION & HISTORICAL DELIVERY AUDIT');
  console.log('='.repeat(70));

  // 1. Check outbox records with status = 'sent' or non-null provider_message_id
  const { data: sentJobs, error: sentErr } = await client
    .from('email_outbox')
    .select('id, recipient_email, subject, email_type, status, provider_message_id, created_at, processed_at, attempts')
    .or('status.eq.sent,provider_message_id.not.is.null')
    .order('created_at', { ascending: false });

  if (sentErr) {
    console.error('Error querying sent outbox records:', sentErr);
  } else {
    console.log(`\nFound ${sentJobs?.length || 0} sent/provider-recorded outbox records:`);
    for (const job of (sentJobs || [])) {
      console.log(`- ID: ${job.id}`);
      console.log(`  Recipient: ${job.recipient_email}`);
      console.log(`  Subject: ${job.subject}`);
      console.log(`  Type: ${job.email_type}`);
      console.log(`  Status: ${job.status}`);
      console.log(`  Provider Message ID: ${job.provider_message_id || 'none'}`);
      console.log(`  Created: ${job.created_at} | Processed: ${job.processed_at}`);
      console.log(`  Attempts: ${job.attempts}`);
    }
  }

  // 2. Check total outbox status breakdown
  const { data: allStatuses, error: statusErr } = await client
    .from('email_outbox')
    .select('status');

  if (!statusErr && allStatuses) {
    const counts = {};
    for (const row of allStatuses) {
      counts[row.status] = (counts[row.status] || 0) + 1;
    }
    console.log('\nTotal Outbox Records Breakdown:', counts);
  }

  // 3. Check Resend configuration in envVars without revealing keys
  console.log('\n--- Environment Resend Keys Audit ---');
  console.log(`RESEND_API_KEY present: ${!!envVars.RESEND_API_KEY}`);
  if (envVars.RESEND_API_KEY) {
    console.log(`RESEND_API_KEY length: ${envVars.RESEND_API_KEY.length} characters`);
    console.log(`RESEND_API_KEY prefix: ${envVars.RESEND_API_KEY.slice(0, 7)}...`);
  }
  console.log(`EMAIL_PROVIDER: ${envVars.EMAIL_PROVIDER}`);
  console.log(`EMAIL_FROM_ADDRESS: ${envVars.EMAIL_FROM_ADDRESS}`);
  console.log(`CRON_SECRET present: ${!!envVars.CRON_SECRET} (len: ${envVars.CRON_SECRET?.length || 0})`);
  console.log(`OUTBOX_WORKER_SECRET present: ${!!envVars.OUTBOX_WORKER_SECRET} (len: ${envVars.OUTBOX_WORKER_SECRET?.length || 0})`);
}

inspectHistory().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});

