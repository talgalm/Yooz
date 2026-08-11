/**
 * Chrome shared by AvatarStation and AvatarQuizStation — character window,
 * speech bubble, chat bar, and the transcript popup.
 *
 * Extracted from AvatarStation with no visual change, so the quiz variant
 * inherits the same look and the desktop-overlap fixes recorded there
 * (QA Jun 2026 page 18) apply to both.
 */
import { styled, keyframes } from '@mui/material/styles';
import { StationContinueButton } from '../../games/styled';

export const CHARACTER_WIDTH = 340;
export const BUTTON_WIDTH = 220;

export const Container = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '24px 20px 140px',
  gap: 28,
  textAlign: 'center',
  // Desktop: cap to a centered column. The character image (CharacterWindow)
  // grows to 520px on desktop but its own `aspect-ratio: 1` made it tall
  // enough that the chat input + fixed Continue button overlapped on
  // shorter desktop windows (QA Jun 2026 page 18).
  '@media (min-width: 768px)': {
    width: 'min(720px, 88vw)',
    marginInline: 'auto',
    padding: '32px 24px 160px',
  },
});

export const InputWrap = styled('div')({
  width: '100%',
  maxWidth: 340,
  display: 'flex',
  flexDirection: 'column',
  marginTop: -10,
  '@media (min-width: 768px)': {
    maxWidth: 520,
  },
});

const popupIn = keyframes`
  from { opacity: 0; transform: translate(-50%, 20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
`;

export const PopupBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  zIndex: 50,
  animation: 'fadeIn 0.2s ease-out',
  '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
});

export const PopupPanel = styled('div')({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'calc(100% - 32px)',
  maxWidth: 380,
  maxHeight: 'calc(100vh - 40px)',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  background: '#f3f4fa',
  border: '1.5px solid rgba(255, 255, 255, 0.9)',
  borderRadius: 18,
  padding: 12,
  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
  zIndex: 51,
  animation: `${popupIn} 0.22s ease-out`,
});

export const PopupTitleBar = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 14,
  fontWeight: 700,
  color: '#4a4f66',
  padding: '2px 4px 8px',
  borderBottom: '1px solid rgba(0,0,0,0.08)',
});

export const PopupCloseButton = styled('button')({
  background: 'transparent',
  border: 'none',
  color: '#4a4f66',
  width: 28,
  height: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  borderRadius: '50%',
  padding: 0,
  '&:hover': { background: 'rgba(0,0,0,0.08)' },
});

export const ScrollArea = styled('div')({
  flex: 1,
  minHeight: 60,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '8px 2px',
});

const messageIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const MessageBubble = styled('div')<{ role: 'user' | 'character' }>(({ role }) => ({
  alignSelf: role === 'user' ? 'flex-start' : 'flex-end',
  background: role === 'user' ? '#6c5ce7' : '#ffffff',
  color: role === 'user' ? '#fff' : '#1a1a2e',
  padding: '10px 14px',
  borderRadius: 16,
  borderBottomLeftRadius: role === 'user' ? 4 : 16,
  borderBottomRightRadius: role === 'character' ? 4 : 16,
  fontSize: 15,
  fontWeight: 500,
  lineHeight: 1.4,
  maxWidth: '80%',
  textAlign: 'start',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  animation: `${messageIn} 0.2s ease-out`,
  wordBreak: 'break-word',
}));

export const CharacterMessageRow = styled('div')({
  display: 'flex',
  alignItems: 'flex-end',
  gap: 6,
  alignSelf: 'flex-end',
  width: '100%',
  justifyContent: 'flex-end',
  maxWidth: '100%',
});

export const SpeakButton = styled('button')({
  appearance: 'none',
  background: 'rgba(108,92,231,0.12)',
  border: '1px solid rgba(108,92,231,0.25)',
  color: '#6c5ce7',
  width: 30,
  height: 30,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
  padding: 0,
  '&:hover': { background: 'rgba(108,92,231,0.2)' },
  '&:active': { transform: 'scale(0.95)' },
});

export const StationTitle = styled('h2')({
  fontSize: 26,
  fontWeight: 800,
  color: '#fff',
  WebkitTextStroke: '1.5px #000',
  paintOrder: 'stroke fill',
  margin: '0 0 16px',
  textAlign: 'center',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  paddingTop: 8,
});

export const StationHeader = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  width: '100%',
  '& > h2': { marginBottom: 0 },
});

export const StationDescriptionText = styled('p')({
  fontSize: 15,
  fontWeight: 700,
  color: '#fff',
  WebkitTextStroke: '1px #000',
  paintOrder: 'stroke fill',
  margin: 0,
  textAlign: 'center',
  lineHeight: 1.35,
  maxWidth: 360,
});

export const CharacterWindow = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: CHARACTER_WIDTH,
  marginTop: -18,
  // Desktop: keep the figure presentable but shorter than the viewport so
  // there's room for the chat input + fixed Continue button below. With the
  // old 1:1 ratio at 520px wide, the figure ate ~520px of vertical space
  // and the Continue button slid on top of the chat bar (QA Jun 2026 page 18).
  '@media (min-width: 768px)': {
    maxWidth: 380,
    aspectRatio: 'auto',
  },
});

export const CharacterImage = styled('img')({
  width: '100%',
  aspectRatio: '1 / 1',
  objectFit: 'cover',
  borderRadius: 16,
  display: 'block',
  '@media (min-width: 768px)': {
    maxHeight: 'min(46vh, 380px)',
  },
});

export const CharacterVideo = styled('video')({
  width: '100%',
  aspectRatio: '1 / 1',
  objectFit: 'cover',
  borderRadius: 16,
  display: 'block',
  background: '#000',
  '@media (min-width: 768px)': {
    maxHeight: 'min(46vh, 380px)',
  },
});

const bubblePop = keyframes`
  from { opacity: 0; transform: translateY(-6px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

export const SpeakingBubble = styled('div')({
  position: 'absolute',
  top: 'calc(100% + 14px)',
  insetInlineStart: 0,
  insetInlineEnd: 0,
  background: '#ffffff',
  color: '#1a1a2e',
  borderRadius: 18,
  padding: '12px 16px',
  fontSize: 15,
  lineHeight: 1.45,
  fontWeight: 500,
  textAlign: 'start',
  boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
  border: '1.5px solid rgba(108,92,231,0.25)',
  animation: `${bubblePop} 0.18s ease-out`,
  zIndex: 5,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -8,
    insetInlineStart: 28,
    width: 14,
    height: 14,
    background: '#ffffff',
    borderTop: '1.5px solid rgba(108,92,231,0.25)',
    borderLeft: '1.5px solid rgba(108,92,231,0.25)',
    transform: 'rotate(45deg)',
  },
});

export const CharacterNameBadge = styled('div')({
  position: 'absolute',
  top: 12,
  insetInlineEnd: 12,
  background: 'rgba(0, 0, 0, 0.55)',
  color: '#fff',
  fontSize: 15,
  fontWeight: 700,
  padding: '6px 14px',
  borderRadius: 999,
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  maxWidth: '70%',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const InfoButton = styled('button')({
  position: 'absolute',
  top: 12,
  insetInlineStart: 12,
  appearance: 'none',
  border: '1.5px solid rgba(255,255,255,0.7)',
  background: 'rgba(0,0,0,0.55)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  width: 34,
  height: 34,
  borderRadius: '50%',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
  zIndex: 6,
  '&:active': { transform: 'scale(0.95)' },
});

export const HistoryButton = styled('button')({
  position: 'absolute',
  bottom: 12,
  insetInlineEnd: 12,
  appearance: 'none',
  border: '1.5px solid rgba(255,255,255,0.7)',
  background: 'rgba(0,0,0,0.55)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  width: 44,
  height: 44,
  borderRadius: '50%',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
  '&:active': { transform: 'scale(0.95)' },
});

export const HistoryCountBadge = styled('span')({
  position: 'absolute',
  top: -4,
  insetInlineEnd: -4,
  minWidth: 20,
  height: 20,
  borderRadius: 10,
  background: '#ef4444',
  color: '#fff',
  fontSize: 11,
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 5px',
  border: '2px solid #1a1a2e',
});

export const ChatBar = styled('form')({
  width: '100%',
  background: '#ffffff',
  border: '1.5px solid #cfd5e2',
  borderRadius: 999,
  padding: '6px 10px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
});

export const ChatIconButton = styled('button')({
  background: '#6c5ce7',
  border: 'none',
  color: '#ffffff',
  padding: '8px 12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  cursor: 'pointer',
  borderRadius: 999,
  direction: 'rtl',
  fontSize: 14,
  fontWeight: 800,
  fontFamily: 'inherit',
  flexShrink: 0,
  boxShadow: '0 2px 0 #4c3cc7',
  transition: 'background 0.15s, box-shadow 0.15s, transform 0.15s',
  '&:hover': { background: '#5a4ad1' },
  '&:active': {
    transform: 'translateY(2px)',
    boxShadow: '0 0 0 #4c3cc7',
  },
  '&:disabled': {
    background: '#c4c9d6',
    boxShadow: 'none',
    opacity: 0.75,
    cursor: 'default',
  },
  '&:disabled:active': {
    transform: 'none',
  },
});

export const ChatInput = styled('input')({
  flex: 1,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: 15,
  fontFamily: 'inherit',
  color: '#1a1a2e',
  padding: '8px 4px',
  '&::placeholder': { color: '#8b94a8' },
});

export const FixedContinue = styled(StationContinueButton)({
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 40,
  width: 'calc(100% - 40px)',
  maxWidth: BUTTON_WIDTH,
  background: '#fff',
  color: '#111',
  border: '3px solid #000',
  boxShadow: '0 3px 0 #000',
  '&:active': {
    transform: 'translateX(-50%) translateY(3px)',
    boxShadow: '0 0 0 #000',
  },
  '&:disabled': {
    background: '#d7dbe5',
    color: '#7b8190',
    borderColor: '#9ca3af',
    boxShadow: '0 3px 0 #8b93a1',
    cursor: 'not-allowed',
    opacity: 0.85,
  },
  '&:disabled:active': {
    transform: 'translateX(-50%)',
    boxShadow: '0 3px 0 #8b93a1',
  },
});
