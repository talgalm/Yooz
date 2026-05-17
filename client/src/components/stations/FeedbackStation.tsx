import { useState, useRef, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import type { StationItemData } from '../../pages/StoryModulePage/types';

// ─── Types ───

interface FeedbackQuestion {
  text: string;
}

interface FeedbackSettings {
  title?: string;
  introText?: string;
  questions?: FeedbackQuestion[];
  notesEnabled?: boolean;
  notesPlaceholder?: string;
}

export interface FeedbackResult {
  answers: { questionIndex: number; questionText: string; value: number; label: string }[];
  notes: string;
}

// ─── 6-Level Rating Model ───

const RATING_LEVELS = [
  { value: 1, label: 'בכלל לא', emoji: '😞' },
  { value: 2, label: 'במידה מועטה מאוד', emoji: '😕' },
  { value: 3, label: 'במידה מועטה', emoji: '😐' },
  { value: 4, label: 'במידה בינונית', emoji: '🙂' },
  { value: 5, label: 'במידה רבה', emoji: '😊' },
  { value: 6, label: 'במידה רבה מאוד', emoji: '🤩' },
];

// ─── Styled ───

const FeedbackContainer = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: '20px 16px 32px',
  maxWidth: 540,
  width: '100%',
  margin: '0 auto',
  overflowY: 'auto',
  gap: 12,
});

const Title = styled('h2')({
  fontSize: 20,
  fontWeight: 700,
  color: '#fff',
  textAlign: 'center',
  margin: '0 0 4px',
});

const IntroText = styled('p')({
  fontSize: 14,
  color: 'rgba(255,255,255,0.75)',
  textAlign: 'center',
  margin: '0 0 8px',
  lineHeight: 1.5,
});

const QuestionCard = styled('div')<{ answered: boolean }>(({ answered }) => ({
  background: '#fff',
  borderRadius: 14,
  padding: '18px 16px 14px',
  border: answered ? '2.5px solid #6c5ce7' : '2px solid #e8e4ef',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  transition: 'border-color 0.2s',
}));

const QuestionText = styled('div')({
  fontSize: 15,
  fontWeight: 600,
  color: '#333',
  textAlign: 'center',
  marginBottom: 16,
  lineHeight: 1.5,
});

// Slider track
const SliderContainer = styled('div')({
  position: 'relative',
  padding: '20px 14px 0',
  touchAction: 'none',
  userSelect: 'none',
});

const SliderTrack = styled('div')({
  position: 'relative',
  height: 4,
  background: '#e0dce8',
  borderRadius: 2,
});

const SliderFill = styled('div')<{ pct: number }>(({ pct }) => ({
  position: 'absolute',
  right: 0,
  top: 0,
  height: '100%',
  width: `${pct}%`,
  background: 'linear-gradient(90deg, #e74c8b, #6c5ce7)',
  borderRadius: 2,
  transition: 'width 0.15s',
}));

const ThumbOuter = styled('div')<{ pct: number }>(({ pct }) => ({
  position: 'absolute',
  top: -14,
  right: `${pct}%`,
  transform: 'translateX(50%)',
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: '#e74c8b',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  boxShadow: '0 2px 8px rgba(231,76,139,0.35)',
  cursor: 'grab',
  transition: 'right 0.15s',
  zIndex: 2,
  '&:active': {
    cursor: 'grabbing',
    transform: 'translateX(50%) scale(1.1)',
  },
}));

// Tick marks
const TicksRow = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: 8,
  padding: '0 1px',
});

const Tick = styled('button')<{ active: boolean }>(({ active }) => ({
  background: 'none',
  border: 'none',
  padding: '4px 0',
  cursor: 'pointer',
  fontSize: 10,
  fontWeight: active ? 700 : 500,
  color: active ? '#6c5ce7' : '#999',
  fontFamily: 'inherit',
  width: 14,
  textAlign: 'center',
}));

// Answer label
const AnswerLabel = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 6,
  marginTop: 10,
  fontSize: 13,
  fontWeight: 600,
  color: '#6c5ce7',
  minHeight: 20,
});

const NotesCard = styled('div')({
  background: '#fff',
  borderRadius: 14,
  padding: '14px 16px',
  border: '2px solid #e8e4ef',
});

const NotesArea = styled('textarea')({
  width: '100%',
  minHeight: 60,
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid #e0dce8',
  background: '#faf8fe',
  color: '#333',
  fontSize: 14,
  fontFamily: 'inherit',
  resize: 'vertical',
  outline: 'none',
  '&::placeholder': {
    color: '#aaa',
  },
  '&:focus': {
    borderColor: '#6c5ce7',
  },
});

const SubmitButton = styled('button')<{ disabled?: boolean }>(({ disabled }) => ({
  width: '100%',
  padding: '16px',
  borderRadius: 12,
  border: 'none',
  background: disabled ? '#b8b0e8' : '#6c5ce7',
  color: '#fff',
  fontSize: 18,
  fontWeight: 700,
  cursor: disabled ? 'default' : 'pointer',
  fontFamily: 'inherit',
  transition: 'background 0.2s, transform 0.1s',
  marginTop: 4,
  boxShadow: disabled ? 'none' : '0 4px 14px rgba(108,92,231,0.35)',
  ...(!disabled && {
    '&:active': {
      transform: 'scale(0.98)',
    },
  }),
}));

// ─── Slider Question Component ───

function SliderQuestion({
  question,
  index,
  value,
  onSelect,
}: {
  question: FeedbackQuestion;
  index: number;
  value: number | undefined;
  onSelect: (qIndex: number, value: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const valueToPercent = (v: number) => ((v - 1) / 5) * 100;

  const percentToValue = useCallback((clientX: number) => {
    if (!trackRef.current) return 1;
    const rect = trackRef.current.getBoundingClientRect();
    // RTL: right edge = value 1, left edge = value 6
    const pct = 1 - (clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, pct));
    return Math.round(clamped * 5) + 1;
  }, []);

  const handleTrackClick = (e: React.MouseEvent) => {
    const val = percentToValue(e.clientX);
    onSelect(index, val);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const val = percentToValue(e.clientX);
    onSelect(index, val);
  };

  const handlePointerUp = () => {
    dragging.current = false;
  };

  const currentValue = value ?? 0;
  const hasValue = value !== undefined;
  const pct = hasValue ? valueToPercent(currentValue) : 0;
  const level = hasValue ? RATING_LEVELS.find((l) => l.value === currentValue) : null;

  return (
    <QuestionCard answered={hasValue}>
      <QuestionText>{question.text}</QuestionText>

      <SliderContainer>
        <SliderTrack ref={trackRef} onClick={handleTrackClick}>
          {hasValue && <SliderFill pct={pct} />}
          {hasValue && (
            <ThumbOuter
              pct={pct}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {currentValue}
            </ThumbOuter>
          )}
        </SliderTrack>
        <TicksRow>
          {RATING_LEVELS.map((l) => (
            <Tick
              key={l.value}
              type="button"
              active={currentValue === l.value}
              onClick={() => onSelect(index, l.value)}
            >
              {l.value}
            </Tick>
          ))}
        </TicksRow>
      </SliderContainer>

      <AnswerLabel>
        {level ? (
          <>
            <span>{level.label}</span>
            <span>{level.emoji}</span>
          </>
        ) : (
          <span style={{ color: '#bbb', fontWeight: 400 }}>לחצו לבחירה</span>
        )}
      </AnswerLabel>
    </QuestionCard>
  );
}

// ─── Main Component ───

interface FeedbackStationProps {
  station: StationItemData;
  onContinue: (feedbackResult: FeedbackResult) => void;
  textColor?: string;
}

export default function FeedbackStation({ station, onContinue, textColor }: FeedbackStationProps) {
  const settings = (station.settings || {}) as FeedbackSettings;
  const questions = settings.questions || [];
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');

  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i] !== undefined);
  const answeredCount = Object.keys(answers).length;

  const handleSelect = (qIndex: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: value }));
  };

  const handleSubmit = () => {
    if (!allAnswered) return;

    const result: FeedbackResult = {
      answers: questions.map((q, i) => {
        const val = answers[i];
        const level = RATING_LEVELS.find((l) => l.value === val);
        return {
          questionIndex: i,
          questionText: q.text,
          value: val,
          label: level?.label || '',
        };
      }),
      notes: notes.trim(),
    };

    onContinue(result);
  };

  return (
    <FeedbackContainer>
      {settings.title && (
        <Title style={textColor ? { color: textColor } : undefined}>{settings.title}</Title>
      )}
      {settings.introText && (
        <IntroText style={textColor ? { color: textColor, opacity: 0.85 } : undefined}>
          {settings.introText}
        </IntroText>
      )}

      {questions.map((q, qIndex) => (
        <SliderQuestion
          key={qIndex}
          question={q}
          index={qIndex}
          value={answers[qIndex]}
          onSelect={handleSelect}
        />
      ))}

      {settings.notesEnabled !== false && (
        <NotesCard>
          <NotesArea
            placeholder={settings.notesPlaceholder || 'עוד הערות?'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </NotesCard>
      )}

      <SubmitButton
        disabled={!allAnswered}
        onClick={handleSubmit}
      >
        {allAnswered
          ? 'סיום'
          : `ענו על כל השאלות (${answeredCount}/${questions.length})`
        }
      </SubmitButton>
    </FeedbackContainer>
  );
}
