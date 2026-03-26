import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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
  HelpHeaderIconButton,
  HelpHeaderIconButtonLight,
} from './styled';

const SUPPORT_PHONE = '050-0000000';

interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
}

type View = 'menu' | 'faq' | 'other';

export type HelpChatVariant = 'fab' | 'header';

interface HelpChatContextValue {
  variant: HelpChatVariant;
  open: boolean;
  hiddenForBallGame: boolean;
  toggle: () => void;
}

const HelpChatContext = createContext<HelpChatContextValue | null>(null);

export function useHelpChat(): HelpChatContextValue {
  const ctx = useContext(HelpChatContext);
  if (!ctx) {
    throw new Error('useHelpChat must be used within HelpChatProvider');
  }
  return ctx;
}

interface HelpChatProviderProps {
  variant: HelpChatVariant;
  children: ReactNode;
}

export function HelpChatProvider({ variant, children }: HelpChatProviderProps) {
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

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, typing]);

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

  const resetChat = useCallback(() => {
    setView('menu');
    setMessages([]);
    setInputValue('');
    setTyping(false);
  }, []);

  useEffect(() => {
    if (hiddenForBallGame) {
      setOpen(false);
      resetChat();
    }
  }, [hiddenForBallGame, resetChat]);

  const handleToggle = useCallback(() => {
    setOpen((was) => {
      if (was) {
        resetChat();
        return false;
      }
      return true;
    });
  }, [resetChat]);

  const handleFaqClick = (faqKey: 'responseFaq1' | 'responseFaq2' | 'responseFaq3', label: string) => {
    setView('faq');
    setMessages([{ from: 'user', text: label }]);
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

  const ctxValue = useMemo(
    () => ({
      variant,
      open,
      hiddenForBallGame,
      toggle: handleToggle,
    }),
    [variant, open, hiddenForBallGame, handleToggle]
  );

  const showChrome = !hiddenForBallGame;

  return (
    <HelpChatContext.Provider value={ctxValue}>
      {children}
      {showChrome && open && <ChatBackdrop onClick={handleToggle} />}
      {showChrome && open && (
        <ChatPanel $anchor={variant}>
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
                {messages.map((msg, i) =>
                  msg.from === 'bot' ? (
                    <BotMessage key={i}>{msg.text}</BotMessage>
                  ) : (
                    <UserMessage key={i}>{msg.text}</UserMessage>
                  )
                )}
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
    </HelpChatContext.Provider>
  );
}

export function HelpChatFab() {
  const { open, hiddenForBallGame, toggle } = useHelpChat();
  if (hiddenForBallGame) {
    return null;
  }
  return (
    <HelpFab onClick={toggle}>
      {open ? '✕' : '?'}
    </HelpFab>
  );
}

export function HelpChatHeaderButton({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const t = useTranslations(texts);
  const { hiddenForBallGame, toggle } = useHelpChat();
  const Btn = tone === 'light' ? HelpHeaderIconButtonLight : HelpHeaderIconButton;
  if (hiddenForBallGame) {
    return null;
  }
  return (
    <Btn type="button" onClick={toggle} aria-label={t.helpAria} title={t.helpAria}>
      ?
    </Btn>
  );
}
