import fs from 'fs';

function findManifests(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (['node_modules', '.next', '.git'].includes(e.name)) continue;
    const full = dir + '/' + e.name;
    if (e.isDirectory()) {
      findManifests(full);
    } else {
      if (e.name.includes('manifest') || e.name.includes('sw') || e.name.includes('worker') || e.name.includes('pwa')) {
        console.log(`Found candidate: ${full}`);
      }
    }
  }
}

findManifests('Santhaya-Associates');

