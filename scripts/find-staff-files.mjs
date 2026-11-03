import fs from 'fs';
import path from 'path';

function findStaffFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      findStaffFiles(full);
    } else {
      if (full.includes('staff') || full.includes('invite') || full.includes('team')) {
        console.log(full);
      }
    }
  }
}

findStaffFiles('Santhaya-Associates/src');

