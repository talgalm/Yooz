/**
 * DumbDumbBot — floating chatbot on all admin pages.
 * FAB fixed to the physical right side; opens a chat panel for how-to questions.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useLang, useTranslations } from '../../context/LanguageContext';
import { adminApiFetch, adminUploadFile } from '../../utils/adminApi';
import DevTasksPanel from './DevTasksPanel';
import {
  texts,
  isDevCommand,
  isDevTasksTrigger,
  parseDevTaskType,
} from './AdminHelpChat.i18n';
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
  TypeChip,
  InputArea,
  ChatInput,
  SendButton,
  TypingDots,
  Footnote,
  DevTaskUploadRow,
  DevUploadBtn,
  DevAttachedFile,
  DevRemoveDocBtn,
  DevHiddenFileInput,
} from './styled';

interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
}

interface ChatResponse {
  response: string;
}

type ChatMode = 'normal' | 'dev_task_type' | 'dev_task_write';
type DevTaskType = 'feature' | 'bug' | 'change';

interface PendingDocument {
  url: string;
  name: string;
}

const DEV_ROLES = ['admin', 'super_admin'] as const;
const DEV_DOC_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp,.gif';

export default function AdminHelpChat() {
  const t = useTranslations(texts);
  const { lang } = useLang();
  const { admin } = useAdminAuth();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [thinking, setThinking] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('normal');
  const [pendingDevType, setPendingDevType] = useState<DevTaskType | null>(null);
  const [pendingDocument, setPendingDocument] = useState<PendingDocument | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [devPanelOpen, setDevPanelOpen] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDeveloper = admin?.role && DEV_ROLES.includes(admin.role as (typeof DEV_ROLES)[number]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, thinking, pendingDocument]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open, chatMode]);

  const resetDevFlow = useCallback(() => {
    setChatMode('normal');
    setPendingDevType(null);
    setPendingDocument(null);
    setUploadingDoc(false);
  }, []);

  const toggle = useCallback(() => {
    setOpen((was) => {
      if (was) {
        setMessages([]);
        setInputValue('');
        setThinking(false);
        resetDevFlow();
        setDevPanelOpen(false);
      }
      return !was;
    });
  }, [resetDevFlow]);

  const startDevTaskFlow = useCallback(() => {
    setChatMode('dev_task_type');
    setMessages((prev) => [...prev, { from: 'bot', text: t.devTasksPickType }]);
  }, [t.devTasksPickType]);

  const selectDevTaskType = useCallback(
    (type: DevTaskType, label: string) => {
      setPendingDevType(type);
      setChatMode('dev_task_write');
      setMessages((prev) => [
        ...prev,
        { from: 'user', text: label },
        { from: 'bot', text: t.devTasksDescribe },
      ]);
    },
    [t.devTasksDescribe],
  );

  const submitDevTask = useCallback(
    async (description: string) => {
      if (!pendingDevType) return;
      if (!description.trim() && !pendingDocument) return;

      setThinking(true);
      try {
        await adminApiFetch('/api/admin/dev-tasks', {
          method: 'POST',
          body: JSON.stringify({
            type: pendingDevType,
            description: description.trim(),
            route: location.pathname,
            createdByName: admin?.name,
            documentUrl: pendingDocument?.url,
            documentName: pendingDocument?.name,
          }),
        });
        setMessages((prev) => [...prev, { from: 'bot', text: t.devTasksSubmitted }]);
      } catch {
        setMessages((prev) => [...prev, { from: 'bot', text: t.devTasksSubmitError }]);
      } finally {
        setThinking(false);
        resetDevFlow();
      }
    },
    [
      admin?.name,
      location.pathname,
      pendingDevType,
      pendingDocument,
      resetDevFlow,
      t.devTasksSubmitError,
      t.devTasksSubmitted,
    ],
  );

  const openDevPanel = useCallback(() => {
    if (!isDeveloper) {
      setMessages((prev) => [...prev, { from: 'bot', text: t.devPanelNoAccess }]);
      return;
    }
    setMessages((prev) => [...prev, { from: 'bot', text: t.devPanelOpened }]);
    setDevPanelOpen(true);
  }, [isDeveloper, t.devPanelNoAccess, t.devPanelOpened]);

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const result = await adminUploadFile(file);
      setPendingDocument({
        url: result.url,
        name: result.fileName || file.name,
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          from: 'bot',
          text: err instanceof Error ? err.message : t.devTasksSubmitError,
        },
      ]);
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const sendQuery = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (thinking) return;

      if (isDevCommand(trimmed)) {
        setMessages((prev) => [...prev, { from: 'user', text: trimmed }]);
        setInputValue('');
        openDevPanel();
        return;
      }

      if (chatMode === 'normal' && isDevTasksTrigger(trimmed)) {
        setMessages((prev) => [...prev, { from: 'user', text: trimmed }]);
        setInputValue('');
        startDevTaskFlow();
        return;
      }

      if (chatMode === 'dev_task_type') {
        if (!trimmed) return;
        const type = parseDevTaskType(trimmed);
        if (!type) return;
        setInputValue('');
        const label =
          type === 'feature' ? t.devTypeFeature : type === 'bug' ? t.devTypeBug : t.devTypeChange;
        selectDevTaskType(type, label);
        return;
      }

      if (chatMode === 'dev_task_write') {
        if (!trimmed && !pendingDocument) return;
        if (trimmed) {
          setMessages((prev) => [...prev, { from: 'user', text: trimmed }]);
        } else if (pendingDocument) {
          setMessages((prev) => [
            ...prev,
            { from: 'user', text: `📎 ${pendingDocument.name}` },
          ]);
        }
        setInputValue('');
        await submitDevTask(trimmed);
        return;
      }

      if (!trimmed) return;

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
    [
      chatMode,
      lang,
      location.pathname,
      messages,
      openDevPanel,
      pendingDocument,
      selectDevTaskType,
      startDevTaskFlow,
      submitDevTask,
      t.devTypeBug,
      t.devTypeChange,
      t.devTypeFeature,
      t.devTasksSubmitError,
      t.errorGeneral,
      t.errorRate,
      thinking,
    ],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void sendQuery(inputValue);
    }
  };

  const greetingChips = [
    t.chipCreateActivity,
    t.chipAddGame,
    t.chipStatistics,
    t.chipExport,
    t.chipPortal,
    t.chipDevTasks,
  ];

  const showGreeting = messages.length === 0;
  const showGreetingChips = showGreeting && chatMode === 'normal';
  const showTypeChips = chatMode === 'dev_task_type';
  const showDocUpload = chatMode === 'dev_task_write';

  const inputPlaceholder =
    chatMode === 'dev_task_write' ? t.inputPlaceholderDevTask : t.inputPlaceholder;

  const canSendDevTask =
    chatMode === 'dev_task_write' && (inputValue.trim().length > 0 || Boolean(pendingDocument));

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

          {showGreetingChips && (
            <ChipRow>
              {greetingChips.map((label) => (
                <Chip key={label} type="button" onClick={() => void sendQuery(label)}>
                  {label}
                </Chip>
              ))}
            </ChipRow>
          )}

          {showTypeChips && (
            <ChipRow>
              <TypeChip type="button" $variant="feature" onClick={() => selectDevTaskType('feature', t.devTypeFeature)}>
                {t.devTypeFeature}
              </TypeChip>
              <TypeChip type="button" $variant="bug" onClick={() => selectDevTaskType('bug', t.devTypeBug)}>
                {t.devTypeBug}
              </TypeChip>
              <TypeChip type="button" $variant="change" onClick={() => selectDevTaskType('change', t.devTypeChange)}>
                {t.devTypeChange}
              </TypeChip>
            </ChipRow>
          )}

          {showDocUpload && (
            <DevTaskUploadRow>
              <DevHiddenFileInput
                ref={fileInputRef}
                type="file"
                accept={DEV_DOC_ACCEPT}
                onChange={(e) => void handleDocUpload(e)}
              />
              <DevUploadBtn
                type="button"
                disabled={uploadingDoc || thinking}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingDoc ? t.devUploading : `📎 ${t.devUploadDoc}`}
              </DevUploadBtn>
              {pendingDocument && (
                <DevAttachedFile title={pendingDocument.name}>
                  {pendingDocument.name}
                  <DevRemoveDocBtn
                    type="button"
                    aria-label={t.devRemoveDoc}
                    onClick={() => setPendingDocument(null)}
                  >
                    ×
                  </DevRemoveDocBtn>
                </DevAttachedFile>
              )}
            </DevTaskUploadRow>
          )}

          <InputArea>
            <ChatInput
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={inputPlaceholder}
              disabled={thinking || uploadingDoc}
            />
            <SendButton
              type="button"
              onClick={() => void sendQuery(inputValue)}
              disabled={
                thinking ||
                uploadingDoc ||
                (chatMode === 'dev_task_write' ? !canSendDevTask : !inputValue.trim())
              }
              aria-label="Send"
            >
              ↑
            </SendButton>
          </InputArea>

          <Footnote>{t.footnote}</Footnote>
        </ChatPanel>
      )}

      <DevTasksPanel open={devPanelOpen} onClose={() => setDevPanelOpen(false)} />
    </>
  );
}
