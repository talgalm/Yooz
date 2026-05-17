import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLang, useTranslations } from '../../../context/LanguageContext';
import { texts } from './PuzzleGame.i18n';
import { shuffleArray } from '../../../utils/shuffleArray';
import { useGameHint } from '../../../hooks/useGameHint';
import HintModals from '../HintModals';
import HintButton from '../HintButton';
import { GameProps, HintConfig, GAME_CONSTANTS } from '../types';
import { useGameSounds } from '../../../hooks/useGameSounds';
import {
  useActivityPlayingHeaderHostActive,
  useRegisterActivityGameHeader,
  type ActivityGameHeaderPhase,
} from '../../../context/activityPlayingHeaderContext';
import { useThemedSceneOverlaySetter } from '../../../context/themedSceneOverlayContext';
import {
  IntroFullScreenSceneBackdrop,
  PlayFullScreenSceneBackdrop,
  PlayPhaseRoot,
  IntroContainer,
  IntroContent,
  IntroTitle,
  IntroTitleLine,
  IntroMidSpacer,
  IntroDescStack,
  IntroInfoBox,
  IntroInfoText,
  IntroStartButton,
  FinishSummaryMiddle,
  PuzzleContainer,
  PuzzleMainScroll,
  PuzzleBottomBar,
  PuzzleGameTopBar,
  PuzzleGameMuteButton,
  PuzzleGameIntroHeaderBar,
  TopBarLeftCluster,
  TopBarRightCluster,
  PuzzleGameTopBarItem,
  PuzzleGameTopBarTimer,
  QuestionBox,
  QuestionBadge,
  QuestionContent,
  AnswerGrid,
  AnswerButton,
  ActionButton,
  CenterToastOverlay,
  CenterToastBubble,
  CorrectBigText,
  IncorrectToastText,
  PieceRevealedBadge,
  RetryBadge,
  NatureMediaContainer,
  NatureMediaImage,
  HintSpacer,
  DragPhaseContainer,
  DragInstruction,
  DragGridWrapper,
  DragGridCell,
  DraggablePiece,
  PuzzlePieceSlot,
  FinishContainer,
  FinishContent,
  FinishPuzzleImage,
  FinishPuzzleImg,
} from './styled';

// ─── Types ───

interface PuzzleAnswer {
  text: string;
  isCorrect: boolean;
}

interface PuzzleQuestion {
  text: string;
  media?: string;
  answers: PuzzleAnswer[];
  timeLimitSeconds?: number;
}

interface PuzzleScoring {
  basePoints: number;
  speedBonusMax: number;
  timeLimitSeconds: number;
}

interface PuzzleSettings {
  instructions?: string;
  hint?: HintConfig;
  puzzleImage: string;
  gridCols: number;
  gridRows: number;
  retryGap: number;
  questions: PuzzleQuestion[];
  scoring: PuzzleScoring;
  shuffleAnswers?: boolean;
}

// ─── Session Storage Progress ───

const PROGRESS_KEY_PREFIX = 'puzzle_progress_';

/** Derive a user-scoped storage key so different participants on the same device don't share progress. */
function getProgressKey(gameId: string): string {
  try {
    const token = localStorage.getItem('yooz_token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = `${payload.participantName || ''}_${payload.activityCode || ''}`;
      return PROGRESS_KEY_PREFIX + userId + '_' + gameId;
    }
  } catch {}
  return PROGRESS_KEY_PREFIX + gameId;
}

interface SavedPuzzleProgress {
  revealedPieces: number[];
  queue: number[];
  queuePos: number;
  wrongThisRound: number[];
  correctCount: number;
  totalAttempts: number;
  elapsedSeconds: number;
  hintUsed: boolean;
  gameStartTime: number;
}

function loadPuzzleProgress(gameId: string): SavedPuzzleProgress | null {
  try {
    const raw = sessionStorage.getItem(getProgressKey(gameId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function savePuzzleProgress(gameId: string, data: SavedPuzzleProgress) {
  try { sessionStorage.setItem(getProgressKey(gameId), JSON.stringify(data)); } catch {}
}

function clearPuzzleProgress(gameId: string) {
  try { sessionStorage.removeItem(getProgressKey(gameId)); } catch {}
}

// ─── SVG Piece ───

/**
 * A single puzzle piece rendered as SVG. The image is drawn at fixed SVG
 * coordinates (`cols*100 × rows*100`) using `preserveAspectRatio="xMidYMid slice"`
 * — SVG's equivalent of `object-fit: cover` — and the SVG `viewBox` clips it
 * to the 0-100 region representing this single piece. Since every piece uses
 * the *same* image transform and just shifts `x`/`y`, neighbouring pieces are
 * guaranteed to line up regardless of how the parent is sized in CSS pixels.
 *
 * Mirrors the technique used by `MissionPuzzle`, minus the jigsaw clip-path.
 */
function PuzzlePieceSvg({
  src,
  cols,
  rows,
  pieceIndex,
}: {
  src: string;
  cols: number;
  rows: number;
  pieceIndex: number;
}) {
  const col = pieceIndex % cols;
  const row = Math.floor(pieceIndex / cols);
  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', pointerEvents: 'none' }}
    >
      <image
        href={src}
        x={-col * 100}
        y={-row * 100}
        width={cols * 100}
        height={rows * 100}
        preserveAspectRatio="xMidYMid slice"
      />
    </svg>
  );
}

// ─── Component ───

export default function PuzzleGame({ game, onComplete }: GameProps) {
  const settings = game.settings as unknown as PuzzleSettings;
  const t = useTranslations(texts);
  const { dir } = useLang();
  const gameHint = useGameHint(settings.hint);
  const {
    playCorrect,
    playWrong,
    playGameOver,
    startBgMusic,
    toggleMute,
    isMuted,
  } = useGameSounds({
    correct: '/sounds/correct1.mp3',
    wrong: '/sounds/fail.wav',
    gameOver: '/sounds/success.wav',
    bgMusic: '/sounds/backgtound-music.mp3',
  });

  const totalPieces = settings.gridCols * settings.gridRows;
  const scoring = settings.scoring || { basePoints: 100, speedBonusMax: 50, timeLimitSeconds: 0 };

  const allQuestions = settings.questions || [];

  const introStickerLines = useMemo(() => {
    const lines = game.name
      ? game.name.split(/\n/).map((line) => line.trim()).filter(Boolean)
      : [];
    return lines.length > 0 ? lines : null;
  }, [game.name]);

  const processedQuestions = useMemo(() => {
    return allQuestions.map((q) => ({
      ...q,
      answers: settings.shuffleAnswers !== false ? shuffleArray(q.answers) : q.answers,
    }));
  }, [allQuestions]);

  // Check for saved progress on mount
  const savedProgress = useRef(loadPuzzleProgress(game._id));
  const isResuming = savedProgress.current !== null;

  // Guard: skip the first save-effect cycle after restoring progress,
  // because the state changes from restore would trigger a spurious save
  // that incorrectly advances queuePos by +1 again.
  const justRestoredRef = useRef(false);

  const [gameStarted, setGameStarted] = useState(false);
  const [noContent, setNoContent] = useState(false);
  const gameStartTime = useRef(Date.now());

  // Puzzle state
  const [revealedPieces, setRevealedPieces] = useState<Set<number>>(new Set());

  // Simple queue: current round + collected wrong answers for next round
  const queueRef = useRef<number[]>([]);
  const queuePosRef = useRef(0);
  const wrongThisRoundRef = useRef<number[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null);

  // Interaction state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Stats
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [totalScore, setTotalScore] = useState(0);

  // Drag-and-drop phase state
  const [dragPhase, setDragPhase] = useState(false);
  const [dragPieceIndex, setDragPieceIndex] = useState<number | null>(null);
  const [wrongCellIndex, setWrongCellIndex] = useState<number | null>(null);
  const [dragFeedback, setDragFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Drag position tracking
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const pieceRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Timer — overall game timer for speed bonus
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Per-question countdown */
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const questionCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [questionTurnId, setQuestionTurnId] = useState(0);

  const activityHeaderAudio = useActivityPlayingHeaderHostActive();
  const activityHeaderPhase: ActivityGameHeaderPhase = gameComplete
    ? 'finish'
    : !gameStarted
      ? 'intro'
      : 'playing';
  useRegisterActivityGameHeader(activityHeaderAudio, activityHeaderPhase, isMuted, toggleMute);

  const setThemedSceneOverlay = useThemedSceneOverlaySetter();

  useEffect(() => {
    if (!setThemedSceneOverlay) return;
    if (!gameStarted) {
      setThemedSceneOverlay(<IntroFullScreenSceneBackdrop aria-hidden />);
    } else {
      setThemedSceneOverlay(<PlayFullScreenSceneBackdrop aria-hidden />);
    }
    return () => setThemedSceneOverlay(null);
  }, [gameStarted, setThemedSceneOverlay]);

  const playPhaseInlineBackdrop = !setThemedSceneOverlay;

  // Track revealed pieces in a ref to avoid stale closures
  const revealedPiecesRef = useRef<Set<number>>(new Set());
  const elapsedSecondsRef = useRef(0);
  const pendingTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const processedQuestionsRef = useRef(processedQuestions);
  processedQuestionsRef.current = processedQuestions;

  useEffect(() => {
    revealedPiecesRef.current = revealedPieces;
  }, [revealedPieces]);

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  // Initialize question queue
  useEffect(() => {
    if (processedQuestions.length === 0) {
      setNoContent(true);
      setGameComplete(true);
      return;
    }
    // If resuming, the queue will be restored in startGame
    if (savedProgress.current) return;
    const indices = Array.from({ length: processedQuestions.length }, (_, i) => i);
    const shuffled = shuffleArray(indices);
    queueRef.current = shuffled;
    queuePosRef.current = 0;
    wrongThisRoundRef.current = [];
    setCurrentQuestionIndex(shuffled[0]);
  }, []);

  // Cleanup all pending timeouts on unmount
  useEffect(() => {
    return () => {
      pendingTimeouts.current.forEach(clearTimeout);
      pendingTimeouts.current = [];
    };
  }, []);

  // Start timer when game begins
  useEffect(() => {
    if (!gameStarted || gameComplete) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, gameComplete]);

  useEffect(() => {
    if (gameComplete && !noContent) {
      playGameOver();
    }
  }, [gameComplete, noContent, playGameOver]);

  // Save progress after each piece placement
  useEffect(() => {
    if (!gameStarted || gameComplete || revealedPieces.size === 0) return;
    // Skip the spurious save that fires right after restoring progress
    if (justRestoredRef.current) {
      justRestoredRef.current = false;
      return;
    }
    // Save next queue position so on resume we skip the already-answered question
    const nextQueuePos = queuePosRef.current + 1;
    // If we've exhausted the current round, save the wrong answers as the new queue
    const isRoundDone = nextQueuePos >= queueRef.current.length;
    const savedQueue = isRoundDone && wrongThisRoundRef.current.length > 0
      ? shuffleArray([...wrongThisRoundRef.current])
      : queueRef.current;
    const savedQueuePos = isRoundDone && wrongThisRoundRef.current.length > 0
      ? 0
      : nextQueuePos;
    const savedWrongThisRound = isRoundDone && wrongThisRoundRef.current.length > 0
      ? []
      : wrongThisRoundRef.current;

    savePuzzleProgress(game._id, {
      revealedPieces: Array.from(revealedPieces),
      queue: savedQueue,
      queuePos: savedQueuePos,
      wrongThisRound: savedWrongThisRound,
      correctCount,
      totalAttempts,
      elapsedSeconds: elapsedSecondsRef.current,
      hintUsed: gameHint.hintUsed,
      gameStartTime: gameStartTime.current,
    });
  }, [revealedPieces, correctCount, totalAttempts, gameStarted, gameComplete]);

  // Clear progress when game is complete
  useEffect(() => {
    if (gameComplete) clearPuzzleProgress(game._id);
  }, [gameComplete]);

  const startGame = () => {
    setGameStarted(true);
    startBgMusic();

    // Restore saved progress if resuming
    const saved = savedProgress.current;
    if (saved) {
      const restoredPieces = new Set(saved.revealedPieces);
      setRevealedPieces(restoredPieces);
      revealedPiecesRef.current = restoredPieces;
      queueRef.current = saved.queue;
      queuePosRef.current = saved.queuePos;
      wrongThisRoundRef.current = saved.wrongThisRound;
      setCorrectCount(saved.correctCount);
      setTotalAttempts(saved.totalAttempts);
      setElapsedSeconds(saved.elapsedSeconds);
      elapsedSecondsRef.current = saved.elapsedSeconds;
      gameStartTime.current = saved.gameStartTime;
      if (saved.hintUsed) gameHint.forceHintUsed();

      // Set current question from queue position
      if (saved.queuePos < saved.queue.length) {
        setCurrentQuestionIndex(saved.queue[saved.queuePos]);
      }
      savedProgress.current = null;
      justRestoredRef.current = true;
    } else {
      setElapsedSeconds(0);
    }
  };

  const advanceToNextQuestion = useCallback(() => {
    setSelectedAnswer(null);
    setChecked(false);
    setIsCorrect(false);
    setDragPhase(false);
    setDragPieceIndex(null);
    setDragFeedback(null);
    setWrongCellIndex(null);
    setQuestionTurnId((n) => n + 1);

    const nextPos = queuePosRef.current + 1;

    if (nextPos < queueRef.current.length) {
      queuePosRef.current = nextPos;
      setCurrentQuestionIndex(queueRef.current[nextPos]);
    } else if (wrongThisRoundRef.current.length > 0) {
      const newRound = shuffleArray([...wrongThisRoundRef.current]);
      queueRef.current = newRound;
      queuePosRef.current = 0;
      wrongThisRoundRef.current = [];
      setCurrentQuestionIndex(newRound[0]);
    }
  }, []);

  /** After correct answer, pick a random unrevealed piece and enter drag phase. */
  const enterDragPhase = useCallback(() => {
    const currentRevealed = revealedPiecesRef.current;
    const unrevealed: number[] = [];
    for (let i = 0; i < totalPieces; i++) {
      if (!currentRevealed.has(i)) unrevealed.push(i);
    }
    if (unrevealed.length === 0) return;
    const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    setDragPieceIndex(randomIndex);
    setDragPhase(true);
    setDragFeedback(null);
    setWrongCellIndex(null);
  }, [totalPieces]);

  /** Handle successful piece placement. */
  const handleCorrectPlacement = useCallback((pieceIdx: number) => {
    playCorrect();
    setDragFeedback('correct');
    const newRevealed = new Set(revealedPiecesRef.current);
    newRevealed.add(pieceIdx);
    setRevealedPieces(newRevealed);

    // Check completion
    if (newRevealed.size >= totalPieces) {
      const timeLimit = scoring.timeLimitSeconds || GAME_CONSTANTS.PUZZLE_DEFAULT_TIME_LIMIT;
      const currentElapsed = elapsedSecondsRef.current;
      const timeRatio = Math.max(0, 1 - currentElapsed / timeLimit);
      const speedBonus = Math.round(timeRatio * (scoring.speedBonusMax || 50));
      const baseScore = scoring.basePoints || 100;
      const finalBase = baseScore + speedBonus;
      setTotalScore(finalBase);
      pendingTimeouts.current.push(setTimeout(() => {
        setGameComplete(true);
        if (timerRef.current) clearInterval(timerRef.current);
      }, 1500));
    } else {
      pendingTimeouts.current.push(setTimeout(() => {
        advanceToNextQuestion();
      }, 1200));
    }
  }, [totalPieces, scoring, advanceToNextQuestion, playCorrect]);

  /** Handle wrong piece placement. */
  const handleWrongPlacement = useCallback((cellIdx: number) => {
    playWrong();
    setDragFeedback('wrong');
    setWrongCellIndex(cellIdx);
    pendingTimeouts.current.push(setTimeout(() => {
      setDragFeedback(null);
      setWrongCellIndex(null);
    }, 800));
  }, [playWrong]);

  // ─── Drag & Drop Handlers ───

  const getCellFromPoint = useCallback((clientX: number, clientY: number): number | null => {
    for (const [idx, el] of cellRefs.current.entries()) {
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left && clientX <= rect.right &&
        clientY >= rect.top && clientY <= rect.bottom
      ) {
        return idx;
      }
    }
    return null;
  }, []);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (!pieceRef.current) return;
    const rect = pieceRef.current.getBoundingClientRect();
    dragStartOffset.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
    setIsDragging(true);
    setDragPos({ x: clientX, y: clientY });
  }, []);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    setDragPos({ x: clientX, y: clientY });
  }, [isDragging]);

  const handleDragEnd = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || dragPieceIndex === null) {
      setIsDragging(false);
      return;
    }
    setIsDragging(false);
    const cellIdx = getCellFromPoint(clientX, clientY);
    if (cellIdx === null) return; // dropped outside grid
    if (cellIdx === dragPieceIndex) {
      handleCorrectPlacement(dragPieceIndex);
    } else {
      handleWrongPlacement(cellIdx);
    }
  }, [isDragging, dragPieceIndex, getCellFromPoint, handleCorrectPlacement, handleWrongPlacement]);

  // Mouse events
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  }, [handleDragStart]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  }, [handleDragMove]);

  const onMouseUp = useCallback((e: MouseEvent) => {
    handleDragEnd(e.clientX, e.clientY);
  }, [handleDragEnd]);

  // Touch events
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  }, [handleDragStart]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  }, [handleDragMove]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    handleDragEnd(touch.clientX, touch.clientY);
  }, [handleDragEnd]);

  // Attach mouse listeners to window while dragging
  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, onMouseMove, onMouseUp]);

  const handleCheck = useCallback(() => {
    if (checked || currentQuestionIndex === null) return;
    const question = processedQuestions[currentQuestionIndex];
    if (!question) return;

    if (questionCountdownRef.current) {
      clearInterval(questionCountdownRef.current);
      questionCountdownRef.current = null;
    }

    const correct =
      selectedAnswer !== null &&
      !!question.answers[selectedAnswer]?.isCorrect;

    setIsCorrect(correct);
    setChecked(true);
    setTotalAttempts((prev) => prev + 1);

    if (correct) playCorrect();
    else playWrong();

    if (correct) {
      setCorrectCount((prev) => prev + 1);
      // After a short delay, enter drag phase instead of auto-reveal
      pendingTimeouts.current.push(setTimeout(() => {
        enterDragPhase();
      }, 2000));
    } else {
      wrongThisRoundRef.current.push(currentQuestionIndex);
      pendingTimeouts.current.push(setTimeout(() => {
        advanceToNextQuestion();
      }, 3000));
    }
  }, [checked, currentQuestionIndex, selectedAnswer, processedQuestions, enterDragPhase, advanceToNextQuestion, playCorrect, playWrong]);

  // Reset per-question timer when the active question changes
  useEffect(() => {
    if (!gameStarted || gameComplete || currentQuestionIndex === null) return;
    const q = processedQuestionsRef.current[currentQuestionIndex];
    if (!q) return;
    const limit = q.timeLimitSeconds ?? GAME_CONSTANTS.PUZZLE_DEFAULT_QUESTION_TIME_SECONDS;
    if (limit <= 0) {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(limit);
  }, [currentQuestionIndex, questionTurnId, gameStarted, gameComplete]);

  // Countdown tick
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || checked) return;
    questionCountdownRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (questionCountdownRef.current) clearInterval(questionCountdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (questionCountdownRef.current) clearInterval(questionCountdownRef.current);
    };
  }, [timeLeft === null, timeLeft === 0, checked]);

  // Time's up — submit as incorrect
  useEffect(() => {
    if (timeLeft === 0 && !checked) {
      handleCheck();
    }
  }, [timeLeft, checked, handleCheck]);

  const handleFinish = () => {
    const maxPossibleScore = (scoring.basePoints || 100) + (scoring.speedBonusMax || 50);
    onComplete({
      score: gameHint.applyHintPenalty(totalScore),
      maxPossibleScore,
      durationMs: Date.now() - gameStartTime.current,
      hintUsed: gameHint.hintUsed,
    });
  };

  /** ~1s center toast */
  const [toastVisible, setToastVisible] = useState(false);
  useEffect(() => {
    if (!checked) {
      setToastVisible(false);
      return;
    }
    setToastVisible(true);
    const id = window.setTimeout(() => setToastVisible(false), 1000);
    return () => clearTimeout(id);
  }, [checked, currentQuestionIndex]);

  // ─── Opening / Intro screen ───
  if (!gameStarted) {
    return (
      <IntroContainer dir="rtl" $externalBackdrop={Boolean(setThemedSceneOverlay)}>
        {!activityHeaderAudio && (
          <PuzzleGameIntroHeaderBar>
            <PuzzleGameMuteButton onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? '🔇' : '🔊'}
            </PuzzleGameMuteButton>
          </PuzzleGameIntroHeaderBar>
        )}
        <IntroContent>
          <IntroTitle dir="auto">
            {introStickerLines ? (
              introStickerLines.map((line, i) => (
                <IntroTitleLine key={i}>{line}</IntroTitleLine>
              ))
            ) : (
              <IntroTitleLine>{game.name}</IntroTitleLine>
            )}
          </IntroTitle>

          <IntroMidSpacer aria-hidden />

          <IntroDescStack>
            <IntroInfoBox>
              <IntroInfoText>
                {settings.instructions?.trim() || t.defaultInstructions}
              </IntroInfoText>
            </IntroInfoBox>
            <IntroStartButton $overlap onClick={startGame}>
              {isResuming ? t.continue : t.startPuzzle}
            </IntroStartButton>
          </IntroDescStack>

        </IntroContent>
      </IntroContainer>
    );
  }

  // ─── Game complete / Finish ───
  if (gameComplete) {
    if (noContent) return null;
    return (
      <PlayPhaseRoot $inlineBackdrop={playPhaseInlineBackdrop}>
        <FinishContainer dir="rtl">
          <FinishContent>
            <IntroTitle dir="auto">
              <IntroTitleLine>{t.gameComplete}</IntroTitleLine>
            </IntroTitle>

            <FinishSummaryMiddle>
              {settings.puzzleImage && (
                <FinishPuzzleImage>
                  <FinishPuzzleImg src={settings.puzzleImage} alt="" />
                </FinishPuzzleImage>
              )}
            </FinishSummaryMiddle>

            <IntroStartButton type="button" $pinBottom onClick={handleFinish}>
              {t.continue}
            </IntroStartButton>
          </FinishContent>
        </FinishContainer>
      </PlayPhaseRoot>
    );
  }

  // ─── Drag Phase (after correct answer) ───
  if (dragPhase && dragPieceIndex !== null) {
    const cols = settings.gridCols;
    const rows = settings.gridRows;

    return (
      <PlayPhaseRoot $inlineBackdrop={playPhaseInlineBackdrop}>
        <PuzzleContainer dir="rtl">
          <PuzzleGameTopBar>
            <TopBarLeftCluster>
              <PuzzleGameTopBarItem>{t.piecesRevealed}: {revealedPieces.size}/{totalPieces}</PuzzleGameTopBarItem>
            </TopBarLeftCluster>
            <TopBarRightCluster>
              {!activityHeaderAudio && (
                <PuzzleGameMuteButton onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted ? '🔇' : '🔊'}
                </PuzzleGameMuteButton>
              )}
            </TopBarRightCluster>
          </PuzzleGameTopBar>

          <DragPhaseContainer>
            <DragInstruction>{t.dragInstruction}</DragInstruction>

            {/* The puzzle grid — each cell hosts the same SVG, clipped to its slot. */}
            <DragGridWrapper ref={gridRef} cols={cols} rows={rows}>
              {Array.from({ length: totalPieces }, (_, i) => (
                <DragGridCell
                  key={i}
                  ref={(el) => { if (el) cellRefs.current.set(i, el); }}
                  revealed={revealedPieces.has(i)}
                  isTarget={!revealedPieces.has(i)}
                  wrongAttempt={wrongCellIndex === i}
                >
                  {revealedPieces.has(i) ? (
                    <PuzzlePieceSlot>
                      <PuzzlePieceSvg
                        src={settings.puzzleImage}
                        cols={cols}
                        rows={rows}
                        pieceIndex={i}
                      />
                    </PuzzlePieceSlot>
                  ) : (
                    '?'
                  )}
                </DragGridCell>
              ))}
            </DragGridWrapper>

            {/* The draggable piece — wrapper always present to hold layout */}
            <div style={{ position: 'relative' }}>
              {/* Spacer always occupies the piece's space */}
              <DraggablePiece
                cols={cols}
                style={{
                  visibility: isDragging || dragFeedback === 'correct' ? 'hidden' : 'visible',
                }}
                ref={pieceRef}
                onMouseDown={dragFeedback !== 'correct' ? onMouseDown : undefined}
                onTouchStart={dragFeedback !== 'correct' ? onTouchStart : undefined}
                onTouchMove={dragFeedback !== 'correct' ? onTouchMove : undefined}
                onTouchEnd={dragFeedback !== 'correct' ? onTouchEnd : undefined}
              >
                <PuzzlePieceSlot>
                  <PuzzlePieceSvg
                    src={settings.puzzleImage}
                    cols={cols}
                    rows={rows}
                    pieceIndex={dragPieceIndex}
                  />
                </PuzzlePieceSlot>
              </DraggablePiece>
              {/* Fixed-position clone that follows the pointer */}
              {isDragging && (
                <DraggablePiece
                  cols={cols}
                  isDragging
                  style={{
                    position: 'fixed',
                    left: dragPos.x - dragStartOffset.current.x,
                    top: dragPos.y - dragStartOffset.current.y,
                    zIndex: 1000,
                    pointerEvents: 'none',
                  }}
                >
                  <PuzzlePieceSlot>
                    <PuzzlePieceSvg
                      src={settings.puzzleImage}
                      cols={cols}
                      rows={rows}
                      pieceIndex={dragPieceIndex}
                    />
                  </PuzzlePieceSlot>
                </DraggablePiece>
              )}
            </div>
          </DragPhaseContainer>

          {dragFeedback && (
            <CenterToastOverlay dir={dir} aria-live="polite">
              <CenterToastBubble variant={dragFeedback === 'correct' ? 'correct' : 'incorrect'}>
                {dragFeedback === 'correct' ? (
                  <CorrectBigText>{t.correctPlacement}</CorrectBigText>
                ) : (
                  <IncorrectToastText>{t.wrongPlacement}</IncorrectToastText>
                )}
              </CenterToastBubble>
            </CenterToastOverlay>
          )}

          <HintModals
            hintText={settings.hint?.text}
            showHintWarning={gameHint.showHintWarning}
            showHintText={gameHint.showHintText}
            onConfirm={gameHint.confirmHint}
            onDismissWarning={gameHint.dismissHintWarning}
            onDismissText={gameHint.dismissHintText}
            t={t}
          />
        </PuzzleContainer>
      </PlayPhaseRoot>
    );
  }

  // ─── Playing (Question Phase) ───
  const question = currentQuestionIndex !== null ? processedQuestions[currentQuestionIndex] : null;
  if (!question) return null;

  return (
    <PlayPhaseRoot $inlineBackdrop={playPhaseInlineBackdrop}>
    <PuzzleContainer dir="rtl">
      {/* Top bar */}
      <PuzzleGameTopBar>
        <TopBarLeftCluster>
          <PuzzleGameTopBarItem>{t.piecesRevealed}: {revealedPieces.size}/{totalPieces}</PuzzleGameTopBarItem>
        </TopBarLeftCluster>
        <TopBarRightCluster>
          {timeLeft !== null && (
            <PuzzleGameTopBarTimer critical={timeLeft <= GAME_CONSTANTS.TIMER_WARNING_SECONDS}>
              {timeLeft}s
            </PuzzleGameTopBarTimer>
          )}
          {!activityHeaderAudio && (
            <PuzzleGameMuteButton onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? '🔇' : '🔊'}
            </PuzzleGameMuteButton>
          )}
        </TopBarRightCluster>
      </PuzzleGameTopBar>

      <PuzzleMainScroll>
        {/* Question box */}
        <QuestionBox key={currentQuestionIndex}>
          <QuestionBadge>{t.questionLabel}</QuestionBadge>
          <QuestionContent>{question.text}</QuestionContent>
        </QuestionBox>

        {/* Question media */}
        {question.media && (
          <NatureMediaContainer>
            <NatureMediaImage src={question.media} alt="" />
          </NatureMediaContainer>
        )}

        {/* Hint button / spacer */}
        {settings.hint?.enabled && settings.hint.text && (
          checked ? (
            <HintSpacer aria-hidden="true" />
          ) : (
            <HintButton
              hintUsed={gameHint.hintUsed}
              useHintLabel={t.useHint}
              showHintLabel={t.showHint}
              onClick={gameHint.handleHintClick}
            />
          )
        )}

        {/* Answer grid (2x2) */}
        <AnswerGrid>
          {question.answers.map((answer, index) => (
            <AnswerButton
              key={index}
              selected={selectedAnswer === index}
              checked={checked}
              isCorrect={answer.isCorrect}
              isSelected={selectedAnswer === index}
              onClick={() => { if (!checked) setSelectedAnswer(index); }}
              disabled={checked}
            >
              {answer.text}
            </AnswerButton>
          ))}
        </AnswerGrid>
      </PuzzleMainScroll>

      <PuzzleBottomBar>
        <ActionButton
          onClick={!checked ? handleCheck : undefined}
          disabled={
            checked ||
            (selectedAnswer === null &&
            (timeLeft === null || timeLeft > 0))
          }
        >
          {t.checkAnswer}
        </ActionButton>
      </PuzzleBottomBar>

      {toastVisible && checked && (
        <CenterToastOverlay dir={dir} aria-live="polite">
          <CenterToastBubble variant={isCorrect ? 'correct' : 'incorrect'}>
            {isCorrect ? (
              <>
                <CorrectBigText>{t.correct}</CorrectBigText>
                <PieceRevealedBadge>{t.pieceRevealed}</PieceRevealedBadge>
              </>
            ) : (
              <>
                <IncorrectToastText>{t.incorrect}</IncorrectToastText>
                <RetryBadge>{t.tryAgainLater}</RetryBadge>
              </>
            )}
          </CenterToastBubble>
        </CenterToastOverlay>
      )}

      <HintModals
        hintText={settings.hint?.text}
        showHintWarning={gameHint.showHintWarning}
        showHintText={gameHint.showHintText}
        onConfirm={gameHint.confirmHint}
        onDismissWarning={gameHint.dismissHintWarning}
        onDismissText={gameHint.dismissHintText}
        t={t}
      />
    </PuzzleContainer>
    </PlayPhaseRoot>
  );
}
