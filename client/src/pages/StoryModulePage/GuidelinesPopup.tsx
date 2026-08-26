import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalBlur } from '../../utils/modalBlur';
import { styled, keyframes } from '@mui/material/styles';
import type { CustomInstructionsData } from './types';

const FRAME_BORDER = '#2c1537';
const COMPASS_PINK = '#E89EAD';
const BACKPACK_BLUE = '#63B4D9';
const BACKPACK_PINK = '#E89EAD';
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

const starSpin = keyframes`
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(15deg) scale(1.2); }
  100% { transform: rotate(0deg) scale(1); }
`;

const bounceIn = keyframes`
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
`;

const Overlay = styled('div')<{ exiting?: boolean }>(({ exiting }) => ({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  animation: `${exiting ? overlayOut : overlayIn} ${exiting ? '0.3s' : '0.4s'} ease forwards`,
}));

const PopupFrame = styled('div')<{ exiting?: boolean }>(({ exiting }) => ({
  width: 'min(92vw, 380px)',
  maxWidth: 380,
  maxHeight: 'calc(100svh - 20px)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  background: GUIDELINES_PURPLE,
  border: `3px solid ${FRAME_BORDER}`,
  borderRadius: 24,
  padding: 'clamp(6px, 1.6svh, 10px)',
  boxShadow: `0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)`,
  animation: `${exiting ? popOut : popIn} ${exiting ? '0.3s' : '0.5s'} cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
}));

const HeaderRow = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '4px 8px 8px',
  position: 'relative',
  flexShrink: 0,
});

const TitleText = styled('div')({
  fontSize: 'clamp(17px, 2.5svh, 20px)',
  fontWeight: 900,
  color: '#fff',
  letterSpacing: 1.2,
  textShadow: `-1px -1px 0 ${GUIDELINES_BORDER}, 1px -1px 0 ${GUIDELINES_BORDER}, -1px 1px 0 ${FRAME_BORDER}, 1px 1px 0 ${FRAME_BORDER}, 2px 3px 0 #254418`,
  textAlign: 'center',
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
  padding: 'clamp(14px, 2.2svh, 20px) clamp(14px, 3vw, 18px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  // Scrollable, not clipped: on a short viewport the content can outgrow the
  // frame, and hiding the overflow used to swallow the start button.
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
});

const IllustrationRow = styled('div')({
  display: 'flex',
  gap: 'clamp(12px, 3vw, 20px)',
  justifyContent: 'center',
  marginBottom: 'clamp(10px, 1.8svh, 20px)',
  animation: `${bounceIn} 0.6s ease-out 0.3s both`,
  '& svg': {
    width: 'clamp(52px, 8svh, 70px)',
    height: 'clamp(52px, 8svh, 70px)',
  },
});

const SectionTitle = styled('div')({
  fontWeight: 800,
  fontSize: 'clamp(15px, 2.3svh, 17px)',
  color: GUIDELINES_PURPLE,
  textAlign: 'center',
  marginBottom: 'clamp(6px, 1.2svh, 10px)',
  width: '100%',
});

const MissionList = styled('ul')({
  listStyle: 'none',
  padding: 0,
  margin: '0 0 clamp(8px, 1.5svh, 14px) 0',
  width: '100%',
});

const MissionItem = styled('li')<{ delay?: number }>(({ delay = 0 }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  marginBottom: 'clamp(6px, 1svh, 10px)',
  fontSize: 'clamp(13px, 1.9svh, 14px)',
  lineHeight: 1.4,
  color: '#3F3E2F',
  animation: `${bounceIn} 0.4s ease-out ${0.4 + delay * 0.1}s both`,
}));

const MissionText = styled('span')({
  display: 'block',
  flex: 1,
  minWidth: 0,
  textAlign: 'start',
  paddingTop: 2,
});

const StarBullet = styled('span')({
  color: '#632e7d',
  fontSize: 'clamp(15px, 2.2svh, 18px)',
  flexShrink: 0,
  marginTop: 0,
  animation: `${starSpin} 2s ease-in-out infinite`,
});

const GuidelinesSection = styled('div')({
  width: '100%',
  marginTop: 4,
  marginBottom: 'clamp(4px, 1svh, 8px)',
  padding: 'clamp(10px, 1.6svh, 14px)',
  background: '#f8f9e8',
  borderRadius: 12,
  border: `2px dashed ${FRAME_BORDER}44`,
  animation: `${bounceIn} 0.4s ease-out 0.7s both`,
});

const GuidelinesLabel = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontWeight: 800,
  fontSize: 'clamp(13px, 2svh, 15px)',
  color: FRAME_BORDER,
  marginBottom: 'clamp(6px, 1svh, 8px)',
});

const GuidelinesText = styled('div')({
  fontSize: 'clamp(13px, 1.9svh, 14px)',
  color: '#555',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
});

const StartButton = styled('button')<{ exiting?: boolean }>(({ exiting }) => ({
  display: 'block',
  width: '75%',
  margin: 'clamp(10px, 1.7svh, 16px) auto 2px',
  padding: 'clamp(10px, 1.8svh, 13px) 28px',
  background: GUIDELINES_PURPLE,
  color: '#fff',
  border: `3px solid ${FRAME_BORDER}`,
  borderRadius: 50,
  fontSize: 'clamp(15px, 2.2svh, 17px)',
  fontWeight: 800,
  cursor: 'pointer',
  letterSpacing: 1,
  boxShadow: `0 4px 0 ${FRAME_BORDER}`,
  transition: 'transform 0.1s, box-shadow 0.1s',
  animation: exiting ? 'none' : `${bounceIn} 0.5s ease-out 0.8s both`,
  '&:active': {
    transform: 'translateY(4px)',
    boxShadow: `0 0 0 ${FRAME_BORDER}`,
  },
  '@media (max-height: 760px)': {
    width: '82%',
  },
}));

function CompassIcon() {
  return (
    <svg width="70" height="70" viewBox="0 0 70 70">
      <circle cx="35" cy="35" r="32" fill={COMPASS_PINK} stroke={FRAME_BORDER} strokeWidth="2.5" opacity="0.25" />
      <circle cx="35" cy="35" r="28" fill="#fff" stroke={FRAME_BORDER} strokeWidth="2" />
      <line x1="35" y1="9" x2="35" y2="14" stroke={FRAME_BORDER} strokeWidth="2" />
      <line x1="35" y1="56" x2="35" y2="61" stroke={FRAME_BORDER} strokeWidth="2" />
      <line x1="9" y1="35" x2="14" y2="35" stroke={FRAME_BORDER} strokeWidth="2" />
      <line x1="56" y1="35" x2="61" y2="35" stroke={FRAME_BORDER} strokeWidth="2" />
      <polygon points="35,14 39,33 35,36 31,33" fill="#e74c3c" />
      <polygon points="35,56 39,37 35,34 31,37" fill="#bbb" />
      <circle cx="35" cy="35" r="3.5" fill={FRAME_BORDER} />
      <text x="35" y="22" textAnchor="middle" fontSize="7" fontWeight="bold" fill={FRAME_BORDER}>N</text>
    </svg>
  );
}

function BackpackIcon() {
  return (
    <svg width="70" height="70" viewBox="0 0 70 70">
      <rect x="16" y="24" width="38" height="36" rx="6" fill={BACKPACK_BLUE} stroke={FRAME_BORDER} strokeWidth="2.5" />
      <rect x="22" y="36" width="26" height="14" rx="3" fill="#fff" stroke={FRAME_BORDER} strokeWidth="1.5" />
      <path d="M22 36 Q35 32 48 36" fill={BACKPACK_PINK} stroke={FRAME_BORDER} strokeWidth="1.5" />
      <path d="M24 24V16a11 11 0 0122 0v8" fill="none" stroke={FRAME_BORDER} strokeWidth="3" strokeLinecap="round" />
      <circle cx="35" cy="42" r="2.5" fill={FRAME_BORDER} />
      <path d="M30 24V20a5 5 0 0110 0v4" fill="none" stroke={FRAME_BORDER} strokeWidth="2" strokeLinecap="round" />
      <rect x="16" y="40" width="6" height="10" rx="2" fill={BACKPACK_PINK} stroke={FRAME_BORDER} strokeWidth="1" opacity="0.7" />
      <rect x="48" y="40" width="6" height="10" rx="2" fill={BACKPACK_PINK} stroke={FRAME_BORDER} strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#E66E69">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
    </svg>
  );
}

interface GuidelinesPopupProps {
  itemCount: number;
  guidelines?: string;
  customInstructions?: CustomInstructionsData;
  onDismiss: () => void;
  t: Record<string, string>;
}

export default function GuidelinesPopup({ itemCount, guidelines, customInstructions, onDismiss, t }: GuidelinesPopupProps) {
  const [exiting, setExiting] = useState(false);
  useModalBlur(true);
  const ci = customInstructions;

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 300);
  };

  const title = ci?.title || t.guidelinesSubHeader;
  const missionTitle = ci?.missionTitle || t.guidelinesMissionTitle;
  const missionItems = ci?.missionItems?.length
    ? ci.missionItems
    : [t.guidelineMission1.replace('{count}', String(itemCount)), t.guidelineMission2];
  const ruleSectionTitle = ci?.guidelinesTitle || t.guidelinesRulesTitle;
  const ruleItems = ci?.guidelineItems?.length
    ? ci.guidelineItems
    : [t.guidelineRule1, t.guidelineRule2];
  const buttonText = ci?.buttonText || t.startAdventure;

  // Portalled to <body>: this overlay blurs its backdrop, and rendering it
  // inside the animated stage made the filter sample that composited layer
  // instead of the page, painting a ghosted second copy behind the popup.
  return createPortal(
    <Overlay exiting={exiting} onClick={handleDismiss}>
      <PopupFrame exiting={exiting} onClick={(e) => e.stopPropagation()}>
        <HeaderRow>
          <TitleText>{title}</TitleText>
          <CloseButton onClick={handleDismiss} aria-label="Close">&times;</CloseButton>
        </HeaderRow>
        <ContentArea>
          <IllustrationRow>
            <BackpackIcon />
            <CompassIcon />
          </IllustrationRow>

          <SectionTitle>{missionTitle}</SectionTitle>
          <MissionList>
            {missionItems.map((text, i) => (
              <MissionItem key={i} delay={i}>
                <StarBullet>&#9733;</StarBullet>
                <MissionText>{text}</MissionText>
              </MissionItem>
            ))}
          </MissionList>

          <SectionTitle>{ruleSectionTitle}</SectionTitle>
          <MissionList>
            {ruleItems.map((text, i) => (
              <MissionItem key={i} delay={missionItems.length + i}>
                <StarBullet>&#9733;</StarBullet>
                <MissionText>{text}</MissionText>
              </MissionItem>
            ))}
          </MissionList>

          {guidelines && (
            <GuidelinesSection>
              <GuidelinesLabel>
                <PinIcon />
                {t.guidelinesCustomLabel}
              </GuidelinesLabel>
              <GuidelinesText>{guidelines}</GuidelinesText>
            </GuidelinesSection>
          )}

          <StartButton exiting={exiting} onClick={handleDismiss}>
            {buttonText}
          </StartButton>
        </ContentArea>
      </PopupFrame>
    </Overlay>,
    document.body,
  );
}
