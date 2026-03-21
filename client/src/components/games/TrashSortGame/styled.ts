import { styled, keyframes } from '@mui/material/styles';

const correctFlash = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.6); }
  50% { box-shadow: 0 0 20px 8px rgba(46, 204, 113, 0.4); }
  100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
`;

const wrongFlash = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.6); }
  50% { box-shadow: 0 0 20px 8px rgba(231, 76, 60, 0.4); }
  100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
`;

const countdownPulse = keyframes`
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

export const SortContainer = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
  userSelect: 'none',
  touchAction: 'none',
});

export const TutorialScreen = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 20,
  padding: '24px 20px',
  textAlign: 'center',
});

export const TutorialTitle = styled('h2')({
  fontWeight: 900,
  fontSize: 28,
  color: '#fff',
  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
  margin: 0,
});

export const TutorialPanel = styled('div')({
  background: 'rgba(0, 30, 60, 0.7)',
  border: '1.5px solid rgba(0, 220, 255, 0.25)',
  borderRadius: 12,
  padding: '20px 24px',
  backdropFilter: 'blur(8px)',
});

export const TutorialText = styled('p')({
  fontSize: 17,
  lineHeight: 1.7,
  color: '#c8e6ff',
  margin: 0,
});

export const TutorialButton = styled('button')({
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

export const CountdownOverlay = styled('div')({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.6)',
  zIndex: 100,
});

export const CountdownNumber = styled('span')({
  fontWeight: 900,
  fontSize: 80,
  color: '#1fd5c8',
  textShadow: '0 4px 20px rgba(0,220,255,0.5)',
  animation: `${countdownPulse} 0.8s ease-out`,
});

export const GameArea = styled('div')({
  flex: 1,
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
});

export const TopSection = styled('div')({
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  padding: '8px 16px',
  gap: 12,
});

export const ScoreDisplay = styled('span')({
  fontWeight: 800,
  fontSize: 18,
  color: '#fff',
  textShadow: '0 1px 3px rgba(0,0,0,0.3)',
});

export const FunnelArea = styled('div')({
  height: 100,
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(180deg, rgba(200,170,140,0.4) 0%, rgba(200,170,140,0.1) 100%)',
  borderRadius: '0 0 40% 40%',
  margin: '0 40px',
  overflow: 'visible',
});

export const FunnelItemsPreview = styled('div')({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  justifyContent: 'center',
  padding: 8,
});

export const FunnelItemIcon = styled('img')({
  width: 28,
  height: 28,
  objectFit: 'contain',
  opacity: 0.8,
});

export const DropZone = styled('div')({
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
});

export const FallingItem = styled('div')<{ isDragging?: boolean }>(({ isDragging }) => ({
  position: 'absolute',
  width: 60,
  height: 60,
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: isDragging ? 'grabbing' : 'grab',
  zIndex: isDragging ? 100 : 10,
  transform: isDragging ? 'scale(1.15)' : 'scale(1)',
  transition: isDragging ? 'none' : 'transform 0.15s',
  filter: isDragging ? 'drop-shadow(0 6px 16px rgba(0,0,0,0.4))' : 'none',
}));

export const FallingItemImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'contain',
});

export const BinsRow = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  gap: 12,
  padding: '8px 16px 16px',
});

export const Bin = styled('div')<{ binColor: string; flash?: 'correct' | 'wrong' | null }>(
  ({ binColor, flash }) => ({
    flex: 1,
    maxWidth: 110,
    height: 100,
    borderRadius: 14,
    background: binColor,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    border: '3px solid rgba(0,0,0,0.2)',
    boxShadow: '0 4px 0 rgba(0,0,0,0.2)',
    position: 'relative',
    ...(flash === 'correct' && { animation: `${correctFlash} 0.5s ease-out` }),
    ...(flash === 'wrong' && { animation: `${wrongFlash} 0.5s ease-out` }),
  })
);

export const BinIcon = styled('img')({
  width: 32,
  height: 32,
  objectFit: 'contain',
});

export const BinLabel = styled('span')({
  fontWeight: 800,
  fontSize: 13,
  color: '#fff',
  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
});

export const FinishScreen = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 20,
  padding: '20px 24px',
  textAlign: 'center',
});

export const FinishTitle = styled('h2')({
  fontWeight: 900,
  fontSize: 28,
  color: '#fff',
  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
  margin: 0,
});

export const FinishDesc = styled('p')({
  fontSize: 16,
  color: '#c8e6ff',
  margin: 0,
});

export const FinishScore = styled('div')({
  fontWeight: 900,
  fontSize: 36,
  color: '#1fd5c8',
  textShadow: '0 2px 8px rgba(0,0,0,0.3)',
});
