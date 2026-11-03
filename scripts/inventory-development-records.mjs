import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const getVar = (n) => {
  const m = env.match(new RegExp(n + '=(.*)'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
};
const adminClient = createClient(getVar('NEXT_PUBLIC_SUPABASE_URL'), getVar('SUPABASE_SERVICE_ROLE_KEY'));

async function inventory() {
  console.log('='.repeat(80));
  console.log('SANTHAYA ASSOCIATES — COMPLETE DEVELOPMENT DATABASE RECORD INVENTORY');
  console.log('='.repeat(80));

  // 1. Quotations Inventory
  const { data: quotes } = await adminClient.from('quotations').select('*').order('created_at', { ascending: true });
  console.log(`\n--- 1. QUOTATIONS (Total: ${quotes?.length || 0}) ---`);
  const quotesByStatus = {};
  for (const q of (quotes || [])) {
    quotesByStatus[q.status] = (quotesByStatus[q.status] || 0) + 1;
    console.log(`- [${q.status.toUpperCase().padEnd(8)}] ID: ${q.id} | Number: ${(q.quotation_number || 'NONE').padEnd(14)} | Customer: ${(q.customer_billing_name || 'UNKNOWN').padEnd(20)} | Total: ₹${Number(q.grand_total_amount || 0).toLocaleString('en-IN')} | Date: ${q.created_at?.split('T')[0]}`);
  }
  console.log('  Status Breakdown:', quotesByStatus);

  // 2. Invoices Inventory
  const { data: invoices } = await adminClient.from('invoices').select('*').order('created_at', { ascending: true });
  console.log(`\n--- 2. INVOICES (Total: ${invoices?.length || 0}) ---`);
  const invsByStatus = {};
  for (const inv of (invoices || [])) {
    invsByStatus[inv.status] = (invsByStatus[inv.status] || 0) + 1;
    console.log(`- [${inv.status.toUpperCase().padEnd(14)}] ID: ${inv.id} | Number: ${(inv.invoice_number || 'DRAFT').padEnd(14)} | Type: ${inv.invoice_type.padEnd(15)} | Customer: ${(inv.customer_billing_name || 'UNKNOWN').padEnd(20)} | Total: ₹${Number(inv.grand_total_amount || 0).toLocaleString('en-IN')} | Balance: ₹${Number(inv.balance_amount || 0).toLocaleString('en-IN')} | POS: ${inv.place_of_supply_state_code}`);
  }
  console.log('  Status Breakdown:', invsByStatus);

  // 3. Invoice Payments Inventory
  const { data: payments } = await adminClient.from('invoice_payments').select('*');
  console.log(`\n--- 3. PAYMENTS (Total: ${payments?.length || 0}) ---`);
  for (const p of (payments || [])) {
    console.log(`- Receipt: ${p.receipt_number} | Invoice ID: ${p.invoice_id} | Amount: ₹${Number(p.amount).toLocaleString('en-IN')} | Method: ${p.payment_method} | TxnRef: ${p.transaction_reference} | Date: ${p.payment_date}`);
  }

  // 4. Customers Inventory
  const { data: customers } = await adminClient.from('customers').select('*').order('created_at', { ascending: true });
  console.log(`\n--- 4. CUSTOMERS (Total: ${customers?.length || 0}) ---`);
  for (const c of (customers || [])) {
    console.log(`- ID: ${c.id} | Name: ${(c.company_name || c.contact_person).padEnd(22)} | Contact: ${c.contact_person || '—'} | GSTIN: ${c.gstin || 'None'} | Phone: ${c.phone || 'None'} | State: ${c.billing_state || 'None'} (${c.billing_state_code || '—'})`);
  }

  // 5. Public Enquiries Inventory
  const { count: enquiryCount } = await adminClient.from('quotation_requests').select('*', { count: 'exact', head: true });
  const { data: enquirySample } = await adminClient.from('quotation_requests').select('id, reference_number, full_name, company_name, email, phone, status, created_at').order('created_at', { ascending: false }).limit(5);
  console.log(`\n--- 5. INBOUND PUBLIC ENQUIRIES (Total: ${enquiryCount || 0}) ---`);
  console.log('  Latest 5 Sample Enquiries:');
  for (const e of (enquirySample || [])) {
    console.log(`- Ref: ${e.reference_number || 'NONE'} | Status: ${e.status} | Name: ${e.full_name} (${e.company_name || 'Individual'}) | Phone: ${e.phone || 'None'} | Date: ${e.created_at?.split('T')[0]}`);
  }

  // 6. Email Outbox Inventory
  const { count: outboxCount } = await adminClient.from('email_outbox').select('*', { count: 'exact', head: true });
  const { data: outboxSample } = await adminClient.from('email_outbox').select('id, recipient_email, template_type, status, attempts, error_message, created_at').order('created_at', { ascending: false }).limit(5);
  console.log(`\n--- 6. TRANSACTIONAL EMAIL OUTBOX (Total: ${outboxCount || 0}) ---`);
  console.log('  Latest 5 Sample Outbox Jobs:');
  for (const o of (outboxSample || [])) {
    console.log(`- ID: ${o.id} | Recipient: ${o.recipient_email} | Template: ${o.template_type} | Status: ${o.status} | Attempts: ${o.attempts} | Date: ${o.created_at?.split('T')[0]}`);
  }

  // 7. Audit Logs Count
  const { count: auditCount } = await adminClient.from('audit_logs').select('*', { count: 'exact', head: true });
  console.log(`\n--- 7. IMMUTABLE AUDIT LOGS (Total: ${auditCount || 0} records) ---`);

  // 8. Invoice Sequence Counters
  const { data: seqCounters } = await adminClient.from('invoice_sequence_counters').select('*');
  console.log(`\n--- 8. INVOICE SEQUENCE COUNTERS (Total: ${seqCounters?.length || 0}) ---`);
  for (const s of (seqCounters || [])) {
    console.log(`- FY: ${s.financial_year} | Series: ${s.series_name} | Next Value: ${s.next_value}`);
  }
}

inventory().catch(console.error);

