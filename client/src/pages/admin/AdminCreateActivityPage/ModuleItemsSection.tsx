import { useState, useEffect, useRef, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { adminApiFetch } from '../../../utils/adminApi';
import FileUploadButton from '../../../components/FileUploadButton';
import type { ModuleItem, GameOption, StationOption, ItemLocation } from './types';
import { geocodeAddress, isMapsAvailable } from '../../../utils/googleMaps';
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

/** Game `type` values omitted from the activity module picker (still editable in library). */
const EXCLUDE_TYPES_FROM_ACTIVITY_PICKER = new Set(['trashSort', 'environmentGame']);

const STATION_ICONS: Record<string, string> = {
  text: '📝',
  video: '🎬',
  image: '🖼️',
  narrative: '📖',
  badge: '🏅',
  riddle: '🔤',
};

interface MissionOption {
  _id: string;
  name: string;
  description?: string;
  customer?: string;
  explanationScreens?: { header?: string }[];
}

// ─── Local styled components ───

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
  maxHeight: 260,
  overflowY: 'auto',
  padding: 2,
  '@media (max-width: 600px)': {
    gridTemplateColumns: '1fr',
    maxHeight: 320,
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
  flexWrap: 'wrap',
  rowGap: 6,
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
  flex: '1 1 120px',
  minWidth: 0,
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

const LocationButton = styled('button')<{ hasLocation?: boolean }>(({ hasLocation }) => ({
  background: 'none',
  border: `1px solid ${hasLocation ? '#00b894' : '#d0d0d0'}`,
  color: hasLocation ? '#00b894' : '#999',
  borderRadius: 6,
  padding: '2px 8px',
  fontSize: 12,
  cursor: 'pointer',
  fontWeight: 500,
  flexShrink: 0,
  maxWidth: 190,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  fontFamily: 'inherit',
  '&:hover': { background: '#eefaf6', borderColor: '#00b894', color: '#00b894' },
}));

const GroupButton = styled('button')<{ hasGroups?: boolean }>(({ hasGroups }) => ({
  background: 'none',
  border: `1px solid ${hasGroups ? '#6c5ce7' : '#d0d0d0'}`,
  color: hasGroups ? '#6c5ce7' : '#999',
  borderRadius: 6,
  padding: '2px 8px',
  fontSize: 12,
  cursor: 'pointer',
  fontWeight: 500,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontFamily: 'inherit',
  '&:hover': { background: '#f5f0ff', borderColor: '#6c5ce7', color: '#6c5ce7' },
}));

const SplitButton = styled('button')<{ disabled?: boolean }>(({ disabled }) => ({
  background: 'none',
  border: `1px solid ${disabled ? '#e0e0e0' : '#6c5ce7'}`,
  color: disabled ? '#bbb' : '#6c5ce7',
  borderRadius: 6,
  padding: '2px 8px',
  fontSize: 12,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: 500,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontFamily: 'inherit',
  '&:hover': disabled ? {} : { background: '#f5f0ff' },
}));

const PartBadge = styled('span')({
  background: '#ede9fe',
  color: '#6c5ce7',
  borderRadius: 6,
  padding: '2px 8px',
  fontSize: 11,
  fontWeight: 700,
  flexShrink: 0,
});

function getCollageImageLimit(settings: Record<string, unknown> | undefined): number {
  if (!settings) return 1;
  // Mode-aware: multiSelect mode uses multiSelectCount; otherwise mission count.
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
    // Stale partSizes (limit changed or older buggy data) — redistribute.
    return distributeEvenly(limit, split.partSizes.length);
  }
  const n = split.totalParts && split.totalParts > 0 ? split.totalParts : 1;
  return distributeEvenly(limit, n);
}

/** Per-item toggle: keep the node open on the roadmap after it is completed. */
const RevisitLabel = styled('label')({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  flexShrink: 0,
  fontSize: 12,
  fontWeight: 600,
  color: '#666',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  '& input': { cursor: 'pointer', margin: 0 },
});

const FinalButton = styled('button')<{ isFinal?: boolean }>(({ isFinal }) => ({
  background: isFinal ? '#f59e0b' : 'none',
  border: `1px solid ${isFinal ? '#f59e0b' : '#d0d0d0'}`,
  color: isFinal ? '#fff' : '#999',
  borderRadius: 6,
  padding: '2px 8px',
  fontSize: 12,
  cursor: 'pointer',
  fontWeight: 600,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 3,
  fontFamily: 'inherit',
  '&:hover': { background: isFinal ? '#d97706' : '#fff8ec', borderColor: '#f59e0b', color: isFinal ? '#fff' : '#f59e0b' },
}));

const GroupPopupOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.3)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const GroupPopupCard = styled('div')({
  background: '#fff',
  borderRadius: 16,
  padding: '24px 28px',
  width: 'min(420px, calc(100vw - 32px))',
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  boxSizing: 'border-box',
  '@media (max-width: 600px)': {
    padding: '20px 18px',
  },
});

const GroupPopupTitle = styled('h3')({
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
  color: '#333',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

const GroupPopupHint = styled('p')({
  margin: 0,
  fontSize: 12,
  color: '#999',
  lineHeight: 1.4,
});

const GroupCheckList = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  maxHeight: 280,
  overflowY: 'auto',
});

const GroupCheckRow = styled('label')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
  transition: 'background 0.12s',
  '&:hover': { background: '#f5f0ff' },
});

const GroupCheckbox = styled('input')({
  width: 18,
  height: 18,
  accentColor: '#6c5ce7',
  cursor: 'pointer',
});

const GroupPopupActions = styled('div')({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 4,
});

const GroupPopupDone = styled('button')({
  background: '#6c5ce7',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 24px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { background: '#5a4bd1' },
});

const GroupPopupClear = styled('button')({
  background: 'none',
  color: '#999',
  border: '1px solid #e0e0e0',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { color: '#6c5ce7', borderColor: '#6c5ce7' },
});

function hebrewFirstCompare(a: string, b: string): number {
  const hebrewRe = /^[\u0590-\u05FF]/;
  const aHeb = hebrewRe.test(a);
  const bHeb = hebrewRe.test(b);
  if (aHeb && !bHeb) return -1;
  if (!aHeb && bHeb) return 1;
  return a.localeCompare(b, aHeb ? 'he' : 'en');
}

// ─── Component ───

type TabType = 'games' | 'stations' | 'missions';


/**
 * Where one map station is. Address lookup fills the coordinates, but the
 * coordinates stay editable: a courtyard or a specific gate often has no
 * address a geocoder knows, and dropping a pin by hand is the fallback.
 */
function LocationPopup({
  item,
  onChange,
  onClose,
  t,
}: {
  item: ModuleItem;
  onChange: (location: ItemLocation | undefined) => void;
  onClose: () => void;
  t: Record<string, string>;
}) {
  const [address, setAddress] = useState(item.location?.address || '');
  const [status, setStatus] = useState<'idle' | 'searching' | 'notFound' | 'noKey'>('idle');

  const search = async () => {
    if (!address.trim()) return;
    if (!isMapsAvailable()) { setStatus('noKey'); return; }
    setStatus('searching');
    const found = await geocodeAddress(address.trim());
    if (!found) { setStatus('notFound'); return; }
    setStatus('idle');
    setAddress(found.address);
    onChange({ lat: found.lat, lng: found.lng, address: found.address });
  };

  const setCoord = (key: 'lat' | 'lng', raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    onChange({ lat: item.location?.lat ?? 0, lng: item.location?.lng ?? 0, address: item.location?.address, [key]: value });
  };

  return (
    <GroupPopupOverlay onClick={onClose}>
      <GroupPopupCard onClick={(e) => e.stopPropagation()}>
        <GroupPopupTitle>
          <span style={{ fontSize: 18 }}>📍</span>
          {t.mapLocation}
        </GroupPopupTitle>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#6c5ce7' }}>{item.name}</div>

        <div style={{ display: 'flex', gap: 6 }}>
          <Input
            value={address}
            placeholder={t.mapAddress}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }}
            style={{ flex: 1 }}
          />
          <GroupPopupDone type="button" onClick={() => void search()} disabled={status === 'searching'}>
            {status === 'searching' ? t.mapFinding : t.mapFind}
          </GroupPopupDone>
        </div>
        {status === 'notFound' && <GroupPopupHint style={{ color: '#d63031' }}>{t.mapNotFound}</GroupPopupHint>}
        {status === 'noKey' && <GroupPopupHint style={{ color: '#d63031' }}>{t.mapNoKey}</GroupPopupHint>}

        <div style={{ display: 'flex', gap: 6 }}>
          <label style={{ flex: 1, fontSize: 12, color: '#666' }}>
            {t.mapLat}
            <Input
              type="number"
              inputMode="decimal"
              value={item.location?.lat ?? ''}
              onChange={(e) => setCoord('lat', e.target.value)}
            />
          </label>
          <label style={{ flex: 1, fontSize: 12, color: '#666' }}>
            {t.mapLng}
            <Input
              type="number"
              inputMode="decimal"
              value={item.location?.lng ?? ''}
              onChange={(e) => setCoord('lng', e.target.value)}
            />
          </label>
        </div>

        <GroupPopupActions>
          <GroupPopupClear type="button" onClick={() => { onChange(undefined); setAddress(''); }}>
            ✕
          </GroupPopupClear>
          <GroupPopupDone type="button" onClick={onClose}>
            {t.groupAssignDone || 'Done'}
          </GroupPopupDone>
        </GroupPopupActions>
      </GroupPopupCard>
    </GroupPopupOverlay>
  );
}

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
  const [groupPopupIndex, setGroupPopupIndex] = useState<number | null>(null);
  const [locationPopupIndex, setLocationPopupIndex] = useState<number | null>(null);

  // Multi-select sub-filters per tab. Empty set = show all.
  const [selectedGameTypes, setSelectedGameTypes] = useState<Set<string>>(new Set());
  const [selectedStationTypes, setSelectedStationTypes] = useState<Set<string>>(new Set());

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  // Fetch all games, stations, and missions on mount
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
      .catch(() => { /* ignore */ })
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

  // Unique types present in the loaded data — keeps the chip row in sync with
  // whichever game/station types actually exist for this user.
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

  const getIcon = (itemType: 'game' | 'station' | 'mission', subType?: string) => {
    if (itemType === 'mission') return '🎯';
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
                    <span style={{ fontSize: 13 }}>{GAME_ICONS[type] || '🎮'}</span>
                    {type}
                    <span style={{ opacity: 0.7, fontWeight: 500 }}>({count})</span>
                  </SubFilterChip>
                );
              })}
            {selectedGameTypes.size > 0 && (
              <SubFilterChip type="button" onClick={() => setSelectedGameTypes(new Set())}>
                ✕ {t.filterAll || 'All'}
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
                    <span style={{ fontSize: 13 }}>{STATION_ICONS[type] || '📍'}</span>
                    {type}
                    <span style={{ opacity: 0.7, fontWeight: 500 }}>({count})</span>
                  </SubFilterChip>
                );
              })}
            {selectedStationTypes.size > 0 && (
              <SubFilterChip type="button" onClick={() => setSelectedStationTypes(new Set())}>
                ✕ {t.filterAll || 'All'}
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
                      {sel && <CheckMark>✓</CheckMark>}
                      <CardTopRow>
                        <CardIcon>🎯</CardIcon>
                        <CardName>{mission.name}</CardName>
                      </CardTopRow>
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
                <ItemTypeBadge itemType={item.itemType === 'mission' ? 'station' : item.itemType} style={{ fontSize: 11, padding: '1px 6px', flexShrink: 0, ...(item.itemType === 'mission' ? { background: '#fff3e0', color: '#e65100' } : {}) }}>
                  {item.itemType === 'game' ? t.itemGame : item.itemType === 'mission' ? (t.mission || 'Mission') : t.itemStation}
                </ItemTypeBadge>
                <DragItemName>{item.name}</DragItemName>
                {item.subType && <SmallText style={{ flexShrink: 0 }}>{item.subType}</SmallText>}
                {isSpiders && onUpdateItemSvg && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {item.spiderSvg && (
                      <img
                        src={item.spiderSvg}
                        alt=""
                        style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, border: '1px solid #e0e0e0', background: '#f9f9f9', flexShrink: 0 }}
                      />
                    )}
                    <FileUploadButton
                      accept="image/svg+xml"
                      onUploaded={(url) => onUpdateItemSvg(index, url)}
                      label={item.spiderSvg ? '↺' : (t.spidersSvgUpload || 'SVG')}
                      uploadingLabel={t.spidersSvgUploading || '...'}
                    />
                  </div>
                )}
                {connectionType === 'group' && groupNames.length > 0 && (
                  <GroupButton
                    type="button"
                    hasGroups={item.groups && item.groups.length > 0}
                    onClick={(e) => { e.stopPropagation(); setGroupPopupIndex(index); }}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1 }}>👥</span>
                    {item.groups && item.groups.length > 0
                      ? `${item.groups.length}/${groupNames.length}`
                      : (t.allGroups || 'All')}
                  </GroupButton>
                )}
                {isMap && onUpdateItemLocation && (
                  <LocationButton
                    type="button"
                    hasLocation={!!item.location}
                    onClick={(e) => { e.stopPropagation(); setLocationPopupIndex(index); }}
                    title={item.location?.address || t.mapLocation}
                  >
                    📍 {item.location
                      ? (item.location.address?.split(',')[0] || `${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)}`)
                      : t.mapLocation}
                  </LocationButton>
                )}
                {isSpiders && onToggleItemFinal && (
                  <FinalButton
                    type="button"
                    isFinal={item.isFinal}
                    onClick={(e) => { e.stopPropagation(); onToggleItemFinal(index); }}
                    title={item.isFinal ? (t.spidersFinalRemove || 'Remove final mark') : (t.spidersFinalMark || 'Mark as final station')}
                  >
                    🏁 {item.isFinal ? (t.spidersFinal || 'Final') : (t.spidersSetFinal || 'Set Final')}
                  </FinalButton>
                )}
                {item.itemType === 'station' && item.subType === 'collage' && onConfigureCollageSplit && (() => {
                  const limit = getCollageImageLimit(item.settings);
                  const split = item.collageSplit;
                  const partSizes = effectivePartSizes(item, limit);
                  const partIdx = split?.partIndex ?? 0;
                  const totalParts = partSizes.length;
                  const isVideoPart = split?.videoPartIndex === partIdx;
                  const partSize = isVideoPart ? 0 : (partSizes[partIdx] ?? 1);
                  return (
                    <>
                      {split && (
                        <PartBadge title={t.collageSplitPartLabel || 'Part of split collage'}>
                          {(t.collageSplitPart || 'חלק')} {partIdx + 1}/{totalParts} · {isVideoPart ? '🎬' : `${partSize}📷`}
                        </PartBadge>
                      )}
                      <SplitButton
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onConfigureCollageSplit(index); }}
                        title={t.collageSplitConfigure || 'Configure split'}
                      >
                        ⚙️ {t.collageSplitConfigure || 'פיצול תחנה'}
                      </SplitButton>
                    </>
                  );
                })()}
                {onToggleItemRevisitable && (
                  <RevisitLabel title={t.revisitableHint || 'Participants can re-open this item from the roadmap after completing it'}>
                    <input
                      type="checkbox"
                      checked={!!item.revisitable}
                      onChange={(e) => { e.stopPropagation(); onToggleItemRevisitable(index); }}
                    />
                    {t.revisitable || 'Re-entry'}
                  </RevisitLabel>
                )}
                <PreviewButton type="button" onClick={(e) => { e.stopPropagation(); setPreviewItem(item); }}>
                  {t.preview}
                </PreviewButton>
                <RemoveBtn type="button" onClick={(e) => { e.stopPropagation(); onRemoveItem(index); }}>×</RemoveBtn>
              </DragItem>
            ))}
          </DragList>
        </div>
      )}

      {/* Group assignment popup */}
      {groupPopupIndex !== null && selectedItems[groupPopupIndex] && (
        <GroupPopupOverlay onClick={() => setGroupPopupIndex(null)}>
          <GroupPopupCard onClick={(e) => e.stopPropagation()}>
            <GroupPopupTitle>
              <span style={{ fontSize: 18 }}>👥</span>
              {t.groupAssignTitle || 'Group Visibility'}
            </GroupPopupTitle>
            <GroupPopupHint>
              {t.groupAssignHint || 'Select which groups will see this item. If none selected, all groups will see it.'}
            </GroupPopupHint>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#6c5ce7' }}>
              {selectedItems[groupPopupIndex].name}
            </div>
            <GroupCheckList>
              {groupNames.map((gName) => {
                const currentGroups = selectedItems[groupPopupIndex].groups || [];
                const isChecked = currentGroups.includes(gName);
                return (
                  <GroupCheckRow key={gName}>
                    <GroupCheckbox
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const next = isChecked
                          ? currentGroups.filter((g) => g !== gName)
                          : [...currentGroups, gName];
                        onUpdateItemGroups(groupPopupIndex, next);
                      }}
                    />
                    {gName}
                  </GroupCheckRow>
                );
              })}
            </GroupCheckList>
            <GroupPopupActions>
              <GroupPopupClear
                type="button"
                onClick={() => onUpdateItemGroups(groupPopupIndex, [])}
              >
                {t.groupAssignClear || 'Clear (all groups)'}
              </GroupPopupClear>
              <GroupPopupDone type="button" onClick={() => setGroupPopupIndex(null)}>
                {t.groupAssignDone || 'Done'}
              </GroupPopupDone>
            </GroupPopupActions>
          </GroupPopupCard>
        </GroupPopupOverlay>
      )}

      {locationPopupIndex !== null && selectedItems[locationPopupIndex] && onUpdateItemLocation && (
        <LocationPopup
          item={selectedItems[locationPopupIndex]}
          onChange={(loc) => onUpdateItemLocation(locationPopupIndex, loc)}
          onClose={() => setLocationPopupIndex(null)}
          t={t}
        />
      )}

      {/* Preview Modal */}
      {previewItem && (
        <ItemPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}
    </>
  );
}
