import { useState } from 'react';
import { styled, keyframes } from '@mui/material/styles';

const confettiFall = keyframes`
  0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
`;

const CONFETTI_COLORS = ['#ffca28', '#ff7043', '#66bb6a', '#42a5f5', '#ab47bc', '#26c6da', '#ffa726', '#ec407a'];

const ConfettiContainer = styled('div')({
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 1100,
  overflow: 'hidden',
});

const ConfettiPiece = styled('div')<{ x: number; sz: number; color: string; rot: number; dur: number; del: number }>(
  ({ x, sz, color, rot, dur, del }) => ({
    position: 'absolute',
    left: `${x}%`,
    top: -20,
    width: sz,
    height: sz * 0.6,
    background: color,
    borderRadius: 2,
    opacity: 0.9,
    transform: `rotate(${rot}deg)`,
    animation: `${confettiFall} ${dur}s ease-in ${del}s both`,
  }),
);

export default function ConfettiOverlay() {
  const [pieces] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      sz: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rot: Math.random() * 360,
      dur: 2.5 + Math.random() * 2,
      del: Math.random() * 2,
    }))
  );
  return (
    <ConfettiContainer>
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} x={p.x} sz={p.sz} color={p.color} rot={p.rot} dur={p.dur} del={p.del} />
      ))}
    </ConfettiContainer>
  );
}
