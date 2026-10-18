export type CloudinaryResourceType = 'image' | 'video' | 'raw';

export interface CloudinaryAsset {
  publicId: string;
  resourceType: CloudinaryResourceType;
  format?: string;
  version: number;
  bytes: number;
  createdAt: string;
  assetFolder?: string;
}

export const LARGE_IMAGE_BYTES = 2_000_000;
export const LARGE_VIDEO_BYTES = 20_000_000;
export const LARGE_IMAGE_TRANSFORM = 'c_limit,w_2000,q_auto';
export const LARGE_VIDEO_TRANSFORM = 'q_auto,w_720,c_limit';
const COLLAGE_INPUTS_PREFIX = 'yooz/collage-inputs/';
const COLLAGES_PREFIX = 'yooz/collages/';
const COLLAGE_INPUT_KEEP_MS = 2 * 86_400_000;

export function s3KeyFor(asset: Pick<CloudinaryAsset, 'publicId' | 'resourceType' | 'format'>): string {
  if (asset.resourceType === 'raw' || !asset.format) return asset.publicId;
  return `${asset.publicId}.${asset.format}`;
}

export function posterKeyFor(asset: Pick<CloudinaryAsset, 'publicId' | 'resourceType'>): string | null {
  return asset.resourceType === 'video' ? `${asset.publicId}.jpg` : null;
}

export function downsizeTransformFor(asset: CloudinaryAsset): string | null {
  if (asset.resourceType === 'image' && asset.bytes > LARGE_IMAGE_BYTES) return LARGE_IMAGE_TRANSFORM;
  const isRenderedCollage = asset.publicId.startsWith(COLLAGES_PREFIX);
  if (asset.resourceType === 'video' && asset.bytes > LARGE_VIDEO_BYTES && !isRenderedCollage) return LARGE_VIDEO_TRANSFORM;
  return null;
}

export function isExpiredCollageInput(asset: CloudinaryAsset, now: number): boolean {
  return asset.publicId.startsWith(COLLAGE_INPUTS_PREFIX) && now - Date.parse(asset.createdAt) > COLLAGE_INPUT_KEEP_MS;
}

export function cloudinaryDeliveryUrl(cloudName: string, asset: CloudinaryAsset, transform: string | null, extension?: string): string {
  const ext = extension ?? (asset.resourceType === 'raw' ? '' : asset.format);
  const file = ext ? `${asset.publicId}.${ext}` : asset.publicId;
  const transformSegment = transform ? `${transform}/` : '';
  return `https://res.cloudinary.com/${cloudName}/${asset.resourceType}/upload/${transformSegment}v${asset.version}/${file}`;
}
