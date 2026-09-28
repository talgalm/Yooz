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

function stationCircle(
  maps: typeof google.maps,
  color: string,
  number: number,
  size: { scale: number; font: string; zIndex: number },
): google.maps.MarkerOptions {
  return {
    zIndex: size.zIndex,
    label: { text: String(number), color: textColorOn(color), fontWeight: '800', fontSize: size.font },
    icon: {
      path: maps.SymbolPath.CIRCLE,
      scale: size.scale,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
    },
  };
}

export function nextStationMarker(maps: typeof google.maps, look: MapLook, number: number): google.maps.MarkerOptions {
  return stationCircle(maps, look.pins.next, number, { scale: 15, font: '15px', zIndex: PIN_LAYERS.next });
}

export function doneStationMarker(maps: typeof google.maps, look: MapLook, number: number): google.maps.MarkerOptions {
  return stationCircle(maps, look.pins.done, number, { scale: 11, font: '12px', zIndex: PIN_LAYERS.done });
}

export function meMarkerIcon(maps: typeof google.maps, look: MapLook): google.maps.Symbol {
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
  Object.assign(holder.style, { position: 'absolute', width: '0', height: '0', pointerEvents: 'none' });
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
