import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'out');

console.log('======================================================================');
console.log('SANTHAYA ASSOCIATES — PREVIEW EXPORT SECURITY & ASSET AUDIT');
console.log('======================================================================\n');

let passCount = 0;
let failCount = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${desc}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${desc} — ${err.message}`);
    failCount++;
  }
}

// 1. Mandatory Public Route Files
console.log('--- 1. Mandatory Static Route HTML Files ---');
const requiredPages = [
  'index.html',
  'about/index.html',
  'services/index.html',
  'request-quotation/index.html',
  'privacy/index.html',
  'terms/index.html',
  '404.html',
  '.nojekyll',
  'robots.txt',
  'sitemap.xml',
];

for (const relPath of requiredPages) {
  it(`File exists in out/: ${relPath}`, () => {
    const fullPath = path.join(outDir, relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing expected file: ${relPath}`);
    }
    const stat = fs.statSync(fullPath);
    if (relPath !== '.nojekyll' && stat.size === 0) {
      throw new Error(`File is empty (0 bytes): ${relPath}`);
    }
  });
}

// 2. Base Path & Asset Integrity
console.log('\n--- 2. GitHub Pages Base Path (/Santhaya-Associates-/) Integrity ---');
it('Homepage index.html links use base path', () => {
  const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  if (!html.includes('/Santhaya-Associates-/services/')) {
    throw new Error('Services link missing base path');
  }
  if (!html.includes('/Santhaya-Associates-/about/')) {
    throw new Error('About link missing base path');
  }
  if (!html.includes('/Santhaya-Associates-/request-quotation/')) {
    throw new Error('Request Quotation link missing base path');
  }
});

it('Header and footer images resolve with base path', () => {
  const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  if (!html.includes('/Santhaya-Associates-/santhaya-logo-header.png')) {
    throw new Error('Header logo missing base path');
  }
  if (!html.includes('/Santhaya-Associates-/santhaya-symbol.png')) {
    throw new Error('Symbol icon missing base path');
  }
});

it('CSS and JavaScript assets resolve with base path', () => {
  const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  if (!html.includes('/Santhaya-Associates-/_next/static/css/')) {
    throw new Error('CSS bundle missing base path');
  }
  if (!html.includes('/Santhaya-Associates-/_next/static/chunks/')) {
    throw new Error('JS chunks missing base path');
  }
});

// 3. Security Perimeter: Zero Staff Leakage
console.log('\n--- 3. Security Perimeter: Zero Staff ERP or Admin Leakage ---');
it('Zero staff dashboard links in all generated HTML pages', () => {
  const htmlFiles = [
    'index.html',
    'about/index.html',
    'services/index.html',
    'request-quotation/index.html',
    'privacy/index.html',
    'terms/index.html',
    '404.html',
  ];

  for (const page of htmlFiles) {
    const content = fs.readFileSync(path.join(outDir, page), 'utf8');
    // Check for href="/staff or href="/Santhaya-Associates-/staff
    const staffMatch = content.match(/href="[^"]*\/staff/i);
    if (staffMatch) {
      throw new Error(`Found staff ERP link in ${page}: ${staffMatch[0]}`);
    }
  }
});

it('Zero staff ERP directory exists in out/', () => {
  if (fs.existsSync(path.join(outDir, 'staff'))) {
    throw new Error('Forbidden staff/ directory found in static export out/ folder!');
  }
});

it('Zero API routes directory exists in out/', () => {
  if (fs.existsSync(path.join(outDir, 'api'))) {
    throw new Error('Forbidden api/ directory found in static export out/ folder!');
  }
});

// 4. Form Safety: Backend Disabled
console.log('\n--- 4. Quotation Intake Form Safety & Backend Disconnection ---');
it('Quotation page contains prominent preview warning notice', () => {
  const html = fs.readFileSync(path.join(outDir, 'request-quotation/index.html'), 'utf8');
  if (!html.includes('This feature is unavailable in the website preview')) {
    throw new Error('Quotation form missing mandatory preview notice banner');
  }
});

it('Quotation page HTML does not reference /api/quotation-request', () => {
  const html = fs.readFileSync(path.join(outDir, 'request-quotation/index.html'), 'utf8');
  if (html.includes('/api/quotation-request')) {
    throw new Error('Quotation form contains active /api/quotation-request reference');
  }
});

// 5. Secrets Confinement Scan
console.log('\n--- 5. Static Assets Secret Confinement Scan ---');
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

it('Zero service-role keys or private environment variables bundled in output', () => {
  const allFiles = getAllFiles(outDir);
  const secretPatterns = [
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /RESEND_API_KEY/i,
    /RATE_LIMIT_SALT/i,
    /CRON_SECRET/i,
    /service_role/i,
  ];

  for (const file of allFiles) {
    // Only inspect text files (html, js, css, json, txt)
    if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.json') || file.endsWith('.txt')) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          throw new Error(`Potential secret signature ${pattern} found in exported file: ${path.relative(outDir, file)}`);
        }
      }
    }
  }
});

console.log('\n======================================================================');
console.log(`PREVIEW SECURITY AUDIT COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('======================================================================');

if (failCount > 0) {
  process.exit(1);
}

