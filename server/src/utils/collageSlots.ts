export type SlotLayer = 'front' | 'behind' | 'green';

export interface CollageSlot {
  startSec: number;
  endSec: number;
  x: number;
  y: number;
  w: number;
  h: number;
  layer?: SlotLayer;
  maskUrl?: string;
  track?: number;
}

export interface CollageFreeze {
  atSec: number;
  holdSec: number;
}

export interface CustomCollageVideo {
  url: string;
  width: number;
  height: number;
  duration: number;
  trimStart?: number;
  trimEnd?: number;
  freezes?: CollageFreeze[];
  keyColor?: string;
  keySimilarity?: number;
  slots: CollageSlot[];
}

export interface TimelinePiece {
  kind: 'play' | 'freeze';
  srcStart: number;
  srcEnd: number;
  outStart: number;
  outEnd: number;
}

export const CUSTOM_VIDEO_MAX_SECONDS = 90;
export const SOURCE_VIDEO_MAX_SECONDS = 300;
export const CUSTOM_VIDEO_MAX_SLOTS = 12;
export const MAX_FREEZES = 6;
export const FREEZE_MIN_SECONDS = 0.5;
export const FREEZE_MAX_SECONDS = 10;
export const SLOT_MIN_SECONDS = 0.5;
export const SLOT_MIN_SIZE = 0.05;
export const TRIMMED_TAIL_SECONDS = 1;
export const DEFAULT_KEY_COLOR = '#00ff00';
export const DEFAULT_KEY_SIMILARITY = 0.25;
export const KEY_SIMILARITY_MIN = 0.05;
export const KEY_SIMILARITY_MAX = 0.6;
const URL_MAX_LENGTH = 1000;
const DIMENSION_MIN = 64;
const DIMENSION_MAX = 4096;
const LAYERS: SlotLayer[] = ['front', 'behind', 'green'];

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function httpUrl(value: unknown): string | undefined {
  const url = typeof value === 'string' ? value.trim() : '';
  return /^https?:\/\//i.test(url) && url.length <= URL_MAX_LENGTH ? url : undefined;
}

export function trimRange(video: Pick<CustomCollageVideo, 'duration' | 'trimStart' | 'trimEnd'>): { start: number; end: number } {
  const start = clamp(video.trimStart ?? 0, 0, Math.max(0, video.duration - SLOT_MIN_SECONDS));
  const end = clamp(video.trimEnd ?? video.duration, start + SLOT_MIN_SECONDS, Math.max(start + SLOT_MIN_SECONDS, video.duration));
  return { start, end };
}

export function activeFreezes(video: Pick<CustomCollageVideo, 'duration' | 'trimStart' | 'trimEnd' | 'freezes'>): CollageFreeze[] {
  const { start, end } = trimRange(video);
  const seen = new Set<number>();
  return [...(video.freezes ?? [])]
    .filter((f) => f.atSec >= start && f.atSec < end)
    .sort((a, b) => a.atSec - b.atSec)
    .filter((f) => (seen.has(f.atSec) ? false : (seen.add(f.atSec), true)));
}

export function timelinePieces(video: Pick<CustomCollageVideo, 'duration' | 'trimStart' | 'trimEnd' | 'freezes'>): TimelinePiece[] {
  const { start, end } = trimRange(video);
  const pieces: TimelinePiece[] = [];
  let cursor = start;
  let out = 0;
  for (const freeze of activeFreezes(video)) {
    if (freeze.atSec > cursor) {
      pieces.push({ kind: 'play', srcStart: cursor, srcEnd: freeze.atSec, outStart: out, outEnd: out + freeze.atSec - cursor });
      out += freeze.atSec - cursor;
      cursor = freeze.atSec;
    }
    pieces.push({ kind: 'freeze', srcStart: freeze.atSec, srcEnd: freeze.atSec, outStart: out, outEnd: out + freeze.holdSec });
    out += freeze.holdSec;
  }
  if (end > cursor) pieces.push({ kind: 'play', srcStart: cursor, srcEnd: end, outStart: out, outEnd: out + end - cursor });
  return pieces.map((p) => ({
    ...p,
    srcStart: round3(p.srcStart),
    srcEnd: round3(p.srcEnd),
    outStart: round3(p.outStart),
    outEnd: round3(p.outEnd),
  }));
}

export function outputDuration(video: Pick<CustomCollageVideo, 'duration' | 'trimStart' | 'trimEnd' | 'freezes'>): number {
  const pieces = timelinePieces(video);
  return pieces.length ? pieces[pieces.length - 1].outEnd : 0;
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
  const layer = LAYERS.includes(s.layer as SlotLayer) ? (s.layer as SlotLayer) : 'front';
  const maskUrl = layer === 'behind' ? httpUrl(s.maskUrl) : undefined;
  const track = finite(s.track);
  return {
    startSec: round3(startSec),
    endSec: round3(endSec),
    x: round3(clamp(x, 0, 1 - width)),
    y: round3(clamp(y, 0, 1 - height)),
    w: round3(width),
    h: round3(height),
    ...(layer !== 'front' && { layer }),
    ...(maskUrl && { maskUrl }),
    ...(track !== null && { track: Math.round(clamp(track, 0, CUSTOM_VIDEO_MAX_SLOTS - 1)) }),
  };
}

function sanitizeFreezes(raw: unknown, duration: number): CollageFreeze[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => (f && typeof f === 'object' ? (f as Record<string, unknown>) : {}))
    .map((f) => ({ atSec: finite(f.atSec), holdSec: finite(f.holdSec) }))
    .filter((f): f is CollageFreeze => f.atSec !== null && f.holdSec !== null)
    .map((f) => ({
      atSec: round3(clamp(f.atSec, 0, Math.max(0, duration - 0.1))),
      holdSec: round3(clamp(f.holdSec, FREEZE_MIN_SECONDS, FREEZE_MAX_SECONDS)),
    }))
    .slice(0, MAX_FREEZES);
}

export function sanitizeCustomCollageVideo(raw: unknown): CustomCollageVideo | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const v = raw as Record<string, unknown>;
  const url = httpUrl(v.url);
  if (!url) return undefined;
  const width = finite(v.width);
  const height = finite(v.height);
  const duration = finite(v.duration);
  if (width === null || height === null || duration === null) return undefined;
  if (width < DIMENSION_MIN || width > DIMENSION_MAX || height < DIMENSION_MIN || height > DIMENSION_MAX) return undefined;
  if (duration < SLOT_MIN_SECONDS || duration > SOURCE_VIDEO_MAX_SECONDS) return undefined;
  const base = {
    duration: round3(duration),
    trimStart: finite(v.trimStart) ?? undefined,
    trimEnd: finite(v.trimEnd) ?? undefined,
    freezes: sanitizeFreezes(v.freezes, duration),
  };
  const { start, end } = trimRange(base);
  const freezes = activeFreezes({ ...base, trimStart: start, trimEnd: end });
  const length = outputDuration({ ...base, trimStart: start, trimEnd: end, freezes });
  if (length < SLOT_MIN_SECONDS || length > CUSTOM_VIDEO_MAX_SECONDS) return undefined;
  const rawSlots = Array.isArray(v.slots) ? v.slots.slice(0, CUSTOM_VIDEO_MAX_SLOTS) : [];
  const slots = rawSlots
    .map((slot) => sanitizeSlot(slot, length))
    .filter((slot): slot is CollageSlot => slot !== null);
  if (slots.length === 0) return undefined;
  const keyColor = typeof v.keyColor === 'string' && /^#[0-9a-f]{6}$/i.test(v.keyColor) ? v.keyColor.toLowerCase() : undefined;
  const similarity = finite(v.keySimilarity);
  return {
    url,
    width: Math.round(width),
    height: Math.round(height),
    duration: round3(duration),
    ...(start > 0 && { trimStart: round3(start) }),
    ...(end < duration && { trimEnd: round3(end) }),
    ...(freezes.length > 0 && { freezes }),
    ...(keyColor && { keyColor }),
    ...(similarity !== null && { keySimilarity: round3(clamp(similarity, KEY_SIMILARITY_MIN, KEY_SIMILARITY_MAX)) }),
    slots,
  };
}

export function usedSceneCount(sceneCount: number, photoCount: number): number {
  return clamp(Math.floor(photoCount) || 1, 1, sceneCount);
}

export function trimmedDuration(sceneEnds: number[], photoCount: number, fullDuration: number): number {
  const count = usedSceneCount(sceneEnds.length, photoCount);
  if (count >= sceneEnds.length) return fullDuration;
  return round3(Math.min(fullDuration, sceneEnds[count - 1] + TRIMMED_TAIL_SECONDS));
}

function overlapsInTime(a: CollageSlot, b: CollageSlot): boolean {
  return a.startSec < b.endSec && b.startSec < a.endSec;
}

export function slotLanes(slots: CollageSlot[]): number[] {
  const raw = slots.map((slot) => (Number.isInteger(slot.track) && (slot.track as number) >= 0 ? (slot.track as number) : -1));
  slots
    .map((slot, index) => ({ slot, index }))
    .filter(({ index }) => raw[index] < 0)
    .sort((a, b) => a.slot.startSec - b.slot.startSec)
    .forEach(({ slot, index }) => {
      let lane = 0;
      while (slots.some((other, i) => raw[i] === lane && overlapsInTime(other, slot))) lane++;
      raw[index] = lane;
    });
  const used = [...new Set(raw)].sort((a, b) => a - b);
  return raw.map((lane) => used.indexOf(lane));
}

export function stackOrder(slots: CollageSlot[]): number[] {
  const lanes = slotLanes(slots);
  return slots.map((_, index) => index).sort((a, b) => lanes[b] - lanes[a] || a - b);
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

export function ffmpegColor(hex: string): string {
  return `0x${hex.replace('#', '').toUpperCase()}`;
}
