import { useEffect, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { SectionLabelSmall, SectionDescription } from '../styled';
import { useTranslations } from '../../../context/LanguageContext';
import { isMapsAvailable, loadGoogleMaps, onMapsAuthFailure } from '../../../utils/googleMaps';
import {
  MAP_FEATURE_KEYS,
  MAP_LOOKS,
  MAP_STYLE_IDS,
  lookFor,
  mapOptionsFor,
  routeLineOptions,
  type MapDesign,
  type MapFeatureKey,
  type MapLook,
  type MapStyleId,
} from '../../../utils/mapDesign';
import MapLookOverlay from '../../../components/MapLookOverlay';
import { attachMapLookLayer } from '../../../utils/mapLookLayer';
import { attachPulse, doneStationMarker, nextStationMarker } from '../../../utils/mapPins';
import { texts } from './MapDesignSection.i18n';
import type { ItemLocation } from './types';

const PREVIEW_FALLBACK_CENTER = { lat: 32.0853, lng: 34.7818 };
const MAX_ROUTE_WAYPOINTS = 25;

const Wrap = styled('div')({
  marginTop: 16,
  paddingTop: 16,
  borderTop: '1px solid #eee',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
});

const Title = styled('div')({ fontWeight: 700, fontSize: 15, color: '#2d3436' });

const StyleGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: 10,
  '@media (max-width: 900px)': { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
});

const StyleTile = styled('button', { shouldForwardProp: (prop) => !String(prop).startsWith('$') })<{ $selected: boolean }>(({ $selected: selected }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 8,
  borderRadius: 12,
  border: `2px solid ${selected ? '#6c5ce7' : '#e8e8ec'}`,
  background: selected ? '#f5f3ff' : '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  textAlign: 'start',
  transition: 'border-color 0.15s',
  '&:hover': { borderColor: '#6c5ce7' },
}));

function swatchBackground({ swatch }: MapLook): string {
  return [
    `radial-gradient(circle at 88% 86%, ${swatch.water} 0 30%, transparent 31%)`,
    `radial-gradient(circle at 18% 28%, ${swatch.park} 0 17%, transparent 18%)`,
    `linear-gradient(32deg, transparent 45%, ${swatch.road} 45% 53%, transparent 53%)`,
    `linear-gradient(118deg, transparent 63%, ${swatch.road} 63% 68%, transparent 68%)`,
    `linear-gradient(${swatch.land}, ${swatch.land})`,
  ].join(', ');
}

const Swatch = styled('div', { shouldForwardProp: (prop) => !String(prop).startsWith('$') })<{ $look: MapLook }>(({ $look: look }) => ({
  position: 'relative',
  height: 64,
  borderRadius: 8,
  overflow: 'hidden',
  background: swatchBackground(look),
  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
}));

const SwatchPin = styled('span', { shouldForwardProp: (prop) => !String(prop).startsWith('$') })<{ $color: string }>(({ $color: color }) => ({
  position: 'absolute',
  top: '42%',
  insetInlineStart: '46%',
  width: 12,
  height: 12,
  borderRadius: '50%',
  background: color,
  border: '2px solid #fff',
  zIndex: 2,
}));

const StyleName = styled('div')({ fontWeight: 700, fontSize: 13, color: '#2d3436' });
const StyleHint = styled('div')({ fontSize: 11, color: '#888', lineHeight: 1.35 });

const FeaturesHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  marginTop: 6,
});

const LinkButtons = styled('div')({ display: 'flex', gap: 6 });

const LinkButton = styled('button')({
  border: '1px solid #d8d3f5',
  background: '#fff',
  color: '#6c5ce7',
  borderRadius: 8,
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  '&:hover': { background: '#f5f3ff' },
});

const FeatureGrid = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  '@media (max-width: 900px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  gap: 6,
});

const FeatureRow = styled('label', { shouldForwardProp: (prop) => !String(prop).startsWith('$') })<{ $on: boolean }>(({ $on: on }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 8,
  border: `1px solid ${on ? '#d8d3f5' : '#eee'}`,
  background: on ? '#faf9ff' : '#f7f7f7',
  color: on ? '#2d3436' : '#999',
  fontSize: 13,
  cursor: 'pointer',
  '& input': { width: 16, height: 16, accentColor: '#6c5ce7', flexShrink: 0 },
}));

const Note = styled('div')({ fontSize: 12, color: '#888' });

const Preview = styled('div')({
  position: 'relative',
  height: 280,
  borderRadius: 12,
  overflow: 'hidden',
  border: '1px solid #e8e8ec',
  background: '#f1f1f4',
});

const PreviewCanvas = styled('div')({
  position: 'absolute',
  inset: 0,
  '& .gm-style-cc, & a[href*="maps.google.com/maps"], & a[title*="Google Maps"], & img[alt="Google"]': {
    display: 'none !important',
  },
});

const PreviewMessage = styled('div')({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  textAlign: 'center',
  fontSize: 13,
  color: '#888',
});

function MapDesignPreview({ design, points, noKeyText, failedText }: {
  design: MapDesign;
  points: ItemLocation[];
  noKeyText: string;
  failedText: string;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const pinsRef = useRef<google.maps.Marker[]>([]);
  const routeRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const straightRef = useRef<google.maps.Polyline | null>(null);
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const pointsKey = points.map((p) => `${p.lat},${p.lng}`).join('|');
  const designRef = useRef(design);
  designRef.current = design;
  const [status, setStatus] = useState<'loading' | 'ready' | 'noKey' | 'failed'>(
    isMapsAvailable() ? 'loading' : 'noKey',
  );

  useEffect(() => onMapsAuthFailure(() => setStatus('failed')), []);

  useEffect(() => {
    if (!isMapsAvailable()) return;
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !canvasRef.current) return;
        mapRef.current = new maps.Map(canvasRef.current, {
          center: PREVIEW_FALLBACK_CENTER,
          zoom: 16,
          disableDefaultUI: true,
          keyboardShortcuts: false,
          clickableIcons: false,
          gestureHandling: 'cooperative',
          ...mapOptionsFor(designRef.current),
        });
        const routeLine = routeLineOptions(lookFor(designRef.current));
        routeRef.current = new maps.DirectionsRenderer({
          map: mapRef.current,
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: routeLine,
        });
        straightRef.current = new maps.Polyline({ map: mapRef.current, ...routeLine });
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('failed'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    mapRef.current?.setOptions(mapOptionsFor(design));
  }, [design, status]);

  const look = lookFor(design);
  useEffect(() => {
    const maps = window.google?.maps;
    const map = mapRef.current;
    if (!maps || !map || status !== 'ready') return;
    return attachMapLookLayer(maps, map, look.overlay);
  }, [look.overlay, status]);

  useEffect(() => {
    const line = routeLineOptions(look);
    straightRef.current?.setOptions(line);
    const route = routeRef.current;
    if (!route) return;
    route.setOptions({ polylineOptions: line });
    const shown = route.getDirections();
    if (shown) route.setDirections(shown);
  }, [look, status]);

  useEffect(() => {
    const maps = window.google?.maps;
    const route = routeRef.current;
    const straight = straightRef.current;
    if (!maps || !route || !straight || status !== 'ready') return;
    const stops = pointsRef.current;
    route.set('directions', null);
    straight.setPath([]);
    if (stops.length < 2) return;
    const drawStraight = () => straight.setPath(stops);
    if (stops.length - 2 > MAX_ROUTE_WAYPOINTS) {
      drawStraight();
      return;
    }
    let cancelled = false;
    new maps.DirectionsService()
      .route({
        origin: stops[0],
        destination: stops[stops.length - 1],
        waypoints: stops.slice(1, -1).map((location) => ({ location, stopover: true })),
        travelMode: maps.TravelMode.WALKING,
      })
      .then((result) => { if (!cancelled) route.setDirections(result); })
      .catch(() => { if (!cancelled) drawStraight(); });
    return () => { cancelled = true; };
  }, [pointsKey, status]);

  useEffect(() => {
    const maps = window.google?.maps;
    const map = mapRef.current;
    if (!maps || !map || status !== 'ready') return;
    const points = pointsRef.current;
    pinsRef.current.forEach((pin) => pin.setMap(null));
    pinsRef.current = points.map((position, i) => new maps.Marker({
      map,
      position,
      ...(i === 0 ? nextStationMarker(maps, look, 1) : doneStationMarker(maps, look, i + 1)),
    }));
    if (points.length === 0) return;
    return attachPulse(maps, map, points[0], look.pins.next);
  }, [pointsKey, status, look]);

  useEffect(() => {
    const maps = window.google?.maps;
    const map = mapRef.current;
    if (!maps || !map || status !== 'ready') return;
    const points = pointsRef.current;
    if (points.length === 0) {
      map.setCenter(PREVIEW_FALLBACK_CENTER);
      map.setZoom(16);
    } else if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(17);
    } else {
      const bounds = new maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 40);
    }
  }, [pointsKey, status]);

  return (
    <Preview>
      <PreviewCanvas ref={canvasRef} />
      {status === 'noKey' && <PreviewMessage>{noKeyText}</PreviewMessage>}
      {status === 'failed' && <PreviewMessage>{failedText}</PreviewMessage>}
    </Preview>
  );
}

export default function MapDesignSection({ design, onChange, points }: {
  design: MapDesign;
  onChange: (design: MapDesign) => void;
  points: ItemLocation[];
}) {
  const t = useTranslations(texts);
  const hidden = new Set(design.hidden);

  const pickStyle = (style: MapStyleId) => onChange({ ...design, style });
  const toggleFeature = (key: MapFeatureKey) => {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange({ ...design, hidden: MAP_FEATURE_KEYS.filter((k) => next.has(k)) });
  };

  return (
    <Wrap>
      <Title>{t.title}</Title>
      <SectionDescription style={{ margin: 0 }}>{t.description}</SectionDescription>

      <SectionLabelSmall>{t.styleLabel}</SectionLabelSmall>
      <StyleGrid>
        {MAP_STYLE_IDS.map((id) => (
          <StyleTile key={id} type="button" $selected={design.style === id} onClick={() => pickStyle(id)}>
            <Swatch $look={MAP_LOOKS[id]}>
              <MapLookOverlay kind={MAP_LOOKS[id].overlay} />
              <SwatchPin $color={MAP_LOOKS[id].pins.next} />
            </Swatch>
            <StyleName>{t.styles[id]}</StyleName>
            <StyleHint>{t.styleHints[id]}</StyleHint>
          </StyleTile>
        ))}
      </StyleGrid>

      <FeaturesHeader>
        <SectionLabelSmall style={{ margin: 0 }}>{t.featuresLabel}</SectionLabelSmall>
        <LinkButtons>
          <LinkButton type="button" onClick={() => onChange({ ...design, hidden: [] })}>{t.showAll}</LinkButton>
          <LinkButton type="button" onClick={() => onChange({ ...design, hidden: [...MAP_FEATURE_KEYS] })}>{t.hideAll}</LinkButton>
        </LinkButtons>
      </FeaturesHeader>
      <FeatureGrid>
        {MAP_FEATURE_KEYS.map((key) => (
          <FeatureRow key={key} $on={!hidden.has(key)}>
            <input type="checkbox" checked={!hidden.has(key)} onChange={() => toggleFeature(key)} />
            {t.features[key]}
          </FeatureRow>
        ))}
      </FeatureGrid>
      <Note>{t.featuresNote}</Note>

      <SectionLabelSmall style={{ marginTop: 6 }}>{t.previewLabel}</SectionLabelSmall>
      <MapDesignPreview design={design} points={points} noKeyText={t.previewNoKey} failedText={t.previewFailed} />
    </Wrap>
  );
}
