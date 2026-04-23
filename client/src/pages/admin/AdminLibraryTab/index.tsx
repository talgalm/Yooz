import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled, keyframes } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminLibraryTab.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import Pagination from '../../../components/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import {
  AdminCard,
  Table,
  Chip,
  DesktopOnly,
  HideOnDesktop,
  MobileCardList,
  MobileCardItem,
  Input,
  SegmentedControl,
  SegmentedButton,
} from '../../../components/styled';
import {
  PageTitleNoMargin,
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
  LoadingContainer,
  LoadingCenter,
  Spinner,
  SpinKeyframe,
} from '../styled';

// ─── Types ───

interface LibraryItem {
  _id: string;
  kind: 'game' | 'station';
  name: string;
  type: string;
  description?: string;
  customer?: string;
  lang?: string;
  tags: string[];
  settings: Record<string, unknown>;
  createdAt: string;
}

// ─── Styled ───

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

const CustomerSelect = styled('select')({
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 10,
  border: '1.5px solid #ddd',
  background: '#fff',
  color: '#333',
  fontFamily: 'inherit',
  cursor: 'pointer',
  minWidth: 160,
  '&:focus': {
    outline: 'none',
    borderColor: '#6c5ce7',
  },
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

const KindBadge = styled('span')<{ kind: 'game' | 'station' }>(({ kind }) => ({
  display: 'inline-block',
  padding: '3px 10px',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 6,
  background: kind === 'game' ? '#e3f2fd' : '#e8f5e9',
  color: kind === 'game' ? '#1565c0' : '#2e7d32',
}));

const CopyButton = styled('button')({
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 8,
  border: '1.5px solid #6c5ce7',
  background: '#f0eefa',
  color: '#6c5ce7',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
  whiteSpace: 'nowrap',
  '&:hover': {
    background: '#6c5ce7',
    color: '#fff',
  },
  '&:disabled': {
    opacity: 0.5,
    cursor: 'default',
  },
});

const StatsRow = styled('div')({
  display: 'flex',
  gap: 16,
  alignItems: 'center',
  marginBottom: 20,
  flexWrap: 'wrap',
});

const StatBox = styled('div')({
  padding: '8px 16px',
  background: '#fff',
  borderRadius: 10,
  border: '1px solid #ece8f0',
  fontSize: 13,
  fontWeight: 600,
  color: '#555',
  '& strong': {
    color: '#6c5ce7',
    fontSize: 16,
    marginInlineEnd: 4,
  },
});

const PreviewOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
});

const PreviewCard = styled('div')({
  background: '#fff',
  borderRadius: 16,
  padding: 28,
  maxWidth: 700,
  width: '100%',
  maxHeight: '80vh',
  overflow: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
});

const PreviewHeader = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 20,
  gap: 12,
});

const PreviewTitle = styled('h2')({
  margin: 0,
  fontSize: 20,
  color: '#222',
});

const CloseButton = styled('button')({
  padding: '6px 14px',
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 8,
  border: '1.5px solid #ddd',
  background: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { background: '#f5f5f5' },
});

const QuestionBlock = styled('div')({
  padding: '12px 16px',
  marginBottom: 8,
  background: '#faf8fe',
  borderRadius: 10,
  border: '1px solid #ece8f0',
  fontSize: 14,
  '& .q-text': {
    fontWeight: 600,
    marginBottom: 6,
    color: '#333',
  },
  '& .q-answers': {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    fontSize: 13,
    color: '#666',
  },
  '& .correct': {
    color: '#2e7d32',
    fontWeight: 600,
  },
});

// ─── Component ───

export default function AdminLibraryTab() {
  const t = useTranslations(texts);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'game' | 'station'>('all');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allCustomers, setAllCustomers] = useState<string[]>([]);
  const [allTypes, setAllTypes] = useState<string[]>([]);
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<LibraryItem | null>(null);
  const [tagDrawerOpen, setTagDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (kindFilter !== 'all') params.set('kind', kindFilter);
      if (customerFilter) params.set('customer', customerFilter);
      activeTags.forEach((tag) => params.append('tag', tag));
      if (search.trim()) params.set('q', search.trim());
      params.set('limit', '500');

      const data = await adminApiFetch<{ items: LibraryItem[]; total: number }>(
        `/api/admin/library?${params.toString()}`
      );
      setItems(data.items);
      setTotal(data.total);
    } catch {
      // silent
    } finally {
      setInitialLoad(false);
    }
  }, [kindFilter, activeTags, customerFilter, search]);

  const fetchTags = useCallback(async () => {
    try {
      const data = await adminApiFetch<{ tags: string[]; customers: string[]; types: string[] }>('/api/admin/library/tags');
      setAllTags(data.tags);
      setAllCustomers(data.customers || []);
      setAllTypes(data.types || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    const timer = setTimeout(() => fetchItems(), 300); // debounce search
    return () => clearTimeout(timer);
  }, [fetchItems]);

  useEffect(() => {
    if (!tagDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTagDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tagDrawerOpen]);

  const validateAndExport = (item: LibraryItem) => {
    setExportError(null);

    // Basic validation
    if (!item.name?.trim()) {
      setExportError(`${t.exportError} ${t.exportErrorNoName}`);
      return;
    }

    const SUPPORTED_STATION_TYPES = ['text', 'video', 'image', 'collage'];
    const SUPPORTED_GAME_TYPES = ['trivia', 'order', 'puzzle', 'trueFalse', 'ballGame', 'trashSort'];

    if (item.kind === 'station') {
      if (!SUPPORTED_STATION_TYPES.includes(item.type)) {
        setExportError(`${t.exportError} ${t.exportErrorUnsupportedType} "${item.type}"`);
        return;
      }
      // Check minimal settings integrity
      const s = item.settings || {};
      if (item.type === 'text' && !s.content) {
        setExportError(`${t.exportError} ${t.exportErrorCorruptData} ${t.exportSuggestManual}`);
        return;
      }
      if ((item.type === 'video' || item.type === 'image') && !s.mediaUrl) {
        setExportError(`${t.exportError} ${t.exportErrorCorruptData} ${t.exportSuggestManual}`);
        return;
      }

      // Navigate to create station with prefill
      navigate(`/admin/stations/new?type=${item.type}`, {
        state: { libraryItem: item },
      });
    } else if (item.kind === 'game') {
      if (!SUPPORTED_GAME_TYPES.includes(item.type)) {
        setExportError(`${t.exportError} ${t.exportErrorUnsupportedType} "${item.type}"`);
        return;
      }
      // For trivia, check questions exist
      if (item.type === 'trivia') {
        const questions = (item.settings as { questions?: unknown[] })?.questions;
        if (!Array.isArray(questions) || questions.length === 0) {
          setExportError(`${t.exportError} ${t.exportErrorNoQuestions} ${t.exportSuggestManual}`);
          return;
        }
      }

      // Navigate to create game with prefill
      navigate(`/admin/games/new?type=${item.type}`, {
        state: { libraryItem: item },
      });
    } else {
      setExportError(`${t.exportError} ${t.exportErrorUnsupportedType}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await adminApiFetch(`/api/admin/library/${id}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    fetchItems();
    fetchTags();
  };

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const tagGroups = useMemo(() => {
    const customersLower = new Set(allCustomers.map((c) => c.toLowerCase()));
    const typesLower = new Set(allTypes.map((t) => t.toLowerCase()));

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

  // Stats
  const stats = useMemo(() => {
    const games = items.filter((i) => i.kind === 'game').length;
    const stations = items.filter((i) => i.kind === 'station').length;
    const customers = new Set(items.map((i) => i.customer).filter(Boolean)).size;
    return { games, stations, customers };
  }, [items]);

  const getQuestionCount = (item: LibraryItem) => {
    const questions = (item.settings as { questions?: unknown[] })?.questions;
    return Array.isArray(questions) ? questions.length : 0;
  };

  if (initialLoad) {
    return (
      <LoadingContainer>
        <LoadingCenter>
          <SpinKeyframe />
          <Spinner />
        </LoadingCenter>
      </LoadingContainer>
    );
  }

  return (
    <>
      <PageTitleNoMargin style={{ marginBottom: 20 }}>{t.title}</PageTitleNoMargin>

      {/* Stats */}
      <StatsRow>
        <StatBox><strong>{total}</strong> {t.allKinds}</StatBox>
        <StatBox><strong>{stats.games}</strong> {t.games}</StatBox>
        <StatBox><strong>{stats.stations}</strong> {t.stations}</StatBox>
        <StatBox><strong>{stats.customers}</strong> {t.customer}</StatBox>
      </StatsRow>

      {/* Kind filter */}
      <div style={{ marginBottom: 16 }}>
        <SegmentedControl>
          <SegmentedButton active={kindFilter === 'all'} onClick={() => setKindFilter('all')}>
            {t.allKinds}
          </SegmentedButton>
          <SegmentedButton active={kindFilter === 'game'} onClick={() => setKindFilter('game')}>
            {t.games}
          </SegmentedButton>
          <SegmentedButton active={kindFilter === 'station'} onClick={() => setKindFilter('station')}>
            {t.stations}
          </SegmentedButton>
        </SegmentedControl>
      </div>

      {/* Search + Customer filter + tag drawer trigger */}
      <FilterRow>
        {allCustomers.length > 0 && (
          <CustomerSelect
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
          >
            <option value="">{t.allCustomers}</option>
            {allCustomers.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </CustomerSelect>
        )}
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

      {/* Tag filters drawer */}
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

      {/* Export error */}
      {exportError && (
        <div style={{
          padding: '12px 18px',
          marginBottom: 16,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 10,
          color: '#dc2626',
          fontSize: 14,
          fontWeight: 500,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{exportError}</span>
          <button
            onClick={() => setExportError(null)}
            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Table / Cards */}
      {items.length === 0 ? (
        <AdminCard>
          <EmptyText>{total === 0 ? t.noItems : t.noResults}</EmptyText>
        </AdminCard>
      ) : (
        <PaginatedLibrary
          items={items}
          confirmDeleteId={confirmDeleteId}
          handleExport={validateAndExport}
          handleDelete={handleDelete}
          setPreviewItem={setPreviewItem}
          getQuestionCount={getQuestionCount}
          t={t}
        />
      )}

      {/* Preview Modal */}
      {previewItem && (
        <PreviewOverlay onClick={() => setPreviewItem(null)}>
          <PreviewCard onClick={(e) => e.stopPropagation()}>
            <PreviewHeader>
              <div>
                <PreviewTitle>{previewItem.name}</PreviewTitle>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                  <KindBadge kind={previewItem.kind}>
                    {previewItem.kind === 'game' ? t.game : t.station}
                  </KindBadge>
                  <CellMuted>{previewItem.type}</CellMuted>
                  {previewItem.customer && <CellMuted>· {previewItem.customer}</CellMuted>}
                  {previewItem.lang && <CellMuted>· {previewItem.lang}</CellMuted>}
                </div>
                {previewItem.description && (
                  <p style={{ color: '#666', fontSize: 14, margin: '12px 0 0' }}>{previewItem.description}</p>
                )}
              </div>
              <CloseButton onClick={() => setPreviewItem(null)}>{t.close}</CloseButton>
            </PreviewHeader>

            {/* Show questions for games */}
            {previewItem.kind === 'game' && (() => {
              const questions = (previewItem.settings as { questions?: Array<{ text: string; answers: Array<{ text: string; correct?: boolean }> }> })?.questions;
              if (!questions || questions.length === 0) return null;
              return (
                <div>
                  <h4 style={{ margin: '0 0 12px', color: '#555' }}>{questions.length} {t.questions}</h4>
                  {questions.map((q, i) => (
                    <QuestionBlock key={i}>
                      <div className="q-text">{i + 1}. {q.text}</div>
                      <div className="q-answers">
                        {q.answers?.map((a, j) => (
                          <span key={j} className={a.correct ? 'correct' : ''}>
                            {a.correct ? '✓' : '○'} {a.text}
                          </span>
                        ))}
                      </div>
                    </QuestionBlock>
                  ))}
                </div>
              );
            })()}

            {/* Show settings summary for stations */}
            {previewItem.kind === 'station' && (
              <div style={{ fontSize: 13, color: '#555' }}>
                <h4 style={{ margin: '0 0 12px', color: '#555' }}>{t.type}: {previewItem.type}</h4>
                {Object.entries(previewItem.settings).map(([key, val]) => {
                  if (typeof val === 'string' && val.length < 200) {
                    return <p key={key} style={{ margin: '4px 0' }}><strong>{key}:</strong> {val}</p>;
                  }
                  if (typeof val === 'string') {
                    return <p key={key} style={{ margin: '4px 0' }}><strong>{key}:</strong> {val.substring(0, 200)}...</p>;
                  }
                  return null;
                })}
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <CopyButton onClick={() => validateAndExport(previewItem)}>
                {t.export}
              </CopyButton>
            </div>
          </PreviewCard>
        </PreviewOverlay>
      )}
    </>
  );
}

function PaginatedLibrary({ items, confirmDeleteId, handleExport, handleDelete, setPreviewItem, getQuestionCount, t }: {
  items: LibraryItem[];
  confirmDeleteId: string | null;
  handleExport: (item: LibraryItem) => void;
  handleDelete: (id: string) => void;
  setPreviewItem: (item: LibraryItem) => void;
  getQuestionCount: (item: LibraryItem) => number;
  t: Record<string, string>;
}) {
  const { page, setPage, totalPages, pageItems, totalItems, showing } = usePagination(items);

  return (
    <>
      <DesktopOnly>
        <AdminCardNoPadding>
          <Table>
            <thead>
              <tr>
                <th>{t.name}</th>
                <th>{t.type}</th>
                <th>{t.customer}</th>
                <th>{t.tags}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item) => (
                <tr key={item._id} onClick={() => setPreviewItem(item)} style={{ cursor: 'pointer' }}>
                  <td>
                    <CellBold>{item.name}</CellBold>
                    {item.kind === 'game' && getQuestionCount(item) > 0 && (
                      <CellMuted style={{ fontSize: 12 }}>
                        {getQuestionCount(item)} {t.questions}
                      </CellMuted>
                    )}
                  </td>
                  <td>
                    <KindBadge kind={item.kind}>
                      {item.kind === 'game' ? t.game : t.station}
                    </KindBadge>
                    <CellMuted style={{ fontSize: 12, marginInlineStart: 6 }}>{item.type}</CellMuted>
                  </td>
                  <td><CellMuted>{item.customer || '—'}</CellMuted></td>
                  <td>
                    {item.tags.length > 0 ? (
                      item.tags.map((tag) => <TagBadge key={tag}>{tag}</TagBadge>)
                    ) : (
                      <CellMuted>—</CellMuted>
                    )}
                  </td>
                  <CellAlignEnd>
                    <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <CopyButton onClick={() => handleExport(item)}>
                        {t.export}
                      </CopyButton>
                      <SmallDangerButton
                        confirm={confirmDeleteId === item._id}
                        onClick={() => handleDelete(item._id)}
                      >
                        {confirmDeleteId === item._id ? t.confirmDelete : t.delete}
                      </SmallDangerButton>
                    </div>
                  </CellAlignEnd>
                </tr>
              ))}
            </tbody>
          </Table>
        </AdminCardNoPadding>
      </DesktopOnly>

      <HideOnDesktop>
        <MobileCardList>
          {pageItems.map((item) => (
            <MobileCardItem key={item._id} onClick={() => setPreviewItem(item)}>
              <MobileCardHeader>
                <div>
                  <MobileCardNameRow>{item.name}</MobileCardNameRow>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                    <KindBadge kind={item.kind}>
                      {item.kind === 'game' ? t.game : t.station}
                    </KindBadge>
                    <CellMuted style={{ fontSize: 12 }}>{item.type}</CellMuted>
                  </div>
                  {item.customer && (
                    <CellMuted style={{ fontSize: 12, marginTop: 2 }}>{item.customer}</CellMuted>
                  )}
                  {item.tags.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {item.tags.map((tag) => <TagBadge key={tag}>{tag}</TagBadge>)}
                    </div>
                  )}
                  <MobileCardRow>
                    <MobileCardDate>{new Date(item.createdAt).toLocaleDateString()}</MobileCardDate>
                  </MobileCardRow>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                  <CopyButton onClick={() => handleExport(item)}>
                    {t.export}
                  </CopyButton>
                  <SmallDangerButton
                    confirm={confirmDeleteId === item._id}
                    onClick={() => handleDelete(item._id)}
                  >
                    {confirmDeleteId === item._id ? t.confirmDelete : t.delete}
                  </SmallDangerButton>
                </div>
              </MobileCardHeader>
            </MobileCardItem>
          ))}
        </MobileCardList>
      </HideOnDesktop>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} showing={showing} totalItems={totalItems} />
    </>
  );
}
