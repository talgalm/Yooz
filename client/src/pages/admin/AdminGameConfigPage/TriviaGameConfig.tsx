import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
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
  VerticalStackGap10,
  ScoringRow,
  ScoringLabel,
  ScoringInput,
  SmallOutlineButton,
  RemoveOutlineButton,
  TinyDangerButton,
  AddButton,
  ScoringToggleButton,
  AnswerPanel,
  CorrectToggleButton,
  FlexInput,
  InputMb8,
  CardItemRow,
  AnswerInput,
  ExplanationInput,
} from '../styled';
import type { TriviaQuestion, TriviaAnswer, TriviaScoring, GameConfigHandle } from './types';

const MediaUploadRow = styled(InlineRow)({
  marginBottom: 12,
});

interface TriviaGameConfigProps {
  t: Record<string, string>;
  initialSettings?: Record<string, unknown>;
}

export default forwardRef<GameConfigHandle, TriviaGameConfigProps>(
  function TriviaGameConfig({ t, initialSettings }, ref) {
    const [questions, setQuestions] = useState<TriviaQuestion[]>([
      { text: '', hint: '', media: '', answers: [{ text: '', isCorrect: true, explanation: '' }, { text: '', isCorrect: false, explanation: '' }] },
    ]);
    const [triviaScoring, setTriviaScoring] = useState<TriviaScoring>({
      correctAnswerPoints: 10,
      wrongAnswerPenalty: 0,
      timeLimitSeconds: 10,
    });
    const [shuffleAnswers, setShuffleAnswers] = useState(true);
    const [includeHelpers, setIncludeHelpers] = useState(true);
    const [multiChoice, setMultiChoice] = useState(false);

    // Load initial settings
    useEffect(() => {
      if (!initialSettings) return;
      const s = initialSettings;
      if (Array.isArray(s.questions)) {
        setQuestions(
          (s.questions as { text: string; hint?: string; media?: string; answers: { text: string; isCorrect: boolean; explanation?: string }[] }[]).map((q) => ({
            text: q.text || '',
            hint: q.hint || '',
            media: q.media || '',
            answers: (q.answers || []).map((a) => ({
              text: a.text || '',
              isCorrect: a.isCorrect || false,
              explanation: a.explanation || '',
            })),
          }))
        );
      }
      if (s.scoring && typeof s.scoring === 'object') {
        const sc = s.scoring as Record<string, unknown>;
        const hasTimeKey = Object.prototype.hasOwnProperty.call(sc, 'timeLimitSeconds');
        const rawTime = sc.timeLimitSeconds;
        const timeLimitSeconds = hasTimeKey
          ? Math.max(0, Number(rawTime) || 0)
          : 0; // legacy games without the field had no per-question limit
        setTriviaScoring({
          correctAnswerPoints: (sc.correctAnswerPoints as number) ?? 10,
          wrongAnswerPenalty: (sc.wrongAnswerPenalty as number) ?? 0,
          timeLimitSeconds,
        });
      }
      if (typeof s.shuffleAnswers === 'boolean') {
        setShuffleAnswers(s.shuffleAnswers);
      }
      setIncludeHelpers(typeof s.includeHelpers === 'boolean' ? s.includeHelpers : true);
      if (typeof s.multiChoice === 'boolean') setMultiChoice(s.multiChoice);
    }, [initialSettings]);

    useImperativeHandle(ref, () => ({
      validate() {
        const validQuestions = questions.filter(
          (q) => q.text.trim() && q.answers.filter((a) => a.text.trim()).length >= 2
        );
        if (validQuestions.length === 0) return t.noQuestions;
        return null;
      },
      getSettings() {
        return {
          questions: questions
            .filter((q) => q.text.trim() && q.answers.filter((a) => a.text.trim()).length >= 2)
            .map((q) => ({
              text: q.text.trim(),
              hint: q.hint.trim() || undefined,
              media: q.media.trim() || undefined,
              answers: q.answers
                .filter((a) => a.text.trim())
                .map((a) => ({
                  text: a.text.trim(),
                  isCorrect: a.isCorrect,
                  explanation: a.explanation.trim() || undefined,
                })),
            })),
          scoring: {
            correctAnswerPoints: triviaScoring.correctAnswerPoints,
            wrongAnswerPenalty: triviaScoring.wrongAnswerPenalty,
            timeLimitSeconds: triviaScoring.timeLimitSeconds || undefined,
          },
          shuffleAnswers,
          includeHelpers,
          multiChoice,
        };
      },
      fillRandom() {
        setQuestions([
          {
            text: 'מהי בירת ישראל?',
            hint: 'עיר קדושה',
            media: '',
            answers: [
              { text: 'ירושלים', isCorrect: true, explanation: 'ירושלים היא בירת ישראל' },
              { text: 'תל אביב', isCorrect: false, explanation: '' },
              { text: 'חיפה', isCorrect: false, explanation: '' },
              { text: 'באר שבע', isCorrect: false, explanation: '' },
            ],
          },
          {
            text: 'כמה צבעים יש בקשת?',
            hint: '',
            media: '',
            answers: [
              { text: '5', isCorrect: false, explanation: '' },
              { text: '7', isCorrect: true, explanation: 'יש 7 צבעים בקשת' },
              { text: '6', isCorrect: false, explanation: '' },
              { text: '8', isCorrect: false, explanation: '' },
            ],
          },
          {
            text: 'מי כתב את "הנסיך הקטן"?',
            hint: '',
            media: '',
            answers: [
              { text: 'סנט-אכזופרי', isCorrect: true, explanation: '' },
              { text: 'ויקטור הוגו', isCorrect: false, explanation: '' },
              { text: 'מארק טוויין', isCorrect: false, explanation: '' },
              { text: 'שייקספיר', isCorrect: false, explanation: '' },
            ],
          },
          {
            text: 'באיזו שנה הוקמה מדינת ישראל?',
            hint: '',
            media: '',
            answers: [
              { text: '1948', isCorrect: true, explanation: '' },
              { text: '1947', isCorrect: false, explanation: '' },
              { text: '1950', isCorrect: false, explanation: '' },
              { text: '1945', isCorrect: false, explanation: '' },
            ],
          },
        ]);
        setTriviaScoring({ correctAnswerPoints: 10, wrongAnswerPenalty: 0, timeLimitSeconds: 10 });
        setShuffleAnswers(true);
        setIncludeHelpers(true);
        setMultiChoice(false);
      },
    }));

    // ─── Question management ───
    const addQuestion = () => {
      setQuestions((prev) => [
        ...prev,
        { text: '', hint: '', media: '', answers: [{ text: '', isCorrect: true, explanation: '' }, { text: '', isCorrect: false, explanation: '' }] },
      ]);
    };

    const removeQuestion = (qi: number) => {
      setQuestions((prev) => prev.filter((_, i) => i !== qi));
    };

    const updateQuestion = (qi: number, field: keyof TriviaQuestion, value: string) => {
      setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, [field]: value } : q)));
    };

    const addAnswer = (qi: number) => {
      setQuestions((prev) =>
        prev.map((q, i) =>
          i === qi ? { ...q, answers: [...q.answers, { text: '', isCorrect: false, explanation: '' }] } : q
        )
      );
    };

    const removeAnswer = (qi: number, ai: number) => {
      setQuestions((prev) =>
        prev.map((q, i) =>
          i === qi ? { ...q, answers: q.answers.filter((_, j) => j !== ai) } : q
        )
      );
    };

    const updateAnswer = (qi: number, ai: number, field: keyof TriviaAnswer, value: string | boolean) => {
      setQuestions((prev) =>
        prev.map((q, i) =>
          i === qi
            ? { ...q, answers: q.answers.map((a, j) => (j === ai ? { ...a, [field]: value } : a)) }
            : q
        )
      );
    };

    return (
      <>
        {/* Questions */}
        <div>
          <SectionSubHeaderRow>
            <SectionLabelNoMargin>{t.questions}</SectionLabelNoMargin>
            <SmallOutlineButton type="button" onClick={addQuestion}>
              + {t.addQuestion}
            </SmallOutlineButton>
          </SectionSubHeaderRow>

          {questions.map((question, qi) => (
            <ItemPanel key={qi}>
              <ItemPanelHeader>
                <ItemPanelTitle>
                  {t.question} {qi + 1}
                </ItemPanelTitle>
                {questions.length > 1 && (
                  <TinyDangerButton
                    type="button"
                    onClick={() => removeQuestion(qi)}
                  >
                    {t.removeQuestion}
                  </TinyDangerButton>
                )}
              </ItemPanelHeader>

              <InputMb8
                placeholder={t.questionText}
                value={question.text}
                onChange={(e) => updateQuestion(qi, 'text', e.target.value)}
              />
              <InputMb8
                placeholder={t.questionHint}
                value={question.hint}
                onChange={(e) => updateQuestion(qi, 'hint', e.target.value)}
              />
              <MediaUploadRow>
                <FileUploadButton
                  accept="image/*"
                  onUploaded={(url) => updateQuestion(qi, 'media', url)}
                />
                <FlexInput
                  placeholder={t.questionMedia}
                  value={question.media}
                  onChange={(e) => updateQuestion(qi, 'media', e.target.value)}
                />
              </MediaUploadRow>

              {/* Answers */}
              <SubLabel>
                {t.answers}
              </SubLabel>

              {question.answers.map((answer, ai) => (
                <AnswerPanel key={ai} correct={answer.isCorrect}>
                  <CardItemRow>
                    <AnswerInput
                      placeholder={t.answerText}
                      value={answer.text}
                      onChange={(e) => updateAnswer(qi, ai, 'text', e.target.value)}
                    />
                    <CorrectToggleButton
                      type="button"
                      selected={answer.isCorrect}
                      correct={answer.isCorrect}
                      onClick={() => updateAnswer(qi, ai, 'isCorrect', !answer.isCorrect)}
                    >
                      {t.markCorrect}
                    </CorrectToggleButton>
                    {question.answers.length > 2 && (
                      <RemoveOutlineButton
                        type="button"
                        onClick={() => removeAnswer(qi, ai)}
                      >
                        {t.removeAnswer}
                      </RemoveOutlineButton>
                    )}
                  </CardItemRow>
                  <ExplanationInput
                    placeholder={t.answerExplanation}
                    value={answer.explanation}
                    onChange={(e) => updateAnswer(qi, ai, 'explanation', e.target.value)}
                  />
                </AnswerPanel>
              ))}

              <AddButton
                type="button"
                onClick={() => addAnswer(qi)}
              >
                + {t.addAnswer}
              </AddButton>
            </ItemPanel>
          ))}
        </div>

        {/* Scoring */}
        <div>
          <SectionLabel>{t.scoring}</SectionLabel>
          <VerticalStackGap10>
            <ScoringRow>
              <ScoringLabel>{t.correctAnswerPoints}</ScoringLabel>
              <ScoringInput
                type="number"
                value={triviaScoring.correctAnswerPoints}
                onChange={(e) => setTriviaScoring((s) => ({ ...s, correctAnswerPoints: Number(e.target.value) }))}
                min={0}
              />
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.wrongAnswerPenalty}</ScoringLabel>
              <ScoringInput
                type="number"
                value={triviaScoring.wrongAnswerPenalty}
                onChange={(e) => setTriviaScoring((s) => ({ ...s, wrongAnswerPenalty: Number(e.target.value) }))}
                min={0}
              />
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.triviaTimeLimitSeconds}</ScoringLabel>
              <ScoringInput
                type="number"
                value={triviaScoring.timeLimitSeconds}
                onChange={(e) => setTriviaScoring((s) => ({ ...s, timeLimitSeconds: Number(e.target.value) }))}
                min={0}
              />
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.shuffleAnswers}</ScoringLabel>
              <ScoringToggleButton
                type="button"
                selected={shuffleAnswers}
                onClick={() => setShuffleAnswers((v) => !v)}
              >
                {shuffleAnswers ? 'ON' : 'OFF'}
              </ScoringToggleButton>
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.includeHelpers}</ScoringLabel>
              <ScoringToggleButton
                type="button"
                selected={includeHelpers}
                onClick={() => setIncludeHelpers((v) => !v)}
              >
                {includeHelpers ? 'ON' : 'OFF'}
              </ScoringToggleButton>
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.multiChoice}</ScoringLabel>
              <ScoringToggleButton
                type="button"
                selected={multiChoice}
                onClick={() => setMultiChoice((v) => !v)}
              >
                {multiChoice ? 'ON' : 'OFF'}
              </ScoringToggleButton>
            </ScoringRow>
          </VerticalStackGap10>
        </div>
      </>
    );
  }
);
