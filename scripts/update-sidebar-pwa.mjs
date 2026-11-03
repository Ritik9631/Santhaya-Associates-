import fs from 'fs';

const path = 'src/app/staff/StaffSidebar.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `    {
      name: 'Communications',
      href: '/staff/communications',
      icon: Mail,
      active: pathname.startsWith('/staff/communications'),
      available: true,
    },`;

const addition = `    {
      name: 'Communications',
      href: '/staff/communications',
      icon: Mail,
      active: pathname.startsWith('/staff/communications'),
      available: true,
    },
    {
      name: 'Install App',
      href: '/staff/help/pwa',
      icon: Smartphone,
      active: pathname.startsWith('/staff/help/pwa'),
      available: true,
      badge: 'PWA',
    },`;

if (content.includes('Install App')) {
  console.log('Already added.');
} else {
  // Normalize CRLF to LF for search, then apply
  const isCrlf = content.includes('\r\n');
  const normalizedTarget = target.replace(/\r\n/g, '\n');
  const normalizedContent = content.replace(/\r\n/g, '\n');
  
  if (normalizedContent.includes(normalizedTarget)) {
    const updated = normalizedContent.replace(normalizedTarget, addition.replace(/\r\n/g, '\n'));
    fs.writeFileSync(path, isCrlf ? updated.replace(/\n/g, '\r\n') : updated, 'utf8');
    console.log('Successfully added Install App to StaffSidebar.');
  } else {
    console.error('Target not found in StaffSidebar.tsx');
  }
}

