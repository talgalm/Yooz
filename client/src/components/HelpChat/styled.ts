import { styled, keyframes } from '@mui/material/styles';
import { HeaderActionIconButton, DarkHeaderActionIconButton, PRIMARY, PRIMARY_LIGHT, TEXT, TEXT_LIGHT, BORDER, BG_INPUT } from '../styled';

// ─── Animations ───

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// ─── Floating Button ───

export const HelpFab = styled('button')({
  position: 'fixed',
  bottom: 24,
  insetInlineEnd: 24,
  width: 52,
  height: 52,
  borderRadius: '50%',
  background: PRIMARY,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(108, 92, 231, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 24,
  fontWeight: 700,
  zIndex: 900,
  transition: 'transform 0.2s, box-shadow 0.2s',
  fontFamily: 'inherit',
  '&:hover': {
    transform: 'scale(1.08)',
    boxShadow: '0 6px 20px rgba(108, 92, 231, 0.5)',
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

export const ChatPanel = styled('div', {
  shouldForwardProp: (prop) => prop !== '$anchor',
})<{ $anchor?: 'fab' | 'header' }>(({ $anchor = 'fab' }) => ({
  position: 'fixed',
  width: 340,
  background: '#fff',
  borderRadius: 20,
  boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
  zIndex: 960,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  animation: `${slideUp} 0.25s ease`,
  ...($anchor === 'fab'
    ? {
        bottom: 88,
        insetInlineEnd: 24,
        maxHeight: 'calc(100dvh - 120px)',
      }
    : {
        bottom: 24,
        insetInlineEnd: 12,
        maxHeight: 'calc(100dvh - 40px)',
      }),
  '@media (max-width: 480px)': {
    insetInlineEnd: 12,
    insetInlineStart: 12,
    width: 'auto',
    ...($anchor === 'fab' ? { bottom: 80 } : { bottom: 16 }),
  },
}));

export const ChatHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  background: PRIMARY,
  color: '#fff',
});

export const ChatHeaderTitle = styled('span')({
  fontWeight: 700,
  fontSize: 16,
});

export const ChatCloseButton = styled('button')({
  background: 'rgba(255,255,255,0.2)',
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
  transition: 'background 0.2s',
  '&:hover': {
    background: 'rgba(255,255,255,0.3)',
  },
});

// ─── Chat Body ───

export const ChatBody = styled('div')({
  flex: 1,
  overflowY: 'auto',
  padding: '16px 16px 8px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

// ─── Messages ───

export const BotMessage = styled('div')({
  background: '#f0eefa',
  borderRadius: '16px 16px 16px 4px',
  padding: '12px 16px',
  fontSize: 14,
  color: TEXT,
  lineHeight: 1.5,
  maxWidth: '90%',
  alignSelf: 'flex-start',
  animation: `${fadeIn} 0.3s ease`,
  '[dir="rtl"] &': {
    borderRadius: '16px 16px 4px 16px',
  },
});

export const UserMessage = styled('div')({
  background: PRIMARY,
  borderRadius: '16px 16px 4px 16px',
  padding: '12px 16px',
  fontSize: 14,
  color: '#fff',
  lineHeight: 1.5,
  maxWidth: '90%',
  alignSelf: 'flex-end',
  animation: `${fadeIn} 0.3s ease`,
  '[dir="rtl"] &': {
    borderRadius: '16px 16px 16px 4px',
  },
});

// ─── FAQ Options ───

export const OptionsGrid = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '4px 0',
});

export const OptionButton = styled('button')({
  width: '100%',
  padding: '12px 16px',
  fontSize: 14,
  fontWeight: 500,
  color: PRIMARY,
  background: '#fff',
  border: `1.5px solid ${PRIMARY_LIGHT}`,
  borderRadius: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'start',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  '&:hover': {
    background: PRIMARY_LIGHT,
    borderColor: PRIMARY,
  },
  '&:active': {
    transform: 'scale(0.98)',
  },
});

export const OptionIcon = styled('span')({
  fontSize: 18,
  flexShrink: 0,
});

// ─── Phone Bar ───

export const PhoneBar = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '12px 16px',
  borderTop: `1px solid ${BORDER}`,
  background: '#fafafa',
  fontSize: 13,
  color: TEXT_LIGHT,
});

export const PhoneLink = styled('a')({
  color: PRIMARY,
  fontWeight: 600,
  textDecoration: 'none',
  fontSize: 14,
  '&:hover': {
    textDecoration: 'underline',
  },
});

// ─── Input Area ───

export const InputArea = styled('div')({
  display: 'flex',
  gap: 8,
  padding: '12px 16px',
  borderTop: `1px solid ${BORDER}`,
  alignItems: 'center',
});

export const ChatInput = styled('input')({
  flex: 1,
  padding: '10px 14px',
  fontSize: 14,
  border: `1.5px solid ${BORDER}`,
  borderRadius: 20,
  outline: 'none',
  background: BG_INPUT,
  fontFamily: 'inherit',
  textAlign: 'start',
  transition: 'border-color 0.2s',
  '&:focus': {
    borderColor: PRIMARY,
    background: '#fff',
  },
  '&::placeholder': {
    color: '#bbb',
  },
});

export const SendButton = styled('button')({
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: PRIMARY,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 16,
  flexShrink: 0,
  fontFamily: 'inherit',
  transition: 'background 0.2s, transform 0.1s',
  '&:hover': {
    background: '#5a4bd1',
  },
  '&:active': {
    transform: 'scale(0.92)',
  },
  '&:disabled': {
    background: '#ccc',
    cursor: 'not-allowed',
  },
});

// ─── Typing indicator ───

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
    background: '#bbb',
    display: 'block',
    animation: `${dotBounce} 1s infinite`,
    '&:nth-of-type(2)': {
      animationDelay: '0.15s',
    },
    '&:nth-of-type(3)': {
      animationDelay: '0.3s',
    },
  },
});

// ─── Back button ───

export const BackButton = styled('button')({
  background: 'none',
  border: 'none',
  color: PRIMARY,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  padding: '4px 0',
  alignSelf: 'flex-start',
  transition: 'opacity 0.2s',
  '&:hover': {
    opacity: 0.7,
  },
});

/** Same as logout / playing header icons — one shared dark style in `styled.ts`. */
export const HelpHeaderIconButton = DarkHeaderActionIconButton;

/** Same control on light bars (e.g. home) */
export const HelpHeaderIconButtonLight = styled(HeaderActionIconButton)({
  margin: 0,
  color: PRIMARY,
  border: `1px solid ${PRIMARY_LIGHT}`,
  background: 'rgba(108, 92, 231, 0.06)',
  fontSize: 18,
  fontWeight: 700,
  transition: 'background 0.15s ease',
  appearance: 'none',
  WebkitTapHighlightColor: 'transparent',
  '&:hover': {
    background: 'rgba(108, 92, 231, 0.1)',
  },
  '&:active': {
    background: 'rgba(108, 92, 231, 0.12)',
  },
});
