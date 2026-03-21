import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import {
  SectionLabel,
  SectionLabelNoMargin,
  SubLabel,
  ItemPanel,
  ItemPanelHeader,
  ItemPanelTitle,
  SectionSubHeaderRow,
  MoveButtonGroup,
  VerticalStackGap10,
  ScoringRow,
  ScoringLabel,
  ScoringInput,
  SmallOutlineButton,
  TinyOutlineButton,
  RemoveOutlineButton,
  TinyDangerButton,
  AddButton,
  ScoringToggleButton,
  AgeRangeToggle,
  AgeRangeRow,
  AgeRangeInput,
  AgeRangeSeparator,
  InputMb10,
  CardItemRow,
  CardInput,
  IndexNumberSmall,
} from '../styled';
import type { OrderRound, OrderScoring, GameConfigHandle } from './types';

interface OrderGameConfigProps {
  t: Record<string, string>;
  initialSettings?: Record<string, unknown>;
}

export default forwardRef<GameConfigHandle, OrderGameConfigProps>(
  function OrderGameConfig({ t, initialSettings }, ref) {
    const [rounds, setRounds] = useState<OrderRound[]>([{ title: '', cards: ['', ''] }]);
    const [orderScoring, setOrderScoring] = useState<OrderScoring>({
      firstAttemptPoints: 100,
      retryPoints: 50,
      speedBonus: false,
      timeLimitSeconds: 0,
    });
    const [golfChallenge, setGolfChallenge] = useState(true);

    // Load initial settings
    useEffect(() => {
      if (!initialSettings) return;
      const s = initialSettings;
      if (Array.isArray(s.rounds)) {
        setRounds(
          (s.rounds as { title?: string; cards: string[]; ageRange?: { minAge: number; maxAge: number } }[]).map((r) => ({
            title: r.title || '',
            cards: r.cards || ['', ''],
            ageRange: r.ageRange,
          }))
        );
      }
      if (s.scoring && typeof s.scoring === 'object') {
        const sc = s.scoring as Record<string, unknown>;
        setOrderScoring({
          firstAttemptPoints: (sc.firstAttemptPoints as number) || 100,
          retryPoints: (sc.retryPoints as number) || 50,
          speedBonus: (sc.speedBonus as boolean) || false,
          timeLimitSeconds: (sc.timeLimitSeconds as number) || 0,
        });
      }
      if (typeof s.golfChallenge === 'boolean') setGolfChallenge(s.golfChallenge);
    }, [initialSettings]);

    useImperativeHandle(ref, () => ({
      validate() {
        const validRounds = rounds.filter((r) => r.cards.filter((c) => c.trim()).length >= 2);
        if (validRounds.length === 0) return t.noRounds;
        return null;
      },
      getSettings() {
        return {
          rounds: rounds
            .filter((r) => r.cards.filter((c) => c.trim()).length >= 2)
            .map((r) => ({
              title: r.title.trim() || undefined,
              cards: r.cards.filter((c) => c.trim()),
              ...(r.ageRange && { ageRange: r.ageRange }),
            })),
          scoring: {
            firstAttemptPoints: orderScoring.firstAttemptPoints,
            retryPoints: orderScoring.retryPoints,
            speedBonus: orderScoring.speedBonus,
            timeLimitSeconds: orderScoring.timeLimitSeconds || undefined,
          },
          golfChallenge,
        };
      },
      fillRandom() {
        setRounds([
          { title: 'מספרים 1-5', cards: ['אחד', 'שתיים', 'שלוש', 'ארבע', 'חמש'] },
          { title: 'ימות השבוע', cards: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'] },
          { title: 'חודשי השנה', cards: ['ינואר', 'פברואר', 'מרץ', 'אפריל'] },
        ]);
        setOrderScoring({ firstAttemptPoints: 100, retryPoints: 50, speedBonus: true, timeLimitSeconds: 120 });
        setGolfChallenge(true);
      },
    }));

    // ─── Round management ───
    const addRound = () => {
      setRounds((prev) => [...prev, { title: '', cards: ['', ''] }]);
    };

    const removeRound = (roundIndex: number) => {
      setRounds((prev) => prev.filter((_, i) => i !== roundIndex));
    };

    const updateRoundTitle = (roundIndex: number, title: string) => {
      setRounds((prev) => prev.map((r, i) => (i === roundIndex ? { ...r, title } : r)));
    };

    const addCard = (roundIndex: number) => {
      setRounds((prev) =>
        prev.map((r, i) => (i === roundIndex ? { ...r, cards: [...r.cards, ''] } : r))
      );
    };

    const removeCard = (roundIndex: number, cardIndex: number) => {
      setRounds((prev) =>
        prev.map((r, i) =>
          i === roundIndex ? { ...r, cards: r.cards.filter((_, ci) => ci !== cardIndex) } : r
        )
      );
    };

    const updateCard = (roundIndex: number, cardIndex: number, value: string) => {
      setRounds((prev) =>
        prev.map((r, i) =>
          i === roundIndex
            ? { ...r, cards: r.cards.map((c, ci) => (ci === cardIndex ? value : c)) }
            : r
        )
      );
    };

    const moveCard = (roundIndex: number, cardIndex: number, direction: -1 | 1) => {
      setRounds((prev) =>
        prev.map((r, i) => {
          if (i !== roundIndex) return r;
          const cards = [...r.cards];
          const target = cardIndex + direction;
          if (target < 0 || target >= cards.length) return r;
          [cards[cardIndex], cards[target]] = [cards[target], cards[cardIndex]];
          return { ...r, cards };
        })
      );
    };

    const updateRoundAgeRange = (roundIndex: number, field: 'minAge' | 'maxAge', value: number) => {
      setRounds((prev) =>
        prev.map((r, i) => {
          if (i !== roundIndex) return r;
          const current = r.ageRange || { minAge: 0, maxAge: 120 };
          return { ...r, ageRange: { ...current, [field]: value } };
        })
      );
    };

    const toggleRoundAgeRange = (roundIndex: number) => {
      setRounds((prev) =>
        prev.map((r, i) => {
          if (i !== roundIndex) return r;
          return { ...r, ageRange: r.ageRange ? undefined : { minAge: 0, maxAge: 120 } };
        })
      );
    };

    return (
      <>
        {/* Rounds */}
        <div>
          <SectionSubHeaderRow>
            <SectionLabelNoMargin>{t.rounds}</SectionLabelNoMargin>
            <SmallOutlineButton type="button" onClick={addRound}>
              + {t.addRound}
            </SmallOutlineButton>
          </SectionSubHeaderRow>

          {rounds.map((round, ri) => (
            <ItemPanel key={ri}>
              <ItemPanelHeader>
                <ItemPanelTitle>
                  {t.round} {ri + 1}
                </ItemPanelTitle>
                {rounds.length > 1 && (
                  <TinyDangerButton
                    type="button"
                    onClick={() => removeRound(ri)}
                  >
                    {t.removeRound}
                  </TinyDangerButton>
                )}
              </ItemPanelHeader>

              <InputMb10
                placeholder={t.roundTitlePlaceholder}
                value={round.title}
                onChange={(e) => updateRoundTitle(ri, e.target.value)}
              />

              <SubLabel>
                {t.cards}
              </SubLabel>

              {round.cards.map((card, ci) => (
                <CardItemRow key={ci}>
                  <IndexNumberSmall>{ci + 1}.</IndexNumberSmall>
                  <CardInput
                    placeholder={t.cardPlaceholder}
                    value={card}
                    onChange={(e) => updateCard(ri, ci, e.target.value)}
                  />
                  <MoveButtonGroup>
                    <TinyOutlineButton
                      type="button"
                      onClick={() => moveCard(ri, ci, -1)}
                      disabled={ci === 0}
                    >
                      ↑
                    </TinyOutlineButton>
                    <TinyOutlineButton
                      type="button"
                      onClick={() => moveCard(ri, ci, 1)}
                      disabled={ci === round.cards.length - 1}
                    >
                      ↓
                    </TinyOutlineButton>
                  </MoveButtonGroup>
                  {round.cards.length > 2 && (
                    <RemoveOutlineButton
                      type="button"
                      onClick={() => removeCard(ri, ci)}
                    >
                      {t.removeCard}
                    </RemoveOutlineButton>
                  )}
                </CardItemRow>
              ))}
              <AddButton
                type="button"
                onClick={() => addCard(ri)}
              >
                + {t.addCard}
              </AddButton>

              {/* Age Range */}
              <AgeRangeRow>
                <AgeRangeToggle
                  type="button"
                  selected={!!round.ageRange}
                  onClick={() => toggleRoundAgeRange(ri)}
                >
                  {round.ageRange ? t.ageRange : t.allAges}
                </AgeRangeToggle>
                {round.ageRange && (
                  <>
                    <AgeRangeInput
                      type="number"
                      placeholder={t.ageRangeMin}
                      value={round.ageRange.minAge}
                      onChange={(e) => updateRoundAgeRange(ri, 'minAge', Number(e.target.value))}
                      min={0}
                    />
                    <AgeRangeSeparator>-</AgeRangeSeparator>
                    <AgeRangeInput
                      type="number"
                      placeholder={t.ageRangeMax}
                      value={round.ageRange.maxAge}
                      onChange={(e) => updateRoundAgeRange(ri, 'maxAge', Number(e.target.value))}
                      min={0}
                    />
                  </>
                )}
              </AgeRangeRow>
            </ItemPanel>
          ))}
        </div>

        {/* Scoring */}
        <div>
          <SectionLabel>{t.scoring}</SectionLabel>
          <VerticalStackGap10>
            <ScoringRow>
              <ScoringLabel>{t.firstAttemptPoints}</ScoringLabel>
              <ScoringInput
                type="number"
                value={orderScoring.firstAttemptPoints}
                onChange={(e) => setOrderScoring((s) => ({ ...s, firstAttemptPoints: Number(e.target.value) }))}
              />
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.retryPoints}</ScoringLabel>
              <ScoringInput
                type="number"
                value={orderScoring.retryPoints}
                onChange={(e) => setOrderScoring((s) => ({ ...s, retryPoints: Number(e.target.value) }))}
              />
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.speedBonus}</ScoringLabel>
              <ScoringToggleButton
                type="button"
                selected={orderScoring.speedBonus}
                onClick={() => setOrderScoring((s) => ({ ...s, speedBonus: !s.speedBonus }))}
              >
                {orderScoring.speedBonus ? 'ON' : 'OFF'}
              </ScoringToggleButton>
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.timeLimitSeconds}</ScoringLabel>
              <ScoringInput
                type="number"
                value={orderScoring.timeLimitSeconds}
                onChange={(e) => setOrderScoring((s) => ({ ...s, timeLimitSeconds: Number(e.target.value) }))}
                min={0}
              />
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.golfChallenge}</ScoringLabel>
              <ScoringToggleButton
                type="button"
                selected={golfChallenge}
                onClick={() => setGolfChallenge((v) => !v)}
              >
                {golfChallenge ? 'ON' : 'OFF'}
              </ScoringToggleButton>
            </ScoringRow>
          </VerticalStackGap10>
        </div>
      </>
    );
  }
);
