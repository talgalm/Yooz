import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { CollageJob, type ICollageJob } from '../models/CollageJob';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '../config';
import { TEMPLATES, DEFAULT_TEMPLATE_ID, runFfmpeg, type TemplateMeta } from '../routes/collage';

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const inFlight = new Set<string>();

export async function updateCollageJobProgress(
  jobId: string,
  patch: Partial<Pick<ICollageJob, 'phase' | 'percent' | 'message' | 'error' | 'resultUrl' | 'isVideo'>>,
): Promise<void> {
  const job = await CollageJob.findOne({ jobId });
  if (!job) return;
  // Terminal phases (done/error) are sticky — late ffmpeg progress callbacks
  // would otherwise resurrect the job from 'error' back to 'encoding', leaving
  // clients polling forever.
  if (job.phase === 'done' || job.phase === 'error') return;
  if (patch.percent !== undefined) {
    job.percent = Math.max(job.percent, patch.percent);
  }
  if (patch.phase !== undefined) job.phase = patch.phase;
  if (patch.message !== undefined) job.message = patch.message;
  if (patch.error !== undefined) job.error = patch.error;
  if (patch.resultUrl !== undefined) job.resultUrl = patch.resultUrl;
  if (patch.isVideo !== undefined) job.isVideo = patch.isVideo;
  await job.save();
}

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download asset (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

async function prepareImageInputs(
  tmpDir: string,
  sources: string[],
): Promise<string[]> {
  return Promise.all(
    sources.map(async (src, i) => {
      const filePath = path.join(tmpDir, `image_${i}.jpg`);
      if (/^https?:\/\//i.test(src)) {
        const rawPath = path.join(tmpDir, `raw_${i}`);
        await downloadToFile(src, rawPath);
        try {
          const resized = await sharp(rawPath, { failOn: 'none' })
            .rotate()
            .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85, mozjpeg: true })
            .toBuffer();
          fs.writeFileSync(filePath, resized);
        } catch {
          fs.copyFileSync(rawPath, filePath);
        }
        try { fs.unlinkSync(rawPath); } catch { /* ignore */ }
      } else {
        fs.copyFileSync(src, filePath);
      }
      return filePath;
    }),
  );
}

export async function runCollageEncode(jobId: string): Promise<void> {
  if (inFlight.has(jobId)) return;
  inFlight.add(jobId);

  const job = await CollageJob.findOne({ jobId });
  if (!job) {
    inFlight.delete(jobId);
    return;
  }

  if (job.phase === 'done' && job.resultUrl) {
    inFlight.delete(jobId);
    return;
  }

  const templateId = job.template && TEMPLATES[job.template] ? job.template : DEFAULT_TEMPLATE_ID;
  const template = TEMPLATES[templateId];
  const orderedUrls = Array.from({ length: job.requiredImages }, (_, i) => job.imageUrls[i] || '');
  if (orderedUrls.some((u) => !u)) {
    await updateCollageJobProgress(jobId, {
      phase: 'error',
      error: 'Missing photo uploads',
      message: 'שגיאה — חסרות תמונות',
    });
    inFlight.delete(jobId);
    return;
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    await updateCollageJobProgress(jobId, {
      phase: 'error',
      error: 'Cloudinary not configured',
      message: 'שגיאת שרת',
    });
    inFlight.delete(jobId);
    return;
  }

  const templatePath = path.join(process.cwd(), 'assets', template.videoFile);
  if (!fs.existsSync(templatePath)) {
    await updateCollageJobProgress(jobId, {
      phase: 'error',
      error: `Template not found: ${template.videoFile}`,
      message: 'שגיאת שרת',
    });
    inFlight.delete(jobId);
    return;
  }

  const sessionId = `collage_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tmpDir = path.join(os.tmpdir(), sessionId);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    await updateCollageJobProgress(jobId, {
      phase: 'preparing',
      percent: 5,
      message: 'מכין תמונות...',
    });

    const imagePaths = await prepareImageInputs(tmpDir, orderedUrls);

    await updateCollageJobProgress(jobId, {
      phase: 'encoding',
      percent: 15,
      message: 'מתחיל קידוד וידאו...',
    });

    const [logoPath, titlePath] = await Promise.all([
      (async (): Promise<string | undefined> => {
        if (!(job.logoUrl && /^https?:\/\//i.test(job.logoUrl))) return undefined;
        const p = path.join(tmpDir, 'logo.png');
        try {
          await downloadToFile(job.logoUrl, p);
          return p;
        } catch {
          return undefined;
        }
      })(),
      (async (): Promise<string | undefined> => {
        if (!(job.titleImageUrl && /^https?:\/\//i.test(job.titleImageUrl))) return undefined;
        const p = path.join(tmpDir, 'title.png');
        try {
          await downloadToFile(job.titleImageUrl, p);
          return p;
        } catch {
          return undefined;
        }
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
        titlePath,
        onProgress: (frame) => {
          const ratio = Math.min(1, frame / totalFrames);
          void updateCollageJobProgress(jobId, {
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
      `[collage] job ${jobId} ffmpeg+upload ${Date.now() - ffStart}ms → ${(cloudResult.bytes / 1024 / 1024).toFixed(1)}MB`,
    );

    await updateCollageJobProgress(jobId, {
      phase: 'done',
      percent: 100,
      message: 'הסרטון מוכן!',
      resultUrl: cloudResult.secure_url,
      isVideo: true,
    });
  } catch (err) {
    console.error(`[collage] job ${jobId} error:`, err);
    const msg = err instanceof Error ? err.message : 'Collage generation failed';
    await updateCollageJobProgress(jobId, {
      phase: 'error',
      error: msg,
      message: 'שגיאה ביצירת הסרטון',
    });
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    inFlight.delete(jobId);
  }
}

export function scheduleCollageEncode(jobId: string): void {
  void runCollageEncode(jobId);
}

export function resolveTemplate(templateId: string | undefined): TemplateMeta {
  const id = templateId && TEMPLATES[templateId] ? templateId : DEFAULT_TEMPLATE_ID;
  return TEMPLATES[id];
}

export function requiredImageCount(templateId: string | undefined): number {
  return resolveTemplate(templateId).scenes.length;
}
