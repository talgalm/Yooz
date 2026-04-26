/**
 * POST /api/collage/generate
 *
 * Accepts:
 *   - images[]   exactly 3 image files (multipart)
 *   - activityCode  string  (validates the request belongs to a real activity)
 *
 * Flow:
 *   1. Validate activity code + that exactly 3 images were uploaded
 *   2. Write each image to a temp directory
 *   3. Run ffmpeg with a green-screen template:
 *        - Each image is overlaid at its panel's tracked position (piecewise linear)
 *        - Template video is layered on top with chromakey → green becomes transparent
 *        - Result: each image appears "printed" on its green panel, locked through camera motion
 *   4. Upload MP4 to Cloudinary
 *   5. Clean up temp files
 *   6. Return { url, isVideo: true }
 */

import { Router, Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpegPath from 'ffmpeg-static';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '../config';
import { Activity } from '../models';

const router = Router();

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 3 },
});

// ─── Template config ──────────────────────────────────────────────────────────
//
// The template video has 2 green panels filmed under a slow camera pan.
// We track each panel's world-space position with piecewise-linear motion
// and overlay user images at those positions. Chromakey then trims each
// image to the exact green-pixel shape per frame, so the image appears
// glued to the panel even as perspective shifts.
//
// To re-derive these numbers for a different template, run:
//   /tmp/yooz-collage-inspect/detect_panels.py against the new video.

// Per-panel keyframes are sampled every 0.25s from green-region detection.
// They drive the FFmpeg overlay x-expression as a piecewise-linear function,
// which keeps the image locked to the panel through the camera pan's
// non-uniform deceleration.
type Keyframe = readonly [tSec: number, x: number];

const PANEL_A_KEYFRAMES: readonly Keyframe[] = [
  [0.00, 128], [0.25, 100], [0.50,  64], [0.75,  18],
  [1.00, -26], [1.25, -76], [1.50,-128], [1.75,-180],
  [2.00,-232], [2.25,-280], [2.50,-324], [2.75,-369],
  [3.00,-397], [3.25,-418], [3.50,-428], [3.75,-433],
];

const PANEL_B_KEYFRAMES: readonly Keyframe[] = [
  [0.75, 666], [1.00, 616], [1.25, 563], [1.50, 510],
  [1.75, 458], [2.00, 406], [2.25, 359], [2.50, 316],
  [2.75, 272], [3.00, 245], [3.25, 226], [3.50, 216],
  [3.75, 212], [4.00, 210], [4.25, 208], [4.50, 205],
];

function piecewiseLinearExpr(points: readonly Keyframe[]): string {
  // Build a nested if() FFmpeg expression that linearly interpolates between
  // adjacent keyframes and clamps to the last value past the final keyframe.
  let s = String(points[points.length - 1][1]);
  for (let i = points.length - 1; i >= 1; i--) {
    const [t0, x0] = points[i - 1];
    const [t1, x1] = points[i];
    const slope = (x1 - x0) / (t1 - t0);
    const seg = `(${x0}+(${slope})*(t-${t0}))`;
    s = `if(lt(t,${t1}),${seg},${s})`;
  }
  return s;
}

const TEMPLATE = {
  videoFile: 'collage-template.mp4',
  width: 720,
  height: 1280,
  duration: 6.13,
  fps: 24,
  // tpad clones the template's first frame backwards so the first
  // ~80ms (before the source's first PTS) doesn't render as a black gap.
  startPad: 0.1,
  // Sampled hex of the green panels (RGB 67,152,39).
  chroma: { color: '0x439827', similarity: 0.10, blend: 0.02 },
  // Each image is sized 30px wider and taller than its panel and shifted -15/-15
  // so it over-covers the green region by ~15px on every side. Without this
  // buffer, the chromakey's edge transition reveals the BG at panel borders
  // (showing as a black/green halo around the photo).
  slots: [
    {
      imageIndex: 0,
      width: 475,
      height: 705,
      yExpr: '270',
      xExpr: `${piecewiseLinearExpr(PANEL_A_KEYFRAMES)}-15`,
      enableStart: 0,
      enableEnd: 3.5,
    },
    {
      imageIndex: 1,
      width: 375,
      height: 600,
      yExpr: '345',
      xExpr: `${piecewiseLinearExpr(PANEL_B_KEYFRAMES)}-15`,
      enableStart: 0.75,
      enableEnd: 4.5,
    },
    {
      imageIndex: 2,
      width: 375,
      height: 600,
      yExpr: '345',
      xExpr: '190',
      enableStart: 4.5,
      enableEnd: 6.13,
    },
  ],
};

const FFMPEG_BIN = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
const REQUIRED_IMAGES = TEMPLATE.slots.length;

function buildFilterComplex(): string {
  const { width, height, duration, fps, chroma, slots, startPad } = TEMPLATE;
  const parts: string[] = [];

  // Pad the template's start with a clone of its first frame so output isn't
  // a black flash for the ~80ms before the source's first PTS.
  parts.push(
    `[0:v]tpad=start_mode=clone:start_duration=${startPad},setpts=PTS-STARTPTS[tmpl]`,
  );

  parts.push(
    `color=c=black:s=${width}x${height}:d=${duration}:r=${fps},format=yuv420p[bg]`,
  );

  // Each user image: input index 1..N (input 0 is the template video).
  slots.forEach((slot, i) => {
    const inputIdx = i + 1;
    parts.push(`[${inputIdx}:v]scale=${slot.width}:${slot.height},setsar=1[i${i}]`);
  });

  // Stack slot overlays on top of the black background, time-gated.
  let prev = 'bg';
  slots.forEach((slot, i) => {
    const out = i === slots.length - 1 ? 'comp' : `b${i}`;
    parts.push(
      `[${prev}][i${i}]overlay=x='${slot.xExpr}':y=${slot.yExpr}` +
        `:enable='between(t,${slot.enableStart},${slot.enableEnd})'[${out}]`,
    );
    prev = out;
  });

  // Chromakey the (padded) template, then composite it over the image stack.
  parts.push(
    `[tmpl]chromakey=color=${chroma.color}:similarity=${chroma.similarity}:blend=${chroma.blend},` +
      `format=yuva420p[fg]`,
  );
  parts.push(`[comp][fg]overlay=0:0:format=auto[vout]`);

  return parts.join(';');
}

function runFfmpeg(templatePath: string, imagePaths: string[], outputPath: string): Promise<void> {
  const args: string[] = ['-y', '-i', templatePath];
  for (const p of imagePaths) {
    args.push('-loop', '1', '-t', String(TEMPLATE.duration), '-i', p);
  }
  args.push(
    '-filter_complex', buildFilterComplex(),
    '-map', '[vout]',
    '-t', String(TEMPLATE.duration),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '23',
    outputPath,
  );

  return new Promise<void>((resolve, reject) => {
    const proc = spawn(FFMPEG_BIN, args);
    let stderrBuf = '';
    proc.stderr.on('data', (chunk: Buffer) => { stderrBuf += chunk.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}.\n${stderrBuf.slice(-1500)}`));
    });
    proc.on('error', (err) =>
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}. Make sure ffmpeg is installed (brew install ffmpeg).`)),
    );
  });
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.post(
  '/generate',
  upload.array('images', REQUIRED_IMAGES),
  async (req: Request, res: Response) => {
    const { activityCode } = req.body as { activityCode?: string };

    if (!activityCode) {
      res.status(400).json({ error: 'activityCode is required' });
      return;
    }

    const activity = await Activity.findOne({ code: activityCode });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length !== REQUIRED_IMAGES) {
      res.status(400).json({
        error: `Exactly ${REQUIRED_IMAGES} images are required (got ${files?.length ?? 0})`,
      });
      return;
    }

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      res.status(500).json({ error: 'Cloudinary not configured' });
      return;
    }

    const templatePath = path.join(process.cwd(), 'assets', TEMPLATE.videoFile);
    if (!fs.existsSync(templatePath)) {
      res.status(500).json({ error: `Template video not found at ${templatePath}` });
      return;
    }

    const sessionId = `collage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tmpDir = path.join(os.tmpdir(), sessionId);
    fs.mkdirSync(tmpDir, { recursive: true });

    const imagePaths: string[] = [];
    const outputPath = path.join(tmpDir, 'output.mp4');

    try {
      for (let i = 0; i < files.length; i++) {
        const ext = files[i].mimetype.includes('png') ? 'png' : 'jpg';
        const filePath = path.join(tmpDir, `image_${i}.${ext}`);
        fs.writeFileSync(filePath, files[i].buffer);
        imagePaths.push(filePath);
      }

      await runFfmpeg(templatePath, imagePaths, outputPath);

      const cloudResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'video', folder: 'yooz/collages' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string });
          },
        );
        fs.createReadStream(outputPath).pipe(stream);
      });

      res.json({ url: cloudResult.secure_url, isVideo: true });
    } catch (err) {
      console.error('[collage] generation error:', err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'Collage generation failed' });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  },
);

export default router;
