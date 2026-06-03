/**
 * StationStage — desktop layout wrapper for participant stations and games.
 *
 * On mobile (< 768px) it's a no-op pass-through so phones see the original
 * column layout untouched. On desktop it centers the station content in a
 * single readable "stage": capped width with auto side margins, no horizontal
 * scroll, and just enough top padding to clear the floating session header.
 *
 * The themed background (NatureBackground / OceanBackground / etc.) keeps
 * filling 100vw outside the stage, so the picture frame around the content
 * stays consistent. The fixed-position buttons most stations render at the
 * bottom (StationContinueButton with `position: fixed; left: 50%`) are
 * unaffected — they remain centered to the viewport, which is what we want.
 *
 * Why a wrapper and not breakpoints on each station? Two reasons:
 *  1. We need one canonical desktop column width so every screen lines up.
 *  2. Most stations were styled for a 480px column. Touching every styled
 *     component to add desktop branches would be noisy and error-prone.
 *     This wrapper changes layout, not content sizing — keeping the diff
 *     small and the behaviour predictable.
 */

import { styled } from '@mui/material/styles';
import type { CSSProperties, ReactNode } from 'react';

const DESKTOP = '@media (min-width: 768px)';

const Stage = styled('div')({
  // Mobile: pass-through. The station's existing flex/scroll behavior wins.
  display: 'contents',
  [DESKTOP]: {
    // Desktop: become a real flex column that centers a capped-width content
    // block. `display:flex` overrides `display:contents`.
    display: 'flex',
    flex: 1,
    minHeight: 0,
    flexDirection: 'column',
    width: 'min(900px, 92vw)',
    marginInline: 'auto',
  },
});

export interface StationStageProps {
  children: ReactNode;
  /** Optional inline override (e.g. wider for games that need it). */
  style?: CSSProperties;
  /** Override the desktop max-width. Default: 900px (capped at 92vw). */
  maxWidth?: number | string;
}

export function StationStage({ children, style, maxWidth }: StationStageProps) {
  const inlineStyle: CSSProperties = {
    ...(style || {}),
    ...(maxWidth != null ? { width: `min(${typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth}, 92vw)` } : {}),
  };
  return <Stage style={inlineStyle}>{children}</Stage>;
}
