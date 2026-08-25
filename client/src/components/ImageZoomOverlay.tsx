import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { styled } from '@mui/material/styles';
import { clampPan, clampScale, distance, MIN_SCALE } from '../utils/zoomPan';

// ponytail: the badge anchors to the media area's corner, not the picture's.
// They coincide whenever the image fills its slot (the usual case); for a narrow
// portrait in a wide slot it sits just outside the edge. Measuring the rendered
// image would fix that — do it only if someone actually complains.
/** Magnifier affordance: "+" over the inline image (tap to enlarge), "−" inside
 *  the fullscreen overlay (tap to shrink back). Shared by the image and riddle
 *  stations so both read the same. */
export const ZoomBadge = styled('button')({
  position: 'absolute',
  top: 8,
  right: 8, // physically top-right — the participant app runs RTL, so logical props would flip it
  width: 34,
  height: 34,
  padding: 0,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(0,0,0,0.45)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  zIndex: 3,
  WebkitTapHighlightColor: 'transparent',
  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
});

export function ZoomGlassIcon({ zoomed }: { zoomed: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="15.5" y1="15.5" x2="21" y2="21" />
      <line x1="7.5" y1="10.5" x2="13.5" y2="10.5" />
      {!zoomed && <line x1="10.5" y1="7.5" x2="10.5" y2="13.5" />}
    </svg>
  );
}

const Backdrop = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.92)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // Above the sticky session header (z 30) and any popup/success overlay.
  // Portaled to <body> so the backdrop covers the top icon row too.
  zIndex: 99999,
  padding: 16,
  overflow: 'hidden',
  touchAction: 'none',
});

const Frame = styled('div')({
  position: 'relative',
  maxWidth: '100%',
  maxHeight: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  touchAction: 'none',
});

const ZoomImg = styled('img')({
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  borderRadius: 8,
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitUserDrag: 'none',
  touchAction: 'none',
} as Record<string, unknown>);

/** Fullscreen image viewer with pinch-to-zoom + drag-to-pan (and wheel /
 *  double-click on desktop). Closes on backdrop tap, the magnifier badge, or Escape. */
export default function ImageZoomOverlay({ src, onClose }: { src: string; onClose: () => void }) {
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  // ponytail: zooms around the frame centre, not the pinch midpoint — panning
  // covers the difference. Track the midpoint here if that ever feels off.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const applyScale = useCallback((scale: number, x: number, y: number) => {
    const next = clampScale(scale);
    const rect = frameRef.current?.getBoundingClientRect();
    const panned = rect
      ? clampPan(x, y, next, rect.width, rect.height)
      : { x: next <= MIN_SCALE ? 0 : x, y: next <= MIN_SCALE ? 0 : y };
    setTransform({ scale: next, ...panned });
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Capture on the frame so a finger that slides off the image keeps feeding
    // this handler. Wrapped: capture throws if the pointer is already gone.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      pinchStart.current = { dist: distance(pts[0], pts[1]), scale: transform.scale };
      panStart.current = null;
    } else if (pts.length === 1) {
      panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];

    if (pts.length >= 2 && pinchStart.current) {
      const dist = distance(pts[0], pts[1]);
      if (pinchStart.current.dist > 0) {
        applyScale(pinchStart.current.scale * (dist / pinchStart.current.dist), transform.x, transform.y);
      }
      return;
    }
    if (pts.length === 1 && panStart.current && transform.scale > MIN_SCALE) {
      applyScale(
        transform.scale,
        panStart.current.tx + (e.clientX - panStart.current.x),
        panStart.current.ty + (e.clientY - panStart.current.y),
      );
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) panStart.current = null;
  };

  return createPortal(
    <Backdrop onClick={onClose} role="dialog" aria-modal="true">
      <ZoomBadge
        type="button"
        aria-label="Close zoom"
        style={{ position: 'fixed', top: 16, right: 16, width: 44, height: 44, background: 'rgba(255,255,255,0.18)' }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        <ZoomGlassIcon zoomed />
      </ZoomBadge>
      <Frame
        ref={frameRef}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onDoubleClick={(e) => {
          e.stopPropagation();
          applyScale(transform.scale > MIN_SCALE ? MIN_SCALE : 2.5, 0, 0);
        }}
        onWheel={(e) => applyScale(transform.scale * (e.deltaY < 0 ? 1.15 : 0.87), transform.x, transform.y)}
      >
        <ZoomImg
          src={src}
          alt=""
          draggable={false}
          style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
        />
      </Frame>
    </Backdrop>,
    document.body,
  );
}
