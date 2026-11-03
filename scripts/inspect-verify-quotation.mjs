import fs from 'fs';

const txt = fs.readFileSync('Santhaya-Associates/scripts/verify-quotation-template-update.mjs', 'utf8');
txt.split('\n').forEach((l, i) => {
  if (l.includes('right-aligned') || l.includes('Round Stamp')) {
    console.log(`${i+1}: ${l}`);
  }
});

