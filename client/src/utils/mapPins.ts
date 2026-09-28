import type { MapLook } from './mapDesign';

export const PIN_LAYERS = { done: 10, next: 30, me: 999 } as const;

const PULSE_SIZE_PX = 44;
const PULSE_PERIOD_MS = 3600;
const PULSE_WAVES = 2;
const PULSE_MAX_SCALE = 1.9;

export function textColorOn(hex: string): string {
  const value = parseInt(hex.replace('#', ''), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 165 ? '#1a1a1a' : '#ffffff';
}

export interface StationMark {
  number: number;
  icon?: string;
}

interface StationSize {
  scale: number;
  font: string;
  imagePx: number;
  zIndex: number;
}

const NEXT_SIZE: StationSize = { scale: 15, font: '15px', imagePx: 20, zIndex: PIN_LAYERS.next };
const DONE_SIZE: StationSize = { scale: 11, font: '12px', imagePx: 14, zIndex: PIN_LAYERS.done };

function stationMarkers(
  maps: typeof google.maps,
  color: string,
  mark: StationMark,
  size: StationSize,
): google.maps.MarkerOptions[] {
  const circle: google.maps.MarkerOptions = {
    zIndex: size.zIndex,
    icon: {
      path: maps.SymbolPath.CIRCLE,
      scale: size.scale,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
    },
  };
  if (!mark.icon) {
    return [{
      ...circle,
      label: { text: String(mark.number), color: textColorOn(color), fontWeight: '800', fontSize: size.font },
    }];
  }
  return [circle, {
    zIndex: size.zIndex + 1,
    clickable: false,
    icon: {
      url: mark.icon,
      scaledSize: new maps.Size(size.imagePx, size.imagePx),
      anchor: new maps.Point(size.imagePx / 2, size.imagePx / 2),
    },
  }];
}

export function nextStationMarkers(maps: typeof google.maps, look: MapLook, mark: StationMark): google.maps.MarkerOptions[] {
  return stationMarkers(maps, look.pins.next, mark, NEXT_SIZE);
}

export function doneStationMarkers(maps: typeof google.maps, look: MapLook, mark: StationMark): google.maps.MarkerOptions[] {
  return stationMarkers(maps, look.pins.done, mark, DONE_SIZE);
}

export function meMarkerIcon(maps: typeof google.maps, look: MapLook, heading?: number | null): google.maps.Symbol {
  if (heading !== null && heading !== undefined && Number.isFinite(heading)) {
    return {
      path: maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: 6,
      rotation: heading,
      fillColor: look.pins.me,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    };
  }
  return {
    path: maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: look.pins.me,
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 3,
  };
}

function withAlpha(hex: string, alpha: number): string {
  const value = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

export function attachPulse(
  maps: typeof google.maps,
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  color: string,
): () => void {
  const holder = document.createElement('div');
  holder.setAttribute('aria-hidden', 'true');
  Object.assign(holder.style, { position: 'absolute', width: '0', height: '0', pointerEvents: 'none', zIndex: '0' });
  const wave = `radial-gradient(circle, ${withAlpha(color, 0)} 42%, ${withAlpha(color, 0.75)} 56%, ${withAlpha(color, 0.3)} 63%, ${withAlpha(color, 0)} 70%)`;
  const rings = Array.from({ length: PULSE_WAVES }, () => {
    const ring = document.createElement('div');
    Object.assign(ring.style, {
      position: 'absolute',
      left: `${-PULSE_SIZE_PX / 2}px`,
      top: `${-PULSE_SIZE_PX / 2}px`,
      width: `${PULSE_SIZE_PX}px`,
      height: `${PULSE_SIZE_PX}px`,
      borderRadius: '50%',
      backgroundImage: wave,
      opacity: '0',
    });
    holder.appendChild(ring);
    return ring;
  });

  const stillMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let animations: Animation[] = [];
  const overlay = new maps.OverlayView();
  overlay.onAdd = () => {
    overlay.getPanes()?.overlayLayer.appendChild(holder);
    if (stillMotion) {
      Object.assign(rings[0].style, { transform: 'scale(1.6)', opacity: '0.8' });
      return;
    }
    animations = rings.map((ring, i) => ring.animate(
      [
        { transform: 'scale(0.5)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1, offset: 0.2 },
        { transform: `scale(${PULSE_MAX_SCALE})`, opacity: 0 },
      ],
      {
        duration: PULSE_PERIOD_MS,
        delay: (PULSE_PERIOD_MS / PULSE_WAVES) * i,
        iterations: Infinity,
        easing: 'ease-out',
      },
    ));
  };
  overlay.draw = () => {
    const point = overlay.getProjection()?.fromLatLngToDivPixel(new maps.LatLng(position));
    if (!point) return;
    holder.style.left = `${point.x}px`;
    holder.style.top = `${point.y}px`;
  };
  overlay.onRemove = () => {
    animations.forEach((animation) => animation.cancel());
    holder.remove();
  };
  overlay.setMap(map);
  return () => overlay.setMap(null);
}

export interface UprightPinStyle {
  color: string;
  diameterPx: number;
  fontPx: number;
  imagePx: number;
  zIndex: number;
}

export function stationPinStyle(look: MapLook, next: boolean): UprightPinStyle {
  const size = next ? NEXT_SIZE : DONE_SIZE;
  return {
    color: next ? look.pins.next : look.pins.done,
    diameterPx: size.scale * 2,
    fontPx: parseInt(size.font, 10),
    imagePx: size.imagePx,
    zIndex: size.zIndex,
  };
}

export interface UprightPin {
  setRotation: (degrees: number) => void;
  setPosition: (position: google.maps.LatLngLiteral) => void;
  setBouncing: (bouncing: boolean) => void;
  remove: () => void;
}

const UPRIGHT_EASE = 'transform 0.3s ease-out';
const BOUNCE_MS = 700;

export function attachUprightPin(
  maps: typeof google.maps,
  map: google.maps.Map,
  options: { position: google.maps.LatLngLiteral; style: UprightPinStyle; text?: string; imageUrl?: string; title?: string; rotation: number },
): UprightPin {
  const { style } = options;
  let position = options.position;
  const anchor = document.createElement('div');
  Object.assign(anchor.style, { position: 'absolute', width: '0', height: '0', zIndex: String(style.zIndex) });
  const spinner = document.createElement('div');
  Object.assign(spinner.style, {
    position: 'absolute',
    left: `${-style.diameterPx / 2}px`,
    top: `${-style.diameterPx / 2}px`,
    width: `${style.diameterPx}px`,
    height: `${style.diameterPx}px`,
    transition: UPRIGHT_EASE,
    transform: `rotate(${options.rotation}deg)`,
  });
  const face = document.createElement('div');
  if (options.title) face.title = options.title;
  Object.assign(face.style, {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    borderRadius: '50%',
    border: '3px solid #ffffff',
    background: style.color,
    color: textColorOn(style.color),
    boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Roboto, Arial, sans-serif',
    fontWeight: '800',
    fontSize: `${style.fontPx}px`,
    lineHeight: '1',
  });
  if (options.imageUrl) {
    const image = document.createElement('img');
    image.src = options.imageUrl;
    image.alt = '';
    Object.assign(image.style, { width: `${style.imagePx}px`, height: `${style.imagePx}px`, objectFit: 'contain' });
    face.appendChild(image);
  } else {
    face.textContent = options.text ?? '';
  }
  spinner.appendChild(face);
  anchor.appendChild(spinner);

  let bounce: Animation | null = null;
  const overlay = new maps.OverlayView();
  overlay.onAdd = () => overlay.getPanes()?.overlayLayer.appendChild(anchor);
  overlay.draw = () => {
    const point = overlay.getProjection()?.fromLatLngToDivPixel(new maps.LatLng(position));
    if (!point) return;
    anchor.style.left = `${point.x}px`;
    anchor.style.top = `${point.y}px`;
  };
  overlay.onRemove = () => {
    bounce?.cancel();
    anchor.remove();
  };
  overlay.setMap(map);

  return {
    setRotation: (degrees) => {
      spinner.style.transform = `rotate(${degrees}deg)`;
    },
    setPosition: (next) => {
      position = next;
      overlay.draw();
    },
    setBouncing: (bouncing) => {
      if (!bouncing) {
        bounce?.cancel();
        bounce = null;
        return;
      }
      if (bounce) return;
      bounce = face.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-12px)' }, { transform: 'translateY(0)' }],
        { duration: BOUNCE_MS, iterations: Infinity, easing: 'ease-in-out' },
      );
    },
    remove: () => overlay.setMap(null),
  };
}
