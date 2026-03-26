import { useState, useEffect, useMemo, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminLibraryTab.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
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

const SearchRow = styled('div')({
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  marginBottom: 16,
  flexWrap: 'wrap',
});

const SearchInput = styled(Input)({
  flex: 1,
  minWidth: 200,
  padding: '10px 14px',
  fontSize: 14,
});

const TagBar = styled('div')({
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  marginBottom: 16,
});

const TagChip = styled('button')<{ active?: boolean }>(({ active }) => ({
  display: 'inline-block',
  padding: '4px 12px',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 20,
  border: `1.5px solid ${active ? '#6c5ce7' : '#e0dce6'}`,
  background: active ? '#f0eefa' : '#fff',
  color: active ? '#6c5ce7' : '#888',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s',
  '&:hover': {
    borderColor: '#6c5ce7',
    color: '#6c5ce7',
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'game' | 'station'>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<LibraryItem | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (kindFilter !== 'all') params.set('kind', kindFilter);
      if (activeTag) params.set('tag', activeTag);
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
      setLoading(false);
    }
  }, [kindFilter, activeTag, search]);

  const fetchTags = useCallback(async () => {
    try {
      const data = await adminApiFetch<{ tags: string[] }>('/api/admin/library/tags');
      setAllTags(data.tags);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => fetchItems(), 300); // debounce search
    return () => clearTimeout(timer);
  }, [fetchItems]);

  const handleCopy = async (item: LibraryItem) => {
    try {
      await adminApiFetch(`/api/admin/library/${item._id}/copy`, { method: 'POST' });
      setCopiedId(item._id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
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

  if (loading && items.length === 0) {
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

      {/* Search */}
      <SearchRow>
        <SearchInput
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </SearchRow>

      {/* Tags */}
      {allTags.length > 0 && (
        <TagBar>
          <TagChip active={!activeTag} onClick={() => setActiveTag(null)}>
            {t.allTags}
          </TagChip>
          {allTags.map((tag) => (
            <TagChip
              key={tag}
              active={activeTag === tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              {tag}
            </TagChip>
          ))}
        </TagBar>
      )}

      {/* Table / Cards */}
      {items.length === 0 ? (
        <AdminCard>
          <EmptyText>{total === 0 ? t.noItems : t.noResults}</EmptyText>
        </AdminCard>
      ) : (
        <>
          {/* Desktop */}
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
                  {items.map((item) => (
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
                          <CopyButton
                            disabled={copiedId === item._id}
                            onClick={() => handleCopy(item)}
                          >
                            {copiedId === item._id ? t.copied : t.copy}
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

          {/* Mobile */}
          <HideOnDesktop>
            <MobileCardList>
              {items.map((item) => (
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
                      <CopyButton
                        disabled={copiedId === item._id}
                        onClick={() => handleCopy(item)}
                      >
                        {copiedId === item._id ? t.copied : t.copy}
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
        </>
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
              <CopyButton
                disabled={copiedId === previewItem._id}
                onClick={() => handleCopy(previewItem)}
              >
                {copiedId === previewItem._id ? t.copied : t.copy}
              </CopyButton>
            </div>
          </PreviewCard>
        </PreviewOverlay>
      )}
    </>
  );
}
