import fs from 'fs';

const txt = fs.readFileSync('src/lib/auth/actions.ts', 'utf8');
txt.split('\n').forEach((l, i) => {
  if (l.includes('logout') || l.includes('signOut')) {
    console.log(`${i+1}: ${l}`);
  }
});

