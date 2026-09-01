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

import { DB_NAME as JOBS_DB_NAME } from './collageJobStorage';

export interface StoredCollagePart {
  partIndex: number;
  photos: { blob: Blob; isVideo?: boolean; cloudinaryUrl?: string }[];
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
  return result.sort((a, b) => a.partIndex - b.partIndex);
}

// ponytail: sessionStorage flag — once any part of a split-collage group is
// skipped, the remaining parts can't reach the required photo count, so they
// auto-skip on mount. Cleared alongside clearCollageParts on success.
const skipKey = (activityCode: string, splitGroupId: string) =>
  `yooz_collage_skip::${activityCode}::${splitGroupId}`;

export function markCollageSkipped(activityCode: string, splitGroupId: string): void {
  try { sessionStorage.setItem(skipKey(activityCode, splitGroupId), '1'); } catch { /* */ }
}

export function isCollageSkipped(activityCode: string, splitGroupId: string): boolean {
  try { return sessionStorage.getItem(skipKey(activityCode, splitGroupId)) === '1'; } catch { return false; }
}

export function clearCollageSkipped(activityCode: string, splitGroupId: string): void {
  try { sessionStorage.removeItem(skipKey(activityCode, splitGroupId)); } catch { /* */ }
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

/**
 * Returns true when at least one stored part with at least one photo exists
 * for the given activity (across any splitGroupId). Used by the mission
 * completion screen to choose between the collage-video CTA and the regular
 * share modal.
 */
export async function hasAnyCollagePhotos(activityCode: string): Promise<boolean> {
  try {
    const db = await openDb();
    const prefix = `${activityCode}::`;
    const result = await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) { resolve(false); return; }
        const key = String(cursor.key);
        if (key.startsWith(prefix)) {
          const parts = cursor.value as StoredCollagePart[] | undefined;
          if (parts && parts.some((p) => p.photos && p.photos.length > 0)) {
            resolve(true);
            return;
          }
        }
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return false;
  }
}

/**
 * Drop every stored part and job. Called when a new participant session starts
 * on this device: the blobs belong to the previous session and are unreachable
 * under the new scope id, so keeping them just fills up the phone.
 */
export function deleteCollageDatabases(): void {
  try {
    indexedDB.deleteDatabase(DB_NAME);
    indexedDB.deleteDatabase(JOBS_DB_NAME);
  } catch {
    /* storage blocked — nothing stored to delete either */
  }
}
