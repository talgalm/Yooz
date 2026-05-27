import { useState } from 'react';
import { useTranslations } from '../../../context/LanguageContext';
import { downloadExport, type AnalyticsExportType } from '../../../hooks/useAnalytics';
import { texts } from './AdminStatisticsTab.i18n';
import { ExportGrid, ExportCard, ExportIcon, ExportLabel, ExportDescription } from './styled';

interface Props {
  activityId: string | null;
}

export default function ExportSection({ activityId }: Props) {
  const t = useTranslations(texts);
  const [downloading, setDownloading] = useState<AnalyticsExportType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (type: AnalyticsExportType) => {
    if (!activityId) return;
    setDownloading(type);
    setError(null);
    try {
      await downloadExport(activityId, type);
    } catch {
      setError(t.exportFailed);
    } finally {
      setDownloading(null);
    }
  };

  const exports: { type: AnalyticsExportType; icon: string; label: string; description: string }[] = [
    {
      type: 'executive',
      icon: 'XL',
      label: t.exportExecutive,
      description: t.exportExecutiveDescription,
    },
    {
      type: 'participants',
      icon: 'P',
      label: t.exportParticipants,
      description: t.exportParticipantsDescription,
    },
    {
      type: 'scores',
      icon: 'S',
      label: t.exportScores,
      description: t.exportScoresDescription,
    },
    {
      type: 'progress',
      icon: '%',
      label: t.exportProgress,
      description: t.exportProgressDescription,
    },
  ];

  return (
    <>
      {error && (
        <div style={{ color: '#e74c3c', marginBottom: 12, fontSize: 14, textAlign: 'center' }}>
          {error}
        </div>
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
            <ExportLabel>
              {downloading === exp.type ? t.downloading : exp.label}
            </ExportLabel>
            <ExportDescription>{exp.description}</ExportDescription>
          </ExportCard>
        ))}
      </ExportGrid>
    </>
  );
}
