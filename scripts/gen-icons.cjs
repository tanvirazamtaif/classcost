// Generates the ClassCost raster icons from the real brand PNG (public/classcost-logo.png).
// Run with: npm install sharp --no-save && node scripts/gen-icons.cjs
const sharp = require('sharp');
const path = require('path');
const pub = path.join(__dirname, '..', 'public');
const SRC = path.join(pub, 'classcost-logo.png');

(async () => {
  const meta = await sharp(SRC).metadata();
  console.log('source:', `${meta.width}x${meta.height}`);
  // sample a corner pixel → the navy background, so the og padding matches seamlessly
  const c = await sharp(SRC).extract({ left: 2, top: 2, width: 1, height: 1 }).raw().toBuffer();
  const NAVY = `rgb(${c[0]},${c[1]},${c[2]})`;
  console.log('navy:', NAVY);

  await sharp(SRC).resize(512, 512, { fit: 'cover' }).png().toFile(path.join(pub, 'icon-512.png'));
  await sharp(SRC).resize(192, 192, { fit: 'cover' }).png().toFile(path.join(pub, 'icon-192.png'));
  await sharp(SRC).resize(64, 64, { fit: 'cover' }).png().toFile(path.join(pub, 'favicon.png'));

  // open-graph share image: 1200x630, the logo centered on matching navy
  const mark = await sharp(SRC).resize(380, 380, { fit: 'cover' }).png().toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: NAVY } })
    .composite([{ input: mark, gravity: 'center' }]).png().toFile(path.join(pub, 'og-image.png'));

  console.log('icons regenerated from classcost-logo.png');
})().catch((e) => { console.error(e); process.exit(1); });
