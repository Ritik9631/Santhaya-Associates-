import fs from 'fs';
import path from 'path';

function getDirSize(dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      total += getDirSize(full);
    } else {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

const beforeSize = getDirSize('Santhaya-Associates/public');
console.log(`Public dir size BEFORE: ${(beforeSize / (1024 * 1024)).toFixed(3)} MB (${beforeSize} bytes)`);

const toRemove = [
  'Santhaya-Associates/public/branding/santhaya-round-stamp.png',
  'Santhaya-Associates/public/santhaya-round-stamp-original.png',
  'Santhaya-Associates/public/full-brand-reference.png',
  'Santhaya-Associates/public/PLACE-ORIGINAL-LOGO-HERE.txt'
];

let removedBytes = 0;
for (const file of toRemove) {
  if (fs.existsSync(file)) {
    const sz = fs.statSync(file).size;
    fs.unlinkSync(file);
    removedBytes += sz;
    console.log(`Deleted: ${file} (${(sz / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`Not found: ${file}`);
  }
}

// Clean up empty branding directory if empty
const brandingDir = 'Santhaya-Associates/public/branding';
if (fs.existsSync(brandingDir) && fs.readdirSync(brandingDir).length === 0) {
  fs.rmdirSync(brandingDir);
  console.log(`Removed empty directory: ${brandingDir}`);
}

const afterSize = getDirSize('Santhaya-Associates/public');
console.log(`Public dir size AFTER: ${(afterSize / (1024 * 1024)).toFixed(3)} MB (${afterSize} bytes)`);
console.log(`Total saved: ${(removedBytes / (1024 * 1024)).toFixed(3)} MB (${removedBytes} bytes, ${(removedBytes / beforeSize * 100).toFixed(1)}% reduction)`);

