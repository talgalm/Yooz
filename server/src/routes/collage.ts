
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
import { readLang } from '../utils/requestLang';
import { DEFAULT_LANG, languageOf } from '../utils/languages';
import { translateText } from '../services/contentTranslation';
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

interface MotionScene {
  index: number;
  startSec: number;
  endSec: number;
  panelW: number;
  panelH: number;
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
  logo: { color: string; similarity: number; blend: number; x: number; y: number; w: number; h: number } | null;
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
    startPad: 0.1,
    chroma: { color: '0x4FDE69', similarity: 0.10, blend: 0.0 },
    buffer: 30,
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
    chroma: { color: '0x4FDE69', similarity: 0.10, blend: 0.0 },
    buffer: 30,
    logo: null,
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
  opts: { logoIdx: number | null; logoRightIdx: number | null; titleIdx: number | null },
): string {
  const { width, height, chroma, startPad, buffer, logo, scenes } = template;
  const { logoIdx, logoRightIdx, titleIdx } = opts;
  const parts: string[] = [];

  parts.push(
    `[0:v]tpad=start_mode=clone:start_duration=${startPad},setpts=PTS-STARTPTS,fps=20,split=2[tmpl_bg][tmpl_fg]`,
  );
  parts.push(`[tmpl_bg]format=yuv420p[bg]`);

  scenes.forEach((sc, i) => {
    const w = sc.panelW + buffer * 2;
    const h = sc.panelH + buffer * 2;
    parts.push(`[${i + 1}:v]scale=${w}:${h},setsar=1[i${i}]`);
  });

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

  if (logoIdx !== null && logo) {
    parts.push(`[${logoIdx}:v]scale=${logo.w}:${logo.h}:force_original_aspect_ratio=decrease,pad=${logo.w}:${logo.h}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1[logo]`);
    parts.push(`[${prev}][logo]overlay=x=${logo.x}:y=${logo.y}[bgL]`);
    prev = 'bgL';
  }

  parts.push(`[${prev}]null[comp]`);

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

  parts.push(`[comp][fg]overlay=0:0:format=auto[withFg]`);
  let stacked = 'withFg';

  if (logoRightIdx !== null && logo) {
    const rx = width - logo.x - logo.w;
    parts.push(`[${logoRightIdx}:v]scale=${logo.w}:${logo.h}:force_original_aspect_ratio=decrease,pad=${logo.w}:${logo.h}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1[logoR]`);
    parts.push(`[${stacked}][logoR]overlay=x=${rx}:y=${logo.y}:format=auto[withLogoR]`);
    stacked = 'withLogoR';
  }

  if (titleIdx !== null) {
    parts.push(`[${titleIdx}:v]format=rgba,setsar=1[title]`);
    parts.push(`[${stacked}][title]overlay=x=(W-w)/2:y=40:format=auto[vraw]`);
  } else {
    parts.push(`[${stacked}]null[vraw]`);
  }

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

  parts.push(`[${scaleIn}]scale=540:-2[vout]`);

  void height;

  return parts.join(';');
}

export function runFfmpeg(
  template: TemplateMeta,
  templatePath: string,
  imagePaths: string[],
  extras: { logoPath?: string; logoRightPath?: string; titlePath?: string; onProgress?: (frame: number) => void },
): { stdout: Readable; done: Promise<void> } {
  const args: string[] = ['-y', '-progress', 'pipe:3', '-nostats', '-i', templatePath];
  for (const p of imagePaths) {
    args.push('-loop', '1', '-t', String(template.duration), '-i', p);
  }

  let nextIdx = 1 + imagePaths.length;
  let logoIdx: number | null = null;
  let logoRightIdx: number | null = null;
  let titleIdx: number | null = null;
  if (extras.logoPath && template.logo) {
    args.push('-loop', '1', '-t', String(template.duration), '-i', extras.logoPath);
    logoIdx = nextIdx++;
  }
  if (extras.logoRightPath && template.logo) {
    args.push('-loop', '1', '-t', String(template.duration), '-i', extras.logoRightPath);
    logoRightIdx = nextIdx++;
  }
  if (extras.titlePath) {
    args.push('-loop', '1', '-t', String(template.duration), '-i', extras.titlePath);
    titleIdx = nextIdx;
  }

  args.push(
    '-filter_complex', buildFilterComplex(template, { logoIdx, logoRightIdx, titleIdx }),
    '-map', '[vout]',
    '-map', '0:a?',
    '-t', String(template.duration),
    '-r', '20',
    '-threads', '0',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', '-crf', '28',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+empty_moov+frag_keyframe+default_base_moof',
    '-f', 'mp4',
    'pipe:1',
  );

  const proc = spawn(FFMPEG_BIN, args, { stdio: ['ignore', 'pipe', 'pipe', 'pipe'] });

  let progressBuf = '';
  const progressStream = proc.stdio[3] as Readable;
  progressStream.on('data', (chunk: Buffer) => {
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
  proc.stderr!.on('data', (chunk: Buffer) => { stderrBuf += chunk.toString(); });

  const done = new Promise<void>((resolve, reject) => {
    proc.on('close', (code, signal) => {
      if (code === 0) resolve();
      else {
        const sigStr = signal ? `, signal ${signal}` : '';
        console.error(`[collage] ffmpeg failed (code ${code}${sigStr}). stderr tail:\n${stderrBuf.slice(-2000)}`);
        reject(new Error(`ffmpeg exited with code ${code}${sigStr}.\n${stderrBuf.slice(-1500)}`));
      }
    });
    proc.on('error', (err) =>
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}. Make sure ffmpeg is installed (brew install ffmpeg).`)),
    );
  });

  return { stdout: proc.stdout!, done };
}

type JobPhase = 'preparing' | 'encoding' | 'uploading' | 'done' | 'error';
interface CollageJob {
  startedAt: number;
  updatedAt: number;
  phase: JobPhase;
  percent: number;
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

    const job = await CollageJob.findOne({ jobId });
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
    logoRightUrl,
    title,
    requiredImages: requiredImagesBody,
  } = req.body as {
    jobId?: string;
    activityCode?: string;
    template?: string;
    splitGroupId?: string;
    logoUrl?: string;
    logoRightUrl?: string;
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
    logoRightUrl,
    title,
    requiredImages,
    imageUrls: [],
    phase: 'collecting',
    percent: 0,
    message: 'אוסף תמונות...',
    isVideo: true,
    lang: readLang(req),
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

async function renderVideoSharePage(
  videoUrl: string,
  pageUrl: string,
  activityUrl: string,
  lang: string,
): Promise<string> {
  const posterUrl = videoUrl.includes('res.cloudinary.com') ? videoUrl.replace(/\.\w+$/, '.jpg') : '';
  const { locale, dir } = languageOf(lang);
  const [pageTitle, ogTitle, ogDescription, shareLabel, backLabel, preparingLabel] = await Promise.all([
    translateText('הסרטון שלכם', lang),
    translateText('הסרטון שלנו מהפעילות!', lang),
    translateText('לחצו לצפייה בסרטון', lang),
    translateText('שיתוף', lang),
    translateText('חזור לפעילות', lang),
    translateText('מכינים את הסרטון…', lang),
  ]);
  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDescription}">
${posterUrl ? `<meta property="og:image" content="${posterUrl}">` : ''}
<meta property="og:video" content="${videoUrl}">
<meta property="og:url" content="${pageUrl}">
<style>
  /* Everything fits one screen — no scrolling. 100dvh so the mobile address
     bar doesn't push the buttons off; the video flexes down to whatever is
     left after them. */
  body { margin: 0; font-family: system-ui, sans-serif; background: #f5f3ff; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; height: 100vh; height: 100dvh; box-sizing: border-box; overflow: hidden; }
  video { max-width: min(440px, 100%); flex: 1; min-height: 0; object-fit: contain; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,.15); }
  .btns { display: flex; gap: 12px; margin-top: 16px; width: min(440px, 100%); flex: none; }
  a, button { flex: 1; padding: 14px 0; border-radius: 10px; font-size: 16px; font-weight: 700; text-align: center; text-decoration: none; border: none; cursor: pointer; font-family: inherit; }
  #share { background: #6c5ce7; color: #fff; }
  #share:disabled { opacity: .6; cursor: wait; }
  #dl { background: #fff; color: #6c5ce7; border: 2px solid #6c5ce7; box-sizing: border-box; }
</style>
</head>
<body>
<video src="${videoUrl}" ${posterUrl ? `poster="${posterUrl}"` : ''} controls playsinline></video>
<div class="btns">
  <button id="share">${shareLabel}</button>
  <a id="dl" href="${activityUrl}">${backLabel}</a>
</div>
<script>
const shareBtn = document.getElementById('share');
shareBtn.onclick = async () => {
  shareBtn.disabled = true;
  const label = shareBtn.textContent;
  shareBtn.textContent = ${JSON.stringify(preparingLabel)};
  try {
    const blob = await fetch(${JSON.stringify(videoUrl)}).then((r) => r.blob());
    const file = new File([blob], 'video.mp4', { type: blob.type || 'video/mp4' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return;
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  finally { shareBtn.disabled = false; shareBtn.textContent = label; }
  try {
    if (navigator.share) { await navigator.share({ url: location.href }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  location.href = 'https://wa.me/?text=' + encodeURIComponent(location.href);
};
</script>
</body>
</html>`;
}

router.get('/share/:jobId', async (req: Request<{ jobId: string }>, res: Response) => {
  const job = await CollageJob.findOne({ jobId: req.params.jobId }).lean();
  if (!job?.resultUrl) {
    res.status(404).send('Video not found');
    return;
  }
  const base = (process.env.APP_URL || process.env.SITE_URL)?.replace(/\/$/, '')
    || `${req.protocol}://${req.get('host')}`;
  const lang = req.query.lang ? readLang(req) : (job.lang || readLang(req));
  res.send(await renderVideoSharePage(job.resultUrl, `${base}/api/collage/share/${job.jobId}`, `${base}/play/${job.activityCode}`, lang));
});

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

router.post(
  '/generate',
  upload.fields([
    { name: 'images', maxCount: MAX_FILES },
    { name: 'titleImage', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    const { activityCode, logoUrl, logoRightUrl, template: templateId, jobId } = req.body as {
      activityCode?: string;
      logoUrl?: string;
      logoRightUrl?: string;
      template?: string;
      jobId?: string;
    };

    if (!activityCode) {
      res.status(400).json({ error: 'activityCode is required' });
      return;
    }

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
      const sharpStart = Date.now();
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

      const fetchLogo = async (url: string | undefined, file: string): Promise<string | undefined> => {
        if (!(url && /^https?:\/\//i.test(url))) return undefined;
        const p = path.join(tmpDir, file);
        try {
          await downloadToFile(url, p);
          return p;
        } catch (e) {
          console.warn(`[collage] ${file} download failed, skipping:`, e);
          return undefined;
        }
      };
      const [logoPath, logoRightPath, titlePath] = await Promise.all([
        fetchLogo(logoUrl, 'logo.png'),
        fetchLogo(logoRightUrl, 'logo-right.png'),
        (async (): Promise<string | undefined> => {
          if (titleFiles.length === 0) return undefined;
          const p = path.join(tmpDir, 'title.png');
          fs.writeFileSync(p, titleFiles[0].buffer);
          return p;
        })(),
      ]);

      const ffStart = Date.now();
      const totalFrames = Math.max(1, Math.round(template.duration * 20));
      const { stdout: encodedStream, done: ffmpegDone } = runFfmpeg(
        template,
        templatePath,
        imagePaths,
        {
          logoPath,
          logoRightPath,
          titlePath,
          onProgress: (frame) => {
            const ratio = Math.min(1, frame / totalFrames);
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
          { resource_type: 'video', folder: 'yooz/collages', eager: [], eager_async: true },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string; bytes: number });
          },
        );
        encodedStream.pipe(stream);
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

export async function sendCollageReadySms(jobId: string): Promise<void> {
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

  const activity = await Activity.findOne({ code: claimed.activityCode }).select('smsForCollageMessage smsForCollageShare').lean();
  const rawTemplate = activity?.smsForCollageMessage?.trim() || 'הסרטון שלך מוכן! צפה והורד כאן: {link}';
  const lang = claimed.lang || DEFAULT_LANG;
  const template = await translateText(rawTemplate, lang);
  const base = (process.env.APP_URL || process.env.SITE_URL)?.replace(/\/$/, '') || 'http://localhost:3000';
  const link = activity?.smsForCollageShare
    ? `${base}/api/collage/share/${claimed.jobId}${lang === DEFAULT_LANG ? '' : `?lang=${lang}`}`
    : claimed.resultUrl;
  const message = template.includes('{link}')
    ? template.replace(/\{link\}/g, link)
    : `${template}\n${link}`;

  console.log(`[collage] SMS sending job=${jobId} to=${claimed.smsPhone}`);
  try {
    await getSmsProvider().send(claimed.smsPhone, message);
  } catch (err) {
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
