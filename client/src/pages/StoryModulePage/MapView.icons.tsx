export function CompassNeedle({ rotation }: { rotation: number }) {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s ease-out' }}>
      <path d="M13 2 L17.5 13 L8.5 13 Z" fill="#e53935" />
      <path d="M13 24 L8.5 13 L17.5 13 Z" fill="#cfd8dc" />
      <circle cx="13" cy="13" r="1.6" fill="#ffffff" />
    </svg>
  );
}

export function LocateArrow({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2 L20 21 L12 16.5 L4 21 Z" fill={color} />
    </svg>
  );
}

const DIRECTION_TURN = { up: 0, right: 90, down: 180, left: 270 } as const;

export function DirectionArrow({ direction, size }: { direction: keyof typeof DIRECTION_TURN; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ transform: `rotate(${DIRECTION_TURN[direction]}deg)` }}>
      <path d="M12 20.5 V4.5 M5 11.5 L12 4.5 L19 11.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
