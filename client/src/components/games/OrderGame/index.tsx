import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameSounds } from '../../../hooks/useGameSounds';
import {
  useActivityPlayingHeaderHostActive,
  useRegisterActivityGameHeader,
  type ActivityGameHeaderPhase,
} from '../../../context/activityPlayingHeaderContext';
import { useThemedSceneOverlaySetter } from '../../../context/themedSceneOverlayContext';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './OrderGame.i18n';
import { shuffleArray } from '../../../utils/shuffleArray';
import { useGameHint } from '../../../hooks/useGameHint';
import HintModals from '../HintModals';
import HintButton from '../HintButton';
import { GameProps, HintConfig, GAME_CONSTANTS } from '../types';
import GolfChallenge from './GolfChallenge';
import OrderSurveyGame, { type OrderSurveySubmitPayload } from './OrderSurveyGame';
import { golfTexts } from './GolfChallenge.i18n';
import { GameIntroHeaderBar, GameHeaderMuteButton } from '../styled';
import {
  OrderFullScreenSceneBackdrop,
  GolfFullScreenSceneBackdrop,
  OrderPhaseRoot,
  OrderContainer,
  OrderTopBar,
  OrderTopBarItem,
  OrderTopBarTimer,
  OrderRoundBanner,
  OrderRoundBannerText,
  NatureCardsList,
  NatureCard,
  NatureCardNumber,
  NatureCardText,
  NatureDragHandle,
  OrderActionBar,
  NatureCheckButton,
  OrderFeedbackFloater,
  OrderFeedbackContainer,
  OrderCorrectText,
  OrderWrongText,
  OrderPointsBadge,
  NatureHintWrapper,
  IntroContainer,
  IntroContent,
  IntroTitle,
  IntroWelcomeMidSpacer,
  IntroDescStack,
  IntroDescCard,
  IntroDescText,
  IntroStartButton,
  InstructionsCard,
  InstructionsTitle,
  InstructionsText,
  FinishContainer,
  FinishContent,
  FinishStumpStage,
  FinishStump,
  OrderWoodBlocksImage,
  ORDER_WOOD_BLOCKS_URL,
  FinishScoreNumber,
  FinishScoreLabel,
} from './styled';

interface OrderRound {
  title?: string;
  cards: string[];
}

interface OrderScoring {
  firstAttemptPoints: number;
  retryPoints: number;
  speedBonus: boolean;
  timeLimitSeconds?: number;
}

interface OrderSettings {
  mode?: 'quiz' | 'survey';
  instructions?: string;
  hint?: HintConfig;
  rounds: OrderRound[];
  scoring: OrderScoring;
}

export type { OrderSurveySubmitPayload };

type CardStatus = 'neutral' | 'correct' | 'incorrect';

// ─── Nature SVG decorations ───


/** Tree ring lines inside stump score circle */
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

// ─── Nature-themed card colors ───

const CARD_COLORS = {
  neutral: { border: '#4a6572', bg: '#e3ebf3' },
  correct: { border: '#27ae60', bg: '#d5f5e3' },
  incorrect: { border: '#e74c3c', bg: '#fde8e8' },
  tapped: { border: '#2980b9', bg: '#dbeeff' },
  over: { border: '#2980b9', bg: '#eef5ff' },
};

// ─── Component ───

interface OrderGameProps extends GameProps {
  activityCode?: string;
  itemIndex?: number;
  onSurveySubmit?: (payload: OrderSurveySubmitPayload) => void | Promise<void>;
}

function OrderQuizGame({ game, onComplete }: GameProps) {
  const settings = game.settings as unknown as OrderSettings;
  const t = useTranslations(texts);
  const hint = useGameHint(settings.hint);
  const sounds = useGameSounds({
    correct: '/sounds/applause.mp3',
    bgMusic: '/sounds/backgtound-music.mp3',
  });

  const [currentRound, setCurrentRound] = useState(0);
  const [cards, setCards] = useState<string[]>([]);
  const [cardStatuses, setCardStatuses] = useState<CardStatus[]>([]);
  const [roundScore, setRoundScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [checked, setChecked] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [noContent, setNoContent] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const gameStartTime = useRef(Date.now());

  // Refs for timeout-safe access (avoid stale closures)
  const currentRoundRef = useRef(0);
  const roundsRef = useRef<OrderRound[]>([]);
  const initRoundRef = useRef<(idx: number) => void>(() => {});

  // Golf challenge
  const golfEnabled = (settings as unknown as Record<string, unknown>).golfChallenge !== false;
  const [showGolf, setShowGolf] = useState(false);
  const [golfBonus, setGolfBonus] = useState(0);
  const [golfDone, setGolfDone] = useState(false);
  const golfT = useTranslations(golfTexts);

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
    sounds.toggleMute,
  );

  const setThemedSceneOverlay = useThemedSceneOverlaySetter();

  useEffect(() => {
    if (!setThemedSceneOverlay) return;
    // Golf playing — show grass background behind header too
    if (showGolf) {
      setThemedSceneOverlay(<GolfFullScreenSceneBackdrop aria-hidden />);
      return () => setThemedSceneOverlay(null);
    }
    setThemedSceneOverlay(<OrderFullScreenSceneBackdrop aria-hidden />);
    return () => setThemedSceneOverlay(null);
  }, [setThemedSceneOverlay, showInstructions, showGolf]);

  const isGolfPhaseActive = showGolf || (gameComplete && golfEnabled && !golfDone);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('yooz:order-golf-visibility', { detail: { active: isGolfPhaseActive } }));
    return () => {
      window.dispatchEvent(new CustomEvent('yooz:order-golf-visibility', { detail: { active: false } }));
    };
  }, [isGolfPhaseActive]);

  const inlineBackdrop = !setThemedSceneOverlay;

  // Pointer-based drag reordering (works on touch + mouse)
  const [dragInfo, setDragInfo] = useState<{
    index: number;
    startY: number;
    currentY: number;
    cardHeight: number;
  } | null>(null);
  const didDragRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Touch-based swap: tap two cards to swap (fallback for quick taps)
  const [tapIndex, setTapIndex] = useState<number | null>(null);

  const rounds = useMemo(() => {
    return settings.rounds || [];
  }, [settings.rounds]);
  const scoring = useMemo(
    () => settings.scoring || { firstAttemptPoints: 100, retryPoints: 50, speedBonus: false },
    [settings.scoring],
  );

  // Initialize round
  const initRound = useCallback((roundIdx: number) => {
    const round = rounds[roundIdx];
    if (!round) return;
    const correctOrder = round.cards;
    let shuffled = shuffleArray(correctOrder);
    let shuffleAttempts = 0;
    while (shuffled.length > 1 && shuffled.every((c, i) => c === correctOrder[i]) && shuffleAttempts < 20) {
      shuffled = shuffleArray(correctOrder);
      shuffleAttempts++;
    }
    setCards(shuffled);
    setCardStatuses(shuffled.map(() => 'neutral'));
    setRoundScore(0);
    setShowFeedback(null);
    setChecked(false);
    setTapIndex(null);
    setDragInfo(null);

    if (scoring.timeLimitSeconds && scoring.timeLimitSeconds > 0) {
      setTimeLeft(scoring.timeLimitSeconds);
    } else {
      setTimeLeft(null);
    }
  }, [rounds, scoring]);

  // Keep refs in sync
  currentRoundRef.current = currentRound;
  roundsRef.current = rounds;
  initRoundRef.current = initRound;

  // Only init the first round after instructions are dismissed (so timer doesn't start early)
  const didInitRef = useRef(false);
  useEffect(() => {
    if (rounds.length === 0) {
      setNoContent(true);
      setGameComplete(true);
      return;
    }
    // Skip init while instructions screen is showing
    if (showInstructions && settings.instructions) return;
    if (didInitRef.current) return;
    didInitRef.current = true;
    initRound(0);
  }, [showInstructions]);

  // Timer countdown — uses functional updater to avoid stale closure
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

  const handleCheck = () => {
    if (checked) return;
    setAttempts((prev) => prev + 1);
    const round = rounds[currentRound];
    if (!round) return;
    const correctOrder = round.cards;

    const statuses: CardStatus[] = cards.map((card, i) => (card === correctOrder[i] ? 'correct' : 'incorrect'));
    setCardStatuses(statuses);
    setChecked(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const allCorrect = statuses.every((s) => s === 'correct');

    if (allCorrect) {
      const points = scoring.firstAttemptPoints;
      setRoundScore(points);
      setTotalScore((prev) => prev + points);
      setShowFeedback('correct');
      sounds.playCorrect();
    } else {
      setRoundScore(0);
      setShowFeedback('incorrect');
      sounds.playWrong();
    }

    // Auto-advance to next round after brief feedback (refs avoid stale closures)
    setTimeout(() => {
      const next = currentRoundRef.current + 1;
      if (next >= roundsRef.current.length) {
        setGameComplete(true);
      } else {
        setCurrentRound(next);
        initRoundRef.current(next);
      }
    }, 1500);
  };

  const handleFinish = () => {
    const adjusted = hint.applyHintPenalty(totalScore) + golfBonus;
    const maxPossibleScore = rounds.length * (scoring.firstAttemptPoints || 100);
    onComplete({
      score: adjusted,
      maxPossibleScore,
      durationMs: Date.now() - gameStartTime.current,
      hintUsed: hint.hintUsed,
      attempts,
    });
  };

  // Instructions screen — matches Trivia intro design
  if (showInstructions && settings.instructions) {
    return (
      <OrderPhaseRoot $inlineBackdrop={inlineBackdrop}>
        {!activityHeaderAudio && (
          <div style={{ position: 'relative', zIndex: 1 }}>
            <GameIntroHeaderBar>
              <GameHeaderMuteButton onClick={sounds.toggleMute} aria-label={sounds.isMuted ? 'Unmute' : 'Mute'}>
                {sounds.isMuted ? '🔇' : '🔊'}
              </GameHeaderMuteButton>
            </GameIntroHeaderBar>
          </div>
        )}
        <IntroContainer>
          <IntroContent>
            <IntroTitle>{game.name}</IntroTitle>

            <IntroWelcomeMidSpacer aria-hidden>
              <OrderWoodBlocksImage src={ORDER_WOOD_BLOCKS_URL} alt="" />
            </IntroWelcomeMidSpacer>

            <IntroDescStack>
              <IntroDescCard>
                <IntroDescText>{settings.instructions}</IntroDescText>
              </IntroDescCard>
              <IntroStartButton
                onClick={() => { setShowInstructions(false); sounds.startBgMusic(); }}
                style={{
                  background: 'linear-gradient(180deg, #5cb85c 0%, #28a745 48%, #1e7e34 100%)',
                  border: '5px solid #155724',
                  boxShadow: '0 6px 0 #0f3d18, 0 12px 24px rgba(0,0,0,0.28)',
                  color: '#fff',
                  textShadow: '0 1px 0 rgba(0,0,0,0.2)',
                }}
              >
                {((game.settings as Record<string, unknown>).startButtonText as string)?.trim() || t.continue}
              </IntroStartButton>
            </IntroDescStack>
          </IntroContent>
        </IntroContainer>
      </OrderPhaseRoot>
    );
  }

  // Golf challenge — playing
  if (showGolf) {
    return (
      <OrderPhaseRoot>
        <GolfChallenge
          onComplete={(bonus) => { setGolfBonus(bonus); setShowGolf(false); setGolfDone(true); }}
          onSkip={() => { setGolfBonus(0); setShowGolf(false); setGolfDone(true); }}
        />
      </OrderPhaseRoot>
    );
  }

  // Finish screen — shown AFTER golf (or when golf disabled)
  if (gameComplete && (!golfEnabled || golfDone)) {
    if (noContent) {
      return null;
    }
    const finalScore = hint.applyHintPenalty(totalScore) + golfBonus;
    return (
      <OrderPhaseRoot $inlineBackdrop={inlineBackdrop}>
        <FinishContainer>
          {!activityHeaderAudio && (
            <GameIntroHeaderBar>
              <GameHeaderMuteButton onClick={sounds.toggleMute} aria-label={sounds.isMuted ? 'Unmute' : 'Mute'}>
                {sounds.isMuted ? '🔇' : '🔊'}
              </GameHeaderMuteButton>
            </GameIntroHeaderBar>
          )}
          <FinishContent style={{ justifyContent: 'space-between' }}>
            <IntroTitle style={{ marginBottom: 0 }}>{((game.settings as Record<string, unknown>).endTitle as string)?.trim() || t.gameComplete}</IntroTitle>

            <FinishStumpStage aria-hidden>
              <FinishStump>
                <StumpRingsSvg />
                <FinishScoreNumber>{finalScore}</FinishScoreNumber>
                <FinishScoreLabel>{t.points}</FinishScoreLabel>
              </FinishStump>
            </FinishStumpStage>

            <IntroStartButton style={{ marginTop: 'auto', marginBottom: 'clamp(8px, 2vh, 20px)' }} onClick={handleFinish}>
              {((game.settings as Record<string, unknown>).endButtonText as string)?.trim() || t.continue}
            </IntroStartButton>
          </FinishContent>
        </FinishContainer>
      </OrderPhaseRoot>
    );
  }

  // Golf intro popup — shown after rounds complete, before golf starts
  // Uses the same order game background with a centered instructions card
  if (gameComplete && golfEnabled && !golfDone) {
    return (
      <OrderPhaseRoot $inlineBackdrop={inlineBackdrop}>
      <OrderContainer style={{ justifyContent: 'center' }}>
        <InstructionsCard style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⛳</div>
          <InstructionsTitle>{golfT.title}</InstructionsTitle>
          <InstructionsText>{golfT.disclaimer}</InstructionsText>
          <NatureCheckButton onClick={() => setShowGolf(true)} style={{ marginTop: 20 }}>
            {golfT.continueBtn}
          </NatureCheckButton>
        </InstructionsCard>
      </OrderContainer>
      </OrderPhaseRoot>
    );
  }

  const round = rounds[currentRound];
  if (!round) return null;

  // ─── Pointer-based drag reordering ───

  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    if (checked) return;
    // Measure card height from the list grid
    const listEl = listRef.current;
    if (!listEl) return;
    const firstCard = listEl.children[0] as HTMLElement | undefined;
    if (!firstCard) return;
    const cardHeight = firstCard.getBoundingClientRect().height + 5; // include gap
    didDragRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragInfo({ index, startY: e.clientY, currentY: e.clientY, cardHeight });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragInfo) return;
    const deltaY = e.clientY - dragInfo.startY;
    if (Math.abs(deltaY) > 5) didDragRef.current = true;
    setDragInfo({ ...dragInfo, currentY: e.clientY });
  };

  const handlePointerUp = () => {
    if (!dragInfo) return;
    const deltaY = dragInfo.currentY - dragInfo.startY;
    const shift = Math.round(deltaY / dragInfo.cardHeight);
    const fromIdx = dragInfo.index;
    const toIdx = Math.max(0, Math.min(cards.length - 1, fromIdx + shift));

    if (didDragRef.current && fromIdx !== toIdx) {
      const newCards = [...cards];
      const [removed] = newCards.splice(fromIdx, 1);
      newCards.splice(toIdx, 0, removed);
      setCards(newCards);
      setCardStatuses(newCards.map(() => 'neutral'));
      setShowFeedback(null);
      setTapIndex(null);
    }
    setDragInfo(null);
  };

  // Tap-to-swap fallback (fires only on quick taps, not drags)
  const handleCardTap = (index: number) => {
    if (checked || didDragRef.current) return;
    if (tapIndex === null) {
      setTapIndex(index);
    } else if (tapIndex === index) {
      setTapIndex(null);
    } else {
      const newCards = [...cards];
      [newCards[tapIndex], newCards[index]] = [newCards[index], newCards[tapIndex]];
      setCards(newCards);
      setCardStatuses(newCards.map(() => 'neutral'));
      setTapIndex(null);
      setShowFeedback(null);
    }
  };

  // Helper: compute translateY for each card during drag
  const getCardDragStyle = (index: number): React.CSSProperties => {
    if (!dragInfo) return {};
    const deltaY = dragInfo.currentY - dragInfo.startY;
    if (index === dragInfo.index) {
      // Dragged card follows the pointer
      return {
        transform: `translateY(${deltaY}px) scale(1.03)`,
        zIndex: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        transition: 'box-shadow 0.15s ease',
      };
    }
    // Shift other cards to make room
    const shift = Math.round(deltaY / dragInfo.cardHeight);
    const targetIdx = Math.max(0, Math.min(cards.length - 1, dragInfo.index + shift));
    const draggedFrom = dragInfo.index;

    if (draggedFrom < targetIdx && index > draggedFrom && index <= targetIdx) {
      return { transform: `translateY(-${dragInfo.cardHeight}px)`, transition: 'transform 0.15s ease' };
    }
    if (draggedFrom > targetIdx && index < draggedFrom && index >= targetIdx) {
      return { transform: `translateY(${dragInfo.cardHeight}px)`, transition: 'transform 0.15s ease' };
    }
    return { transition: 'transform 0.15s ease' };
  };

  return (
    <OrderPhaseRoot $inlineBackdrop={inlineBackdrop}>
    <OrderContainer>

      {/* Top bar (glass effect) */}
      <OrderTopBar>
        <OrderTopBarItem>
          {t.roundOf} {currentRound + 1} {t.of} {rounds.length}
        </OrderTopBarItem>
        {timeLeft !== null && (
          <OrderTopBarTimer critical={timeLeft <= GAME_CONSTANTS.TIMER_WARNING_SECONDS}>
            {t.timeLeft}: {timeLeft}s
          </OrderTopBarTimer>
        )}
        <OrderTopBarItem>
          {t.score}: {totalScore} {t.points}
        </OrderTopBarItem>
      </OrderTopBar>

      {/* Round title (yellow outlined text) */}
      {round.title && (
        <OrderRoundBanner>
          <OrderRoundBannerText>{round.title}</OrderRoundBannerText>
        </OrderRoundBanner>
      )}

      {/* Hint button */}
      {settings.hint?.enabled && (settings.hint.text || settings.hint.imageUrl) && !checked && (
        <NatureHintWrapper>
          <HintButton
            hintUsed={hint.hintUsed}
            useHintLabel={t.useHint}
            showHintLabel={t.showHint}
            onClick={hint.handleHintClick}
          />
        </NatureHintWrapper>
      )}

      {/* Cards list */}
      <NatureCardsList
        ref={listRef}
        cardCount={cards.length}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDragInfo(null)}
      >
        {cards.map((card, index) => {
          const status = cardStatuses[index];
          const isDragging = dragInfo?.index === index;
          const isTapped = tapIndex === index;

          let borderColor = CARD_COLORS.neutral.border;
          let bgColor = CARD_COLORS.neutral.bg;

          if (status === 'correct') {
            borderColor = CARD_COLORS.correct.border;
            bgColor = CARD_COLORS.correct.bg;
          } else if (status === 'incorrect') {
            borderColor = CARD_COLORS.incorrect.border;
            bgColor = CARD_COLORS.incorrect.bg;
          } else if (isTapped) {
            borderColor = CARD_COLORS.tapped.border;
            bgColor = CARD_COLORS.tapped.bg;
          }

          return (
            <NatureCard
              key={`${currentRound}-${index}`}
              borderColor={borderColor}
              bgColor={bgColor}
              isDragging={isDragging}
              roundComplete={checked}
              onPointerDown={(e) => handlePointerDown(index, e)}
              onClick={() => handleCardTap(index)}
              style={getCardDragStyle(index)}
            >
              <NatureCardNumber status={status}>
                {index + 1}
              </NatureCardNumber>
              <NatureCardText>{card}</NatureCardText>
              {!checked && (
                <NatureDragHandle>&#x2807;</NatureDragHandle>
              )}
            </NatureCard>
          );
        })}
      </NatureCardsList>

      {/* Check button — stays visible (disabled) after check to prevent layout shift */}
      <OrderActionBar>
        <NatureCheckButton onClick={!checked ? handleCheck : undefined} disabled={checked || timeLeft === 0}>
          {t.checkAnswer}
        </NatureCheckButton>
      </OrderActionBar>

      {/* Feedback (fixed center toast — matches Puzzle) */}
      {showFeedback && (
        <OrderFeedbackFloater>
          <OrderFeedbackContainer variant={showFeedback === 'correct' ? 'correct' : 'incorrect'}>
            {showFeedback === 'correct' ? (
              <>
                <OrderCorrectText>{t.correct}</OrderCorrectText>
                {roundScore > 0 && (
                  <OrderPointsBadge>+{roundScore} {t.points}</OrderPointsBadge>
                )}
              </>
            ) : (
              <OrderWrongText>{t.incorrect}</OrderWrongText>
            )}
          </OrderFeedbackContainer>
        </OrderFeedbackFloater>
      )}

      <HintModals
        hintText={settings.hint?.text}
        hintImageUrl={settings.hint?.imageUrl}
        showHintWarning={hint.showHintWarning}
        showHintText={hint.showHintText}
        onConfirm={hint.confirmHint}
        onDismissWarning={hint.dismissHintWarning}
        onDismissText={hint.dismissHintText}
        t={t}
      />
    </OrderContainer>
    </OrderPhaseRoot>
  );
}

export default function OrderGame({ game, onComplete, activityCode, itemIndex, onSurveySubmit }: OrderGameProps) {
  const mode = (game.settings as unknown as OrderSettings).mode;
  if (mode === 'survey') {
    return (
      <OrderSurveyGame
        game={game}
        onComplete={onComplete}
        activityCode={activityCode}
        itemIndex={itemIndex}
        onSurveySubmit={onSurveySubmit}
      />
    );
  }
  return <OrderQuizGame game={game} onComplete={onComplete} />;
}
