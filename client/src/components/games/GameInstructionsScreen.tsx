import { GameCenteredLayout, StationHeadline, StationWindow, StationBodyText, StationContinueButton } from './styled';

interface GameInstructionsScreenProps {
  gameName: string;
  instructions: string;
  continueLabel: string;
  onContinue: () => void;
}

export default function GameInstructionsScreen({
  gameName,
  instructions,
  continueLabel,
  onContinue,
}: GameInstructionsScreenProps) {
  return (
    <GameCenteredLayout>
      <StationHeadline sx={{ marginBottom: 2 }}>{gameName}</StationHeadline>
      <StationWindow sx={{ marginBottom: 3 }}>
        <StationBodyText>{instructions}</StationBodyText>
      </StationWindow>
      <StationContinueButton onClick={onContinue}>
        {continueLabel}
      </StationContinueButton>
    </GameCenteredLayout>
  );
}
