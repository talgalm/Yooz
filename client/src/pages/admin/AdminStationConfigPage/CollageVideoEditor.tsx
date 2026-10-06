import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { styled } from '@mui/material/styles';
import FileUploadButton from '../../../components/FileUploadButton';
import { useTranslations } from '../../../context/LanguageContext';
import { adminUploadFile } from '../../../utils/adminApi';
import {
  CUSTOM_VIDEO_MAX_SECONDS,
  CUSTOM_VIDEO_MAX_SLOTS,
  MAX_FREEZES,
  SOURCE_VIDEO_MAX_SECONDS,
  formatSeconds,
  newSlot,
  outputDuration,
  slotTimes,
  sortByStart,
  withLanesSettled,
  withLanesSwapped,
  withSlotAdded,
  withSlotOnLane,
  sourceAt,
  trimRange,
  withFreezeAdded,
  withFreezeHold,
  withFreezeRemoved,
  withTrim,
  type CollageSlot,
  type CustomCollageVideo,
  type SlotLayer,
} from '../../../utils/collageVideo';
import CollageStage, { type PaintSession } from './CollageStage';
import CollageTimeline from './CollageTimeline';
import CollageInspector from './CollageInspector';
import { PauseIcon, PlayIcon, PlusIcon, SnowflakeIcon, TrashIcon } from './CollageEditor.icons';
import { texts } from './CollageEditor.i18n';

const PURPLE = '#6C5CE7';
const INK = '#2d2540';
const LINE = '#ebe7f5';
const MASK_MAX_SIDE = 720;
const DEFAULT_BRUSH = 40;
const MASK_PAINT = [255, 48, 96] as const;

const noForward = { shouldForwardProp: (prop: PropertyKey) => !String(prop).startsWith('$') };

const Studio = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  padding: 16,
  borderRadius: 18,
  background: '#f7f6fb',
  border: `1px solid ${LINE}`,
  outline: 'none',
});
const StudioHeader = styled('div')({ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' });
const StudioTitle = styled('div')({ fontSize: 16, fontWeight: 800, color: INK, flex: 1 });
const LengthChip = styled('span', noForward)<{ $bad: boolean }>(({ $bad }) => ({
  padding: '4px 10px',
  borderRadius: 999,
  background: $bad ? '#fdecea' : '#ece8fb',
  color: $bad ? '#c0392b' : '#5b4fc4',
  fontSize: 12.5,
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
}));
const Main = styled('div')({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 340px',
  gap: 14,
  alignItems: 'start',
  '@media (max-width: 980px)': { gridTemplateColumns: 'minmax(0, 1fr)' },
});
const Monitor = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 14,
  background: '#000',
  minWidth: 0,
});
const Transport = styled('div')({ display: 'flex', alignItems: 'center', gap: 12, direction: 'ltr' });
const PlayButton = styled('button')({
  width: 42,
  height: 42,
  borderRadius: '50%',
  border: 'none',
  background: '#fff',
  color: INK,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  cursor: 'pointer',
  flexShrink: 0,
  '&:disabled': { opacity: 0.4, cursor: 'default' },
});
const Clock = styled('div')({ fontSize: 14, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' });
const ClockTotal = styled('span')({ color: 'rgba(255,255,255,0.5)', fontWeight: 600 });
const TimelinePanel = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: '12px 14px 14px',
  borderRadius: 14,
  background: '#fff',
  border: `1px solid ${LINE}`,
});
const Toolbar = styled('div')({ display: 'flex', alignItems: 'center', gap: 8 });
const ToolButton = styled('button', noForward)<{ $danger?: boolean }>(({ $danger }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 34,
  padding: '0 12px',
  borderRadius: 9,
  border: `1px solid ${$danger ? '#f3cfca' : LINE}`,
  background: '#fff',
  color: $danger ? '#c0392b' : INK,
  fontSize: 13,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  '&:hover': { background: $danger ? '#fdf2f1' : '#f7f5fd' },
  '&:disabled': { opacity: 0.4, cursor: 'default' },
}));
const ToolbarSpacer = styled('span')({ flex: 1 });
const ToolbarNote = styled('span')({ fontSize: 12, color: '#8a83a3' });
const Empty = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
  padding: '36px 20px',
  borderRadius: 14,
  border: '2px dashed #d9d3ee',
  background: '#fff',
  textAlign: 'center',
});
const EmptyTitle = styled('div')({ fontSize: 16, fontWeight: 800, color: INK });
const EmptySub = styled('div')({ fontSize: 13, color: '#8a83a3', maxWidth: 420, lineHeight: 1.5 });
const UrlInput = styled('input')({
  width: 'min(420px, 100%)',
  height: 36,
  padding: '0 12px',
  boxSizing: 'border-box',
  border: `1px solid #dfdaee`,
  borderRadius: 9,
  fontSize: 13,
  fontFamily: 'inherit',
  direction: 'ltr',
  '&:focus': { outline: 'none', borderColor: PURPLE },
});
const Problem = styled('div')({ fontSize: 13, fontWeight: 700, color: '#c0392b', padding: '8px 12px', borderRadius: 10, background: '#fdecea' });

function maskSize(width: number, height: number): { w: number; h: number } {
  const scale = Math.min(1, MASK_MAX_SIDE / Math.max(width, height, 1));
  return { w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)) };
}

function blankMask(width: number, height: number): HTMLCanvasElement {
  const { w, h } = maskSize(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function copyMask(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext('2d')?.drawImage(source, 0, 0);
  return canvas;
}

function maskFromImage(image: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const canvas = blankMask(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.data.length; i += 4) {
    const luma = data.data[i] * 0.299 + data.data[i + 1] * 0.587 + data.data[i + 2] * 0.114;
    data.data[i] = MASK_PAINT[0];
    data.data[i + 1] = MASK_PAINT[1];
    data.data[i + 2] = MASK_PAINT[2];
    data.data[i + 3] = luma;
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}

function maskToPng(mask: HTMLCanvasElement): Promise<Blob | null> {
  const white = document.createElement('canvas');
  white.width = mask.width;
  white.height = mask.height;
  const wctx = white.getContext('2d');
  const out = document.createElement('canvas');
  out.width = mask.width;
  out.height = mask.height;
  const octx = out.getContext('2d');
  if (!wctx || !octx) return Promise.resolve(null);
  wctx.drawImage(mask, 0, 0);
  wctx.globalCompositeOperation = 'source-in';
  wctx.fillStyle = '#ffffff';
  wctx.fillRect(0, 0, white.width, white.height);
  octx.fillStyle = '#000000';
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(white, 0, 0);
  return new Promise((resolve) => out.toBlob(resolve, 'image/png'));
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

interface Props {
  value?: CustomCollageVideo;
  onChange: (video: CustomCollageVideo | undefined) => void;
  photoCount: number;
}

export default function CollageVideoEditor({ value, onChange, photoCount }: Props) {
  const t = useTranslations(texts);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trimBase = useRef<CustomCollageVideo | null>(null);
  const trimDraft = useRef<{ start: number; end: number } | null>(null);
  const outRef = useRef(0);
  const [outTime, setOutTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [corsBlocked, setCorsBlocked] = useState(false);
  const [keyPreviewBlocked, setKeyPreviewBlocked] = useState(false);
  const [pickingColor, setPickingColor] = useState(false);
  const [painting, setPainting] = useState<PaintSession | null>(null);
  const [savingMask, setSavingMask] = useState(false);
  const [maskError, setMaskError] = useState(false);
  const [masks, setMasks] = useState<Map<string, HTMLCanvasElement>>(new Map());
  const [, setPaintTick] = useState(0);

  const video = value;
  const slots = video?.slots ?? [];
  const total = video && video.duration ? outputDuration(video) : 0;
  const ready = !!video?.url && total > 0;
  const sourceNow = video && ready ? sourceAt(video, outTime) : { src: 0, frozen: false };
  const freezes = video?.freezes ?? [];
  const canAddSlot = ready && slots.length < CUSTOM_VIDEO_MAX_SLOTS;
  const canFreeze = ready && !sourceNow.frozen && freezes.length < MAX_FREEZES;

  useEffect(() => {
    if (!video) return;
    const missing = video.slots.map((s) => s.maskUrl).filter((url): url is string => !!url && !masks.has(url));
    if (missing.length === 0 || !video.width) return;
    let alive = true;
    missing.forEach((url) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        if (!alive) return;
        try {
          const canvas = maskFromImage(image, video.width, video.height);
          setMasks((prev) => new Map(prev).set(url, canvas));
        } catch {
          return;
        }
      };
      image.src = url;
    });
    return () => { alive = false; };
  }, [video, masks]);

  const showAt = useCallback((time: number) => {
    if (!video) return;
    const clamped = Math.min(Math.max(0, time), total);
    outRef.current = clamped;
    setOutTime(clamped);
    const el = videoRef.current;
    if (!el) return;
    const { src } = sourceAt(video, clamped);
    if (!el.paused) el.pause();
    if (Math.abs(el.currentTime - src) > 0.02) el.currentTime = src;
  }, [video, total]);

  useEffect(() => {
    if (!playing || !video) return;
    const el = videoRef.current;
    let handle = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = outRef.current + (now - last) / 1000;
      last = now;
      if (next >= total) {
        outRef.current = total;
        setOutTime(total);
        setPlaying(false);
        return;
      }
      outRef.current = next;
      setOutTime(next);
      const { src, frozen } = sourceAt(video, next);
      if (el) {
        if (frozen) {
          if (!el.paused) el.pause();
          if (Math.abs(el.currentTime - src) > 0.05) el.currentTime = src;
        } else if (el.paused) {
          if (Math.abs(el.currentTime - src) > 0.05) el.currentTime = src;
          void el.play().catch(() => setPlaying(false));
        } else if (Math.abs(el.currentTime - src) > 0.35) {
          el.currentTime = src;
        }
      }
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(handle);
      el?.pause();
    };
  }, [playing, video, total]);

  const update = (next: CustomCollageVideo) => onChange(next);
  const commitSlots = (next: CollageSlot[]) => { if (video) update({ ...video, slots: next }); };
  const replaceSlot = (index: number, slot: CollageSlot) => commitSlots(slots.map((s, i) => (i === index ? slot : s)));
  const resortKeeping = (list: CollageSlot[], keep: CollageSlot) => {
    const settled = withLanesSettled(list, list.indexOf(keep));
    const kept = settled[list.indexOf(keep)];
    const sorted = sortByStart(settled);
    setSelected(sorted.indexOf(kept));
    commitSlots(sorted);
  };

  const seek = (time: number) => {
    setPlaying(false);
    showAt(time);
  };

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (outRef.current >= total - 0.05) showAt(0);
    setPainting(null);
    setPlaying(true);
  };

  const addSlot = () => {
    if (!video || !canAddSlot) return;
    setPlaying(false);
    const added = withSlotAdded(slots, newSlot(outTime, total, video.width, video.height));
    resortKeeping(added, added[added.length - 1]);
  };

  const removeSlot = (index: number) => {
    setSelected(null);
    if (painting?.index === index) setPainting(null);
    commitSlots(withLanesSettled(slots.filter((_, i) => i !== index), null));
  };

  const setTime = (index: number, which: 'start' | 'end', seconds: number) => {
    const slot = slots[index];
    const next = which === 'start'
      ? slotTimes(slot, seconds, Math.max(slot.endSec, seconds + 0.5), total)
      : slotTimes(slot, slot.startSec, seconds, total);
    resortKeeping(slots.map((s, i) => (i === index ? next : s)), next);
  };

  const setLayer = (index: number, layer: SlotLayer) => {
    const slot = slots[index];
    replaceSlot(index, { ...slot, layer: layer === 'front' ? undefined : layer, maskUrl: layer === 'behind' ? slot.maskUrl : undefined });
  };

  const onTrim = (start: number, end: number) => {
    if (!video) return;
    const base = trimBase.current ?? video;
    trimBase.current = base;
    trimDraft.current = { start, end };
    setPlaying(false);
    update(withTrim(base, start, end));
    const el = videoRef.current;
    if (el) el.currentTime = start === trimRange(base).start ? end : start;
  };

  const onTrimDone = () => {
    const base = trimBase.current;
    const draft = trimDraft.current;
    trimBase.current = null;
    trimDraft.current = null;
    if (!base || !draft) return;
    showAt(Math.min(outRef.current, outputDuration(withTrim(base, draft.start, draft.end))));
  };

  const addFreeze = () => {
    if (!video || !canFreeze) return;
    setPlaying(false);
    update(withFreezeAdded(video, sourceNow.src, outTime));
  };

  const startPainting = (index: number) => {
    if (!video) return;
    setPlaying(false);
    setSelected(index);
    const slot = slots[index];
    const existing = slot.maskUrl ? masks.get(slot.maskUrl) : undefined;
    setPainting({ index, canvas: existing ? copyMask(existing) : blankMask(video.width, video.height), brush: DEFAULT_BRUSH, erase: false });
    setMaskError(false);
    showAt(Math.min(slot.endSec, slot.startSec + 0.5));
  };

  const saveMask = async () => {
    if (!painting || !video) return;
    setSavingMask(true);
    setMaskError(false);
    try {
      const blob = await maskToPng(painting.canvas);
      if (!blob) throw new Error('empty');
      const uploaded = await adminUploadFile(new File([blob], 'collage-mask.png', { type: 'image/png' }));
      setMasks((prev) => new Map(prev).set(uploaded.url, painting.canvas));
      replaceSlot(painting.index, { ...slots[painting.index], layer: 'behind', maskUrl: uploaded.url });
      setPainting(null);
    } catch {
      setMaskError(true);
    } finally {
      setSavingMask(false);
    }
  };

  const clearMask = () => {
    if (!painting) return;
    painting.canvas.getContext('2d')?.clearRect(0, 0, painting.canvas.width, painting.canvas.height);
    setPainting({ ...painting });
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (isTyping(e.target) || painting) return;
    if (e.key === ' ') {
      e.preventDefault();
      if (ready) togglePlay();
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected !== null) {
      e.preventDefault();
      removeSlot(selected);
    }
  };

  const setVideoUrl = (url: string) => {
    setLoadError(false);
    setCorsBlocked(false);
    setKeyPreviewBlocked(false);
    setSelected(null);
    setPainting(null);
    onChange(url ? { url, width: 0, height: 0, duration: 0, slots } : undefined);
  };

  if (!video?.url) {
    return (
      <Empty>
        <EmptyTitle>{t.emptyTitle}</EmptyTitle>
        <EmptySub>{t.emptySub}</EmptySub>
        <FileUploadButton accept="video/*" onUploaded={setVideoUrl} label={t.uploadVideo} uploadingLabel={t.uploadingVideo} />
        <UrlInput placeholder={t.videoUrl} onChange={(e) => setVideoUrl(e.target.value.trim())} />
      </Empty>
    );
  }

  const tooLong = total > CUSTOM_VIDEO_MAX_SECONDS;

  return (
    <Studio tabIndex={0} onKeyDown={onKeyDown}>
      <StudioHeader>
        <StudioTitle>{t.studioTitle}</StudioTitle>
        {ready && <LengthChip $bad={tooLong}>{t.finalLength(formatSeconds(total))}</LengthChip>}
        <FileUploadButton accept="video/*" onUploaded={setVideoUrl} label={t.replaceVideo} uploadingLabel={t.uploadingVideo} />
      </StudioHeader>

      {loadError && <Problem>{t.loadFailed}</Problem>}
      {video.duration > SOURCE_VIDEO_MAX_SECONDS && <Problem>{t.sourceTooLong(SOURCE_VIDEO_MAX_SECONDS)}</Problem>}
      {tooLong && <Problem>{t.tooLong(CUSTOM_VIDEO_MAX_SECONDS)}</Problem>}

      <Main>
        <Monitor>
          <CollageStage
            video={video}
            videoRef={videoRef}
            outTime={outTime}
            selected={selected}
            masks={masks}
            painting={painting}
            pickingColor={pickingColor}
            corsBlocked={corsBlocked}
            onSelect={(index) => { if (!painting) setSelected(index); }}
            onSlotChange={replaceSlot}
            onColorPicked={(hex) => {
              setPickingColor(false);
              update({ ...video, keyColor: hex });
            }}
            onMetadata={(meta) => {
              setLoadError(false);
              if (meta.width === video.width && meta.height === video.height && meta.duration === video.duration) return;
              const next = { ...video, ...meta };
              const length = outputDuration(next);
              onChange({ ...next, slots: next.slots.map((s) => slotTimes(s, s.startSec, s.endSec, length)) });
            }}
            onMediaError={() => {
              if (!corsBlocked) setCorsBlocked(true);
              else setLoadError(true);
            }}
            onKeyPreviewBlocked={() => setKeyPreviewBlocked(true)}
            onPainted={() => setPaintTick((n) => n + 1)}
          />
          <Transport>
            <PlayButton type="button" onClick={togglePlay} disabled={!ready || !!painting} aria-label={playing ? t.pause : t.play}>
              {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
            </PlayButton>
            <Clock>
              {formatSeconds(outTime)}
              <ClockTotal>{` / ${formatSeconds(total)}`}</ClockTotal>
            </Clock>
          </Transport>
        </Monitor>

        {ready && (
          <CollageInspector
            video={video}
            total={total}
            outTime={outTime}
            photoCount={photoCount}
            selected={selected}
            painting={painting}
            savingMask={savingMask}
            maskError={maskError}
            pickingColor={pickingColor}
            keyPreviewBlocked={keyPreviewBlocked}
            canAddSlot={canAddSlot}
            canFreeze={canFreeze}
            onSlotChange={replaceSlot}
            onSetTime={setTime}
            onRemove={removeSlot}
            onSetLayer={setLayer}
            onStartPainting={startPainting}
            onPaintChange={setPainting}
            onClearMask={clearMask}
            onCancelPaint={() => setPainting(null)}
            onSaveMask={() => void saveMask()}
            onVideoChange={update}
            onTogglePick={() => setPickingColor((v) => !v)}
            onAddSlot={addSlot}
            onAddFreeze={addFreeze}
            onFreezeHold={(index, seconds) => update(withFreezeHold(video, index, seconds))}
            onFreezeRemove={(index) => update(withFreezeRemoved(video, index))}
          />
        )}
      </Main>

      {ready && (
        <TimelinePanel>
          <Toolbar>
            <ToolButton type="button" onClick={addSlot} disabled={!canAddSlot}><PlusIcon />{t.addPhoto}</ToolButton>
            <ToolButton type="button" onClick={addFreeze} disabled={!canFreeze}><SnowflakeIcon />{t.freeze}</ToolButton>
            {selected !== null && (
              <ToolButton type="button" $danger onClick={() => removeSlot(selected)}><TrashIcon />{t.deletePhoto}</ToolButton>
            )}
            <ToolbarSpacer />
            {slots.length >= CUSTOM_VIDEO_MAX_SLOTS && <ToolbarNote>{t.slotLimit(CUSTOM_VIDEO_MAX_SLOTS)}</ToolbarNote>}
            {freezes.length >= MAX_FREEZES && <ToolbarNote>{t.freezeLimit(MAX_FREEZES)}</ToolbarNote>}
          </Toolbar>
          <CollageTimeline
            video={video}
            total={total}
            outTime={outTime}
            selected={selected}
            labels={{
              video: t.trackVideo,
              photos: t.trackPhotos,
              freeze: t.secondsShort,
              swapRows: t.swapRows,
            }}
            onSeek={seek}
            onSelect={(index) => { if (!painting) setSelected(index); }}
            onSlotChange={replaceSlot}
            onSlotDone={(index) => resortKeeping(slots, slots[index])}
            onLaneChange={(index, lane) => commitSlots(withSlotOnLane(slots, index, lane))}
            onSwapLanes={(a, b) => commitSlots(withLanesSwapped(slots, a, b))}
            onTrim={onTrim}
            onTrimDone={onTrimDone}
          />
        </TimelinePanel>
      )}
    </Studio>
  );
}
