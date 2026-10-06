import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { styled } from '@mui/material/styles';
import FileUploadButton from '../../../components/FileUploadButton';
import { useTranslations } from '../../../context/LanguageContext';
import {
  CUSTOM_VIDEO_MAX_SECONDS,
  CUSTOM_VIDEO_MAX_SLOTS,
  formatSeconds,
  moveSlot,
  newSlot,
  photoForSlot,
  resizeSlot,
  slotActiveAt,
  slotFit,
  slotTimes,
  sortByStart,
  type CollageSlot,
  type CustomCollageVideo,
  type SlotCorner,
} from '../../../utils/collageVideo';
import { sampleColor, samplePhotoUrl } from '../../../utils/collageSamples';
import { texts } from './CollageEditor.i18n';

const PURPLE = '#6C5CE7';
const INK = '#2d2540';
const CORNERS: SlotCorner[] = ['nw', 'ne', 'sw', 'se'];

const noForward = { shouldForwardProp: (prop: PropertyKey) => !String(prop).startsWith('$') };

const Wrap = styled('div')({ display: 'flex', flexDirection: 'column', gap: 12 });

const UploadRow = styled('div')({ display: 'flex', alignItems: 'center', gap: 8 });

const UrlInput = styled('input')({
  flex: 1,
  minWidth: 0,
  padding: '9px 12px',
  border: '1px solid #e0dcef',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  direction: 'ltr',
});

const Help = styled('div')({ fontSize: 13, color: '#777', lineHeight: 1.5 });

const StageWrap = styled('div')({ display: 'flex', justifyContent: 'center' });

const Stage = styled('div')({
  position: 'relative',
  display: 'inline-block',
  lineHeight: 0,
  maxWidth: '100%',
  borderRadius: 12,
  overflow: 'hidden',
  background: '#000',
  boxShadow: '0 4px 18px rgba(40,30,70,0.18)',
});

const StageVideo = styled('video')({ display: 'block', maxWidth: '100%', maxHeight: 480 });

const Overlay = styled('div')({ position: 'absolute', inset: 0, touchAction: 'none' });

const SlotBox = styled('div', noForward)<{ $selected: boolean; $active: boolean }>(({ $selected, $active }) => ({
  position: 'absolute',
  boxSizing: 'border-box',
  border: $selected ? `2px solid ${PURPLE}` : '2px dashed rgba(255,255,255,0.9)',
  boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  cursor: 'move',
  opacity: $active ? 1 : 0.45,
  touchAction: 'none',
}));

const SlotBadge = styled('span', noForward)<{ $color: string }>(({ $color }) => ({
  position: 'absolute',
  top: 4,
  insetInlineStart: 4,
  minWidth: 20,
  height: 20,
  padding: '0 6px',
  boxSizing: 'border-box',
  borderRadius: 10,
  background: INK,
  border: `2px solid ${$color}`,
  color: '#fff',
  fontSize: 12,
  fontWeight: 800,
  lineHeight: '20px',
  textAlign: 'center',
  pointerEvents: 'none',
}));

const CORNER_POSITION: Record<SlotCorner, { top?: number; bottom?: number; left?: number; right?: number; cursor: string }> = {
  nw: { top: -7, left: -7, cursor: 'nwse-resize' },
  ne: { top: -7, right: -7, cursor: 'nesw-resize' },
  sw: { bottom: -7, left: -7, cursor: 'nesw-resize' },
  se: { bottom: -7, right: -7, cursor: 'nwse-resize' },
};

const Handle = styled('span')({
  position: 'absolute',
  width: 14,
  height: 14,
  boxSizing: 'border-box',
  background: '#fff',
  border: `2px solid ${PURPLE}`,
  borderRadius: 3,
  touchAction: 'none',
});

const Controls = styled('div')({ display: 'flex', alignItems: 'center', gap: 10, direction: 'ltr' });

const PlayButton = styled('button')({
  flexShrink: 0,
  minWidth: 64,
  height: 34,
  borderRadius: 17,
  border: 'none',
  background: PURPLE,
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
});

const Track = styled('div')({
  position: 'relative',
  flex: 1,
  height: 40,
  borderRadius: 8,
  background: '#efeaf9',
  cursor: 'pointer',
  touchAction: 'none',
});

const Segment = styled('div', noForward)<{ $color: string; $selected: boolean }>(({ $color, $selected }) => ({
  position: 'absolute',
  top: 6,
  bottom: 6,
  borderRadius: 6,
  background: $color,
  opacity: $selected ? 1 : 0.8,
  outline: $selected ? `2px solid ${INK}` : 'none',
  color: '#fff',
  fontSize: 11,
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'visible',
  cursor: 'pointer',
}));

const EdgeGrip = styled('span', noForward)<{ $side: 'start' | 'end' }>(({ $side }) => ({
  position: 'absolute',
  top: -4,
  bottom: -4,
  width: 10,
  [$side === 'start' ? 'left' : 'right']: -5,
  cursor: 'ew-resize',
  touchAction: 'none',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 3,
    width: 4,
    borderRadius: 2,
    background: INK,
  },
}));

const Playhead = styled('div')({
  position: 'absolute',
  top: -3,
  bottom: -3,
  width: 2,
  marginLeft: -1,
  background: INK,
  pointerEvents: 'none',
});

const TimeLabel = styled('span')({ flexShrink: 0, fontSize: 13, fontVariantNumeric: 'tabular-nums', color: INK, minWidth: 92 });

const ToolRow = styled('div')({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' });

const CheckLabel = styled('label')({ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' });

const AddButton = styled('button')({
  border: `1px solid ${PURPLE}`,
  background: '#fff',
  color: PURPLE,
  borderRadius: 8,
  padding: '7px 14px',
  fontSize: 13,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  '&:disabled': { opacity: 0.45, cursor: 'default' },
});

const SlotList = styled('div')({ display: 'flex', flexDirection: 'column', gap: 6 });

const SlotRow = styled('div', noForward)<{ $selected: boolean }>(({ $selected }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  padding: '8px 10px',
  borderRadius: 10,
  border: `1px solid ${$selected ? PURPLE : '#e6e2f2'}`,
  background: $selected ? '#f4f1ff' : '#fff',
  cursor: 'pointer',
  fontSize: 13,
}));

const RowName = styled('span')({ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, minWidth: 74 });

const Dot = styled('span', noForward)<{ $color: string }>(({ $color }) => ({
  width: 12,
  height: 12,
  borderRadius: '50%',
  background: $color,
  flexShrink: 0,
}));

const TimeInput = styled('input')({
  width: 64,
  padding: '5px 6px',
  border: '1px solid #e0dcef',
  borderRadius: 6,
  fontSize: 13,
  fontFamily: 'inherit',
  direction: 'ltr',
});

const SmallButton = styled('button')({
  border: '1px solid #e0dcef',
  background: '#fff',
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: 12,
  fontFamily: 'inherit',
  cursor: 'pointer',
});

const RemoveButton = styled(SmallButton)({ marginInlineStart: 'auto', color: '#c0392b', borderColor: '#f1c9c4' });

const Note = styled('div', noForward)<{ $tone: 'good' | 'warn' | 'bad' }>(({ $tone }) => ({
  fontSize: 13,
  fontWeight: 600,
  color: $tone === 'good' ? '#188038' : $tone === 'warn' ? '#b26a00' : '#c0392b',
}));

type Drag =
  | { kind: 'box'; mode: 'move' | SlotCorner; index: number; x0: number; y0: number; base: CollageSlot; width: number; height: number }
  | { kind: 'edge'; edge: 'start' | 'end'; index: number; x0: number; base: CollageSlot; trackWidth: number }
  | { kind: 'seek'; left: number; trackWidth: number };

interface Props {
  value?: CustomCollageVideo;
  onChange: (video: CustomCollageVideo | undefined) => void;
  photoCount: number;
}

export default function CollageVideoEditor({ value, onChange, photoCount }: Props) {
  const t = useTranslations(texts);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [showSamples, setShowSamples] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const slots = value?.slots ?? [];
  const duration = value?.duration ?? 0;
  const ready = !!value?.url && duration > 0;

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video) setCurrentTime(video.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const commit = (next: CollageSlot[]) => {
    if (value) onChange({ ...value, slots: next });
  };

  const replaceSlot = (index: number, slot: CollageSlot) => commit(slots.map((s, i) => (i === index ? slot : s)));

  const resortKeeping = (list: CollageSlot[], keep: CollageSlot) => {
    const sorted = sortByStart(list);
    setSelected(sorted.indexOf(keep));
    commit(sorted);
  };

  const seek = (time: number) => {
    const clamped = Math.min(Math.max(0, time), duration);
    if (videoRef.current) videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };

  const addSlot = () => {
    if (!value || slots.length >= CUSTOM_VIDEO_MAX_SLOTS) return;
    const slot = newSlot(currentTime, duration, value.width, value.height);
    resortKeeping([...slots, slot], slot);
  };

  const removeSlot = (index: number) => {
    setSelected(null);
    commit(slots.filter((_, i) => i !== index));
  };

  const startBoxDrag = (e: ReactPointerEvent, index: number, mode: 'move' | SlotCorner) => {
    e.stopPropagation();
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(index);
    drag.current = { kind: 'box', mode, index, x0: e.clientX, y0: e.clientY, base: slots[index], width: rect.width, height: rect.height };
  };

  const startEdgeDrag = (e: ReactPointerEvent, index: number, edge: 'start' | 'end') => {
    e.stopPropagation();
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { kind: 'edge', edge, index, x0: e.clientX, base: slots[index], trackWidth: rect.width };
  };

  const startSeek = (e: ReactPointerEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { kind: 'seek', left: rect.left, trackWidth: rect.width };
    seek(((e.clientX - rect.left) / rect.width) * duration);
  };

  const onDragMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'seek') {
      seek(((e.clientX - d.left) / d.trackWidth) * duration);
      return;
    }
    if (d.kind === 'edge') {
      const dt = ((e.clientX - d.x0) / d.trackWidth) * duration;
      const next = d.edge === 'start'
        ? slotTimes(d.base, Math.min(d.base.startSec + dt, d.base.endSec - 0.5), d.base.endSec, duration)
        : slotTimes(d.base, d.base.startSec, d.base.endSec + dt, duration);
      replaceSlot(d.index, next);
      seek(d.edge === 'start' ? next.startSec : next.endSec);
      return;
    }
    const dx = (e.clientX - d.x0) / d.width;
    const dy = (e.clientY - d.y0) / d.height;
    replaceSlot(d.index, d.mode === 'move' ? moveSlot(d.base, dx, dy) : resizeSlot(d.base, d.mode, dx, dy));
  };

  const onDragEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.kind === 'edge') resortKeeping(slots, slots[d.index]);
  };

  const setTime = (index: number, which: 'start' | 'end', seconds: number) => {
    const slot = slots[index];
    const next = which === 'start'
      ? slotTimes(slot, seconds, Math.max(slot.endSec, seconds + 0.5), duration)
      : slotTimes(slot, slot.startSec, seconds, duration);
    resortKeeping(slots.map((s, i) => (i === index ? next : s)), next);
  };

  const fit = slotFit(photoCount, slots.length);
  const visible = slots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot, index }) => slotActiveAt(slot, currentTime) || index === selected);

  return (
    <Wrap>
      <UploadRow>
        <FileUploadButton
          accept="video/*"
          onUploaded={(url) => {
            setLoadError(false);
            onChange({ url, width: 0, height: 0, duration: 0, slots });
          }}
          label={t.uploadVideo}
          uploadingLabel={t.uploadingVideo}
        />
        <UrlInput
          placeholder={t.videoUrl}
          value={value?.url ?? ''}
          onChange={(e) => {
            const url = e.target.value.trim();
            setLoadError(false);
            onChange(url ? { url, width: 0, height: 0, duration: 0, slots } : undefined);
          }}
        />
      </UploadRow>

      {!value?.url && <Help>{t.emptyHelp}</Help>}
      {loadError && <Note $tone="bad">{t.loadFailed}</Note>}

      {value?.url && (
        <>
          <StageWrap>
            <Stage>
              <StageVideo
                ref={videoRef}
                src={value.url}
                preload="auto"
                playsInline
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget;
                  const nextDuration = Math.round(video.duration * 1000) / 1000;
                  if (video.videoWidth === value.width && video.videoHeight === value.height && nextDuration === value.duration) return;
                  onChange({
                    ...value,
                    width: video.videoWidth,
                    height: video.videoHeight,
                    duration: nextDuration,
                    slots: value.slots.map((s) => slotTimes(s, s.startSec, s.endSec, nextDuration)),
                  });
                }}
                onError={() => setLoadError(true)}
                onPlay={() => setPlaying(true)}
                onPause={() => { setPlaying(false); setCurrentTime(videoRef.current?.currentTime ?? 0); }}
                onSeeked={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
              />
              <Overlay
                ref={overlayRef}
                onPointerDown={() => setSelected(null)}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
              >
                {visible.map(({ slot, index }) => {
                  const photo = photoForSlot(index, photoCount);
                  return (
                    <SlotBox
                      key={index}
                      $selected={index === selected}
                      $active={slotActiveAt(slot, currentTime)}
                      onPointerDown={(e) => startBoxDrag(e, index, 'move')}
                      style={{
                        left: `${slot.x * 100}%`,
                        top: `${slot.y * 100}%`,
                        width: `${slot.w * 100}%`,
                        height: `${slot.h * 100}%`,
                        backgroundImage: showSamples ? `url(${samplePhotoUrl(photo)})` : undefined,
                        backgroundColor: showSamples ? undefined : 'rgba(108,92,231,0.22)',
                      }}
                    >
                      <SlotBadge $color={sampleColor(photo)}>{index + 1}</SlotBadge>
                      {index === selected && CORNERS.map((corner) => {
                        const { cursor, ...position } = CORNER_POSITION[corner];
                        return (
                          <Handle
                            key={corner}
                            style={{ ...position, cursor }}
                            onPointerDown={(e) => startBoxDrag(e, index, corner)}
                          />
                        );
                      })}
                    </SlotBox>
                  );
                })}
              </Overlay>
            </Stage>
          </StageWrap>

          <Controls>
            <PlayButton type="button" onClick={togglePlay} disabled={!ready}>{playing ? t.pause : t.play}</PlayButton>
            <Track
              ref={trackRef}
              onPointerDown={startSeek}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
            >
              {ready && slots.map((slot, index) => (
                <Segment
                  key={index}
                  $color={sampleColor(photoForSlot(index, photoCount))}
                  $selected={index === selected}
                  style={{ left: `${(slot.startSec / duration) * 100}%`, width: `${((slot.endSec - slot.startSec) / duration) * 100}%` }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelected(index);
                    seek(slot.startSec);
                  }}
                >
                  {index + 1}
                  {index === selected && (
                    <>
                      <EdgeGrip $side="start" onPointerDown={(e) => startEdgeDrag(e, index, 'start')} />
                      <EdgeGrip $side="end" onPointerDown={(e) => startEdgeDrag(e, index, 'end')} />
                    </>
                  )}
                </Segment>
              ))}
              {ready && <Playhead style={{ left: `${(currentTime / duration) * 100}%` }} />}
            </Track>
            <TimeLabel>{`${formatSeconds(currentTime)} / ${formatSeconds(duration)}`}</TimeLabel>
          </Controls>

          {duration > CUSTOM_VIDEO_MAX_SECONDS && <Note $tone="bad">{t.tooLong(CUSTOM_VIDEO_MAX_SECONDS)}</Note>}

          <ToolRow>
            <AddButton type="button" onClick={addSlot} disabled={!ready || slots.length >= CUSTOM_VIDEO_MAX_SLOTS}>
              {t.addSlot}
            </AddButton>
            <CheckLabel>
              <input type="checkbox" checked={showSamples} onChange={(e) => setShowSamples(e.target.checked)} />
              {t.showSamples}
            </CheckLabel>
          </ToolRow>
          {slots.length >= CUSTOM_VIDEO_MAX_SLOTS && <Help>{t.slotLimit(CUSTOM_VIDEO_MAX_SLOTS)}</Help>}
          {slots.length > 0 && <Help>{t.editHint}</Help>}

          <SlotList>
            {slots.map((slot, index) => (
              <SlotRow
                key={index}
                $selected={index === selected}
                onClick={() => { setSelected(index); seek(slot.startSec); }}
              >
                <RowName><Dot $color={sampleColor(photoForSlot(index, photoCount))} />{t.slot(index + 1)}</RowName>
                {t.start}
                <TimeInput
                  type="number"
                  step="any"
                  min={0}
                  max={duration}
                  value={slot.startSec}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setTime(index, 'start', Number(e.target.value) || 0)}
                />
                <SmallButton type="button" onClick={(e) => { e.stopPropagation(); setTime(index, 'start', currentTime); }}>{t.setNow}</SmallButton>
                {t.end}
                <TimeInput
                  type="number"
                  step="any"
                  min={0}
                  max={duration}
                  value={slot.endSec}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setTime(index, 'end', Number(e.target.value) || 0)}
                />
                <SmallButton type="button" onClick={(e) => { e.stopPropagation(); setTime(index, 'end', currentTime); }}>{t.setNow}</SmallButton>
                <RemoveButton type="button" onClick={(e) => { e.stopPropagation(); removeSlot(index); }}>{t.remove}</RemoveButton>
              </SlotRow>
            ))}
          </SlotList>

          {ready && (
            fit === 'match' ? <Note $tone="good">{t.fitMatch(photoCount)}</Note>
              : fit === 'reuse' ? <Note $tone="warn">{t.fitReuse(photoCount, slots.length)}</Note>
                : fit === 'unused' ? <Note $tone="warn">{t.fitUnused(photoCount, slots.length)}</Note>
                  : <Note $tone="bad">{t.fitNone}</Note>
          )}
        </>
      )}
    </Wrap>
  );
}
