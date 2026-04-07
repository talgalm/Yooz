import { styled, keyframes } from '@mui/material/styles';

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

export const ORDER_BG_URL = '/images/order-bg.png';

/** Full viewport backdrop — orange sunburst */
export const OrderFullScreenSceneBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  backgroundColor: '#e8a050',
  backgroundImage: `url(${ORDER_BG_URL})`,
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
          backgroundColor: '#e8a050',
          backgroundImage: `url(${ORDER_BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
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

export const OrderTopBar = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  background: 'rgba(255,255,255,0.75)',
  padding: '5px 10px',
  borderRadius: 10,
  border: `2px solid ${BOX_BORDER}`,
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

// ─── Round Title (leaf banner) ───

export const OrderRoundBanner = styled('div')<{ compact?: boolean }>(({ compact }) => ({
  background: `linear-gradient(135deg, ${LEAF_BANNER_BG} 0%, ${LEAF_BANNER_DARK} 100%)`,
  color: WHITE,
  textAlign: 'center',
  padding: compact ? '6px 14px' : '14px 24px',
  borderRadius: compact ? 10 : 14,
  width: '92%',
  lineHeight: 1.3,
  marginBottom: compact ? 4 : 16,
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  position: 'relative',
  zIndex: 2,
  overflow: 'hidden',
  transform: 'rotate(-1deg)',
  animation: `${slideUp} 0.3s ease-out`,
  flexShrink: 0,
}));

export const OrderRoundBannerText = styled('p')({
  fontSize: 16,
  fontWeight: 700,
  color: WHITE,
  lineHeight: 1.3,
  margin: 0,
  position: 'relative',
  zIndex: 1,
  textShadow: '0 1px 2px rgba(0,0,0,0.15)',
});

// ─── Order Cards ───

export const NatureCardsList = styled('div')<{ cardCount: number }>(({ cardCount }) => ({
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateRows: `repeat(${Math.max(cardCount, 1)}, minmax(0, 1fr))`,
  gap: cardCount > 6 ? 3 : 5,
  marginBottom: 4,
  width: '90%',
  position: 'relative',
  zIndex: 1,
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
  minHeight: 0,
  height: '90%',
  padding: '4px 10px',
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
  width: '90%',
  position: 'relative',
  zIndex: 2,
  paddingTop: 2,
  paddingBottom: 0,
  flexShrink: 0,
});

// ─── Check Button ───

export const NatureCheckButton = styled('button')<{ disabled?: boolean }>(({ disabled }) => ({
  background: disabled ? '#bdc3c7' : BTN_RED,
  color: WHITE,
  fontSize: 17,
  fontWeight: 700,
  padding: '12px 24px',
  borderRadius: 12,
  border: `3px solid ${disabled ? '#95a5a6' : BTN_RED_DARK}`,
  cursor: disabled ? 'default' : 'pointer',
  fontFamily: 'inherit',
  boxShadow: disabled ? 'none' : `0 4px 0 ${BTN_RED_DARK}`,
  transition: 'all 0.1s ease',
  width: '100%',
  position: 'relative' as const,
  zIndex: 1,
  opacity: disabled ? 0.6 : 1,
  flexShrink: 0,
  '&:active': !disabled ? {
    transform: 'translateY(4px)',
    boxShadow: `0 0 0 ${BTN_RED_DARK}`,
  } : {},
}));

// ─── Feedback (floating pop overlay) ───

export const OrderFeedbackFloater = styled('div')({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 10,
  display: 'flex',
  justifyContent: 'center',
  pointerEvents: 'none',
});

export const OrderFeedbackContainer = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  animation: `${feedbackPop} 0.3s ease-out`,
});

export const OrderCorrectText = styled('div')({
  fontSize: 36,
  fontWeight: 900,
  color: BTN_GREEN,
  textShadow: '2px 2px 0 #fff, -1px -1px 0 #fff',
  lineHeight: 1,
});

export const OrderWrongText = styled('div')({
  fontSize: 36,
  fontWeight: 900,
  color: BTN_RED,
  textShadow: '2px 2px 0 #fff, -1px -1px 0 #fff',
  lineHeight: 1,
});

export const OrderPointsBadge = styled('div')({
  background: '#d5f5e3',
  color: BTN_GREEN_DARK,
  borderRadius: 20,
  padding: '6px 18px',
  fontSize: 16,
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

// ─── Instructions Screen (inside OrderContainer) ───

export const InstructionsWrapper = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  zIndex: 2,
  padding: '24px 16px',
  textAlign: 'center',
  gap: 24,
  width: '100%',
});

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

export const GolfIntroOverlay = styled('div')({
  position: 'absolute',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  zIndex: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  animation: `${feedbackPop} 0.3s ease-out`,
});

// ═══════════════════════════════════════════
// ─── Finish / Game Complete Screen ───
// ═══════════════════════════════════════════

export const FinishContainer = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: 'transparent',
  position: 'relative',
  overflow: 'hidden',
  minHeight: 0,
  width: '100%',
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
