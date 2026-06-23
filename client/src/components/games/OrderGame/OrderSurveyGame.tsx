import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from '../../../context/LanguageContext';
import { useRegisterActivityGameHeader, type ActivityGameHeaderPhase } from '../../../context/activityPlayingHeaderContext';
import { useThemedSceneOverlaySetter } from '../../../context/themedSceneOverlayContext';
import { texts } from './OrderGame.i18n';
import { shuffleArray } from '../../../utils/shuffleArray';
import { apiFetch } from '../../../utils/api';
import type { GameProps, GameResult } from '../types';
import {
  OrderFullScreenSceneBackdrop,
  OrderPhaseRoot,
  OrderContainer,
  OrderRoundBanner,
  OrderRoundBannerText,
  NatureCardsList,
  NatureCard,
  NatureCardNumber,
  NatureCardText,
  NatureDragHandle,
  OrderActionBar,
  NatureCheckButton,
  IntroContainer,
  IntroContent,
  IntroTitle,
  IntroWelcomeMidSpacer,
  IntroDescStack,
  IntroDescCard,
  IntroDescText,
  IntroStartButton,
  OrderWoodBlocksImage,
  ORDER_WOOD_BLOCKS_URL,
} from './styled';

interface OrderRound {
  title?: string;
  cards: string[];
}

interface OrderSurveySettings {
  mode?: 'quiz' | 'survey';
  instructions?: string;
  rounds: OrderRound[];
}

export interface OrderSurveySubmitPayload {
  ranking: string[];
  items: string[];
  roundIndex: number;
  durationMs: number;
}

interface OrderSurveyGameProps extends GameProps {
  activityCode?: string;
  itemIndex?: number;
  onSurveySubmit?: (payload: OrderSurveySubmitPayload) => void | Promise<void>;
}

const NEUTRAL = { border: '#4a6572', bg: '#e3ebf3' };
const TAPPED = { border: '#2980b9', bg: '#dbeeff' };

export default function OrderSurveyGame({
  game,
  onComplete,
  activityCode,
  itemIndex,
  onSurveySubmit,
}: OrderSurveyGameProps) {
  const settings = game.settings as unknown as OrderSurveySettings;
  const t = useTranslations(texts);
  const round = settings.rounds?.[0];
  const referenceItems = round?.cards ?? [];

  const [showInstructions, setShowInstructions] = useState(Boolean(settings.instructions));
  const [cards, setCards] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRanking, setSubmittedRanking] = useState<string[]>([]);
  const [resultsRevealed, setResultsRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const gameStartTime = useRef(Date.now());

  const [dragInfo, setDragInfo] = useState<{
    index: number;
    startY: number;
    currentY: number;
    cardHeight: number;
  } | null>(null);
  const didDragRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [tapIndex, setTapIndex] = useState<number | null>(null);

  const activityHeaderPhase: ActivityGameHeaderPhase = submitted
    ? 'finish'
    : showInstructions
      ? 'intro'
      : 'playing';
  useRegisterActivityGameHeader(false, activityHeaderPhase, false, () => {});

  const setThemedSceneOverlay = useThemedSceneOverlaySetter();
  useEffect(() => {
    if (!setThemedSceneOverlay) return;
    setThemedSceneOverlay(<OrderFullScreenSceneBackdrop aria-hidden />);
    return () => setThemedSceneOverlay(null);
  }, [setThemedSceneOverlay]);

  const inlineBackdrop = !setThemedSceneOverlay;

  const initCards = useCallback(() => {
    if (referenceItems.length === 0) return;
    let shuffled = shuffleArray(referenceItems);
    let attempts = 0;
    while (shuffled.length > 1 && shuffled.every((c, i) => c === referenceItems[i]) && attempts < 20) {
      shuffled = shuffleArray(referenceItems);
      attempts++;
    }
    setCards(shuffled);
    setTapIndex(null);
    setDragInfo(null);
  }, [referenceItems]);

  useEffect(() => {
    if (showInstructions && settings.instructions) return;
    initCards();
  }, [showInstructions, settings.instructions, initCards]);

  // Restore submitted state from saved progress
  useEffect(() => {
    if (!activityCode || itemIndex === undefined) return;
    let cancelled = false;
    (async () => {
      try {
        const progress = await apiFetch<{
          itemResults?: Array<{ itemIndex: number; metadata?: Record<string, unknown> }>;
        }>(`/api/activities/${activityCode}/my-progress`);
        if (cancelled) return;
        const matches = (progress.itemResults ?? []).filter((ir) => {
          if (ir.itemIndex !== itemIndex) return false;
          return ir.metadata?.orderSurvey === true && Array.isArray(ir.metadata.ranking);
        });
        const last = matches[matches.length - 1];
        if (last?.metadata?.ranking) {
          const ranking = last.metadata.ranking as string[];
          setSubmittedRanking(ranking);
          setCards(ranking);
          setSubmitted(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [activityCode, itemIndex]);

  // Poll for manager reveal after submit
  useEffect(() => {
    if (!submitted || !activityCode) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await apiFetch<{
          active: boolean;
          itemIndex: number | null;
          resultsRevealed: boolean;
        }>(`/api/activities/${activityCode}/order-survey/status`);
        if (cancelled) return;
        if (status.active && status.itemIndex === itemIndex && status.resultsRevealed) {
          setResultsRevealed(true);
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [submitted, activityCode, itemIndex]);

  const handleSubmit = async () => {
    if (submitted || submitting || cards.length === 0) return;
    setSubmitting(true);
    setSubmitError('');
    const payload: OrderSurveySubmitPayload = {
      ranking: [...cards],
      items: [...referenceItems],
      roundIndex: 0,
      durationMs: Date.now() - gameStartTime.current,
    };
    try {
      await onSurveySubmit?.(payload);
      setSubmittedRanking(payload.ranking);
      setSubmitted(true);
    } catch {
      setSubmitError(t.submitFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    const result: GameResult = {
      score: 0,
      maxPossibleScore: 0,
      durationMs: Date.now() - gameStartTime.current,
      hintUsed: false,
      metadata: {
        orderSurvey: true,
        ranking: submittedRanking,
        items: referenceItems,
        roundIndex: 0,
      },
    };
    onComplete(result);
  };

  const handlePointerDown = (index: number, e: React.PointerEvent) => {
    if (submitted) return;
    const listEl = listRef.current;
    if (!listEl) return;
    const firstCard = listEl.children[0] as HTMLElement | undefined;
    if (!firstCard) return;
    const cardHeight = firstCard.getBoundingClientRect().height + 5;
    didDragRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragInfo({ index, startY: e.clientY, currentY: e.clientY, cardHeight });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragInfo || submitted) return;
    const deltaY = e.clientY - dragInfo.startY;
    if (Math.abs(deltaY) > 5) didDragRef.current = true;
    setDragInfo({ ...dragInfo, currentY: e.clientY });
  };

  const handlePointerUp = () => {
    if (!dragInfo || submitted) return;
    const deltaY = dragInfo.currentY - dragInfo.startY;
    const shift = Math.round(deltaY / dragInfo.cardHeight);
    const fromIdx = dragInfo.index;
    const toIdx = Math.max(0, Math.min(cards.length - 1, fromIdx + shift));
    if (didDragRef.current && fromIdx !== toIdx) {
      const newCards = [...cards];
      const [removed] = newCards.splice(fromIdx, 1);
      newCards.splice(toIdx, 0, removed);
      setCards(newCards);
      setTapIndex(null);
    }
    setDragInfo(null);
  };

  const handleCardTap = (index: number) => {
    if (submitted || didDragRef.current) return;
    if (tapIndex === null) setTapIndex(index);
    else if (tapIndex === index) setTapIndex(null);
    else {
      const newCards = [...cards];
      [newCards[tapIndex], newCards[index]] = [newCards[index], newCards[tapIndex]];
      setCards(newCards);
      setTapIndex(null);
    }
  };

  const getCardDragStyle = (index: number): React.CSSProperties => {
    if (!dragInfo || submitted) return {};
    const deltaY = dragInfo.currentY - dragInfo.startY;
    if (index === dragInfo.index) {
      return {
        transform: `translateY(${deltaY}px) scale(1.03)`,
        zIndex: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      };
    }
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

  if (showInstructions && settings.instructions) {
    return (
      <OrderPhaseRoot $inlineBackdrop={inlineBackdrop}>
        <IntroContainer dir="rtl">
          <IntroContent>
            <IntroTitle>{game.name}</IntroTitle>
            <IntroWelcomeMidSpacer aria-hidden>
              <OrderWoodBlocksImage src={ORDER_WOOD_BLOCKS_URL} alt="" />
            </IntroWelcomeMidSpacer>
            <IntroDescStack>
              <IntroDescCard>
                <IntroDescText>{settings.instructions}</IntroDescText>
              </IntroDescCard>
              <IntroStartButton onClick={() => setShowInstructions(false)}>
                {((game.settings as Record<string, unknown>).startButtonText as string)?.trim() || t.continue}
              </IntroStartButton>
            </IntroDescStack>
          </IntroContent>
        </IntroContainer>
      </OrderPhaseRoot>
    );
  }

  if (!round || referenceItems.length < 2) return null;

  const displayCards = submitted ? submittedRanking : cards;

  return (
    <OrderPhaseRoot $inlineBackdrop={inlineBackdrop}>
      <OrderContainer dir="rtl">
        {round.title && (
          <OrderRoundBanner>
            <OrderRoundBannerText>{round.title}</OrderRoundBannerText>
          </OrderRoundBanner>
        )}

        {submitted && (
          <IntroDescCard style={{ marginBottom: 12, textAlign: 'center' }}>
            <IntroDescText style={{ fontWeight: 600 }}>{t.surveySuccess}</IntroDescText>
            {!resultsRevealed && (
              <IntroDescText style={{ marginTop: 8, opacity: 0.75 }}>{t.waitingForResults}</IntroDescText>
            )}
          </IntroDescCard>
        )}

        {submitted && (
          <IntroDescText style={{ textAlign: 'center', marginBottom: 8, fontWeight: 700 }}>
            {t.yourRanking}
          </IntroDescText>
        )}

        <NatureCardsList
          ref={listRef}
          cardCount={displayCards.length}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setDragInfo(null)}
        >
          {displayCards.map((card, index) => {
            const isDragging = !submitted && dragInfo?.index === index;
            const isTapped = !submitted && tapIndex === index;
            const borderColor = isTapped ? TAPPED.border : NEUTRAL.border;
            const bgColor = isTapped ? TAPPED.bg : NEUTRAL.bg;

            return (
              <NatureCard
                key={`survey-${index}-${card}`}
                borderColor={borderColor}
                bgColor={bgColor}
                isDragging={isDragging}
                roundComplete={submitted}
                onPointerDown={(e) => handlePointerDown(index, e)}
                onClick={() => handleCardTap(index)}
                style={getCardDragStyle(index)}
              >
                <NatureCardNumber status="neutral">{index + 1}</NatureCardNumber>
                <NatureCardText>{card}</NatureCardText>
                {!submitted && <NatureDragHandle>&#x2807;</NatureDragHandle>}
              </NatureCard>
            );
          })}
        </NatureCardsList>

        <OrderActionBar>
          {submitError && (
            <IntroDescText style={{ textAlign: 'center', color: '#c0392b', marginBottom: 8 }}>
              {submitError}
            </IntroDescText>
          )}
          {!submitted ? (
            <NatureCheckButton onClick={() => void handleSubmit()} disabled={submitting}>
              {t.submitRanking}
            </NatureCheckButton>
          ) : resultsRevealed ? (
            <NatureCheckButton onClick={handleContinue}>{((game.settings as Record<string, unknown>).endButtonText as string)?.trim() || t.continueAfterResults}</NatureCheckButton>
          ) : null}
        </OrderActionBar>
      </OrderContainer>
    </OrderPhaseRoot>
  );
}
