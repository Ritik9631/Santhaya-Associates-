import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ICONS_DIR = 'public/icons';
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

async function generateIcons() {
  console.log('Generating PWA Icons from public/santhaya-symbol.png...');
  const symbolBuffer = fs.readFileSync('public/santhaya-symbol.png');
  const symbolMeta = await sharp(symbolBuffer).metadata();
  console.log(`Source symbol: ${symbolMeta.width}x${symbolMeta.height}`);

  // Configuration for icons
  // Deep corporate navy brand background: #0F172A
  // Inner card: Crisp white rounded rectangle with golden/navy symbol, matching staff portal header branding
  
  async function createPwaIcon(size, isMaskable = false, isApple = false) {
    // For maskable, logo should occupy ~60% of canvas so it's comfortably inside 80% safe zone
    // For standard, logo can occupy ~75-80% of canvas
    const scaleFactor = isMaskable ? 0.62 : 0.78;
    const targetSymbolHeight = Math.round(size * scaleFactor);
    const targetSymbolWidth = Math.round((symbolMeta.width / symbolMeta.height) * targetSymbolHeight);

    // Resize symbol with high-quality lanczos3
    const resizedSymbol = await sharp(symbolBuffer)
      .resize(targetSymbolWidth, targetSymbolHeight, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toBuffer();

    // Create a circular or rounded badge on navy background
    // Card size
    const badgePadding = Math.round(size * 0.04);
    const badgeWidth = targetSymbolWidth + badgePadding * 2;
    const badgeHeight = targetSymbolHeight + badgePadding * 2;
    const rx = Math.round(size * 0.08); // Corner radius

    const badgeSvg = Buffer.from(`
      <svg width="${size}" height="${size}">
        <rect width="${size}" height="${size}" fill="#0F172A"/>
        <rect x="${(size - badgeWidth) / 2}" y="${(size - badgeHeight) / 2}" 
              width="${badgeWidth}" height="${badgeHeight}" 
              rx="${rx}" ry="${rx}" 
              fill="#FFFFFF" stroke="#E2E8F0" stroke-width="${Math.max(1, Math.round(size * 0.008))}"/>
      </svg>
    `);

    // Composite navy background + white card + symbol
    const finalImage = await sharp(badgeSvg)
      .composite([
        {
          input: resizedSymbol,
          top: Math.round((size - targetSymbolHeight) / 2),
          left: Math.round((size - targetSymbolWidth) / 2),
        }
      ])
      .png({ compressionLevel: 9 })
      .toBuffer();

    return finalImage;
  }

  // 1. icon-192x192.png
  const icon192 = await createPwaIcon(192, false);
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-192x192.png'), icon192);
  console.log('✓ Created public/icons/icon-192x192.png');

  // 2. icon-512x512.png
  const icon512 = await createPwaIcon(512, false);
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-512x512.png'), icon512);
  console.log('✓ Created public/icons/icon-512x512.png');

  // 3. icon-maskable-192x192.png
  const maskable192 = await createPwaIcon(192, true);
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-maskable-192x192.png'), maskable192);
  console.log('✓ Created public/icons/icon-maskable-192x192.png');

  // 4. icon-maskable-512x512.png
  const maskable512 = await createPwaIcon(512, true);
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-maskable-512x512.png'), maskable512);
  console.log('✓ Created public/icons/icon-maskable-512x512.png');

  // 5. apple-touch-icon.png (180x180)
  const apple180 = await createPwaIcon(180, false, true);
  fs.writeFileSync(path.join(ICONS_DIR, 'apple-touch-icon.png'), apple180);
  console.log('✓ Created public/icons/apple-touch-icon.png');

  console.log('\nAll PWA icons generated successfully.');
}

generateIcons().catch(console.error);

