import { GameCenteredLayout, StationHeadline, StationWindow, StationBodyText, StationContinueButton } from './styled';

interface GameInstructionsScreenProps {
  gameName: string;
  instructions: string;
  continueLabel: string;
  onContinue: () => void;
}

/**
 * Shared instructions screen shown before a game starts.
 * Displays game name + instructions text + continue button.
 * Uses unified station design: purple window, white headline, white continue button with purple text.
 */
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
