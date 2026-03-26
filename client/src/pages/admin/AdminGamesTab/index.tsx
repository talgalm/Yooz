import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminGamesTab.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import type { Game } from '../AdminDashboardPage';
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

interface AdminGamesTabProps {
  games: Game[];
  gameType: string;
  title: string;
  onRefresh: () => void;
}

export default function AdminGamesTab({ games, gameType, title, onRefresh }: AdminGamesTabProps) {
  const navigate = useNavigate();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const t = useTranslations(texts);

  const typeFiltered = games.filter((g) => g.type === gameType);

  // Collect all unique tags from this game type
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    typeFiltered.forEach((g) => g.tags?.forEach((tag) => tagSet.add(tag)));
    return [...tagSet].sort();
  }, [typeFiltered]);

  // Filter by search + active tag
  const filtered = useMemo(() => {
    let result = typeFiltered;

    if (activeTag) {
      result = result.filter((g) => g.tags?.includes(activeTag));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((g) =>
        g.name.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q) ||
        g.customer?.toLowerCase().includes(q) ||
        g.theme?.toLowerCase().includes(q) ||
        g.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return result;
  }, [typeFiltered, search, activeTag]);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await adminApiFetch(`/api/admin/games/${id}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    onRefresh();
  };

  return (
    <>
      <SectionHeaderRow>
        <PageTitleNoMargin>{title}</PageTitleNoMargin>
        <SmallActionButton onClick={() => navigate(`/admin/games/new?type=${gameType}`)}>
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
          <EmptyText>{typeFiltered.length === 0 ? t.noGames : t.noResults}</EmptyText>
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
                    <th>{t.tags}</th>
                    <th>{t.created}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((game) => (
                    <tr key={game._id} onClick={() => navigate(`/admin/games/${game._id}`)}>
                      <td>
                        <CellBold>{game.name}</CellBold>
                        {(game.customer || game.theme) && (
                          <CellMuted style={{ fontSize: 12 }}>
                            {[game.customer, game.theme].filter(Boolean).join(' · ')}
                          </CellMuted>
                        )}
                      </td>
                      <td>
                        {game.tags && game.tags.length > 0 ? (
                          game.tags.map((tag) => <TagBadge key={tag}>{tag}</TagBadge>)
                        ) : (
                          <CellMuted>—</CellMuted>
                        )}
                      </td>
                      <td><CellMuted>{new Date(game.createdAt).toLocaleDateString()}</CellMuted></td>
                      <CellAlignEnd>
                        <SmallDangerButton
                          confirm={confirmDeleteId === game._id}
                          onClick={(e) => { e.stopPropagation(); handleDelete(game._id); }}
                        >
                          {confirmDeleteId === game._id ? t.confirmDelete : t.delete}
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
              {filtered.map((game) => (
                <MobileCardItem key={game._id} onClick={() => navigate(`/admin/games/${game._id}`)}>
                  <MobileCardHeader>
                    <div>
                      <MobileCardNameRow>{game.name}</MobileCardNameRow>
                      {(game.customer || game.theme) && (
                        <CellMuted style={{ fontSize: 12 }}>
                          {[game.customer, game.theme].filter(Boolean).join(' · ')}
                        </CellMuted>
                      )}
                      {game.tags && game.tags.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {game.tags.map((tag) => <TagBadge key={tag}>{tag}</TagBadge>)}
                        </div>
                      )}
                      <MobileCardRow>
                        <MobileCardDate>{new Date(game.createdAt).toLocaleDateString()}</MobileCardDate>
                      </MobileCardRow>
                    </div>
                    <SmallDangerButton
                      confirm={confirmDeleteId === game._id}
                      onClick={(e) => { e.stopPropagation(); handleDelete(game._id); }}
                    >
                      {confirmDeleteId === game._id ? t.confirmDelete : t.delete}
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
