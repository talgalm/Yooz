import { useCallback, useEffect, useState } from 'react';
import { angleDelta } from '../utils/geo';
import { compassHeading, type OrientationReading } from '../utils/compass';

const MIN_TURN_DEG = 3;
const MIN_GAP_MS = 100;
const TRUST_RELATIVE_FOR_DEVTOOLS = import.meta.env.DEV;

type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

export function useCompassHeading(active: boolean): { heading: number | null; request: () => void } {
  const [allowed, setAllowed] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);

  const request = useCallback(() => {
    const OrientationEvent = window.DeviceOrientationEvent as OrientationEventWithPermission | undefined;
    if (!OrientationEvent) return;
    if (typeof OrientationEvent.requestPermission !== 'function') {
      setAllowed(true);
      return;
    }
    OrientationEvent.requestPermission()
      .then((answer) => setAllowed(answer === 'granted'))
      .catch(() => setAllowed(false));
  }, []);

  useEffect(() => {
    if (!active || !allowed) return;
    let last = { value: Number.NaN, at: 0 };
    let sawAbsolute = false;
    const onReading = (event: Event) => {
      const reading = event as DeviceOrientationEvent & OrientationReading;
      const absolute = event.type === 'deviceorientationabsolute' || reading.absolute;
      if (absolute && reading.alpha !== null) sawAbsolute = true;
      if (!absolute && sawAbsolute) return;
      const value = compassHeading(
        { alpha: reading.alpha, absolute: absolute || TRUST_RELATIVE_FOR_DEVTOOLS, webkitCompassHeading: reading.webkitCompassHeading },
        window.screen?.orientation?.angle ?? 0,
      );
      if (value === null) return;
      const now = performance.now();
      if (!Number.isNaN(last.value) && (Math.abs(angleDelta(last.value, value)) < MIN_TURN_DEG || now - last.at < MIN_GAP_MS)) return;
      last = { value, at: now };
      setHeading(value);
    };
    window.addEventListener('deviceorientationabsolute', onReading);
    window.addEventListener('deviceorientation', onReading);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onReading);
      window.removeEventListener('deviceorientation', onReading);
    };
  }, [active, allowed]);

  return { heading: active && allowed ? heading : null, request };
}
