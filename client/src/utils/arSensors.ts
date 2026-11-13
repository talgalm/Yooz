type SensorWithPermission = { requestPermission?: () => Promise<'granted' | 'denied'> };

export function requestMotionAccess() {
  const sensors = [window.DeviceOrientationEvent, window.DeviceMotionEvent] as unknown as Array<SensorWithPermission | undefined>;
  for (const sensor of sensors) {
    if (typeof sensor?.requestPermission === 'function') sensor.requestPermission().catch(() => undefined);
  }
}

export async function immersiveArSupported(): Promise<boolean> {
  try {
    return Boolean(await navigator.xr?.isSessionSupported('immersive-ar'));
  } catch {
    return false;
  }
}

export interface CollectSound {
  play: () => void;
  close: () => void;
}

export function createCollectSound(src: string): CollectSound {
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.muted = true;
  let played = false;
  audio.play().then(
    () => {
      if (played) return;
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    },
    () => {
      audio.muted = false;
    },
  );
  return {
    play() {
      played = true;
      audio.muted = false;
      audio.currentTime = 0;
      audio.play().catch(() => undefined);
    },
    close() {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    },
  };
}

export async function startImmersiveAr(overlayRoot: HTMLElement): Promise<XRSession | null> {
  if (!navigator.xr) return null;
  try {
    return await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local'],
      optionalFeatures: ['dom-overlay', 'hit-test'],
      domOverlay: { root: overlayRoot },
    });
  } catch {
    return null;
  }
}
