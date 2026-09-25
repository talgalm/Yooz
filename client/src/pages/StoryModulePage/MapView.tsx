import { useEffect, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { loadGoogleMaps, isMapsAvailable } from '../../utils/googleMaps';
import {
  distanceMeters,
  hasArrived,
  DEFAULT_PROXIMITY_METERS,
  type Fix,
} from '../../utils/geo';
import type { MapGroupMarker, ModuleItemData } from './types';

const Wrap = styled('div')({ position: 'relative', width: '100%', height: '100%', minHeight: 420 });
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

interface Props {
  items: ModuleItemData[];
  currentItemIndex: number;
  completedIndices: number[];
  others: MapGroupMarker[];
  fix: Fix | null;
  geoError: string | null;
  proximityMeters?: number;
  onArrive: () => void;
  t: Record<string, string>;
}

export default function MapView({
  items,
  currentItemIndex,
  completedIndices,
  others,
  fix,
  geoError,
  proximityMeters = DEFAULT_PROXIMITY_METERS,
  onArrive,
  t,
}: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const meMarker = useRef<google.maps.Marker | null>(null);
  const stationMarkers = useRef<google.maps.Marker[]>([]);
  const groupMarkers = useRef<Map<string, google.maps.Marker>>(new Map());
  const renderer = useRef<google.maps.DirectionsRenderer | null>(null);
  const routedFrom = useRef<string>('');

  const [mapsError, setMapsError] = useState(false);
  const [started, setStarted] = useState(false);
  const [arrived, setArrived] = useState(false);

  const target = items[currentItemIndex]?.location;
  const distance = fix && target ? distanceMeters(fix, target) : null;

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
          gestureHandling: 'greedy',
          clickableIcons: false,
        });
        renderer.current = new maps.DirectionsRenderer({
          map: mapRef.current,
          suppressMarkers: true,
          polylineOptions: { strokeColor: '#6c5ce7', strokeWeight: 5, strokeOpacity: 0.85 },
        });
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
    if (!maps || !mapRef.current) return;
    stationMarkers.current.forEach((m) => m.setMap(null));
    stationMarkers.current = items.flatMap((item, i) => {
      if (!item.location) return [];
      const done = completedIndices.includes(i);
      const isTarget = i === currentItemIndex;
      if (!done && !isTarget) return [];
      return [
        new maps.Marker({
          map: mapRef.current as google.maps.Map,
          position: item.location,
          title: item.name,
          label: { text: String(i + 1), color: '#fff', fontWeight: '700' },
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: isTarget ? 16 : 12,
            fillColor: done ? '#00b894' : '#6c5ce7',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3,
          },
          animation: isTarget && arrived ? maps.Animation.BOUNCE : null,
        }),
      ];
    });
  }, [items, currentItemIndex, completedIndices, arrived]);

  useEffect(() => {
    const maps = window.google?.maps;
    if (!maps || !mapRef.current || !fix) return;
    if (!meMarker.current) {
      meMarker.current = new maps.Marker({
        map: mapRef.current,
        title: t.mapYou,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#0984e3',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
        },
        zIndex: 999,
      });
      mapRef.current.panTo(fix);
    }
    meMarker.current.setPosition(fix);
  }, [fix, t.mapYou]);

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
          label: { text: g.groupName.slice(0, 2), color: '#fff', fontSize: '10px', fontWeight: '700' },
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#e17055',
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
    new maps.DirectionsService()
      .route({ origin: fix, destination: target, travelMode: maps.TravelMode.WALKING })
      .then((result) => renderer.current?.setDirections(result))
      .catch(() => {
      });
  }, [started, fix, target, currentItemIndex]);

  useEffect(() => {
    if (!fix || !target) return;
    setArrived((was) => hasArrived(fix, target, proximityMeters, was));
  }, [fix, target, proximityMeters]);

  if (mapsError) {
    return (
      <Wrap>
        <Panel>
          <Warn>{t.mapUnavailable}</Warn>
          <Action type="button" onClick={onArrive}>
            {t.mapOpenAnyway}
          </Action>
        </Panel>
      </Wrap>
    );
  }

  const name = items[currentItemIndex]?.name ?? '';
  return (
    <Wrap>
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

        {!started ? (
          <Action type="button" onClick={() => setStarted(true)} disabled={!fix || !target}>
            {t.mapStart}
          </Action>
        ) : arrived ? (
          <Action type="button" onClick={onArrive}>
            {t.mapOpenStation}
          </Action>
        ) : (
          <Readout>{t.mapKeepWalking}</Readout>
        )}

        {started && !arrived && distance !== null && distance > MANUAL_OVERRIDE_M && (
          <Ghost type="button" onClick={onArrive}>
            {t.mapImHere}
          </Ghost>
        )}
      </Panel>
    </Wrap>
  );
}
