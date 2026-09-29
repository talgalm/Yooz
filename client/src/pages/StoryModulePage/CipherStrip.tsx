import { useEffect } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { useTranslations } from '../../context/LanguageContext';
import { REEL_LENGTH, cipherDirection, reelStrip, unseenSlots, type CipherSlot } from '../../utils/cipher';
import { useCipherSeen } from '../../hooks/useCipherSeen';
import { texts } from './CipherStrip.i18n';

const SPIN_MS = 1400;
const SPIN_START_MS = 700;
const SPIN_STAGGER_MS = 300;
const POP_MS = 500;

const INK = '#1d2433';
const TILE_SHADOW = '0 3px 10px rgba(0,0,0,0.22)';

const noForward = { shouldForwardProp: (prop: PropertyKey) => !String(prop).startsWith('$') };

const spin = keyframes`
  from { transform: translateY(0); }
  to { transform: translateY(var(--reel-end)); }
`;

const landPop = keyframes`
  0% { transform: scale(1); box-shadow: ${TILE_SHADOW}; }
  40% { transform: scale(1.18); box-shadow: 0 0 0 4px rgba(255,255,255,0.45), 0 6px 18px rgba(0,0,0,0.25); }
  100% { transform: scale(1); box-shadow: ${TILE_SHADOW}; }
`;

const Row = styled('div', noForward)<{ $gap: number }>(({ $gap }) => ({
  display: 'flex',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: $gap,
  padding: '2px 16px 14px',
  pointerEvents: 'none',
}));

interface TileSize {
  w: number;
  h: number;
  font: number;
  radius: number;
  gap: number;
}

const Tile = styled('div', noForward)<{ $size: TileSize; $filled: boolean; $popAt: number | null }>(({ $size, $filled, $popAt }) => ({
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
  ...($popAt !== null && { animation: `${landPop} ${POP_MS}ms ease-out ${$popAt}ms both` }),
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

const Reel = styled('div', noForward)<{ $delay: number; $end: number }>(({ $delay, $end }) => ({
  '--reel-end': `${$end}px`,
  animation: `${spin} ${SPIN_MS}ms cubic-bezier(0.1, 0.75, 0.2, 1) ${$delay}ms both`,
  willChange: 'transform',
}));

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

  useEffect(() => {
    if (!freshKey) return;
    const settleMs = SPIN_START_MS + (freshKey.split(',').length - 1) * SPIN_STAGGER_MS + SPIN_MS + POP_MS;
    const revealed = slots.filter((slot) => slot.revealed).map((slot) => slot.itemIndex);
    const timer = window.setTimeout(() => markSeen(revealed), settleMs);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshKey, markSeen]);

  return (
    <Row
      $gap={size.gap}
      role="img"
      aria-label={t.label(slots.map((slot) => (slot.revealed ? slot.char : '_')).join(' '))}
      style={{ direction: cipherDirection(slots) }}
    >
      {slots.map((slot) => {
        const freshAt = fresh.indexOf(slot.itemIndex);
        const spinDelay = SPIN_START_MS + freshAt * SPIN_STAGGER_MS;
        const spinning = slot.revealed && freshAt >= 0;
        return (
          <Tile
            key={slot.itemIndex}
            $size={size}
            $filled={slot.revealed}
            $popAt={spinning ? spinDelay + SPIN_MS - POP_MS / 3 : null}
          >
            {spinning ? (
              <Reel $delay={spinDelay} $end={-(REEL_LENGTH - 1) * innerHeight}>
                {reelStrip(slot.char, slot.itemIndex + 1).map((c, k) => (
                  <Glyph key={k} $h={innerHeight} $font={size.font}>{c}</Glyph>
                ))}
              </Reel>
            ) : (
              slot.revealed && <Glyph $h={innerHeight} $font={size.font}>{slot.char}</Glyph>
            )}
          </Tile>
        );
      })}
    </Row>
  );
}
