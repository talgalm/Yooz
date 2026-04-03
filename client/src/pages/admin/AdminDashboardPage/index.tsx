import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminDashboardPage.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import LangDrawer from '../../../components/LangDrawer';
import Pagination from '../../../components/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import AdminGamesTab from '../AdminGamesTab';
import AdminStationsTab from '../AdminStationsTab';
import AdminStatisticsTab from '../AdminStatisticsTab';
import AdminUsersTab from '../AdminUsersTab';
import AdminLibraryTab from '../AdminLibraryTab';
import AdminPortalsTab from '../AdminPortalsTab';
import type { Portal } from '../AdminPortalsTab';
import {
  AdminHeader,
  OutlineButton,
  BodyText,
  StatusBadge,
  SegmentedControl,
  SegmentedControlCenter,
  SegmentedButton,
  GameTabBar,
  GameTabGroup,
  GameTab,
} from '../../../components/styled';
import {
  HeaderActionsRow,
  SectionHeaderRow,
  PageTitleNoMargin,
  SmallActionButton,
  EmptyText,
  CellBold,
  CellMuted,
  MobileCardHeader,
  MobileCardNameLarge,
  MobileCardDetails,
  MobileCardDate,
  MobileCardCode,
} from '../styled';

// ─── Local styled components ───

const PageBg = styled('div')({
  minHeight: '100vh',
  direction: 'rtl',
  background: 'linear-gradient(160deg, #f5edf4 0%, #eee8f8 40%, #f5f5f7 100%)',
});

const DashContent = styled('main')({
  maxWidth: 1400,
  margin: '0 auto',
  padding: '32px clamp(20px, 3vw, 40px) 48px',
  boxSizing: 'border-box',
  '@media (max-width: 960px)': {
    padding: '24px 20px 36px',
  },
  '@media (max-width: 600px)': {
    padding: '16px 16px 28px',
  },
});

const DashTabBar = styled('div')({
  display: 'flex',
  gap: 0,
  borderBottom: '3px solid #c9bfe0',
  marginBottom: 32,
  '@media (max-width: 600px)': {
    marginBottom: 20,
  },
});

const DashTab = styled('button')<{ active?: boolean }>(({ active }) => ({
  flex: 1,
  padding: '16px 24px',
  fontSize: 16,
  fontWeight: active ? 700 : 600,
  border: 'none',
  borderBottom: `3px solid ${active ? '#6c5ce7' : 'transparent'}`,
  marginBottom: -3,
  background: active ? 'rgba(108,92,231,0.06)' : 'none',
  color: active ? '#6c5ce7' : '#777',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'center',
  transition: 'all 0.2s',
  '&:hover': {
    color: active ? '#6c5ce7' : '#444',
    background: active ? 'rgba(108,92,231,0.06)' : 'rgba(0,0,0,0.02)',
  },
  '@media (max-width: 600px)': {
    padding: '14px 12px',
    fontSize: 14,
  },
}));

const TableCard = styled('div')({
  background: '#fff',
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
  border: '1px solid #ece8f0',
});

const DashTable = styled('table')({
  width: '100%',
  borderCollapse: 'collapse',
  '& th': {
    textAlign: 'start',
    padding: '14px 18px',
    fontSize: 13,
    fontWeight: 600,
    color: '#999',
    borderBottom: '1px solid #f0f0f4',
  },
  '& td': {
    textAlign: 'start',
    padding: '14px 18px',
    borderBottom: '1px solid #f5f5f7',
    fontSize: 14,
  },
  '& tbody tr': {
    cursor: 'pointer',
    transition: 'background 0.15s',
    '&:hover': {
      background: '#faf8fe',
    },
    '&:last-child td': {
      borderBottom: 'none',
    },
  },
  '@media (max-width: 600px)': {
    '& th, & td': {
      padding: '10px 12px',
      fontSize: 13,
    },
  },
});

const NameCell = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
});

const NameMain = styled('span')({
  fontWeight: 700,
  fontSize: 15,
  color: '#222',
});

const NameSub = styled('span')({
  fontSize: 12,
  color: '#aaa',
  fontFamily: 'monospace',
});

const BadgeGroup = styled('div')({
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
});

const IconBadge = styled('span')<{ variant?: 'purple' | 'green' | 'blue' }>(({ variant = 'purple' }) => {
  const colors = {
    purple: { bg: '#f0eefa', color: '#6c5ce7' },
    green: { bg: '#e8f5e9', color: '#2e7d32' },
    blue: { bg: '#e3f2fd', color: '#1565c0' },
  };
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    background: colors[variant].bg,
    color: colors[variant].color,
  };
});

const DateCell = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  color: '#888',
});

const LoadingBox = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 80,
});

const LoadingContent = styled('div')({
  textAlign: 'center',
});

const SpinnerEl = styled('div')({
  width: 36,
  height: 36,
  border: '3px solid #e8e4ee',
  borderTopColor: '#6c5ce7',
  borderRadius: '50%',
  animation: 'dashSpin 0.8s linear infinite',
  margin: '0 auto 16px',
  '@keyframes dashSpin': {
    to: { transform: 'rotate(360deg)' },
  },
});

const DesktopOnlyDiv = styled('div')({
  display: 'block',
  '@media (max-width: 600px)': {
    display: 'none',
  },
});

const MobileOnlyDiv = styled('div')({
  display: 'none',
  '@media (max-width: 600px)': {
    display: 'block',
  },
});

const MobileList = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
});

const MobileCard = styled('div')({
  background: '#fff',
  borderRadius: 14,
  padding: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  border: '1px solid #ece8f0',
  cursor: 'pointer',
  transition: 'background 0.15s',
  '&:active': {
    background: '#faf8fe',
  },
});

// ─── Types ───

type MainTab = 'activities' | 'statistics' | 'stations' | 'library' | 'users' | 'portals';
type StationsSection = 'stations' | 'games' | 'missions' | 'collage' | 'feedback';
type GameSubTab = 'order' | 'trivia' | 'puzzle' | 'trueFalse' | 'ballGame';

interface Activity {
  _id: string;
  code: string;
  name: string;
  status: 'preview' | 'live';
  connectionType: string;
  module?: { type: string };
  createdAt: number;
  createdByEmail?: string;
}

export interface Game {
  _id: string;
  name: string;
  type: string;
  description?: string;
  customer?: string;
  theme?: string;
  tags?: string[];
  createdAt: string;
}

export interface Station {
  _id: string;
  name: string;
  type?: 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage' | 'feedback';
  description?: string;
  customer?: string;
  theme?: string;
  tags?: string[];
  settings?: Record<string, unknown>;
  createdAt: string;
}

export interface Mission {
  _id: string;
  name: string;
  description?: string;
  customer?: string;
  explanationScreens: { header: string; description: string; buttonText: string }[];
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as MainTab) || 'activities';
  const initialActivityId = searchParams.get('activityId');

  const [activities, setActivities] = useState<Activity[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [activeTab, setActiveTab] = useState<MainTab>(
    ['activities', 'statistics', 'stations', 'library', 'users', 'portals'].includes(initialTab) ? initialTab : 'activities'
  );
  const [stationsSection, setStationsSection] = useState<StationsSection>('stations');
  const [gameSubTab, setGameSubTab] = useState<GameSubTab>('order');
  const [loading, setLoading] = useState(true);
  const { logout, admin } = useAdminAuth();
  const navigate = useNavigate();
  const t = useTranslations(texts);

  const role = admin?.role || 'viewer';

  const visibleTabs = useMemo(() => {
    const tabs: { key: MainTab; label: string }[] = [
      { key: 'activities', label: t.tabActivities },
    ];
    if (role === 'admin' || role === 'super_admin') {
      tabs.push({ key: 'statistics', label: t.tabStatistics });
    }
    tabs.push({ key: 'stations', label: t.tabStations });
    tabs.push({ key: 'library', label: t.tabLibrary });
    tabs.push({ key: 'portals', label: t.tabPortals });
    if (role === 'super_admin') {
      tabs.push({ key: 'users', label: t.tabUsers });
    }
    return tabs;
  }, [role, t]);

  const visibleTabKeys = useMemo(() => visibleTabs.map((tab) => tab.key), [visibleTabs]);

  useEffect(() => {
    if (!visibleTabKeys.includes(activeTab)) {
      setActiveTab('activities');
    }
  }, [visibleTabKeys, activeTab]);

  const fetchAll = useCallback(async () => {
    try {
      const [activitiesRes, gamesRes, stationsRes, missionsRes, portalsRes] = await Promise.all([
        adminApiFetch<{ activities: Activity[] }>('/api/admin/activities'),
        adminApiFetch<{ games: Game[] }>('/api/admin/games'),
        adminApiFetch<{ stations: Station[] }>('/api/admin/stations'),
        adminApiFetch<{ missions: Mission[] }>('/api/admin/missions'),
        adminApiFetch<{ portals: Portal[] }>('/api/admin/portals'),
      ]);
      setActivities(activitiesRes.activities);
      setGames(gamesRes.games);
      setStations(stationsRes.stations);
      setMissions(missionsRes.missions);
      setPortals(portalsRes.portals);
    } catch {
      // silently fail — data stays empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refreshGames = useCallback(async () => {
    try {
      const data = await adminApiFetch<{ games: Game[] }>('/api/admin/games');
      setGames(data.games);
    } catch {}
  }, []);

  const refreshStations = useCallback(async () => {
    try {
      const data = await adminApiFetch<{ stations: Station[] }>('/api/admin/stations');
      setStations(data.stations);
    } catch {}
  }, []);

  const refreshPortals = useCallback(async () => {
    try {
      const data = await adminApiFetch<{ portals: Portal[] }>('/api/admin/portals');
      setPortals(data.portals);
    } catch {}
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <PageBg>
        <AdminHeader>
          <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 32 }} />
        </AdminHeader>
        <DashContent>
          <LoadingBox>
            <LoadingContent>
              <SpinnerEl />
              <BodyText>{t.loading}</BodyText>
            </LoadingContent>
          </LoadingBox>
        </DashContent>
      </PageBg>
    );
  }

  return (
    <PageBg>
      <AdminHeader>
        <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 32 }} />
        <HeaderActionsRow>
          <LangDrawer />
          <OutlineButton onClick={handleLogout}>{t.logout}</OutlineButton>
        </HeaderActionsRow>
      </AdminHeader>

      <DashContent>
        {/* ── Main Tabs ── */}
        <DashTabBar>
          {visibleTabs.map((tab) => (
            <DashTab key={tab.key} active={activeTab === tab.key} onClick={() => {
              setActiveTab(tab.key);
              setSearchParams({});
            }}>
              {tab.label}
            </DashTab>
          ))}
        </DashTabBar>

        {/* ── Activities Tab ── */}
        {activeTab === 'activities' && (
          <ActivitiesSection activities={activities} navigate={navigate} t={t} />
        )}

        {/* ── Statistics Tab ── */}
        {activeTab === 'statistics' && (role === 'admin' || role === 'super_admin') && (
          <AdminStatisticsTab activities={activities} initialActivityId={initialActivityId} />
        )}

        {/* ── Stations Tab (stations + games + missions) ── */}
        {activeTab === 'stations' && (
          <>
            <SegmentedControlCenter>
              <SegmentedControl>
                <SegmentedButton active={stationsSection === 'stations'} onClick={() => setStationsSection('stations')}>
                  {t.sectionStations}
                </SegmentedButton>
                <SegmentedButton active={stationsSection === 'games'} onClick={() => setStationsSection('games')}>
                  {t.sectionGames}
                </SegmentedButton>
                <SegmentedButton active={stationsSection === 'missions'} onClick={() => setStationsSection('missions')}>
                  {t.sectionMissions}
                </SegmentedButton>
                <SegmentedButton active={stationsSection === 'collage'} onClick={() => setStationsSection('collage')}>
                  {t.sectionCollage}
                </SegmentedButton>
                <SegmentedButton active={stationsSection === 'feedback'} onClick={() => setStationsSection('feedback')}>
                  {t.sectionFeedback}
                </SegmentedButton>
              </SegmentedControl>
            </SegmentedControlCenter>

            {stationsSection === 'stations' && (
              <AdminStationsTab stations={stations.filter((s) => s.type !== 'collage' && s.type !== 'feedback')} onRefresh={refreshStations} />
            )}

            {stationsSection === 'games' && (
              <>
                <GameTabBar>
                  <GameTabGroup>
                    <GameTab active={gameSubTab === 'order'} onClick={() => setGameSubTab('order')}>
                      {t.subTabOrder}
                    </GameTab>
                    <GameTab active={gameSubTab === 'trivia'} onClick={() => setGameSubTab('trivia')}>
                      {t.subTabTrivia}
                    </GameTab>
                    <GameTab active={gameSubTab === 'puzzle'} onClick={() => setGameSubTab('puzzle')}>
                      {t.subTabPuzzle}
                    </GameTab>
                    <GameTab active={gameSubTab === 'trueFalse'} onClick={() => setGameSubTab('trueFalse')}>
                      {t.subTabTrueFalse}
                    </GameTab>
                    <GameTab active={gameSubTab === 'ballGame'} onClick={() => setGameSubTab('ballGame')}>
                      {t.subTabBallGame}
                    </GameTab>
                  </GameTabGroup>
                </GameTabBar>

                <AdminGamesTab
                  games={games}
                  gameType={gameSubTab}
                  title={{
                    order: t.subTabOrder,
                    trivia: t.subTabTrivia,
                    puzzle: t.subTabPuzzle,
                    trueFalse: t.subTabTrueFalse,
                    ballGame: t.subTabBallGame,
                  }[gameSubTab]}
                  onRefresh={refreshGames}
                />
              </>
            )}

            {stationsSection === 'missions' && (
              <MissionsSection missions={missions} navigate={navigate} t={t} />
            )}

            {stationsSection === 'collage' && (
              <AdminStationsTab
                stations={stations.filter((s) => s.type === 'collage')}
                onRefresh={refreshStations}
                defaultType="collage"
              />
            )}

            {stationsSection === 'feedback' && (
              <AdminStationsTab
                stations={stations.filter((s) => s.type === 'feedback')}
                onRefresh={refreshStations}
                defaultType="feedback"
              />
            )}
          </>
        )}

        {/* ── Portals Tab ── */}
        {activeTab === 'portals' && (
          <AdminPortalsTab portals={portals} onRefresh={refreshPortals} />
        )}

        {/* ── Content Library Tab ── */}
        {activeTab === 'library' && (
          <AdminLibraryTab />
        )}

        {/* ── Users Tab (super_admin only) ── */}
        {activeTab === 'users' && role === 'super_admin' && (
          <AdminUsersTab />
        )}
      </DashContent>
    </PageBg>
  );
}

// ─── Activities sub-section with pagination ───

function ActivitiesSection({ activities, navigate, t }: { activities: Activity[]; navigate: ReturnType<typeof useNavigate>; t: Record<string, string> }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return activities;
    const q = search.trim().toLowerCase();
    return activities.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      (a.createdByEmail || '').toLowerCase().includes(q)
    );
  }, [activities, search]);

  const { page, setPage, totalPages, pageItems, totalItems, showing } = usePagination(filtered);

  return (
    <>
      <SectionHeaderRow>
        <PageTitleNoMargin>{t.title}</PageTitleNoMargin>
        <SmallActionButton onClick={() => navigate('/admin/activities/new')}>
          + {t.createNew}
        </SmallActionButton>
      </SectionHeaderRow>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#bbb', fontSize: 15, pointerEvents: 'none' }}>🔍</span>
        <input
          type="text"
          placeholder={t.searchActivities || 'Search name or customer...'}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{
            width: '100%',
            padding: '10px 40px 10px 16px',
            borderRadius: 10,
            border: '1.5px solid #e8e8ec',
            fontSize: 14,
            fontFamily: 'inherit',
            background: '#fff',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            outline: 'none',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#6c5ce7'; e.target.style.boxShadow = '0 0 0 3px rgba(108,92,231,0.08)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#e8e8ec'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {activities.length === 0 ? (
        <TableCard style={{ padding: 32 }}>
          <EmptyText>{t.noActivities}</EmptyText>
        </TableCard>
      ) : (
        <>
          <DesktopOnlyDiv>
            <TableCard>
              <DashTable>
                <thead>
                  <tr>
                    <th>{t.name}</th>
                    <th>{t.code}</th>
                    <th>{t.status}</th>
                    <th>{t.typeModule}</th>
                    <th>{t.customer}</th>
                    <th>{t.created}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((activity) => (
                    <tr key={activity._id} onClick={() => navigate(`/admin/activities/${activity._id}`)}>
                      <td>
                        <NameCell>
                          <NameMain>{activity.name}</NameMain>
                          <NameSub>{activity.code}</NameSub>
                        </NameCell>
                      </td>
                      <td><code style={{ color: '#666' }}>{activity.code}</code></td>
                      <td>
                        <StatusBadge status={activity.status}>
                          {activity.status === 'live' ? t.live : t.preview}
                        </StatusBadge>
                      </td>
                      <td>
                        <BadgeGroup>
                          <IconBadge variant="blue">{activity.connectionType}</IconBadge>
                          {activity.module && (
                            <IconBadge variant="purple">{activity.module.type}</IconBadge>
                          )}
                        </BadgeGroup>
                      </td>
                      <td style={{ color: '#888', fontSize: 13 }}>
                        {activity.createdByEmail || '—'}
                      </td>
                      <td>
                        <DateCell>{new Date(activity.createdAt).toLocaleDateString()}</DateCell>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DashTable>
            </TableCard>
          </DesktopOnlyDiv>

          <MobileOnlyDiv>
            <MobileList>
              {pageItems.map((activity) => (
                <MobileCard key={activity._id} onClick={() => navigate(`/admin/activities/${activity._id}`)}>
                  <MobileCardHeader>
                    <MobileCardNameLarge>{activity.name}</MobileCardNameLarge>
                    <StatusBadge status={activity.status}>
                      {activity.status === 'live' ? t.live : t.preview}
                    </StatusBadge>
                  </MobileCardHeader>
                  <MobileCardDetails>
                    <MobileCardCode>{activity.code}</MobileCardCode>
                    <IconBadge variant="blue">{activity.connectionType}</IconBadge>
                    {activity.module && (
                      <IconBadge variant="purple">{activity.module.type}</IconBadge>
                    )}
                    {activity.createdByEmail && (
                      <span style={{ color: '#888', fontSize: 12 }}>{activity.createdByEmail}</span>
                    )}
                    <MobileCardDate>{new Date(activity.createdAt).toLocaleDateString()}</MobileCardDate>
                  </MobileCardDetails>
                </MobileCard>
              ))}
            </MobileList>
          </MobileOnlyDiv>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={showing} totalItems={totalItems} />
        </>
      )}
    </>
  );
}

// ─── Missions sub-section with pagination ───

function MissionsSection({ missions, navigate, t }: { missions: Mission[]; navigate: ReturnType<typeof useNavigate>; t: Record<string, string> }) {
  const { page, setPage, totalPages, pageItems, totalItems, showing } = usePagination(missions);

  return (
    <>
      <SectionHeaderRow>
        <PageTitleNoMargin>{t.missionsTitle}</PageTitleNoMargin>
        <SmallActionButton onClick={() => navigate('/admin/missions/new')}>
          {t.newMission}
        </SmallActionButton>
      </SectionHeaderRow>

      {missions.length === 0 ? (
        <TableCard style={{ padding: 32 }}>
          <EmptyText>{t.noMissions}</EmptyText>
        </TableCard>
      ) : (
        <>
          <DesktopOnlyDiv>
            <TableCard>
              <DashTable>
                <thead>
                  <tr>
                    <th>{t.name}</th>
                    <th>{t.missionScreens}</th>
                    <th>{t.missionCustomer}</th>
                    <th>{t.created}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((m) => (
                    <tr key={m._id} onClick={() => navigate(`/admin/missions/${m._id}`)} style={{ cursor: 'pointer' }}>
                      <td><CellBold>{m.name}</CellBold></td>
                      <td>
                        <IconBadge variant="purple">
                          {m.explanationScreens?.length || 0} {t.missionScreens}
                        </IconBadge>
                      </td>
                      <td><CellMuted>{m.customer || '—'}</CellMuted></td>
                      <td>
                        <DateCell>{new Date(m.createdAt).toLocaleDateString()}</DateCell>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DashTable>
            </TableCard>
          </DesktopOnlyDiv>
          <MobileOnlyDiv>
            <MobileList>
              {pageItems.map((m) => (
                <MobileCard key={m._id} onClick={() => navigate(`/admin/missions/${m._id}`)}>
                  <MobileCardHeader>
                    <MobileCardNameLarge>{m.name}</MobileCardNameLarge>
                    <IconBadge variant="purple">
                      {m.explanationScreens?.length || 0} {t.missionScreens}
                    </IconBadge>
                  </MobileCardHeader>
                  <MobileCardDetails>
                    <MobileCardDate>{new Date(m.createdAt).toLocaleDateString()}</MobileCardDate>
                  </MobileCardDetails>
                </MobileCard>
              ))}
            </MobileList>
          </MobileOnlyDiv>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={showing} totalItems={totalItems} />
        </>
      )}
    </>
  );
}
