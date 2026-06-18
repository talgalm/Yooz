import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
import AdminTutorialsTab from '../AdminTutorialsTab';
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
  overflowX: 'hidden',
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
    display: 'none',
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
}));

// ─── Mobile tab header (hamburger) ───

const MobileTabHeader = styled('div')({
  display: 'none',
  '@media (max-width: 600px)': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderBottom: '3px solid #c9bfe0',
    marginBottom: 20,
    paddingBottom: 12,
    position: 'relative',
  },
});

const MobileHamburgerBtn = styled('button')({
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px 6px',
  borderRadius: 8,
  '&:active': { background: 'rgba(108,92,231,0.08)' },
  '& span': {
    display: 'block',
    width: 22,
    height: 2.5,
    borderRadius: 2,
    background: '#6c5ce7',
    transition: 'all 0.2s',
  },
});

const MobileTabDropdown = styled('div')<{ open: boolean }>(({ open }) => ({
  display: open ? 'block' : 'none',
  position: 'absolute',
  top: '100%',
  right: 0,
  zIndex: 300,
  background: '#fff',
  border: '1px solid #e0d8f0',
  borderRadius: 14,
  boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
  minWidth: 160,
  overflow: 'hidden',
  marginTop: 8,
}));

const MobileTabItem = styled('button')<{ active?: boolean }>(({ active }) => ({
  display: 'block',
  width: '100%',
  padding: '14px 20px',
  textAlign: 'right',
  background: active ? 'rgba(108,92,231,0.07)' : 'none',
  color: active ? '#6c5ce7' : '#333',
  fontWeight: active ? 700 : 500,
  fontSize: 15,
  border: 'none',
  borderBottom: '1px solid #f0ecfa',
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:last-child': { borderBottom: 'none' },
  '&:active': { background: 'rgba(108,92,231,0.1)' },
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

// ─── Row action menu (matches AdminStationsTab) ───

const RowActionWrapper = styled('div')({
  position: 'relative',
  display: 'inline-flex',
});

const RowActionIconButton = styled('button')({
  background: 'transparent',
  border: '1.5px solid #d8d2e6',
  borderRadius: 10,
  width: 36,
  height: 36,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#555',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
  '&:hover': {
    borderColor: '#6c5ce7',
    color: '#6c5ce7',
    background: '#f5f3ff',
  },
});

const RowActionMenu = styled('div')({
  position: 'absolute',
  top: '100%',
  insetInlineEnd: 0,
  zIndex: 300,
  background: '#fff',
  border: '1px solid #e0d8f0',
  borderRadius: 14,
  boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
  minWidth: 160,
  overflow: 'hidden',
  marginTop: 8,
});

const RowActionMenuItem = styled('button')<{ danger?: boolean; confirm?: boolean }>(({ danger, confirm }) => ({
  display: 'block',
  width: '100%',
  padding: '14px 20px',
  textAlign: 'start',
  background: confirm ? '#c62828' : 'none',
  color: confirm ? '#fff' : danger ? '#c62828' : '#333',
  fontWeight: confirm ? 700 : 500,
  fontSize: 15,
  border: 'none',
  borderBottom: '1px solid #f0ecfa',
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  '&:last-child': { borderBottom: 'none' },
  '&:active': { background: confirm ? '#a01818' : 'rgba(108,92,231,0.1)' },
  '&:hover': {
    background: confirm ? '#a01818' : danger ? 'rgba(198,40,40,0.07)' : 'rgba(108,92,231,0.07)',
  },
  '&:disabled': { opacity: 0.6, cursor: 'default' },
}));

const RowActionsCell = styled('td')({
  textAlign: 'end',
  whiteSpace: 'nowrap',
});

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

// ─── Create Modal styled components ───

const ModalOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  zIndex: 1200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
});

const ModalCard = styled('div')({
  background: '#fff',
  borderRadius: 20,
  padding: '28px 28px 32px',
  width: '100%',
  maxWidth: 480,
  boxShadow: '0 12px 48px rgba(0,0,0,0.22)',
  direction: 'rtl',
});

const ModalHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 24,
});

const ModalTitle = styled('h2')({
  margin: 0,
  fontSize: 20,
  fontWeight: 700,
  color: '#222',
  fontFamily: 'inherit',
});

const ModalCloseBtn = styled('button')({
  background: 'none',
  border: 'none',
  fontSize: 22,
  cursor: 'pointer',
  color: '#aaa',
  lineHeight: 1,
  padding: '2px 6px',
  borderRadius: 6,
  fontFamily: 'inherit',
  '&:hover': { color: '#555', background: '#f5f5f5' },
});

const ModalBackBtn = styled('button')({
  background: 'none',
  border: 'none',
  fontSize: 14,
  cursor: 'pointer',
  color: '#6c5ce7',
  fontWeight: 600,
  fontFamily: 'inherit',
  padding: '0 4px',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  '&:hover': { textDecoration: 'underline' },
});

const ModalSubtitle = styled('div')({
  fontSize: 14,
  color: '#888',
  marginBottom: 20,
  marginTop: -12,
});

const CreateGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
});

const CreateTile = styled('button')<{ accent?: string }>(({ accent = '#6c5ce7' }) => ({
  background: '#fafafe',
  border: `2px solid #e8e8ec`,
  borderRadius: 14,
  padding: '20px 16px 16px',
  cursor: 'pointer',
  textAlign: 'right',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  transition: 'all 0.15s',
  fontFamily: 'inherit',
  '&:hover': {
    borderColor: accent,
    background: `${accent}10`,
    transform: 'translateY(-2px)',
    boxShadow: `0 4px 16px ${accent}22`,
  },
}));

const TileEmoji = styled('span')({
  fontSize: 28,
  lineHeight: 1,
});

const TileName = styled('span')({
  fontSize: 15,
  fontWeight: 700,
  color: '#222',
});

const TileDesc = styled('span')({
  fontSize: 12,
  color: '#888',
  lineHeight: 1.3,
});

const TypeGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
});

const TypeTile = styled('button')({
  background: '#fafafe',
  border: '2px solid #e8e8ec',
  borderRadius: 12,
  padding: '16px 14px',
  cursor: 'pointer',
  textAlign: 'right',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  transition: 'all 0.15s',
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 600,
  color: '#333',
  '&:hover': {
    borderColor: '#6c5ce7',
    background: '#f5f0ff',
    color: '#6c5ce7',
  },
});

const TypeTileEmoji = styled('span')({
  fontSize: 22,
  flexShrink: 0,
});

// ─── Types ───

type MainTab = 'activities' | 'statistics' | 'stations' | 'library' | 'users' | 'portals' | 'tutorials';
type StationsSection = 'stations' | 'games' | 'missions';
type GameSubTab = 'all' | 'order' | 'trivia' | 'puzzle' | 'trueFalse' | 'ballGame';
type CreateStep = 'main' | 'game' | 'station';

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
  type?: 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage' | 'feedback' | 'riddle' | 'avatar' | 'enteringText';
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
  const location = useLocation();
  const initialTab = (searchParams.get('tab') as MainTab) || 'activities';
  const initialActivityId = searchParams.get('activityId');

  const [activities, setActivities] = useState<Activity[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [activeTab, setActiveTab] = useState<MainTab>(
    ['activities', 'statistics', 'stations', 'library', 'users', 'portals', 'tutorials'].includes(initialTab) ? initialTab : 'activities'
  );
  const [stationsSection, setStationsSection] = useState<StationsSection>('stations');
  const [gameSubTab, setGameSubTab] = useState<GameSubTab>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>('main');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { logout, admin } = useAdminAuth();
  const navigate = useNavigate();
  const t = useTranslations(texts);

  const role = admin?.role || 'viewer';

  const visibleTabs = useMemo(() => {
    const tabs: { key: MainTab; label: string }[] = [
      { key: 'activities', label: t.tabActivities },
    ];
    if (role === 'admin' || role === 'super_admin' || role === 'customer') {
      tabs.push({ key: 'statistics', label: t.tabStatistics });
    }
    tabs.push({ key: 'stations', label: t.tabStations });
    tabs.push({ key: 'library', label: t.tabLibrary });
    tabs.push({ key: 'portals', label: t.tabPortals });
    if (role === 'super_admin') {
      tabs.push({ key: 'users', label: t.tabUsers });
      tabs.push({ key: 'tutorials', label: t.tabTutorials });
    }
    return tabs;
  }, [role, t]);

  const visibleTabKeys = useMemo(() => visibleTabs.map((tab) => tab.key), [visibleTabs]);

  useEffect(() => {
    if (!visibleTabKeys.includes(activeTab)) {
      setActiveTab('activities');
    }
  }, [visibleTabKeys, activeTab]);

  // Sync tab from URL when navigating back to this page (e.g. after creating a game/station)
  useEffect(() => {
    const tab = searchParams.get('tab') as MainTab | null;
    if (tab && visibleTabKeys.includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

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
        {/* ── Main Tabs — desktop ── */}
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

        {/* ── Main Tabs — mobile hamburger ── */}
        <MobileTabHeader>
          <div style={{ position: 'relative' }}>
            <MobileHamburgerBtn
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="פתח תפריט"
            >
              <span /><span /><span />
            </MobileHamburgerBtn>
            <MobileTabDropdown open={mobileMenuOpen}>
              {visibleTabs.map((tab) => (
                <MobileTabItem
                  key={tab.key}
                  active={activeTab === tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSearchParams({});
                    setMobileMenuOpen(false);
                  }}
                >
                  {tab.label}
                </MobileTabItem>
              ))}
            </MobileTabDropdown>
          </div>
        </MobileTabHeader>

        {/* ── Activities Tab ── */}
        {activeTab === 'activities' && (
          <ActivitiesSection activities={activities} navigate={navigate} t={t} onRefresh={fetchAll} />
        )}

        {/* ── Statistics Tab ── */}
        {activeTab === 'statistics' && (role === 'admin' || role === 'super_admin') && (
          <AdminStatisticsTab activities={activities} initialActivityId={initialActivityId} />
        )}

        {/* ── Stations Tab (stations + games + missions) ── */}
        {activeTab === 'stations' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button
                onClick={() => { setCreateStep('main'); setCreateModalOpen(true); }}
                style={{
                  background: 'linear-gradient(135deg, #6c5ce7 0%, #8B2FC9 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 22px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 2px 8px rgba(108,92,231,0.3)',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                {t.createButtonLabel}
              </button>
            </div>

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
              <AdminStationsTab stations={stations} onRefresh={refreshStations} hideCreateButton />
            )}

            {stationsSection === 'games' && (
              <>
                <GameTabBar>
                  <GameTabGroup>
                    <GameTab active={gameSubTab === 'all'} onClick={() => setGameSubTab('all')}>
                      {t.subTabAll}
                    </GameTab>
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
                  title={({
                    all: t.subTabAll,
                    order: t.subTabOrder,
                    trivia: t.subTabTrivia,
                    puzzle: t.subTabPuzzle,
                    trueFalse: t.subTabTrueFalse,
                    ballGame: t.subTabBallGame,
                  } as Record<string, string>)[gameSubTab] ?? t.subTabAll}
                  onRefresh={refreshGames}
                  hideCreateButton
                />
              </>
            )}

            {stationsSection === 'missions' && (
              <MissionsSection missions={missions} navigate={navigate} t={t} />
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

        {/* ── Tutorials Tab (super_admin only) ── */}
        {activeTab === 'tutorials' && role === 'super_admin' && (
          <AdminTutorialsTab />
        )}
      </DashContent>

      {/* ── Create Modal ── */}
      {createModalOpen && (
        <ModalOverlay onClick={() => setCreateModalOpen(false)}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {createStep !== 'main' && (
                  <ModalBackBtn type="button" onClick={() => setCreateStep('main')}>
                    ← {t.createBack}
                  </ModalBackBtn>
                )}
                <ModalTitle>
                  {createStep === 'main' && t.createModalTitle}
                  {createStep === 'game' && t.createChooseGameType}
                  {createStep === 'station' && t.createChooseStationType}
                </ModalTitle>
              </div>
              <ModalCloseBtn type="button" onClick={() => setCreateModalOpen(false)}>×</ModalCloseBtn>
            </ModalHeader>

            {createStep === 'main' && (
              <CreateGrid>
                <CreateTile accent="#6c5ce7" onClick={() => setCreateStep('game')}>
                  <TileEmoji>🎮</TileEmoji>
                  <TileName>{t.createGame}</TileName>
                  <TileDesc>{t.createGameDesc}</TileDesc>
                </CreateTile>
                <CreateTile accent="#2e7d32" onClick={() => setCreateStep('station')}>
                  <TileEmoji>📍</TileEmoji>
                  <TileName>{t.createStation}</TileName>
                  <TileDesc>{t.createStationDesc}</TileDesc>
                </CreateTile>
                <CreateTile accent="#c0392b" onClick={() => { setCreateModalOpen(false); navigate('/admin/stations/new?type=collage'); }}>
                  <TileEmoji>🖼️</TileEmoji>
                  <TileName>{t.createCollage}</TileName>
                  <TileDesc>{t.createCollageDesc}</TileDesc>
                </CreateTile>
                <CreateTile accent="#e67e22" onClick={() => { setCreateModalOpen(false); navigate('/admin/stations/new?type=feedback'); }}>
                  <TileEmoji>📝</TileEmoji>
                  <TileName>{t.createFeedback}</TileName>
                  <TileDesc>{t.createFeedbackDesc}</TileDesc>
                </CreateTile>
              </CreateGrid>
            )}

            {createStep === 'game' && (
              <TypeGrid>
                {[
                  { type: 'order', emoji: '🔢', label: t.createTypeOrder },
                  { type: 'trivia', emoji: '❓', label: t.createTypeTrivia },
                  { type: 'puzzle', emoji: '🧩', label: t.createTypePuzzle },
                  { type: 'trueFalse', emoji: '✅', label: t.createTypeTrueFalse },
                  { type: 'ballGame', emoji: '🏀', label: t.createTypeBallGame },
                ].map(({ type, emoji, label }) => (
                  <TypeTile
                    key={type}
                    onClick={() => { setCreateModalOpen(false); navigate(`/admin/games/new?type=${type}`); }}
                  >
                    <TypeTileEmoji>{emoji}</TypeTileEmoji>
                    {label}
                  </TypeTile>
                ))}
              </TypeGrid>
            )}

            {createStep === 'station' && (
              <TypeGrid>
                {[
                  { type: 'text', emoji: '📝', label: t.createTypeText },
                  { type: 'video', emoji: '🎬', label: t.createTypeVideo },
                  { type: 'image', emoji: '🖼️', label: t.createTypeImage },
                  { type: 'riddle', emoji: '🔤', label: t.createTypeRiddle },
                  { type: 'avatar', emoji: '🕵️', label: t.createTypeAvatar },
                  { type: 'enteringText', emoji: '⌨️', label: t.createTypeEnteringText },
                ].map(({ type, emoji, label }) => (
                  <TypeTile
                    key={type}
                    onClick={() => { setCreateModalOpen(false); navigate(`/admin/stations/new?type=${type}`); }}
                  >
                    <TypeTileEmoji>{emoji}</TypeTileEmoji>
                    {label}
                  </TypeTile>
                ))}
              </TypeGrid>
            )}
          </ModalCard>
        </ModalOverlay>
      )}
    </PageBg>
  );
}

// ─── Activities sub-section with pagination ───

function ActivitiesSection({ activities, navigate, t, onRefresh }: { activities: Activity[]; navigate: ReturnType<typeof useNavigate>; t: Record<string, string>; onRefresh: () => void }) {
  const [search, setSearch] = useState('');
  const [actionsActivityId, setActionsActivityId] = useState<string | null>(null);
  const [confirmDeleteInDrawer, setConfirmDeleteInDrawer] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openActions = (id: string) => {
    setActionsActivityId(id);
    setConfirmDeleteInDrawer(false);
  };

  const closeActions = () => {
    setActionsActivityId(null);
    setConfirmDeleteInDrawer(false);
  };

  const handleDuplicateFromDrawer = async () => {
    if (!actionsActivityId || duplicatingId) return;
    const id = actionsActivityId;
    setDuplicatingId(id);
    try {
      const data = await adminApiFetch<{ activity: Activity }>(`/api/admin/activities/${id}/duplicate`, { method: 'POST' });
      closeActions();
      if (data?.activity?._id) {
        navigate(`/admin/activities/${data.activity._id}`);
      } else {
        onRefresh();
      }
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDeleteFromDrawer = async () => {
    if (!actionsActivityId) return;
    if (!confirmDeleteInDrawer) {
      setConfirmDeleteInDrawer(true);
      return;
    }
    const id = actionsActivityId;
    setDeletingId(id);
    try {
      await adminApiFetch(`/api/admin/activities/${id}`, { method: 'DELETE' });
      closeActions();
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!actionsActivityId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeActions();
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-row-actions]')) return;
      closeActions();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [actionsActivityId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return activities;
    const q = search.trim().toLowerCase();
    return activities.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      (a.createdByEmail || '').toLowerCase().includes(q) ||
      (a.code || '').toLowerCase().includes(q)
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
          placeholder={t.searchActivities || 'Search name, customer, or code...'}
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
                    <th />
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
                      <RowActionsCell>
                        <RowActionWrapper data-row-actions onClick={(e) => e.stopPropagation()}>
                          <RowActionIconButton
                            type="button"
                            aria-label={t.actions}
                            title={t.actions}
                            onClick={() => actionsActivityId === activity._id ? closeActions() : openActions(activity._id)}
                          >
                            <PencilIcon />
                          </RowActionIconButton>
                          {actionsActivityId === activity._id && (
                            <RowActionMenu>
                              <RowActionMenuItem
                                type="button"
                                disabled={duplicatingId === activity._id || deletingId === activity._id}
                                onClick={handleDuplicateFromDrawer}
                              >
                                {duplicatingId === activity._id ? t.duplicating : t.duplicate}
                              </RowActionMenuItem>
                              <RowActionMenuItem
                                type="button"
                                danger
                                confirm={confirmDeleteInDrawer}
                                disabled={duplicatingId === activity._id || deletingId === activity._id}
                                onClick={handleDeleteFromDrawer}
                              >
                                {confirmDeleteInDrawer ? t.confirmDelete : t.delete}
                              </RowActionMenuItem>
                            </RowActionMenu>
                          )}
                        </RowActionWrapper>
                      </RowActionsCell>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                      <MobileCardNameLarge>{activity.name}</MobileCardNameLarge>
                      <StatusBadge status={activity.status}>
                        {activity.status === 'live' ? t.live : t.preview}
                      </StatusBadge>
                    </div>
                    <RowActionWrapper data-row-actions onClick={(e) => e.stopPropagation()}>
                      <RowActionIconButton
                        type="button"
                        aria-label={t.actions}
                        title={t.actions}
                        onClick={() => actionsActivityId === activity._id ? closeActions() : openActions(activity._id)}
                      >
                        <PencilIcon />
                      </RowActionIconButton>
                      {actionsActivityId === activity._id && (
                        <RowActionMenu>
                          <RowActionMenuItem
                            type="button"
                            disabled={duplicatingId === activity._id || deletingId === activity._id}
                            onClick={handleDuplicateFromDrawer}
                          >
                            {duplicatingId === activity._id ? t.duplicating : t.duplicate}
                          </RowActionMenuItem>
                          <RowActionMenuItem
                            type="button"
                            danger
                            confirm={confirmDeleteInDrawer}
                            disabled={duplicatingId === activity._id || deletingId === activity._id}
                            onClick={handleDeleteFromDrawer}
                          >
                            {confirmDeleteInDrawer ? t.confirmDelete : t.delete}
                          </RowActionMenuItem>
                        </RowActionMenu>
                      )}
                    </RowActionWrapper>
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
