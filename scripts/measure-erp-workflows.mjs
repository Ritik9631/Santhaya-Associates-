import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envLocal.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
}

const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function runPostOptimizationAudit() {
  console.log('='.repeat(80));
  console.log('SANTHAYA ASSOCIATES — POST-OPTIMIZATION PERFORMANCE BENCHMARK');
  console.log('='.repeat(80));

  // 1. Measure Rate-Limiting Concurrency (IP + Account in parallel vs sequential)
  console.log('\n--- 1. Authentication Rate-Limiting Latency ---');
  const tSeq0 = performance.now();
  await adminClient.rpc('check_rate_limit', { p_key: 'login_ip:test_seq', p_max_tokens: 5, p_refill_seconds: 300, p_cost: 0 });
  await adminClient.rpc('check_rate_limit', { p_key: 'login_acct:test_seq', p_max_tokens: 5, p_refill_seconds: 300, p_cost: 0 });
  const seqTime = performance.now() - tSeq0;

  const tPar0 = performance.now();
  await Promise.all([
    adminClient.rpc('check_rate_limit', { p_key: 'login_ip:test_par', p_max_tokens: 5, p_refill_seconds: 300, p_cost: 0 }),
    adminClient.rpc('check_rate_limit', { p_key: 'login_acct:test_par', p_max_tokens: 5, p_refill_seconds: 300, p_cost: 0 }),
  ]);
  const parTime = performance.now() - tPar0;
  console.log(`  Sequential Rate Limit Checks : ${seqTime.toFixed(1)} ms`);
  console.log(`  Parallel Rate Limit Checks   : ${parTime.toFixed(1)} ms (Optimization: -${(seqTime - parTime).toFixed(1)} ms / ${(((seqTime - parTime) / seqTime) * 100).toFixed(0)}% faster)`);

  // 2. Measure Customer + Catalog Data Fetching (Sequential vs Parallel)
  console.log('\n--- 2. New Quotation Data Fetching Latency ---');
  const tDataSeq0 = performance.now();
  const { data: custSeq } = await adminClient.from('customers').select('id, company_name, gstin').order('company_name', { ascending: true });
  const { data: catSeq } = await adminClient.from('products_services').select('id, name, sku').eq('is_active', true).order('name', { ascending: true });
  const dataSeqTime = performance.now() - tDataSeq0;

  const tDataPar0 = performance.now();
  const [{ data: custPar }, { data: catPar }] = await Promise.all([
    adminClient.from('customers').select('id, company_name, gstin').order('company_name', { ascending: true }),
    adminClient.from('products_services').select('id, name, sku').eq('is_active', true).order('name', { ascending: true }),
  ]);
  const dataParTime = performance.now() - tDataPar0;
  console.log(`  Sequential Customers + Catalog : ${dataSeqTime.toFixed(1)} ms (${(custSeq?.length || 0) + (catSeq?.length || 0)} total rows)`);
  console.log(`  Parallel Customers + Catalog   : ${dataParTime.toFixed(1)} ms (${(custPar?.length || 0) + (catPar?.length || 0)} total rows)`);
  console.log(`  Optimization                   : -${(dataSeqTime - dataParTime).toFixed(1)} ms / ${(((dataSeqTime - dataParTime) / dataSeqTime) * 100).toFixed(0)}% faster`);

  // 3. Measure Customer Verify + Quotation Sequence Number Generation
  console.log('\n--- 3. Quotation Submission Sub-Task Latency ---');
  const sampleCustId = custPar?.[0]?.id || '00000000-0000-0000-0000-000000000000';
  const tQuoteSubSeq0 = performance.now();
  await adminClient.from('customers').select('id, company_name').eq('id', sampleCustId).single();
  await adminClient.from('quotations').select('quotation_number').order('quotation_number', { ascending: false }).limit(1).maybeSingle();
  const quoteSubSeqTime = performance.now() - tQuoteSubSeq0;

  const tQuoteSubPar0 = performance.now();
  await Promise.all([
    adminClient.from('customers').select('id, company_name').eq('id', sampleCustId).single(),
    adminClient.from('quotations').select('quotation_number').order('quotation_number', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const quoteSubParTime = performance.now() - tQuoteSubPar0;
  console.log(`  Sequential Cust Verify + Seq Generation : ${quoteSubSeqTime.toFixed(1)} ms`);
  console.log(`  Parallel Cust Verify + Seq Generation   : ${quoteSubParTime.toFixed(1)} ms`);
  console.log(`  Optimization                           : -${(quoteSubSeqTime - quoteSubParTime).toFixed(1)} ms / ${(((quoteSubSeqTime - quoteSubParTime) / quoteSubSeqTime) * 100).toFixed(0)}% faster`);

  // 4. Measure Real-World Browser Navigation Times
  console.log('\n--- 4. Real-World Browser Navigation & Page Readiness ---');
  // Establish authenticated session
  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'heistofeverything@gmail.com'
  });
  if (linkErr) throw linkErr;

  const { data: verifyData, error: verifyErr } = await anonClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink'
  });
  if (verifyErr) throw verifyErr;

  const projectRef = env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieVal = `base64-${Buffer.from(JSON.stringify(verifyData.session)).toString('base64')}`;

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setCookie({
    name: cookieName,
    value: cookieVal,
    domain: 'localhost',
    path: '/'
  });
  await page.setViewport({ width: 1280, height: 800 });

  // A. Staff Overview Dashboard
  const tDash0 = performance.now();
  const dashRes = await page.goto('http://localhost:3000/staff', { waitUntil: 'networkidle2' });
  const dashTime = performance.now() - tDash0;
  const dashTiming = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return nav ? Math.round(nav.responseStart - nav.requestStart) : 0;
  });
  console.log(`  /staff (Overview Dashboard)       | Status: ${dashRes.status()} | TTFB: ${dashTiming} ms | Total Ready: ${dashTime.toFixed(0)} ms`);

  // B. New Quotation Page
  const tNewQ0 = performance.now();
  const newQRes = await page.goto('http://localhost:3000/staff/quotations/new', { waitUntil: 'networkidle2' });
  const newQTime = performance.now() - tNewQ0;
  const newQTiming = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return nav ? Math.round(nav.responseStart - nav.requestStart) : 0;
  });
  console.log(`  /staff/quotations/new (Creation)  | Status: ${newQRes.status()} | TTFB: ${newQTiming} ms | Total Ready: ${newQTime.toFixed(0)} ms`);

  // C. Quotations Directory
  const tQList0 = performance.now();
  const qListRes = await page.goto('http://localhost:3000/staff/quotations', { waitUntil: 'networkidle2' });
  const qListTime = performance.now() - tQList0;
  const qListTiming = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return nav ? Math.round(nav.responseStart - nav.requestStart) : 0;
  });
  console.log(`  /staff/quotations (Directory)     | Status: ${qListRes.status()} | TTFB: ${qListTiming} ms | Total Ready: ${qListTime.toFixed(0)} ms`);

  // D. Quotation Detail View
  const latestQuoteId = await page.evaluate(() => {
    const link = document.querySelector('a[href^="/staff/quotations/"]');
    if (link) {
      const href = link.getAttribute('href');
      const m = href.match(/\/staff\/quotations\/([a-f0-9-]+)/);
      return m ? m[1] : null;
    }
    return null;
  });

  if (latestQuoteId) {
    const tDetail0 = performance.now();
    const detailRes = await page.goto(`http://localhost:3000/staff/quotations/${latestQuoteId}`, { waitUntil: 'networkidle2' });
    const detailTime = performance.now() - tDetail0;
    console.log(`  /staff/quotations/[id] (Detail)   | Status: ${detailRes.status()} | Total Ready: ${detailTime.toFixed(0)} ms`);

    const tPdf0 = performance.now();
    const pdfRes = await page.goto(`http://localhost:3000/staff/quotations/${latestQuoteId}/pdf`, { waitUntil: 'networkidle2' });
    const pdfTime = performance.now() - tPdf0;
    console.log(`  /staff/quotations/[id]/pdf (PDF)  | Status: ${pdfRes.status()} | Total Ready: ${pdfTime.toFixed(0)} ms`);
  }

  // E. Billing New Page
  const tBillNew0 = performance.now();
  const billNewRes = await page.goto('http://localhost:3000/staff/billing/new', { waitUntil: 'networkidle2' });
  const billNewTime = performance.now() - tBillNew0;
  console.log(`  /staff/billing/new (New Invoice)  | Status: ${billNewRes.status()} | Total Ready: ${billNewTime.toFixed(0)} ms`);

  await browser.close();

  // Save timing results
  const results = {
    rateLimiting: { sequentialMs: seqTime.toFixed(1), parallelMs: parTime.toFixed(1), savedMs: (seqTime - parTime).toFixed(1) },
    quotationData: { sequentialMs: dataSeqTime.toFixed(1), parallelMs: dataParTime.toFixed(1), savedMs: (dataSeqTime - dataParTime).toFixed(1) },
    quotationSub: { sequentialMs: quoteSubSeqTime.toFixed(1), parallelMs: quoteSubParTime.toFixed(1), savedMs: (quoteSubSeqTime - quoteSubParTime).toFixed(1) },
    browserPages: {
      dashboardMs: dashTime.toFixed(0),
      newQuotationMs: newQTime.toFixed(0),
      quotationListMs: qListTime.toFixed(0),
      newBillingMs: billNewTime.toFixed(0)
    }
  };
  fs.writeFileSync('scripts/optimization-results.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to scripts/optimization-results.json');
}

runPostOptimizationAudit().catch(console.error);
