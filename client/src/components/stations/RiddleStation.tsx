import { useState, useRef, useEffect, useCallback } from 'react'; // useEffect kept for initial focus
import { createPortal } from 'react-dom';
import { styled, keyframes } from '@mui/material/styles';
import type { StationItemData } from '../../pages/StoryModulePage/types';
import type { GameResult } from '../games/types';
import { resolveVideoSource } from '../../utils/videoSource';
import { StationContinueButton } from '../games/styled';

// ─── Types ───

interface RiddleSettings {
  clue: string;
  answer: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  maxScore?: number;
  successMessage?: string;
  failureMessage?: string;
  continueButtonText?: string;
  successImageUrl?: string;
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
  // Bottom padding reserves a safety zone above the fixed SubmitButton so the
  // AttemptsRow / hint badge are never positioned behind it.
  padding: '32px 20px 160px',
  gap: 18,
  overflowY: 'auto',
  // Desktop: cap to a centered column so clue + image + letter boxes don't
  // stretch edge to edge of a wide monitor (QA Jun 2026 page 15 #17).
  '@media (min-width: 768px)': {
    width: 'min(840px, 90vw)',
    marginInline: 'auto',
    padding: '48px 24px 180px',
    gap: 24,
  },
});

const StationTitle = styled('h2')({
  fontSize: 26,
  fontWeight: 800,
  color: '#fff',
  WebkitTextStroke: '1.5px #000',
  paintOrder: 'stroke fill',
  margin: 0,
  marginBottom: 16,
  textAlign: 'center',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  paddingTop: 8,
  '@media (min-width: 768px)': {
    fontSize: 34,
    marginBottom: 24,
  },
});

const ClueText = styled('p')({
  fontSize: 22,
  fontWeight: 800,
  color: '#111',
  textAlign: 'center',
  margin: 0,
  lineHeight: 1.4,
  '@media (min-width: 768px)': {
    fontSize: 28,
    maxWidth: 'min(640px, 80vw)',
  },
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
  maxWidth: '100%',
  maxHeight: 260,
  objectFit: 'contain',
  cursor: 'zoom-in',
  '@media (min-width: 768px)': {
    maxHeight: 'min(60vh, 480px)',
  },
});

const ImageFullscreenOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.92)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // Sits above sticky session header (z 30) and the riddle's own success
  // overlay. Used together with createPortal so the backdrop reliably covers
  // the top icon row (QA Jun 2026 page 7).
  zIndex: 99999,
  cursor: 'zoom-out',
  padding: 16,
});

const ImageFullscreenImg = styled('img')({
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  borderRadius: 8,
  cursor: 'default',
});

const ImageFullscreenClose = styled('button')({
  position: 'absolute',
  top: 16,
  right: 16,
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  fontSize: 28,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1,
  '&:hover': {
    background: 'rgba(255,255,255,0.25)',
  },
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

const SubmitButton = styled(StationContinueButton)({
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 40,
  width: 'auto',
  padding: '14px 48px',
  borderRadius: 50,
  whiteSpace: 'nowrap',
  '&:active': {
    transform: 'translateX(-50%) translateY(3px)',
  },
  '&:disabled': {
    // Use filter instead of opacity so the button remains fully opaque and
    // doesn't reveal the AttemptDots / "ניסיון X מתוך 3" row sitting behind it.
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

const ResultScore = styled('div')({
  fontSize: 17,
  fontWeight: 700,
  color: '#6c5ce7',
});

// ─── Component ───

interface RiddleStationProps {
  station: StationItemData;
  onComplete: (result: GameResult) => void;
  textColor?: string;
}

export default function RiddleStation({
  station,
  onComplete,
  textColor,
}: RiddleStationProps) {
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const settings = (station.settings || {}) as RiddleSettings;
  const clue = settings.clue || '';
  const answer = settings.answer || '';
  const maxScore = typeof settings.maxScore === 'number' ? settings.maxScore : 100;
  const successMessage = settings.successMessage || (isHebrewText(clue + answer) ? 'כל הכבוד! ענית נכון!' : 'Correct! Well done!');
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

  // Close fullscreen image on Escape
  useEffect(() => {
    if (!imageFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImageFullscreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [imageFullscreen]);

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

        {clue ? <ClueText style={textColor ? { color: textColor } : undefined}>{clue}</ClueText> : null}

        {settings.mediaUrl && settings.mediaType === 'image' && (
          <MediaWrapper>
            <RiddleMediaImage
              src={settings.mediaUrl}
              alt=""
              onClick={() => setImageFullscreen(true)}
              onTouchStart={(e) => { if (e.touches.length >= 2) setImageFullscreen(true); }}
            />
          </MediaWrapper>
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
          {[0, 1, 2].map((i) => (
            <AttemptDot key={i} used={String(i < attempt)} />
          ))}
          <span style={{ marginInlineStart: 4 }}>
            {isHebrew ? `ניסיון ${attempt + 1} מתוך 3` : `Attempt ${attempt + 1} of 3`}
          </span>
        </AttemptsRow>
      </Container>

      {imageFullscreen && settings.mediaUrl && settings.mediaType === 'image' && createPortal(
        <ImageFullscreenOverlay onClick={() => setImageFullscreen(false)} role="dialog" aria-modal="true">
          <ImageFullscreenClose
            type="button"
            aria-label="Close"
            onClick={(e) => { e.stopPropagation(); setImageFullscreen(false); }}
          >
            ×
          </ImageFullscreenClose>
          <ImageFullscreenImg src={settings.mediaUrl} alt="" onClick={(e) => e.stopPropagation()} />
        </ImageFullscreenOverlay>,
        document.body
      )}

      {phase !== 'success' && (
        <SubmitButton
          onClick={handleCheck}
          disabled={!allFilled || phase !== 'playing'}
        >
          {checkLabel}
        </SubmitButton>
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
