import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import MissionTopMenu from '../MissionPage/MissionTopMenu';
import { useMissionSounds } from '../MissionPage/useMissionSounds';
import { useAuth } from '../../context/AuthContext';
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

const FRAME_IMAGES = [
  '/images/mission-frame.svg',
  '/images/mission-header.svg',
  '/images/mission-footer.svg',
];
const PUZZLE_BG = '/images/puzzle-env.png';

type MissionPhase = 'screens' | 'puzzle' | 'done';

function userFingerprint(): string {
  try { return (localStorage.getItem('yooz_token') ?? '').slice(-10); } catch { return ''; }
}

function missionPhaseKey(code?: string) { return `mission_inline_phase_${code ?? 'default'}_${userFingerprint()}`; }

function loadMissionPhase(code?: string): MissionPhase {
  if (!code) return 'screens';
  try {
    const saved = sessionStorage.getItem(missionPhaseKey(code)) as MissionPhase | null;
    if (saved === 'puzzle' || saved === 'done') return saved;
  } catch { /* ignore */ }
  return 'screens';
}

function saveMissionPhase(code: string | undefined, phase: MissionPhase) {
  if (!code) return;
  try { sessionStorage.setItem(missionPhaseKey(code), phase); } catch { /* ignore */ }
}

interface MissionInlinePlayerProps {
  mission: MissionItemData;
  onComplete: (result: GameResult) => void;
  code?: string;
  onLogout?: () => void;
  onHelp?: () => void;
}

export default function MissionInlinePlayer({ mission, onComplete, code, onLogout, onHelp }: MissionInlinePlayerProps) {
  const sounds = useMissionSounds();
  const { participant } = useAuth();
  const [currentScreen, setCurrentScreen] = useState(0);
  const [phase, setPhase] = useState<MissionPhase>(() => loadMissionPhase(code));
  const [startTime] = useState(Date.now());
  const trashSortScoreRef = useRef(0);

  // Set theme-color to transparent during mission so browser chrome uses device default
  useEffect(() => {
    const metas = document.querySelectorAll('meta[name="theme-color"]') as NodeListOf<HTMLMetaElement>;
    const prevThemes = Array.from(metas).map((m) => m.content);
    metas.forEach((m) => { m.content = 'transparent'; });
    return () => {
      metas.forEach((m, i) => { m.content = prevThemes[i]; });
    };
  }, []);

  const allImagesToPreload = useMemo(() => {
    const srcs: string[] = [...FRAME_IMAGES, PUZZLE_BG];
    mission.explanationScreens.forEach((screen) => {
      if (screen.backgroundImage) srcs.push(screen.backgroundImage);
      if (screen.image) srcs.push(screen.image);
    });
    return srcs;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable — mission data never changes after mount

  const frameReady = useFrameReady(allImagesToPreload);

  const handleNext = useCallback(() => {
    sounds.playClick();
    sounds.startBg();
    if (currentScreen < mission.explanationScreens.length - 1) {
      setCurrentScreen((prev) => prev + 1);
    } else {
      saveMissionPhase(code, 'puzzle');
      setPhase('puzzle');
    }
  }, [mission, currentScreen, sounds]);

  const handlePuzzleComplete = useCallback(() => {
    saveMissionPhase(code, 'done');
    setPhase('done');
  }, [code]);

  // Called when the game ends — saves score for later, but stays on video/badge screens
  const handleTrashSortComplete = useCallback((score: number) => {
    trashSortScoreRef.current = score;
  }, []);

  // Called when the user taps the continue button on the badge screen
  const handleMissionContinue = useCallback(() => {
    if (code) try { sessionStorage.removeItem(missionPhaseKey(code)); } catch { /* ignore */ }
    onComplete({
      score: trashSortScoreRef.current,
      maxPossibleScore: 100,
      durationMs: Date.now() - startTime,
      hintUsed: false,
    });
  }, [onComplete, startTime, code]);

  if (phase === 'puzzle') {
    return (
      <MissionPuzzle
        onComplete={handlePuzzleComplete}
        backgroundImage={PUZZLE_BG}
        playCorrect={sounds.playCorrect}
        playWrong={sounds.playWrong}
        playClick={sounds.playClick}
        playComplete={sounds.playComplete}
        muted={sounds.muted}
        toggleMute={sounds.toggleMute}
        code={code}
        completeHeader={mission.puzzleConfig?.completeHeader}
        completeButton={mission.puzzleConfig?.completeButton}
        onLogout={onLogout}
        onHelp={onHelp}
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
        stopTrashBg={sounds.stopTrashBg}
        stopBg={sounds.stopBg}
        startBg={sounds.startBg}
        onComplete={handleTrashSortComplete}
        onContinue={handleMissionContinue}
        activityCode={code}
        participantName={participant?.name}
        title={mission.trashSortConfig?.title}
        description={mission.trashSortConfig?.description}
        scoreLabel={mission.trashSortConfig?.scoreLabel}
        gameFinalText={mission.trashSortConfig?.gameFinalText}
        completeHeader={mission.trashSortConfig?.completeHeader}
        completeButton={mission.trashSortConfig?.completeButton}
        badgeHeader={mission.trashSortConfig?.badgeHeader}
        badgeCurveText={mission.trashSortConfig?.badgeCurveText}
        badgeAwardText={mission.trashSortConfig?.badgeAwardText}
        badgeAchievementText={mission.trashSortConfig?.badgeAchievementText}
        shareButton={mission.trashSortConfig?.shareButton}
        continueButton={mission.trashSortConfig?.continueButton}
        onLogout={onLogout}
        onHelp={onHelp}
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

  const showFrameHeaderFooter = currentScreen >= 3;

  return (
    <MissionWrapper key={currentScreen} bg={screenBg} step={currentScreen}>
      <FrameContainer>
        {showFrameHeaderFooter && (
          <>
            <FrameHeaderOverlay src="/images/mission-header.svg" alt="" />
            <FrameFooterOverlay src="/images/mission-footer.svg" alt="" />
          </>
        )}

        <MissionTopMenu onLogout={onLogout} toggleMute={sounds.toggleMute} muted={sounds.muted} onHelp={onHelp} />

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
            <MissionButton step={currentScreen} onClick={handleNext}>
              {screen.buttonText}
            </MissionButton>
          </div>
        )}
      </FrameContainer>
    </MissionWrapper>
  );
}
