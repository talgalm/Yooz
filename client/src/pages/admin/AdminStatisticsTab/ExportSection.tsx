import { useState } from 'react';
import { useTranslations } from '../../../context/LanguageContext';
import { downloadExport, type AnalyticsExportType } from '../../../hooks/useAnalytics';
import { texts } from './AdminStatisticsTab.i18n';
import { ExportGrid, ExportCard, ExportIcon, ExportLabel, ExportDescription } from './styled';

interface Props {
  activityId: string | null;
  previewOnly?: boolean;
  showcase?: boolean;
}

export default function ExportSection({ activityId, previewOnly = false, showcase = false }: Props) {
  const t = useTranslations(texts);
  const [downloading, setDownloading] = useState<AnalyticsExportType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const exportActivityId = showcase ? 'showcase' : activityId;

  const handleExport = async (type: AnalyticsExportType) => {
    if (!exportActivityId || previewOnly) return;
    setDownloading(type);
    setError(null);
    try {
      await downloadExport(exportActivityId, type);
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
      description: showcase ? t.exportMockDescription : t.exportExecutiveDescription,
    },
    {
      type: 'participants',
      icon: 'P',
      label: t.exportParticipants,
      description: showcase ? t.exportMockDescription : t.exportParticipantsDescription,
    },
    {
      type: 'scores',
      icon: 'S',
      label: t.exportScores,
      description: showcase ? t.exportMockDescription : t.exportScoresDescription,
    },
    {
      type: 'progress',
      icon: '%',
      label: t.exportProgress,
      description: showcase ? t.exportMockDescription : t.exportProgressDescription,
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
            disabled={downloading !== null || previewOnly || !exportActivityId}
            style={{ opacity: (downloading && downloading !== exp.type) || previewOnly ? 0.5 : 1 }}
          >
            <ExportIcon>{exp.icon}</ExportIcon>
            <ExportLabel>
              {downloading === exp.type ? t.downloading : exp.label}
            </ExportLabel>
            <ExportDescription>{previewOnly ? t.previewOnly : exp.description}</ExportDescription>
          </ExportCard>
        ))}
      </ExportGrid>
    </>
  );
}
