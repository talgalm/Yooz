import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Input } from '../../../components/styled';
import { SectionLabel, VerticalStackGap12, SmallOutlineButton, TinyDangerButton } from '../styled';
import type { GameConfigHandle, TrashSortBin, TrashSortItem, TrashSortScoring } from './types';

interface TrashSortGameConfigProps {
  t: Record<string, string>;
  initialSettings?: Record<string, unknown>;
}

const DEFAULT_BINS: TrashSortBin[] = [
  { id: 'organic', label: 'Organic', color: '#8B6914' },
  { id: 'paper', label: 'Paper', color: '#2980b9' },
  { id: 'packaging', label: 'Packaging', color: '#e67e22' },
];

const TrashSortGameConfig = forwardRef<GameConfigHandle, TrashSortGameConfigProps>(
  function TrashSortGameConfig({ t, initialSettings }, ref) {
    const [bins, setBins] = useState<TrashSortBin[]>(DEFAULT_BINS);
    const [items, setItems] = useState<TrashSortItem[]>([]);
    const [scoring, setScoring] = useState<TrashSortScoring>({ correctPoints: 10 });
    const [countdownSeconds, setCountdownSeconds] = useState(3);
    const [fallSpeedMs, setFallSpeedMs] = useState(3000);

    useEffect(() => {
      if (!initialSettings) return;
      if (Array.isArray(initialSettings.bins)) setBins(initialSettings.bins as TrashSortBin[]);
      if (Array.isArray(initialSettings.items)) setItems(initialSettings.items as TrashSortItem[]);
      if (initialSettings.scoring) setScoring(initialSettings.scoring as TrashSortScoring);
      if (typeof initialSettings.countdownSeconds === 'number') setCountdownSeconds(initialSettings.countdownSeconds);
      if (typeof initialSettings.fallSpeedMs === 'number') setFallSpeedMs(initialSettings.fallSpeedMs);
    }, [initialSettings]);

    const addItem = () => {
      setItems((prev) => [...prev, {
        id: `item-${Date.now()}`,
        label: '',
        imageUrl: '',
        correctBinId: bins[0]?.id || '',
      }]);
    };

    const removeItem = (index: number) => {
      setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof TrashSortItem, value: string) => {
      setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const addBin = () => {
      setBins((prev) => [...prev, {
        id: `bin-${Date.now()}`,
        label: '',
        color: '#999999',
      }]);
    };

    const removeBin = (index: number) => {
      setBins((prev) => prev.filter((_, i) => i !== index));
    };

    const updateBin = (index: number, field: keyof TrashSortBin, value: string) => {
      setBins((prev) => prev.map((bin, i) => i === index ? { ...bin, [field]: value } : bin));
    };

    useImperativeHandle(ref, () => ({
      validate() {
        if (bins.length < 2) return t.trashSortMinBins || 'At least 2 bins required.';
        if (items.length < 1) return t.trashSortMinItems || 'At least 1 item required.';
        for (const item of items) {
          if (!item.imageUrl.trim()) return t.trashSortItemImage || 'All items must have an image URL.';
          if (!item.correctBinId) return t.trashSortItemBin || 'All items must be assigned to a bin.';
        }
        return null;
      },
      getSettings() {
        return { bins, items, scoring, countdownSeconds, fallSpeedMs };
      },
      fillRandom() {
        const defaultBins: TrashSortBin[] = [
          { id: 'organic', label: 'אורגני', color: '#8B6914' },
          { id: 'paper', label: 'נייר', color: '#2980b9' },
          { id: 'packaging', label: 'אריזות', color: '#e67e22' },
        ];
        setBins(defaultBins);
        setItems([
          { id: '1', label: 'קליפת בננה', imageUrl: 'https://cdn-icons-png.flaticon.com/128/2909/2909841.png', correctBinId: 'organic' },
          { id: '2', label: 'קרטון', imageUrl: 'https://cdn-icons-png.flaticon.com/128/679/679922.png', correctBinId: 'paper' },
          { id: '3', label: 'בקבוק פלסטיק', imageUrl: 'https://cdn-icons-png.flaticon.com/128/2913/2913477.png', correctBinId: 'packaging' },
          { id: '4', label: 'עיתון', imageUrl: 'https://cdn-icons-png.flaticon.com/128/2965/2965879.png', correctBinId: 'paper' },
        ]);
        setScoring({ correctPoints: 15 });
        setCountdownSeconds(3);
        setFallSpeedMs(3000);
      },
    }));

    return (
      <VerticalStackGap12>
        <div>
          <SectionLabel>{t.trashSortBins || 'Bins'}</SectionLabel>
          {bins.map((bin, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input
                type="color"
                value={bin.color}
                onChange={(e) => updateBin(i, 'color', e.target.value)}
                style={{ width: 36, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer' }}
              />
              <Input
                placeholder={t.trashSortBinLabel || 'Bin label'}
                value={bin.label}
                onChange={(e) => updateBin(i, 'label', e.target.value)}
                style={{ flex: 1 }}
              />
              <Input
                placeholder="ID"
                value={bin.id}
                onChange={(e) => updateBin(i, 'id', e.target.value)}
                style={{ width: 100 }}
              />
              {bins.length > 2 && (
                <TinyDangerButton type="button" onClick={() => removeBin(i)}>X</TinyDangerButton>
              )}
            </div>
          ))}
          <SmallOutlineButton type="button" onClick={addBin}>
            {t.trashSortAddBin || '+ Add Bin'}
          </SmallOutlineButton>
        </div>

        <div>
          <SectionLabel>{t.trashSortItems || 'Items'}</SectionLabel>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <Input
                placeholder={t.trashSortItemLabel || 'Item label'}
                value={item.label}
                onChange={(e) => updateItem(i, 'label', e.target.value)}
                style={{ flex: 1 }}
              />
              <Input
                placeholder={t.trashSortItemImageUrl || 'Image URL'}
                value={item.imageUrl}
                onChange={(e) => updateItem(i, 'imageUrl', e.target.value)}
                style={{ flex: 2 }}
              />
              <select
                value={item.correctBinId}
                onChange={(e) => updateItem(i, 'correctBinId', e.target.value)}
                style={{ padding: '8px', borderRadius: 8, border: '1.5px solid #ddd', fontFamily: 'inherit' }}
              >
                {bins.map((bin) => (
                  <option key={bin.id} value={bin.id}>{bin.label || bin.id}</option>
                ))}
              </select>
              <TinyDangerButton type="button" onClick={() => removeItem(i)}>X</TinyDangerButton>
            </div>
          ))}
          <SmallOutlineButton type="button" onClick={addItem}>
            {t.trashSortAddItem || '+ Add Item'}
          </SmallOutlineButton>
        </div>

        <SectionLabel>{t.scoring}</SectionLabel>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <SectionLabel>{t.trashSortCorrectPoints || 'Points per correct sort'}</SectionLabel>
            <Input
              type="number"
              min={0}
              value={scoring.correctPoints}
              onChange={(e) => setScoring({ correctPoints: Number(e.target.value) })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <SectionLabel>{t.trashSortCountdown || 'Countdown (seconds)'}</SectionLabel>
            <Input
              type="number"
              min={0}
              max={10}
              value={countdownSeconds}
              onChange={(e) => setCountdownSeconds(Number(e.target.value))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <SectionLabel>{t.trashSortFallSpeed || 'Fall speed (ms)'}</SectionLabel>
            <Input
              type="number"
              min={1000}
              max={10000}
              step={500}
              value={fallSpeedMs}
              onChange={(e) => setFallSpeedMs(Number(e.target.value))}
            />
          </div>
        </div>
      </VerticalStackGap12>
    );
  }
);

export default TrashSortGameConfig;
