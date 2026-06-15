import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './TriviaGame.i18n';
import { shuffleArray } from '../../../utils/shuffleArray';
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
  IntroContainer,
  IntroContent,
  IntroTitle,
  IntroDescStack,
  IntroDescCard,
  IntroDescText,
  IntroStartButton,
  IntroWelcomeMidSpacer,
  TriviaIntroFullScreenSceneBackdrop,
  TriviaPlayFullScreenSceneBackdrop,
  TriviaContainer,
  TopBar,
  TopBarItem,
  TopBarTimer,
  TriviaMainScroll,
  TriviaBottomBar,
  QuestionBox,
  QuestionContent,
  QuestionHintText,
  HintSpacer,
  HelperLifelineRow,
  HelperLifelineSpacer,
  HelperLifelineCaption,
  HelperLifelineButton,
  AnswerGrid,
  AnswerButton,
  ActionButton,
  FeedbackOverlayRoot,
  FeedbackOverlayCard,
  TriviaExplanationList,
  TriviaExplanation,
  NatureMediaContainer,
  NatureMediaImage,
  NatureMediaSpacer,
  FinishContainer,
  FinishContent,
  FinishTitleBanner,
  FinishStumpStage,
  FinishStump,
  FinishScoreNumber,
  FinishScoreLabel,
  FinishContinueButton,
} from './styled';

// ─── Types ───

interface TriviaAnswer {
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

interface TriviaQuestion {
  text: string;
  hint?: string;
  media?: string;
  answers: TriviaAnswer[];
}

interface TriviaScoring {
  correctAnswerPoints: number;
  wrongAnswerPenalty: number;
  /** Per-question countdown; resets when advancing (not a whole-game timer). */
  timeLimitSeconds?: number;
}

interface TriviaSettings {
  instructions?: string;
  hint?: HintConfig;
  questions: TriviaQuestion[];
  scoring: TriviaScoring;
  shuffleAnswers?: boolean;
  includeHelpers?: boolean;
  multiChoice?: boolean;
  multiChoiceMax?: number;
}

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

interface SavedTriviaProgress {
  nextIndex: number;
  totalScore: number;
  questionAnswers: QuestionAnswerRecord[];
  hintUsed: boolean;
  helperHalfUsed: boolean;
  helperThreeQuartersUsed: boolean;
  gameStartTime: number;
}

function loadTriviaProgress(gameId: string): SavedTriviaProgress | null {
  try {
    const raw = sessionStorage.getItem(getProgressKey(gameId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveTriviaProgress(gameId: string, data: SavedTriviaProgress) {
  try { sessionStorage.setItem(getProgressKey(gameId), JSON.stringify(data)); } catch {}
}

function clearTriviaProgress(gameId: string) {
  try { sessionStorage.removeItem(getProgressKey(gameId)); } catch {}
}

// ─── Completed-result persistence (refresh recovery) ───

interface CompletedTriviaResult {
  score: number;
  maxPossibleScore: number;
  durationMs: number;
  hintUsed: boolean;
  questionAnswers: QuestionAnswerRecord[];
}

function getCompletedKey(gameId: string): string {
  try {
    const token = localStorage.getItem('yooz_token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = `${payload.participantName || ''}_${payload.activityCode || ''}`;
      return PROGRESS_KEY_PREFIX + 'done_' + userId + '_' + gameId;
    }
  } catch {}
  return PROGRESS_KEY_PREFIX + 'done_' + gameId;
}

function saveCompletedResult(gameId: string, result: CompletedTriviaResult) {
  try { sessionStorage.setItem(getCompletedKey(gameId), JSON.stringify(result)); } catch {}
}

function loadCompletedResult(gameId: string): CompletedTriviaResult | null {
  try {
    const raw = sessionStorage.getItem(getCompletedKey(gameId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearCompletedResult(gameId: string) {
  try { sessionStorage.removeItem(getCompletedKey(gameId)); } catch {}
}

/** Whether more wrong answers can be eliminated to reach `targetVisible` options among currently visible answers. */
function canApplyLifeline(
  answers: TriviaAnswer[],
  alreadyEliminated: Set<number>,
  targetVisible: number
): boolean {
  const visibleIndices = answers.map((_, i) => i).filter((i) => !alreadyEliminated.has(i));
  const visibleCount = visibleIndices.length;
  if (visibleCount <= targetVisible) return false;
  const numCorrect = visibleIndices.filter((i) => answers[i].isCorrect).length;
  const numWrong = visibleCount - numCorrect;
  if (targetVisible < numCorrect) return false;
  const needRemove = visibleCount - targetVisible;
  return numWrong >= needRemove;
}

function pickWrongIndicesToEliminate(
  answers: TriviaAnswer[],
  alreadyEliminated: Set<number>,
  targetVisible: number
): number[] {
  const visibleIndices = answers.map((_, i) => i).filter((i) => !alreadyEliminated.has(i));
  const visibleCount = visibleIndices.length;
  if (visibleCount <= targetVisible) return [];
  const needRemove = visibleCount - targetVisible;
  const wrongVisible = visibleIndices.filter((i) => !answers[i].isCorrect);
  if (wrongVisible.length < needRemove) return [];
  const shuffled = shuffleArray([...wrongVisible]);
  return shuffled.slice(0, needRemove);
}

// ─── Component ───

export default function TriviaGame({ game, onComplete }: GameProps) {
  // If game was completed before a refresh, auto-complete immediately
  const [completedOnMount] = useState<CompletedTriviaResult | null>(() => {
    const r = loadCompletedResult(game._id);
    if (r) clearCompletedResult(game._id);
    return r;
  });

  useEffect(() => {
    if (completedOnMount) {
      onComplete(completedOnMount);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const settings = game.settings as unknown as TriviaSettings;
  const t = useTranslations(texts);
  const gameHint = useGameHint(settings.hint);
  const sounds = useGameSounds({
    correct: '/sounds/correct1.mp3',
    wrong: '/sounds/fail.wav',
    gameOver: '/sounds/success.wav',
    bgMusic: '/sounds/backgtound-music.mp3',
  });

  const gameStartTime = useRef(Date.now());
  const questionStartTime = useRef(Date.now());

  const allQuestions = settings.questions || [];
  const scoring = settings.scoring || {
    correctAnswerPoints: 10,
    wrongAnswerPenalty: 0,
    timeLimitSeconds: 10,
  };

  const questions = allQuestions;

  // Check for saved progress on mount
  const savedProgress = useRef(loadTriviaProgress(game._id));
  const isResuming = savedProgress.current !== null && savedProgress.current.nextIndex < questions.length;

  const processedQuestions = useMemo(() => {
    return questions.map((q) => ({
      ...q,
      answers: settings.shuffleAnswers !== false ? shuffleArray(q.answers) : q.answers,
    }));
  }, [questions, settings.shuffleAnswers]);

  const [showInstructions, setShowInstructions] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const [questionScore, setQuestionScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [noContent, setNoContent] = useState(false);
  const [questionAnswers, setQuestionAnswers] = useState<QuestionAnswerRecord[]>([]);
  /** One use per game each: 1/2 and 3/4 are independent. */
  const [helperHalfUsed, setHelperHalfUsed] = useState(false);
  const [helperThreeQuartersUsed, setHelperThreeQuartersUsed] = useState(false);
  /** Indices into current question's answers hidden after lifeline (cleared each question). */
  const [eliminatedIndices, setEliminatedIndices] = useState<Set<number>>(() => new Set());

  // Timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activityHeaderAudio = useActivityPlayingHeaderHostActive();
  const setThemedSceneOverlay = useThemedSceneOverlaySetter();
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

  // Paint intro artwork only for the opening phase.
  // Playing and finish should share the non-intro background.
  useEffect(() => {
    if (!setThemedSceneOverlay) return;
    if (showInstructions) {
      setThemedSceneOverlay(<TriviaIntroFullScreenSceneBackdrop aria-hidden />);
      return () => setThemedSceneOverlay(null);
    }
    setThemedSceneOverlay(<TriviaPlayFullScreenSceneBackdrop aria-hidden />);
    return () => setThemedSceneOverlay(null);
  }, [setThemedSceneOverlay, showInstructions]);

  const initQuestion = useCallback((_qi: number) => {
    setSelectedAnswers(new Set());
    setChecked(false);
    setQuestionScore(0);
    setEliminatedIndices(new Set());
    questionStartTime.current = Date.now();
    if (scoring.timeLimitSeconds && scoring.timeLimitSeconds > 0) {
      setTimeLeft(scoring.timeLimitSeconds);
    } else {
      setTimeLeft(null);
    }
  }, [scoring]);

  // Only init the first question after instructions are dismissed (so timer doesn't start early)
  const didInitRef = useRef(false);
  useEffect(() => {
    if (questions.length === 0) {
      setNoContent(true);
      setGameComplete(true);
      return;
    }
    if (showInstructions) return;
    if (didInitRef.current) return;
    didInitRef.current = true;
    initQuestion(0);
  }, [showInstructions]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || checked) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft === null, timeLeft === 0, checked]);

  // Time's up
  useEffect(() => {
    if (timeLeft === 0 && !checked) {
      handleCheck();
    }
  }, [timeLeft]);

  const applyLifeline = (targetVisible: 2 | 3, kind: 'half' | 'threeQuarters') => {
    if (checked) return;
    if (kind === 'half' && helperHalfUsed) return;
    if (kind === 'threeQuarters' && helperThreeQuartersUsed) return;
    const q = processedQuestions[currentQuestion];
    if (!q || !canApplyLifeline(q.answers, eliminatedIndices, targetVisible)) return;
    const toEliminate = pickWrongIndicesToEliminate(q.answers, eliminatedIndices, targetVisible);
    if (toEliminate.length === 0) return;
    setEliminatedIndices((prev) => {
      const next = new Set(prev);
      toEliminate.forEach((i) => next.add(i));
      return next;
    });
    if (kind === 'half') setHelperHalfUsed(true);
    else setHelperThreeQuartersUsed(true);
    setSelectedAnswers((prev) => {
      const next = new Set(prev);
      toEliminate.forEach((i) => next.delete(i));
      return next;
    });
  };

  const isMultiChoice = settings.multiChoice === true;

  const toggleAnswer = (index: number) => {
    if (checked) return;
    if (eliminatedIndices.has(index)) return;
    if (!isMultiChoice) {
      // Single-choice: selecting a new answer replaces the previous one
      setSelectedAnswers((prev) => {
        if (prev.has(index)) return new Set<number>();
        return new Set<number>([index]);
      });
      return;
    }
    // Multi-choice: unlimited toggle
    setSelectedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleCheck = () => {
    if (checked) return;
    const question = processedQuestions[currentQuestion];
    if (!question) return;

    let points = 0;
    let selectedCorrectCount = 0;
    let selectedWrongCount = 0;

    question.answers.forEach((answer, i) => {
      const isSelected = selectedAnswers.has(i);
      if (isSelected && answer.isCorrect) {
        points += scoring.correctAnswerPoints;
        selectedCorrectCount++;
      } else if (isSelected && !answer.isCorrect) {
        points -= scoring.wrongAnswerPenalty;
        selectedWrongCount++;
      }
    });

    const totalCorrectInQuestion = question.answers.filter((a) => a.isCorrect).length;

    points = Math.max(0, points);
    setQuestionScore(points);
    setTotalScore((prev) => prev + points);
    setChecked(true);
    if (timerRef.current) clearInterval(timerRef.current);

    // Track question answer for analytics
    const correctAnswerIndices = question.answers.map((a, i) => a.isCorrect ? i : -1).filter(i => i >= 0);
    setQuestionAnswers((prev) => [...prev, {
      questionIndex: currentQuestion,
      questionText: question.text,
      selectedAnswers: Array.from(selectedAnswers),
      correctAnswers: correctAnswerIndices,
      isCorrect: selectedCorrectCount === totalCorrectInQuestion && selectedWrongCount === 0,
      pointsEarned: points,
      timeSpentMs: Date.now() - questionStartTime.current,
    }]);

    // Play answer SFX
    if (selectedCorrectCount === totalCorrectInQuestion && selectedWrongCount === 0) {
      sounds.playCorrect();
    } else {
      sounds.playWrong();
    }
  };

  const handleNext = useCallback(() => {
    const nextQ = currentQuestion + 1;
    if (nextQ >= questions.length) {
      setGameComplete(true);
    } else {
      setCurrentQuestion(nextQ);
      initQuestion(nextQ);
    }
  }, [currentQuestion, questions.length, initQuestion]);

  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;

  /** ~1s center toast — does not move the answer grid. */
  const [toastVisible, setToastVisible] = useState(false);
  useEffect(() => {
    if (!checked) {
      setToastVisible(false);
      return;
    }
    setToastVisible(true);
    const id = window.setTimeout(() => setToastVisible(false), 1000);
    return () => clearTimeout(id);
  }, [checked, currentQuestion]);

  /** Auto-advance after 5s (manual Next still clears this via checked → false). */
  useEffect(() => {
    if (!checked) return;
    const id = window.setTimeout(() => handleNextRef.current(), 5000);
    return () => clearTimeout(id);
  }, [checked, currentQuestion]);

  // Play game over sound when game completes
  useEffect(() => {
    if (gameComplete && !noContent) {
      sounds.playGameOver();
    }
  }, [gameComplete, noContent]);

  // Save progress to sessionStorage after each answered question
  useEffect(() => {
    if (questionAnswers.length === 0 || gameComplete) return;
    saveTriviaProgress(game._id, {
      nextIndex: questionAnswers.length, // next unanswered question
      totalScore,
      questionAnswers,
      hintUsed: gameHint.hintUsed,
      helperHalfUsed,
      helperThreeQuartersUsed,
      gameStartTime: gameStartTime.current,
    });
  }, [questionAnswers, totalScore, gameComplete]);

  // Clear progress and save completed result when game is complete
  useEffect(() => {
    if (!gameComplete) return;
    clearTriviaProgress(game._id);
    if (noContent) return;
    const maxPossible = questions.reduce((sum, q) => sum + q.answers.filter(a => a.isCorrect).length * scoring.correctAnswerPoints, 0);
    saveCompletedResult(game._id, {
      score: gameHint.applyHintPenalty(totalScore),
      maxPossibleScore: maxPossible,
      durationMs: Date.now() - gameStartTime.current,
      hintUsed: gameHint.hintUsed,
      questionAnswers,
    });
  }, [gameComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinish = () => {
    clearCompletedResult(game._id);
    const maxPossible = questions.reduce((sum, q) => sum + q.answers.filter(a => a.isCorrect).length * scoring.correctAnswerPoints, 0);
    onComplete({
      score: gameHint.applyHintPenalty(totalScore),
      maxPossibleScore: maxPossible,
      durationMs: Date.now() - gameStartTime.current,
      hintUsed: gameHint.hintUsed,
      questionAnswers,
    });
  };

  // ─── Opening / Instructions screen ───
  if (showInstructions) {
    return (
      <>
        {!setThemedSceneOverlay && <TriviaIntroFullScreenSceneBackdrop aria-hidden />}
        <IntroContainer dir="rtl">
          {!activityHeaderAudio && (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <GameIntroHeaderBar>
                <GameHeaderMuteButton onClick={sounds.toggleMute} aria-label={sounds.isMuted ? 'Unmute' : 'Mute'}>
                  {sounds.isMuted ? '🔇' : '🔊'}
                </GameHeaderMuteButton>
              </GameIntroHeaderBar>
            </div>
          )}
          <IntroContent>
            <IntroTitle>{t.triviaTitle}</IntroTitle>

            <IntroWelcomeMidSpacer aria-hidden />

            <IntroDescStack>
              <IntroDescCard>
                <IntroDescText>{settings.instructions || game.name}</IntroDescText>
              </IntroDescCard>
              <IntroStartButton onClick={() => {
                setShowInstructions(false);
                sounds.startBgMusic();
                // Restore saved progress if resuming
                const saved = savedProgress.current;
                if (saved && saved.nextIndex < questions.length) {
                  setCurrentQuestion(saved.nextIndex);
                  setTotalScore(saved.totalScore);
                  setQuestionAnswers(saved.questionAnswers);
                  setHelperHalfUsed(saved.helperHalfUsed);
                  setHelperThreeQuartersUsed(saved.helperThreeQuartersUsed);
                  gameStartTime.current = saved.gameStartTime;
                  if (saved.hintUsed) gameHint.forceHintUsed();
                  savedProgress.current = null;
                }
              }}>
                {isResuming ? t.continue : ((game.settings as Record<string, unknown>).startButtonText as string)?.trim() || t.start}
              </IntroStartButton>
            </IntroDescStack>

          </IntroContent>
        </IntroContainer>
      </>
    );
  }

  // ─── Game complete / Finish ───
  if (gameComplete) {
    if (noContent) return null;
    return (
      <FinishContainer dir="rtl">
        {!setThemedSceneOverlay && <TriviaPlayFullScreenSceneBackdrop aria-hidden />}
        {!activityHeaderAudio && (
          <GameIntroHeaderBar>
            <GameHeaderMuteButton onClick={sounds.toggleMute} aria-label={sounds.isMuted ? 'Unmute' : 'Mute'}>
              {sounds.isMuted ? '🔇' : '🔊'}
            </GameHeaderMuteButton>
          </GameIntroHeaderBar>
        )}
        <FinishContent>
          <FinishTitleBanner>
            {((game.settings as Record<string, unknown>).endTitle as string)?.trim() || t.gameComplete}
          </FinishTitleBanner>

          <FinishStumpStage aria-hidden>
            <FinishStump>
              <FinishScoreNumber>{totalScore}</FinishScoreNumber>
              <FinishScoreLabel>{t.pointsFull}</FinishScoreLabel>
            </FinishStump>
          </FinishStumpStage>

          <FinishContinueButton onClick={handleFinish}>
            {((game.settings as Record<string, unknown>).endButtonText as string)?.trim() || t.continue}
          </FinishContinueButton>
        </FinishContent>
      </FinishContainer>
    );
  }

  // ─── Playing ───
  const question = processedQuestions[currentQuestion];
  if (!question) return null;

  // Determine feedback type
  let feedbackType: 'correct' | 'partial' | 'incorrect' | null = null;
  if (checked) {
    const totalCorrect = question.answers.filter((a) => a.isCorrect).length;
    const selectedCorrect = question.answers.filter((a, i) => selectedAnswers.has(i) && a.isCorrect).length;
    const selectedWrong = question.answers.filter((a, i) => selectedAnswers.has(i) && !a.isCorrect).length;
    if (selectedCorrect === totalCorrect && selectedWrong === 0) {
      feedbackType = 'correct';
    } else if (selectedCorrect > 0) {
      feedbackType = 'partial';
    } else {
      feedbackType = 'incorrect';
    }
  }

  return (
    <TriviaContainer dir="rtl">
      {!setThemedSceneOverlay && <TriviaPlayFullScreenSceneBackdrop aria-hidden />}

      {/* Top bar: score | timer | question count | mute */}
      <TopBar>
        <TopBarItem>{totalScore} {t.points}</TopBarItem>
        {timeLeft !== null && (
          <TopBarTimer critical={timeLeft <= GAME_CONSTANTS.TIMER_WARNING_SECONDS}>
            {timeLeft}s
          </TopBarTimer>
        )}
        <TopBarItem>{t.questionLabel} {currentQuestion + 1}/{questions.length}</TopBarItem>
        {!activityHeaderAudio && (
          <GameHeaderMuteButton onClick={sounds.toggleMute} aria-label={sounds.isMuted ? 'Unmute' : 'Mute'}>
            {sounds.isMuted ? '🔇' : '🔊'}
          </GameHeaderMuteButton>
        )}
      </TopBar>

      <TriviaMainScroll>
      {/* Question box */}
      <QuestionBox key={currentQuestion}>
        <QuestionContent>{question.text}</QuestionContent>
        {question.hint && (
          <QuestionHintText style={{ color: 'black' }}>{question.hint}</QuestionHintText>
        )}
   
      </QuestionBox>

      {/* Question media */}
      {question.media && (
        <NatureMediaContainer>
          <NatureMediaImage src={question.media} alt="" />
        </NatureMediaContainer>
      )}
      {!question.media && <NatureMediaSpacer aria-hidden />}

      {/* Hint area keeps its space after checking so answers do not jump upward */}
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

      {/* Answer grid (2×2 for 4 answers, single column for 3) */}
      <AnswerGrid answerCount={question.answers.length}>
        {question.answers.map((answer, index) => {
          if (!checked && eliminatedIndices.has(index)) return null;
          return (
            <AnswerButton
              key={index}
              selected={selectedAnswers.has(index)}
              checked={checked}
              isCorrect={answer.isCorrect}
              isSelected={selectedAnswers.has(index)}
              onClick={() => toggleAnswer(index)}
              disabled={checked}
            >
              {answer.text}
            </AnswerButton>
          );
        })}
      </AnswerGrid>

      {checked &&
        question.answers.some(
          (a, i) => !!a.explanation && (selectedAnswers.has(i) || a.isCorrect)
        ) && (
          <TriviaExplanationList>
            {question.answers.map((answer, index) =>
              answer.explanation && (selectedAnswers.has(index) || answer.isCorrect) ? (
                <TriviaExplanation key={`exp-${index}`}>
                  {answer.explanation}
                </TriviaExplanation>
              ) : null
            )}
          </TriviaExplanationList>
        )}

      {settings.includeHelpers !== false && question.answers.length >= 4 && (!helperHalfUsed || !helperThreeQuartersUsed) && (
        checked ? (
          <HelperLifelineSpacer aria-hidden />
        ) : (
          <>
            <HelperLifelineRow>
              <HelperLifelineButton
                type="button"
                kind="threeQuarters"
                disabled={helperThreeQuartersUsed || !canApplyLifeline(question.answers, eliminatedIndices, 3)}
                onClick={() => applyLifeline(3, 'threeQuarters')}
              >
                {t.helperThreeQuarters}
              </HelperLifelineButton>
              <HelperLifelineButton
                type="button"
                kind="half"
                disabled={helperHalfUsed || !canApplyLifeline(question.answers, eliminatedIndices, 2)}
                onClick={() => applyLifeline(2, 'half')}
              >
                {t.helperHalf}
              </HelperLifelineButton>
            </HelperLifelineRow>
            <HelperLifelineCaption>{t.helperCaption}</HelperLifelineCaption>
          </>
        )
      )}

      </TriviaMainScroll>

      <TriviaBottomBar>
        <ActionButton
          onClick={!checked ? handleCheck : handleNext}
          disabled={!checked && (selectedAnswers.size === 0 || timeLeft === 0)}
        >
          {!checked
            ? t.checkAnswer
            : currentQuestion < questions.length - 1
            ? t.nextQuestion
            : t.continue}
        </ActionButton>
      </TriviaBottomBar>

      {toastVisible && feedbackType && createPortal(
        <FeedbackOverlayRoot aria-live="polite">
          <FeedbackOverlayCard variant={feedbackType}>
            {feedbackType === 'correct'
              ? `${t.correct} +${questionScore} ${t.pointsFull}`
              : feedbackType === 'partial'
                ? `${t.partiallyCorrect} +${questionScore} ${t.pointsFull}`
                : t.incorrect}
          </FeedbackOverlayCard>
        </FeedbackOverlayRoot>,
        document.body,
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
    </TriviaContainer>
  );
}
