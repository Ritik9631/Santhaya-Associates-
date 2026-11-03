import fs from 'fs';
import path from 'path';

function listAll(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      listAll(full);
    } else {
      const stat = fs.statSync(full);
      console.log(`${full} (${(stat.size / 1024).toFixed(1)} KB)`);
    }
  }
}

listAll('Santhaya-Associates/public');

