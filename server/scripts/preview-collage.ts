/**
 * Generates a collage video locally (no Cloudinary, no Mongo) using the EXACT
 * production filter chain + ffmpeg args. Writes the result to /tmp/collage-preview.mp4
 * so we can verify the streaming-pipeline changes produce a visually-correct video.
 *
 * Run:  npx tsx scripts/preview-collage.ts
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { TEMPLATES, buildFilterComplex, runFfmpeg } from '../src/routes/collage';

// Optional CLI arg: template id (default | gan-yehoshua). Falls back to 'default'.
const TEMPLATE_ID = process.argv[2] || 'default';
const OUTPUT_PATH = `/tmp/collage-preview-${TEMPLATE_ID}.mp4`;

// Six visually distinct synthetic photos: bold colored backgrounds with a huge
// number label. Letting us see exactly which photo lands in which panel.
const PHOTO_COLORS = [
  { bg: '#E63946', label: '1' }, // red
  { bg: '#F77F00', label: '2' }, // orange
  { bg: '#FCBF49', label: '3' }, // yellow
  { bg: '#06A77D', label: '4' }, // green
  { bg: '#118AB2', label: '5' }, // blue
  { bg: '#7209B7', label: '6' }, // purple
];

async function makeLabeledPhoto(bg: string, label: string, outPath: string): Promise<void> {
  // Generate an 1080x1080 image with bg color + a giant centered number.
  // sharp's SVG renderer handles the text cleanly without needing fonts on disk.
  const svg = `
    <svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
      <rect width="1080" height="1080" fill="${bg}" />
      <text x="540" y="540" font-family="Arial, sans-serif" font-size="600"
            font-weight="900" fill="white"
            text-anchor="middle" dominant-baseline="central">${label}</text>
    </svg>
  `;
  await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(outPath);
}

async function main(): Promise<void> {
  const template = TEMPLATES[TEMPLATE_ID];
  if (!template) {
    throw new Error(`Unknown template "${TEMPLATE_ID}". Available: ${Object.keys(TEMPLATES).join(', ')}`);
  }
  console.log(`[preview] template: ${TEMPLATE_ID} (${template.width}x${template.height}, ${template.duration}s, ${template.scenes.length} panels)`);
  const templatePath = path.join(__dirname, '..', 'assets', template.videoFile);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found at ${templatePath}`);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collage-preview-'));
  console.log(`[preview] tmp dir: ${tmpDir}`);

  console.log('[preview] generating 6 sample photos...');
  const imagePaths: string[] = [];
  for (let i = 0; i < PHOTO_COLORS.length; i++) {
    const p = path.join(tmpDir, `img_${i + 1}.jpg`);
    await makeLabeledPhoto(PHOTO_COLORS[i].bg, PHOTO_COLORS[i].label, p);
    imagePaths.push(p);
  }
  console.log(`[preview] photos: ${imagePaths.length} ready`);

  // Verify buildFilterComplex builds a valid chain for the default template
  // (we don't use the returned string directly — runFfmpeg calls it again
  // internally — but exercising it here gives a clean error if the JSON
  // motion data ever drifts).
  const filterPreview = buildFilterComplex(template, { logoIdx: null, titleIdx: null });
  console.log(`[preview] filter complex: ${filterPreview.length} chars`);

  let lastFramePct = 0;
  const expectedFrames = Math.round(template.duration * 20); // -r 20

  console.log('[preview] starting encode (real production pipeline)...');
  const start = Date.now();
  const { stdout, done } = runFfmpeg(template, templatePath, imagePaths, {
    onProgress: (frame) => {
      const pct = Math.floor((frame / expectedFrames) * 100);
      if (pct >= lastFramePct + 10) {
        lastFramePct = pct;
        console.log(`[preview]   ${Math.min(100, pct)}% (frame ${frame}/${expectedFrames})`);
      }
    },
  });

  // Drain ffmpeg's stdout to a local file — mirrors how the production route
  // pipes it to cloudinary.upload_stream, just with a file sink instead.
  const outStream = fs.createWriteStream(OUTPUT_PATH);
  stdout.pipe(outStream);

  await Promise.all([
    done,
    new Promise<void>((resolve, reject) => {
      outStream.on('finish', resolve);
      outStream.on('error', reject);
    }),
  ]);

  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  const sizeMB = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2);
  console.log(`[preview] DONE in ${elapsed}s → ${OUTPUT_PATH} (${sizeMB}MB)`);

  // Clean up sample photos but leave the output for inspection.
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error('[preview] failed:', err);
  process.exit(1);
});
