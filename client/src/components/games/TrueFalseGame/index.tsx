import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './TrueFalseGame.i18n';
import { useGameHint } from '../../../hooks/useGameHint';
import HintModals from '../HintModals';
import HintButton from '../HintButton';
import { GameProps, QuestionAnswerRecord, HintConfig, GAME_CONSTANTS } from '../types';
import { useGameSounds } from '../../../hooks/useGameSounds';
import {
  useActivityPlayingHeaderHostActive,
  useRegisterActivityGameHeader,
  type ActivityGameHeaderPhase,
} from '../../../context/activityPlayingHeaderContext';
import { useThemedSceneOverlaySetter } from '../../../context/themedSceneOverlayContext';
import { GameIntroHeaderBar, GameHeaderMuteButton } from '../styled';
import {
  NatureContainer,
  TFHeader,
  TFHeaderLeft,
  TFHeaderRight,
  TFScoreBadge,
  TFProgressBadge,
  QuestionBanner,
  QuestionBannerText,
  TimerCircleWrapper,
  TimerCircle,
  TimerCircleNumber,
  NatureButtonRow,
  WrongButton,
  CorrectButton,
  FeedbackOverlayRoot,
  FeedbackOverlayCard,
  NatureCountdown,
  NatureCountdownBody,
  NatureCountdownLabel,
  NatureCountdownNumber,
  NatureMediaContainer,
  NatureMediaImage,
  IntroContainer,
  IntroFullScreenSceneBackdrop,
  PlayFullScreenSceneBackdrop,
  PlayPhaseRoot,
  IntroContent,
  IntroGameTitleSticker,
  IntroGameTitleLine,
  IntroWelcomeMidSpacer,
  IntroDescStack,
  IntroDescCard,
  IntroDescLine,
  IntroDescCustom,
  IntroStartButton,
  FinishContainer,
  FinishContent,
  FinishStumpStage,
  FinishStump,
  FinishScoreNumber,
  FinishScoreLabel,
} from './styled';

// ─── SVG Icons ───

function CrossIcon() {
  return (
    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CorrectMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" style={{ position: 'absolute', top: -2, right: -2 }}>
      <circle cx="14" cy="14" r="13" fill="#3d8b37" stroke="#fff" strokeWidth="2" />
      <polyline points="8,14 12,19 20,9" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WrongMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" style={{ position: 'absolute', top: -2, right: -2 }}>
      <circle cx="14" cy="14" r="13" fill="#c0392b" stroke="#fff" strokeWidth="2" />
      <line x1="9" y1="9" x2="19" y2="19" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="19" y1="9" x2="9" y2="19" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Types ───

interface TrueFalseStatement {
  text: string;
  isTrue: boolean;
  media?: string;
}

interface TrueFalseScoring {
  correctPoints: number;
  wrongPenalty: number;
  timeLimitSeconds: number;
}

interface TrueFalseSettings {
  instructions?: string;
  hint?: HintConfig;
  statements: TrueFalseStatement[];
  scoring: TrueFalseScoring;
  showCountdown?: boolean;
  feedbackDurationMs?: number;
}

const FEEDBACK_POPUP_MS = 3000;

// ─── Session progress helpers ───

const PROGRESS_KEY_PREFIX = 'yooz_game_progress_';

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

interface SavedGameProgress {
  nextIndex: number;
  totalScore: number;
  questionAnswers: QuestionAnswerRecord[];
  hintUsed: boolean;
  gameStartTime: number;
}

function loadGameProgress(gameId: string): SavedGameProgress | null {
  try {
    const raw = sessionStorage.getItem(getProgressKey(gameId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveGameProgress(gameId: string, data: SavedGameProgress) {
  try { sessionStorage.setItem(getProgressKey(gameId), JSON.stringify(data)); } catch {}
}

function clearGameProgress(gameId: string) {
  try { sessionStorage.removeItem(getProgressKey(gameId)); } catch {}
}

// ─── Component ───

export default function TrueFalseGame({ game, onComplete }: GameProps) {
  const settings = game.settings as unknown as TrueFalseSettings;
  const t = useTranslations(texts);
  const gameHint = useGameHint(settings.hint);
  const sounds = useGameSounds();

  const gameStartTime = useRef(Date.now());
  const questionStartTime = useRef(Date.now());

  const scoring = settings.scoring || { correctPoints: 10, wrongPenalty: 0, timeLimitSeconds: 10 };
  const feedbackDuration = settings.feedbackDurationMs || GAME_CONSTANTS.FEEDBACK_DURATION_MS;

  const statements = settings.statements || [];

  // Check for saved progress on mount
  const savedProgress = useRef(loadGameProgress(game._id));
  const isResuming = savedProgress.current !== null && savedProgress.current.nextIndex < statements.length;

  const introStickerLines = useMemo(() => {
    const lines = game.name
      ? game.name.split(/\n/).map((line) => line.trim()).filter(Boolean)
      : [];
    return lines.length > 0 ? lines : null;
  }, [game.name]);

  const [showInstructions, setShowInstructions] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [noContent, setNoContent] = useState(false);
  const [questionAnswers, setQuestionAnswers] = useState<QuestionAnswerRecord[]>([]);

  // Per-question state
  const [answered, setAnswered] = useState(false);
  const [userAnswer, setUserAnswer] = useState<boolean | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Timer per question
  const [timeLeft, setTimeLeft] = useState<number>(scoring.timeLimitSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs to avoid stale closures in handleAnswer
  const currentIndexRef = useRef(currentIndex);
  const answeredRef = useRef(answered);

  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { answeredRef.current = answered; }, [answered]);

  const activityHeaderAudio = useActivityPlayingHeaderHostActive();
  const activityHeaderPhase: ActivityGameHeaderPhase = gameComplete
    ? 'finish'
    : showInstructions
      ? 'intro'
      : 'playing';
  useRegisterActivityGameHeader(
    activityHeaderAudio,
    activityHeaderPhase,
    sounds.isMuted,
    sounds.toggleMute
  );

  const setThemedSceneOverlay = useThemedSceneOverlaySetter();

  useEffect(() => {
    if (!setThemedSceneOverlay) return;
    if (showInstructions) {
      setThemedSceneOverlay(<IntroFullScreenSceneBackdrop aria-hidden />);
    } else {
      setThemedSceneOverlay(<PlayFullScreenSceneBackdrop aria-hidden />);
    }
    return () => setThemedSceneOverlay(null);
  }, [showInstructions, setThemedSceneOverlay]);

  /** Admin preview has no themed shell — paint play background inside the game area */
  const playPhaseInlineBackdrop = !setThemedSceneOverlay;

  // Auto-complete if no statements
  useEffect(() => {
    if (statements.length === 0) {
      setNoContent(true);
      setGameComplete(true);
    }
  }, []);

  // Countdown effect (3-2-1)
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      startQuestion();
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const startQuestion = useCallback(() => {
    if (feedbackHideTimerRef.current) {
      clearTimeout(feedbackHideTimerRef.current);
      feedbackHideTimerRef.current = null;
    }
    setAnswered(false);
    setUserAnswer(null);
    setIsCorrect(false);
    setShowFeedback(false);
    setTimeLeft(scoring.timeLimitSeconds);
    questionStartTime.current = Date.now();
  }, [scoring.timeLimitSeconds]);

  // Question timer countdown
  useEffect(() => {
    if (countdown !== null || showInstructions || gameComplete || answered) return;
    if (timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown, showInstructions, gameComplete, answered, timeLeft <= 0]);

  // Time's up — auto handle as unanswered
  useEffect(() => {
    if (timeLeft === 0 && !answered && countdown === null && !showInstructions && !gameComplete) {
      handleAnswer(null);
    }
  }, [timeLeft, answered, countdown, showInstructions, gameComplete]);

  const handleAnswer = useCallback((answer: boolean | null) => {
    if (answeredRef.current) return;
    setAnswered(true);
    setUserAnswer(answer);
    if (timerRef.current) clearInterval(timerRef.current);

    const statement = statements[currentIndexRef.current];
    if (!statement) return;

    let points = 0;
    let correct = false;

    if (answer !== null) {
      correct = answer === statement.isTrue;
      if (correct) {
        points = scoring.correctPoints;
      } else {
        points = -(scoring.wrongPenalty || 0);
      }
    }

    setIsCorrect(correct);
    setShowFeedback(true);
    setTotalScore((prev) => Math.max(0, prev + points));

    // Track question answer for analytics
    setQuestionAnswers((prev) => [...prev, {
      questionIndex: currentIndexRef.current,
      questionText: statement.text,
      selectedAnswers: answer !== null ? [answer ? 1 : 0] : [],
      correctAnswers: [statement.isTrue ? 1 : 0],
      isCorrect: correct,
      pointsEarned: Math.max(0, points),
      timeSpentMs: Date.now() - questionStartTime.current,
    }]);

    // Play answer SFX
    if (answer !== null) {
      if (correct) sounds.playCorrect();
      else sounds.playWrong();
    } else {
      sounds.playWrong(); // timeout = wrong
    }

    if (feedbackHideTimerRef.current) clearTimeout(feedbackHideTimerRef.current);
    feedbackHideTimerRef.current = setTimeout(() => {
      setShowFeedback(false);
      feedbackHideTimerRef.current = null;
    }, FEEDBACK_POPUP_MS);

    const advanceAfterMs = Math.max(feedbackDuration, FEEDBACK_POPUP_MS);
    feedbackTimerRef.current = setTimeout(() => {
      const nextIndex = currentIndexRef.current + 1;
      if (nextIndex >= statements.length) {
        setGameComplete(true);
      } else {
        setCurrentIndex(nextIndex);
        startQuestion();
      }
    }, advanceAfterMs);
  }, [statements, scoring, feedbackDuration, startQuestion]);

  // Play game over sound when game completes
  useEffect(() => {
    if (gameComplete && !noContent) {
      sounds.playGameOver();
    }
  }, [gameComplete, noContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (feedbackHideTimerRef.current) clearTimeout(feedbackHideTimerRef.current);
    };
  }, []);

  // Save progress to sessionStorage after each answered question
  useEffect(() => {
    if (questionAnswers.length === 0 || gameComplete) return;
    saveGameProgress(game._id, {
      nextIndex: questionAnswers.length, // next unanswered question
      totalScore,
      questionAnswers,
      hintUsed: gameHint.hintUsed,
      gameStartTime: gameStartTime.current,
    });
  }, [questionAnswers, totalScore, gameComplete]);

  // Clear progress when game is complete
  useEffect(() => {
    if (gameComplete) clearGameProgress(game._id);
  }, [gameComplete]);

  const handleFinish = () => {
    const maxPossible = statements.length * scoring.correctPoints;
    onComplete({
      score: gameHint.applyHintPenalty(totalScore),
      maxPossibleScore: maxPossible,
      durationMs: Date.now() - gameStartTime.current,
      hintUsed: gameHint.hintUsed,
      questionAnswers,
    });
  };

  const beginGame = () => {
    setShowInstructions(false);
    sounds.startBgMusic();

    // Restore saved progress if resuming
    const saved = savedProgress.current;
    if (saved && saved.nextIndex < statements.length) {
      setCurrentIndex(saved.nextIndex);
      setTotalScore(saved.totalScore);
      setQuestionAnswers(saved.questionAnswers);
      gameStartTime.current = saved.gameStartTime;
      if (saved.hintUsed) gameHint.forceHintUsed();
      savedProgress.current = null; // consumed
      startQuestion();
      return;
    }

    if (settings.showCountdown !== false) {
      setCountdown(3);
    } else {
      startQuestion();
    }
  };

  // ─── Opening / Instructions screen ───
  if (showInstructions) {
    return (
      <IntroContainer dir="rtl" $externalBackdrop={Boolean(setThemedSceneOverlay)}>
        {!activityHeaderAudio && (
          <GameIntroHeaderBar>
            <GameHeaderMuteButton onClick={sounds.toggleMute} aria-label={sounds.isMuted ? 'Unmute' : 'Mute'}>
              {sounds.isMuted ? '🔇' : '🔊'}
            </GameHeaderMuteButton>
          </GameIntroHeaderBar>
        )}
        <IntroContent>
          <IntroGameTitleSticker dir="auto">
            {introStickerLines ? (
              introStickerLines.map((line, i) => (
                <IntroGameTitleLine key={i}>{line}</IntroGameTitleLine>
              ))
            ) : (
              <>
                <IntroGameTitleLine>{t.gameTitleLine1}</IntroGameTitleLine>
                <IntroGameTitleLine>{t.gameTitleLine2}</IntroGameTitleLine>
              </>
            )}
          </IntroGameTitleSticker>

          <IntroWelcomeMidSpacer aria-hidden />

          <IntroDescStack>
            <IntroDescCard>
              {settings.instructions?.trim() ? (
                <IntroDescCustom>{settings.instructions.trim()}</IntroDescCustom>
              ) : (
                t.defaultInstructionLines.map((line, i) => (
                  <IntroDescLine key={i}>{line}</IntroDescLine>
                ))
              )}
            </IntroDescCard>
            <IntroStartButton type="button" $overlap onClick={beginGame}>
              {isResuming ? t.continue : t.start}
            </IntroStartButton>
          </IntroDescStack>

        </IntroContent>
      </IntroContainer>
    );
  }

  // ─── Countdown screen (3-2-1) ───
  if (countdown !== null) {
    return (
      <PlayPhaseRoot $inlineBackdrop={playPhaseInlineBackdrop}>
        <NatureCountdown dir="rtl">
          {!activityHeaderAudio && (
            <GameIntroHeaderBar>
              <GameHeaderMuteButton onClick={sounds.toggleMute} aria-label={sounds.isMuted ? 'Unmute' : 'Mute'}>
                {sounds.isMuted ? '🔇' : '🔊'}
              </GameHeaderMuteButton>
            </GameIntroHeaderBar>
          )}
          <NatureCountdownBody>
            <NatureCountdownLabel>{t.getReady}</NatureCountdownLabel>
            <NatureCountdownNumber key={countdown}>{countdown}</NatureCountdownNumber>
          </NatureCountdownBody>
        </NatureCountdown>
      </PlayPhaseRoot>
    );
  }

  // ─── Game complete ───
  if (gameComplete) {
    if (noContent) return null;
    return (
      <PlayPhaseRoot $inlineBackdrop={playPhaseInlineBackdrop}>
        <FinishContainer dir="rtl">
          {!activityHeaderAudio && (
            <GameIntroHeaderBar>
              <GameHeaderMuteButton onClick={sounds.toggleMute} aria-label={sounds.isMuted ? 'Unmute' : 'Mute'}>
                {sounds.isMuted ? '🔇' : '🔊'}
              </GameHeaderMuteButton>
            </GameIntroHeaderBar>
          )}
          <FinishContent $stumpCentered>
          <IntroGameTitleSticker dir="auto">
            <IntroGameTitleLine>{t.gameComplete}</IntroGameTitleLine>
          </IntroGameTitleSticker>

          <FinishStumpStage aria-hidden>
            <FinishStump>
              <FinishScoreNumber>{totalScore}</FinishScoreNumber>
              <FinishScoreLabel>{t.pointsFull}</FinishScoreLabel>
            </FinishStump>
          </FinishStumpStage>

          <IntroStartButton type="button" $pinBottom onClick={handleFinish}>
            {t.continue}
          </IntroStartButton>
        </FinishContent>
        </FinishContainer>
      </PlayPhaseRoot>
    );
  }

  // ─── Playing ───
  const statement = statements[currentIndex];
  if (!statement) return null;

  const timerCritical = timeLeft <= GAME_CONSTANTS.TIMER_CRITICAL_SECONDS;

  return (
    <PlayPhaseRoot $inlineBackdrop={playPhaseInlineBackdrop}>
      <NatureContainer dir="rtl">
      {/* Header */}
      <TFHeader>
        <TFHeaderLeft>
          <TFScoreBadge>{totalScore} {t.points}</TFScoreBadge>
          {!activityHeaderAudio && (
            <GameHeaderMuteButton onClick={sounds.toggleMute} aria-label={sounds.isMuted ? 'Unmute' : 'Mute'}>
              {sounds.isMuted ? '🔇' : '🔊'}
            </GameHeaderMuteButton>
          )}
        </TFHeaderLeft>
        <TFHeaderRight>
          <TFProgressBadge>{currentIndex + 1}/{statements.length}</TFProgressBadge>
        </TFHeaderRight>
      </TFHeader>

      {/* Question — same panel style as intro description (IntroDescCard) */}
      <QuestionBanner key={currentIndex}>
        <QuestionBannerText>{statement.text}</QuestionBannerText>
      </QuestionBanner>

      {/* Statement media */}
      {statement.media && (
        <NatureMediaContainer>
          <NatureMediaImage src={statement.media} alt="" />
        </NatureMediaContainer>
      )}

      {/* Hint: keep mounted when answered so flex layout (timer position) does not jump */}
      {settings.hint?.enabled && settings.hint.text && (
        <div
          style={{
            visibility: answered ? 'hidden' : 'visible',
            pointerEvents: answered ? 'none' : 'auto',
          }}
          aria-hidden={answered ? true : undefined}
        >
          <HintButton
            hintUsed={gameHint.hintUsed}
            useHintLabel={t.useHint}
            showHintLabel={t.showHint}
            onClick={gameHint.handleHintClick}
          />
        </div>
      )}

      {/* Timer — flat purple disc + stroked digit */}
      <TimerCircleWrapper>
        <TimerCircle critical={timerCritical}>
          <TimerCircleNumber critical={timerCritical}>{timeLeft}</TimerCircleNumber>
        </TimerCircle>
      </TimerCircleWrapper>

      {showFeedback &&
        typeof document !== 'undefined' &&
        createPortal(
          <FeedbackOverlayRoot aria-live="polite">
            <FeedbackOverlayCard
              variant={userAnswer === null ? 'timeout' : isCorrect ? 'correct' : 'incorrect'}
            >
              {userAnswer === null
                ? t.timeUp
                : isCorrect
                  ? `${t.correct} +${scoring.correctPoints} ${t.points}`
                  : t.incorrect}
            </FeedbackOverlayCard>
          </FeedbackOverlayRoot>,
          document.body
        )}

      {/* Wrong / Correct buttons */}
      <NatureButtonRow>
        <WrongButton
          answered={answered}
          isCorrectAnswer={answered && !statement.isTrue}
          wasSelected={answered && userAnswer === false && statement.isTrue}
          onClick={() => !answered && handleAnswer(false)}
          disabled={answered}
        >
          <CrossIcon />
          {answered && !statement.isTrue && <CorrectMark />}
          {answered && userAnswer === false && statement.isTrue && <WrongMark />}
        </WrongButton>

        <CorrectButton
          answered={answered}
          isCorrectAnswer={answered && statement.isTrue}
          wasSelected={answered && userAnswer === true && !statement.isTrue}
          onClick={() => !answered && handleAnswer(true)}
          disabled={answered}
        >
          <CheckIcon />
          {answered && statement.isTrue && <CorrectMark />}
          {answered && userAnswer === true && !statement.isTrue && <WrongMark />}
        </CorrectButton>
      </NatureButtonRow>

      <HintModals
        hintText={settings.hint?.text}
        showHintWarning={gameHint.showHintWarning}
        showHintText={gameHint.showHintText}
        onConfirm={gameHint.confirmHint}
        onDismissWarning={gameHint.dismissHintWarning}
        onDismissText={gameHint.dismissHintText}
        t={t}
      />
      </NatureContainer>
    </PlayPhaseRoot>
  );
}
