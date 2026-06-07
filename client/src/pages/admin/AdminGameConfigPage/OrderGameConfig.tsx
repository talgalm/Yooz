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
  InputMb10,
  CardItemRow,
  CardInput,
  IndexNumberSmall,
} from '../styled';
import { SelectionButton } from '../../../components/styled';
import type { OrderRound, OrderScoring, GameConfigHandle } from './types';

type OrderMode = 'quiz' | 'survey';

interface OrderGameConfigProps {
  t: Record<string, string>;
  initialSettings?: Record<string, unknown>;
}

export default forwardRef<GameConfigHandle, OrderGameConfigProps>(
  function OrderGameConfig({ t, initialSettings }, ref) {
    const [mode, setMode] = useState<OrderMode>('quiz');
    const [rounds, setRounds] = useState<OrderRound[]>([{ title: '', cards: ['', ''] }]);
    const [orderScoring, setOrderScoring] = useState<OrderScoring>({
      firstAttemptPoints: 100,
      retryPoints: 50,
      speedBonus: false,
      timeLimitSeconds: 0,
    });
    const [golfChallenge, setGolfChallenge] = useState(true);

    useEffect(() => {
      if (!initialSettings) return;
      const s = initialSettings;
      if (s.mode === 'survey') setMode('survey');
      else setMode('quiz');
      if (Array.isArray(s.rounds)) {
        setRounds(
          (s.rounds as { title?: string; cards: string[] }[]).map((r) => ({
            title: r.title || '',
            cards: r.cards || ['', ''],
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

    const handleModeChange = (next: OrderMode) => {
      setMode(next);
      if (next === 'survey' && rounds.length > 1) {
        setRounds([rounds[0]]);
      }
    };

    useImperativeHandle(ref, () => ({
      validate() {
        if (mode === 'survey') {
          const validRounds = rounds.filter((r) => r.cards.filter((c) => c.trim()).length >= 2);
          if (validRounds.length !== 1) return t.noSurveyRound;
          return null;
        }
        const validRounds = rounds.filter((r) => r.cards.filter((c) => c.trim()).length >= 2);
        if (validRounds.length === 0) return t.noRounds;
        return null;
      },
      getSettings() {
        const filteredRounds = rounds
          .filter((r) => r.cards.filter((c) => c.trim()).length >= 2)
          .map((r) => ({
            title: r.title.trim() || undefined,
            cards: r.cards.filter((c) => c.trim()),
          }));

        const base = {
          mode,
          rounds: mode === 'survey' ? filteredRounds.slice(0, 1) : filteredRounds,
        };

        if (mode === 'survey') return base;

        return {
          ...base,
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
        if (mode === 'survey') {
          setRounds([
            { title: 'מה הכי חשוב לכם?', cards: ['חדשנות', 'שיתוף פעולה', 'יציבות', 'גמישות', 'איכות', 'מהירות'] },
          ]);
          return;
        }
        setRounds([
          { title: 'מספרים 1-5', cards: ['אחד', 'שתיים', 'שלוש', 'ארבע', 'חמש'] },
          { title: 'ימות השבוע', cards: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'] },
          { title: 'חודשי השנה', cards: ['ינואר', 'פברואר', 'מרץ', 'אפריל'] },
        ]);
        setOrderScoring({ firstAttemptPoints: 100, retryPoints: 50, speedBonus: true, timeLimitSeconds: 120 });
        setGolfChallenge(true);
      },
    }));

    const addRound = () => {
      if (mode === 'survey') return;
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

    const visibleRounds = mode === 'survey' ? rounds.slice(0, 1) : rounds;

    return (
      <>
        <div>
          <SectionLabel>{t.orderMode}</SectionLabel>
          <VerticalStackGap10 style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <SelectionButton type="button" selected={mode === 'quiz'} onClick={() => handleModeChange('quiz')}>
              {t.orderModeQuiz}
            </SelectionButton>
            <SelectionButton type="button" selected={mode === 'survey'} onClick={() => handleModeChange('survey')}>
              {t.orderModeSurvey}
            </SelectionButton>
          </VerticalStackGap10>
        </div>

        <div>
          <SectionSubHeaderRow>
            <SectionLabelNoMargin>{t.rounds}</SectionLabelNoMargin>
            {mode === 'quiz' && (
              <SmallOutlineButton type="button" onClick={addRound}>
                + {t.addRound}
              </SmallOutlineButton>
            )}
          </SectionSubHeaderRow>

          {visibleRounds.map((round, ri) => (
            <ItemPanel key={ri}>
              <ItemPanelHeader>
                <ItemPanelTitle>
                  {t.round} {ri + 1}
                </ItemPanelTitle>
                {mode === 'quiz' && rounds.length > 1 && (
                  <TinyDangerButton type="button" onClick={() => removeRound(ri)}>
                    {t.removeRound}
                  </TinyDangerButton>
                )}
              </ItemPanelHeader>

              <InputMb10
                placeholder={t.roundTitlePlaceholder}
                value={round.title}
                onChange={(e) => updateRoundTitle(ri, e.target.value)}
              />

              <SubLabel>{mode === 'survey' ? t.surveyItemsLabel : t.cards}</SubLabel>

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
                    <RemoveOutlineButton type="button" onClick={() => removeCard(ri, ci)}>
                      {t.removeCard}
                    </RemoveOutlineButton>
                  )}
                </CardItemRow>
              ))}
              <AddButton type="button" onClick={() => addCard(ri)}>
                + {t.addCard}
              </AddButton>
            </ItemPanel>
          ))}
        </div>

        {mode === 'quiz' && (
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
        )}
      </>
    );
  }
);
