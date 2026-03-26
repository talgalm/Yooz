/**
 * POST /api/collage/generate
 *
 * Accepts:
 *   - images[]   multiple image files (multipart)
 *   - activityCode  string  (validates the request belongs to a real activity)
 *   - title      string  (shown as title-card overlay text)
 *
 * Flow:
 *   1. Validate activity code
 *   2. Write each image to a temp directory
 *   3. Run ffmpeg: scale → xfade transitions → background music → MP4
 *   4. Upload MP4 to Cloudinary
 *   5. Clean up temp files
 *   6. Return { url, isVideo: true }
 *
 * No admin auth required — any participant with a valid activity code may use it.
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

// Accept up to 20 images, max 50 MB each
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 20 },
});

// ─── ffmpeg helpers ────────────────────────────────────────────────────────────

const FFMPEG_BIN = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';
const FRAME_W = 540;
const FRAME_H = 960;
const IMG_DURATION = 3;   // seconds each image is shown
const FADE_DURATION = 0.5; // seconds for crossfade between images

/**
 * Build the -filter_complex string for an N-image slideshow with xfade.
 */
function buildFilterComplex(numImages: number): string {
  const parts: string[] = [];

  // Scale + pad every input to 540×960 (letterbox with black bars if needed)
  for (let i = 0; i < numImages; i++) {
    parts.push(
      `[${i}:v]scale=${FRAME_W}:${FRAME_H}:force_original_aspect_ratio=decrease,` +
      `pad=${FRAME_W}:${FRAME_H}:(ow-iw)/2:(oh-ih)/2:color=#0d0d1a,setsar=1[vs${i}]`,
    );
  }

  if (numImages === 1) {
    return parts.join(';') + ';[vs0]null[vout]';
  }

  // Chain xfade between consecutive images
  // Offset formula: i * (IMG_DURATION - FADE_DURATION) for the i-th transition
  let prevOut = 'vs0';
  for (let i = 1; i < numImages; i++) {
    const offset = (i * (IMG_DURATION - FADE_DURATION)).toFixed(2);
    const outLabel = i === numImages - 1 ? 'vout' : `vx${i}`;
    parts.push(
      `[${prevOut}][vs${i}]xfade=transition=fade:duration=${FADE_DURATION}:offset=${offset}[${outLabel}]`,
    );
    prevOut = outLabel;
  }

  return parts.join(';');
}

/**
 * Run ffmpeg to create a slideshow MP4 from image/video files.
 * Returns a promise that resolves when ffmpeg exits 0.
 */
function runFfmpeg(mediaFiles: Array<{ path: string; isVideo: boolean }>, outputPath: string, musicPath: string | null): Promise<void> {
  const n = mediaFiles.length;
  const args: string[] = ['-y'];

  // Images: loop a still frame for the slot duration.
  // Videos: trim to slot duration (no -loop needed — they already have frames).
  for (const media of mediaFiles) {
    if (media.isVideo) {
      args.push('-t', String(IMG_DURATION + FADE_DURATION + 0.1), '-i', media.path);
    } else {
      args.push('-loop', '1', '-t', String(IMG_DURATION + FADE_DURATION + 0.1), '-i', media.path);
    }
  }

  // Optional: background music (stream-looped so it covers any video length)
  const hasMusicFile = musicPath !== null && fs.existsSync(musicPath);
  if (hasMusicFile) {
    args.push('-stream_loop', '-1', '-t', '3600', '-i', musicPath!);
  }

  // Filter complex
  args.push('-filter_complex', buildFilterComplex(n));
  args.push('-map', '[vout]');

  if (hasMusicFile) {
    const musicInputIdx = n; // music is the last input
    args.push('-map', `${musicInputIdx}:a`);
    args.push('-c:a', 'aac', '-b:a', '128k', '-af', 'afade=t=in:d=1');
  }

  // Video encoding
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '23');

  // Hard limit to actual video duration so we don't get extra black frames
  const totalDuration = n === 1
    ? IMG_DURATION
    : n * IMG_DURATION - (n - 1) * FADE_DURATION;
  args.push('-t', String(totalDuration));

  if (hasMusicFile) {
    args.push('-shortest');
  }

  args.push(outputPath);

  return new Promise<void>((resolve, reject) => {
    const proc = spawn(FFMPEG_BIN, args);
    let stderrBuf = '';
    proc.stderr.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString();
    });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}.\n${stderrBuf.slice(-1500)}`));
      }
    });
    proc.on('error', (err) => reject(new Error(`Failed to spawn ffmpeg: ${err.message}. Make sure ffmpeg is installed (brew install ffmpeg).`)));
  });
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.post(
  '/generate',
  upload.array('images', 20),
  async (req: Request, res: Response) => {
    const { activityCode } = req.body as { activityCode?: string; title?: string };

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
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'At least one image is required' });
      return;
    }

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      res.status(500).json({ error: 'Cloudinary not configured' });
      return;
    }

    // ── Temp directory for this session ────────────────────────────────────────
    const sessionId = `collage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tmpDir = path.join(os.tmpdir(), sessionId);
    fs.mkdirSync(tmpDir, { recursive: true });

    const mediaFiles: Array<{ path: string; isVideo: boolean }> = [];
    const outputPath = path.join(tmpDir, 'output.mp4');

    // Path to optional background music bundled with the server
    const musicPath = path.join(process.cwd(), 'assets', 'collage-music.mp3');

    try {
      // Write uploaded files to disk
      for (let i = 0; i < files.length; i++) {
        const isVideo = files[i].mimetype.startsWith('video/');
        const ext = isVideo ? 'mp4' : (files[i].mimetype.includes('png') ? 'png' : 'jpg');
        const filePath = path.join(tmpDir, `media_${i}.${ext}`);
        fs.writeFileSync(filePath, files[i].buffer);
        mediaFiles.push({ path: filePath, isVideo });
      }

      // Run ffmpeg
      await runFfmpeg(mediaFiles, outputPath, musicPath);

      // Upload the generated MP4 to Cloudinary
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
      // Always clean up temp files
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  },
);

export default router;
