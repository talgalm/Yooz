// Lambda entrypoint for collage ffmpeg encoding.
//
// Invoked async by the API server with { jobId }. Pulls the job from Mongo,
// downloads photos from Cloudinary, runs ffmpeg, streams the result back to
// Cloudinary, and updates the same Mongo job document throughout.
//
// ponytail: reuses runFfmpeg+TEMPLATES from routes/collage.ts so encoder
//           parameters stay in one place. Add a separate ffmpeg module if the
//           route file ever becomes hard to import here.

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

// Lambda freezes the container between invocations. Keep the Mongo connection
// alive across warm invocations so we don't pay the ~300ms handshake every call.
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
  // Terminal phases are sticky — late progress callbacks would otherwise
  // resurrect a failed job.
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

  // Templates are baked into the container image at /var/task/assets.
  const templatePath = path.join(process.cwd(), 'assets', template.videoFile);
  if (!fs.existsSync(templatePath)) {
    await patchJob(jobId, { phase: 'error', error: `Template missing: ${template.videoFile}`, message: 'שגיאת שרת' });
    return { ok: false, jobId };
  }

  // /tmp is the only writable path on Lambda (10GB).
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
        try { fs.unlinkSync(raw); } catch { /* ignore */ }
        return dest;
      }),
    );

    console.log(`[lambda-collage] encoding job=${jobId}`);
    await patchJob(jobId, { phase: 'encoding', percent: 15, message: 'מתחיל קידוד וידאו...' });

    const [logoPath, titlePath] = await Promise.all([
      (async (): Promise<string | undefined> => {
        if (!(job.logoUrl && /^https?:\/\//i.test(job.logoUrl))) return undefined;
        const p = path.join(tmpDir, 'logo.png');
        try { await downloadToFile(job.logoUrl, p); return p; } catch { return undefined; }
      })(),
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
    // Re-read so we catch a smsPhone that the participant set mid-encode.
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
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}
