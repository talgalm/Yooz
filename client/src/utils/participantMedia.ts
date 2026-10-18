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
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

function isEmbeddableStream(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
}

export function isParticipantImageUrl(url: string): boolean {
  if (!url.startsWith('http')) return false;
  if (isEmbeddableStream(url)) return false;
  if (isVideoMediaUrl(url)) return false;
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
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
    img.src = url;
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
    vid.src = url;
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
