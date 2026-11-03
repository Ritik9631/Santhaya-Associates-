import fs from 'fs';

function findRefs(file) {
  const code = fs.readFileSync(file, 'utf8');
  code.split('\n').forEach((l, i) => {
    if (l.includes('logo') || l.includes('symbol')) {
      console.log(`${file}:${i+1}: ${l.trim()}`);
    }
  });
}

findRefs('Santhaya-Associates/src/components/Header.tsx');
findRefs('Santhaya-Associates/src/app/layout.tsx');

