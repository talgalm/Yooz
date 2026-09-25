import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { styled, keyframes } from '@mui/material/styles';
import { angleDelta, bearingDegrees, distanceMeters, offsetMeters, type LatLng } from '../utils/geo';
import { useTranslations } from '../context/LanguageContext';
import { texts } from './ArDemoPage.i18n';

const FOV_DEGREES = 60;
const COLLECT_RADIUS_M = 3;
const HORIZON_M = 15;
const APPARENT_SIZE = 300;
const MIN_SIZE = 44;
const MAX_SIZE = 210;
const HEADING_SMOOTHING = 0.25;
const HEADING_FPS_MS = 100;
const POSITION_SMOOTHING = 0.25;
const POSITION_JUMP_M = 20;
const STRIDE_M = 0.7;
const STEP_THRESHOLD = 1.5;
const STEP_MIN_MS = 300;
const STEP_BASELINE_EASE = 0.02;

const DEFAULT_COURSE: Array<{ north: number; east: number; emoji: string; kind?: 'quiz' }> = [
  { north: 4, east: 0, emoji: '🪙' },
  { north: 5, east: 5, emoji: '🪙' },
  { north: 0, east: 7, emoji: '🪙' },
  { north: -5, east: 3, emoji: '🪙' },
  { north: -3, east: -6, emoji: '❓', kind: 'quiz' },
];

const SAFE_CODE = '7391';
const QUIZ_ANSWERS = [true, false];

const CONFETTI_COLORS = ['#ffd54f', '#7c4dff', '#2ec4b6', '#ff8a3d', '#2f9bd6'];

interface Coin extends LatLng {
  id: number;
  emoji: string;
  kind?: 'quiz';
}

interface Burst {
  key: number;
  left: number;
  top: number;
}

type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number };
type Fix = LatLng & { accuracy: number };

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
  const t = useTranslations(texts);
  const [params] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const headingRef = useRef<number | null>(null);
  const absoluteSeenRef = useRef(false);
  const positionRef = useRef<Fix | null>(null);

  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<Fix | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [compassNote, setCompassNote] = useState<string | null>(null);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [collected, setCollected] = useState<number[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [steps, setSteps] = useState(0);
  const [trend, setTrend] = useState<'closer' | 'farther' | null>(null);
  const [quiz, setQuiz] = useState<{
    id: number;
    left: number;
    top: number;
    step: number;
    correct: boolean | null;
  } | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [safeOpen, setSafeOpen] = useState(false);
  const lastNearestRef = useRef<number | null>(null);

  const fixedCoins = useMemo(() => parseCoinsParam(params.get('coins')), [params]);

  const start = useCallback(async () => {
    setError(null);
    const ask = (sensor: unknown) => {
      const requestPermission = (sensor as { requestPermission?: () => Promise<string> })
        .requestPermission;
      return typeof requestPermission === 'function'
        ? requestPermission().then(
            (state) => state === 'granted',
            () => false,
          )
        : Promise.resolve(true);
    };
    const compassPermission = ask(DeviceOrientationEvent);
    ask(DeviceMotionEvent);

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
    } catch {
      setError(t.cameraDenied);
      return;
    }
    setStarted(true);
    if (!(await compassPermission)) {
      setCompassNote(t.compassDenied);
    }
  }, [t]);

  useEffect(() => {
    if (!started || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => setError(t.videoBlocked));
  }, [started, t]);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    if (!started) return;
    const onOrientation = (event: Event) => {
      const e = event as OrientationEventWithCompass;
      let next: number | null = null;
      if (typeof e.webkitCompassHeading === 'number') {
        absoluteSeenRef.current = true;
        next = e.webkitCompassHeading;
      } else if (e.absolute && e.alpha != null) {
        absoluteSeenRef.current = true;
        next = (360 - e.alpha) % 360;
      } else if (!absoluteSeenRef.current && e.alpha != null) {
        next = (360 - e.alpha) % 360;
      }
      if (next === null) return;
      next = (next + (screen.orientation?.angle ?? 0) + 360) % 360;
      const previous = headingRef.current;
      headingRef.current =
        previous === null ? next : (previous + angleDelta(previous, next) * HEADING_SMOOTHING + 360) % 360;
    };

    window.addEventListener('deviceorientationabsolute', onOrientation);
    window.addEventListener('deviceorientation', onOrientation);
    const commit = setInterval(() => setHeading(headingRef.current), HEADING_FPS_MS);
    const noSensor = setTimeout(() => {
      if (headingRef.current === null) setCompassNote(t.noCompass);
    }, 3000);

    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrientation);
      window.removeEventListener('deviceorientation', onOrientation);
      clearInterval(commit);
      clearTimeout(noSensor);
    };
  }, [started, t]);

  const stepForward = useCallback(() => {
    const bearing = headingRef.current;
    const current = positionRef.current;
    if (bearing === null || !current) return;
    const radians = (bearing * Math.PI) / 180;
    const moved: Fix = {
      ...offsetMeters(current, Math.cos(radians) * STRIDE_M, Math.sin(radians) * STRIDE_M),
      accuracy: current.accuracy,
    };
    positionRef.current = moved;
    setPosition(moved);
    setSteps((count) => count + 1);
  }, []);

  useEffect(() => {
    if (!started) return;
    let baseline = 9.81;
    let armed = false;
    let lastStep = 0;

    const onMotion = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const magnitude = Math.hypot(a.x, a.y, a.z);
      baseline += (magnitude - baseline) * STEP_BASELINE_EASE;
      const swing = magnitude - baseline;
      const now = Date.now();
      if (armed && swing > STEP_THRESHOLD && now - lastStep > STEP_MIN_MS) {
        armed = false;
        lastStep = now;
        stepForward();
      } else if (swing < STEP_THRESHOLD * 0.3) {
        armed = true;
      }
    };

    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [started, stepForward]);

  useEffect(() => {
    if (!started) return;
    if (!navigator.geolocation) {
      setError(t.noGeolocation);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const fix: Fix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        const previous = positionRef.current;
        const smoothed =
          previous && distanceMeters(previous, fix) <= POSITION_JUMP_M
            ? {
                lat: previous.lat + (fix.lat - previous.lat) * POSITION_SMOOTHING,
                lng: previous.lng + (fix.lng - previous.lng) * POSITION_SMOOTHING,
                accuracy: fix.accuracy,
              }
            : fix;
        positionRef.current = smoothed;
        setPosition(smoothed);

        if (headingRef.current === null && pos.coords.heading != null && !Number.isNaN(pos.coords.heading)) {
          headingRef.current = pos.coords.heading;
        }
        setCoins((current) => {
          if (current.length) return current;
          if (fixedCoins) return fixedCoins;
          return DEFAULT_COURSE.map((spot, id) => ({
            id,
            emoji: spot.emoji,
            kind: spot.kind,
            ...offsetMeters(fix, spot.north, spot.east),
          }));
        });
      },
      () => setError(t.locationDenied),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [started, fixedCoins, t]);

  const collect = useCallback((id: number, left: number, top: number) => {
    setCollected((prev) => (prev.includes(id) ? prev : [...prev, id]));
    navigator.vibrate?.(80);
    const key = Date.now();
    setBursts((prev) => [...prev, { key, left, top }]);
    setTimeout(() => setBursts((prev) => prev.filter((b) => b.key !== key)), 1100);
  }, []);

  const tap = (coin: Coin, left: number, top: number) => {
    if (coin.kind === 'quiz') setQuiz({ id: coin.id, left, top, step: 0, correct: null });
    else collect(coin.id, left, top);
  };

  const answerQuiz = (value: boolean) => {
    if (!quiz || quiz.correct !== null) return;
    const correct = value === QUIZ_ANSWERS[quiz.step];
    navigator.vibrate?.(correct ? 60 : [40, 60, 40]);
    setQuiz({ ...quiz, correct });
  };

  const nextQuiz = () => {
    if (!quiz) return;
    if (quiz.step + 1 < QUIZ_ANSWERS.length) {
      setQuiz({ ...quiz, step: quiz.step + 1, correct: null });
      return;
    }
    collect(quiz.id, quiz.left, quiz.top);
    setQuiz(null);
  };

  const pressDigit = (digit: string) => {
    setPinError(false);
    const next = (pin.length >= 4 ? '' : pin) + digit;
    setPin(next);
    if (next.length < 4) return;
    if (next === SAFE_CODE) {
      setSafeOpen(true);
      navigator.vibrate?.([60, 60, 160]);
    } else {
      setPinError(true);
      navigator.vibrate?.(200);
      setTimeout(() => setPin(''), 700);
    }
  };

  const visible = coins
    .filter((coin) => !collected.includes(coin.id))
    .map((coin) => {
      if (!position) return null;
      const distance = distanceMeters(position, coin);
      const offset = angleDelta(heading ?? 0, bearingDegrees(position, coin));
      return {
        coin,
        distance,
        offset,
        inRange: distance <= COLLECT_RADIUS_M,
        onScreen: Math.abs(offset) <= FOV_DEGREES / 2,
        left: 50 + (offset / FOV_DEGREES) * 100,
        top: 70 - (Math.min(distance, HORIZON_M) / HORIZON_M) * 35,
        size: Math.max(MIN_SIZE, Math.min(MAX_SIZE, APPARENT_SIZE / Math.max(distance, 1.4))),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const remaining = coins.length - collected.length;
  const nearest = visible.reduce<(typeof visible)[number] | null>(
    (best, entry) => (best === null || entry.distance < best.distance ? entry : best),
    null,
  );

  const nearestDistance = nearest?.distance ?? null;
  useEffect(() => {
    if (nearestDistance === null) {
      lastNearestRef.current = null;
      return;
    }
    const previous = lastNearestRef.current;
    if (previous === null) {
      lastNearestRef.current = nearestDistance;
    } else if (Math.abs(nearestDistance - previous) >= 0.3) {
      setTrend(nearestDistance < previous ? 'closer' : 'farther');
      lastNearestRef.current = nearestDistance;
    }
  }, [nearestDistance]);

  if (!started) {
    return (
      <Screen style={styles.gate}>
        <div style={{ fontSize: 64 }}>🪙</div>
        <h1 style={{ margin: 0, fontSize: 32, letterSpacing: 1 }}>Yooz Go</h1>
        <p style={{ opacity: 0.8, lineHeight: 1.6, maxWidth: 320 }}>
          {t.intro(COLLECT_RADIUS_M)}
        </p>
        {error && <p style={{ color: '#ff8a80' }}>{error}</p>}
        <button type="button" onClick={start} style={styles.startButton}>
          {t.start}
        </button>
      </Screen>
    );
  }

  return (
    <Screen>
      <video ref={videoRef} autoPlay playsInline muted style={styles.video} />

      {visible.map(
        (entry) =>
          entry.onScreen && (
            <CoinButton
              type="button"
              key={entry.coin.id}
              inRange={entry.inRange}
              onClick={() => entry.inRange && tap(entry.coin, entry.left, entry.top)}
              style={{ left: `${entry.left}%`, top: `${entry.top}%`, fontSize: entry.size }}
            >
              <span>{entry.coin.emoji}</span>
              <CoinLabel inRange={entry.inRange}>
                {entry.inRange ? t.tapToCollect : t.metres(Math.round(entry.distance))}
              </CoinLabel>
            </CoinButton>
          ),
      )}

      {bursts.map((burst) => (
        <div
          key={burst.key}
          style={{ position: 'absolute', left: `${burst.left}%`, top: `${burst.top}%` }}
        >
          {CONFETTI_COLORS.flatMap((color, c) =>
            [0, 1, 2].map((ring) => {
              const angle = ((c * 3 + ring) / 15) * Math.PI * 2;
              const reach = 70 + ring * 35;
              return (
                <ConfettiPiece
                  key={`${c}-${ring}`}
                  style={
                    {
                      background: color,
                      '--tx': `${Math.cos(angle) * reach}px`,
                      '--ty': `${Math.sin(angle) * reach + 60}px`,
                      '--rot': `${Math.round(angle * 180)}deg`,
                    } as React.CSSProperties
                  }
                />
              );
            }),
          )}
        </div>
      ))}

      {nearest && !nearest.onScreen && (
        <div style={styles.arrowWrap}>
          <div style={{ ...styles.arrow, transform: `rotate(${nearest.offset}deg)` }}>⬆</div>
          <div>{t.turnToArrow(Math.round(nearest.distance))}</div>
        </div>
      )}

      <div style={styles.hud}>
        <div style={styles.hudRow}>
          <span>{t.collected(collected.length)}</span>
          <span>{t.remaining(remaining)}</span>
          {nearest && <span>{t.nearest(Math.round(nearest.distance))}</span>}
        </div>
        {nearest && trend && (
          <div style={{ ...styles.warning, color: trend === 'closer' ? '#69f0ae' : '#ff8a80' }}>
            {trend === 'closer' ? t.closer : t.farther}
          </div>
        )}
        {heading !== null && !absoluteSeenRef.current && (
          <div style={styles.warning}>{t.relativeCompass}</div>
        )}
        {compassNote && <div style={styles.warning}>{compassNote}</div>}
        {error && <div style={styles.warning}>{error}</div>}
        {!position && <div style={styles.warning}>{t.locating}</div>}
        {position && position.accuracy > COLLECT_RADIUS_M * 2 && (
          <div style={styles.warning}>{t.poorAccuracy(Math.round(position.accuracy))}</div>
        )}
      </div>

      {quiz && (
        <div style={styles.overlay}>
          <div style={styles.card}>
            <div style={{ fontSize: 40 }}>❓</div>
            <div style={{ fontSize: 15, opacity: 0.7 }}>
              {t.questionProgress(quiz.step + 1, QUIZ_ANSWERS.length)}
            </div>
            <div style={{ fontSize: 19, lineHeight: 1.5 }}>{t.quizQuestions[quiz.step]}</div>
            {quiz.correct === null ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => answerQuiz(true)} style={styles.quizButton}>
                  {t.true}
                </button>
                <button type="button" onClick={() => answerQuiz(false)} style={styles.quizButton}>
                  {t.false}
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 20, color: quiz.correct ? '#69f0ae' : '#ff8a80' }}>
                  {quiz.correct ? t.right : t.wrong}
                </div>
                {quiz.step === QUIZ_ANSWERS.length - 1 && (
                  <div style={styles.codeReveal}>
                    {t.safeCode}<b style={{ letterSpacing: 6 }}>{SAFE_CODE}</b>
                  </div>
                )}
                <button type="button" onClick={nextQuiz} style={styles.startButton}>
                  {quiz.step + 1 < QUIZ_ANSWERS.length ? t.nextQuestion : t.finish}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {remaining === 0 && coins.length > 0 && (
        <div style={styles.overlay}>
          {safeOpen ? (
            <div style={styles.card}>
              <div style={{ fontSize: 72 }}>🔓</div>
              <div style={{ fontSize: 22 }}>{t.safeOpened}</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 2 }}>Game Over</div>
            </div>
          ) : (
            <div style={styles.card}>
              <div style={{ fontSize: 64 }}>🔐</div>
              <div style={{ fontSize: 18 }}>{t.enterCode}</div>
              <div
                style={{
                  ...styles.pinRow,
                  color: pinError ? '#ff8a80' : '#ffd54f',
                }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <span key={i}>{pin[i] ?? '•'}</span>
                ))}
              </div>
              {pinError && <div style={{ color: '#ff8a80', fontSize: 15 }}>{t.wrongCode}</div>}
              <div style={styles.keypad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => pressDigit(digit)}
                    style={styles.key}
                  >
                    {digit}
                  </button>
                ))}
                <button type="button" onClick={() => setPin('')} style={styles.key}>
                  ⌫
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={styles.debug}>
        {position
          ? `±${Math.round(position.accuracy)}m · ${heading === null ? 'no compass' : `${Math.round(heading)}°`} · ${steps} steps · ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
          : 'waiting for GPS'}
      </div>
    </Screen>
  );
}

const bob = keyframes`
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -62%) scale(1.14); }
`;

const pop = keyframes`
  from { transform: translate(0, 0) rotate(0deg); opacity: 1; }
  to { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)); opacity: 0; }
`;

const Screen = styled('div')({
  position: 'fixed',
  inset: 0,
  background: '#000',
  color: '#fff',
  overflow: 'hidden',
});

const CoinButton = styled('button', { shouldForwardProp: (prop) => prop !== 'inRange' })<{
  inRange: boolean;
}>(({ inRange }) => ({
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
  filter: `drop-shadow(0 4px 12px rgba(0,0,0,0.6))${inRange ? ' drop-shadow(0 0 18px #ffd54f)' : ''}`,
  opacity: inRange ? 1 : 0.75,
  animation: inRange ? `${bob} 900ms ease-in-out infinite` : 'none',
  transition: 'font-size 240ms linear',
}));

const CoinLabel = styled('span', { shouldForwardProp: (prop) => prop !== 'inRange' })<{
  inRange: boolean;
}>(({ inRange }) => ({
  fontSize: 15,
  marginTop: 8,
  whiteSpace: 'nowrap',
  fontWeight: inRange ? 700 : 400,
  color: inRange ? '#ffd54f' : '#fff',
  textShadow: '0 1px 4px #000',
}));

const ConfettiPiece = styled('span')({
  position: 'absolute',
  width: 10,
  height: 14,
  borderRadius: 2,
  animation: `${pop} 1s ease-out forwards`,
});

const styles: Record<string, React.CSSProperties> = {
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
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.75)',
    padding: 20,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    textAlign: 'center',
    maxWidth: 340,
  },
  quizButton: {
    padding: '12px 26px',
    fontSize: 17,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontWeight: 700,
  },
  codeReveal: {
    fontSize: 19,
    padding: '10px 18px',
    borderRadius: 12,
    background: 'rgba(255,213,79,0.15)',
    color: '#ffd54f',
  },
  pinRow: { display: 'flex', gap: 18, fontSize: 40, fontWeight: 800, direction: 'ltr' },
  keypad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 72px)',
    gap: 10,
    justifyContent: 'center',
    direction: 'ltr',
  },
  key: {
    height: 62,
    fontSize: 24,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.12)',
    color: '#fff',
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
