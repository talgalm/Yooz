import { useState, useRef, useEffect, useCallback } from 'react'; // useEffect kept for initial focus
import { styled, keyframes } from '@mui/material/styles';
import type { StationItemData } from '../../pages/StoryModulePage/types';
import type { GameResult } from '../games/types';
import { resolveVideoSource } from '../../utils/videoSource';
import { StationContinueButton } from '../games/styled';
import ImageZoomOverlay, { ZoomBadge, ZoomGlassIcon } from '../ImageZoomOverlay';

// ─── Types ───

interface RiddleSettings {
  clue?: string;
  answer?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  maxScore?: number;
  successMessage?: string;
  failureMessage?: string;
  continueButtonText?: string;
  successImageUrl?: string;
  unlimitedAttempts?: boolean;
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
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  // No scroll: everything fits one screen. The image (MediaSlot) flex-shrinks
  // to whatever vertical space is left after title/clue/boxes/buttons.
  padding: '16px 20px 20px',
  gap: 12,
  overflow: 'hidden',
  // Desktop: cap to a centered column so clue + image + letter boxes don't
  // stretch edge to edge of a wide monitor (QA Jun 2026 page 15 #17).
  '@media (min-width: 768px)': {
    width: 'min(840px, 90vw)',
    marginInline: 'auto',
    padding: '24px 24px 28px',
    gap: 18,
  },
});

const StationTitle = styled('h2')({
  fontSize: 24,
  fontWeight: 800,
  color: '#fff',
  WebkitTextStroke: '1.5px #000',
  paintOrder: 'stroke fill',
  margin: 0,
  textAlign: 'center',
  flexShrink: 0,
  '@media (min-width: 768px)': {
    fontSize: 34,
  },
});

const ClueText = styled('p')({
  fontSize: 20,
  fontWeight: 800,
  color: '#111',
  textAlign: 'center',
  margin: 0,
  lineHeight: 1.35,
  flexShrink: 0,
  '@media (min-width: 768px)': {
    fontSize: 28,
    maxWidth: 'min(640px, 80vw)',
  },
});

// Flex slot that absorbs all remaining vertical space; the image scales down
// inside it (object-fit: contain) so the station never needs to scroll.
const MediaSlot = styled('div')({
  position: 'relative', // anchors the zoom badge to the media area's corner
  flex: '1 1 0',
  minHeight: 0,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const MediaWrapper = styled('div')({
  // Inline-block so the shadowed card shrinks to its image's intrinsic size.
  // Previously this was width:100%/maxWidth:380 — when the image's aspect
  // ratio didn't match the card, the shadow rectangle stuck out behind a
  // small image (QA Jun 2026 page 15 "shadow doesn't match image ratio").
  display: 'inline-block',
  maxWidth: '100%',
  borderRadius: 14,
  overflow: 'hidden',
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  flexShrink: 0,
  lineHeight: 0,
  '@media (min-width: 768px)': {
    // Desktop: allow the image to grow into a real focal point.
    maxWidth: 'min(560px, 60vw)',
  },
});

const RiddleMediaImage = styled('img')({
  display: 'block',
  // Bounded by the flex MediaSlot (which has a definite height), so the image
  // shrinks to fit the leftover space — no scroll. Decoration lives on the img
  // itself: with only max-* set the element hugs the scaled image, so the
  // shadow never sticks out past it (QA Jun 2026 page 15 shadow-ratio note).
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  borderRadius: 14,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  cursor: 'zoom-in',
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
  flexShrink: 0,
}));

const WordGroup = styled('div')({
  display: 'flex',
  flexDirection: 'row',
  gap: 5,
});

const LetterBoxInput = styled('input')<{ filled: string; shaking: string }>(({ filled, shaking }) => ({
  width: 38,
  height: 46,
  border: `2.5px solid ${
    shaking === 'true' ? '#e74c3c' : filled === 'true' ? '#6c5ce7' : '#ccc'
  }`,
  borderRadius: 10,
  textAlign: 'center',
  fontSize: 20,
  fontWeight: 700,
  color: shaking === 'true' ? '#c0392b' : '#111',
  background: shaking === 'true' ? '#fdecea' : filled === 'true' ? '#f0eefa' : '#fafafa',
  outline: 'none',
  transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s, color 0.15s',
  fontFamily: 'inherit',
  caretColor: 'transparent',
  cursor: 'text',
  animation: shaking === 'true' ? `${shakeAnim} 0.45s ease` : 'none',
  boxShadow: shaking === 'true' ? '0 0 0 3px rgba(231,76,60,0.18)' : 'none',
  '&:focus': {
    borderColor: shaking === 'true' ? '#e74c3c' : '#8B2FC9',
    background: shaking === 'true' ? '#fdecea' : '#f5f0ff',
    boxShadow: shaking === 'true'
      ? '0 0 0 3px rgba(231,76,60,0.25)'
      : '0 0 0 3px rgba(139,47,201,0.18)',
  },
  '-webkit-user-select': 'text',
}));

const WrongHint = styled('div')({
  fontSize: 15,
  fontWeight: 800,
  color: '#c0392b',
  textAlign: 'center',
  minHeight: 20,
  animation: `${fadeIn} 0.15s ease`,
  flexShrink: 0,
});

const AttemptsRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 14,
  color: '#666',
  flexShrink: 0,
});

// Inline hint button (in normal flow, above the fixed Check button). Replaces
// the floating clue pill that used to overlap the riddle image. Matches the
// EnteringText station's hint button styling.
const InlineHintButton = styled('button')({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '11px 22px',
  borderRadius: 999,
  border: '2px solid #5143c6',
  background: 'linear-gradient(135deg, #8276f2 0%, #6c5ce7 100%)',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(108, 92, 231, 0.4)',
  WebkitTapHighlightColor: 'transparent',
  flexShrink: 0,
  '&:active': {
    transform: 'translateY(2px)',
    boxShadow: '0 2px 8px rgba(108, 92, 231, 0.35)',
  },
});

const AttemptDot = styled('div')<{ used: string }>(({ used }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: used === 'true' ? '#e74c3c' : '#ddd',
  transition: 'background 0.2s',
}));

const SubmitButton = styled(StationContinueButton)({
  // In normal flow (last item in the flex column) so the layout fits one
  // screen with no scroll and nothing overlaps it.
  flexShrink: 0,
  width: 'auto',
  padding: '14px 48px',
  borderRadius: 50,
  whiteSpace: 'nowrap',
  '&:active': {
    transform: 'translateY(3px)',
  },
  '&:disabled': {
    filter: 'grayscale(0.6) brightness(0.85)',
    cursor: 'default',
  },
});


const ResultOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.72)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200,
  animation: `${fadeIn} 0.25s ease`,
  padding: '0 16px',
  gap: 24,
});

const SuccessBanner = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: 520,
  animation: `${popIn} 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)`,
  '& svg': { display: 'block', width: '100%', height: 'auto' },
});

const SuccessBannerText = styled('div')({
  position: 'absolute',
  top: '22%',
  bottom: '22%',
  left: '32%',
  right: '6%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  fontWeight: 900,
  color: '#EAD787',
  pointerEvents: 'none',
});

const SuccessBannerTitle = styled('div')({
  fontSize: 'clamp(22px, 6vw, 40px)',
  letterSpacing: '1.5px',
  lineHeight: 1.1,
});

const SuccessBannerSubtitle = styled('div')({
  fontSize: 'clamp(16px, 4.5vw, 28px)',
  letterSpacing: '1px',
  lineHeight: 1.2,
  marginTop: 6,
});

const SuccessContinueBtn = styled('button')({
  background: 'linear-gradient(180deg, #5cb85c 0%, #28a745 48%, #1e7e34 100%)',
  color: '#fff',
  border: '4px solid #155724',
  borderRadius: 16,
  padding: '14px 52px',
  fontSize: 18,
  fontWeight: 800,
  fontFamily: 'inherit',
  cursor: 'pointer',
  boxShadow: '0 5px 0 #0f3d18, 0 10px 20px rgba(0,0,0,0.3)',
  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  whiteSpace: 'nowrap',
  animation: `${popIn} 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both`,
  '&:active': {
    transform: 'translateY(4px)',
    boxShadow: '0 1px 0 #0f3d18',
  },
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

// ─── Component ───

interface RiddleStationProps {
  station: StationItemData;
  onComplete: (result: GameResult) => void;
  textColor?: string;
  /** Hint wiring (penalty + modal handled by PlayingPhase). */
  stationHintText?: string | null;
  stationHintImageUrl?: string | null;
  stationHintUsed?: boolean;
  onStationHintClick?: () => void;
  hintLabel?: string;
}

export default function RiddleStation({
  station,
  onComplete,
  textColor,
  stationHintText,
  stationHintImageUrl,
  onStationHintClick,
  hintLabel,
}: RiddleStationProps) {
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const settings = (station.settings || {}) as RiddleSettings;
  const clue = settings.clue || '';
  const answer = settings.answer || '';
  const maxScore = typeof settings.maxScore === 'number' ? settings.maxScore : 100;
  const unlimitedAttempts = settings.unlimitedAttempts === true;
  const failureMessage = settings.failureMessage || (isHebrewText(clue + answer) ? 'לא הצלחת הפעם. נסה שוב בפעם הבאה!' : 'Better luck next time!');
  const isHebrew = isHebrewText(clue + answer);
  const isRTL = isHebrewText(answer);
  const continueLabel = settings.continueButtonText?.trim() || (isHebrew ? 'המשך' : 'Continue');
  const checkLabel = isHebrew ? 'בדיקה' : 'Check';
  const customSuccessImage = settings.successImageUrl?.trim();

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
      if (!unlimitedAttempts && nextAttempt >= 3) {
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
  }, [phase, inputs, answer, attempt, maxScore, totalChars, startTime, onComplete, unlimitedAttempts]);

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

        {clue ? <ClueText style={textColor ? { color: textColor } : undefined}>{clue}</ClueText> : null}

        {settings.mediaUrl && settings.mediaType === 'image' && (
          <MediaSlot>
            <RiddleMediaImage
              src={settings.mediaUrl}
              alt=""
              onClick={() => setImageFullscreen(true)}
              onTouchStart={(e) => { if (e.touches.length >= 2) setImageFullscreen(true); }}
            />
            <ZoomBadge type="button" aria-label="Enlarge image" title="Enlarge image"
              onClick={() => setImageFullscreen(true)}>
              <ZoomGlassIcon zoomed={false} />
            </ZoomBadge>
          </MediaSlot>
        )}

        {settings.mediaUrl && settings.mediaType === 'video' && (() => {
          const source = resolveVideoSource(settings.mediaUrl);
          return (
            <MediaWrapper>
              {source.kind === 'iframe' ? (
                <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
                  <iframe
                    src={source.src}
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                    allowFullScreen
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                  />
                </div>
              ) : (
                <video src={source.src} controls autoPlay muted playsInline style={{ width: '100%', display: 'block', maxHeight: 260 }} />
              )}
            </MediaWrapper>
          );
        })()}

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
          {unlimitedAttempts ? (
            <span style={{ marginInlineStart: 4 }}>
              {isHebrew ? `ניסיון ${attempt + 1}` : `Attempt ${attempt + 1}`}
            </span>
          ) : (
            <>
              {[0, 1, 2].map((i) => (
                <AttemptDot key={i} used={String(i < attempt)} />
              ))}
              <span style={{ marginInlineStart: 4 }}>
                {isHebrew ? `ניסיון ${attempt + 1} מתוך 3` : `Attempt ${attempt + 1} of 3`}
              </span>
            </>
          )}
        </AttemptsRow>

        <WrongHint>
          {shaking ? (isHebrew ? '❌ לא נכון, נסו שוב' : '❌ Not quite — try again') : ' '}
        </WrongHint>

        {(stationHintText || stationHintImageUrl) && onStationHintClick && phase === 'playing' && (
          <InlineHintButton type="button" onClick={onStationHintClick}>
            💡 {hintLabel || (isHebrew ? 'רמז' : 'Hint')}
          </InlineHintButton>
        )}

        {phase !== 'success' && (
          <SubmitButton
            onClick={handleCheck}
            disabled={!allFilled || phase !== 'playing'}
          >
            {checkLabel}
          </SubmitButton>
        )}
      </Container>

      {imageFullscreen && settings.mediaUrl && settings.mediaType === 'image' && (
        <ImageZoomOverlay src={settings.mediaUrl} onClose={() => setImageFullscreen(false)} />
      )}

      {phase === 'success' && (
        <ResultOverlay>
          <SuccessBanner>
            {customSuccessImage ? (
              <img
                src={customSuccessImage}
                alt=""
                style={{ width: '100%', maxHeight: 360, objectFit: 'contain', display: 'block', borderRadius: 14 }}
              />
            ) : (
            <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 260">
              <defs>
                <linearGradient id="riddle-cupGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D7AA3C" />
                  <stop offset="25%" stopColor="#FCE082" />
                  <stop offset="50%" stopColor="#F9C03C" />
                  <stop offset="85%" stopColor="#E29826" />
                  <stop offset="100%" stopColor="#D7AA3C" />
                </linearGradient>
              </defs>

              <rect width="800" height="260" fill="none" />
              <rect x="30" y="30" width="740" height="200" rx="100" ry="100" fill="#D7AA3C" />
              <rect x="42" y="42" width="716" height="176" rx="88" ry="88" fill="#2A4384" />

              <g transform="translate(-15, 10)">
                {/* Left handle */}
                <path d="M142,75 C90,70 100,125 155,115" fill="none" stroke="#E29826" strokeWidth="14" strokeLinecap="round" />
                <path d="M142,75 C90,70 100,125 155,115" fill="none" stroke="#F9C03C" strokeWidth="8" strokeLinecap="round" />
                {/* Right handle */}
                <path d="M238,75 C290,70 280,125 225,115" fill="none" stroke="#E29826" strokeWidth="14" strokeLinecap="round" />
                <path d="M238,75 C290,70 280,125 225,115" fill="none" stroke="#F9C03C" strokeWidth="8" strokeLinecap="round" />
                {/* Base */}
                <path d="M145,170 L235,170 L235,185 L145,185 Z" fill="#684631" />
                <path d="M155,155 L225,155 L225,170 L155,170 Z" fill="#7A533A" />
                <path d="M172,160 L208,160 L208,166 L172,166 Z" fill="#F9C03C" />
                {/* Stem */}
                <path d="M175,115 L205,115 L198,155 L182,155 Z" fill="#E29826" />
                {/* Cup body */}
                <path d="M137,68 Q128,118 155,118 L225,118 Q252,118 243,68 Z" fill="url(#riddle-cupGrad)" />
                {/* Rim */}
                <ellipse cx="190" cy="65" rx="55" ry="14" fill="#D7AA3C" />
                <ellipse cx="190" cy="63" rx="48" ry="10" fill="#FCE082" />
                {/* Left sparkles */}
                <polygon points="90,105 115,80 110,75" fill="#F9C03C" />
                <polygon points="94,101 108,87 104,83 90,97" fill="#E29826" />
                <circle cx="115" cy="77" r="5" fill="#E63946" />
                <path d="M118,73 C125,60 105,55 115,45" fill="none" stroke="#2A82E4" strokeWidth="3" strokeLinecap="round" />
                <path d="M100,65 C105,55 90,50 95,40" fill="none" stroke="#E63946" strokeWidth="3" strokeLinecap="round" />
                <circle cx="128" cy="55" r="3.5" fill="#F9C03C" />
                <circle cx="85" cy="65" r="2.5" fill="#E63946" />
                <circle cx="100" cy="45" r="2" fill="#2A82E4" />
                {/* Right sparkles */}
                <path d="M260,80 A 15,15 0 0,1 290,80 Z" fill="#F9C03C" />
                <ellipse cx="275" cy="80" rx="15" ry="3" fill="#D7AA3C" />
                <path d="M265,80 Q260,95 270,110" fill="none" stroke="#E63946" strokeWidth="3" strokeLinecap="round" />
                <path d="M275,80 Q285,95 275,110" fill="none" stroke="#2A82E4" strokeWidth="3" strokeLinecap="round" />
                <path d="M285,80 Q295,90 285,105" fill="none" stroke="#E63946" strokeWidth="3" strokeLinecap="round" />
                <circle cx="288" cy="65" r="3" fill="#F9C03C" />
                <circle cx="270" cy="58" r="3" fill="#E63946" />
                <circle cx="295" cy="85" r="2" fill="#2A82E4" />
                {/* Sparkle stars */}
                <path d="M245,170 Q255,170 255,160 Q255,170 265,170 Q255,170 255,180 Q255,170 245,170 Z" fill="#FCE082" />
                <path d="M230,185 Q235,185 235,180 Q235,185 240,185 Q235,185 235,190 Q235,185 230,185 Z" fill="#FCE082" />
              </g>
            </svg>
              <SuccessBannerText dir={isHebrew ? 'rtl' : 'ltr'}>
                <SuccessBannerTitle>{isHebrew ? 'כל הכבוד' : 'Well done!'}</SuccessBannerTitle>
                <SuccessBannerSubtitle>
                  {isHebrew ? `קיבלת ${earnedScore} נקודות` : `You got ${earnedScore} points`}
                </SuccessBannerSubtitle>
              </SuccessBannerText>
            </>
            )}
          </SuccessBanner>
          <SuccessContinueBtn
            onClick={() => onComplete({ score: earnedScore, maxPossibleScore: maxScore, durationMs: Date.now() - startTime, hintUsed: false, attempts: attempt + 1 })}
          >
            {continueLabel}
          </SuccessContinueBtn>
        </ResultOverlay>
      )}

      {phase === 'failure' && (
        <ResultOverlay>
          <ResultCard>
            <ResultEmoji>😔</ResultEmoji>
            <ResultTitle>{isHebrew ? 'לא הצלחת' : 'Game Over'}</ResultTitle>
            <ResultMessage>{failureMessage}</ResultMessage>
            <div style={{ fontSize: 14, color: '#888', marginTop: 8 }}>
              {isHebrew ? `התשובה הנכונה: ` : `The answer was: `}
              <strong style={{ color: '#333' }}>{answer}</strong>
            </div>
          </ResultCard>
        </ResultOverlay>
      )}
    </>
  );
}
