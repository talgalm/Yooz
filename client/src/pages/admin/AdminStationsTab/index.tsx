import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled, keyframes } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminStationsTab.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import Pagination from '../../../components/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import type { Station } from '../AdminDashboardPage';
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

// ─── Local styled ───

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

const SearchInput = styled(Input)({
  flex: 1,
  minWidth: 200,
  padding: '10px 14px',
  fontSize: 14,
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

interface AdminStationsTabProps {
  stations: Station[];
  onRefresh: () => void;
  defaultType?: string;
  hideCreateButton?: boolean;
}

export default function AdminStationsTab({ stations, onRefresh, defaultType, hideCreateButton }: AdminStationsTabProps) {
  const navigate = useNavigate();
  const [actionsStationId, setActionsStationId] = useState<string | null>(null);
  const [confirmDeleteInDrawer, setConfirmDeleteInDrawer] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [tagDrawerOpen, setTagDrawerOpen] = useState(false);
  const t = useTranslations(texts);

  const openActions = (id: string) => {
    setActionsStationId(id);
    setConfirmDeleteInDrawer(false);
  };

  const closeActions = () => {
    setActionsStationId(null);
    setConfirmDeleteInDrawer(false);
  };

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

  const typeLabel = (type?: string) => {
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
      case 'enteringText': return t.typeEnteringText;
      default: return type || '—';
    }
  };

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    stations.forEach((s) => s.tags?.forEach((tag) => tagSet.add(tag)));
    return [...tagSet].sort();
  }, [stations]);

  const allCustomers = useMemo(() => {
    const set = new Set<string>();
    stations.forEach((s) => {
      if (s.customer) set.add(s.customer);
    });
    return [...set].sort();
  }, [stations]);

  const allTypes = useMemo(() => {
    const set = new Set<string>();
    stations.forEach((s) => {
      if (s.type) set.add(s.type);
    });
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
      if (SOURCE_TAGS.has(tag)) {
        source.push(tag);
      } else if (customersLower.has(lower)) {
        projects.push(tag);
      } else if (typesLower.has(lower)) {
        contentTypes.push(tag);
      } else {
        general.push(tag);
      }
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

  const filtered = useMemo(() => {
    let result = stations;

    if (activeTags.size > 0) {
      result = result.filter((s) => {
        const tags = s.tags || [];
        return [...activeTags].every((tag) => tags.includes(tag));
      });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.customer?.toLowerCase().includes(q) ||
        s.theme?.toLowerCase().includes(q) ||
        s.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return result;
  }, [stations, search, activeTags]);

  useEffect(() => {
    if (!tagDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTagDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tagDrawerOpen]);

  useEffect(() => {
    if (!actionsStationId) return;
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
  }, [actionsStationId]);

  return (
    <>
      <SectionHeaderRow>
        <PageTitleNoMargin>{t.title}</PageTitleNoMargin>
        {!hideCreateButton && (
          <SmallActionButton onClick={() => navigate(`/admin/stations/new${defaultType ? `?type=${defaultType}` : ''}`)}>
            {t.createNew}
          </SmallActionButton>
        )}
      </SectionHeaderRow>

      <FilterRow>
        {allTags.length > 0 && (
          <OpenTagDrawerButton
            type="button"
            hasActive={activeTags.size > 0}
            onClick={() => setTagDrawerOpen(true)}
          >
            {t.filterByTags}
            {activeTags.size > 0 && (
              <TagCountBadge>{activeTags.size}</TagCountBadge>
            )}
          </OpenTagDrawerButton>
        )}
        <SearchInput
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </FilterRow>

      {tagDrawerOpen && allTags.length > 0 && (
        <TagDrawerBackdrop onClick={() => setTagDrawerOpen(false)}>
          <TagDrawerPanel onClick={(e) => e.stopPropagation()}>
            <TagDrawerHeader>
              <TagDrawerTitle>{t.tagFiltersTitle}</TagDrawerTitle>
              <TagDrawerActions>
                {activeTags.size > 0 && (
                  <TagDrawerClearButton
                    type="button"
                    onClick={() => setActiveTags(new Set())}
                  >
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
                        <TagChip key={tag} active={activeTags.has(tag)} onClick={() => toggleTag(tag)}>
                          {tag}
                        </TagChip>
                      ))}
                    </TagGroupChips>
                  </TagGroup>
                )}
                {tagGroups.projects.length > 0 && (
                  <TagGroup>
                    <TagGroupLabel>[{t.projectsTags}]</TagGroupLabel>
                    <TagGroupChips>
                      {tagGroups.projects.map((tag) => (
                        <TagChip key={tag} active={activeTags.has(tag)} onClick={() => toggleTag(tag)}>
                          {tag}
                        </TagChip>
                      ))}
                    </TagGroupChips>
                  </TagGroup>
                )}
                {tagGroups.source.length > 0 && (
                  <TagGroup>
                    <TagGroupLabel>[{t.sourceTags}]</TagGroupLabel>
                    <TagGroupChips>
                      {tagGroups.source.map((tag) => (
                        <TagChip key={tag} active={activeTags.has(tag)} onClick={() => toggleTag(tag)}>
                          {tag}
                        </TagChip>
                      ))}
                    </TagGroupChips>
                  </TagGroup>
                )}
                {tagGroups.contentTypes.length > 0 && (
                  <TagGroup>
                    <TagGroupLabel>[{t.contentTypeTags}]</TagGroupLabel>
                    <TagGroupChips>
                      {tagGroups.contentTypes.map((tag) => (
                        <TagChip key={tag} active={activeTags.has(tag)} onClick={() => toggleTag(tag)}>
                          {tag}
                        </TagChip>
                      ))}
                    </TagGroupChips>
                  </TagGroup>
                )}
              </TagGroupsInDrawer>
            </TagDrawerBody>
          </TagDrawerPanel>
        </TagDrawerBackdrop>
      )}

      {filtered.length === 0 ? (
        <AdminCard>
          <EmptyText>{stations.length === 0 ? t.noStations : t.noResults}</EmptyText>
        </AdminCard>
      ) : (
        <PaginatedStations
          filtered={filtered}
          navigate={navigate}
          actionsStationId={actionsStationId}
          openActions={openActions}
          closeActions={closeActions}
          confirmDeleteInDrawer={confirmDeleteInDrawer}
          duplicatingId={duplicatingId}
          deletingId={deletingId}
          handleDuplicateFromDrawer={handleDuplicateFromDrawer}
          handleDeleteFromDrawer={handleDeleteFromDrawer}
          typeLabel={typeLabel}
          t={t}
        />
      )}
    </>
  );
}

function PaginatedStations({
  filtered,
  navigate,
  actionsStationId,
  openActions,
  closeActions,
  confirmDeleteInDrawer,
  duplicatingId,
  deletingId,
  handleDuplicateFromDrawer,
  handleDeleteFromDrawer,
  typeLabel,
  t,
}: {
  filtered: Station[];
  navigate: ReturnType<typeof useNavigate>;
  actionsStationId: string | null;
  openActions: (id: string) => void;
  closeActions: () => void;
  confirmDeleteInDrawer: boolean;
  duplicatingId: string | null;
  deletingId: string | null;
  handleDuplicateFromDrawer: () => void;
  handleDeleteFromDrawer: () => void;
  typeLabel: (type?: string) => string;
  t: Record<string, string>;
}) {
  const { page, setPage, totalPages, pageItems, totalItems, showing } = usePagination(filtered);

  return (
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
              {pageItems.map((station) => (
                <tr key={station._id} onClick={() => navigate(`/admin/stations/${station._id}`)}>
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
                  <CellAlignEnd>
                    <RowActionWrapper data-row-actions onClick={(e) => e.stopPropagation()}>
                      <RowActionIconButton
                        type="button"
                        aria-label={t.actions}
                        title={t.actions}
                        onClick={() => actionsStationId === station._id ? closeActions() : openActions(station._id)}
                      >
                        <PencilIcon />
                      </RowActionIconButton>
                      {actionsStationId === station._id && (
                        <RowActionMenu>
                          <RowActionMenuItem
                            type="button"
                            disabled={duplicatingId === station._id || deletingId === station._id}
                            onClick={handleDuplicateFromDrawer}
                          >
                            {duplicatingId === station._id ? t.duplicating : t.duplicate}
                          </RowActionMenuItem>
                          <RowActionMenuItem
                            type="button"
                            danger
                            confirm={confirmDeleteInDrawer}
                            disabled={duplicatingId === station._id || deletingId === station._id}
                            onClick={handleDeleteFromDrawer}
                          >
                            {confirmDeleteInDrawer ? t.confirmDelete : t.delete}
                          </RowActionMenuItem>
                        </RowActionMenu>
                      )}
                    </RowActionWrapper>
                  </CellAlignEnd>
                </tr>
              ))}
            </tbody>
          </Table>
        </AdminCardNoPadding>
      </DesktopOnly>

      <HideOnDesktop>
        <MobileCardList>
          {pageItems.map((station) => (
            <MobileCardItem key={station._id} onClick={() => navigate(`/admin/stations/${station._id}`)}>
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
                <RowActionWrapper data-row-actions onClick={(e) => e.stopPropagation()}>
                  <RowActionIconButton
                    type="button"
                    aria-label={t.actions}
                    title={t.actions}
                    onClick={() => actionsStationId === station._id ? closeActions() : openActions(station._id)}
                  >
                    <PencilIcon />
                  </RowActionIconButton>
                  {actionsStationId === station._id && (
                    <RowActionMenu>
                      <RowActionMenuItem
                        type="button"
                        disabled={duplicatingId === station._id || deletingId === station._id}
                        onClick={handleDuplicateFromDrawer}
                      >
                        {duplicatingId === station._id ? t.duplicating : t.duplicate}
                      </RowActionMenuItem>
                      <RowActionMenuItem
                        type="button"
                        danger
                        confirm={confirmDeleteInDrawer}
                        disabled={duplicatingId === station._id || deletingId === station._id}
                        onClick={handleDeleteFromDrawer}
                      >
                        {confirmDeleteInDrawer ? t.confirmDelete : t.delete}
                      </RowActionMenuItem>
                    </RowActionMenu>
                  )}
                </RowActionWrapper>
              </MobileCardHeader>
            </MobileCardItem>
          ))}
        </MobileCardList>
      </HideOnDesktop>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={showing} totalItems={totalItems} />
    </>
  );
}
