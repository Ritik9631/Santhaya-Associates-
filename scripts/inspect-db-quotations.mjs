import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const getVar = (name) => {
  const m = env.match(new RegExp(name + '=(.*)'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
};

const url = getVar('NEXT_PUBLIC_SUPABASE_URL');
const key = getVar('SUPABASE_SERVICE_ROLE_KEY');
const client = createClient(url, key);

async function inspect() {
  const { data: quotes, error } = await client
    .from('quotations')
    .select('*, customer:customers(*), quotation_versions(*, quotation_items(*))')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quotations:', error);
    return;
  }

  console.log('Total quotations in DB:', quotes.length);
  for (const q of quotes) {
    console.log('\n======================================================');
    console.log(`ID: ${q.id} | Number: ${q.quotation_number} | Status: ${q.status}`);
    console.log(`Issued At: ${q.issued_at} | Place of Supply: "${q.place_of_supply}"`);
    console.log(`Customer: ${q.customer?.company_name} | Contact: ${q.customer?.primary_contact_person}`);
    for (const v of q.quotation_versions || []) {
      console.log(`  Version ${v.version_number} (ID: ${v.id}):`);
      console.log(`    Subtotal: ${v.subtotal_amount} | Discount: ${v.discount_amount} | Taxable: ${v.taxable_amount}`);
      console.log(`    Tax: ${v.total_tax_amount} | Grand Total: ${v.grand_total_amount}`);
      console.log(`    Terms snippet (first 100 chars): ${JSON.stringify((v.terms_conditions || '').substring(0, 100))}`);
      console.log(`    Total Terms Length: ${(v.terms_conditions || '').length} chars`);
      console.log(`    Number of clauses: ${(v.terms_conditions || '').split('\n').filter(Boolean).length}`);
      console.log(`    Line items count: ${(v.quotation_items || []).length}`);
      for (const item of v.quotation_items || []) {
        console.log(`      - Item: "${item.item_name}" | Qty: ${item.quantity} | Rate: ${item.unit_rate} | Discount: ${item.discount_amount} | Taxable: ${item.taxable_amount} | Total: ${item.line_total}`);
      }
    }
  }
}

inspect().catch(console.error);
