import { styled, keyframes } from '@mui/material/styles';
import { DESKTOP_STATION_WIDTH } from '../styled';

// ─── Colors ───

const WHITE = '#fff';

// Background gradient (matching TriviaGame)
const BG_TOP = '#d4f0fd';
const BG_BOTTOM = '#a8e6b1';

// Box/Card styling
const BOX_BG = '#e3ebf3';
const BOX_BORDER = '#4a6572';

// Text
const TEXT_DARK = '#2c3e50';

// Buttons
const BTN_RED = '#e74c3c';
const BTN_RED_DARK = '#c0392b';
const BTN_GREEN = '#2ecc71';
const BTN_GREEN_DARK = '#27ae60';

// Primary action (purple — matches Trivia)
const BTN_PURPLE = '#6c5ce7';
const BTN_PURPLE_DARK = '#5b4cd4';

// Finish screen (purple design, matches nature landscape theme)
const FINISH_PURPLE = '#6c5ce7';
const FINISH_PURPLE_DARK = '#5b4cd4';

// Leaf banner (purple)
const LEAF_BANNER_BG = FINISH_PURPLE;
const LEAF_BANNER_DARK = FINISH_PURPLE_DARK;

// ─── Animations ───

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const feedbackPop = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
`;

const floatIn = keyframes`
  from { opacity: 0; transform: translateY(30px) scale(0.9); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

// ═══════════════════════════════════════════
// ─── Background Image ───
// ═══════════════════════════════════════════

export const ORDER_BG_COLOR = '#5e7f4a';
export const ORDER_WOOD_BLOCKS_URL = '/images/order-wood-blocks.png';

/** Full viewport backdrop — solid green (welcome, playing, summary) */
export const OrderFullScreenSceneBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  backgroundColor: ORDER_BG_COLOR,
});

/** @deprecated alias — same as OrderFullScreenSceneBackdrop */
export const OrderIntroFullScreenSceneBackdrop = OrderFullScreenSceneBackdrop;

/** Full viewport backdrop — green grass for golf challenge */
export const GolfFullScreenSceneBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  backgroundColor: '#3a5a1a',
  backgroundImage: 'url(/images/golf-course-bg.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  backgroundRepeat: 'no-repeat',
});

/**
 * Root wrapper for all phases.
 * When no ThemedSceneOverlay exists (admin preview), paints the background
 * inline via ::before pseudo-element.
 */
export const OrderPhaseRoot = styled('div', {
  shouldForwardProp: (prop) => prop !== '$inlineBackdrop',
})<{ $inlineBackdrop?: boolean }>(({ $inlineBackdrop }) => ({
  position: 'relative',
  flex: 1,
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'stretch',
  overflow: 'hidden',
  ...($inlineBackdrop
    ? {
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundColor: ORDER_BG_COLOR,
        },
        '& > *': { position: 'relative', zIndex: 1 },
      }
    : {}),
}));

// ═══════════════════════════════════════════
// ─── Playing Screen ───
// ═══════════════════════════════════════════

export const OrderContainer = styled('div')({
  position: 'relative',
  width: '100%',
  flex: 1,
  minHeight: 0,
  background: 'transparent',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '8px 12px 10px',
  boxSizing: 'border-box',
  '@media (min-width: 768px)': {
    maxWidth: DESKTOP_STATION_WIDTH,
    marginInline: 'auto',
  },
});

export const OrderDecorations = styled('div')({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 0,
});

export const OrderHill = styled('div')<{ variant: 1 | 2 }>(({ variant }) => ({
  position: 'absolute',
  width: '200%',
  height: 400,
  borderRadius: '50%',
  zIndex: 0,
  ...(variant === 1
    ? { backgroundColor: '#8ecf7a', bottom: '15%', left: '-50%', opacity: 0.5 }
    : { backgroundColor: '#6dba5e', bottom: '-12%', right: '-30%', opacity: 0.4 }),
}));

// ─── Top Bar (glass effect) ───

const ORDER_GAME_BAR_BORDER = '#000000';

export const OrderTopBar = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  background: 'rgba(255,255,255,0.75)',
  padding: '5px 10px',
  borderRadius: 10,
  border: `2px solid ${ORDER_GAME_BAR_BORDER}`,
  fontWeight: 700,
  fontSize: 13,
  boxSizing: 'border-box',
  marginBottom: 6,
  position: 'relative',
  zIndex: 2,
  backdropFilter: 'blur(4px)',
  flexShrink: 0,
});

export const OrderTopBarItem = styled('span')({
  fontSize: 14,
  fontWeight: 700,
  color: TEXT_DARK,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
});

export const OrderTopBarTimer = styled('span')<{ critical?: boolean }>(({ critical }) => ({
  fontSize: 14,
  fontWeight: 700,
  color: critical ? BTN_RED : TEXT_DARK,
  transition: 'color 0.3s ease',
}));

// ─── Round Title (purple outlined text — matches intro style, smaller) ───

export const OrderRoundBanner = styled('div')<{ compact?: boolean }>({
  textAlign: 'center',
  width: '100%',
  position: 'relative',
  zIndex: 2,
  flexShrink: 0,
  marginBottom: 2,
  animation: `${slideUp} 0.3s ease-out`,
});

export const OrderRoundBannerText = styled('p')({
  fontFamily: "'Rubik', sans-serif",
  fontSize: 26,
  fontWeight: 400,
  lineHeight: 1.15,
  letterSpacing: '0.02em',
  color: '#ffffff',
  WebkitTextStroke: '2px #155724',
  paintOrder: 'stroke fill',
  margin: 0,
});

// ─── Order Cards ───

export const NatureCardsList = styled('div')<{ cardCount: number }>(({ cardCount }) => ({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: cardCount > 6 ? 6 : 8,
  marginBottom: 4,
  width: '100%',
  position: 'relative',
  zIndex: 1,
  justifyContent: 'center',
}));

export const NatureCard = styled('div')<{
  borderColor: string;
  bgColor: string;
  isDragging?: boolean;
  roundComplete?: boolean;
}>(({ borderColor, bgColor, isDragging, roundComplete }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  border: `2px solid ${borderColor}`,
  borderRadius: 10,
  background: bgColor,
  cursor: roundComplete ? 'default' : 'grab',
  opacity: isDragging ? 0.5 : 1,
  transition: 'all 0.15s ease',
  userSelect: 'none',
  touchAction: 'none',
  boxShadow: `0 2px 0 ${borderColor}22`,
  animation: `${slideUp} 0.2s ease-out`,
  overflow: 'hidden',
  flexShrink: 0,
}));

export const NatureCardNumber = styled('span')<{ status: 'neutral' | 'correct' | 'incorrect' }>(({ status }) => ({
  minWidth: 24,
  height: 24,
  borderRadius: '50%',
  background: status === 'correct' ? BTN_GREEN : status === 'incorrect' ? BTN_RED : BOX_BG,
  color: status !== 'neutral' ? WHITE : TEXT_DARK,
  border: status === 'correct' ? `2px solid ${BTN_GREEN_DARK}` : status === 'incorrect' ? `2px solid ${BTN_RED_DARK}` : `2px solid ${BOX_BORDER}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
  transition: 'all 0.2s ease',
}));

export const NatureCardText = styled('span')({
  flex: 1,
  minWidth: 0,
  fontSize: 15,
  fontWeight: 600,
  color: TEXT_DARK,
  lineHeight: 1.15,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const NatureDragHandle = styled('span')({
  color: BOX_BORDER,
  fontSize: 18,
  opacity: 0.5,
});

export const OrderActionBar = styled('div')({
  width: '100%',
  maxWidth: '100%',
  flexShrink: 0,
  boxSizing: 'border-box',
  paddingTop: 8,
  paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
});

// ─── Check Button (purple — matches Trivia ActionButton) ───

export const NatureCheckButton = styled('button')<{ disabled?: boolean }>(({ disabled }) => ({
  background: disabled ? '#bdc3c7' : BTN_PURPLE,
  color: WHITE,
  fontSize: 16,
  fontWeight: 700,
  padding: '10px 20px',
  borderRadius: 10,
  border: `3px solid ${disabled ? '#95a5a6' : BTN_PURPLE_DARK}`,
  cursor: disabled ? 'default' : 'pointer',
  fontFamily: 'inherit',
  boxShadow: disabled ? 'none' : `0 3px 0 ${BTN_PURPLE_DARK}`,
  transition: 'all 0.1s ease',
  width: '100%',
  position: 'relative' as const,
  zIndex: 1,
  opacity: disabled ? 0.6 : 1,
  flexShrink: 0,
  '&:active': !disabled ? {
    transform: 'translateY(3px)',
    boxShadow: `0 0 0 ${BTN_PURPLE_DARK}`,
  } : {},
}));

// ─── Feedback (fixed center toast — matches Puzzle) ───

export const OrderFeedbackFloater = styled('div')({
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  zIndex: 200,
  padding: 16,
  boxSizing: 'border-box',
});

export const OrderFeedbackContainer = styled('div')<{ variant: 'correct' | 'incorrect' }>(({ variant }) => {
  const border = variant === 'correct' ? BTN_GREEN : BTN_RED;
  return {
    background: 'rgba(255,255,255,0.96)',
    border: `3px solid ${border}`,
    borderRadius: 18,
    padding: '14px 22px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    maxWidth: 'min(340px, 92vw)',
    animation: `${feedbackPop} 0.35s ease-out`,
  };
});

export const OrderCorrectText = styled('div')({
  fontSize: 22,
  fontWeight: 900,
  color: BTN_GREEN,
  textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff',
  lineHeight: 1,
});

export const OrderWrongText = styled('div')({
  fontSize: 22,
  fontWeight: 900,
  color: BTN_RED,
  textShadow: '1px 1px 0 #fff',
  lineHeight: 1,
});

export const OrderPointsBadge = styled('div')({
  background: '#d5f5e3',
  color: BTN_GREEN_DARK,
  borderRadius: 16,
  padding: '6px 14px',
  fontSize: 15,
  fontWeight: 700,
  border: `2px solid ${BTN_GREEN}`,
});

// ─── Hint Button wrapper ───

export const NatureHintWrapper = styled('div')({
  textAlign: 'center',
  marginBottom: 2,
  position: 'relative',
  zIndex: 1,
  flexShrink: 0,
  '& > div': {
    marginTop: 0,
    marginBottom: 0,
    transform: 'scale(0.85)',
    transformOrigin: 'top center',
  },
});

// ═══════════════════════════════════════════
// ─── Opening / Intro Screen (matches Trivia) ───
// ═══════════════════════════════════════════

export const IntroContainer = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  background: 'transparent',
  position: 'relative',
  overflow: 'hidden',
  minHeight: 0,
  width: '100%',
  '@media (min-width: 768px)': {
    maxWidth: DESKTOP_STATION_WIDTH,
    marginInline: 'auto',
    alignItems: 'center',
  },
});

export const IntroContent = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  position: 'relative',
  zIndex: 1,
  padding: 'clamp(12px, 4vh, 36px) 20px clamp(20px, 6vh, 48px)',
  textAlign: 'center',
  width: '100%',
  maxWidth: 420,
  minHeight: 0,
});

export const IntroTitle = styled('h1')({
  margin: '0 0 16px',
  padding: 0,
  background: 'none',
  textAlign: 'center',
  boxSizing: 'border-box',
  width: 'min(100%, 340px)',
  flexShrink: 0,
  fontFamily: "'Rubik', sans-serif",
  fontSize: '48px',
  fontWeight: 400,
  lineHeight: 1.12,
  letterSpacing: '0.02em',
  color: '#ffffff',
  WebkitTextStroke: '4px #155724',
  paintOrder: 'stroke fill',
  animation: `${floatIn} 0.5s ease-out`,
});

export const IntroWelcomeMidSpacer = styled('div')({
  flex: '1 1 0',
  minHeight: 0,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  pointerEvents: 'none',
});

export const OrderWoodBlocksImage = styled('img')({
  width: 'min(100%, 320px)',
  height: 'auto',
  maxHeight: '100%',
  objectFit: 'contain',
  animation: `${floatIn} 0.5s ease-out 0.1s both`,
  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.22))',
});

export const OrderWoodBlocksMidVisual = styled('div')({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'min(100%, 320px)',
  maxHeight: '100%',
});

export const FinishScoreOverlay = styled('div')({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
});

// ─── Intro Description (matches TrueFalse white card + overlapping button) ───

const INTRO_DESC_PURPLE = '#4a148c';
const INTRO_DESC_PANEL_BG = '#f8f8ff';

export const IntroDescStack = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: 'min(100%, 400px)',
  flexShrink: 0,
  marginTop: 'clamp(20px, 4.5vh, 52px)',
  marginBottom: 'clamp(8px, 2vh, 20px)',
  boxSizing: 'border-box',
});

export const IntroDescCard = styled('div')({
  width: '100%',
  backgroundColor: INTRO_DESC_PANEL_BG,
  border: `2px solid ${INTRO_DESC_PURPLE}`,
  borderRadius: 22,
  boxShadow: `
    0 10px 32px rgba(74, 20, 120, 0.38),
    0 4px 12px rgba(45, 10, 80, 0.22)
  `,
  padding: 'clamp(14px, 3.8vw, 22px) clamp(18px, 4.5vw, 24px)',
  paddingBottom: 'clamp(28px, 6vw, 40px)',
  boxSizing: 'border-box',
  textAlign: 'center',
  animation: `${floatIn} 0.5s ease-out 0.08s both`,
});

export const IntroDescText = styled('div')({
  fontSize: 'clamp(16px, 3.25vw, 16px)',
  fontWeight: 600,
  lineHeight: 1.25,
  color: INTRO_DESC_PURPLE,
  letterSpacing: '0.01em',
  whiteSpace: 'pre-wrap',
});

export const IntroStartButton = styled('button')({
  marginTop: 'clamp(-16px, -5.5vw, -34px)',
  position: 'relative' as const,
  zIndex: 2,
  flexShrink: 0,
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
  animation: `${floatIn} 0.5s ease-out 0.22s both`,
  textShadow: '0 1px 0 rgba(0,0,0,0.2)',
  '&:active': {
    transform: 'translateY(4px)',
    boxShadow: '0 2px 0 #0f3d18, 0 4px 10px rgba(0,0,0,0.3)',
  },
});

// ─── Legacy Instructions Card (used only for Golf Intro popup) ───

export const InstructionsCard = styled('div')({
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(6px)',
  borderRadius: 22,
  border: `3px solid ${BOX_BORDER}`,
  padding: '36px 28px',
  maxWidth: 400,
  width: '100%',
  boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
});

export const InstructionsTitle = styled('div')({
  fontSize: 26,
  fontWeight: 800,
  color: TEXT_DARK,
  marginBottom: 14,
});

export const InstructionsText = styled('p')({
  fontSize: 18,
  color: '#555',
  lineHeight: 1.7,
  margin: 0,
  whiteSpace: 'pre-wrap',
});

// ─── Golf Intro Popup ───

export const GOLF_INTRO_BG_URL = '/images/golf-intro-bg.jpeg';

export const GolfIntroOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  animation: `${feedbackPop} 0.3s ease-out`,
  backgroundImage: `url(${GOLF_INTRO_BG_URL})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  backgroundRepeat: 'no-repeat',
  backgroundColor: '#e8a050',
});

// ═══════════════════════════════════════════
// ─── Finish / Game Complete Screen ───
// ═══════════════════════════════════════════

export const FinishContainer = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  background: 'transparent',
  position: 'relative',
  overflow: 'auto',
  minHeight: 0,
  width: '100%',
  '@media (min-width: 768px)': {
    maxWidth: DESKTOP_STATION_WIDTH,
    marginInline: 'auto',
    alignItems: 'center',
  },
});

export const FinishDecorations = styled('div')({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 0,
});

export const FinishContent = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  position: 'relative',
  zIndex: 1,
  padding: '30px 20px 20px',
  textAlign: 'center',
  width: '100%',
  maxWidth: 400,
  // Centre the capped box: the container stretches, so a box narrower than it
  // would sit at the start edge (the right, in Hebrew) on phones wider than the cap.
  marginInline: 'auto',
});

export const FinishTitleBanner = styled('div')({
  background: `linear-gradient(135deg, ${LEAF_BANNER_BG} 0%, ${LEAF_BANNER_DARK} 100%)`,
  color: WHITE,
  padding: '14px 36px',
  borderRadius: 14,
  fontSize: 24,
  fontWeight: 800,
  textAlign: 'center',
  transform: 'rotate(-2deg)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  marginBottom: 24,
  position: 'relative',
  overflow: 'hidden',
  animation: `${floatIn} 0.4s ease-out`,
});

export const FinishStumpStage = styled('div')({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  zIndex: 1,
});

export const FinishStump = styled('div')({
  width: 'clamp(160px, 48vw, 220px)',
  height: 'clamp(160px, 48vw, 220px)',
  borderRadius: '50%',
  position: 'relative',
  animation: `${floatIn} 0.5s ease-out 0.15s both`,
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  isolation: 'isolate',
  boxSizing: 'border-box',
  border: '3px solid #ffec9a',
  background: `
    linear-gradient(
      148deg,
      #6b4f0a 0%,
      #8b6914 8%,
      #d4a84b 22%,
      #fcf3b0 34%,
      #b8860b 48%,
      #6b4f0a 58%,
      #daa520 72%,
      #8b6914 88%,
      #5c4010 100%
    )
  `,
  boxShadow: `
    0 4px 0 #3d2a06,
    0 14px 32px rgba(0,0,0,0.42),
    inset 0 2px 5px rgba(255,255,255,0.5),
    inset 0 -4px 10px rgba(0,0,0,0.38)
  `,
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: '11%',
    borderRadius: '50%',
    zIndex: 0,
    background: `
      radial-gradient(
        ellipse 100% 100% at 38% 32%,
        #fffef6 0%,
        #f5e6a8 14%,
        #e6c547 38%,
        #b8860b 65%,
        #704214 92%
      )
    `,
    boxShadow: `
      inset 0 4px 12px rgba(255,255,255,0.42),
      inset 0 -8px 16px rgba(0,0,0,0.45)
    `,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: '8.5%',
    borderRadius: '50%',
    zIndex: 0,
    pointerEvents: 'none',
    border: '2px solid rgba(139, 105, 20, 0.65)',
    boxShadow: 'inset 0 0 5px rgba(255, 235, 160, 0.35)',
  },
});

export const FinishScoreNumber = styled('span')({
  fontSize: 'clamp(48px, 13vw, 64px)',
  fontWeight: 900,
  color: '#fff',
  textShadow: `
    0 1px 0 rgba(0,0,0,0.55),
    0 3px 8px rgba(0,0,0,0.5),
    0 6px 16px rgba(0,0,0,0.25)
  `,
  lineHeight: 1,
  position: 'relative',
  zIndex: 1,
});

export const FinishScoreLabel = styled('span')({
  fontSize: 'clamp(16px, 4.5vw, 20px)',
  fontWeight: 700,
  color: '#fff',
  marginTop: 2,
  position: 'relative',
  zIndex: 1,
  textShadow: '0 1px 2px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.35)',
});

export const FinishFinalLabel = styled('div')({
  fontSize: 18,
  fontWeight: 700,
  color: FINISH_PURPLE_DARK,
  marginBottom: 6,
  animation: `${floatIn} 0.4s ease-out 0.3s both`,
});

export const FinishStats = styled('div')({
  fontSize: 16,
  fontWeight: 600,
  color: '#5a9a3a',
  lineHeight: 1.7,
  marginBottom: 24,
  animation: `${floatIn} 0.4s ease-out 0.35s both`,
});

export const FinishContinueButton = styled('button')({
  background: 'linear-gradient(180deg, #5cb85c 0%, #28a745 48%, #1e7e34 100%)',
  color: '#fff',
  fontSize: 18,
  fontWeight: 700,
  padding: '14px 52px',
  borderRadius: 12,
  border: '5px solid #155724',
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 6px 0 #0f3d18, 0 12px 24px rgba(0,0,0,0.28)',
  textShadow: '0 1px 0 rgba(0,0,0,0.2)',
  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  animation: `${floatIn} 0.5s ease-out 0.4s both`,
  '&:active': {
    transform: 'translateY(4px)',
    boxShadow: '0 2px 0 #0f3d18, 0 4px 10px rgba(0,0,0,0.3)',
  },
});

export const FinishYoozLogo = styled('div')({
  marginTop: 'auto',
  paddingBottom: 20,
  fontSize: 36,
  fontWeight: 900,
  color: FINISH_PURPLE,
  letterSpacing: 2,
});

// ─── Golf-specific nature theme ───

export const GOLF_COLORS = {
  BG_TOP,
  BG_BOTTOM,
  BOX_BORDER,
  BOX_BG,
  TEXT_DARK,
  WHITE,
  BTN_GREEN,
  BTN_GREEN_DARK,
  BTN_RED,
  BTN_RED_DARK,
  LEAF_BANNER_BG,
  LEAF_BANNER_DARK,
  FINISH_PURPLE,
  FINISH_PURPLE_DARK,
} as const;
