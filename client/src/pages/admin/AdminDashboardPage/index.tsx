import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminDashboardPage.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import LangDrawer from '../../../components/LangDrawer';
import AdminGamesTab from '../AdminGamesTab';
import AdminStationsTab from '../AdminStationsTab';
import AdminStatisticsTab from '../AdminStatisticsTab';
import AdminUsersTab from '../AdminUsersTab';
import {
  AdminPage,
  AdminHeader,
  AdminContent,
  Table,
  OutlineButton,
  BodyText,
  Badge,
  StatusBadge,
  TabBar,
  Tab,
  SegmentedControl,
  SegmentedControlCenter,
  SegmentedButton,
  GameTabBar,
  GameTabGroup,
  GameTab,
  DesktopOnly,
  HideOnDesktop,
  MobileCardList,
  MobileCardItem,
} from '../../../components/styled';
import {
  SectionHeaderRow,
  PageTitleNoMargin,
  SmallActionButton,
  EmptyText,
  AdminCardNoPadding,
  CellBold,
  CellMuted,
  HeaderActionsRow,
  LoadingContainer,
  LoadingCenter,
  Spinner,
  SpinKeyframe,
  MobileCardHeader,
  MobileCardNameLarge,
  MobileCardDetails,
  MobileCardDate,
  MobileCardCode,
} from '../styled';

type MainTab = 'activities' | 'statistics' | 'stations' | 'users';
type StationsSection = 'stations' | 'games' | 'missions';
type GameSubTab = 'order' | 'trivia' | 'puzzle' | 'trueFalse' | 'ballGame' | 'trashSort';

interface Activity {
  _id: string;
  code: string;
  name: string;
  status: 'preview' | 'live';
  connectionType: string;
  module?: { type: string };
  createdAt: number;
}

export interface Game {
  _id: string;
  name: string;
  type: string;
  description?: string;
  customer?: string;
  theme?: string;
  createdAt: string;
}

export interface Station {
  _id: string;
  name: string;
  type?: 'text' | 'video' | 'image';
  description?: string;
  customer?: string;
  theme?: string;
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [activeTab, setActiveTab] = useState<MainTab>('activities');
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
    if (role === 'super_admin') {
      tabs.push({ key: 'users', label: t.tabUsers });
    }
    return tabs;
  }, [role, t]);

  const fetchAll = useCallback(async () => {
    try {
      const [activitiesRes, gamesRes, stationsRes, missionsRes] = await Promise.all([
        adminApiFetch<{ activities: Activity[] }>('/api/admin/activities'),
        adminApiFetch<{ games: Game[] }>('/api/admin/games'),
        adminApiFetch<{ stations: Station[] }>('/api/admin/stations'),
        adminApiFetch<{ missions: Mission[] }>('/api/admin/missions'),
      ]);
      setActivities(activitiesRes.activities);
      setGames(gamesRes.games);
      setStations(stationsRes.stations);
      setMissions(missionsRes.missions);
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

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
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
          <OutlineButton onClick={handleLogout}>{t.logout}</OutlineButton>
        </HeaderActionsRow>
      </AdminHeader>
      <AdminContent>
        {/* ── Main Tabs ── */}
        <TabBar>
          {visibleTabs.map((tab) => (
            <Tab key={tab.key} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </Tab>
          ))}
        </TabBar>

        {/* ── Activities Tab ── */}
        {activeTab === 'activities' && (
          <>
            <SectionHeaderRow>
              <PageTitleNoMargin>{t.title}</PageTitleNoMargin>
              <SmallActionButton onClick={() => navigate('/admin/activities/new')}>
                {t.createNew}
              </SmallActionButton>
            </SectionHeaderRow>

            {activities.length === 0 ? (
              <EmptyText>{t.noActivities}</EmptyText>
            ) : (
              <>
                {/* Desktop table */}
                <DesktopOnly>
                  <AdminCardNoPadding>
                    <Table>
                      <thead>
                        <tr>
                          <th>{t.name}</th>
                          <th>{t.code}</th>
                          <th>{t.status}</th>
                          <th>{t.type}</th>
                          <th>{t.module}</th>
                          <th>{t.created}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activities.map((activity) => (
                          <tr key={activity._id} onClick={() => navigate(`/admin/activities/${activity._id}`)}>
                            <td><CellBold>{activity.name}</CellBold></td>
                            <td><code>{activity.code}</code></td>
                            <td><StatusBadge status={activity.status}>{activity.status === 'live' ? t.live : t.preview}</StatusBadge></td>
                            <td><Badge>{activity.connectionType}</Badge></td>
                            <td>{activity.module ? <Badge>{activity.module.type}</Badge> : '—'}</td>
                            <td><CellMuted>{new Date(activity.createdAt).toLocaleDateString()}</CellMuted></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </AdminCardNoPadding>
                </DesktopOnly>

                {/* Mobile cards */}
                <HideOnDesktop>
                  <MobileCardList>
                    {activities.map((activity) => (
                      <MobileCardItem key={activity._id} onClick={() => navigate(`/admin/activities/${activity._id}`)}>
                        <MobileCardHeader>
                          <MobileCardNameLarge>{activity.name}</MobileCardNameLarge>
                          <StatusBadge status={activity.status}>{activity.status === 'live' ? t.live : t.preview}</StatusBadge>
                        </MobileCardHeader>
                        <MobileCardDetails>
                          <MobileCardCode>{activity.code}</MobileCardCode>
                          <Badge>{activity.connectionType}</Badge>
                          {activity.module && <Badge>{activity.module.type}</Badge>}
                          <MobileCardDate>{new Date(activity.createdAt).toLocaleDateString()}</MobileCardDate>
                        </MobileCardDetails>
                      </MobileCardItem>
                    ))}
                  </MobileCardList>
                </HideOnDesktop>
              </>
            )}
          </>
        )}

        {/* ── Statistics Tab ── */}
        {activeTab === 'statistics' && (role === 'admin' || role === 'super_admin') && (
          <AdminStatisticsTab activities={activities} />
        )}

        {/* ── Stations Tab (stations + games) ── */}
        {activeTab === 'stations' && (
          <>
            {/* Segmented control: Stations / Games */}
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
              </SegmentedControl>
            </SegmentedControlCenter>

            {stationsSection === 'stations' && (
              <AdminStationsTab stations={stations} onRefresh={refreshStations} />
            )}

            {stationsSection === 'games' && (
              <>
                {/* Game type sub-tabs */}
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
                    <GameTab active={gameSubTab === 'trashSort'} onClick={() => setGameSubTab('trashSort')}>
                      {t.subTabTrashSort}
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
                    trashSort: t.subTabTrashSort,
                  }[gameSubTab]}
                  onRefresh={refreshGames}
                />
              </>
            )}

            {stationsSection === 'missions' && (
              <>
                <SectionHeaderRow>
                  <PageTitleNoMargin>{t.missionsTitle}</PageTitleNoMargin>
                </SectionHeaderRow>

                {missions.length === 0 ? (
                  <EmptyText>{t.noMissions}</EmptyText>
                ) : (
                  <>
                    <DesktopOnly>
                      <AdminCardNoPadding>
                        <Table>
                          <thead>
                            <tr>
                              <th>{t.name}</th>
                              <th>{t.missionScreens}</th>
                              <th>{t.missionCustomer}</th>
                              <th>{t.created}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {missions.map((m) => (
                              <tr key={m._id}>
                                <td><CellBold>{m.name}</CellBold></td>
                                <td><Badge>{m.explanationScreens?.length || 0} {t.missionScreens}</Badge></td>
                                <td><CellMuted>{m.customer || '—'}</CellMuted></td>
                                <td><CellMuted>{new Date(m.createdAt).toLocaleDateString()}</CellMuted></td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </AdminCardNoPadding>
                    </DesktopOnly>
                    <HideOnDesktop>
                      <MobileCardList>
                        {missions.map((m) => (
                          <MobileCardItem key={m._id}>
                            <MobileCardHeader>
                              <MobileCardNameLarge>{m.name}</MobileCardNameLarge>
                              <Badge>{m.explanationScreens?.length || 0} {t.missionScreens}</Badge>
                            </MobileCardHeader>
                            <MobileCardDetails>
                              <MobileCardDate>{new Date(m.createdAt).toLocaleDateString()}</MobileCardDate>
                            </MobileCardDetails>
                          </MobileCardItem>
                        ))}
                      </MobileCardList>
                    </HideOnDesktop>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── Users Tab (super_admin only) ── */}
        {activeTab === 'users' && role === 'super_admin' && (
          <AdminUsersTab />
        )}
      </AdminContent>
    </AdminPage>
  );
}
