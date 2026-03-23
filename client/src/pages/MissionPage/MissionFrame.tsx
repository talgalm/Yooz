import { styled, keyframes } from '@mui/material/styles';

// ─── Mission Design ───
const MISSION_FONT = "'Rubik One', sans-serif";
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
  width: '100%',
  height: '100dvh',
  background: '#1a0a2e',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
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

// The frame container — overlays the SVG frame on top of the background
export const FrameContainer = styled('div')({
  position: 'relative',
  zIndex: 2,
  width: '100%',
  maxWidth: 480,
  height: '100dvh',
  backgroundImage: 'url(/images/mission-frame.svg)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  overflow: 'hidden',
});

// Decorative header overlay — on top of all content
export const FrameHeaderOverlay = styled('img')({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  zIndex: 10,
  pointerEvents: 'none',
});

// Decorative footer overlay — on top of all content
export const FrameFooterOverlay = styled('img')({
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: '100%',
  zIndex: 10,
  pointerEvents: 'none',
});

// Header area — positioned at top to match the SVG header rectangle
export const MissionHeader = styled('div')({
  width: '93%',
  margin: '4% auto 0',
  padding: '30px 16px',
  minHeight: '10%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  boxSizing: 'border-box',
  animation: `${fadeIn} 0.6s ease-out`,
  position: 'relative',
  zIndex: 3,
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
  zIndex: 3,
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

// Teal CTA button at bottom
export const MissionButton = styled('button')<{ step?: number }>(({ step }) => ({
  width: '70%',
  maxWidth: 360,
  padding: '22px 36px',
  fontSize: 'clamp(18px, 5vw, 24px)',
  fontWeight: 400,
  fontFamily: MISSION_FONT,
  color: MISSION_TEXT,
  background: 'transparent',
  border: 'none',
  borderRadius: 30,
  cursor: 'pointer',
  textAlign: 'center',
  direction: 'rtl',
  marginBottom: '3%',
  ...(step && step === 3 && {
    marginBottom: '18%',
    fontSize: 'clamp(18px, 10vw, 24px)',
  }),
  ...(step && step > 3 && {

  }),
  position: 'relative',
  zIndex: 3,
  transition: 'transform 0.15s, box-shadow 0.15s',

}));

// ─── Mute button ───

export const MuteButton = styled('button')({
  position: 'absolute',
  top: -5,
  left: 16,
  zIndex: 10,
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
