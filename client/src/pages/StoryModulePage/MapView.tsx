import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { DarkHeaderActionIconButton } from '../../components/styled';
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
import ActivitySessionHeader, { SessionHeaderTrophyIcon } from './ActivitySessionHeader';
import { getHeaderIconColor, getThemeKit } from './roadmapThemes';
import { teamMarkerColor, teamMarkerLabel } from './teamMarker';
import { lookFor, mapOptionsFor, routeLineOptions, type MapDesign } from '../../utils/mapDesign';
import { PIN_LAYERS, attachPulse, attachUprightPin, meHaloIcon, meMarkerIcon, stationPinStyle, type UprightPin } from '../../utils/mapPins';
import { attachMapLookLayer } from '../../utils/mapLookLayer';
import { maneuverDirection, nextTurn, offRouteMeters, remainingWalk, type WalkRoute } from '../../utils/walkNavigation';
import { useTranslations } from '../../context/LanguageContext';
import { laterAtSamePlace, opensRightAfter, placeGroupEnd, placeOf } from '../../utils/mapChain';
import { useCompassHeading } from '../../hooks/useCompassHeading';
import { texts } from './MapView.i18n';
import { CheckMark, CompassNeedle, DirectionArrow, LocateArrow } from './MapView.icons';
import CipherStrip from './CipherStrip';
import { cipherSlots } from '../../utils/cipher';
import type { CustomThemeData, MapGroupMarker, ModuleItemData } from './types';

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

const GOOGLE_BLUE = '#1a73e8';
const NAV_GREEN = '#0b5f55';
const NAV_GREEN_DARK = '#084a42';
const EXIT_RED = '#d93025';

const Sheet = styled('div')({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  background: '#fff',
  borderRadius: '24px 24px 0 0',
  padding: '18px 20px calc(18px + env(safe-area-inset-bottom))',
  boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  zIndex: 3,
});


const SheetRow = styled('div')({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 });
const SheetText = styled('div')({ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 });
const BigTime = styled('div')({ fontSize: 30, fontWeight: 800, color: '#202124', lineHeight: 1.1 });
const EtaLine = styled('div')({ fontSize: 16, color: '#5f6368' });
const Readout = styled('div')({ fontSize: 14, color: '#5f6368' });
const Warn = styled('div')({ fontSize: 14, color: EXIT_RED, fontWeight: 600 });
const fadeUp = keyframes`
  from { transform: translateY(24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const ArrivalCard = styled('div')({ display: 'flex', flexDirection: 'column', gap: 16 });

const ArrivalCenter = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  textAlign: 'center',
});

const Rise = styled('div', { shouldForwardProp: (prop) => !String(prop).startsWith('$') })<{ $delay: number }>(({ $delay }) => ({
  animation: `${fadeUp} 0.45s ease-out both`,
  animationDelay: `${$delay}s`,
  maxWidth: '100%',
}));

const ArrivedChip = styled('div')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 12px',
  borderRadius: 999,
  background: '#e6f4ea',
  color: '#188038',
  fontSize: 15,
  fontWeight: 800,
});

const StationMeta = styled('div')({ fontSize: 16, fontWeight: 600, color: '#5f6368' });

const Pill = styled('button', { shouldForwardProp: (prop) => !String(prop).startsWith('$') })<{ $color: string }>(({ $color }) => ({
  flexShrink: 0,
  border: 'none',
  borderRadius: 999,
  padding: '14px 26px',
  fontSize: 17,
  fontWeight: 700,
  fontFamily: 'inherit',
  color: '#fff',
  background: $color,
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
  '&:disabled': { opacity: 0.45, cursor: 'default', boxShadow: 'none' },
}));

const StationName = styled('div')({
  fontSize: 32,
  fontWeight: 800,
  color: GOOGLE_BLUE,
  lineHeight: 1.15,
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
});

const WidePill = styled(Pill)({ width: '100%' });
const BigStart = styled(WidePill)({ padding: '18px 26px', fontSize: 20, fontWeight: 800, marginTop: 6 });

const Ghost = styled('button')({
  border: '1px solid #dadce0',
  background: '#fff',
  borderRadius: 999,
  padding: '10px 16px',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'inherit',
  color: GOOGLE_BLUE,
  cursor: 'pointer',
});

const TopChrome = styled('div')({ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4 });

const FADE_EXTRA_PX = 70;
const FADE_LAYERS = [
  { blurPx: 2, mask: 'linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%)' },
  { blurPx: 6, mask: 'linear-gradient(to bottom, #000 0%, #000 35%, transparent 75%)' },
  { blurPx: 12, mask: 'linear-gradient(to bottom, #000 0%, #000 20%, transparent 55%)' },
];

const BLUR_BLEED_PX = 48;

const TopFadeLayer = styled('div')({
  position: 'absolute',
  top: -BLUR_BLEED_PX,
  left: -BLUR_BLEED_PX,
  right: -BLUR_BLEED_PX,
  bottom: -FADE_EXTRA_PX,
  pointerEvents: 'none',
});

const TopTint = styled(TopFadeLayer)({
  background: 'linear-gradient(to bottom, rgba(18, 22, 32, 0.28) 0%, rgba(18, 22, 32, 0.12) 50%, rgba(18, 22, 32, 0) 100%)',
});

const TopContent = styled('div')({
  position: 'relative',
  '& > *': { borderBottom: 'none !important', backdropFilter: 'none !important', WebkitBackdropFilter: 'none !important' },
});

const BannerStack = styled('div')({
  position: 'absolute',
  left: 10,
  right: 10,
  zIndex: 5,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
});

const Banner = styled('div', { shouldForwardProp: (prop) => !String(prop).startsWith('$') })<{ $withTab: boolean }>(({ $withTab }) => ({
  alignSelf: 'stretch',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '18px 20px',
  borderRadius: 22,
  borderEndStartRadius: $withTab ? 0 : 22,
  background: NAV_GREEN,
  color: '#fff',
  boxShadow: '0 6px 20px rgba(0,0,0,0.28)',
  position: 'relative',
  zIndex: 1,
}));

const TurnArrow = styled('div')({ flexShrink: 0, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' });
const TurnText = styled('div')({ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 });
const TurnDistance = styled('div')({ fontSize: 16, fontWeight: 600, opacity: 0.85 });
const TurnInstruction = styled('div')({
  fontSize: 24,
  fontWeight: 700,
  lineHeight: 1.2,
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
});

const ThenTab = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginTop: -14,
  padding: '22px 18px 10px',
  borderRadius: '0 0 18px 18px',
  background: NAV_GREEN_DARK,
  color: '#fff',
  fontSize: 18,
  fontWeight: 700,
  boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
});

const ThenArrow = styled('span')({ display: 'inline-flex', alignItems: 'center' });

const MapButtons = styled('div')({
  position: 'absolute',
  insetInlineEnd: 14,
  transition: 'bottom 0.2s ease-out',
  zIndex: 3,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
});

const RoundButton = styled('button')({
  width: 56,
  height: 56,
  borderRadius: '50%',
  border: 'none',
  background: '#fff',
  boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
});

const RecenterButton = styled(RoundButton)({
  background: GOOGLE_BLUE,
  boxShadow: '0 3px 12px rgba(26,115,232,0.45)',
});

const OVERRIDE_NEAR_EXTRA_M = 50;
const BUTTONS_ABOVE_SHEET_PX = 16;
const BANNER_BELOW_HEADER_PX = 16;
const OVERRIDE_AFTER_MS = 30_000;
const OFF_ROUTE_M = 35;
const REROUTE_MIN_GAP_MS = 15_000;
const OVERVIEW_REROUTE_MOVED_M = 150;
const HEADING_MIN_STEP_M = 4;
const NAVIGATION_ZOOM = 18;
const PAN_BEFORE_ZOOM_MS = 450;
const ZOOM_STEP_MS = 280;
const OVERVIEW_MARGIN_PX = 30;

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
  openAnywhere?: boolean;
  showStationNames?: boolean;
  cipherEnabled?: boolean;
  cipherSeenKey: string;
  sessionTexts: Record<string, string>;
  currentPoints: number;
  pointsRoll?: { from: number; to: number } | null;
  onPointsRollComplete?: () => void;
  onLogout: () => void;
  onViewLeaderboard: () => void;
  hideLeaderboardInHeader?: boolean;
  leaderboardMode?: 'points' | 'time' | 'both';
  elapsedSeconds?: number;
  activityDurationMinutes?: number;
  roadmapTimerMinutes?: number;
  theme?: string;
  customTheme?: CustomThemeData;
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
  openAnywhere = false,
  showStationNames = false,
  cipherEnabled = false,
  cipherSeenKey,
  sessionTexts,
  currentPoints,
  pointsRoll,
  onPointsRollComplete,
  onLogout,
  onViewLeaderboard,
  hideLeaderboardInHeader,
  leaderboardMode,
  elapsedSeconds,
  activityDurationMinutes,
  roadmapTimerMinutes,
  theme,
  customTheme,
  onArrive,
}: Props) {
  const t = useTranslations(texts);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const topRef = useRef<HTMLDivElement | null>(null);
  const [topHeight, setTopHeight] = useState(0);
  const mapRef = useRef<google.maps.Map | null>(null);
  const meMarker = useRef<google.maps.Marker | null>(null);
  const meHalo = useRef<google.maps.Marker | null>(null);
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

  const target = items[currentItemIndex]?.location ?? placeOf(items, currentItemIndex);
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
  const cipher = cipherEnabled ? cipherSlots(items, completedIndices) : [];

  useEffect(() => onMapsAuthFailure(() => setMapsError(true)), []);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setSheetHeight(sheet.offsetHeight));
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const top = topRef.current;
    if (!top || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setTopHeight(top.offsetHeight));
    observer.observe(top);
    return () => observer.disconnect();
  }, []);

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
      const isNext = i === currentItemIndex;
      if (!isNext && opensRightAfter(items, i)) return [];
      if (!isNext && laterAtSamePlace(items, i, currentItemIndex)) return [];
      const where = item.location ?? (isNext ? placeOf(items, i) : undefined);
      if (!where) return [];
      const groupEnd = isNext ? i : placeGroupEnd(items, i);
      const wholeGroupDone = groupEnd > i && items.slice(i, groupEnd + 1).every((_, k) => completedIndices.includes(i + k));
      if (!isNext && !completedIndices.includes(i)) return [];
      const pin = attachUprightPin(maps, map, {
        position: where,
        style: stationPinStyle(look, isNext, arrived, wholeGroupDone),
        text: wholeGroupDone ? `${i + 1}-${groupEnd + 1}` : String(i + 1),
        imageUrl: item.mapIcon,
        title: item.name,
        rotation: spinRef.current,
        aboveMarkers: isNext && arrived,
        label: wholeGroupDone ? t.stationsHere(groupEnd - i + 1) : showStationNames ? item.name : undefined,
      });
      if (isNext && arrived) pin.setBreathing(true);
      return [pin];
    });
    stationPins.current = pins;
    return () => pins.forEach((pin) => pin.remove());
  }, [items, currentItemIndex, completedIndices, arrived, look, mapReady, showStationNames, t]);

  useEffect(() => {
    const maps = window.google?.maps;
    const where = items[currentItemIndex]?.location ?? placeOf(items, currentItemIndex);
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
        optimized: false,
      });
    }
    meMarker.current.setIcon(meIcon);
    meMarker.current.setPosition(fix);
    if (!meHalo.current) {
      meHalo.current = new maps.Marker({
        map: mapRef.current,
        icon: meHaloIcon(maps),
        zIndex: PIN_LAYERS.me - 1,
        optimized: false,
        clickable: false,
      });
    }
    meHalo.current.setPosition(fix);
    meHalo.current.setVisible(facing !== null);
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
      map.fitBounds(bounds, overviewPadding());
      framedIndex.current = currentItemIndex;
    } else if (target && !fix) {
      map.setCenter(target);
      map.setZoom(16);
    } else if (target && fix && routeFailedFor === currentItemIndex) {
      const bounds = new maps.LatLngBounds();
      bounds.extend(target);
      bounds.extend(fix);
      map.fitBounds(bounds, overviewPadding());
      framedIndex.current = currentItemIndex;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!fix || !target) return;
    setArrivedAt((was) => (hasArrived(fix, target, proximityMeters, was === currentItemIndex) ? currentItemIndex : null));
  }, [fix, target, proximityMeters, currentItemIndex]);

  useEffect(() => {
    if (!navigating && !mapsError) return;
    const timer = setTimeout(() => setOverrideDueAt(currentItemIndex), OVERRIDE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [navigating, mapsError, currentItemIndex]);

  const overviewPadding = (): google.maps.Padding => {
    const wrap = wrapRef.current?.getBoundingClientRect();
    const canvas = canvasRef.current?.getBoundingClientRect();
    const bleedX = wrap && canvas ? Math.max(0, (canvas.width - wrap.width) / 2) : 0;
    const bleedY = wrap && canvas ? Math.max(0, (canvas.height - wrap.height) / 2) : 0;
    return {
      top: bleedY + topHeight + OVERVIEW_MARGIN_PX,
      bottom: bleedY + sheetHeight + OVERVIEW_MARGIN_PX,
      left: bleedX + OVERVIEW_MARGIN_PX,
      right: bleedX + OVERVIEW_MARGIN_PX,
    };
  };

  const flight = useRef<number | null>(null);

  const flyTo = (center: LatLng | null, zoom: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (flight.current !== null) window.clearTimeout(flight.current);
    if (center) map.panTo(center);
    const step = () => {
      const now = map.getZoom() ?? zoom;
      if (now === zoom) {
        flight.current = null;
        return;
      }
      map.setZoom(now + Math.sign(zoom - now));
      flight.current = window.setTimeout(step, ZOOM_STEP_MS);
    };
    flight.current = window.setTimeout(step, center ? PAN_BEFORE_ZOOM_MS : 0);
  };

  useEffect(() => () => {
    if (flight.current !== null) window.clearTimeout(flight.current);
  }, []);

  const startWalking = () => {
    setCompassSteering(true);
    compass.request();
    setNavigatingFor(currentItemIndex);
    setFollowing(true);
    flyTo(fix, NAVIGATION_ZOOM);
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
    flyTo(fix, NAVIGATION_ZOOM);
  };

  const name = items[currentItemIndex]?.name ?? '';
  const turn = navigating && currentRoute && fix && !arrived ? nextTurn(currentRoute.walk, fix) : null;
  const left = navigating && currentRoute && fix ? remainingWalk(currentRoute.walk, fix) : null;

  const northUp = () => {
    setCompassSteering(false);
    setMapSpin((prev) => prev - (normalizeDegrees(prev) > 180 ? normalizeDegrees(prev) - 360 : normalizeDegrees(prev)));
  };

  const status = (
    <>
      {geoError && <Warn>{geoError === 'denied' ? t.geoDenied : t.geoUnavailable}</Warn>}
      {!geoError && !fix && target && <Readout>{t.locating}</Readout>}
      {!target && <Warn>{t.noStationLocation}</Warn>}
    </>
  );

  const toStation = (
    <StationName>
      {name}
    </StationName>
  );

  const sheetBody = (() => {
    if (!target) {
      return <WidePill type="button" $color={GOOGLE_BLUE} onClick={onArrive}>{t.openStation}</WidePill>;
    }
    if (arrived) {
      const item = items[currentItemIndex];
      return (
        <ArrivalCard>
          <ArrivalCenter>
            <Rise $delay={0.2}><ArrivedChip><CheckMark />{t.arrivedTitle}</ArrivedChip></Rise>
            <Rise $delay={0.32}><StationName style={{ textAlign: 'center' }}>{name}</StationName></Rise>
            <Rise $delay={0.44}>
              <StationMeta>{`${t.stationOf(currentItemIndex + 1, items.length)} · ${t.kinds[item?.type ?? 'station']}`}</StationMeta>
            </Rise>
          </ArrivalCenter>
          <Rise $delay={0.56}>
            <BigStart type="button" $color={GOOGLE_BLUE} onClick={onArrive}>{t.startStation}</BigStart>
          </Rise>
        </ArrivalCard>
      );
    }
    if (navigating || mapsError) {
      return (
        <>
          {toStation}
          <SheetRow>
            <SheetText>
              {left ? (
                <>
                  <BigTime>{t.minutes(left.durationS)}</BigTime>
                  <EtaLine>{t.distanceAndArrival(left.distanceM, left.durationS)}</EtaLine>
                </>
              ) : distance !== null && <BigTime>{t.fromHere(distance)}</BigTime>}
            </SheetText>
            {navigating && <Pill type="button" $color={EXIT_RED} onClick={stopWalking}>{t.exit}</Pill>}
          </SheetRow>
          {openAnywhere
            ? <Ghost type="button" onClick={onArrive}>{t.openNow}</Ghost>
            : offerOverride && <Ghost type="button" onClick={onArrive}>{t.imHere}</Ghost>}
        </>
      );
    }
    return (
      <>
        {toStation}
        <SheetRow>
          <SheetText>
            {currentRoute ? (
              <>
                <BigTime>{t.minutes(currentRoute.walk.durationS)}</BigTime>
                <EtaLine>{t.distanceAndArrival(currentRoute.walk.distanceM, currentRoute.walk.durationS)}</EtaLine>
              </>
            ) : fix && routeFailedFor !== currentItemIndex
              ? <Readout>{t.routing}</Readout>
              : distance !== null && <BigTime>{t.fromHere(distance)}</BigTime>}
          </SheetText>
          <Pill type="button" $color={GOOGLE_BLUE} disabled={!fix} onClick={startWalking}>{t.start}</Pill>
        </SheetRow>
        {routeFailedFor === currentItemIndex && <Readout>{t.noRoute}</Readout>}
        {openAnywhere && <Ghost type="button" onClick={onArrive}>{t.openNow}</Ghost>}
      </>
    );
  })();

  const headerIconColor = getHeaderIconColor(theme, customTheme);
  const header = (
    <ActivitySessionHeader
      currentPoints={currentPoints}
      pointsRoll={pointsRoll}
      onPointsRollComplete={onPointsRollComplete}
      onLogout={onLogout}
      t={sessionTexts}
      headerIconColor={headerIconColor}
      leaderboardMode={leaderboardMode}
      elapsedSeconds={elapsedSeconds}
      activityDurationMinutes={activityDurationMinutes}
      roadmapTimerMinutes={roadmapTimerMinutes}
      omitThirdSlot={hideLeaderboardInHeader}
      thirdSlot={!hideLeaderboardInHeader ? (
        <DarkHeaderActionIconButton type="button" onClick={onViewLeaderboard} aria-label={sessionTexts.leaderboardTitle} title={sessionTexts.leaderboardTitle} iconColor={headerIconColor}>
          <SessionHeaderTrophyIcon />
        </DarkHeaderActionIconButton>
      ) : null}
    />
  );

  return (
    <Wrap
      ref={wrapRef}
      style={mapsError ? (customTheme?.roadmapImage
        ? { backgroundImage: `url(${customTheme.roadmapImage})`, backgroundSize: 'cover', backgroundPosition: 'center top' }
        : { background: getThemeKit(theme).containerBg }) : undefined}
    >
      {!mapsError && (
        <Canvas
          ref={canvasRef}
          style={{
            inset: 'auto',
            left: '50%',
            top: '50%',
            width: ROTATING_CANVAS_SIZE,
            height: ROTATING_CANVAS_SIZE,
            transform: `translate(-50%, -50%) rotate(${-mapSpin}deg)`,
            transition: ROTATION_EASE,
          }}
        />
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

      <TopChrome ref={topRef}>
        {FADE_LAYERS.map((layer) => (
          <TopFadeLayer
            key={layer.blurPx}
            aria-hidden
            style={{
              backdropFilter: `blur(${layer.blurPx}px)`,
              WebkitBackdropFilter: `blur(${layer.blurPx}px)`,
              maskImage: layer.mask,
              WebkitMaskImage: layer.mask,
            }}
          />
        ))}
        <TopTint aria-hidden />
        <TopContent>
          {header}
          {cipher.length > 0 && <CipherStrip slots={cipher} seenKey={cipherSeenKey} />}
        </TopContent>
      </TopChrome>

      {turn && (
        <BannerStack style={{ top: `calc(${topHeight + BANNER_BELOW_HEADER_PX}px + ${topHeight ? '0px' : 'env(safe-area-inset-top)'})` }}>
          <Banner $withTab={!!turn.thenManeuver}>
            <TurnArrow><DirectionArrow direction={turn.arriving ? 'up' : maneuverDirection(turn.maneuver)} size={42} /></TurnArrow>
            <TurnText>
              <TurnDistance>{t.inDistance(turn.inM)}</TurnDistance>
              <TurnInstruction>{turn.arriving ? t.arriveHere : turn.instruction}</TurnInstruction>
            </TurnText>
          </Banner>
          {turn.thenManeuver && (
            <ThenTab>
              {t.then}
              <ThenArrow><DirectionArrow direction={maneuverDirection(turn.thenManeuver)} size={22} /></ThenArrow>
            </ThenTab>
          )}
        </BannerStack>
      )}

      {navigating && !mapsError && !arrived && (
        <MapButtons style={{ bottom: sheetHeight + BUTTONS_ABOVE_SHEET_PX }}>
          <RoundButton type="button" aria-label={t.northUp} title={t.northUp} onClick={northUp}>
            <CompassNeedle rotation={-mapSpin} />
          </RoundButton>
          {(!following || !compassSteering) && (
            <RecenterButton type="button" aria-label={t.recenter} title={t.recenter} onClick={recenter}>
              <LocateArrow color="#ffffff" />
            </RecenterButton>
          )}
        </MapButtons>
      )}

      <Sheet ref={sheetRef}>
        {mapsError && <Warn>{t.mapUnavailable}</Warn>}
        {mapsError && target?.address && <Readout>{target.address}</Readout>}
        {status}
        {sheetBody}
      </Sheet>
    </Wrap>
  );
}
