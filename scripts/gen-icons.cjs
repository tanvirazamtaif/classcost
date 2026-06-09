// Generates the ClassCost raster icons from the SVG mark.
// Run with: npm install sharp --no-save && node scripts/gen-icons.cjs
const sharp = require('sharp');
const path = require('path');
const pub = path.join(__dirname, '..', 'public');

const NAVY = '#191C4B';
const CREAM = '#F7F3E8';
// Cream "C"/winding-path mark, traced from the brand logo (cream on navy).
const MARK = 'M123 46 C92 60 60 94 60 132 C57 170 102 198 162 212 C128 196 108 168 112 142 C118 110 128 96 148 90 C166 82 166 62 154 56 C144 48 132 46 123 46 Z';

const iconSvg = (size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="${size}" height="${size}"><rect width="240" height="240" rx="54" fill="${NAVY}"/><path d="${MARK}" fill="${CREAM}"/></svg>`);
const markSvg = (size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="${size}" height="${size}"><path d="${MARK}" fill="${CREAM}"/></svg>`);

(async () => {
  await sharp(iconSvg(512)).png().toFile(path.join(pub, 'icon-512.png'));
  await sharp(iconSvg(192)).png().toFile(path.join(pub, 'icon-192.png'));
  await sharp(iconSvg(64)).png().toFile(path.join(pub, 'favicon.png'));
  const mark = await sharp(markSvg(360)).png().toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: NAVY } })
    .composite([{ input: mark, gravity: 'center' }])
    .png().toFile(path.join(pub, 'og-image.png'));
  console.log('icons generated:', ['icon-512', 'icon-192', 'favicon', 'og-image'].join(', '));
})().catch((e) => { console.error(e); process.exit(1); });
