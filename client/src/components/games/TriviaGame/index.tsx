import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './TriviaGame.i18n';
import { shuffleArray } from '../../../utils/shuffleArray';
import { useGameHint } from '../../../hooks/useGameHint';
import HintModals from '../HintModals';
import HintButton from '../HintButton';
import { GameProps, QuestionAnswerRecord, HintConfig, AgeRange, GAME_CONSTANTS } from '../types';
import { useGameSounds } from '../../../hooks/useGameSounds';
import {
  useActivityPlayingHeaderHostActive,
  useRegisterActivityGameHeader,
  type ActivityGameHeaderPhase,
} from '../../../context/activityPlayingHeaderContext';
import { GameIntroHeaderBar, GameHeaderMuteButton } from '../styled';
import {
  IntroContainer,
  IntroContent,
  IntroTitle,
  IntroInfoBox,
  IntroInfoText,
  IntroStartButton,
  IntroYoozLogo,
  TriviaContainer,
  TopBar,
  TopBarItem,
  TopBarTimer,
  TriviaMainScroll,
  TriviaBottomBar,
  QuestionBox,
  QuestionBadge,
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
  CenterToastOverlay,
  CenterToastBubble,
  CorrectBigText,
  PartialText,
  IncorrectToastText,
  PointsBadge,
  PointsBadgePartial,
  TriviaExplanationList,
  TriviaExplanation,
  NatureMediaContainer,
  NatureMediaImage,
  FinishContainer,
  FinishContent,
  FinishTitleBanner,
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
  ageRange?: AgeRange;
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

export default function TriviaGame({ game, onComplete, participantAge }: GameProps) {
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

  const questions = useMemo(() => {
    if (participantAge === undefined) return allQuestions;
    return allQuestions.filter((q) => {
      if (!q.ageRange) return true;
      return participantAge >= q.ageRange.minAge && participantAge <= q.ageRange.maxAge;
    });
  }, [allQuestions, participantAge]);

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
  const [correctCount, setCorrectCount] = useState(0);
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

  // Auto-complete when all content filtered by age
  useEffect(() => {
    if (noContent && gameComplete) {
      onComplete({ score: 0, maxPossibleScore: 0, durationMs: 0, hintUsed: false });
    }
  }, [noContent, gameComplete]);

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

  useEffect(() => {
    if (questions.length > 0) {
      initQuestion(0);
    } else {
      setNoContent(true);
      setGameComplete(true);
    }
  }, []);

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

  const toggleAnswer = (index: number) => {
    if (checked) return;
    if (eliminatedIndices.has(index)) return;
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
    if (selectedCorrectCount === totalCorrectInQuestion && selectedWrongCount === 0) {
      setCorrectCount((prev) => prev + 1);
    }

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

  const handleFinish = () => {
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
      <IntroContainer dir="rtl">
        {!activityHeaderAudio && (
          <GameIntroHeaderBar>
            <GameHeaderMuteButton onClick={sounds.toggleMute} aria-label={sounds.isMuted ? 'Unmute' : 'Mute'}>
              {sounds.isMuted ? '🔇' : '🔊'}
            </GameHeaderMuteButton>
          </GameIntroHeaderBar>
        )}
        <IntroContent>
          <IntroTitle>{t.triviaTitle}</IntroTitle>

          <IntroInfoBox>
            <IntroInfoText>
              {settings.instructions || game.name}
            </IntroInfoText>
          </IntroInfoBox>

          <IntroStartButton onClick={() => { setShowInstructions(false); sounds.startBgMusic(); }}>
            {t.start}
          </IntroStartButton>

          <IntroYoozLogo><img src="/images/logo-white.png" alt="Yooz" style={{ height: 36 }} /></IntroYoozLogo>
        </IntroContent>
      </IntroContainer>
    );
  }

  // ─── Game complete / Finish ───
  if (gameComplete) {
    if (noContent) return null;
    const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    return (
      <FinishContainer dir="rtl">
        {!activityHeaderAudio && (
          <GameIntroHeaderBar>
            <GameHeaderMuteButton onClick={sounds.toggleMute} aria-label={sounds.isMuted ? 'Unmute' : 'Mute'}>
              {sounds.isMuted ? '🔇' : '🔊'}
            </GameHeaderMuteButton>
          </GameIntroHeaderBar>
        )}
        <FinishContent>
          <FinishTitleBanner>
            <LeafVeinSvg />
            <span style={{ position: 'relative', zIndex: 1 }}>{t.gameComplete}</span>
          </FinishTitleBanner>

          <FinishStump>
            <StumpRingsSvg />
            <FinishScoreNumber>{totalScore}</FinishScoreNumber>
            <FinishScoreLabel>{t.pointsFull}</FinishScoreLabel>
          </FinishStump>

          <FinishFinalLabel>{t.finalScore}</FinishFinalLabel>
          <FinishStats>
            {t.correctAnswers}: {correctCount}/{questions.length}
            <br />
            {t.accuracy}: {accuracy}%
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

      {/* Top bar: score | timer | question count | mute */}
      <TopBar>
        <TopBarItem>{totalScore} {t.points}</TopBarItem>
        {timeLeft !== null && (
          <TopBarTimer critical={timeLeft <= GAME_CONSTANTS.TIMER_WARNING_SECONDS}>
            {timeLeft}s
          </TopBarTimer>
        )}
        <TopBarItem>{currentQuestion + 1}/{questions.length} {t.questionsLabel}</TopBarItem>
        {!activityHeaderAudio && (
          <GameHeaderMuteButton onClick={sounds.toggleMute} aria-label={sounds.isMuted ? 'Unmute' : 'Mute'}>
            {sounds.isMuted ? '🔇' : '🔊'}
          </GameHeaderMuteButton>
        )}
      </TopBar>

      <TriviaMainScroll>
      {/* Question box with floating badge */}
      <QuestionBox key={currentQuestion}>
        <QuestionBadge>{t.questionLabel} {currentQuestion + 1}</QuestionBadge>
        <QuestionContent>{question.text}</QuestionContent>
        {question.hint && <QuestionHintText>{question.hint}</QuestionHintText>}
      </QuestionBox>

      {/* Question media */}
      {question.media && (
        <NatureMediaContainer>
          <NatureMediaImage src={question.media} alt="" />
        </NatureMediaContainer>
      )}

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

      {/* Answer grid (2×2); lifeline hides wrong options until answer is checked */}
      <AnswerGrid>
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

      {settings.includeHelpers !== false && (!helperHalfUsed || !helperThreeQuartersUsed) && (
        checked ? (
          <HelperLifelineSpacer aria-hidden />
        ) : (
          <>
            <HelperLifelineRow>
              <HelperLifelineButton
                type="button"
                disabled={helperHalfUsed || !canApplyLifeline(question.answers, eliminatedIndices, 2)}
                onClick={() => applyLifeline(2, 'half')}
              >
                {t.helperHalf}
              </HelperLifelineButton>
              <HelperLifelineButton
                type="button"
                disabled={helperThreeQuartersUsed || !canApplyLifeline(question.answers, eliminatedIndices, 3)}
                onClick={() => applyLifeline(3, 'threeQuarters')}
              >
                {t.helperThreeQuarters}
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

      {toastVisible && feedbackType && (
        <CenterToastOverlay aria-live="polite">
          <CenterToastBubble
            variant={
              feedbackType === 'correct'
                ? 'correct'
                : feedbackType === 'partial'
                  ? 'partial'
                  : 'incorrect'
            }
          >
            {feedbackType === 'correct' && (
              <>
                <CorrectBigText>{t.correct}</CorrectBigText>
                <PointsBadge>
                  +{questionScore} {t.pointsFull}
                </PointsBadge>
              </>
            )}
            {feedbackType === 'partial' && (
              <>
                <PartialText>{t.partiallyCorrect}</PartialText>
                <PointsBadgePartial>
                  +{questionScore} {t.pointsFull}
                </PointsBadgePartial>
              </>
            )}
            {feedbackType === 'incorrect' && (
              <>
                <IncorrectToastText>{t.incorrect}</IncorrectToastText>
                {questionScore > 0 ? (
                  <PointsBadge>
                    +{questionScore} {t.pointsFull}
                  </PointsBadge>
                ) : null}
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
    </TriviaContainer>
  );
}
