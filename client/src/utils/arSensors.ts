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

export interface CoinChime {
  play: () => void;
  close: () => void;
}

export function createCoinChime(): CoinChime {
  const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return { play: () => undefined, close: () => undefined };
  const context = new AudioContextClass();
  const note = (frequency: number, start: number, length: number) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + length + 0.02);
  };
  return {
    play() {
      if (context.state === 'suspended') context.resume().catch(() => undefined);
      const now = context.currentTime;
      note(988, now, 0.09);
      note(1319, now + 0.08, 0.38);
    },
    close() {
      context.close().catch(() => undefined);
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
