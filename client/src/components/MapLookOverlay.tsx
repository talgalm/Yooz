import { styled } from '@mui/material/styles';
import type { MapOverlayKind } from '../utils/mapDesign';
import { OVERLAY_LAYERS } from '../utils/mapLookLayer';

const Layer = styled('div', { shouldForwardProp: (prop) => !String(prop).startsWith('$') })<{ $kind: MapOverlayKind }>(({ $kind: kind }) => ({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 1,
  mixBlendMode: OVERLAY_LAYERS[kind].blend,
  backgroundImage: OVERLAY_LAYERS[kind].background,
  backgroundSize: OVERLAY_LAYERS[kind].size,
  opacity: OVERLAY_LAYERS[kind].opacity,
}));

export default function MapLookOverlay({ kind }: { kind?: MapOverlayKind }) {
  if (!kind) return null;
  return <Layer $kind={kind} aria-hidden />;
}
