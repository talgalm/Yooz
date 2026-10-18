import fs from 'fs';
import os from 'os';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME, MEDIA_BUCKET, MEDIA_REGION } from '../config';
import {
  CloudinaryAsset,
  CloudinaryResourceType,
  cloudinaryDeliveryUrl,
  downsizeTransformFor,
  isExpiredCollageInput,
  posterKeyFor,
  s3KeyFor,
} from '../utils/cloudinaryToS3';

const RESOURCE_TYPES: CloudinaryResourceType[] = ['image', 'video', 'raw'];
const CONCURRENCY = 6;
const CACHE_CONTROL = 'public, max-age=31536000';
const MANIFEST_KEY = '_migration/cloudinary-manifest.json';
const COPY = process.argv.includes('--copy');

type CopyKind = 'original' | 'downsized' | 'poster';

interface CopyJob {
  key: string;
  kind: CopyKind;
  sourceUrl: string;
  fallbackUrl?: string;
  asset: CloudinaryAsset;
}

interface CopyResult {
  key: string;
  kind: CopyKind;
  publicId: string;
  resourceType: CloudinaryResourceType;
  assetFolder?: string;
  sourceBytes: number;
  storedBytes?: number;
  usedFallback?: boolean;
  status: 'copied' | 'present' | 'failed' | 'planned';
  error?: string;
}

cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET });
const s3 = new S3Client({ region: MEDIA_REGION });

async function listAssets(): Promise<CloudinaryAsset[]> {
  const assets: CloudinaryAsset[] = [];
  for (const resourceType of RESOURCE_TYPES) {
    let cursor: string | undefined;
    do {
      const page = await cloudinary.api.resources({
        resource_type: resourceType,
        type: 'upload',
        max_results: 500,
        ...(cursor && { next_cursor: cursor }),
      });
      for (const r of page.resources) {
        assets.push({
          publicId: r.public_id,
          resourceType,
          format: r.format,
          version: r.version,
          bytes: r.bytes,
          createdAt: r.created_at,
          assetFolder: r.asset_folder,
        });
      }
      cursor = page.next_cursor;
    } while (cursor);
  }
  return assets;
}

function jobsFor(asset: CloudinaryAsset): CopyJob[] {
  const original = cloudinaryDeliveryUrl(CLOUDINARY_CLOUD_NAME, asset, null);
  const transform = downsizeTransformFor(asset);
  const jobs: CopyJob[] = [
    transform
      ? { key: s3KeyFor(asset), kind: 'downsized', sourceUrl: cloudinaryDeliveryUrl(CLOUDINARY_CLOUD_NAME, asset, transform), fallbackUrl: original, asset }
      : { key: s3KeyFor(asset), kind: 'original', sourceUrl: original, asset },
  ];
  const posterKey = posterKeyFor(asset);
  if (posterKey) {
    jobs.push({ key: posterKey, kind: 'poster', sourceUrl: cloudinaryDeliveryUrl(CLOUDINARY_CLOUD_NAME, asset, null, 'jpg'), asset });
  }
  return jobs;
}

async function existsInBucket(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: MEDIA_BUCKET, Key: key }));
    return true;
  } catch (err) {
    if ((err as { name?: string }).name === 'NotFound') return false;
    throw err;
  }
}

async function download(job: CopyJob): Promise<{ body: Buffer; contentType: string; usedFallback: boolean }> {
  let res = await fetch(job.sourceUrl);
  let usedFallback = false;
  if (!res.ok && job.fallbackUrl) {
    res = await fetch(job.fallbackUrl);
    usedFallback = true;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${usedFallback ? job.fallbackUrl : job.sourceUrl}`);
  return {
    body: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get('content-type') ?? 'application/octet-stream',
    usedFallback,
  };
}

async function copy(job: CopyJob): Promise<Pick<CopyResult, 'storedBytes' | 'usedFallback'>> {
  const { body, contentType, usedFallback } = await download(job);
  await s3.send(
    new PutObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: job.key,
      Body: body,
      ContentType: contentType,
      CacheControl: CACHE_CONTROL,
      Metadata: {
        'cloudinary-public-id': encodeURIComponent(job.asset.publicId),
        ...(job.asset.assetFolder && { 'cloudinary-folder': encodeURIComponent(job.asset.assetFolder) }),
      },
    }),
  );
  return { storedBytes: body.length, usedFallback };
}

async function runPool<T, R>(items: T[], worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await worker(items[index], index);
      }
    }),
  );
  return results;
}

const mb = (bytes: number) => `${(bytes / 1_048_576).toFixed(0)} MB`;

function summarize(assets: CloudinaryAsset[], skipped: CloudinaryAsset[], results: CopyResult[]): void {
  console.log(`\nCloudinary assets: ${assets.length} (${mb(assets.reduce((s, a) => s + a.bytes, 0))})`);
  for (const type of RESOURCE_TYPES) {
    const ofType = assets.filter((a) => a.resourceType === type);
    if (ofType.length) console.log(`  ${type}: ${ofType.length} (${mb(ofType.reduce((s, a) => s + a.bytes, 0))})`);
  }
  console.log(`Skipped expired collage inputs: ${skipped.length} (${mb(skipped.reduce((s, a) => s + a.bytes, 0))})`);
  console.log(`Folder metadata kept for: ${assets.filter((a) => a.assetFolder && !a.publicId.startsWith(`${a.assetFolder}/`)).length} assets`);
  const byStatus = (status: CopyResult['status']) => results.filter((r) => r.status === status);
  for (const kind of ['original', 'downsized', 'poster'] as CopyKind[]) {
    const ofKind = results.filter((r) => r.kind === kind);
    console.log(`  ${kind}: ${ofKind.length} files, ${ofKind.filter((r) => r.status === 'present').length} already in S3`);
  }
  const todo = results.filter((r) => r.status !== 'present');
  console.log(`Already in S3: ${byStatus('present').length}`);
  console.log(`${COPY ? 'Copied' : 'Would copy'}: ${COPY ? byStatus('copied').length : todo.length} files`);
  console.log(`Cloudinary bandwidth, upper bound: ${mb(todo.filter((r) => r.kind !== 'poster').reduce((s, r) => s + r.sourceBytes, 0))}`);
  if (COPY) {
    console.log(`Stored in S3: ${mb(byStatus('copied').reduce((s, r) => s + (r.storedBytes ?? 0), 0))}`);
    console.log(`Downsized that fell back to the original: ${results.filter((r) => r.usedFallback).length}`);
    const failed = byStatus('failed');
    console.log(`Failed: ${failed.length}`);
    for (const f of failed.slice(0, 20)) console.log(`  ${f.key}: ${f.error}`);
  }
}

async function main() {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) throw new Error('Cloudinary is not configured');
  if (!MEDIA_BUCKET) throw new Error('MEDIA_BUCKET is not set');
  console.log(`${COPY ? 'COPY' : 'DRY RUN'}: Cloudinary ${CLOUDINARY_CLOUD_NAME} → s3://${MEDIA_BUCKET} (${MEDIA_REGION})`);

  const assets = await listAssets();
  const now = Date.now();
  const skipped = assets.filter((a) => isExpiredCollageInput(a, now));
  const jobs = assets.filter((a) => !isExpiredCollageInput(a, now)).flatMap(jobsFor);

  let done = 0;
  const results = await runPool(jobs, async (job): Promise<CopyResult> => {
    const base = {
      key: job.key,
      kind: job.kind,
      publicId: job.asset.publicId,
      resourceType: job.asset.resourceType,
      assetFolder: job.asset.assetFolder,
      sourceBytes: job.asset.bytes,
    };
    try {
      if (await existsInBucket(job.key)) return { ...base, status: 'present' };
      if (!COPY) return { ...base, status: 'planned' };
      const copied = await copy(job);
      if (++done % 100 === 0) console.log(`  … ${done} copied`);
      return { ...base, ...copied, status: 'copied' };
    } catch (err) {
      return { ...base, status: 'failed', error: (err as Error).message };
    }
  });

  const manifestPath = path.join(os.tmpdir(), `cloudinary-manifest-${COPY ? 'copy' : 'dry'}-${now}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(results, null, 1));
  if (COPY) {
    await s3.send(new PutObjectCommand({ Bucket: MEDIA_BUCKET, Key: MANIFEST_KEY, Body: JSON.stringify(results), ContentType: 'application/json' }));
  }
  summarize(assets, skipped, results);
  console.log(`\nManifest: ${manifestPath}`);
  if (results.some((r) => r.status === 'failed')) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
