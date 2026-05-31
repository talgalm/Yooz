import { styled, keyframes } from '@mui/material/styles';
import { PRIMARY, PRIMARY_LIGHT, TEXT, TEXT_LIGHT, BORDER, BG_INPUT } from '../styled';

// ─── Animations ───

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 4px 16px rgba(102, 51, 204, 0.45), 0 0 0 0 rgba(127, 92, 231, 0.4); }
  50% { box-shadow: 0 4px 16px rgba(102, 51, 204, 0.55), 0 0 0 10px rgba(127, 92, 231, 0); }
`;

const AI_PRIMARY = '#6C3FCC';
const AI_GRADIENT = 'linear-gradient(135deg, #6C3FCC 0%, #4F8BF4 100%)';

// ─── Floating Button ───

export const AiFab = styled('button')({
  position: 'fixed',
  bottom: 24,
  insetInlineEnd: 24,
  minWidth: 56,
  height: 56,
  paddingInline: 0,
  borderRadius: '50%',
  background: AI_GRADIENT,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  fontWeight: 800,
  letterSpacing: 0.5,
  zIndex: 900,
  fontFamily: 'inherit',
  animation: `${pulse} 2.4s ease-in-out infinite`,
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'scale(1.08)',
  },
  '&:active': {
    transform: 'scale(0.95)',
  },
});

// ─── Chat Panel ───

export const ChatBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.3)',
  zIndex: 950,
  animation: `${fadeIn} 0.2s ease`,
});

export const ChatPanel = styled('div')({
  position: 'fixed',
  width: 380,
  background: '#fff',
  borderRadius: 20,
  boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
  zIndex: 960,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  animation: `${slideUp} 0.25s ease`,
  bottom: 92,
  insetInlineEnd: 24,
  maxHeight: 'calc(100dvh - 120px)',
  '@media (max-width: 480px)': {
    insetInlineEnd: 12,
    insetInlineStart: 12,
    width: 'auto',
    bottom: 84,
  },
});

export const ChatHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 18px',
  background: AI_GRADIENT,
  color: '#fff',
});

export const ChatHeaderTitle = styled('span')({
  fontWeight: 700,
  fontSize: 15,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

export const HeaderBadge = styled('span')({
  fontSize: 10,
  fontWeight: 700,
  background: 'rgba(255,255,255,0.22)',
  padding: '2px 7px',
  borderRadius: 10,
  letterSpacing: 0.5,
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

// ─── Chat Body ───

export const ChatBody = styled('div')({
  flex: 1,
  overflowY: 'auto',
  padding: '14px 14px 8px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

// ─── Messages ───

export const BotMessage = styled('div')({
  background: '#f3eefb',
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
  '& h1, & h2, & h3': {
    margin: '6px 0',
    fontWeight: 700,
    fontSize: 14.5,
  },
  '& p': { margin: '4px 0' },
  '& ul, & ol': { margin: '4px 0', paddingInlineStart: 18 },
  '& li': { margin: '2px 0' },
  '& strong': { fontWeight: 700 },
  '& code': {
    background: 'rgba(0,0,0,0.06)',
    borderRadius: 4,
    padding: '1px 4px',
    fontSize: 12.5,
  },
  '& table': {
    borderCollapse: 'collapse',
    margin: '6px 0',
    fontSize: 12,
  },
  '& th, & td': {
    border: `1px solid ${BORDER}`,
    padding: '4px 8px',
    textAlign: 'start',
  },
  '& th': { background: '#e9e1f7', fontWeight: 700 },
});

export const UserMessage = styled('div')({
  background: AI_PRIMARY,
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

// ─── Suggestion chips (built-in reports) ───

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
  color: AI_PRIMARY,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 600,
  transition: 'all 0.15s',
  '&:hover': {
    background: '#f3eefb',
    borderColor: AI_PRIMARY,
  },
  '&:active': {
    transform: 'scale(0.96)',
  },
});

// ─── Action buttons (Open / Download) ───

export const ActionRow = styled('div')({
  display: 'flex',
  gap: 8,
  marginTop: 8,
  flexWrap: 'wrap',
});

export const ActionButton = styled('button')<{ $variant?: 'primary' | 'secondary' }>(({ $variant = 'primary' }) => ({
  padding: '8px 14px',
  fontSize: 12.5,
  fontWeight: 700,
  borderRadius: 10,
  border: $variant === 'primary' ? 'none' : `1.5px solid ${PRIMARY_LIGHT}`,
  background: $variant === 'primary' ? AI_GRADIENT : '#fff',
  color: $variant === 'primary' ? '#fff' : AI_PRIMARY,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  transition: 'transform 0.1s, opacity 0.2s',
  '&:hover': {
    opacity: 0.9,
  },
  '&:active': {
    transform: 'scale(0.97)',
  },
  '&:disabled': {
    background: '#e5e5ea',
    color: '#888',
    cursor: 'not-allowed',
    border: 'none',
  },
}));

// ─── Input ───

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
    borderColor: AI_PRIMARY,
    background: '#fff',
  },
  '&::placeholder': { color: '#bbb' },
});

export const SendButton = styled('button')({
  width: 38,
  height: 38,
  borderRadius: '50%',
  background: AI_GRADIENT,
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

// ─── Typing dots ───

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
    background: AI_PRIMARY,
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

// Re-export PRIMARY (used by some callers in this folder)
export { PRIMARY, AI_PRIMARY };
