import fs from 'fs';
import path from 'path';

const publicFiles = [
  'branding/santhaya-round-stamp.png',
  'full-brand-reference.png',
  'PLACE-ORIGINAL-LOGO-HERE.txt',
  'santhaya-logo-header.png',
  'santhaya-round-stamp-original.png',
  'santhaya-round-stamp.png',
  'santhaya-symbol.png'
];

function scanCode(dir, refs = {}) {
  for (const pf of publicFiles) refs[pf] = [];
  
  function walk(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      if (['node_modules', '.next', '.git'].includes(e.name)) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else {
        try {
          const txt = fs.readFileSync(full, 'utf8');
          for (const pf of publicFiles) {
            const base = path.basename(pf);
            if (txt.includes(pf) || (pf.includes('/') && txt.includes(base))) {
              // matched
              refs[pf].push(full);
            }
          }
        } catch(err) {}
      }
    }
  }
  walk(dir);
  return refs;
}

const refs = scanCode('Santhaya-Associates/src');
console.log('--- PUBLIC ASSET USAGE IN SRC/ ---');
for (const [file, callers] of Object.entries(refs)) {
  console.log(`Asset: ${file} -> Used in ${callers.length} file(s)`);
  callers.forEach(c => console.log(`   ${c}`));
}

