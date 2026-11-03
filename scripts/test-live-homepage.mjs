import http from 'http';
import assert from 'assert';

function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function verify() {
  console.log('Verifying Live Localhost Response for Homepage (/)...\n');
  const res = await fetchUrl('/');
  assert.strictEqual(res.status, 200, 'Homepage status 200');

  const html = res.body;

  // 1. Check H1
  assert.ok(html.includes('Industrial Scale.'), 'Contains "Industrial Scale."');
  assert.ok(html.includes('Precision Execution.'), 'Contains "Precision Execution."');

  // 2. Check 3 Core Services
  assert.ok(html.includes('Government &amp; Private Construction Tenders') || html.includes('Government & Private Construction Tenders'), 'Contains service 1');
  assert.ok(html.includes('Construction Machinery Supply'), 'Contains service 2');
  assert.ok(html.includes('Manufacturing Machinery Supply'), 'Contains service 3');

  // 3. Check Why Choose Us
  assert.ok(html.includes('Why Choose Santhaya Associates?'), 'Contains Why Choose Us heading');
  assert.ok(html.includes('Tender-Focused Approach'), 'Contains benefit 1');
  assert.ok(html.includes('Construction &amp; Industrial Understanding') || html.includes('Construction & Industrial Understanding'), 'Contains benefit 2');
  assert.ok(html.includes('Requirement-Based Machinery Solutions'), 'Contains benefit 3');
  assert.ok(html.includes('Direct Business Communication'), 'Contains benefit 4');

  // 4. Check How We Work
  assert.ok(html.includes('Structured Procurement &amp; Delivery Process') || html.includes('Structured Procurement & Delivery Process'), 'Contains process heading');
  assert.ok(html.includes('Specification Review'), 'Contains step 1');

  // 5. Check Our Commitment
  assert.ok(html.includes('Our Commitment to Clients'), 'Contains Our Commitment heading');
  assert.ok(html.includes('Commercial Integrity &amp; Clear Terms') || html.includes('Commercial Integrity & Clear Terms'), 'Contains integrity pillar');

  // 6. Check FAQ
  assert.ok(html.includes('Frequently Asked Questions'), 'Contains FAQ heading');
  assert.ok(html.includes('What services does Santhaya Associates provide?'), 'Contains Q1');
  assert.ok(html.includes('Do you work with government and private construction tenders?'), 'Contains Q2');
  assert.ok(html.includes('Can I enquire about construction machinery supply?'), 'Contains Q3');
  assert.ok(html.includes('Do you also provide manufacturing machinery solutions?'), 'Contains Q4');
  assert.ok(html.includes('How can I request a quotation?'), 'Contains Q5');
  assert.ok(html.includes('How can I contact your team directly?'), 'Contains Q6');

  // 7. Check Contact Details & Functional Links
  assert.ok(html.includes('tel:+919430986713'), 'Contains tel:+919430986713');
  assert.ok(html.includes('https://wa.me/919608950748'), 'Contains wa.me link');
  assert.ok(html.includes('mailto:santhayapvt.ltd@gmail.com'), 'Contains mailto: link');
  assert.ok(html.includes('Gopalpur, Motihari, Purbi Champaran, Bihar'), 'Contains registered office');

  // 8. Check Mobile Quick Contact Bar
  assert.ok(html.includes('Quick Contact Actions'), 'Contains mobile quick contact bar');

  // 9. Check Footer
  assert.ok(!html.includes('Request Official Quotation'), 'Does NOT contain obsolete "Request Official Quotation" footer link');
  assert.ok(html.includes('Quick Links'), 'Contains Quick Links');

  console.log('✓ All 9 Live HTML Output Assertions Passed Successfully!');
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

