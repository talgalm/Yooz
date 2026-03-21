import { useState, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import { styled } from '@mui/material/styles';
import FileUploadButton from '../../../components/FileUploadButton';
import {
  SectionLabel,
  SectionLabelNoMargin,
  SubLabel,
  ItemPanel,
  ItemPanelHeader,
  ItemPanelTitle,
  SectionSubHeaderRow,
  InlineRow,
  InlineRowGap6,
  VerticalStackGap10,
  ScoringRow,
  ScoringLabel,
  ScoringInput,
  SmallOutlineButton,
  RemoveOutlineButton,
  TinyDangerButton,
  AddButton,
  ScoringToggleButton,
  AgeRangeToggle,
  AnswerPanel,
  CorrectToggleButton,
  AgeRangeRow,
  AgeRangeInput,
  AgeRangeSeparator,
  FlexInput,
  InputMb8,
  AnswerInput,
  FullWidthInput,
  GridConfigRow,
  GridConfigField,
  GridConfigFieldWide,
  PuzzlePreview,
  PuzzlePreviewImage,
} from '../styled';
import type { PuzzleQuestion, PuzzleScoring, GameConfigHandle } from './types';

const MediaUploadRow = styled(InlineRow)({
  marginBottom: 12,
});

interface PuzzleGameConfigProps {
  t: Record<string, string>;
  initialSettings?: Record<string, unknown>;
}

export default forwardRef<GameConfigHandle, PuzzleGameConfigProps>(
  function PuzzleGameConfig({ t, initialSettings }, ref) {
    const makeEmptyQuestion = (): PuzzleQuestion => ({
      text: '',
      media: '',
      answers: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }],
    });

    const [puzzleImage, setPuzzleImage] = useState('');
    const [gridCols, setGridCols] = useState(3);
    const [gridRows, setGridRows] = useState(3);
    const [retryGap, setRetryGap] = useState(3);
    const [puzzleQuestions, setPuzzleQuestions] = useState<PuzzleQuestion[]>(
      () => Array.from({ length: 9 }, () => makeEmptyQuestion())
    );
    const [puzzleScoring, setPuzzleScoring] = useState<PuzzleScoring>({
      basePoints: 100,
      speedBonusMax: 50,
      timeLimitSeconds: 300,
    });
    const [puzzleShuffleAnswers, setPuzzleShuffleAnswers] = useState(true);

    // Auto-sync question count when grid dimensions change
    const gridInitRef = useRef(false);
    useEffect(() => {
      if (!gridInitRef.current) {
        gridInitRef.current = true;
        return;
      }
      const targetCount = gridCols * gridRows;
      setPuzzleQuestions((prev) => {
        if (prev.length >= targetCount) return prev;
        const toAdd = targetCount - prev.length;
        return [...prev, ...Array.from({ length: toAdd }, () => makeEmptyQuestion())];
      });
    }, [gridCols, gridRows]);

    // Load initial settings
    useEffect(() => {
      if (!initialSettings) return;
      const s = initialSettings;
      setPuzzleImage((s.puzzleImage as string) || '');
      const cols = (s.gridCols as number) || 3;
      const rows = (s.gridRows as number) || 3;
      setGridCols(cols);
      setGridRows(rows);
      setRetryGap((s.retryGap as number) || 3);
      if (Array.isArray(s.questions)) {
        const loaded = (s.questions as { text: string; media?: string; answers: { text: string; isCorrect: boolean }[]; ageRange?: { minAge: number; maxAge: number } }[]).map((q) => ({
          text: q.text || '',
          media: q.media || '',
          answers: (q.answers || []).map((a) => ({
            text: a.text || '',
            isCorrect: a.isCorrect || false,
          })),
          ageRange: q.ageRange,
        }));
        // Pad with empty questions if fewer than grid target
        const target = cols * rows;
        if (loaded.length < target) {
          const toAdd = target - loaded.length;
          loaded.push(...Array.from({ length: toAdd }, () => makeEmptyQuestion()));
        }
        setPuzzleQuestions(loaded);
      }
      if (s.scoring && typeof s.scoring === 'object') {
        const sc = s.scoring as Record<string, unknown>;
        setPuzzleScoring({
          basePoints: (sc.basePoints as number) ?? 100,
          speedBonusMax: (sc.speedBonusMax as number) ?? 50,
          timeLimitSeconds: (sc.timeLimitSeconds as number) || 300,
        });
      }
      if (typeof s.shuffleAnswers === 'boolean') {
        setPuzzleShuffleAnswers(s.shuffleAnswers);
      }
    }, [initialSettings]);

    useImperativeHandle(ref, () => ({
      validate() {
        if (!puzzleImage.trim()) return t.noPuzzleImage;
        const validPuzzleQuestions = puzzleQuestions.filter(
          (q) => q.text.trim() && q.answers.filter((a) => a.text.trim()).length >= 2
        );
        if (validPuzzleQuestions.length === 0) return t.noPuzzleQuestions;
        return null;
      },
      getSettings() {
        return {
          puzzleImage: puzzleImage.trim(),
          gridCols,
          gridRows,
          retryGap,
          questions: puzzleQuestions
            .filter((q) => q.text.trim() && q.answers.filter((a) => a.text.trim()).length >= 2)
            .map((q) => ({
              text: q.text.trim(),
              media: q.media.trim() || undefined,
              answers: q.answers
                .filter((a) => a.text.trim())
                .map((a) => ({
                  text: a.text.trim(),
                  isCorrect: a.isCorrect,
                })),
              ...(q.ageRange && { ageRange: q.ageRange }),
            })),
          scoring: {
            basePoints: puzzleScoring.basePoints,
            speedBonusMax: puzzleScoring.speedBonusMax,
            timeLimitSeconds: puzzleScoring.timeLimitSeconds || 300,
          },
          shuffleAnswers: puzzleShuffleAnswers,
        };
      },
      fillRandom() {
        setPuzzleImage('https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Israel_-_Pair_of_Goldfinches.jpg/640px-Israel_-_Pair_of_Goldfinches.jpg');
        setGridCols(3);
        setGridRows(3);
        setRetryGap(2);
        const qTexts = [
          ['איפה נמצא הר הצופים?', 'ירושלים', 'תל אביב'],
          ['מהו הנהר הארוך בישראל?', 'הירדן', 'הירקון'],
          ['כמה ימים יש בשנה מעוברת?', '366', '365'],
          ['מהו הים הנמוך בעולם?', 'ים המלח', 'ים כנרת'],
          ['באיזו עיר נמצא מגדל דוד?', 'ירושלים', 'עכו'],
          ['מהו החג הראשון בשנה העברית?', 'ראש השנה', 'פסח'],
          ['כמה שבטים היו בישראל?', '12', '10'],
          ['מהו הפרח הלאומי של ישראל?', 'כלנית', 'רקפת'],
          ['באיזו שנה הוקמה מדינת ישראל?', '1948', '1947'],
        ];
        setPuzzleQuestions(
          qTexts.map(([text, correct, wrong]) => ({
            text,
            media: '',
            answers: [
              { text: correct, isCorrect: true },
              { text: wrong, isCorrect: false },
            ],
          }))
        );
        setPuzzleScoring({ basePoints: 100, speedBonusMax: 50, timeLimitSeconds: 300 });
        setPuzzleShuffleAnswers(true);
      },
    }));

    // ─── Puzzle question management ───
    const addPuzzleQuestion = () => {
      setPuzzleQuestions((prev) => [
        ...prev,
        { text: '', media: '', answers: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] },
      ]);
    };

    const removePuzzleQuestion = (qi: number) => {
      setPuzzleQuestions((prev) => prev.filter((_, i) => i !== qi));
    };

    const updatePuzzleQuestion = (qi: number, field: 'text' | 'media', value: string) => {
      setPuzzleQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, [field]: value } : q)));
    };

    const addPuzzleAnswer = (qi: number) => {
      setPuzzleQuestions((prev) =>
        prev.map((q, i) =>
          i === qi ? { ...q, answers: [...q.answers, { text: '', isCorrect: false }] } : q
        )
      );
    };

    const removePuzzleAnswer = (qi: number, ai: number) => {
      setPuzzleQuestions((prev) =>
        prev.map((q, i) =>
          i === qi ? { ...q, answers: q.answers.filter((_, j) => j !== ai) } : q
        )
      );
    };

    const updatePuzzleAnswer = (qi: number, ai: number, field: 'text' | 'isCorrect', value: string | boolean) => {
      setPuzzleQuestions((prev) =>
        prev.map((q, i) =>
          i === qi
            ? { ...q, answers: q.answers.map((a, j) => (j === ai ? { ...a, [field]: value } : a)) }
            : q
        )
      );
    };

    const updatePuzzleQuestionAgeRange = (qi: number, field: 'minAge' | 'maxAge', value: number) => {
      setPuzzleQuestions((prev) =>
        prev.map((q, i) => {
          if (i !== qi) return q;
          const current = q.ageRange || { minAge: 0, maxAge: 120 };
          return { ...q, ageRange: { ...current, [field]: value } };
        })
      );
    };

    const togglePuzzleQuestionAgeRange = (qi: number) => {
      setPuzzleQuestions((prev) =>
        prev.map((q, i) => {
          if (i !== qi) return q;
          return { ...q, ageRange: q.ageRange ? undefined : { minAge: 0, maxAge: 120 } };
        })
      );
    };

    return (
      <>
        {/* Puzzle Image */}
        <div>
          <SectionLabel>{t.puzzleImage}</SectionLabel>
          <InlineRow>
            <FileUploadButton
              accept="image/*"
              onUploaded={(url) => setPuzzleImage(url)}
            />
            <FlexInput
              placeholder={t.puzzleImagePlaceholder}
              value={puzzleImage}
              onChange={(e) => setPuzzleImage(e.target.value)}
            />
          </InlineRow>
          {puzzleImage && (
            <PuzzlePreview>
              <PuzzlePreviewImage src={puzzleImage} alt="Puzzle preview" />
            </PuzzlePreview>
          )}
        </div>

        {/* Grid size + retry gap */}
        <GridConfigRow>
          <GridConfigField>
            <SubLabel>{t.gridCols}</SubLabel>
            <FullWidthInput
              type="number"
              value={gridCols}
              onChange={(e) => setGridCols(Math.max(1, Number(e.target.value)))}
              min={1}
              max={8}
            />
          </GridConfigField>
          <GridConfigField>
            <SubLabel>{t.gridRows}</SubLabel>
            <FullWidthInput
              type="number"
              value={gridRows}
              onChange={(e) => setGridRows(Math.max(1, Number(e.target.value)))}
              min={1}
              max={8}
            />
          </GridConfigField>
          <GridConfigFieldWide>
            <SubLabel>{t.retryGap}</SubLabel>
            <FullWidthInput
              type="number"
              value={retryGap}
              onChange={(e) => setRetryGap(Math.max(1, Number(e.target.value)))}
              min={1}
              max={10}
            />
          </GridConfigFieldWide>
        </GridConfigRow>

        {/* Questions */}
        <div>
          <SectionSubHeaderRow>
            <SectionLabelNoMargin>{t.puzzleQuestions}</SectionLabelNoMargin>
            <SmallOutlineButton type="button" onClick={addPuzzleQuestion}>
              + {t.addPuzzleQuestion}
            </SmallOutlineButton>
          </SectionSubHeaderRow>

          {puzzleQuestions.map((pq, qi) => (
            <ItemPanel key={qi}>
              <ItemPanelHeader>
                <ItemPanelTitle>
                  {t.puzzleQuestion} {qi + 1}
                </ItemPanelTitle>
                {puzzleQuestions.length > 1 && (
                  <TinyDangerButton
                    type="button"
                    onClick={() => removePuzzleQuestion(qi)}
                  >
                    {t.removePuzzleQuestion}
                  </TinyDangerButton>
                )}
              </ItemPanelHeader>

              <InputMb8
                placeholder={t.puzzleQuestionText}
                value={pq.text}
                onChange={(e) => updatePuzzleQuestion(qi, 'text', e.target.value)}
              />
              <MediaUploadRow>
                <FileUploadButton
                  accept="image/*"
                  onUploaded={(url) => updatePuzzleQuestion(qi, 'media', url)}
                />
                <FlexInput
                  placeholder={t.puzzleQuestionMedia}
                  value={pq.media}
                  onChange={(e) => updatePuzzleQuestion(qi, 'media', e.target.value)}
                />
              </MediaUploadRow>

              {/* Answers */}
              <SubLabel>
                {t.puzzleAnswers}
              </SubLabel>

              {pq.answers.map((answer, ai) => (
                <AnswerPanel key={ai} correct={answer.isCorrect}>
                  <InlineRowGap6>
                    <AnswerInput
                      placeholder={t.puzzleAnswerText}
                      value={answer.text}
                      onChange={(e) => updatePuzzleAnswer(qi, ai, 'text', e.target.value)}
                    />
                    <CorrectToggleButton
                      type="button"
                      selected={answer.isCorrect}
                      correct={answer.isCorrect}
                      onClick={() => updatePuzzleAnswer(qi, ai, 'isCorrect', !answer.isCorrect)}
                    >
                      {t.puzzleMarkCorrect}
                    </CorrectToggleButton>
                    {pq.answers.length > 2 && (
                      <RemoveOutlineButton
                        type="button"
                        onClick={() => removePuzzleAnswer(qi, ai)}
                      >
                        {t.removePuzzleAnswer}
                      </RemoveOutlineButton>
                    )}
                  </InlineRowGap6>
                </AnswerPanel>
              ))}

              <AddButton
                type="button"
                onClick={() => addPuzzleAnswer(qi)}
              >
                + {t.addPuzzleAnswer}
              </AddButton>

              {/* Age Range */}
              <AgeRangeRow>
                <AgeRangeToggle
                  type="button"
                  selected={!!pq.ageRange}
                  onClick={() => togglePuzzleQuestionAgeRange(qi)}
                >
                  {pq.ageRange ? t.ageRange : t.allAges}
                </AgeRangeToggle>
                {pq.ageRange && (
                  <>
                    <AgeRangeInput
                      type="number"
                      placeholder={t.ageRangeMin}
                      value={pq.ageRange.minAge}
                      onChange={(e) => updatePuzzleQuestionAgeRange(qi, 'minAge', Number(e.target.value))}
                      min={0}
                    />
                    <AgeRangeSeparator>-</AgeRangeSeparator>
                    <AgeRangeInput
                      type="number"
                      placeholder={t.ageRangeMax}
                      value={pq.ageRange.maxAge}
                      onChange={(e) => updatePuzzleQuestionAgeRange(qi, 'maxAge', Number(e.target.value))}
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
              <ScoringLabel>{t.basePoints}</ScoringLabel>
              <ScoringInput
                type="number"
                value={puzzleScoring.basePoints}
                onChange={(e) => setPuzzleScoring((s) => ({ ...s, basePoints: Number(e.target.value) }))}
                min={0}
              />
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.speedBonusMax}</ScoringLabel>
              <ScoringInput
                type="number"
                value={puzzleScoring.speedBonusMax}
                onChange={(e) => setPuzzleScoring((s) => ({ ...s, speedBonusMax: Number(e.target.value) }))}
                min={0}
              />
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.puzzleTimeLimitSeconds}</ScoringLabel>
              <ScoringInput
                type="number"
                value={puzzleScoring.timeLimitSeconds}
                onChange={(e) => setPuzzleScoring((s) => ({ ...s, timeLimitSeconds: Number(e.target.value) }))}
                min={0}
              />
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.puzzleShuffleAnswers}</ScoringLabel>
              <ScoringToggleButton
                type="button"
                selected={puzzleShuffleAnswers}
                onClick={() => setPuzzleShuffleAnswers((v) => !v)}
              >
                {puzzleShuffleAnswers ? 'ON' : 'OFF'}
              </ScoringToggleButton>
            </ScoringRow>
          </VerticalStackGap10>
        </div>
      </>
    );
  }
);
