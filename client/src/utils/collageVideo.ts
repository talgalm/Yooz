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

export type CollageTemplateId = 'default' | 'gan-yehoshua' | 'custom';
export type SlotCorner = 'nw' | 'ne' | 'sw' | 'se';

export const CUSTOM_VIDEO_MAX_SECONDS = 90;
export const CUSTOM_VIDEO_MAX_SLOTS = 12;
export const SLOT_MIN_SECONDS = 0.5;
export const SLOT_MIN_SIZE = 0.05;
export const TRIMMED_TAIL_SECONDS = 1;
export const SLOT_FADE_SECONDS = 0.25;
const NEW_SLOT_SECONDS = 3;
const NEW_SLOT_WIDTH = 0.5;
const NEW_SLOT_MAX_HEIGHT = 0.8;
const PORTRAIT_RATIO = 4 / 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function slotTimes(slot: CollageSlot, startSec: number, endSec: number, duration: number): CollageSlot {
  const start = clamp(startSec, 0, Math.max(0, duration - SLOT_MIN_SECONDS));
  const end = clamp(endSec, start + SLOT_MIN_SECONDS, Math.max(start + SLOT_MIN_SECONDS, duration));
  return { ...slot, startSec: round3(start), endSec: round3(end) };
}

export function moveSlot(slot: CollageSlot, dx: number, dy: number): CollageSlot {
  return {
    ...slot,
    x: round3(clamp(slot.x + dx, 0, 1 - slot.w)),
    y: round3(clamp(slot.y + dy, 0, 1 - slot.h)),
  };
}

export function resizeSlot(slot: CollageSlot, corner: SlotCorner, dx: number, dy: number): CollageSlot {
  let left = slot.x;
  let top = slot.y;
  let right = slot.x + slot.w;
  let bottom = slot.y + slot.h;
  if (corner === 'nw' || corner === 'sw') left = clamp(left + dx, 0, right - SLOT_MIN_SIZE);
  else right = clamp(right + dx, left + SLOT_MIN_SIZE, 1);
  if (corner === 'nw' || corner === 'ne') top = clamp(top + dy, 0, bottom - SLOT_MIN_SIZE);
  else bottom = clamp(bottom + dy, top + SLOT_MIN_SIZE, 1);
  return { ...slot, x: round3(left), y: round3(top), w: round3(right - left), h: round3(bottom - top) };
}

export function newSlot(atSec: number, duration: number, width: number, height: number): CollageSlot {
  const aspect = height > 0 ? width / height : 1;
  let w = NEW_SLOT_WIDTH;
  let h = w * aspect * PORTRAIT_RATIO;
  if (h > NEW_SLOT_MAX_HEIGHT) {
    h = NEW_SLOT_MAX_HEIGHT;
    w = h / (aspect * PORTRAIT_RATIO);
  }
  const base = { x: round3((1 - w) / 2), y: round3((1 - h) / 2), w: round3(w), h: round3(h), startSec: 0, endSec: 0 };
  return slotTimes(base, atSec, atSec + NEW_SLOT_SECONDS, duration);
}

export function sortByStart(slots: CollageSlot[]): CollageSlot[] {
  return [...slots].sort((a, b) => a.startSec - b.startSec);
}

export function slotActiveAt(slot: CollageSlot, t: number): boolean {
  return t >= slot.startSec && t <= slot.endSec;
}

export function photoForSlot(slotIndex: number, photoCount: number): number {
  return photoCount > 0 ? slotIndex % photoCount : 0;
}

export function usedSceneCount(sceneCount: number, photoCount: number): number {
  return clamp(Math.floor(photoCount) || 1, 1, sceneCount);
}

export function trimmedDuration(sceneEnds: number[], photoCount: number, fullDuration: number): number {
  const count = usedSceneCount(sceneEnds.length, photoCount);
  if (count >= sceneEnds.length) return fullDuration;
  return round3(Math.min(fullDuration, sceneEnds[count - 1] + TRIMMED_TAIL_SECONDS));
}

export function formatSeconds(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, '0')}`;
}

export type SlotFit = 'none' | 'match' | 'reuse' | 'unused';

export function slotFit(photoCount: number, slotCount: number): SlotFit {
  if (slotCount === 0) return 'none';
  if (slotCount === photoCount) return 'match';
  return slotCount > photoCount ? 'reuse' : 'unused';
}

export function customVideoProblem(video: CustomCollageVideo | undefined): 'noVideo' | 'loading' | 'tooLong' | 'noSlots' | null {
  if (!video?.url) return 'noVideo';
  if (!video.width || !video.height || !video.duration) return 'loading';
  if (video.duration > CUSTOM_VIDEO_MAX_SECONDS) return 'tooLong';
  if (video.slots.length === 0) return 'noSlots';
  return null;
}
