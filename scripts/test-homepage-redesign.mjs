import fs from 'fs';
import assert from 'assert';

console.log('======================================================================');
console.log('SANTHAYA ASSOCIATES — PREMIUM HOMEPAGE REDESIGN VERIFICATION');
console.log('======================================================================\n');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

const pageCode = fs.readFileSync('src/app/page.tsx', 'utf8');
const footerCode = fs.readFileSync('src/components/Footer.tsx', 'utf8');
const headerCode = fs.readFileSync('src/components/Header.tsx', 'utf8');
const faqCode = fs.readFileSync('src/components/FAQAccordion.tsx', 'utf8');
const mobileBarCode = fs.readFileSync('src/components/MobileQuickContactBar.tsx', 'utf8');

console.log('--- 1. Hero Section & Branding Integrity ---');

it('Hero displays exact H1: Industrial Scale. Precision Execution.', () => {
  assert.ok(pageCode.includes('Industrial Scale.'), 'H1 includes Industrial Scale.');
  assert.ok(pageCode.includes('Precision Execution.'), 'H1 includes Precision Execution.');
  assert.ok(pageCode.includes('Building Today • Powering Tomorrow'), 'Tagline badge present');
});

it('Hero provides clear primary & secondary CTAs', () => {
  assert.ok(pageCode.includes('href="/request-quotation"'), 'Primary CTA links to /request-quotation');
  assert.ok(pageCode.includes('Request a Quotation'), 'Primary CTA text is Request a Quotation');
  assert.ok(pageCode.includes('href="#services"'), 'Secondary CTA links to #services');
  assert.ok(pageCode.includes('Explore Our Services'), 'Secondary CTA text is Explore Our Services');
});

it('Hero right column provides technical governance dossier without repeating 3 service cards', () => {
  assert.ok(pageCode.includes('OPERATIONAL GOVERNANCE'), 'Features operational governance header');
  assert.ok(pageCode.includes('BOQ & Technical Bidding Analysis'), 'Features bidding analysis');
  assert.ok(pageCode.includes('Requirement-Based Machinery Logistics'), 'Features machinery logistics');
  assert.ok(pageCode.includes('Statutory GST & Commercial Rigor'), 'Features GST & commercial rigor');
  assert.ok(pageCode.includes('Direct Desk Communication'), 'Features direct desk communication');
});

console.log('\n--- 2. Call & WhatsApp Direct Actions ---');

it('Homepage includes functional Call (+91 9430986713) and WhatsApp (+91 9608950748) links', () => {
  assert.ok(pageCode.includes('href="tel:+919430986713"'), 'tel: link for primary phone present');
  assert.ok(pageCode.includes('https://wa.me/919608950748'), 'wa.me link for WhatsApp present');
  assert.ok(
    pageCode.includes(
      'Hello%20Santhaya%20Associates%2C%20I%20would%20like%20to%20enquire%20about%20your%20construction%20tender%20or%20machinery%20supply%20services.'
    ),
    'WhatsApp URL includes suggested prefilled message'
  );
});

it('Mobile quick contact bar provides Call, WhatsApp, and Quote actions', () => {
  assert.ok(mobileBarCode.includes('href="tel:+919430986713"'), 'Mobile bar includes call link');
  assert.ok(mobileBarCode.includes('https://wa.me/919608950748'), 'Mobile bar includes WhatsApp link');
  assert.ok(mobileBarCode.includes('href="/request-quotation"'), 'Mobile bar includes quote link');
  assert.ok(mobileBarCode.includes('min-h-[44px]'), 'Mobile bar complies with touch target guidelines');
});

console.log('\n--- 3. Three Core Services Section ---');

it('Services section maintains exactly 3 distinct categories with capability points', () => {
  assert.ok(pageCode.includes('Government & Private Construction Tenders'), 'Pillar 1 present');
  assert.ok(pageCode.includes('Construction Machinery Supply'), 'Pillar 2 present');
  assert.ok(pageCode.includes('Manufacturing Machinery Supply'), 'Pillar 3 present');
  assert.ok(pageCode.includes('Enquire for Tenders'), 'Tenders CTA present');
  assert.ok(pageCode.includes('Inquire Machinery Fleet'), 'Machinery CTA present');
  assert.ok(pageCode.includes('Enquire for Industrial Machinery'), 'Manufacturing CTA present');
});

console.log('\n--- 4. Why Choose Santhaya Associates Section ---');

it('Why Choose Us section includes 4 grounded benefit cards', () => {
  assert.ok(pageCode.includes('Why Choose Santhaya Associates?'), 'Heading present');
  assert.ok(pageCode.includes('Tender-Focused Approach'), 'Card 1 present');
  assert.ok(pageCode.includes('Construction & Industrial Understanding'), 'Card 2 present');
  assert.ok(pageCode.includes('Requirement-Based Machinery Solutions'), 'Card 3 present');
  assert.ok(pageCode.includes('Direct Business Communication'), 'Card 4 present');
});

console.log('\n--- 5. How We Work Process Overview ---');

it('How We Work section provides a clear 4-step procurement lifecycle', () => {
  assert.ok(pageCode.includes('Structured Procurement & Delivery Process'), 'Process heading present');
  assert.ok(pageCode.includes('Specification Review'), 'Step 1 present');
  assert.ok(pageCode.includes('Engineering Feasibility'), 'Step 2 present');
  assert.ok(pageCode.includes('Formal Quotation'), 'Step 3 present');
  assert.ok(pageCode.includes('Execution & Dispatch'), 'Step 4 present');
});

console.log('\n--- 6. Testimonial Handling & Authenticity Safeguards ---');

it('Client Trust section implements Option B: neutral commitment without fabricated reviews', () => {
  assert.ok(pageCode.includes('Our Commitment to Clients'), 'Commitment heading present');
  assert.ok(pageCode.includes('Commercial Integrity & Clear Terms'), 'Pillar 1 present');
  assert.ok(pageCode.includes('Operational & Logistics Discipline'), 'Pillar 2 present');
  assert.ok(pageCode.includes('Statutory & Regulatory Rigor'), 'Pillar 3 present');
  assert.ok(!pageCode.includes('"@type": "Review"'), 'No fake Review schema');
  assert.ok(!pageCode.includes('"@type": "AggregateRating"'), 'No fake AggregateRating schema');
  assert.ok(
    pageCode.includes('Rajesh Kumar — Sample Client') && pageCode.includes('<!-- SAMPLE TESTIMONIAL CARDS'),
    'Sample client placeholders preserved in comments as design template only'
  );
});

console.log('\n--- 7. FAQ Accordion Section ---');

it('FAQAccordion contains all 6 requested business questions', () => {
  assert.ok(faqCode.includes('What services does Santhaya Associates provide?'), 'Q1 present');
  assert.ok(faqCode.includes('Do you work with government and private construction tenders?'), 'Q2 present');
  assert.ok(faqCode.includes('Can I enquire about construction machinery supply?'), 'Q3 present');
  assert.ok(faqCode.includes('Do you also provide manufacturing machinery solutions?'), 'Q4 present');
  assert.ok(faqCode.includes('How can I request a quotation?'), 'Q5 present');
  assert.ok(faqCode.includes('How can I contact your team directly?'), 'Q6 present');
  assert.ok(faqCode.includes('aria-expanded'), 'ARIA expanded attribute present');
  assert.ok(faqCode.includes('aria-controls'), 'ARIA controls attribute present');
});

console.log('\n--- 8. Contact Section & Redesigned Footer ---');

it('Contact section includes registered address, phone, WhatsApp, email, and final CTA', () => {
  assert.ok(pageCode.includes('Gopalpur, Motihari, Purbi Champaran, Bihar – 845401, India'), 'Office address present');
  assert.ok(pageCode.includes('santhayapvt.ltd@gmail.com'), 'Email present');
  assert.ok(pageCode.includes('Need a Formal Line-Item Quotation?'), 'Final quotation banner present');
});

it('Footer eliminates "Request Official Quotation" exact link and organizes 4 columns', () => {
  assert.ok(!footerCode.includes('Request Official Quotation'), 'Exact duplicate link removed');
  assert.ok(footerCode.includes('Our Services'), 'Col 2 header present');
  assert.ok(footerCode.includes('Quick Links'), 'Col 3 header present');
  assert.ok(footerCode.includes('Contact'), 'Col 4 header present');
  assert.ok(footerCode.includes('tel:+919430986713'), 'Footer includes clickable phone');
  assert.ok(footerCode.includes('https://wa.me/919608950748'), 'Footer includes clickable WhatsApp');
  assert.ok(footerCode.includes('mailto:santhayapvt.ltd@gmail.com'), 'Footer includes clickable mailto');
  assert.ok(!footerCode.includes('/staff/login'), 'Footer contains no staff login leaks');
});

console.log('\n======================================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================================\n');

if (failed > 0) {
  process.exit(1);
}

