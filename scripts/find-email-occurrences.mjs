import fs from 'fs';
import path from 'path';

function findEmailOccurrences(dir, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (['node_modules', '.next', '.git'].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      findEmailOccurrences(full, list);
    } else {
      try {
        const text = fs.readFileSync(full, 'utf8');
        if (text.includes('heistofeverything@gmail.com')) {
          const lines = text.split('\n');
          lines.forEach((l, i) => {
            if (l.includes('heistofeverything@gmail.com')) {
              list.push({ file: full, line: i + 1, content: l.trim() });
            }
          });
        }
      } catch (err) {}
    }
  }
  return list;
}

const hits = findEmailOccurrences('Santhaya-Associates');
console.log(`Found ${hits.length} occurrences:`);
hits.forEach(h => console.log(`${h.file}:${h.line} -> ${h.content}`));

