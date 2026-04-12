import { styled, keyframes } from '@mui/material/styles';
import { GameHeaderMuteButton } from '../styled';

// ─── Colors ───

const WHITE = '#fff';

// Box/Card styling
const BOX_BG = '#e3ebf3';
const BOX_BORDER = '#4a6572';
const BOX_SHADOW = '#3a5562';

// Text
const TEXT_DARK = '#2c3e50';

// Buttons
const BTN_RED = '#e74c3c';
const BTN_RED_DARK = '#c0392b';
const BTN_GREEN = '#2ecc71';
const BTN_GREEN_DARK = '#27ae60';
const BTN_WRONG_RED = BTN_RED;

// Title
const TITLE_BLUE = '#2980b9';

// Finish screen & primary actions (purple — matches other stations / trivia)
const FINISH_PURPLE = '#6c5ce7';
const FINISH_PURPLE_DARK = '#5b4cd4';
const BTN_PURPLE = FINISH_PURPLE;
const BTN_PURPLE_DARK = FINISH_PURPLE_DARK;

// Finish banner (purple)
const LEAF_BANNER_BG = FINISH_PURPLE;
const LEAF_BANNER_DARK = FINISH_PURPLE_DARK;

// Puzzle piece
const PIECE_UNREVEALED = '#4a6572';
const PIECE_BORDER = 'rgba(255,255,255,0.35)';

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

const pieceReveal = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
`;

const pieceFlash = keyframes`
  0% { background-color: #4a6572; transform: scale(1); }
  25% { background-color: #2ecc71; transform: scale(1.25); }
  50% { background-color: #2ecc71; transform: scale(1.1); }
  100% { background-color: transparent; transform: scale(1); }
`;

const overlayFadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// Suppress unused warnings
void pulse;

// ═══════════════════════════════════════════
// ─── Background Images ───
// ═══════════════════════════════════════════

export const PUZZLE_INTRO_BG_URL = '/images/puzzle-bg.png';
export const PUZZLE_PLAY_BG_URL = '/images/puzzle-rest-bg.png';

/** Full viewport backdrop for intro/opening screen — puzzle piece sunburst */
export const IntroFullScreenSceneBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  backgroundColor: '#d4f0f0',
  backgroundImage: `url(${PUZZLE_INTRO_BG_URL})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  backgroundRepeat: 'no-repeat',
});

/** Full viewport backdrop for play / countdown / finish — plain sunburst */
export const PlayFullScreenSceneBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  backgroundColor: '#d4f0f0',
  backgroundImage: `url(${PUZZLE_PLAY_BG_URL})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  backgroundRepeat: 'no-repeat',
});

/**
 * Root wrapper for play / finish phases.
 * When no ThemedSceneOverlay exists (admin preview), paints the play-phase
 * background inline via ::before pseudo-element.
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
          backgroundColor: '#d4f0f0',
          backgroundImage: `url(${PUZZLE_PLAY_BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        },
        '& > *': { position: 'relative', zIndex: 1 },
      }
    : {}),
}));

// ═══════════════════════════════════════════
// ─── Opening / Intro Screen ───
// ═══════════════════════════════════════════

const INTRO_FONT_FAMILY =
  "'Encode Sans Expanded', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

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
    : {
        backgroundColor: '#d4f0f0',
        backgroundImage: `url(${PUZZLE_INTRO_BG_URL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }),
  '& > *': { position: 'relative', zIndex: 1 },
  fontFamily: INTRO_FONT_FAMILY,
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

// ─── Intro Title (yellow fill + olive stroke — matches TrueFalse) ───

const GAME_TITLE_YELLOW = '#ffff00';
const GAME_TITLE_OUTLINE = '#666600';

export const IntroTitle = styled('h1')({
  margin: '0 0 16px',
  padding: 0,
  background: 'none',
  textAlign: 'center',
  boxSizing: 'border-box',
  width: 'min(100%, 340px)',
  flexShrink: 0,
  animation: `${floatIn} 0.5s ease-out`,
});

export const IntroTitleLine = styled('span')({
  display: 'block',
  fontFamily: INTRO_FONT_FAMILY,
  fontSize: '48px',
  fontWeight: 400,
  lineHeight: 1.12,
  letterSpacing: '0.02em',
  color: '#ffffff',
  WebkitTextStroke: '4px #155724',
  paintOrder: 'stroke fill',
  marginTop: '16px',
});

/** Fills space so description sits at bottom — matches True/False. */
export const IntroMidSpacer = styled('div')({
  flex: '1 1 0',
  minHeight: 0,
  width: '100%',
});

// ─── Intro Description Card + Overlapping Start Button ───

const INTRO_DESC_PURPLE = '#4a148c';
const INTRO_DESC_PANEL_BG = '#f8f8ff';

const INTRO_GOLD_TOP = '#5cb85c';
const INTRO_GOLD_MID = '#28a745';
const INTRO_GOLD_BOT = '#1e7e34';
const INTRO_GOLD_BORDER = '#155724';
const INTRO_GOLD_SHADOW = '#0f3d18';
const INTRO_BTN_TEXT = '#fff';

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

export const IntroInfoBox = styled('div')({
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

export const IntroInfoText = styled('p')({
  margin: 0,
  fontSize: 'clamp(16px, 3.25vw, 16px)',
  fontWeight: 600,
  lineHeight: 1.25,
  color: INTRO_DESC_PURPLE,
  fontFamily: INTRO_FONT_FAMILY,
  letterSpacing: '0.01em',
  whiteSpace: 'pre-wrap',
});

export const IntroPuzzlePreview = styled('div')({
  maxWidth: 280,
  width: '100%',
  marginBottom: 12,
  borderRadius: 14,
  overflow: 'hidden',
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  border: `3px solid ${BOX_BORDER}`,
  animation: `${floatIn} 0.5s ease-out 0.15s both`,
});

export const IntroPuzzlePreviewImg = styled('img')({
  width: '100%',
  display: 'block',
  borderRadius: 11,
});

export const IntroStartButton = styled('button', {
  shouldForwardProp: (prop) => prop !== '$overlap' && prop !== '$pinBottom',
})<{ $overlap?: boolean; $pinBottom?: boolean }>(({ $overlap, $pinBottom }) => ({
  marginTop: $pinBottom ? 'auto' : $overlap ? 'clamp(-16px, -5.5vw, -34px)' : 0,
  marginBottom: $pinBottom ? 'clamp(8px, 2vh, 20px)' : 0,
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
  fontFamily: INTRO_FONT_FAMILY,
  boxShadow: `0 6px 0 ${INTRO_GOLD_SHADOW}, 0 12px 24px rgba(0,0,0,0.28)`,
  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  animation: `${floatIn} 0.5s ease-out 0.22s both`,
  textShadow: '0 1px 0 rgba(0,0,0,0.2)',
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
// ─── Playing / Puzzle Screen ───
// ═══════════════════════════════════════════

export const PuzzleContainer = styled('div')({
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

/** Scrollable question body; bottom bar stays fixed. */
export const PuzzleMainScroll = styled('div')({
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

/** Fixed footer for Check / Next — safe area inset. */
export const PuzzleBottomBar = styled('div')({
  width: '100%',
  maxWidth: '100%',
  flexShrink: 0,
  boxSizing: 'border-box',
  paddingTop: 8,
  paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
});

export const PuzzleDecorations = styled('div')({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 0,
});

export const PuzzleHill = styled('div')<{ variant: 1 | 2 }>(({ variant }) => ({
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

export const TopBarLeftCluster = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
  minWidth: 0,
});

export const TopBarRightCluster = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
  minWidth: 0,
  justifyContent: 'flex-end',
});

export const TopBarItem = styled('span')({
  fontSize: 13,
  fontWeight: 700,
  color: TEXT_DARK,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
});

export const TopBarTimer = styled('span')<{ critical?: boolean }>(({ critical }) => ({
  fontSize: 13,
  fontWeight: 700,
  color: critical ? BTN_PURPLE_DARK : TEXT_DARK,
  transition: 'color 0.3s ease',
}));

/** Black outline on the in-game stats bar (replaces default slate border). */
const PUZZLE_GAME_BAR_BORDER = '#000000';

export const PuzzleGameTopBar = styled(TopBar)({
  border: `2px solid ${PUZZLE_GAME_BAR_BORDER}`,
});

export const PuzzleGameTopBarItem = styled(TopBarItem)({
  color: '#1a1a1a',
});

export const PuzzleGameTopBarTimer = styled(TopBarTimer)(({ critical }) => ({
  color: critical ? BTN_PURPLE_DARK : '#1a1a1a',
}));

export const PuzzleGameMuteButton = styled(GameHeaderMuteButton)({
  border: `2px solid ${PUZZLE_GAME_BAR_BORDER}`,
  color: '#1a1a1a',
});

/** Mute row with dark rule under (preview / no activity host — aligns with session header line). */
export const PuzzleGameIntroHeaderBar = styled('div')({
  width: '100%',
  alignSelf: 'stretch',
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  padding: 'max(6px, env(safe-area-inset-top)) 12px 8px',
  flexShrink: 0,
  boxSizing: 'border-box',
  borderBottom: '1px solid rgba(0,0,0,0.42)',
});

// ─── Puzzle Grid ───

export const PuzzleGridWrap = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: 320,
  margin: '0 auto',
  marginBottom: 14,
  zIndex: 1,
  borderRadius: 12,
  overflow: 'hidden',
  border: `3px solid rgba(74,101,114,0.3)`,
  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
});

export const PuzzleFullImg = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: 9,
  display: 'block',
  position: 'absolute',
  top: 0,
  left: 0,
});

export const PuzzleGridOverlay = styled('div')<{ cols: number; rows: number }>(({ cols, rows }) => ({
  position: 'absolute',
  inset: 0,
  display: 'grid',
  gridTemplateColumns: `repeat(${cols}, 1fr)`,
  gridTemplateRows: `repeat(${rows}, 1fr)`,
  borderRadius: 9,
  zIndex: 1,
}));

export const PuzzlePiece = styled('div')<{ revealed?: boolean; justRevealed?: boolean }>(({ revealed, justRevealed }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  fontWeight: 700,
  color: revealed || justRevealed ? 'transparent' : 'rgba(255,255,255,0.7)',
  backgroundColor: justRevealed ? PIECE_UNREVEALED : revealed ? 'transparent' : PIECE_UNREVEALED,
  border: `1px solid ${revealed || justRevealed ? 'transparent' : PIECE_BORDER}`,
  transition: justRevealed ? 'none' : 'all 0.6s ease',
  cursor: 'default',
  animation: justRevealed
    ? `${pieceFlash} 0.8s ease-out 0.4s forwards`
    : revealed
    ? `${pieceReveal} 0.5s ease-out`
    : 'none',
}));

// ─── Question area (same yellow + olive stroke as summary / intro title) ───

export const QuestionBox = styled('div')({
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  padding: '8px 10px',
  textAlign: 'center',
  boxShadow: 'none',
  width: '100%',
  boxSizing: 'border-box',
  position: 'relative',
  zIndex: 1,
  flexShrink: 1,
  minHeight: 0,
  overflow: 'visible',
  animation: `${slideUp} 0.3s ease-out`,
});

export const QuestionBadge = styled('div')({
  display: 'block',
  fontFamily: INTRO_FONT_FAMILY,
  fontSize: 'clamp(14px, 3.6vw, 18px)',
  fontWeight: 700,
  lineHeight: 1.12,
  letterSpacing: '0.02em',
  color: GAME_TITLE_YELLOW,
  WebkitTextStroke: `2px ${GAME_TITLE_OUTLINE}`,
  paintOrder: 'stroke fill',
  whiteSpace: 'nowrap',
  marginBottom: 8,
});

export const QuestionContent = styled('p')({
  margin: 0,
  fontFamily: INTRO_FONT_FAMILY,
  fontSize: 'clamp(22px, 5.2vw, 40px)',
  fontWeight: 400,
  lineHeight: 1.15,
  letterSpacing: '0.02em',
  color: GAME_TITLE_YELLOW,
  WebkitTextStroke: `3px ${GAME_TITLE_OUTLINE}`,
  paintOrder: 'stroke fill',
  textAlign: 'center',
  whiteSpace: 'pre-wrap',
});

// ─── Answer Grid (2×2) ───

export const AnswerGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
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
      bg = BTN_RED;
      borderColor = BTN_RED_DARK;
      textColor = WHITE;
      shadow = `0 3px 0 ${BTN_RED_DARK}`;
    } else {
      opacity = 0.45;
    }
  } else if (selected) {
    borderColor = TITLE_BLUE;
    bg = '#dbeeff';
    textColor = TITLE_BLUE;
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
      boxShadow: `0 0 0 ${BOX_SHADOW}`,
    } : {},
  };
});

// ─── Action Button ───

export const ActionButton = styled('button')<{ disabled?: boolean }>(({ disabled }) => ({
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
  flexShrink: 0,
  position: 'relative' as const,
  zIndex: 1,
  opacity: disabled ? 0.6 : 1,
  '&:active': !disabled ? {
    transform: 'translateY(3px)',
    boxShadow: `0 0 0 ${BTN_PURPLE_DARK}`,
  } : {},
}));

// ─── Center-screen feedback toast (~1s, matches trivia) ───

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

export const CenterToastBubble = styled('div')<{ variant: 'correct' | 'incorrect' }>(({ variant }) => {
  const border = variant === 'correct' ? BTN_GREEN : BTN_WRONG_RED;
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

export const CorrectBigText = styled('div')({
  fontSize: 22,
  fontWeight: 900,
  color: BTN_GREEN,
  textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff',
  lineHeight: 1,
});

export const IncorrectToastText = styled('div')({
  fontSize: 22,
  fontWeight: 900,
  color: BTN_WRONG_RED,
  textShadow: '1px 1px 0 #fff',
  lineHeight: 1,
});

export const PieceRevealedBadge = styled('div')({
  background: '#d5f5e3',
  color: BTN_GREEN_DARK,
  borderRadius: 16,
  padding: '6px 14px',
  fontSize: 15,
  fontWeight: 700,
  border: `2px solid ${BTN_GREEN}`,
});

export const RetryBadge = styled('div')({
  background: '#fef3cd',
  color: '#856404',
  borderRadius: 20,
  padding: '8px 22px',
  fontSize: 15,
  fontWeight: 700,
  border: '2px solid #f0c36d',
});

// ─── Media ───

export const NatureMediaContainer = styled('div')({
  textAlign: 'center',
  marginBottom: 12,
  position: 'relative',
  zIndex: 1,
});

export const NatureMediaImage = styled('img')({
  maxWidth: '100%',
  maxHeight: 100,
  borderRadius: 12,
  objectFit: 'contain',
  border: `3px solid rgba(74,101,114,0.3)`,
});

// ─── Yooz logo (game screen) ───

export const PuzzleYoozLogo = styled('div')({
  marginTop: 'auto',
  paddingTop: 16,
  paddingBottom: 10,
  fontSize: 32,
  fontWeight: 900,
  color: WHITE,
  WebkitTextStroke: `1.5px ${BOX_BORDER}`,
  letterSpacing: 2,
  position: 'relative',
  zIndex: 1,
});

// ─── Puzzle Reveal Overlay (shown after correct answer) ───

export const PuzzleRevealOverlay = styled('div')({
  position: 'absolute',
  inset: 0,
  zIndex: 20,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.55)',
  animation: `${overlayFadeIn} 0.3s ease-out`,
  padding: 20,
  gap: 12,
});

export const PuzzleRevealTitle = styled('div')({
  fontSize: 22,
  fontWeight: 800,
  color: WHITE,
  textShadow: '0 2px 8px rgba(0,0,0,0.4)',
  textAlign: 'center',
});

export const PuzzleRevealGrid = styled('div')({
  position: 'relative',
  width: '80%',
  maxWidth: 280,
  borderRadius: 14,
  overflow: 'hidden',
  border: `3px solid rgba(255,255,255,0.4)`,
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
});

export const PuzzleRevealCounter = styled('div')({
  fontSize: 16,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.85)',
  textAlign: 'center',
});

// ─── Hint Spacer (prevents layout jump when hint disappears) ───

export const HintSpacer = styled('div')({
  height: 32,
  flexShrink: 0,
});

// ═══════════════════════════════════════════
// ─── Drag & Drop Puzzle Grid ───
// ═══════════════════════════════════════════

const dragPieceAppear = keyframes`
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
`;

const wrongShake = keyframes`
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
`;

/** Full-screen container for the drag phase (replaces question area). */
export const DragPhaseContainer = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  gap: 12,
  padding: '8px 12px',
  boxSizing: 'border-box',
  minHeight: 0,
  position: 'relative',
  zIndex: 1,
});

export const DragInstruction = styled('div')({
  fontFamily: INTRO_FONT_FAMILY,
  fontSize: 'clamp(18px, 4.2vw, 30px)',
  fontWeight: 400,
  lineHeight: 1.15,
  letterSpacing: '0.02em',
  color: GAME_TITLE_YELLOW,
  WebkitTextStroke: `3px ${GAME_TITLE_OUTLINE}`,
  paintOrder: 'stroke fill',
  textAlign: 'center',
  padding: '8px 12px',
  background: 'transparent',
  maxWidth: 'min(100%, 360px)',
  animation: `${slideUp} 0.3s ease-out`,
});

/** The puzzle grid wrapper for drag phase. */
export const DragGridWrapper = styled('div')({
  position: 'relative',
  width: '85%',
  maxWidth: 320,
  borderRadius: 14,
  overflow: 'visible',
  border: `3px solid rgba(74,101,114,0.4)`,
  boxShadow: '0 6px 24px rgba(0,0,0,0.2)',
  background: '#f0f0f0',
});

/** Each cell in the drag grid */
export const DragGridCell = styled('div', {
  shouldForwardProp: (prop) => !['revealed', 'isTarget', 'wrongAttempt'].includes(prop as string),
})<{ revealed?: boolean; isTarget?: boolean; wrongAttempt?: boolean }>(({ revealed, isTarget, wrongAttempt }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  fontWeight: 700,
  color: revealed ? 'transparent' : 'rgba(255,255,255,0.5)',
  backgroundColor: revealed ? 'transparent' : PIECE_UNREVEALED,
  border: isTarget
    ? `2px dashed rgba(108,92,231,0.7)`
    : `1px solid ${revealed ? 'rgba(0,0,0,0.08)' : PIECE_BORDER}`,
  transition: 'all 0.3s ease',
  position: 'relative',
  animation: wrongAttempt ? `${wrongShake} 0.4s ease-out` : 'none',
}));

/** The draggable puzzle piece that floats. */
export const DraggablePiece = styled('div', {
  shouldForwardProp: (prop) => !['cols', 'rows', 'pieceIndex', 'isDragging', 'gridWidth'].includes(prop as string),
})<{ cols: number; rows: number; pieceIndex: number; isDragging?: boolean; gridWidth?: number }>(
  ({ cols, rows, pieceIndex, isDragging }) => {
    const col = pieceIndex % cols;
    const row = Math.floor(pieceIndex / cols);
    const pctX = (col / cols) * 100;
    const pctY = (row / rows) * 100;
    const pctW = (1 / cols) * 100;
    const pctH = (1 / rows) * 100;

    return {
      width: `calc(85vw / ${cols})`,
      maxWidth: `calc(320px / ${cols})`,
      aspectRatio: '1',
      borderRadius: 8,
      overflow: 'hidden',
      border: `2px solid rgba(108,92,231,0.6)`,
      boxShadow: isDragging
        ? '0 12px 32px rgba(0,0,0,0.35)'
        : '0 4px 16px rgba(0,0,0,0.25)',
      cursor: isDragging ? 'grabbing' : 'grab',
      transform: isDragging ? 'scale(1.08)' : 'scale(1)',
      transition: isDragging ? 'none' : 'transform 0.2s ease, box-shadow 0.2s ease',
      animation: `${dragPieceAppear} 0.4s ease-out`,
      position: 'relative',
      touchAction: 'none',
      userSelect: 'none' as const,
      WebkitUserSelect: 'none' as const,
      zIndex: isDragging ? 100 : 10,
      // Show correct portion of image via background
      backgroundSize: `${cols * 100}% ${rows * 100}%`,
      backgroundPosition: `${pctX}% ${pctY}%`,
      backgroundRepeat: 'no-repeat',
      // clip to just this piece
      '& img': {
        display: 'none',
      },
    };
  }
);

/** Feedback badge shown after wrong/correct drag */
export const DragFeedbackBadge = styled('div', {
  shouldForwardProp: (prop) => prop !== 'variant',
})<{ variant: 'correct' | 'wrong' }>(({ variant }) => ({
  fontSize: 16,
  fontWeight: 700,
  color: variant === 'correct' ? BTN_GREEN_DARK : '#856404',
  background: variant === 'correct' ? '#d5f5e3' : '#fef3cd',
  border: `2px solid ${variant === 'correct' ? BTN_GREEN : '#f0c36d'}`,
  borderRadius: 16,
  padding: '6px 18px',
  animation: `${feedbackPop} 0.3s ease-out`,
  textAlign: 'center',
}));

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
  minHeight: '100%',
  boxSizing: 'border-box',
});

/** Finish summary: centers puzzle image between title and pinned Continue (matches True/False layout rhythm). */
export const FinishSummaryMiddle = styled('div')({
  flex: '1 1 0',
  minHeight: 0,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
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
  marginBottom: 20,
  position: 'relative',
  overflow: 'hidden',
  animation: `${floatIn} 0.4s ease-out`,
});

export const FinishPuzzleImage = styled('div')({
  maxWidth: 260,
  width: '100%',
  marginBottom: 20,
  borderRadius: 14,
  overflow: 'hidden',
  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  border: `3px solid ${BOX_BORDER}`,
  animation: `${floatIn} 0.5s ease-out 0.1s both`,
});

export const FinishPuzzleImg = styled('img')({
  width: '100%',
  display: 'block',
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
  color: '#3d6b4f',
  letterSpacing: 2,
});
