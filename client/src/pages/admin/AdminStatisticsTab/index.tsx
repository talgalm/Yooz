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
}

export default function AdminStatisticsTab({ activities }: Props) {
  const [view, setView] = useState<StatisticsView>('overview');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

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
