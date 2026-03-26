import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminStationsTab.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
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

interface AdminStationsTabProps {
  stations: Station[];
  onRefresh: () => void;
  defaultType?: string;
}

export default function AdminStationsTab({ stations, onRefresh, defaultType }: AdminStationsTabProps) {
  const navigate = useNavigate();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
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
      default: return type || '—';
    }
  };

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    stations.forEach((s) => s.tags?.forEach((tag) => tagSet.add(tag)));
    return [...tagSet].sort();
  }, [stations]);

  // Filter by search + active tag
  const filtered = useMemo(() => {
    let result = stations;

    if (activeTag) {
      result = result.filter((s) => s.tags?.includes(activeTag));
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
  }, [stations, search, activeTag]);

  return (
    <>
      <SectionHeaderRow>
        <PageTitleNoMargin>{t.title}</PageTitleNoMargin>
        <SmallActionButton onClick={() => navigate(`/admin/stations/new${defaultType ? `?type=${defaultType}` : ''}`)}>
          {t.createNew}
        </SmallActionButton>
      </SectionHeaderRow>

      {/* Search bar */}
      <SearchRow>
        <SearchInput
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </SearchRow>

      {/* Tag filter bar */}
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

      {filtered.length === 0 ? (
        <AdminCard>
          <EmptyText>{stations.length === 0 ? t.noStations : t.noResults}</EmptyText>
        </AdminCard>
      ) : (
        <>
          {/* Desktop table */}
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
                  {filtered.map((station) => (
                    <tr key={station._id} onClick={() => navigate(`/admin/stations/${station._id}`)}>
                      <td>
                        <CellBold>{station.name}</CellBold>
                        {(station.customer || station.theme) && (
                          <CellMuted style={{ fontSize: 12 }}>
                            {[station.customer, station.theme].filter(Boolean).join(' · ')}
                          </CellMuted>
                        )}
                      </td>
                      <td>
                        <Chip>{typeLabel(station.type)}</Chip>
                      </td>
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

          {/* Mobile cards */}
          <HideOnDesktop>
            <MobileCardList>
              {filtered.map((station) => (
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
        </>
      )}
    </>
  );
}
