import type { MapOverlayKind } from './mapDesign';

const PAPER_GRAIN = 'url(/images/map/paper-grain.svg)';
const SEPIA_WASH = 'rgba(176, 112, 48, 0.6)';
const GRID_MINOR = 'rgba(255, 255, 255, 0.07)';
const GRID_MAJOR = 'rgba(255, 255, 255, 0.14)';

export interface OverlayLayer {
  background: string;
  size: string;
  blend: 'multiply' | 'normal';
  opacity: number;
}

export const OVERLAY_LAYERS: Record<MapOverlayKind, OverlayLayer> = {
  paper: {
    background: `radial-gradient(ellipse at center, transparent 62%, rgba(110, 72, 34, 0.22) 100%), ${PAPER_GRAIN}`,
    size: 'cover, 480px 480px',
    blend: 'multiply',
    opacity: 0.7,
  },
  dust: {
    background: `radial-gradient(ellipse at center, transparent 50%, rgba(90, 44, 12, 0.4) 100%), linear-gradient(${SEPIA_WASH}, ${SEPIA_WASH}), ${PAPER_GRAIN}`,
    size: 'cover, cover, 480px 480px',
    blend: 'multiply',
    opacity: 0.9,
  },
  grid: {
    background: [
      `linear-gradient(${GRID_MAJOR} 1px, transparent 1px)`,
      `linear-gradient(90deg, ${GRID_MAJOR} 1px, transparent 1px)`,
      `linear-gradient(${GRID_MINOR} 1px, transparent 1px)`,
      `linear-gradient(90deg, ${GRID_MINOR} 1px, transparent 1px)`,
      'radial-gradient(ellipse at center, transparent 60%, rgba(6, 24, 52, 0.35) 100%)',
    ].join(', '),
    size: '120px 120px, 120px 120px, 24px 24px, 24px 24px, cover',
    blend: 'normal',
    opacity: 1,
  },
};

export function attachMapLookLayer(
  maps: typeof google.maps,
  map: google.maps.Map,
  kind: MapOverlayKind | undefined,
): () => void {
  if (!kind) return () => {};
  const layer = OVERLAY_LAYERS[kind];
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    position: 'absolute',
    pointerEvents: 'none',
    backgroundImage: layer.background,
    backgroundSize: layer.size,
    opacity: String(layer.opacity),
  });

  let pane: HTMLElement | null = null;
  const overlay = new maps.OverlayView();
  overlay.onAdd = () => {
    const mapPane = overlay.getPanes()?.mapPane;
    if (!(mapPane instanceof HTMLElement)) return;
    pane = mapPane;
    pane.style.mixBlendMode = layer.blend;
    pane.appendChild(el);
  };
  overlay.draw = () => {
    const projection = overlay.getProjection();
    const corner = projection?.fromContainerPixelToLatLng(new maps.Point(0, 0));
    const origin = corner && projection.fromLatLngToDivPixel(corner);
    if (!origin) return;
    const box = map.getDiv();
    el.style.left = `${origin.x}px`;
    el.style.top = `${origin.y}px`;
    el.style.width = `${box.offsetWidth}px`;
    el.style.height = `${box.offsetHeight}px`;
  };
  overlay.onRemove = () => {
    el.remove();
    if (pane) pane.style.mixBlendMode = '';
  };
  overlay.setMap(map);
  const follow = map.addListener('bounds_changed', () => overlay.draw());
  return () => {
    follow.remove();
    overlay.setMap(null);
  };
}
