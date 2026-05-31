/**
 * AI Report Assistant — floating chat in the admin per-activity statistics view.
 *
 * - FAB anchored bottom-end, opens a chat panel mirroring HelpChat UX.
 * - Bot asks if a report is missing; user types their request.
 * - Server classifier first matches built-in exports (Executive / Participants /
 *   Scores / Progress / Funnel / Items / Groups). If matched, the chat surfaces
 *   "Open report" — which either triggers the existing Excel download or
 *   switches the activity sub-tab.
 * - If not matched, Gemini generates a custom report (markdown + optional table)
 *   from the activity's full data context. The user can download it as XLSX/CSV.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang, useTranslations } from '../../context/LanguageContext';
import { adminApiFetch } from '../../utils/adminApi';
import { downloadExport, type AnalyticsExportType } from '../../hooks/useAnalytics';
import type { ActivitySubTab } from '../../pages/admin/AdminStatisticsTab/types';
import { texts } from './AdminReportChat.i18n';
import { renderMarkdown } from './markdown';
import {
  AiFab,
  ChatBackdrop,
  ChatPanel,
  ChatHeader,
  ChatHeaderTitle,
  HeaderBadge,
  ChatCloseButton,
  ChatBody,
  BotMessage,
  UserMessage,
  ChipRow,
  Chip,
  ActionRow,
  ActionButton,
  InputArea,
  ChatInput,
  SendButton,
  TypingDots,
  Footnote,
} from './styled';

// ─── Types ───

interface ExistingReportResp {
  kind: 'existing';
  reportType: string;
  reportKind: 'export' | 'view';
  label: string;
  description: string;
  suggestion: string;
}

interface CustomReportResp {
  kind: 'custom';
  summary: string;
  table?: {
    title: string;
    columns: string[];
    rows: (string | number)[][];
  } | null;
  activityName: string;
}

type ChatMsg =
  | { from: 'user'; text: string }
  | { from: 'bot'; text: string }
  | { from: 'bot-existing'; existing: ExistingReportResp }
  | { from: 'bot-custom'; custom: CustomReportResp };

interface Props {
  activityId: string;
  /** Optional: caller can switch sub-tab when user clicks "open" on a view-type report. */
  onSwitchSubTab?: (tab: ActivitySubTab) => void;
}

// ─── Component ───

export default function AdminReportChat({ activityId, onSwitchSubTab }: Props) {
  const t = useTranslations(texts);
  const { lang } = useLang();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [thinking, setThinking] = useState(false);
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);

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

  const sendQuery = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Build history from current messages (text-only entries)
    const history = messages.flatMap((m): { from: 'user' | 'bot'; text: string }[] => {
      if (m.from === 'user') return [{ from: 'user', text: m.text }];
      if (m.from === 'bot') return [{ from: 'bot', text: m.text }];
      if (m.from === 'bot-existing') return [{ from: 'bot', text: m.existing.suggestion }];
      if (m.from === 'bot-custom') return [{ from: 'bot', text: m.custom.summary }];
      return [];
    });

    setMessages((prev) => [...prev, { from: 'user', text: trimmed }]);
    setInputValue('');
    setThinking(true);

    try {
      const data = await adminApiFetch<ExistingReportResp | CustomReportResp>(
        '/api/admin/report-assistant/chat',
        {
          method: 'POST',
          body: JSON.stringify({ activityId, message: trimmed, history, lang }),
        },
      );

      setThinking(false);
      if (data.kind === 'existing') {
        setMessages((prev) => [...prev, { from: 'bot-existing', existing: data }]);
      } else {
        setMessages((prev) => [...prev, { from: 'bot-custom', custom: data }]);
      }
    } catch (err) {
      setThinking(false);
      const msg = err instanceof Error && err.message.includes('Too many')
        ? t.errorRate
        : t.errorGeneral;
      setMessages((prev) => [...prev, { from: 'bot', text: msg }]);
    }
  }, [activityId, lang, messages, t.errorGeneral, t.errorRate]);

  const handleSuggestion = (type: AnalyticsExportType, label: string) => {
    sendQuery(label);
    void type;
  };

  const handleOpenExisting = async (existing: ExistingReportResp) => {
    if (existing.reportKind === 'export') {
      try {
        await downloadExport(activityId, existing.reportType as AnalyticsExportType);
      } catch {
        setMessages((prev) => [...prev, { from: 'bot', text: t.errorGeneral }]);
      }
    } else if (onSwitchSubTab) {
      // Map analytics view key → sub-tab key
      const map: Record<string, ActivitySubTab | undefined> = {
        funnel: 'funnel',
        items: 'items',
        groups: 'groups',
      };
      const tab = map[existing.reportType];
      if (tab) {
        onSwitchSubTab(tab);
        setOpen(false);
      }
    }
  };

  const handleDownloadCustom = async (custom: CustomReportResp, idx: number, format: 'xlsx' | 'csv') => {
    setDownloadingIdx(idx);
    try {
      const token = localStorage.getItem('yooz_admin_token');
      const res = await fetch('/api/admin/report-assistant/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          activityId,
          title: custom.table?.title || custom.activityName,
          summary: custom.summary,
          table: custom.table,
          format,
        }),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      const utf8Match = disposition.match(/filename\*=UTF-8''(.+?)(?:;|$)/);
      const plainMatch = disposition.match(/filename="?([^";]+)"?/);
      const filename = utf8Match
        ? decodeURIComponent(utf8Match[1])
        : plainMatch ? plainMatch[1] : `report.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setMessages((prev) => [...prev, { from: 'bot', text: t.errorGeneral }]);
    } finally {
      setDownloadingIdx(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendQuery(inputValue);
    }
  };

  const suggestions: { type: AnalyticsExportType; label: string }[] = [
    { type: 'executive', label: t.suggestExecutive },
    { type: 'participants', label: t.suggestParticipants },
    { type: 'scores', label: t.suggestScores },
    { type: 'progress', label: t.suggestProgress },
  ];

  const showSuggestions = messages.length === 0;

  return (
    <>
      <AiFab onClick={toggle} aria-label={t.fabAria} title={t.fabAria}>
        {open ? '✕' : 'AI'}
      </AiFab>

      {open && <ChatBackdrop onClick={toggle} />}
      {open && (
        <ChatPanel>
          <ChatHeader>
            <ChatHeaderTitle>
              {t.headerTitle}
              <HeaderBadge>{t.headerBadge}</HeaderBadge>
            </ChatHeaderTitle>
            <ChatCloseButton onClick={toggle} aria-label={t.closeAria}>&times;</ChatCloseButton>
          </ChatHeader>

          <ChatBody ref={bodyRef}>
            <BotMessage>{t.greeting}</BotMessage>

            {messages.map((m, i) => {
              if (m.from === 'user') {
                return <UserMessage key={i}>{m.text}</UserMessage>;
              }
              if (m.from === 'bot') {
                return <BotMessage key={i}>{m.text}</BotMessage>;
              }
              if (m.from === 'bot-existing') {
                return (
                  <BotMessage key={i}>
                    <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.existing.suggestion) }} />
                    <ActionRow>
                      <ActionButton onClick={() => handleOpenExisting(m.existing)}>
                        {t.openReport} →
                      </ActionButton>
                    </ActionRow>
                  </BotMessage>
                );
              }
              if (m.from === 'bot-custom') {
                return (
                  <BotMessage key={i}>
                    <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.custom.summary) }} />
                    {m.custom.table && (
                      <ActionRow>
                        <ActionButton
                          onClick={() => handleDownloadCustom(m.custom, i, 'xlsx')}
                          disabled={downloadingIdx === i}
                        >
                          {downloadingIdx === i ? t.downloading : `⬇ ${t.downloadXlsx}`}
                        </ActionButton>
                        <ActionButton
                          $variant="secondary"
                          onClick={() => handleDownloadCustom(m.custom, i, 'csv')}
                          disabled={downloadingIdx === i}
                        >
                          {t.downloadCsv}
                        </ActionButton>
                      </ActionRow>
                    )}
                  </BotMessage>
                );
              }
              return null;
            })}

            {thinking && (
              <TypingDots>
                <span />
                <span />
                <span />
              </TypingDots>
            )}

            {showSuggestions && (
              <>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{t.suggestionHint}</div>
                <ChipRow style={{ padding: 0 }}>
                  {suggestions.map((s) => (
                    <Chip key={s.type} onClick={() => handleSuggestion(s.type, s.label)}>
                      {s.label}
                    </Chip>
                  ))}
                </ChipRow>
              </>
            )}
          </ChatBody>

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
              onClick={() => sendQuery(inputValue)}
              disabled={!inputValue.trim() || thinking}
              aria-label={t.sendAria}
            >
              ➤
            </SendButton>
          </InputArea>

          <Footnote>{t.footnote}</Footnote>
        </ChatPanel>
      )}
    </>
  );
}
