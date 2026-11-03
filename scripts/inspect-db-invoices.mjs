import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const getVar = (name) => {
  const m = env.match(new RegExp(name + '=(.*)'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
};

const adminClient = createClient(getVar('NEXT_PUBLIC_SUPABASE_URL'), getVar('SUPABASE_SERVICE_ROLE_KEY'));

async function main() {
  const { data: invoices, error } = await adminClient
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error);
    return;
  }

  console.log(`Total invoices in DB: ${invoices.length}`);
  for (const inv of invoices) {
    console.log(`\nID: ${inv.id} | Number: ${inv.invoice_number} | Type: ${inv.invoice_type} | Status: ${inv.status}`);
    console.log(`Customer: ${inv.customer_billing_name} | State: ${inv.customer_state_name} (${inv.customer_state_code}) | POS: ${inv.place_of_supply_state_code}`);
    console.log(`Taxable: ${inv.taxable_amount} | CGST: ${inv.cgst_amount} | SGST: ${inv.sgst_amount} | IGST: ${inv.igst_amount} | Total: ${inv.grand_total_amount}`);
    console.log(`Terms: ${inv.terms_conditions ? JSON.stringify(inv.terms_conditions.substring(0, 80)) : 'NULL'}`);
  }
}

main();
