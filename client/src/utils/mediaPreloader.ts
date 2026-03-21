// Keys whose values are always image URLs
const IMAGE_KEYS = new Set([
  'backgroundImage', 'imageUrl', 'image', 'badgeImageUrl',
  'puzzleImage', 'media', 'iconUrl',
]);

// Keys whose values may be image or video — detected by URL
const AMBIGUOUS_KEYS = new Set(['mediaUrl', 'url']);

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.includes('/video/upload/');
}

function collect(obj: unknown, images: Set<string>, videos: Set<string>): void {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) collect(item, images, videos);
    return;
  }
  const record = obj as Record<string, unknown>;
  for (const [key, val] of Object.entries(record)) {
    if (typeof val === 'string' && val.startsWith('http')) {
      if (AMBIGUOUS_KEYS.has(key)) {
        isVideoUrl(val) ? videos.add(val) : images.add(val);
      } else if (IMAGE_KEYS.has(key)) {
        images.add(val);
      }
    } else if (val && typeof val === 'object') {
      collect(val, images, videos);
    }
  }
}

export function preloadActivityMedia(data: unknown): void {
  const images = new Set<string>();
  const videos = new Set<string>();
  collect(data, images, videos);

  for (const src of images) {
    const img = new Image();
    img.src = src;
  }

  for (const src of videos) {
    const vid = document.createElement('video');
    vid.preload = 'auto';
    vid.src = src;
  }
}
