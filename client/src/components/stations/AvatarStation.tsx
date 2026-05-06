import { useState, useRef, useEffect } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { StationContinueButton } from '../games/styled';
import StationDescriptionPopup from './StationDescriptionPopup';
import type { StationItemData } from '../../pages/StoryModulePage/types';

interface ChatMessage {
  id: number;
  role: 'user' | 'character';
  text: string;
}

interface SpeechHandle {
  stop: () => void;
}

function speakBrowser(text: string, voiceType: 'man' | 'woman', onEnd?: () => void): SpeechHandle {
  const noop: SpeechHandle = { stop: () => {} };
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return noop;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL';
    u.rate = voiceType === 'man' ? 0.92 : 1;
    u.pitch = voiceType === 'woman' ? 1.3 : 0.4;
    const voices = window.speechSynthesis.getVoices();
    const hebVoices = voices.filter((v) => v.lang === 'he-IL' || v.lang.startsWith('he'));
    if (hebVoices.length > 0) {
      const genderKey = voiceType === 'woman' ? 'female' : 'male';
      const gendered = hebVoices.find(
        (v) =>
          v.name.toLowerCase().includes(genderKey) ||
          (v as unknown as { gender?: string }).gender === genderKey
      );
      u.voice = gendered || hebVoices[0];
    }
    if (onEnd) {
      u.onend = onEnd;
      u.onerror = onEnd;
    }
    window.speechSynthesis.speak(u);
    return {
      stop: () => {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* noop */
        }
      },
    };
  } catch {
    onEnd?.();
    return noop;
  }
}

interface PreparedSpeech {
  play: (onEnd: () => void) => void;
  stop: () => void;
}

/** Pre-fetch and buffer TTS audio so playback can start with no network gap.
 *  Falls back to browser SpeechSynthesis when the TTS API is unavailable. */
async function prepareSpeech(
  text: string,
  voiceType: 'man' | 'woman' = 'man'
): Promise<PreparedSpeech> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceType }),
    });
    if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    await new Promise<void>((resolve, reject) => {
      const ok = () => { cleanup(); resolve(); };
      const err = () => { cleanup(); reject(new Error('audio load failed')); };
      const cleanup = () => {
        audio.removeEventListener('canplaythrough', ok);
        audio.removeEventListener('error', err);
      };
      audio.addEventListener('canplaythrough', ok);
      audio.addEventListener('error', err);
      audio.load();
      // safety: some mobile browsers never fire canplaythrough
      window.setTimeout(() => { cleanup(); resolve(); }, 1500);
    });

    let stopped = false;
    return {
      play: (onEnd) => {
        if (stopped) { onEnd(); return; }
        const finish = () => {
          try { URL.revokeObjectURL(audioUrl); } catch { /* noop */ }
          if (!stopped) onEnd();
        };
        audio.onended = finish;
        audio.onerror = finish;
        audio.play().catch(finish);
      },
      stop: () => {
        stopped = true;
        try { audio.pause(); } catch { /* noop */ }
        try { URL.revokeObjectURL(audioUrl); } catch { /* noop */ }
      },
    };
  } catch {
    let browserHandle: SpeechHandle | null = null;
    let stopped = false;
    return {
      play: (onEnd) => {
        if (stopped) { onEnd(); return; }
        browserHandle = speakBrowser(text, voiceType, onEnd);
      },
      stop: () => {
        stopped = true;
        browserHandle?.stop();
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      },
    };
  }
}

/** Warm the browser cache for the video URL so `<video>` plays immediately
 *  when it mounts, instead of waiting on a fresh network fetch. */
function preloadVideoUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const v = document.createElement('video');
      v.preload = 'auto';
      v.muted = true;
      v.src = url;
      const done = () => {
        v.removeEventListener('canplaythrough', done);
        v.removeEventListener('loadeddata', done);
        v.removeEventListener('error', done);
        resolve();
      };
      v.addEventListener('canplaythrough', done);
      v.addEventListener('loadeddata', done);
      v.addEventListener('error', done);
      v.load();
      window.setTimeout(done, 1500);
    } catch {
      resolve();
    }
  });
}

function pickVideoForAnswer(
  answer: string,
  videos: Array<{ url: string; matchingWords?: string[] }>
): string | undefined {
  const valid = videos.filter((v) => v.url?.trim());
  if (valid.length === 0) return undefined;
  const haystack = answer.toLowerCase();
  const match = valid.find((v) =>
    (v.matchingWords || [])
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean)
      .some((w) => haystack.includes(w))
  );
  if (match) return match.url.trim();
  return valid[Math.floor(Math.random() * valid.length)].url.trim();
}

function primeSpeech() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {
    /* noop */
  }
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
  voiceType?: 'man' | 'woman';
  videos?: Array<{ url: string; matchingWords: string[] }>;
  descriptionAsPopup?: boolean;
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
  marginTop: -10,
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

const messageIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;


const MessageBubble = styled('div')<{ role: 'user' | 'character' }>(({ role }) => ({
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

const CharacterMessageRow = styled('div')({
  display: 'flex',
  alignItems: 'flex-end',
  gap: 6,
  alignSelf: 'flex-end',
  width: '100%',
  justifyContent: 'flex-end',
  maxWidth: '100%',
});

const SpeakButton = styled('button')({
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

const StationHeader = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  width: '100%',
  '& > h2': { marginBottom: 0 },
});

const StationDescriptionText = styled('p')({
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

const CHARACTER_WIDTH = 340;
const BUTTON_WIDTH = 220;

const CharacterWindow = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: CHARACTER_WIDTH,
  marginTop: -18,
  '@media (min-width: 768px)': {
    maxWidth: 520,
  },
});

const CharacterImage = styled('img')({
  width: '100%',
  aspectRatio: '1 / 1',
  objectFit: 'cover',
  borderRadius: 16,
  display: 'block',
});

const CharacterVideo = styled('video')({
  width: '100%',
  aspectRatio: '1 / 1',
  objectFit: 'cover',
  borderRadius: 16,
  display: 'block',
  background: '#000',
});

const bubblePop = keyframes`
  from { opacity: 0; transform: translateY(-6px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const SpeakingBubble = styled('div')({
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

const InfoButton = styled('button')({
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

const HistoryButton = styled('button')({
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

const HistoryCountBadge = styled('span')({
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
  background: '#fff',
  color: '#111',
  border: '3px solid #000',
  boxShadow: '0 3px 0 #000',
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
  sessionStorageKey?: string;
}

export default function AvatarStation({
  station,
  onContinue,
  continueLabel,
  textColor,
  sessionStorageKey,
}: AvatarStationProps) {
  const settings = (station.settings || {}) as AvatarSettings;
  const descriptionAsPopup = !!settings.descriptionAsPopup && !!station.description;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [descriptionPopupOpen, setDescriptionPopupOpen] = useState(descriptionAsPopup);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const nextIdRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suspenseTimerRef = useRef<number | null>(null);
  const speechHandleRef = useRef<SpeechHandle | null>(null);

  const clearSuspenseTimer = () => {
    if (suspenseTimerRef.current !== null) {
      window.clearTimeout(suspenseTimerRef.current);
      suspenseTimerRef.current = null;
    }
  };

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);
  const speakingMessageIdRef = useRef<number | null>(null);

  const stopSpeaking = () => {
    clearSuspenseTimer();
    speechHandleRef.current?.stop();
    speechHandleRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveVideoUrl(null);
    setSpeakingMessageId(null);
    setSpeakingText(null);
  };

  useEffect(() => {
    if (messages.length === 0 || !popupOpen) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, popupOpen]);

  useEffect(() => {
    if (typeof window === 'undefined' || !sessionStorageKey) return;
    try {
      const raw = window.sessionStorage.getItem(sessionStorageKey);
      if (!raw) {
        setMessages([]);
        nextIdRef.current = 1;
        return;
      }
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (!Array.isArray(parsed)) return;
      const sanitized = parsed.filter(
        (item): item is ChatMessage =>
          typeof item?.id === 'number' &&
          (item?.role === 'user' || item?.role === 'character') &&
          typeof item?.text === 'string'
      );
      setMessages(sanitized);
      nextIdRef.current = sanitized.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;
    } catch {
      setMessages([]);
      nextIdRef.current = 1;
    }
  }, [sessionStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !sessionStorageKey) return;
    try {
      window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(messages));
    } catch {
      /* best effort */
    }
  }, [messages, sessionStorageKey]);

  useEffect(() => {
    return () => {
      clearSuspenseTimer();
      speechHandleRef.current?.stop();
      speechHandleRef.current = null;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    primeSpeech();
    const userMsg: ChatMessage = { id: nextIdRef.current++, role: 'user', text };
    setMessage('');
    const historySnapshot = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, userMsg]);
    setPopupOpen(false);

    const replyText = await askAvatar(text, settings, historySnapshot);
    if (!isMountedRef.current) return;
    const replyId = nextIdRef.current++;
    setMessages((prev) => [...prev, { id: replyId, role: 'character', text: replyText }]);

    // Stop any prior playback before starting the new one
    clearSuspenseTimer();
    speechHandleRef.current?.stop();
    speechHandleRef.current = null;

    // Show the bubble immediately so the user sees the reply text right away
    speakingMessageIdRef.current = replyId;
    setSpeakingMessageId(replyId);
    setSpeakingText(replyText);

    const videoUrl = pickVideoForAnswer(replyText, settings.videos || []);

    // Pre-fetch BOTH the TTS audio and the video file in parallel so playback
    // can start with no network gap between video and voice.
    let speech: PreparedSpeech;
    try {
      const [s] = await Promise.all([
        prepareSpeech(replyText, settings.voiceType || 'man'),
        videoUrl ? preloadVideoUrl(videoUrl) : Promise.resolve(),
      ]);
      speech = s;
    } catch {
      return;
    }

    // If the user navigated away or started another reply while we were loading, bail.
    if (!isMountedRef.current || speakingMessageIdRef.current !== replyId) {
      speech.stop();
      return;
    }

    // Start video and audio in the same tick so they begin together.
    if (videoUrl) setActiveVideoUrl(videoUrl);
    speechHandleRef.current = speech;
    speech.play(() => {
      if (speechHandleRef.current === speech) speechHandleRef.current = null;
      if (!isMountedRef.current) return;
      setActiveVideoUrl(null);
      setSpeakingMessageId(null);
      setSpeakingText(null);
    });
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
      <StationHeader>
        <StationTitle style={textColor ? { color: textColor } : undefined}>{station.name}</StationTitle>
        {station.description && !descriptionAsPopup && (
          <StationDescriptionText style={textColor ? { color: textColor } : undefined}>{station.description}</StationDescriptionText>
        )}
      </StationHeader>

      <CharacterWindow>
        {activeVideoUrl ? (
          <CharacterVideo
            key={activeVideoUrl}
            src={activeVideoUrl}
            autoPlay
            loop
            muted
            playsInline
          />
        ) : settings.characterImageUrl ? (
          <CharacterImage src={settings.characterImageUrl} alt={settings.characterName || ''} />
        ) : null}
        {settings.characterName && <CharacterNameBadge>{settings.characterName}</CharacterNameBadge>}
        {descriptionAsPopup && (
          <InfoButton type="button" aria-label="show description" onClick={() => setDescriptionPopupOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </InfoButton>
        )}
        {messages.length > 0 && (
          <HistoryButton type="button" aria-label="open chat history" onClick={() => setPopupOpen(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <HistoryCountBadge>{messages.length}</HistoryCountBadge>
          </HistoryButton>
        )}
        {speakingText && <SpeakingBubble>{speakingText}</SpeakingBubble>}
      </CharacterWindow>

      <InputWrap>{chatInput}</InputWrap>

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
              {messages.map((m) =>
                m.role === 'character' ? (
                  <CharacterMessageRow key={m.id}>
                    <MessageBubble role={m.role}>{m.text}</MessageBubble>
                    {speakingMessageId === m.id && (
                      <SpeakButton type="button" aria-label="mute" onClick={stopSpeaking}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <line x1="23" y1="9" x2="17" y2="15" />
                          <line x1="17" y1="9" x2="23" y2="15" />
                        </svg>
                      </SpeakButton>
                    )}
                  </CharacterMessageRow>
                ) : (
                  <MessageBubble key={m.id} role={m.role}>{m.text}</MessageBubble>
                ),
              )}
            </ScrollArea>
            {chatInput}
          </PopupPanel>
        </>
      )}

      <FixedContinue onClick={onContinue}>{continueLabel}</FixedContinue>

      {descriptionAsPopup && descriptionPopupOpen && station.description && (
        <StationDescriptionPopup
          title={station.name}
          description={station.description}
          onDismiss={() => setDescriptionPopupOpen(false)}
        />
      )}
    </Container>
  );
}
