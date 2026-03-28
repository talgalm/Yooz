import { styled, keyframes } from '@mui/material/styles';

// ─── Colors ───

const WHITE = '#fff';
const TIMER_RED = '#c0392b';

// Timer circle — white center + sage green rings (like reference image)
const TIMER_RING_DARK = '#8dae63';   // darker sage (like HILL_2)
const TIMER_RING_MID = '#9dbb76';    // medium sage (like HILL_1)
const TIMER_RING_LIGHT = '#b1c68e';  // light sage (like GAME_BG)
const TIMER_INNER_WHITE = '#8dae63'; 
const TIMER_NUMBER_STROKE = '#2c2c2c';

// Game screen palette (from SCSS)
const HILL_1 = '#9dbb76';
const HILL_2 = '#8dae63';
const QUESTION_BG = '#2b492b';
const BTN_RED_BG = '#a55a4c';
const BTN_RED_BORDER = '#622e22';
const BTN_GREEN_BG = '#6cac5e';
const BTN_GREEN_BORDER = '#2d5626';

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

// ─── Question Banner (Leaf-shaped) ───

const FINISH_PURPLE = '#6c5ce7';
const FINISH_PURPLE_DARK = '#5b4cd4';
const LEAF_BANNER_BG = FINISH_PURPLE;
const LEAF_BANNER_DARK = FINISH_PURPLE_DARK;

export const QuestionBanner = styled('div')({
  background: `linear-gradient(135deg, ${LEAF_BANNER_BG} 0%, ${LEAF_BANNER_DARK} 100%)`,
  color: WHITE,
  textAlign: 'center',
  padding: '14px 20px',
  borderRadius: 16,
  width: '100%',
  lineHeight: 1.3,
  boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
  position: 'relative',
  zIndex: 2,
  overflow: 'hidden',
  // Space below score bar: flex gap is tight and rotate(-2deg) draws above the layout box
  marginTop: 'clamp(14px, 4vw, 22px)',
  transform: 'rotate(-2deg)',
  animation: `${slideUp} 0.3s ease-out`,
  flexShrink: 1,
  minHeight: 0,
});

export const QuestionBannerText = styled('p')({
  fontSize: 'clamp(19px, 3.8vw, 20px)',
  fontWeight: 700,
  color: WHITE,
  lineHeight: 1.3,
  margin: 0,
  position: 'relative',
  zIndex: 1,
  textShadow: '0 1px 2px rgba(0,0,0,0.15)',
});

// ─── Timer Circle (double-ring design) ───

export const TimerCircleWrapper = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  zIndex: 1,
  flex: '1 1 auto',
  minHeight: 120,
  width: '100%',
});

export const TimerCircle = styled('div')<{ critical?: boolean }>(({ critical }) => ({
  width: 'clamp(140px, 26vh, 180px)',
  aspectRatio: '1 / 1',
  backgroundColor: critical ? 'rgba(192,57,43,0.3)' : TIMER_RING_DARK,
  borderRadius: '50%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  border: `8px solid ${critical ? TIMER_RED : TIMER_RING_MID}`,
  boxShadow: critical
    ? 'inset 0 0 0 10px rgba(192,57,43,0.2), 0 4px 10px rgba(0,0,0,0.1)'
    : `inset 0 0 0 10px ${TIMER_RING_LIGHT}, 0 4px 10px rgba(0,0,0,0.08)`,
  transition: 'all 0.3s ease',
}));

export const TimerCircleInner = styled('div')<{ critical?: boolean }>(({ critical }) => ({
  width: 'clamp(110px, 20vh, 140px)',
  aspectRatio: '1 / 1',
  backgroundColor: critical ? 'rgba(192,57,43,0.15)' : TIMER_INNER_WHITE,
  borderRadius: '50%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  border: `6px solid ${critical ? TIMER_RED : TIMER_RING_MID}`,
  transition: 'all 0.3s ease',
}));

export const TimerCircleNumber = styled('span')<{ critical?: boolean }>(({ critical }) => ({
  fontSize: 'clamp(62px, 11vh, 80px)',
  fontWeight: 900,
  color: critical ? TIMER_RED : WHITE,
  WebkitTextStroke: critical ? 'none' : `4px ${TIMER_NUMBER_STROKE}`,
  textShadow: critical ? 'none' : '0 2px 4px rgba(0,0,0,0.12)',
  paintOrder: 'stroke fill',
  lineHeight: 1,
  transition: 'all 0.3s ease',
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

// ─── Feedback Overlay ───

export const FeedbackOverlay = styled('div')<{ variant: 'correct' | 'incorrect' | 'timeout' }>(({ variant }) => ({
  position: 'absolute',
  bottom: 160,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 20,
  background: variant === 'correct' ? 'rgba(61,139,55,0.95)'
    : variant === 'incorrect' ? 'rgba(192,57,43,0.95)'
    : 'rgba(0,0,0,0.7)',
  color: WHITE,
  padding: '12px 28px',
  borderRadius: 20,
  fontSize: 18,
  fontWeight: 800,
  textAlign: 'center',
  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  animation: `${feedbackPop} 0.3s ease-out`,
  whiteSpace: 'nowrap',
}));

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

export const TRUE_FALSE_WELCOME_BG_URL = '/images/true-false-welcome-bg.png';
/** In-game phases (countdown, play, finish) — full-bleed behind UI, not used on welcome */
export const TRUE_FALSE_PLAY_BG_URL = '/images/true-false-play-bg.png';
const INTRO_GOLD_TOP = '#f5d76e';
const INTRO_GOLD_MID = '#e8b923';
const INTRO_GOLD_BOT = '#c9a012';
const INTRO_GOLD_BORDER = '#8b6914';
const INTRO_GOLD_SHADOW = '#5c3d0a';
const INTRO_BTN_TEXT = '#2a1538';

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
  backgroundColor: '#4a1f6e',
  backgroundImage: `url(${TRUE_FALSE_WELCOME_BG_URL})`,
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
  fontFamily: "'Secular One', 'Heebo', sans-serif",
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

export const IntroStartButton = styled('button')({
  marginTop: 0,
  flexShrink: 0,
  background: `linear-gradient(180deg, ${INTRO_GOLD_TOP} 0%, ${INTRO_GOLD_MID} 45%, ${INTRO_GOLD_BOT} 100%)`,
  color: INTRO_BTN_TEXT,
  fontSize: '1.55rem',
  fontWeight: 800,
  padding: '14px 44px',
  borderRadius: 15,
  border: `4px solid ${INTRO_GOLD_BORDER}`,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: `0 5px 0 ${INTRO_GOLD_SHADOW}, 0 10px 22px rgba(0,0,0,0.35)`,
  transition: 'all 0.1s ease',
  animation: `${floatIn} 0.5s ease-out 0.25s both`,
  textShadow: '0 1px 0 rgba(255,255,255,0.35)',
  '&:active': {
    transform: 'translateY(4px)',
    boxShadow: `0 1px 0 ${INTRO_GOLD_SHADOW}, 0 4px 10px rgba(0,0,0,0.3)`,
  },
});

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
  position: 'relative',
  zIndex: 1,
  padding: '30px 20px 20px',
  textAlign: 'center',
  width: '100%',
  maxWidth: 400,
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

// Purple score circle (matches nature landscape theme)
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

export const FinishScoreLabel = styled('span')({
  fontSize: 22,
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
  marginBottom: 30,
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
