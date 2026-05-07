import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled, keyframes } from '@mui/material/styles';
import { useManagerAuth } from '../../../context/ManagerAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './ManagerDashboardPage.i18n';
import { managerApiFetch } from '../../../utils/managerApi';
import Pagination from '../../../components/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import LangDrawer from '../../../components/LangDrawer';
import {
  AdminPage,
  AdminHeader,
  AdminContent,
  Table,
  OutlineButton,
  BodyText,
  Badge,
} from '../../../components/styled';
import {
  AdminCardNoPadding,
  LoadingContainer,
  LoadingCenter,
  Spinner,
  SpinKeyframe,
  HeaderActionsRow,
  CellBold,
  CellPrimary,
  EmptyText,
  OverflowWrapper,
  ParticipantName,
  ParticipantMeta,
  ScoresWrap,
  ScoreBadge,
} from '../../admin/styled';
import AnimatedLeaderboard, { LeaderboardRow } from './AnimatedLeaderboard';

// ─── Types ───

interface GameScore {
  gameName: string;
  score: number;
}

interface Participant {
  _id: string;
  participantName: string;
  email?: string;
  phoneNumber?: string;
  group?: string;
  joinedAt: string;
  scores: GameScore[];
  totalScore: number;
}

interface GroupStanding {
  name: string;
  totalScore: number;
  memberCount: number;
}

interface ReportsResponse {
  activityName: string;
  connectionType: string;
  participants: Participant[];
  groupStandings: GroupStanding[];
}

type TabKey = 'overview' | 'leaderboard' | 'participants' | 'groups';

// ─── Styled Components ───

const HeroCard = styled('div')({
  background: 'linear-gradient(135deg, #6c5ce7 0%, #8B2FC9 100%)',
  borderRadius: 18,
  padding: '24px 28px',
  color: '#fff',
  marginBottom: 24,
  boxShadow: '0 4px 20px rgba(108,92,231,0.18)',
  '@media (max-width: 600px)': {
    padding: '20px 22px',
    borderRadius: 14,
  },
});

const HeroTopRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
});

const HeroTitle = styled('h1')({
  margin: 0,
  fontSize: 26,
  fontWeight: 800,
  letterSpacing: -0.3,
  '@media (max-width: 600px)': { fontSize: 22 },
});

const HeroBadge = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 20,
  background: 'rgba(255,255,255,0.18)',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'monospace',
  letterSpacing: 0.5,
});

const HeroMeta = styled('p')({
  margin: '8px 0 0',
  fontSize: 14,
  opacity: 0.85,
});

const StatsGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 14,
  marginBottom: 28,
  '@media (max-width: 900px)': {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  '@media (max-width: 480px)': {
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
});

const StatCard = styled('div')({
  background: '#fff',
  borderRadius: 14,
  padding: '18px 20px',
  border: '1px solid #ece8f0',
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

const StatLabel = styled('div')({
  fontSize: 12,
  fontWeight: 600,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
});

const StatValue = styled('div')({
  fontSize: 26,
  fontWeight: 800,
  color: '#222',
  lineHeight: 1.1,
  '@media (max-width: 480px)': { fontSize: 22 },
});

const StatHint = styled('div')({
  fontSize: 12,
  color: '#aaa',
  marginTop: 2,
});

const TabBar = styled('div')({
  display: 'flex',
  gap: 0,
  borderBottom: '2px solid #ece8f0',
  marginBottom: 24,
  overflowX: 'auto',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
});

const TabBtn = styled('button')<{ active?: boolean }>(({ active }) => ({
  padding: '14px 22px',
  fontSize: 15,
  fontWeight: active ? 700 : 600,
  border: 'none',
  borderBottom: `3px solid ${active ? '#6c5ce7' : 'transparent'}`,
  marginBottom: -2,
  background: active ? 'rgba(108,92,231,0.06)' : 'none',
  color: active ? '#6c5ce7' : '#777',
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',
  '&:hover': {
    color: active ? '#6c5ce7' : '#444',
    background: active ? 'rgba(108,92,231,0.06)' : 'rgba(0,0,0,0.02)',
  },
  '@media (max-width: 600px)': {
    padding: '12px 16px',
    fontSize: 14,
  },
}));

const TabCount = styled('span')({
  display: 'inline-block',
  marginInlineStart: 8,
  padding: '2px 8px',
  borderRadius: 10,
  background: 'rgba(108,92,231,0.12)',
  color: '#6c5ce7',
  fontSize: 11,
  fontWeight: 700,
});

const SectionTitle = styled('h3')({
  margin: '0 0 14px',
  fontSize: 17,
  fontWeight: 700,
  color: '#222',
});

const RankBadge = styled('span')<{ top?: boolean }>(({ top }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  borderRadius: '50%',
  background: top
    ? 'linear-gradient(135deg, #f5b731 0%, #c88a10 100%)'
    : '#f0eefa',
  color: top ? '#fff' : '#6c5ce7',
  fontWeight: 800,
  fontSize: 13,
  boxShadow: top ? '0 2px 6px rgba(245,183,49,0.4)' : 'none',
}));

const RefreshBtn = styled(OutlineButton)({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
});

const livePulse = keyframes`
  0%   { box-shadow: 0 0 0 0   rgba(34,197,94,0.55); }
  70%  { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
  100% { box-shadow: 0 0 0 0   rgba(34,197,94,0); }
`;

const LiveDot = styled('span')({
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#22c55e',
  marginInlineEnd: 8,
  animation: `${livePulse} 1.6s ease-out infinite`,
});

const LiveTag = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: 12,
  fontWeight: 700,
  color: '#22c55e',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  marginInlineStart: 8,
});

const SectionRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  margin: '0 0 14px',
  gap: 12,
});

const LIVE_POLL_MS = 5000;

// ─── Component ───

export default function ManagerDashboardPage() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const { manager, logout } = useManagerAuth();
  const navigate = useNavigate();
  const t = useTranslations(texts);

  const fetchReports = useCallback(async () => {
    try {
      const res = await managerApiFetch<ReportsResponse>('/api/manager/reports');
      setData(res);
    } catch {
      // token might be expired
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Live polling — refresh while the tab is visible
  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (document.visibilityState === 'visible') {
        try {
          const res = await managerApiFetch<ReportsResponse>('/api/manager/reports');
          if (!cancelled) setData(res);
        } catch {
          // ignore — keep previous snapshot
        }
      }
      if (!cancelled) {
        timer = window.setTimeout(tick, LIVE_POLL_MS);
      }
    };

    timer = window.setTimeout(tick, LIVE_POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        // immediate refresh on tab regain
        if (timer) window.clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/manager');
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchReports();
  };

  // ─── Derived stats ───
  const stats = useMemo(() => {
    if (!data) {
      return { total: 0, withScore: 0, avgScore: 0, topScore: 0 };
    }
    const total = data.participants.length;
    const scored = data.participants.filter((p) => p.totalScore > 0);
    const sum = scored.reduce((s, p) => s + (Number(p.totalScore) || 0), 0);
    const avg = scored.length ? Math.round(sum / scored.length) : 0;
    const top = scored.reduce((m, p) => Math.max(m, p.totalScore), 0);
    return { total, withScore: scored.length, avgScore: avg, topScore: top };
  }, [data]);

  const isGroup = data?.connectionType === 'group';

  if (loading) {
    return (
      <AdminPage>
        <AdminHeader>
          <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 32 }} />
        </AdminHeader>
        <AdminContent>
          <LoadingContainer>
            <LoadingCenter>
              <Spinner />
              <BodyText>{t.loading}</BodyText>
              <SpinKeyframe />
            </LoadingCenter>
          </LoadingContainer>
        </AdminContent>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminHeader>
        <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 32 }} />
        <HeaderActionsRow>
          <LangDrawer />
          <RefreshBtn onClick={handleRefresh}>↻ {t.refresh}</RefreshBtn>
          <OutlineButton onClick={handleLogout}>{t.logout}</OutlineButton>
        </HeaderActionsRow>
      </AdminHeader>

      <AdminContent>
        {/* Hero card */}
        <HeroCard>
          <HeroTopRow>
            <HeroTitle>{data?.activityName || manager?.activityName}</HeroTitle>
            {manager?.activityCode && <HeroBadge>#{manager.activityCode}</HeroBadge>}
          </HeroTopRow>
          <HeroMeta>{manager?.email}</HeroMeta>
        </HeroCard>

        {/* KPI stats */}
        <StatsGrid>
          <StatCard>
            <StatLabel>{t.statTotal}</StatLabel>
            <StatValue>{stats.total}</StatValue>
            <StatHint>{t.statTotalHint}</StatHint>
          </StatCard>
          <StatCard>
            <StatLabel>{t.statWithScore}</StatLabel>
            <StatValue>{stats.withScore}</StatValue>
            <StatHint>
              {stats.total > 0
                ? `${Math.round((stats.withScore / stats.total) * 100)}%`
                : '0%'}
            </StatHint>
          </StatCard>
          <StatCard>
            <StatLabel>{t.statAvgScore}</StatLabel>
            <StatValue>{stats.avgScore}</StatValue>
            <StatHint>{t.statAvgScoreHint}</StatHint>
          </StatCard>
          <StatCard>
            <StatLabel>{t.statTopScore}</StatLabel>
            <StatValue>{stats.topScore}</StatValue>
            <StatHint>{t.statTopScoreHint}</StatHint>
          </StatCard>
        </StatsGrid>

        {/* Tab bar */}
        <TabBar role="tablist">
          <TabBtn
            type="button"
            role="tab"
            aria-selected={activeTab === 'overview'}
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            {t.tabOverview}
          </TabBtn>
          <TabBtn
            type="button"
            role="tab"
            aria-selected={activeTab === 'leaderboard'}
            active={activeTab === 'leaderboard'}
            onClick={() => setActiveTab('leaderboard')}
          >
            {t.tabLeaderboard}
          </TabBtn>
          <TabBtn
            type="button"
            role="tab"
            aria-selected={activeTab === 'participants'}
            active={activeTab === 'participants'}
            onClick={() => setActiveTab('participants')}
          >
            {t.tabParticipants}
            {stats.total > 0 && <TabCount>{stats.total}</TabCount>}
          </TabBtn>
          {isGroup && (
            <TabBtn
              type="button"
              role="tab"
              aria-selected={activeTab === 'groups'}
              active={activeTab === 'groups'}
              onClick={() => setActiveTab('groups')}
            >
              {t.tabGroups}
            </TabBtn>
          )}
        </TabBar>

        {/* Tab content */}
        {activeTab === 'overview' && data && (
          <OverviewTab data={data} t={t} />
        )}
        {activeTab === 'leaderboard' && data && (
          <LeaderboardTab data={data} t={t} />
        )}
        {activeTab === 'participants' && data && (
          <ParticipantsTab data={data} t={t} />
        )}
        {activeTab === 'groups' && data && isGroup && (
          <GroupsTab groupStandings={data.groupStandings} t={t} />
        )}
      </AdminContent>
    </AdminPage>
  );
}

// ─── Tab: Overview ───

function OverviewTab({ data, t }: { data: ReportsResponse; t: Record<string, string> }) {
  const top5: LeaderboardRow[] = useMemo(
    () =>
      [...data.participants]
        .filter((p) => p.totalScore > 0)
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 5)
        .map((p) => ({
          id: p._id,
          name: p.participantName,
          score: p.totalScore,
          group: p.group,
        })),
    [data.participants],
  );
  const recent = useMemo(
    () =>
      [...data.participants]
        .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
        .slice(0, 5),
    [data.participants],
  );

  return (
    <>
      <SectionRow>
        <SectionTitle style={{ margin: 0 }}>{t.topPlayers}</SectionTitle>
        <LiveTag>
          <LiveDot />
          {t.live}
        </LiveTag>
      </SectionRow>
      <div style={{ marginBottom: 24 }}>
        <AnimatedLeaderboard rows={top5} emptyText={t.noScores} />
      </div>

      <SectionTitle>{t.recentJoins}</SectionTitle>
      <AdminCardNoPadding>
        {recent.length === 0 ? (
          <EmptyText>{t.noParticipants}</EmptyText>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{t.name}</th>
                <th>{t.joined}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p._id}>
                  <td>
                    <ParticipantName>{p.participantName}</ParticipantName>
                    {p.email && <ParticipantMeta>{p.email}</ParticipantMeta>}
                  </td>
                  <td><ParticipantMeta>{new Date(p.joinedAt).toLocaleString()}</ParticipantMeta></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AdminCardNoPadding>
    </>
  );
}

// ─── Tab: Leaderboard ───

function LeaderboardTab({ data, t }: { data: ReportsResponse; t: Record<string, string> }) {
  const rows: LeaderboardRow[] = useMemo(
    () =>
      [...data.participants]
        .filter((p) => p.totalScore > 0)
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 50)
        .map((p) => ({
          id: p._id,
          name: p.participantName,
          score: p.totalScore,
          meta: p.email,
          group: data.connectionType === 'group' ? p.group : undefined,
        })),
    [data.participants, data.connectionType],
  );

  return (
    <>
      <SectionRow>
        <div />
        <LiveTag>
          <LiveDot />
          {t.live}
        </LiveTag>
      </SectionRow>
      <AnimatedLeaderboard rows={rows} emptyText={t.noScores} />
    </>
  );
}

// ─── Tab: Participants ───

function ParticipantsTab({ data, t }: { data: ReportsResponse; t: Record<string, string> }) {
  const { page, setPage, totalPages, pageItems, totalItems, showing } = usePagination(data.participants);

  if (data.participants.length === 0) {
    return (
      <AdminCardNoPadding>
        <EmptyText>{t.noParticipants}</EmptyText>
      </AdminCardNoPadding>
    );
  }

  return (
    <>
      <AdminCardNoPadding sx={{ marginBottom: '16px' }}>
        <OverflowWrapper>
          <Table>
            <thead>
              <tr>
                <th>{t.name}</th>
                {data.connectionType === 'group' && <th>{t.group}</th>}
                <th>{t.totalScore}</th>
                <th>{t.scores}</th>
                <th>{t.joined}</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p) => (
                <tr key={p._id}>
                  <td>
                    <ParticipantName>{p.participantName}</ParticipantName>
                    {p.email && <ParticipantMeta>{p.email}</ParticipantMeta>}
                    {p.phoneNumber && <ParticipantMeta>{p.phoneNumber}</ParticipantMeta>}
                  </td>
                  {data.connectionType === 'group' && (
                    <td>{p.group ? <Badge>{p.group}</Badge> : '—'}</td>
                  )}
                  <td><CellPrimary>{p.totalScore}</CellPrimary></td>
                  <td>
                    {Array.isArray(p.scores) && p.scores.length > 0 ? (
                      <ScoresWrap>
                        {p.scores.map((s, i) => (
                          <ScoreBadge key={i}>
                            {s.gameName}: {s.score}
                          </ScoreBadge>
                        ))}
                      </ScoresWrap>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td><ParticipantMeta>{new Date(p.joinedAt).toLocaleDateString()}</ParticipantMeta></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </OverflowWrapper>
      </AdminCardNoPadding>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={showing} totalItems={totalItems} />
    </>
  );
}

// ─── Tab: Groups ───

function GroupsTab({ groupStandings, t }: { groupStandings: GroupStanding[]; t: Record<string, string> }) {
  const { page, setPage, totalPages, pageItems, totalItems, showing } = usePagination(groupStandings);

  if (groupStandings.length === 0) {
    return (
      <AdminCardNoPadding>
        <EmptyText>{t.noGroups}</EmptyText>
      </AdminCardNoPadding>
    );
  }

  return (
    <>
      <AdminCardNoPadding sx={{ marginBottom: '16px' }}>
        <Table>
          <thead>
            <tr>
              <th style={{ width: 60 }}>{t.rank}</th>
              <th>{t.groupName}</th>
              <th>{t.members}</th>
              <th style={{ textAlign: 'end' }}>{t.groupTotal}</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((g, i) => {
              const rank = (page - 1) * 10 + i + 1;
              return (
                <tr key={g.name}>
                  <td><RankBadge top={rank <= 3}>{rank}</RankBadge></td>
                  <td><CellBold>{g.name}</CellBold></td>
                  <td>{g.memberCount}</td>
                  <td style={{ textAlign: 'end' }}><CellPrimary>{g.totalScore}</CellPrimary></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </AdminCardNoPadding>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={showing} totalItems={totalItems} />
    </>
  );
}
