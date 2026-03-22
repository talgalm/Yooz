import { useState, useCallback } from 'react';
import {
  MissionWrapper,
  FrameContainer,
  FrameHeaderOverlay,
  FrameFooterOverlay,
  MissionHeader,
  HeaderText,
  MissionContent,
  DescriptionText,
  ScreenImage,
  MissionButton,
} from '../MissionPage/MissionFrame';
import MissionPuzzle from '../MissionPage/MissionPuzzle';
import MissionTrashSort from '../MissionPage/MissionTrashSort';
import { useMissionSounds } from '../MissionPage/useMissionSounds';
import type { MissionItemData } from './types';
import type { GameResult } from '../../components/games/types';

type MissionPhase = 'screens' | 'puzzle' | 'done';

interface MissionInlinePlayerProps {
  mission: MissionItemData;
  onComplete: (result: GameResult) => void;
  code?: string;
}

export default function MissionInlinePlayer({ mission, onComplete, code }: MissionInlinePlayerProps) {
  const sounds = useMissionSounds();
  const [currentScreen, setCurrentScreen] = useState(0);
  const [phase, setPhase] = useState<MissionPhase>('screens');
  const [startTime] = useState(Date.now());

  const handleNext = useCallback(() => {
    sounds.playClick();
    sounds.startBg();
    if (currentScreen < mission.explanationScreens.length - 1) {
      setCurrentScreen((prev) => prev + 1);
    } else {
      setPhase('puzzle');
    }
  }, [mission, currentScreen, sounds]);

  const handlePuzzleComplete = useCallback(() => {
    setPhase('done');
  }, []);

  const handleTrashSortComplete = useCallback((score: number) => {
    onComplete({
      score,
      maxPossibleScore: 100,
      durationMs: Date.now() - startTime,
      hintUsed: false,
    });
  }, [onComplete, startTime]);

  const PUZZLE_BG = '/images/puzzle-env.png';

  if (phase === 'puzzle') {
    return (
      <MissionPuzzle
        onComplete={handlePuzzleComplete}
        backgroundImage={PUZZLE_BG}
        playCorrect={sounds.playCorrect}
        playClick={sounds.playClick}
        playComplete={sounds.playComplete}
        muted={sounds.muted}
        toggleMute={sounds.toggleMute}
        code={code}
      />
    );
  }

  if (phase === 'done') {
    return (
      <MissionTrashSort
        score={0}
        muted={sounds.muted}
        toggleMute={sounds.toggleMute}
        startTrashBg={sounds.startTrashBg}
        onComplete={handleTrashSortComplete}
      />
    );
  }

  const screens = mission.explanationScreens;
  const screen = screens[currentScreen];

  if (!screen) {
    onComplete({ score: 0, maxPossibleScore: 0, durationMs: Date.now() - startTime, hintUsed: false });
    return null;
  }

  const hasHeader = !!screen.header;
  const hasDescription = !!screen.description;
  const hasImage = !!screen.image;
  const hasButton = !!screen.buttonText;
  const screenBg = currentScreen === 3 ? PUZZLE_BG : screen.backgroundImage;

  return (
    <MissionWrapper key={currentScreen} bg={screenBg} step={currentScreen}>
      <FrameContainer>
        {currentScreen >= 3 && <FrameHeaderOverlay src="/images/mission-header.svg" alt="" />}
        {currentScreen >= 3 && <FrameFooterOverlay src="/images/mission-footer.svg" alt="" />}

        {hasHeader && (
          <MissionHeader>
            <HeaderText>{screen.header}</HeaderText>
          </MissionHeader>
        )}

        <MissionContent>
          {hasDescription && (
            <DescriptionText step={currentScreen}>{screen.description}</DescriptionText>
          )}
          {hasImage && <ScreenImage src={screen.image} alt="" />}
        </MissionContent>

        {hasButton && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <MissionButton step={currentScreen} onClick={handleNext}>
              {screen.buttonText}
            </MissionButton>
          </div>
        )}
      </FrameContainer>
    </MissionWrapper>
  );
}
