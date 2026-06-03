import { styled, keyframes } from '@mui/material/styles';
import { PRIMARY, PRIMARY_LIGHT, ERROR, BORDER, TEXT_LIGHT, TEXT } from '../styled';

// ─── Colors (game-specific) ───
export const GREEN = '#28a745';
export const RED = '#e74c3c';
const CORRECT_BG = '#d4edda';
const CORRECT_TEXT = '#155724';
const INCORRECT_BG = '#fde8e8';
const INCORRECT_TEXT = '#721c24';
const PARTIAL_BG = '#fff3cd';
const PARTIAL_TEXT = '#856404';
const TIMEOUT_BG = '#f5f5f5';

// ─── Game Layout ───

export const GameLayout = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  paddingTop: 12,
});

export const GameCenteredLayout = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  textAlign: 'center',
  '@media (min-width: 768px)': {
    width: '100%',
    maxWidth: 720,
    marginInline: 'auto',
  },
});

// ─── Shared intro / phase header (mute aligned with trivia top bar) ───

const GAME_CHROME_BORDER = '#4a6572';

/** Full-width row at top of intro, countdown, or finish screens — place mute on the end. */
export const GameIntroHeaderBar = styled('div')({
  width: '100%',
  alignSelf: 'stretch',
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  padding: 'max(6px, env(safe-area-inset-top)) 12px 8px',
  flexShrink: 0,
  boxSizing: 'border-box',
});

/** Matches trivia/puzzle `TopBarMute` so music control stays in the header strip. */
export const GameHeaderMuteButton = styled('button')({
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: `2px solid ${GAME_CHROME_BORDER}`,
  background: 'rgba(255,255,255,0.85)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  padding: 0,
  lineHeight: 1,
  flexShrink: 0,
  '&:active': {
    transform: 'scale(0.9)',
  },
});

// ─── Game Header ───

export const GameHeader = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
});

export const GameHeaderLabel = styled('span')({
  fontWeight: 700,
  fontSize: 13,
  color: '#555',
});

export const GameHeaderScore = styled('span')({
  fontWeight: 700,
  fontSize: 13,
  color: PRIMARY,
});

// ─── Timer ───

export const TimerWrapper = styled('div')({
  textAlign: 'center',
  marginBottom: 8,
});

export const TimerText = styled('span')<{ critical?: boolean }>(({ critical }) => ({
  fontSize: 13,
  color: critical ? ERROR : TEXT_LIGHT,
}));

export const TimerBarTrack = styled('div')({
  width: '100%',
  height: 6,
  borderRadius: 3,
  background: '#eee',
  marginBottom: 12,
  overflow: 'hidden',
});

export const TimerBarFill = styled('div')<{ percent: number; critical?: boolean }>(({ percent, critical }) => ({
  width: `${percent}%`,
  height: '100%',
  background: critical ? RED : PRIMARY,
  borderRadius: 3,
  transition: 'width 1s linear, background 0.3s ease',
}));

export const TimerDisplay = styled('span')<{ critical?: boolean }>(({ critical }) => ({
  fontSize: 14,
  fontWeight: 700,
  color: critical ? RED : TEXT_LIGHT,
}));

// ─── Feedback Banner ───

type FeedbackVariant = 'correct' | 'incorrect' | 'partial' | 'timeout';

const feedbackStyles: Record<FeedbackVariant, { background: string; color: string }> = {
  correct: { background: CORRECT_BG, color: CORRECT_TEXT },
  incorrect: { background: INCORRECT_BG, color: INCORRECT_TEXT },
  partial: { background: PARTIAL_BG, color: PARTIAL_TEXT },
  timeout: { background: TIMEOUT_BG, color: TEXT_LIGHT },
};

export const FeedbackBanner = styled('div')<{ variant: FeedbackVariant }>(({ variant }) => ({
  padding: '8px 16px',
  borderRadius: 8,
  marginBottom: 8,
  textAlign: 'center',
  fontWeight: 700,
  fontSize: 14,
  ...feedbackStyles[variant],
}));

// Slightly larger variant used in TrueFalseGame
export const FeedbackBannerLg = styled(FeedbackBanner)({
  padding: '10px 16px',
  borderRadius: 10,
  marginBottom: 12,
  fontSize: 16,
});

// ─── Answer Option (shared by Trivia, Puzzle) ───

export const AnswerOptionRow = styled('div')<{
  borderColor: string;
  bgColor: string;
  clickable?: boolean;
}>(({ borderColor, bgColor, clickable }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 14px',
  border: `2px solid ${borderColor}`,
  borderRadius: 10,
  background: bgColor,
  cursor: clickable ? 'pointer' : 'default',
  transition: 'all 0.15s ease',
  userSelect: 'none',
}));

// Compact variant for PuzzleGame
export const AnswerOptionRowCompact = styled(AnswerOptionRow)({
  padding: '10px 14px',
});

export const AnswersList = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginBottom: 16,
});

export const AnswersListCompact = styled(AnswersList)({
  gap: 6,
  marginBottom: 12,
});

// ─── Checkbox Indicator (Trivia) ───

export const AnswerCheckbox = styled('span')<{
  borderColor: string;
  bgColor: string;
}>(({ borderColor, bgColor }) => ({
  minWidth: 22,
  height: 22,
  borderRadius: 4,
  border: `2px solid ${borderColor}`,
  background: bgColor,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  fontWeight: 700,
  color: '#fff',
  transition: 'all 0.15s ease',
}));

// ─── Radio Indicator (Puzzle) ───

export const AnswerRadio = styled('span')<{
  borderColor: string;
  bgColor: string;
}>(({ borderColor, bgColor }) => ({
  minWidth: 20,
  height: 20,
  borderRadius: '50%',
  border: `2px solid ${borderColor}`,
  background: bgColor,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 700,
  color: '#fff',
  transition: 'all 0.15s ease',
}));

// ─── Answer Text ───

export const AnswerText = styled('span')<{ textColor?: string }>(({ textColor }) => ({
  flex: 1,
  fontSize: 15,
  fontWeight: 500,
  color: textColor || '#333',
}));

export const AnswerTextCompact = styled(AnswerText)({
  fontSize: 14,
});

// ─── Explanation (Trivia post-check) ───

export const ExplanationBox = styled('div')<{ correct?: boolean }>(({ correct }) => ({
  marginTop: 4,
  marginInlineStart: 32,
  padding: '6px 10px',
  fontSize: 12,
  color: '#666',
  background: '#f5f5f5',
  borderRadius: 6,
  borderInlineStart: `3px solid ${correct ? GREEN : ERROR}`,
}));

// ─── Order Game Cards ───

export const OrderCardsList = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  marginBottom: 16,
});

export const OrderCard = styled('div')<{
  borderColor: string;
  bgColor: string;
  isDragging?: boolean;
  roundComplete?: boolean;
}>(({ borderColor, bgColor, isDragging, roundComplete }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 14px',
  border: `2px solid ${borderColor}`,
  borderRadius: 10,
  background: bgColor,
  cursor: roundComplete ? 'default' : 'grab',
  opacity: isDragging ? 0.5 : 1,
  transition: 'all 0.15s ease',
  userSelect: 'none',
  touchAction: 'manipulation',
}));

export const OrderCardNumber = styled('span')<{ status: 'neutral' | 'correct' | 'incorrect' }>(({ status }) => ({
  minWidth: 24,
  height: 24,
  borderRadius: '50%',
  background: status === 'correct' ? GREEN : status === 'incorrect' ? ERROR : '#e8e8ec',
  color: status !== 'neutral' ? '#fff' : TEXT_LIGHT,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
}));

export const OrderCardText = styled('span')({
  flex: 1,
  fontSize: 15,
  fontWeight: 500,
  color: '#333',
});

export const DragHandle = styled('span')({
  color: '#ccc',
  fontSize: 18,
});

// ─── Question / Statement Text ───

export const QuestionText = styled('p')<{ size?: number }>(({ size }) => ({
  fontWeight: 700,
  color: '#333',
  fontSize: size || 17,
  marginBottom: 4,
  textAlign: 'center',
  margin: 0,
}));

export const QuestionHint = styled('p')({
  fontSize: 13,
  color: TEXT_LIGHT,
  marginBottom: 8,
  textAlign: 'center',
  margin: '0 0 8px',
});

export const SelectPrompt = styled('p')({
  fontSize: 12,
  color: '#aaa',
  textAlign: 'center',
  marginBottom: 10,
  margin: '0 0 10px',
});

export const SelectPromptCompact = styled(SelectPrompt)({
  marginBottom: 8,
  margin: '0 0 8px',
});

export const RoundTitle = styled('p')({
  fontWeight: 600,
  color: '#333',
  marginBottom: 12,
  textAlign: 'center',
  margin: '0 0 12px',
});

// ─── Media Container ───

export const MediaContainer = styled('div')({
  textAlign: 'center',
  marginBottom: 12,
});

export const MediaImage = styled('img')({
  maxWidth: '100%',
  maxHeight: 180,
  borderRadius: 10,
  objectFit: 'contain',
});

export const MediaImageSmall = styled(MediaImage)({
  maxHeight: 140,
});

export const MediaImageLarge = styled(MediaImage)({
  maxHeight: 160,
});

// ─── True/False Buttons ───

export const TrueFalseButtonRow = styled('div')({
  display: 'flex',
  gap: 16,
  marginBottom: 16,
});

export const TrueFalseButton = styled('button')<{
  variant: 'true' | 'false';
  answered?: boolean;
  isCorrectAnswer?: boolean;
  wasSelected?: boolean;
}>(({ variant, answered, isCorrectAnswer, wasSelected }) => {
  const baseColor = variant === 'true' ? GREEN : RED;

  let borderColor = baseColor;
  let bg = variant === 'true' ? '#f0fff4' : '#fff5f5';
  let textColor = baseColor;
  let cursor = 'pointer';

  if (answered) {
    cursor = 'default';
    if (isCorrectAnswer) {
      borderColor = baseColor;
      bg = variant === 'true' ? CORRECT_BG : INCORRECT_BG;
      textColor = variant === 'true' ? CORRECT_TEXT : INCORRECT_TEXT;
    } else if (wasSelected) {
      borderColor = '#ddd';
      bg = INCORRECT_BG;
      textColor = INCORRECT_TEXT;
    } else {
      borderColor = '#ddd';
      bg = '#f8f8f8';
      textColor = '#ccc';
    }
  }

  return {
    flex: 1,
    padding: '18px 16px',
    fontSize: 20,
    fontWeight: 800,
    border: `3px solid ${borderColor}`,
    borderRadius: 14,
    background: bg,
    color: textColor,
    cursor,
    transition: 'all 0.2s ease',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'inherit',
  };
});

// ─── Statement text (TrueFalse) ───

export const StatementTextContainer = styled('div')({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px 20px',
  marginBottom: 16,
});

export const StatementText = styled('p')({
  fontSize: 20,
  fontWeight: 700,
  color: '#333',
  textAlign: 'center',
  lineHeight: 1.5,
  margin: 0,
});

// ─── Countdown (3-2-1) ───

export const CountdownContainer = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  textAlign: 'center',
});

export const CountdownLabel = styled('span')({
  fontSize: 18,
  fontWeight: 600,
  color: TEXT_LIGHT,
  marginBottom: 16,
});

export const CountdownNumber = styled('div')({
  fontSize: 80,
  fontWeight: 800,
  color: PRIMARY,
  animation: 'pulse 1s ease-in-out',
});

// ─── Puzzle ───

export const PuzzlePreviewContainer = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: 360,
  marginBottom: 20,
});

export const PuzzlePreviewImage = styled('img')({
  width: '100%',
  borderRadius: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
});

export const PuzzleCompletedImage = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: 300,
  marginBottom: 16,
});

export const PuzzleGridWrapper = styled('div')({
  position: 'relative',
  width: '100%',
  maxWidth: 320,
  margin: '0 auto 12px',
});

export const PuzzleFullImage = styled('img')({
  width: '100%',
  height: '100%',
  borderRadius: 10,
  display: 'block',
  objectFit: 'cover',
});

export const PuzzleGridOverlay = styled('div')<{ cols: number; rows: number }>(({ cols, rows }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'grid',
  gridTemplateColumns: `repeat(${cols}, 1fr)`,
  gridTemplateRows: `repeat(${rows}, 1fr)`,
  borderRadius: 10,
  overflow: 'hidden',
}));

export const PuzzlePiece = styled('div')<{ revealed?: boolean }>(({ revealed }) => ({
  background: revealed ? 'transparent' : PRIMARY,
  border: `0.5px solid ${revealed ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'}`,
  transition: 'all 0.6s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  color: 'rgba(255,255,255,0.4)',
  fontWeight: 700,
}));

export const PuzzleStatusBar = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
  padding: '0 4px',
});

export const PuzzleStatusLabel = styled('span')({
  fontWeight: 700,
  fontSize: 12,
  color: '#555',
});

export const PuzzleStatusValue = styled('span')({
  fontWeight: 700,
  fontSize: 12,
  color: PRIMARY,
});

export const PuzzleExtraInfo = styled('p')({
  fontSize: 13,
  color: TEXT_LIGHT,
  marginBottom: 4,
  margin: '0 0 4px',
});

// ─── Hint Button wrapper ───

export const HintButtonWrapper = styled('div')({
  textAlign: 'center',
  marginTop: 14,
  marginBottom: 14,
});

// ─── Modal Helpers ───

export const ModalButtonRow = styled('div')({
  display: 'flex',
  gap: 12,
  justifyContent: 'center',
});

/** Stacked full-width modal actions (hint dialogs) */
export const ModalButtonColumn = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: '100%',
  alignItems: 'stretch',
});

export const HintModalBulbWrap = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: 12,
});

/** Grey label above hint content (e.g. “Hint”) */
export const HintModalHeading = styled('p')({
  fontWeight: 600,
  fontSize: 15,
  color: TEXT_LIGHT,
  margin: '0 0 8px',
});

/** Hint copy — dark body text */
export const HintModalHintBody = styled('p')({
  margin: '0 0 20px',
  whiteSpace: 'pre-wrap',
  color: TEXT,
  fontSize: 16,
  lineHeight: 1.45,
});

export const ModalTitle = styled('p')({
  fontWeight: 600,
  color: '#333',
  fontSize: 16,
  marginBottom: 16,
  margin: '0 0 16px',
});

export const ModalBody = styled('p')({
  marginBottom: 16,
  whiteSpace: 'pre-wrap',
  color: TEXT_LIGHT,
  fontSize: 16,
  margin: '0 0 16px',
});

export const ModalBodySmall = styled(ModalBody)({
  marginBottom: 8,
  margin: '0 0 8px',
});

// ─── Confetti ───

export const ConfettiContainer = styled('div')({
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 100,
  overflow: 'hidden',
});

// ─── StoryModule: Finish Page ───

export const FinishScoreNumber = styled('div')({
  fontSize: 52,
  fontWeight: 800,
  color: PRIMARY,
  lineHeight: 1,
  marginBottom: 8,
});

export const FinishActionsColumn = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: '100%',
  maxWidth: 280,
});

// ─── StoryModule: Leaderboard ───

export const LeaderboardContainer = styled('div')({
  width: '100%',
  maxWidth: 360,
});

export const LeaderboardHeader = styled('div')({
  display: 'flex',
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 700,
  color: TEXT_LIGHT,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  borderBottom: `2px solid ${BORDER}`,
});

export const LeaderboardRow = styled('div')<{ highlighted?: boolean }>(({ highlighted }) => ({
  display: 'flex',
  padding: '10px 12px',
  fontSize: 15,
  borderBottom: '1px solid #f0f0f0',
  background: highlighted ? PRIMARY_LIGHT : 'transparent',
  borderRadius: highlighted ? 8 : 0,
  fontWeight: highlighted ? 700 : 400,
}));

export const LeaderboardRank = styled('span')<{ top3?: boolean }>(({ top3 }) => ({
  width: 36,
  color: top3 ? PRIMARY : TEXT_LIGHT,
  fontWeight: 700,
}));

export const LeaderboardName = styled('span')({
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const LeaderboardGroup = styled('span')({
  fontSize: 12,
  color: '#aaa',
  marginInlineStart: 6,
});

export const LeaderboardScore = styled('span')({
  width: 60,
  textAlign: 'end',
  fontWeight: 700,
  color: PRIMARY,
});

// ─── StoryModule: Summary ───

export const SummaryScoresList = styled('div')({
  marginBottom: 24,
  width: '100%',
  maxWidth: 320,
});

export const SummaryScoreRow = styled('div')({
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid #f0f0f0',
  fontSize: 14,
});

export const SummaryScoreValue = styled('span')({
  fontWeight: 700,
});

// ─── StoryModule: Playing Phase ───

export const PlayingContent = styled('div')({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  padding: '0 16px 16px',
});

export const StationSubtitle = styled('div')({
  fontSize: 12,
  color: TEXT_LIGHT,
  marginTop: 2,
});

// ─── StoryModule: Media Station ───
// Desktop sizing notes (QA Jun 2026):
//  - Mobile target stays 400px wide for phone column.
//  - At ≥768px the media (video/image/iframe) should fill a larger, centered
//    stage so it doesn't feel "lost in the middle." Width grows to ~min(820px,
//    70vw) and image height is unleashed to 70vh.

export const MediaStationWrapper = styled('div')({
  marginBottom: 24,
  width: '100%',
  maxWidth: 400,
  marginInline: 'auto',
  '@media (min-width: 768px)': {
    maxWidth: 'min(820px, 70vw)',
  },
  '@media (min-width: 1200px)': {
    maxWidth: 'min(960px, 60vw)',
  },
});

export const MediaStationVideo = styled('video')({
  width: '100%',
  border: '2px solid #fff',
  borderRadius: 12,
  '@media (min-width: 768px)': {
    // Keep video framed but more present on big screens.
    maxHeight: '70vh',
    background: '#000',
  },
});

export const MediaStationIframeWrapper = styled('div')({
  position: 'relative',
  width: '100%',
  paddingTop: '56.25%',
  borderRadius: 12,
  overflow: 'hidden',
  background: '#000',
});

export const MediaStationIframe = styled('iframe')({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  border: 0,
});

export const MediaStationImageWrapper = styled('div')({
  marginBottom: 24,
  textAlign: 'center',
});

export const MediaStationImage = styled('img')({
  maxWidth: '100%',
  maxHeight: 350,
  border: '2px solid #fff',
  borderRadius: 12,
  objectFit: 'contain',
  '@media (min-width: 768px)': {
    maxHeight: '70vh',
  },
});

// ─── Station Design (unified: purple window, white headline, white btn + purple text) ───

export const STATION_PURPLE = '#632e7d';
export const STATION_PURPLE_DARK = '#9248a3';

export const StationWindow = styled('div', {
  shouldForwardProp: (prop) => prop !== 'isDynamic',
})<{ isDynamic?: boolean }>(({ isDynamic }) => ({
  background: isDynamic ? 'transparent' : STATION_PURPLE,
  border: isDynamic ? 'transparent' :  `2px solid ${STATION_PURPLE_DARK}`,
  borderRadius: 16,
  padding: isDynamic ? '24px 0px' : '20px 24px',
  width: '100%',
  maxWidth: 400,
  marginInline: 'auto',
  // Desktop: the purple text panel grows so the message doesn't look stranded
  // on big screens. `isDynamic` (used by video/image wrappers) gets even more
  // room because its child is a media frame, not a paragraph.
  '@media (min-width: 768px)': {
    maxWidth: isDynamic ? 'min(820px, 70vw)' : 'min(640px, 70vw)',
    padding: isDynamic ? '32px 0px' : '28px 36px',
  },
}));

export const StationHeadline = styled('h2')({
  color: '#fff',
  fontWeight: 800,
  fontSize: 22,
  margin: '0 0 16px',
  textAlign: 'center',
  '@media (min-width: 768px)': {
    fontSize: 28,
  },
});

export const StationBodyText = styled('p')({
  color: '#fff',
  fontSize: 16,
  lineHeight: 1.7,
  margin: 0,
  whiteSpace: 'pre-wrap',
  '@media (min-width: 768px)': {
    fontSize: 19,
    lineHeight: 1.75,
  },
});

export const StationContinueButton = styled('button')({
  width: '100%',
  maxWidth: 280,
  padding: '14px 24px',
  fontSize: 18,
  fontWeight: 700,
  color: '#fff',
  background: 'linear-gradient(180deg, #5cb85c 0%, #28a745 48%, #1e7e34 100%)',
  border: '3px solid #155724',
  borderRadius: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 4px 0 #0f3d18',
  transition: 'transform 0.1s, box-shadow 0.1s',
  textAlign: 'center',
  unicodeBidi: 'plaintext',
  '&:active': {
    transform: 'translateY(3px)',
    boxShadow: '0 1px 0 #0f3d18',
  },
});

// ─── StoryModule: Popup ───

export const PopupImage = styled('img')({
  maxWidth: '100%',
  maxHeight: 300,
  borderRadius: 10,
  objectFit: 'contain',
});

export const PopupImageWrapper = styled('div')({
  marginBottom: 20,
  textAlign: 'center',
});

// ─── Media loading spinner (shown while images/videos preload) ───

const _spinAnim = keyframes`to { transform: rotate(360deg); }`;

export const GameLoadingSpinner = styled('div')({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 120,
  '&::after': {
    content: '""',
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '4px solid rgba(108,92,231,0.18)',
    borderTopColor: '#6c5ce7',
    animation: `${_spinAnim} 0.75s linear infinite`,
  },
});
