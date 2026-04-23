import { useState, useRef, useEffect } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { StationContinueButton } from '../games/styled';
import type { StationItemData } from '../../pages/StoryModulePage/types';

interface ChatMessage {
  id: number;
  role: 'user' | 'character';
  text: string;
}

async function askAvatar(
  message: string,
  settings: AvatarSettings,
  history: { role: 'user' | 'character'; text: string }[]
): Promise<string> {
  try {
    const res = await fetch('/api/avatar-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, settings, history }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { response?: string };
    return data.response?.trim() || 'אני עוד לא יודע לענות על זה...';
  } catch {
    return 'אני עוד לא יודע לענות על זה...';
  }
}

interface AvatarSettings {
  characterName?: string;
  characterImageUrl?: string;
  detectiveRiddle?: string;
  instructions?: string;
  optionalAnswers?: string[];
  forbiddenPhrases?: string[];
  videos?: Array<{ url: string; matchingWords: string[] }>;
}

const Container = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '24px 20px 140px',
  gap: 28,
  textAlign: 'center',
});

const InputWrap = styled('div')({
  width: '100%',
  maxWidth: 340,
  display: 'flex',
  flexDirection: 'column',
});

const popupIn = keyframes`
  from { opacity: 0; transform: translate(-50%, 20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
`;

const PopupBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  backdropFilter: 'blur(3px)',
  WebkitBackdropFilter: 'blur(3px)',
  zIndex: 50,
  animation: 'fadeIn 0.2s ease-out',
  '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } },
});

const PopupPanel = styled('div')({
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

const PopupTitleBar = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 14,
  fontWeight: 700,
  color: '#4a4f66',
  padding: '2px 4px 8px',
  borderBottom: '1px solid rgba(0,0,0,0.08)',
});

const PopupCloseButton = styled('button')({
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

const ScrollArea = styled('div')({
  flex: 1,
  minHeight: 60,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: '8px 2px',
});

const OpenChatHint = styled('button')({
  appearance: 'none',
  border: '1.5px solid rgba(255,255,255,0.7)',
  background: 'rgba(255,255,255,0.5)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  padding: '8px 16px',
  borderRadius: 999,
  fontSize: 14,
  fontWeight: 700,
  color: '#1a1a2e',
  cursor: 'pointer',
  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
});

const messageIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;


const MessageBubble = styled('div')<{ role: 'user' | 'character' }>(({ role }) => ({
  alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
  background: role === 'user' ? '#6c5ce7' : '#ffffff',
  color: role === 'user' ? '#fff' : '#1a1a2e',
  padding: '10px 14px',
  borderRadius: 16,
  borderBottomRightRadius: role === 'user' ? 4 : 16,
  borderBottomLeftRadius: role === 'character' ? 4 : 16,
  fontSize: 15,
  fontWeight: 500,
  lineHeight: 1.4,
  maxWidth: '80%',
  textAlign: 'start',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  animation: `${messageIn} 0.2s ease-out`,
  wordBreak: 'break-word',
}));

const StationTitle = styled('h2')({
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

const CHARACTER_WIDTH = 340;
const BUTTON_WIDTH = 220;

const CharacterWindow = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: CHARACTER_WIDTH,
});

const CharacterImage = styled('img')({
  width: '100%',
  aspectRatio: '1 / 1',
  objectFit: 'cover',
  borderRadius: 16,
  display: 'block',
});

const CharacterNameBadge = styled('div')({
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

const ChatBar = styled('form')({
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

const ChatIconButton = styled('button')({
  background: 'transparent',
  border: 'none',
  color: '#8b94a8',
  padding: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  borderRadius: '50%',
  '&:hover': { color: '#6c5ce7' },
  '&:disabled': { opacity: 0.4, cursor: 'default' },
});

const ChatInput = styled('input')({
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

const FixedContinue = styled(StationContinueButton)({
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 40,
  width: 'calc(100% - 40px)',
  maxWidth: BUTTON_WIDTH,
  background: '#6c5ce7',
  color: '#111',
  border: '3px solid #000',
  boxShadow: '0 3px 0 #000, 0 4px 20px rgba(108,92,231,0.35)',
  '&:active': {
    transform: 'translateX(-50%) translateY(3px)',
    boxShadow: '0 0 0 #000',
  },
});

interface AvatarStationProps {
  station: StationItemData;
  onContinue: () => void;
  continueLabel: string;
  textColor?: string;
}

export default function AvatarStation({ station, onContinue, continueLabel, textColor }: AvatarStationProps) {
  const settings = (station.settings || {}) as AvatarSettings;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const nextIdRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0 || !popupOpen) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, popupOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    const userMsg: ChatMessage = { id: nextIdRef.current++, role: 'user', text };
    setMessage('');
    const historySnapshot = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, userMsg]);
    setPopupOpen(true);
    const replyText = await askAvatar(text, settings, historySnapshot);
    setMessages((prev) => [...prev, { id: nextIdRef.current++, role: 'character', text: replyText }]);
  };

  const placeholder = `שאל את ${settings.characterName || ''}`.trim();

  const chatInput = (
    <ChatBar onSubmit={handleSubmit}>
      <ChatInput
        placeholder={placeholder}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <ChatIconButton type="submit" aria-label="send" disabled={!message.trim()}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </ChatIconButton>
    </ChatBar>
  );

  const showPopup = popupOpen && messages.length > 0;

  return (
    <Container>
      <StationTitle style={textColor ? { color: textColor } : undefined}>{station.name}</StationTitle>

      <CharacterWindow>
        {settings.characterImageUrl && (
          <CharacterImage src={settings.characterImageUrl} alt={settings.characterName || ''} />
        )}
        {settings.characterName && <CharacterNameBadge>{settings.characterName}</CharacterNameBadge>}
      </CharacterWindow>

      {messages.length > 0 ? (
        !popupOpen && (
          <OpenChatHint type="button" onClick={() => setPopupOpen(true)}>
            פתח שיחה ({messages.length})
          </OpenChatHint>
        )
      ) : (
        <InputWrap>{chatInput}</InputWrap>
      )}

      {showPopup && (
        <>
          <PopupBackdrop onClick={() => setPopupOpen(false)} />
          <PopupPanel>
            <PopupTitleBar>
              <span>{settings.characterName || 'שיחה'}</span>
              <PopupCloseButton type="button" aria-label="close" onClick={() => setPopupOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </PopupCloseButton>
            </PopupTitleBar>
            <ScrollArea ref={scrollRef}>
              {messages.map((m) => (
                <MessageBubble key={m.id} role={m.role}>{m.text}</MessageBubble>
              ))}
            </ScrollArea>
            {chatInput}
          </PopupPanel>
        </>
      )}

      <FixedContinue onClick={onContinue}>{continueLabel}</FixedContinue>
    </Container>
  );
}
