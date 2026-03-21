import { useState, useEffect, useRef, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { adminApiFetch } from '../../../utils/adminApi';
import FileUploadButton from '../../../components/FileUploadButton';
import type { ModuleItem, GameOption, StationOption } from './types';
import ItemPreviewModal from './ItemPreviewModal';
import {
  SectionLabel,
  InlineRow,
  FlexInput,
  SmallText,
  SmallMutedText,
  ItemTypeBadge,
} from '../styled';
import { Input } from '../../../components/styled';

// ─── Game type icons ───

const GAME_ICONS: Record<string, string> = {
  trivia: '❓',
  order: '🔢',
  puzzle: '🧩',
  trueFalse: '✅',
  ballGame: '🏀',
  trashSort: '♻️',
};

const STATION_ICONS: Record<string, string> = {
  text: '📝',
  video: '🎬',
  image: '🖼️',
  narrative: '📖',
  badge: '🏅',
};

// ─── Local styled components ───

const TabsRow = styled('div')({
  display: 'flex',
  gap: 0,
  marginBottom: 12,
  borderBottom: '2px solid #e8e8ec',
});

const Tab = styled('button')<{ active?: boolean }>(({ active }) => ({
  background: 'none',
  border: 'none',
  padding: '10px 24px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  color: active ? '#6c5ce7' : '#888',
  borderBottom: active ? '2px solid #6c5ce7' : '2px solid transparent',
  marginBottom: -2,
  transition: 'all 0.15s',
  '&:hover': { color: '#6c5ce7' },
}));

const FilterInput = styled(Input)({
  marginBottom: 12,
});

const Grid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: 10,
  maxHeight: 260,
  overflowY: 'auto',
  padding: 2,
});

const Card = styled('div')<{ selected?: boolean }>(({ selected }) => ({
  border: selected ? '2px solid #6c5ce7' : '1px solid #e0e0e0',
  borderRadius: 10,
  padding: '12px 14px',
  cursor: 'pointer',
  background: selected ? '#f5f0ff' : '#fff',
  position: 'relative',
  transition: 'all 0.15s',
  '&:hover': {
    borderColor: '#6c5ce7',
    boxShadow: '0 2px 8px rgba(108,92,231,0.12)',
  },
}));

const CardTopRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 4,
});

const CardIcon = styled('span')({
  fontSize: 18,
  lineHeight: 1,
});

const CardName = styled('div')({
  fontWeight: 600,
  fontSize: 14,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
});

const CardMeta = styled('div')({
  fontSize: 12,
  color: '#888',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  marginBottom: 2,
});

const CardDescription = styled('div')({
  fontSize: 12,
  color: '#666',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  lineHeight: 1.3,
  marginTop: 4,
});

const CheckMark = styled('div')({
  position: 'absolute',
  top: 8,
  left: 8,
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: '#6c5ce7',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
});

const EmptyState = styled('div')({
  padding: '32px 16px',
  textAlign: 'center',
  color: '#aaa',
  fontSize: 14,
});

const SelectedHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: 16,
  marginBottom: 8,
});

const PreviewButton = styled('button')({
  background: 'none',
  border: '1px solid #6c5ce7',
  color: '#6c5ce7',
  borderRadius: 6,
  padding: '2px 10px',
  fontSize: 12,
  cursor: 'pointer',
  fontWeight: 500,
  flexShrink: 0,
  '&:hover': { background: '#f5f0ff' },
});

const LoadingState = styled('div')({
  padding: '40px 16px',
  textAlign: 'center',
  color: '#aaa',
  fontSize: 14,
});

// Drag-and-drop styled components
const DragList = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

const DragItem = styled('div')<{ isDragging?: boolean }>(({ isDragging }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  background: isDragging ? '#f5f0ff' : '#fafafa',
  border: isDragging ? '2px solid #6c5ce7' : '1px solid #e8e8ec',
  borderRadius: 8,
  cursor: 'grab',
  opacity: isDragging ? 0.8 : 1,
  transition: 'background 0.15s, border 0.15s',
  userSelect: 'none',
  '&:hover': {
    background: '#f0eef8',
  },
}));

const DragHandle = styled('span')({
  fontSize: 16,
  color: '#aaa',
  cursor: 'grab',
  flexShrink: 0,
});

const DragItemName = styled('span')({
  flex: 1,
  fontWeight: 500,
  fontSize: 14,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const DragItemIcon = styled('span')({
  fontSize: 16,
  flexShrink: 0,
});

const RemoveBtn = styled('button')({
  background: 'none',
  border: 'none',
  color: '#e74c3c',
  fontSize: 18,
  cursor: 'pointer',
  padding: '0 4px',
  lineHeight: 1,
  flexShrink: 0,
  '&:hover': { color: '#c0392b' },
});

// ─── Component ───

type TabType = 'games' | 'stations';

interface ModuleItemsSectionProps {
  backgroundImage: string;
  setBackgroundImage: (url: string) => void;
  selectedItems: ModuleItem[];
  onAddItem: (item: ModuleItem) => void;
  onRemoveItem: (index: number) => void;
  onMoveItem: (index: number, direction: -1 | 1) => void;
  t: Record<string, string>;
}

export default function ModuleItemsSection({
  backgroundImage,
  setBackgroundImage,
  selectedItems,
  onAddItem,
  onRemoveItem,
  onMoveItem,
  t,
}: ModuleItemsSectionProps) {
  const [activeTab, setActiveTab] = useState<TabType>('games');
  const [filterText, setFilterText] = useState('');
  const [allGames, setAllGames] = useState<GameOption[]>([]);
  const [allStations, setAllStations] = useState<StationOption[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [previewItem, setPreviewItem] = useState<ModuleItem | null>(null);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  // Fetch all games and stations on mount
  useEffect(() => {
    setLoadingItems(true);
    Promise.all([
      adminApiFetch<{ games: GameOption[] }>('/api/admin/games'),
      adminApiFetch<{ stations: StationOption[] }>('/api/admin/stations'),
    ])
      .then(([gData, sData]) => {
        setAllGames(gData.games);
        setAllStations(sData.stations);
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLoadingItems(false));
  }, []);

  const isSelected = (itemType: 'game' | 'station', id: string) =>
    selectedItems.some((item) => item.itemType === itemType && item.ref === id);

  const filterLower = filterText.toLowerCase();

  const matchesFilter = (name: string, description?: string, customer?: string, theme?: string) => {
    if (!filterLower) return true;
    return (
      name.toLowerCase().includes(filterLower) ||
      (description || '').toLowerCase().includes(filterLower) ||
      (customer || '').toLowerCase().includes(filterLower) ||
      (theme || '').toLowerCase().includes(filterLower)
    );
  };

  const filteredGames = allGames.filter((g) => matchesFilter(g.name, g.description, g.customer, g.theme));
  const filteredStations = allStations.filter((s) => matchesFilter(s.name, s.description, s.customer, s.theme));

  const handleCardClick = (itemType: 'game' | 'station', item: GameOption | StationOption) => {
    if (isSelected(itemType, item._id)) {
      // Deselect — find and remove
      const idx = selectedItems.findIndex((si) => si.itemType === itemType && si.ref === item._id);
      if (idx !== -1) onRemoveItem(idx);
      return;
    }
    onAddItem({
      itemType,
      ref: item._id,
      name: item.name,
      subType: item.type,
      description: item.description,
      customer: item.customer,
      theme: item.theme,
      settings: item.settings,
    });
  };

  const getIcon = (itemType: 'game' | 'station', subType?: string) => {
    if (!subType) return itemType === 'game' ? '🎮' : '📍';
    return itemType === 'game'
      ? (GAME_ICONS[subType] || '🎮')
      : (STATION_ICONS[subType] || '📍');
  };

  // Drag-and-drop handlers
  const handleDragStart = useCallback((index: number) => {
    dragItemRef.current = index;
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((index: number) => {
    const from = dragItemRef.current;
    if (from === null || from === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    // Move item step by step from `from` to `index`
    const direction = index > from ? 1 : -1;
    let current = from;
    while (current !== index) {
      onMoveItem(current, direction as -1 | 1);
      current += direction;
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  }, [onMoveItem]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  }, []);

  return (
    <>
      <InlineRow>
        <FileUploadButton
          accept="image/*"
          onUploaded={(url) => setBackgroundImage(url)}
          label={t.upload}
          uploadingLabel={t.uploading}
        />
        <FlexInput
          placeholder={t.backgroundImage}
          value={backgroundImage}
          onChange={(e) => setBackgroundImage(e.target.value)}
        />
      </InlineRow>

      <div>
        <SectionLabel>{t.step2Title || t.searchItems}</SectionLabel>

        <TabsRow>
          <Tab type="button" active={activeTab === 'games'} onClick={() => setActiveTab('games')}>
            {t.tabGames || t.filterGames} ({filteredGames.length})
          </Tab>
          <Tab type="button" active={activeTab === 'stations'} onClick={() => setActiveTab('stations')}>
            {t.tabStations || t.filterStations} ({filteredStations.length})
          </Tab>
        </TabsRow>

        <FilterInput
          placeholder={t.filterPlaceholder || t.searchPlaceholder}
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />

        {loadingItems ? (
          <LoadingState>{t.searching || 'Loading...'}</LoadingState>
        ) : (
          <Grid>
            {activeTab === 'games' && (
              filteredGames.length === 0 ? (
                <EmptyState>{t.noItemsAvailable || t.noResults}</EmptyState>
              ) : (
                filteredGames.map((game) => {
                  const sel = isSelected('game', game._id);
                  return (
                    <Card
                      key={game._id}
                      selected={sel}
                      onClick={() => handleCardClick('game', game)}
                    >
                      {sel && <CheckMark>✓</CheckMark>}
                      <CardTopRow>
                        <CardIcon>{GAME_ICONS[game.type] || '🎮'}</CardIcon>
                        <CardName>{game.name}</CardName>
                      </CardTopRow>
                      <CardMeta>
                        <ItemTypeBadge itemType="game" style={{ fontSize: 11, padding: '1px 6px' }}>
                          {game.type}
                        </ItemTypeBadge>
                      </CardMeta>
                      {game.customer && <CardMeta>{t.customer}: {game.customer}</CardMeta>}
                      {game.theme && <CardMeta>{t.itemTheme}: {game.theme}</CardMeta>}
                      {game.description && <CardDescription>{game.description}</CardDescription>}
                    </Card>
                  );
                })
              )
            )}
            {activeTab === 'stations' && (
              filteredStations.length === 0 ? (
                <EmptyState>{t.noItemsAvailable || t.noResults}</EmptyState>
              ) : (
                filteredStations.map((station) => {
                  const sel = isSelected('station', station._id);
                  return (
                    <Card
                      key={station._id}
                      selected={sel}
                      onClick={() => handleCardClick('station', station)}
                    >
                      {sel && <CheckMark>✓</CheckMark>}
                      <CardTopRow>
                        <CardIcon>{STATION_ICONS[station.type] || '📍'}</CardIcon>
                        <CardName>{station.name}</CardName>
                      </CardTopRow>
                      <CardMeta>
                        <ItemTypeBadge itemType="station" style={{ fontSize: 11, padding: '1px 6px' }}>
                          {station.type}
                        </ItemTypeBadge>
                      </CardMeta>
                      {station.customer && <CardMeta>{t.customer}: {station.customer}</CardMeta>}
                      {station.theme && <CardMeta>{t.itemTheme}: {station.theme}</CardMeta>}
                      {station.description && <CardDescription>{station.description}</CardDescription>}
                    </Card>
                  );
                })
              )
            )}
          </Grid>
        )}
      </div>

      {/* Selected items — drag to reorder */}
      {selectedItems.length > 0 && (
        <div>
          <SelectedHeader>
            <SmallMutedText>{t.selectedCount}: {selectedItems.length}</SmallMutedText>
          </SelectedHeader>
          <DragList>
            {selectedItems.map((item, index) => (
              <DragItem
                key={`${item.itemType}-${item.ref}-${index}`}
                isDragging={dragIndex === index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                style={dragOverIndex === index && dragIndex !== index ? { borderTopColor: '#6c5ce7', borderTopWidth: 2 } : {}}
              >
                <DragHandle>⠿</DragHandle>
                <SmallText style={{ color: '#aaa', fontSize: 13, flexShrink: 0 }}>{index + 1}.</SmallText>
                <DragItemIcon>{getIcon(item.itemType, item.subType)}</DragItemIcon>
                <ItemTypeBadge itemType={item.itemType} style={{ fontSize: 11, padding: '1px 6px', flexShrink: 0 }}>
                  {item.itemType === 'game' ? t.itemGame : t.itemStation}
                </ItemTypeBadge>
                <DragItemName>{item.name}</DragItemName>
                {item.subType && <SmallText style={{ flexShrink: 0 }}>{item.subType}</SmallText>}
                <PreviewButton type="button" onClick={(e) => { e.stopPropagation(); setPreviewItem(item); }}>
                  {t.preview}
                </PreviewButton>
                <RemoveBtn type="button" onClick={(e) => { e.stopPropagation(); onRemoveItem(index); }}>×</RemoveBtn>
              </DragItem>
            ))}
          </DragList>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <ItemPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </>
  );
}
