import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import {
  SectionLabel,
  SectionLabelNoMargin,
  ItemPanel,
  ItemPanelHeader,
  ItemPanelTitle,
  SectionSubHeaderRow,
  VerticalStackGap10,
  ScoringRow,
  ScoringLabel,
  ScoringInput,
  SmallOutlineButton,
  TinyDangerButton,
  CorrectToggleButton,
  InputMb8,
  CardItemRow,
  AnswerInput,
} from '../styled';
import type { BallGameQuestion, BallGameAnswer, BallGameScoring, GameConfigHandle } from './types';

interface BallGameConfigProps {
  t: Record<string, string>;
  initialSettings?: Record<string, unknown>;
}

const emptyQuestion = (): BallGameQuestion => ({
  text: '',
  answers: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
});

export default forwardRef<GameConfigHandle, BallGameConfigProps>(
  function BallGameConfig({ t, initialSettings }, ref) {
    const [questions, setQuestions] = useState<BallGameQuestion[]>([emptyQuestion()]);
    const [scoring, setScoring] = useState<BallGameScoring>({ timeLimitSeconds: 30 });

    useEffect(() => {
      if (!initialSettings) return;
      const s = initialSettings;
      if (Array.isArray(s.questions)) {
        setQuestions(
          (s.questions as { text: string; answers: { text: string; isCorrect: boolean }[] }[]).map((q) => ({
            text: q.text || '',
            answers: (q.answers || []).slice(0, 4).map((a) => ({
              text: a.text || '',
              isCorrect: a.isCorrect || false,
            })),
          }))
        );
      }
      if (s.scoring && typeof s.scoring === 'object') {
        const sc = s.scoring as Record<string, unknown>;
        setScoring({
          timeLimitSeconds: (sc.timeLimitSeconds as number) ?? 30,
        });
      }
    }, [initialSettings]);

    useImperativeHandle(ref, () => ({
      validate() {
        if (questions.length > 10) return t.ballGameMaxQuestions;
        const valid = questions.filter(
          (q) =>
            q.text.trim() &&
            q.answers.filter((a) => a.text.trim()).length >= 4 &&
            q.answers.some((a) => a.isCorrect && a.text.trim())
        );
        if (valid.length === 0) return t.noBallGameQuestions;
        return null;
      },
      getSettings() {
        return {
          questions: questions
            .filter((q) => q.text.trim() && q.answers.filter((a) => a.text.trim()).length >= 2)
            .map((q) => ({
              text: q.text.trim(),
              answers: q.answers
                .filter((a) => a.text.trim())
                .map((a) => ({
                  text: a.text.trim(),
                  isCorrect: a.isCorrect,
                })),
            })),
          scoring: {
            timeLimitSeconds: scoring.timeLimitSeconds || 30,
          },
        };
      },
      fillRandom() {
        setQuestions([
          {
            text: 'מהי בירת ישראל?',
            answers: [
              { text: 'ירושלים', isCorrect: true },
              { text: 'תל אביב', isCorrect: false },
              { text: 'חיפה', isCorrect: false },
              { text: 'באר שבע', isCorrect: false },
            ],
          },
          {
            text: 'כמה צבעים יש בקשת?',
            answers: [
              { text: '5', isCorrect: false },
              { text: '7', isCorrect: true },
              { text: '6', isCorrect: false },
              { text: '8', isCorrect: false },
            ],
          },
          {
            text: 'באיזו שנה הוקמה מדינת ישראל?',
            answers: [
              { text: '1948', isCorrect: true },
              { text: '1947', isCorrect: false },
              { text: '1950', isCorrect: false },
              { text: '1945', isCorrect: false },
            ],
          },
        ]);
        setScoring({ timeLimitSeconds: 30 });
      },
    }));

    const addQuestion = () => {
      if (questions.length >= 10) return;
      setQuestions((prev) => [...prev, emptyQuestion()]);
    };

    const removeQuestion = (qi: number) => {
      setQuestions((prev) => prev.filter((_, i) => i !== qi));
    };

    const updateQuestionText = (qi: number, value: string) => {
      setQuestions((prev) => prev.map((q, i) => (i === qi ? { ...q, text: value } : q)));
    };

    const updateAnswer = (qi: number, ai: number, field: keyof BallGameAnswer, value: string | boolean) => {
      setQuestions((prev) =>
        prev.map((q, i) => {
          if (i !== qi) return q;
          if (field === 'isCorrect' && value === true) {
            return {
              ...q,
              answers: q.answers.map((a, j) => ({ ...a, isCorrect: j === ai })),
            };
          }
          return {
            ...q,
            answers: q.answers.map((a, j) => (j === ai ? { ...a, [field]: value } : a)),
          };
        })
      );
    };

    return (
      <>
        <div>
          <SectionSubHeaderRow>
            <SectionLabelNoMargin>{t.questions}</SectionLabelNoMargin>
            <SmallOutlineButton type="button" onClick={addQuestion} disabled={questions.length >= 10}>
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
                  <TinyDangerButton type="button" onClick={() => removeQuestion(qi)}>
                    {t.removeQuestion}
                  </TinyDangerButton>
                )}
              </ItemPanelHeader>

              <InputMb8
                placeholder={t.questionText}
                value={question.text}
                onChange={(e) => updateQuestionText(qi, e.target.value)}
              />

              {question.answers.map((answer, ai) => (
                <CardItemRow key={ai} style={{ marginBottom: 6 }}>
                  <AnswerInput
                    placeholder={`${t.answerText} ${ai + 1}`}
                    value={answer.text}
                    onChange={(e) => updateAnswer(qi, ai, 'text', e.target.value)}
                  />
                  <CorrectToggleButton
                    type="button"
                    selected={answer.isCorrect}
                    correct={answer.isCorrect}
                    onClick={() => updateAnswer(qi, ai, 'isCorrect', true)}
                  >
                    {t.markCorrect}
                  </CorrectToggleButton>
                </CardItemRow>
              ))}
            </ItemPanel>
          ))}
        </div>

        <div>
          <SectionLabel>{t.scoring}</SectionLabel>
          <VerticalStackGap10>
            <ScoringRow>
              <ScoringLabel>{t.ballGameTimeLimitSeconds}</ScoringLabel>
              <ScoringInput
                type="number"
                value={scoring.timeLimitSeconds}
                onChange={(e) => setScoring((s) => ({ ...s, timeLimitSeconds: Number(e.target.value) }))}
                min={5}
              />
            </ScoringRow>
          </VerticalStackGap10>
        </div>
      </>
    );
  }
);
