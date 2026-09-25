import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ActivityAnalytics from '../../admin/AdminStatisticsTab/ActivityAnalytics';
import { AnalyticsSourceProvider, makeSharedSource } from '../../admin/AdminStatisticsTab/analyticsSource';

export default function SharedStatsPage() {
  const { token = '' } = useParams<{ token: string }>();
  const source = useMemo(() => makeSharedSource(token), [token]);

  return (
    <AnalyticsSourceProvider value={source}>
      <div style={{ minHeight: '100vh', background: '#f4f5f8' }}>
        <header
          style={{
            background: '#fff',
            borderBottom: '1px solid #e6e8ee',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 28 }} />
        </header>
        <main style={{ maxWidth: 1240, margin: '0 auto', padding: '20px 16px 60px' }}>
          <ActivityAnalytics activityId={token} onBack={() => {}} />
        </main>
      </div>
    </AnalyticsSourceProvider>
  );
}
