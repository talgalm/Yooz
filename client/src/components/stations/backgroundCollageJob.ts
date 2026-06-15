/**
 * Background collage upload + job tracking.
 *
 * The collage POST /api/collage/generate is long (5-60s upload + 2-3 min
 * server ffmpeg). When a station is split with a dedicated video part, the
 * client can start uploading the photos as soon as the last photo part is
 * captured — the XHR's lifetime is tied to this module, not the React
 * component, so it survives CollageStation unmounting while the user keeps
 * playing other stations.
 *
 * Heavy work is on the server. The phone uploads (~30MB) once, then idles on
 * the open HTTP connection. No worker thread, no main-thread blocking.
 */

export interface CollagePhoto {
  blob: Blob;
  isVideo?: boolean;
}

export interface CollageUploadParams {
  photos: CollagePhoto[];
  title: string;
  logoUrl: string;
  activityCode: string;
  template: string;
  jobId: string;
}

export interface CollageResult {
  url: string;
  isVideo: boolean;
}

// ─── Title PNG ─────────────────────────────────────────────────────────────
//
// Renders the user-entered title as a transparent PNG that the server overlays
// on the final video. White fill + thin black stroke, matching the look of
// station titles. Returns null for empty/whitespace titles so the server
// composites without a title overlay.

function renderTitlePng(title: string): Blob | null {
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

// ─── Upload ────────────────────────────────────────────────────────────────
//
// Fires the actual XHR. Caller receives a promise that resolves with the
// result URL. The caller is responsible for showing upload progress via
// onUploadProgress (0..60 — upload phase only; server progress is polled
// separately via /api/collage/progress/:jobId).

export function doCollageUpload(
  params: CollageUploadParams,
  onUploadProgress: (pct: number) => void,
): Promise<CollageResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('activityCode', params.activityCode);
    formData.append('title', params.title);
    formData.append('template', params.template);
    formData.append('jobId', params.jobId);
    if (params.logoUrl) formData.append('logoUrl', params.logoUrl);
    const titlePng = renderTitlePng(params.title);
    if (titlePng) formData.append('titleImage', titlePng, 'title.png');
    params.photos.forEach((p, i) => {
      const ext = p.blob.type.includes('png') ? 'png' : 'jpg';
      formData.append('images', p.blob, `photo_${i}.${ext}`);
    });

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onUploadProgress(Math.round((e.loaded / e.total) * 60));
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { url: string; isVideo?: boolean };
          resolve({ url: data.url, isVideo: data.isVideo ?? false });
        } catch {
          reject(new Error('Invalid server response'));
        }
      } else {
        let msg = 'Server error';
        try { msg = (JSON.parse(xhr.responseText) as { error: string }).error || msg; } catch { /* */ }
        reject(new Error(msg));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.open('POST', '/api/collage/generate');
    xhr.send(formData);
  });
}

// ─── Background job singleton ──────────────────────────────────────────────
//
// Keyed by `${activityCode}::${splitGroupId}`. At most one in-flight upload
// per key. The XHR keeps running while the React component is unmounted; when
// the video-part station mounts, it reads the current state and attaches.

type JobStatus = 'pending' | 'done' | 'error';

export interface BackgroundJob {
  status: JobStatus;
  jobId: string;
  uploadPct: number;            // 0..60 from XHR upload-progress; 100 on done
  result?: CollageResult;
  error?: string;
  promise: Promise<CollageResult>;
}

interface InternalJob extends BackgroundJob {
  subscribers: Set<(j: BackgroundJob) => void>;
}

const jobs = new Map<string, InternalJob>();

function snapshot(j: InternalJob): BackgroundJob {
  return {
    status: j.status,
    jobId: j.jobId,
    uploadPct: j.uploadPct,
    result: j.result,
    error: j.error,
    promise: j.promise,
  };
}

function notify(key: string): void {
  const j = jobs.get(key);
  if (!j) return;
  const snap = snapshot(j);
  for (const cb of j.subscribers) {
    try { cb(snap); } catch { /* ignore subscriber errors */ }
  }
}

/**
 * Start an upload at module scope. Idempotent — if a pending/done job for
 * this key already exists, the existing job is returned and no new XHR is
 * fired. An errored entry is replaced.
 */
export function startBackgroundCollage(
  key: string,
  params: CollageUploadParams,
): BackgroundJob {
  const existing = jobs.get(key);
  if (existing && existing.status !== 'error') return snapshot(existing);

  // The promise is assigned synchronously below; this placeholder satisfies
  // the type and is immediately overwritten before any caller can read it.
  const entry: InternalJob = {
    status: 'pending',
    jobId: params.jobId,
    uploadPct: 0,
    subscribers: new Set(),
    promise: Promise.resolve() as unknown as Promise<CollageResult>,
  };
  jobs.set(key, entry);

  entry.promise = doCollageUpload(params, (pct) => {
    const j = jobs.get(key);
    if (!j) return;
    j.uploadPct = Math.max(j.uploadPct, pct);
    notify(key);
  }).then(
    (result) => {
      const j = jobs.get(key);
      if (j) {
        j.status = 'done';
        j.result = result;
        j.uploadPct = 100;
        notify(key);
      }
      return result;
    },
    (err: Error) => {
      const j = jobs.get(key);
      if (j) {
        j.status = 'error';
        j.error = err.message;
        notify(key);
      }
      throw err;
    },
  );

  return snapshot(entry);
}

export function getBackgroundCollage(key: string): BackgroundJob | undefined {
  const j = jobs.get(key);
  return j ? snapshot(j) : undefined;
}

export function subscribeBackgroundCollage(
  key: string,
  cb: (j: BackgroundJob) => void,
): () => void {
  const j = jobs.get(key);
  if (!j) return () => {};
  j.subscribers.add(cb);
  return () => {
    const cur = jobs.get(key);
    if (cur) cur.subscribers.delete(cb);
  };
}

/** Drop the entry. Call after the result has been displayed/consumed. */
export function consumeBackgroundCollage(key: string): void {
  jobs.delete(key);
}
