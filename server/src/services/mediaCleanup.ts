import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '../config';
import { ROOT_FOLDER, isDeletableAsset } from '../utils/mediaFolders';

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const DAY_MS = 86_400_000;
const RESOURCE_TYPES = ['image', 'video', 'raw'] as const;
type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RETENTION_DAYS = {
  collageInputs: 2,
  collages: 30,
  unusedUploads: 30,
};

export interface CloudAsset {
  publicId: string;
  resourceType: ResourceType;
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
  const assets: CloudAsset[] = [];
  for (const resourceType of RESOURCE_TYPES) {
    let cursor: string | undefined;
    do {
      const page: { resources: { public_id: string; bytes: number; created_at: string }[]; next_cursor?: string } = await cloudinary.api.resources({
        resource_type: resourceType,
        type: 'upload',
        prefix: `${ROOT_FOLDER}/`,
        max_results: 500,
        ...(cursor && { next_cursor: cursor }),
      });
      for (const r of page.resources) {
        assets.push({ publicId: r.public_id, resourceType, bytes: r.bytes, createdAt: r.created_at });
      }
      cursor = page.next_cursor;
    } while (cursor);
  }
  return assets;
}

async function keepUnreferenced(candidates: CloudAsset[]): Promise<CloudAsset[]> {
  const pending = new Map(candidates.map((a) => [a.publicId, a]));
  const db = mongoose.connection.db;
  if (!db) throw new Error('database not connected');
  for (const { name } of await db.listCollections().toArray()) {
    if (!pending.size) break;
    for await (const doc of db.collection(name).find({})) {
      const text = JSON.stringify(doc);
      for (const publicId of pending.keys()) {
        if (text.includes(publicId)) pending.delete(publicId);
      }
      if (!pending.size) break;
    }
  }
  return [...pending.values()];
}

async function destroy(assets: CloudAsset[]): Promise<void> {
  for (const resourceType of RESOURCE_TYPES) {
    const ids = assets.filter((a) => a.resourceType === resourceType).map((a) => a.publicId);
    for (let i = 0; i < ids.length; i += 100) {
      await cloudinary.api.delete_resources(ids.slice(i, i + 100), { resource_type: resourceType, invalidate: true });
    }
  }
}

export async function runMediaCleanup({ dryRun }: { dryRun: boolean }): Promise<CleanupReport> {
  const expired = pickExpired(await listAllAssets(), Date.now());
  const deleted = {
    collageInputs: expired.collageInputs,
    collages: expired.collages,
    unusedUploads: await keepUnreferenced(expired.uploadCandidates),
  };
  const all = [...deleted.collageInputs, ...deleted.collages, ...deleted.unusedUploads];
  if (!dryRun) await destroy(all);
  return { dryRun, deleted, freedMb: Math.round(all.reduce((sum, a) => sum + a.bytes, 0) / 1_048_576) };
}

export function startMediaCleanupScheduler(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return;
  const run = () =>
    runMediaCleanup({ dryRun: false })
      .then(({ deleted, freedMb }) =>
        console.log(
          `[mediaCleanup] removed ${deleted.collageInputs.length} collage inputs, ${deleted.collages.length} collages, ${deleted.unusedUploads.length} unused uploads (${freedMb}MB)`,
        ),
      )
      .catch((err) => console.error('[mediaCleanup] sweep crashed', err));
  setInterval(run, DAY_MS);
  setTimeout(run, 10 * 60_000);
}
