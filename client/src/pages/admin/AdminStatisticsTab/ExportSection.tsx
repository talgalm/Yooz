import { useEffect, useState } from 'react';
import { useTranslations } from '../../../context/LanguageContext';
import {
  downloadExport,
  usePassThreshold,
  savePassThreshold,
  useShareLink,
  createShareLink,
  revokeShareLink,
  type AnalyticsExportType,
} from '../../../hooks/useAnalytics';
import { texts } from './AdminStatisticsTab.i18n';
import { useAnalyticsSource } from './analyticsSource';
import {
  ExportGrid,
  ExportCard,
  ExportIcon,
  ExportLabel,
  ExportDescription,
  PassGradeCard,
  PassGradeTitleRow,
  PassGradeTitle,
  PassGradeDescription,
  PassGradeControlRow,
  PassGradeInput,
  PassGradePreset,
  ShareRow,
  ShareUrlInput,
} from './styled';
import type { ActivityPeriod } from './types';

interface Props {
  activityId: string | null;
  period?: ActivityPeriod;
}

const QUICK_GRADES = [50, 55, 60];

function clampGrade(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function ExportSection({ activityId, period }: Props) {
  const t = useTranslations(texts);
  const { base, shared } = useAnalyticsSource();
  const [downloading, setDownloading] = useState<AnalyticsExportType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pass grade and share link are admin-only — skip the fetches in shared mode.
  const { data: loadedThreshold } = usePassThreshold(shared ? null : activityId);
  // null = no pass grade (pass/fail disabled).
  const [threshold, setThreshold] = useState<number | null>(70);

  useEffect(() => {
    if (loadedThreshold !== undefined) setThreshold(loadedThreshold);
  }, [loadedThreshold]);

  // Persist silently — no on-screen "saving" status.
  const commitThreshold = (value: number | null) => {
    if (!activityId) return;
    const next = value === null ? null : clampGrade(value);
    setThreshold(next);
    savePassThreshold(activityId, next).catch(() => {});
  };

  // ── Share link state (admin only) ──
  const { data: loadedShareToken } = useShareLink(shared ? null : activityId);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (loadedShareToken !== undefined) setShareToken(loadedShareToken);
  }, [loadedShareToken]);

  const shareUrl = shareToken ? `${window.location.origin}/stats/${shareToken}` : '';

  const handleCreate = async () => {
    if (!activityId) return;
    setShareBusy(true);
    try {
      setShareToken(await createShareLink(activityId));
    } catch {
      /* ignore */
    } finally {
      setShareBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!activityId) return;
    setShareBusy(true);
    try {
      await revokeShareLink(activityId);
      setShareToken(null);
    } catch {
      /* ignore */
    } finally {
      setShareBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const handleExport = async (type: AnalyticsExportType) => {
    if (!activityId) return;
    setDownloading(type);
    setError(null);
    try {
      await downloadExport(base(activityId), type, period);
    } catch {
      setError(t.exportFailed);
    } finally {
      setDownloading(null);
    }
  };

  const exports: { type: AnalyticsExportType; icon: string; label: string; description: string }[] = [
    { type: 'executive', icon: 'XL', label: t.exportExecutive, description: t.exportExecutiveDescription },
    { type: 'participants', icon: 'P', label: t.exportParticipants, description: t.exportParticipantsDescription },
    { type: 'scores', icon: 'S', label: t.exportScores, description: t.exportScoresDescription },
    { type: 'progress', icon: '%', label: t.exportProgress, description: t.exportProgressDescription },
  ];

  return (
    <>
      {error && (
        <div style={{ color: '#e74c3c', marginBottom: 12, fontSize: 14, textAlign: 'center' }}>
          {error}
        </div>
      )}

      {!shared && (
        <PassGradeCard>
          <PassGradeTitleRow>
            <PassGradeTitle>{t.passGrade}</PassGradeTitle>
            <PassGradeControlRow>
              <PassGradePreset type="button" onClick={() => commitThreshold(null)} disabled={!activityId}>
                {t.passGradeNone}
              </PassGradePreset>
              {QUICK_GRADES.map((value) => (
                <PassGradePreset key={value} type="button" onClick={() => commitThreshold(value)} disabled={!activityId}>
                  {value}
                </PassGradePreset>
              ))}
              <PassGradeInput
                type="number"
                min={0}
                max={100}
                step={5}
                value={threshold ?? ''}
                disabled={!activityId}
                onChange={(e) => setThreshold(e.target.value === '' ? null : Number(e.target.value))}
                onBlur={() => commitThreshold(threshold)}
              />
            </PassGradeControlRow>
          </PassGradeTitleRow>
          <PassGradeDescription>{t.passGradeDesc}</PassGradeDescription>
        </PassGradeCard>
      )}

      <ExportGrid>
        {exports.map((exp) => (
          <ExportCard
            key={exp.type}
            onClick={() => handleExport(exp.type)}
            disabled={downloading !== null || !activityId}
            style={{ opacity: downloading && downloading !== exp.type ? 0.5 : 1 }}
          >
            <ExportIcon>{exp.icon}</ExportIcon>
            <ExportLabel>{downloading === exp.type ? t.downloading : exp.label}</ExportLabel>
            <ExportDescription>{exp.description}</ExportDescription>
          </ExportCard>
        ))}
      </ExportGrid>

      {!shared && (
        <PassGradeCard style={{ marginTop: 16, marginBottom: 0 }}>
          <PassGradeTitle>{t.shareTitle}</PassGradeTitle>
          <PassGradeDescription>{t.shareDesc}</PassGradeDescription>
          {shareToken ? (
            <ShareRow>
              <ShareUrlInput value={shareUrl} readOnly onFocus={(e) => e.currentTarget.select()} />
              <PassGradePreset type="button" onClick={handleCopy} disabled={shareBusy}>
                {copied ? t.shareCopied : t.shareCopy}
              </PassGradePreset>
              <PassGradePreset type="button" onClick={handleCreate} disabled={shareBusy}>
                {t.shareRegenerate}
              </PassGradePreset>
              <PassGradePreset type="button" onClick={handleRevoke} disabled={shareBusy}>
                {t.shareRevoke}
              </PassGradePreset>
            </ShareRow>
          ) : (
            <ShareRow>
              <PassGradePreset type="button" onClick={handleCreate} disabled={!activityId || shareBusy}>
                {t.shareCreate}
              </PassGradePreset>
            </ShareRow>
          )}
        </PassGradeCard>
      )}
    </>
  );
}
