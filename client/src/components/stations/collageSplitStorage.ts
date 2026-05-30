/**
 * IndexedDB persistence for split-collage stations.
 *
 * When a collage station is split into multiple parts, each part is played at a
 * different point in the activity. Photos captured in earlier parts must survive
 * across other stations (and even page reloads) so the last part can stitch them
 * all together into the final video.
 *
 * Storage key = `${activityCode}::${splitGroupId}`.
 */

export interface StoredCollagePart {
  partIndex: number;
  photos: { blob: Blob; isVideo?: boolean }[];
}

const DB_NAME = 'yooz_collage_split';
const STORE = 'parts';
const DB_VERSION = 1;

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

function makeKey(activityCode: string, splitGroupId: string): string {
  return `${activityCode}::${splitGroupId}`;
}

export async function saveCollagePart(
  activityCode: string,
  splitGroupId: string,
  part: StoredCollagePart,
): Promise<void> {
  const db = await openDb();
  // Append/replace this partIndex in the existing record.
  const existing = await new Promise<StoredCollagePart[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(makeKey(activityCode, splitGroupId));
    req.onsuccess = () => resolve((req.result as StoredCollagePart[] | undefined) ?? []);
    req.onerror = () => reject(req.error);
  });
  const next = existing.filter((p) => p.partIndex !== part.partIndex).concat(part)
    .sort((a, b) => a.partIndex - b.partIndex);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(next, makeKey(activityCode, splitGroupId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadCollageParts(
  activityCode: string,
  splitGroupId: string,
): Promise<StoredCollagePart[]> {
  const db = await openDb();
  const result = await new Promise<StoredCollagePart[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(makeKey(activityCode, splitGroupId));
    req.onsuccess = () => resolve((req.result as StoredCollagePart[] | undefined) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function clearCollageParts(
  activityCode: string,
  splitGroupId: string,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(makeKey(activityCode, splitGroupId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
