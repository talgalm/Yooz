import { useState } from 'react';
import { useTranslations } from '../../../context/LanguageContext';
import { downloadExport } from '../../../hooks/useAnalytics';
import { texts } from './AdminStatisticsTab.i18n';
import { ExportGrid, ExportCard, ExportIcon, ExportLabel, ExportDescription } from './styled';

interface Props {
  activityId: string;
}

type ExportType = 'participants' | 'scores' | 'progress';

export default function ExportSection({ activityId }: Props) {
  const t = useTranslations(texts);
  const [downloading, setDownloading] = useState<ExportType | null>(null);

  const handleExport = async (type: ExportType) => {
    setDownloading(type);
    try {
      await downloadExport(activityId, type);
    } catch {
      // silently fail — user sees download didn't happen
    } finally {
      setDownloading(null);
    }
  };

  const exports: { type: ExportType; icon: string; label: string; description: string }[] = [
    {
      type: 'participants',
      icon: '👥',
      label: t.exportParticipants,
      description: 'Excel',
    },
    {
      type: 'scores',
      icon: '🏆',
      label: t.exportScores,
      description: 'Excel',
    },
    {
      type: 'progress',
      icon: '📊',
      label: t.exportProgress,
      description: 'Excel',
    },
  ];

  return (
    <ExportGrid>
      {exports.map((exp) => (
        <ExportCard
          key={exp.type}
          onClick={() => handleExport(exp.type)}
          disabled={downloading !== null}
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
  );
}
