import { styled, keyframes } from '@mui/material/styles';

const scanlineMove = keyframes`
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
`;

const blinkGlow = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

export const SpyFrame = styled('div')({
  position: 'relative',
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  background: 'linear-gradient(180deg, #0a1628 0%, #0f2038 30%, #0c1a30 70%, #081020 100%)',
  overflow: 'hidden',
  color: '#e0f0ff',
  fontFamily: 'inherit',
});

export const SpyContent = styled('div')({
  position: 'relative',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  zIndex: 2,
});

const cornerBase = {
  position: 'absolute' as const,
  width: 28,
  height: 28,
  zIndex: 10,
  pointerEvents: 'none' as const,
};

const cornerBorder = '2.5px solid rgba(0, 220, 255, 0.7)';

export const CornerTL = styled('div')({
  ...cornerBase,
  top: 8,
  left: 8,
  borderTop: cornerBorder,
  borderLeft: cornerBorder,
});

export const CornerTR = styled('div')({
  ...cornerBase,
  top: 8,
  right: 8,
  borderTop: cornerBorder,
  borderRight: cornerBorder,
});

export const CornerBL = styled('div')({
  ...cornerBase,
  bottom: 8,
  left: 8,
  borderBottom: cornerBorder,
  borderLeft: cornerBorder,
});

export const CornerBR = styled('div')({
  ...cornerBase,
  bottom: 8,
  right: 8,
  borderBottom: cornerBorder,
  borderRight: cornerBorder,
});

export const HudOverlay = styled('div')({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 5,
  pointerEvents: 'none',
  display: 'flex',
  justifyContent: 'space-between',
  padding: '14px 16px',
});

export const HudText = styled('span')({
  fontFamily: '"Courier New", monospace',
  fontSize: 11,
  color: 'rgba(0, 220, 255, 0.5)',
  letterSpacing: 1,
  textTransform: 'uppercase',
});

export const HudRow = styled('div')({
  display: 'flex',
  gap: 12,
  alignItems: 'center',
});

export const Scanline = styled('div')({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 2,
  background: 'linear-gradient(90deg, transparent, rgba(0,220,255,0.15), transparent)',
  zIndex: 3,
  pointerEvents: 'none',
  animation: `${scanlineMove} 6s linear infinite`,
});

export const SpyButton = styled('button')({
  background: 'linear-gradient(180deg, #1fd5c8 0%, #0ea89e 100%)',
  color: '#fff',
  fontSize: 18,
  fontWeight: 800,
  padding: '14px 32px',
  borderRadius: 12,
  border: '2px solid rgba(0,220,255,0.3)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 4px 0 #087a72, 0 6px 20px rgba(0,0,0,0.4)',
  transition: 'all 0.1s ease',
  width: '100%',
  maxWidth: 320,
  '&:active': {
    transform: 'translateY(3px)',
    boxShadow: '0 1px 0 #087a72',
  },
});

export const SpyPanel = styled('div')({
  background: 'rgba(0, 30, 60, 0.7)',
  border: '1.5px solid rgba(0, 220, 255, 0.25)',
  borderRadius: 12,
  padding: '20px 24px',
  backdropFilter: 'blur(8px)',
  color: '#e0f0ff',
});

export const SpyTitle = styled('h2')({
  fontWeight: 900,
  fontSize: 28,
  textAlign: 'center',
  color: '#fff',
  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
  margin: '0 0 12px',
});

export const SpyBodyText = styled('p')({
  fontSize: 17,
  lineHeight: 1.7,
  textAlign: 'center',
  color: '#c8e6ff',
  margin: 0,
});

export const BatteryIcon = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  animation: `${blinkGlow} 3s ease-in-out infinite`,
});

export const BatteryBody = styled('div')({
  width: 22,
  height: 12,
  border: '1.5px solid rgba(0, 220, 255, 0.6)',
  borderRadius: 2,
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 2,
    left: 2,
    right: 4,
    bottom: 2,
    background: 'rgba(0, 220, 255, 0.5)',
    borderRadius: 1,
  },
});

export const BatteryTip = styled('div')({
  width: 3,
  height: 6,
  background: 'rgba(0, 220, 255, 0.6)',
  borderRadius: '0 1px 1px 0',
});
