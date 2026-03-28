import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { styled, keyframes } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { golfTexts } from './GolfChallenge.i18n';

// ─── Constants ───

const MAX_HITS = 7;
const FRICTION = 0.982;
const SAND_FRICTION = 0.93;
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

const BALL_START = { x: 170, y: 450 };
const HOLE_POS = { x: 240, y: 75 };

const SAND_TRAPS = [
  { cx: 85, cy: 240, r: 55 },
  { cx: 230, cy: 370, r: 45 },
];

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
  const [scaleXY, setScaleXY] = useState({ sx: 1, sy: 1 });

  const ballPos = useRef({ ...BALL_START });
  const ballVel = useRef({ vx: 0, vy: 0 });
  const ballRef = useRef<HTMLDivElement>(null);
  const courseRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef(0);
  const isMoving = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const hitsRef = useRef(0);

  // ─── Measure available space and compute scale to fill 100% ───
  useEffect(() => {
    const el = scalerRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setScaleXY({ sx: width / COURSE_W, sy: height / COURSE_H });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ─── Ball DOM update (no React re-render) ───
  const updateBallDOM = useCallback(() => {
    if (ballRef.current) {
      ballRef.current.style.transform = `translate(${ballPos.current.x - BALL_R}px, ${ballPos.current.y - BALL_R}px)`;
    }
  }, []);

  // ─── Collision helpers ───
  const inSand = useCallback((x: number, y: number) => {
    return SAND_TRAPS.some((s) => {
      const dx = x - s.cx;
      const dy = y - s.cy;
      return dx * dx + dy * dy < (s.r + BALL_R) * (s.r + BALL_R);
    });
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

    // Hole check
    if (inHole(pos.x, pos.y, speed)) {
      vel.vx = 0;
      vel.vy = 0;
      pos.x = HOLE_POS.x;
      pos.y = HOLE_POS.y;
      isMoving.current = false;
      updateBallDOM();
      setGameState('success');
      return;
    }

    // Friction
    const fric = inSand(pos.x, pos.y) ? SAND_FRICTION : FRICTION;
    vel.vx *= fric;
    vel.vy *= fric;

    // Stop check
    if (speed < MIN_VELOCITY) {
      vel.vx = 0;
      vel.vy = 0;
      isMoving.current = false;
      updateBallDOM();
      // Check if out of hits
      if (hitsRef.current >= MAX_HITS) {
        setGameState('failed');
      }
      return;
    }

    updateBallDOM();
    animRef.current = requestAnimationFrame(physicsLoop);
  }, [inSand, inHole, updateBallDOM]);

  // Initial ball position
  useEffect(() => {
    updateBallDOM();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

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
    // rect is the *visual* (scaled) box; map back to the 340×520 internal coords
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
      onComplete((MAX_HITS - hitsRef.current) * BONUS_PER_SAVED);
    } else {
      onComplete(0);
    }
  };

  // ─── Render ───
  const bonus = gameState === 'success' ? (MAX_HITS - hitsRef.current) * BONUS_PER_SAVED : 0;

  // Trail uses white dots for visibility on green grass

  return createPortal(
    <GolfContainer dir="rtl">
      {/* Header (glass effect) */}
      <GolfHeader>
        <TitleBadge>
          <span style={{ fontSize: 20 }}>⛳</span>
          <HeaderTitle>{t.title}</HeaderTitle>
        </TitleBadge>
        <HitCounter>{t.hits}: {hits}</HitCounter>
      </GolfHeader>

      {/* Instruction text */}
      <TapToHit>{t.tapToHit}</TapToHit>

      {/* Scalable course area — fills remaining screen */}
      <CourseScaler ref={scalerRef}>
        <CourseWrapper
          ref={courseRef}
          style={{ transform: `scale(${scaleXY.sx}, ${scaleXY.sy})`, transformOrigin: 'top left' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { mouseDown.current = false; touchStart.current = null; setAimLine(null); }}
        >
          {/* Geometric grass pattern */}
          <CourseGrass />
          <GrassShadeTop />
          <GrassShadeBottom />

          {/* Sand traps */}
          {SAND_TRAPS.map((s, i) => (
            <SandTrapEl key={i} style={{ left: s.cx - s.r, top: s.cy - s.r, width: s.r * 2, height: s.r * 2 }} />
          ))}

          {/* Hole + flag */}
          <HoleEl style={{ left: HOLE_POS.x - 30, top: HOLE_POS.y - 30 }}>
            <HoleInner />
            <FlagEmoji>🚩</FlagEmoji>
          </HoleEl>

          {/* Trail dots — white golf-style power indicator */}
          {aimLine && (
            <svg style={{ position: 'absolute', inset: 0, width: COURSE_W, height: COURSE_H, zIndex: 5, pointerEvents: 'none' }}>
              {/* White trail of dots from ball toward aim direction */}
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
              {/* Arrow tip at end */}
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

          {/* Ball */}
          <BallEl ref={ballRef} sunk={gameState === 'success'} />

          {/* Success / Failed overlay */}
          {gameState !== 'playing' && (
            <ResultOverlay>
              <ResultEmoji>{gameState === 'success' ? '🏌️' : '😔'}</ResultEmoji>
              <ResultText success={gameState === 'success'}>
                {gameState === 'success' ? t.success : t.failed}
              </ResultText>
              {gameState === 'success' && bonus > 0 && (
                <BonusBadge>+{bonus} {t.bonus}</BonusBadge>
              )}
              <ContinueBtn onClick={handleContinue}>{t.continueBtn}</ContinueBtn>
            </ResultOverlay>
          )}
        </CourseWrapper>
      </CourseScaler>

      {/* Skip button */}
      {gameState === 'playing' && (
        <SkipBtn onClick={onSkip}>{t.skip}</SkipBtn>
      )}
    </GolfContainer>,
    document.body,
  );
}

// ─── Styled Components ───

// Nature theme colors
const BOX_BORDER = '#4a6572';
const GRASS_DARK = '#3a5a1a';
const GRASS_LIGHT = '#5a822b';
const LEAF_BANNER_BG = '#3d6b4f';
const LEAF_BANNER_DARK = '#2e5a3e';
const FINISH_PURPLE = '#6c5ce7';

const GolfContainer = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: GRASS_DARK,
  overflow: 'hidden',
});

const GolfHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '6px 12px',
  zIndex: 2,
  background: 'rgba(255,255,255,0.75)',
  margin: '4px 10px 0',
  borderRadius: 10,
  border: `2px solid ${BOX_BORDER}`,
  boxSizing: 'border-box',
  backdropFilter: 'blur(4px)',
  flexShrink: 0,
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

const CourseGrass = styled('div')({
  position: 'absolute',
  inset: 0,
  background: GRASS_DARK,
});

const GrassShadeTop = styled('div')({
  position: 'absolute',
  width: '100%',
  height: '50%',
  background: GRASS_LIGHT,
  clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
  zIndex: 1,
});

const GrassShadeBottom = styled('div')({
  position: 'absolute',
  bottom: 0,
  width: '100%',
  height: '50%',
  background: GRASS_LIGHT,
  clipPath: 'polygon(50% 0, 0 100%, 100% 100%)',
  zIndex: 1,
});

const SandTrapEl = styled('div')({
  position: 'absolute',
  borderRadius: '50%',
  background: 'radial-gradient(circle, #e6a430 30%, #c98520 80%)',
  boxShadow: 'inset 0 3px 10px rgba(0,0,0,0.25)',
  zIndex: 2,
});

const HoleEl = styled('div')({
  position: 'absolute',
  width: 60,
  height: 60,
  zIndex: 3,
});

const HoleInner = styled('div')({
  width: 60,
  height: 60,
  borderRadius: '50%',
  background: 'radial-gradient(circle, #1a1a1a 40%, #2c3e50 100%)',
  boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.6)',
});

const FlagEmoji = styled('div')({
  position: 'absolute',
  top: -30,
  right: 0,
  fontSize: 32,
  pointerEvents: 'none',
});

const BallEl = styled('div')<{ sunk: boolean }>(({ sunk }) => ({
  position: 'absolute',
  width: BALL_R * 2,
  height: BALL_R * 2,
  borderRadius: '50%',
  background: 'radial-gradient(circle at 30% 30%, #fff 0%, #e8e8e8 40%, #ccc 80%)',
  boxShadow: '2px 4px 6px rgba(0,0,0,0.35)',
  zIndex: 10,
  top: 0,
  left: 0,
  transition: sunk ? 'opacity 0.4s, width 0.4s, height 0.4s' : 'none',
  opacity: sunk ? 0 : 1,
}));

// ─── Overlays ───

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
`;

const ResultOverlay = styled('div')({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.55)',
  backdropFilter: 'blur(3px)',
  zIndex: 30,
  animation: `${fadeIn} 0.4s ease`,
  gap: 10,
});

const ResultEmoji = styled('div')({
  fontSize: 56,
});

const ResultText = styled('div')<{ success: boolean }>(({ success }) => ({
  fontSize: 26,
  fontWeight: 900,
  color: success ? '#66bb6a' : '#ef5350',
  textShadow: '0 2px 6px rgba(0,0,0,0.5)',
}));

const BonusBadge = styled('div')({
  fontSize: 20,
  fontWeight: 700,
  color: '#ffd54f',
  background: 'rgba(0,0,0,0.3)',
  padding: '4px 18px',
  borderRadius: 20,
});

const ContinueBtn = styled('button')({
  marginTop: 10,
  padding: '12px 40px',
  fontSize: 18,
  fontWeight: 700,
  color: FINISH_PURPLE,
  background: '#fff',
  border: '1px solid rgba(108,92,231,0.3)',
  borderRadius: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  '&:active': {
    transform: 'scale(0.98)',
  },
});

const SkipBtn = styled('button')({
  position: 'fixed',
  bottom: 20,
  left: 20,
  padding: '8px 20px',
  fontSize: 15,
  fontWeight: 700,
  color: '#2c3e50',
  background: 'rgba(255,255,255,0.75)',
  border: `2px solid ${BOX_BORDER}`,
  borderRadius: 12,
  cursor: 'pointer',
  zIndex: 50,
  backdropFilter: 'blur(4px)',
  boxShadow: '0 2px 0 #3a5562',
  fontFamily: 'inherit',
  '&:active': {
    transform: 'translateY(2px)',
    boxShadow: '0 0 0 #3a5562',
  },
});
