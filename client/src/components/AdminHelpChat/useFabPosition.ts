
import { useCallback, useEffect, useRef, useState } from 'react';

export const FAB_SIZE = 58;

const MARGIN = 12;
const EDGE_GAP = 24;
const STORAGE_KEY = 'yooz_bot_pos';
const DRAG_THRESHOLD = 4;

export interface FabPos {
  left: number;
  top: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export function clampFabPosition(pos: FabPos, viewport: Viewport, size = FAB_SIZE): FabPos {
  const maxLeft = Math.max(MARGIN, viewport.width - size - MARGIN);
  const maxTop = Math.max(MARGIN, viewport.height - size - MARGIN);
  return {
    left: Math.min(Math.max(pos.left, MARGIN), maxLeft),
    top: Math.min(Math.max(pos.top, MARGIN), maxTop),
  };
}

export function defaultFabPosition(viewport: Viewport, size = FAB_SIZE): FabPos {
  return clampFabPosition(
    { left: EDGE_GAP, top: viewport.height - size - EDGE_GAP },
    viewport,
    size,
  );
}

export function readStoredPosition(raw: string | null, viewport: Viewport): FabPos {
  if (!raw) return defaultFabPosition(viewport);
  try {
    const parsed = JSON.parse(raw) as Partial<FabPos>;
    if (typeof parsed?.left !== 'number' || typeof parsed?.top !== 'number') {
      return defaultFabPosition(viewport);
    }
    if (!Number.isFinite(parsed.left) || !Number.isFinite(parsed.top)) {
      return defaultFabPosition(viewport);
    }
    return clampFabPosition({ left: parsed.left, top: parsed.top }, viewport);
  } catch {
    return defaultFabPosition(viewport);
  }
}

function currentViewport(): Viewport {
  return { width: window.innerWidth, height: window.innerHeight };
}

export function useFabPosition() {
  const [viewport, setViewport] = useState<Viewport>(currentViewport);
  const [pos, setPos] = useState<FabPos>(() =>
    readStoredPosition(localStorage.getItem(STORAGE_KEY), currentViewport()),
  );
  const [dragging, setDragging] = useState(false);

  const gesture = useRef<{ sx: number; sy: number; dx: number; dy: number; moved: boolean } | null>(null);
  const draggedRef = useRef(false);

  useEffect(() => {
    const onResize = () => {
      const next = currentViewport();
      setViewport(next);
      setPos((prev) => clampFabPosition(prev, next));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {
    }
  }, [pos]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    draggedRef.current = false;
    const rect = e.currentTarget.getBoundingClientRect();
    gesture.current = {
      sx: e.clientX,
      sy: e.clientY,
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
      moved: false,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g) return;
    if (e.buttons === 0) {
      gesture.current = null;
      return;
    }
    if (!g.moved) {
      if (Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < DRAG_THRESHOLD) return;
      g.moved = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setPos(clampFabPosition({ left: e.clientX - g.dx, top: e.clientY - g.dy }, currentViewport()));
  }, []);

  const endGesture = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    draggedRef.current = g.moved;
    setDragging(false);
  }, []);

  const didDrag = useCallback(() => {
    const was = draggedRef.current;
    draggedRef.current = false;
    return was;
  }, []);

  return {
    pos,
    viewport,
    dragging,
    didDrag,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endGesture,
      onPointerCancel: endGesture,
    },
  };
}
