import { styled, keyframes } from '@mui/material/styles';
import { useEffect, useRef } from 'react';
import { StationHeadline, StationWindow, StationBodyText, StationContinueButton, DESKTOP_BREAKPOINT, DESKTOP_STATION_WIDTH } from '../games/styled';
import type { StationItemData } from '../../pages/StoryModulePage/types';

const badgeAppear = keyframes`
  0% { opacity: 0; transform: scale(0.5) rotate(-10deg); }
  60% { transform: scale(1.1) rotate(2deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const BadgeContainer = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 20px',
  gap: 20,
  textAlign: 'center',
  [DESKTOP_BREAKPOINT]: {
    width: DESKTOP_STATION_WIDTH,
    marginInline: 'auto',
    padding: '48px 24px',
    gap: 28,
  },
});

const BadgeTitle = styled(StationHeadline)({
  margin: 0,
});

const BadgeImageWrapper = styled('div')({
  animation: `${badgeAppear} 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
  animationDelay: '0.3s',
  opacity: 0,
});

const BadgeImage = styled('img')({
  width: 200,
  height: 200,
  objectFit: 'contain',
  filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.5))',
  [DESKTOP_BREAKPOINT]: {
    width: 280,
    height: 280,
  },
});

const ShareButton = styled('button')({
  background: 'linear-gradient(90deg, #1fd5c8, #0ea89e, #1fd5c8)',
  backgroundSize: '200% 100%',
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
  animation: `${shimmer} 3s ease-in-out infinite`,
  '&:active': {
    transform: 'translateY(3px)',
    boxShadow: '0 1px 0 #087a72',
  },
});

interface BadgeStationProps {
  station: StationItemData;
  onContinue: () => void;
}

export default function BadgeStation({ station, onContinue }: BadgeStationProps) {
  const settings = station.settings || {};
  const title = (settings.title as string) || station.name;
  const subtitle = (settings.subtitle as string) || '';
  const badgeImageUrl = (settings.badgeImageUrl as string) || (settings.mediaUrl as string) || '';
  const shareEnabled = settings.shareEnabled !== false;
  const soundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    soundRef.current = new Audio('/sounds/success.wav');
    soundRef.current.play().catch(() => {});
    return () => {
      soundRef.current?.pause();
    };
  }, []);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: subtitle,
          url: window.location.href,
        });
      } catch {
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {
      }
    }
  };

  return (
    <BadgeContainer>
      <BadgeTitle>{title}</BadgeTitle>
      {badgeImageUrl && (
        <BadgeImageWrapper>
          <BadgeImage src={badgeImageUrl} alt={title} />
        </BadgeImageWrapper>
      )}
      {subtitle && (
        <StationWindow>
          <StationBodyText>{subtitle}</StationBodyText>
        </StationWindow>
      )}
      {shareEnabled && (
        <ShareButton onClick={handleShare}>
          {'\u{1F4E4}'} Share
        </ShareButton>
      )}
      <StationContinueButton onClick={onContinue}>
        Continue
      </StationContinueButton>
    </BadgeContainer>
  );
}
