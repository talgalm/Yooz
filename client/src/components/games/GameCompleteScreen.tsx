import { BodyText, Title, PRIMARY } from '../styled';
import { GameCenteredLayout, StationContinueButton } from './styled';
import { styled } from '@mui/material/styles';

const CompleteTitle = styled(Title)({
  marginBottom: 8,
});

const ScoreNumber = styled(Title)({
  fontSize: 48,
  color: PRIMARY,
  marginBottom: 8,
});

const ExtraInfoWrapper = styled('div')({
  marginBottom: 24,
});

interface GameCompleteScreenProps {
  title: string;
  score: number;
  scoreLabel: string;
  continueLabel: string;
  onFinish: () => void;
  /** Optional extra info lines (e.g. accuracy, time) rendered between score and button */
  extraInfo?: React.ReactNode;
  /** Optional content rendered above the title (e.g. completed puzzle image) */
  topContent?: React.ReactNode;
}

/**
 * Shared game-complete screen showing final score + continue button.
 * Used by all game types.
 */
export default function GameCompleteScreen({
  title,
  score,
  scoreLabel,
  continueLabel,
  onFinish,
  extraInfo,
  topContent,
}: GameCompleteScreenProps) {
  return (
    <GameCenteredLayout>
      {topContent}
      <CompleteTitle>{title}</CompleteTitle>
      <ScoreNumber>{score}</ScoreNumber>
      <BodyText sx={{ marginBottom: extraInfo ? '4px' : '24px' }}>{scoreLabel}</BodyText>
      {extraInfo && <ExtraInfoWrapper>{extraInfo}</ExtraInfoWrapper>}
      <StationContinueButton onClick={onFinish} style={{ maxWidth: 280 }}>
        {continueLabel}
      </StationContinueButton>
    </GameCenteredLayout>
  );
}
