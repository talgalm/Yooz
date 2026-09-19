import { useCallback, useEffect, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Input } from '../../../components/styled';
import FileUploadButton from '../../../components/FileUploadButton';
import type { ItemLocation, ModuleItem } from './types';
import { geocodeAddress, isMapsAvailable, loadGoogleMaps } from '../../../utils/googleMaps';

const Overlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.3)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  boxSizing: 'border-box',
});

const Card = styled('div')({
  background: '#fff',
  borderRadius: 16,
  padding: '24px 28px',
  width: 'min(460px, 100%)',
  maxHeight: 'calc(100vh - 32px)',
  overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  boxSizing: 'border-box',
  '@media (max-width: 600px)': {
    padding: '20px 18px',
  },
});

const Title = styled('h3')({
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  color: '#333',
});

const Section = styled('div')({
  paddingTop: 14,
  borderTop: '1px solid #f0f0f4',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

const SectionTitle = styled('div')({
  fontSize: 13,
  fontWeight: 700,
  color: '#333',
});

const Hint = styled('p')({
  margin: 0,
  fontSize: 12,
  color: '#999',
  lineHeight: 1.4,
});

const CheckList = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  maxHeight: 220,
  overflowY: 'auto',
});

const CheckRow = styled('label')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '6px 10px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
  transition: 'background 0.12s',
  '&:hover': { background: '#f5f0ff' },
});

const Checkbox = styled('input')({
  width: 18,
  height: 18,
  accentColor: '#6c5ce7',
  cursor: 'pointer',
});

const Actions = styled('div')({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  flexWrap: 'wrap',
});

const PrimaryBtn = styled('button')({
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

const SecondaryBtn = styled('button')({
  background: 'none',
  color: '#666',
  border: '1px solid #e0e0e0',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  '&:hover': { color: '#6c5ce7', borderColor: '#6c5ce7' },
});

const OptionRow = styled('label')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 14,
  cursor: 'pointer',
});

const PickerCanvas = styled('div')({
  width: '100%',
  height: 220,
  borderRadius: 10,
  border: '1px solid #e0e0e0',
  background: '#f4f4f4',
});

const PickedCoords = styled('div')({
  fontSize: 12,
  color: '#666',
  fontFamily: 'monospace',
  textAlign: 'center',
  direction: 'ltr',
});

/** Central Israel — every Yooz activity so far is there; pan from here rather than from space. */
const DEFAULT_PICKER_CENTER = { lat: 32.0853, lng: 34.7818 };

/**
 * Where one map station is. Address lookup fills the coordinates, but the
 * coordinates stay editable: a courtyard or a specific gate often has no
 * address a geocoder knows, and dropping a pin by hand is the fallback.
 */
function LocationSection({
  item,
  onChange,
  t,
}: {
  item: ModuleItem;
  onChange: (location: ItemLocation | undefined) => void;
  t: Record<string, string>;
}) {
  const [address, setAddress] = useState(item.location?.address || '');
  const [status, setStatus] = useState<'idle' | 'searching' | 'notFound' | 'noKey' | 'mapFailed'>('idle');
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const commit = useRef(onChange);
  commit.current = onChange;

  const place = useCallback((lat: number, lng: number, addr?: string) => {
    markerRef.current?.setPosition({ lat, lng });
    mapRef.current?.panTo({ lat, lng });
    commit.current({ lat, lng, address: addr });
  }, []);

  useEffect(() => {
    if (!isMapsAvailable()) { setStatus('noKey'); return; }
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !canvasRef.current) return;
        const start = item.location ?? DEFAULT_PICKER_CENTER;
        const map = new maps.Map(canvasRef.current, {
          center: start,
          zoom: item.location ? 17 : 12,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
        });
        const marker = new maps.Marker({
          map,
          position: start,
          draggable: true,
          visible: !!item.location,
        });
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          marker.setVisible(true);
          place(e.latLng.lat(), e.latLng.lng());
        });
        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (pos) place(pos.lat(), pos.lng());
        });
        mapRef.current = map;
        markerRef.current = marker;
      })
      .catch(() => { if (!cancelled) setStatus('mapFailed'); });
    return () => { cancelled = true; };
    // Mount-only: re-running would rebuild the map under the admin's cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async () => {
    if (!address.trim()) return;
    if (!isMapsAvailable()) { setStatus('noKey'); return; }
    setStatus('searching');
    const found = await geocodeAddress(address.trim());
    if (!found) { setStatus('notFound'); return; }
    setStatus('idle');
    setAddress(found.address);
    markerRef.current?.setVisible(true);
    mapRef.current?.setZoom(17);
    place(found.lat, found.lng, found.address);
  };

  const clear = () => {
    markerRef.current?.setVisible(false);
    setAddress('');
    setStatus('idle');
    onChange(undefined);
  };

  const loc = item.location;
  return (
    <Section>
      <SectionTitle>{t.mapLocation}</SectionTitle>
      <div style={{ display: 'flex', gap: 6 }}>
        <Input
          value={address}
          placeholder={t.mapAddress}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }}
          style={{ flex: 1 }}
        />
        <SecondaryBtn type="button" onClick={() => void search()} disabled={status === 'searching'}>
          {status === 'searching' ? t.mapFinding : t.mapFind}
        </SecondaryBtn>
      </div>
      <PickerCanvas ref={canvasRef} />
      <Hint>{t.mapPickHint}</Hint>
      {status === 'notFound' && <Hint style={{ color: '#c0392b' }}>{t.mapNotFound}</Hint>}
      {status === 'noKey' && <Hint style={{ color: '#c0392b' }}>{t.mapNoKey}</Hint>}
      {status === 'mapFailed' && <Hint style={{ color: '#c0392b' }}>{t.mapPickerFailed}</Hint>}
      <PickedCoords>{loc ? `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}` : t.mapNoPoint}</PickedCoords>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <SecondaryBtn type="button" onClick={clear}>{t.mapClearPoint}</SecondaryBtn>
      </div>
    </Section>
  );
}

interface ItemSettingsModalProps {
  item: ModuleItem;
  index: number;
  groupNames: string[];
  connectionType: string;
  isMap: boolean;
  isSpiders: boolean;
  onUpdateGroups: (index: number, groups: string[]) => void;
  onUpdateLocation?: (index: number, location: ItemLocation | undefined) => void;
  onUpdateSvg?: (index: number, svgUrl: string) => void;
  onToggleFinal?: (index: number) => void;
  onToggleRevisitable?: (index: number) => void;
  onConfigureSplit?: (index: number) => void;
  onPreview: () => void;
  onClose: () => void;
  t: Record<string, string>;
}

/** One consolidated settings surface for a selected module item — replaces the
 *  old scatter of per-item popups/buttons (group visibility, location, spider
 *  SVG, final/re-entry flags, collage split) with a single sectioned modal. */
export default function ItemSettingsModal({
  item,
  index,
  groupNames,
  connectionType,
  isMap,
  isSpiders,
  onUpdateGroups,
  onUpdateLocation,
  onUpdateSvg,
  onToggleFinal,
  onToggleRevisitable,
  onConfigureSplit,
  onPreview,
  onClose,
  t,
}: ItemSettingsModalProps) {
  const isCollage = item.itemType === 'station' && item.subType === 'collage';
  const currentGroups = item.groups || [];

  return (
    <Overlay onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        <Title>{item.name}</Title>

        {connectionType === 'group' && groupNames.length > 0 && (
          <Section style={{ borderTop: 'none', paddingTop: 0 }}>
            <SectionTitle>{t.groupAssignTitle}</SectionTitle>
            <Hint>{t.groupAssignHint}</Hint>
            <CheckList>
              {groupNames.map((gName) => {
                const isChecked = currentGroups.includes(gName);
                return (
                  <CheckRow key={gName}>
                    <Checkbox
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const next = isChecked
                          ? currentGroups.filter((g) => g !== gName)
                          : [...currentGroups, gName];
                        onUpdateGroups(index, next);
                      }}
                    />
                    {gName}
                  </CheckRow>
                );
              })}
            </CheckList>
            {currentGroups.length > 0 && (
              <div>
                <SecondaryBtn type="button" onClick={() => onUpdateGroups(index, [])}>
                  {t.groupAssignClear}
                </SecondaryBtn>
              </div>
            )}
          </Section>
        )}

        {isMap && onUpdateLocation && (
          <LocationSection item={item} onChange={(loc) => onUpdateLocation(index, loc)} t={t} />
        )}

        {isSpiders && onUpdateSvg && (
          <Section>
            <SectionTitle>{t.spidersSvgLabel}</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {item.spiderSvg && (
                <img
                  src={item.spiderSvg}
                  alt=""
                  style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, border: '1px solid #e0e0e0', background: '#f9f9f9' }}
                />
              )}
              <FileUploadButton
                accept="image/svg+xml"
                onUploaded={(url) => onUpdateSvg(index, url)}
                label={t.spidersSvgUpload}
                uploadingLabel={t.spidersSvgUploading}
              />
            </div>
          </Section>
        )}

        {isCollage && onConfigureSplit && (
          <Section>
            <SectionTitle>{t.collageSplit}</SectionTitle>
            <Hint>{item.collageSplit ? t.collageSplitPartLabel : t.collageSplitConfigure}</Hint>
            <div>
              <SecondaryBtn type="button" onClick={() => { onConfigureSplit(index); onClose(); }}>
                {t.collageSplitConfigure}
              </SecondaryBtn>
            </div>
          </Section>
        )}

        {(onToggleFinal && isSpiders) || onToggleRevisitable ? (
          <Section>
            <SectionTitle>{t.additionalOptionsTitle}</SectionTitle>
            {isSpiders && onToggleFinal && (
              <OptionRow title={t.revisitableHint}>
                <Checkbox
                  type="checkbox"
                  checked={!!item.isFinal}
                  onChange={() => onToggleFinal(index)}
                />
                {t.spidersFinalMark}
              </OptionRow>
            )}
            {onToggleRevisitable && (
              <OptionRow title={t.revisitableHint}>
                <Checkbox
                  type="checkbox"
                  checked={!!item.revisitable}
                  onChange={() => onToggleRevisitable(index)}
                />
                {t.revisitable}
              </OptionRow>
            )}
          </Section>
        ) : null}

        <Actions>
          <SecondaryBtn type="button" onClick={onPreview}>{t.preview}</SecondaryBtn>
          <PrimaryBtn type="button" onClick={onClose}>{t.closePreview}</PrimaryBtn>
        </Actions>
      </Card>
    </Overlay>
  );
}
