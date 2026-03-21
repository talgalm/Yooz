import { useState, useCallback, useEffect, useRef } from 'react';
import {
  QuestionOverlay,
  QuestionCard,
  QuestionText,
  OptionsGrid,
  OptionButton,
  FeedbackIcon,
} from './styled';
import type { BallGameQuestion } from './types';

interface BallGamePlayProps {
  question: BallGameQuestion;
  questionIndex: number;
  totalQuestions: number;
  shuffledAnswerIndices: number[];
  onAnswered: (selectedIndex: number, isCorrect: boolean) => void;
  disabled: boolean;
}

export default function BallGamePlay({
  question,
  questionIndex,
  shuffledAnswerIndices,
  onAnswered,
  disabled,
}: BallGamePlayProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const answeredRef = useRef(false);

  // Reset when question changes
  useEffect(() => {
    setSelectedIdx(null);
    answeredRef.current = false;
  }, [questionIndex]);

  const handleSelect = useCallback(
    (displayIdx: number) => {
      if (answeredRef.current || disabled) return;
      answeredRef.current = true;

      const actualIdx = shuffledAnswerIndices[displayIdx];
      const isCorrect = question.answers[actualIdx].isCorrect;
      setSelectedIdx(displayIdx);
      onAnswered(actualIdx, isCorrect);
    },
    [question, shuffledAnswerIndices, onAnswered, disabled]
  );

  const getOptionState = (displayIdx: number) => {
    if (selectedIdx === null) return 'default' as const;
    const actualIdx = shuffledAnswerIndices[displayIdx];
    const answer = question.answers[actualIdx];

    if (displayIdx === selectedIdx) {
      return answer.isCorrect ? 'correct' as const : 'wrong' as const;
    }
    if (answer.isCorrect) {
      return 'reveal' as const;
    }
    return 'disabled' as const;
  };

  return (
    <QuestionOverlay>
      <QuestionCard>
        <QuestionText>{question.text}</QuestionText>
      </QuestionCard>

      <OptionsGrid>
        {shuffledAnswerIndices.map((actualIdx, displayIdx) => {
          const state = getOptionState(displayIdx);
          return (
            <OptionButton
              key={displayIdx}
              state={state}
              onClick={() => handleSelect(displayIdx)}
              disabled={selectedIdx !== null || disabled}
            >
              {question.answers[actualIdx].text}
              {state === 'correct' && <FeedbackIcon type="correct">✓</FeedbackIcon>}
              {state === 'wrong' && <FeedbackIcon type="wrong">✗</FeedbackIcon>}
            </OptionButton>
          );
        })}
      </OptionsGrid>
    </QuestionOverlay>
  );
}
