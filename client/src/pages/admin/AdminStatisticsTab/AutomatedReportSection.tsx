import { useEffect, useState, type KeyboardEvent } from 'react';
import { useTranslations } from '../../../context/LanguageContext';
import { texts, reportTypePreview } from './AdminStatisticsTab.i18n';
import {
  useScheduledReport,
  saveScheduledReport,
  sendScheduledReportNow,
  type ScheduledReportSettings,
} from '../../../hooks/useAnalytics';
import {
  PassGradeCard,
  PassGradeTitleRow,
  PassGradeTitle,
  PassGradeDescription,
  RosterCheckbox,
  ReportForm,
  ReportField,
  ReportFieldLabel,
  ReportSelect,
  ReportPreviewCard,
  ReportPreviewTitle,
  ReportPreviewHint,
  ReportPreviewSections,
  ReportPreviewSheetName,
  ReportPreviewTableWrap,
  ReportPreviewTable,
  ReportFrequencyGroup,
  ReportFrequencyButton,
  ChipsInput,
  Chip,
  ChipRemove,
  ChipsFieldInput,
  ShareRow,
  ActionButton,
} from './styled';
import type { ActivityPeriod } from './types';

interface Props {
  activityId: string | null;
  period?: ActivityPeriod;
}

type ReportType = 'executive' | 'participants' | 'scores' | 'progress';
type Frequency = 'daily' | 'weekly';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type SendState = 'idle' | 'sending' | 'sent' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hourToTimeString(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function timeStringToHour(value: string): number {
  const hour = Number(value.split(':')[0]);
  return Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : 8;
}

export default function AutomatedReportSection({ activityId }: Props) {
  const t = useTranslations(texts);
  const { data: loaded, loading } = useScheduledReport(activityId);

  const [enabled, setEnabled] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('executive');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientDraft, setRecipientDraft] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [scheduleHour, setScheduleHour] = useState('08:00');
  const [skipIfUnchanged, setSkipIfUnchanged] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sendState, setSendState] = useState<SendState>('idle');
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) return;
    setEnabled(loaded.enabled);
    setReportType(loaded.reportType);
    setRecipients(loaded.recipients);
    setFrequency(loaded.frequency);
    setDayOfWeek(loaded.dayOfWeek ?? 0);
    setScheduleHour(hourToTimeString(loaded.scheduleHour));
    setSkipIfUnchanged(loaded.skipIfUnchanged);
  }, [loaded]);

  const initialLoading = loading && !loaded;

  const reportTypeOptions: { value: ReportType; label: string }[] = [
    { value: 'executive', label: t.reportTypeExecutive },
    { value: 'participants', label: t.reportTypeParticipants },
    { value: 'scores', label: t.reportTypeScores },
    { value: 'progress', label: t.reportTypeProgress },
  ];

  const dayLabels = [
    t.daySunday,
    t.dayMonday,
    t.dayTuesday,
    t.dayWednesday,
    t.dayThursday,
    t.dayFriday,
    t.daySaturday,
  ];

  const hourOptions = Array.from({ length: 24 }, (_, hour) => hourToTimeString(hour));

  const addRecipient = (raw: string) => {
    const value = raw.trim().replace(/,$/, '');
    setRecipientDraft('');
    if (!value || !EMAIL_RE.test(value) || recipients.includes(value)) return;
    setRecipients((prev) => [...prev, value]);
  };

  const removeRecipient = (value: string) => {
    setRecipients((prev) => prev.filter((r) => r !== value));
  };

  const handleRecipientKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient(recipientDraft);
    } else if (e.key === 'Backspace' && !recipientDraft && recipients.length > 0) {
      removeRecipient(recipients[recipients.length - 1]);
    }
  };

  const handleSave = async () => {
    if (!activityId) return;
    if (frequency === 'weekly' && (dayOfWeek < 0 || dayOfWeek > 6)) {
      setSaveState('error');
      setSaveError(t.automatedReportsDayRequired);
      return;
    }
    if (enabled && recipients.length === 0) {
      setSaveState('error');
      setSaveError(t.automatedReportsRecipientsRequired);
      return;
    }

    const settings: ScheduledReportSettings = {
      enabled,
      reportType,
      recipients,
      frequency,
      dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
      scheduleHour: timeStringToHour(scheduleHour),
      skipIfUnchanged,
    };

    setSaveState('saving');
    setSaveError(null);
    try {
      await saveScheduledReport(activityId, settings);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      setSaveState('error');
      setSaveError(err instanceof Error ? err.message : t.automatedReportsSaveFailed);
    }
  };

  const handleSendNow = async () => {
    if (!activityId) return;
    setSendState('sending');
    setSendError(null);
    try {
      await sendScheduledReportNow(activityId);
      setSendState('sent');
      setTimeout(() => setSendState('idle'), 2000);
    } catch (err) {
      setSendState('error');
      setSendError(err instanceof Error ? err.message : t.automatedReportsSendFailed);
    }
  };

  return (
    <PassGradeCard>
      {initialLoading ? (
        <PassGradeDescription>{t.automatedReportsLoading}</PassGradeDescription>
      ) : (
        <>
          <PassGradeTitleRow>
            <PassGradeTitle>{t.automatedReportsEnable}</PassGradeTitle>
            <RosterCheckbox
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              aria-label={t.automatedReportsEnable}
            />
          </PassGradeTitleRow>

          {enabled && (
            <ReportForm>
              <ReportField>
                <ReportFieldLabel htmlFor="automated-report-type">{t.reportTypeLabel}</ReportFieldLabel>
                <ReportSelect
                  id="automated-report-type"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                >
                  {reportTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </ReportSelect>
              </ReportField>

              <ActionButton type="button" onClick={() => setPreviewOpen((prev) => !prev)}>
                {previewOpen ? t.reportPreviewHideButton : t.reportPreviewShowButton}
              </ActionButton>

              {previewOpen && (
                <ReportPreviewCard>
                  <ReportPreviewTitle>{t.reportPreviewTitle}</ReportPreviewTitle>
                  <ReportPreviewSections>
                    {reportTypePreview[reportType].map((section) => (
                      <div key={section.sheetName}>
                        <ReportPreviewSheetName>{section.sheetName}</ReportPreviewSheetName>
                        <ReportPreviewTableWrap>
                          <ReportPreviewTable>
                            <thead>
                              <tr>
                                {section.columns.map((col) => (
                                  <th key={col}>{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {section.rows.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                  {row.map((cell, cellIndex) => (
                                    <td key={cellIndex}>{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </ReportPreviewTable>
                        </ReportPreviewTableWrap>
                      </div>
                    ))}
                  </ReportPreviewSections>
                  <ReportPreviewHint>{t.reportPreviewHint}</ReportPreviewHint>
                </ReportPreviewCard>
              )}

              <ReportField>
                <ReportFieldLabel>{t.recipientsLabel}</ReportFieldLabel>
                <ChipsInput>
                  {recipients.map((email) => (
                    <Chip key={email}>
                      {email}
                      <ChipRemove type="button" onClick={() => removeRecipient(email)} aria-label={t.removeRecipient}>
                        ×
                      </ChipRemove>
                    </Chip>
                  ))}
                  <ChipsFieldInput
                    type="email"
                    value={recipientDraft}
                    onChange={(e) => setRecipientDraft(e.target.value)}
                    onKeyDown={handleRecipientKeyDown}
                    onBlur={() => addRecipient(recipientDraft)}
                    placeholder={recipients.length === 0 ? t.recipientsPlaceholder : t.recipientsPlaceholderMore}
                  />
                </ChipsInput>
              </ReportField>

              <ReportField>
                <ReportFieldLabel>{t.frequencyLabel}</ReportFieldLabel>
                <ReportFrequencyGroup>
                  <ReportFrequencyButton
                    type="button"
                    active={frequency === 'daily'}
                    onClick={() => setFrequency('daily')}
                  >
                    {t.frequencyDaily}
                  </ReportFrequencyButton>
                  <ReportFrequencyButton
                    type="button"
                    active={frequency === 'weekly'}
                    onClick={() => setFrequency('weekly')}
                  >
                    {t.frequencyWeekly}
                  </ReportFrequencyButton>
                </ReportFrequencyGroup>
              </ReportField>

              {frequency === 'weekly' && (
                <ReportField>
                  <ReportFieldLabel htmlFor="automated-report-day">{t.dayOfWeekLabel}</ReportFieldLabel>
                  <ReportSelect
                    id="automated-report-day"
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  >
                    {dayLabels.map((label, index) => (
                      <option key={index} value={index}>
                        {label}
                      </option>
                    ))}
                  </ReportSelect>
                </ReportField>
              )}

              <ReportField>
                <ReportFieldLabel htmlFor="automated-report-hour">{t.scheduleHourLabel}</ReportFieldLabel>
                <ReportSelect
                  id="automated-report-hour"
                  value={scheduleHour}
                  onChange={(e) => setScheduleHour(e.target.value)}
                >
                  {hourOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </ReportSelect>
              </ReportField>

              <PassGradeTitleRow>
                <div>
                  <PassGradeTitle style={{ fontSize: 14 }}>{t.skipIfUnchangedLabel}</PassGradeTitle>
                  <PassGradeDescription>{t.skipIfUnchangedHint}</PassGradeDescription>
                </div>
                <RosterCheckbox
                  type="checkbox"
                  checked={skipIfUnchanged}
                  onChange={(e) => setSkipIfUnchanged(e.target.checked)}
                  aria-label={t.skipIfUnchangedLabel}
                />
              </PassGradeTitleRow>

              <ShareRow>
                <ActionButton
                  type="button"
                  disabled={!activityId || sendState === 'sending'}
                  onClick={handleSendNow}
                >
                  {sendState === 'sending' ? t.automatedReportsSending : t.automatedReportsSendNow}
                </ActionButton>
                {sendState === 'sent' && (
                  <span style={{ color: '#2e9e5b', fontWeight: 700, fontSize: 13 }}>{t.automatedReportsSent}</span>
                )}
                {sendState === 'error' && (
                  <span style={{ color: '#e74c3c', fontWeight: 700, fontSize: 13 }}>
                    {sendError || t.automatedReportsSendFailed}
                  </span>
                )}
              </ShareRow>
            </ReportForm>
          )}

          <ShareRow>
            <ActionButton
              type="button"
              variant="primary"
              disabled={!activityId || saveState === 'saving'}
              onClick={handleSave}
            >
              {saveState === 'saving' ? t.automatedReportsSaving : t.automatedReportsSave}
            </ActionButton>
            {saveState === 'saved' && (
              <span style={{ color: '#2e9e5b', fontWeight: 700, fontSize: 13 }}>{t.automatedReportsSaved}</span>
            )}
            {saveState === 'error' && (
              <span style={{ color: '#e74c3c', fontWeight: 700, fontSize: 13 }}>
                {saveError || t.automatedReportsSaveFailed}
              </span>
            )}
          </ShareRow>
        </>
      )}
    </PassGradeCard>
  );
}
