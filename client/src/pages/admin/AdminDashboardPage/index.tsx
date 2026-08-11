import { useState, useEffect, useCallback, useMemo, useRef, type CSSProperties } from 'react';
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
import AdminPublicityTab from '../AdminPublicityTab';
import type { Portal } from '../AdminPortalsTab';
import FolderFormModal from '../FolderFormModal';
import { resolveFolderColor, DEFAULT_FOLDER_COLOR } from '../folderColors';
import {
  AdminHeader,
  OutlineButton,
  BodyText,
  StatusBadge,
  SegmentedControl,
  SegmentedControlCenter,
  SegmentedButton,
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
  // position:fixed (coords set inline from the anchor button's rect) so the menu escapes
  // TableCard's overflow:hidden and is never clipped for bottom rows.
  position: 'fixed',
  zIndex: 1000,
  background: '#fff',
  border: '1px solid #e0d8f0',
  borderRadius: 14,
  boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
  minWidth: 160,
  maxHeight: '70vh',
  overflowY: 'auto',
  overflowX: 'hidden',
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

// ─── Folder styled components ───

const HeaderButtons = styled('div')({
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
});

const Breadcrumb = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 12,
  fontSize: 14,
  flexWrap: 'wrap',
});

const BreadcrumbLink = styled('button')<{ dragOver?: boolean }>(({ dragOver }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: dragOver ? '#efeafd' : 'transparent',
  border: dragOver ? '1.5px dashed #6c5ce7' : '1.5px solid transparent',
  color: '#6c5ce7',
  fontWeight: 600,
  fontSize: 14,
  fontFamily: 'inherit',
  cursor: 'pointer',
  padding: '6px 10px',
  borderRadius: 10,
  transition: 'background 0.15s',
  '&:hover': { background: '#f2effc' },
}));

const BreadcrumbCurrent = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontWeight: 700,
  color: '#333',
});

const BreadcrumbSep = styled('span')({
  color: '#bbb',
});

const FolderNameWrap = styled('div')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
  lineHeight: 1, // tighten the text line-box so it centers against the folder glyph
});

const DragGhost = styled('div')({
  position: 'fixed',
  zIndex: 2000,
  pointerEvents: 'none',
  transform: 'translate(-50%, -130%)',
  background: '#fff',
  border: '1.5px solid #6c5ce7',
  borderRadius: 10,
  padding: '8px 14px',
  fontSize: 14,
  fontWeight: 700,
  color: '#333',
  boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
  maxWidth: 260,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  touchAction: 'none',
});

// Draggable activity rows: suppress text-selection / iOS long-press callout so press-and-hold
// starts a clean drag, and dim the row while it is being lifted.
function dragRowStyle(dragging: boolean): CSSProperties {
  return {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    ...(dragging ? { opacity: 0.45 } : null),
  };
}

// Fixed-position coords for a row action menu, computed from its anchor button's viewport
// rect. Opens downward, flipping up when there isn't room below (so bottom rows aren't clipped).
const ACTION_MENU_EST_HEIGHT = 170;
function actionMenuStyle(rect: DOMRect | null): CSSProperties {
  if (!rect) return { visibility: 'hidden' };
  const openUp = rect.bottom + ACTION_MENU_EST_HEIGHT > window.innerHeight && rect.top > ACTION_MENU_EST_HEIGHT;
  return {
    left: rect.left,
    insetInlineEnd: 'auto',
    ...(openUp
      ? { bottom: window.innerHeight - rect.top + 6, top: 'auto' }
      : { top: rect.bottom + 6 }),
  };
}

function FolderGlyph({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
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

type MainTab = 'activities' | 'statistics' | 'stations' | 'library' | 'users' | 'portals' | 'tutorials' | 'publicity';
type StationsSection = 'stations' | 'games' | 'missions';
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
  folderId?: string | null;
}

interface Folder {
  _id: string;
  name: string;
  color: string;
  parentId?: string | null;
  createdByEmail?: string;
  order?: number;
  createdAt?: string;
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
  folderId?: string | null;
}

export interface Station {
  _id: string;
  name: string;
  type?: 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage' | 'feedback' | 'riddle' | 'avatar' | 'avatarQuiz' | 'enteringText';
  description?: string;
  customer?: string;
  theme?: string;
  tags?: string[];
  settings?: Record<string, unknown>;
  createdAt: string;
  folderId?: string | null;
}

export interface Mission {
  _id: string;
  name: string;
  description?: string;
  customer?: string;
  explanationScreens: { header: string; description: string; buttonText: string }[];
  createdAt: string;
  folderId?: string | null;
}

export default function AdminDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const initialTab = (searchParams.get('tab') as MainTab) || 'activities';
  const initialActivityId = searchParams.get('activityId');

  const [activities, setActivities] = useState<Activity[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [gameFolders, setGameFolders] = useState<Folder[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationFolders, setStationFolders] = useState<Folder[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [missionFolders, setMissionFolders] = useState<Folder[]>([]);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [activeTab, setActiveTab] = useState<MainTab>(
    ['activities', 'statistics', 'stations', 'library', 'users', 'portals', 'tutorials', 'publicity'].includes(initialTab) ? initialTab : 'activities'
  );
  const [stationsSection, setStationsSection] = useState<StationsSection>('stations');
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
    if (role === 'admin' || role === 'super_admin') {
      tabs.push({ key: 'publicity', label: t.tabPublicity });
    }
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
      const [activitiesRes, foldersRes, gamesRes, gameFoldersRes, stationsRes, stationFoldersRes, missionsRes, missionFoldersRes, portalsRes] = await Promise.all([
        adminApiFetch<{ activities: Activity[] }>('/api/admin/activities'),
        adminApiFetch<{ folders: Folder[] }>('/api/admin/activity-folders'),
        adminApiFetch<{ games: Game[] }>('/api/admin/games'),
        adminApiFetch<{ folders: Folder[] }>('/api/admin/game-folders'),
        adminApiFetch<{ stations: Station[] }>('/api/admin/stations'),
        adminApiFetch<{ folders: Folder[] }>('/api/admin/station-folders'),
        adminApiFetch<{ missions: Mission[] }>('/api/admin/missions'),
        adminApiFetch<{ folders: Folder[] }>('/api/admin/mission-folders'),
        adminApiFetch<{ portals: Portal[] }>('/api/admin/portals'),
      ]);
      setActivities(activitiesRes.activities);
      setFolders(foldersRes.folders);
      setGames(gamesRes.games);
      setGameFolders(gameFoldersRes.folders);
      setStations(stationsRes.stations);
      setStationFolders(stationFoldersRes.folders);
      setMissions(missionsRes.missions);
      setMissionFolders(missionFoldersRes.folders);
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
      const [gamesData, foldersData] = await Promise.all([
        adminApiFetch<{ games: Game[] }>('/api/admin/games'),
        adminApiFetch<{ folders: Folder[] }>('/api/admin/game-folders'),
      ]);
      setGames(gamesData.games);
      setGameFolders(foldersData.folders);
    } catch {}
  }, []);

  const refreshMissions = useCallback(async () => {
    try {
      const [missionsData, foldersData] = await Promise.all([
        adminApiFetch<{ missions: Mission[] }>('/api/admin/missions'),
        adminApiFetch<{ folders: Folder[] }>('/api/admin/mission-folders'),
      ]);
      setMissions(missionsData.missions);
      setMissionFolders(foldersData.folders);
    } catch {}
  }, []);

  const refreshStations = useCallback(async () => {
    try {
      const [stationsData, foldersData] = await Promise.all([
        adminApiFetch<{ stations: Station[] }>('/api/admin/stations'),
        adminApiFetch<{ folders: Folder[] }>('/api/admin/station-folders'),
      ]);
      setStations(stationsData.stations);
      setStationFolders(foldersData.folders);
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
          <ActivitiesSection activities={activities} folders={folders} navigate={navigate} t={t} onRefresh={fetchAll} />
        )}

        {/* ── Statistics Tab ── */}
        {activeTab === 'statistics' && (role === 'admin' || role === 'super_admin' || role === 'customer') && (
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
              <AdminStationsTab stations={stations} folders={stationFolders} onRefresh={refreshStations} hideCreateButton />
            )}

            {stationsSection === 'games' && (
              <AdminGamesTab
                games={games}
                folders={gameFolders}
                onRefresh={refreshGames}
                hideCreateButton
              />
            )}

            {stationsSection === 'missions' && (
              <MissionsSection missions={missions} folders={missionFolders} navigate={navigate} t={t} onRefresh={refreshMissions} />
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

        {/* ── Publicity Tab (admin + super_admin) ── */}
        {activeTab === 'publicity' && (role === 'admin' || role === 'super_admin') && (
          <AdminPublicityTab />
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
                  { type: 'avatarQuiz', emoji: '🎓', label: t.createTypeAvatarQuiz },
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

function ActivitiesSection({ activities, folders, navigate, t, onRefresh }: { activities: Activity[]; folders: Folder[]; navigate: ReturnType<typeof useNavigate>; t: Record<string, string>; onRefresh: () => void }) {
  const [search, setSearch] = useState('');
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  // activity action menu
  const [actionsActivityId, setActionsActivityId] = useState<string | null>(null);
  const [confirmDeleteInDrawer, setConfirmDeleteInDrawer] = useState(false);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // anchor rect of the currently-open row menu (for fixed positioning)
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);

  // folder action menu + modal
  const [actionsFolderId, setActionsFolderId] = useState<string | null>(null);
  const [confirmDeleteFolderId, setConfirmDeleteFolderId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [folderModal, setFolderModal] = useState<{ mode: 'create' | 'edit'; folder?: Folder } | null>(null);

  // drag-and-drop
  const [draggingActivityId, setDraggingActivityId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null); // folder _id, '__root__', or null
  const [touchGhost, setTouchGhost] = useState<{ name: string; x: number; y: number } | null>(null);
  const mouseDragIdRef = useRef<string | null>(null);
  const touchDragRef = useRef<{ activityId: string } | null>(null);
  const longPressRef = useRef<{ id: string; x: number; y: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const justDraggedRef = useRef(false);
  const dropTargetRefs = useRef<Map<string, HTMLElement>>(new Map());
  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;

  const closeActions = () => {
    setActionsActivityId(null);
    setConfirmDeleteInDrawer(false);
    setMoveMenuOpen(false);
  };
  const closeAllMenus = useCallback(() => {
    setActionsActivityId(null);
    setConfirmDeleteInDrawer(false);
    setMoveMenuOpen(false);
    setActionsFolderId(null);
    setConfirmDeleteFolderId(null);
  }, []);
  const openActivityActions = (id: string, rect: DOMRect) => { closeAllMenus(); setMenuAnchorRect(rect); setActionsActivityId(id); };
  const openFolderActions = (id: string, rect: DOMRect) => { closeAllMenus(); setMenuAnchorRect(rect); setActionsFolderId(id); };

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

  // Persist a folder move immediately (there is no surrounding save form on the dashboard).
  const moveActivityToFolder = useCallback(async (activityId: string, folderId: string | null) => {
    const current = activitiesRef.current.find((a) => a._id === activityId);
    if (!current) return;
    if ((current.folderId ?? null) === folderId) return; // already there — no-op
    try {
      await adminApiFetch(`/api/admin/activities/${activityId}/folder`, {
        method: 'PATCH',
        body: JSON.stringify({ folderId }),
      });
      onRefresh();
    } catch {
      /* ignore — activity stays where it was */
    }
  }, [onRefresh]);

  const submitFolder = async (name: string, color: string) => {
    if (folderModal?.mode === 'edit' && folderModal.folder) {
      await adminApiFetch(`/api/admin/activity-folders/${folderModal.folder._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, color }),
      });
    } else {
      // New folders are created inside the folder currently open (null = top level).
      await adminApiFetch('/api/admin/activity-folders', {
        method: 'POST',
        body: JSON.stringify({ name, color, parentId: openFolderId }),
      });
    }
    onRefresh();
  };

  const handleDeleteFolder = async (folder: Folder) => {
    if (confirmDeleteFolderId !== folder._id) {
      setConfirmDeleteFolderId(folder._id);
      return;
    }
    setDeletingFolderId(folder._id);
    try {
      await adminApiFetch(`/api/admin/activity-folders/${folder._id}`, { method: 'DELETE' });
      if (openFolderId === folder._id) setOpenFolderId(null);
      closeAllMenus();
      onRefresh();
    } finally {
      setDeletingFolderId(null);
    }
  };

  // ── drag: mouse (HTML5 Drag API) ──
  const onMouseDragStart = (e: React.DragEvent, id: string) => {
    mouseDragIdRef.current = id;
    setDraggingActivityId(id);
    try { e.dataTransfer.setData('text/plain', id); } catch { /* Firefox requires setData to start a drag */ }
    e.dataTransfer.effectAllowed = 'move';
  };
  const onMouseDragEnd = () => {
    mouseDragIdRef.current = null;
    setDraggingActivityId(null);
    setDragOverKey(null);
  };
  const onTargetDragOver = (e: React.DragEvent, key: string) => {
    if (!mouseDragIdRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverKey(key);
  };
  const onTargetDragLeave = (key: string) => {
    setDragOverKey((cur) => (cur === key ? null : cur));
  };
  const onTargetDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const id = mouseDragIdRef.current;
    mouseDragIdRef.current = null;
    setDraggingActivityId(null);
    setDragOverKey(null);
    if (id) moveActivityToFolder(id, folderId);
  };

  // ── drag: touch (press-and-hold to lift, then drag — Finder-style, no visible handle) ──
  const hitTestKey = useCallback((x: number, y: number): string | null => {
    for (const [key, el] of dropTargetRefs.current.entries()) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue; // hidden in the other (desktop/mobile) layout
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return key;
    }
    return null;
  }, []);
  // Blocks page scroll only while a drag is actually active (registered non-passive).
  const onTouchMovePrevent = useCallback((e: TouchEvent) => {
    if (touchDragRef.current) e.preventDefault();
  }, []);
  const onTouchPointerMove = useCallback((e: PointerEvent) => {
    if (!touchDragRef.current) {
      // Long-press still pending: if the finger travels first, it's a scroll — cancel the lift.
      const lp = longPressRef.current;
      if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 12) {
        clearTimeout(lp.timer);
        longPressRef.current = null;
      }
      return;
    }
    setDragOverKey(hitTestKey(e.clientX, e.clientY));
    const name = activitiesRef.current.find((a) => a._id === touchDragRef.current!.activityId)?.name || '';
    setTouchGhost({ name, x: e.clientX, y: e.clientY });
  }, [hitTestKey]);
  const onTouchPointerUp = useCallback((e: PointerEvent) => {
    if (longPressRef.current) { clearTimeout(longPressRef.current.timer); longPressRef.current = null; }
    window.removeEventListener('pointermove', onTouchPointerMove);
    window.removeEventListener('pointerup', onTouchPointerUp);
    window.removeEventListener('pointercancel', onTouchPointerUp);
    window.removeEventListener('touchmove', onTouchMovePrevent);
    const st = touchDragRef.current;
    touchDragRef.current = null;
    setTouchGhost(null);
    setDraggingActivityId(null);
    setDragOverKey(null);
    if (st) {
      justDraggedRef.current = true; // suppress the click that follows the lifted gesture
      const key = hitTestKey(e.clientX, e.clientY);
      if (key) moveActivityToFolder(st.activityId, key === '__root__' ? null : key);
    }
  }, [onTouchPointerMove, onTouchMovePrevent, hitTestKey, moveActivityToFolder]);
  const onRowPointerDown = useCallback((e: React.PointerEvent, id: string) => {
    if (e.pointerType !== 'touch') return; // mouse uses the HTML5 path
    if ((e.target as HTMLElement).closest('[data-row-actions]')) return; // don't lift from the ⋯ menu
    justDraggedRef.current = false;
    const x = e.clientX, y = e.clientY;
    const timer = setTimeout(() => {
      touchDragRef.current = { activityId: id };
      setDraggingActivityId(id);
      const name = activitiesRef.current.find((a) => a._id === id)?.name || '';
      setTouchGhost({ name, x: longPressRef.current?.x ?? x, y: longPressRef.current?.y ?? y });
    }, 300);
    longPressRef.current = { id, x, y, timer };
    window.addEventListener('pointermove', onTouchPointerMove);
    window.addEventListener('pointerup', onTouchPointerUp);
    window.addEventListener('pointercancel', onTouchPointerUp);
    window.addEventListener('touchmove', onTouchMovePrevent, { passive: false });
  }, [onTouchPointerMove, onTouchPointerUp, onTouchMovePrevent]);

  const registerDropTarget = (key: string) => (el: HTMLElement | null) => {
    if (el) dropTargetRefs.current.set(key, el);
    else dropTargetRefs.current.delete(key);
  };

  useEffect(() => {
    if (!actionsActivityId && !actionsFolderId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAllMenus();
    };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-row-actions]')) return;
      closeAllMenus();
    };
    const onScrollOrResize = () => closeAllMenus();
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [actionsActivityId, actionsFolderId, closeAllMenus]);

  useEffect(() => () => {
    if (longPressRef.current) clearTimeout(longPressRef.current.timer);
    window.removeEventListener('pointermove', onTouchPointerMove);
    window.removeEventListener('pointerup', onTouchPointerUp);
    window.removeEventListener('pointercancel', onTouchPointerUp);
    window.removeEventListener('touchmove', onTouchMovePrevent);
  }, [onTouchPointerMove, onTouchPointerUp, onTouchMovePrevent]);

  // If the open folder is deleted (here or elsewhere), fall back to the root view.
  useEffect(() => {
    if (openFolderId && !folders.some((f) => f._id === openFolderId)) setOpenFolderId(null);
  }, [folders, openFolderId]);

  const searching = search.trim().length > 0;
  const q = search.trim().toLowerCase();
  const folderById = useMemo(() => new Map(folders.map((f) => [f._id, f])), [folders]);
  const openFolder = openFolderId ? folderById.get(openFolderId) || null : null;

  // Ancestor chain of the open folder, root-first, including the open folder itself.
  const ancestors = useMemo(() => {
    const chain: Folder[] = [];
    let cur: Folder | null = openFolder;
    const seen = new Set<string>();
    while (cur && !seen.has(cur._id)) {
      seen.add(cur._id);
      chain.unshift(cur);
      cur = cur.parentId ? folderById.get(cur.parentId) || null : null;
    }
    return chain;
  }, [openFolder, folderById]);

  const visibleActivities = useMemo(() => {
    const matches = (a: Activity) =>
      a.name.toLowerCase().includes(q) ||
      (a.createdByEmail || '').toLowerCase().includes(q) ||
      (a.code || '').toLowerCase().includes(q);
    if (searching) return activities.filter(matches); // flat search across all folders
    if (openFolderId) return activities.filter((a) => (a.folderId ?? null) === openFolderId);
    return activities.filter((a) => !a.folderId); // root: ungrouped only
  }, [activities, searching, q, openFolderId]);

  // Root (not searching): top-level folders. Inside a folder: its direct sub-folders.
  // While searching: any folder whose name matches (flat).
  const visibleFolders = useMemo(() => {
    if (searching) return folders.filter((f) => f.name.toLowerCase().includes(q));
    return folders.filter((f) => (f.parentId ?? null) === openFolderId);
  }, [folders, searching, q, openFolderId]);
  const countFor = (folderId: string) => activities.filter((a) => (a.folderId ?? null) === folderId).length;

  // Flattened folder tree (DFS, alphabetical per level) with depth — for the indented "move to folder" menu.
  const orderedFolders = useMemo(() => {
    const byParent = new Map<string | null, Folder[]>();
    for (const f of folders) {
      const key = f.parentId ?? null;
      (byParent.get(key) ?? byParent.set(key, []).get(key)!).push(f);
    }
    const out: { folder: Folder; depth: number }[] = [];
    const walk = (parent: string | null, depth: number) => {
      for (const f of (byParent.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name))) {
        out.push({ folder: f, depth });
        walk(f._id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [folders]);

  const { page, setPage, totalPages, pageItems, totalItems, showing } = usePagination(visibleActivities);

  const renderFolderMenu = (folder: Folder) => (
    <RowActionWrapper data-row-actions onClick={(e) => e.stopPropagation()}>
      <RowActionIconButton
        type="button"
        aria-label={t.actions}
        title={t.actions}
        onClick={(e) => (actionsFolderId === folder._id ? closeAllMenus() : openFolderActions(folder._id, e.currentTarget.getBoundingClientRect()))}
      >
        <PencilIcon />
      </RowActionIconButton>
      {actionsFolderId === folder._id && (
        <RowActionMenu style={actionMenuStyle(menuAnchorRect)}>
          <RowActionMenuItem
            type="button"
            onClick={() => { setFolderModal({ mode: 'edit', folder }); closeAllMenus(); }}
          >
            {t.editFolder}
          </RowActionMenuItem>
          <RowActionMenuItem
            type="button"
            danger
            confirm={confirmDeleteFolderId === folder._id}
            disabled={deletingFolderId === folder._id}
            onClick={() => handleDeleteFolder(folder)}
          >
            {confirmDeleteFolderId === folder._id ? t.confirmDeleteFolder : t.deleteFolder}
          </RowActionMenuItem>
        </RowActionMenu>
      )}
    </RowActionWrapper>
  );

  const renderActivityMenu = (activity: Activity) => (
    <RowActionWrapper data-row-actions onClick={(e) => e.stopPropagation()}>
      <RowActionIconButton
        type="button"
        aria-label={t.actions}
        title={t.actions}
        onClick={(e) => (actionsActivityId === activity._id ? closeActions() : openActivityActions(activity._id, e.currentTarget.getBoundingClientRect()))}
      >
        <PencilIcon />
      </RowActionIconButton>
      {actionsActivityId === activity._id && (
        <RowActionMenu style={actionMenuStyle(menuAnchorRect)}>
          {!moveMenuOpen ? (
            <>
              <RowActionMenuItem
                type="button"
                disabled={duplicatingId === activity._id || deletingId === activity._id}
                onClick={handleDuplicateFromDrawer}
              >
                {duplicatingId === activity._id ? t.duplicating : t.duplicate}
              </RowActionMenuItem>
              {folders.length > 0 && (
                <RowActionMenuItem type="button" onClick={() => setMoveMenuOpen(true)}>
                  {t.moveToFolder}
                </RowActionMenuItem>
              )}
              <RowActionMenuItem
                type="button"
                danger
                confirm={confirmDeleteInDrawer}
                disabled={duplicatingId === activity._id || deletingId === activity._id}
                onClick={handleDeleteFromDrawer}
              >
                {confirmDeleteInDrawer ? t.confirmDelete : t.delete}
              </RowActionMenuItem>
            </>
          ) : (
            <>
              {orderedFolders.map(({ folder: f, depth }) => (
                <RowActionMenuItem
                  key={f._id}
                  type="button"
                  disabled={(activity.folderId ?? null) === f._id}
                  onClick={() => { moveActivityToFolder(activity._id, f._id); closeActions(); }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, paddingLeft: depth * 16 }}>
                    <FolderGlyph color={resolveFolderColor(f.color).accent} size={16} />
                    {f.name}
                  </span>
                </RowActionMenuItem>
              ))}
              {activity.folderId && (
                <RowActionMenuItem
                  type="button"
                  onClick={() => { moveActivityToFolder(activity._id, null); closeActions(); }}
                >
                  {t.removeFromFolder}
                </RowActionMenuItem>
              )}
            </>
          )}
        </RowActionMenu>
      )}
    </RowActionWrapper>
  );

  return (
    <>
      <SectionHeaderRow>
        <PageTitleNoMargin>{t.title}</PageTitleNoMargin>
        <HeaderButtons>
          <SmallActionButton onClick={() => setFolderModal({ mode: 'create' })}>
            {t.newFolder}
          </SmallActionButton>
          <SmallActionButton onClick={() => navigate('/admin/activities/new')}>
            + {t.createNew}
          </SmallActionButton>
        </HeaderButtons>
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

      {openFolder && !searching && (
        <Breadcrumb>
          <BreadcrumbLink
            type="button"
            ref={registerDropTarget('__root__')}
            dragOver={dragOverKey === '__root__'}
            onClick={() => setOpenFolderId(null)}
            onDragOver={(e) => onTargetDragOver(e, '__root__')}
            onDragLeave={() => onTargetDragLeave('__root__')}
            onDrop={(e) => onTargetDrop(e, null)}
          >
            ‹ {t.allActivities}
          </BreadcrumbLink>
          {ancestors.map((f, i) => {
            const isCurrent = i === ancestors.length - 1;
            const accent = resolveFolderColor(f.color).accent;
            return (
              <span key={f._id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <BreadcrumbSep>/</BreadcrumbSep>
                {isCurrent ? (
                  <BreadcrumbCurrent>
                    <FolderGlyph color={accent} size={18} />
                    {f.name}
                  </BreadcrumbCurrent>
                ) : (
                  <BreadcrumbLink
                    type="button"
                    ref={registerDropTarget(f._id)}
                    dragOver={dragOverKey === f._id}
                    onClick={() => setOpenFolderId(f._id)}
                    onDragOver={(e) => onTargetDragOver(e, f._id)}
                    onDragLeave={() => onTargetDragLeave(f._id)}
                    onDrop={(e) => onTargetDrop(e, f._id)}
                  >
                    <FolderGlyph color={accent} size={16} />
                    {f.name}
                  </BreadcrumbLink>
                )}
              </span>
            );
          })}
        </Breadcrumb>
      )}

      {activities.length === 0 && folders.length === 0 ? (
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
                  {visibleFolders.map((folder) => {
                    const fc = resolveFolderColor(folder.color);
                    const isOver = dragOverKey === folder._id;
                    return (
                      <tr
                        key={`folder-${folder._id}`}
                        onClick={() => { setSearch(''); setOpenFolderId(folder._id); }}
                        onDragOver={(e) => onTargetDragOver(e, folder._id)}
                        onDragLeave={() => onTargetDragLeave(folder._id)}
                        onDrop={(e) => onTargetDrop(e, folder._id)}
                        style={isOver ? { outline: `2px dashed ${fc.accent}`, outlineOffset: '-2px' } : undefined}
                      >
                        <td>
                          <FolderNameWrap>
                            <FolderGlyph color={fc.accent} />
                            <NameMain>{folder.name}</NameMain>
                            <IconBadge variant="purple">{countFor(folder._id)}</IconBadge>
                          </FolderNameWrap>
                        </td>
                        <td colSpan={5} />
                        <RowActionsCell>{renderFolderMenu(folder)}</RowActionsCell>
                      </tr>
                    );
                  })}
                  {pageItems.map((activity) => (
                    <tr
                      key={activity._id}
                      draggable
                      onDragStart={(e) => onMouseDragStart(e, activity._id)}
                      onDragEnd={onMouseDragEnd}
                      onPointerDown={(e) => onRowPointerDown(e, activity._id)}
                      onClick={() => {
                        if (justDraggedRef.current) { justDraggedRef.current = false; return; }
                        navigate(`/admin/activities/${activity._id}`);
                      }}
                      style={dragRowStyle(draggingActivityId === activity._id)}
                    >
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
                      <RowActionsCell>{renderActivityMenu(activity)}</RowActionsCell>
                    </tr>
                  ))}
                </tbody>
              </DashTable>
            </TableCard>
          </DesktopOnlyDiv>

          <MobileOnlyDiv>
            <MobileList>
              {visibleFolders.map((folder) => {
                const fc = resolveFolderColor(folder.color);
                const isOver = dragOverKey === folder._id;
                return (
                  <MobileCard
                    key={`folder-${folder._id}`}
                    ref={registerDropTarget(folder._id)}
                    onClick={() => { setSearch(''); setOpenFolderId(folder._id); }}
                    onDragOver={(e) => onTargetDragOver(e, folder._id)}
                    onDragLeave={() => onTargetDragLeave(folder._id)}
                    onDrop={(e) => onTargetDrop(e, folder._id)}
                    style={isOver ? { border: `1.5px dashed ${fc.accent}` } : undefined}
                  >
                    <MobileCardHeader>
                      <FolderNameWrap>
                        <FolderGlyph color={fc.accent} />
                        <MobileCardNameLarge>{folder.name}</MobileCardNameLarge>
                        <IconBadge variant="purple">{countFor(folder._id)}</IconBadge>
                      </FolderNameWrap>
                      {renderFolderMenu(folder)}
                    </MobileCardHeader>
                  </MobileCard>
                );
              })}
              {pageItems.map((activity) => (
                <MobileCard
                  key={activity._id}
                  draggable
                  onDragStart={(e) => onMouseDragStart(e, activity._id)}
                  onDragEnd={onMouseDragEnd}
                  onPointerDown={(e) => onRowPointerDown(e, activity._id)}
                  onClick={() => {
                    if (justDraggedRef.current) { justDraggedRef.current = false; return; }
                    navigate(`/admin/activities/${activity._id}`);
                  }}
                  style={dragRowStyle(draggingActivityId === activity._id)}
                >
                  <MobileCardHeader>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                      <MobileCardNameLarge>{activity.name}</MobileCardNameLarge>
                      <StatusBadge status={activity.status}>
                        {activity.status === 'live' ? t.live : t.preview}
                      </StatusBadge>
                    </div>
                    {renderActivityMenu(activity)}
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

          {openFolder && !searching && visibleActivities.length === 0 && visibleFolders.length === 0 && (
            <TableCard style={{ padding: 28, marginTop: 12 }}>
              <EmptyText>{t.emptyFolder}</EmptyText>
            </TableCard>
          )}

          {visibleActivities.length > 0 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={showing} totalItems={totalItems} />
          )}
        </>
      )}

      {touchGhost && (
        <DragGhost style={{ left: touchGhost.x, top: touchGhost.y }}>{touchGhost.name}</DragGhost>
      )}

      {folderModal && (
        <FolderFormModal
          t={t}
          title={folderModal.mode === 'edit' ? t.editFolderTitle : t.newFolderTitle}
          submitLabel={folderModal.mode === 'edit' ? t.saveFolder : t.createFolderBtn}
          initialName={folderModal.folder?.name}
          initialColor={folderModal.folder?.color || DEFAULT_FOLDER_COLOR}
          onClose={() => setFolderModal(null)}
          onSubmit={submitFolder}
        />
      )}
    </>
  );
}

// ─── Missions sub-section with pagination ───

function MissionsSection({ missions, folders, navigate, t, onRefresh }: { missions: Mission[]; folders: Folder[]; navigate: ReturnType<typeof useNavigate>; t: Record<string, string>; onRefresh: () => void }) {
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [actionsMissionId, setActionsMissionId] = useState<string | null>(null);
  const [actionsFolderId, setActionsFolderId] = useState<string | null>(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
  const [confirmDeleteFolderId, setConfirmDeleteFolderId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [folderModal, setFolderModal] = useState<{ mode: 'create' | 'edit'; folder?: Folder } | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [touchGhost, setTouchGhost] = useState<{ name: string; x: number; y: number } | null>(null);
  const mouseDragIdRef = useRef<string | null>(null);
  const touchDragRef = useRef<{ id: string } | null>(null);
  const longPressRef = useRef<{ id: string; x: number; y: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const justDraggedRef = useRef(false);
  const dropTargetRefs = useRef<Map<string, HTMLElement>>(new Map());
  const missionsRef = useRef(missions);
  missionsRef.current = missions;

  const closeAllMenus = useCallback(() => {
    setActionsMissionId(null);
    setActionsFolderId(null);
    setConfirmDeleteFolderId(null);
  }, []);
  const openMissionActions = (id: string, rect: DOMRect) => { closeAllMenus(); setMenuAnchorRect(rect); setActionsMissionId(id); };
  const openFolderActions = (id: string, rect: DOMRect) => { closeAllMenus(); setMenuAnchorRect(rect); setActionsFolderId(id); };

  const moveToFolder = useCallback(async (id: string, folderId: string | null) => {
    const cur = missionsRef.current.find((m) => m._id === id);
    if (!cur) return;
    if ((cur.folderId ?? null) === folderId) return;
    try {
      await adminApiFetch(`/api/admin/missions/${id}/folder`, { method: 'PATCH', body: JSON.stringify({ folderId }) });
      onRefresh();
    } catch { /* ignore */ }
  }, [onRefresh]);

  const submitFolder = async (name: string, color: string) => {
    if (folderModal?.mode === 'edit' && folderModal.folder) {
      await adminApiFetch(`/api/admin/mission-folders/${folderModal.folder._id}`, { method: 'PATCH', body: JSON.stringify({ name, color }) });
    } else {
      await adminApiFetch('/api/admin/mission-folders', { method: 'POST', body: JSON.stringify({ name, color }) });
    }
    onRefresh();
  };
  const handleDeleteFolder = async (folder: Folder) => {
    if (confirmDeleteFolderId !== folder._id) { setConfirmDeleteFolderId(folder._id); return; }
    setDeletingFolderId(folder._id);
    try {
      await adminApiFetch(`/api/admin/mission-folders/${folder._id}`, { method: 'DELETE' });
      if (openFolderId === folder._id) setOpenFolderId(null);
      closeAllMenus();
      onRefresh();
    } finally {
      setDeletingFolderId(null);
    }
  };

  // mouse drag (HTML5)
  const onMouseDragStart = (e: React.DragEvent, id: string) => {
    mouseDragIdRef.current = id;
    setDraggingId(id);
    try { e.dataTransfer.setData('text/plain', id); } catch { /* Firefox */ }
    e.dataTransfer.effectAllowed = 'move';
  };
  const onMouseDragEnd = () => { mouseDragIdRef.current = null; setDraggingId(null); setDragOverKey(null); };
  const onTargetDragOver = (e: React.DragEvent, key: string) => {
    if (!mouseDragIdRef.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverKey(key);
  };
  const onTargetDragLeave = (key: string) => setDragOverKey((cur) => (cur === key ? null : cur));
  const onTargetDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const id = mouseDragIdRef.current;
    mouseDragIdRef.current = null;
    setDraggingId(null);
    setDragOverKey(null);
    if (id) moveToFolder(id, folderId);
  };

  // touch drag (press-and-hold)
  const hitTestKey = useCallback((x: number, y: number): string | null => {
    for (const [key, el] of dropTargetRefs.current.entries()) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return key;
    }
    return null;
  }, []);
  const onTouchMovePrevent = useCallback((e: TouchEvent) => { if (touchDragRef.current) e.preventDefault(); }, []);
  const onTouchPointerMove = useCallback((e: PointerEvent) => {
    if (!touchDragRef.current) {
      const lp = longPressRef.current;
      if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 12) { clearTimeout(lp.timer); longPressRef.current = null; }
      return;
    }
    setDragOverKey(hitTestKey(e.clientX, e.clientY));
    const name = missionsRef.current.find((m) => m._id === touchDragRef.current!.id)?.name || '';
    setTouchGhost({ name, x: e.clientX, y: e.clientY });
  }, [hitTestKey]);
  const onTouchPointerUp = useCallback((e: PointerEvent) => {
    if (longPressRef.current) { clearTimeout(longPressRef.current.timer); longPressRef.current = null; }
    window.removeEventListener('pointermove', onTouchPointerMove);
    window.removeEventListener('pointerup', onTouchPointerUp);
    window.removeEventListener('pointercancel', onTouchPointerUp);
    window.removeEventListener('touchmove', onTouchMovePrevent);
    const st = touchDragRef.current;
    touchDragRef.current = null;
    setTouchGhost(null);
    setDraggingId(null);
    setDragOverKey(null);
    if (st) {
      justDraggedRef.current = true;
      const key = hitTestKey(e.clientX, e.clientY);
      if (key) moveToFolder(st.id, key === '__root__' ? null : key);
    }
  }, [onTouchPointerMove, onTouchMovePrevent, hitTestKey, moveToFolder]);
  const onRowPointerDown = useCallback((e: React.PointerEvent, id: string) => {
    if (e.pointerType !== 'touch') return;
    if ((e.target as HTMLElement).closest('[data-row-actions]')) return;
    justDraggedRef.current = false;
    const x = e.clientX, y = e.clientY;
    const timer = setTimeout(() => {
      touchDragRef.current = { id };
      setDraggingId(id);
      const name = missionsRef.current.find((m) => m._id === id)?.name || '';
      setTouchGhost({ name, x: longPressRef.current?.x ?? x, y: longPressRef.current?.y ?? y });
    }, 300);
    longPressRef.current = { id, x, y, timer };
    window.addEventListener('pointermove', onTouchPointerMove);
    window.addEventListener('pointerup', onTouchPointerUp);
    window.addEventListener('pointercancel', onTouchPointerUp);
    window.addEventListener('touchmove', onTouchMovePrevent, { passive: false });
  }, [onTouchPointerMove, onTouchPointerUp, onTouchMovePrevent]);
  const registerDropTarget = (key: string) => (el: HTMLElement | null) => {
    if (el) dropTargetRefs.current.set(key, el);
    else dropTargetRefs.current.delete(key);
  };

  useEffect(() => {
    if (!actionsMissionId && !actionsFolderId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAllMenus(); };
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-row-actions]')) return;
      closeAllMenus();
    };
    const onScrollOrResize = () => closeAllMenus();
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [actionsMissionId, actionsFolderId, closeAllMenus]);

  useEffect(() => () => {
    if (longPressRef.current) clearTimeout(longPressRef.current.timer);
    window.removeEventListener('pointermove', onTouchPointerMove);
    window.removeEventListener('pointerup', onTouchPointerUp);
    window.removeEventListener('pointercancel', onTouchPointerUp);
    window.removeEventListener('touchmove', onTouchMovePrevent);
  }, [onTouchPointerMove, onTouchPointerUp, onTouchMovePrevent]);

  useEffect(() => {
    if (openFolderId && !folders.some((f) => f._id === openFolderId)) setOpenFolderId(null);
  }, [folders, openFolderId]);

  const openFolder = openFolderId ? folders.find((f) => f._id === openFolderId) || null : null;
  const visibleMissions = useMemo(
    () => (openFolderId ? missions.filter((m) => (m.folderId ?? null) === openFolderId) : missions.filter((m) => !m.folderId)),
    [missions, openFolderId],
  );
  const visibleFolders = openFolderId ? [] : folders;
  const countFor = (fid: string) => missions.filter((m) => (m.folderId ?? null) === fid).length;

  const { page, setPage, totalPages, pageItems, totalItems, showing } = usePagination(visibleMissions);

  const renderFolderMenu = (folder: Folder) => (
    <RowActionWrapper data-row-actions onClick={(e) => e.stopPropagation()}>
      <RowActionIconButton type="button" aria-label={t.actions} title={t.actions}
        onClick={(e) => (actionsFolderId === folder._id ? closeAllMenus() : openFolderActions(folder._id, e.currentTarget.getBoundingClientRect()))}
      >
        <PencilIcon />
      </RowActionIconButton>
      {actionsFolderId === folder._id && (
        <RowActionMenu style={actionMenuStyle(menuAnchorRect)}>
          <RowActionMenuItem type="button" onClick={() => { setFolderModal({ mode: 'edit', folder }); closeAllMenus(); }}>
            {t.editFolder}
          </RowActionMenuItem>
          <RowActionMenuItem type="button" danger confirm={confirmDeleteFolderId === folder._id} disabled={deletingFolderId === folder._id}
            onClick={() => handleDeleteFolder(folder)}
          >
            {confirmDeleteFolderId === folder._id ? t.confirmDeleteFolder : t.deleteFolder}
          </RowActionMenuItem>
        </RowActionMenu>
      )}
    </RowActionWrapper>
  );

  const renderMissionMenu = (m: Mission) => {
    if (folders.length === 0 && !m.folderId) return null; // nothing to move to
    return (
      <RowActionWrapper data-row-actions onClick={(e) => e.stopPropagation()}>
        <RowActionIconButton type="button" aria-label={t.moveToFolder} title={t.moveToFolder}
          onClick={(e) => (actionsMissionId === m._id ? closeAllMenus() : openMissionActions(m._id, e.currentTarget.getBoundingClientRect()))}
        >
          <PencilIcon />
        </RowActionIconButton>
        {actionsMissionId === m._id && (
          <RowActionMenu style={actionMenuStyle(menuAnchorRect)}>
            {folders.map((f) => (
              <RowActionMenuItem key={f._id} type="button" disabled={(m.folderId ?? null) === f._id}
                onClick={() => { moveToFolder(m._id, f._id); closeAllMenus(); }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <FolderGlyph color={resolveFolderColor(f.color).accent} size={16} />
                  {f.name}
                </span>
              </RowActionMenuItem>
            ))}
            {m.folderId && (
              <RowActionMenuItem type="button" onClick={() => { moveToFolder(m._id, null); closeAllMenus(); }}>
                {t.removeFromFolder}
              </RowActionMenuItem>
            )}
          </RowActionMenu>
        )}
      </RowActionWrapper>
    );
  };

  return (
    <>
      <SectionHeaderRow>
        <PageTitleNoMargin>{t.missionsTitle}</PageTitleNoMargin>
        <HeaderButtons>
          <SmallActionButton onClick={() => setFolderModal({ mode: 'create' })}>{t.newFolder}</SmallActionButton>
          <SmallActionButton onClick={() => navigate('/admin/missions/new')}>{t.newMission}</SmallActionButton>
        </HeaderButtons>
      </SectionHeaderRow>

      {openFolder && (
        <Breadcrumb>
          <BreadcrumbLink type="button" ref={registerDropTarget('__root__')} dragOver={dragOverKey === '__root__'}
            onClick={() => setOpenFolderId(null)}
            onDragOver={(e) => onTargetDragOver(e, '__root__')}
            onDragLeave={() => onTargetDragLeave('__root__')}
            onDrop={(e) => onTargetDrop(e, null)}
          >
            ‹ {t.allMissions}
          </BreadcrumbLink>
          <BreadcrumbSep>/</BreadcrumbSep>
          <BreadcrumbCurrent>
            <FolderGlyph color={resolveFolderColor(openFolder.color).accent} size={18} />
            {openFolder.name}
          </BreadcrumbCurrent>
        </Breadcrumb>
      )}

      {missions.length === 0 && folders.length === 0 ? (
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
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibleFolders.map((folder) => {
                    const fc = resolveFolderColor(folder.color);
                    const isOver = dragOverKey === folder._id;
                    return (
                      <tr key={`folder-${folder._id}`}
                        onClick={() => setOpenFolderId(folder._id)}
                        onDragOver={(e) => onTargetDragOver(e, folder._id)}
                        onDragLeave={() => onTargetDragLeave(folder._id)}
                        onDrop={(e) => onTargetDrop(e, folder._id)}
                        style={isOver ? { outline: `2px dashed ${fc.accent}`, outlineOffset: '-2px' } : undefined}
                      >
                        <td>
                          <FolderNameWrap>
                            <FolderGlyph color={fc.accent} />
                            <NameMain>{folder.name}</NameMain>
                            <IconBadge variant="purple">{countFor(folder._id)}</IconBadge>
                          </FolderNameWrap>
                        </td>
                        <td colSpan={3} />
                        <RowActionsCell>{renderFolderMenu(folder)}</RowActionsCell>
                      </tr>
                    );
                  })}
                  {pageItems.map((m) => (
                    <tr key={m._id}
                      draggable
                      onDragStart={(e) => onMouseDragStart(e, m._id)}
                      onDragEnd={onMouseDragEnd}
                      onPointerDown={(e) => onRowPointerDown(e, m._id)}
                      onClick={() => {
                        if (justDraggedRef.current) { justDraggedRef.current = false; return; }
                        navigate(`/admin/missions/${m._id}`);
                      }}
                      style={dragRowStyle(draggingId === m._id)}
                    >
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
                      <RowActionsCell>{renderMissionMenu(m)}</RowActionsCell>
                    </tr>
                  ))}
                </tbody>
              </DashTable>
            </TableCard>
          </DesktopOnlyDiv>
          <MobileOnlyDiv>
            <MobileList>
              {visibleFolders.map((folder) => {
                const fc = resolveFolderColor(folder.color);
                const isOver = dragOverKey === folder._id;
                return (
                  <MobileCard key={`folder-${folder._id}`}
                    ref={registerDropTarget(folder._id)}
                    onClick={() => setOpenFolderId(folder._id)}
                    onDragOver={(e) => onTargetDragOver(e, folder._id)}
                    onDragLeave={() => onTargetDragLeave(folder._id)}
                    onDrop={(e) => onTargetDrop(e, folder._id)}
                    style={isOver ? { border: `1.5px dashed ${fc.accent}` } : undefined}
                  >
                    <MobileCardHeader>
                      <FolderNameWrap>
                        <FolderGlyph color={fc.accent} />
                        <MobileCardNameLarge>{folder.name}</MobileCardNameLarge>
                        <IconBadge variant="purple">{countFor(folder._id)}</IconBadge>
                      </FolderNameWrap>
                      {renderFolderMenu(folder)}
                    </MobileCardHeader>
                  </MobileCard>
                );
              })}
              {pageItems.map((m) => (
                <MobileCard key={m._id}
                  draggable
                  onDragStart={(e) => onMouseDragStart(e, m._id)}
                  onDragEnd={onMouseDragEnd}
                  onPointerDown={(e) => onRowPointerDown(e, m._id)}
                  onClick={() => {
                    if (justDraggedRef.current) { justDraggedRef.current = false; return; }
                    navigate(`/admin/missions/${m._id}`);
                  }}
                  style={dragRowStyle(draggingId === m._id)}
                >
                  <MobileCardHeader>
                    <MobileCardNameLarge>{m.name}</MobileCardNameLarge>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IconBadge variant="purple">
                        {m.explanationScreens?.length || 0} {t.missionScreens}
                      </IconBadge>
                      {renderMissionMenu(m)}
                    </div>
                  </MobileCardHeader>
                  <MobileCardDetails>
                    <MobileCardDate>{new Date(m.createdAt).toLocaleDateString()}</MobileCardDate>
                  </MobileCardDetails>
                </MobileCard>
              ))}
            </MobileList>
          </MobileOnlyDiv>

          {openFolder && visibleMissions.length === 0 && (
            <TableCard style={{ padding: 28, marginTop: 12 }}>
              <EmptyText>{t.emptyMissionsFolder}</EmptyText>
            </TableCard>
          )}

          {visibleMissions.length > 0 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={showing} totalItems={totalItems} />
          )}
        </>
      )}

      {touchGhost && (
        <DragGhost style={{ left: touchGhost.x, top: touchGhost.y }}>{touchGhost.name}</DragGhost>
      )}

      {folderModal && (
        <FolderFormModal
          t={t}
          title={folderModal.mode === 'edit' ? t.editFolderTitle : t.newFolderTitle}
          submitLabel={folderModal.mode === 'edit' ? t.saveFolder : t.createFolderBtn}
          initialName={folderModal.folder?.name}
          initialColor={folderModal.folder?.color || DEFAULT_FOLDER_COLOR}
          onClose={() => setFolderModal(null)}
          onSubmit={submitFolder}
        />
      )}
    </>
  );
}
