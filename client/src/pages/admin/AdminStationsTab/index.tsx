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
  SmallDangerButton,
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

interface AdminStationsTabProps {
  stations: Station[];
  onRefresh: () => void;
  defaultType?: string;
  hideCreateButton?: boolean;
}

export default function AdminStationsTab({ stations, onRefresh, defaultType, hideCreateButton }: AdminStationsTabProps) {
  const navigate = useNavigate();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [tagDrawerOpen, setTagDrawerOpen] = useState(false);
  const t = useTranslations(texts);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await adminApiFetch(`/api/admin/stations/${id}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    onRefresh();
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
        <PaginatedStations filtered={filtered} navigate={navigate} confirmDeleteId={confirmDeleteId} handleDelete={handleDelete} typeLabel={typeLabel} t={t} />
      )}
    </>
  );
}

function PaginatedStations({ filtered, navigate, confirmDeleteId, handleDelete, typeLabel, t }: {
  filtered: Station[];
  navigate: ReturnType<typeof useNavigate>;
  confirmDeleteId: string | null;
  handleDelete: (id: string) => void;
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
                    <SmallDangerButton
                      confirm={confirmDeleteId === station._id}
                      onClick={(e) => { e.stopPropagation(); handleDelete(station._id); }}
                    >
                      {confirmDeleteId === station._id ? t.confirmDelete : t.delete}
                    </SmallDangerButton>
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
                <SmallDangerButton
                  confirm={confirmDeleteId === station._id}
                  onClick={(e) => { e.stopPropagation(); handleDelete(station._id); }}
                >
                  {confirmDeleteId === station._id ? t.confirmDelete : t.delete}
                </SmallDangerButton>
              </MobileCardHeader>
            </MobileCardItem>
          ))}
        </MobileCardList>
      </HideOnDesktop>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={showing} totalItems={totalItems} />
    </>
  );
}
