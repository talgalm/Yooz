import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { angleDelta, bearingDegrees, distanceMeters, offsetMeters, type LatLng } from '../utils/geo';

/**
 * AR treasure-hunt demo: phone camera + GPS + compass. Coins live at real
 * lat/lng points and are drawn over the camera feed at the screen position
 * matching their compass bearing. Walk within COLLECT_RADIUS_M and tap.
 */

const FOV_DEGREES = 60; // rough horizontal FOV of a phone rear camera in portrait
const COLLECT_RADIUS_M = 3;
const HORIZON_M = 15; // distance at which a pickup is drawn at its smallest
const HEADING_SMOOTHING = 0.25; // low-pass on the compass; raw readings jitter several degrees
const HEADING_FPS_MS = 100; // commit heading to React 10x/sec, not on every sensor event

// Default course: offsets in meters (north, east) from wherever the player starts,
// so the demo is playable anywhere. Override with ?coins=lat,lng;lat,lng
const DEFAULT_COURSE: Array<{ north: number; east: number; emoji: string }> = [
  { north: 4, east: 0, emoji: '🪙' },
  { north: 5, east: 5, emoji: '🪙' },
  { north: 0, east: 7, emoji: '💎' },
  { north: -5, east: 3, emoji: '🪙' },
  { north: -3, east: -6, emoji: '👾' },
];

interface Coin extends LatLng {
  id: number;
  emoji: string;
}

type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number };

function parseCoinsParam(raw: string | null): Coin[] | null {
  if (!raw) return null;
  const coins = raw
    .split(';')
    .map((pair, i) => {
      const [lat, lng] = pair.split(',').map(Number);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { id: i, lat, lng, emoji: '🪙' } : null;
    })
    .filter((c): c is Coin => c !== null);
  return coins.length ? coins : null;
}

export default function ArDemoPage() {
  const [params] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const headingRef = useRef<number | null>(null);
  const absoluteSeenRef = useRef(false);

  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<(LatLng & { accuracy: number }) | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [compassNote, setCompassNote] = useState<string | null>(null);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [collected, setCollected] = useState<number[]>([]);

  const fixedCoins = useMemo(() => parseCoinsParam(params.get('coins')), [params]);

  const start = useCallback(async () => {
    setError(null);
    // iOS 13+ only grants motion access when requestPermission() is called inside the
    // tap itself. Fire it FIRST — after an `await` the gesture is spent and it throws.
    const requestPermission = (
      DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }
    ).requestPermission;
    const compassPermission =
      typeof requestPermission === 'function'
        ? requestPermission().then(
            (state) => state === 'granted',
            () => false,
          )
        : Promise.resolve(true);

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
    } catch {
      setError('אין גישה למצלמה. אשרו את ההרשאה ונסו שוב (נדרש HTTPS).');
      return;
    }
    setStarted(true);
    if (!(await compassPermission)) {
      setCompassNote('הרשאת המצפן נדחתה — הגדרות ← Safari ← Motion & Orientation Access');
    }
  }, []);

  // Attach the camera only once the <video> is actually mounted; the start screen
  // does not render it, so assigning srcObject inside start() hit a null ref.
  useEffect(() => {
    if (!started || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => setError('הדפדפן חסם את הווידאו. נסו לרענן.'));
  }, [started]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  // Compass. Absolute readings win; a relative `alpha` is only a last resort because
  // it is measured from wherever the phone happened to boot, not from north.
  useEffect(() => {
    if (!started) return;
    const onOrientation = (event: Event) => {
      const e = event as OrientationEventWithCompass;
      let next: number | null = null;
      if (typeof e.webkitCompassHeading === 'number') {
        absoluteSeenRef.current = true;
        next = e.webkitCompassHeading; // iOS: already degrees clockwise from north
      } else if (e.absolute && e.alpha != null) {
        absoluteSeenRef.current = true;
        next = (360 - e.alpha) % 360;
      } else if (!absoluteSeenRef.current && e.alpha != null) {
        next = (360 - e.alpha) % 360;
      }
      if (next === null) return;
      // Landscape rotates the camera relative to the sensor frame.
      next = (next + (screen.orientation?.angle ?? 0) + 360) % 360;
      const previous = headingRef.current;
      headingRef.current =
        previous === null ? next : (previous + angleDelta(previous, next) * HEADING_SMOOTHING + 360) % 360;
    };

    window.addEventListener('deviceorientationabsolute', onOrientation);
    window.addEventListener('deviceorientation', onOrientation);
    const commit = setInterval(() => setHeading(headingRef.current), HEADING_FPS_MS);
    const noSensor = setTimeout(() => {
      if (headingRef.current === null) setCompassNote('לא מתקבלת קריאת מצפן במכשיר הזה');
    }, 3000);

    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrientation);
      window.removeEventListener('deviceorientation', onOrientation);
      clearInterval(commit);
      clearTimeout(noSensor);
    };
  }, [started]);

  // GPS
  useEffect(() => {
    if (!started) return;
    if (!navigator.geolocation) {
      setError('אין תמיכה במיקום בדפדפן הזה.');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        // No compass? GPS reports a course while you are actually walking.
        if (headingRef.current === null && pos.coords.heading != null && !Number.isNaN(pos.coords.heading)) {
          headingRef.current = pos.coords.heading;
        }
        setCoins((current) => {
          if (current.length) return current;
          if (fixedCoins) return fixedCoins;
          const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          return DEFAULT_COURSE.map((spot, id) => ({
            id,
            emoji: spot.emoji,
            ...offsetMeters(origin, spot.north, spot.east),
          }));
        });
      },
      () => setError('אין גישה למיקום. אשרו את ההרשאה ונסו שוב.'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [started, fixedCoins]);

  const visible = coins
    .filter((coin) => !collected.includes(coin.id))
    .map((coin) => {
      if (!position) return null;
      const distance = distanceMeters(position, coin);
      const offset = angleDelta(heading ?? 0, bearingDegrees(position, coin));
      const far = Math.min(distance, HORIZON_M) / HORIZON_M;
      return {
        coin,
        distance,
        offset,
        onScreen: Math.abs(offset) <= FOV_DEGREES / 2,
        left: 50 + (offset / FOV_DEGREES) * 100,
        top: 70 - far * 35,
        size: 130 - far * 85,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const remaining = coins.length - collected.length;
  const nearest = visible.reduce<(typeof visible)[number] | null>(
    (best, entry) => (best === null || entry.distance < best.distance ? entry : best),
    null,
  );

  if (!started) {
    return (
      <div style={{ ...styles.screen, ...styles.gate }}>
        <div style={{ fontSize: 64 }}>🪙</div>
        <h1 style={{ margin: 0, fontSize: 26 }}>ציד מטבעות AR</h1>
        <p style={{ opacity: 0.8, lineHeight: 1.6, maxWidth: 320 }}>
          כוונו את הטלפון סביבכם, מצאו את המטבעות שמסתתרים במרחב, והתקרבו עד {COLLECT_RADIUS_M} מטר
          כדי לאסוף אותם. צריך שטח פתוח בחוץ.
        </p>
        {error && <p style={{ color: '#ff8a80' }}>{error}</p>}
        <button type="button" onClick={start} style={styles.startButton}>
          התחלה
        </button>
      </div>
    );
  }

  return (
    <div style={styles.screen}>
      <video ref={videoRef} autoPlay playsInline muted style={styles.video} />

      {visible.map(
        (entry) =>
          entry.onScreen && (
            <button
              type="button"
              key={entry.coin.id}
              onClick={() => {
                if (entry.distance <= COLLECT_RADIUS_M) {
                  setCollected((prev) => [...prev, entry.coin.id]);
                }
              }}
              style={{
                ...styles.coin,
                left: `${entry.left}%`,
                top: `${entry.top}%`,
                fontSize: entry.size,
                opacity: entry.distance <= COLLECT_RADIUS_M ? 1 : 0.75,
              }}
            >
              <span>{entry.coin.emoji}</span>
              <span style={styles.coinLabel}>{Math.round(entry.distance)} מ׳</span>
            </button>
          ),
      )}

      {/* Nothing in frame is the confusing case — point at the nearest one. */}
      {nearest && !nearest.onScreen && (
        <div style={styles.arrowWrap}>
          <div style={{ ...styles.arrow, transform: `rotate(${nearest.offset}deg)` }}>⬆</div>
          <div>{Math.round(nearest.distance)} מ׳ — הסתובבו לכיוון החץ</div>
        </div>
      )}

      <div style={styles.hud}>
        <div style={styles.hudRow}>
          <span>נאספו {collected.length}</span>
          <span>נותרו {remaining}</span>
          {nearest && <span>הקרוב: {Math.round(nearest.distance)} מ׳</span>}
        </div>
        {heading !== null && !absoluteSeenRef.current && (
          <div style={styles.warning}>מצפן יחסי — הכיוון עשוי לסטות</div>
        )}
        {compassNote && <div style={styles.warning}>{compassNote}</div>}
        {error && <div style={styles.warning}>{error}</div>}
        {!position && <div style={styles.warning}>מאתר מיקום…</div>}
        {position && position.accuracy > COLLECT_RADIUS_M * 2 && (
          <div style={styles.warning}>
            דיוק המיקום ±{Math.round(position.accuracy)} מ׳ — גדול מטווח האיסוף. בתוך מבנה ה-GPS לא מספיק מדויק.
          </div>
        )}
      </div>

      {remaining === 0 && coins.length > 0 && (
        <div style={styles.win}>
          <div style={{ fontSize: 56 }}>🎉</div>
          <div>אספתם הכול!</div>
        </div>
      )}

      <div style={styles.debug}>
        {position
          ? `±${Math.round(position.accuracy)}m · ${heading === null ? 'no compass' : `${Math.round(heading)}°`} · ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
          : 'waiting for GPS'}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  screen: {
    position: 'fixed',
    inset: 0,
    background: '#000',
    color: '#fff',
    overflow: 'hidden',
  },
  gate: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    textAlign: 'center',
    padding: 24,
  },
  startButton: {
    padding: '14px 40px',
    fontSize: 18,
    borderRadius: 999,
    border: 'none',
    background: '#7c4dff',
    color: '#fff',
    fontWeight: 700,
  },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  coin: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    background: 'none',
    border: 'none',
    padding: 0,
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    lineHeight: 1,
    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
  },
  coinLabel: { fontSize: 14, marginTop: 6, textShadow: '0 1px 4px #000' },
  arrowWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '45%',
    textAlign: 'center',
    fontSize: 15,
    textShadow: '0 1px 6px #000',
  },
  arrow: { fontSize: 76, lineHeight: 1 },
  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 12,
    background: 'linear-gradient(rgba(0,0,0,0.6), transparent)',
    fontSize: 15,
  },
  hudRow: { display: 'flex', gap: 16, justifyContent: 'center', fontWeight: 700 },
  warning: { textAlign: 'center', marginTop: 6, fontSize: 13, color: '#ffd54f' },
  win: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    background: 'rgba(0,0,0,0.6)',
    fontSize: 24,
    fontWeight: 700,
  },
  debug: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    fontSize: 12,
    textAlign: 'center',
    direction: 'ltr',
    background: 'rgba(0,0,0,0.5)',
  },
};
