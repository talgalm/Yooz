
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { CollageJob } from '../models/CollageJob';
import { TEMPLATES, DEFAULT_TEMPLATE_ID, runFfmpeg } from '../routes/collage';
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  MONGODB_URI,
} from '../config';

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

let mongoReady: Promise<void> | null = null;
async function ensureMongo(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (!mongoReady) {
    mongoReady = mongoose
      .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
      .then(() => undefined)
      .catch((e) => {
        mongoReady = null;
        throw e;
      });
  }
  await mongoReady;
}

async function patchJob(
  jobId: string,
  patch: {
    phase?: string;
    percent?: number;
    message?: string;
    error?: string;
    resultUrl?: string;
    isVideo?: boolean;
  },
): Promise<void> {
  const job = await CollageJob.findOne({ jobId });
  if (!job) return;
  if (job.phase === 'done' || job.phase === 'error') return;
  if (patch.percent !== undefined) job.percent = Math.max(job.percent, patch.percent);
  if (patch.phase !== undefined) job.phase = patch.phase as typeof job.phase;
  if (patch.message !== undefined) job.message = patch.message;
  if (patch.error !== undefined) job.error = patch.error;
  if (patch.resultUrl !== undefined) job.resultUrl = patch.resultUrl;
  if (patch.isVideo !== undefined) job.isVideo = patch.isVideo;
  await job.save();
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

export async function handler(event: { jobId?: string }): Promise<{ ok: boolean; jobId?: string }> {
  const jobId = event?.jobId;
  if (!jobId) throw new Error('jobId required');

  console.log(`[lambda-collage] start job=${jobId}`);
  await ensureMongo();

  const job = await CollageJob.findOne({ jobId });
  if (!job) return { ok: false, jobId };
  if (job.phase === 'done' && job.resultUrl) return { ok: true, jobId };

  const templateId = job.template && TEMPLATES[job.template] ? job.template : DEFAULT_TEMPLATE_ID;
  const template = TEMPLATES[templateId];
  const orderedUrls = Array.from({ length: job.requiredImages }, (_, i) => job.imageUrls[i] || '');
  if (orderedUrls.some((u) => !u)) {
    await patchJob(jobId, { phase: 'error', error: 'Missing photo uploads', message: 'שגיאה — חסרות תמונות' });
    return { ok: false, jobId };
  }

  const templatePath = path.join(process.cwd(), 'assets', template.videoFile);
  if (!fs.existsSync(templatePath)) {
    await patchJob(jobId, { phase: 'error', error: `Template missing: ${template.videoFile}`, message: 'שגיאת שרת' });
    return { ok: false, jobId };
  }

  const tmpDir = path.join('/tmp', `collage_${jobId}_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    console.log(`[lambda-collage] preparing job=${jobId} images=${orderedUrls.length} template=${templateId}`);
    await patchJob(jobId, { phase: 'preparing', percent: 5, message: 'מכין תמונות...' });

    const imagePaths = await Promise.all(
      orderedUrls.map(async (url, i) => {
        const dest = path.join(tmpDir, `image_${i}.jpg`);
        const raw = path.join(tmpDir, `raw_${i}`);
        await downloadToFile(url, raw);
        try {
          const resized = await sharp(raw, { failOn: 'none' })
            .rotate()
            .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85, mozjpeg: true })
            .toBuffer();
          fs.writeFileSync(dest, resized);
        } catch {
          fs.copyFileSync(raw, dest);
        }
        try { fs.unlinkSync(raw); } catch { }
        return dest;
      }),
    );

    console.log(`[lambda-collage] encoding job=${jobId}`);
    await patchJob(jobId, { phase: 'encoding', percent: 15, message: 'מתחיל קידוד וידאו...' });

    const fetchLogo = async (url: string | undefined, file: string): Promise<string | undefined> => {
      if (!(url && /^https?:\/\//i.test(url))) return undefined;
      const p = path.join(tmpDir, file);
      try { await downloadToFile(url, p); return p; } catch { return undefined; }
    };
    const [logoPath, logoRightPath, titlePath] = await Promise.all([
      fetchLogo(job.logoUrl, 'logo.png'),
      fetchLogo(job.logoRightUrl, 'logo-right.png'),
      (async (): Promise<string | undefined> => {
        if (!(job.titleImageUrl && /^https?:\/\//i.test(job.titleImageUrl))) return undefined;
        const p = path.join(tmpDir, 'title.png');
        try { await downloadToFile(job.titleImageUrl, p); return p; } catch { return undefined; }
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
          void patchJob(jobId, {
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
      `[lambda-collage] job ${jobId} ffmpeg+upload ${Date.now() - ffStart}ms → ${(cloudResult.bytes / 1024 / 1024).toFixed(1)}MB`,
    );

    await patchJob(jobId, {
      phase: 'done',
      percent: 100,
      message: 'הסרטון מוכן!',
      resultUrl: cloudResult.secure_url,
      isVideo: true,
    });
    const finalJob = await CollageJob.findOne({ jobId }).select('smsPhone').lean();
    if (finalJob?.smsPhone) {
      console.log(`[lambda-collage] done job=${jobId} → SMS will be sent to ${finalJob.smsPhone}`);
    } else {
      console.log(`[lambda-collage] done job=${jobId}`);
    }
    return { ok: true, jobId };
  } catch (err) {
    console.error(`[lambda-collage] job ${jobId} error:`, err);
    const msg = err instanceof Error ? err.message : 'Collage generation failed';
    await patchJob(jobId, { phase: 'error', error: msg, message: 'שגיאה ביצירת הסרטון' });
    return { ok: false, jobId };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { }
  }
}
