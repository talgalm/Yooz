import { useState, useRef, useEffect, useCallback } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { golfTexts } from './GolfChallenge.i18n';

// ─── Constants ───

const MAX_HITS = 7;
const FRICTION = 0.982;
const HILL_FRICTION = 0.94;       // slows ball when climbing toward hill center
const DOWNHILL_BOOST = 1.025;     // speeds ball up when going downhill
const WALL_DAMPEN = 0.65;
const MIN_VELOCITY = 0.25;
const HOLE_RADIUS = 22;
const HOLE_SPEED = 4;
const BALL_R = 15;
const SPEED_FACTOR = 0.28;
const MAX_SPEED = 14;
const BONUS_PER_SAVED = 5;
const MAX_DRAG_DIST = MAX_SPEED / SPEED_FACTOR; // ~50px

const COURSE_W = 340;
const COURSE_H = 520;

const BALL_START = { x: 170, y: 460 };
/** Desktop: tee higher so the ball + swipe room stay above the skip button. */
const BALL_START_DESKTOP = { x: 170, y: 400 };
const DESKTOP_MQ = '(min-width: 768px)';

// ─── Hills layout (2x size) ───
// Flag hill: top-right area — hole lives on this hill
const FLAG_HILL = { cx: 210, cy: 110, r: 130 };
// Regular hill: left-center
const REGULAR_HILL = { cx: 90, cy: 280, r: 120 };
// Small hill (uses regular hill SVG): right-center-lower
const SMALL_HILL = { cx: 230, cy: 380, r: 80 };

const HILLS = [FLAG_HILL, REGULAR_HILL, SMALL_HILL];

// Hole is on the flag hill — offset slightly up-right to match the dark spot in the SVG
const HOLE_POS = { x: FLAG_HILL.cx + 15, y: FLAG_HILL.cy - 20 };

// Hill image dimensions for positioning (2x previous sizes)
const FLAG_HILL_W = 340;
const FLAG_HILL_H = 340;
const REGULAR_HILL_W = 320;
const REGULAR_HILL_H = 320;
const SMALL_HILL_W = 220;
const SMALL_HILL_H = 220;

// ─── Types ───

interface GolfChallengeProps {
  onComplete: (bonusScore: number) => void;
  onSkip: () => void;
}

// ─── Component ───

export default function GolfChallenge({ onComplete, onSkip }: GolfChallengeProps) {
  const t = useTranslations(golfTexts);

  // Golf swing sound
  const swingSoundRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    swingSoundRef.current = new Audio('/sounds/golf-swing.mp3');
    swingSoundRef.current.volume = 0.7;
    return () => { swingSoundRef.current = null; };
  }, []);
  const playSwing = () => {
    if (swingSoundRef.current) {
      swingSoundRef.current.currentTime = 0;
      swingSoundRef.current.play().catch(() => {});
    }
  };

  const [hits, setHits] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'success' | 'failed'>('playing');
  const [aimLine, setAimLine] = useState<{ x: number; y: number; strength: number } | null>(null);
  const [scaleXY, setScaleXY] = useState({ sx: 1, sy: 1, offsetX: 0 });
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches
  );

  const ballStart = isDesktop ? BALL_START_DESKTOP : BALL_START;
  const ballPos = useRef({ ...ballStart });
  const ballVel = useRef({ vx: 0, vy: 0 });
  const ballRef = useRef<HTMLDivElement>(null);
  const courseRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef(0);
  const isMoving = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const hitsRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // ─── Measure available space and compute scale to fill 100% ───
  useEffect(() => {
    const el = scalerRef.current;
    if (!el) return;
    const update = () => {
      const computed = getComputedStyle(el);
      const padX =
        (parseFloat(computed.paddingLeft) || 0) + (parseFloat(computed.paddingRight) || 0);
      const padY =
        (parseFloat(computed.paddingTop) || 0) + (parseFloat(computed.paddingBottom) || 0);
      const width = el.clientWidth - padX;
      const height = el.clientHeight - padY;
      if (width > 0 && height > 0) {
        const desktop = window.matchMedia(DESKTOP_MQ).matches;
        if (desktop) {
          // Uniform scale + horizontal centering keeps the full course (and ball)
          // visible on wide screens; non-uniform stretch was clipping the tee.
          const sx = width / COURSE_W;
          const sy = height / COURSE_H;
          const s = Math.min(sx, sy);
          setScaleXY({
            sx: s,
            sy: s,
            offsetX: (width - COURSE_W * s) / 2,
          });
        } else {
          setScaleXY({ sx: width / COURSE_W, sy: height / COURSE_H, offsetX: 0 });
        }
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isDesktop]);

  // ─── Ball DOM update (no React re-render) ───
  const updateBallDOM = useCallback(() => {
    if (ballRef.current) {
      ballRef.current.style.transform = `translate(${ballPos.current.x - BALL_R}px, ${ballPos.current.y - BALL_R}px)`;
    }
  }, []);

  // ─── Hill physics helper ───
  // Returns: which hill the ball is on (if any), distance from center, and
  // whether ball is moving toward center (uphill) or away (downhill)
  const getHillEffect = useCallback((x: number, y: number, vx: number, vy: number) => {
    for (const hill of HILLS) {
      const dx = x - hill.cx;
      const dy = y - hill.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < hill.r + BALL_R) {
        // Dot product of velocity and direction-from-center
        // Positive = moving away from center (downhill)
        // Negative = moving toward center (uphill)
        const dot = dist > 0 ? (vx * dx / dist + vy * dy / dist) : 0;
        return { onHill: true, dist, hill, goingDownhill: dot > 0 };
      }
    }
    return { onHill: false, dist: 0, hill: null, goingDownhill: false };
  }, []);

  const inHole = useCallback((x: number, y: number, speed: number) => {
    const dx = x - HOLE_POS.x;
    const dy = y - HOLE_POS.y;
    return dx * dx + dy * dy < HOLE_RADIUS * HOLE_RADIUS && speed < HOLE_SPEED;
  }, []);

  // ─── Physics loop ───
  const physicsLoop = useCallback(() => {
    const pos = ballPos.current;
    const vel = ballVel.current;

    // Apply velocity
    pos.x += vel.vx;
    pos.y += vel.vy;

    // Wall bouncing
    if (pos.x < BALL_R) { pos.x = BALL_R; vel.vx = -vel.vx * WALL_DAMPEN; }
    if (pos.x > COURSE_W - BALL_R) { pos.x = COURSE_W - BALL_R; vel.vx = -vel.vx * WALL_DAMPEN; }
    if (pos.y < BALL_R) { pos.y = BALL_R; vel.vy = -vel.vy * WALL_DAMPEN; }
    if (pos.y > COURSE_H - BALL_R) { pos.y = COURSE_H - BALL_R; vel.vy = -vel.vy * WALL_DAMPEN; }

    const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);

    // Hole check — animate ball sinking into hole
    if (inHole(pos.x, pos.y, speed)) {
      vel.vx = 0;
      vel.vy = 0;
      pos.x = HOLE_POS.x;
      pos.y = HOLE_POS.y;
      isMoving.current = false;
      updateBallDOM();
      // Animate: shrink + drop into hole
      if (ballRef.current) {
        const el = ballRef.current;
        el.style.transition = 'transform 0.35s ease-in, opacity 0.35s ease-in';
        el.style.transform = `translate(${pos.x - BALL_R}px, ${pos.y - BALL_R + 6}px) scale(0.3)`;
        el.style.opacity = '0';
      }
      setTimeout(() => setGameState('success'), 400);
      return;
    }

    // Hill physics + friction
    const hillFx = getHillEffect(pos.x, pos.y, vel.vx, vel.vy);
    if (hillFx.onHill) {
      if (hillFx.goingDownhill) {
        // Going away from hill center — boost speed
        vel.vx *= DOWNHILL_BOOST;
        vel.vy *= DOWNHILL_BOOST;
      } else {
        // Going toward hill center — extra friction (slow down)
        vel.vx *= HILL_FRICTION;
        vel.vy *= HILL_FRICTION;
      }
    } else {
      // Normal grass friction
      vel.vx *= FRICTION;
      vel.vy *= FRICTION;
    }

    // Stop check
    if (speed < MIN_VELOCITY) {
      vel.vx = 0;
      vel.vy = 0;
      isMoving.current = false;
      updateBallDOM();
      if (hitsRef.current >= MAX_HITS) {
        setGameState('failed');
      }
      return;
    }

    updateBallDOM();
    animRef.current = requestAnimationFrame(physicsLoop);
  }, [inHole, getHillEffect, updateBallDOM]);

  // Initial ball position (re-seat when switching mobile ↔ desktop)
  useEffect(() => {
    const start = isDesktop ? BALL_START_DESKTOP : BALL_START;
    ballPos.current = { ...start };
    ballVel.current = { vx: 0, vy: 0 };
    isMoving.current = false;
    if (ballRef.current) {
      ballRef.current.style.transition = '';
      ballRef.current.style.opacity = '1';
    }
    updateBallDOM();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isDesktop, updateBallDOM]);

  // ─── Shared hit calculation ───
  const calcHit = (startPos: { x: number; y: number }, endPos: { x: number; y: number }) => {
    const dx = startPos.x - endPos.x;
    const dy = startPos.y - endPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) return null;

    let speed = dist * SPEED_FACTOR;
    if (speed > MAX_SPEED) speed = MAX_SPEED;
    const nx = dx / dist;
    const ny = dy / dist;
    return { vx: nx * speed, vy: ny * speed };
  };

  const fireHit = (vel: { vx: number; vy: number }) => {
    ballVel.current = vel;
    isMoving.current = true;
    hitsRef.current += 1;
    setHits(hitsRef.current);
    playSwing();
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(physicsLoop);
  };

  const calcAim = (startPos: { x: number; y: number }, currentPos: { x: number; y: number }) => {
    const dx = startPos.x - currentPos.x;
    const dy = startPos.y - currentPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const strength = Math.min(dist / MAX_DRAG_DIST, 1);
    setAimLine({
      x: ballPos.current.x + dx * 0.6,
      y: ballPos.current.y + dy * 0.6,
      strength,
    });
  };

  // ─── Coordinate conversion (screen pixels → internal course coords) ───
  const toCoursePx = useCallback((clientX: number, clientY: number) => {
    if (!courseRef.current) return { x: 0, y: 0 };
    const rect = courseRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * COURSE_W / rect.width,
      y: (clientY - rect.top) * COURSE_H / rect.height,
    };
  }, []);

  // ─── Touch handlers ───
  const getCoursePos = useCallback((touch: React.Touch) => {
    return toCoursePx(touch.clientX, touch.clientY);
  }, [toCoursePx]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isMoving.current || gameState !== 'playing') return;
    e.preventDefault();
    const pos = getCoursePos(e.touches[0]);
    const dx = pos.x - ballPos.current.x;
    const dy = pos.y - ballPos.current.y;
    if (dx * dx + dy * dy > 70 * 70) return;
    touchStart.current = pos;
  }, [gameState, getCoursePos]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || isMoving.current) return;
    e.preventDefault();
    const pos = getCoursePos(e.touches[0]);
    calcAim(touchStart.current, pos);
  }, [getCoursePos]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || isMoving.current || gameState !== 'playing') {
      touchStart.current = null;
      setAimLine(null);
      return;
    }
    const pos = getCoursePos(e.changedTouches[0]);
    const vel = calcHit(touchStart.current, pos);
    touchStart.current = null;
    setAimLine(null);
    if (vel) fireHit(vel);
  }, [gameState, getCoursePos, physicsLoop]);

  // ─── Mouse handlers (for desktop testing) ───
  const mouseDown = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMoving.current || gameState !== 'playing') return;
    const pos = toCoursePx(e.clientX, e.clientY);
    const dx = pos.x - ballPos.current.x;
    const dy = pos.y - ballPos.current.y;
    if (dx * dx + dy * dy > 70 * 70) return;
    touchStart.current = pos;
    mouseDown.current = true;
  }, [gameState, toCoursePx]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseDown.current || !touchStart.current || isMoving.current) return;
    const pos = toCoursePx(e.clientX, e.clientY);
    calcAim(touchStart.current, pos);
  }, [toCoursePx]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!mouseDown.current || !touchStart.current || isMoving.current || gameState !== 'playing') {
      touchStart.current = null;
      mouseDown.current = false;
      setAimLine(null);
      return;
    }
    const pos = toCoursePx(e.clientX, e.clientY);
    const vel = calcHit(touchStart.current, pos);
    touchStart.current = null;
    mouseDown.current = false;
    setAimLine(null);
    if (vel) fireHit(vel);
  }, [gameState, toCoursePx, physicsLoop]);

  // ─── Result handling ───
  const handleContinue = () => {
    if (gameState === 'success') {
      onComplete(25);
    } else {
      onComplete(0);
    }
  };

  return (
    <GolfContainer dir="rtl">
      {/* Header (glass effect, black border — matches order game) */}
      <GolfHeader>
        <TitleBadge>
          <span style={{ fontSize: 20 }}>⛳</span>
          <HeaderTitle>{t.title}</HeaderTitle>
        </TitleBadge>
        <HitCounter>{t.hits}: {hits}</HitCounter>
      </GolfHeader>

      {/* Instruction text */}
      <TapToHit>{t.tapToHit}</TapToHit>

      {/* Scalable course area — fills remaining space */}
      <CourseScaler ref={scalerRef}>
        <CourseWrapper
          ref={courseRef}
          style={{
            transform: `translate(${scaleXY.offsetX}px, 0) scale(${scaleXY.sx}, ${scaleXY.sy})`,
            transformOrigin: 'top left',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { mouseDown.current = false; touchStart.current = null; setAimLine(null); }}
        >
          {/* Hill with flag (top-right) — hole is here */}
          <HillImage
            src="/images/golf-hill-flag.svg"
            style={{
              left: FLAG_HILL.cx - FLAG_HILL_W / 2,
              top: FLAG_HILL.cy - FLAG_HILL_H / 2,
              width: FLAG_HILL_W,
              height: FLAG_HILL_H,
            }}
            draggable={false}
          />

          {/* Regular hill (left-center) */}
          <HillImage
            src="/images/golf-hill-regular.svg"
            style={{
              left: REGULAR_HILL.cx - REGULAR_HILL_W / 2,
              top: REGULAR_HILL.cy - REGULAR_HILL_H / 2,
              width: REGULAR_HILL_W,
              height: REGULAR_HILL_H,
            }}
            draggable={false}
          />

          {/* Small hill (right-lower) — uses regular hill SVG */}
          <HillImage
            src="/images/golf-hill-regular.svg"
            style={{
              left: SMALL_HILL.cx - SMALL_HILL_W / 2,
              top: SMALL_HILL.cy - SMALL_HILL_H / 2,
              width: SMALL_HILL_W,
              height: SMALL_HILL_H,
            }}
            draggable={false}
          />

          {/* Trail dots — white golf-style power indicator */}
          {aimLine && (
            <svg style={{ position: 'absolute', inset: 0, width: COURSE_W, height: COURSE_H, zIndex: 5, pointerEvents: 'none' }}>
              {Array.from({ length: 12 }).map((_, i) => {
                const dotCount = Math.max(3, Math.round(aimLine.strength * 12));
                if (i >= dotCount) return null;
                const frac = (i + 1) / (dotCount + 1);
                const cx = ballPos.current.x + (aimLine.x - ballPos.current.x) * frac;
                const cy = ballPos.current.y + (aimLine.y - ballPos.current.y) * frac;
                const r = 7 * (1 - i * 0.06);
                const opacity = 0.95 - i * 0.06;
                return (
                  <circle key={i} cx={cx} cy={cy} r={Math.max(r, 2.5)}
                    fill="#fff" opacity={Math.max(opacity, 0.2)}
                  />
                );
              })}
              {(() => {
                const dx = aimLine.x - ballPos.current.x;
                const dy = aimLine.y - ballPos.current.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len < 12) return null;
                const nx = dx / len;
                const ny = dy / len;
                const tipX = aimLine.x;
                const tipY = aimLine.y;
                const s = 10;
                return (
                  <polygon
                    points={`${tipX},${tipY} ${tipX - s * nx + s * 0.5 * ny},${tipY - s * ny - s * 0.5 * nx} ${tipX - s * nx - s * 0.5 * ny},${tipY - s * ny + s * 0.5 * nx}`}
                    fill="#fff" opacity={0.9}
                  />
                );
              })()}
            </svg>
          )}

          {/* Flashing drag hint — only before the first hit, and never while aiming */}
          {gameState === 'playing' && hits === 0 && !aimLine && (() => {
            const tailY = ballStart.y + BALL_R + 8;
            const tipY = Math.min(ballStart.y + 100, COURSE_H - 8);
            if (tipY - tailY < 20) return null;
            const head = 13;
            return (
              <HintArrow width={COURSE_W} height={COURSE_H}>
                <line
                  x1={ballStart.x} y1={tailY} x2={ballStart.x} y2={tipY - head}
                  stroke="#fff" strokeWidth={5} strokeLinecap="round"
                />
                <polygon
                  points={`${ballStart.x},${tipY} ${ballStart.x - head * 0.7},${tipY - head} ${ballStart.x + head * 0.7},${tipY - head}`}
                  fill="#fff"
                />
              </HintArrow>
            );
          })()}

          {/* Ball */}
          <BallEl ref={ballRef} />
        </CourseWrapper>
      </CourseScaler>

      {/* Skip button */}
      {gameState === 'playing' && (
        <SkipBtn onClick={onSkip}>{t.skip}</SkipBtn>
      )}

      {/* Full-screen result — replaces entire background */}
      {gameState !== 'playing' && (
        <ResultScreen>
          {gameState === 'success' ? (
            <img src="/images/golf-success-badge.png" alt="כל הכבוד" style={{ width: 'clamp(260px, 80%, 380px)', objectFit: 'contain' }} />
          ) : (
            <ResultTitle>{t.failed}</ResultTitle>
          )}
          <GoldContinueBtn onClick={handleContinue}>{t.continueBtn}</GoldContinueBtn>
        </ResultScreen>
      )}
    </GolfContainer>
  );
}

// ─── Styled Components ───

const LEAF_BANNER_BG = '#3d6b4f';
const LEAF_BANNER_DARK = '#2e5a3e';
const FINISH_PURPLE = '#6c5ce7';

const GolfContainer = styled('div')({
  flex: 1,
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: 'transparent',
  overflow: 'hidden',
  padding: '8px 12px 10px',
  boxSizing: 'border-box',
  position: 'relative',
  '@media (min-width: 768px)': {
    alignSelf: 'stretch',
    paddingBottom: 4,
  },
});

const GolfHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '5px 10px',
  zIndex: 2,
  background: 'rgba(255,255,255,0.75)',
  borderRadius: 10,
  border: '2px solid #000000',
  boxSizing: 'border-box',
  backdropFilter: 'blur(4px)',
  flexShrink: 0,
  marginBottom: 6,
});

const TitleBadge = styled('div')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
});

const HeaderTitle = styled('div')({
  fontSize: 18,
  fontWeight: 800,
  color: '#2c3e50',
});

const HitCounter = styled('div')({
  fontSize: 14,
  fontWeight: 700,
  color: '#2c3e50',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
});

const TapToHit = styled('div')({
  background: `linear-gradient(135deg, ${LEAF_BANNER_BG} 0%, ${LEAF_BANNER_DARK} 100%)`,
  color: '#fff',
  textAlign: 'center',
  padding: '6px 18px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  marginTop: 6,
  marginBottom: 4,
  boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
  position: 'relative',
  zIndex: 2,
  transform: 'rotate(-1deg)',
  flexShrink: 0,
});

/** Fills remaining vertical space so the course can scale into it */
const CourseScaler = styled('div')({
  flex: 1,
  width: '100%',
  minHeight: 0,
  position: 'relative',
  overflow: 'hidden',
  '@media (min-width: 768px)': {
    // Keep the tee above the skip button on laptop viewports.
    paddingBottom: 12,
    boxSizing: 'border-box',
  },
});

const CourseWrapper = styled('div')({
  position: 'absolute',
  top: 0,
  left: 0,
  width: COURSE_W,
  height: COURSE_H,
  overflow: 'hidden',
  touchAction: 'none',
  userSelect: 'none',
  zIndex: 1,
  cursor: 'crosshair',
});

const HillImage = styled('img')({
  position: 'absolute',
  zIndex: 2,
  pointerEvents: 'none',
  objectFit: 'contain',
});

const flashHint = keyframes`
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
`;

/** First-hit hint: points from the ball down-course — the way to drag, i.e. the
 *  opposite of where the ball will fly. Hidden as soon as the player aims. */
const HintArrow = styled('svg')({
  position: 'absolute',
  inset: 0,
  zIndex: 6,
  pointerEvents: 'none',
  animation: `${flashHint} 1.1s ease-in-out infinite`,
});

const BallEl = styled('div')({
  position: 'absolute',
  width: BALL_R * 2,
  height: BALL_R * 2,
  borderRadius: '50%',
  backgroundImage: 'url(/images/order-golf-ball.svg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  boxShadow: '2px 4px 6px rgba(0,0,0,0.35)',
  zIndex: 10,
  top: 0,
  left: 0,
});

// ─── Overlays ───

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
`;

const ResultScreen = styled('div')({
  position: 'fixed',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundImage: 'url(/images/golf-success-bg.jpg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  zIndex: 30,
  animation: `${fadeIn} 0.4s ease`,
  padding: 16,
  boxSizing: 'border-box',
  gap: 16,
});

const floatIn = keyframes`
  from { opacity: 0; transform: translateY(30px) scale(0.9); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const ResultTitle = styled('div')({
  fontFamily: "'Rubik', sans-serif",
  fontSize: 48,
  fontWeight: 400,
  lineHeight: 1.12,
  letterSpacing: '0.02em',
  color: '#ffffff',
  WebkitTextStroke: '4px #155724',
  paintOrder: 'stroke fill',
  textAlign: 'center',
  animation: `${floatIn} 0.5s ease-out`,
});

const feedbackPop = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
`;


const GoldContinueBtn = styled('button')({
  minWidth: 'clamp(160px, 52%, 240px)',
  background: 'linear-gradient(180deg, #5cb85c 0%, #28a745 48%, #1e7e34 100%)',
  color: '#fff',
  fontSize: 'clamp(1.35rem, 4.2vw, 1.65rem)',
  fontWeight: 800,
  padding: 'clamp(12px, 3vw, 16px) clamp(36px, 10vw, 52px)',
  borderRadius: 16,
  border: '5px solid #155724',
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 6px 0 #0f3d18, 0 12px 24px rgba(0,0,0,0.28)',
  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  textShadow: '0 1px 0 rgba(0,0,0,0.2)',
  animation: `${floatIn} 0.5s ease-out 0.22s both`,
  '&:active': {
    transform: 'translateY(4px)',
    boxShadow: '0 2px 0 #0f3d18, 0 4px 10px rgba(0,0,0,0.3)',
  },
});

const SkipBtn = styled('button')({
  marginTop: 'auto',
  padding: '8px 20px',
  fontSize: 15,
  fontWeight: 700,
  color: '#2c3e50',
  background: 'rgba(255,255,255,0.75)',
  border: '2px solid #000000',
  borderRadius: 12,
  cursor: 'pointer',
  zIndex: 2,
  backdropFilter: 'blur(4px)',
  boxShadow: '0 2px 0 #333',
  fontFamily: 'inherit',
  flexShrink: 0,
  marginBottom: 8,
  '&:active': {
    transform: 'translateY(2px)',
    boxShadow: '0 0 0 #333',
  },
});
