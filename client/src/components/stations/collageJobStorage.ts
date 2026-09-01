/**
 * IndexedDB persistence for collage encode jobs — survives tab reload.
 */

export interface PersistedCollageJob {
  jobId: string;
  activityCode: string;
  splitGroupId: string;
  status: 'collecting' | 'uploading' | 'processing' | 'done' | 'error';
  resultUrl?: string;
  isVideo?: boolean;
  error?: string;
  updatedAt: number;
}

export const DB_NAME = 'yooz_collage_jobs';
const STORE = 'jobs';
const DB_VERSION = 1;

function storageKey(activityCode: string, splitGroupId: string): string {
  return `${activityCode}::${splitGroupId}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePersistedCollageJob(job: PersistedCollageJob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ ...job, updatedAt: Date.now() }, storageKey(job.activityCode, job.splitGroupId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadPersistedCollageJob(
  activityCode: string,
  splitGroupId: string,
): Promise<PersistedCollageJob | null> {
  const db = await openDb();
  const result = await new Promise<PersistedCollageJob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(storageKey(activityCode, splitGroupId));
    req.onsuccess = () => resolve((req.result as PersistedCollageJob | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function clearPersistedCollageJob(activityCode: string, splitGroupId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(storageKey(activityCode, splitGroupId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
