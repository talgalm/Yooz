import crypto from 'crypto';
import { s3KeyFromCloudinaryUrl } from './cloudinaryToS3';

export type MediaResourceType = 'image' | 'video' | 'raw';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'ogg', 'ogv', 'mp3', 'wav', 'weba', 'm4a']);

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'weba',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
};

export function extensionOf(key: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(key);
  return match ? match[1].toLowerCase() : '';
}

export function extensionForUpload(mimetype: string, fileName: string): string {
  return EXTENSION_BY_MIME[mimetype] ?? (extensionOf(fileName) || 'bin');
}

export function resourceTypeOf(key: string): MediaResourceType {
  const ext = extensionOf(key);
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  return 'raw';
}

export function publicIdOf(key: string): string {
  return resourceTypeOf(key) === 'raw' ? key : key.replace(/\.[^./]+$/, '');
}

export function posterKeyOf(videoKey: string): string {
  return `${videoKey.replace(/\.[^./]+$/, '')}.jpg`;
}

export function slugForFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]*$/, '').toLowerCase();
  const slug = base.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return slug || 'file';
}

export function newMediaKey(folder: string, fileName: string, extension: string): string {
  const unique = crypto.randomBytes(4).toString('hex');
  return `${folder}/${slugForFileName(fileName)}_${unique}.${extension}`;
}

export function encodeKeyForUrl(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

export function mediaKeyFromUrl(url: string, cdnBase: string): string | null {
  if (cdnBase && url.startsWith(`${cdnBase}/`)) {
    const path = url.slice(cdnBase.length + 1).split(/[?#]/)[0];
    return path.split('/').map((s) => decodeURIComponent(s)).join('/') || null;
  }
  return s3KeyFromCloudinaryUrl(url);
}
