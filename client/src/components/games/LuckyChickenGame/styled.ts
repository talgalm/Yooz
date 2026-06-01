import { styled, keyframes } from '@mui/material/styles';

// ── Keyframes ─────────────────────────────────────────────────────────────────

export const fallAnim = keyframes`
  from { top: -15%; }
  to   { top: 112%; }
`;

const popIn = keyframes`
  0%   { transform: scale(0.3); opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
`;

const hotStreakIn = keyframes`
  0%   { transform: translate(-50%,-50%) scale(0.2) rotate(-12deg); opacity: 0; }
  50%  { transform: translate(-50%,-50%) scale(1.18) rotate(4deg);  opacity: 1; }
  75%  { transform: translate(-50%,-50%) scale(0.94) rotate(-2deg); opacity: 1; }
  100% { transform: translate(-50%,-50%) scale(1) rotate(0deg);     opacity: 1; }
`;

const hotStreakOut = keyframes`
  0%   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%,-50%) scale(1.15); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.08); }
`;

// Score popup floats up
const floatScore = keyframes`
  0%   { transform: translateX(-50%) translateY(0)    scale(1.1); opacity: 1; }
  25%  { transform: translateX(-50%) translateY(-22px) scale(1.3); opacity: 1; }
  100% { transform: translateX(-50%) translateY(-90px) scale(0.7); opacity: 0; }
`;

// Full-screen color flash
const flashFade = keyframes`
  0%   { opacity: 0.5; }
  100% { opacity: 0;   }
`;

// Screen shake on bad catch
const shake = keyframes`
  0%,100% { transform: translateX(0)   rotate(0deg);    }
  15%      { transform: translateX(-12px) rotate(-2deg); }
  30%      { transform: translateX(12px)  rotate(2deg);  }
  45%      { transform: translateX(-8px)  rotate(-1deg); }
  60%      { transform: translateX(8px)   rotate(1deg);  }
  75%      { transform: translateX(-4px)  rotate(-0.5deg); }
  90%      { transform: translateX(4px)   rotate(0.5deg);  }
`;

// Overlay entry animations
const bounceIn = keyframes`
  0%   { transform: scale(0) rotate(-6deg); opacity: 0; }
  55%  { transform: scale(1.12) rotate(3deg); opacity: 1; }
  80%  { transform: scale(0.94) rotate(-1deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const dropIn = keyframes`
  0%   { transform: translateY(-100px) scale(0.5); opacity: 0; }
  55%  { transform: translateY(12px)   scale(1.06); opacity: 1; }
  80%  { transform: translateY(-6px)   scale(0.97); }
  100% { transform: translateY(0)      scale(1);    opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(50px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
`;

const slamIn = keyframes`
  0%   { transform: scale(2.5) rotate(4deg); opacity: 0; }
  60%  { transform: scale(0.92) rotate(-1deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const comboBump = keyframes`
  0%   { transform: scale(1); }
  40%  { transform: scale(1.5); color: #ffe566; text-shadow: 0 0 12px #ffd040; }
  100% { transform: scale(1); }
`;

const heartLost = keyframes`
  0%   { transform: scale(1);   filter: none; }
  30%  { transform: scale(1.6); filter: brightness(1.8); }
  60%  { transform: scale(0.7); filter: grayscale(1) opacity(0.4); }
  100% { transform: scale(1);   filter: grayscale(1) opacity(0.4); }
`;

const flyToBucket = keyframes`
  0%   { opacity: 1; transform: translateX(-50%) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) scale(0.05) translateY(60px); }
`;

const overlayFadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

// ── Root ──────────────────────────────────────────────────────────────────────

export const GameRoot = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  touchAction: 'none',
  cursor: 'none',
});

export const GameBg = styled('img')({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  pointerEvents: 'none',
  zIndex: 0,
});

// ── HUD ───────────────────────────────────────────────────────────────────────
// The HUD bar IS the SVG image (Untitled-1.svg) — it carries all the textures,
// the half-circle combo dip and the slot frames. The SVG sets the bar height
// (width:100% + height:auto) so there is never a gap. Dynamic values are
// overlaid on top, positioned over the SVG's slots.

export const HudBar = styled('div')({
  position: 'relative',
  zIndex: 10,
  width: '100%',
  flexShrink: 0,
  lineHeight: 0, // kill inline-img whitespace under the SVG
});

// Self-drawn vector recreation of the designed bar. width:100% + height:auto
// keeps the 1023x204 aspect ratio with no gap, and drives the bar height.
export const HudBarSvg = styled('svg')({
  display: 'block',
  width: '100%',
  height: 'auto',
  pointerEvents: 'none',
});

// LUCKY CHICKEN logo artwork (metallic gold), overlaid on the far left
export const LogoImg = styled('img')({
  position: 'absolute',
  top: '34%',
  left: '1.5%',
  transform: 'translateY(-50%)',
  width: '18%',
  height: 'auto',
  zIndex: 2,
  pointerEvents: 'none',
  filter:
    'drop-shadow(0 1px 1px rgba(0,0,0,0.6)) drop-shadow(0 0 6px rgba(255,180,60,0.45))',
});

// Overlay layer sitting exactly on top of the SVG
export const HudOverlay = styled('div')({
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  pointerEvents: 'none',
  lineHeight: 1,
});

// A stat block positioned over a specific SVG slot (by % of bar width)
export const HudSection = styled('div')<{ $left: number }>(({ $left }) => ({
  position: 'absolute',
  top: '32%',
  left: `${$left}%`,
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1,
}));

export const HudLabel = styled('div')({
  fontSize: 'clamp(9px, 2.3vw, 14px)',
  fontWeight: 800,
  color: 'rgba(255,205,90,0.92)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
});

export const HudValue = styled('div')({
  fontSize: 'clamp(19px, 5.8vw, 33px)',
  fontWeight: 900,
  color: '#fff',
  lineHeight: 1.05,
  textShadow: '0 1px 5px rgba(0,0,0,0.9)',
  whiteSpace: 'nowrap',
});

// Combo sits inside the central squircle badge (~x40% of the artwork)
export const HudComboSection = styled('div')({
  position: 'absolute',
  top: '35%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0,
});

export const HudComboValue = styled('div')<{ $key: number }>(({ $key: _k }) => ({
  fontSize: 'clamp(18px, 5.4vw, 30px)',
  fontWeight: 900,
  color: '#ffd040',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  textShadow: '0 0 8px rgba(255,200,0,0.8), 0 1px 4px rgba(0,0,0,0.9)',
  animation: `${comboBump} 350ms ease-out`,
}));

// Hearts sit dead-center, just below the combo badge
export const LivesRow = styled('div')({
  position: 'absolute',
  top: '76%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  display: 'flex',
  gap: 6,
  alignItems: 'center',
});

export const HeartEl = styled('span')<{ $lost: boolean; $animKey: number }>(
  ({ $lost, $animKey: _k }) => ({
    fontSize: 'clamp(28px, 7.6vw, 46px)',
    lineHeight: 1,
    display: 'inline-block',
    filter: $lost ? 'grayscale(1) opacity(0.35)' : 'none',
    animation: $lost ? `${heartLost} 500ms ease-out forwards` : 'none',
  })
);

// ── Game field ────────────────────────────────────────────────────────────────

export const GameField = styled('div')({
  position: 'relative',
  flex: 1,
  overflow: 'hidden',
  zIndex: 1,
});

// ── Falling items ─────────────────────────────────────────────────────────────

export const FallingItemWrapper = styled('div')<{
  $x: number;
  $duration: number;
  $rotation: number;
  $paused?: boolean;
}>(({ $x, $duration, $rotation, $paused }) => ({
  position: 'absolute',
  left: `${$x}%`,
  top: '-15%',
  transform: `translateX(-50%) rotate(${$rotation}deg)`,
  width: 92,
  height: 92,
  zIndex: 10, // always in front of bucket (z-index 8)
  animation: `${fallAnim} ${$duration}ms linear forwards`,
  animationPlayState: $paused ? 'paused' : 'running',
  pointerEvents: 'none',
  willChange: 'top',
}));

export const FallingItemImg = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  pointerEvents: 'none',
});

// Item caught — briefly shows at catch position then shrinks into bucket
export const CaughtItemWrapper = styled('div')<{ $x: number; $y: number }>(({ $x, $y }) => ({
  position: 'absolute',
  left: `${$x}%`,
  top: `${$y}%`,
  width: 92,
  height: 92,
  zIndex: 10,
  pointerEvents: 'none',
  animation: `${flyToBucket} 320ms ease-in forwards`,
  willChange: 'transform, opacity',
}));

// ── Score popup ───────────────────────────────────────────────────────────────

export const ScorePopupEl = styled('div')<{ $x: number; $y: number; $good: boolean }>(
  ({ $x, $y, $good }) => ({
    position: 'absolute',
    left: `${$x}%`,
    top: `${$y}%`,
    fontSize: 28,
    fontWeight: 900,
    color: $good ? '#4ade80' : '#f87171',
    textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px currentColor',
    pointerEvents: 'none',
    zIndex: 20,
    animation: `${floatScore} 800ms ease-out forwards`,
    whiteSpace: 'nowrap',
  })
);

// ── Hot streak ────────────────────────────────────────────────────────────────

const spinRays = keyframes`
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to   { transform: translate(-50%, -50%) rotate(360deg); }
`;

const streakOverlayAnim = keyframes`
  0%   { opacity: 0; }
  12%  { opacity: 1; }
  75%  { opacity: 1; }
  100% { opacity: 0; }
`;

const streakImgAnim = keyframes`
  0%   { transform: translate(-50%,-50%) scale(0.15) rotate(-14deg); opacity: 0; }
  35%  { transform: translate(-50%,-50%) scale(1.18) rotate(4deg);   opacity: 1; }
  55%  { transform: translate(-50%,-50%) scale(0.96) rotate(-2deg);  opacity: 1; }
  75%  { transform: translate(-50%,-50%) scale(1.02) rotate(0deg);   opacity: 1; }
  100% { transform: translate(-50%,-50%) scale(1.08) rotate(0deg);   opacity: 0; }
`;

// Full-screen container — fades in then fades out over 2.4s
export const HotStreakOverlay = styled('div')({
  position: 'absolute',
  inset: 0,
  zIndex: 22,
  pointerEvents: 'none',
  overflow: 'hidden',
  animation: `${streakOverlayAnim} 2.4s ease forwards`,
});

// Broad soft background rays — very subtle, just a hint
export const SunburstRays = styled('div')({
  position: 'absolute',
  width: '150vw',
  height: '150vw',
  top: '36%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: `repeating-conic-gradient(
    rgba(255,185,0,0.22) 0deg 10deg,
    transparent          10deg 20deg
  )`,
  borderRadius: '50%',
  WebkitMaskImage: 'radial-gradient(circle, black 20%, transparent 60%)',
  maskImage:        'radial-gradient(circle, black 20%, transparent 60%)',
  animation: `${spinRays} 5s linear infinite`,
  zIndex: 0,
});

// Sharp glowing shooting beams — bright lines flying outward
export const ShootingBeams = styled('div')({
  position: 'absolute',
  width: '170vw',
  height: '170vw',
  top: '36%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: `repeating-conic-gradient(
    rgba(255,230,60,0.75) 0deg 5deg,
    transparent           5deg 45deg
  )`,
  borderRadius: '50%',
  WebkitMaskImage: 'radial-gradient(circle, black 8%, transparent 58%)',
  maskImage:        'radial-gradient(circle, black 8%, transparent 58%)',
  filter: 'blur(2px)',
  animation: `${spinRays} 8s linear infinite reverse`,
  zIndex: 1,
});

// Central glow bloom
export const SunburstGlow = styled('div')({
  position: 'absolute',
  width: '70%',
  aspectRatio: '1',
  top: '34%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: `radial-gradient(circle,
    rgba(255,250,100,0.65) 0%,
    rgba(255,160,0,0.40)   30%,
    rgba(255,60,0,0.12)    55%,
    transparent            70%
  )`,
  borderRadius: '50%',
  filter: 'blur(10px)',
  zIndex: 2,
});

// Sparkle star
export const Sparkle = styled('span')<{
  $top: number; $left: number; $delay: number; $size: number;
}>(({ $top, $left, $delay, $size }) => ({
  position: 'absolute',
  top:  `${$top}%`,
  left: `${$left}%`,
  fontSize: $size,
  lineHeight: 1,
  color: 'rgba(255,245,100,0.95)',
  textShadow: `0 0 6px #fff, 0 0 14px rgba(255,220,0,1), 0 0 30px rgba(255,140,0,0.9)`,
  pointerEvents: 'none',
  zIndex: 4,
  animation: `${popIn} 350ms ease ${$delay}ms both, ${pulse} 600ms ease-in-out ${$delay + 350}ms 2`,
}));

// The HOT STREAK! image itself — slightly smaller than before
export const HotStreakImg = styled('img')({
  position: 'absolute',
  top: '34%',
  left: '50%',
  width: '90%',
  maxWidth: 400,
  objectFit: 'contain',
  zIndex: 5,
  filter: `
    drop-shadow(0 0 12px rgba(255,220,60,1))
    drop-shadow(0 0 28px rgba(255,140,0,0.9))
    drop-shadow(0 0 52px rgba(255,60,0,0.6))
  `,
  animation: `${streakImgAnim} 2.4s cubic-bezier(.34,1.56,.64,1) forwards`,
});

// ── Screen flash / vignette ───────────────────────────────────────────────────

export const ScreenFlashEl = styled('div')<{ $color: string }>(({ $color }) => ({
  position: 'absolute',
  inset: 0,
  background: $color,
  pointerEvents: 'none',
  zIndex: 24,
  animation: `${flashFade} 450ms ease-out forwards`,
}));

// Red vignette on bad catch — edges glow red, centre stays clear
export const VignetteFlash = styled('div')({
  position: 'absolute',
  inset: 0,
  background: 'radial-gradient(ellipse at 50% 60%, transparent 35%, rgba(200,20,20,0.85) 100%)',
  pointerEvents: 'none',
  zIndex: 24,
  animation: `${flashFade} 550ms ease-out forwards`,
});

// ── Bucket ────────────────────────────────────────────────────────────────────

export const BucketEl = styled('img')({
  position: 'absolute',
  bottom: '-8%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '92%',
  maxWidth: 390,
  objectFit: 'contain',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 8,
  willChange: 'left, transform',
});

// ── Full-screen overlays ──────────────────────────────────────────────────────

const baseOverlay = {
  position: 'absolute' as const,
  inset: 0,
  zIndex: 30,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 20,
  animation: `${overlayFadeIn} 200ms ease-out forwards`,
};

export const StartOverlay = styled('div')({
  ...baseOverlay,
  background: 'rgba(18,8,0,0.6)',
  backdropFilter: 'blur(3px)',
  cursor: 'pointer',
});

export const FailOverlay = styled('div')({
  ...baseOverlay,
  background: 'rgba(8,3,0,0.92)',
});

export const ResultOverlay = styled('div')({
  ...baseOverlay,
  background: 'rgba(16,7,0,0.88)',
});

// Elements inside overlays — each has staggered entry animation

export const OverlayTitle = styled('img')({
  width: '74%',
  maxWidth: 290,
  objectFit: 'contain',
  pointerEvents: 'none',
  animation: `${slamIn} 500ms cubic-bezier(.34,1.56,.64,1) 100ms both`,
});

export const MascotImg = styled('img')({
  width: '52%',
  maxWidth: 200,
  objectFit: 'contain',
  animation: `${dropIn} 600ms cubic-bezier(.34,1.56,.64,1) 300ms both,
               ${pulse} 2s ease-in-out 900ms infinite`,
  pointerEvents: 'none',
});

export const BurntFailImg = styled('img')({
  width: '44%',
  maxWidth: 180,
  objectFit: 'contain',
  pointerEvents: 'none',
  animation: `${dropIn} 600ms cubic-bezier(.34,1.56,.64,1) 300ms both`,
});

export const ScorePanel = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(0,0,0,0.6)',
  borderRadius: 18,
  padding: '14px 34px',
  border: '2px solid rgba(255,160,0,0.4)',
  animation: `${bounceIn} 450ms cubic-bezier(.34,1.56,.64,1) 550ms both`,
});

export const ScorePanelLabel = styled('div')({
  fontSize: 11,
  fontWeight: 800,
  color: 'rgba(255,205,70,0.9)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  textAlign: 'center',
});

export const ScorePanelValue = styled('div')({
  fontSize: 46,
  fontWeight: 900,
  color: '#fff',
  textShadow: '0 2px 14px rgba(255,130,0,0.8)',
  lineHeight: 1,
});

export const ScorePanelSub = styled('div')({
  fontSize: 13,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.6)',
});

export const GoldButton = styled('button')({
  position: 'relative',
  width: '68%',
  maxWidth: 240,
  height: 58,
  border: 'none',
  cursor: 'pointer',
  background: 'transparent',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: `${slideUp} 400ms ease-out 750ms both`,
  '&:active': { filter: 'brightness(0.82)', transform: 'scale(0.96)' },
});

export const GoldButtonBg = styled('img')({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'fill',
  pointerEvents: 'none',
});

export const GoldButtonText = styled('span')({
  position: 'relative',
  zIndex: 1,
  fontSize: 17,
  fontWeight: 900,
  color: '#3d1800',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  textShadow: '0 1px 0 rgba(255,255,255,0.25)',
});

// ── Pause ─────────────────────────────────────────────────────────────────────

// Transparent circular hit-area sitting exactly over the drawn pause button
export const PauseHit = styled('button')({
  position: 'absolute',
  top: '33%',
  left: '93%',
  transform: 'translate(-50%, -50%)',
  width: '11%',
  aspectRatio: '1 / 1',
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: 0,
  zIndex: 6,
  WebkitTapHighlightColor: 'transparent',
  '&:active': { filter: 'brightness(0.8)' },
});

export const PauseOverlay = styled('div')({
  position: 'absolute',
  inset: 0,
  zIndex: 32,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 24,
  background: 'rgba(12,5,0,0.74)',
  backdropFilter: 'blur(4px)',
  animation: `${overlayFadeIn} 180ms ease-out forwards`,
});

export const PauseTitle = styled('div')({
  fontSize: 'clamp(34px, 9vw, 66px)',
  fontWeight: 900,
  color: '#ffce3a',
  letterSpacing: '0.08em',
  textShadow: '0 3px 0 #7a3a08, 0 0 20px rgba(255,180,60,0.5)',
  animation: `${slamIn} 420ms cubic-bezier(.34,1.56,.64,1) both`,
});

export const QuitButton = styled('button')({
  background: 'transparent',
  border: '2px solid rgba(255,160,0,0.45)',
  borderRadius: 14,
  color: 'rgba(255,205,90,0.9)',
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  padding: '10px 30px',
  cursor: 'pointer',
  animation: `${slideUp} 400ms ease-out 120ms both`,
  '&:active': { filter: 'brightness(0.85)', transform: 'scale(0.96)' },
});

// ── Start / Instructions extras ─────────────────────────────────────────────

export const StartLogo = styled('img')({
  width: '78%',
  maxWidth: 320,
  objectFit: 'contain',
  pointerEvents: 'none',
  filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5)) drop-shadow(0 0 10px rgba(255,180,60,0.4))',
  animation: `${slamIn} 480ms cubic-bezier(.34,1.56,.64,1) both`,
});

export const StartTitle = styled('div')({
  fontSize: 'clamp(26px, 7vw, 44px)',
  fontWeight: 900,
  color: '#ffce3a',
  letterSpacing: '0.04em',
  textAlign: 'center',
  textShadow: '0 3px 0 #7a3a08, 0 0 18px rgba(255,180,60,0.5)',
  animation: `${dropIn} 520ms cubic-bezier(.34,1.56,.64,1) 150ms both`,
});

export const StartDesc = styled('div')({
  fontSize: 'clamp(13px, 3.6vw, 17px)',
  fontWeight: 700,
  color: 'rgba(255,240,220,0.92)',
  textAlign: 'center',
  maxWidth: 360,
  lineHeight: 1.4,
  padding: '0 18px',
  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
  animation: `${dropIn} 520ms ease-out 280ms both`,
});

export const InstructionsOverlay = styled('div')({
  position: 'absolute',
  inset: 0,
  zIndex: 30,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 18,
  padding: '0 16px',
  background: 'rgba(16,7,0,0.92)',
  backdropFilter: 'blur(3px)',
  animation: `${overlayFadeIn} 200ms ease-out forwards`,
});

export const InstrBlock = styled('div')<{ $delay?: number }>(({ $delay = 0 }) => ({
  width: '100%',
  maxWidth: 470,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  background: 'rgba(0,0,0,0.45)',
  border: '2px solid rgba(255,160,0,0.3)',
  borderRadius: 18,
  padding: '14px 12px',
  animation: `${bounceIn} 440ms cubic-bezier(.34,1.56,.64,1) ${$delay}ms both`,
}));

export const InstrHeading = styled('div')<{ $good?: boolean }>(({ $good }) => ({
  fontSize: 'clamp(14px, 4vw, 20px)',
  fontWeight: 900,
  color: $good ? '#5bd97a' : '#ff7a6a',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}));

export const InstrItems = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'clamp(8px, 2.6vw, 16px)',
  justifyContent: 'center',
  alignItems: 'center',
});

export const InstrItemImg = styled('img')({
  width: 'clamp(42px, 12vw, 66px)',
  height: 'clamp(42px, 12vw, 66px)',
  objectFit: 'contain',
  filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.6))',
});

export const InstrHint = styled('div')({
  fontSize: 'clamp(13px, 3.8vw, 18px)',
  fontWeight: 800,
  color: 'rgba(255,230,180,0.95)',
  textAlign: 'center',
  padding: '0 10px',
  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
  animation: `${dropIn} 480ms ease-out 200ms both`,
});

// Player rank on the result screen
export const RankBadge = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  animation: `${bounceIn} 450ms cubic-bezier(.34,1.56,.64,1) 650ms both`,
});

export const RankLabel = styled('div')({
  fontSize: 11,
  fontWeight: 800,
  color: 'rgba(255,205,70,0.9)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
});

export const RankValue = styled('div')({
  fontSize: 'clamp(20px, 5.6vw, 30px)',
  fontWeight: 900,
  color: '#ffce3a',
  textShadow: '0 2px 0 #7a3a08, 0 0 14px rgba(255,180,60,0.5)',
});

export { popIn };
