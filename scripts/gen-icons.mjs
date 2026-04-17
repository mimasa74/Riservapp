import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'logo_tuenno_ui.png');

// Sfondo verde app
const BG = { r: 92, g: 107, b: 58 }; // #5C6B3A

async function generateIcon(size, outputName) {
  // Padding: 15% per lato → logo occupa 70% del totale
  const padding = Math.round(size * 0.15);
  const logoSize = size - padding * 2;

  // Ridimensiona e estrai solo il canale alpha (la sagoma)
  const resized = await sharp(logoPath)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Sostituisci tutti i pixel con bianco, mantieni alpha originale
  const { data, info } = resized;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a > 0) {
      data[i] = 255;     // R
      data[i + 1] = 255; // G
      data[i + 2] = 255; // B
    }
  }

  const whiteLogo = await sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();

  // Componi su sfondo verde pieno
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { ...BG, alpha: 255 },
    },
  })
    .composite([{ input: whiteLogo, top: padding, left: padding }])
    .png()
    .toFile(path.join(publicDir, outputName));

  console.log(`✓ ${outputName} (${size}x${size})`);
}

await generateIcon(192, 'icon-192.png');
await generateIcon(512, 'icon-512.png');
console.log('Done.');
