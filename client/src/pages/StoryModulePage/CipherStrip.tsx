import { useEffect, useRef } from 'react';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../context/LanguageContext';
import { REEL_LENGTH, cipherDirection, reelStrip, unseenSlots, type CipherSlot } from '../../utils/cipher';
import { useCipherSeen } from '../../hooks/useCipherSeen';
import { texts } from './CipherStrip.i18n';

const SPIN_MS = 1400;
const SPIN_START_MS = 700;
const SPIN_STAGGER_MS = 300;
const POP_MS = 500;
const SPIN_EASING = 'cubic-bezier(0.1, 0.75, 0.2, 1)';
const FRAME_CAP_MS = 100;

const INK = '#1d2433';
const TILE_SHADOW = '0 3px 10px rgba(0,0,0,0.22)';

const noForward = { shouldForwardProp: (prop: PropertyKey) => !String(prop).startsWith('$') };

const LAND_POP: Keyframe[] = [
  { transform: 'scale(1)', boxShadow: TILE_SHADOW },
  { transform: 'scale(1.18)', boxShadow: '0 0 0 4px rgba(255,255,255,0.45), 0 6px 18px rgba(0,0,0,0.25)', offset: 0.4 },
  { transform: 'scale(1)', boxShadow: TILE_SHADOW },
];

function afterSteadyFrames(ms: number, onReady: () => void): () => void {
  let frame = 0;
  let shown = 0;
  let last: number | null = null;
  const tick = (now: number) => {
    if (document.visibilityState === 'visible') {
      if (last !== null) shown += Math.min(now - last, FRAME_CAP_MS);
      last = now;
    } else {
      last = null;
    }
    if (shown >= ms) onReady();
    else frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

const Wrap = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 7,
  padding: '0 16px 14px',
  pointerEvents: 'none',
});

const Caption = styled('div')({
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 700,
  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
});

const Row = styled('div', noForward)<{ $gap: number }>(({ $gap }) => ({
  display: 'flex',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: $gap,
}));

interface TileSize {
  w: number;
  h: number;
  font: number;
  radius: number;
  gap: number;
}

const Tile = styled('div', noForward)<{ $size: TileSize; $filled: boolean }>(({ $size, $filled }) => ({
  position: 'relative',
  width: $size.w,
  height: $size.h,
  boxSizing: 'border-box',
  borderRadius: $size.radius,
  overflow: 'hidden',
  background: $filled ? '#ffffff' : 'rgba(255,255,255,0.28)',
  border: `1.5px solid ${$filled ? '#ffffff' : 'rgba(255,255,255,0.75)'}`,
  boxShadow: $filled ? TILE_SHADOW : '0 2px 6px rgba(0,0,0,0.12)',
  transition: 'background 0.25s ease-out',
}));

const Glyph = styled('div', noForward)<{ $h: number; $font: number }>(({ $h, $font }) => ({
  height: $h,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: $font,
  fontWeight: 800,
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
  color: INK,
}));

const HiddenGlyph = styled(Glyph)({
  color: 'rgba(255,255,255,0.95)',
  textShadow: '0 1px 3px rgba(0,0,0,0.35)',
});

function tileSize(count: number): TileSize {
  if (count <= 6) return { w: 38, h: 46, font: 26, radius: 11, gap: 8 };
  if (count <= 10) return { w: 30, h: 38, font: 21, radius: 9, gap: 6 };
  return { w: 24, h: 30, font: 16, radius: 7, gap: 5 };
}

interface Props {
  slots: CipherSlot[];
  seenKey: string;
}

export default function CipherStrip({ slots, seenKey }: Props) {
  const t = useTranslations(texts);
  const [seen, markSeen] = useCipherSeen(seenKey);
  const fresh = unseenSlots(slots, seen);
  const size = tileSize(slots.length);
  const innerHeight = size.h - 3;
  const freshKey = fresh.join(',');
  const cracked = fresh.length === 0 && slots.every((slot) => slot.revealed);
  const reels = useRef(new Map<number, HTMLDivElement>());
  const tiles = useRef(new Map<number, HTMLDivElement>());

  useEffect(() => {
    if (!freshKey) return;
    const order = freshKey.split(',').map(Number);
    const revealed = slots.filter((slot) => slot.revealed).map((slot) => slot.itemIndex);
    const reelEnd = -(REEL_LENGTH - 1) * innerHeight;
    let running: Animation[] = [];
    let stopWaiting: () => void = () => undefined;
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      markSeen(revealed);
    };
    const play = () => {
      const canAnimate = order.every((itemIndex) => typeof reels.current.get(itemIndex)?.animate === 'function');
      if (!canAnimate) {
        settle();
        return;
      }
      running = order.flatMap((itemIndex, k) => {
        const delay = k * SPIN_STAGGER_MS;
        const reel = reels.current.get(itemIndex) as HTMLDivElement;
        const spin = reel.animate(
          [{ transform: 'translateY(0)' }, { transform: `translateY(${reelEnd}px)` }],
          { duration: SPIN_MS, delay, easing: SPIN_EASING, fill: 'both' },
        );
        const pop = tiles.current.get(itemIndex)?.animate(LAND_POP, { duration: POP_MS, delay: delay + SPIN_MS - POP_MS / 3, easing: 'ease-out' });
        return pop ? [spin, pop] : [spin];
      });
      Promise.all(running.map((animation) => animation.finished)).then(settle, () => undefined);
    };
    const replayWhenShown = () => {
      running.forEach((animation) => animation.cancel());
      running = [];
      stopWaiting();
      stopWaiting = afterSteadyFrames(SPIN_START_MS, play);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && !settled) replayWhenShown();
    };
    replayWhenShown();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      settled = true;
      stopWaiting();
      running.forEach((animation) => animation.cancel());
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshKey, markSeen, innerHeight]);

  return (
    <Wrap>
      <Caption>{cracked ? t.cracked : t.caption}</Caption>
      <Row
        $gap={size.gap}
        role="img"
        aria-label={t.label(slots.map((slot) => (slot.revealed ? slot.char : '_')).join(' '))}
        style={{ direction: cipherDirection(slots) }}
      >
        {slots.map((slot) => {
          const spinning = slot.revealed && fresh.includes(slot.itemIndex);
          return (
            <Tile
              key={slot.itemIndex}
              ref={(el: HTMLDivElement | null) => {
                if (el) tiles.current.set(slot.itemIndex, el);
                else tiles.current.delete(slot.itemIndex);
              }}
              $size={size}
              $filled={slot.revealed}
            >
              {spinning ? (
                <div
                  ref={(el) => {
                    if (el) reels.current.set(slot.itemIndex, el);
                    else reels.current.delete(slot.itemIndex);
                  }}
                >
                  {reelStrip(slot.char, slot.itemIndex + 1).map((c, k) => (
                    <Glyph key={k} $h={innerHeight} $font={size.font}>{c}</Glyph>
                  ))}
                </div>
              ) : (
                slot.revealed
                  ? <Glyph $h={innerHeight} $font={size.font}>{slot.char}</Glyph>
                  : <HiddenGlyph $h={innerHeight} $font={size.font}>?</HiddenGlyph>
              )}
            </Tile>
          );
        })}
      </Row>
    </Wrap>
  );
}
