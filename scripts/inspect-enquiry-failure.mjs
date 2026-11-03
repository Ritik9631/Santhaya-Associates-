import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const envLocalPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
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
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function inspect() {
  console.log('='.repeat(70));
  console.log('INVESTIGATION: LATEST ENQUIRIES & OUTBOX RECORDS');
  console.log('='.repeat(70));

  // 1. Get latest 5 quotation_requests
  const { data: enquiries, error: enqErr } = await client
    .from('quotation_requests')
    .select('id, reference_number, business_name, contact_person, email, created_at, status, risk_flag, notes')
    .order('created_at', { ascending: false })
    .limit(5);

  if (enqErr) {
    console.error('Error fetching enquiries:', enqErr);
  } else {
    console.log(`\n--- Latest 5 Quotation Requests (Total retrieved: ${enquiries?.length}) ---`);
    for (const eq of (enquiries || [])) {
      console.log(`[Enquiry] Ref: ${eq.reference_number} | ID: ${eq.id} | At: ${eq.created_at}`);
      console.log(`          Business: ${eq.business_name} | Contact: ${eq.contact_person} | Email: ${eq.email}`);
      console.log(`          Status: ${eq.status} | Risk: ${eq.risk_flag}`);
    }
  }

  // 2. Get latest 10 email_outbox jobs
  const { data: outbox, error: outboxErr } = await client
    .from('email_outbox')
    .select('id, recipient_email, subject, email_type, status, error_message, attempts, max_attempts, created_at, processed_at, related_entity_type, related_entity_id')
    .order('created_at', { ascending: false })
    .limit(10);

  if (outboxErr) {
    console.error('Error fetching outbox:', outboxErr);
  } else {
    console.log(`\n--- Latest 10 Email Outbox Records (Total retrieved: ${outbox?.length}) ---`);
    for (const ob of (outbox || [])) {
      console.log(`[Outbox] ID: ${ob.id} | At: ${ob.created_at} | Status: ${ob.status}`);
      console.log(`         Type: ${ob.email_type} | Recipient: ${ob.recipient_email}`);
      console.log(`         Subject: ${ob.subject}`);
      console.log(`         Related: ${ob.related_entity_type} | Payload: ${JSON.stringify(ob.payload)}`);
      console.log(`         Attempts: ${ob.attempts}/${ob.max_attempts} | SentAt: ${ob.sent_at} | Error: ${ob.error_details}`);
    }
  }

  // 3. Test whether submit_quotation_request_atomic RPC exists
  console.log('\n--- Checking RPC submit_quotation_request_atomic existence ---');
  // Pass invalid/dummy call to check if function signature exists (read-only error check)
  const { error: rpcErr } = await client.rpc('submit_quotation_request_atomic', {
    p_idempotency_key: 'test-check-existence-only',
    p_request_payload_hash: 'dummy',
    p_business_name: 'dummy',
    p_contact_person: 'dummy',
    p_email: 'dummy@test.local',
    p_phone: '9999999999',
    p_gstin: null,
    p_service_category: 'testing',
    p_requirement_details: 'dummy',
    p_quantity: null,
    p_technical_specs: null,
    p_delivery_location: 'dummy',
    p_notes: null,
    p_privacy_consent: false,
    p_submission_ip_hash: 'dummy',
    p_user_agent: 'dummy',
    p_risk_flag: 'none',
    p_admin_notification_email: 'dummy@test.local'
  });

  if (rpcErr) {
    console.log(`RPC submit_quotation_request_atomic call result: Error: ${rpcErr.message} (Code: ${rpcErr.code})`);
  } else {
    console.log('RPC submit_quotation_request_atomic returned without error (or succeeded)');
  }
}

inspect().catch(err => {
  console.error('Fatal inspection error:', err);
  process.exit(1);
});
