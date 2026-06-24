import { apiFetchWithRetry } from './api';
import { compressPhotoForCollage } from './collagePhotoCompress';

export interface CollageJobRecord {
  jobId: string;
  activityCode: string;
  splitGroupId?: string;
  template: string;
  phase: string;
  percent: number;
  message: string;
  error?: string;
  resultUrl?: string;
  isVideo?: boolean;
  requiredImages: number;
  uploadedImages: number;
  imageUrls?: string[];
  title?: string;
}

export interface CollageJobParams {
  activityCode: string;
  jobId: string;
  template: string;
  splitGroupId?: string;
  logoUrl?: string;
  requiredImages: number;
  title?: string;
}

const RETRY_ATTEMPTS = 5;
const RETRY_BASE_MS = 1500;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < RETRY_ATTEMPTS; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < RETRY_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, RETRY_BASE_MS * (i + 1)));
      }
    }
  }
  throw lastErr;
}

export function makeSplitCollageJobId(activityCode: string, splitGroupId: string): string {
  const safe = `${activityCode}_${splitGroupId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 72);
  return `j_${safe}`;
}

export async function ensureCollageJob(params: CollageJobParams): Promise<CollageJobRecord> {
  return apiFetchWithRetry<CollageJobRecord>('/api/collage/jobs', {
    method: 'POST',
    body: JSON.stringify({
      jobId: params.jobId,
      activityCode: params.activityCode,
      template: params.template,
      splitGroupId: params.splitGroupId,
      logoUrl: params.logoUrl,
      title: params.title,
      requiredImages: params.requiredImages,
    }),
  });
}

export async function fetchCollageJob(jobId: string): Promise<CollageJobRecord> {
  return apiFetchWithRetry<CollageJobRecord>(`/api/collage/jobs/${encodeURIComponent(jobId)}`);
}

export async function findCollageJob(
  activityCode: string,
  splitGroupId: string,
): Promise<CollageJobRecord | null> {
  try {
    return await apiFetchWithRetry<CollageJobRecord>(
      `/api/collage/jobs?activityCode=${encodeURIComponent(activityCode)}&splitGroupId=${encodeURIComponent(splitGroupId)}`,
    );
  } catch {
    return null;
  }
}

interface SignResp {
  cloudName: string; apiKey: string; timestamp: number;
  signature: string; folder: string; publicId: string;
}

// Direct-to-Cloudinary upload. Server only signs (cheap), then we POST the
// file straight to api.cloudinary.com. Removes upload bandwidth from our box
// — the bottleneck that capped concurrency at ~25 in the load test.
// Falls back to the legacy server-streamed endpoint if signing fails.
export async function uploadCollagePhoto(
  activityCode: string,
  jobId: string,
  imageIndex: number,
  blob: Blob,
): Promise<string> {
  const compressed = await compressPhotoForCollage(blob);
  return withRetry(async () => {
    const signRes = await apiFetchWithRetry<SignResp>('/api/collage/upload-sign', {
      method: 'POST',
      body: JSON.stringify({ activityCode, jobId, imageIndex }),
    }).catch(() => null);

    if (signRes) {
      const fd = new FormData();
      fd.append('file', compressed, `photo_${imageIndex}.jpg`);
      fd.append('api_key', signRes.apiKey);
      fd.append('timestamp', String(signRes.timestamp));
      fd.append('signature', signRes.signature);
      fd.append('folder', signRes.folder);
      fd.append('public_id', signRes.publicId);
      // ponytail: 45s upload timeout — native fetch hangs forever on stalled 4G otherwise.
      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signRes.cloudName}/image/upload`,
        { method: 'POST', body: fd, signal: AbortSignal.timeout(45_000) },
      );
      if (!cloudRes.ok) throw new Error(`Cloudinary upload failed (${cloudRes.status})`);
      const cloudData = (await cloudRes.json()) as { secure_url: string };
      const url = cloudData.secure_url;

      await apiFetchWithRetry('/api/collage/photo-uploaded', {
        method: 'POST',
        body: JSON.stringify({ activityCode, jobId, imageIndex, url }),
      });
      return url;
    }

    // Fallback: legacy server-streamed upload (used if /upload-sign isn't
    // deployed yet, e.g. mid-rollout).
    const formData = new FormData();
    formData.append('activityCode', activityCode);
    formData.append('jobId', jobId);
    formData.append('imageIndex', String(imageIndex));
    formData.append('file', compressed, `photo_${imageIndex}.jpg`);
    const res = await fetch('/api/collage/upload-photo', {
      method: 'POST', body: formData, signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    const data = (await res.json()) as { url: string };
    return data.url;
  });
}

export function renderTitlePng(title: string): Blob | null {
  const trimmed = title.trim();
  if (!trimmed) return null;
  const fontSize = 96;
  const padX = 32;
  const padY = 24;
  const strokeW = 6;
  const fontStack = '900 96px system-ui, "Segoe UI", "Heebo", "Rubik", Arial, sans-serif';

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d')!;
  measureCtx.font = fontStack;
  const metrics = measureCtx.measureText(trimmed);
  const textW = Math.ceil(metrics.width);
  const textH = Math.ceil(fontSize * 1.25);

  const w = textW + padX * 2;
  const h = textH + padY * 2;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.font = fontStack;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = strokeW;
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#fff';
  const cx = w / 2;
  const cy = h / 2;
  ctx.strokeText(trimmed, cx, cy);
  ctx.fillText(trimmed, cx, cy);

  const dataUrl = canvas.toDataURL('image/png');
  const bytes = atob(dataUrl.split(',')[1]);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return new Blob([buf], { type: 'image/png' });
}

export async function uploadCollageTitleImage(
  activityCode: string,
  jobId: string,
  title: string,
): Promise<void> {
  const png = renderTitlePng(title);
  if (!png) return;
  await withRetry(async () => {
    const formData = new FormData();
    formData.append('activityCode', activityCode);
    formData.append('jobId', jobId);
    formData.append('file', png, 'title.png');
    const res = await fetch('/api/collage/upload-title', {
      method: 'POST', body: formData, signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
  });
}

export async function startCollageJob(jobId: string, title?: string): Promise<CollageJobRecord> {
  return apiFetchWithRetry<CollageJobRecord>(`/api/collage/jobs/${encodeURIComponent(jobId)}/start`, {
    method: 'POST',
    body: JSON.stringify({ title: title?.trim() || undefined }),
  });
}

export async function retryCollageJob(jobId: string): Promise<CollageJobRecord> {
  return apiFetchWithRetry<CollageJobRecord>(`/api/collage/jobs/${encodeURIComponent(jobId)}/retry`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export interface CollageProgressSnapshot {
  phase: string;
  percent: number;
  message: string;
  etaSeconds: number | null;
  error?: string;
  resultUrl?: string;
  isVideo?: boolean;
}

export async function fetchCollageProgress(jobId: string): Promise<CollageProgressSnapshot> {
  // ponytail: 8s — poll runs every 1s, must not stack pending requests on a stalled network.
  const res = await fetch(`/api/collage/progress/${encodeURIComponent(jobId)}`, {
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error('Progress unavailable');
  return res.json() as Promise<CollageProgressSnapshot>;
}

export async function uploadCollagePhotosParallel(
  activityCode: string,
  jobId: string,
  items: { index: number; blob: Blob }[],
  onProgress?: (uploaded: number, total: number) => void,
  concurrency = 3,
): Promise<void> {
  let done = 0;
  const queue = [...items];
  // ponytail: 5min wall-clock cap. Each in-flight photo still has its own 45s ×
  // 5-retry budget, so worst-case overrun ≈ one stuck photo finishing after the
  // deadline (~4min). Without this the parallel call could hang for ~22min.
  const deadline = Date.now() + 5 * 60_000;
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      if (Date.now() > deadline) throw new Error('Upload timed out — connection too slow');
      const item = queue.shift();
      if (!item) break;
      await uploadCollagePhoto(activityCode, jobId, item.index, item.blob);
      done += 1;
      onProgress?.(done, items.length);
    }
  });
  await Promise.all(workers);
}

export function waitForCollageCompletion(
  jobId: string,
  onProgress: (snap: CollageProgressSnapshot) => void,
  intervalMs = 1000,
): Promise<{ url: string; isVideo: boolean }> {
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const snap = await fetchCollageProgress(jobId);
        onProgress(snap);
        if (snap.phase === 'done' && snap.resultUrl) {
          clearInterval(handle);
          resolve({ url: snap.resultUrl, isVideo: snap.isVideo ?? true });
          return;
        }
        if (snap.phase === 'error') {
          clearInterval(handle);
          reject(new Error(snap.error || 'Collage failed'));
        }
      } catch {
        /* retry on next tick */
      }
    };
    void tick();
    const handle = setInterval(() => { void tick(); }, intervalMs);
  });
}
