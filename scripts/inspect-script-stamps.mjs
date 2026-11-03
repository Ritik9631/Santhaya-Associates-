import fs from 'fs';

function checkScripts() {
  const scripts = [
    'Santhaya-Associates/scripts/generate-sample-quotations.mjs',
    'Santhaya-Associates/scripts/test-quotation-round-stamp.mjs',
    'Santhaya-Associates/scripts/verify-invoice-template-update.mjs'
  ];
  for (const s of scripts) {
    const txt = fs.readFileSync(s, 'utf8');
    txt.split('\n').forEach((l, i) => {
      if (l.includes('stamp')) {
        console.log(`${s}:${i+1}: ${l.trim()}`);
      }
    });
  }
}

checkScripts();

