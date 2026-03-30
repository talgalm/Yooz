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
  TinyDangerButton,
  ScoringToggleButton,
  TruthToggleButton,
  FlexInput,
  InputMb8,
} from '../styled';
import type { TrueFalseStatement, TrueFalseScoring, GameConfigHandle } from './types';

const MediaUploadRow = styled(InlineRow)({
  marginBottom: 12,
});

const TruthRow = styled(InlineRow)({
  marginBottom: 8,
});

const InlineSubLabel = styled(SubLabel)({
  marginBottom: 0,
});

interface TrueFalseGameConfigProps {
  t: Record<string, string>;
  initialSettings?: Record<string, unknown>;
}

export default forwardRef<GameConfigHandle, TrueFalseGameConfigProps>(
  function TrueFalseGameConfig({ t, initialSettings }, ref) {
    const [tfStatements, setTfStatements] = useState<TrueFalseStatement[]>([
      { text: '', media: '', isTrue: true },
    ]);
    const [tfScoring, setTfScoring] = useState<TrueFalseScoring>({
      correctPoints: 10,
      wrongPenalty: 0,
      timeLimitSeconds: 10,
    });
    const [showCountdown, setShowCountdown] = useState(true);
    const [feedbackDurationMs, setFeedbackDurationMs] = useState(1500);

    // Load initial settings
    useEffect(() => {
      if (!initialSettings) return;
      const s = initialSettings;
      if (Array.isArray(s.statements)) {
        setTfStatements(
          (s.statements as { text: string; media?: string; isTrue: boolean }[]).map((st) => ({
            text: st.text || '',
            media: st.media || '',
            isTrue: st.isTrue ?? true,
          }))
        );
      }
      if (s.scoring && typeof s.scoring === 'object') {
        const sc = s.scoring as Record<string, unknown>;
        setTfScoring({
          correctPoints: (sc.correctPoints as number) ?? 10,
          wrongPenalty: (sc.wrongPenalty as number) ?? 0,
          timeLimitSeconds: (sc.timeLimitSeconds as number) || 10,
        });
      }
      if (typeof s.showCountdown === 'boolean') {
        setShowCountdown(s.showCountdown);
      }
      if (typeof s.feedbackDurationMs === 'number') {
        setFeedbackDurationMs(s.feedbackDurationMs as number);
      }
    }, [initialSettings]);

    useImperativeHandle(ref, () => ({
      validate() {
        const validStatements = tfStatements.filter((s) => s.text.trim());
        if (validStatements.length === 0) return t.noStatements;
        return null;
      },
      getSettings() {
        return {
          statements: tfStatements
            .filter((s) => s.text.trim())
            .map((s) => ({
              text: s.text.trim(),
              isTrue: s.isTrue,
              media: s.media.trim() || undefined,
            })),
          scoring: {
            correctPoints: tfScoring.correctPoints,
            wrongPenalty: tfScoring.wrongPenalty,
            timeLimitSeconds: tfScoring.timeLimitSeconds,
          },
          showCountdown,
          feedbackDurationMs,
        };
      },
      fillRandom() {
        setTfStatements([
          { text: 'כדור הארץ הוא כוכב הלכת הגדול ביותר במערכת השמש', media: '', isTrue: false },
          { text: 'מגדל אייפל נמצא בפריז', media: '', isTrue: true },
          { text: 'יש 206 עצמות בגוף האדם הבוגר', media: '', isTrue: true },
          { text: 'השמש סובבת סביב כדור הארץ', media: '', isTrue: false },
          { text: 'ים המלח הוא המקום הנמוך ביותר בעולם', media: '', isTrue: true },
          { text: 'היהלום הוא החומר הקשה ביותר בטבע', media: '', isTrue: true },
        ]);
        setTfScoring({ correctPoints: 10, wrongPenalty: 0, timeLimitSeconds: 10 });
        setShowCountdown(true);
        setFeedbackDurationMs(1500);
      },
    }));

    // ─── Statement management ───
    const addTfStatement = () => {
      setTfStatements((prev) => [...prev, { text: '', media: '', isTrue: true }]);
    };

    const removeTfStatement = (si: number) => {
      setTfStatements((prev) => prev.filter((_, i) => i !== si));
    };

    const updateTfStatement = (si: number, field: 'text' | 'media', value: string) => {
      setTfStatements((prev) => prev.map((s, i) => (i === si ? { ...s, [field]: value } : s)));
    };

    const toggleTfStatementTruth = (si: number) => {
      setTfStatements((prev) => prev.map((s, i) => (i === si ? { ...s, isTrue: !s.isTrue } : s)));
    };

    return (
      <>
        {/* Statements */}
        <div>
          <SectionSubHeaderRow>
            <SectionLabelNoMargin>{t.statements}</SectionLabelNoMargin>
            <SmallOutlineButton type="button" onClick={addTfStatement}>
              + {t.addStatement}
            </SmallOutlineButton>
          </SectionSubHeaderRow>

          {tfStatements.map((stmt, si) => (
            <ItemPanel key={si}>
              <ItemPanelHeader>
                <ItemPanelTitle>
                  {t.statement} {si + 1}
                </ItemPanelTitle>
                {tfStatements.length > 1 && (
                  <TinyDangerButton
                    type="button"
                    onClick={() => removeTfStatement(si)}
                  >
                    {t.removeStatement}
                  </TinyDangerButton>
                )}
              </ItemPanelHeader>

              <InputMb8
                placeholder={t.statementText}
                value={stmt.text}
                onChange={(e) => updateTfStatement(si, 'text', e.target.value)}
              />

              <MediaUploadRow>
                <FileUploadButton
                  accept="image/*"
                  onUploaded={(url) => updateTfStatement(si, 'media', url)}
                />
                <FlexInput
                  placeholder={t.statementMedia}
                  value={stmt.media}
                  onChange={(e) => updateTfStatement(si, 'media', e.target.value)}
                />
              </MediaUploadRow>

              {/* True/False toggle */}
              <TruthRow>
                <InlineSubLabel>
                  {t.markCorrect}:
                </InlineSubLabel>
                <TruthToggleButton
                  type="button"
                  selected={stmt.isTrue}
                  isTrue={stmt.isTrue}
                  onClick={() => toggleTfStatementTruth(si)}
                >
                  {stmt.isTrue ? t.markTrue : t.markFalse}
                </TruthToggleButton>
              </TruthRow>
            </ItemPanel>
          ))}
        </div>

        {/* Scoring & Timing */}
        <div>
          <SectionLabel>{t.scoring}</SectionLabel>
          <VerticalStackGap10>
            <ScoringRow>
              <ScoringLabel>{t.tfCorrectPoints}</ScoringLabel>
              <ScoringInput
                type="number"
                value={tfScoring.correctPoints}
                onChange={(e) => setTfScoring((s) => ({ ...s, correctPoints: Number(e.target.value) }))}
                min={0}
              />
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.tfWrongPenalty}</ScoringLabel>
              <ScoringInput
                type="number"
                value={tfScoring.wrongPenalty}
                onChange={(e) => setTfScoring((s) => ({ ...s, wrongPenalty: Number(e.target.value) }))}
                min={0}
              />
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.tfTimeLimitSeconds}</ScoringLabel>
              <ScoringInput
                type="number"
                value={tfScoring.timeLimitSeconds}
                onChange={(e) => setTfScoring((s) => ({ ...s, timeLimitSeconds: Math.max(1, Number(e.target.value)) }))}
                min={1}
              />
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.showCountdown}</ScoringLabel>
              <ScoringToggleButton
                type="button"
                selected={showCountdown}
                onClick={() => setShowCountdown((v) => !v)}
              >
                {showCountdown ? 'ON' : 'OFF'}
              </ScoringToggleButton>
            </ScoringRow>
            <ScoringRow>
              <ScoringLabel>{t.feedbackDurationMs}</ScoringLabel>
              <ScoringInput
                type="number"
                value={feedbackDurationMs}
                onChange={(e) => setFeedbackDurationMs(Math.max(500, Number(e.target.value)))}
                min={500}
                step={100}
              />
            </ScoringRow>
          </VerticalStackGap10>
        </div>
      </>
    );
  }
);
