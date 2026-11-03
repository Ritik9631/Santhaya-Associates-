import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function verifyIcons() {
  const files = fs.readdirSync('public/icons');
  for (const f of files) {
    const full = path.join('public/icons', f);
    const meta = await sharp(full).metadata();
    const stat = fs.statSync(full);
    console.log(`${f}: ${meta.width}x${meta.height} | ${(stat.size / 1024).toFixed(1)} KB | format: ${meta.format}`);
  }
}

verifyIcons().catch(console.error);

