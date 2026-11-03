import fs from 'fs';
import path from 'path';

const searchTerms = [
  'santhaya-round-stamp-original',
  'branding/santhaya-round-stamp.png',
  'santhaya-round-stamp.png',
  'full-brand-reference',
  'PLACE-ORIGINAL-LOGO-HERE'
];

function searchDir(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchDir(fullPath, results);
    } else {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const term of searchTerms) {
          if (content.includes(term)) {
            results.push({ file: fullPath, term });
          }
        }
      } catch (e) {
        // Ignore binary files or unreadable files
      }
    }
  }
  return results;
}

const hits = searchDir('.');
console.log(`Total occurrences found: ${hits.length}`);
hits.forEach(h => console.log(`[${h.term}] -> ${h.file}`));

