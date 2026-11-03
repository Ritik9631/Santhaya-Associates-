import fs from 'fs';

function checkHeaderAndFooter() {
  const header = fs.readFileSync('src/components/Header.tsx', 'utf8');
  const footer = fs.readFileSync('src/components/Footer.tsx', 'utf8');
  console.log('Header has usePathname or /staff check:', header.includes('usePathname') || header.includes('/staff'));
  console.log('Footer has usePathname or /staff check:', footer.includes('usePathname') || footer.includes('/staff'));
}

checkHeaderAndFooter();

