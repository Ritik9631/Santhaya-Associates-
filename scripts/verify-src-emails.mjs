import fs from 'fs';
import path from 'path';

function scanDir(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      count += scanDir(full);
    } else {
      const txt = fs.readFileSync(full, 'utf8');
      if (txt.includes('heistofeverything@gmail.com')) {
        console.log(`Still found in: ${full}`);
        count++;
      }
    }
  }
  return count;
}

const total = scanDir('Santhaya-Associates/src');
console.log(`Total occurrences in src/: ${total}`);

