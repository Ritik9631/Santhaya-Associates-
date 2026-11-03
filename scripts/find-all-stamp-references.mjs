import fs from 'fs';
import path from 'path';

function searchDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchDirectory(full);
    } else {
      try {
        const text = fs.readFileSync(full, 'utf8');
        if (text.includes('santhaya-round-stamp')) {
          console.log(`FILE: ${full}`);
          text.split('\n').forEach((line, idx) => {
            if (line.includes('santhaya-round-stamp')) {
              console.log(`  Line ${idx + 1}: ${line.trim()}`);
            }
          });
        }
      } catch (e) {}
    }
  }
}

searchDirectory('Santhaya-Associates/src');
searchDirectory('Santhaya-Associates/public');

