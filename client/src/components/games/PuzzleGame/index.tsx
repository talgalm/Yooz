import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './PuzzleGame.i18n';
import { shuffleArray } from '../../../utils/shuffleArray';
import { useGameHint } from '../../../hooks/useGameHint';
import HintModals from '../HintModals';
import HintButton from '../HintButton';
import { GameProps, GameResult, HintConfig, AgeRange, GAME_CONSTANTS } from '../types';
import {
  IntroContainer,
  IntroContent,
  IntroTitle,
  IntroInfoBox,
  IntroInfoText,
  IntroPuzzlePreview,
  IntroPuzzlePreviewImg,
  IntroPieceCount,
  IntroStartButton,
  IntroYoozLogo,
  PuzzleContainer,
  TopBar,
  TopBarItem,
  PuzzleFullImg,
  PuzzleGridOverlay,
  PuzzlePiece,
  QuestionBox,
  QuestionBadge,
  QuestionContent,
  AnswerGrid,
  AnswerButton,
  ActionButton,
  FeedbackFloater,
  FeedbackContainer,
  CorrectBigText,
  PieceRevealedBadge,
  WrongBigIcon,
  RetryBadge,
  NatureMediaContainer,
  NatureMediaImage,
  HintSpacer,
  PuzzleRevealOverlay,
  PuzzleRevealTitle,
  PuzzleRevealGrid,
  PuzzleRevealCounter,
  FinishContainer,
  FinishContent,
  FinishTitleBanner,
  FinishPuzzleImage,
  FinishPuzzleImg,
  FinishStump,
  FinishScoreNumber,
  FinishScoreLabel,
  FinishFinalLabel,
  FinishStats,
  FinishContinueButton,
  FinishYoozLogo,
} from './styled';

// ─── SVG Decorations ───

/** Tree ring lines inside the stump score circle */
function StumpRingsSvg() {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 200 200"
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
    >
      <circle cx="100" cy="100" r="12" fill="none" stroke="#b8944a" strokeWidth="1" opacity="0.4" />
      <circle cx="100" cy="100" r="24" fill="none" stroke="#a88440" strokeWidth="1.2" opacity="0.35" />
      <circle cx="100" cy="100" r="36" fill="none" stroke="#b8944a" strokeWidth="1" opacity="0.3" />
      <circle cx="100" cy="100" r="48" fill="none" stroke="#a07838" strokeWidth="1.5" opacity="0.25" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="#b8944a" strokeWidth="1" opacity="0.22" />
      <circle cx="100" cy="100" r="72" fill="none" stroke="#907030" strokeWidth="1.5" opacity="0.2" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="#b8944a" strokeWidth="1" opacity="0.18" />
      <path d="M100,100 L98,60 L102,35 L99,12" fill="none" stroke="#7a5828" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
      <path d="M100,100 L104,70 L108,50" fill="none" stroke="#7a5828" strokeWidth="1.2" opacity="0.2" strokeLinecap="round" />
    </svg>
  );
}

/** Leaf vein pattern for finish title banner */
function LeafVeinSvg() {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 340 90"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.12 }}
    >
      <line x1="10" y1="45" x2="330" y2="45" stroke="#fff" strokeWidth="1.5" />
      <line x1="60" y1="45" x2="30" y2="15" stroke="#fff" strokeWidth="1" />
      <line x1="60" y1="45" x2="30" y2="75" stroke="#fff" strokeWidth="1" />
      <line x1="120" y1="45" x2="85" y2="12" stroke="#fff" strokeWidth="1" />
      <line x1="120" y1="45" x2="85" y2="78" stroke="#fff" strokeWidth="1" />
      <line x1="180" y1="45" x2="150" y2="15" stroke="#fff" strokeWidth="1" />
      <line x1="180" y1="45" x2="150" y2="75" stroke="#fff" strokeWidth="1" />
      <line x1="240" y1="45" x2="210" y2="10" stroke="#fff" strokeWidth="1" />
      <line x1="240" y1="45" x2="210" y2="80" stroke="#fff" strokeWidth="1" />
      <line x1="300" y1="45" x2="270" y2="18" stroke="#fff" strokeWidth="1" />
      <line x1="300" y1="45" x2="270" y2="72" stroke="#fff" strokeWidth="1" />
    </svg>
  );
}

// ─── Types ───

interface PuzzleAnswer {
  text: string;
  isCorrect: boolean;
}

interface PuzzleQuestion {
  text: string;
  media?: string;
  answers: PuzzleAnswer[];
  ageRange?: AgeRange;
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

// ─── Component ───

export default function PuzzleGame({ game, onComplete, participantAge }: GameProps) {
  const settings = game.settings as unknown as PuzzleSettings;
  const t = useTranslations(texts);
  const gameHint = useGameHint(settings.hint);

  const totalPieces = settings.gridCols * settings.gridRows;
  const retryGap = settings.retryGap || 3;
  const scoring = settings.scoring || { basePoints: 100, speedBonusMax: 50, timeLimitSeconds: 0 };

  // Filter questions by age
  const allQuestions = settings.questions || [];
  const filteredQuestions = useMemo(() => {
    if (participantAge === undefined) return allQuestions;
    return allQuestions.filter((q) => {
      if (!q.ageRange) return true;
      return participantAge >= q.ageRange.minAge && participantAge <= q.ageRange.maxAge;
    });
  }, [allQuestions, participantAge]);

  const processedQuestions = useMemo(() => {
    return filteredQuestions.map((q) => ({
      ...q,
      answers: settings.shuffleAnswers !== false ? shuffleArray(q.answers) : q.answers,
    }));
  }, [filteredQuestions]);

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
  const [showFeedback, setShowFeedback] = useState(false);

  // Stats
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [totalScore, setTotalScore] = useState(0);

  // Puzzle reveal overlay
  const [showPuzzleReveal, setShowPuzzleReveal] = useState(false);
  const [lastRevealedPiece, setLastRevealedPiece] = useState<number | null>(null);

  // Timer — overall game timer for speed bonus
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track revealed pieces in a ref to avoid stale closure in revealRandomPiece
  const revealedPiecesRef = useRef<Set<number>>(new Set());
  const elapsedSecondsRef = useRef(0);
  const pendingTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Keep refs in sync
  useEffect(() => {
    revealedPiecesRef.current = revealedPieces;
  }, [revealedPieces]);

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  // Auto-complete when all content filtered by age
  useEffect(() => {
    if (noContent && gameComplete) {
      onComplete({
        score: 0,
        maxPossibleScore: 0,
        durationMs: Date.now() - gameStartTime.current,
        hintUsed: false,
      });
    }
  }, [noContent, gameComplete]);

  // Initialize question queue
  useEffect(() => {
    if (processedQuestions.length === 0) {
      setNoContent(true);
      setGameComplete(true);
      return;
    }
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

  const startGame = () => {
    setGameStarted(true);
    setElapsedSeconds(0);
  };

  const advanceToNextQuestion = useCallback(() => {
    setSelectedAnswer(null);
    setChecked(false);
    setIsCorrect(false);
    setShowFeedback(false);

    const nextPos = queuePosRef.current + 1;

    if (nextPos < queueRef.current.length) {
      // More questions in this round
      queuePosRef.current = nextPos;
      setCurrentQuestionIndex(queueRef.current[nextPos]);
    } else if (wrongThisRoundRef.current.length > 0) {
      // Start new round with the wrong answers
      const newRound = shuffleArray([...wrongThisRoundRef.current]);
      queueRef.current = newRound;
      queuePosRef.current = 0;
      wrongThisRoundRef.current = [];
      setCurrentQuestionIndex(newRound[0]);
    }
    // else: all pieces should be revealed — game completion handles this
  }, []);

  const revealRandomPiece = useCallback(() => {
    const currentRevealed = revealedPiecesRef.current;
    const unrevealed: number[] = [];
    for (let i = 0; i < totalPieces; i++) {
      if (!currentRevealed.has(i)) unrevealed.push(i);
    }
    if (unrevealed.length === 0) return;
    const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const newRevealed = new Set(currentRevealed);
    newRevealed.add(randomIndex);
    setRevealedPieces(newRevealed);
    setLastRevealedPiece(randomIndex);
    setShowPuzzleReveal(true);

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
      }, 3000));
    } else {
      // Auto-advance to next question after 3s
      pendingTimeouts.current.push(setTimeout(() => {
        setShowPuzzleReveal(false);
        setLastRevealedPiece(null);
        advanceToNextQuestion();
      }, 3000));
    }
  }, [totalPieces, scoring, advanceToNextQuestion]);

  const handleCheck = () => {
    if (checked || selectedAnswer === null || currentQuestionIndex === null) return;
    const question = processedQuestions[currentQuestionIndex];
    if (!question) return;

    const answer = question.answers[selectedAnswer];
    const correct = answer?.isCorrect || false;

    setIsCorrect(correct);
    setChecked(true);
    setShowFeedback(true);
    setTotalAttempts((prev) => prev + 1);

    if (correct) {
      setCorrectCount((prev) => prev + 1);
      // Show feedback 3s, then reveal piece
      pendingTimeouts.current.push(setTimeout(() => {
        revealRandomPiece();
      }, 3000));
    } else {
      // Collect wrong answer for next round
      wrongThisRoundRef.current.push(currentQuestionIndex);
      // Auto-advance after 3s
      pendingTimeouts.current.push(setTimeout(() => {
        advanceToNextQuestion();
      }, 3000));
    }
  };

  const handleNext = () => {
    // Fallback manual advance (shouldn't be needed with auto-advance)
    setShowPuzzleReveal(false);
    setLastRevealedPiece(null);
    if (revealedPiecesRef.current.size >= totalPieces) return;
    advanceToNextQuestion();
  };

  const handleFinish = () => {
    const maxPossibleScore = (scoring.basePoints || 100) + (scoring.speedBonusMax || 50);
    onComplete({
      score: gameHint.applyHintPenalty(totalScore),
      maxPossibleScore,
      durationMs: Date.now() - gameStartTime.current,
      hintUsed: gameHint.hintUsed,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── Opening / Intro screen ───
  if (!gameStarted) {
    return (
      <IntroContainer dir="rtl">
        <IntroContent>
          <IntroTitle>{game.name}</IntroTitle>

          {settings.instructions && (
            <IntroInfoBox>
              <IntroInfoText>{settings.instructions}</IntroInfoText>
            </IntroInfoBox>
          )}

          <IntroPieceCount>{totalPieces} {t.pieces}</IntroPieceCount>

          <IntroStartButton onClick={startGame}>
            {t.startPuzzle}
          </IntroStartButton>

          <IntroYoozLogo><img src="/images/logo-white.png" alt="Yooz" style={{ height: 36 }} /></IntroYoozLogo>
        </IntroContent>
      </IntroContainer>
    );
  }

  // ─── Game complete / Finish ───
  if (gameComplete) {
    if (noContent) return null;
    const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
    return (
      <FinishContainer dir="rtl">
        <FinishContent>
          <FinishTitleBanner>
            <LeafVeinSvg />
            <span style={{ position: 'relative', zIndex: 1 }}>{t.gameComplete}</span>
          </FinishTitleBanner>

          {settings.puzzleImage && (
            <FinishPuzzleImage>
              <FinishPuzzleImg src={settings.puzzleImage} alt="Completed Puzzle" />
            </FinishPuzzleImage>
          )}

          <FinishStump>
            <StumpRingsSvg />
            <FinishScoreNumber>{totalScore}</FinishScoreNumber>
            <FinishScoreLabel>{t.pointsFull}</FinishScoreLabel>
          </FinishStump>

          <FinishFinalLabel>{t.finalScore}</FinishFinalLabel>
          <FinishStats>
            {t.accuracy}: {accuracy}%
            <br />
            {t.timeElapsed}: {formatTime(elapsedSeconds)}
            <br />
            {t.piecesRevealed}: {revealedPieces.size}/{totalPieces}
          </FinishStats>

          <FinishContinueButton onClick={handleFinish}>
            {t.continue}
          </FinishContinueButton>

          <FinishYoozLogo><img src="/images/logo-purple.png" alt="Yooz" style={{ height: 36 }} /></FinishYoozLogo>
        </FinishContent>
      </FinishContainer>
    );
  }

  // ─── Playing ───
  const question = currentQuestionIndex !== null ? processedQuestions[currentQuestionIndex] : null;
  if (!question) return null;

  return (
    <PuzzleContainer dir="rtl">
      {/* Top bar: pieces | timer */}
      <TopBar>
        <TopBarItem>{t.piecesRevealed}: {revealedPieces.size}/{totalPieces}</TopBarItem>
        <TopBarItem>{t.timeElapsed}: {formatTime(elapsedSeconds)}</TopBarItem>
      </TopBar>

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

      {/* Feedback — floats over content, does NOT push answers down */}
      {showFeedback && (
        <FeedbackFloater>
          {isCorrect ? (
            <FeedbackContainer>
              <CorrectBigText>{t.correct}</CorrectBigText>
              <PieceRevealedBadge>{t.pieceRevealed}</PieceRevealedBadge>
            </FeedbackContainer>
          ) : (
            <FeedbackContainer>
              <WrongBigIcon>✕</WrongBigIcon>
              <RetryBadge>{t.tryAgainLater}</RetryBadge>
            </FeedbackContainer>
          )}
        </FeedbackFloater>
      )}

      {/* Answer grid (2×2) */}
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

      {/* Action button */}
      <ActionButton
        onClick={!checked ? handleCheck : handleNext}
        disabled={!checked && selectedAnswer === null}
      >
        {!checked ? t.checkAnswer : t.nextQuestion}
      </ActionButton>

      {/* Puzzle reveal overlay — shown after correct answer */}
      {showPuzzleReveal && (
        <PuzzleRevealOverlay>
          <PuzzleRevealTitle>🧩 {t.pieceRevealed}</PuzzleRevealTitle>
          <PuzzleRevealGrid sx={{ aspectRatio: `${settings.gridCols}/${settings.gridRows}` }}>
            <PuzzleFullImg src={settings.puzzleImage} alt="Puzzle" />
            <PuzzleGridOverlay cols={settings.gridCols} rows={settings.gridRows}>
              {Array.from({ length: totalPieces }, (_, i) => (
                <PuzzlePiece
                  key={i}
                  revealed={revealedPieces.has(i) && i !== lastRevealedPiece}
                  justRevealed={i === lastRevealedPiece}
                >
                  {!revealedPieces.has(i) && '?'}
                </PuzzlePiece>
              ))}
            </PuzzleGridOverlay>
          </PuzzleRevealGrid>
          <PuzzleRevealCounter>
            {revealedPieces.size}/{totalPieces} {t.pieces}
          </PuzzleRevealCounter>
        </PuzzleRevealOverlay>
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
  );
}
