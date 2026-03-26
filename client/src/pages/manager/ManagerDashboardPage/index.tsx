import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
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
  SectionInfoBlock,
  SmallMutedText,
  SectionTitle,
  CellBold,
  CellPrimary,
  EmptyText,
  OverflowWrapper,
  ParticipantName,
  ParticipantMeta,
  ScoresWrap,
  ScoreBadge,
} from '../../admin/styled';

// ─── Local Styled Components ───

const DashboardTitle = styled('h2')({
  margin: '0 0 4px',
});

const JoinedText = styled('span')({
  color: '#888',
  fontSize: 13,
});

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

export default function ManagerDashboardPage() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
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

  const handleLogout = () => {
    logout();
    navigate('/manager');
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchReports();
  };

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
          <OutlineButton onClick={handleRefresh}>{t.refresh}</OutlineButton>
          <OutlineButton onClick={handleLogout}>{t.logout}</OutlineButton>
        </HeaderActionsRow>
      </AdminHeader>
      <AdminContent>
        <SectionInfoBlock>
          <DashboardTitle>{data?.activityName || manager?.activityName}</DashboardTitle>
          <SmallMutedText>
            {manager?.email} &middot; {manager?.activityCode}
          </SmallMutedText>
        </SectionInfoBlock>

        {/* Leaderboard */}
        {data && data.participants.some((p) => p.totalScore > 0) && (
          <LeaderboardSection data={data} t={t} />
        )}

        {/* Group standings */}
        {data && data.groupStandings.length > 0 && (
          <GroupStandingsSection groupStandings={data.groupStandings} t={t} />
        )}

        {/* Participants */}
        <SectionTitle>{t.participants}</SectionTitle>
        {!data || data.participants.length === 0 ? (
          <AdminCardNoPadding>
            <EmptyText>{t.noParticipants}</EmptyText>
          </AdminCardNoPadding>
        ) : (
          <ParticipantsSection data={data} t={t} />
        )}
      </AdminContent>
    </AdminPage>
  );
}

function LeaderboardSection({ data, t }: { data: ReportsResponse; t: Record<string, string> }) {
  const leaderboard = useMemo(
    () => [...data.participants].filter((p) => p.totalScore > 0).sort((a, b) => b.totalScore - a.totalScore).slice(0, 50),
    [data.participants]
  );
  const { page, setPage, totalPages, pageItems, totalItems, showing } = usePagination(leaderboard);
  const startRank = (page - 1) * 10;

  return (
    <>
      <SectionTitle>{t.leaderboard}</SectionTitle>
      <AdminCardNoPadding sx={{ marginBottom: '24px' }}>
        <Table>
          <thead>
            <tr>
              <th>{t.rank}</th>
              <th>{t.name}</th>
              {data.connectionType === 'group' && <th>{t.group}</th>}
              <th>{t.score}</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((p, i) => (
              <tr key={p._id}>
                <td><CellBold>#{startRank + i + 1}</CellBold></td>
                <td><ParticipantName>{p.participantName}</ParticipantName></td>
                {data.connectionType === 'group' && (
                  <td>{p.group ? <Badge>{p.group}</Badge> : '—'}</td>
                )}
                <td><CellPrimary>{p.totalScore}</CellPrimary></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </AdminCardNoPadding>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={showing} totalItems={totalItems} />
    </>
  );
}

function GroupStandingsSection({ groupStandings, t }: { groupStandings: GroupStanding[]; t: Record<string, string> }) {
  const { page, setPage, totalPages, pageItems, totalItems, showing } = usePagination(groupStandings);

  return (
    <>
      <SectionTitle>{t.groupStandings}</SectionTitle>
      <AdminCardNoPadding sx={{ marginBottom: '24px' }}>
        <Table>
          <thead>
            <tr>
              <th>{t.groupName}</th>
              <th>{t.groupTotal}</th>
              <th>{t.members}</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((g) => (
              <tr key={g.name}>
                <td><CellBold>{g.name}</CellBold></td>
                <td><CellPrimary>{g.totalScore}</CellPrimary></td>
                <td>{g.memberCount}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </AdminCardNoPadding>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={showing} totalItems={totalItems} />
    </>
  );
}

function ParticipantsSection({ data, t }: { data: ReportsResponse; t: Record<string, string> }) {
  const { page, setPage, totalPages, pageItems, totalItems, showing } = usePagination(data.participants);

  return (
    <>
      <AdminCardNoPadding>
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
                  <td>
                    <JoinedText>{new Date(p.joinedAt).toLocaleDateString()}</JoinedText>
                  </td>
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
