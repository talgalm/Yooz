
import { styled } from '@mui/material/styles';
import type { CSSProperties, ReactNode } from 'react';

import { DESKTOP_BREAKPOINT, DESKTOP_STATION_WIDTH } from './games/styled';

const Stage = styled('div')({
  display: 'contents',
  [DESKTOP_BREAKPOINT]: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    flexDirection: 'column',
    width: DESKTOP_STATION_WIDTH,
    marginInline: 'auto',
  },
});

export interface StationStageProps {
  children: ReactNode;
  style?: CSSProperties;
  maxWidth?: number | string;
}

export function StationStage({ children, style, maxWidth }: StationStageProps) {
  const inlineStyle: CSSProperties = {
    ...(style || {}),
    ...(maxWidth != null ? { width: `min(${typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth}, 92vw)` } : {}),
  };
  return <Stage style={inlineStyle}>{children}</Stage>;
}
