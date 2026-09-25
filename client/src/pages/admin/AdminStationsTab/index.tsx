import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled, keyframes } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminStationsTab.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import { useCanEditContent } from '../../../context/AdminAuthContext';
import Pagination from '../../../components/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import type { Station } from '../AdminDashboardPage';
import FolderFormModal from '../FolderFormModal';
import { resolveFolderColor, DEFAULT_FOLDER_COLOR } from '../folderColors';
import {
  type Folder,
  FolderGlyph,
  HeaderButtons,
  FolderNameWrap,
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbCurrent,
  BreadcrumbSep,
  DragGhost,
  dragRowStyle,
  actionMenuStyle,
} from '../folderUi';
import {
  AdminCard,
  Table,
  Chip,
  DesktopOnly,
  HideOnDesktop,
  MobileCardList,
  MobileCardItem,
  Input,
} from '../../../components/styled';
import {
  SectionHeaderRow,
  PageTitleNoMargin,
  SmallActionButton,
  EmptyText,
  AdminCardNoPadding,
  CellBold,
  CellMuted,
  CellAlignEnd,
  MobileCardHeader,
  MobileCardNameRow,
  MobileCardRow,
  MobileCardDate,
} from '../styled';

const SOURCE_TAGS = new Set(['imported', 'IMPORTED', 'from-library']);

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`;

const TagDrawerBackdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 900,
  background: 'rgba(0, 0, 0, 0.35)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  animation: `${fadeIn} 0.15s ease-out`,
});

const TagDrawerPanel = styled('div')({
  background: '#fff',
  borderRadius: '16px 16px 0 0',
  width: '100%',
  maxWidth: 720,
  maxHeight: 'min(78vh, 640px)',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
  animation: `${slideUp} 0.2s ease-out`,
});

const TagDrawerHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '14px 18px',
  borderBottom: '1px solid #ece8f0',
  flexShrink: 0,
});

const TagDrawerTitle = styled('span')({
  fontSize: 16,
  fontWeight: 700,
  color: '#333',
});

const TagDrawerActions = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

const TagDrawerBody = styled('div')({
  overflowY: 'auto',
  padding: '16px 18px 24px',
  WebkitOverflowScrolling: 'touch',
});

const OpenTagDrawerButton = styled('button')<{ hasActive?: boolean }>(({ hasActive }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 10,
  border: `1.5px solid ${hasActive ? '#2563eb' : '#ddd'}`,
  background: hasActive ? '#eff6ff' : '#fff',
  color: hasActive ? '#2563eb' : '#555',
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  transition: 'all 0.15s',
  '&:hover': {
    borderColor: '#2563eb',
    color: '#2563eb',
  },
}));

const TagCountBadge = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 22,
  height: 22,
  padding: '0 6px',
  fontSize: 12,
  fontWeight: 700,
  borderRadius: 11,
  background: '#2563eb',
  color: '#fff',
});

const TagDrawerClearButton = styled('button')({
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 600,
  border: 'none',
  background: 'none',
  color: '#888',
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { color: '#c62828' },
});

const TagDrawerDoneButton = styled('button')({
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 8,
  border: 'none',
  background: '#6c5ce7',
  color: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { background: '#5b4fcf' },
});

const RowActionWrapper = styled('div')({
  position: 'relative',
  display: 'inline-block',
});

const RowActionIconButton = styled('button')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  padding: 0,
  borderRadius: 10,
  border: '1.5px solid #ddd',
  background: '#fff',
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

const FolderCount = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 6,
  background: '#f0eefa',
  color: '#6c5ce7',
});

const SearchInput = styled(Input)({
  flex: 1,
  minWidth: 0,
  padding: '10px 14px',
  fontSize: 14,
  '@media (min-width: 601px)': {
    minWidth: 200,
  },
});

const FilterRow = styled('div')({
  display: 'flex',
  gap: 16,
  alignItems: 'flex-start',
  marginBottom: 16,
  flexWrap: 'wrap',
});

const TagGroupsContainer = styled('div')({
  display: 'flex',
  gap: 24,
  flexWrap: 'wrap',
  marginBottom: 20,
  padding: '16px 20px',
  background: '#fafafe',
  borderRadius: 14,
  border: '1px solid #ece8f0',
});

const TagGroupsInDrawer = styled(TagGroupsContainer)({
  flexDirection: 'column',
  flexWrap: 'nowrap',
  marginBottom: 0,
});

const TagGroup = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  minWidth: 0,
});

const TagGroupLabel = styled('div')({
  fontSize: 12,
  fontWeight: 700,
  color: '#555',
  whiteSpace: 'nowrap',
});

const TagGroupChips = styled('div')({
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
});

const TagChip = styled('button')<{ active?: boolean }>(({ active }) => ({
  display: 'inline-block',
  padding: '5px 14px',
  fontSize: 12,
  fontWeight: 500,
  borderRadius: 20,
  border: `1.5px solid ${active ? '#2563eb' : '#d0d0d8'}`,
  background: active ? '#eff6ff' : '#fff',
  color: active ? '#2563eb' : '#555',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
  whiteSpace: 'nowrap',
  '&:hover': {
    borderColor: '#2563eb',
    color: '#2563eb',
  },
}));

const TagBadge = styled(Chip)({
  fontSize: 10,
  padding: '2px 8px',
  marginInlineEnd: 4,
  marginBottom: 2,
});

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export function stationTypeLabel(t: Record<string, string>, type?: string) {
  switch (type) {
    case 'text': return t.typeText;
    case 'video': return t.typeVideo;
    case 'image': return t.typeImage;
    case 'narrative': return t.typeNarrative;
    case 'badge': return t.typeBadge;
    case 'collage': return t.typeCollage;
    case 'feedback': return t.typeFeedback;
    case 'riddle': return t.typeRiddle;
    case 'avatar': return t.typeAvatar;
    case 'avatarQuiz': return t.typeAvatarQuiz;
    case 'enteringText': return t.typeEnteringText;
    default: return type || '—';
  }
}

interface AdminStationsTabProps {
  stations: Station[];
  folders: Folder[];
  onRefresh: () => void;
  defaultType?: string;
  hideCreateButton?: boolean;
  typeFilter?: string;
}

export default function AdminStationsTab({ stations, folders, onRefresh, defaultType, hideCreateButton, typeFilter = 'all' }: AdminStationsTabProps) {
  const navigate = useNavigate();
  const t = useTranslations(texts);

  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [tagDrawerOpen, setTagDrawerOpen] = useState(false);

  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [actionsStationId, setActionsStationId] = useState<string | null>(null);
  const [actionsFolderId, setActionsFolderId] = useState<string | null>(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const [confirmDeleteInDrawer, setConfirmDeleteInDrawer] = useState(false);
  const [confirmDeleteFolderId, setConfirmDeleteFolderId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [folderModal, setFolderModal] = useState<{ mode: 'create' | 'edit'; folder?: Folder } | null>(null);

  const [draggingStationId, setDraggingStationId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [touchGhost, setTouchGhost] = useState<{ name: string; x: number; y: number } | null>(null);
  const mouseDragIdRef = useRef<string | null>(null);
  const touchDragRef = useRef<{ stationId: string } | null>(null);
  const longPressRef = useRef<{ id: string; x: number; y: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const justDraggedRef = useRef(false);
  const dropTargetRefs = useRef<Map<string, HTMLElement>>(new Map());
  const stationsRef = useRef(stations);
  stationsRef.current = stations;

  const closeActions = () => {
    setActionsStationId(null);
    setConfirmDeleteInDrawer(false);
    setMoveMenuOpen(false);
  };
  const closeAllMenus = useCallback(() => {
    setActionsStationId(null);
    setConfirmDeleteInDrawer(false);
    setMoveMenuOpen(false);
    setActionsFolderId(null);
    setConfirmDeleteFolderId(null);
  }, []);
  const canEdit = useCanEditContent();
  const openStationActions = (id: string, rect: DOMRect) => { closeAllMenus(); setMenuAnchorRect(rect); setActionsStationId(id); };
  const openFolderActions = (id: string, rect: DOMRect) => { closeAllMenus(); setMenuAnchorRect(rect); setActionsFolderId(id); };

  const handleDeleteFromDrawer = async () => {
    if (!actionsStationId) return;
    if (!confirmDeleteInDrawer) {
      setConfirmDeleteInDrawer(true);
      return;
    }
    const id = actionsStationId;
    setDeletingId(id);
    try {
      await adminApiFetch(`/api/admin/stations/${id}`, { method: 'DELETE' });
      closeActions();
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicateFromDrawer = async () => {
    if (!actionsStationId || duplicatingId) return;
    const id = actionsStationId;
    setDuplicatingId(id);
    try {
      const data = await adminApiFetch<{ station: Station }>(`/api/admin/stations/${id}/duplicate`, { method: 'POST' });
      closeActions();
      if (data?.station?._id) {
        navigate(`/admin/stations/${data.station._id}`);
      } else {
        onRefresh();
      }
    } finally {
      setDuplicatingId(null);
    }
  };

  const moveStationToFolder = useCallback(async (stationId: string, folderId: string | null) => {
    if (!canEdit) return;
    const current = stationsRef.current.find((s) => s._id === stationId);
    if (!current) return;
    if ((current.folderId ?? null) === folderId) return;
    try {
      await adminApiFetch(`/api/admin/stations/${stationId}/folder`, {
        method: 'PATCH',
        body: JSON.stringify({ folderId }),
      });
      onRefresh();
    } catch {
    }
  }, [canEdit, onRefresh]);

  const submitFolder = async (name: string, color: string) => {
    if (folderModal?.mode === 'edit' && folderModal.folder) {
      await adminApiFetch(`/api/admin/station-folders/${folderModal.folder._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, color }),
      });
    } else {
      await adminApiFetch('/api/admin/station-folders', {
        method: 'POST',
        body: JSON.stringify({ name, color }),
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
      await adminApiFetch(`/api/admin/station-folders/${folder._id}`, { method: 'DELETE' });
      if (openFolderId === folder._id) setOpenFolderId(null);
      closeAllMenus();
      onRefresh();
    } finally {
      setDeletingFolderId(null);
    }
  };

  const onMouseDragStart = (e: React.DragEvent, id: string) => {
    mouseDragIdRef.current = id;
    setDraggingStationId(id);
    try { e.dataTransfer.setData('text/plain', id); } catch { }
    e.dataTransfer.effectAllowed = 'move';
  };
  const onMouseDragEnd = () => {
    mouseDragIdRef.current = null;
    setDraggingStationId(null);
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
    setDraggingStationId(null);
    setDragOverKey(null);
    if (id) moveStationToFolder(id, folderId);
  };

  const hitTestKey = useCallback((x: number, y: number): string | null => {
    for (const [key, el] of dropTargetRefs.current.entries()) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return key;
    }
    return null;
  }, []);
  const onTouchMovePrevent = useCallback((e: TouchEvent) => {
    if (touchDragRef.current) e.preventDefault();
  }, []);
  const onTouchPointerMove = useCallback((e: PointerEvent) => {
    if (!touchDragRef.current) {
      const lp = longPressRef.current;
      if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 12) {
        clearTimeout(lp.timer);
        longPressRef.current = null;
      }
      return;
    }
    setDragOverKey(hitTestKey(e.clientX, e.clientY));
    const name = stationsRef.current.find((s) => s._id === touchDragRef.current!.stationId)?.name || '';
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
    setDraggingStationId(null);
    setDragOverKey(null);
    if (st) {
      justDraggedRef.current = true;
      const key = hitTestKey(e.clientX, e.clientY);
      if (key) moveStationToFolder(st.stationId, key === '__root__' ? null : key);
    }
  }, [onTouchPointerMove, onTouchMovePrevent, hitTestKey, moveStationToFolder]);
  const onRowPointerDown = useCallback((e: React.PointerEvent, id: string) => {
    if (e.pointerType !== 'touch') return;
    if ((e.target as HTMLElement).closest('[data-row-actions]')) return;
    justDraggedRef.current = false;
    const x = e.clientX, y = e.clientY;
    const timer = setTimeout(() => {
      touchDragRef.current = { stationId: id };
      setDraggingStationId(id);
      const name = stationsRef.current.find((s) => s._id === id)?.name || '';
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

  const typeLabel = (type?: string) => stationTypeLabel(t as Record<string, string>, type);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    stations.forEach((s) => s.tags?.forEach((tag) => tagSet.add(tag)));
    return [...tagSet].sort();
  }, [stations]);

  const allCustomers = useMemo(() => {
    const set = new Set<string>();
    stations.forEach((s) => { if (s.customer) set.add(s.customer); });
    return [...set].sort();
  }, [stations]);

  const allTypes = useMemo(() => {
    const set = new Set<string>();
    stations.forEach((s) => { if (s.type) set.add(s.type); });
    return [...set].sort();
  }, [stations]);

  const tagGroups = useMemo(() => {
    const customersLower = new Set(allCustomers.map((c) => c.toLowerCase()));
    const typesLower = new Set(allTypes.map((x) => x.toLowerCase()));
    const source: string[] = [];
    const projects: string[] = [];
    const contentTypes: string[] = [];
    const general: string[] = [];
    for (const tag of allTags) {
      const lower = tag.toLowerCase();
      if (SOURCE_TAGS.has(tag)) source.push(tag);
      else if (customersLower.has(lower)) projects.push(tag);
      else if (typesLower.has(lower)) contentTypes.push(tag);
      else general.push(tag);
    }
    return { source, projects, contentTypes, general };
  }, [allTags, allCustomers, allTypes]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const searching = search.trim() !== '';
  const q = search.trim().toLowerCase();

  const typeTagFiltered = useMemo(() => {
    let result = stations;
    if (typeFilter !== 'all') result = result.filter((s) => s.type === typeFilter);
    if (activeTags.size > 0) {
      result = result.filter((s) => {
        const tags = s.tags || [];
        return [...activeTags].every((tag) => tags.includes(tag));
      });
    }
    return result;
  }, [stations, typeFilter, activeTags]);

  const visibleStations = useMemo(() => {
    const matches = (s: Station) =>
      s.name.toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.customer || '').toLowerCase().includes(q) ||
      (s.theme || '').toLowerCase().includes(q) ||
      (s.tags || []).some((tag) => tag.toLowerCase().includes(q));
    if (searching) return typeTagFiltered.filter(matches);
    if (openFolderId) return typeTagFiltered.filter((s) => (s.folderId ?? null) === openFolderId);
    return typeTagFiltered.filter((s) => !s.folderId);
  }, [typeTagFiltered, searching, q, openFolderId]);

  const visibleFolders = useMemo(() => {
    if (searching) return folders.filter((f) => f.name.toLowerCase().includes(q));
    if (openFolderId) return [];
    return folders;
  }, [folders, searching, q, openFolderId]);

  const countFor = (folderId: string) => stations.filter((s) => (s.folderId ?? null) === folderId).length;
  const openFolder = openFolderId ? folders.find((f) => f._id === openFolderId) || null : null;

  const { page, setPage, totalPages, pageItems, totalItems, showing } = usePagination(visibleStations);

  useEffect(() => { setPage(1); },
    [typeFilter]);

  useEffect(() => {
    if (!tagDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTagDrawerOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tagDrawerOpen]);

  useEffect(() => {
    if (!actionsStationId && !actionsFolderId) return;
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
  }, [actionsStationId, actionsFolderId, closeAllMenus]);

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

  const renderFolderMenu = (folder: Folder) => !canEdit ? null : (
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

  const renderStationMenu = (station: Station) => !canEdit ? null : (
    <RowActionWrapper data-row-actions onClick={(e) => e.stopPropagation()}>
      <RowActionIconButton
        type="button"
        aria-label={t.actions}
        title={t.actions}
        onClick={(e) => (actionsStationId === station._id ? closeActions() : openStationActions(station._id, e.currentTarget.getBoundingClientRect()))}
      >
        <PencilIcon />
      </RowActionIconButton>
      {actionsStationId === station._id && (
        <RowActionMenu style={actionMenuStyle(menuAnchorRect)}>
          {!moveMenuOpen ? (
            <>
              <RowActionMenuItem
                type="button"
                disabled={duplicatingId === station._id || deletingId === station._id}
                onClick={handleDuplicateFromDrawer}
              >
                {duplicatingId === station._id ? t.duplicating : t.duplicate}
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
                disabled={duplicatingId === station._id || deletingId === station._id}
                onClick={handleDeleteFromDrawer}
              >
                {confirmDeleteInDrawer ? t.confirmDelete : t.delete}
              </RowActionMenuItem>
            </>
          ) : (
            <>
              {folders.map((f) => (
                <RowActionMenuItem
                  key={f._id}
                  type="button"
                  disabled={(station.folderId ?? null) === f._id}
                  onClick={() => { moveStationToFolder(station._id, f._id); closeActions(); }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <FolderGlyph color={resolveFolderColor(f.color).accent} size={16} />
                    {f.name}
                  </span>
                </RowActionMenuItem>
              ))}
              {station.folderId && (
                <RowActionMenuItem
                  type="button"
                  onClick={() => { moveStationToFolder(station._id, null); closeActions(); }}
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

  const noResultsShown = visibleStations.length === 0 && visibleFolders.length === 0;

  return (
    <>
      <SectionHeaderRow>
        <PageTitleNoMargin>{t.title}</PageTitleNoMargin>
        <HeaderButtons>
          {canEdit && (
            <SmallActionButton onClick={() => setFolderModal({ mode: 'create' })}>
              {t.newFolder}
            </SmallActionButton>
          )}
          {canEdit && !hideCreateButton && (
            <SmallActionButton onClick={() => navigate(`/admin/stations/new${defaultType ? `?type=${defaultType}` : ''}`)}>
              {t.createNew}
            </SmallActionButton>
          )}
        </HeaderButtons>
      </SectionHeaderRow>

      <FilterRow>
        {allTags.length > 0 && (
          <OpenTagDrawerButton
            type="button"
            hasActive={activeTags.size > 0}
            onClick={() => setTagDrawerOpen(true)}
          >
            {t.filterByTags}
            {activeTags.size > 0 && <TagCountBadge>{activeTags.size}</TagCountBadge>}
          </OpenTagDrawerButton>
        )}
        <SearchInput
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </FilterRow>

      {tagDrawerOpen && allTags.length > 0 && (
        <TagDrawerBackdrop onClick={() => setTagDrawerOpen(false)}>
          <TagDrawerPanel onClick={(e) => e.stopPropagation()}>
            <TagDrawerHeader>
              <TagDrawerTitle>{t.tagFiltersTitle}</TagDrawerTitle>
              <TagDrawerActions>
                {activeTags.size > 0 && (
                  <TagDrawerClearButton type="button" onClick={() => setActiveTags(new Set())}>
                    {t.clearTagFilters}
                  </TagDrawerClearButton>
                )}
                <TagDrawerDoneButton type="button" onClick={() => setTagDrawerOpen(false)}>
                  {t.doneTagFilters}
                </TagDrawerDoneButton>
              </TagDrawerActions>
            </TagDrawerHeader>
            <TagDrawerBody>
              <TagGroupsInDrawer>
                {tagGroups.general.length > 0 && (
                  <TagGroup>
                    <TagGroupLabel>[{t.generalTags}]</TagGroupLabel>
                    <TagGroupChips>
                      {tagGroups.general.map((tag) => (
                        <TagChip key={tag} active={activeTags.has(tag)} onClick={() => toggleTag(tag)}>{tag}</TagChip>
                      ))}
                    </TagGroupChips>
                  </TagGroup>
                )}
                {tagGroups.projects.length > 0 && (
                  <TagGroup>
                    <TagGroupLabel>[{t.projectsTags}]</TagGroupLabel>
                    <TagGroupChips>
                      {tagGroups.projects.map((tag) => (
                        <TagChip key={tag} active={activeTags.has(tag)} onClick={() => toggleTag(tag)}>{tag}</TagChip>
                      ))}
                    </TagGroupChips>
                  </TagGroup>
                )}
                {tagGroups.source.length > 0 && (
                  <TagGroup>
                    <TagGroupLabel>[{t.sourceTags}]</TagGroupLabel>
                    <TagGroupChips>
                      {tagGroups.source.map((tag) => (
                        <TagChip key={tag} active={activeTags.has(tag)} onClick={() => toggleTag(tag)}>{tag}</TagChip>
                      ))}
                    </TagGroupChips>
                  </TagGroup>
                )}
                {tagGroups.contentTypes.length > 0 && (
                  <TagGroup>
                    <TagGroupLabel>[{t.contentTypeTags}]</TagGroupLabel>
                    <TagGroupChips>
                      {tagGroups.contentTypes.map((tag) => (
                        <TagChip key={tag} active={activeTags.has(tag)} onClick={() => toggleTag(tag)}>{tag}</TagChip>
                      ))}
                    </TagGroupChips>
                  </TagGroup>
                )}
              </TagGroupsInDrawer>
            </TagDrawerBody>
          </TagDrawerPanel>
        </TagDrawerBackdrop>
      )}

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
            ‹ {t.allStations}
          </BreadcrumbLink>
          <BreadcrumbSep>/</BreadcrumbSep>
          <BreadcrumbCurrent>
            <FolderGlyph color={resolveFolderColor(openFolder.color).accent} size={18} />
            {openFolder.name}
          </BreadcrumbCurrent>
        </Breadcrumb>
      )}

      {stations.length === 0 && folders.length === 0 ? (
        <AdminCard>
          <EmptyText>{t.noStations}</EmptyText>
        </AdminCard>
      ) : (
        <>
          <DesktopOnly>
            <AdminCardNoPadding>
              <Table>
                <thead>
                  <tr>
                    <th>{t.name}</th>
                    <th>{t.type}</th>
                    <th>{t.tags}</th>
                    <th>{t.created}</th>
                    <th></th>
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
                            <CellBold>{folder.name}</CellBold>
                            <FolderCount>{countFor(folder._id)}</FolderCount>
                          </FolderNameWrap>
                        </td>
                        <td colSpan={3} />
                        <CellAlignEnd>{renderFolderMenu(folder)}</CellAlignEnd>
                      </tr>
                    );
                  })}
                  {pageItems.map((station) => (
                    <tr
                      key={station._id}
                      draggable={canEdit}
                      onDragStart={(e) => onMouseDragStart(e, station._id)}
                      onDragEnd={onMouseDragEnd}
                      onPointerDown={(e) => onRowPointerDown(e, station._id)}
                      onClick={() => {
                        if (justDraggedRef.current) { justDraggedRef.current = false; return; }
                        navigate(`/admin/stations/${station._id}`);
                      }}
                      style={dragRowStyle(draggingStationId === station._id)}
                    >
                      <td>
                        <CellBold>{station.name}</CellBold>
                        {(station.customer || station.theme) && (
                          <CellMuted style={{ fontSize: 12 }}>
                            {[station.customer, station.theme].filter(Boolean).join(' · ')}
                          </CellMuted>
                        )}
                      </td>
                      <td><Chip>{typeLabel(station.type)}</Chip></td>
                      <td>
                        {station.tags && station.tags.length > 0 ? (
                          station.tags.map((tag) => <TagBadge key={tag}>{tag}</TagBadge>)
                        ) : (
                          <CellMuted>—</CellMuted>
                        )}
                      </td>
                      <td><CellMuted>{new Date(station.createdAt).toLocaleDateString()}</CellMuted></td>
                      <CellAlignEnd>{renderStationMenu(station)}</CellAlignEnd>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </AdminCardNoPadding>
          </DesktopOnly>

          <HideOnDesktop>
            <MobileCardList>
              {visibleFolders.map((folder) => {
                const fc = resolveFolderColor(folder.color);
                const isOver = dragOverKey === folder._id;
                return (
                  <MobileCardItem
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
                        <MobileCardNameRow>{folder.name}</MobileCardNameRow>
                        <FolderCount>{countFor(folder._id)}</FolderCount>
                      </FolderNameWrap>
                      {renderFolderMenu(folder)}
                    </MobileCardHeader>
                  </MobileCardItem>
                );
              })}
              {pageItems.map((station) => (
                <MobileCardItem
                  key={station._id}
                  draggable={canEdit}
                  onDragStart={(e) => onMouseDragStart(e, station._id)}
                  onDragEnd={onMouseDragEnd}
                  onPointerDown={(e) => onRowPointerDown(e, station._id)}
                  onClick={() => {
                    if (justDraggedRef.current) { justDraggedRef.current = false; return; }
                    navigate(`/admin/stations/${station._id}`);
                  }}
                  style={dragRowStyle(draggingStationId === station._id)}
                >
                  <MobileCardHeader>
                    <div>
                      <MobileCardNameRow>{station.name}</MobileCardNameRow>
                      {(station.customer || station.theme) && (
                        <CellMuted style={{ fontSize: 12 }}>
                          {[station.customer, station.theme].filter(Boolean).join(' · ')}
                        </CellMuted>
                      )}
                      {station.tags && station.tags.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {station.tags.map((tag) => <TagBadge key={tag}>{tag}</TagBadge>)}
                        </div>
                      )}
                      <MobileCardRow>
                        <Chip>{typeLabel(station.type)}</Chip>
                        <MobileCardDate>{new Date(station.createdAt).toLocaleDateString()}</MobileCardDate>
                      </MobileCardRow>
                    </div>
                    {renderStationMenu(station)}
                  </MobileCardHeader>
                </MobileCardItem>
              ))}
            </MobileCardList>
          </HideOnDesktop>

          {openFolder && !searching && visibleStations.length === 0 && (
            <AdminCard><EmptyText>{t.emptyFolder}</EmptyText></AdminCard>
          )}
          {(searching || typeFilter !== 'all' || activeTags.size > 0) && noResultsShown && (
            <AdminCard><EmptyText>{t.noResults}</EmptyText></AdminCard>
          )}

          {visibleStations.length > 0 && (
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
