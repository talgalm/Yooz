
export const MIN_SCALE = 1;
export const MAX_SCALE = 5;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function clampPan(
  x: number,
  y: number,
  scale: number,
  w: number,
  h: number,
): { x: number; y: number } {
  const maxX = Math.max(0, (w * scale - w) / 2);
  const maxY = Math.max(0, (h * scale - h) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, x)) + 0,
    y: Math.min(maxY, Math.max(-maxY, y)) + 0,
  };
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
