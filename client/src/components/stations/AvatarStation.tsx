import { useState, useRef, useEffect } from 'react';
import StationDescriptionPopup from './StationDescriptionPopup';
import type { StationItemData } from '../../pages/StoryModulePage/types';
import { objectPositionStyle } from '../imagePosition';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './AvatarStation.i18n';
import {
  type SpeechHandle,
  type PreparedSpeech,
  fetchWithNetworkRetry,
  prepareSpeech,
  preloadVideoUrl,
  primeSpeech,
} from './avatar/speech';
import {
  Container,
  InputWrap,
  PopupBackdrop,
  PopupPanel,
  PopupTitleBar,
  PopupCloseButton,
  ScrollArea,
  MessageBubble,
  CharacterMessageRow,
  SpeakButton,
  StationTitle,
  StationHeader,
  StationDescriptionText,
  CharacterWindow,
  CharacterImage,
  CharacterVideo,
  SpeakingBubble,
  CharacterNameBadge,
  InfoButton,
  HistoryButton,
  HistoryCountBadge,
  ChatBar,
  ChatIconButton,
  ChatInput,
  FixedContinue,
} from './avatar/styled';

interface ChatMessage {
  id: number;
  role: 'user' | 'character';
  text: string;
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

async function askAvatar(
  message: string,
  settings: AvatarSettings,
  history: { role: 'user' | 'character'; text: string }[],
  noAnswer: string
): Promise<string> {
  try {
    const res = await fetchWithNetworkRetry('/api/avatar-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, settings, history }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { response?: string };
    return data.response?.trim() || noAnswer;
  } catch {
    return noAnswer;
  }
}

interface AvatarSettings {
  characterName?: string;
  characterImageUrl?: string;
  characterImagePosition?: string;
  detectiveRiddle?: string;
  instructions?: string;
  optionalAnswers?: string[];
  forbiddenPhrases?: string[];
  voiceType?: 'man' | 'woman';
  videos?: Array<{ url: string; matchingWords: string[] }>;
  descriptionAsPopup?: boolean;
}

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
  const t = useTranslations(texts);
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

    const replyText = await askAvatar(text, settings, historySnapshot, t.noAnswer);
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

  const placeholder = t.askPlaceholder(settings.characterName || '');
  const hasAskedQuestion = messages.some((m) => m.role === 'user');

  const chatInput = (
    <ChatBar onSubmit={handleSubmit}>
      <ChatInput
        placeholder={placeholder}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <ChatIconButton type="submit" aria-label="send" disabled={!message.trim()}>
        <span>{t.send}</span>
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
          <CharacterImage
            src={settings.characterImageUrl}
            alt={settings.characterName || ''}
            style={{ objectPosition: objectPositionStyle(settings.characterImagePosition) }}
          />
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
              <span>{settings.characterName || t.conversation}</span>
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

      <FixedContinue onClick={onContinue} disabled={!hasAskedQuestion}>{continueLabel}</FixedContinue>

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
