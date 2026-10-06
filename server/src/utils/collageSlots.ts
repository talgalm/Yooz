export interface CollageSlot {
  startSec: number;
  endSec: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CustomCollageVideo {
  url: string;
  width: number;
  height: number;
  duration: number;
  slots: CollageSlot[];
}

export const CUSTOM_VIDEO_MAX_SECONDS = 90;
export const CUSTOM_VIDEO_MAX_SLOTS = 12;
export const SLOT_MIN_SECONDS = 0.5;
export const SLOT_MIN_SIZE = 0.05;
export const TRIMMED_TAIL_SECONDS = 1;
const URL_MAX_LENGTH = 1000;
const DIMENSION_MIN = 64;
const DIMENSION_MAX = 4096;

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function sanitizeSlot(raw: unknown, duration: number): CollageSlot | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const start = finite(s.startSec);
  const end = finite(s.endSec);
  const x = finite(s.x);
  const y = finite(s.y);
  const w = finite(s.w);
  const h = finite(s.h);
  if (start === null || end === null || x === null || y === null || w === null || h === null) return null;
  const startSec = clamp(start, 0, duration - SLOT_MIN_SECONDS);
  const endSec = clamp(end, startSec + SLOT_MIN_SECONDS, duration);
  const width = clamp(w, SLOT_MIN_SIZE, 1);
  const height = clamp(h, SLOT_MIN_SIZE, 1);
  return {
    startSec: round3(startSec),
    endSec: round3(endSec),
    x: round3(clamp(x, 0, 1 - width)),
    y: round3(clamp(y, 0, 1 - height)),
    w: round3(width),
    h: round3(height),
  };
}

export function sanitizeCustomCollageVideo(raw: unknown): CustomCollageVideo | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const v = raw as Record<string, unknown>;
  const url = typeof v.url === 'string' ? v.url.trim() : '';
  if (!/^https?:\/\//i.test(url) || url.length > URL_MAX_LENGTH) return undefined;
  const width = finite(v.width);
  const height = finite(v.height);
  const duration = finite(v.duration);
  if (width === null || height === null || duration === null) return undefined;
  if (width < DIMENSION_MIN || width > DIMENSION_MAX || height < DIMENSION_MIN || height > DIMENSION_MAX) return undefined;
  if (duration < SLOT_MIN_SECONDS || duration > CUSTOM_VIDEO_MAX_SECONDS) return undefined;
  const rawSlots = Array.isArray(v.slots) ? v.slots.slice(0, CUSTOM_VIDEO_MAX_SLOTS) : [];
  const slots = rawSlots
    .map((slot) => sanitizeSlot(slot, duration))
    .filter((slot): slot is CollageSlot => slot !== null);
  if (slots.length === 0) return undefined;
  return { url, width: Math.round(width), height: Math.round(height), duration: round3(duration), slots };
}

export function usedSceneCount(sceneCount: number, photoCount: number): number {
  return clamp(Math.floor(photoCount) || 1, 1, sceneCount);
}

export function trimmedDuration(sceneEnds: number[], photoCount: number, fullDuration: number): number {
  const count = usedSceneCount(sceneEnds.length, photoCount);
  if (count >= sceneEnds.length) return fullDuration;
  return round3(Math.min(fullDuration, sceneEnds[count - 1] + TRIMMED_TAIL_SECONDS));
}

export function photoForSlot(slotIndex: number, photoCount: number): number {
  return photoCount > 0 ? slotIndex % photoCount : 0;
}

export function evenPixels(fraction: number, size: number): number {
  return Math.max(2, Math.round((fraction * size) / 2) * 2);
}

export function outputWidth(width: number, height: number): number {
  return width > height ? 960 : 540;
}
