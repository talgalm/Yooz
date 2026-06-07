/**
 * DumbDumbBot — floating chatbot on all admin pages.
 * FAB fixed to the physical right side; opens a chat panel for how-to questions.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLang, useTranslations } from '../../context/LanguageContext';
import { adminApiFetch } from '../../utils/adminApi';
import { texts } from './AdminHelpChat.i18n';
import {
  HelpFab,
  FabTooltip,
  FabWrap,
  ChatBackdrop,
  ChatPanel,
  ChatHeader,
  ChatHeaderTitle,
  ChatCloseButton,
  ChatBody,
  BotMessage,
  UserMessage,
  ChipRow,
  Chip,
  InputArea,
  ChatInput,
  SendButton,
  TypingDots,
  Footnote,
} from './styled';

interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
}

interface ChatResponse {
  response: string;
}

export default function AdminHelpChat() {
  const t = useTranslations(texts);
  const { lang } = useLang();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [thinking, setThinking] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const toggle = useCallback(() => {
    setOpen((was) => {
      if (was) {
        setMessages([]);
        setInputValue('');
        setThinking(false);
      }
      return !was;
    });
  }, []);

  const sendQuery = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || thinking) return;

      const history = messages.map((m) => ({ from: m.from, text: m.text }));

      setMessages((prev) => [...prev, { from: 'user', text: trimmed }]);
      setInputValue('');
      setThinking(true);

      try {
        const data = await adminApiFetch<ChatResponse>('/api/admin/help-assistant/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: trimmed,
            history,
            lang,
            context: { route: location.pathname },
          }),
        });
        setThinking(false);
        setMessages((prev) => [...prev, { from: 'bot', text: data.response }]);
      } catch (err) {
        setThinking(false);
        const msg =
          err instanceof Error && err.message.includes('Too many')
            ? t.errorRate
            : t.errorGeneral;
        setMessages((prev) => [...prev, { from: 'bot', text: msg }]);
      }
    },
    [lang, location.pathname, messages, t.errorGeneral, t.errorRate, thinking],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void sendQuery(inputValue);
    }
  };

  const chips = [
    t.chipCreateActivity,
    t.chipAddGame,
    t.chipStatistics,
    t.chipExport,
    t.chipPortal,
  ];

  const showGreeting = messages.length === 0;

  return (
    <>
      <FabWrap className="help-fab-wrap">
        <FabTooltip>{t.fabTooltip}</FabTooltip>
        <HelpFab onClick={toggle} aria-label={t.fabAria} title={t.fabTooltip}>
          {open ? '✕' : '🤖'}
        </HelpFab>
      </FabWrap>

      {open && <ChatBackdrop onClick={toggle} />}
      {open && (
        <ChatPanel>
          <ChatHeader>
            <ChatHeaderTitle>
              <span aria-hidden>🤖</span>
              {t.headerTitle}
            </ChatHeaderTitle>
            <ChatCloseButton onClick={toggle} aria-label="Close">
              &times;
            </ChatCloseButton>
          </ChatHeader>

          <ChatBody ref={bodyRef}>
            {showGreeting && <BotMessage>{t.greeting}</BotMessage>}
            {messages.map((msg, i) =>
              msg.from === 'user' ? (
                <UserMessage key={i}>{msg.text}</UserMessage>
              ) : (
                <BotMessage key={i}>{msg.text}</BotMessage>
              ),
            )}
            {thinking && (
              <TypingDots aria-label="Thinking">
                <span />
                <span />
                <span />
              </TypingDots>
            )}
          </ChatBody>

          {showGreeting && (
            <ChipRow>
              {chips.map((label) => (
                <Chip key={label} type="button" onClick={() => void sendQuery(label)}>
                  {label}
                </Chip>
              ))}
            </ChipRow>
          )}

          <InputArea>
            <ChatInput
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.inputPlaceholder}
              disabled={thinking}
            />
            <SendButton
              type="button"
              onClick={() => void sendQuery(inputValue)}
              disabled={thinking || !inputValue.trim()}
              aria-label="Send"
            >
              ↑
            </SendButton>
          </InputArea>

          <Footnote>{t.footnote}</Footnote>
        </ChatPanel>
      )}
    </>
  );
}
