import { styled } from '@mui/material/styles';
import {
  StationWindow,
  StationHeadline,
  StationBodyText,
  StationContinueButton,
} from '../games/styled';
import type { StationItemData } from '../../pages/StoryModulePage/types';

const NarrativeContainer = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 20px',
  gap: 20,
  position: 'relative',
  textAlign: 'center',
});

const BgImage = styled('img')({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  zIndex: 0,
});

const ContentOverlay = styled('div')({
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 20,
  maxWidth: 400,
  width: '100%',
  '@media (min-width: 768px)': {
    maxWidth: 'min(720px, 80vw)',
    gap: 28,
  },
});

const NarrativeTitle = styled(StationHeadline)({
  margin: 0,
});

const NarrativeImage = styled('img')({
  width: '100%',
  maxWidth: 360,
  borderRadius: 12,
  objectFit: 'contain',
  '@media (min-width: 768px)': {
    maxWidth: 560,
    maxHeight: '55vh',
  },
});

interface NarrativeStationProps {
  station: StationItemData;
  onContinue: () => void;
}

export default function NarrativeStation({ station, onContinue }: NarrativeStationProps) {
  const settings = station.settings || {};
  const title = (settings.title as string) || station.name;
  const bodyText = (settings.bodyText as string) || (settings.content as string) || '';
  const backgroundImage = settings.backgroundImage as string | undefined;
  const buttonText = (settings.buttonText as string) || 'Continue';
  const imageUrl = settings.imageUrl as string | undefined;

  return (
    <NarrativeContainer>
      {backgroundImage && <BgImage src={backgroundImage} alt="" />}
      <ContentOverlay>
        <NarrativeTitle>{title}</NarrativeTitle>
        {imageUrl && <NarrativeImage src={imageUrl} alt="" />}
        {bodyText && (
          <StationWindow>
            <StationBodyText>{bodyText}</StationBodyText>
          </StationWindow>
        )}
        <StationContinueButton onClick={onContinue}>{buttonText}</StationContinueButton>
      </ContentOverlay>
    </NarrativeContainer>
  );
}
