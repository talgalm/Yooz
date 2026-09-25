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
import { useParams } from 'react-router-dom';
import { useTranslations, useLang } from '../../context/LanguageContext';
import { texts, type OrganizerContact } from './HelpChat.i18n';
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
  InputArea,
  ChatInput,
  SendButton,
  TypingDots,
  BackButton,
  HelpHeaderIconButton,
  HelpHeaderIconButtonLight,
  HelpHeaderIconButtonPuzzle,
  NudgeWrap,
  NudgeBubble,
} from './styled';


interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
}

export interface HelpActivityContext {
  activityName?: string;
  phase?: string;
  itemIndex?: number;
  totalItems?: number;
  itemName?: string;
  itemType?: string;
}

let helpActivityContext: HelpActivityContext | null = null;
export function setHelpChatActivityContext(ctx: HelpActivityContext | null): void {
  helpActivityContext = ctx;
}

function resolveResponse(entry: string | ((contact?: OrganizerContact) => string), contact?: OrganizerContact): string {
  return typeof entry === 'function' ? entry(contact) : entry;
}

type View = 'menu' | 'faq' | 'other';

export type HelpChatVariant = 'fab' | 'header';

interface HelpChatContextValue {
  variant: HelpChatVariant;
  open: boolean;
  hiddenForBallGame: boolean;
  toggle: () => void;
  nudgeActive: boolean;
  nudge: (ms?: number) => void;
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
  hideLogin?: boolean;
  children: ReactNode;
}

export function HelpChatProvider({ variant, hideLogin = false, children }: HelpChatProviderProps) {
  const t = useTranslations(texts);
  const { lang } = useLang();
  const { code } = useParams<{ code?: string }>();

  const [open, setOpen] = useState(false);
  const [hiddenForBallGame, setHiddenForBallGame] = useState(
    () => document.body.classList.contains('yooz-ballgame-active')
  );
  const [view, setView] = useState<View>('menu');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [typing, setTyping] = useState(false);
  const [organizerContact, setOrganizerContact] = useState<OrganizerContact | undefined>(undefined);
  const [disabledCategories, setDisabledCategories] = useState<string[]>([]);
  const [otherCategoryEnabled, setOtherCategoryEnabled] = useState(false);
  const [categoryResponses, setCategoryResponses] = useState<Record<string, string>>({});

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    fetch(`/api/activities/${encodeURIComponent(code)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.organizerContactName && data.organizerContactPhone) {
          setOrganizerContact({ name: data.organizerContactName, phone: data.organizerContactPhone });
        }
        if (Array.isArray(data.helpCategoriesDisabled)) {
          setDisabledCategories(data.helpCategoriesDisabled);
        }
        if (data.helpCategoryResponses && typeof data.helpCategoryResponses === 'object') {
          setCategoryResponses(data.helpCategoryResponses);
        }
        if (data.helpOtherCategoryEnabled === true) {
          setOtherCategoryEnabled(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, typing]);

  useEffect(() => {
    if ((view === 'other' || view === 'faq') && inputRef.current) {
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

  const [nudgeActive, setNudgeActive] = useState(false);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nudge = useCallback((ms = 3000) => {
    setNudgeActive(true);
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => setNudgeActive(false), ms);
  }, []);
  useEffect(() => () => {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
  }, []);
  useEffect(() => {
    if (open) setNudgeActive(false);
  }, [open]);

  type FaqKey =
    | 'responseFaq1'
    | 'responseFaq2'
    | 'responseFaq3'
    | 'responseFaq4'
    | 'responseKickedOut'
    | 'responseButtonStuck'
    | 'responseTaskStuck'
    | 'responseVideoMissing';

  const FAQ_KEY_TO_CATEGORY: Record<FaqKey, string> = {
    responseFaq1: 'login',
    responseFaq2: 'game_start',
    responseFaq3: 'score',
    responseFaq4: 'loading',
    responseKickedOut: 'kicked_out',
    responseButtonStuck: 'button_stuck',
    responseTaskStuck: 'task_stuck',
    responseVideoMissing: 'video_missing',
  };

  const handleFaqClick = (faqKey: FaqKey, label: string) => {
    setView('faq');
    setMessages([{ from: 'user', text: label }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const override = categoryResponses[FAQ_KEY_TO_CATEGORY[faqKey]];
      const text = override?.trim() || resolveResponse(t[faqKey], organizerContact);
      setMessages((prev) => [...prev, { from: 'bot', text }]);
    }, 600);
  };

  const handleOtherClick = () => {
    setView('other');
    setMessages([{ from: 'bot', text: t.greeting }]);
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;

    const continuePromptText = t.continuePrompt;
    const history = messages.filter((m) => m.text !== continuePromptText);

    setMessages((prev) => [...prev, { from: 'user', text }]);
    setInputValue('');
    setTyping(true);

    try {
      const res = await fetch('/api/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          lang,
          history,
          context: (helpActivityContext || code) ? { ...helpActivityContext, code } : undefined,
        }),
      });

      if (!res.ok) throw new Error('Server error');

      const data = await res.json();
      setTyping(false);
      setMessages((prev) => [...prev, { from: 'bot', text: data.response }]);
    } catch {
      const match = matchTopic(text);
      setTyping(false);

      if (match) {
        const entry = t[match.responseKey as keyof typeof t] || t.responseGeneral;
        setMessages((prev) => [...prev, { from: 'bot', text: resolveResponse(entry, organizerContact) }]);
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
      nudgeActive,
      nudge,
    }),
    [variant, open, hiddenForBallGame, handleToggle, nudgeActive, nudge]
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
                  {!disabledCategories.includes('game_start') && (
                    <OptionButton onClick={() => handleFaqClick('responseFaq2', t.faq2Label)}>
                      <OptionIcon>🎮</OptionIcon>
                      {t.faq2Label}
                    </OptionButton>
                  )}
                  {!hideLogin && !disabledCategories.includes('login') && (
                    <OptionButton onClick={() => handleFaqClick('responseFaq1', t.faq1Label)}>
                      <OptionIcon>🔑</OptionIcon>
                      {t.faq1Label}
                    </OptionButton>
                  )}
                  {!disabledCategories.includes('score') && (
                    <OptionButton onClick={() => handleFaqClick('responseFaq3', t.faq3Label)}>
                      <OptionIcon>📊</OptionIcon>
                      {t.faq3Label}
                    </OptionButton>
                  )}
                  {!disabledCategories.includes('loading') && (
                    <OptionButton onClick={() => handleFaqClick('responseFaq4', t.faq4Label)}>
                      <OptionIcon>🔄</OptionIcon>
                      {t.faq4Label}
                    </OptionButton>
                  )}
                  {!disabledCategories.includes('kicked_out') && (
                    <OptionButton onClick={() => handleFaqClick('responseKickedOut', t.kickedOutLabel)}>
                      <OptionIcon>🚪</OptionIcon>
                      {t.kickedOutLabel}
                    </OptionButton>
                  )}
                  {!disabledCategories.includes('button_stuck') && (
                    <OptionButton onClick={() => handleFaqClick('responseButtonStuck', t.buttonStuckLabel)}>
                      <OptionIcon>👆</OptionIcon>
                      {t.buttonStuckLabel}
                    </OptionButton>
                  )}
                  {!disabledCategories.includes('task_stuck') && (
                    <OptionButton onClick={() => handleFaqClick('responseTaskStuck', t.taskStuckLabel)}>
                      <OptionIcon>🧩</OptionIcon>
                      {t.taskStuckLabel}
                    </OptionButton>
                  )}
                  {!disabledCategories.includes('video_missing') && (
                    <OptionButton onClick={() => handleFaqClick('responseVideoMissing', t.videoMissingLabel)}>
                      <OptionIcon>🎬</OptionIcon>
                      {t.videoMissingLabel}
                    </OptionButton>
                  )}
                  {otherCategoryEnabled && (
                    <OptionButton onClick={handleOtherClick}>
                      <OptionIcon>✏️</OptionIcon>
                      {t.otherLabel}
                    </OptionButton>
                  )}
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

export function HelpChatHeaderButton({ tone = 'dark', iconColor }: { tone?: 'dark' | 'light' | 'puzzle'; iconColor?: string }) {
  const t = useTranslations(texts);
  const { toggle, nudgeActive } = useHelpChat();
  const Btn = tone === 'light' ? HelpHeaderIconButtonLight : tone === 'puzzle' ? HelpHeaderIconButtonPuzzle : HelpHeaderIconButton;
  return (
    <NudgeWrap active={nudgeActive}>
      <Btn type="button" onClick={toggle} aria-label={t.helpAria} title={t.helpAria} iconColor={iconColor}>
        ?
      </Btn>
      {nudgeActive && <NudgeBubble>{t.nudgeText}</NudgeBubble>}
    </NudgeWrap>
  );
}
