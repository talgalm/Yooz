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
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '../config';
import { Activity, CollageJob } from '../models';
import { getSmsProvider } from '../services/sms/smsProvider';
import motionDataDefault from '../data/collage-template-motion.json';
import motionDataGanYehoshua from '../data/collage-template-gan-yehoshua-motion.json';
import {
  requiredImageCount,
  scheduleCollageEncode,
} from '../services/collageProcessor';
import { loadShed } from '../middleware/loadShedding';

const router = Router();

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// ─── Template config ──────────────────────────────────────────────────────────
//
// Each template video has N green panels filmed across multiple scene cuts and
// camera moves. Per-scene keyframes (sampled at 10fps via a detector script)
// drive the FFmpeg overlay position so each image stays glued to its panel.
//
// To add a new template:
//   1. Drop the source video into server/assets/<file>.mp4
//   2. Derive motion JSON via the detector (see /tmp/yooz-gani-detect/detect2.js)
//   3. Add an entry to TEMPLATES below, keyed by a stable id
//   4. Expose the id in the admin UI's Content select

interface MotionScene {
  index: number;
  startSec: number;
  endSec: number;
  panelW: number;
  panelH: number;
  // Each keyframe is [tSec, panelTopLeftX, panelTopLeftY] in pixel coords
  keyframes: number[][];
}

export interface TemplateMeta {
  videoFile: string;
  width: number;
  height: number;
  duration: number;
  fps: number;
  startPad: number;
  chroma: { color: string; similarity: number; blend: number };
  buffer: number;
  // Logo placeholder is optional — some templates have no yellow logo region.
  logo: { color: string; similarity: number; blend: number; x: number; y: number; w: number; h: number } | null;
  // Optional post-composite color-swap inside a bounding box. Used to recolor
  // a baked-in branded element in the source MP4 (e.g. yellow "SKY PARK TLV"
  // text in the gan-yehoshua template) without having to re-encode the source.
  iconRecolor?: {
    x: number; y: number; w: number; h: number;
    fromColor: string; toColor: string;
    similarity: number; blend: number;
  } | null;
  scenes: MotionScene[];
}

export const TEMPLATES: Record<string, TemplateMeta> = {
  default: {
    videoFile: 'collage-template.mp4',
    width: 1080,
    height: 1350,
    duration: 32.733,
    fps: 30,
    // tpad clones the template's first frame backwards so the first ~80ms
    // (before the source's first PTS) doesn't render as a black gap.
    startPad: 0.1,
    // Sampled hex of the panel green (BGR 105,222,79 → RGB 0x4FDE69). The
    // panels are uniform across all scenes (std < 3 per channel) and the
    // panel is rendered as a solid block (no anti-aliased edge, no fade),
    // so we use a tight similarity with NO blend. A wider blend would give
    // grass partial alpha (its dark green is in the YUV blend zone), which
    // makes the lingering image visible as a ghost after the panel ends.
    chroma: { color: '0x4FDE69', similarity: 0.10, blend: 0.0 },
    // Each image is rendered larger than its panel and shifted -BUFFER on both
    // axes, so it over-covers the green region by BUFFER px on every side.
    // Without this margin the chromakey edge transition reveals the BG at
    // panel borders (showing as a black/green halo around the photo).
    buffer: 30,
    // Static yellow logo placeholder in the template — same position throughout.
    // Sampled at #F9F532 (uniform). The logo image is overlaid here, and the
    // foreground template is also chromakey'd against this color so the photo
    // sits behind the template without yellow showing through.
    logo: { color: '0xF9F532', similarity: 0.10, blend: 0.0, x: 160, y: 0, w: 130, h: 134 },
    scenes: motionDataDefault as MotionScene[],
  },
  'gan-yehoshua': {
    videoFile: 'collage-template-gan-yehoshua.mp4',
    width: 1080,
    height: 1920,
    duration: 31.992,
    fps: 30,
    startPad: 0.1,
    // Sampled across multiple panel frames: center 0x4FDC6B, range 0x45D164–0x5CEB6F.
    // Same target + tolerance as default works cleanly here.
    chroma: { color: '0x4FDE69', similarity: 0.10, blend: 0.0 },
    buffer: 30,
    // No yellow logo placeholder in this template.
    logo: null,
    // Source video has a baked-in "SKY PARK TLV" yellow text under the icon
    // in the top-left. Customer asked for white text; we colorkey the yellow
    // out of the top-left corner and composite white through it so the icon
    // shape stays visible while the text reads white.
    iconRecolor: {
      x: 0, y: 0, w: 300, h: 270,
      fromColor: '0xFFE51F', toColor: 'white',
      similarity: 0.30, blend: 0.05,
    },
    scenes: motionDataGanYehoshua as MotionScene[],
  },
};

export const DEFAULT_TEMPLATE_ID = 'default';

const FFMPEG_BIN = process.env.FFMPEG_PATH || ffmpegPath || 'ffmpeg';

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

export function buildFilterComplex(
  template: TemplateMeta,
  opts: { logoIdx: number | null; titleIdx: number | null },
): string {
  const { width, height, chroma, startPad, buffer, logo, scenes } = template;
  const { logoIdx, titleIdx } = opts;
  const parts: string[] = [];

  // Pad the template's start with a clone of its first frame, then drop the
  // framerate to match the output (20fps) BEFORE the heavy filter chain runs.
  // Without fps=20 here, chromakey/overlay/alphamerge all process 30fps frames
  // that the encoder then throws away — ~33% wasted filter work.
  parts.push(
    `[0:v]tpad=start_mode=clone:start_duration=${startPad},setpts=PTS-STARTPTS,fps=20,split=2[tmpl_bg][tmpl_fg]`,
  );
  parts.push(`[tmpl_bg]format=yuv420p[bg]`);

  // Each image input (1..N) is scaled to its scene's panel size + buffer.
  scenes.forEach((sc, i) => {
    const w = sc.panelW + buffer * 2;
    const h = sc.panelH + buffer * 2;
    parts.push(`[${i + 1}:v]scale=${w}:${h},setsar=1[i${i}]`);
  });

  // Stack photo overlays time-gated by scene window. Each image is positioned
  // at (panelX - buffer, panelY - buffer) so its center sits on the panel.
  // Pad the enable window slightly past the detected scene boundaries so a
  // chromakey'd green panel doesn't briefly flash between scenes (the auto-
  // detected windows are tighter than the panel's actual visibility).
  const ENABLE_PRE = 0.2;
  const ENABLE_POST = 0.4;
  let prev = 'bg';
  scenes.forEach((sc, i) => {
    const xExpr = `(${piecewiseLinearExpr(sc.keyframes, 'x')})-${buffer}`;
    const yExpr = `(${piecewiseLinearExpr(sc.keyframes, 'y')})-${buffer}`;
    const enableStart = Math.max(0, sc.startSec - ENABLE_PRE);
    const enableEnd = sc.endSec + ENABLE_POST;
    const out = `b${i}`;
    parts.push(
      `[${prev}][i${i}]overlay=x='${xExpr}':y='${yExpr}'` +
        `:enable='between(t,${enableStart},${enableEnd})'[${out}]`,
    );
    prev = out;
  });

  // Logo: scale to the yellow panel size and overlay at its top-left, behind
  // the template foreground. The yellow color is also added to the chromakey
  // chain below so the template no longer occludes the logo.
  if (logoIdx !== null && logo) {
    parts.push(`[${logoIdx}:v]scale=${logo.w}:${logo.h}:force_original_aspect_ratio=decrease,pad=${logo.w}:${logo.h}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1[logo]`);
    parts.push(`[${prev}][logo]overlay=x=${logo.x}:y=${logo.y}[bgL]`);
    prev = 'bgL';
  }

  parts.push(`[${prev}]null[comp]`);

  // Chromakey the FG copy of the template. When a logo is provided we ALSO
  // need to key out the yellow placeholder so the logo behind it stays visible.
  // Chained chromakey filters can't be used because each one overwrites the
  // alpha channel — so we generate two alpha masks separately and combine
  // them with `blend=darken` (pixel is opaque only if both masks are opaque).
  if (logoIdx !== null && logo) {
    parts.push(
      `[tmpl_fg]format=yuva420p,split=3[fgRGB][fgG][fgY];` +
      `[fgG]chromakey=color=${chroma.color}:similarity=${chroma.similarity}:blend=${chroma.blend},alphaextract[mg];` +
      `[fgY]chromakey=color=${logo.color}:similarity=${logo.similarity}:blend=${logo.blend},alphaextract[my];` +
      `[mg][my]blend=all_mode=darken,format=gray[combined];` +
      `[fgRGB][combined]alphamerge[fg]`,
    );
  } else {
    parts.push(
      `[tmpl_fg]chromakey=color=${chroma.color}:similarity=${chroma.similarity}:blend=${chroma.blend},format=yuva420p[fg]`,
    );
  }

  // Composite the chromakey'd template over the photo + logo stack.
  // The composite is built at the template's native resolution (1080×1350
  // or 1080×1920) for keyframe-pixel precision, then downscaled at the end.
  if (titleIdx !== null) {
    parts.push(`[comp][fg]overlay=0:0:format=auto[withFg]`);
    // Title image is rendered client-side at native resolution. Center it
    // horizontally; place near top with a small margin.
    parts.push(`[${titleIdx}:v]format=rgba,setsar=1[title]`);
    parts.push(`[withFg][title]overlay=x=(W-w)/2:y=40:format=auto[vraw]`);
  } else {
    parts.push(`[comp][fg]overlay=0:0:format=auto[vraw]`);
  }

  // Optional baked-icon recolor (e.g. yellow "SKY PARK TLV" text → white in
  // the gan-yehoshua template). Crop the bbox, colorkey the source color to
  // transparent, composite over a solid target-color block, then overlay back.
  let scaleIn = 'vraw';
  if (template.iconRecolor) {
    const r = template.iconRecolor;
    parts.push(`[vraw]split=2[vrMain][vrCorner]`);
    parts.push(
      `[vrCorner]crop=${r.w}:${r.h}:${r.x}:${r.y},` +
        `colorkey=color=${r.fromColor}:similarity=${r.similarity}:blend=${r.blend}[crnKeyed]`,
    );
    parts.push(`color=color=${r.toColor}:size=${r.w}x${r.h}:rate=${template.fps},format=yuv420p[crnFill]`);
    parts.push(`[crnFill][crnKeyed]overlay=0:0:format=auto[crnOut]`);
    parts.push(`[vrMain][crnOut]overlay=${r.x}:${r.y}:format=auto[vrawFixed]`);
    scaleIn = 'vrawFixed';
  }

  // Final downscale to 540px wide. Phones are the primary delivery target;
  // 1080→540 cuts pixel count by ~75% and roughly halves encode time vs 720.
  parts.push(`[${scaleIn}]scale=540:-2[vout]`);

  // Quiet the unused dimension lints
  void width;
  void height;

  return parts.join(';');
}

// Returns the ffmpeg child's stdout (a streaming fragmented-MP4) plus a `done`
// promise that resolves on clean exit. Caller is expected to pipe `stdout`
// somewhere (e.g. cloudinary.upload_stream) and await `done` — running encode
// and upload in parallel cuts ~30-60s off total wall-time on t3.medium vs the
// previous "write file, then upload it" pattern.
export function runFfmpeg(
  template: TemplateMeta,
  templatePath: string,
  imagePaths: string[],
  extras: { logoPath?: string; titlePath?: string; onProgress?: (frame: number) => void },
): { stdout: Readable; done: Promise<void> } {
  // Progress moved to fd 3 so stdout is exclusively for the MP4 bytes. Without
  // this, the upload stream would receive interleaved `frame=...\n` text and
  // Cloudinary would reject the file. `-nostats` silences ffmpeg's human-
  // readable status lines so stderr stays useful for errors.
  const args: string[] = ['-y', '-progress', 'pipe:3', '-nostats', '-i', templatePath];
  for (const p of imagePaths) {
    args.push('-loop', '1', '-t', String(template.duration), '-i', p);
  }

  let nextIdx = 1 + imagePaths.length;
  let logoIdx: number | null = null;
  let titleIdx: number | null = null;
  // Only feed the logo input when the template supports a logo placeholder;
  // otherwise the chromakey-yellow chain would never key it out and the logo
  // would sit on top of the photos as a stray rectangle.
  if (extras.logoPath && template.logo) {
    args.push('-loop', '1', '-t', String(template.duration), '-i', extras.logoPath);
    logoIdx = nextIdx++;
  }
  if (extras.titlePath) {
    args.push('-loop', '1', '-t', String(template.duration), '-i', extras.titlePath);
    titleIdx = nextIdx++;
  }

  args.push(
    '-filter_complex', buildFilterComplex(template, { logoIdx, titleIdx }),
    '-map', '[vout]',
    '-map', '0:a?',  // pass through original soundtrack if present
    '-t', String(template.duration),
    '-r', '20',      // drop output framerate 30→20 (~33% fewer encoded frames; imperceptible on mobile)
    // -threads 0 lets libx264 pick a thread count based on available CPUs.
    // Without this it defaults to a single thread and leaves the 2nd vCPU idle
    // on t3.medium — biggest single-flag win for collage encode time.
    '-threads', '0',
    // ultrafast vs superfast: ~25% faster encode in exchange for a slightly
    // larger MP4. Since the collage output streams via Cloudinary and is short
    // (~32s), file size is not the bottleneck — encode wall-time is.
    // CRF 28 (was 25): higher number = lower bitrate / faster encode. 28 is
    // still well above the visible-artifact threshold for mobile playback.
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '28',
    '-c:a', 'aac', '-b:a', '128k',
    // Fragmented MP4 — required when writing to a pipe (no seekable backing
    // means the normal moov-at-end pattern can't work). empty_moov+
    // frag_keyframe+default_base_moof emits a streamable MP4 that Cloudinary
    // ingests fine and that every modern mobile player decodes correctly.
    '-movflags', '+empty_moov+frag_keyframe+default_base_moof',
    '-f', 'mp4',
    'pipe:1',
  );

  // stdio: [stdin, stdout, stderr, fd3-for-progress]. fd 3 is opened as a pipe
  // so we can read `-progress pipe:3` from proc.stdio[3] without polluting
  // stdout (which is now carrying the MP4).
  const proc = spawn(FFMPEG_BIN, args, { stdio: ['ignore', 'pipe', 'pipe', 'pipe'] });

  let progressBuf = '';
  const progressStream = proc.stdio[3] as Readable;
  progressStream.on('data', (chunk: Buffer) => {
    // -progress writes blocks of `key=value\n` lines ending in `progress=continue`
    // or `progress=end`. We just need the most recent `frame=N` to estimate %.
    progressBuf += chunk.toString();
    const lines = progressBuf.split('\n');
    progressBuf = lines.pop() ?? '';
    for (const line of lines) {
      const m = /^frame=(\d+)/.exec(line.trim());
      if (m && extras.onProgress) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n)) extras.onProgress(n);
      }
    }
  });

  let stderrBuf = '';
  // stderr is configured as 'pipe' above, so it's guaranteed non-null —
  // TS just can't infer that from the array literal.
  proc.stderr!.on('data', (chunk: Buffer) => { stderrBuf += chunk.toString(); });

  const done = new Promise<void>((resolve, reject) => {
    proc.on('close', (code, signal) => {
      if (code === 0) resolve();
      else {
        // signal === 'SIGKILL' usually means the OS OOM-killer reaped us.
        const sigStr = signal ? `, signal ${signal}` : '';
        console.error(`[collage] ffmpeg failed (code ${code}${sigStr}). stderr tail:\n${stderrBuf.slice(-2000)}`);
        reject(new Error(`ffmpeg exited with code ${code}${sigStr}.\n${stderrBuf.slice(-1500)}`));
      }
    });
    proc.on('error', (err) =>
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}. Make sure ffmpeg is installed (brew install ffmpeg).`)),
    );
  });

  // stdout is configured as 'pipe' above, so it's guaranteed non-null.
  return { stdout: proc.stdout!, done };
}

// ─── Progress tracking ────────────────────────────────────────────────────────
//
// Generation is a long-running blocking POST (sharp → ffmpeg → cloudinary, ~2-3
// min on t3.medium). The client passes a `jobId` with the upload and polls
// /progress/:jobId to render a real progress bar + ETA. Entries are kept in
// memory only and GC'd after 10 min of inactivity — they don't survive process
// restarts, which is fine: a restart kills the in-flight request anyway.

type JobPhase = 'preparing' | 'encoding' | 'uploading' | 'done' | 'error';
interface CollageJob {
  startedAt: number;
  updatedAt: number;
  phase: JobPhase;
  percent: number; // 0-100, monotonically non-decreasing while in-flight
  message: string;
  error?: string;
}

const jobs = new Map<string, CollageJob>();

function setJobProgress(jobId: string | undefined, patch: Partial<CollageJob>): void {
  if (!jobId) return;
  const now = Date.now();
  const prev: CollageJob = jobs.get(jobId) ?? {
    startedAt: now,
    updatedAt: now,
    phase: 'preparing',
    percent: 0,
    message: '',
  };
  // Never let percent move backwards — onProgress samples from ffmpeg can be
  // noisy and a regression would visibly stutter the client bar.
  const next: CollageJob = {
    ...prev,
    ...patch,
    percent: Math.max(prev.percent, patch.percent ?? prev.percent),
    updatedAt: now,
  };
  jobs.set(jobId, next);
}

setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.updatedAt < cutoff) jobs.delete(id);
  }
}, 5 * 60 * 1000).unref();

router.get('/progress/:jobId', async (req: Request<{ jobId: string }>, res: Response) => {
  const mongoJob = await CollageJob.findOne({ jobId: req.params.jobId });
  if (mongoJob) {
    const elapsedSec = (Date.now() - mongoJob.createdAt.getTime()) / 1000;
    const etaSeconds =
      mongoJob.phase === 'done' || mongoJob.phase === 'error' || mongoJob.percent <= 0 || mongoJob.percent >= 100
        ? null
        : Math.max(0, Math.round((elapsedSec * (100 - mongoJob.percent)) / mongoJob.percent));
    res.json({
      phase: mongoJob.phase,
      percent: mongoJob.percent,
      message: mongoJob.message,
      etaSeconds,
      error: mongoJob.error,
      resultUrl: mongoJob.resultUrl,
      isVideo: mongoJob.isVideo,
    });
    return;
  }

  const job = jobs.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'unknown job' });
    return;
  }
  const elapsedSec = (Date.now() - job.startedAt) / 1000;
  const etaSeconds =
    job.phase === 'done' || job.phase === 'error' || job.percent <= 0 || job.percent >= 100
      ? null
      : Math.max(0, Math.round((elapsedSec * (100 - job.percent)) / job.percent));
  res.json({
    phase: job.phase,
    percent: job.percent,
    message: job.message,
    etaSeconds,
    error: job.error,
  });
});

function serializeCollageJob(job: InstanceType<typeof CollageJob>) {
  const uploaded = job.imageUrls.filter(Boolean).length;
  return {
    jobId: job.jobId,
    activityCode: job.activityCode,
    splitGroupId: job.splitGroupId,
    template: job.template,
    phase: job.phase,
    percent: job.percent,
    message: job.message,
    error: job.error,
    resultUrl: job.resultUrl,
    isVideo: job.isVideo,
    requiredImages: job.requiredImages,
    uploadedImages: uploaded,
    imageUrls: job.imageUrls,
    title: job.title,
  };
}

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// Sign a direct-to-Cloudinary upload. Removes the server from the upload
// bandwidth path: client POSTs the file straight to api.cloudinary.com using
// these short-lived credentials, then reports the resulting URL via
// /photo-uploaded. Much higher concurrency ceiling than streaming through us.
// loadShed: refuses signing when the box is already saturated, so we don't
// keep authorizing new uploads while we're falling over.
router.post('/upload-sign', loadShed, async (req: Request, res: Response) => {
  const { activityCode, jobId, imageIndex } = req.body as {
    activityCode?: string; jobId?: string; imageIndex?: number;
  };
  if (!activityCode || !jobId || typeof imageIndex !== 'number') {
    res.status(400).json({ error: 'activityCode, jobId, imageIndex required' });
    return;
  }
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    res.status(500).json({ error: 'Cloudinary not configured' });
    return;
  }
  const activity = await Activity.findOne({ code: activityCode }).select('_id').lean();
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `yooz/collage-inputs/${activityCode}`;
  const public_id = `${jobId}_${imageIndex}_${Math.random().toString(36).slice(2, 8)}`;
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder, public_id },
    CLOUDINARY_API_SECRET,
  );
  res.json({
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    timestamp, signature, folder, publicId: public_id,
  });
});

// Record a successful direct upload — what /upload-photo used to do after
// streaming bytes through us. Just the DB write; no I/O.
router.post('/photo-uploaded', async (req: Request, res: Response) => {
  const { activityCode, jobId, imageIndex, url } = req.body as {
    activityCode?: string; jobId?: string; imageIndex?: number; url?: string;
  };
  if (!activityCode || !jobId || typeof imageIndex !== 'number' || !url) {
    res.status(400).json({ error: 'activityCode, jobId, imageIndex, url required' });
    return;
  }
  const job = await CollageJob.findOne({ jobId });
  if (!job) {
    res.status(404).json({ error: 'Job not found — create it first' });
    return;
  }
  while (job.imageUrls.length <= imageIndex) job.imageUrls.push('');
  job.imageUrls[imageIndex] = url;
  if (job.phase === 'error') job.phase = 'collecting';
  job.message = `הועלו ${job.imageUrls.filter(Boolean).length}/${job.requiredImages} תמונות`;
  await job.save();
  res.json({ url, jobId, imageIndex });
});

router.post('/upload-photo', photoUpload.single('file'), async (req: Request, res: Response) => {
  const { activityCode, jobId, imageIndex } = req.body as {
    activityCode?: string;
    jobId?: string;
    imageIndex?: string;
  };

  if (!activityCode || !jobId || imageIndex === undefined) {
    res.status(400).json({ error: 'activityCode, jobId, and imageIndex are required' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  const activity = await Activity.findOne({ code: activityCode });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    res.status(500).json({ error: 'Cloudinary not configured' });
    return;
  }

  const idx = parseInt(imageIndex, 10);
  if (!Number.isFinite(idx) || idx < 0) {
    res.status(400).json({ error: 'Invalid imageIndex' });
    return;
  }

  try {
    const cloudResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: `yooz/collage-inputs/${activityCode}`,
          format: 'jpg',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as { secure_url: string });
        },
      );
      stream.end(req.file!.buffer);
    });

    let job = await CollageJob.findOne({ jobId });
    if (!job) {
      res.status(404).json({ error: 'Job not found — create it first' });
      return;
    }

    while (job.imageUrls.length <= idx) job.imageUrls.push('');
    job.imageUrls[idx] = cloudResult.secure_url;
    job.phase = job.phase === 'error' ? 'collecting' : job.phase;
    job.message = `הועלו ${job.imageUrls.filter(Boolean).length}/${job.requiredImages} תמונות`;
    await job.save();

    res.json({ url: cloudResult.secure_url, jobId, imageIndex: idx });
  } catch (err) {
    console.error('[collage] upload-photo error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.post('/upload-title', photoUpload.single('file'), async (req: Request, res: Response) => {
  const { activityCode, jobId } = req.body as { activityCode?: string; jobId?: string };
  if (!activityCode || !jobId || !req.file) {
    res.status(400).json({ error: 'activityCode, jobId, and file are required' });
    return;
  }

  const activity = await Activity.findOne({ code: activityCode });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  try {
    const cloudResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image', folder: `yooz/collage-inputs/${activityCode}` },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as { secure_url: string });
        },
      );
      stream.end(req.file!.buffer);
    });

    const job = await CollageJob.findOne({ jobId });
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    job.titleImageUrl = cloudResult.secure_url;
    await job.save();
    res.json({ url: cloudResult.secure_url });
  } catch (err) {
    console.error('[collage] upload-title error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.post('/jobs', async (req: Request, res: Response) => {
  const {
    jobId,
    activityCode,
    template: templateId,
    splitGroupId,
    logoUrl,
    title,
    requiredImages: requiredImagesBody,
  } = req.body as {
    jobId?: string;
    activityCode?: string;
    template?: string;
    splitGroupId?: string;
    logoUrl?: string;
    title?: string;
    requiredImages?: number;
  };

  if (!jobId || !activityCode) {
    res.status(400).json({ error: 'jobId and activityCode are required' });
    return;
  }

  const activity = await Activity.findOne({ code: activityCode });
  if (!activity) {
    res.status(404).json({ error: 'Activity not found' });
    return;
  }

  const requiredImages = requiredImagesBody ?? requiredImageCount(templateId);
  const existing = await CollageJob.findOne({ jobId });
  if (existing) {
    res.json(serializeCollageJob(existing));
    return;
  }

  const job = await CollageJob.create({
    jobId,
    activityCode,
    splitGroupId,
    template: templateId && TEMPLATES[templateId] ? templateId : DEFAULT_TEMPLATE_ID,
    logoUrl,
    title,
    requiredImages,
    imageUrls: [],
    phase: 'collecting',
    percent: 0,
    message: 'אוסף תמונות...',
    isVideo: true,
  });

  res.status(201).json(serializeCollageJob(job));
});

router.get('/jobs/:jobId', async (req: Request<{ jobId: string }>, res: Response) => {
  const job = await CollageJob.findOne({ jobId: req.params.jobId });
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json(serializeCollageJob(job));
});

router.get('/jobs', async (req: Request, res: Response) => {
  const { activityCode, splitGroupId } = req.query as { activityCode?: string; splitGroupId?: string };
  if (!activityCode) {
    res.status(400).json({ error: 'activityCode is required' });
    return;
  }
  const filter: Record<string, string> = { activityCode };
  if (splitGroupId) filter.splitGroupId = splitGroupId;
  const job = await CollageJob.findOne(filter).sort({ updatedAt: -1 });
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  res.json(serializeCollageJob(job));
});

router.post('/jobs/:jobId/start', loadShed, async (req: Request<{ jobId: string }>, res: Response) => {
  const { title } = req.body as { title?: string };
  const job = await CollageJob.findOne({ jobId: req.params.jobId });
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  if (job.phase === 'done' && job.resultUrl) {
    res.json(serializeCollageJob(job));
    return;
  }

  if (title?.trim()) job.title = title.trim();

  const orderedUrls = Array.from({ length: job.requiredImages }, (_, i) => job.imageUrls[i] || '');
  if (orderedUrls.some((u) => !u)) {
    res.status(400).json({
      error: `Missing photos (${orderedUrls.filter(Boolean).length}/${job.requiredImages})`,
    });
    return;
  }

  if (job.phase === 'encoding' || job.phase === 'preparing' || job.phase === 'queued') {
    res.status(202).json(serializeCollageJob(job));
    return;
  }

  job.phase = 'queued';
  job.percent = Math.max(job.percent, 2);
  job.message = 'ממתין לקידוד...';
  job.error = undefined;
  await job.save();

  scheduleCollageEncode(job.jobId);
  res.status(202).json(serializeCollageJob(job));
});

// Participant taps "send video by SMS" in the loading screen → save phone on
// the job. The sweeper below picks it up once Lambda flips phase='done'.
// If the job is already done, fire the SMS immediately.
router.post('/jobs/:jobId/notify-sms', async (req: Request<{ jobId: string }>, res: Response) => {
  const { phoneNumber } = req.body as { phoneNumber?: string };
  const phone = phoneNumber?.trim();
  if (!phone) {
    res.status(400).json({ error: 'phoneNumber required' });
    return;
  }
  const job = await CollageJob.findOne({ jobId: req.params.jobId });
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  const activity = await Activity.findOne({ code: job.activityCode }).lean();
  if (!activity?.smsForCollage) {
    res.status(403).json({ error: 'SMS for collage not enabled for this activity' });
    return;
  }
  job.smsPhone = phone;
  await job.save();
  console.log(`[collage] SMS requested job=${job.jobId} phase=${job.phase} → send to ${phone}`);
  if (job.phase === 'done' && job.resultUrl && !job.smsSentAt) {
    void sendCollageReadySms(job.jobId).catch((e) => console.error('[collage] immediate SMS failed', e));
  }
  res.json({ ok: true });
});

router.post('/jobs/:jobId/retry', async (req: Request<{ jobId: string }>, res: Response) => {
  const job = await CollageJob.findOne({ jobId: req.params.jobId });
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  job.phase = 'queued';
  job.error = undefined;
  job.message = 'מנסה שוב...';
  await job.save();
  scheduleCollageEncode(job.jobId);
  res.status(202).json(serializeCollageJob(job));
});

// Max images across all templates — multer needs a static limit. All current
// templates have 6 panels; the +2 leaves room for title + logo.
const MAX_FILES = Math.max(...Object.values(TEMPLATES).map((t) => t.scenes.length)) + 2;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: MAX_FILES },
});

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download logo (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.post(
  '/generate',
  upload.fields([
    { name: 'images', maxCount: MAX_FILES },
    { name: 'titleImage', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    const { activityCode, logoUrl, template: templateId, jobId } = req.body as {
      activityCode?: string;
      logoUrl?: string;
      template?: string;
      jobId?: string;
    };

    if (!activityCode) {
      res.status(400).json({ error: 'activityCode is required' });
      return;
    }

    // Register the job immediately so the client's first poll (which fires as
    // soon as the upload completes) doesn't race the server.
    setJobProgress(jobId, {
      phase: 'preparing',
      percent: 2,
      message: 'מכין תמונות...',
    });

    const activity = await Activity.findOne({ code: activityCode });
    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    const resolvedTemplateId = templateId && TEMPLATES[templateId] ? templateId : DEFAULT_TEMPLATE_ID;
    const template = TEMPLATES[resolvedTemplateId];
    const requiredImages = template.scenes.length;

    const fileMap = (req.files as Record<string, Express.Multer.File[]> | undefined) ?? {};
    const files = fileMap.images ?? [];
    const titleFiles = fileMap.titleImage ?? [];
    if (files.length !== requiredImages) {
      res.status(400).json({
        error: `Exactly ${requiredImages} images are required (got ${files.length})`,
      });
      return;
    }

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      res.status(500).json({ error: 'Cloudinary not configured' });
      return;
    }

    const templatePath = path.join(process.cwd(), 'assets', template.videoFile);
    if (!fs.existsSync(templatePath)) {
      res.status(500).json({ error: `Template video not found at ${templatePath}` });
      return;
    }

    const sessionId = `collage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const tmpDir = path.join(os.tmpdir(), sessionId);
    fs.mkdirSync(tmpDir, { recursive: true });

    const imagePaths: string[] = [];

    try {
      // Pre-scale every uploaded photo to max 1080px (longest edge) before
      // handing them to ffmpeg. Without this, ffmpeg's scale filter runs on
      // 4K iPhone photos at every output frame (30fps × 32s = ~960 times per
      // input), which dominates encode time. Pre-scaling once cuts the
      // collage render from 5+ min down to ~2-3 min on t3.medium.
      //
      // sharp().rotate() honors EXIF Orientation so portrait iPhone photos
      // render upright. failOn:'none' tolerates slightly malformed JPEGs.
      // On any sharp failure (e.g. an unexpected video upload), we fall back
      // to writing the original buffer so ffmpeg can still try.
      const sharpStart = Date.now();
      // Parallelize sharp resize across all 6 inputs — independent work, no
      // contention. Sequential `for await` left CPUs idle.
      const resizedPaths = await Promise.all(
        files.map(async (file, i) => {
          const filePath = path.join(tmpDir, `image_${i}.jpg`);
          const origBytes = file.buffer.length;
          try {
            const resized = await sharp(file.buffer, { failOn: 'none' })
              .rotate()
              .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 85, mozjpeg: true })
              .toBuffer();
            fs.writeFileSync(filePath, resized);
            console.log(`[collage] image_${i}: ${(origBytes / 1024).toFixed(0)}KB → ${(resized.length / 1024).toFixed(0)}KB`);
          } catch (err) {
            console.warn(`[collage] sharp resize failed for image ${i}, using original:`, err);
            fs.writeFileSync(filePath, file.buffer);
          }
          return filePath;
        }),
      );
      imagePaths.push(...resizedPaths);
      console.log(`[collage] sharp resize x${files.length} took ${Date.now() - sharpStart}ms`);

      setJobProgress(jobId, { percent: 15, message: 'מתחיל קידוד וידאו...' });

      // Prepare logo + title in parallel. Logo is a network fetch (Cloudinary)
      // and was previously blocking the title disk write behind it for no
      // reason — they're independent inputs to ffmpeg.
      const [logoPath, titlePath] = await Promise.all([
        (async (): Promise<string | undefined> => {
          if (!(logoUrl && /^https?:\/\//i.test(logoUrl))) return undefined;
          const p = path.join(tmpDir, 'logo.png');
          try {
            await downloadToFile(logoUrl, p);
            return p;
          } catch (e) {
            console.warn('[collage] logo download failed, skipping:', e);
            return undefined;
          }
        })(),
        (async (): Promise<string | undefined> => {
          if (titleFiles.length === 0) return undefined;
          const p = path.join(tmpDir, 'title.png');
          fs.writeFileSync(p, titleFiles[0].buffer);
          return p;
        })(),
      ]);

      // Encode and upload run concurrently: ffmpeg's stdout (fragmented MP4)
      // pipes straight into cloudinary's upload_stream. Previously these were
      // serial (ffmpeg → file → re-read → upload), which wasted ~30-60s of
      // wall-time on every collage. Now Cloudinary ingests bytes as fast as
      // ffmpeg emits them and the upload typically finishes within a couple
      // hundred ms of the encode.
      const ffStart = Date.now();
      // Output framerate is forced to 20fps (-r 20) — see runFfmpeg's args.
      const totalFrames = Math.max(1, Math.round(template.duration * 20));
      const { stdout: encodedStream, done: ffmpegDone } = runFfmpeg(
        template,
        templatePath,
        imagePaths,
        {
          logoPath,
          titlePath,
          onProgress: (frame) => {
            const ratio = Math.min(1, frame / totalFrames);
            // 15 → 95 in one phase since upload finishes shortly after encode
            // — no separate "uploading" plateau needed.
            setJobProgress(jobId, {
              phase: 'encoding',
              percent: 15 + ratio * 80,
              message: `מקודד ומעלה (${Math.round(ratio * 100)}%)...`,
            });
          },
        },
      );

      const uploadPromise = new Promise<{ secure_url: string; bytes: number }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          // Skip Cloudinary's eager transformations — output is already H.264/MP4.
          { resource_type: 'video', folder: 'yooz/collages', eager: [], eager_async: true },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string; bytes: number });
          },
        );
        encodedStream.pipe(stream);
        // If ffmpeg dies mid-encode, tear down the Cloudinary stream so the
        // partial upload aborts instead of hanging waiting for input that
        // will never arrive.
        encodedStream.on('error', (err) => stream.destroy(err));
      });

      const [, cloudResult] = await Promise.all([ffmpegDone, uploadPromise]);
      console.log(
        `[collage] ffmpeg+upload took ${Date.now() - ffStart}ms → ${(cloudResult.bytes / 1024 / 1024).toFixed(1)}MB`,
      );

      setJobProgress(jobId, {
        phase: 'done',
        percent: 100,
        message: 'הסרטון מוכן!',
      });

      res.json({ url: cloudResult.secure_url, isVideo: true });
    } catch (err) {
      console.error('[collage] generation error:', err);
      const msg = err instanceof Error ? err.message : 'Collage generation failed';
      setJobProgress(jobId, { phase: 'error', error: msg, message: 'שגיאה ביצירת הסרטון' });
      res.status(500).json({ error: msg });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  },
);

// ─── SMS-on-ready ─────────────────────────────────────────────────────────────
// Lambda updates CollageJob directly; the main server doesn't see that
// transition. Sweep finished jobs with a pending smsPhone and fire the SMS.

export async function sendCollageReadySms(jobId: string): Promise<void> {
  // Atomic claim — PM2 cluster mode runs 2+ workers, both sweep on the same
  // interval. Without this guard, both find the same un-sent job and the
  // participant gets the SMS twice. findOneAndUpdate is one round-trip and
  // returns null if another worker already claimed it.
  const claimed = await CollageJob.findOneAndUpdate(
    {
      jobId,
      phase: 'done',
      smsPhone: { $exists: true, $ne: '' },
      smsSentAt: { $exists: false },
      resultUrl: { $exists: true, $ne: '' },
    },
    { $set: { smsSentAt: new Date() } },
    { new: true },
  );
  if (!claimed || !claimed.smsPhone || !claimed.resultUrl) return;

  const activity = await Activity.findOne({ code: claimed.activityCode }).select('smsForCollageMessage').lean();
  const template = activity?.smsForCollageMessage?.trim() || 'הסרטון שלך מוכן! צפה והורד כאן: {link}';
  const message = template.includes('{link}')
    ? template.replace(/\{link\}/g, claimed.resultUrl)
    : `${template}\n${claimed.resultUrl}`;

  console.log(`[collage] SMS sending job=${jobId} to=${claimed.smsPhone}`);
  try {
    await getSmsProvider().send(claimed.smsPhone, message);
  } catch (err) {
    // smsSentAt is already set by the claim — at-most-once delivery; check
    // provider logs to see what actually went out.
    console.error(`[collage] SMS send failed for ${jobId}:`, err);
  }
}

export async function processPendingCollageSms(): Promise<void> {
  const pending = await CollageJob.find({
    phase: 'done',
    smsPhone: { $exists: true, $ne: '' },
    smsSentAt: { $exists: false },
    resultUrl: { $exists: true, $ne: '' },
  }).limit(50);
  for (const job of pending) {
    await sendCollageReadySms(job.jobId);
  }
}

export default router;
