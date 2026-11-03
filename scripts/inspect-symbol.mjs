import sharp from 'sharp';

async function inspectSymbol() {
  const meta = await sharp('public/santhaya-symbol.png').metadata();
  console.log('Symbol Metadata:');
  console.log(`  Width: ${meta.width}`);
  console.log(`  Height: ${meta.height}`);
  console.log(`  Format: ${meta.format}`);
  console.log(`  Channels: ${meta.channels} (hasAlpha: ${meta.hasAlpha})`);
}

inspectSymbol().catch(console.error);

