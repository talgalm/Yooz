import { useState, useEffect, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { adminApiFetch } from '../../../utils/adminApi';
import FileUploadButton from '../../../components/FileUploadButton';
import type { ModuleItem, GameOption, StationOption, ItemLocation } from './types';
import ItemPreviewModal from './ItemPreviewModal';
import ItemSettingsModal from './ItemSettingsModal';
import {
  SectionLabel,
  InlineRow,
  FlexInput,
  SmallText,
  SmallMutedText,
  ItemTypeBadge,
} from '../styled';
import { Input } from '../../../components/styled';

const EXCLUDE_TYPES_FROM_ACTIVITY_PICKER = new Set(['trashSort', 'environmentGame']);

interface MissionOption {
  _id: string;
  name: string;
  description?: string;
  customer?: string;
  explanationScreens?: { header?: string }[];
}

const TabsRow = styled('div')({
  display: 'flex',
  gap: 0,
  marginBottom: 12,
  borderBottom: '2px solid #e8e8ec',
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
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
  whiteSpace: 'nowrap',
  flexShrink: 0,
  '&:hover': { color: '#6c5ce7' },
  '@media (max-width: 600px)': {
    padding: '8px 14px',
    fontSize: 13,
  },
}));

const FilterInput = styled(Input)({
  marginBottom: 12,
});

const SubFilterRow = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  marginBottom: 10,
});

const SubFilterChip = styled('button')<{ active?: boolean }>(({ active }) => ({
  background: active ? '#6c5ce7' : '#fff',
  color: active ? '#fff' : '#666',
  border: `1px solid ${active ? '#6c5ce7' : '#e0e0e0'}`,
  borderRadius: 999,
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  transition: 'all 0.12s',
  '&:hover': { borderColor: '#6c5ce7', color: active ? '#fff' : '#6c5ce7' },
}));

const Grid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: 10,
  maxHeight: 330,
  overflowY: 'auto',
  padding: 12,
  border: '1px solid #ececf4',
  borderRadius: 12,
  background: '#fbfbfd',
  scrollbarGutter: 'stable',
  '@media (max-width: 600px)': {
    gridTemplateColumns: '1fr',
    maxHeight: 360,
  },
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

const CardName = styled('div')({
  fontWeight: 600,
  fontSize: 14,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  marginBottom: 4,
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

const EmptyState = styled('div')({
  padding: '32px 16px',
  textAlign: 'center',
  color: '#aaa',
  fontSize: 14,
});

const SelectedPanel = styled('div')({
  border: '1px solid #ececf4',
  borderRadius: 12,
  padding: '14px 16px',
  background: '#fff',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

const SelectedHeader = styled('div')({
  display: 'flex',
  alignItems: 'baseline',
  gap: 10,
  flexWrap: 'wrap',
});

const SelectedTitle = styled('h4')({
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  color: '#333',
});

const SelectedCount = styled('span')({
  fontSize: 12,
  fontWeight: 700,
  color: '#6c5ce7',
  background: '#f0eefa',
  borderRadius: 999,
  padding: '1px 10px',
});

const SelectedEmpty = styled('div')({
  padding: '18px 12px',
  textAlign: 'center',
  color: '#aaa',
  fontSize: 13,
  border: '1px dashed #e0e0e8',
  borderRadius: 10,
});

const RowButton = styled('button')({
  background: 'none',
  border: '1px solid #6c5ce7',
  color: '#6c5ce7',
  borderRadius: 6,
  padding: '2px 10px',
  fontSize: 12,
  cursor: 'pointer',
  fontWeight: 500,
  flexShrink: 0,
  fontFamily: 'inherit',
  '&:hover': { background: '#f5f0ff' },
});

const LoadingState = styled('div')({
  padding: '40px 16px',
  textAlign: 'center',
  color: '#aaa',
  fontSize: 14,
});

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
  flexWrap: 'wrap',
  rowGap: 6,
  '&:hover': {
    background: '#f0eef8',
  },
}));

const DragHandle = styled('span')({
  width: 14,
  height: 18,
  flexShrink: 0,
  cursor: 'grab',
  backgroundImage: 'radial-gradient(circle, #bbb 1.4px, transparent 1.4px)',
  backgroundSize: '6px 6px',
  backgroundPosition: 'center',
});

const DragItemName = styled('span')({
  flex: '1 1 120px',
  minWidth: 0,
  fontWeight: 500,
  fontSize: 14,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const RemoveBtn = styled('button')({
  background: 'none',
  border: '1px solid #e3bdb8',
  color: '#c0392b',
  borderRadius: 6,
  padding: '2px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  flexShrink: 0,
  fontFamily: 'inherit',
  '&:hover': { background: '#fdeeea' },
});

const StatusBadge = styled('span')<{ tone?: 'neutral' | 'purple' | 'green' | 'red' }>(({ tone = 'neutral' }) => {
  const palette = {
    neutral: { bg: '#f5f5f7', fg: '#666' },
    purple: { bg: '#f0eefa', fg: '#6c5ce7' },
    green: { bg: '#eafaf1', fg: '#1e8449' },
    red: { bg: '#fdeeea', fg: '#c0392b' },
  }[tone];
  return {
    background: palette.bg,
    color: palette.fg,
    borderRadius: 6,
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  };
});

function getCollageImageLimit(settings: Record<string, unknown> | undefined): number {
  if (!settings) return 1;
  if (settings.multiSelect) {
    const raw = settings.multiSelectCount;
    const parsed = typeof raw === 'number'
      ? raw
      : (typeof raw === 'string' ? parseInt(raw, 10) : NaN);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }
  const missions = settings.missions;
  return Array.isArray(missions) && missions.length > 0 ? missions.length : 1;
}

function effectivePartSizes(item: ModuleItem, limit: number): number[] {
  const split = item.collageSplit;
  if (!split) return [limit];
  const distributeEvenly = (total: number, parts: number) => {
    const base = Math.floor(total / parts);
    const extras = total % parts;
    return Array.from({ length: parts }, (_, i) => Math.max(1, base + (i < extras ? 1 : 0)));
  };
  if (split.partSizes && split.partSizes.length > 0) {
    const sum = split.partSizes.reduce((a, b) => a + b, 0);
    if (sum === limit) return split.partSizes;
    return distributeEvenly(limit, split.partSizes.length);
  }
  const n = split.totalParts && split.totalParts > 0 ? split.totalParts : 1;
  return distributeEvenly(limit, n);
}

function splitBadgeText(item: ModuleItem, t: Record<string, string>): string | null {
  const split = item.collageSplit;
  if (!split) return null;
  const limit = getCollageImageLimit(item.settings);
  const partSizes = effectivePartSizes(item, limit);
  const partIdx = split.partIndex ?? 0;
  const totalParts = partSizes.length;
  const isVideoPart = split.videoPartIndex === partIdx;
  const partSize = isVideoPart ? 0 : (partSizes[partIdx] ?? 1);
  const amount = isVideoPart ? t.collageSplitVideoPartLabel : `${partSize} ${t.collageSplitPhotosLabel}`;
  return `${t.collageSplitPart} ${partIdx + 1}/${totalParts} · ${amount}`;
}

function hebrewFirstCompare(a: string, b: string): number {
  const hebrewRe = /^[֐-׿]/;
  const aHeb = hebrewRe.test(a);
  const bHeb = hebrewRe.test(b);
  if (aHeb && !bHeb) return -1;
  if (!aHeb && bHeb) return 1;
  return a.localeCompare(b, aHeb ? 'he' : 'en');
}

type TabType = 'games' | 'stations' | 'missions';

interface ModuleItemsSectionProps {
  backgroundImage: string;
  setBackgroundImage: (url: string) => void;
  selectedItems: ModuleItem[];
  onAddItem: (item: ModuleItem) => void;
  onRemoveItem: (index: number) => void;
  onMoveItem: (index: number, direction: -1 | 1) => void;
  onUpdateItemGroups: (index: number, groups: string[]) => void;
  onUpdateItemSvg?: (index: number, svgUrl: string) => void;
  onToggleItemFinal?: (index: number) => void;
  onToggleItemRevisitable?: (index: number) => void;
  onConfigureCollageSplit?: (index: number) => void;
  onUpdateItemLocation?: (index: number, location: ItemLocation | undefined) => void;
  moduleType?: string;
  connectionType: string;
  groupNames: string[];
  t: Record<string, string>;
}

export default function ModuleItemsSection({
  backgroundImage,
  setBackgroundImage,
  selectedItems,
  onAddItem,
  onRemoveItem,
  onMoveItem,
  onUpdateItemGroups,
  onUpdateItemSvg,
  onToggleItemFinal,
  onToggleItemRevisitable,
  onConfigureCollageSplit,
  onUpdateItemLocation,
  moduleType,
  connectionType,
  groupNames,
  t,
}: ModuleItemsSectionProps) {
  const isSpiders = moduleType === 'spiders';
  const isMap = moduleType === 'map';
  const [activeTab, setActiveTab] = useState<TabType>('games');
  const [filterText, setFilterText] = useState('');
  const [allGames, setAllGames] = useState<GameOption[]>([]);
  const [allStations, setAllStations] = useState<StationOption[]>([]);
  const [allMissions, setAllMissions] = useState<MissionOption[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [previewItem, setPreviewItem] = useState<ModuleItem | null>(null);
  const [settingsItemIndex, setSettingsItemIndex] = useState<number | null>(null);

  const [selectedGameTypes, setSelectedGameTypes] = useState<Set<string>>(new Set());
  const [selectedStationTypes, setSelectedStationTypes] = useState<Set<string>>(new Set());

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragItemRefValue, setDragItemRefValue] = useState<number | null>(null);

  useEffect(() => {
    setLoadingItems(true);
    Promise.all([
      adminApiFetch<{ games: GameOption[] }>('/api/admin/games'),
      adminApiFetch<{ stations: StationOption[] }>('/api/admin/stations'),
      adminApiFetch<{ missions: MissionOption[] }>('/api/admin/missions'),
    ])
      .then(([gData, sData, mData]) => {
        setAllGames(
          [...gData.games]
            .filter((g) => !EXCLUDE_TYPES_FROM_ACTIVITY_PICKER.has(g.type))
            .sort((a, b) => hebrewFirstCompare(a.name, b.name)),
        );
        setAllStations([...sData.stations].sort((a, b) => hebrewFirstCompare(a.name, b.name)));
        setAllMissions([...mData.missions].sort((a, b) => hebrewFirstCompare(a.name, b.name)));
      })
      .catch(() => { })
      .finally(() => setLoadingItems(false));
  }, []);

  const isSelected = (itemType: 'game' | 'station' | 'mission', id: string) =>
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

  const filteredGames = allGames
    .filter((g) => selectedGameTypes.size === 0 || selectedGameTypes.has(g.type))
    .filter((g) => matchesFilter(g.name, g.description, g.customer, g.theme));
  const filteredStations = allStations
    .filter((s) => selectedStationTypes.size === 0 || selectedStationTypes.has(s.type))
    .filter((s) => matchesFilter(s.name, s.description, s.customer, s.theme));
  const filteredMissions = allMissions.filter((m) => matchesFilter(m.name, m.description, m.customer));

  const gameTypeCounts = (() => {
    const m = new Map<string, number>();
    for (const g of allGames) m.set(g.type, (m.get(g.type) ?? 0) + 1);
    return m;
  })();
  const stationTypeCounts = (() => {
    const m = new Map<string, number>();
    for (const s of allStations) m.set(s.type, (m.get(s.type) ?? 0) + 1);
    return m;
  })();

  const toggleSet = (set: Set<string>, value: string): Set<string> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  };

  const handleCardClick = (itemType: 'game' | 'station', item: GameOption | StationOption) => {
    if (isSelected(itemType, item._id)) {
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

  const handleMissionClick = (mission: MissionOption) => {
    if (isSelected('mission', mission._id)) {
      const idx = selectedItems.findIndex((si) => si.itemType === 'mission' && si.ref === mission._id);
      if (idx !== -1) onRemoveItem(idx);
      return;
    }
    onAddItem({
      itemType: 'mission',
      ref: mission._id,
      name: mission.name,
      subType: 'mission',
      description: mission.description,
      customer: mission.customer,
    });
  };

  const handleDragStart = useCallback((index: number) => {
    setDragItemRefValue(index);
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((index: number) => {
    const from = dragItemRefValue;
    if (from === null || from === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const direction = index > from ? 1 : -1;
    let current = from;
    while (current !== index) {
      onMoveItem(current, direction as -1 | 1);
      current += direction;
    }
    setDragIndex(null);
    setDragOverIndex(null);
    setDragItemRefValue(null);
  }, [dragItemRefValue, onMoveItem]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
    setDragItemRefValue(null);
  }, []);

  return (
    <>
      <SelectedPanel>
        <SelectedHeader>
          <SelectedTitle>{t.selectedItemsTitle}</SelectedTitle>
          {selectedItems.length > 0 && <SelectedCount>{selectedItems.length}</SelectedCount>}
          {selectedItems.length > 0 && <SmallMutedText>{t.selectedItemsHint}</SmallMutedText>}
        </SelectedHeader>

        {selectedItems.length === 0 ? (
          <SelectedEmpty>{t.selectedItemsEmpty}</SelectedEmpty>
        ) : (
          <DragList>
            {selectedItems.map((item, index) => {
              const restrictedGroups = connectionType === 'group' && groupNames.length > 0 && item.groups && item.groups.length > 0;
              const splitText = splitBadgeText(item, t);
              return (
                <DragItem
                  key={`${item.itemType}-${item.ref}-${index}`}
                  isDragging={dragIndex === index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  style={dragOverIndex === index && dragIndex !== index ? { borderTopColor: '#6c5ce7', borderTopWidth: 2 } : {}}
                  onClick={() => setSettingsItemIndex(index)}
                >
                  <DragHandle />
                  <SmallText style={{ color: '#aaa', fontSize: 13, flexShrink: 0 }}>{index + 1}.</SmallText>
                  <ItemTypeBadge itemType={item.itemType === 'mission' ? 'station' : item.itemType} style={{ fontSize: 11, padding: '1px 6px', flexShrink: 0, ...(item.itemType === 'mission' ? { background: '#fff3e0', color: '#e65100' } : {}) }}>
                    {item.itemType === 'game' ? t.itemGame : item.itemType === 'mission' ? (t.mission || 'Mission') : t.itemStation}
                  </ItemTypeBadge>
                  <DragItemName>{item.name}</DragItemName>
                  {restrictedGroups && (
                    <StatusBadge tone="purple">{t.groupsBadgeLabel}: {item.groups!.length}/{groupNames.length}</StatusBadge>
                  )}
                  {isMap && (
                    <StatusBadge tone={item.location ? 'green' : 'red'}>
                      {item.location ? t.locationSetLabel : t.locationMissingLabel}
                    </StatusBadge>
                  )}
                  {isSpiders && item.isFinal && <StatusBadge tone="neutral">{t.spidersFinal}</StatusBadge>}
                  {item.revisitable && <StatusBadge tone="neutral">{t.revisitable}</StatusBadge>}
                  {splitText && <StatusBadge tone="purple">{splitText}</StatusBadge>}
                  <RowButton type="button" onClick={(e) => { e.stopPropagation(); setSettingsItemIndex(index); }}>
                    {t.settingsButton}
                  </RowButton>
                  <RemoveBtn type="button" onClick={(e) => { e.stopPropagation(); onRemoveItem(index); }}>{t.removeItem}</RemoveBtn>
                </DragItem>
              );
            })}
          </DragList>
        )}
      </SelectedPanel>

      <div>
        <SectionLabel>{t.backgroundImageLabel}</SectionLabel>
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
      </div>

      <div>
        <SectionLabel>{t.addItemsTitle}</SectionLabel>

        <TabsRow>
          <Tab type="button" active={activeTab === 'games'} onClick={() => setActiveTab('games')}>
            {t.tabGames || t.filterGames} ({filteredGames.length})
          </Tab>
          <Tab type="button" active={activeTab === 'stations'} onClick={() => setActiveTab('stations')}>
            {t.tabStations || t.filterStations} ({filteredStations.length})
          </Tab>
          <Tab type="button" active={activeTab === 'missions'} onClick={() => setActiveTab('missions')}>
            {t.tabMissions || 'Missions'} ({filteredMissions.length})
          </Tab>
        </TabsRow>

        {activeTab === 'games' && gameTypeCounts.size > 1 && (
          <SubFilterRow>
            {Array.from(gameTypeCounts.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([type, count]) => {
                const active = selectedGameTypes.has(type);
                return (
                  <SubFilterChip
                    key={type}
                    type="button"
                    active={active}
                    onClick={() => setSelectedGameTypes((prev) => toggleSet(prev, type))}
                  >
                    {type}
                    <span style={{ opacity: 0.7, fontWeight: 500 }}>({count})</span>
                  </SubFilterChip>
                );
              })}
            {selectedGameTypes.size > 0 && (
              <SubFilterChip type="button" onClick={() => setSelectedGameTypes(new Set())}>
                {t.filterAll}
              </SubFilterChip>
            )}
          </SubFilterRow>
        )}

        {activeTab === 'stations' && stationTypeCounts.size > 1 && (
          <SubFilterRow>
            {Array.from(stationTypeCounts.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([type, count]) => {
                const active = selectedStationTypes.has(type);
                return (
                  <SubFilterChip
                    key={type}
                    type="button"
                    active={active}
                    onClick={() => setSelectedStationTypes((prev) => toggleSet(prev, type))}
                  >
                    {type}
                    <span style={{ opacity: 0.7, fontWeight: 500 }}>({count})</span>
                  </SubFilterChip>
                );
              })}
            {selectedStationTypes.size > 0 && (
              <SubFilterChip type="button" onClick={() => setSelectedStationTypes(new Set())}>
                {t.filterAll}
              </SubFilterChip>
            )}
          </SubFilterRow>
        )}

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
                      <CardName>{game.name}</CardName>
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
                      <CardName>{station.name}</CardName>
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
            {activeTab === 'missions' && (
              filteredMissions.length === 0 ? (
                <EmptyState>{t.noItemsAvailable || t.noResults}</EmptyState>
              ) : (
                filteredMissions.map((mission) => {
                  const sel = isSelected('mission', mission._id);
                  return (
                    <Card
                      key={mission._id}
                      selected={sel}
                      onClick={() => handleMissionClick(mission)}
                    >
                      <CardName>{mission.name}</CardName>
                      <CardMeta>
                        <ItemTypeBadge itemType="station" style={{ fontSize: 11, padding: '1px 6px', background: '#fff3e0', color: '#e65100' }}>
                          {t.mission || 'mission'}
                        </ItemTypeBadge>
                      </CardMeta>
                      {mission.customer && <CardMeta>{t.customer}: {mission.customer}</CardMeta>}
                      {mission.description && <CardDescription>{mission.description}</CardDescription>}
                      {mission.explanationScreens && (
                        <CardMeta>{mission.explanationScreens.length} {t.missionScreensCount || 'screens'}</CardMeta>
                      )}
                    </Card>
                  );
                })
              )
            )}
          </Grid>
        )}
      </div>

      {settingsItemIndex !== null && selectedItems[settingsItemIndex] && (
        <ItemSettingsModal
          item={selectedItems[settingsItemIndex]}
          index={settingsItemIndex}
          groupNames={groupNames}
          connectionType={connectionType}
          isMap={isMap}
          isSpiders={isSpiders}
          onUpdateGroups={onUpdateItemGroups}
          onUpdateLocation={onUpdateItemLocation}
          onUpdateSvg={onUpdateItemSvg}
          onToggleFinal={onToggleItemFinal}
          onToggleRevisitable={onToggleItemRevisitable}
          onConfigureSplit={onConfigureCollageSplit}
          onPreview={() => setPreviewItem(selectedItems[settingsItemIndex])}
          onClose={() => setSettingsItemIndex(null)}
          t={t}
        />
      )}

      {previewItem && (
        <ItemPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </>
  );
}
