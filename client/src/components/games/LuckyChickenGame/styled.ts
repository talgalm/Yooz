import { styled, keyframes } from '@mui/material/styles';

const fallAnim = keyframes`
  from { top: -15%; }
  to   { top: 112%; }
`;

const popIn = keyframes`
  0%   { transform: scale(0.4); opacity: 0; }
  60%  { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const hotStreakIn = keyframes`
  0%   { transform: translate(-50%, -50%) scale(0.3) rotate(-8deg); opacity: 0; }
  50%  { transform: translate(-50%, -50%) scale(1.1) rotate(3deg); opacity: 1; }
  80%  { transform: translate(-50%, -50%) scale(0.95) rotate(-1deg); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.06); }
`;

const heartShake = keyframes`
  0%, 100% { transform: scale(1); }
  25%       { transform: scale(1.4) rotate(-10deg); }
  75%       { transform: scale(1.2) rotate(8deg); }
`;

// ── Root — full-screen fixed overlay ─────────────────────────────────────────

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

// ── HUD bar ───────────────────────────────────────────────────────────────────

export const HudBar = styled('div')({
  position: 'relative',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 10px',
  flexShrink: 0,
  background: 'linear-gradient(180deg, rgba(20,8,0,0.95) 0%, rgba(30,12,0,0.88) 100%)',
  borderBottom: '2px solid rgba(255,170,0,0.35)',
  gap: 6,
  minHeight: 64,
});

export const HudBgImg = styled('img')({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'fill',
  pointerEvents: 'none',
  zIndex: 0,
  opacity: 0.9,
});

export const HudSection = styled('div')({
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minWidth: 55,
  gap: 1,
});

export const HudLabel = styled('div')({
  fontSize: 8,
  fontWeight: 800,
  color: 'rgba(255,210,80,0.9)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  lineHeight: 1,
});

export const HudValue = styled('div')({
  fontSize: 20,
  fontWeight: 900,
  color: '#fff',
  lineHeight: 1.1,
  textShadow: '0 1px 4px rgba(0,0,0,0.7)',
});

export const HudComboSection = styled(HudSection)({
  background: 'rgba(160,70,0,0.7)',
  borderRadius: 8,
  padding: '4px 10px',
  border: '1.5px solid rgba(255,170,0,0.5)',
});

export const HudComboValue = styled(HudValue)({
  fontSize: 24,
  color: '#ffd040',
});

export const LivesRow = styled('div')({
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  gap: 3,
  alignItems: 'center',
});

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
  width: 90,
  height: 90,
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

// ── Bucket ────────────────────────────────────────────────────────────────────
// Position + tilt are set via direct DOM ref — no React re-render on move.

export const BucketEl = styled('img')({
  position: 'absolute',
  bottom: '-8%',    // hands slightly below the screen edge
  left: '50%',      // overridden at runtime
  transform: 'translateX(-50%)',
  width: '92%',
  maxWidth: 390,
  objectFit: 'contain',
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: 8,
  willChange: 'left, transform',
});

// ── Hot streak ────────────────────────────────────────────────────────────────

export const HotStreakOverlay = styled('div')({
  position: 'absolute',
  top: '35%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 20,
  width: '78%',
  maxWidth: 300,
  animation: `${hotStreakIn} 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards`,
  pointerEvents: 'none',
});

export const HotStreakImg = styled('img')({
  width: '100%',
  objectFit: 'contain',
});

// ── Catch flash ───────────────────────────────────────────────────────────────

export const CatchFlash = styled('div')<{ $x: number; $good: boolean }>(({ $x, $good }) => ({
  position: 'absolute',
  top: '60%',
  left: `${$x}%`,
  transform: 'translate(-50%, -50%)',
  fontSize: 28,
  fontWeight: 900,
  color: $good ? '#22c55e' : '#ef4444',
  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
  animation: `${popIn} 0.4s ease forwards`,
  pointerEvents: 'none',
  zIndex: 15,
}));

// ── Full-screen overlays ──────────────────────────────────────────────────────

export const Overlay = styled('div')({
  position: 'absolute',
  inset: 0,
  zIndex: 30,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 22,
});

export const StartOverlay = styled(Overlay)({
  background: 'rgba(20,10,0,0.6)',
  backdropFilter: 'blur(3px)',
  cursor: 'pointer',
});

export const FailOverlay = styled(Overlay)({
  background: 'rgba(10,4,0,0.90)',
});

export const ResultOverlay = styled(Overlay)({
  background: 'rgba(18,8,0,0.85)',
});

export const MascotImg = styled('img')({
  width: '52%',
  maxWidth: 200,
  objectFit: 'contain',
  animation: `${pulse} 1.8s ease-in-out infinite`,
  pointerEvents: 'none',
});

export const BurntFailImg = styled('img')({
  width: '42%',
  maxWidth: 170,
  objectFit: 'contain',
  pointerEvents: 'none',
});

export const OverlayTitle = styled('img')({
  width: '72%',
  maxWidth: 280,
  objectFit: 'contain',
  pointerEvents: 'none',
});

export const ScorePanel = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(0,0,0,0.55)',
  borderRadius: 16,
  padding: '14px 32px',
  border: '2px solid rgba(255,170,0,0.4)',
});

export const ScorePanelLabel = styled('div')({
  fontSize: 11,
  fontWeight: 800,
  color: 'rgba(255,210,80,0.9)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  textAlign: 'center',
});

export const ScorePanelValue = styled('div')({
  fontSize: 44,
  fontWeight: 900,
  color: '#fff',
  textShadow: '0 2px 12px rgba(255,140,0,0.7)',
  lineHeight: 1,
});

export const ScorePanelSub = styled('div')({
  fontSize: 13,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.65)',
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
  '&:active': {
    filter: 'brightness(0.82)',
    transform: 'scale(0.96)',
  },
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

export { popIn, heartShake };
