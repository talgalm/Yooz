
import {
  ensureCollageJob,
  fetchCollageJob,
  findCollageJob,
  makeSplitCollageJobId,
  startCollageJob,
  uploadCollagePhotosParallel,
  uploadCollageTitleImage,
  waitForCollageCompletion,
  type CollageJobParams,
  type CollageProgressSnapshot,
} from '../../utils/collageApi';
import {
  clearPersistedCollageJob,
  loadPersistedCollageJob,
  savePersistedCollageJob,
} from './collageJobStorage';

export interface CollagePhoto {
  blob: Blob;
  isVideo?: boolean;
  cloudinaryUrl?: string;
}

export interface CollageResult {
  url: string;
  isVideo: boolean;
}

export interface CollageUploadParams {
  photos: CollagePhoto[];
  photoIndices: number[];
  title: string;
  logoUrl: string;
  logoRightUrl: string;
  activityCode: string;
  template: string;
  splitGroupId?: string;
  jobId: string;
  requiredImages: number;
}

export interface BackgroundJob {
  status: 'pending' | 'done' | 'error';
  jobId: string;
  uploadPct: number;
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
    try { cb(snap); } catch { }
  }
}

function mapServerPercentToClient(snap: CollageProgressSnapshot, uploadDone: boolean): number {
  if (!uploadDone) return Math.min(55, snap.percent);
  return Math.min(99, Math.round(55 + snap.percent * 0.45));
}

async function runAsyncCollageJob(
  key: string,
  params: CollageUploadParams,
  opts?: { skipPhotoUpload?: boolean },
): Promise<CollageResult> {
  const splitGroupId = params.splitGroupId || 'default';
  const persistKey = { activityCode: params.activityCode, splitGroupId };

  await savePersistedCollageJob({
    jobId: params.jobId,
    ...persistKey,
    status: 'uploading',
    updatedAt: Date.now(),
  });

  const jobParams: CollageJobParams = {
    activityCode: params.activityCode,
    jobId: params.jobId,
    template: params.template,
    splitGroupId: params.splitGroupId,
    logoUrl: params.logoUrl,
    logoRightUrl: params.logoRightUrl,
    requiredImages: params.requiredImages,
    title: params.title,
  };

  await ensureCollageJob(jobParams);

  const entry = jobs.get(key);
  const setUploadPct = (pct: number) => {
    const j = jobs.get(key);
    if (j) {
      j.uploadPct = Math.max(j.uploadPct, pct);
      notify(key);
    }
  };

  if (!opts?.skipPhotoUpload) {
    const toUpload = params.photos
      .map((p, i) => ({ photo: p, index: params.photoIndices[i] }))
      .filter((x) => !x.photo.cloudinaryUrl);

    if (toUpload.length > 0) {
      setUploadPct(5);
      await uploadCollagePhotosParallel(
        params.activityCode,
        params.jobId,
        toUpload.map((x) => ({ index: x.index, blob: x.photo.blob })),
        (uploaded, total) => setUploadPct(Math.round(5 + (uploaded / total) * 50)),
      );
    }
    setUploadPct(55);
  }

  if (params.title.trim()) {
    await uploadCollageTitleImage(params.activityCode, params.jobId, params.title);
  }

  await startCollageJob(params.jobId, params.title);

  await savePersistedCollageJob({
    jobId: params.jobId,
    ...persistKey,
    status: 'processing',
    updatedAt: Date.now(),
  });

  const result = await waitForCollageCompletion(params.jobId, (snap) => {
    setUploadPct(mapServerPercentToClient(snap, true));
    const j = jobs.get(key);
    if (j && entry) {
      entry.uploadPct = mapServerPercentToClient(snap, true);
      notify(key);
    }
  });

  await savePersistedCollageJob({
    jobId: params.jobId,
    ...persistKey,
    status: 'done',
    resultUrl: result.url,
    isVideo: result.isVideo,
    updatedAt: Date.now(),
  });

  return result;
}

export function uploadSplitPhotosInBackground(
  activityCode: string,
  splitGroupId: string,
  items: { globalIndex: number; blob: Blob; cloudinaryUrl?: string }[],
  jobParams: Omit<CollageJobParams, 'activityCode' | 'jobId' | 'splitGroupId'>,
  effectiveTitle?: string,
): void {
  const jobId = makeSplitCollageJobId(activityCode, splitGroupId);
  void (async () => {
    try {
      await ensureCollageJob({
        activityCode,
        jobId,
        splitGroupId,
        ...jobParams,
      });
      const pending = items.filter((i) => !i.cloudinaryUrl);
      if (pending.length > 0) {
        await uploadCollagePhotosParallel(
          activityCode,
          jobId,
          pending.map((i) => ({ index: i.globalIndex, blob: i.blob })),
        );
      }
      await savePersistedCollageJob({
        jobId,
        activityCode,
        splitGroupId,
        status: 'collecting',
        updatedAt: Date.now(),
      });

      const job = await fetchCollageJob(jobId);
      const uploaded = (job.imageUrls || []).filter(Boolean).length;
      if (uploaded >= jobParams.requiredImages && job.phase === 'collecting') {
        if (effectiveTitle?.trim()) {
          await uploadCollageTitleImage(activityCode, jobId, effectiveTitle).catch(() => {});
        }
        await startCollageJob(jobId, effectiveTitle).catch(() => {});
      }
    } catch {
    }
  })();
}

export function startBackgroundCollage(key: string, params: CollageUploadParams): BackgroundJob {
  const existing = jobs.get(key);
  if (existing && existing.status !== 'error') return snapshot(existing);

  const entry: InternalJob = {
    status: 'pending',
    jobId: params.jobId,
    uploadPct: 0,
    subscribers: new Set(),
    promise: Promise.resolve() as unknown as Promise<CollageResult>,
  };
  jobs.set(key, entry);

  entry.promise = runAsyncCollageJob(key, params).then(
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
      void savePersistedCollageJob({
        jobId: params.jobId,
        activityCode: params.activityCode,
        splitGroupId: params.splitGroupId || 'default',
        status: 'error',
        error: err.message,
        updatedAt: Date.now(),
      });
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

export function consumeBackgroundCollage(key: string): void {
  jobs.delete(key);
}

export async function getCompletedCollageResult(
  activityCode: string,
  splitGroupId: string,
): Promise<CollageResult | null> {
  const persisted = await loadPersistedCollageJob(activityCode, splitGroupId);
  const serverJob = await findCollageJob(activityCode, splitGroupId);

  if (serverJob?.phase === 'done' && serverJob.resultUrl) {
    return { url: serverJob.resultUrl, isVideo: serverJob.isVideo ?? true };
  }
  if (persisted?.status === 'done' && persisted.resultUrl) {
    return { url: persisted.resultUrl, isVideo: persisted.isVideo ?? true };
  }
  return null;
}

export async function waitForServerCollageJob(
  jobId: string,
  onProgress: (snap: CollageProgressSnapshot) => void,
): Promise<CollageResult> {
  return waitForCollageCompletion(jobId, onProgress);
}

export { makeSplitCollageJobId, findCollageJob };

export async function cleanupCollageJobPersistence(
  activityCode: string,
  splitGroupId: string,
): Promise<void> {
  await clearPersistedCollageJob(activityCode, splitGroupId);
}
