import fs from 'fs';

function findLines(filePath, pattern) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes(pattern)) {
      console.log(`${filePath}:${idx + 1}: ${line.trim()}`);
    }
  });
}

findLines('Santhaya-Associates/src/app/staff/billing/[id]/pdf/page.tsx', 'stamp');
findLines('Santhaya-Associates/src/app/staff/quotations/[id]/pdf/page.tsx', 'stamp');

