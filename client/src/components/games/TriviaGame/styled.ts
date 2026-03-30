import { styled, keyframes } from '@mui/material/styles';

// ─── Colors ───

const WHITE = '#fff';

// Box/Card styling
const BOX_BG = '#e3ebf3';
const BOX_BORDER = '#4a6572';
const BOX_SHADOW = '#3a5562';

// Text
const TEXT_DARK = '#2c3e50';

// Buttons
const BTN_GREEN = '#2ecc71';
const BTN_GREEN_DARK = '#27ae60';
const BTN_WRONG_RED = '#e74c3c';
const BTN_WRONG_RED_DARK = '#c0392b';

// Title
const TITLE_BLUE = '#2980b9';

// Finish screen & primary actions (purple — no red CTAs)
const FINISH_PURPLE = '#6c5ce7';
const FINISH_PURPLE_DARK = '#5b4cd4';
const BTN_PURPLE = FINISH_PURPLE;
const BTN_PURPLE_DARK = FINISH_PURPLE_DARK;
const BTN_PURPLE_LIGHT = '#ede7ff';

// Finish banner (purple)
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
// ─── Opening / Intro Screen ───
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
});

export const IntroDecorations = styled('div')({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 0,
});

// ─── Intro full-screen background ───
// Kept as fixed so it covers the entire viewport (like TrueFalseGame) and stays behind UI chrome.
const TRIVIA_WELCOME_BG_URL = '/images/trivia-welcome-bg.png';

export const TriviaIntroFullScreenSceneBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  backgroundColor: '#4a1f6e',
  backgroundImage: `url(${TRIVIA_WELCOME_BG_URL})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  backgroundRepeat: 'no-repeat',
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

/** Match TrueFalse intro title sticker (yellow fill + olive outline). */
export const IntroTitle = styled('h1')({
  margin: '0 0 16px',
  padding: 0,
  background: 'none',
  textAlign: 'center',
  boxSizing: 'border-box',
  width: 'min(100%, 340px)',
  flexShrink: 0,
  fontFamily: "'Secular One', 'Heebo', sans-serif",
  fontSize: '48px',
  fontWeight: 400,
  lineHeight: 1.12,
  letterSpacing: '0.02em',
  color: '#ffff00',
  WebkitTextStroke: '4px #666600',
  paintOrder: 'stroke fill',
  animation: `${floatIn} 0.5s ease-out`,
});

/** Fills space so instructions sit below the title (like TrueFalse). */
export const IntroWelcomeMidSpacer = styled('div')({
  flex: '1 1 0',
  minHeight: 0,
  width: '100%',
});

export const IntroInfoBox = styled('div')({
  textAlign: 'center',
  marginBottom: 12,
  marginTop: 0,
  width: 'min(94%, 400px)',
  flexShrink: 0,
  boxSizing: 'border-box',
  background: 'none',
  border: 'none',
  boxShadow: 'none',
  padding: 0,
  textAlign: 'center',
  animation: `${floatIn} 0.5s ease-out 0.08s both`,
});

export const IntroInfoText = styled('p')({
  fontWeight: 600,
  fontSize: 'clamp(15px, 3.9vw, 18px)',
  color: WHITE,
  lineHeight: 1.55,
  margin: 0,
  whiteSpace: 'pre-wrap',
  textShadow: '0 1px 5px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.35)',
});

export const IntroStartButton = styled('button')({
  marginTop: 0,
  flexShrink: 0,
  background: 'linear-gradient(180deg, #f5d76e 0%, #e8b923 45%, #c9a012 100%)',
  color: '#2a1538',
  fontSize: '1.55rem',
  fontWeight: 800,
  padding: '14px 44px',
  borderRadius: 15,
  border: '4px solid #8b6914',
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 5px 0 #5c3d0a, 0 10px 22px rgba(0,0,0,0.35)',
  transition: 'all 0.1s ease',
  animation: `${floatIn} 0.5s ease-out 0.25s both`,
  '&:active': {
    transform: 'translateY(4px)',
    boxShadow: '0 1px 0 #5c3d0a, 0 4px 10px rgba(0,0,0,0.3)',
  },
  textShadow: '0 1px 0 rgba(255,255,255,0.35)',
});

export const IntroYoozLogo = styled('div')({
  marginTop: 'auto',
  paddingBottom: 12,
  paddingTop: 0,
  fontSize: 36,
  fontWeight: 900,
  color: WHITE,
  letterSpacing: 2,
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
});

// ═══════════════════════════════════════════
// ─── Playing / Question Screen ───
// ═══════════════════════════════════════════

/** Fills parent flex area (e.g. under mission header); do not use 100dvh — that clips the footer. */
export const TriviaContainer = styled('div')({
  position: 'relative',
  width: '100%',
  flex: 1,
  minHeight: 0,
  alignSelf: 'stretch',
  background: 'transparent',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '6px 12px 0',
  boxSizing: 'border-box',
  gap: 6,
});

/** Question body; overflow hidden — no horizontal or vertical scroll in play view. */
export const TriviaMainScroll = styled('div')({
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  width: '100%',
  overflow: 'hidden',
  overscrollBehavior: 'none',
  touchAction: 'manipulation',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  paddingBottom: 8,
  boxSizing: 'border-box',
});

/** Fixed footer for Check / Next / Continue — gap from bottom edge + safe area. */
export const TriviaBottomBar = styled('div')({
  width: '100%',
  maxWidth: '100%',
  flexShrink: 0,
  boxSizing: 'border-box',
  paddingTop: 8,
  paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
});

export const TriviaDecorations = styled('div')({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 0,
});

export const TriviaHill = styled('div')<{ variant: 1 | 2 }>(({ variant }) => ({
  position: 'absolute',
  width: '200%',
  height: 400,
  borderRadius: '50%',
  zIndex: 0,
  ...(variant === 1
    ? { backgroundColor: '#8ecf7a', bottom: '15%', left: '-50%', opacity: 0.5 }
    : { backgroundColor: '#6dba5e', bottom: '-12%', right: '-30%', opacity: 0.4 }),
}));

// ─── Top Bar ───

export const TopBar = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  background: 'rgba(255,255,255,0.75)',
  padding: '4px 10px',
  borderRadius: 10,
  border: `2px solid ${BOX_BORDER}`,
  fontWeight: 700,
  fontSize: 13,
  boxSizing: 'border-box',
  flexShrink: 0,
  position: 'relative',
  zIndex: 2,
  backdropFilter: 'blur(4px)',
  gap: 6,
});

export const TopBarItem = styled('span')({
  fontSize: 13,
  fontWeight: 700,
  color: TEXT_DARK,
  display: 'flex',
  alignItems: 'center',
  gap: 3,
});

export const TopBarTimer = styled('span')<{ critical?: boolean }>(({ critical }) => ({
  fontSize: 13,
  fontWeight: 700,
  color: critical ? BTN_PURPLE_DARK : TEXT_DARK,
  transition: 'color 0.3s ease',
}));

// ─── Question Box ───

export const QuestionBox = styled('div')({
  background: BOX_BG,
  border: `3px solid ${BOX_BORDER}`,
  borderRadius: 12,
  padding: '8px 14px',
  textAlign: 'center',
  boxShadow: `0 3px 0 ${BOX_SHADOW}`,
  width: '100%',
  boxSizing: 'border-box',
  position: 'relative',
  zIndex: 1,
  flexShrink: 1,
  minHeight: 0,
  overflow: 'hidden',
  animation: `${slideUp} 0.3s ease-out`,
});

export const QuestionBadge = styled('div')({
  display: 'inline-block',
  background: '#bdc3c7',
  border: `2px solid ${BOX_BORDER}`,
  padding: '2px 12px',
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 700,
  color: TEXT_DARK,
  whiteSpace: 'nowrap',
  marginBottom: 4,
});

export const QuestionContent = styled('p')({
  fontSize: 17,
  fontWeight: 700,
  color: TEXT_DARK,
  lineHeight: 1.3,
  margin: 0,
});

export const QuestionHintText = styled('p')({
  fontSize: 13,
  color: '#7f8c8d',
  margin: '2px 0 0',
  fontStyle: 'italic',
});

export const HintSpacer = styled('div')({
  width: '100%',
  minHeight: 52,
  flexShrink: 0,
});

/** Same column widths as `AnswerGrid` (1fr 1fr, same gap). */
export const HelperLifelineRow = styled('div')({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 6,
  alignItems: 'stretch',
  width: '100%',
  flexShrink: 0,
  marginTop: 20,
  marginBottom: 2,
  boxSizing: 'border-box',
});

export const HelperLifelineSpacer = styled('div')({
  width: '100%',
  minHeight: 48,
  flexShrink: 0,
});

export const HelperLifelineCaption = styled('p')({
  margin: 0,
  fontSize: 11,
  fontWeight: 600,
  color: '#5d6d7e',
  textAlign: 'center',
  width: '100%',
  lineHeight: 1.25,
});

export const HelperLifelineButton = styled('button')<{ disabled?: boolean }>(({ disabled }) => ({
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  padding: '8px 12px',
  fontSize: 15,
  fontWeight: 800,
  fontFamily: 'inherit',
  borderRadius: 10,
  border: `3px solid ${disabled ? '#95a5a6' : BTN_PURPLE_DARK}`,
  background: disabled ? '#dfe6e9' : BTN_PURPLE_LIGHT,
  color: disabled ? TEXT_DARK : BTN_PURPLE_DARK,
  cursor: disabled ? 'default' : 'pointer',
  boxShadow: disabled ? 'none' : `0 3px 0 ${BTN_PURPLE_DARK}`,
  opacity: disabled ? 0.55 : 1,
  transition: 'all 0.1s ease',
  '&:active': !disabled
    ? {
        transform: 'translateY(3px)',
        boxShadow: `0 0 0 ${BTN_PURPLE_DARK}`,
      }
    : {},
}));

// ─── Answer Grid (2×2) ───

export const AnswerGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gridTemplateRows: 'auto auto',
  gap: 6,
  width: '100%',
  position: 'relative',
  zIndex: 1,
  flexShrink: 0,
  minHeight: 0,
});

export const AnswerButton = styled('button')<{
  selected?: boolean;
  checked?: boolean;
  isCorrect?: boolean;
  isSelected?: boolean;
}>(({ selected, checked, isCorrect, isSelected }) => {
  let bg = BOX_BG;
  let borderColor = BOX_BORDER;
  let textColor = TEXT_DARK;
  let opacity = 1;
  let shadow = `0 3px 0 ${BOX_SHADOW}`;

  if (checked) {
    if (isCorrect) {
      bg = BTN_GREEN;
      borderColor = BTN_GREEN_DARK;
      textColor = WHITE;
      shadow = `0 3px 0 ${BTN_GREEN_DARK}`;
    } else if (isSelected && !isCorrect) {
      bg = BTN_WRONG_RED;
      borderColor = BTN_WRONG_RED_DARK;
      textColor = WHITE;
      shadow = `0 3px 0 ${BTN_WRONG_RED_DARK}`;
    } else {
      opacity = 0.45;
    }
  } else if (selected) {
    borderColor = BTN_PURPLE_DARK;
    bg = BTN_PURPLE_LIGHT;
    textColor = BTN_PURPLE_DARK;
    shadow = `0 3px 0 ${BTN_PURPLE_DARK}`;
  } else {
    borderColor = BTN_PURPLE;
    bg = WHITE;
    textColor = TEXT_DARK;
    shadow = `0 3px 0 ${BTN_PURPLE_DARK}`;
  }

  return {
    background: bg,
    border: `3px solid ${borderColor}`,
    borderRadius: 10,
    padding: '6px 6px',
    minHeight: 84,
    fontSize: 15,
    fontWeight: 600,
    color: textColor,
    cursor: checked ? 'default' : 'pointer',
    opacity,
    boxShadow: shadow,
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
    outline: 'none',
    textAlign: 'center' as const,
    lineHeight: 1.2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&:active': !checked ? {
      transform: 'translateY(3px)',
      boxShadow: `0 0 0 ${BTN_PURPLE_DARK}`,
    } : {},
  };
});

// ─── Action Buttons ───

export const ActionButton = styled('button')<{ disabled?: boolean }>(({ disabled }) => ({
  background: disabled ? '#bdc3c7' : BTN_PURPLE,
  color: WHITE,
  fontSize: 16,
  marginTop: 0,
  fontWeight: 700,
  padding: '10px 20px',
  borderRadius: 10,
  border: `3px solid ${disabled ? '#95a5a6' : BTN_PURPLE_DARK}`,
  cursor: disabled ? 'default' : 'pointer',
  fontFamily: 'inherit',
  boxShadow: disabled ? 'none' : `0 3px 0 ${BTN_PURPLE_DARK}`,
  transition: 'all 0.1s ease',
  width: '100%',
  flexShrink: 0,
  position: 'relative' as const,
  zIndex: 1,
  opacity: disabled ? 0.6 : 1,
  '&:active': !disabled ? {
    transform: 'translateY(3px)',
    boxShadow: `0 0 0 ${BTN_PURPLE_DARK}`,
  } : {},
}));

// ─── Center-screen feedback toast (~1s, does not shift layout) ───

export const CenterToastOverlay = styled('div')({
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

export const CenterToastBubble = styled('div')<{ variant: 'correct' | 'partial' | 'incorrect' }>(({ variant }) => {
  const border =
    variant === 'correct'
      ? BTN_GREEN
      : variant === 'partial'
        ? '#f39c12'
        : BTN_WRONG_RED;
  return {
    background: 'rgba(255,255,255,0.96)',
    border: `3px solid ${border}`,
    borderRadius: 18,
    padding: '14px 22px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 'min(340px, 92vw)',
    animation: `${feedbackPop} 0.35s ease-out`,
  };
});

// ─── Inline feedback (legacy helpers — PointsBadge still used in toast) ───

export const FeedbackContainer = styled('div')({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  animation: `${feedbackPop} 0.3s ease-out`,
});

export const CorrectBigText = styled('div')({
  fontSize: 22,
  fontWeight: 900,
  color: BTN_GREEN,
  textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff',
  lineHeight: 1,
});

export const PartialText = styled('div')({
  fontSize: 20,
  fontWeight: 900,
  color: '#f39c12',
  textShadow: '1px 1px 0 #fff',
  lineHeight: 1,
});

export const IncorrectToastText = styled('div')({
  fontSize: 22,
  fontWeight: 900,
  color: BTN_WRONG_RED,
  textShadow: '1px 1px 0 #fff',
  lineHeight: 1,
});

export const PointsBadge = styled('div')({
  background: '#d5f5e3',
  color: BTN_GREEN_DARK,
  borderRadius: 16,
  padding: '3px 12px',
  fontSize: 13,
  fontWeight: 700,
  border: `2px solid ${BTN_GREEN}`,
});

export const PointsBadgePartial = styled(PointsBadge)({
  background: '#fef5e7',
  color: '#d68910',
  border: '2px solid #f39c12',
});

/** Explanations below the full answer grid (full width). */
export const TriviaExplanationList = styled('div')({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginTop: 10,
  flexShrink: 0,
});

export const TriviaExplanation = styled('div')({
  background: BOX_BG,
  border: `2px solid ${BOX_BORDER}`,
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 13,
  fontWeight: 600,
  color: TEXT_DARK,
  lineHeight: 1.4,
  width: '100%',
  boxSizing: 'border-box',
  textAlign: 'center',
  position: 'relative',
  zIndex: 1,
  flexShrink: 0,
  animation: `${slideUp} 0.3s ease-out`,
});

// ─── Media ───

export const NatureMediaContainer = styled('div')({
  textAlign: 'center',
  position: 'relative',
  zIndex: 1,
  flexShrink: 1,
  minHeight: 0,
  overflow: 'hidden',
});

export const NatureMediaImage = styled('img')({
  maxWidth: '100%',
  maxHeight: 120,
  borderRadius: 10,
  objectFit: 'contain',
  border: `2px solid rgba(74,101,114,0.3)`,
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

export const FinishStump = styled('div')({
  width: 220,
  height: 220,
  borderRadius: '50%',
  background: `linear-gradient(135deg, ${FINISH_PURPLE} 0%, ${FINISH_PURPLE_DARK} 100%)`,
  border: '4px solid #fff',
  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  marginBottom: 16,
  animation: `${floatIn} 0.5s ease-out 0.15s both`,
});

export const FinishScoreNumber = styled('span')({
  fontSize: 64,
  fontWeight: 900,
  color: '#fff',
  textShadow: '0 2px 4px rgba(0,0,0,0.2)',
  lineHeight: 1,
  position: 'relative',
  zIndex: 1,
});

export const FinishScoreLabel = styled('span')({
  fontSize: 20,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.95)',
  marginTop: 2,
  position: 'relative',
  zIndex: 1,
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
  background: '#fff',
  color: FINISH_PURPLE,
  fontSize: 18,
  fontWeight: 700,
  padding: '14px 52px',
  borderRadius: 12,
  border: '1px solid rgba(108,92,231,0.3)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'transform 0.1s ease',
  animation: `${floatIn} 0.5s ease-out 0.4s both`,
  '&:active': {
    transform: 'scale(0.98)',
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
