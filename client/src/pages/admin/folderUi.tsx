import { styled } from '@mui/material/styles';
import type { CSSProperties } from 'react';

// Shared presentational pieces for the folder feature (activities + stations tabs).
// Logic (drag/drop, state) is kept per-component per the codebase's copy-paste convention;
// only these pure visual helpers are shared.

export interface Folder {
  _id: string;
  name: string;
  color: string;
  createdByEmail?: string;
  order?: number;
  createdAt?: string;
}

export const HeaderButtons = styled('div')({
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
});

export const FolderNameWrap = styled('div')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
  lineHeight: 1,
});

export const Breadcrumb = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 12,
  fontSize: 14,
  flexWrap: 'wrap',
});

export const BreadcrumbLink = styled('button')<{ dragOver?: boolean }>(({ dragOver }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: dragOver ? '#efeafd' : 'transparent',
  border: dragOver ? '1.5px dashed #6c5ce7' : '1.5px solid transparent',
  color: '#6c5ce7',
  fontWeight: 600,
  fontSize: 14,
  fontFamily: 'inherit',
  cursor: 'pointer',
  padding: '6px 10px',
  borderRadius: 10,
  transition: 'background 0.15s',
  '&:hover': { background: '#f2effc' },
}));

export const BreadcrumbCurrent = styled('span')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontWeight: 700,
  color: '#333',
});

export const BreadcrumbSep = styled('span')({
  color: '#bbb',
});

export const DragGhost = styled('div')({
  position: 'fixed',
  zIndex: 2000,
  pointerEvents: 'none',
  transform: 'translate(-50%, -130%)',
  background: '#fff',
  border: '1.5px solid #6c5ce7',
  borderRadius: 10,
  padding: '8px 14px',
  fontSize: 14,
  fontWeight: 700,
  color: '#333',
  boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
  maxWidth: 260,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  touchAction: 'none',
});

export function FolderGlyph({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
    </svg>
  );
}

// Suppress text-selection / iOS long-press callout so press-and-hold starts a clean drag;
// dim the row while it is being lifted.
export function dragRowStyle(dragging: boolean): CSSProperties {
  return {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    ...(dragging ? { opacity: 0.45 } : null),
  };
}

// Fixed-position coords for a row action menu, computed from its anchor button's viewport
// rect. Opens downward, flipping up when there isn't room below (so bottom rows aren't clipped
// by an overflow:hidden container).
const ACTION_MENU_EST_HEIGHT = 170;
export function actionMenuStyle(rect: DOMRect | null): CSSProperties {
  if (!rect) return { visibility: 'hidden' };
  const openUp = rect.bottom + ACTION_MENU_EST_HEIGHT > window.innerHeight && rect.top > ACTION_MENU_EST_HEIGHT;
  return {
    left: rect.left,
    insetInlineEnd: 'auto',
    ...(openUp
      ? { bottom: window.innerHeight - rect.top + 6, top: 'auto' }
      : { top: rect.bottom + 6 }),
  };
}
