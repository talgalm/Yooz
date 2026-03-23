import { useState } from 'react';
import type { StatisticsView } from './types';
import OverviewSection from './OverviewSection';
import ActivityAnalytics from './ActivityAnalytics';
import AuditLogView from './AuditLogView';

interface Activity {
  _id: string;
  code: string;
  name: string;
  status: 'preview' | 'live';
}

interface Props {
  activities: Activity[];
  initialActivityId?: string | null;
}

export default function AdminStatisticsTab({ activities, initialActivityId }: Props) {
  const [view, setView] = useState<StatisticsView>(initialActivityId ? 'activity' : 'overview');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(initialActivityId ?? null);

  const handleSelectActivity = (id: string) => {
    setSelectedActivityId(id);
    setView('activity');
  };

  const handleBack = () => {
    setView('overview');
    setSelectedActivityId(null);
  };

  if (view === 'audit') {
    return <AuditLogView onBack={handleBack} />;
  }

  if (view === 'activity' && selectedActivityId) {
    return <ActivityAnalytics activityId={selectedActivityId} onBack={handleBack} />;
  }

  return (
    <OverviewSection
      activities={activities}
      onSelectActivity={handleSelectActivity}
      onViewAuditLog={() => setView('audit')}
    />
  );
}
