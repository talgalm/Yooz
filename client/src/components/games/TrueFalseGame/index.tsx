import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './TrueFalseGame.i18n';
import { useGameHint } from '../../../hooks/useGameHint';
import HintModals from '../HintModals';
import HintButton from '../HintButton';
import { GameProps, GameResult, QuestionAnswerRecord, HintConfig, AgeRange, GAME_CONSTANTS } from '../types';
import { useGameSounds } from '../../../hooks/useGameSounds';
import MuteButton from '../MuteButton';
import {
  NatureContainer,
  TFHeader,
  TFHeaderLeft,
  TFHeaderRight,
  TFScoreBadge,
  TFProgressBadge,
  TFMuteBtn,
  QuestionBanner,
  QuestionBannerText,
  TimerCircleWrapper,
  TimerCircle,
  TimerCircleInner,
  TimerCircleNumber,
  NatureButtonRow,
  WrongButton,
  CorrectButton,
  FeedbackOverlay,
  NatureCountdown,
  NatureCountdownLabel,
  NatureCountdownNumber,
  NatureMediaContainer,
  NatureMediaImage,
  YoozLogo,
  IntroContainer,
  IntroContent,
  IntroHeaderSection,
  IntroStatusRow,
  IntroIconCircle,
  IntroStatusText,
  IntroOrText,
  IntroActionSection,
  IntroMessageBoard,
  IntroMainMsg,
  IntroSubMsg,
  IntroStartButton,
  IntroYoozLogo,
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

function IntroCheckSvg() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <polyline points="8,18 15,26 28,10" fill="none" stroke="#326d3f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IntroCrossSvg() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <line x1="10" y1="10" x2="26" y2="26" stroke="#613426" strokeWidth="5" strokeLinecap="round" />
      <line x1="26" y1="10" x2="10" y2="26" stroke="#613426" strokeWidth="5" strokeLinecap="round" />
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

/** Leaf vein pattern overlaid inside the question banner */
function LeafVeinSvg() {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 340 90"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.12 }}
    >
      {/* Main center vein */}
      <line x1="10" y1="45" x2="330" y2="45" stroke="#fff" strokeWidth="1.5" />
      {/* Side veins */}
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

/** Tree ring lines + crack inside the stump score circle */
function StumpRingsSvg() {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 200 200"
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
    >
      {/* Concentric growth rings */}
      <circle cx="100" cy="100" r="12" fill="none" stroke="#b8944a" strokeWidth="1" opacity="0.4" />
      <circle cx="100" cy="100" r="24" fill="none" stroke="#a88440" strokeWidth="1.2" opacity="0.35" />
      <circle cx="100" cy="100" r="36" fill="none" stroke="#b8944a" strokeWidth="1" opacity="0.3" />
      <circle cx="100" cy="100" r="48" fill="none" stroke="#a07838" strokeWidth="1.5" opacity="0.25" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="#b8944a" strokeWidth="1" opacity="0.22" />
      <circle cx="100" cy="100" r="72" fill="none" stroke="#907030" strokeWidth="1.5" opacity="0.2" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="#b8944a" strokeWidth="1" opacity="0.18" />
      {/* Crack line */}
      <path d="M100,100 L98,60 L102,35 L99,12" fill="none" stroke="#7a5828" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
      <path d="M100,100 L104,70 L108,50" fill="none" stroke="#7a5828" strokeWidth="1.2" opacity="0.2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Types ───

interface TrueFalseStatement {
  text: string;
  isTrue: boolean;
  media?: string;
  ageRange?: AgeRange;
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

// ─── Component ───

export default function TrueFalseGame({ game, onComplete, participantAge }: GameProps) {
  const settings = game.settings as unknown as TrueFalseSettings;
  const t = useTranslations(texts);
  const gameHint = useGameHint(settings.hint);
  const sounds = useGameSounds();

  const gameStartTime = useRef(Date.now());
  const questionStartTime = useRef(Date.now());

  const scoring = settings.scoring || { correctPoints: 10, wrongPenalty: 0, timeLimitSeconds: 10 };
  const feedbackDuration = settings.feedbackDurationMs || GAME_CONSTANTS.FEEDBACK_DURATION_MS;

  // Filter statements by age
  const allStatements = settings.statements || [];
  const statements = useMemo(() => {
    if (participantAge === undefined) return allStatements;
    return allStatements.filter((s) => {
      if (!s.ageRange) return true;
      return participantAge >= s.ageRange.minAge && participantAge <= s.ageRange.maxAge;
    });
  }, [allStatements, participantAge]);

  const [showInstructions, setShowInstructions] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
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

  // Refs to avoid stale closures in handleAnswer
  const currentIndexRef = useRef(currentIndex);
  const answeredRef = useRef(answered);

  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { answeredRef.current = answered; }, [answered]);

  // Auto-complete if no statements
  useEffect(() => {
    if (statements.length === 0) {
      setNoContent(true);
      setGameComplete(true);
    }
  }, []);

  // Auto-complete when all content filtered by age
  useEffect(() => {
    if (noContent && gameComplete) {
      onComplete({ score: 0, maxPossibleScore: 0, durationMs: 0, hintUsed: false });
    }
  }, [noContent, gameComplete]);

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
        setCorrectCount((prev) => prev + 1);
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

    // Auto advance after feedback
    feedbackTimerRef.current = setTimeout(() => {
      const nextIndex = currentIndexRef.current + 1;
      if (nextIndex >= statements.length) {
        setGameComplete(true);
      } else {
        setCurrentIndex(nextIndex);
        startQuestion();
      }
    }, feedbackDuration);
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
    };
  }, []);

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
    if (settings.showCountdown !== false) {
      setCountdown(3);
    } else {
      startQuestion();
    }
  };

  // ─── Opening / Instructions screen ───
  if (showInstructions) {
    return (
      <IntroContainer dir="rtl">
        <IntroContent>
          {/* Header: True / Or / False */}
          <IntroHeaderSection>
            <IntroStatusRow variant="correct">
              <IntroIconCircle variant="correct">
                <IntroCheckSvg />
              </IntroIconCircle>
              <IntroStatusText tilt={4}>{t.true}</IntroStatusText>
            </IntroStatusRow>

            <IntroOrText>{t.or}</IntroOrText>

            <IntroStatusRow variant="incorrect">
              <IntroIconCircle variant="incorrect">
                <IntroCrossSvg />
              </IntroIconCircle>
              <IntroStatusText tilt={-3}>{t.false}</IntroStatusText>
            </IntroStatusRow>
          </IntroHeaderSection>

          {/* Action: Message board + overlapping Start button */}
          <IntroActionSection>
            <IntroMessageBoard>
              {settings.instructions ? (
                <IntroMainMsg>{settings.instructions}</IntroMainMsg>
              ) : (
                <IntroMainMsg>{game.name}</IntroMainMsg>
              )}
            </IntroMessageBoard>
            <IntroStartButton onClick={beginGame}>
              {t.start}
            </IntroStartButton>
          </IntroActionSection>

          {/* Footer */}
          <IntroYoozLogo><img src="/images/logo-white.png" alt="Yooz" style={{ height: 36 }} /></IntroYoozLogo>
        </IntroContent>
      </IntroContainer>
    );
  }

  // ─── Countdown screen (3-2-1) ───
  if (countdown !== null) {
    return (
      <NatureCountdown>
        <NatureCountdownLabel>{t.getReady}</NatureCountdownLabel>
        <NatureCountdownNumber key={countdown}>{countdown}</NatureCountdownNumber>
        <MuteButton isMuted={sounds.isMuted} onToggle={sounds.toggleMute} />
      </NatureCountdown>
    );
  }

  // ─── Game complete ───
  if (gameComplete) {
    if (noContent) return null;
    const accuracy = statements.length > 0 ? Math.round((correctCount / statements.length) * 100) : 0;
    return (
      <FinishContainer dir="rtl">
        <FinishContent>
          {/* Title banner */}
          <FinishTitleBanner>
            <LeafVeinSvg />
            <span style={{ position: 'relative', zIndex: 1 }}>{t.gameComplete}</span>
          </FinishTitleBanner>

          {/* Tree stump with score */}
          <FinishStump>
            <StumpRingsSvg />
            <FinishScoreNumber>{totalScore}</FinishScoreNumber>
            <FinishScoreLabel>{t.pointsFull}</FinishScoreLabel>
          </FinishStump>

          {/* Stats */}
          <FinishFinalLabel>{t.finalScore}</FinishFinalLabel>
          <FinishStats>
            {t.correctAnswers}: {correctCount}/{statements.length}
            <br />
            {t.accuracy}: {accuracy}%
          </FinishStats>

          {/* Continue button */}
          <FinishContinueButton onClick={handleFinish}>
            {t.continue}
          </FinishContinueButton>

          {/* Logo */}
          <FinishYoozLogo><img src="/images/logo-purple.png" alt="Yooz" style={{ height: 36 }} /></FinishYoozLogo>
        </FinishContent>
        <MuteButton isMuted={sounds.isMuted} onToggle={sounds.toggleMute} />
      </FinishContainer>
    );
  }

  // ─── Playing ───
  const statement = statements[currentIndex];
  if (!statement) return null;

  const timerCritical = timeLeft <= GAME_CONSTANTS.TIMER_CRITICAL_SECONDS;

  return (
    <NatureContainer dir="rtl">
      {/* Header */}
      <TFHeader>
        <TFHeaderLeft>
          <TFScoreBadge>{totalScore} {t.points}</TFScoreBadge>
          <TFMuteBtn onClick={sounds.toggleMute} aria-label={sounds.isMuted ? 'Unmute' : 'Mute'}>
            {sounds.isMuted ? '🔇' : '🔊'}
          </TFMuteBtn>
        </TFHeaderLeft>
        <TFHeaderRight>
          <TFProgressBadge>{currentIndex + 1}/{statements.length}</TFProgressBadge>
        </TFHeaderRight>
      </TFHeader>

      {/* Question banner (leaf-styled) */}
      <QuestionBanner key={currentIndex}>
        <LeafVeinSvg />
        <QuestionBannerText>{statement.text}</QuestionBannerText>
      </QuestionBanner>

      {/* Statement media */}
      {statement.media && (
        <NatureMediaContainer>
          <NatureMediaImage src={statement.media} alt="" />
        </NatureMediaContainer>
      )}

      {/* Hint button */}
      {settings.hint?.enabled && settings.hint.text && !answered && (
        <HintButton
          hintUsed={gameHint.hintUsed}
          useHintLabel={t.useHint}
          showHintLabel={t.showHint}
          onClick={gameHint.handleHintClick}
        />
      )}

      {/* Timer circle */}
      <TimerCircleWrapper>
        <TimerCircle critical={timerCritical}>
          <TimerCircleInner critical={timerCritical}>
            <TimerCircleNumber critical={timerCritical}>{timeLeft}</TimerCircleNumber>
          </TimerCircleInner>
        </TimerCircle>
      </TimerCircleWrapper>

      {/* Feedback */}
      {showFeedback && (
        <FeedbackOverlay
          variant={userAnswer === null ? 'timeout' : isCorrect ? 'correct' : 'incorrect'}
        >
          {userAnswer === null
            ? t.timeUp
            : isCorrect
            ? `${t.correct} +${scoring.correctPoints} ${t.points}`
            : t.incorrect}
        </FeedbackOverlay>
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
  );
}
