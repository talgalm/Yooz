import { styled, keyframes } from '@mui/material/styles';
import { DESKTOP_BREAKPOINT, DESKTOP_STATION_WIDTH } from '../styled';

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

// Finish screen & primary actions (purple — no red CTAs)
const FINISH_PURPLE = '#6c5ce7';
const FINISH_PURPLE_DARK = '#5b4cd4';
const BTN_PURPLE = FINISH_PURPLE;
const BTN_PURPLE_DARK = FINISH_PURPLE_DARK;
const BTN_PURPLE_LIGHT = '#ede7ff';
const FINISH_STUMP_TEXT_COLOR = '#fff';

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
  '@media (min-width: 768px)': {
    maxWidth: DESKTOP_STATION_WIDTH,
    marginInline: 'auto',
    alignItems: 'center',
  },
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
const TRIVIA_PLAY_BG_URL = '/images/true-false-play-bg.png';

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

export const TriviaPlayFullScreenSceneBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  backgroundColor: '#a8c76a',
  backgroundImage: `url(${TRIVIA_PLAY_BG_URL})`,
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

/** Intro title: white fill + green outline. */
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

/** Fills space so instructions sit below the title (like TrueFalse). */
export const IntroWelcomeMidSpacer = styled('div')({
  flex: '1 1 0',
  minHeight: 0,
  width: '100%',
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
    boxShadow: '0 2px 0 #5c3d0a, 0 4px 10px rgba(0,0,0,0.3)',
  },
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
  '@media (min-width: 768px)': {
    maxWidth: DESKTOP_STATION_WIDTH,
    marginInline: 'auto',
  },
});

/**
 * Question body — the single scroll surface of the play view.
 *
 * Previously `overflow: hidden`, which forced question + media + answers to be
 * squeezed into whatever height was left: long questions got their first line
 * clipped, tall media was cropped to a sliver, and answer labels were cut
 * mid-word (QA Aug 2026). Content now keeps its natural size and this column
 * scrolls; the top bar and the Check/Next footer stay pinned outside it.
 *
 * `& > *` pins every child at its intrinsic height — in a scrolling flex
 * column children would otherwise still shrink to fit.
 */
export const TriviaMainScroll = styled('div')<{ fadeBottom?: boolean }>(({ fadeBottom }) => {
  // Masks the scroll viewport (not the content), so the fade stays pinned to
  // the bottom edge while content passes under it. Colour-agnostic, which
  // matters over the play background artwork.
  const fade = 'linear-gradient(to bottom, #000 calc(100% - 34px), transparent 100%)';
  return {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    width: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    touchAction: 'pan-y',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 10,
    boxSizing: 'border-box',
    // Bar itself is hidden — `ScrollMoreHint` + this fade carry the affordance.
    scrollbarWidth: 'none' as const,
    msOverflowStyle: 'none',
    '&::-webkit-scrollbar': { display: 'none' },
    '& > *': { flexShrink: 0 },
    ...(fadeBottom ? { maskImage: fade, WebkitMaskImage: fade } : {}),
  };
});

/** Positioning context for the scroll hint, which must not scroll with content. */
export const TriviaScrollArea = styled('div')({
  position: 'relative',
  flex: 1,
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
});

const scrollNudge = keyframes`
  0%, 100% { transform: translateY(0); opacity: 0.75; }
  50% { transform: translateY(4px); opacity: 1; }
`;

/**
 * "More below" chevron. Centred with `inset-inline: 0; margin-inline: auto`
 * rather than a translate, so it doesn't fight the nudge animation's transform.
 * Non-interactive — it sits over the answer grid and must not eat taps.
 */
export const ScrollMoreHint = styled('div')({
  position: 'absolute',
  // Sits inside the 34px fade band, with room for the nudge animation so it
  // never crosses into the Check/Next footer.
  bottom: 6,
  insetInline: 0,
  marginInline: 'auto',
  width: 28,
  height: 28,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // Near-solid with a light ring: the band behind it is faded white answer
  // cards over purple artwork, so a translucent chip just reads as a smudge.
  background: '#2d1e4b',
  border: '2px solid rgba(255,255,255,0.9)',
  color: '#fff',
  boxSizing: 'border-box',
  pointerEvents: 'none',
  zIndex: 3,
  boxShadow: '0 2px 10px rgba(0,0,0,0.45)',
  animation: `${scrollNudge} 1.5s ease-in-out infinite`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
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

/** Grows with the question text — never clipped; `TriviaMainScroll` scrolls instead. */
export const QuestionBox = styled('div')({
  background: BOX_BG,
  border: `3px solid ${BOX_BORDER}`,
  borderRadius: 12,
  padding: '10px 14px',
  textAlign: 'center',
  boxShadow: `0 3px 0 ${BOX_SHADOW}`,
  width: '100%',
  boxSizing: 'border-box',
  position: 'relative',
  zIndex: 1,
  flexShrink: 0,
  animation: `${slideUp} 0.3s ease-out`,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 4,
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
  fontSize: 'clamp(15px, 4.2vw, 18px)',
  fontWeight: 700,
  color: TEXT_DARK,
  lineHeight: 1.35,
  margin: 0,
  width: '100%',
  textAlign: 'center',
  overflowWrap: 'break-word',
  [DESKTOP_BREAKPOINT]: { fontSize: 19 },
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

export const HelperLifelineButton = styled('button')<{ disabled?: boolean; kind?: 'half' | 'threeQuarters' }>(({ disabled, kind }) => {
  // Silver style for 1/2
  if (kind === 'half') {
    return {
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box' as const,
      padding: '8px 12px',
      fontSize: 15,
      fontWeight: 800,
      fontFamily: 'inherit',
      borderRadius: 10,
      border: `3px solid ${disabled ? '#bbb' : '#888'}`,
      background: disabled
        ? '#dfe6e9'
        : 'linear-gradient(180deg, #f0f0f0 0%, #d4d4d4 35%, #b0b0b0 65%, #c8c8c8 100%)',
      color: disabled ? '#aaa' : '#3a3a3a',
      cursor: disabled ? 'default' : 'pointer',
      boxShadow: disabled ? 'none' : '0 3px 0 #777, inset 0 1px 0 rgba(255,255,255,0.6)',
      opacity: disabled ? 0.55 : 1,
      textShadow: disabled ? 'none' : '0 1px 0 rgba(255,255,255,0.5)',
      transition: 'all 0.1s ease',
      '&:active': !disabled ? { transform: 'translateY(3px)', boxShadow: '0 0 0 #777' } : {},
    };
  }
  // Bronze style for 3/4
  if (kind === 'threeQuarters') {
    return {
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box' as const,
      padding: '8px 12px',
      fontSize: 15,
      fontWeight: 800,
      fontFamily: 'inherit',
      borderRadius: 10,
      border: `3px solid ${disabled ? '#bbb' : '#7a4010'}`,
      background: disabled
        ? '#dfe6e9'
        : 'linear-gradient(180deg, #e8a870 0%, #c87840 35%, #9e5520 65%, #b86830 100%)',
      color: disabled ? '#aaa' : '#fff',
      cursor: disabled ? 'default' : 'pointer',
      boxShadow: disabled ? 'none' : '0 3px 0 #6a3208, inset 0 1px 0 rgba(255,220,160,0.5)',
      opacity: disabled ? 0.55 : 1,
      textShadow: disabled ? 'none' : '0 1px 2px rgba(0,0,0,0.4)',
      transition: 'all 0.1s ease',
      '&:active': !disabled ? { transform: 'translateY(3px)', boxShadow: '0 0 0 #6a3208' } : {},
    };
  }
  // Fallback (original purple)
  return {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box' as const,
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
    '&:active': !disabled ? { transform: 'translateY(3px)', boxShadow: `0 0 0 ${BTN_PURPLE_DARK}` } : {},
  };
});

// ─── Answer Grid (3 cols for >6, 2×2 for 4–6, single column for <4) ───

/** Columns the grid renders for a given answer count — shared with `AnswerButton` sizing. */
export function answerGridColumns(answerCount?: number): 1 | 2 | 3 {
  if (!answerCount || answerCount < 4) return 1;
  return answerCount > 6 ? 3 : 2;
}

export const AnswerGrid = styled('div')<{ answerCount?: number }>(({ answerCount }) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${answerGridColumns(answerCount)}, minmax(0, 1fr))`,
  alignItems: 'stretch',
  gap: 8,
  width: '100%',
  position: 'relative',
  zIndex: 1,
  flexShrink: 0,
  minHeight: 0,
}));

export const AnswerButton = styled('button')<{
  selected?: boolean;
  checked?: boolean;
  isCorrect?: boolean;
  isSelected?: boolean;
  answerCount?: number;
}>(({ selected, checked, isCorrect, isSelected, answerCount }) => {
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

  // Tighter type at 3 columns so long Hebrew labels wrap instead of being
  // clipped; the cell still grows vertically to fit whatever it wraps to.
  const columns = answerGridColumns(answerCount);
  const fontSize =
    columns === 3 ? 'clamp(11px, 3.1vw, 14px)' : 'clamp(13px, 3.7vw, 16px)';
  const minHeight = columns === 3 ? 68 : columns === 2 ? 76 : 56;

  return {
    background: bg,
    border: `3px solid ${borderColor}`,
    borderRadius: 10,
    padding: columns === 3 ? '8px 4px' : '8px 8px',
    minHeight,
    height: '100%',
    boxSizing: 'border-box' as const,
    minWidth: 0,
    fontSize,
    fontWeight: 600,
    color: textColor,
    cursor: checked ? 'default' : 'pointer',
    opacity,
    boxShadow: shadow,
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
    outline: 'none',
    textAlign: 'center' as const,
    lineHeight: 1.25,
    whiteSpace: 'normal' as const,
    overflowWrap: 'break-word' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    [DESKTOP_BREAKPOINT]: {
      fontSize: columns === 3 ? 15 : 16,
      padding: '10px 12px',
    },
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

// ─── Feedback Overlay (matches TrueFalse — fixed center white card) ───

export const FeedbackOverlayRoot = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  padding: 24,
  boxSizing: 'border-box',
});

export const FeedbackOverlayCard = styled('div')<{ variant: 'correct' | 'partial' | 'incorrect' }>(({ variant }) => {
  const accentColor =
    variant === 'correct' ? '#00C853'
    : variant === 'partial' ? '#f39c12'
    : '#e53935';

  return {
    background: WHITE,
    color: accentColor,
    padding: 'clamp(18px, 4.5vw, 28px) clamp(36px, 10vw, 64px)',
    borderRadius: 22,
    border: `5px solid ${accentColor}`,
    fontFamily: 'inherit',
    fontSize: 'clamp(22px, 5.5vw, 32px)',
    fontWeight: 800,
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    animation: `${feedbackPop} 0.35s ease-out`,
    whiteSpace: 'nowrap',
    maxWidth: 'min(92vw, 400px)',
  };
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

/**
 * Tappable so the question image can be opened full screen — trivia images are
 * often screenshots (phishing mails, forms) that are unreadable at column width.
 */
export const NatureMediaContainer = styled('button')({
  appearance: 'none',
  WebkitAppearance: 'none',
  border: 'none',
  background: 'transparent',
  font: 'inherit',
  padding: 0,
  marginTop: 8,
  marginBottom: 8,
  display: 'block',
  position: 'relative',
  zIndex: 1,
  // Hugs the scaled image so the border and the zoom badge sit on the picture
  // itself instead of around empty letterbox bands.
  width: 'fit-content',
  maxWidth: '100%',
  alignSelf: 'center',
  flexShrink: 0,
  borderRadius: 10,
  lineHeight: 0,
  cursor: 'zoom-in',
  '&:active': { transform: 'scale(0.99)' },
});

export const NatureMediaSpacer = styled('div')({
  width: '100%',
  height: 16,
  flexShrink: 0,
});

export const NatureMediaImage = styled('img')({
  display: 'block',
  width: 'auto',
  height: 'auto',
  maxWidth: '100%',
  // Capped so a tall image can't push the answers off the scroll surface —
  // tap to open it full screen instead.
  maxHeight: 'min(38vh, 300px)',
  objectFit: 'contain',
  borderRadius: 10,
  boxSizing: 'border-box',
  border: `2px solid rgba(74,101,114,0.3)`,
  [DESKTOP_BREAKPOINT]: { maxHeight: 'min(32vh, 300px)' },
});

/** Magnifier affordance so the tap target reads as "enlarge". */
export const MediaZoomBadge = styled('span')({
  position: 'absolute',
  bottom: 8,
  insetInlineEnd: 8,
  width: 30,
  height: 30,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(30, 20, 50, 0.62)',
  color: '#fff',
  fontSize: 15,
  lineHeight: 1,
  pointerEvents: 'none',
  boxShadow: '0 2px 8px rgba(0,0,0,0.28)',
});

// ─── Full-screen media viewer (mirrors RiddleStation's image lightbox) ───

export const MediaFullscreenOverlay = styled('div')<{ panning?: boolean }>(({ panning }) => ({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.92)',
  display: 'flex',
  // `margin: auto` on the image (not `align/justify-content: center`) — a
  // centred flex child that overflows its scroll container gets its top/start
  // edge clipped and becomes unreachable.
  overflow: panning ? 'auto' : 'hidden',
  overscrollBehavior: 'contain',
  touchAction: panning ? 'pan-x pan-y' : 'manipulation',
  // Above the sticky session header (z 30) and the trivia feedback toast (z 200).
  zIndex: 99999,
  cursor: 'zoom-out',
  padding: panning ? 0 : 16,
  boxSizing: 'border-box',
}));

/**
 * Tap toggles fit → 2× (the app sets `user-scalable=no`, so the browser's own
 * pinch-zoom can't rescue a wide screenshot on a phone).
 */
export const MediaFullscreenImg = styled('img')<{ panning?: boolean }>(({ panning }) => (
  panning
    ? {
        width: '200%',
        maxWidth: 'none',
        height: 'auto',
        margin: 'auto',
        flexShrink: 0,
        cursor: 'zoom-out',
      }
    : {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        margin: 'auto',
        borderRadius: 8,
        cursor: 'zoom-in',
      }
));

export const MediaFullscreenClose = styled('button')({
  position: 'absolute',
  top: 'max(16px, env(safe-area-inset-top, 16px))',
  insetInlineEnd: 16,
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  fontSize: 28,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  fontFamily: 'inherit',
  zIndex: 1,
  '&:hover': { background: 'rgba(255,255,255,0.25)' },
  '&:active': { transform: 'scale(0.94)' },
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

export const FinishContent = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'relative',
  zIndex: 1,
  padding: '30px 20px 20px',
  textAlign: 'center',
  width: '100%',
  maxWidth: 400,
  marginInline: 'auto',
  minHeight: '100%',
});

export const FinishTitleBanner = styled('div')({
  margin: '0 0 16px',
  padding: 0,
  background: 'none',
  width: 'min(100%, 340px)',
  color: '#ffffff',
  fontFamily: "'Rubik', sans-serif",
  fontSize: '48px',
  fontWeight: 400,
  lineHeight: 1.12,
  letterSpacing: '0.02em',
  WebkitTextStroke: '4px #155724',
  paintOrder: 'stroke fill',
  textAlign: 'center',
  position: 'relative',
  zIndex: 1,
  flexShrink: 0,
  animation: `${floatIn} 0.4s ease-out`,
});

export const FinishStumpStage = styled('div')({
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const FinishStump = styled('div')({
  width: 'clamp(160px, 48vw, 220px)',
  height: 'clamp(160px, 48vw, 220px)',
  borderRadius: '50%',
  position: 'relative',
  top: 'clamp(-36px, -6vh, -16px)',
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
  '@media (orientation: landscape) and (max-height: 520px)': {
    width: 'clamp(140px, 26vw, 190px)',
    height: 'clamp(140px, 26vw, 190px)',
  },
});

export const FinishScoreNumber = styled('span')({
  fontSize: 'clamp(48px, 13vw, 64px)',
  fontWeight: 900,
  color: FINISH_STUMP_TEXT_COLOR,
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
  color: FINISH_STUMP_TEXT_COLOR,
  marginTop: 2,
  position: 'relative',
  zIndex: 1,
  textShadow: '0 1px 2px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.35)',
});

export const FinishFinalLabel = styled('div')({
  fontSize: 18,
  fontWeight: 700,
  color: FINISH_PURPLE_DARK,
  marginBottom: 24,
  animation: `${floatIn} 0.4s ease-out 0.3s both`,
});

export const FinishContinueButton = styled('button')({
  marginTop: 'auto',
  marginBottom: 'clamp(8px, 2vh, 20px)',
  position: 'relative' as const,
  zIndex: 2,
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
  animation: `${floatIn} 0.5s ease-out 0.4s both`,
  textShadow: '0 1px 0 rgba(0,0,0,0.2)',
  '&:active': {
    transform: 'translateY(4px)',
    boxShadow: '0 2px 0 #0f3d18, 0 4px 10px rgba(0,0,0,0.3)',
  },
});
