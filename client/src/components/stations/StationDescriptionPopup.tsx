import { useState } from 'react';
import { styled, keyframes } from '@mui/material/styles';

const FRAME_BORDER = '#2c1537';
const GUIDELINES_PURPLE = '#632e7d';
const GUIDELINES_BORDER = '#9248a3';

const overlayIn = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

const overlayOut = keyframes`
  0% { opacity: 1; }
  100% { opacity: 0; }
`;

const popIn = keyframes`
  0% { opacity: 0; transform: scale(0.7) rotate(-2deg); }
  60% { opacity: 1; transform: scale(1.04) rotate(0.5deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
`;

const popOut = keyframes`
  0% { opacity: 1; transform: scale(1) rotate(0deg); }
  100% { opacity: 0; transform: scale(0.75) rotate(-2deg); }
`;

const Overlay = styled('div')<{ exiting?: boolean }>(({ exiting }) => ({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  backdropFilter: 'blur(5px)',
  WebkitBackdropFilter: 'blur(5px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  animation: `${exiting ? overlayOut : overlayIn} ${exiting ? '0.3s' : '0.4s'} ease forwards`,
}));

const PopupFrame = styled('div')<{ exiting?: boolean }>(({ exiting }) => ({
  width: 'min(92vw, 380px)',
  maxWidth: 380,
  maxHeight: 'calc(100dvh - 20px)',
  overflow: 'hidden',
  background: GUIDELINES_PURPLE,
  border: `3px solid ${FRAME_BORDER}`,
  borderRadius: 24,
  padding: 'clamp(6px, 1.6vh, 10px)',
  boxShadow: `0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)`,
  animation: `${exiting ? popOut : popIn} ${exiting ? '0.3s' : '0.5s'} cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
}));

const HeaderRow = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '4px 8px 8px',
  position: 'relative',
});

const TitleText = styled('div')({
  fontSize: 'clamp(17px, 2.5vh, 20px)',
  fontWeight: 900,
  color: '#fff',
  letterSpacing: 1.2,
  textShadow: `-1px -1px 0 ${GUIDELINES_BORDER}, 1px -1px 0 ${GUIDELINES_BORDER}, -1px 1px 0 ${FRAME_BORDER}, 1px 1px 0 ${FRAME_BORDER}, 2px 3px 0 #254418`,
  textAlign: 'center',
  padding: '0 28px',
});

const CloseButton = styled('button')({
  position: 'absolute',
  left: 8,
  top: 4,
  background: 'none',
  border: 'none',
  color: GUIDELINES_BORDER,
  fontSize: 22,
  fontWeight: 700,
  cursor: 'pointer',
  padding: 4,
  lineHeight: 1,
  opacity: 0.7,
  transition: 'opacity 0.15s',
  '&:hover': { opacity: 1 },
});

const ContentArea = styled('div')({
  background: '#fff',
  border: `3px solid ${FRAME_BORDER}`,
  borderRadius: 16,
  padding: 'clamp(16px, 2.4vh, 22px) clamp(14px, 3vw, 20px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  overflow: 'auto',
  maxHeight: 'calc(100dvh - 100px)',
});

const DescriptionText = styled('div')({
  fontSize: 'clamp(14px, 2vh, 16px)',
  color: '#3F3E2F',
  lineHeight: 1.55,
  whiteSpace: 'pre-wrap',
  textAlign: 'center',
  width: '100%',
});

interface StationDescriptionPopupProps {
  title: string;
  description: string;
  onDismiss: () => void;
}

export default function StationDescriptionPopup({ title, description, onDismiss }: StationDescriptionPopupProps) {
  const [exiting, setExiting] = useState(false);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 300);
  };

  return (
    <Overlay exiting={exiting} onClick={handleDismiss}>
      <PopupFrame exiting={exiting} onClick={(e) => e.stopPropagation()}>
        <HeaderRow>
          <TitleText>{title}</TitleText>
          <CloseButton onClick={handleDismiss} aria-label="Close">&times;</CloseButton>
        </HeaderRow>
        <ContentArea>
          <DescriptionText>{description}</DescriptionText>
        </ContentArea>
      </PopupFrame>
    </Overlay>
  );
}
