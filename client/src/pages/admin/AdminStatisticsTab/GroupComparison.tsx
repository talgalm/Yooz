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
import { rankGroups } from './groupStandings';
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

  const ranked = rankGroups(groups);
  const chartData = ranked.map((g) => ({
    name: g.group || '-',
    score: g.totalScore,
  }));

  return (
    <>
      <ChartCard>
        <ChartTitle>{t.groupsTab} - {t.groupTotalScore}</ChartTitle>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ececf3" />
            <XAxis dataKey="name" fontSize={12} tick={{ fill: '#888' }} />
            <YAxis fontSize={12} tick={{ fill: '#888' }} />
            <Tooltip />
            <Bar dataKey="score" fill="#6c5ce7" radius={[6, 6, 0, 0]} name={t.groupTotalScore} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <DesktopOnly>
        <ChartCard style={{ padding: 0, overflow: 'hidden' }}>
          <StatsTable>
            <thead>
              <tr>
                <th>#</th>
                <th>{t.group}</th>
                <th>{t.groupTotalScore}</th>
                <th>{t.members}</th>
                <th>{t.completionRate}</th>
                <th>{t.avgDuration}</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((g) => (
                <tr key={g.group} style={{ cursor: 'default' }}>
                  <td style={{ fontWeight: 700 }}>{g.rank}</td>
                  <td style={{ fontWeight: 600 }}>{g.group || '-'}</td>
                  <td style={{ fontWeight: 700 }}>{g.totalScore.toLocaleString()}</td>
                  <td>{g.memberCount}</td>
                  <td>{Math.round(g.completionRate)}%</td>
                  <td>{formatDuration(g.avgDurationMs)}</td>
                </tr>
              ))}
            </tbody>
          </StatsTable>
        </ChartCard>
      </DesktopOnly>

      <HideOnDesktop>
        {ranked.map((g) => (
          <StatsMobileCard key={g.group} style={{ cursor: 'default' }}>
            <StatsMobileRow>
              <StatsMobileValue>{`${g.rank}. ${g.group || '-'}`}</StatsMobileValue>
              <StatsMobileLabel>{g.memberCount} {t.members}</StatsMobileLabel>
            </StatsMobileRow>
            <StatsMobileRow>
              <StatsMobileLabel>{t.groupTotalScore}</StatsMobileLabel>
              <StatsMobileValue>{g.totalScore.toLocaleString()}</StatsMobileValue>
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
