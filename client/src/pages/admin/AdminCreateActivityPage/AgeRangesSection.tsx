import { styled } from '@mui/material/styles';
import type { AgeRange, QuestionMode } from './types';
import {
  SelectionGroup,
  SelectionButton,
} from '../../../components/styled';
import {
  SectionLabel,
  SelectionSubtext,
  StationOrderItem,
  TinyDangerButton,
  AddButtonMt8,
  VerticalStack,
  CompactInput,
} from '../styled';

// ─── Local styled components ───

const AgeRangeLabelInput = styled(CompactInput)({
  flex: 2,
});

const AgeRangeInputLarge = styled(CompactInput)({
  width: 70,
});

const AgeRangeSep = styled('span')({
  fontSize: 13,
  color: '#888',
});

// ─── Props ───

interface AgeRangesSectionProps {
  questionMode: QuestionMode;
  setQuestionMode: (mode: QuestionMode) => void;
  ageRanges: AgeRange[];
  onAddAgeRange: () => void;
  onRemoveAgeRange: (index: number) => void;
  onUpdateAgeRange: (index: number, field: keyof AgeRange, value: string | number) => void;
  t: Record<string, string>;
}

// ─── Component ───

export default function AgeRangesSection({
  questionMode,
  setQuestionMode,
  ageRanges,
  onAddAgeRange,
  onRemoveAgeRange,
  onUpdateAgeRange,
  t,
}: AgeRangesSectionProps) {
  return (
    <>
      {/* Question Mode */}
      <div>
        <SectionLabel>{t.questionMode}</SectionLabel>
        <SelectionGroup>
          <SelectionButton type="button" selected={questionMode === 'same'} onClick={() => setQuestionMode('same')}>
            <div>{t.sameQuestions}</div>
            <SelectionSubtext>{t.sameQuestionsDesc}</SelectionSubtext>
          </SelectionButton>
          <SelectionButton type="button" selected={questionMode === 'byAge'} onClick={() => setQuestionMode('byAge')}>
            <div>{t.byAgeQuestions}</div>
            <SelectionSubtext>{t.byAgeQuestionsDesc}</SelectionSubtext>
          </SelectionButton>
        </SelectionGroup>
      </div>

      {/* Age Ranges Config */}
      {questionMode === 'byAge' && (
        <div>
          <SectionLabel>{t.ageRanges}</SectionLabel>
          <VerticalStack>
            {ageRanges.map((range, i) => (
              <StationOrderItem key={i}>
                <AgeRangeLabelInput
                  placeholder={t.ageRangeLabel}
                  value={range.label}
                  onChange={(e) => onUpdateAgeRange(i, 'label', e.target.value)}
                />
                <AgeRangeInputLarge
                  type="number"
                  placeholder={t.ageRangeMin}
                  value={range.minAge}
                  onChange={(e) => onUpdateAgeRange(i, 'minAge', Number(e.target.value))}
                  min={0}
                />
                <AgeRangeSep>-</AgeRangeSep>
                <AgeRangeInputLarge
                  type="number"
                  placeholder={t.ageRangeMax}
                  value={range.maxAge}
                  onChange={(e) => onUpdateAgeRange(i, 'maxAge', Number(e.target.value))}
                  min={0}
                />
                <TinyDangerButton
                  type="button"
                  onClick={() => onRemoveAgeRange(i)}
                >
                  {t.removeAgeRange}
                </TinyDangerButton>
              </StationOrderItem>
            ))}
          </VerticalStack>
          <AddButtonMt8
            type="button"
            onClick={onAddAgeRange}
          >
            + {t.addAgeRange}
          </AddButtonMt8>
        </div>
      )}
    </>
  );
}
