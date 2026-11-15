import fs from 'node:fs';

const pages = [
  { name: 'Home (/)', path: '.next/server/app/index.html' },
  { name: 'About (/about)', path: '.next/server/app/about.html' },
  { name: 'Services (/services)', path: '.next/server/app/services.html' },
  { name: 'Request Quotation (/request-quotation)', path: '.next/server/app/request-quotation.html' },
  { name: 'Privacy (/privacy)', path: '.next/server/app/privacy.html' },
  { name: 'Terms (/terms)', path: '.next/server/app/terms.html' }
];

console.log('='.repeat(70));
console.log('SANTHAYA ASSOCIATES — BUILD OUTPUT SEO VERIFICATION');
console.log('='.repeat(70));

for (const p of pages) {
  if (fs.existsSync(p.path)) {
    const html = fs.readFileSync(p.path, 'utf8');
    const canon = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i) ||
                  html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
    const title = html.match(/<title>([^<]+)<\/title>/i);
    console.log(`\nRoute: ${p.name}`);
    console.log(`  Title:     ${title ? title[1] : 'NONE'}`);
    console.log(`  Canonical: ${canon ? canon[1] : 'NONE FOUND'}`);
  } else {
    console.log(`\nRoute: ${p.name} - HTML not found at ${p.path}`);
  }
}

// Check routes-manifest for redirects
if (fs.existsSync('.next/routes-manifest.json')) {
  console.log('\n--- REDIRECTS IN ROUTES-MANIFEST ---');
  const manifest = JSON.parse(fs.readFileSync('.next/routes-manifest.json', 'utf8'));
  console.log('Redirects count:', manifest.redirects?.length || 0);
  (manifest.redirects || []).forEach(r => {
    console.log(` - Source: ${r.source} -> Destination: ${r.destination} (StatusCode: ${r.statusCode})`);
    console.log(`   Has: ${JSON.stringify(r.has)}`);
  });
}
