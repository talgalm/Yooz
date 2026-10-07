interface IconProps {
  size?: number;
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function PlayIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.87l10.4-6.5a1 1 0 0 0 0-1.74L9.5 4.63A1 1 0 0 0 8 5.5Z" fill="currentColor" />
    </svg>
  );
}

export function PauseIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <rect x="6" y="5" width="4.5" height="14" rx="1.2" fill="currentColor" />
      <rect x="13.5" y="5" width="4.5" height="14" rx="1.2" fill="currentColor" />
    </svg>
  );
}

export function PlusIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M12 5v14M5 12h14" {...stroke} strokeWidth={2.4} />
    </svg>
  );
}

export function SnowflakeIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M12 2v20M4.2 6.5l15.6 11M4.2 17.5l15.6-11M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5" {...stroke} />
    </svg>
  );
}

export function TrashIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" {...stroke} />
    </svg>
  );
}

export function LayerFrontIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <rect x="3" y="7" width="13" height="13" rx="2" {...stroke} opacity="0.45" />
      <rect x="8" y="3" width="13" height="13" rx="2" fill="currentColor" />
    </svg>
  );
}

export function LayerBehindIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <rect x="8" y="3" width="13" height="13" rx="2" fill="currentColor" opacity="0.4" />
      <path d="M3 21V9a2 2 0 0 1 2-2h5v14Z" fill="currentColor" />
    </svg>
  );
}

export function LayerGreenIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="3" {...stroke} />
      <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export function BrushIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M14.5 4.5l5 5L11 18H6v-5Z" {...stroke} />
      <path d="M12.5 6.5l5 5" {...stroke} />
    </svg>
  );
}

export function EraserIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M8 20h12M5.5 14.5l8-8a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L12 18H8.8Z" {...stroke} />
    </svg>
  );
}

export function PipetteIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M14 6.5l3.5 3.5M5 19l1-4 8.5-8.5 3.5 3.5L9.5 18.5Z" {...stroke} />
      <path d="M16 4.5a2 2 0 0 1 3.5 3.5L18 9.5 14.5 6Z" fill="currentColor" />
    </svg>
  );
}

export function SwapIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" {...stroke} />
    </svg>
  );
}

export function SwapRowsIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M8 20V5l-3.5 3.5M16 4v15l3.5-3.5" {...stroke} />
    </svg>
  );
}

export function FullFrameIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" {...stroke} />
    </svg>
  );
}

export function CenterIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable="false">
      <rect x="7" y="7" width="10" height="10" rx="1.5" {...stroke} />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" {...stroke} />
    </svg>
  );
}
