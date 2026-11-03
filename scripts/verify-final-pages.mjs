import assert from 'assert';

async function verifyPages() {
  const base = 'http://localhost:3000';
  const checks = [
    { url: '/', expectText: 'santhayapvt.ltd@gmail.com', name: 'Homepage' },
    { url: '/services', expectText: 'Industrial Services', name: 'Services' },
    { url: '/about', expectText: 'Building Today', name: 'About' },
    { url: '/request-quotation', expectText: 'Request an Industrial Quotation', name: 'Quotation Request' },
    { url: '/privacy', expectText: 'santhayapvt.ltd@gmail.com', name: 'Privacy Policy' },
    { url: '/staff/login', expectText: 'Staff Portal', name: 'Staff Login' }
  ];

  console.log('--- VERIFYING LIVE PUBLIC ROUTES (http://localhost:3000) ---');
  for (const c of checks) {
    const res = await fetch(base + c.url);
    assert.strictEqual(res.status, 200, `${c.name} returned HTTP ${res.status}`);
    const html = await res.text();
    assert.ok(html.includes(c.expectText), `${c.name} contains "${c.expectText}"`);
    console.log(`  ✓ ${c.name} (${c.url}) -> HTTP 200 OK | Verified text present`);
  }
  console.log('\nAll public pages verified 100% operational with new email!');
}

verifyPages().catch(err => {
  console.error('Page verification failed:', err);
  process.exit(1);
});
