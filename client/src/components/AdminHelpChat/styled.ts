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

export const TypeChip = styled('button')<{ $variant: 'feature' | 'bug' | 'change' }>(
  ({ $variant }) => ({
    fontSize: 13,
    padding: '8px 14px',
    borderRadius: 16,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 700,
    transition: 'all 0.15s',
    color: $variant === 'change' ? '#713f12' : '#fff',
    background:
      $variant === 'feature'
        ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
        : $variant === 'bug'
          ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
          : 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
    boxShadow:
      $variant === 'feature'
        ? '0 2px 8px rgba(37, 99, 235, 0.35)'
        : $variant === 'bug'
          ? '0 2px 8px rgba(220, 38, 38, 0.35)'
          : '0 2px 8px rgba(234, 179, 8, 0.35)',
    '&:hover': { transform: 'translateY(-1px)', filter: 'brightness(1.05)' },
    '&:active': { transform: 'scale(0.96)' },
  }),
);

export const DevPanelBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  zIndex: 980,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  animation: `${fadeIn} 0.2s ease`,
});

export const DevPanelCard = styled('div')({
  background: '#fff',
  borderRadius: 16,
  width: '100%',
  maxWidth: 720,
  maxHeight: '85dvh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
  animation: `${slideUp} 0.25s ease`,
});

export const DevPanelHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  background: '#1e293b',
  color: '#fff',
  fontWeight: 700,
  fontSize: 16,
});

export const DevPanelClose = styled('button')({
  background: 'rgba(255,255,255,0.15)',
  border: 'none',
  color: '#fff',
  width: 32,
  height: 32,
  borderRadius: '50%',
  cursor: 'pointer',
  fontSize: 20,
  fontFamily: 'inherit',
  '&:hover': { background: 'rgba(255,255,255,0.25)' },
});

export const DevFilterRow = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  padding: '12px 16px',
  borderBottom: `1px solid ${BORDER}`,
});

export const DevFilterBtn = styled('button')<{ $active?: boolean }>(({ $active }) => ({
  fontSize: 12,
  padding: '6px 12px',
  borderRadius: 14,
  border: `1px solid ${$active ? PRIMARY : BORDER}`,
  background: $active ? PRIMARY_LIGHT : '#fff',
  color: $active ? PRIMARY : TEXT,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 600,
}));

export const DevPanelBody = styled('div')({
  flex: 1,
  overflowY: 'auto',
  padding: '12px 16px 16px',
});

export const DevPanelLoading = styled('div')({
  textAlign: 'center',
  padding: 40,
  color: TEXT_LIGHT,
  fontSize: 14,
});

export const DevEmptyState = styled('div')({
  textAlign: 'center',
  padding: 40,
  color: TEXT_LIGHT,
  fontSize: 14,
});

export const DevTaskList = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

export const DevTaskRow = styled('div')({
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  background: '#fafafa',
});

export const DevTypeBadge = styled('span')<{ $type: 'feature' | 'bug' | 'change' }>(
  ({ $type }) => ({
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 10,
    color: $type === 'change' ? '#713f12' : '#fff',
    background:
      $type === 'feature' ? '#2563eb' : $type === 'bug' ? '#dc2626' : '#eab308',
  }),
);

export const DevTaskDescription = styled('div')({
  fontSize: 14,
  color: TEXT,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
});

export const DevTaskMeta = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px 12px',
  fontSize: 11,
  color: TEXT_LIGHT,
});

export const DevStatusSelect = styled('select')({
  alignSelf: 'flex-start',
  fontSize: 12,
  padding: '6px 10px',
  borderRadius: 8,
  border: `1px solid ${BORDER}`,
  background: '#fff',
  fontFamily: 'inherit',
  fontWeight: 600,
  color: TEXT,
  cursor: 'pointer',
});

export const DevTaskDocLink = styled('button')({
  alignSelf: 'flex-start',
  fontSize: 12,
  fontWeight: 600,
  padding: '6px 12px',
  borderRadius: 8,
  border: `1px solid ${PRIMARY}`,
  background: PRIMARY_LIGHT,
  color: PRIMARY,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { background: '#ebe8ff' },
});

export const DevDocViewerBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  zIndex: 990,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  animation: `${fadeIn} 0.2s ease`,
});

export const DevDocViewerCard = styled('div')({
  background: '#fff',
  borderRadius: 14,
  width: '100%',
  maxWidth: 900,
  maxHeight: '90dvh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
});

export const DevDocViewerHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '12px 16px',
  borderBottom: `1px solid ${BORDER}`,
  fontWeight: 700,
  fontSize: 14,
  color: TEXT,
});

export const DevDocViewerActions = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

export const DevDocOpenLink = styled('a')({
  fontSize: 12,
  fontWeight: 600,
  color: PRIMARY,
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
});

export const DevDocViewerBody = styled('div')({
  flex: 1,
  minHeight: 360,
  background: '#f4f4f6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'auto',
});

export const DevDocFrame = styled('iframe')({
  width: '100%',
  height: 'min(70dvh, 720px)',
  border: 'none',
  background: '#fff',
});

export const DevDocImage = styled('img')({
  maxWidth: '100%',
  maxHeight: 'min(70dvh, 720px)',
  objectFit: 'contain',
});

export const DevTaskUploadRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '0 14px 8px',
  flexWrap: 'wrap',
});

export const DevUploadBtn = styled('button')({
  fontSize: 12,
  fontWeight: 600,
  padding: '7px 12px',
  borderRadius: 14,
  border: `1px dashed ${PRIMARY}`,
  background: '#fff',
  color: PRIMARY,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { background: PRIMARY_LIGHT },
  '&:disabled': { opacity: 0.6, cursor: 'not-allowed' },
});

export const DevAttachedFile = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  fontWeight: 600,
  padding: '6px 10px',
  borderRadius: 14,
  background: PRIMARY_LIGHT,
  color: PRIMARY,
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const DevRemoveDocBtn = styled('button')({
  border: 'none',
  background: 'transparent',
  color: '#888',
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: 1,
  padding: 0,
  fontFamily: 'inherit',
  '&:hover': { color: '#c0392b' },
});

export const DevHiddenFileInput = styled('input')({
  display: 'none',
});
