import {
  isParticipantImageUrl,
  isVideoMediaUrl,
  preloadParticipantImage,
  preloadParticipantVideo,
  shouldDeferVideoPrefetch,
} from './participantMedia';

function isEmbeddableStreamUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
}

function collect(obj: unknown, images: Set<string>, videos: Set<string>): void {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) collect(item, images, videos);
    return;
  }
  const record = obj as Record<string, unknown>;
  for (const val of Object.values(record)) {
    if (typeof val === 'string' && val.startsWith('http')) {
      if (isEmbeddableStreamUrl(val)) continue;
      if (isVideoMediaUrl(val)) videos.add(val);
      else if (isParticipantImageUrl(val)) images.add(val);
    } else if (val && typeof val === 'object') {
      collect(val, images, videos);
    }
  }
}

function preloadUrls(images: Set<string>, videos: Set<string>, includeVideos: boolean): void {
  for (const src of images) preloadParticipantImage(src);
  if (includeVideos) {
    for (const src of videos) preloadParticipantVideo(src);
  }
}

function deferBackgroundPreload(fn: () => void): void {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(fn, { timeout: 5000 });
    return;
  }
  setTimeout(fn, 200);
}

export interface PreloadActivityMediaOptions {
  /** Preload this station and the next two first; defer the rest. */
  priorityIndex?: number;
}

export function preloadActivityMedia(data: unknown, opts?: PreloadActivityMediaOptions): void {
  const deferVideos = shouldDeferVideoPrefetch();
  const module = (data as { module?: { items?: unknown[] } })?.module;
  const items = module?.items;

  if (!items?.length) {
    const images = new Set<string>();
    const videos = new Set<string>();
    collect(data, images, videos);
    preloadUrls(images, videos, !deferVideos);
    return;
  }

  const start = opts?.priorityIndex ?? 0;
  const priorityIndexes = [start, start + 1, start + 2].filter((i) => i >= 0 && i < items.length);
  const uniquePriority = [...new Set(priorityIndexes)];

  const priorityImages = new Set<string>();
  const priorityVideos = new Set<string>();
  for (const i of uniquePriority) collect(items[i], priorityImages, priorityVideos);
  preloadUrls(priorityImages, priorityVideos, true);

  deferBackgroundPreload(() => {
    const allImages = new Set<string>();
    const allVideos = new Set<string>();
    for (const item of items) collect(item, allImages, allVideos);

    for (const src of allImages) {
      if (!priorityImages.has(src)) preloadParticipantImage(src);
    }
    if (!deferVideos) {
      for (const src of allVideos) {
        if (!priorityVideos.has(src)) preloadParticipantVideo(src);
      }
    }
  });
}
