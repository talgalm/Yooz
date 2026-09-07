import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from '../../../context/LanguageContext';
import { useGameSounds } from '../../../hooks/useGameSounds';
import {
  useActivityPlayingHeaderHostActive,
  useRegisterActivityGameHeader,
  type ActivityGameHeaderPhase,
} from '../../../context/activityPlayingHeaderContext';
import { texts } from './TrashSortGame.i18n';
import {
  SortContainer,
  TutorialScreen,
  TutorialTitle,
  TutorialPanel,
  TutorialText,
  TutorialButton,
  CountdownOverlay,
  CountdownNumber,
  GameArea,
  TopSection,
  ScoreDisplay,
  FunnelArea,
  FunnelItemsPreview,
  FunnelItemIcon,
  DropZone,
  FallingItem,
  FallingItemImage,
  BinsRow,
  Bin,
  BinLabel,
  FinishScreen,
  FinishTitle,
  FinishDesc,
  FinishScore,
} from './styled';
import type { GameProps, GameResult, QuestionAnswerRecord } from '../types';

type Phase = 'tutorial' | 'countdown' | 'playing' | 'finish';

interface TrashBin {
  id: string;
  label: string;
  color: string;
  iconUrl?: string;
}

interface TrashItem {
  id: string;
  label: string;
  imageUrl: string;
  correctBinId: string;
}

interface TrashSortSettings {
  bins: TrashBin[];
  items: TrashItem[];
  scoring: { correctPoints: number };
  countdownSeconds?: number;
  fallSpeedMs?: number;
}

// Pause between one item leaving and the next starting to fall.
const ITEM_GAP_MS = 900;

export default function TrashSortGame({ game, onComplete }: GameProps) {
  const t = useTranslations(texts);
  const sounds = useGameSounds({});
  const settings = game.settings as unknown as TrashSortSettings;
  const { bins = [], items: allItems = [], scoring } = settings;
  const correctPoints = scoring?.correctPoints ?? 10;
  const countdownSeconds = settings.countdownSeconds ?? 3;
  const fallSpeedMs = settings.fallSpeedMs ?? 3000;

  const [phase, setPhase] = useState<Phase>('tutorial');
  const activityHeaderAudio = useActivityPlayingHeaderHostActive();
  const activityHeaderPhase: ActivityGameHeaderPhase =
    phase === 'finish' ? 'finish' : phase === 'playing' ? 'playing' : 'intro';
  useRegisterActivityGameHeader(
    activityHeaderAudio,
    activityHeaderPhase,
    sounds.isMuted,
    sounds.toggleMute,
  );
  const [countdownValue, setCountdownValue] = useState(countdownSeconds);
  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [itemY, setItemY] = useState(0);
  const [binFlash, setBinFlash] = useState<Record<string, 'correct' | 'wrong' | null>>({});

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const binRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const gameStartTime = useRef(0);
  const fallAnimRef = useRef<number>(0);
  const fallStartTime = useRef(0);
  const completedRef = useRef(false);
  const questionAnswers = useRef<QuestionAnswerRecord[]>([]);
  const itemStartTime = useRef(0);

  const currentItem = allItems[currentItemIdx];
  const remainingItems = allItems.slice(currentItemIdx + 1);

  // ─── Countdown ───
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdownValue <= 0) {
      setPhase('playing');
      gameStartTime.current = Date.now();
      itemStartTime.current = Date.now();
      startFalling();
      sounds.startBgMusic();
      return;
    }
    const timer = setTimeout(() => setCountdownValue((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdownValue]);

  // ─── Fall animation ───
  // `handleMissed` is recreated on every item change (its deps include
  // currentItemIdx). But startFalling is memoized on [fallSpeedMs] only, so
  // the `animate` closure inside it would otherwise capture the FIRST
  // render's handleMissed forever — meaning after the first natural miss,
  // every later "missed" call records against currentItemIdx=0 and the
  // game freezes on item 1 / item 2. A ref keeps the latest handleMissed
  // available to animate without forcing startFalling to re-create.
  const handleMissedRef = useRef<() => void>(() => {});
  const startFalling = useCallback(() => {
    setItemY(0);
    setIsDragging(false);
    fallStartTime.current = Date.now();
    itemStartTime.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - fallStartTime.current;
      const progress = Math.min(1, elapsed / fallSpeedMs);
      setItemY(progress);

      if (progress >= 1) {
        // Item fell to bottom — missed!
        handleMissedRef.current();
        return;
      }
      fallAnimRef.current = requestAnimationFrame(animate);
    };
    fallAnimRef.current = requestAnimationFrame(animate);
  }, [fallSpeedMs]);

  const stopFalling = useCallback(() => {
    cancelAnimationFrame(fallAnimRef.current);
  }, []);

  const handleMissed = useCallback(() => {
    sounds.playWrong();
    const item = allItems[currentItemIdx];
    if (item) {
      questionAnswers.current.push({
        questionIndex: currentItemIdx,
        questionText: item.label,
        selectedAnswers: [-1],
        correctAnswers: [bins.findIndex((b) => b.id === item.correctBinId)],
        isCorrect: false,
        pointsEarned: 0,
        timeSpentMs: Date.now() - itemStartTime.current,
      });
    }
    advanceToNext();
  }, [currentItemIdx, allItems, bins]);

  // Keep handleMissedRef pointing at the latest handleMissed so the
  // memoized animate() loop in startFalling always calls the current one.
  useEffect(() => { handleMissedRef.current = handleMissed; }, [handleMissed]);

  const advanceToNext = useCallback(() => {
    const nextIdx = currentItemIdx + 1;
    if (nextIdx >= allItems.length) {
      finishGame();
    } else {
      setCurrentItemIdx(nextIdx);
      // Park the next item back at the top for the whole gap — otherwise it
      // renders at the previous item's drop position until startFalling runs.
      setItemY(0);
      setTimeout(() => startFalling(), ITEM_GAP_MS);
    }
  }, [currentItemIdx, allItems.length, startFalling]);

  const finishGame = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    stopFalling();
    sounds.stopBgMusic();
    sounds.playGameOver();
    setPhase('finish');
  }, [stopFalling, sounds]);

  const flashBin = (binId: string, type: 'correct' | 'wrong') => {
    setBinFlash((prev) => ({ ...prev, [binId]: type }));
    setTimeout(() => {
      setBinFlash((prev) => ({ ...prev, [binId]: null }));
    }, 500);
  };

  // ─── Drop handler ───
  const handleDrop = useCallback((binId: string) => {
    if (!currentItem) return;
    stopFalling();
    const isCorrect = binId === currentItem.correctBinId;

    questionAnswers.current.push({
      questionIndex: currentItemIdx,
      questionText: currentItem.label,
      selectedAnswers: [bins.findIndex((b) => b.id === binId)],
      correctAnswers: [bins.findIndex((b) => b.id === currentItem.correctBinId)],
      isCorrect,
      pointsEarned: isCorrect ? correctPoints : 0,
      timeSpentMs: Date.now() - itemStartTime.current,
    });

    if (isCorrect) {
      sounds.playCorrect();
      setScore((prev) => prev + correctPoints);
      flashBin(binId, 'correct');
    } else {
      sounds.playWrong();
      flashBin(binId, 'wrong');
    }

    setIsDragging(false);
    advanceToNext();
  }, [currentItem, currentItemIdx, bins, correctPoints, stopFalling, sounds, advanceToNext]);

  // ─── Pointer handlers ───
  const handlePointerDown = (e: React.PointerEvent) => {
    if (phase !== 'playing' || !currentItem) return;
    stopFalling();
    const rect = (e.target as HTMLElement).closest('[data-falling-item]')?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = {
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    };
    setDragPos({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  };

  // Pointer move/up/cancel are wired to `window` (not the SortContainer) while
  // dragging. If we bound them on SortContainer the gesture would break the
  // moment the finger slid past the container's edge (off the screen, into
  // mobile safe-areas, etc.) — pointerup would never fire and the game would
  // be stuck with isDragging=true and the fall animation cancelled.
  // pointercancel covers OS-level interruptions (multi-touch zoom, swipe-in
  // notification) — treat them as a release outside any bin → resume falling.
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
    };

    const onUp = (e: PointerEvent) => {
      setIsDragging(false);
      for (const [binId, binEl] of binRefs.current.entries()) {
        const rect = binEl.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          handleDrop(binId);
          return;
        }
      }
      // Released outside any bin (including off-screen) — resume falling.
      startFalling();
    };

    const onCancel = () => {
      setIsDragging(false);
      startFalling();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    // If the tab/window loses focus mid-drag (e.g. iOS gesture switching
    // apps), recover the same way as a cancel.
    window.addEventListener('blur', onCancel);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onCancel);
    };
  }, [isDragging, handleDrop, startFalling]);

  const handleFinish = () => {
    const durationMs = Date.now() - gameStartTime.current;
    const result: GameResult = {
      score,
      maxPossibleScore: allItems.length * correctPoints,
      durationMs,
      hintUsed: false,
      questionAnswers: questionAnswers.current,
      metadata: {
        totalItems: allItems.length,
        correctSorts: questionAnswers.current.filter((q) => q.isCorrect).length,
      },
    };
    onComplete(result);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(fallAnimRef.current);
      sounds.stopBgMusic();
    };
  }, []);

  // ─── Tutorial ───
  if (phase === 'tutorial') {
    return (
      <SortContainer>
        <TutorialScreen>
          <TutorialTitle>{t.tutorialTitle}</TutorialTitle>
          <TutorialPanel>
            <TutorialText>
              {game.settings.instructions as string || t.tutorialDesc}
            </TutorialText>
          </TutorialPanel>
          <TutorialButton onClick={() => {
            setCountdownValue(countdownSeconds);
            setPhase('countdown');
          }}>
            {(game.settings.startButtonText as string)?.trim() || t.gotIt}
          </TutorialButton>
        </TutorialScreen>
      </SortContainer>
    );
  }

  // ─── Finish ───
  if (phase === 'finish') {
    return (
      <SortContainer>
        <FinishScreen>
          <FinishTitle>{(game.settings.endTitle as string)?.trim() || t.finishTitle}</FinishTitle>
          <FinishDesc>{t.finishDesc}</FinishDesc>
          <FinishScore>{score} {t.pts}</FinishScore>
          <TutorialButton onClick={handleFinish}>{(game.settings.endButtonText as string)?.trim() || t.continueBtn}</TutorialButton>
        </FinishScreen>
      </SortContainer>
    );
  }

  // ─── Countdown ───
  // ─── Playing ───
  return (
    <SortContainer>
      {phase === 'countdown' && (
        <CountdownOverlay>
          <CountdownNumber key={countdownValue}>{countdownValue || 'GO!'}</CountdownNumber>
        </CountdownOverlay>
      )}

      <GameArea>
        <TopSection>
          <ScoreDisplay>{t.score}: {score}</ScoreDisplay>
        </TopSection>

        <FunnelArea>
          <FunnelItemsPreview>
            {remainingItems.map((item, i) => (
              <FunnelItemIcon key={i} src={item.imageUrl} alt={item.label} />
            ))}
          </FunnelItemsPreview>
        </FunnelArea>

        <DropZone ref={dropZoneRef}>
          {currentItem && phase === 'playing' && !isDragging && (
            <FallingItem
              data-falling-item
              style={{
                left: '50%',
                top: `${itemY * 100}%`,
                transform: `translateX(-50%) translateY(-50%)`,
              }}
              onPointerDown={handlePointerDown}
            >
              <FallingItemImage src={currentItem.imageUrl} alt={currentItem.label} />
            </FallingItem>
          )}
        </DropZone>

        <BinsRow>
          {bins.map((bin) => (
            <Bin
              key={bin.id}
              binColor={bin.color}
              flash={binFlash[bin.id]}
              ref={(el) => {
                if (el) binRefs.current.set(bin.id, el);
              }}
            >
              <BinLabel>{bin.label}</BinLabel>
            </Bin>
          ))}
        </BinsRow>
      </GameArea>

      {/* Dragging ghost */}
      {isDragging && currentItem && (
        <FallingItem
          isDragging
          style={{
            position: 'fixed',
            left: dragPos.x - 30,
            top: dragPos.y - 30,
            pointerEvents: 'none',
          }}
        >
          <FallingItemImage src={currentItem.imageUrl} alt={currentItem.label} />
        </FallingItem>
      )}
    </SortContainer>
  );
}
