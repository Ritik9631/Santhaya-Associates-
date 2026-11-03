import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('='.repeat(70));
console.log('SANTHAYA ASSOCIATES — PHASE PWA-1 BASELINE AUDIT');
console.log('='.repeat(70));

// 1. Git Status Check
const gitStatus = execSync('git status -s', { encoding: 'utf8' });
console.log('\n1. Git Working Tree State:');
console.log(gitStatus || 'Clean working tree.');

// 2. Package.json dependencies
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('\n2. Next.js & Framework Configuration:');
console.log(`   Next.js: ${pkg.dependencies.next}`);
console.log(`   React:   ${pkg.dependencies.react}`);
console.log(`   Sharp:   ${pkg.dependencies.sharp}`);
console.log(`   Zod:     ${pkg.dependencies.zod}`);
console.log(`   App Router in use: ${fs.existsSync('src/app') ? 'YES (src/app)' : 'NO'}`);

// 3. Existing Public Assets
console.log('\n3. Existing Public Assets:');
const publicFiles = fs.readdirSync('public', { withFileTypes: true });
publicFiles.forEach(f => {
  const full = path.join('public', f.name);
  const stat = fs.statSync(full);
  if (f.isFile()) {
    console.log(`   - ${f.name} (${(stat.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`   - [DIR] ${f.name}/`);
  }
});

// 4. Existing Manifest / Service Worker Check
console.log('\n4. Existing PWA Assets:');
const manifestFiles = ['public/manifest.json', 'public/manifest.webmanifest', 'src/app/manifest.ts', 'src/app/manifest.json', 'public/sw.js'];
manifestFiles.forEach(m => {
  console.log(`   ${m}: ${fs.existsSync(m) ? 'EXISTS' : 'NONE'}`);
});

// 5. Existing Staff Routes
console.log('\n5. Staff Route Structure:');
function listAppRoutes(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      listAppRoutes(path.join(dir, e.name), `${base}/${e.name}`);
    } else if (e.name === 'page.tsx') {
      console.log(`   ${base || '/'}`);
    }
  }
}
listAppRoutes('src/app');

console.log('\nPhase PWA-1 Baseline Inspection Complete.');

