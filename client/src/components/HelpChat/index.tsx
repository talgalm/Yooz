import { useState, useRef, useEffect } from 'react';
import { useTranslations, useLang } from '../../context/LanguageContext';
import { texts } from './HelpChat.i18n';
import { matchTopic } from './matcher';
import {
  HelpFab,
  ChatBackdrop,
  ChatPanel,
  ChatHeader,
  ChatHeaderTitle,
  ChatCloseButton,
  ChatBody,
  BotMessage,
  UserMessage,
  OptionsGrid,
  OptionButton,
  OptionIcon,
  PhoneBar,
  PhoneLink,
  InputArea,
  ChatInput,
  SendButton,
  TypingDots,
  BackButton,
} from './styled';

const SUPPORT_PHONE = '050-0000000';

interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
}

type View = 'menu' | 'faq' | 'other';

export default function HelpChat() {
  const t = useTranslations(texts);
  const { lang } = useLang();

  const [open, setOpen] = useState(false);
  const [hiddenForBallGame, setHiddenForBallGame] = useState(
    () => document.body.classList.contains('yooz-ballgame-active')
  );
  const [view, setView] = useState<View>('menu');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [typing, setTyping] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, typing]);

  // Focus input when switching to "other" view
  useEffect(() => {
    if (view === 'other' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [view]);

  useEffect(() => {
    const onVisibilityChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ active?: boolean }>;
      setHiddenForBallGame(Boolean(customEvent.detail?.active));
    };

    window.addEventListener('yooz:ballgame-visibility', onVisibilityChange as EventListener);
    return () => {
      window.removeEventListener('yooz:ballgame-visibility', onVisibilityChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (hiddenForBallGame) {
      setOpen(false);
      resetChat();
    }
  }, [hiddenForBallGame]);

  const resetChat = () => {
    setView('menu');
    setMessages([]);
    setInputValue('');
    setTyping(false);
  };

  const handleToggle = () => {
    if (open) {
      setOpen(false);
      resetChat();
    } else {
      setOpen(true);
    }
  };

  const handleFaqClick = (faqKey: 'responseFaq1' | 'responseFaq2' | 'responseFaq3', label: string) => {
    setView('faq');
    setMessages([
      { from: 'user', text: label },
    ]);
    // Simulate typing delay
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { from: 'bot', text: t[faqKey] }]);
    }, 600);
  };

  const handleOtherClick = () => {
    setView('other');
    setMessages([{ from: 'bot', text: t.greeting }]);
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { from: 'user', text }]);
    setInputValue('');
    setTyping(true);

    try {
      // Try server-side Gemini endpoint first
      const res = await fetch('/api/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, lang }),
      });

      if (!res.ok) throw new Error('Server error');

      const data = await res.json();
      setTyping(false);
      setMessages((prev) => [...prev, { from: 'bot', text: data.response }]);
    } catch {
      // Fallback to client-side keyword matcher
      const match = matchTopic(text, lang);
      setTyping(false);

      if (match) {
        const responseText = t[match.responseKey as keyof typeof t] || t.responseGeneral;
        setMessages((prev) => [...prev, { from: 'bot', text: responseText }]);
      } else {
        setMessages((prev) => [...prev, { from: 'bot', text: t.noMatch }]);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  if (hiddenForBallGame) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      {open && <ChatBackdrop onClick={handleToggle} />}

      {/* Chat Panel */}
      {open && (
        <ChatPanel>
          <ChatHeader>
            <ChatHeaderTitle>{t.headerTitle}</ChatHeaderTitle>
            <ChatCloseButton onClick={handleToggle}>&times;</ChatCloseButton>
          </ChatHeader>

          <ChatBody ref={bodyRef}>
            {view === 'menu' && (
              <>
                <BotMessage>{t.greeting}</BotMessage>
                <OptionsGrid>
                  <OptionButton onClick={() => handleFaqClick('responseFaq1', t.faq1Label)}>
                    <OptionIcon>🔑</OptionIcon>
                    {t.faq1Label}
                  </OptionButton>
                  <OptionButton onClick={() => handleFaqClick('responseFaq2', t.faq2Label)}>
                    <OptionIcon>📊</OptionIcon>
                    {t.faq2Label}
                  </OptionButton>
                  <OptionButton onClick={() => handleFaqClick('responseFaq3', t.faq3Label)}>
                    <OptionIcon>🔄</OptionIcon>
                    {t.faq3Label}
                  </OptionButton>
                  <OptionButton onClick={handleOtherClick}>
                    <OptionIcon>💬</OptionIcon>
                    {t.otherLabel}
                  </OptionButton>
                </OptionsGrid>
              </>
            )}

            {(view === 'faq' || view === 'other') && (
              <>
                {messages.map((msg, i) => (
                  msg.from === 'bot'
                    ? <BotMessage key={i}>{msg.text}</BotMessage>
                    : <UserMessage key={i}>{msg.text}</UserMessage>
                ))}
                {typing && (
                  <TypingDots>
                    <span />
                    <span />
                    <span />
                  </TypingDots>
                )}
                <BackButton onClick={resetChat}>
                  ← {t.backToMenu}
                </BackButton>
              </>
            )}
          </ChatBody>

          {/* Input area only visible in "other" mode */}
          {view === 'other' && (
            <InputArea>
              <ChatInput
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.inputPlaceholder}
                disabled={typing}
              />
              <SendButton onClick={handleSend} disabled={!inputValue.trim() || typing}>
                ➤
              </SendButton>
            </InputArea>
          )}

          <PhoneBar>
            <span>{t.phoneLine}</span>
            <PhoneLink href={`tel:${SUPPORT_PHONE}`}>{SUPPORT_PHONE}</PhoneLink>
          </PhoneBar>
        </ChatPanel>
      )}

      {/* FAB */}
      <HelpFab onClick={handleToggle}>
        {open ? '✕' : '?'}
      </HelpFab>
    </>
  );
}
