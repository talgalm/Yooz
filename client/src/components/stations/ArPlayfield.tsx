import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { styled, keyframes } from '@mui/material/styles';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './ArStation.i18n';
import { COIN_HEIGHT_M, createCoinScene } from './arCoins3d';
import {
  EYE_HEIGHT_M,
  cameraFromQuat,
  easeQuat,
  edgeMarker,
  floorForward,
  focalForViewport,
  multiplyQuat,
  quatFromAxisAngle,
  quatFromDeviceOrientation,
  quatFromYawPitch,
  radarDot,
  yawOf,
  type ArCamera,
  type Quat,
} from '../../utils/arCamera';
import {
  COLLECT_RADIUS_STEPS_M,
  COLLECT_RADIUS_TRACKED_M,
  collectedCount,
  createArGame,
  isArGameOver,
  nearestCoin,
  seededRandom,
  stepArGame,
  type ArGameState,
  type FloorPoint,
} from '../../utils/arGame';
import { STRIDE_M, createStepDetector } from '../../utils/arSteps';
import type { CoinChime } from '../../utils/arSensors';
import type { ArStationSettings } from '../../utils/arStation';

const FALLBACK_PITCH_DEG = -8;
const ORIENTATION_EASE = 0.35;
const COUNTDOWN_STEP_MS = 800;
const FINISH_DELAY_MS = 1200;
const MAX_STEP_S = 0.05;
const LOW_TIME_SECONDS = 10;
const WALK_HINT_MS = 5000;
const POSITION_EASE_RATE = 7;
const KEY_WALK_MPS = 1.3;
const KEY_TURN_DEG_PER_S = 75;
const ARROW_INSET_PX = 26;
const RADAR_SIZE_PX = 116;
const RADAR_RANGE_FACTOR = 1.25;
const FLOOR_EASE = 0.1;
const FLOOR_BELOW_EYE_M = 0.6;
const POPUP_MS = 900;
const POPUP_HEIGHT_RATIO = 0.42;
const DEG = Math.PI / 180;
const WALK_KEYS: Record<string, { walk: number; turn: number }> = {
  ArrowUp: { walk: 1, turn: 0 },
  ArrowDown: { walk: -1, turn: 0 },
  ArrowLeft: { walk: 0, turn: 1 },
  ArrowRight: { walk: 0, turn: -1 },
  w: { walk: 1, turn: 0 },
  s: { walk: -1, turn: 0 },
  a: { walk: 0, turn: 1 },
  d: { walk: 0, turn: -1 },
};

type OrientationReading = { alpha: number; beta: number; gamma: number };
type PlayPhase = 'waiting' | 'countdown' | 'playing' | 'over';
type Popup = { key: number; x: number; y: number; text: string };

function screenAngle(): number {
  const legacy = (window as Window & { orientation?: number }).orientation;
  return window.screen?.orientation?.angle ?? legacy ?? 0;
}

function formatClock(seconds: number): string {
  const whole = Math.max(0, seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
`;

const popIn = keyframes`
  0% { transform: scale(0.4); opacity: 0; }
  35% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const nudge = keyframes`
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(4px); }
`;

const floatUp = keyframes`
  0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
  20% { transform: translate(-50%, -90%) scale(1.15); opacity: 1; }
  100% { transform: translate(-50%, -220%) scale(1); opacity: 0; }
`;

const Stage = styled('div', { shouldForwardProp: (prop) => prop !== 'immersive' })<{ immersive: boolean }>(({ immersive }) => ({
  position: 'fixed',
  inset: 0,
  zIndex: 1300,
  background: immersive ? 'transparent' : '#1d0838',
  overflow: 'hidden',
  touchAction: 'none',
  overscrollBehavior: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
}));

const CameraVideo = styled('video')({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

const SceneCanvas = styled('canvas')({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
});

const TopBar = styled('div')({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 14px 0',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

const Spacer = styled('div')({
  flex: 1,
});

const Pill = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  height: 44,
  padding: '0 16px',
  borderRadius: 999,
  background: 'rgba(29, 8, 56, 0.72)',
  border: '2px solid rgba(255, 255, 255, 0.85)',
  color: '#fff',
  fontSize: 21,
  fontWeight: 900,
  direction: 'ltr',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
});

const TimerPill = styled(Pill, { shouldForwardProp: (prop) => prop !== 'low' })<{ low: boolean }>(({ low }) => ({
  minWidth: 92,
  justifyContent: 'center',
  background: low ? '#d62839' : 'rgba(29, 8, 56, 0.72)',
  animation: low ? `${pulse} 0.8s ease-in-out infinite` : 'none',
}));

const ClockFace = styled('span')({
  position: 'relative',
  width: 18,
  height: 18,
  borderRadius: '50%',
  border: '2.5px solid currentColor',
  boxSizing: 'border-box',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 5.5,
    top: 1.5,
    width: 2.5,
    height: 6,
    borderRadius: 2,
    background: 'currentColor',
  },
});

const CoinIcon = styled('span')({
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: 'radial-gradient(circle at 35% 30%, #fff3b0 0%, #ffcf33 50%, #e09a00 100%)',
  border: '2px solid #9a6200',
  boxSizing: 'border-box',
});

const ExitButton = styled('button')({
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: '2px solid rgba(255, 255, 255, 0.85)',
  background: 'rgba(29, 8, 56, 0.72)',
  color: '#fff',
  fontSize: 22,
  fontWeight: 900,
  lineHeight: 1,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
});

const Notice = styled('div')({
  position: 'absolute',
  top: 'calc(env(safe-area-inset-top, 0px) + 74px)',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'max-content',
  maxWidth: 'calc(100% - 32px)',
  padding: '9px 16px',
  borderRadius: 18,
  background: 'rgba(0, 0, 0, 0.62)',
  color: '#fff',
  fontSize: 15,
  fontWeight: 700,
  textAlign: 'center',
  lineHeight: 1.35,
});

const CountdownWrap = styled('div')({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
});

const CountdownBubble = styled('div')({
  minWidth: 132,
  height: 132,
  padding: '0 26px',
  borderRadius: 999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  background: 'linear-gradient(135deg, #8f63ff 0%, #d63384 100%)',
  border: '5px solid #fff',
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
  color: '#fff',
  fontSize: 64,
  fontWeight: 900,
  animation: `${popIn} 0.45s ease-out`,
});

const EdgeArrow = styled('div')({
  position: 'absolute',
  left: 0,
  top: 0,
  width: 22,
  height: 22,
  marginLeft: -11,
  marginTop: -11,
  display: 'none',
  pointerEvents: 'none',
  filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.55))',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    background: 'rgba(255, 255, 255, 0.92)',
    clipPath: 'polygon(30% 6%, 82% 50%, 30% 94%, 18% 80%, 54% 50%, 18% 20%)',
    animation: `${nudge} 1.1s ease-in-out infinite`,
  },
});

const BottomDock = styled('div')({
  position: 'absolute',
  left: '50%',
  bottom: 'calc(env(safe-area-inset-bottom, 0px) + 22px)',
  transform: 'translateX(-50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  pointerEvents: 'none',
});

const NearestTag = styled('div')({
  padding: '6px 14px',
  borderRadius: 999,
  background: 'rgba(29, 8, 56, 0.72)',
  border: '2px solid rgba(255, 255, 255, 0.85)',
  color: '#fff',
  fontSize: 15,
  fontWeight: 800,
  whiteSpace: 'nowrap',
  visibility: 'hidden',
});

const RadarCanvas = styled('canvas')({
  width: RADAR_SIZE_PX,
  height: RADAR_SIZE_PX,
  borderRadius: '50%',
  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.3)',
});

const PointsPopup = styled('div')({
  position: 'absolute',
  fontSize: 52,
  fontWeight: 900,
  color: '#ffd54f',
  WebkitTextStroke: '2px #1d0838',
  paintOrder: 'stroke fill',
  direction: 'ltr',
  pointerEvents: 'none',
  animation: `${floatUp} ${POPUP_MS}ms ease-out forwards`,
});

function drawRadar(canvas: HTMLCanvasElement, game: ArGameState | null, player: FloorPoint, camera: ArCamera, range: number) {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const size = Math.round(RADAR_SIZE_PX * ratio);
  if (canvas.width !== size) {
    canvas.width = size;
    canvas.height = size;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const half = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(29, 8, 56, 0.66)';
  ctx.beginPath();
  ctx.arc(half, half, half - 1.5 * ratio, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2.5 * ratio;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.2 * ratio;
  ctx.beginPath();
  ctx.arc(half, half, half * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  const cone = ctx.createRadialGradient(half, half, 0, half, half, half);
  cone.addColorStop(0, 'rgba(255, 255, 255, 0.32)');
  cone.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(half, half);
  ctx.arc(half, half, half - 3 * ratio, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(half, half - 7 * ratio);
  ctx.lineTo(half + 5.5 * ratio, half + 5 * ratio);
  ctx.lineTo(half - 5.5 * ratio, half + 5 * ratio);
  ctx.closePath();
  ctx.fill();
  const reach = half - 9 * ratio;
  for (const coin of game?.coins ?? []) {
    if (coin.collectedAt !== null) continue;
    const dot = radarDot(coin, player, camera, range);
    ctx.globalAlpha = dot.inRange ? 1 : 0.55;
    ctx.fillStyle = '#ffcf33';
    ctx.strokeStyle = '#7a4a00';
    ctx.lineWidth = 1.5 * ratio;
    ctx.beginPath();
    ctx.arc(half + dot.x * reach, half + dot.y * reach, (dot.inRange ? 5 : 3.5) * ratio, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

interface ArPlayfieldProps {
  settings: ArStationSettings;
  seed: number;
  session: XRSession | null;
  overlayRoot: HTMLElement;
  chime: CoinChime | null;
  onFinish: (collected: number) => void;
  onExit: () => void;
}

export default function ArPlayfield({ settings, seed, session, overlayRoot, chime, onFinish, onExit }: ArPlayfieldProps) {
  const t = useTranslations(texts);
  const immersive = session !== null;
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const radarRef = useRef<HTMLCanvasElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const nearestRef = useRef<HTMLDivElement>(null);
  const readingRef = useRef<OrientationReading | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const stepsRef = useRef<FloorPoint>({ x: 0, z: 0 });
  const headingRef = useRef<FloorPoint>({ x: 0, z: -1 });
  const phaseRef = useRef<PlayPhase>('waiting');
  const callbacksRef = useRef({ onFinish, onExit, chime, t });
  const [secondsLeft, setSecondsLeft] = useState(settings.timeLimitSeconds);
  const [collected, setCollected] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [tracking, setTracking] = useState(!immersive);
  const [walkHint, setWalkHint] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [over, setOver] = useState(false);
  const [popups, setPopups] = useState<Popup[]>([]);

  useEffect(() => {
    callbacksRef.current = { onFinish, onExit, chime, t };
  }, [onFinish, onExit, chime, t]);

  useEffect(() => {
    if (immersive) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraFailed(true);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((media) => {
        stream = media;
        const video = videoRef.current;
        if (stopped || !video) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = media;
        video.play().catch(() => undefined);
      })
      .catch(() => {
        if (!stopped) setCameraFailed(true);
      });
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [immersive]);

  useEffect(() => {
    if (immersive) return;
    const steps = createStepDetector();
    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      readingRef.current = { alpha: event.alpha ?? 0, beta: event.beta, gamma: event.gamma };
    };
    const onMotion = (event: DeviceMotionEvent) => {
      const a = event.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      if (!steps.push(Math.hypot(a.x, a.y, a.z), event.timeStamp) || phaseRef.current !== 'playing') return;
      stepsRef.current = { x: stepsRef.current.x + headingRef.current.x * STRIDE_M, z: stepsRef.current.z + headingRef.current.z * STRIDE_M };
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!WALK_KEYS[event.key]) return;
      event.preventDefault();
      keysRef.current.add(event.key);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key);
    };
    window.addEventListener('deviceorientation', onOrientation);
    window.addEventListener('devicemotion', onMotion);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation);
      window.removeEventListener('devicemotion', onMotion);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [immersive]);

  useEffect(() => {
    if (!tracking || phaseRef.current !== 'waiting') return;
    phaseRef.current = 'countdown';
    setCountdown(3);
  }, [tracking]);

  useEffect(() => {
    if (countdown === null) return;
    const id = window.setTimeout(() => {
      if (countdown > 0) {
        setCountdown(countdown - 1);
        if (countdown === 1) {
          phaseRef.current = 'playing';
          setWalkHint(true);
        }
      } else {
        setCountdown(null);
      }
    }, COUNTDOWN_STEP_MS);
    return () => window.clearTimeout(id);
  }, [countdown]);

  useEffect(() => {
    if (!walkHint) return;
    const id = window.setTimeout(() => setWalkHint(false), WALK_HINT_MS);
    return () => window.clearTimeout(id);
  }, [walkHint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const coins = createCoinScene(canvas);
    const { renderer, camera: threeCamera } = coins;
    const random = seededRandom(seed);
    const collectRadius = immersive ? COLLECT_RADIUS_TRACKED_M : COLLECT_RADIUS_STEPS_M;
    let game: ArGameState | null = null;
    let view: Quat = quatFromYawPitch(0, FALLBACK_PITCH_DEG);
    let yawFix: Quat | null = null;
    let manualYaw = 0;
    let player: FloorPoint = { x: 0, z: 0 };
    let floorY = immersive ? Number.NaN : 0;
    let eyeAtStart = Number.NaN;
    let lastTime: number | null = null;
    let shownSeconds = settings.timeLimitSeconds;
    let shownCollected = 0;
    let shownNearest = '';
    let finishTimer = 0;
    let finishing = false;
    let hitSource: XRHitTestSource | null = null;
    let popupKey = 0;

    if (session) {
      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType('local');
      renderer.xr.setSession(session).catch(() => callbacksRef.current.onExit());
      session
        .requestReferenceSpace('viewer')
        .then((viewer) => session.requestHitTestSource?.({ space: viewer }))
        .then((source) => {
          hitSource = source ?? null;
        })
        .catch(() => undefined);
    }
    const onSessionEnd = () => {
      if (!finishing) callbacksRef.current.onExit();
    };
    session?.addEventListener('end', onSessionEnd);

    const sensorCamera = (dt: number, width: number, height: number): ArCamera => {
      let turn = 0;
      let walk = 0;
      keysRef.current.forEach((key) => {
        turn += WALK_KEYS[key].turn;
        walk += WALK_KEYS[key].walk;
      });
      manualYaw += turn * KEY_TURN_DEG_PER_S * dt;
      const reading = readingRef.current;
      let target = quatFromYawPitch(manualYaw, FALLBACK_PITCH_DEG);
      if (reading) {
        const raw = quatFromDeviceOrientation(reading.alpha, reading.beta, reading.gamma, screenAngle());
        if (!yawFix) yawFix = quatFromAxisAngle({ x: 0, y: 1, z: 0 }, -yawOf(cameraFromQuat(raw)) * DEG);
        target = multiplyQuat(yawFix, raw);
      }
      view = easeQuat(view, target, ORIENTATION_EASE);
      const heading = floorForward(cameraFromQuat(view));
      headingRef.current = heading;
      if (walk !== 0 && phaseRef.current === 'playing') {
        stepsRef.current = { x: stepsRef.current.x + heading.x * walk * KEY_WALK_MPS * dt, z: stepsRef.current.z + heading.z * walk * KEY_WALK_MPS * dt };
      }
      const ease = Math.min(1, POSITION_EASE_RATE * dt);
      player = { x: player.x + (stepsRef.current.x - player.x) * ease, z: player.z + (stepsRef.current.z - player.z) * ease };
      const camera = cameraFromQuat(view, { x: player.x, y: EYE_HEIGHT_M, z: player.z });
      const video = videoRef.current;
      const focal = focalForViewport(width, height, video?.videoWidth, video?.videoHeight);
      threeCamera.fov = (2 * Math.atan(height / 2 / focal)) / DEG;
      threeCamera.aspect = width / height;
      threeCamera.position.set(camera.position.x, camera.position.y, camera.position.z);
      threeCamera.quaternion.set(view.x, view.y, view.z, view.w);
      threeCamera.updateProjectionMatrix();
      return camera;
    };

    const immersiveCamera = (frame: XRFrame): ArCamera | null => {
      const space = renderer.xr.getReferenceSpace();
      const pose = space ? frame.getViewerPose(space) : undefined;
      if (!space || !pose) return null;
      const { position, orientation } = pose.transform;
      if (Number.isNaN(eyeAtStart)) {
        eyeAtStart = position.y;
        floorY = position.y - EYE_HEIGHT_M;
      }
      const hit = hitSource ? frame.getHitTestResults(hitSource)[0]?.getPose(space) : undefined;
      if (hit && hit.transform.position.y < eyeAtStart - FLOOR_BELOW_EYE_M) floorY += (hit.transform.position.y - floorY) * FLOOR_EASE;
      player = { x: position.x, z: position.z };
      return cameraFromQuat({ x: orientation.x, y: orientation.y, z: orientation.z, w: orientation.w }, { x: position.x, y: position.y, z: position.z });
    };

    const finish = (total: number) => {
      finishing = true;
      finishTimer = window.setTimeout(() => {
        const done = () => callbacksRef.current.onFinish(total);
        if (session) session.end().then(done, done);
        else done();
      }, FINISH_DELAY_MS);
    };

    const frame = (timeMs: number, xrFrame?: XRFrame) => {
      const time = timeMs / 1000;
      const dt = lastTime === null ? 0 : Math.min(MAX_STEP_S, time - lastTime);
      lastTime = time;
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (!renderer.xr.isPresenting) renderer.setSize(width, height, false);
      const camera = xrFrame ? immersiveCamera(xrFrame) : sensorCamera(dt, width, height);
      if (!camera) {
        coins.render();
        return;
      }
      if (immersive && phaseRef.current === 'waiting') setTracking(true);
      if (!game) game = createArGame(settings.coinCount, player, floorForward(camera), settings.areaRadiusMeters, random);

      if (phaseRef.current === 'playing') {
        game = stepArGame(game, player, dt, collectRadius).state;
        if (isArGameOver(game, settings.timeLimitSeconds)) {
          phaseRef.current = 'over';
          setOver(true);
          finish(collectedCount(game));
        }
      }

      const seconds = Math.ceil(settings.timeLimitSeconds - game.elapsedSeconds);
      if (seconds !== shownSeconds) {
        shownSeconds = seconds;
        setSecondsLeft(seconds);
      }
      const total = collectedCount(game);
      if (total !== shownCollected) {
        shownCollected = total;
        setCollected(total);
      }

      const newlyCollected = coins.update(game, time, dt, floorY);
      for (let i = 0; i < newlyCollected; i++) {
        callbacksRef.current.chime?.play();
        navigator.vibrate?.(30);
        if (settings.pointsPerCoin <= 0) continue;
        const key = ++popupKey;
        setPopups((list) => [...list, { key, x: width / 2, y: height * POPUP_HEIGHT_RATIO, text: `+${settings.pointsPerCoin}` }]);
        window.setTimeout(() => setPopups((list) => list.filter((popup) => popup.key !== key)), POPUP_MS);
      }

      const nearest = phaseRef.current === 'over' ? null : nearestCoin(game, player);
      const arrow = arrowRef.current;
      if (arrow) {
        const viewport = { width, height, focal: coins.focalPixels(height) };
        const marker = nearest ? edgeMarker({ x: nearest.coin.x, y: floorY + COIN_HEIGHT_M, z: nearest.coin.z }, camera, viewport, ARROW_INSET_PX) : null;
        arrow.style.display = marker && !marker.onScreen ? 'block' : 'none';
        if (marker && !marker.onScreen) arrow.style.transform = `translate(${marker.x}px, ${marker.y}px) rotate(${marker.angle}rad)`;
      }
      const label = nearest ? callbacksRef.current.t.nearest(nearest.meters.toFixed(1)) : '';
      if (nearestRef.current && label !== shownNearest) {
        shownNearest = label;
        nearestRef.current.textContent = label;
        nearestRef.current.style.visibility = label ? 'visible' : 'hidden';
      }
      if (radarRef.current) drawRadar(radarRef.current, game, player, camera, settings.areaRadiusMeters * RADAR_RANGE_FACTOR);
      coins.render();
    };

    renderer.setAnimationLoop(frame);
    return () => {
      window.clearTimeout(finishTimer);
      session?.removeEventListener('end', onSessionEnd);
      if (session && !finishing) session.end().catch(() => undefined);
      coins.dispose();
    };
  }, [settings, seed, session, immersive]);

  const notice = cameraFailed ? t.noCamera : !tracking ? t.scanRoom : walkHint ? (immersive ? t.walkHintTracked : t.walkHintSteps) : '';

  return createPortal(
    <Stage ref={stageRef} immersive={immersive}>
      {!immersive && <CameraVideo ref={videoRef} playsInline muted autoPlay />}
      <SceneCanvas ref={canvasRef} />
      <EdgeArrow ref={arrowRef} />
      {popups.map((popup) => (
        <PointsPopup key={popup.key} style={{ left: popup.x, top: popup.y }}>{popup.text}</PointsPopup>
      ))}
      <TopBar>
        <ExitButton type="button" aria-label={t.exit} onClick={onExit}>✕</ExitButton>
        <Spacer />
        <Pill aria-live="polite">
          <CoinIcon />
          {collected}/{settings.coinCount}
        </Pill>
        <TimerPill low={secondsLeft <= LOW_TIME_SECONDS && !over}>
          <ClockFace />
          {formatClock(secondsLeft)}
        </TimerPill>
      </TopBar>
      {notice && !over && <Notice>{notice}</Notice>}
      {countdown !== null && (
        <CountdownWrap>
          <CountdownBubble key={countdown}>{countdown > 0 ? countdown : t.go}</CountdownBubble>
        </CountdownWrap>
      )}
      {!over && (
        <BottomDock>
          <NearestTag ref={nearestRef} />
          <RadarCanvas ref={radarRef} aria-label={t.radar} />
        </BottomDock>
      )}
    </Stage>,
    overlayRoot,
  );
}
