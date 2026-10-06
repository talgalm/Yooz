import type { ReactNode } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import {
  DEFAULT_KEY_COLOR,
  DEFAULT_KEY_SIMILARITY,
  FREEZE_MAX_SECONDS,
  FREEZE_MIN_SECONDS,
  KEY_SIMILARITY_MAX,
  KEY_SIMILARITY_MIN,
  formatShort,
  slotFit,
  type CollageSlot,
  type CustomCollageVideo,
  type SlotLayer,
} from '../../../utils/collageVideo';
import { sampleColor } from '../../../utils/collageSamples';
import type { PaintSession } from './CollageStage';
import {
  BrushIcon,
  CenterIcon,
  EraserIcon,
  FullFrameIcon,
  LayerBehindIcon,
  LayerFrontIcon,
  LayerGreenIcon,
  PipetteIcon,
  PlusIcon,
  SnowflakeIcon,
  TrashIcon,
} from './CollageEditor.icons';
import { texts } from './CollageEditor.i18n';

const PURPLE = '#6C5CE7';
const INK = '#2d2540';
const MUTED = '#8a83a3';
const LINE = '#ebe7f5';

const noForward = { shouldForwardProp: (prop: PropertyKey) => !String(prop).startsWith('$') };

const Panel = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  background: '#fff',
  border: `1px solid ${LINE}`,
  borderRadius: 14,
  overflow: 'hidden',
  minWidth: 0,
});
const Header = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '14px 16px',
  borderBottom: `1px solid ${LINE}`,
});
const HeaderTitle = styled('div')({ fontSize: 15, fontWeight: 800, color: INK, flex: 1, minWidth: 0 });
const Chip = styled('span')({
  padding: '3px 9px',
  borderRadius: 999,
  background: '#f1eefb',
  color: '#5b4fc4',
  fontSize: 12,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
});
const Section = styled('div')({ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${LINE}`, '&:last-of-type': { borderBottom: 'none' } });
const SectionTitle = styled('div')({ fontSize: 11.5, fontWeight: 800, color: MUTED, letterSpacing: '0.04em' });
const Hint = styled('div')({ fontSize: 12.5, color: MUTED, lineHeight: 1.45 });
const Dot = styled('span', noForward)<{ $color: string }>(({ $color }) => ({ width: 14, height: 14, borderRadius: '50%', background: $color, flexShrink: 0 }));
const IconButton = styled('button', noForward)<{ $danger?: boolean }>(({ $danger }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 32,
  minWidth: 32,
  padding: '0 10px',
  borderRadius: 8,
  border: `1px solid ${$danger ? '#f3cfca' : LINE}`,
  background: '#fff',
  color: $danger ? '#c0392b' : INK,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  '&:hover': { background: $danger ? '#fdf2f1' : '#f7f5fd' },
  '&:disabled': { opacity: 0.45, cursor: 'default' },
}));
const PrimaryButton = styled('button')({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 38,
  padding: '0 16px',
  borderRadius: 10,
  border: 'none',
  background: PURPLE,
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  '&:disabled': { opacity: 0.45, cursor: 'default' },
});
const TimeGrid = styled('div')({ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 });
const Field = styled('label')({ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 700, color: MUTED });
const FieldRow = styled('div')({ display: 'flex', alignItems: 'center', gap: 6 });
const NumberInput = styled('input')({
  width: '100%',
  minWidth: 0,
  height: 34,
  padding: '0 10px',
  boxSizing: 'border-box',
  border: `1px solid #dfdaee`,
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  color: INK,
  fontFamily: 'inherit',
  fontVariantNumeric: 'tabular-nums',
  direction: 'ltr',
  '&:focus': { outline: 'none', borderColor: PURPLE, boxShadow: '0 0 0 3px rgba(108,92,231,0.15)' },
});
const LinkButton = styled('button')({
  border: 'none',
  background: 'none',
  padding: '0 2px',
  color: PURPLE,
  fontSize: 12,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});
const ButtonRow = styled('div')({ display: 'flex', gap: 8, flexWrap: 'wrap' });
const LayerOption = styled('button', noForward)<{ $active: boolean }>(({ $active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: `1.5px solid ${$active ? PURPLE : LINE}`,
  background: $active ? '#f5f2ff' : '#fff',
  color: INK,
  textAlign: 'start',
  fontFamily: 'inherit',
  cursor: 'pointer',
  '&:hover': { borderColor: $active ? PURPLE : '#d6d0ea' },
}));
const LayerIcon = styled('span', noForward)<{ $active: boolean }>(({ $active }) => ({
  width: 36,
  height: 36,
  flexShrink: 0,
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: $active ? PURPLE : '#f1eefb',
  color: $active ? '#fff' : '#6b5fd6',
}));
const LayerText = styled('span')({ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 });
const LayerName = styled('span')({ fontSize: 13.5, fontWeight: 800 });
const LayerDesc = styled('span')({ fontSize: 12, color: MUTED });
const LayerExtra = styled('div')({ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 12px 4px', marginTop: -4 });
const Status = styled('span', noForward)<{ $ok: boolean }>(({ $ok }) => ({ fontSize: 12.5, fontWeight: 700, color: $ok ? '#188038' : '#b26a00' }));
const Swatch = styled('input')({ width: 34, height: 34, padding: 0, border: `1px solid ${LINE}`, borderRadius: 8, background: 'none', cursor: 'pointer' });
const Range = styled('input')({ flex: 1, accentColor: PURPLE });
const FreezeItem = styled('div')({ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: INK });
const Unit = styled('span')({ fontSize: 12.5, color: MUTED, fontWeight: 600 });
const FreezeBadge = styled('span')({ display: 'inline-flex', width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', background: '#e3f7fb', color: '#0891b2', flexShrink: 0 });
const Fit = styled('div', noForward)<{ $tone: 'good' | 'warn' | 'muted' }>(({ $tone }) => ({
  fontSize: 12.5,
  fontWeight: 700,
  padding: '8px 10px',
  borderRadius: 10,
  background: $tone === 'good' ? '#e8f5ec' : $tone === 'warn' ? '#fff5e6' : '#f8f7fc',
  color: $tone === 'good' ? '#188038' : $tone === 'warn' ? '#a35c00' : MUTED,
}));
const Segmented = styled('div')({ display: 'flex', padding: 3, borderRadius: 10, background: '#f1eefb', gap: 3 });
const SegmentButton = styled('button', noForward)<{ $active: boolean }>(({ $active }) => ({
  flex: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 32,
  borderRadius: 8,
  border: 'none',
  background: $active ? '#fff' : 'transparent',
  boxShadow: $active ? '0 1px 3px rgba(45,37,64,0.18)' : 'none',
  color: $active ? INK : '#6b6580',
  fontSize: 13,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
}));
const Failure = styled('div')({ fontSize: 12.5, fontWeight: 700, color: '#c0392b' });

interface Props {
  video: CustomCollageVideo;
  total: number;
  outTime: number;
  photoCount: number;
  selected: number | null;
  painting: PaintSession | null;
  savingMask: boolean;
  maskError: boolean;
  pickingColor: boolean;
  keyPreviewBlocked: boolean;
  canAddSlot: boolean;
  canFreeze: boolean;
  onSlotChange: (index: number, slot: CollageSlot) => void;
  onSetTime: (index: number, which: 'start' | 'end', seconds: number) => void;
  onRemove: (index: number) => void;
  onSetLayer: (index: number, layer: SlotLayer) => void;
  onStartPainting: (index: number) => void;
  onPaintChange: (session: PaintSession) => void;
  onClearMask: () => void;
  onCancelPaint: () => void;
  onSaveMask: () => void;
  onVideoChange: (video: CustomCollageVideo) => void;
  onTogglePick: () => void;
  onAddSlot: () => void;
  onAddFreeze: () => void;
  onFreezeHold: (index: number, seconds: number) => void;
  onFreezeRemove: (index: number) => void;
}

export default function CollageInspector(props: Props) {
  const t = useTranslations(texts);
  const { video, total, outTime, photoCount, selected, painting } = props;

  if (painting) {
    return (
      <Panel>
        <Header><HeaderTitle>{t.paintTitle(painting.index + 1)}</HeaderTitle></Header>
        <Section>
          <Segmented>
            <SegmentButton type="button" $active={!painting.erase} onClick={() => props.onPaintChange({ ...painting, erase: false })}>
              <EraserIcon />{t.eraseTool}
            </SegmentButton>
            <SegmentButton type="button" $active={painting.erase} onClick={() => props.onPaintChange({ ...painting, erase: true })}>
              <BrushIcon />{t.restoreTool}
            </SegmentButton>
          </Segmented>
          <Field as="div">
            {t.brushSize}
            <FieldRow>
              <Range type="range" min={6} max={120} value={painting.brush} onChange={(e) => props.onPaintChange({ ...painting, brush: Number(e.target.value) })} />
              <Chip>{painting.brush}</Chip>
            </FieldRow>
          </Field>
          <ButtonRow>
            <IconButton type="button" onClick={props.onClearMask}>{t.restoreAll}</IconButton>
          </ButtonRow>
        </Section>
        <Section>
          <ButtonRow>
            <PrimaryButton type="button" onClick={props.onSaveMask} disabled={props.savingMask} style={{ flex: 1 }}>
              {props.savingMask ? t.savingMask : t.saveMask}
            </PrimaryButton>
            <IconButton type="button" onClick={props.onCancelPaint} style={{ height: 38 }}>{t.cancel}</IconButton>
          </ButtonRow>
          {props.maskError && <Failure>{t.maskSaveFailed}</Failure>}
        </Section>
      </Panel>
    );
  }

  const slot = selected !== null ? video.slots[selected] : undefined;
  if (slot && selected !== null) {
    const layer = slot.layer ?? 'front';
    const option = (value: SlotLayer, icon: ReactNode, name: string, desc: string, extra?: ReactNode) => (
      <div key={value}>
        <LayerOption type="button" $active={layer === value} onClick={() => props.onSetLayer(selected, value)}>
          <LayerIcon $active={layer === value}>{icon}</LayerIcon>
          <LayerText><LayerName>{name}</LayerName><LayerDesc>{desc}</LayerDesc></LayerText>
        </LayerOption>
        {layer === value && extra && <LayerExtra>{extra}</LayerExtra>}
      </div>
    );
    return (
      <Panel>
        <Header>
          <Dot $color={sampleColor(selected)} />
          <HeaderTitle>{t.slot(selected + 1)}</HeaderTitle>
          <Chip>{t.secondsShort((slot.endSec - slot.startSec).toFixed(1))}</Chip>
          <IconButton type="button" $danger onClick={() => props.onRemove(selected)} aria-label={t.deletePhoto}>
            <TrashIcon />
          </IconButton>
        </Header>
        <Section>
          <SectionTitle>{t.when}</SectionTitle>
          <TimeGrid>
            {(['start', 'end'] as const).map((which) => (
              <Field key={which}>
                <FieldRow style={{ justifyContent: 'space-between' }}>
                  {which === 'start' ? t.from : t.to}
                  <LinkButton type="button" onClick={(e) => { e.preventDefault(); props.onSetTime(selected, which, outTime); }}>{t.now}</LinkButton>
                </FieldRow>
                <NumberInput
                  type="number"
                  step="any"
                  min={0}
                  max={total}
                  value={Math.round((which === 'start' ? slot.startSec : slot.endSec) * 100) / 100}
                  onChange={(e) => props.onSetTime(selected, which, Number(e.target.value) || 0)}
                />
              </Field>
            ))}
          </TimeGrid>
        </Section>
        <Section>
          <SectionTitle>{t.where}</SectionTitle>
          <ButtonRow>
            <IconButton type="button" onClick={() => props.onSlotChange(selected, { ...slot, x: 0, y: 0, w: 1, h: 1 })}>
              <FullFrameIcon />{t.fullFrame}
            </IconButton>
            <IconButton type="button" onClick={() => props.onSlotChange(selected, { ...slot, x: (1 - slot.w) / 2, y: (1 - slot.h) / 2 })}>
              <CenterIcon />{t.center}
            </IconButton>
          </ButtonRow>
        </Section>
        <Section>
          <SectionTitle>{t.layer}</SectionTitle>
          {option('front', <LayerFrontIcon />, t.layerFront, t.layerFrontDesc)}
          {option('behind', <LayerBehindIcon />, t.layerBehind, t.layerBehindDesc, (
            <FieldRow style={{ justifyContent: 'space-between' }}>
              <Status $ok={!!slot.maskUrl}>{slot.maskUrl ? t.maskReady : t.maskMissing}</Status>
              <IconButton type="button" onClick={() => props.onStartPainting(selected)}>
                <EraserIcon />{slot.maskUrl ? t.editMask : t.paintMask}
              </IconButton>
            </FieldRow>
          ))}
          {option('green', <LayerGreenIcon />, t.layerGreen, t.layerGreenDesc, (
            <>
              <FieldRow>
                <Swatch type="color" value={video.keyColor ?? DEFAULT_KEY_COLOR} onChange={(e) => props.onVideoChange({ ...video, keyColor: e.target.value })} aria-label={t.keyColor} />
                <IconButton type="button" onClick={props.onTogglePick} style={props.pickingColor ? { borderColor: PURPLE, color: PURPLE } : undefined}>
                  <PipetteIcon />{props.pickingColor ? t.pickingColor : t.pickColor}
                </IconButton>
              </FieldRow>
              <Field as="div">
                {t.keySensitivity}
                <Range
                  type="range"
                  min={KEY_SIMILARITY_MIN}
                  max={KEY_SIMILARITY_MAX}
                  step={0.01}
                  value={video.keySimilarity ?? DEFAULT_KEY_SIMILARITY}
                  onChange={(e) => props.onVideoChange({ ...video, keySimilarity: Number(e.target.value) })}
                />
              </Field>
              {props.keyPreviewBlocked && <Hint>{t.keyPreviewBlocked}</Hint>}
            </>
          ))}
        </Section>
      </Panel>
    );
  }

  const fit = slotFit(photoCount, video.slots.length);
  const freezes = video.freezes ?? [];
  return (
    <Panel>
      <Header><HeaderTitle>{t.videoPanel}</HeaderTitle></Header>
      <Section>
        <SectionTitle>{t.photosTitle}</SectionTitle>
        <Fit $tone={fit === 'match' ? 'good' : fit === 'none' ? 'muted' : 'warn'}>
          {fit === 'match' ? t.fitMatch(photoCount) : fit === 'reuse' ? t.fitReuse(photoCount, video.slots.length) : fit === 'unused' ? t.fitUnused(photoCount, video.slots.length) : t.fitNone}
        </Fit>
        <PrimaryButton type="button" onClick={props.onAddSlot} disabled={!props.canAddSlot}>
          <PlusIcon />{t.addPhotoHere}
        </PrimaryButton>
      </Section>
      <Section>
        <SectionTitle>{t.freezesTitle}</SectionTitle>
        {freezes.map((freeze, index) => (
          <FreezeItem key={`${freeze.atSec}-${index}`}>
            <FreezeBadge><SnowflakeIcon /></FreezeBadge>
            <span style={{ flex: 1 }}>{t.freezeRow(formatShort(freeze.atSec))}</span>
            <NumberInput
              type="number"
              step="any"
              min={FREEZE_MIN_SECONDS}
              max={FREEZE_MAX_SECONDS}
              value={freeze.holdSec}
              onChange={(e) => props.onFreezeHold(index, Number(e.target.value) || FREEZE_MIN_SECONDS)}
              style={{ width: 64 }}
              aria-label={t.secondsShort('')}
            />
            <Unit>{t.secondsUnit}</Unit>
            <IconButton type="button" $danger onClick={() => props.onFreezeRemove(index)} aria-label={t.deletePhoto}><TrashIcon /></IconButton>
          </FreezeItem>
        ))}
        <IconButton type="button" onClick={props.onAddFreeze} disabled={!props.canFreeze} style={{ alignSelf: 'flex-start' }}>
          <SnowflakeIcon />{t.freezeHere}
        </IconButton>
      </Section>
    </Panel>
  );
}
