const IMAGE_TRANSFORM = 'f_auto,q_auto,w_1200';
const VIDEO_TRANSFORM = 'q_auto,w_720,c_limit';

type NetworkInformation = {
  effectiveType?: string;
  saveData?: boolean;
};

export function shouldDeferVideoPrefetch(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  return conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
}
const MAX_MEDIA_RETRIES = 6;
const RETRY_BASE_MS = 1500;
const MEDIA_WATCHDOG_MS = 12000;

export function isVideoMediaUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || url.includes('/video/upload/');
}

function isEmbeddableStream(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
}

export function isParticipantImageUrl(url: string): boolean {
  if (!url.startsWith('http')) return false;
  if (isEmbeddableStream(url)) return false;
  if (isVideoMediaUrl(url)) return false;
  if (url.includes('res.cloudinary.com')) return url.includes('/image/upload/');
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
}

export function insertCloudinaryTransform(url: string, resourceType: 'image' | 'video', transform: string): string {
  const marker = `/${resourceType}/upload/`;
  if (!url.includes('res.cloudinary.com') || !url.includes(marker)) return url;

  const splitIdx = url.indexOf(marker);
  const before = url.slice(0, splitIdx + marker.length);
  const after = url.slice(splitIdx + marker.length);

  if (after.startsWith(`${transform}/`)) return url;

  const firstSegment = after.split('/')[0] ?? '';
  if (!/^v\d+$/.test(firstSegment) && (firstSegment.includes(',') || /^(f_|q_|w_|c_|h_)/.test(firstSegment))) {
    return url;
  }

  return `${before}${transform}/${after}`;
}

export function participantImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (!isParticipantImageUrl(url)) return url;
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    return insertCloudinaryTransform(url, 'image', IMAGE_TRANSFORM);
  }
  return url;
}

export function participantVideoUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (!isVideoMediaUrl(url)) return url;
  if (url.includes('res.cloudinary.com') && url.includes('/video/upload/')) {
    return insertCloudinaryTransform(url, 'video', VIDEO_TRANSFORM);
  }
  return url;
}

export function resolveParticipantMediaUrl(url: string): string {
  if (isVideoMediaUrl(url)) return participantVideoUrl(url);
  if (isParticipantImageUrl(url)) return participantImageUrl(url);
  return url;
}

export function optimizeActivityMediaData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    if (!data.startsWith('http')) return data;
    return resolveParticipantMediaUrl(data) as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => optimizeActivityMediaData(item)) as T;
  }
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      result[key] = optimizeActivityMediaData(val);
    }
    return result as T;
  }
  return data;
}

export function loadParticipantImage(
  url: string,
  onSuccess: () => void,
  onFailure: () => void,
): () => void {
  let cancelled = false;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clearTimers = () => {
    if (timer) clearTimeout(timer);
    if (watchdog) clearTimeout(watchdog);
  };

  const tryLoad = () => {
    if (cancelled) return;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) { clearTimers(); onSuccess(); }
    };
    img.onerror = () => {
      if (cancelled) return;
      attempt += 1;
      if (attempt >= MAX_MEDIA_RETRIES) {
        clearTimers();
        onFailure();
        return;
      }
      timer = setTimeout(tryLoad, RETRY_BASE_MS * attempt);
    };
    img.src = participantImageUrl(url);
  };

  const watchdog = setTimeout(() => {
    if (!cancelled) { clearTimers(); onSuccess(); }
  }, MEDIA_WATCHDOG_MS);

  tryLoad();

  return () => {
    cancelled = true;
    clearTimers();
  };
}

export function loadParticipantVideo(
  url: string,
  onSuccess: () => void,
  onFailure: () => void,
): () => void {
  let cancelled = false;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clearTimers = () => {
    if (timer) clearTimeout(timer);
    if (watchdog) clearTimeout(watchdog);
  };

  const tryLoad = () => {
    if (cancelled) return;
    const vid = document.createElement('video');
    vid.preload = 'auto';
    vid.muted = true;
    const succeed = () => {
      if (!cancelled) { clearTimers(); onSuccess(); }
    };
    vid.onloadedmetadata = succeed;
    vid.onloadeddata = succeed;
    vid.onerror = () => {
      if (cancelled) return;
      attempt += 1;
      if (attempt >= MAX_MEDIA_RETRIES) {
        clearTimers();
        onFailure();
        return;
      }
      timer = setTimeout(tryLoad, RETRY_BASE_MS * attempt);
    };
    vid.src = participantVideoUrl(url);
  };

  const watchdog = setTimeout(() => {
    if (!cancelled) { clearTimers(); onSuccess(); }
  }, MEDIA_WATCHDOG_MS);

  tryLoad();

  return () => {
    cancelled = true;
    clearTimers();
  };
}

export function preloadParticipantImage(url: string): void {
  loadParticipantImage(url, () => {}, () => {});
}

export function preloadParticipantVideo(url: string): void {
  loadParticipantVideo(url, () => {}, () => {});
}
