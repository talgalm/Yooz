import { spawn } from 'child_process';
import { Readable, Transform } from 'stream';
import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import ffmpegStatic from 'ffmpeg-static';
import { MEDIA_BUCKET, MEDIA_CDN_URL, MEDIA_REGION } from '../config';
import { encodeKeyForUrl, mediaKeyFromUrl, posterKeyOf } from '../utils/mediaKeys';

const CACHE_CONTROL = 'public, max-age=31536000';
const FOLDER_MARKER = '.folder';
const FFMPEG_BIN = process.env.FFMPEG_PATH || ffmpegStatic || 'ffmpeg';
const PRESIGN_TTL_SECONDS = 600;

const s3 = new S3Client({ region: MEDIA_REGION });

export interface StoredMedia {
  key: string;
  url: string;
  bytes: number;
}

export interface ListedObject {
  key: string;
  bytes: number;
  lastModified?: Date;
}

export function isMediaConfigured(): boolean {
  return Boolean(MEDIA_BUCKET && MEDIA_CDN_URL);
}

export function mediaUrl(key: string): string {
  return `${MEDIA_CDN_URL}/${encodeKeyForUrl(key)}`;
}

export function keyOfMediaUrl(url: string): string | null {
  return mediaKeyFromUrl(url, MEDIA_CDN_URL);
}

export function isMediaUrl(url: string): boolean {
  return Boolean(MEDIA_CDN_URL) && url.startsWith(`${MEDIA_CDN_URL}/`);
}

export async function putMedia(key: string, body: Buffer | Readable, contentType: string): Promise<StoredMedia> {
  let bytes = 0;
  const counted = Buffer.isBuffer(body)
    ? body
    : body.pipe(new Transform({ transform(chunk: Buffer, _enc, done) { bytes += chunk.length; done(null, chunk); } }));
  if (!Buffer.isBuffer(body)) body.on('error', (err) => (counted as Transform).destroy(err));
  await new Upload({
    client: s3,
    params: { Bucket: MEDIA_BUCKET, Key: key, Body: counted, ContentType: contentType, CacheControl: CACHE_CONTROL },
  }).done();
  return { key, url: mediaUrl(key), bytes: Buffer.isBuffer(body) ? body.length : bytes };
}

export async function mediaExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: MEDIA_BUCKET, Key: key }));
    return true;
  } catch (err) {
    if ((err as { name?: string }).name === 'NotFound') return false;
    throw err;
  }
}

export async function listObjects(prefix: string, delimiter?: string): Promise<{ objects: ListedObject[]; folders: string[] }> {
  const objects: ListedObject[] = [];
  const folders: string[] = [];
  let token: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: MEDIA_BUCKET, Prefix: prefix, Delimiter: delimiter, ContinuationToken: token }),
    );
    for (const o of page.Contents ?? []) {
      if (o.Key) objects.push({ key: o.Key, bytes: o.Size ?? 0, lastModified: o.LastModified });
    }
    for (const p of page.CommonPrefixes ?? []) if (p.Prefix) folders.push(p.Prefix);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return { objects, folders };
}

export async function deleteMediaKeys(keys: string[]): Promise<void> {
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    if (!batch.length) continue;
    await s3.send(new DeleteObjectsCommand({ Bucket: MEDIA_BUCKET, Delete: { Objects: batch.map((Key) => ({ Key })) } }));
  }
}

export async function keysOfPublicId(publicId: string): Promise<string[]> {
  const { objects } = await listObjects(publicId);
  return objects
    .map((o) => o.key)
    .filter((key) => key === publicId || /^\.[a-z0-9]+$/i.test(key.slice(publicId.length)));
}

export async function deleteMediaByPublicId(publicId: string): Promise<number> {
  const keys = await keysOfPublicId(publicId);
  await deleteMediaKeys(keys);
  return keys.length;
}

export async function moveMediaByPublicId(publicId: string, folder: string): Promise<string[]> {
  const moves = (await keysOfPublicId(publicId))
    .map((key) => ({ key, target: `${folder}/${key.slice(key.lastIndexOf('/') + 1)}` }))
    .filter(({ key, target }) => key !== target);
  for (const { key, target } of moves) {
    await s3.send(
      new CopyObjectCommand({ Bucket: MEDIA_BUCKET, Key: target, CopySource: `${MEDIA_BUCKET}/${encodeKeyForUrl(key)}` }),
    );
  }
  await deleteMediaKeys(moves.map(({ key }) => key));
  return moves.map(({ target }) => target);
}

export async function createFolder(path: string): Promise<void> {
  await s3.send(new PutObjectCommand({ Bucket: MEDIA_BUCKET, Key: `${path}/${FOLDER_MARKER}`, Body: Buffer.alloc(0) }));
}

export async function deleteFolderIfEmpty(path: string): Promise<boolean> {
  const { objects } = await listObjects(`${path}/`);
  if (objects.some((o) => !o.key.endsWith(`/${FOLDER_MARKER}`))) return false;
  await deleteMediaKeys(objects.map((o) => o.key));
  return true;
}

export function isFolderMarker(key: string): boolean {
  return key.endsWith(`/${FOLDER_MARKER}`);
}

export async function presignImageUpload(key: string, maxBytes: number): Promise<{ uploadUrl: string; fields: Record<string, string>; url: string }> {
  const { url: uploadUrl, fields } = await createPresignedPost(s3, {
    Bucket: MEDIA_BUCKET,
    Key: key,
    Conditions: [['content-length-range', 1, maxBytes]],
    Fields: { 'Content-Type': 'image/jpeg', 'Cache-Control': CACHE_CONTROL },
    Expires: PRESIGN_TTL_SECONDS,
  });
  return { uploadUrl, fields, url: mediaUrl(key) };
}

export function extractPoster(source: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_BIN, [
      '-hide_banner', '-loglevel', 'error',
      '-i', source,
      '-vf', 'thumbnail', '-frames:v', '1',
      '-f', 'image2', '-c:v', 'mjpeg', '-q:v', '3',
      'pipe:1',
    ]);
    const chunks: Buffer[] = [];
    let stderr = '';
    proc.stdout.on('data', (c: Buffer) => chunks.push(c));
    proc.stderr.on('data', (c: Buffer) => { stderr = (stderr + c.toString()).slice(-1000); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      const jpeg = Buffer.concat(chunks);
      if (code === 0 && jpeg.length) resolve(jpeg);
      else reject(new Error(`poster extraction failed (${code}): ${stderr}`));
    });
  });
}

export async function storePosterFor(videoKey: string, source: string): Promise<string | null> {
  try {
    const poster = await putMedia(posterKeyOf(videoKey), await extractPoster(source), 'image/jpeg');
    return poster.url;
  } catch (err) {
    console.error(`[mediaStore] no poster for ${videoKey}:`, (err as Error).message);
    return null;
  }
}
