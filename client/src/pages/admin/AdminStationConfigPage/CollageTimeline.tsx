import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { styled } from '@mui/material/styles';
import {
  SLOT_MIN_SECONDS,
  formatShort,
  rulerStep,
  shiftSlot,
  slotLanes,
  slotTimes,
  stackOrder,
  timelinePieces,
  trimRange,
  type CollageSlot,
  type CustomCollageVideo,
} from '../../../utils/collageVideo';
import { sampleColor } from '../../../utils/collageSamples';
import { LayerBehindIcon, LayerGreenIcon, SnowflakeIcon, SwapRowsIcon } from './CollageEditor.icons';

const INK = '#2d2540';
const PLAYHEAD = '#e11d48';
const LABEL_W = 72;
const RULER_H = 26;
const VIDEO_H = 42;
const LANE_H = 34;
const DRAG_START_PX = 3;

const noForward = { shouldForwardProp: (prop: PropertyKey) => !String(prop).startsWith('$') };

const Frame = styled('div')({
  direction: 'ltr',
  display: 'grid',
  gridTemplateColumns: `${LABEL_W}px minmax(0, 1fr)`,
  userSelect: 'none',
});
const Labels = styled('div')({ display: 'flex', flexDirection: 'column' });
const TrackLabel = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  paddingRight: 10,
  fontSize: 12,
  fontWeight: 700,
  color: '#6b6580',
  direction: 'rtl',
});
const PhotoLabels = styled('div')({ position: 'relative' });
const SwapRows = styled('button')({
  position: 'absolute',
  right: 20,
  width: 20,
  height: 20,
  marginTop: -10,
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  border: '1px solid #ddd7ec',
  background: '#fff',
  color: '#6b6580',
  cursor: 'pointer',
  zIndex: 1,
  '&:hover': { borderColor: '#6C5CE7', color: '#6C5CE7' },
});
const LaneTarget = styled('div')({ position: 'absolute', left: 0, right: 0, background: 'rgba(108,92,231,0.1)', pointerEvents: 'none' });
const Tracks = styled('div')({ position: 'relative', touchAction: 'none' });
const Ruler = styled('div')({ position: 'relative', height: RULER_H, cursor: 'pointer', borderBottom: '1px solid #e3def0' });
const Tick = styled('div')({ position: 'absolute', bottom: 0, width: 1, height: 7, background: '#bdb5d6' });
const TickLabel = styled('span')({
  position: 'absolute',
  top: 3,
  transform: 'translateX(-50%)',
  fontSize: 10.5,
  color: '#8a83a3',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
});
const Lane = styled('div', noForward)<{ $height: number }>(({ $height }) => ({
  position: 'relative',
  height: $height,
  borderBottom: '1px solid #efecf6',
  cursor: 'pointer',
}));
const Piece = styled('div', noForward)<{ $freeze: boolean }>(({ $freeze }) => ({
  position: 'absolute',
  top: 6,
  bottom: 6,
  borderRadius: 6,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  overflow: 'hidden',
  fontSize: 11,
  fontWeight: 700,
  color: '#fff',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  background: $freeze
    ? 'repeating-linear-gradient(135deg, #0891b2 0 7px, #06b6d4 7px 14px)'
    : 'linear-gradient(180deg, #8f80f3 0%, #6C5CE7 100%)',
  borderLeft: '1px solid rgba(255,255,255,0.35)',
}));
const TrimHandle = styled('div', noForward)<{ $side: 'start' | 'end' }>(({ $side }) => ({
  position: 'absolute',
  top: 3,
  bottom: 3,
  width: 12,
  marginLeft: $side === 'start' ? 0 : -12,
  borderRadius: $side === 'start' ? '6px 2px 2px 6px' : '2px 6px 6px 2px',
  background: INK,
  cursor: 'ew-resize',
  zIndex: 2,
  touchAction: 'none',
  '&::after': { content: '""', position: 'absolute', top: '30%', bottom: '30%', left: 5, width: 2, borderRadius: 1, background: 'rgba(255,255,255,0.7)' },
}));
const Ghost = styled('div')({
  position: 'absolute',
  top: 6,
  bottom: 6,
  borderRadius: 6,
  boxSizing: 'border-box',
  border: '1px dashed #b9b1d3',
  background: 'repeating-linear-gradient(135deg, #ebe8f3 0 6px, #f6f4fa 6px 12px)',
  color: '#8a83a3',
  fontSize: 11,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
});
const GhostBand = styled('div')({ position: 'absolute', top: 0, bottom: 0, background: 'rgba(235,232,243,0.6)', pointerEvents: 'none' });
const Block = styled('div', noForward)<{ $color: string; $selected: boolean }>(({ $color, $selected }) => ({
  position: 'absolute',
  top: 4,
  bottom: 4,
  minWidth: 6,
  borderRadius: 6,
  boxSizing: 'border-box',
  background: $color,
  border: `2px solid ${$selected ? INK : 'rgba(0,0,0,0.12)'}`,
  boxShadow: $selected ? '0 0 0 2px rgba(255,255,255,0.9), 0 2px 8px rgba(45,37,64,0.3)' : 'none',
  color: '#fff',
  fontSize: 12,
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  paddingInline: 8,
  overflow: 'hidden',
  cursor: 'grab',
  zIndex: $selected ? 3 : 2,
  touchAction: 'none',
}));
const BlockEdge = styled('span', noForward)<{ $side: 'start' | 'end' }>(({ $side }) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: 9,
  [$side === 'start' ? 'left' : 'right']: 0,
  cursor: 'ew-resize',
  background: 'rgba(0,0,0,0.18)',
  touchAction: 'none',
}));
const Playhead = styled('div')({ position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, background: PLAYHEAD, pointerEvents: 'none', zIndex: 5 });
const PlayheadKnob = styled('div')({
  position: 'absolute',
  top: 0,
  width: 12,
  height: 12,
  marginLeft: -6,
  background: PLAYHEAD,
  clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
  pointerEvents: 'none',
  zIndex: 6,
});

type Drag =
  | { kind: 'seek' }
  | { kind: 'trim'; edge: 'start' | 'end'; x0: number; pps: number; baseStart: number; baseEnd: number }
  | { kind: 'block'; mode: 'move' | 'start' | 'end'; index: number; x0: number; y0: number; axis: 'x' | 'y' | null; base: CollageSlot; clickTime: number };

export interface TimelineLabels {
  video: string;
  photos: string;
  freeze: (seconds: string) => string;
  swapRows: string;
}

interface Props {
  video: CustomCollageVideo;
  total: number;
  outTime: number;
  selected: number | null;
  labels: TimelineLabels;
  onSeek: (time: number) => void;
  onSelect: (index: number | null) => void;
  onSlotChange: (index: number, slot: CollageSlot) => void;
  onSlotDone: (index: number) => void;
  onTrim: (start: number, end: number) => void;
  onTrimDone: () => void;
  onLaneChange: (index: number, lane: number) => void;
  onSwapLanes: (a: number, b: number) => void;
}

export default function CollageTimeline(props: Props) {
  const { video, total, outTime, selected, labels, onSeek, onSelect, onSlotChange, onSlotDone, onTrim, onTrimDone, onLaneChange, onSwapLanes } = props;
  const tracksRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const [width, setWidth] = useState(600);
  const [trimming, setTrimming] = useState(false);
  const [lift, setLift] = useState<{ index: number; dy: number } | null>(null);

  useEffect(() => {
    const el = tracksRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth || 600));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { start: trimStart, end: trimEnd } = trimRange(video);
  const ghostLeft = trimStart;
  const ghostRight = Math.max(0, video.duration - trimEnd);
  const span = ghostLeft + total + ghostRight;
  const pps = span > 0 ? width / span : 0;
  const len = (seconds: number) => seconds * pps;
  const x = (t: number) => (ghostLeft + t) * pps;
  const timeAt = (clientX: number) => {
    const rect = tracksRef.current?.getBoundingClientRect();
    if (!rect || !pps) return 0;
    return Math.min(total, Math.max(0, (clientX - rect.left) / pps - ghostLeft));
  };

  const capture = (e: ReactPointerEvent) => e.currentTarget.setPointerCapture(e.pointerId);

  const startSeek = (e: ReactPointerEvent) => {
    capture(e);
    drag.current = { kind: 'seek' };
    onSelect(null);
    onSeek(timeAt(e.clientX));
  };

  const startTrim = (e: ReactPointerEvent, edge: 'start' | 'end') => {
    e.stopPropagation();
    capture(e);
    drag.current = { kind: 'trim', edge, x0: e.clientX, pps, baseStart: trimStart, baseEnd: trimEnd };
    setTrimming(true);
  };

  const startBlock = (e: ReactPointerEvent, index: number, mode: 'move' | 'start' | 'end') => {
    e.stopPropagation();
    capture(e);
    onSelect(index);
    drag.current = { kind: 'block', mode, index, x0: e.clientX, y0: e.clientY, axis: mode === 'move' ? null : 'x', base: video.slots[index], clickTime: timeAt(e.clientX) };
  };

  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === 'seek') {
      onSeek(timeAt(e.clientX));
      return;
    }
    if (d.kind === 'trim') {
      const dSec = d.pps ? (e.clientX - d.x0) / d.pps : 0;
      const start = d.edge === 'start' ? Math.min(Math.max(0, d.baseStart + dSec), d.baseEnd - SLOT_MIN_SECONDS) : d.baseStart;
      const end = d.edge === 'end' ? Math.max(Math.min(video.duration, d.baseEnd + dSec), d.baseStart + SLOT_MIN_SECONDS) : d.baseEnd;
      onTrim(start, end);
      return;
    }
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_START_PX) return;
      d.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
    }
    if (d.axis === 'y') {
      setLift({ index: d.index, dy });
      return;
    }
    const dt = pps ? dx / pps : 0;
    const next = d.mode === 'move'
      ? shiftSlot(d.base, dt, total)
      : d.mode === 'start'
        ? slotTimes(d.base, Math.min(d.base.startSec + dt, d.base.endSec - SLOT_MIN_SECONDS), d.base.endSec, total)
        : slotTimes(d.base, d.base.startSec, d.base.endSec + dt, total);
    onSlotChange(d.index, next);
    onSeek(d.mode === 'end' ? next.endSec : next.startSec);
  };

  const onUp = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.kind === 'trim') {
      setTrimming(false);
      onTrimDone();
    } else if (d.kind === 'block') {
      if (d.axis === 'y') {
        const target = liftTarget(d.index, e.clientY - d.y0);
        setLift(null);
        onLaneChange(d.index, target);
      } else if (d.axis === 'x') onSlotDone(d.index);
      else onSeek(d.clickTime);
    }
  };

  const pieces = timelinePieces(video);
  const lanes = slotLanes(video.slots);
  const laneCount = Math.max(1, ...lanes.map((l) => l + 1));
  const shownLanes = laneCount + (lift ? 1 : 0);
  const liftTarget = (index: number, dy: number) => Math.min(laneCount, Math.max(0, lanes[index] + Math.round(dy / LANE_H)));
  const backToFront = stackOrder(video.slots);
  const step = rulerStep(total, len(total));
  const ticks = Array.from({ length: Math.floor(total / step) + 1 }, (_, i) => i * step);
  const ghostBands = (
    <>
      {ghostLeft > 0 && <GhostBand style={{ left: 0, width: len(ghostLeft) }} />}
      {ghostRight > 0 && <GhostBand style={{ left: x(total), width: len(ghostRight) }} />}
    </>
  );

  return (
    <Frame>
      <Labels>
        <div style={{ height: RULER_H }} />
        <TrackLabel style={{ height: VIDEO_H }}>{labels.video}</TrackLabel>
        <PhotoLabels style={{ height: LANE_H * shownLanes }}>
          <TrackLabel style={{ height: laneCount > 1 ? LANE_H : '100%' }}>{labels.photos}</TrackLabel>
          {!lift && Array.from({ length: laneCount - 1 }, (_, lane) => (
            <SwapRows key={lane} type="button" style={{ top: (lane + 1) * LANE_H + 4 }} onClick={() => onSwapLanes(lane, lane + 1)} aria-label={labels.swapRows}>
              <SwapRowsIcon />
            </SwapRows>
          ))}
        </PhotoLabels>
      </Labels>
      <Tracks ref={tracksRef} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <Ruler onPointerDown={startSeek}>
          {ghostBands}
          {ticks.map((t) => (
            <span key={t}>
              <Tick style={{ left: x(t) }} />
              <TickLabel style={{ left: Math.min(width - 14, Math.max(14, x(t))) }}>{formatShort(t)}</TickLabel>
            </span>
          ))}
        </Ruler>

        <Lane $height={VIDEO_H} onPointerDown={startSeek}>
          {pieces.map((piece) => (
            <Piece key={`${piece.kind}-${piece.outStart}`} $freeze={piece.kind === 'freeze'} style={{ left: x(piece.outStart), width: Math.max(2, len(piece.outEnd - piece.outStart)) }}>
              {piece.kind === 'freeze' ? (
                <>
                  <SnowflakeIcon size={13} />
                  {len(piece.outEnd - piece.outStart) > 46 && <span dir="auto">{labels.freeze((piece.outEnd - piece.outStart).toFixed(1))}</span>}
                </>
              ) : len(piece.outEnd - piece.outStart) > 90 && `${formatShort(piece.srcStart)} - ${formatShort(piece.srcEnd)}`}
            </Piece>
          ))}
          {ghostLeft > 0 && <Ghost style={{ left: 0, width: len(ghostLeft) }}>{len(ghostLeft) > 70 && `${formatShort(0)} - ${formatShort(trimStart)}`}</Ghost>}
          {ghostRight > 0 && <Ghost style={{ left: x(total), width: len(ghostRight) }}>{len(ghostRight) > 70 && `${formatShort(trimEnd)} - ${formatShort(video.duration)}`}</Ghost>}
          <TrimHandle $side="start" style={{ left: x(0) }} onPointerDown={(e) => startTrim(e, 'start')} />
          <TrimHandle $side="end" style={{ left: x(total) }} onPointerDown={(e) => startTrim(e, 'end')} />
        </Lane>

        <Lane $height={LANE_H * shownLanes} onPointerDown={startSeek}>
          {ghostBands}
          {lift && <LaneTarget style={{ top: liftTarget(lift.index, lift.dy) * LANE_H, height: LANE_H }} />}
          {backToFront.map((index) => {
            const slot = video.slots[index];
            const blockWidth = len(slot.endSec - slot.startSec);
            const isSelected = index === selected;
            const lifted = lift?.index === index;
            return (
              <Block
                key={index}
                $color={sampleColor(index)}
                $selected={isSelected}
                style={{
                  left: x(slot.startSec),
                  width: blockWidth,
                  top: lanes[index] * LANE_H + 4 + (lifted ? lift.dy : 0),
                  bottom: 'auto',
                  height: LANE_H - 8,
                  ...(lifted && { zIndex: 4, cursor: 'grabbing', boxShadow: '0 6px 16px rgba(45,37,64,0.3)' }),
                }}
                onPointerDown={(e) => startBlock(e, index, 'move')}
              >
                {index + 1}
                {blockWidth > 44 && slot.layer === 'behind' && <LayerBehindIcon size={14} />}
                {blockWidth > 44 && slot.layer === 'green' && <LayerGreenIcon size={14} />}
                {isSelected && (
                  <>
                    <BlockEdge $side="start" onPointerDown={(e) => startBlock(e, index, 'start')} />
                    <BlockEdge $side="end" onPointerDown={(e) => startBlock(e, index, 'end')} />
                  </>
                )}
              </Block>
            );
          })}
        </Lane>

        {!trimming && (
          <>
            <Playhead style={{ left: x(outTime) }} />
            <PlayheadKnob style={{ left: x(outTime) }} />
          </>
        )}
      </Tracks>
    </Frame>
  );
}
