import { styled, keyframes } from '@mui/material/styles';

// ─── Mission Design ───
const MISSION_FONT = "'Rubik', sans-serif";
const MISSION_TEAL = '#39CABC';
const MISSION_TEXT = '#F2F7FF';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const revealIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// Full-screen wrapper — the background image sits here, behind the frame
export const MissionWrapper = styled('div')<{ bg?: string, step?: number, ready?: boolean }>(({ bg, step, ready = true }) => ({
  position: 'fixed',
  inset: 0,
  background: '#1a0a2e',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  overscrollBehavior: 'none',
  isolation: 'isolate',
  opacity: ready ? 1 : 0,
  animation: ready ? `${revealIn} 0.3s ease-out` : 'none',

  // Background image layer (behind frame)
  // We blur this layer only, so the content (text/frame) stays sharp.
  ...(bg ? {
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
      backgroundImage: `url(${bg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      transition: 'filter 250ms ease, transform 250ms ease, opacity 250ms ease',
      transform: step === 3 ? 'scale(1.08)' : 'scale(1)',
      filter: step === 3 ? 'blur(16px)' : 'none',
      opacity: step === 3 ? 0.85 : 1,
    },

    // Optional: darken a bit so blur matches the design mood.
    ...(step === 3 ? {
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        background: 'rgba(26, 10, 46, 0.45)',
      },
    } : {}),
  } : {}),
}));

// The frame container — overlays the SVG frame on top of the background.
// `backgroundSize: cover` + `100dvh` keeps the SVG's bottom edge (where the
// button slot lives) anchored to the bottom of the viewport on every device,
// regardless of aspect ratio — wider phones just crop more on the sides.
export const FrameContainer = styled('div')({
  position: 'relative',
  zIndex: 2,
  width: '100%',
  maxWidth: 480,
  height: '100dvh',
  backgroundImage: 'url(/images/mission-frame.svg)',
  backgroundSize: 'cover',
  backgroundPosition: 'bottom center',
  backgroundRepeat: 'no-repeat',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  overflow: 'hidden',
});

// Decorative header/footer — must sit *below* text (see MissionHeader / MissionContent z-index)
export const FrameHeaderOverlay = styled('img')({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  zIndex: 1,
  pointerEvents: 'none',
});

export const FrameFooterOverlay = styled('img')({
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: '100%',
  zIndex: 1,
  pointerEvents: 'none',
});

// Header area — positioned at top to match the SVG header rectangle
export const MissionHeader = styled('div')({
  width: '93%',
  margin: '4% auto 0',
  padding: '50px 16px',
  minHeight: '10%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  boxSizing: 'border-box',
  animation: `${fadeIn} 0.6s ease-out`,
  position: 'relative',
  zIndex: 5,
});

export const HeaderText = styled('h1')({
  fontSize: 'clamp(26px, 7vw, 36px)',
  fontWeight: 700,
  fontFamily: MISSION_FONT,
  color: MISSION_TEXT,
  margin: 0,
  lineHeight: 1.3,
  direction: 'rtl',
  textAlign: 'center',
  width: '100%',
  marginTop: -20,
});

// Content area (middle section)
export const MissionContent = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: '0px 11px',
  gap: 20,
  animation: `${fadeIn} 0.6s ease-out 0.2s both`,
  position: 'relative',
  zIndex: 5,
});

export const DescriptionText = styled('p')<{ step?: number }>(({ step }) => ({
  fontSize: 'clamp(15px, 24vw, 18px)',
  fontWeight: 400,
  fontFamily: MISSION_FONT,
  color: MISSION_TEXT,
  margin: 0,
  lineHeight: 1.7,
  textAlign: 'right',
  direction: 'rtl',
  whiteSpace: 'pre-line',
  width: '100%',
  marginTop: '10%',
  padding: '16px 16px',
  border: '2px solid #39CABC',
  ...(step && step === 3 && {
    border: 'transparent',
  }),
  boxSizing: 'border-box',
}));

// Optional screen image (e.g. suitcase)
export const ScreenImage = styled('img')({
  maxWidth: 200,
  maxHeight: 200,
  objectFit: 'contain',
  animation: `${fadeIn} 0.6s ease-out 0.3s both`,
});

// Teal CTA button at bottom.
// Anchored to the bottom of the FrameContainer with `position: absolute` so it
// lands in the SVG button slot on every device. The slot in mission-frame.svg
// sits ~7% above the SVG bottom — `cover` on a 9:16 SVG keeps that anchored to
// the viewport bottom on all phone aspect ratios, so this offset is stable.
export const MissionButton = styled('button', {
  shouldForwardProp: (prop) => prop !== 'step',
})<{ step?: number }>(({ step }) => ({
  width: '70%',
  maxWidth: 360,
  height: 'clamp(60px, 14vw, 80px)',
  padding: '0 36px',
  fontSize: 'clamp(18px, 5vw, 24px)',
  fontWeight: 400,
  fontFamily: MISSION_FONT,
  color: MISSION_TEXT,
  background: 'transparent',
  border: 'none',
  borderRadius: 30,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  lineHeight: 1,
  WebkitAppearance: 'none',
  appearance: 'none',
  direction: 'rtl',
  boxSizing: 'border-box',
  position: 'absolute',
  bottom: 'calc(3.5% + env(safe-area-inset-bottom, 0px))',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 5,
  transition: 'transform 0.15s, box-shadow 0.15s',
  // currentScreen is 0-based: screens 0–2 keep large size; from index 3 onward use compact size.
  ...((step ?? 0) >= 3 ? {
    height: 'clamp(50px, 12vw, 64px)',
    fontSize: 'clamp(18px, 10vw, 24px)',
    bottom: 'env(safe-area-inset-bottom, 0px)',
  } : {}),
}));

// ─── Top action row (logout + help + mute) ───

export const TopActionRow = styled('div')({
  position: 'absolute',
  top: 10,
  right: 12,
  zIndex: 15,
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
});

export const TopIconButton = styled('button')({
  width: 30,
  height: 30,
  borderRadius: 8,
  background: 'rgba(0,0,0,0.55)',
  border: `1.5px solid rgba(255,255,255,0.25)`,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: MISSION_TEXT,
  transition: 'background 0.2s, border-color 0.2s',
  '&:hover': {
    background: 'rgba(57,202,188,0.18)',
    borderColor: MISSION_TEAL,
  },
  '&:active': { transform: 'scale(0.93)' },
});

// ─── Mute button ───

export const MuteButton = styled('button')({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 6,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0.85,
  transition: 'opacity 0.2s',
  '&:hover': { opacity: 1 },
});

export const MuteIcon = styled('img')<{ muted?: boolean }>(({ muted }) => ({
  width: 32,
  height: 32,
  filter: muted ? 'grayscale(1) brightness(0.5)' : 'brightness(1)',
  transition: 'filter 0.2s',
}));

export const MutedSlash = styled('div')({
  position: 'absolute',
  width: 3,
  height: 36,
  background: '#ff4444',
  borderRadius: 2,
  transform: 'rotate(45deg)',
  pointerEvents: 'none',
});

// Screen indicator dots
export const ScreenIndicator = styled('div')({
  display: 'flex',
  gap: 10,
  justifyContent: 'center',
  padding: '12px 0',
});

export const IndicatorDot = styled('div')<{ active?: boolean }>(({ active }) => ({
  width: active ? 12 : 8,
  height: active ? 12 : 8,
  borderRadius: '50%',
  background: active ? MISSION_TEAL : `${MISSION_TEXT}40`,
  transition: 'all 0.3s ease',
  boxShadow: active ? `0 0 8px ${MISSION_TEAL}80` : 'none',
}));
