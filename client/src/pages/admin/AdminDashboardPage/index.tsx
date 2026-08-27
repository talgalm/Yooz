import { Fragment, useState, useEffect, useCallback, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminDashboardPage.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import LangDrawer from '../../../components/LangDrawer';
import Pagination from '../../../components/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import AdminGamesTab, { GAME_SUBTABS } from '../AdminGamesTab';
import AdminStationsTab, { stationTypeLabel } from '../AdminStationsTab';
import { texts as stationTexts } from '../AdminStationsTab/AdminStationsTab.i18n';
import AdminStatisticsTab from '../AdminStatisticsTab';
import AdminUsersTab from '../AdminUsersTab';
import AdminLibraryTab from '../AdminLibraryTab';
import AdminPortalsTab from '../AdminPortalsTab';
import AdminTutorialsTab from '../AdminTutorialsTab';
import AdminPublicityTab from '../AdminPublicityTab';
import AdminMediaTab from '../AdminMediaTab';
import type { Portal } from '../AdminPortalsTab';
import FolderFormModal from '../FolderFormModal';
import { resolveFolderColor, DEFAULT_FOLDER_COLOR } from '../folderColors';
import {
  AdminContent,
  BodyText,
  StatusBadge,
} from '../../../components/styled';
import {
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
  display: 'flex',
  alignItems: 'stretch',
  background: '#f6f6fb',
  overflowX: 'hidden',
});

// ─── Sidebar ───

const Sidebar = styled('aside')<{ open?: boolean }>(({ open }) => ({
  width: 244,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  background: '#fff',
  borderInlineEnd: '1px solid #ece8f3',
  position: 'sticky',
  top: 0,
  height: '100vh',
  zIndex: 200,
  '@media (max-width: 900px)': {
    position: 'fixed',
    top: 0,
    right: 0,
    boxShadow: '-8px 0 32px rgba(40,30,70,0.14)',
    transform: open ? 'none' : 'translateX(100%)',
    transition: 'transform 0.22s ease',
  },
}));

const SidebarScrim = styled('div')({
  display: 'none',
  '@media (max-width: 900px)': {
    display: 'block',
    position: 'fixed',
    inset: 0,
    zIndex: 199,
    background: 'rgba(28,22,48,0.38)',
  },
});

const SidebarBrand = styled('div')({
  display: 'flex',
  alignItems: 'center',
  padding: '22px 22px 14px',
});

const NavScroll = styled('nav')({
  flex: 1,
  overflowY: 'auto',
  padding: '4px 12px 12px',
});

const NavGroupLabel = styled('div')({
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.09em',
  color: '#b4aec6',
  padding: '16px 10px 8px',
});

const NavItem = styled('button')<{ active?: boolean; danger?: boolean }>(({ active, danger }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '11px 12px',
  marginBottom: 2,
  border: 'none',
  borderRadius: 10,
  background: active ? '#6c5ce7' : 'transparent',
  color: active ? '#fff' : danger ? '#c0392b' : '#6b6580',
  fontSize: 14.5,
  fontWeight: active ? 700 : 500,
  fontFamily: 'inherit',
  textAlign: 'start',
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s',
  boxShadow: active ? '0 6px 16px rgba(108,92,231,0.3)' : 'none',
  '& svg': { flexShrink: 0, width: 19, height: 19 },
  '&:hover': active ? {} : { background: danger ? '#fdeceb' : '#f4f2fb', color: danger ? '#c0392b' : '#443c66' },
}));

const SubNav = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  margin: '2px 0 6px',
  marginInlineStart: 16,
  paddingInlineStart: 12,
  borderInlineStart: '2px solid #efecf8',
});

const SubNavItem = styled('button')<{ active?: boolean; leaf?: boolean }>(({ active, leaf }) => ({
  display: 'block',
  width: '100%',
  padding: leaf ? '6px 10px' : '8px 10px',
  border: 'none',
  borderRadius: 8,
  background: active ? '#f0edfb' : 'transparent',
  color: active ? '#5b4bd6' : '#847e99',
  fontSize: leaf ? 13 : 13.5,
  fontWeight: active ? 700 : 500,
  fontFamily: 'inherit',
  textAlign: 'start',
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s',
  '&:hover': {
    background: active ? '#f0edfb' : '#f6f4fc',
    color: active ? '#5b4bd6' : '#443c66',
  },
}));

const SidebarFooter = styled('div')({
  padding: '10px 12px 18px',
  borderTop: '1px solid #f1eef8',
});

// ─── Top bar + content column ───

const MainCol = styled('div')({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
});

const Topbar = styled('header')({
  position: 'sticky',
  top: 0,
  zIndex: 150,
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '13px clamp(18px, 3vw, 36px)',
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(8px)',
  borderBottom: '1px solid #ece8f3',
  '@media (max-width: 600px)': { padding: '10px 14px' },
});

const TopbarTitle = styled('h1')({
  margin: 0,
  fontSize: 20,
  fontWeight: 800,
  color: '#241f38',
  '@media (max-width: 600px)': { fontSize: 17 },
});

const TopbarSpacer = styled('div')({ flex: 1 });

const HamburgerBtn = styled('button')({
  display: 'none',
  '@media (max-width: 900px)': {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 8,
    '& span': { display: 'block', width: 20, height: 2.5, borderRadius: 2, background: '#6c5ce7' },
  },
});

const UserChip = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '4px 10px',
  borderRadius: 999,
  background: '#f5f3fb',
  border: '1px solid #ece8f3',
});

const UserAvatar = styled('div')({
  width: 32,
  height: 32,
  borderRadius: '50%',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #6c5ce7 0%, #8B2FC9 100%)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
});

const UserMeta = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  lineHeight: 1.25,
  '@media (max-width: 780px)': { display: 'none' },
});

const UserName = styled('span')({
  fontSize: 13.5,
  fontWeight: 700,
  color: '#2c2542',
  maxWidth: 170,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const UserRole = styled('span')({ fontSize: 11.5, color: '#8d86a3' });

const DashContent = styled(AdminContent)({
  flex: 1,
  maxWidth: 1400,
  margin: '0 auto',
  padding: '28px clamp(18px, 3vw, 36px) 48px',
  boxSizing: 'border-box',
  minWidth: 0,
  '@media (max-width: 600px)': { padding: '18px 14px 32px' },
});

// ─── Nav icons ───

const NAV_ICONS: Record<string, ReactNode> = {
  activities: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  statistics: (
    <>
      <path d="M3 21h18" />
      <rect x="5" y="11" width="3.5" height="7" rx="1" />
      <rect x="10.25" y="5.5" width="3.5" height="12.5" rx="1" />
      <rect x="15.5" y="14" width="3.5" height="4" rx="1" />
    </>
  ),
  stations: (
    <>
      <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  library: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  media: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m21 16-5-5-6.5 6.5" />
    </>
  ),
  portals: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
    </>
  ),
  publicity: (
    <>
      <path d="M3 10v4a1 1 0 0 0 1 1h3l5 4V5L7 9H4a1 1 0 0 0-1 1z" />
      <path d="M17.5 8.5a5 5 0 0 1 0 7" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-1.8a4 4 0 0 0-4-4H6.5a4 4 0 0 0-4 4V21" />
      <circle cx="9.25" cy="7.5" r="3.5" />
      <path d="M21.5 21v-1.8a4 4 0 0 0-3-3.87" />
      <path d="M16.5 4.2a4 4 0 0 1 0 7.6" />
    </>
  ),
  tutorials: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8.5 6 3.5-6 3.5z" />
    </>
  ),
  logout: (
    <>
      <path d="M15 17l5-5-5-5" />
      <path d="M20 12H9" />
      <path d="M12 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
    </>
  ),
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {NAV_ICONS[name]}
    </svg>
  );
}

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

type MainTab = 'activities' | 'statistics' | 'stations' | 'library' | 'media' | 'users' | 'portals' | 'tutorials' | 'publicity';
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
    ['activities', 'statistics', 'stations', 'library', 'media', 'users', 'portals', 'tutorials', 'publicity'].includes(initialTab) ? initialTab : 'activities'
  );
  const [stationsSection, setStationsSection] = useState<StationsSection>('stations');
  const [stationTypeFilter, setStationTypeFilter] = useState<string>('all');
  const [gameTypeFilter, setGameTypeFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>('main');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { logout, admin } = useAdminAuth();
  const navigate = useNavigate();
  const t = useTranslations(texts);
  const stationT = useTranslations(stationTexts) as Record<string, string>;

  const role = admin?.role || 'viewer';

  // Same derivation the stations tab uses, so the sub-nav never offers an empty filter.
  const stationTypes = useMemo(() => {
    const set = new Set<string>();
    stations.forEach((station) => { if (station.type) set.add(station.type); });
    return [...set].sort();
  }, [stations]);

  const visibleTabs = useMemo(() => {
    const tabs: { key: MainTab; label: string; group: 'main' | 'other' }[] = [
      { key: 'activities', label: t.tabActivities, group: 'main' },
    ];
    if (role === 'admin' || role === 'super_admin' || role === 'customer') {
      tabs.push({ key: 'statistics', label: t.tabStatistics, group: 'main' });
    }
    tabs.push({ key: 'stations', label: t.tabStations, group: 'main' });
    tabs.push({ key: 'library', label: t.tabLibrary, group: 'main' });
    tabs.push({ key: 'portals', label: t.tabPortals, group: 'main' });
    if (role === 'admin' || role === 'super_admin') {
      tabs.push({ key: 'media', label: t.tabMedia, group: 'main' });
      tabs.push({ key: 'publicity', label: t.tabPublicity, group: 'other' });
    }
    if (role === 'super_admin') {
      tabs.push({ key: 'users', label: t.tabUsers, group: 'other' });
    }
    if (role === 'admin' || role === 'super_admin' || role === 'customer') {
      tabs.push({ key: 'tutorials', label: t.tabTutorials, group: 'other' });
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
      <PageBg style={{ alignItems: 'center', justifyContent: 'center' }}>
        <LoadingBox>
          <LoadingContent>
            <SpinnerEl />
            <BodyText>{t.loading}</BodyText>
          </LoadingContent>
        </LoadingBox>
      </PageBg>
    );
  }

  const activeLabel = visibleTabs.find((tab) => tab.key === activeTab)?.label ?? t.title;
  const displayName = admin?.name || admin?.email || '';
  const initials = displayName.trim().charAt(0).toUpperCase() || '?';
  const roleLabel = { viewer: t.roleViewer, admin: t.roleAdmin, super_admin: t.roleSuperAdmin, customer: t.roleCustomer }[role];

  // Picking a leaf filter closes the mobile drawer; picking a section keeps it open
  // because a fresh list of types is about to appear underneath.
  const pickSection = (section: StationsSection) => {
    setStationsSection(section);
    if (section === 'missions') setMobileMenuOpen(false);
  };

  const pickLeaf = (set: (value: string) => void, value: string) => {
    set(value);
    setMobileMenuOpen(false);
  };

  const stationsSubNav = (
    <SubNav>
      <SubNavItem active={stationsSection === 'stations'} onClick={() => pickSection('stations')}>
        {t.sectionStations}
      </SubNavItem>
      {stationsSection === 'stations' && (
        <SubNav>
          <SubNavItem leaf active={stationTypeFilter === 'all'} onClick={() => pickLeaf(setStationTypeFilter, 'all')}>
            {t.subTabAll}
          </SubNavItem>
          {stationTypes.map((type) => (
            <SubNavItem
              key={type}
              leaf
              active={stationTypeFilter === type}
              onClick={() => pickLeaf(setStationTypeFilter, type)}
            >
              {stationTypeLabel(stationT, type)}
            </SubNavItem>
          ))}
        </SubNav>
      )}

      <SubNavItem active={stationsSection === 'games'} onClick={() => pickSection('games')}>
        {t.sectionGames}
      </SubNavItem>
      {stationsSection === 'games' && (
        <SubNav>
          {GAME_SUBTABS.map((type) => (
            <SubNavItem
              key={type}
              leaf
              active={gameTypeFilter === type}
              onClick={() => pickLeaf(setGameTypeFilter, type)}
            >
              {(t as Record<string, string>)[`subTab${type.charAt(0).toUpperCase()}${type.slice(1)}`]}
            </SubNavItem>
          ))}
        </SubNav>
      )}

      <SubNavItem active={stationsSection === 'missions'} onClick={() => pickSection('missions')}>
        {t.sectionMissions}
      </SubNavItem>
    </SubNav>
  );

  const navItems = (group: 'main' | 'other') =>
    visibleTabs
      .filter((tab) => tab.group === group)
      .map((tab) => (
        <Fragment key={tab.key}>
          <NavItem
            active={activeTab === tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setSearchParams({});
              if (tab.key !== 'stations') setMobileMenuOpen(false);
            }}
          >
            <NavIcon name={tab.key} />
            {tab.label}
          </NavItem>
          {tab.key === 'stations' && activeTab === 'stations' && stationsSubNav}
        </Fragment>
      ));

  const otherNav = navItems('other');

  return (
    <PageBg>
      {mobileMenuOpen && <SidebarScrim onClick={() => setMobileMenuOpen(false)} />}

      <Sidebar open={mobileMenuOpen}>
        <SidebarBrand>
          <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 30 }} />
        </SidebarBrand>

        <NavScroll>
          <NavGroupLabel>{t.navMain}</NavGroupLabel>
          {navItems('main')}
          {otherNav.length > 0 && <NavGroupLabel>{t.navOther}</NavGroupLabel>}
          {otherNav}
        </NavScroll>

        <SidebarFooter>
          <NavItem danger onClick={handleLogout}>
            <NavIcon name="logout" />
            {t.logout}
          </NavItem>
        </SidebarFooter>
      </Sidebar>

      <MainCol>
        <Topbar>
          <HamburgerBtn onClick={() => setMobileMenuOpen((v) => !v)} aria-label={t.navMain}>
            <span /><span /><span />
          </HamburgerBtn>
          <TopbarTitle>{activeLabel}</TopbarTitle>
          <TopbarSpacer />
          <LangDrawer />
          <UserChip>
            <UserAvatar>{initials}</UserAvatar>
            <UserMeta>
              <UserName>{displayName}</UserName>
              <UserRole>{roleLabel}</UserRole>
            </UserMeta>
          </UserChip>
        </Topbar>

        <DashContent>
          {/* ── Activities Tab ── */}
          {activeTab === 'activities' && (
            <ActivitiesSection activities={activities} folders={folders} navigate={navigate} t={t} onRefresh={fetchAll} />
          )}

          {/* ── Statistics Tab ── */}
          {activeTab === 'statistics' && (role === 'admin' || role === 'super_admin' || role === 'customer') && (
            <AdminStatisticsTab activities={activities} initialActivityId={initialActivityId} />
          )}

          {/* ── Media Tab ── */}
          {activeTab === 'media' && (role === 'admin' || role === 'super_admin') && (
            <AdminMediaTab />
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

              {stationsSection === 'stations' && (
                <AdminStationsTab
                  stations={stations}
                  folders={stationFolders}
                  onRefresh={refreshStations}
                  typeFilter={stationTypeFilter}
                  hideCreateButton
                />
              )}

              {stationsSection === 'games' && (
                <AdminGamesTab
                  games={games}
                  folders={gameFolders}
                  onRefresh={refreshGames}
                  gameType={gameTypeFilter}
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

          {/* ── Tutorials Tab (super_admin generates, admin/customer watch) ── */}
          {activeTab === 'tutorials' && (role === 'admin' || role === 'super_admin' || role === 'customer') && (
            <AdminTutorialsTab />
          )}

          {/* ── Publicity Tab (admin + super_admin) ── */}
          {activeTab === 'publicity' && (role === 'admin' || role === 'super_admin') && (
            <AdminPublicityTab />
          )}
        </DashContent>
      </MainCol>

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
      <SectionHeaderRow style={{ justifyContent: 'flex-end' }}>
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
