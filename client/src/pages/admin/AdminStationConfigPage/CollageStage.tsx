import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { styled } from '@mui/material/styles';
import {
  DEFAULT_KEY_COLOR,
  DEFAULT_KEY_SIMILARITY,
  moveSlot,
  resizeSlot,
  slotActiveAt,
  slotOpacityAt,
  stackOrder,
  type CollageSlot,
  type CustomCollageVideo,
  type SlotCorner,
} from '../../../utils/collageVideo';
import { samplePhotoImage } from '../../../utils/collageSamples';
import { replaceKeyColor, rgbToHex } from '../../../utils/collageChroma';

const PURPLE = '#6C5CE7';
const MAX_STAGE_WIDTH = 420;
const MAX_STAGE_HEIGHT = 480;
const PAINT_COLOR = 'rgba(255, 48, 96, 1)';
const CORNERS: SlotCorner[] = ['nw', 'ne', 'sw', 'se'];
const CORNER_POSITION: Record<SlotCorner, { top?: number; bottom?: number; left?: number; right?: number; cursor: string }> = {
  nw: { top: -7, left: -7, cursor: 'nwse-resize' },
  ne: { top: -7, right: -7, cursor: 'nesw-resize' },
  sw: { bottom: -7, left: -7, cursor: 'nesw-resize' },
  se: { bottom: -7, right: -7, cursor: 'nwse-resize' },
};

const noForward = { shouldForwardProp: (prop: PropertyKey) => !String(prop).startsWith('$') };

const StageWrap = styled('div')({ display: 'flex', justifyContent: 'center' });
const Stage = styled('div')({
  position: 'relative',
  overflow: 'hidden',
  background: '#000',
  flexShrink: 0,
});
const Screen = styled('canvas')({ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' });
const SourceVideo = styled('video')({ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' });
const Overlay = styled('div', noForward)<{ $picking: boolean }>(({ $picking }) => ({
  position: 'absolute',
  inset: 0,
  touchAction: 'none',
  cursor: $picking ? 'crosshair' : 'default',
}));
const SlotBox = styled('div', noForward)<{ $selected: boolean; $active: boolean }>(({ $selected, $active }) => ({
  position: 'absolute',
  boxSizing: 'border-box',
  border: $selected ? `2px solid ${PURPLE}` : '2px dashed rgba(255,255,255,0.9)',
  boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
  cursor: 'move',
  opacity: $active ? 1 : 0.5,
  touchAction: 'none',
}));
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
const PaintLayer = styled('div')({
  position: 'absolute',
  inset: 0,
  cursor: 'none',
  touchAction: 'none',
});
const BrushRing = styled('div')({
  position: 'absolute',
  transform: 'translate(-50%, -50%)',
  borderRadius: '50%',
  border: '2px solid #fff',
  boxShadow: '0 0 0 1px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0.55)',
  pointerEvents: 'none',
});

export interface PaintSession {
  index: number;
  canvas: HTMLCanvasElement;
  brush: number;
  erase: boolean;
}

interface Props {
  video: CustomCollageVideo;
  videoRef: RefObject<HTMLVideoElement | null>;
  outTime: number;
  selected: number | null;
  masks: Map<string, HTMLCanvasElement>;
  painting: PaintSession | null;
  pickingColor: boolean;
  corsBlocked: boolean;
  onSelect: (index: number | null) => void;
  onSlotChange: (index: number, slot: CollageSlot) => void;
  onColorPicked: (hex: string) => void;
  onMetadata: (meta: { width: number; height: number; duration: number }) => void;
  onMediaError: () => void;
  onKeyPreviewBlocked: () => void;
  onPainted: () => void;
}

function stageSize(width: number, height: number): { w: number; h: number } {
  if (!width || !height) return { w: 270, h: 480 };
  const w = Math.min(MAX_STAGE_WIDTH, (MAX_STAGE_HEIGHT * width) / height);
  return { w: Math.round(w), h: Math.round((w * height) / width) };
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  if (!image.complete || !image.naturalWidth) return;
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

type Drag = { mode: 'move' | SlotCorner; index: number; x0: number; y0: number; base: CollageSlot; width: number; height: number };

export default function CollageStage(props: Props) {
  const {
    video, videoRef, outTime, selected, masks, painting, pickingColor, corsBlocked,
    onSelect, onSlotChange, onColorPicked, onMetadata, onMediaError, onKeyPreviewBlocked, onPainted,
  } = props;
  const screenRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const stroke = useRef<{ x: number; y: number } | null>(null);
  const [brushAt, setBrushAt] = useState<{ x: number; y: number } | null>(null);
  const { w: stageW, h: stageH } = stageSize(video.width, video.height);
  const pixelRatio = Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
  const canvasW = Math.round(stageW * pixelRatio);
  const canvasH = Math.round(stageH * pixelRatio);

  const scratch = useCallback((w: number, h: number) => {
    const canvas = scratchRef.current ?? document.createElement('canvas');
    scratchRef.current = canvas;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    return canvas;
  }, []);

  const draw = useCallback(() => {
    const screen = screenRef.current;
    const source = videoRef.current;
    if (!screen) return;
    const ctx = screen.getContext('2d', { willReadFrequently: true });
    if (!ctx || !source || source.readyState < 2) return;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(source, 0, 0, canvasW, canvasH);
    const box = (slot: CollageSlot) => [slot.x * canvasW, slot.y * canvasH, slot.w * canvasW, slot.h * canvasH] as const;
    const active = stackOrder(video.slots)
      .map((index) => ({ slot: video.slots[index], index, alpha: painting?.index === index ? 1 : slotOpacityAt(video.slots[index], outTime) }))
      .filter((s) => s.alpha > 0);
    const layerOf = (slot: CollageSlot) => slot.layer ?? 'front';

    const green = active.filter((s) => layerOf(s.slot) === 'green');
    if (green.length > 0) {
      const layer = scratch(canvasW, canvasH);
      const lctx = layer.getContext('2d', { willReadFrequently: true });
      if (lctx) {
        lctx.clearRect(0, 0, canvasW, canvasH);
        green.forEach(({ slot, index, alpha }) => {
          lctx.globalAlpha = alpha;
          drawCover(lctx, samplePhotoImage(index), ...box(slot));
        });
        lctx.globalAlpha = 1;
        try {
          const frame = ctx.getImageData(0, 0, canvasW, canvasH);
          replaceKeyColor(frame.data, lctx.getImageData(0, 0, canvasW, canvasH).data, video.keyColor ?? DEFAULT_KEY_COLOR, video.keySimilarity ?? DEFAULT_KEY_SIMILARITY);
          ctx.putImageData(frame, 0, 0);
        } catch {
          onKeyPreviewBlocked();
        }
      }
    }

    active.filter((s) => layerOf(s.slot) === 'behind').forEach(({ slot, index, alpha }) => {
      ctx.globalAlpha = alpha;
      drawCover(ctx, samplePhotoImage(index), ...box(slot));
      ctx.globalAlpha = 1;
      const mask = slot.maskUrl ? masks.get(slot.maskUrl) : undefined;
      const liveMask = painting?.index === index ? painting.canvas : mask;
      if (!liveMask) return;
      const front = scratch(canvasW, canvasH);
      const fctx = front.getContext('2d');
      if (!fctx) return;
      fctx.globalCompositeOperation = 'source-over';
      fctx.clearRect(0, 0, canvasW, canvasH);
      fctx.drawImage(source, 0, 0, canvasW, canvasH);
      fctx.globalCompositeOperation = 'destination-in';
      fctx.drawImage(liveMask, 0, 0, canvasW, canvasH);
      fctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(front, 0, 0);
    });

    active.filter((s) => layerOf(s.slot) === 'front').forEach(({ slot, index, alpha }) => {
      ctx.globalAlpha = alpha;
      drawCover(ctx, samplePhotoImage(index), ...box(slot));
    });
    ctx.globalAlpha = 1;
  }, [video, videoRef, outTime, masks, painting, canvasW, canvasH, scratch, onKeyPreviewBlocked]);

  useEffect(() => {
    draw();
    const pending = video.slots.map((_, i) => samplePhotoImage(i)).filter((image) => !image.complete);
    pending.forEach((image) => image.addEventListener('load', draw));
    return () => pending.forEach((image) => image.removeEventListener('load', draw));
  }, [draw, video.slots]);

  const paintAt = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!painting) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * painting.canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * painting.canvas.height;
    const ctx = painting.canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalCompositeOperation = painting.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = PAINT_COLOR;
    ctx.fillStyle = PAINT_COLOR;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = painting.brush;
    const from = stroke.current ?? { x, y };
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    stroke.current = { x, y };
    draw();
  };

  const pickColor = (e: ReactPointerEvent) => {
    const source = videoRef.current;
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!source || !rect) return;
    const probe = scratch(video.width || 1, video.height || 1);
    const pctx = probe.getContext('2d', { willReadFrequently: true });
    if (!pctx) return;
    try {
      pctx.drawImage(source, 0, 0, probe.width, probe.height);
      const px = Math.round(((e.clientX - rect.left) / rect.width) * (probe.width - 1));
      const py = Math.round(((e.clientY - rect.top) / rect.height) * (probe.height - 1));
      const [r, g, b] = pctx.getImageData(px, py, 1, 1).data;
      onColorPicked(rgbToHex(r, g, b));
    } catch {
      onKeyPreviewBlocked();
    }
  };

  const startBoxDrag = (e: ReactPointerEvent, index: number, mode: 'move' | SlotCorner) => {
    if (pickingColor) return;
    e.stopPropagation();
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(index);
    drag.current = { mode, index, x0: e.clientX, y0: e.clientY, base: video.slots[index], width: rect.width, height: rect.height };
  };

  const onDragMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x0) / d.width;
    const dy = (e.clientY - d.y0) / d.height;
    onSlotChange(d.index, d.mode === 'move' ? moveSlot(d.base, dx, dy) : resizeSlot(d.base, d.mode, dx, dy));
  };

  const visible = stackOrder(video.slots)
    .map((index) => ({ slot: video.slots[index], index }))
    .filter(({ slot, index }) => (slotActiveAt(slot, outTime) || index === selected) && (!painting || index === painting.index));

  return (
    <StageWrap>
      <Stage style={{ width: stageW, height: stageH }}>
        <Screen ref={screenRef} width={canvasW} height={canvasH} />
        <SourceVideo
          ref={videoRef}
          src={video.url}
          preload="auto"
          playsInline
          crossOrigin={corsBlocked ? undefined : 'anonymous'}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            onMetadata({ width: el.videoWidth, height: el.videoHeight, duration: Math.round(el.duration * 1000) / 1000 });
          }}
          onLoadedData={draw}
          onSeeked={draw}
          onTimeUpdate={draw}
          onError={onMediaError}
        />
        <Overlay
          ref={overlayRef}
          $picking={pickingColor}
          onPointerDown={(e) => {
            if (pickingColor) pickColor(e);
            else if (!painting) onSelect(null);
          }}
          onPointerMove={onDragMove}
          onPointerUp={() => { drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}
        >
          {visible.map(({ slot, index }) => {
            const editable = index === selected && !painting;
            return (
              <SlotBox
                key={index}
                $selected={index === selected}
                $active={slotActiveAt(slot, outTime)}
                onPointerDown={painting ? undefined : (e) => startBoxDrag(e, index, 'move')}
                style={{
                  left: `${slot.x * 100}%`,
                  top: `${slot.y * 100}%`,
                  width: `${slot.w * 100}%`,
                  height: `${slot.h * 100}%`,
                  pointerEvents: painting ? 'none' : undefined,
                  zIndex: index === selected ? 1 : undefined,
                }}
              >
                {editable && CORNERS.map((corner) => {
                  const { cursor, ...position } = CORNER_POSITION[corner];
                  return <Handle key={corner} style={{ ...position, cursor }} onPointerDown={(e) => startBoxDrag(e, index, corner)} />;
                })}
              </SlotBox>
            );
          })}
        </Overlay>
        {painting && (
          <PaintLayer
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              stroke.current = null;
              paintAt(e);
            }}
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setBrushAt({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              if (e.buttons) paintAt(e);
            }}
            onPointerLeave={() => setBrushAt(null)}
            onPointerUp={() => { stroke.current = null; onPainted(); }}
            onPointerCancel={() => { stroke.current = null; }}
          />
        )}
        {painting && brushAt && (
          <BrushRing
            style={{
              left: brushAt.x,
              top: brushAt.y,
              width: (painting.brush * stageW) / painting.canvas.width,
              height: (painting.brush * stageW) / painting.canvas.width,
            }}
          />
        )}
      </Stage>
    </StageWrap>
  );
}
