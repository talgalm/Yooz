import { styled, keyframes } from '@mui/material/styles';

// ─── Colors ───

const WHITE = '#fff';
const TIMER_RED = '#c0392b';

// Timer circle — flat purple + dark rim (reference: countdown “6” on hills)
const TIMER_PURPLE_FILL = '#8E24AA';
const TIMER_PURPLE_BORDER = '#4A148C';
const TIMER_NUMBER_STROKE = '#000000';

// Game screen palette
const HILL_1 = '#9dbb76';
const HILL_2 = '#8dae63';
const QUESTION_BG = '#2b492b';

const BTN_RED_BG = '#f0a0a0';
const BTN_RED_BORDER = '#a84343';
const BTN_GREEN_BG = '#6cac5e';
const BTN_GREEN_BORDER = '#2d5626';

/** Matches app body typography */
const TF_FONT_FAMILY =
  "'Encode Sans Expanded', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// ─── Animations ───

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

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

// ─── Game Layout ───

export const NatureContainer = styled('div')({
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: 0,
  backgroundColor: 'transparent',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: 'max(8px, env(safe-area-inset-top)) 16px calc(8px + env(safe-area-inset-bottom))',
  boxSizing: 'border-box',
  gap: 4,
  fontFamily: TF_FONT_FAMILY,
});

export const NatureDecorations = styled('div')({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 0,
});

export const Hill = styled('div')<{ variant: 1 | 2 }>(({ variant }) => ({
  position: 'absolute',
  width: '200%',
  height: 400,
  borderRadius: '50%',
  zIndex: 0,
  ...(variant === 1
    ? { backgroundColor: HILL_1, bottom: '20%', left: '-50%' }
    : { backgroundColor: HILL_2, bottom: '-10%', right: '-30%' }),
}));

// ─── Header ───

export const TFHeader = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  alignSelf: 'stretch',
  position: 'relative',
  zIndex: 1,
  flexShrink: 0,
  background: 'rgba(255,255,255,0.75)',
  padding: '4px 10px',
  borderRadius: 10,
  border: '2px solid #4a6572',
  boxSizing: 'border-box',
  backdropFilter: 'blur(4px)',
  gap: 6,
});

export const TFHeaderLeft = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
});

export const TFHeaderRight = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
});

export const TFScoreBadge = styled('div')({
  background: 'rgba(74,101,114,0.12)',
  borderRadius: 16,
  padding: '5px 14px',
  fontSize: 14,
  fontWeight: 700,
  color: '#2c3e50',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
});

export const TFProgressBadge = styled('div')({
  background: 'rgba(74,101,114,0.1)',
  borderRadius: 16,
  padding: '5px 12px',
  fontSize: 13,
  fontWeight: 700,
  color: '#2c3e50',
});

// ─── Question banner — white card, purple frame (matches play-phase purple theme) ───

const FINISH_PURPLE = '#6c5ce7';
const FINISH_PURPLE_DARK = '#5b4cd4';
const LEAF_BANNER_BG = FINISH_PURPLE;
const LEAF_BANNER_DARK = FINISH_PURPLE_DARK;

export const QuestionBanner = styled('div')({
  background: '#ffffff',
  color: FINISH_PURPLE,
  textAlign: 'center',
  padding: '14px 18px',
  borderRadius: 22,
  width: '100%',
  lineHeight: 1.35,
  border: `4px solid ${FINISH_PURPLE}`,
  boxShadow: '0 4px 0 rgba(108, 92, 231, 0.22), 0 8px 18px rgba(0,0,0,0.08)',
  position: 'relative',
  zIndex: 2,
  overflow: 'hidden',
  marginTop: 'clamp(14px, 4vw, 22px)',
  animation: `${slideUp} 0.3s ease-out`,
  flexShrink: 1,
  minHeight: 0,
});

export const QuestionBannerText = styled('p')({
  fontFamily: TF_FONT_FAMILY,
  fontSize: 'clamp(18px, 3.6vw, 21px)',
  fontWeight: 700,
  color: FINISH_PURPLE,
  lineHeight: 1.35,
  margin: 0,
  position: 'relative',
  zIndex: 1,
});

// ─── Timer Circle (double-ring design) ───

export const TimerCircleWrapper = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  zIndex: 1,
  flex: '1 0 auto',
  minHeight: 'clamp(150px, 28vh, 200px)',
  width: '100%',
  // Nudge toward vertical screen center (flex slot sits low due to header + question + buttons)
  transform: 'translateY(clamp(-28px, -5.5vh, -10px))',
});

/** Single flat purple disc + thick dark purple rim (reference image) */
export const TimerCircle = styled('div')<{ critical?: boolean }>(({ critical }) => ({
  width: 'clamp(150px, 28vh, 200px)',
  aspectRatio: '1 / 1',
  backgroundColor: critical ? '#b71c1c' : TIMER_PURPLE_FILL,
  borderRadius: '50%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  border: critical
    ? `clamp(8px, 1.8vw, 14px) solid #5c0a0a`
    : `clamp(8px, 1.8vw, 14px) solid ${TIMER_PURPLE_BORDER}`,
  boxSizing: 'border-box',
  boxShadow: critical
    ? '0 4px 0 rgba(0,0,0,0.2)'
    : '0 4px 0 rgba(0,0,0,0.15)',
  transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
}));

export const TimerCircleNumber = styled('span')<{ critical?: boolean }>(({ critical }) => ({
  fontFamily: TF_FONT_FAMILY,
  fontSize: 'clamp(64px, 12vh, 92px)',
  fontWeight: 400,
  color: WHITE,
  WebkitTextStroke: `clamp(2px, 0.35vw, 3px) ${critical ? '#3d0a0a' : TIMER_NUMBER_STROKE}`,
  paintOrder: 'stroke fill',
  lineHeight: 1,
  transition: 'color 0.3s ease, -webkit-text-stroke 0.3s ease',
}));

// ─── True/False Action Buttons ───

export const NatureButtonRow = styled('div')({
  display: 'flex',
  gap: 'clamp(18px, 5vw, 30px)',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
  zIndex: 1,
  flexShrink: 0,
  paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
});

export const WrongButton = styled('button')<{
  answered?: boolean;
  isCorrectAnswer?: boolean;
  wasSelected?: boolean;
}>(({ answered, isCorrectAnswer, wasSelected }) => {
  let opacity = 1;
  let borderColor = BTN_RED_BORDER;

  if (answered) {
    if (isCorrectAnswer) {
      borderColor = '#3d8b37';
    } else if (wasSelected) {
      // wrong selection stays red
    } else {
      opacity = 0.4;
    }
  }

  return {
    width: 'clamp(86px, 13vh, 100px)',
    aspectRatio: '1 / 1',
    borderRadius: '50%',
    backgroundColor: BTN_RED_BG,
    border: `6px solid ${borderColor}`,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: answered ? 'default' : 'pointer',
    opacity,
    boxShadow: '0 6px 0px rgba(0,0,0,0.2)',
    transition: 'transform 0.1s ease, filter 0.2s ease',
    color: BTN_RED_BORDER,
    padding: 0,
    outline: 'none',
    position: 'relative' as const,
    '&:active': !answered ? {
      transform: 'translateY(4px)',
      boxShadow: '0 2px 0px rgba(0,0,0,0.2)',
    } : {},
  };
});

export const CorrectButton = styled('button')<{
  answered?: boolean;
  isCorrectAnswer?: boolean;
  wasSelected?: boolean;
}>(({ answered, isCorrectAnswer, wasSelected }) => {
  let opacity = 1;
  let borderColor = BTN_GREEN_BORDER;

  if (answered) {
    if (isCorrectAnswer) {
      borderColor = '#3d8b37';
    } else if (wasSelected) {
      borderColor = TIMER_RED;
    } else {
      opacity = 0.4;
    }
  }

  return {
    width: 'clamp(86px, 13vh, 100px)',
    aspectRatio: '1 / 1',
    borderRadius: '50%',
    backgroundColor: BTN_GREEN_BG,
    border: `6px solid ${borderColor}`,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: answered ? 'default' : 'pointer',
    opacity,
    boxShadow: '0 6px 0px rgba(0,0,0,0.2)',
    transition: 'transform 0.1s ease, filter 0.2s ease',
    color: BTN_GREEN_BORDER,
    padding: 0,
    outline: 'none',
    position: 'relative' as const,
    '&:active': !answered ? {
      transform: 'translateY(4px)',
      boxShadow: '0 2px 0px rgba(0,0,0,0.2)',
    } : {},
  };
});

// ─── Feedback Overlay (fixed center; transform only on inner card so timer layout is stable) ───

export const FeedbackOverlayRoot = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
  padding: 24,
  boxSizing: 'border-box',
});

export const FeedbackOverlayCard = styled('div')<{ variant: 'correct' | 'incorrect' | 'timeout' }>(({ variant }) => {
  const accentColor =
    variant === 'correct' ? '#00C853'
    : variant === 'incorrect' ? '#e53935'
    : '#e53935';

  return {
    background: WHITE,
    color: accentColor,
    padding: 'clamp(18px, 4.5vw, 28px) clamp(36px, 10vw, 64px)',
    borderRadius: 22,
    border: `5px solid ${accentColor}`,
    fontFamily: TF_FONT_FAMILY,
    fontSize: 'clamp(22px, 5.5vw, 32px)',
    fontWeight: 800,
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    animation: `${feedbackPop} 0.35s ease-out`,
    whiteSpace: 'nowrap',
    maxWidth: 'min(92vw, 400px)',
  };
});

// ─── Countdown ───

export const NatureCountdown = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  justifyContent: 'flex-start',
  backgroundColor: 'transparent',
  minHeight: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
});

export const NatureCountdownBody = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 0,
});

export const NatureCountdownLabel = styled('span')({
  fontSize: 22,
  fontWeight: 700,
  color: WHITE,
  marginBottom: 20,
  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  zIndex: 1,
});

export const NatureCountdownNumber = styled('div')({
  fontSize: 100,
  fontWeight: 800,
  color: WHITE,
  textShadow: '0 4px 12px rgba(0,0,0,0.3)',
  animation: `${pulse} 1s ease-in-out`,
  zIndex: 1,
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
  maxHeight: 'clamp(72px, 12vh, 100px)',
  borderRadius: 12,
  objectFit: 'contain',
  border: '3px solid rgba(255,255,255,0.3)',
});

// ─── Yooz logo ───

export const YoozLogo = styled('div')({
  marginTop: 30,
  paddingBottom: 10,
  fontSize: 36,
  fontWeight: 900,
  color: WHITE,
  WebkitTextStroke: `2px ${QUESTION_BG}`,
  letterSpacing: 2,
  position: 'relative',
  zIndex: 1,
});

// ═══════════════════════════════════════════
// ─── Opening / Instructions Screen (welcome art + readable chrome) ───
// ═══════════════════════════════════════════

const TRUE_FALSE_SCENE_BG_URL = '/images/true-false-scene-bg.png';
export const TRUE_FALSE_WELCOME_BG_URL = TRUE_FALSE_SCENE_BG_URL;
/** In-game phases (countdown, play, finish) — full-bleed behind UI */
export const TRUE_FALSE_PLAY_BG_URL = '/images/true-false-play-bg.png';
const INTRO_GOLD_TOP = '#f2e6a0';
const INTRO_GOLD_MID = '#e1c14f';
const INTRO_GOLD_BOT = '#c9a62e';
const INTRO_GOLD_BORDER = '#5c4018';
const INTRO_GOLD_SHADOW = '#3d2810';
const INTRO_BTN_TEXT = '#3d1a5c';

/** Match NatureBackground sky (#b8e8f0) — embedded intro only (admin preview / no themed shell). */
const WELCOME_SKY_TOP = '#d2f0fa';
const WELCOME_SKY_MID = '#b8e8f0';
const WELCOME_SKY_LOW = '#93d4ec';
const WELCOME_SKY_BOTTOM = '#72bfe0';

/** Full viewport, under session header — pointer-events none so chrome stays clickable. */
export const IntroFullScreenSceneBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  backgroundColor: '#3d1a5c',
  backgroundImage: `
    radial-gradient(ellipse 95% 55% at 50% -8%, rgba(255,255,255,0.16) 0%, transparent 55%),
    radial-gradient(ellipse 120% 80% at 50% 0%, rgba(138, 43, 226, 0.22) 0%, transparent 50%),
    url(${TRUE_FALSE_WELCOME_BG_URL})
  `,
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  backgroundRepeat: 'no-repeat',
});

/** Same stacking as intro backdrop — covers themed scene for countdown / play / finish */
export const PlayFullScreenSceneBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  backgroundColor: '#2d1b4e',
  backgroundImage: `url(${TRUE_FALSE_PLAY_BG_URL})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  backgroundRepeat: 'no-repeat',
});

/**
 * When True False runs without ThemedSceneOverlay (e.g. admin preview), paints the play-phase
 * background inside the preview shell instead of the viewport-fixed overlay.
 */
export const PlayPhaseRoot = styled('div', {
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
          backgroundColor: '#2d1b4e',
          backgroundImage: `url(${TRUE_FALSE_PLAY_BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        },
        '& > *': { position: 'relative', zIndex: 1 },
      }
    : {}),
  fontFamily: TF_FONT_FAMILY,
}));

const embeddedIntroSurface = {
  // Bleed past PlayingContent horizontal padding when there is no full-screen scene overlay.
  width: 'calc(100% + 32px)',
  maxWidth: 'none',
  marginLeft: '-16px',
  marginRight: '-16px',
  boxSizing: 'border-box' as const,
  alignSelf: 'stretch' as const,
  background: `
    radial-gradient(ellipse 130% 95% at 24% 11%, rgba(255,255,255,0.88) 0%, transparent 50%),
    radial-gradient(ellipse 110% 80% at 78% 8%, rgba(255,255,255,0.82) 0%, transparent 46%),
    radial-gradient(ellipse 90% 55% at 52% 20%, rgba(255,255,255,0.4) 0%, transparent 58%),
    linear-gradient(180deg, ${WELCOME_SKY_TOP} 0%, ${WELCOME_SKY_MID} 32%, ${WELCOME_SKY_LOW} 68%, ${WELCOME_SKY_BOTTOM} 100%)
  `,
  backgroundColor: WELCOME_SKY_MID,
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    backgroundImage: `url(${TRUE_FALSE_WELCOME_BG_URL})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    zIndex: 0,
  },
};

export const IntroContainer = styled('div', {
  shouldForwardProp: (prop) => prop !== '$externalBackdrop',
})<{ $externalBackdrop?: boolean }>(({ $externalBackdrop }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  position: 'relative',
  overflow: 'hidden',
  minHeight: 0,
  ...($externalBackdrop
    ? {
        width: '100%',
        maxWidth: 'none',
        marginLeft: 0,
        marginRight: 0,
        background: 'transparent',
        backgroundColor: 'transparent',
      }
    : embeddedIntroSurface),
  '& > *': {
    position: 'relative',
    zIndex: 1,
  },
  fontFamily: TF_FONT_FAMILY,
}));

export const IntroDecorations = styled('div')({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 0,
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

/** Intro title: yellow fill + olive stroke; no panel (shows welcome art behind). */
const GAME_TITLE_YELLOW = '#ffff00';
const GAME_TITLE_OUTLINE = '#666600';

export const IntroGameTitleSticker = styled('h1')({
  margin: '0 0 16px',
  padding: 0,
  background: 'none',
  textAlign: 'center',
  boxSizing: 'border-box',
  width: 'min(100%, 340px)',
  flexShrink: 0,
  animation: `${floatIn} 0.5s ease-out`,
});

export const IntroGameTitleLine = styled('span')({
  display: 'block',
  fontFamily: TF_FONT_FAMILY,
  fontSize: '48px',
  fontWeight: 400,
  lineHeight: 1.12,
  letterSpacing: '0.02em',
  color: GAME_TITLE_YELLOW,
  WebkitTextStroke: `4px ${GAME_TITLE_OUTLINE}`,
  paintOrder: 'stroke fill',
  marginTop: '16px', // move text a little bit down
});

/** Fills space so instructions sit low (below welcome-art circles), above Start. */
export const IntroWelcomeMidSpacer = styled('div')({
  flex: '1 1 0',
  minHeight: 0,
  width: '100%',
});

/** Instructions just above Start: white type, no panel (welcome art shows through). */
export const IntroInstructions = styled('div')({
  textAlign: 'center',
  marginBottom: 12,
  marginTop: 0,
  width: 'min(94%, 400px)',
  flexShrink: 0,
  boxSizing: 'border-box',
  animation: `${floatIn} 0.5s ease-out 0.08s both`,
});

/** Intro: white card + overlapping start button (reference layout). */
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

export const IntroDescLine = styled('p')({
  margin: 0,
  fontSize: 'clamp(16px, 3.25vw, 16px)',
  fontWeight: 600,
  lineHeight: 1.25,
  color: INTRO_DESC_PURPLE,
  fontFamily: TF_FONT_FAMILY,
  letterSpacing: '0.01em',
});

export const IntroDescCustom = styled('div')({
  fontSize: 'clamp(16px, 3.25vw, 16px)',
  fontWeight: 600,
  lineHeight: 1.25,
  color: INTRO_DESC_PURPLE,
  fontFamily: TF_FONT_FAMILY,
  letterSpacing: '0.01em',
  whiteSpace: 'pre-wrap',
});

export const IntroInstructionsLine = styled('p')({
  margin: 0,
  fontSize: 'clamp(15px, 3.9vw, 18px)',
  fontWeight: 600,
  lineHeight: 1.55,
  color: WHITE,
  fontFamily: 'inherit',
  letterSpacing: '0.01em',
  textShadow: '0 1px 5px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.35)',
});

export const IntroInstructionsCustom = styled('div')({
  fontSize: 'clamp(15px, 3.9vw, 18px)',
  fontWeight: 600,
  lineHeight: 1.55,
  color: WHITE,
  fontFamily: 'inherit',
  letterSpacing: '0.01em',
  whiteSpace: 'pre-wrap',
  textShadow: '0 1px 5px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.35)',
});

export const IntroStartButton = styled('button', {
  shouldForwardProp: (prop) => prop !== '$overlap',
})<{ $overlap?: boolean }>(({ $overlap }) => ({
  marginTop: $overlap ? 'clamp(-26px, -5.5vw, -34px)' : 0,
  position: 'relative' as const,
  zIndex: 2,
  flexShrink: 0,
  minWidth: 'clamp(160px, 52%, 240px)',
  background: `linear-gradient(180deg, ${INTRO_GOLD_TOP} 0%, ${INTRO_GOLD_MID} 48%, ${INTRO_GOLD_BOT} 100%)`,
  color: INTRO_BTN_TEXT,
  fontSize: 'clamp(1.35rem, 4.2vw, 1.65rem)',
  fontWeight: 800,
  padding: 'clamp(12px, 3vw, 16px) clamp(36px, 10vw, 52px)',
  borderRadius: 16,
  border: `5px solid ${INTRO_GOLD_BORDER}`,
  cursor: 'pointer',
  fontFamily: TF_FONT_FAMILY,
  boxShadow: `0 6px 0 ${INTRO_GOLD_SHADOW}, 0 12px 24px rgba(0,0,0,0.28)`,
  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  animation: `${floatIn} 0.5s ease-out 0.22s both`,
  textShadow: '0 1px 0 rgba(255,255,255,0.45)',
  '&:active': {
    transform: 'translateY(4px)',
    boxShadow: `0 2px 0 ${INTRO_GOLD_SHADOW}, 0 6px 14px rgba(0,0,0,0.25)`,
  },
}));

export const IntroYoozLogo = styled('div')({
  marginTop: 14,
  paddingBottom: 12,
  paddingTop: 0,
  fontSize: 36,
  fontWeight: 900,
  color: WHITE,
  letterSpacing: 2,
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
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
  overflow: 'hidden',
  minHeight: '100%',
  height: '100%',
});

export const FinishContent = styled('div')({
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

// Title banner (leaf-shaped, like question banner)
export const FinishTitleBanner = styled('div')({
  background: `linear-gradient(135deg, ${LEAF_BANNER_BG} 0%, ${LEAF_BANNER_DARK} 100%)`,
  color: WHITE,
  padding: '14px 36px',
  borderRadius: 14,
  fontSize: 26,
  fontWeight: 800,
  textAlign: 'center',
  transform: 'rotate(-2deg)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  marginBottom: 30,
  position: 'relative',
  overflow: 'hidden',
  animation: `${floatIn} 0.4s ease-out`,
});

/** Gradient score disc + rings (e.g. BallGame finish); True/False summary uses `TimerCircle` + `FinishScoreCircleWrap` */
export const FinishStump = styled('div')({
  width: 210,
  height: 210,
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
  fontSize: 72,
  fontWeight: 900,
  color: '#fff',
  textShadow: '0 2px 4px rgba(0,0,0,0.2)',
  lineHeight: 1,
  position: 'relative',
  zIndex: 1,
});

/** Score timer disc — sits in the same vertical band as intro instructions (below mid spacer) */
export const FinishScoreCircleWrap = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  flexShrink: 0,
  marginBottom: 4,
  animation: `${floatIn} 0.5s ease-out 0.15s both`,
});

export const FinishScoreCircleInner = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  lineHeight: 1,
});

export const FinishScoreLabel = styled('span')({
  fontFamily: TF_FONT_FAMILY,
  fontSize: 'clamp(15px, 3.2vw, 20px)',
  fontWeight: 700,
  color: WHITE,
  WebkitTextStroke: 'clamp(1px, 0.2vw, 2px) rgba(0,0,0,0.45)',
  paintOrder: 'stroke fill',
  marginTop: 2,
  position: 'relative',
  zIndex: 1,
});

/** Summary copy: same rhythm as intro instructions, green on play-phase backdrop */
const FINISH_SUMMARY_GREEN = '#8fefb0';
const FINISH_SUMMARY_GREEN_DEEP = '#5dce7a';

export const FinishFinalLabel = styled('div')({
  fontSize: 'clamp(15px, 3.9vw, 18px)',
  fontWeight: 700,
  color: FINISH_SUMMARY_GREEN,
  lineHeight: 1.55,
  margin: '0 0 6px',
  fontFamily: 'inherit',
  letterSpacing: '0.01em',
  textShadow: '0 1px 5px rgba(0,0,0,0.55), 0 0 1px rgba(0,0,0,0.4)',
});

export const FinishStats = styled('div')({
  fontSize: 'clamp(15px, 3.9vw, 18px)',
  fontWeight: 600,
  color: FINISH_SUMMARY_GREEN_DEEP,
  lineHeight: 1.65,
  margin: 0,
  fontFamily: 'inherit',
  letterSpacing: '0.01em',
  textShadow: '0 1px 5px rgba(0,0,0,0.55), 0 0 1px rgba(0,0,0,0.4)',
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
