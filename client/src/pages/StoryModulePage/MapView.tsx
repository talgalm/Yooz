import { useEffect, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { DarkHeaderActionIconButton } from '../../components/styled';
import { loadGoogleMaps, isMapsAvailable, onMapsAuthFailure } from '../../utils/googleMaps';
import {
  distanceMeters,
  hasArrived,
  DEFAULT_PROXIMITY_METERS,
  type Fix,
} from '../../utils/geo';
import ActivitySessionHeader, { SessionHeaderTrophyIcon } from './ActivitySessionHeader';
import { getHeaderIconColor, getThemeKit } from './roadmapThemes';
import { teamMarkerColor, teamMarkerLabel } from './teamMarker';
import { lookFor, mapOptionsFor, routeLineOptions, type MapDesign } from '../../utils/mapDesign';
import { PIN_LAYERS, attachPulse, doneStationMarkers, meMarkerIcon, nextStationMarkers } from '../../utils/mapPins';
import { attachMapLookLayer } from '../../utils/mapLookLayer';
import type { CustomThemeData, MapGroupMarker, ModuleItemData } from './types';

const Wrap = styled('div')({ display: 'flex', flexDirection: 'column', width: '100%', height: '100dvh' });
const HeaderBar = styled('div')({ flexShrink: 0, backgroundSize: 'cover', backgroundPosition: 'center top' });
const MapArea = styled('div')({ position: 'relative', flex: 1, minHeight: 0 });
const Canvas = styled('div')({ position: 'absolute', inset: 0 });

const Panel = styled('div')({
  position: 'absolute',
  left: 12,
  right: 12,
  bottom: 12,
  background: 'rgba(255,255,255,0.96)',
  borderRadius: 14,
  padding: '12px 14px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  zIndex: 2,
});

const Target = styled('div')({ fontWeight: 700, fontSize: 15 });
const Readout = styled('div')({ fontSize: 13, color: '#555' });
const Warn = styled('div')({ fontSize: 13, color: '#d63031', fontWeight: 600 });

const Action = styled('button')({
  border: 'none',
  borderRadius: 10,
  padding: '12px 16px',
  fontSize: 15,
  fontWeight: 700,
  fontFamily: 'inherit',
  color: '#fff',
  background: '#6c5ce7',
  cursor: 'pointer',
  '&:disabled': { background: '#b9b4e0', cursor: 'default' },
});

const Ghost = styled('button')({
  border: '1px solid #d0d0d0',
  background: 'none',
  borderRadius: 10,
  padding: '9px 14px',
  fontSize: 13,
  fontFamily: 'inherit',
  color: '#666',
  cursor: 'pointer',
});

const MANUAL_OVERRIDE_M = 40;
const OVERRIDE_AFTER_MS = 30_000;

interface Props {
  items: ModuleItemData[];
  currentItemIndex: number;
  completedIndices: number[];
  others: MapGroupMarker[];
  fix: Fix | null;
  geoError: string | null;
  proximityMeters?: number;
  design?: MapDesign;
  onArrive: () => void;
  t: Record<string, string>;
  currentPoints: number;
  onLogout: () => void;
  onViewLeaderboard: () => void;
  hideLeaderboardInHeader?: boolean;
  leaderboardMode?: 'points' | 'time' | 'both';
  elapsedSeconds?: number;
  activityDurationMinutes?: number;
  roadmapTimerMinutes?: number;
  theme?: string;
  customTheme?: CustomThemeData;
}

export default function MapView({
  items,
  currentItemIndex,
  completedIndices,
  others,
  fix,
  geoError,
  proximityMeters = DEFAULT_PROXIMITY_METERS,
  design,
  onArrive,
  t,
  currentPoints,
  onLogout,
  onViewLeaderboard,
  hideLeaderboardInHeader,
  leaderboardMode,
  elapsedSeconds,
  activityDurationMinutes,
  roadmapTimerMinutes,
  theme,
  customTheme,
}: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const meMarker = useRef<google.maps.Marker | null>(null);
  const stationMarkers = useRef<google.maps.Marker[]>([]);
  const groupMarkers = useRef<Map<string, google.maps.Marker>>(new Map());
  const renderer = useRef<google.maps.DirectionsRenderer | null>(null);
  const routedFrom = useRef<string>('');
  const look = lookFor(design);
  const designRef = useRef(design);
  designRef.current = design;

  const [mapsError, setMapsError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [pressedStart, setPressedStart] = useState(false);
  const [arrivedAt, setArrivedAt] = useState<number | null>(null);
  const [overrideDueAt, setOverrideDueAt] = useState<number | null>(null);

  const target = items[currentItemIndex]?.location;
  const distance = fix && target ? distanceMeters(fix, target) : null;
  const started = pressedStart || completedIndices.length > 0;
  const arrived = arrivedAt === currentItemIndex;
  const offerOverride = started && !arrived && (
    !!geoError || overrideDueAt === currentItemIndex || (distance !== null && distance > MANUAL_OVERRIDE_M)
  );

  useEffect(() => onMapsAuthFailure(() => setMapsError(true)), []);

  useEffect(() => {
    if (!isMapsAvailable()) {
      setMapsError(true);
      return;
    }
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !canvasRef.current) return;
        mapRef.current = new maps.Map(canvasRef.current, {
          zoom: 16,
          center: { lat: 32.0853, lng: 34.7818 },
          disableDefaultUI: true,
          keyboardShortcuts: false,
          gestureHandling: 'greedy',
          clickableIcons: false,
          ...mapOptionsFor(designRef.current),
        });
        renderer.current = new maps.DirectionsRenderer({
          map: mapRef.current,
          suppressMarkers: true,
          polylineOptions: routeLineOptions(lookFor(designRef.current)),
        });
        setMapReady(true);
      })
      .catch(() => {
        if (!cancelled) setMapsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const maps = window.google?.maps;
    if (!maps || !mapRef.current || !mapReady) return;
    return attachMapLookLayer(maps, mapRef.current, look.overlay);
  }, [mapReady, look.overlay]);

  useEffect(() => {
    mapRef.current?.setOptions(mapOptionsFor(design));
    renderer.current?.setOptions({ polylineOptions: routeLineOptions(lookFor(design)) });
  }, [design]);

  useEffect(() => {
    const maps = window.google?.maps;
    if (!maps || !mapRef.current) return;
    stationMarkers.current.forEach((m) => m.setMap(null));
    const map = mapRef.current;
    stationMarkers.current = items.flatMap((item, i) => {
      if (!item.location) return [];
      const at = { map, position: item.location, title: item.name };
      const mark = { number: i + 1, icon: item.mapIcon };
      if (i === currentItemIndex) {
        const animation = arrived ? maps.Animation.BOUNCE : null;
        return nextStationMarkers(maps, look, mark).map((part) => new maps.Marker({ ...at, ...part, animation }));
      }
      if (!completedIndices.includes(i)) return [];
      return doneStationMarkers(maps, look, mark).map((part) => new maps.Marker({ ...at, ...part }));
    });
  }, [items, currentItemIndex, completedIndices, arrived, look]);

  useEffect(() => {
    const maps = window.google?.maps;
    const where = items[currentItemIndex]?.location;
    if (!maps || !mapRef.current || !mapReady || !where) return;
    return attachPulse(maps, mapRef.current, where, look.pins.next);
  }, [items, currentItemIndex, mapReady, look]);

  useEffect(() => {
    const maps = window.google?.maps;
    if (!maps || !mapRef.current || !fix) return;
    const meIcon = meMarkerIcon(maps, look);
    if (!meMarker.current) {
      meMarker.current = new maps.Marker({
        map: mapRef.current,
        title: t.mapYou,
        icon: meIcon,
        zIndex: PIN_LAYERS.me,
      });
      mapRef.current.panTo(fix);
    }
    meMarker.current.setIcon(meIcon);
    meMarker.current.setPosition(fix);
  }, [fix, t.mapYou, look]);

  useEffect(() => {
    const maps = window.google?.maps;
    if (!maps || !mapRef.current) return;
    const seen = new Set<string>();
    for (const g of others) {
      if (!g.position) continue;
      seen.add(g.groupName);
      const existing = groupMarkers.current.get(g.groupName);
      if (existing) {
        existing.setPosition(g.position);
        continue;
      }
      groupMarkers.current.set(
        g.groupName,
        new maps.Marker({
          map: mapRef.current as google.maps.Map,
          position: g.position,
          title: `${g.groupName} · ${g.score}`,
          label: { text: teamMarkerLabel(g.groupName), color: '#fff', fontSize: '10px', fontWeight: '700' },
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: teamMarkerColor(g.groupName),
            fillOpacity: 0.9,
            strokeColor: '#fff',
            strokeWeight: 2,
          },
        }),
      );
    }
    for (const [name, marker] of groupMarkers.current) {
      if (!seen.has(name)) {
        marker.setMap(null);
        groupMarkers.current.delete(name);
      }
    }
  }, [others]);

  useEffect(() => {
    const maps = window.google?.maps;
    if (!maps || !started || !fix || !target || !renderer.current) return;
    const key = `${currentItemIndex}:${fix.lat.toFixed(3)},${fix.lng.toFixed(3)}`;
    if (routedFrom.current === key) return;
    routedFrom.current = key;
    Promise.resolve()
      .then(() => new maps.DirectionsService().route({ origin: fix, destination: target, travelMode: maps.TravelMode.WALKING }))
      .then((result) => {
        if (result) renderer.current?.setDirections(result);
      })
      .catch(() => {
      });
  }, [started, fix, target, currentItemIndex]);

  useEffect(() => {
    if (!fix || !target) return;
    setArrivedAt((was) => (hasArrived(fix, target, proximityMeters, was === currentItemIndex) ? currentItemIndex : null));
  }, [fix, target, proximityMeters, currentItemIndex]);

  useEffect(() => {
    if (!started) return;
    const timer = setTimeout(() => setOverrideDueAt(currentItemIndex), OVERRIDE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [started, currentItemIndex]);

  const name = items[currentItemIndex]?.name ?? '';
  const headerIconColor = getHeaderIconColor(theme, customTheme);
  const header = (
    <HeaderBar
      style={customTheme?.roadmapImage
        ? { backgroundImage: `url(${customTheme.roadmapImage})` }
        : { background: getThemeKit(theme).containerBg }}
    >
      <ActivitySessionHeader
        currentPoints={currentPoints}
        onLogout={onLogout}
        t={t}
        headerIconColor={headerIconColor}
        leaderboardMode={leaderboardMode}
        elapsedSeconds={elapsedSeconds}
        activityDurationMinutes={activityDurationMinutes}
        roadmapTimerMinutes={roadmapTimerMinutes}
        omitThirdSlot={hideLeaderboardInHeader}
        thirdSlot={!hideLeaderboardInHeader ? (
          <DarkHeaderActionIconButton type="button" onClick={onViewLeaderboard} aria-label={t.leaderboardTitle} title={t.leaderboardTitle} iconColor={headerIconColor}>
            <SessionHeaderTrophyIcon />
          </DarkHeaderActionIconButton>
        ) : null}
      />
    </HeaderBar>
  );

  if (mapsError) {
    return (
      <Wrap>
        {header}
        <MapArea>
          <Panel>
            <Target>{`${currentItemIndex + 1}. ${name}`}</Target>
            {target?.address && <Readout>{target.address}</Readout>}
            <Warn>{t.mapUnavailable}</Warn>
            <Action type="button" onClick={onArrive}>
              {t.mapOpenAnyway}
            </Action>
          </Panel>
        </MapArea>
      </Wrap>
    );
  }

  return (
    <Wrap>
      {header}
      <MapArea>
        <Canvas ref={canvasRef} />
        <Panel>
          <Target>{`${currentItemIndex + 1}. ${name}`}</Target>

          {geoError && <Warn>{geoError === 'denied' ? t.mapGeoDenied : t.mapGeoUnavailable}</Warn>}
          {!geoError && !fix && <Readout>{t.mapLocating}</Readout>}
          {fix && distance !== null && (
            <Readout>
              {`${Math.round(distance)} ${t.mapMeters} · ${t.mapAccuracy} ±${Math.round(fix.accuracy)}`}
            </Readout>
          )}
          {!target && <Warn>{t.mapNoStationLocation}</Warn>}

          {!target ? (
            <Action type="button" onClick={onArrive}>
              {t.mapOpenAnyway}
            </Action>
          ) : !started ? (
            <Action type="button" onClick={() => setPressedStart(true)}>
              {t.mapStart}
            </Action>
          ) : arrived ? (
            <Action type="button" onClick={onArrive}>
              {t.mapOpenStation}
            </Action>
          ) : (
            <Readout>{t.mapKeepWalking}</Readout>
          )}

          {target && offerOverride && (
            <Ghost type="button" onClick={onArrive}>
              {t.mapImHere}
            </Ghost>
          )}
        </Panel>
      </MapArea>
    </Wrap>
  );
}
