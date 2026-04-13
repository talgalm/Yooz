import { useState, useRef, useEffect, useCallback } from 'react'; // useEffect kept for initial focus
import { styled, keyframes } from '@mui/material/styles';
import type { StationItemData } from '../../pages/StoryModulePage/types';
import type { GameResult } from '../games/types';

// ─── Types ───

interface RiddleSettings {
  clue: string;
  answer: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  maxScore?: number;
  successMessage?: string;
  failureMessage?: string;
}

// ─── Helpers ───

function isHebrewText(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

function getScoreForAttempt(maxScore: number, attempt: number): number {
  // attempt is 0-indexed: 0 = first try (full), 1 = second (half), 2 = third (quarter)
  if (attempt === 0) return maxScore;
  if (attempt === 1) return Math.floor(maxScore / 2);
  return Math.floor(Math.floor(maxScore / 2) / 2);
}

// ─── Animations ───

const shakeAnim = keyframes`
  0%   { transform: translateX(0); }
  20%  { transform: translateX(-5px); }
  40%  { transform: translateX(5px); }
  60%  { transform: translateX(-3px); }
  80%  { transform: translateX(3px); }
  100% { transform: translateX(0); }
`;

const popIn = keyframes`
  from { transform: scale(0.7); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

// ─── Styled ───

const Container = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '16px 20px 120px',
  gap: 18,
  overflowY: 'auto',
});

const StationTitle = styled('h2')({
  fontSize: 22,
  fontWeight: 800,
  color: '#111',
  margin: 0,
  textAlign: 'center',
});

const ClueText = styled('p')({
  fontSize: 17,
  color: '#333',
  textAlign: 'center',
  margin: 0,
  lineHeight: 1.6,
  fontWeight: 500,
});

const MediaWrapper = styled('div')({
  width: '100%',
  maxWidth: 380,
  borderRadius: 14,
  overflow: 'hidden',
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  flexShrink: 0,
});

const BoxesArea = styled('div')<{ isrtl: string }>(({ isrtl }) => ({
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
  justifyContent: 'center',
  direction: isrtl === 'true' ? 'rtl' : 'ltr',
  width: '100%',
  padding: '4px 0',
}));

const WordGroup = styled('div')({
  display: 'flex',
  flexDirection: 'row',
  gap: 5,
});

const LetterBoxInput = styled('input')<{ filled: string; shaking: string }>(({ filled, shaking }) => ({
  width: 38,
  height: 46,
  border: `2.5px solid ${filled === 'true' ? '#6c5ce7' : '#ccc'}`,
  borderRadius: 10,
  textAlign: 'center',
  fontSize: 20,
  fontWeight: 700,
  color: '#111',
  background: filled === 'true' ? '#f0eefa' : '#fafafa',
  outline: 'none',
  transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
  fontFamily: 'inherit',
  caretColor: 'transparent',
  cursor: 'text',
  animation: shaking === 'true' ? `${shakeAnim} 0.45s ease` : 'none',
  '&:focus': {
    borderColor: '#8B2FC9',
    background: '#f5f0ff',
    boxShadow: '0 0 0 3px rgba(139,47,201,0.18)',
  },
  '-webkit-user-select': 'text',
}));

const AttemptsRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 14,
  color: '#666',
});

const AttemptDot = styled('div')<{ used: string }>(({ used }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: used === 'true' ? '#e74c3c' : '#ddd',
  transition: 'background 0.2s',
}));

const ScoreBadge = styled('div')({
  fontSize: 13,
  color: '#8B2FC9',
  fontWeight: 700,
  textAlign: 'center',
  background: '#f0eefa',
  borderRadius: 20,
  padding: '5px 14px',
  border: '1.5px solid #d8c7f0',
});

const SubmitButton = styled('button')({
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 40,
  background: '#6c5ce7',
  color: '#fff',
  border: '3px solid #000',
  borderRadius: 50,
  padding: '14px 48px',
  fontSize: 16,
  fontWeight: 800,
  fontFamily: 'inherit',
  cursor: 'pointer',
  boxShadow: '0 3px 0 #000, 0 4px 20px rgba(108,92,231,0.35)',
  transition: 'all 0.1s ease',
  whiteSpace: 'nowrap',
  '&:active': {
    transform: 'translateX(-50%) translateY(3px)',
    boxShadow: '0 0 0 #000',
  },
  '&:disabled': {
    opacity: 0.5,
    cursor: 'default',
  },
});

const GreenContinueButton = styled('button')({
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 40,
  background: 'linear-gradient(180deg, #5cb85c 0%, #28a745 48%, #1e7e34 100%)',
  color: '#fff',
  border: '5px solid #155724',
  borderRadius: 16,
  padding: '14px 52px',
  fontSize: 18,
  fontWeight: 800,
  fontFamily: 'inherit',
  cursor: 'pointer',
  boxShadow: '0 6px 0 #0f3d18, 0 12px 24px rgba(0,0,0,0.28)',
  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  whiteSpace: 'nowrap',
  textShadow: '0 1px 0 rgba(255,255,255,0.25)',
  '&:active': {
    transform: 'translateX(-50%) translateY(4px)',
    boxShadow: '0 2px 0 #0f3d18, 0 6px 14px rgba(0,0,0,0.25)',
  },
});

const ResultOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200,
  animation: `${fadeIn} 0.25s ease`,
});

const ResultCard = styled('div')({
  background: '#fff',
  borderRadius: 24,
  padding: '36px 40px',
  textAlign: 'center',
  maxWidth: 320,
  width: '88%',
  boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
  animation: `${popIn} 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)`,
});

const ResultEmoji = styled('div')({
  fontSize: 56,
  lineHeight: 1.1,
  marginBottom: 10,
});

const ResultTitle = styled('div')({
  fontSize: 22,
  fontWeight: 800,
  color: '#111',
  marginBottom: 8,
});

const ResultMessage = styled('div')({
  fontSize: 15,
  color: '#555',
  lineHeight: 1.5,
  marginBottom: 12,
});

const ResultScore = styled('div')({
  fontSize: 17,
  fontWeight: 700,
  color: '#6c5ce7',
});

// ─── Component ───

interface RiddleStationProps {
  station: StationItemData;
  onComplete: (result: GameResult) => void;
  stationHintText?: string | null;
  stationHintUsed?: boolean;
  onStationHintClick?: () => void;
  hintLabel?: string;
  textColor?: string;
}

export default function RiddleStation({
  station,
  onComplete,
  stationHintText,
  stationHintUsed = false,
  onStationHintClick,
  hintLabel,
  textColor,
}: RiddleStationProps) {
  const settings = (station.settings || {}) as RiddleSettings;
  const clue = settings.clue || '';
  const answer = settings.answer || '';
  const maxScore = typeof settings.maxScore === 'number' ? settings.maxScore : 100;
  const successMessage = settings.successMessage || (isHebrewText(clue + answer) ? 'כל הכבוד! ענית נכון!' : 'Correct! Well done!');
  const failureMessage = settings.failureMessage || (isHebrewText(clue + answer) ? 'לא הצלחת הפעם. נסה שוב בפעם הבאה!' : 'Better luck next time!');
  const isRTL = isHebrewText(answer);

  // Build word groups (split answer by spaces)
  const words = answer ? answer.split(' ') : [];
  // Flat letter array (no spaces)
  const letters = answer ? answer.replace(/ /g, '').split('') : [];
  const totalChars = letters.length;

  // Word group → flat char indices mapping
  const wordGroups: number[][] = [];
  let charCount = 0;
  for (const word of words) {
    const indices: number[] = [];
    for (let i = 0; i < word.length; i++) {
      indices.push(charCount++);
    }
    wordGroups.push(indices);
  }

  const [inputs, setInputs] = useState<string[]>(Array(totalChars).fill(''));
  const [attempt, setAttempt] = useState(0); // 0-indexed attempt number
  const [shaking, setShaking] = useState(false);
  const [phase, setPhase] = useState<'playing' | 'success' | 'failure'>('playing');
  const [earnedScore, setEarnedScore] = useState(0);
  const [startTime] = useState(() => Date.now());
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first box on mount
  useEffect(() => {
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const handleCheck = useCallback(() => {
    if (phase !== 'playing') return;
    const userAnswer = inputs.join('').toLowerCase();
    const correctAnswer = answer.replace(/ /g, '').toLowerCase();
    if (userAnswer === correctAnswer) {
      const score = getScoreForAttempt(maxScore, attempt);
      setEarnedScore(score);
      setPhase('success');
    } else {
      const nextAttempt = attempt + 1;
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      if (nextAttempt >= 3) {
        setAttempt(nextAttempt);
        setPhase('failure');
        setTimeout(() => {
          onComplete({ score: 0, maxPossibleScore: maxScore, durationMs: Date.now() - startTime, hintUsed: false, attempts: 3 });
        }, 2500);
      } else {
        setAttempt(nextAttempt);
        setTimeout(() => {
          setInputs(Array(totalChars).fill(''));
          setTimeout(() => inputRefs.current[0]?.focus(), 80);
        }, 400);
      }
    }
  }, [phase, inputs, answer, attempt, maxScore, totalChars, startTime, onComplete]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, flatIndex: number) => {
    const val = e.target.value;
    if (!val) return;
    const char = val[val.length - 1];
    const updated = [...inputs];
    updated[flatIndex] = char;
    setInputs(updated);
    if (flatIndex < totalChars - 1) {
      inputRefs.current[flatIndex + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, flatIndex: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const updated = [...inputs];
      if (inputs[flatIndex]) {
        updated[flatIndex] = '';
        setInputs(updated);
      } else if (flatIndex > 0) {
        updated[flatIndex - 1] = '';
        setInputs(updated);
        inputRefs.current[flatIndex - 1]?.focus();
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = flatIndex - 1;
      if (prev >= 0) inputRefs.current[prev]?.focus();
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = flatIndex + 1;
      if (next < totalChars) inputRefs.current[next]?.focus();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputs.every((c) => c !== '')) handleCheck();
      return;
    }
  };

  const allFilled = inputs.every((c) => c !== '');
  return (
    <>
      <Container>
        <StationTitle style={textColor ? { color: textColor } : undefined}>{station.name}</StationTitle>

        {clue ? <ClueText>{clue}</ClueText> : null}

        {settings.mediaUrl && settings.mediaType === 'image' && (
          <MediaWrapper>
            <img src={settings.mediaUrl} alt="" style={{ width: '100%', display: 'block', maxHeight: 260, objectFit: 'cover' }} />
          </MediaWrapper>
        )}

        {settings.mediaUrl && settings.mediaType === 'video' && (
          <MediaWrapper>
            <video src={settings.mediaUrl} controls autoPlay muted playsInline style={{ width: '100%', display: 'block', maxHeight: 260 }} />
          </MediaWrapper>
        )}

        <BoxesArea isrtl={String(isRTL)}>
          {wordGroups.map((indices, wIdx) => (
            <WordGroup key={wIdx}>
              {indices.map((flatIndex) => (
                <LetterBoxInput
                  key={flatIndex}
                  ref={(el) => { inputRefs.current[flatIndex] = el; }}
                  type="text"
                  maxLength={2}
                  value={inputs[flatIndex]}
                  filled={String(inputs[flatIndex] !== '')}
                  shaking={String(shaking)}
                  onChange={(e) => handleChange(e, flatIndex)}
                  onKeyDown={(e) => handleKeyDown(e, flatIndex)}
                  onFocus={(e) => e.target.select()}
                  disabled={phase !== 'playing'}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              ))}
            </WordGroup>
          ))}
        </BoxesArea>

        <AttemptsRow>
          {[0, 1, 2].map((i) => (
            <AttemptDot key={i} used={String(i < attempt)} />
          ))}
          <span style={{ marginInlineStart: 4 }}>
            {isRTL ? `ניסיון ${attempt + 1} מתוך 3` : `Attempt ${attempt + 1} of 3`}
          </span>
        </AttemptsRow>

        {stationHintText && onStationHintClick ? (
          <ScoreBadge
            as="button"
            type="button"
            onClick={onStationHintClick}
            style={{ cursor: 'pointer' }}
            aria-label={hintLabel || (isRTL ? 'רמז' : 'Hint')}
          >
            {hintLabel || (stationHintUsed ? (isRTL ? 'הצג רמז' : 'Show Hint') : (isRTL ? 'רמז' : 'Hint'))}
          </ScoreBadge>
        ) : null}
      </Container>

      {phase === 'success' ? (
        <GreenContinueButton
          onClick={() => onComplete({ score: earnedScore, maxPossibleScore: maxScore, durationMs: Date.now() - startTime, hintUsed: false, attempts: attempt + 1 })}
        >
          {isRTL ? 'המשך' : 'Continue'}
        </GreenContinueButton>
      ) : (
        <SubmitButton
          onClick={handleCheck}
          disabled={!allFilled || phase !== 'playing'}
        >
          {isRTL ? 'בדיקה' : 'Check'}
        </SubmitButton>
      )}

      {phase === 'success' && (
        <ResultOverlay>
          <ResultCard>
            <ResultEmoji>🎉</ResultEmoji>
            <ResultTitle>{isRTL ? 'נכון!' : 'Correct!'}</ResultTitle>
            <ResultMessage>{successMessage}</ResultMessage>
            <ResultScore>{isRTL ? `+${earnedScore} נקודות` : `+${earnedScore} points`}</ResultScore>
          </ResultCard>
        </ResultOverlay>
      )}

      {phase === 'failure' && (
        <ResultOverlay>
          <ResultCard>
            <ResultEmoji>😔</ResultEmoji>
            <ResultTitle>{isRTL ? 'לא הצלחת' : 'Game Over'}</ResultTitle>
            <ResultMessage>{failureMessage}</ResultMessage>
            <div style={{ fontSize: 14, color: '#888', marginTop: 8 }}>
              {isRTL ? `התשובה הנכונה: ` : `The answer was: `}
              <strong style={{ color: '#333' }}>{answer}</strong>
            </div>
          </ResultCard>
        </ResultOverlay>
      )}
    </>
  );
}
