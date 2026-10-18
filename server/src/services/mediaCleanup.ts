import mongoose from 'mongoose';
import { ROOT_FOLDER, isDeletableAsset } from '../utils/mediaFolders';
import { MediaResourceType, publicIdOf, resourceTypeOf } from '../utils/mediaKeys';
import { deleteMediaKeys, isFolderMarker, isMediaConfigured, listObjects } from './mediaStore';

const DAY_MS = 86_400_000;

export const RETENTION_DAYS = {
  collageInputs: 2,
  collages: 30,
  unusedUploads: 30,
};

export interface CloudAsset {
  key: string;
  publicId: string;
  resourceType: MediaResourceType;
  bytes: number;
  createdAt: string;
}

export interface CleanupReport {
  dryRun: boolean;
  deleted: { collageInputs: CloudAsset[]; collages: CloudAsset[]; unusedUploads: CloudAsset[] };
  freedMb: number;
}

export function olderThan(asset: CloudAsset, days: number, now: number): boolean {
  return now - Date.parse(asset.createdAt) > days * DAY_MS;
}

export function pickExpired(assets: CloudAsset[], now: number) {
  return {
    collageInputs: assets.filter((a) => a.publicId.startsWith(`${ROOT_FOLDER}/collage-inputs/`) && olderThan(a, RETENTION_DAYS.collageInputs, now)),
    collages: assets.filter((a) => a.publicId.startsWith(`${ROOT_FOLDER}/collages/`) && olderThan(a, RETENTION_DAYS.collages, now)),
    uploadCandidates: assets.filter((a) => isDeletableAsset(a.publicId) && olderThan(a, RETENTION_DAYS.unusedUploads, now)),
  };
}

async function listAllAssets(): Promise<CloudAsset[]> {
  const { objects } = await listObjects(`${ROOT_FOLDER}/`);
  return objects
    .filter((o) => !isFolderMarker(o.key))
    .map((o) => ({
      key: o.key,
      publicId: publicIdOf(o.key),
      resourceType: resourceTypeOf(o.key),
      bytes: o.bytes,
      createdAt: (o.lastModified ?? new Date()).toISOString(),
    }));
}

async function keepUnreferenced(candidates: CloudAsset[]): Promise<CloudAsset[]> {
  const pending = new Map(candidates.map((a) => [a.key, a]));
  const db = mongoose.connection.db;
  if (!db) throw new Error('database not connected');
  for (const { name } of await db.listCollections().toArray()) {
    if (!pending.size) break;
    for await (const doc of db.collection(name).find({})) {
      const text = JSON.stringify(doc);
      for (const [key, asset] of pending) {
        if (text.includes(asset.publicId)) pending.delete(key);
      }
      if (!pending.size) break;
    }
  }
  return [...pending.values()];
}

export async function runMediaCleanup({ dryRun }: { dryRun: boolean }): Promise<CleanupReport> {
  const expired = pickExpired(await listAllAssets(), Date.now());
  const deleted = {
    collageInputs: expired.collageInputs,
    collages: expired.collages,
    unusedUploads: await keepUnreferenced(expired.uploadCandidates),
  };
  const all = [...deleted.collageInputs, ...deleted.collages, ...deleted.unusedUploads];
  if (!dryRun) await deleteMediaKeys(all.map((a) => a.key));
  return { dryRun, deleted, freedMb: Math.round(all.reduce((sum, a) => sum + a.bytes, 0) / 1_048_576) };
}

const CHECK_EVERY_MS = 60 * 60_000;
const FIRST_CHECK_AFTER_MS = 60_000;

async function claimDailyRun(now: Date): Promise<boolean> {
  const db = mongoose.connection.db;
  if (!db) return false;
  const jobs = db.collection<{ _id: string; lastRunAt: Date }>('scheduledjobs');
  await jobs.updateOne({ _id: 'mediaCleanup' }, { $setOnInsert: { lastRunAt: new Date(0) } }, { upsert: true });
  const claimed = await jobs.findOneAndUpdate(
    { _id: 'mediaCleanup', lastRunAt: { $lte: new Date(now.getTime() - DAY_MS) } },
    { $set: { lastRunAt: now } },
  );
  return Boolean(claimed);
}

export function startMediaCleanupScheduler(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (!isMediaConfigured()) return;
  const tick = () =>
    claimDailyRun(new Date())
      .then(async (due) => {
        if (!due) return;
        const { deleted, freedMb } = await runMediaCleanup({ dryRun: false });
        console.log(
          `[mediaCleanup] removed ${deleted.collageInputs.length} collage inputs, ${deleted.collages.length} collages, ${deleted.unusedUploads.length} unused uploads (${freedMb}MB)`,
        );
      })
      .catch((err) => console.error('[mediaCleanup] sweep crashed', err));
  setInterval(tick, CHECK_EVERY_MS);
  setTimeout(tick, FIRST_CHECK_AFTER_MS);
}
