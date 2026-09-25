import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslations, useLang } from '../../../context/LanguageContext';
import { formatDuration as formatDurationLoc } from '../../../utils/formatDuration';
import { useGroupStats } from '../../../hooks/useAnalytics';
import { texts } from './AdminStatisticsTab.i18n';
import {
  ChartCard,
  ChartTitle,
  StatsTable,
  StatsMobileCard,
  StatsMobileRow,
  StatsMobileLabel,
  StatsMobileValue,
} from './styled';
import { DesktopOnly, HideOnDesktop } from '../../../components/styled';
import type { ActivityPeriod, GroupStats } from './types';

interface Props {
  activityId: string | null;
  period?: ActivityPeriod;
  data?: GroupStats[];
}

export default function GroupComparison({ activityId, period, data }: Props) {
  const t = useTranslations(texts);
  const { lang } = useLang();
  const formatDuration = (ms: number) => formatDurationLoc(ms, lang);
  const { data: fetchedGroups, loading } = useGroupStats(data ? null : activityId, period);
  const groups = data ?? fetchedGroups;

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 24, color: '#888' }}>{t.loading}</div>;
  }

  if (!groups || groups.length === 0) {
    return <div style={{ textAlign: 'center', padding: 24, color: '#888' }}>{t.noGroups}</div>;
  }

  const chartData = groups.map((g) => ({
    name: g.group || '—',
    score: Math.round(g.avgScore),
    completion: Math.round(g.completionRate),
  }));

  return (
    <>
      <ChartCard>
        <ChartTitle>{t.groupsTab} — {t.avgScore}</ChartTitle>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ececf3" />
            <XAxis dataKey="name" fontSize={12} tick={{ fill: '#888' }} />
            <YAxis fontSize={12} tick={{ fill: '#888' }} />
            <Tooltip />
            <Bar dataKey="score" fill="#6c5ce7" radius={[6, 6, 0, 0]} name={t.avgScore} />
            <Bar dataKey="completion" fill="#a29bfe" radius={[6, 6, 0, 0]} name={t.completionRate} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <DesktopOnly>
        <ChartCard style={{ padding: 0, overflow: 'hidden' }}>
          <StatsTable>
            <thead>
              <tr>
                <th>{t.group}</th>
                <th>{t.members}</th>
                <th>{t.avgScore}</th>
                <th>{t.completionRate}</th>
                <th>{t.avgDuration}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.group} style={{ cursor: 'default' }}>
                  <td style={{ fontWeight: 600 }}>{g.group || '—'}</td>
                  <td>{g.memberCount}</td>
                  <td>{Math.round(g.avgScore)}</td>
                  <td>{Math.round(g.completionRate)}%</td>
                  <td>{formatDuration(g.avgDurationMs)}</td>
                </tr>
              ))}
            </tbody>
          </StatsTable>
        </ChartCard>
      </DesktopOnly>

      <HideOnDesktop>
        {groups.map((g) => (
          <StatsMobileCard key={g.group} style={{ cursor: 'default' }}>
            <StatsMobileRow>
              <StatsMobileValue>{g.group || '—'}</StatsMobileValue>
              <StatsMobileLabel>{g.memberCount} {t.members}</StatsMobileLabel>
            </StatsMobileRow>
            <StatsMobileRow>
              <StatsMobileLabel>{t.avgScore}</StatsMobileLabel>
              <StatsMobileValue>{Math.round(g.avgScore)}</StatsMobileValue>
            </StatsMobileRow>
            <StatsMobileRow>
              <StatsMobileLabel>{t.completionRate}</StatsMobileLabel>
              <StatsMobileValue>{Math.round(g.completionRate)}%</StatsMobileValue>
            </StatsMobileRow>
            <StatsMobileRow>
              <StatsMobileLabel>{t.avgDuration}</StatsMobileLabel>
              <StatsMobileValue>{formatDuration(g.avgDurationMs)}</StatsMobileValue>
            </StatsMobileRow>
          </StatsMobileCard>
        ))}
      </HideOnDesktop>
    </>
  );
}
