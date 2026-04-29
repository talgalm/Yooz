/**
 * POST /api/collage/generate
 *
 * Accepts:
 *   - images[]   exactly N image files (multipart, where N = number of green
 *                panels in the template; currently 6)
 *   - activityCode  string  (validates the request belongs to a real activity)
 *
 * Flow:
 *   1. Validate activity code + that exactly N images were uploaded
 *   2. Write each image to a temp directory
 *   3. Run ffmpeg with the green-screen template:
 *        - Each image is overlaid at its panel's tracked position (per-frame
 *          keyframes loaded from src/data/collage-template-motion.json)
 *        - Template is layered on top with chromakey → green becomes transparent
 *        - Original audio track from the template is preserved
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
import motionData from '../data/collage-template-motion.json';

const router = Router();

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// ─── Template config ──────────────────────────────────────────────────────────
//
// The template video has N green panels filmed across multiple scene cuts and
// camera moves. Per-scene keyframes (sampled at 10fps via a Python detector)
// drive the FFmpeg overlay position so each image stays glued to its panel.
//
// To re-derive these numbers for a different template:
//   1. Replace server/assets/collage-template.mp4
//   2. Run /tmp/yooz-collage-inspect/extract_motion.py against the new video
//   3. Copy the produced JSON over server/src/data/collage-template-motion.json
//   4. Update TEMPLATE_META below if the resolution / duration / fps changed

interface MotionScene {
  index: number;
  startSec: number;
  endSec: number;
  panelW: number;
  panelH: number;
  // Each keyframe is [tSec, panelTopLeftX, panelTopLeftY] in pixel coords
  keyframes: number[][];
}

const SCENES = motionData as MotionScene[];

const TEMPLATE_META = {
  videoFile: 'collage-template.mp4',
  width: 1080,
  height: 1920,
  duration: 30.27,
  fps: 30,
  // tpad clones the template's first frame backwards so the first ~80ms
  // (before the source's first PTS) doesn't render as a black gap.
  startPad: 0.1,
  // Sampled hex of the green panels — varies a bit per scene so we use a
  // wider similarity threshold than for the previous template.
  chroma: { color: '0x499941', similarity: 0.20, blend: 0.05 },
  // Each image is rendered larger than its panel and shifted -BUFFER on both
  // axes, so it over-covers the green region by BUFFER px on every side.
  // Without this margin the chromakey edge transition reveals the BG at
  // panel borders (showing as a black/green halo around the photo).
  buffer: 30,
};

const FFMPEG_BIN = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
const REQUIRED_IMAGES = SCENES.length;

function piecewiseLinearExpr(keyframes: number[][], axis: 'x' | 'y'): string {
  // Build a nested if() FFmpeg expression that linearly interpolates between
  // adjacent keyframes and clamps to the last value past the final keyframe.
  const idx = axis === 'x' ? 1 : 2;
  if (keyframes.length === 1) return String(keyframes[0][idx]);
  let s = String(keyframes[keyframes.length - 1][idx]);
  for (let i = keyframes.length - 1; i >= 1; i--) {
    const t0 = keyframes[i - 1][0];
    const v0 = keyframes[i - 1][idx];
    const t1 = keyframes[i][0];
    const v1 = keyframes[i][idx];
    if (t1 === t0) {
      s = `if(lt(t,${t1}),${v0},${s})`;
    } else {
      const slope = ((v1 - v0) / (t1 - t0)).toFixed(3);
      s = `if(lt(t,${t1}),(${v0}+(${slope})*(t-${t0})),${s})`;
    }
  }
  return s;
}

function buildFilterComplex(): string {
  const { width, height, chroma, startPad, buffer } = TEMPLATE_META;
  const parts: string[] = [];

  // Pad the template's start with a clone of its first frame, then split
  // into one stream for the BG (no chroma) and one for the FG (chromakey'd).
  parts.push(
    `[0:v]tpad=start_mode=clone:start_duration=${startPad},setpts=PTS-STARTPTS,split=2[tmpl_bg][tmpl_fg]`,
  );
  parts.push(`[tmpl_bg]format=yuv420p[bg]`);

  // Each image input (1..N) is scaled to its scene's panel size + buffer.
  SCENES.forEach((sc, i) => {
    const w = sc.panelW + buffer * 2;
    const h = sc.panelH + buffer * 2;
    parts.push(`[${i + 1}:v]scale=${w}:${h},setsar=1[i${i}]`);
  });

  // Stack overlays time-gated by scene window. Each image is positioned at
  // (panelX - buffer, panelY - buffer) so its center sits on the panel.
  let prev = 'bg';
  SCENES.forEach((sc, i) => {
    const out = i === SCENES.length - 1 ? 'comp' : `b${i}`;
    const xExpr = `(${piecewiseLinearExpr(sc.keyframes, 'x')})-${buffer}`;
    const yExpr = `(${piecewiseLinearExpr(sc.keyframes, 'y')})-${buffer}`;
    parts.push(
      `[${prev}][i${i}]overlay=x='${xExpr}':y='${yExpr}'` +
        `:enable='between(t,${sc.startSec},${sc.endSec})'[${out}]`,
    );
    prev = out;
  });

  // Chromakey the FG copy of the template, then composite over the image stack.
  parts.push(
    `[tmpl_fg]chromakey=color=${chroma.color}:similarity=${chroma.similarity}:blend=${chroma.blend},` +
      `format=yuva420p[fg]`,
  );
  parts.push(`[comp][fg]overlay=0:0:format=auto[vout]`);

  // Quiet the unused dimension lints
  void width;
  void height;

  return parts.join(';');
}

function runFfmpeg(templatePath: string, imagePaths: string[], outputPath: string): Promise<void> {
  const args: string[] = ['-y', '-i', templatePath];
  for (const p of imagePaths) {
    args.push('-loop', '1', '-t', String(TEMPLATE_META.duration), '-i', p);
  }
  args.push(
    '-filter_complex', buildFilterComplex(),
    '-map', '[vout]',
    '-map', '0:a?',  // pass through original soundtrack if present
    '-t', String(TEMPLATE_META.duration),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '23',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: REQUIRED_IMAGES },
});

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

    const templatePath = path.join(process.cwd(), 'assets', TEMPLATE_META.videoFile);
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
