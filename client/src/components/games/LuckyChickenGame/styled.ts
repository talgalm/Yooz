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
  '&.shaking': {
    animation: `${shake} 420ms ease-out`,
  },
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

export const HudBar = styled('div')({
  position: 'relative',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 10px',
  flexShrink: 0,
  background: 'linear-gradient(180deg,rgba(18,6,0,0.97) 0%,rgba(28,10,0,0.90) 100%)',
  borderBottom: '2px solid rgba(255,160,0,0.3)',
  gap: 6,
  minHeight: 62,
});

export const HudBgImg = styled('img')({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'fill',
  pointerEvents: 'none',
  zIndex: 0,
  opacity: 0.88,
});

export const HudSection = styled('div')({
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minWidth: 52,
  gap: 1,
});

export const HudLabel = styled('div')({
  fontSize: 8,
  fontWeight: 800,
  color: 'rgba(255,205,70,0.9)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  lineHeight: 1,
});

export const HudValue = styled('div')({
  fontSize: 19,
  fontWeight: 900,
  color: '#fff',
  lineHeight: 1.1,
  textShadow: '0 1px 4px rgba(0,0,0,0.7)',
});

export const HudComboSection = styled(HudSection)({
  background: 'rgba(150,60,0,0.75)',
  borderRadius: 8,
  padding: '4px 10px',
  border: '1.5px solid rgba(255,160,0,0.5)',
});

export const HudComboValue = styled(HudValue)<{ $key: number }>(({ $key: _k }) => ({
  fontSize: 24,
  color: '#ffd040',
  animation: `${comboBump} 350ms ease-out`,
}));

export const LivesRow = styled('div')({
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  gap: 2,
  alignItems: 'center',
});

export const HeartEl = styled('span')<{ $lost: boolean; $animKey: number }>(
  ({ $lost, $animKey: _k }) => ({
    fontSize: 20,
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
}>(({ $x, $duration, $rotation }) => ({
  position: 'absolute',
  left: `${$x}%`,
  top: '-15%',
  transform: `translateX(-50%) rotate(${$rotation}deg)`,
  width: 92,
  height: 92,
  zIndex: 5,
  animation: `${fallAnim} ${$duration}ms linear forwards`,
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
  zIndex: 12,
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

export const HotStreakOverlay = styled('div')({
  position: 'absolute',
  top: '36%',
  left: '50%',
  transform: 'translate(-50%,-50%)',
  zIndex: 22,
  width: '82%',
  maxWidth: 310,
  pointerEvents: 'none',
  animation: `${hotStreakIn} 0.5s cubic-bezier(.34,1.56,.64,1) forwards,
               ${hotStreakOut} 0.4s ease-in 1.4s forwards`,
});

export const HotStreakImg = styled('img')({
  width: '100%',
  objectFit: 'contain',
});

// ── Screen flash ──────────────────────────────────────────────────────────────

export const ScreenFlashEl = styled('div')<{ $color: string }>(({ $color }) => ({
  position: 'absolute',
  inset: 0,
  background: $color,
  pointerEvents: 'none',
  zIndex: 24,
  animation: `${flashFade} 450ms ease-out forwards`,
}));

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

export { popIn };
