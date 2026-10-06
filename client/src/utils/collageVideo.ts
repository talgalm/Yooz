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

export type CollageTemplateId = 'default' | 'gan-yehoshua' | 'custom';
export type SlotCorner = 'nw' | 'ne' | 'sw' | 'se';

export const CUSTOM_VIDEO_MAX_SECONDS = 90;
export const SOURCE_VIDEO_MAX_SECONDS = 300;
export const CUSTOM_VIDEO_MAX_SLOTS = 12;
export const MAX_FREEZES = 6;
export const FREEZE_MIN_SECONDS = 0.5;
export const FREEZE_MAX_SECONDS = 10;
export const SLOT_MIN_SECONDS = 0.5;
export const SLOT_MIN_SIZE = 0.05;
export const TRIMMED_TAIL_SECONDS = 1;
export const SLOT_FADE_SECONDS = 0.25;
export const DEFAULT_KEY_COLOR = '#00ff00';
export const DEFAULT_KEY_SIMILARITY = 0.25;
export const KEY_SIMILARITY_MIN = 0.05;
export const KEY_SIMILARITY_MAX = 0.6;
export const DEFAULT_FREEZE_SECONDS = 2;
const NEW_SLOT_SECONDS = 3;
const NEW_SLOT_WIDTH = 0.5;
const NEW_SLOT_MAX_HEIGHT = 0.8;
const PORTRAIT_RATIO = 4 / 3;
const SAME_FREEZE_SECONDS = 0.05;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
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

export function sourceAt(video: CustomCollageVideo, outTime: number): { src: number; frozen: boolean } {
  const pieces = timelinePieces(video);
  const piece = pieces.find((p) => outTime < p.outEnd) ?? pieces[pieces.length - 1];
  if (!piece) return { src: 0, frozen: false };
  if (piece.kind === 'freeze') return { src: piece.srcStart, frozen: true };
  return { src: round3(clamp(piece.srcStart + (outTime - piece.outStart), piece.srcStart, piece.srcEnd)), frozen: false };
}

export function outputAtSource(video: CustomCollageVideo, src: number): number | null {
  const piece = timelinePieces(video).find((p) => p.kind === 'play' && src >= p.srcStart && src <= p.srcEnd);
  return piece ? round3(piece.outStart + (src - piece.srcStart)) : null;
}

export function slotTimes(slot: CollageSlot, startSec: number, endSec: number, duration: number): CollageSlot {
  const start = clamp(startSec, 0, Math.max(0, duration - SLOT_MIN_SECONDS));
  const end = clamp(endSec, start + SLOT_MIN_SECONDS, Math.max(start + SLOT_MIN_SECONDS, duration));
  return { ...slot, startSec: round3(start), endSec: round3(end) };
}

function fitSlots(video: CustomCollageVideo, slots: CollageSlot[]): CustomCollageVideo {
  const total = outputDuration(video);
  return { ...video, slots: slots.map((s) => slotTimes(s, s.startSec, s.endSec, total)) };
}

export function shiftSlotsFrom(slots: CollageSlot[], at: number, delta: number): CollageSlot[] {
  return slots.map((s) => {
    if (s.startSec >= at) return { ...s, startSec: round3(s.startSec + delta), endSec: round3(s.endSec + delta) };
    if (s.endSec > at) return { ...s, endSec: round3(Math.max(s.startSec + SLOT_MIN_SECONDS, s.endSec + delta)) };
    return s;
  });
}

export function withTrim(video: CustomCollageVideo, start: number, end: number): CustomCollageVideo {
  const before = trimRange(video);
  const next = { ...video, trimStart: start, trimEnd: end };
  const range = trimRange(next);
  const trimmed = { ...next, trimStart: round3(range.start), trimEnd: round3(range.end) };
  const shift = before.start - range.start;
  return fitSlots(trimmed, shift === 0 ? video.slots : shiftSlotsFrom(video.slots, 0, shift));
}

export function withFreezeAdded(video: CustomCollageVideo, atSrc: number, outTime: number): CustomCollageVideo {
  const freezes = video.freezes ?? [];
  if (freezes.length >= MAX_FREEZES || freezes.some((f) => Math.abs(f.atSec - atSrc) < SAME_FREEZE_SECONDS)) return video;
  const next = { ...video, freezes: [...freezes, { atSec: round3(atSrc), holdSec: DEFAULT_FREEZE_SECONDS }].sort((a, b) => a.atSec - b.atSec) };
  return fitSlots(next, shiftSlotsFrom(video.slots, outTime, DEFAULT_FREEZE_SECONDS));
}

function freezeOutStart(video: CustomCollageVideo, freeze: CollageFreeze): number | null {
  const piece = timelinePieces(video).find((p) => p.kind === 'freeze' && p.srcStart === round3(freeze.atSec));
  return piece ? piece.outStart : null;
}

export function withFreezeHold(video: CustomCollageVideo, index: number, holdSec: number): CustomCollageVideo {
  const freezes = video.freezes ?? [];
  const freeze = freezes[index];
  if (!freeze) return video;
  const hold = round3(clamp(holdSec, FREEZE_MIN_SECONDS, FREEZE_MAX_SECONDS));
  const at = freezeOutStart(video, freeze);
  const next = { ...video, freezes: freezes.map((f, i) => (i === index ? { ...f, holdSec: hold } : f)) };
  const slots = at === null ? video.slots : shiftSlotsFrom(video.slots, at + Math.min(freeze.holdSec, hold), hold - freeze.holdSec);
  return fitSlots(next, slots);
}

export function withFreezeRemoved(video: CustomCollageVideo, index: number): CustomCollageVideo {
  const freezes = video.freezes ?? [];
  const freeze = freezes[index];
  if (!freeze) return video;
  const at = freezeOutStart(video, freeze);
  const next = { ...video, freezes: freezes.filter((_, i) => i !== index) };
  const slots = at === null ? video.slots : shiftSlotsFrom(video.slots, at + freeze.holdSec, -freeze.holdSec);
  return fitSlots(next, slots);
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

const RULER_STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60];

export function rulerStep(totalSeconds: number, widthPx: number, minGapPx = 56): number {
  if (totalSeconds <= 0 || widthPx <= 0) return 1;
  const perSecond = widthPx / totalSeconds;
  return RULER_STEPS.find((step) => step * perSecond >= minGapPx) ?? RULER_STEPS[RULER_STEPS.length - 1];
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

function withLanes(slots: CollageSlot[], lanes: number[]): CollageSlot[] {
  return slots.map((slot, i) => (slot.track === lanes[i] ? slot : { ...slot, track: lanes[i] }));
}

function compactLanes(slots: CollageSlot[]): CollageSlot[] {
  return withLanes(slots, slotLanes(slots));
}

export function withSlotOnLane(slots: CollageSlot[], index: number, lane: number): CollageSlot[] {
  const lanes = slotLanes(slots);
  const from = lanes[index];
  const target = Math.max(0, Math.round(lane));
  if (from === undefined || target === from) return slots;
  return compactLanes(withLanes(slots, lanes.map((current, i) => {
    if (i === index) return target;
    return current === target && overlapsInTime(slots[i], slots[index]) ? from : current;
  })));
}

export function withLanesSwapped(slots: CollageSlot[], a: number, b: number): CollageSlot[] {
  const lanes = slotLanes(slots);
  return compactLanes(withLanes(slots, lanes.map((lane) => (lane === a ? b : lane === b ? a : lane))));
}

export function withLanesSettled(slots: CollageSlot[], moved: number | null): CollageSlot[] {
  const lanes = slotLanes(slots);
  const order = slots.map((_, i) => i).filter((i) => i !== moved);
  if (moved !== null && moved >= 0 && moved < slots.length) order.push(moved);
  const next = [...lanes];
  const placed: number[] = [];
  order.forEach((index) => {
    let lane = lanes[index];
    while (placed.some((other) => next[other] === lane && overlapsInTime(slots[other], slots[index]))) lane++;
    next[index] = lane;
    placed.push(index);
  });
  return compactLanes(withLanes(slots, next));
}

export function withSlotAdded(slots: CollageSlot[], slot: CollageSlot): CollageSlot[] {
  const lanes = slotLanes(slots);
  const topBusy = slots.some((other, i) => lanes[i] === 0 && overlapsInTime(other, slot));
  const shifted = withLanes(slots, lanes.map((lane) => (topBusy ? lane + 1 : lane)));
  return compactLanes([...shifted, { ...slot, track: 0 }]);
}

export function shiftSlot(slot: CollageSlot, delta: number, duration: number): CollageSlot {
  const length = slot.endSec - slot.startSec;
  const start = clamp(slot.startSec + delta, 0, Math.max(0, duration - length));
  return { ...slot, startSec: round3(start), endSec: round3(start + length) };
}

export function sortByStart(slots: CollageSlot[]): CollageSlot[] {
  return [...slots].sort((a, b) => a.startSec - b.startSec);
}

export function slotActiveAt(slot: CollageSlot, t: number): boolean {
  return t >= slot.startSec && t <= slot.endSec;
}

export function slotOpacityAt(slot: CollageSlot, t: number): number {
  if (!slotActiveAt(slot, t)) return 0;
  const fade = Math.min(SLOT_FADE_SECONDS, (slot.endSec - slot.startSec) / 2);
  return clamp(Math.min((t - slot.startSec) / fade, (slot.endSec - t) / fade), 0, 1);
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

export function formatShort(seconds: number): string {
  return formatSeconds(seconds).replace(/\.0$/, '');
}

export type SlotFit = 'none' | 'match' | 'reuse' | 'unused';

export function slotFit(photoCount: number, slotCount: number): SlotFit {
  if (slotCount === 0) return 'none';
  if (slotCount === photoCount) return 'match';
  return slotCount > photoCount ? 'reuse' : 'unused';
}

export function customVideoProblem(
  video: CustomCollageVideo | undefined,
): 'noVideo' | 'loading' | 'sourceTooLong' | 'tooLong' | 'noSlots' | null {
  if (!video?.url) return 'noVideo';
  if (!video.width || !video.height || !video.duration) return 'loading';
  if (video.duration > SOURCE_VIDEO_MAX_SECONDS) return 'sourceTooLong';
  if (outputDuration(video) > CUSTOM_VIDEO_MAX_SECONDS) return 'tooLong';
  if (video.slots.length === 0) return 'noSlots';
  return null;
}
