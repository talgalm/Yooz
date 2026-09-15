/**
 * Which part of an image stays visible when it is cropped to fill a frame
 * (`object-fit: cover`). Stored in settings as a CSS `object-position` string,
 * `"x% y%"`, where 0% is the image's left/top edge and 100% its right/bottom.
 */

/** The 3x3 grid the admin picks from: left/centre/right by top/middle/bottom. */
export const IMAGE_POSITION_STEPS = [0, 50, 100] as const;

const POSITION_RE = /^(\d{1,3})% (\d{1,3})%$/;
const CENTRE = { x: 50, y: 50 };

/** Parses a stored value. Anything missing, malformed or out of range is the centre. */
export function parseImagePosition(value: unknown): { x: number; y: number } {
  const match = typeof value === 'string' ? POSITION_RE.exec(value.trim()) : null;
  if (!match) return CENTRE;
  const x = Number(match[1]);
  const y = Number(match[2]);
  return x > 100 || y > 100 ? CENTRE : { x, y };
}

export function formatImagePosition(x: number, y: number): string {
  return `${x}% ${y}%`;
}

/** Value for a `style.objectPosition`; undefined leaves the CSS default (centre). */
export function objectPositionStyle(value: unknown): string | undefined {
  const { x, y } = parseImagePosition(value);
  return x === 50 && y === 50 ? undefined : formatImagePosition(x, y);
}

/**
 * The part of the image, as fractions of its width and height, that stays visible
 * when it covers a frame with aspect ratio `frameAspect` (width / height).
 */
export function visibleRegion(
  imageWidth: number,
  imageHeight: number,
  frameAspect: number,
  value: unknown
): { left: number; top: number; width: number; height: number } {
  if (!(imageWidth > 0 && imageHeight > 0 && frameAspect > 0)) {
    return { left: 0, top: 0, width: 1, height: 1 };
  }
  const { x, y } = parseImagePosition(value);
  const imageAspect = imageWidth / imageHeight;
  // Wider than the frame loses its sides; taller loses its top and bottom.
  const width = imageAspect > frameAspect ? frameAspect / imageAspect : 1;
  const height = imageAspect < frameAspect ? imageAspect / frameAspect : 1;
  return { left: (1 - width) * (x / 100), top: (1 - height) * (y / 100), width, height };
}
