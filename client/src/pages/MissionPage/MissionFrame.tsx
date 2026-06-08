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

// The frame container — locks its aspect ratio to the SVG (1080×1920 = 9:16)
// so the painted SVG slots (title bar, timer band, button cradle) always map
// to the same percentage positions of the container height. Without this lock,
// `cover` cropped the SVG's TOP on phones shorter than 9:16 (older Androids),
// sliding the painted timer band UP into the DOM description box. Tall phones
// (iPhone 19.5:9 etc.) now show small dark bars top/bottom but proportions hold.
// `vh` fallback covers older browsers without dvh support.
export const FrameContainer = styled('div')({
  position: 'relative',
  zIndex: 2,
  width: 'min(100%, 480px)',
  aspectRatio: '1080 / 1920',
  maxHeight: '100vh',
  '@supports (height: 100dvh)': { maxHeight: '100dvh' },
  backgroundImage: 'url(/images/mission-frame.svg)',
  backgroundSize: '100% 100%',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
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

// Header area — absolutely positioned over the SVG's title rectangle.
// Percentages are of FrameContainer height (now aspect-locked to the SVG),
// so this slot always maps to the same painted band, regardless of device.
export const MissionHeader = styled('div')({
  position: 'absolute',
  top: '3.5%',
  left: '3.5%',
  right: '3.5%',
  height: '9%',
  padding: '0 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  boxSizing: 'border-box',
  animation: `${fadeIn} 0.6s ease-out`,
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
});

// Content area (middle section) — absolutely positioned below the SVG's
// painted timer band (~14–22% of container height) and above the button
// cradle (~14% from bottom).
export const MissionContent = styled('div')({
  position: 'absolute',
  top: '23%',
  bottom: '14%',
  left: 0,
  right: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: '0 11px',
  gap: 20,
  animation: `${fadeIn} 0.6s ease-out 0.2s both`,
  zIndex: 5,
  boxSizing: 'border-box',
  overflow: 'hidden',
});

export const DescriptionText = styled('p')<{ step?: number }>(({ step }) => ({
  fontSize: 'clamp(15px, 4vw, 18px)',
  fontWeight: 400,
  fontFamily: MISSION_FONT,
  color: MISSION_TEXT,
  margin: 0,
  lineHeight: 1.7,
  textAlign: 'right',
  direction: 'rtl',
  whiteSpace: 'pre-line',
  width: '100%',
  padding: '16px 16px',
  border: '2px solid #39CABC',
  ...(step && step === 3 && {
    border: 'transparent',
    marginTop: '15%',
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
// Anchored to the bottom of FrameContainer with `position: absolute` so it lands
// in the SVG button slot on every device:
//   • Screens 0–2 use mission-frame.svg (1080×1920, full background, `cover` +
//     bottom-anchored). The slot sits ~3.5% above the SVG's bottom edge, which
//     equals 3.5% of FrameContainer height regardless of phone aspect ratio.
//   • Screens 3+ overlay mission-footer.svg (1080×568, rendered with width:100%
//     auto-height, so its height scales with viewport WIDTH). The slot sits
//     roughly mid-way up that footer, so the offset has to be derived from vw,
//     not dvh.
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
    bottom: 'calc(min(22vw, 105px) + env(safe-area-inset-bottom, 0px))',
  } : {}),
}));

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
