import { useEffect, useRef, useState } from 'react';
import { styled, keyframes } from '@mui/material/styles';

export interface LeaderboardRow {
  id: string;
  name: string;
  score: number;
  meta?: string;
  group?: string;
}

interface Props {
  rows: LeaderboardRow[];
  highlightTop?: boolean;
  emptyText: string;
}

const ROW_HEIGHT = 64;
const ROW_GAP = 8;
const ANIM_MS = 600;

const flashIn = keyframes`
  0%   { background: rgba(108,92,231,0.22); }
  100% { background: rgba(255,255,255,1); }
`;

const Frame = styled('div')<{ count: number }>(({ count }) => ({
  position: 'relative',
  width: '100%',
  height: count > 0 ? count * (ROW_HEIGHT + ROW_GAP) - ROW_GAP : ROW_HEIGHT,
  transition: `height ${ANIM_MS}ms ease`,
}));

const RowEl = styled('div')<{ y: number; flashing?: boolean }>(({ y, flashing }) => ({
  position: 'absolute',
  insetInlineStart: 0,
  insetInlineEnd: 0,
  height: ROW_HEIGHT,
  transform: `translate3d(0, ${y}px, 0)`,
  transition: `transform ${ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '0 18px',
  borderRadius: 14,
  background: '#fff',
  border: '1px solid #ece8f0',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  willChange: 'transform',
  ...(flashing && {
    animation: `${flashIn} 1.2s ease-out`,
  }),
}));

const RankBadge = styled('div')<{ top?: boolean }>(({ top }) => ({
  flexShrink: 0,
  width: 34,
  height: 34,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 800,
  fontSize: 13,
  background: top
    ? 'linear-gradient(135deg, #f5b731 0%, #c88a10 100%)'
    : '#f0eefa',
  color: top ? '#fff' : '#6c5ce7',
  boxShadow: top ? '0 2px 6px rgba(245,183,49,0.4)' : 'none',
}));

const NameBlock = styled('div')({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
});

const NameText = styled('div')({
  fontWeight: 700,
  fontSize: 15,
  color: '#222',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const MetaText = styled('div')({
  fontSize: 12,
  color: '#999',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

const GroupChip = styled('span')({
  display: 'inline-block',
  padding: '2px 8px',
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 6,
  background: '#e8f5e9',
  color: '#2e7d32',
  marginInlineStart: 6,
});

const ScoreEl = styled('div')<{ bumping?: boolean }>(({ bumping }) => ({
  flexShrink: 0,
  fontWeight: 800,
  fontSize: 20,
  color: '#6c5ce7',
  fontVariantNumeric: 'tabular-nums',
  transition: `transform 220ms ease, color 220ms ease`,
  transform: bumping ? 'scale(1.18)' : 'scale(1)',
}));

const Empty = styled('div')({
  padding: '32px 16px',
  textAlign: 'center',
  color: '#999',
  fontSize: 14,
  background: '#fff',
  borderRadius: 14,
  border: '1px solid #ece8f0',
});

export default function AnimatedLeaderboard({ rows, highlightTop = true, emptyText }: Props) {
  const prevScoreRef = useRef<Record<string, number>>({});
  const [bumping, setBumping] = useState<Record<string, boolean>>({});
  const [flashing, setFlashing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const prev = prevScoreRef.current;
    const changes: string[] = [];
    for (const r of rows) {
      if (prev[r.id] !== undefined && prev[r.id] !== r.score) {
        changes.push(r.id);
      }
    }

    if (changes.length > 0) {
      setBumping((prevBump) => {
        const next = { ...prevBump };
        for (const id of changes) next[id] = true;
        return next;
      });
      setFlashing((prevFlash) => {
        const next = { ...prevFlash };
        for (const id of changes) next[id] = (next[id] || 0) ? !next[id] : true;
        return next;
      });

      const tBump = window.setTimeout(() => {
        setBumping((prevBump) => {
          const next = { ...prevBump };
          for (const id of changes) delete next[id];
          return next;
        });
      }, 280);

      const tFlash = window.setTimeout(() => {
        setFlashing((prevFlash) => {
          const next = { ...prevFlash };
          for (const id of changes) delete next[id];
          return next;
        });
      }, 1300);

      const next: Record<string, number> = {};
      for (const r of rows) next[r.id] = r.score;
      prevScoreRef.current = next;

      return () => {
        window.clearTimeout(tBump);
        window.clearTimeout(tFlash);
      };
    }

    const next: Record<string, number> = {};
    for (const r of rows) next[r.id] = r.score;
    prevScoreRef.current = next;
  }, [rows]);

  if (rows.length === 0) {
    return <Empty>{emptyText}</Empty>;
  }

  return (
    <Frame count={rows.length}>
      {rows.map((row, index) => {
        const rank = index + 1;
        const top = highlightTop && rank <= 3;
        return (
          <RowEl
            key={row.id}
            y={index * (ROW_HEIGHT + ROW_GAP)}
            flashing={!!flashing[row.id]}
          >
            <RankBadge top={top}>{rank}</RankBadge>
            <NameBlock>
              <NameText>
                {row.name}
                {row.group && <GroupChip>{row.group}</GroupChip>}
              </NameText>
              {row.meta && <MetaText>{row.meta}</MetaText>}
            </NameBlock>
            <ScoreEl bumping={!!bumping[row.id]}>{row.score}</ScoreEl>
          </RowEl>
        );
      })}
    </Frame>
  );
}
