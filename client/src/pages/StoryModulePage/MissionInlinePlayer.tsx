import { useState, useCallback, useEffect, useRef } from 'react';
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
  MuteButton,
  MuteIcon,
  MutedSlash,
} from '../MissionPage/MissionFrame';
import MissionPuzzle from '../MissionPage/MissionPuzzle';
import MissionTrashSort from '../MissionPage/MissionTrashSort';
import { useMissionSounds } from '../MissionPage/useMissionSounds';
import type { MissionItemData } from './types';
import type { GameResult } from '../../components/games/types';

function useFrameReady(imageSrcs: string[]) {
  const [ready, setReady] = useState(false);
  const attempted = useRef(false);
  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    let loaded = 0;
    const total = imageSrcs.length;
    if (total === 0) { setReady(true); return; }
    imageSrcs.forEach((src) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded >= total) setReady(true);
      };
      img.src = src;
    });
  }, [imageSrcs]);
  return ready;
}

const FRAME_IMAGES = ['/images/mission-frame.svg'];

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
  const frameReady = useFrameReady(FRAME_IMAGES);

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

  if (!frameReady) {
    return (
      <div style={{ height: '100dvh', background: '#1a0a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: '#39CABC', opacity: 0.5 }} />
          ))}
        </div>
      </div>
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

        <MuteButton onClick={sounds.toggleMute} aria-label={sounds.muted ? 'Unmute' : 'Mute'}>
          <MuteIcon src="/images/mic.svg" alt="" muted={sounds.muted} />
          {sounds.muted && <MutedSlash />}
        </MuteButton>

        {hasHeader && (
          <MissionHeader>
            <HeaderText>{screen.header}</HeaderText>
          </MissionHeader>
        )
        }

        <MissionContent>
          {hasDescription && (
            <DescriptionText step={currentScreen}>{screen.description}</DescriptionText>
          )}
          {hasImage && <ScreenImage src={screen.image} alt="" />}
        </MissionContent>

        {hasButton && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: currentScreen < 3 ? -20 : 70 }}>
            <MissionButton onClick={handleNext}>
              {screen.buttonText}
            </MissionButton>
          </div>
        )}
      </FrameContainer>
    </MissionWrapper>
  );
}
