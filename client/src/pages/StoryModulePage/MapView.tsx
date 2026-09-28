import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { styled } from '@mui/material/styles';
import { loadGoogleMaps, isMapsAvailable, onMapsAuthFailure } from '../../utils/googleMaps';
import {
  angleDelta,
  bearingDegrees,
  distanceMeters,
  hasArrived,
  DEFAULT_PROXIMITY_METERS,
  type Fix,
  type LatLng,
} from '../../utils/geo';
import { teamMarkerColor, teamMarkerLabel } from './teamMarker';
import { lookFor, mapOptionsFor, routeLineOptions, type MapDesign } from '../../utils/mapDesign';
import { PIN_LAYERS, attachPulse, attachUprightPin, meMarkerIcon, stationPinStyle, textColorOn, type UprightPin } from '../../utils/mapPins';
import { attachMapLookLayer } from '../../utils/mapLookLayer';
import { maneuverArrow, nextTurn, offRouteMeters, remainingWalk, type WalkRoute } from '../../utils/walkNavigation';
import { useTranslations } from '../../context/LanguageContext';
import { useCompassHeading } from '../../hooks/useCompassHeading';
import { texts } from './MapView.i18n';
import type { MapGroupMarker, ModuleItemData } from './types';

const Wrap = styled('div')({ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden' });
const Canvas = styled('div')({ position: 'absolute', inset: 0 });
const ROTATING_CANVAS_SIZE = '150vmax';
const ROTATION_EASE = 'transform 0.3s ease-out';

const Gestures = styled('div')({ position: 'absolute', inset: 0, zIndex: 2, touchAction: 'none' });
const DRAG_START_PX = 4;
const PINCH_STEP_RATIO = 1.35;
const TWIST_START_DEG = 10;

interface GesturePoint {
  x: number;
  y: number;
}

function screenToMapDelta(dx: number, dy: number, spinDegrees: number): GesturePoint {
  const a = (spinDegrees * Math.PI) / 180;
  return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

const Sheet = styled('div')({
  position: 'absolute',
  left: 10,
  right: 10,
  bottom: 10,
  background: '#fff',
  borderRadius: 20,
  padding: '16px 16px 14px',
  boxShadow: '0 6px 28px rgba(0,0,0,0.22)',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  zIndex: 3,
});

const StationName = styled('div')({ fontWeight: 800, fontSize: 17, color: '#1a1a2e' });
const Summary = styled('div')({ fontSize: 15, fontWeight: 700, color: '#333' });
const Readout = styled('div')({ fontSize: 13, color: '#666' });
const Warn = styled('div')({ fontSize: 13, color: '#d63031', fontWeight: 600 });
const Arrived = styled('div')({ fontSize: 20, fontWeight: 800, color: '#00a884' });

const Action = styled('button')({
  border: 'none',
  borderRadius: 12,
  padding: '14px 16px',
  fontSize: 16,
  fontWeight: 800,
  fontFamily: 'inherit',
  color: '#fff',
  background: '#6c5ce7',
  cursor: 'pointer',
  '&:disabled': { background: '#b9b4e0', cursor: 'default' },
});

const Ghost = styled('button')({
  border: '1px solid #d0d0d0',
  background: 'none',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'inherit',
  color: '#555',
  cursor: 'pointer',
});

const Banner = styled('div')({
  position: 'absolute',
  top: 10,
  left: 10,
  right: 10,
  zIndex: 3,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 18,
  background: '#1e2a38',
  color: '#fff',
  boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
});

const TurnArrow = styled('div', { shouldForwardProp: (prop) => !String(prop).startsWith('$') })<{ $color: string }>(({ $color }) => ({
  width: 48,
  height: 48,
  borderRadius: 14,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 30,
  fontWeight: 800,
  background: $color,
  color: textColorOn($color),
  direction: 'ltr',
}));

const TurnText = styled('div')({ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 });
const TurnDistance = styled('div')({ fontSize: 22, fontWeight: 800, lineHeight: 1.1 });
const TurnInstruction = styled('div')({
  fontSize: 14,
  opacity: 0.9,
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
});

const Recenter = styled('button')({
  position: 'absolute',
  insetInlineEnd: 14,
  bottom: 200,
  zIndex: 3,
  border: 'none',
  borderRadius: 999,
  padding: '10px 16px',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'inherit',
  background: '#fff',
  color: '#6c5ce7',
  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  cursor: 'pointer',
});

const OVERRIDE_NEAR_EXTRA_M = 50;
const OVERRIDE_AFTER_MS = 30_000;
const OFF_ROUTE_M = 35;
const REROUTE_MIN_GAP_MS = 15_000;
const OVERVIEW_REROUTE_MOVED_M = 150;
const HEADING_MIN_STEP_M = 4;
const NAVIGATION_ZOOM = 18;
const OVERVIEW_PADDING = { top: 40, bottom: 220, left: 30, right: 30 };

function plainInstruction(html: string): string {
  const spaced = html.replace(/<div/gi, ' <div');
  return (new DOMParser().parseFromString(spaced, 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function toWalkRoute(result: google.maps.DirectionsResult): WalkRoute | null {
  const leg = result.routes[0]?.legs[0];
  if (!leg) return null;
  return {
    distanceM: leg.distance?.value ?? 0,
    durationS: leg.duration?.value ?? 0,
    steps: leg.steps.map((step) => ({
      instruction: plainInstruction(step.instructions),
      maneuver: step.maneuver || undefined,
      distanceM: step.distance?.value ?? 0,
      durationS: step.duration?.value ?? 0,
      end: step.end_location.toJSON(),
      path: step.path.map((point) => point.toJSON()),
    })),
  };
}

interface LoadedRoute {
  forIndex: number;
  walk: WalkRoute;
  result: google.maps.DirectionsResult;
  from: LatLng;
}

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
}: Props) {
  const t = useTranslations(texts);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const meMarker = useRef<google.maps.Marker | null>(null);
  const stationPins = useRef<UprightPin[]>([]);
  const groupPins = useRef<Map<string, UprightPin>>(new Map());
  const spinRef = useRef(0);
  const renderer = useRef<google.maps.DirectionsRenderer | null>(null);
  const routeRef = useRef<LoadedRoute | null>(null);
  const routeRequestedAt = useRef(0);
  const routePending = useRef(false);
  const lastFix = useRef<Fix | null>(null);
  const framedIndex = useRef<number | null>(null);
  const look = lookFor(design);
  const designRef = useRef(design);
  designRef.current = design;

  const [mapsError, setMapsError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [navigatingFor, setNavigatingFor] = useState<number | null>(null);
  const [following, setFollowing] = useState(true);
  const [compassSteering, setCompassSteering] = useState(true);
  const [route, setRoute] = useState<LoadedRoute | null>(null);
  const [routeFailedFor, setRouteFailedFor] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [arrivedAt, setArrivedAt] = useState<number | null>(null);
  const [overrideDueAt, setOverrideDueAt] = useState<number | null>(null);

  const target = items[currentItemIndex]?.location;
  const distance = fix && target ? distanceMeters(fix, target) : null;
  const navigating = navigatingFor === currentItemIndex;
  const arrived = arrivedAt === currentItemIndex;
  const currentRoute = route?.forIndex === currentItemIndex ? route : null;
  const compass = useCompassHeading(navigating);
  const facing = navigating ? (compass.heading ?? heading) : null;
  const headingUp = navigating && compassSteering && facing !== null;
  const [mapSpin, setMapSpin] = useState(0);
  const offerOverride = (navigating || mapsError) && !arrived && overrideDueAt === currentItemIndex
    && distance !== null && distance <= proximityMeters + OVERRIDE_NEAR_EXTRA_M;

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
        mapRef.current.addListener('dragstart', () => setFollowing(false));
        renderer.current = new maps.DirectionsRenderer({
          map: mapRef.current,
          suppressMarkers: true,
          preserveViewport: true,
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
    const shown = renderer.current?.getDirections();
    renderer.current?.setOptions({ polylineOptions: routeLineOptions(lookFor(design)) });
    if (shown) renderer.current?.setDirections(shown);
  }, [design]);

  useEffect(() => {
    const maps = window.google?.maps;
    const map = mapRef.current;
    if (!maps || !map || !mapReady) return;
    const pins = items.flatMap((item, i) => {
      if (!item.location) return [];
      const isNext = i === currentItemIndex;
      if (!isNext && !completedIndices.includes(i)) return [];
      const pin = attachUprightPin(maps, map, {
        position: item.location,
        style: stationPinStyle(look, isNext),
        text: String(i + 1),
        imageUrl: item.mapIcon,
        title: item.name,
        rotation: spinRef.current,
      });
      if (isNext && arrived) pin.setBouncing(true);
      return [pin];
    });
    stationPins.current = pins;
    return () => pins.forEach((pin) => pin.remove());
  }, [items, currentItemIndex, completedIndices, arrived, look, mapReady]);

  useEffect(() => {
    const maps = window.google?.maps;
    const where = items[currentItemIndex]?.location;
    if (!maps || !mapRef.current || !mapReady || !where) return;
    return attachPulse(maps, mapRef.current, where, look.pins.next);
  }, [items, currentItemIndex, mapReady, look]);

  useEffect(() => {
    if (!fix) return;
    if (fix.heading !== null && fix.heading !== undefined && Number.isFinite(fix.heading)) {
      setHeading(fix.heading);
    } else if (lastFix.current && distanceMeters(lastFix.current, fix) >= HEADING_MIN_STEP_M) {
      setHeading(bearingDegrees(lastFix.current, fix));
    }
    if (!lastFix.current || distanceMeters(lastFix.current, fix) >= HEADING_MIN_STEP_M) lastFix.current = fix;
  }, [fix]);

  useEffect(() => {
    const maps = window.google?.maps;
    if (!maps || !mapRef.current || !mapReady || !fix) return;
    const meIcon = meMarkerIcon(maps, look, facing);
    if (!meMarker.current) {
      meMarker.current = new maps.Marker({
        map: mapRef.current,
        title: t.you,
        icon: meIcon,
        zIndex: PIN_LAYERS.me,
      });
    }
    meMarker.current.setIcon(meIcon);
    meMarker.current.setPosition(fix);
  }, [fix, t.you, look, facing, mapReady]);

  useEffect(() => {
    const maps = window.google?.maps;
    const map = mapRef.current;
    if (!maps || !map || !mapReady) return;
    const seen = new Set<string>();
    for (const g of others) {
      if (!g.position) continue;
      seen.add(g.groupName);
      const existing = groupPins.current.get(g.groupName);
      if (existing) {
        existing.setPosition(g.position);
        continue;
      }
      groupPins.current.set(
        g.groupName,
        attachUprightPin(maps, map, {
          position: g.position,
          style: { color: teamMarkerColor(g.groupName), diameterPx: 18, fontPx: 10, imagePx: 0, zIndex: PIN_LAYERS.done - 1 },
          text: teamMarkerLabel(g.groupName),
          title: `${g.groupName} · ${g.score}`,
          rotation: spinRef.current,
        }),
      );
    }
    for (const [name, pin] of groupPins.current) {
      if (!seen.has(name)) {
        pin.remove();
        groupPins.current.delete(name);
      }
    }
  }, [others, mapReady]);

  useEffect(() => {
    spinRef.current = mapSpin;
    stationPins.current.forEach((pin) => pin.setRotation(mapSpin));
    groupPins.current.forEach((pin) => pin.setRotation(mapSpin));
  }, [mapSpin]);

  useEffect(() => {
    renderer.current?.set('directions', null);
    routeRef.current = null;
    setRoute(null);
    setRouteFailedFor(null);
    setFollowing(true);
  }, [currentItemIndex]);

  useEffect(() => {
    const maps = window.google?.maps;
    if (!maps || !mapReady || !fix || !target || routePending.current) return;
    const loaded = routeRef.current?.forIndex === currentItemIndex ? routeRef.current : null;
    const now = Date.now();
    const stale = !loaded
      || (navigating && offRouteMeters(loaded.walk, fix) > OFF_ROUTE_M && now - routeRequestedAt.current > REROUTE_MIN_GAP_MS)
      || (!navigating && distanceMeters(loaded.from, fix) > OVERVIEW_REROUTE_MOVED_M);
    if (!stale || (!loaded && routeFailedFor === currentItemIndex)) return;
    routePending.current = true;
    routeRequestedAt.current = now;
    const forIndex = currentItemIndex;
    const from = { lat: fix.lat, lng: fix.lng };
    new maps.DirectionsService()
      .route({ origin: from, destination: target, travelMode: maps.TravelMode.WALKING })
      .then((result) => {
        const walk = toWalkRoute(result);
        if (!walk) throw new Error('no_route');
        const next = { forIndex, walk, result, from };
        routeRef.current = next;
        setRoute(next);
        renderer.current?.setDirections(result);
      })
      .catch(() => setRouteFailedFor(forIndex))
      .finally(() => {
        routePending.current = false;
      });
  }, [mapReady, fix, target, currentItemIndex, navigating, routeFailedFor]);

  useEffect(() => {
    const maps = window.google?.maps;
    const map = mapRef.current;
    if (!maps || !map || !mapReady || navigating || framedIndex.current === currentItemIndex) return;
    if (currentRoute) {
      const bounds = new maps.LatLngBounds(currentRoute.result.routes[0].bounds.getSouthWest(), currentRoute.result.routes[0].bounds.getNorthEast());
      if (fix) bounds.extend(fix);
      if (target) bounds.extend(target);
      map.fitBounds(bounds, OVERVIEW_PADDING);
      framedIndex.current = currentItemIndex;
    } else if (target && !fix) {
      map.setCenter(target);
      map.setZoom(16);
    } else if (target && fix && routeFailedFor === currentItemIndex) {
      const bounds = new maps.LatLngBounds();
      bounds.extend(target);
      bounds.extend(fix);
      map.fitBounds(bounds, OVERVIEW_PADDING);
      framedIndex.current = currentItemIndex;
    }
  }, [mapReady, navigating, currentRoute, target, fix, currentItemIndex, routeFailedFor]);

  useEffect(() => {
    if (!navigating || !following || !fix) return;
    mapRef.current?.panTo(fix);
  }, [navigating, following, fix]);

  useEffect(() => {
    if (headingUp && facing !== null) {
      setMapSpin((prev) => prev + angleDelta(normalizeDegrees(prev), facing));
      return;
    }
    if (navigating) return;
    setMapSpin((prev) => prev - (normalizeDegrees(prev) > 180 ? normalizeDegrees(prev) - 360 : normalizeDegrees(prev)));
  }, [headingUp, facing, navigating]);

  useEffect(() => {
    if (!navigating || !fix) return;
    mapRef.current?.setCenter(fix);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigating]);

  useEffect(() => {
    if (!fix || !target) return;
    setArrivedAt((was) => (hasArrived(fix, target, proximityMeters, was === currentItemIndex) ? currentItemIndex : null));
  }, [fix, target, proximityMeters, currentItemIndex]);

  useEffect(() => {
    if (!navigating && !mapsError) return;
    const timer = setTimeout(() => setOverrideDueAt(currentItemIndex), OVERRIDE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [navigating, mapsError, currentItemIndex]);

  const startWalking = () => {
    setCompassSteering(true);
    compass.request();
    setNavigatingFor(currentItemIndex);
    setFollowing(true);
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(NAVIGATION_ZOOM);
    if (fix) map.panTo(fix);
  };

  const stopWalking = () => {
    setNavigatingFor(null);
    framedIndex.current = null;
  };

  const pointers = useRef(new Map<number, GesturePoint>());
  const dragged = useRef(false);
  const pinchFrom = useRef<number | null>(null);

  const twistFrom = useRef<number | null>(null);
  const twisting = useRef(false);

  const pairAngle = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI : null;
  };

  const pinchDistance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null;
  };

  const zoomBy = (step: number) => {
    const map = mapRef.current;
    if (!map) return;
    setFollowing(false);
    map.setZoom((map.getZoom() ?? NAVIGATION_ZOOM) + step);
  };

  const onGestureDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragged.current = false;
    pinchFrom.current = pinchDistance();
    twistFrom.current = pairAngle();
    twisting.current = false;
  };

  const onGestureMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    const now = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, now);
    if (pointers.current.size >= 2) {
      const angle = pairAngle();
      if (angle !== null && twistFrom.current !== null) {
        const twist = angleDelta(twistFrom.current, angle);
        if (twisting.current || Math.abs(twist) >= TWIST_START_DEG) {
          if (!twisting.current) {
            twisting.current = true;
            setCompassSteering(false);
            setFollowing(false);
          } else {
            setMapSpin((prev) => prev - twist);
          }
          twistFrom.current = angle;
        }
      }
      const distance = pinchDistance();
      if (!distance || !pinchFrom.current) return;
      const ratio = distance / pinchFrom.current;
      if (ratio > PINCH_STEP_RATIO || ratio < 1 / PINCH_STEP_RATIO) {
        zoomBy(ratio > 1 ? 1 : -1);
        pinchFrom.current = distance;
      }
      return;
    }
    const dx = now.x - previous.x;
    const dy = now.y - previous.y;
    if (!dragged.current && Math.hypot(dx, dy) < DRAG_START_PX) return;
    if (!dragged.current) {
      dragged.current = true;
      setFollowing(false);
    }
    const moved = screenToMapDelta(dx, dy, mapSpin);
    mapRef.current?.panBy(-moved.x, -moved.y);
  };

  const onGestureUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    pinchFrom.current = pinchDistance();
    twistFrom.current = pairAngle();
    twisting.current = false;
  };

  const onGestureWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaY) < 1) return;
    zoomBy(e.deltaY < 0 ? 1 : -1);
  };

  const recenter = () => {
    setFollowing(true);
    setCompassSteering(true);
    mapRef.current?.setZoom(NAVIGATION_ZOOM);
    if (fix) mapRef.current?.panTo(fix);
  };

  const name = items[currentItemIndex]?.name ?? '';
  const turn = navigating && currentRoute && fix && !arrived ? nextTurn(currentRoute.walk, fix) : null;
  const left = navigating && currentRoute && fix ? remainingWalk(currentRoute.walk, fix) : null;

  const status = (
    <>
      {geoError && <Warn>{geoError === 'denied' ? t.geoDenied : t.geoUnavailable}</Warn>}
      {!geoError && !fix && target && <Readout>{t.locating}</Readout>}
      {!target && <Warn>{t.noStationLocation}</Warn>}
    </>
  );

  const sheetBody = (() => {
    if (!target) {
      return <Action type="button" onClick={onArrive}>{t.openStation}</Action>;
    }
    if (arrived) {
      return (
        <>
          <Arrived>{t.arrivedTitle}</Arrived>
          <Action type="button" onClick={onArrive}>{t.openStation}</Action>
        </>
      );
    }
    if (navigating || mapsError) {
      return (
        <>
          {left
            ? <Summary>{t.walkSummary(left.distanceM, left.durationS)}</Summary>
            : distance !== null && <Summary>{t.fromHere(distance)}</Summary>}
          {offerOverride && <Ghost type="button" onClick={onArrive}>{t.imHere}</Ghost>}
          {navigating && <Ghost type="button" onClick={stopWalking}>{t.stop}</Ghost>}
        </>
      );
    }
    return (
      <>
        {currentRoute
          ? <Summary>{t.walkSummary(currentRoute.walk.distanceM, currentRoute.walk.durationS)}</Summary>
          : fix && routeFailedFor !== currentItemIndex
            ? <Readout>{t.routing}</Readout>
            : distance !== null && <Summary>{t.fromHere(distance)}</Summary>}
        {routeFailedFor === currentItemIndex && <Readout>{t.noRoute}</Readout>}
        <Action type="button" disabled={!fix} onClick={startWalking}>{t.start}</Action>
      </>
    );
  })();

  return (
    <Wrap>
      {!mapsError && (
        <Canvas
          ref={canvasRef}
          style={navigating ? {
            inset: 'auto',
            left: '50%',
            top: '50%',
            width: ROTATING_CANVAS_SIZE,
            height: ROTATING_CANVAS_SIZE,
            transform: `translate(-50%, -50%) rotate(${-mapSpin}deg)`,
            transition: ROTATION_EASE,
          } : undefined}
        />
      )}

      {turn && (
        <Banner>
          <TurnArrow $color={look.pins.next}>{turn.arriving ? '◎' : maneuverArrow(turn.maneuver)}</TurnArrow>
          <TurnText>
            <TurnDistance>{t.inDistance(turn.inM)}</TurnDistance>
            <TurnInstruction>{turn.arriving ? t.arriveHere : turn.instruction}</TurnInstruction>
          </TurnText>
        </Banner>
      )}

      {navigating && !mapsError && (
        <Gestures
          onPointerDown={onGestureDown}
          onPointerMove={onGestureMove}
          onPointerUp={onGestureUp}
          onPointerCancel={onGestureUp}
          onWheel={onGestureWheel}
        />
      )}

      {navigating && (!following || !compassSteering) && !arrived && (
        <Recenter type="button" onClick={recenter}>{t.recenter}</Recenter>
      )}

      <Sheet>
        <StationName>{`${currentItemIndex + 1}. ${name}`}</StationName>
        {mapsError && <Warn>{t.mapUnavailable}</Warn>}
        {mapsError && target?.address && <Readout>{target.address}</Readout>}
        {status}
        {sheetBody}
      </Sheet>
    </Wrap>
  );
}
