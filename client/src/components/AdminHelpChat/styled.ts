import { styled, keyframes } from '@mui/material/styles';
import { PRIMARY, PRIMARY_LIGHT, TEXT, TEXT_LIGHT, BORDER, BG_INPUT } from '../styled';

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const wiggle = keyframes`
  0%, 100% { transform: rotate(0deg) scale(1.08); }
  25% { transform: rotate(-12deg) scale(1.08); }
  75% { transform: rotate(12deg) scale(1.08); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;

const PURPLE_GRADIENT = `linear-gradient(135deg, ${PRIMARY} 0%, #5a4bd1 100%)`;

export const HelpFab = styled('button')({
  position: 'relative',
  width: 58,
  height: 58,
  borderRadius: '50%',
  background: PURPLE_GRADIENT,
  color: '#fff',
  border: '3px solid #fff',
  cursor: 'pointer',
  boxShadow: '0 6px 24px rgba(108, 92, 231, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 28,
  lineHeight: 1,
  zIndex: 901,
  fontFamily: 'inherit',
  animation: `${float} 3s ease-in-out infinite`,
  transition: 'box-shadow 0.2s',
  '&:hover': {
    animation: `${wiggle} 0.5s ease-in-out infinite`,
    boxShadow: '0 8px 28px rgba(108, 92, 231, 0.55)',
  },
  '&:active': {
    transform: 'scale(0.92)',
    animation: 'none',
  },
});

export const FabTooltip = styled('span')({
  position: 'absolute',
  right: 'calc(100% + 10px)',
  top: '50%',
  transform: 'translateY(-50%)',
  background: '#2d2d3a',
  color: '#fff',
  fontSize: 12,
  fontWeight: 600,
  padding: '6px 12px',
  borderRadius: 8,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  opacity: 0,
  transition: 'opacity 0.2s',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  '.help-fab-wrap:hover &': {
    opacity: 1,
  },
  '@media (max-width: 600px)': {
    display: 'none',
  },
});

export const FabWrap = styled('div')({
  position: 'fixed',
  right: 24,
  bottom: 24,
  left: 'auto',
  zIndex: 901,
});

export const ChatBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.25)',
  zIndex: 950,
  animation: `${fadeIn} 0.2s ease`,
});

export const ChatPanel = styled('div')({
  position: 'fixed',
  right: 24,
  left: 'auto',
  bottom: 92,
  width: 360,
  background: '#fff',
  borderRadius: 20,
  boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
  zIndex: 960,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  animation: `${slideUp} 0.25s ease`,
  maxHeight: 'calc(100dvh - 120px)',
  '@media (max-width: 600px)': {
    right: 12,
    left: 12,
    width: 'auto',
    bottom: 84,
  },
});

export const ChatHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 18px',
  background: PURPLE_GRADIENT,
  color: '#fff',
});

export const ChatHeaderTitle = styled('span')({
  fontWeight: 700,
  fontSize: 15,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

export const ChatCloseButton = styled('button')({
  background: 'rgba(255,255,255,0.22)',
  border: 'none',
  color: '#fff',
  width: 28,
  height: 28,
  borderRadius: '50%',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  fontFamily: 'inherit',
  '&:hover': { background: 'rgba(255,255,255,0.32)' },
});

export const ChatBody = styled('div')({
  flex: 1,
  overflowY: 'auto',
  padding: '14px 14px 8px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  minHeight: 200,
  maxHeight: 'calc(100dvh - 280px)',
});

export const BotMessage = styled('div')({
  background: PRIMARY_LIGHT,
  borderRadius: '16px 16px 16px 4px',
  padding: '12px 14px',
  fontSize: 13.5,
  color: TEXT,
  lineHeight: 1.55,
  maxWidth: '94%',
  alignSelf: 'flex-start',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  animation: `${fadeIn} 0.3s ease`,
  '[dir="rtl"] &': {
    borderRadius: '16px 16px 4px 16px',
  },
});

export const UserMessage = styled('div')({
  background: PRIMARY,
  borderRadius: '16px 16px 4px 16px',
  padding: '10px 14px',
  fontSize: 13.5,
  color: '#fff',
  lineHeight: 1.5,
  maxWidth: '90%',
  alignSelf: 'flex-end',
  animation: `${fadeIn} 0.3s ease`,
  '[dir="rtl"] &': {
    borderRadius: '16px 16px 16px 4px',
  },
});

export const ChipRow = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  padding: '0 14px 6px',
});

export const Chip = styled('button')({
  fontSize: 12,
  padding: '6px 11px',
  borderRadius: 16,
  border: `1px solid ${PRIMARY_LIGHT}`,
  background: '#fff',
  color: PRIMARY,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 600,
  transition: 'all 0.15s',
  '&:hover': {
    background: PRIMARY_LIGHT,
    borderColor: PRIMARY,
  },
  '&:active': {
    transform: 'scale(0.96)',
  },
});

export const InputArea = styled('div')({
  display: 'flex',
  gap: 8,
  padding: '12px 14px',
  borderTop: `1px solid ${BORDER}`,
  alignItems: 'center',
});

export const ChatInput = styled('input')({
  flex: 1,
  padding: '10px 14px',
  fontSize: 13.5,
  border: `1.5px solid ${BORDER}`,
  borderRadius: 20,
  outline: 'none',
  background: BG_INPUT,
  fontFamily: 'inherit',
  textAlign: 'start',
  '&:focus': {
    borderColor: PRIMARY,
    background: '#fff',
  },
  '&::placeholder': { color: '#bbb' },
});

export const SendButton = styled('button')({
  width: 38,
  height: 38,
  borderRadius: '50%',
  background: PURPLE_GRADIENT,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  flexShrink: 0,
  fontFamily: 'inherit',
  transition: 'transform 0.1s',
  '&:active': { transform: 'scale(0.92)' },
  '&:disabled': { background: '#ccc', cursor: 'not-allowed' },
});

const dotBounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-4px); }
`;

export const TypingDots = styled('div')({
  display: 'flex',
  gap: 4,
  padding: '8px 12px',
  alignSelf: 'flex-start',
  '& span': {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: PRIMARY,
    opacity: 0.7,
    display: 'block',
    animation: `${dotBounce} 1s infinite`,
    '&:nth-of-type(2)': { animationDelay: '0.15s' },
    '&:nth-of-type(3)': { animationDelay: '0.3s' },
  },
});

export const Footnote = styled('div')({
  fontSize: 11,
  color: TEXT_LIGHT,
  textAlign: 'center',
  padding: '6px 14px 10px',
});
