/**
 * avatarQuiz — the avatar station with the conversation reversed: the
 * character asks, the participant answers in free text, the server judges,
 * and the character reacts *and teaches* before moving on.
 *
 * Shares all chrome and TTS with AvatarStation (see ./avatar/*). The parts
 * that are genuinely different live here: the question state machine, the
 * scoring, and the feedback card.
 *
 * The answer key never reaches this component — `idealAnswer`,
 * `acceptableKeywords` and `commonWrongAnswers` are stripped server-side
 * (activities.ts → publicStationSettings), and judging happens over
 * POST /api/avatar-quiz keyed by stationId + questionIndex.
 */
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { styled, keyframes } from '@mui/material/styles';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './AvatarQuizStation.i18n';
import { shuffleArray } from '../../utils/shuffleArray';
import { useModalBlur } from '../../utils/modalBlur';
import StationDescriptionPopup from './StationDescriptionPopup';
import type { StationItemData } from '../../pages/StoryModulePage/types';
import type { GameResult } from '../games/types';
import {
  type PreparedSpeech,
  fetchWithNetworkRetry,
  prepareSpeech,
  preloadVideoUrl,
  primeSpeech,
  speechText,
} from './avatar/speech';
import {
  Container,
  InputWrap,
  PopupBackdrop,
  PopupPanel,
  PopupTitleBar,
  PopupCloseButton,
  ScrollArea,
  MessageBubble,
  CharacterMessageRow,
  SpeakButton,
  StationTitle,
  StationHeader,
  StationDescriptionText,
  CharacterWindow,
  CharacterImage,
  CharacterVideo,
  SpeakingBubble,
  CharacterNameBadge,
  InfoButton,
  HistoryButton,
  HistoryCountBadge,
  ChatBar,
  ChatIconButton,
  ChatInput,
  FixedContinue,
  CHARACTER_WIDTH,
} from './avatar/styled';

// ─── Types ───

type Verdict = 'correct' | 'partial' | 'incorrect' | 'unrelated';
type Phase = 'intro' | 'asking' | 'answering' | 'evaluating' | 'feedback' | 'summary';

/** Only the public half of the question — the answer key stays on the server. */
interface PublicQuestion {
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  hint?: { text: string; imageUrl?: string; penalty?: number };
  points?: number;
  learnMoreUrl?: string;
  level?: 1 | 2 | 3;
}

interface AvatarQuizSettings {
  characterName?: string;
  characterImageUrl?: string;
  voiceType?: 'man' | 'woman';
  descriptionAsPopup?: boolean;
  reactionVideos?: { asking?: string; correct?: string; partial?: string; incorrect?: string };
  topic?: string;
  introText?: string;
  outroText?: string;
  questions?: PublicQuestion[];
  questionCount?: number;
  shuffleQuestions?: boolean;
  allowRetry?: boolean;
  allowSkip?: boolean;
  pointsPerQuestion?: number;
  autoAdvance?: boolean;
}

interface JudgeResponse {
  verdict: Verdict;
  scoreRatio: number;
  reaction: string;
  teaching: string;
  videoUrl?: string;
  source: 'gemini' | 'fallback';
}

interface AnsweredQuestion {
  questionIndex: number;
  question: string;
  userAnswer: string;
  verdict: Verdict;
  scoreRatio: number;
  pointsEarned: number;
  attempts: number;
  hintUsed: boolean;
  aiSource: 'gemini' | 'fallback';
  durationMs: number;
}

interface TranscriptEntry {
  role: 'user' | 'character';
  text: string;
}

interface SavedProgress {
  order: number[];
  currentIndex: number;
  totalEarned: number;
  transcript: TranscriptEntry[];
  answers: AnsweredQuestion[];
}

const DEFAULT_POINTS = 10;
const DEFAULT_HINT_PENALTY = 2;
/**
 * Safety net for TTS that never fires `onEnd` (iOS silent mode, blocked audio).
 *
 * Once the clip is loaded we know its exact length and arm the watchdog against
 * that (see `say`), so it only ever fires when playback has genuinely stalled.
 * The word estimate below is just the opening guess covering the fetch, and the
 * fallback for browser speech, which reports no duration.
 */
const SPEECH_WATCHDOG_FLOOR_MS = 8000;
const SPEECH_WATCHDOG_CEILING_MS = 30_000;
const MS_PER_SPOKEN_WORD = 450;
/** Slack added to a known clip length before the watchdog gives up on it. */
const SPEECH_WATCHDOG_SLACK_MS = 2500;

function speechWatchdogMs(words: number): number {
  return Math.min(
    SPEECH_WATCHDOG_CEILING_MS,
    Math.max(SPEECH_WATCHDOG_FLOOR_MS, words * MS_PER_SPOKEN_WORD + 3000)
  );
}

/** Last-resort unblock if a callback is swallowed entirely — never during speech. */
const FLOW_FAILSAFE_MS = SPEECH_WATCHDOG_CEILING_MS + 10_000;
const TTS_MAX_CHARS = 600;
/** Quiet gap after she finishes before she moves on — cancelled while typing. */
const PAUSE_BEFORE_NEXT_MS = 6000;
/** Minimum time any spoken line stays on screen, so it can be read even when
 *  audio is unavailable and playback "ends" instantly. */
const MIN_DWELL_MS = 2500;
const MAX_DWELL_MS = 9000;
const MS_PER_WORD = 320;

// ─── Quiz-only styled ───

const VERDICT_COLOR: Record<Verdict, string> = {
  correct: '#22c55e',
  partial: '#f59e0b',
  incorrect: '#ef4444',
  unrelated: '#ef4444',
};

/**
 * In-flow variant of the shared bubble.
 *
 * The original is absolutely positioned below the character and floats over
 * whatever follows — tolerable in AvatarStation, where it appears briefly
 * after a reply. Here the character is asking or teaching most of the time,
 * and the bubble covered ~65px of the chat bar, so the answer input couldn't
 * be tapped. Rendering it in normal flow pushes the chat bar down instead.
 */
const QuizSpeakingBubble = styled(SpeakingBubble)({
  position: 'relative',
  top: 'auto',
  insetInlineStart: 'auto',
  insetInlineEnd: 'auto',
  width: '100%',
  maxWidth: CHARACTER_WIDTH,
  // Container uses gap: 28 — pull the bubble back toward the figure it belongs to.
  marginTop: -14,
  '@media (min-width: 768px)': { maxWidth: 380 },
});

/**
 * Scrollable variant of the shared Container.
 *
 * The page root is `height: 100dvh; overflow: hidden`, so this column was
 * clipped rather than scrolled: on shorter viewports its 140px bottom padding
 * fell off-screen and the chat bar ended up underneath the fixed action button
 * (measured: 28px overlap at 393x600, 87px and fully hidden at 430x560).
 */
const QuizContainer = styled(Container)({
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
});

/** Capped so the figure can't push the answer input off a short screen. */
const QuizCharacterImage = styled(CharacterImage)({
  maxHeight: 'min(42vh, 340px)',
  objectFit: 'cover',
});

const QuestionMedia = styled('img')({
  width: '100%',
  maxHeight: 'min(30vh, 220px)',
  objectFit: 'contain',
  borderRadius: 12,
  display: 'block',
  marginInline: 'auto',
  background: 'rgba(255,255,255,0.6)',
});

const cardIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

/**
 * The verdict now rides inside the speech bubble rather than in a second card
 * below it — the old layout printed her reaction twice, once as speech and
 * once as feedback.
 */
const VerdictRow = styled('div')<{ variant: Verdict }>(({ variant }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 15,
  fontWeight: 800,
  color: VERDICT_COLOR[variant],
  marginBottom: 8,
  paddingBottom: 8,
  borderBottom: `1px solid ${VERDICT_COLOR[variant]}33`,
  animation: `${cardIn} 0.2s ease-out`,
}));

const VerdictScore = styled('span')<{ variant: Verdict }>(({ variant }) => ({
  marginInlineStart: 'auto',
  background: `${VERDICT_COLOR[variant]}1f`,
  color: VERDICT_COLOR[variant],
  border: `1px solid ${VERDICT_COLOR[variant]}59`,
  borderRadius: 999,
  padding: '2px 10px',
  fontSize: 13,
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  direction: 'ltr',
}));

const VerdictIcon = styled('span')<{ variant: Verdict }>(({ variant }) => ({
  width: 24,
  height: 24,
  borderRadius: '50%',
  background: VERDICT_COLOR[variant],
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 15,
  fontWeight: 900,
  flexShrink: 0,
}));

const TeachingText = styled('p')({
  margin: 0,
  fontSize: 14.5,
  lineHeight: 1.5,
  fontWeight: 500,
  color: '#1a1a2e',
});

const LearnMoreLink = styled('a')({
  fontSize: 13.5,
  fontWeight: 700,
  color: '#6c5ce7',
  textDecoration: 'underline',
});

const RetryRow = styled('div')({
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  flexWrap: 'wrap',
});

const SmallButton = styled('button')<{ tone?: 'primary' | 'ghost' }>(({ tone }) => ({
  appearance: 'none',
  border: tone === 'ghost' ? '1.5px solid #cfd5e2' : 'none',
  background: tone === 'ghost' ? 'transparent' : '#6c5ce7',
  color: tone === 'ghost' ? '#4a4f66' : '#fff',
  fontFamily: 'inherit',
  fontSize: 13.5,
  fontWeight: 800,
  padding: '8px 14px',
  borderRadius: 999,
  cursor: 'pointer',
  '&:active': { transform: 'translateY(1px)' },
}));

const InlineHintButton = styled('button')({
  appearance: 'none',
  border: '1.5px solid rgba(255,255,255,0.75)',
  background: 'rgba(0,0,0,0.45)',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: 13.5,
  fontWeight: 800,
  padding: '8px 16px',
  borderRadius: 999,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  '&:active': { transform: 'translateY(1px)' },
  '&:disabled': { opacity: 0.55, cursor: 'default' },
});

const ActionRow = styled('div')({
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  justifyContent: 'center',
  flexWrap: 'wrap',
  width: '100%',
});

const ThinkingDots = styled('span')({
  display: 'inline-flex',
  gap: 4,
  marginInlineStart: 6,
  '& > i': {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#6c5ce7',
    display: 'inline-block',
    animation: 'avatarQuizBlink 1.2s infinite ease-in-out',
  },
  '& > i:nth-of-type(2)': { animationDelay: '0.18s' },
  '& > i:nth-of-type(3)': { animationDelay: '0.36s' },
  '@keyframes avatarQuizBlink': {
    '0%, 80%, 100%': { opacity: 0.25 },
    '40%': { opacity: 1 },
  },
});

const HintModalCard = styled('div')({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 'calc(100% - 40px)',
  maxWidth: 360,
  background: '#fff',
  borderRadius: 18,
  padding: 18,
  zIndex: 60,
  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  textAlign: 'center',
});

const HintModalImage = styled('img')({
  width: '100%',
  maxHeight: 240,
  objectFit: 'contain',
  borderRadius: 12,
});

// ─── Helpers ───

async function judgeAnswer(body: {
  stationId: string;
  questionIndex: number;
  answer: string;
  attempt: number;
  history: TranscriptEntry[];
}): Promise<JudgeResponse | null> {
  try {
    const res = await fetchWithNetworkRetry('/api/avatar-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    // 429: one retry after 2s, then give up — never block progress.
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000));
      const retry = await fetchWithNetworkRetry('/api/avatar-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!retry.ok) return null;
      return (await retry.json()) as JudgeResponse;
    }
    if (!res.ok) return null;
    return (await res.json()) as JudgeResponse;
  } catch {
    return null;
  }
}

// ─── Component ───

interface AvatarQuizStationProps {
  station: StationItemData;
  onComplete: (result: GameResult) => void;
  textColor?: string;
  sessionStorageKey?: string;
}

export default function AvatarQuizStation({
  station,
  onComplete,
  textColor,
  sessionStorageKey,
}: AvatarQuizStationProps) {
  const t = useTranslations(texts);
  const settings = (station.settings || {}) as AvatarQuizSettings;
  const allQuestions = useMemo(
    () => (settings.questions || []).filter((q) => q?.text?.trim()),
    [settings.questions]
  );
  const descriptionAsPopup = !!settings.descriptionAsPopup && !!station.description;
  const pointsPerQuestion = settings.pointsPerQuestion ?? DEFAULT_POINTS;
  const voiceType = settings.voiceType || 'man';
  // The character's own gender is known from the chosen voice, so self-reference
  // is gendered. Only how she addresses the *participant* stays neutral — we
  // don't know their gender.
  const thinkingLabel = voiceType === 'woman' ? t.thinkingFemale : t.thinkingMale;

  // Question order is decided once and persisted, so a refresh can't reshuffle
  // the participant into a different quiz mid-station.
  const [saved] = useState<SavedProgress | null>(() => {
    if (typeof window === 'undefined' || !sessionStorageKey) return null;
    try {
      const raw = window.sessionStorage.getItem(sessionStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SavedProgress;
      if (!Array.isArray(parsed?.order) || typeof parsed?.currentIndex !== 'number') return null;
      return parsed;
    } catch {
      return null;
    }
  });

  const [order] = useState<number[]>(() => {
    if (saved?.order?.length) {
      // Drop indices that no longer exist (admin edited the bank mid-session).
      const valid = saved.order.filter((i) => i >= 0 && i < allQuestions.length);
      if (valid.length > 0) return valid;
    }
    const indices = allQuestions.map((_, i) => i);
    const ordered = settings.shuffleQuestions ? shuffleArray(indices) : indices;
    const limit = settings.questionCount && settings.questionCount > 0
      ? Math.min(settings.questionCount, ordered.length)
      : ordered.length;
    return ordered.slice(0, limit);
  });

  /**
   * A stored entry alone is not a resume. Progress is written the moment the
   * first question is asked, so after one visit `saved` was always truthy and
   * the opening line was skipped for good. Only treat it as resuming when the
   * participant actually got somewhere.
   */
  const resuming =
    saved != null && (saved.currentIndex > 0 || (saved.answers?.length ?? 0) > 0);

  const [phase, setPhase] = useState<Phase>(resuming ? 'asking' : 'intro');
  const [currentIndex, setCurrentIndex] = useState(resuming ? saved!.currentIndex : 0);
  const [totalEarned, setTotalEarned] = useState(resuming ? saved!.totalEarned : 0);
  const [answers, setAnswers] = useState<AnsweredQuestion[]>(resuming ? saved!.answers : []);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(resuming ? saved!.transcript : []);

  const [draft, setDraft] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [hintUsedThisQuestion, setHintUsedThisQuestion] = useState(false);
  const [usedAnyHint, setUsedAnyHint] = useState(false);
  const [judgement, setJudgement] = useState<JudgeResponse | null>(null);
  /**
   * What this question was actually worth, normalised to 100 for display.
   * Taken from the points really awarded, so the retry halving and any hint
   * penalty are visible rather than hidden behind a raw verdict.
   */
  const [questionScore, setQuestionScore] = useState<{ earned: number; max: number } | null>(null);
  const [retryOffered, setRetryOffered] = useState(false);
  /** True once she has finished speaking — starts the quiet gap before moving on. */
  const [speechSettled, setSpeechSettled] = useState(false);

  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [descriptionPopupOpen, setDescriptionPopupOpen] = useState(descriptionAsPopup);
  const [hintWarningOpen, setHintWarningOpen] = useState(false);
  const [hintTextOpen, setHintTextOpen] = useState(false);
  /** Set once a follow-up comes back unanswered — the input is then pointless. */
  const [followUpUnavailable, setFollowUpUnavailable] = useState(false);
  useModalBlur(popupOpen || hintWarningOpen || hintTextOpen);

  const startTimeRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const speechRef = useRef<PreparedSpeech | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const dwellRef = useRef<number | null>(null);
  const speakTokenRef = useRef(0);
  const isMountedRef = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const questionIndex = order[currentIndex];
  const question: PublicQuestion | undefined = allQuestions[questionIndex];
  const totalQuestions = order.length;
  const isLastQuestion = currentIndex >= totalQuestions - 1;

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const stopSpeaking = useCallback(() => {
    speakTokenRef.current += 1;
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    if (dwellRef.current !== null) {
      window.clearTimeout(dwellRef.current);
      dwellRef.current = null;
    }
    speechRef.current?.stop();
    speechRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveVideoUrl(null);
    setSpeakingId(null);
  }, []);

  useEffect(() => () => stopSpeaking(), [stopSpeaking]);

  /**
   * Show text first, then speak. The bubble is never gated on TTS — if audio
   * is blocked (iOS silent mode) the participant still reads everything, and
   * the watchdog releases `onDone` so the flow can't stall.
   */
  const say = useCallback(
    async (text: string, videoUrl: string | undefined, onDone?: () => void) => {
      stopSpeaking();
      const token = ++speakTokenRef.current;
      const id = Date.now();
      setBubbleText(text);
      setSpeakingId(id);

      // A line must stay on screen long enough to read, independently of the
      // audio. Without this the opening line vanished instantly: with TTS
      // unavailable the browser fallback fires `onEnd` right away, so the
      // bubble was replaced by the first question before anyone could read it.
      const shownAt = Date.now();
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      // Word-count guess at reading time. Used only while we don't know the
      // real clip length — once audio is loaded its duration governs the pacing
      // instead (see below), which is what the participant is actually hearing.
      let minDwellMs = Math.min(MAX_DWELL_MS, Math.max(MIN_DWELL_MS, words * MS_PER_WORD));

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (!isMountedRef.current || speakTokenRef.current !== token) return;
        setActiveVideoUrl(null);
        setSpeakingId(null);
        onDone?.();
      };

      const release = () => {
        if (watchdogRef.current !== null) {
          window.clearTimeout(watchdogRef.current);
          watchdogRef.current = null;
        }
        if (!isMountedRef.current || speakTokenRef.current !== token) return;
        const remaining = minDwellMs - (Date.now() - shownAt);
        if (remaining <= 0) {
          finish();
          return;
        }
        dwellRef.current = window.setTimeout(finish, remaining);
      };

      watchdogRef.current = window.setTimeout(release, speechWatchdogMs(words));

      let speech: PreparedSpeech;
      try {
        const [s] = await Promise.all([
          prepareSpeech(speechText(text).slice(0, TTS_MAX_CHARS), voiceType),
          videoUrl ? preloadVideoUrl(videoUrl) : Promise.resolve(),
        ]);
        speech = s;
      } catch {
        return; // watchdog still releases
      }

      if (!isMountedRef.current || speakTokenRef.current !== token) {
        speech.stop();
        return;
      }

      // Real clip length beats every estimate: re-arm the watchdog against it,
      // and drop the reading-time floor — the audio itself is now the pacing,
      // so a short clip no longer sits on screen waiting out a word count.
      if (speech.durationMs) {
        minDwellMs = 0;
        if (watchdogRef.current !== null) {
          window.clearTimeout(watchdogRef.current);
          watchdogRef.current = window.setTimeout(
            release,
            speech.durationMs + SPEECH_WATCHDOG_SLACK_MS
          );
        }
      }

      if (videoUrl) setActiveVideoUrl(videoUrl);
      speechRef.current = speech;
      speech.play(() => {
        if (speechRef.current === speech) speechRef.current = null;
        release();
      });
    },
    [stopSpeaking, voiceType]
  );

  // Persist after every settled step so a refresh resumes at the same question.
  useEffect(() => {
    if (typeof window === 'undefined' || !sessionStorageKey) return;
    if (phase === 'intro' || phase === 'summary') return;
    try {
      const payload: SavedProgress = { order, currentIndex, totalEarned, transcript, answers };
      window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(payload));
    } catch {
      /* best effort */
    }
  }, [sessionStorageKey, order, currentIndex, totalEarned, transcript, answers, phase]);

  useEffect(() => {
    if (!popupOpen) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [popupOpen, transcript.length]);

  /** Append a character line, skipping an immediate repeat of the same text. */
  const appendCharacterLine = useCallback((text: string) => {
    setTranscript((prev) =>
      prev[prev.length - 1]?.text === text ? prev : [...prev, { role: 'character', text }]
    );
  }, []);

  const askCurrentQuestion = useCallback(() => {
    if (!question) return;
    questionStartRef.current = Date.now();
    setAttempt(0);
    setDraft('');
    setJudgement(null);
    setQuestionScore(null);
    setRetryOffered(false);
    setHintUsedThisQuestion(false);
    setSpeechSettled(false);
    setPhase('asking');
    appendCharacterLine(question.text);
    void say(question.text, settings.reactionVideos?.asking, () => setPhase('answering'));
  }, [question, say, settings.reactionVideos?.asking, appendCharacterLine]);

  // Intro line, first visit only. A resumed session skips straight to the
  // question it left off on.
  //
  // Gated on `introDone` state rather than a ref: a ref survives React's
  // StrictMode remount, and the remount's cleanup calls `stopSpeaking()`,
  // which bumps the speech token so the in-flight `say` never fires its
  // callback. The old ref guard then blocked the retry, leaving the station
  // parked on the intro with no input — forever. State re-runs cleanly, and
  // the failsafe below means a swallowed callback can never strand it again.
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    if (introDone) return;
    if (allQuestions.length === 0 || totalQuestions === 0) return;
    const intro = settings.introText?.trim();
    if (resuming || !intro) {
      setIntroDone(true);
      return;
    }
    appendCharacterLine(intro);
    void say(intro, undefined, () => setIntroDone(true));
    const failsafe = window.setTimeout(
      () => setIntroDone(true),
      FLOW_FAILSAFE_MS,
    );
    return () => window.clearTimeout(failsafe);
  }, [introDone, allQuestions.length, totalQuestions, resuming, settings.introText, say, appendCharacterLine]);

  const questionPoints = question?.points ?? pointsPerQuestion;
  const hintPenalty = question?.hint?.penalty ?? DEFAULT_HINT_PENALTY;

  const recordAnswer = useCallback(
    (userAnswer: string, result: JudgeResponse, attemptUsed: number, hintUsed: boolean) => {
      let earned = Math.round(questionPoints * result.scoreRatio);
      if (attemptUsed === 1) earned = Math.floor(earned / 2);
      if (hintUsed) earned = Math.max(0, earned - hintPenalty);
      setQuestionScore({ earned, max: questionPoints });
      setTotalEarned((prev) => prev + earned);
      setAnswers((prev) => [
        ...prev,
        {
          questionIndex,
          question: question?.text || '',
          userAnswer,
          verdict: result.verdict,
          scoreRatio: result.scoreRatio,
          pointsEarned: earned,
          attempts: attemptUsed + 1,
          hintUsed,
          aiSource: result.source,
          durationMs: Date.now() - questionStartRef.current,
        },
      ]);
    },
    [questionPoints, hintPenalty, questionIndex, question?.text]
  );

  /**
   * Free-form follow-up once the question is already graded. Never re-scores:
   * the first reply to each question is final, so this is conversation only.
   */
  const handleFollowUp = async (message: string) => {
    setPhase('evaluating');
    setSpeechSettled(false);
    setTranscript((prev) => [...prev, { role: 'user', text: message }]);
    try {
      const res = await fetchWithNetworkRetry('/api/avatar-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stationId: station._id,
          questionIndex,
          mode: 'followup',
          message,
          history: transcript.slice(-6),
        }),
      });
      const data = res.ok
        ? ((await res.json()) as { reply?: string; source?: 'gemini' | 'fallback' })
        : null;
      if (!isMountedRef.current) return;
      setPhase('summary');

      // `source: 'fallback'` means no AI answered — there is no offline way to
      // respond to an open question, so whatever came back is canned. Say so
      // once and take the box away rather than let her parrot content.
      if (!data || data.source !== 'gemini') {
        setFollowUpUnavailable(true);
        appendCharacterLine(t.followUpUnavailable);
        void say(t.followUpUnavailable, undefined, () => setSpeechSettled(true));
        return;
      }

      const reply = data.reply?.trim();
      if (!reply) return;
      appendCharacterLine(reply);
      void say(reply, undefined, () => setSpeechSettled(true));
    } catch {
      if (isMountedRef.current) setPhase('summary');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || phase === 'evaluating') return;
    primeSpeech();
    stopSpeaking();
    setBubbleText(null);
    setDraft('');

    // Only after the last question: open conversation, never re-scored.
    if (phase === 'summary') {
      await handleFollowUp(text);
      return;
    }

    const answer = text;
    setPhase('evaluating');
    setSpeechSettled(false);
    setTranscript((prev) => [...prev, { role: 'user', text: answer }]);

    const historySnapshot = transcript.slice(-6);
    const result = await judgeAnswer({
      stationId: station._id,
      questionIndex,
      answer,
      attempt,
      history: historySnapshot,
    });
    if (!isMountedRef.current) return;

    // Network/limiter failure: the station must never dead-end. Treat it as an
    // unscored pass and still show the character's teaching point.
    const settled: JudgeResponse = result || {
      verdict: 'unrelated',
      scoreRatio: 0,
      reaction: '',
      teaching: '',
      source: 'fallback',
    };

    const canRetry =
      settings.allowRetry === true &&
      attempt === 0 &&
      settled.verdict === 'incorrect';

    setJudgement(settled);
    setPhase('feedback');
    setRetryOffered(canRetry);

    // While a second attempt is on the table the teaching point is withheld:
    // saying it now hands over the answer and makes the retry pointless. It is
    // revealed once the attempt is final — on the retry's result, or when the
    // participant declines (see handleDeclineRetry).
    const spoken = canRetry
      ? settled.reaction
      : [settled.reaction, settled.teaching].filter(Boolean).join(' ');
    if (spoken) appendCharacterLine(spoken);

    if (!canRetry) {
      recordAnswer(answer, settled, attempt, hintUsedThisQuestion);
    }

    if (spoken) {
      // `speechSettled` starts the quiet gap before she moves on; the pause
      // effect owns advancing so typing can cancel it.
      void say(spoken, settled.videoUrl, () => setSpeechSettled(true));
    } else {
      setSpeechSettled(true);
    }
  };

  const advance = useCallback(() => {
    stopSpeaking();
    setBubbleText(null);
    setSpeechSettled(false);
    if (isLastQuestion) {
      const outro = settings.outroText?.trim();
      setPhase('summary');
      if (outro) void say(outro, undefined);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
  }, [isLastQuestion, settings.outroText, say, stopSpeaking]);

  /**
   * She moves on by herself after a quiet gap — there is no "next question"
   * button. Typing cancels it (the effect re-runs with a non-empty draft and
   * clears the timer), and clearing the box starts the gap again, so a
   * participant mid-thought is never cut off.
   */
  useEffect(() => {
    if (phase !== 'feedback' || retryOffered || !speechSettled) return;
    if (draft.trim()) return;
    const id = window.setTimeout(() => advance(), PAUSE_BEFORE_NEXT_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, retryOffered, speechSettled, draft]);

  // Single owner of "ask the current question" — both the first question and
  // every advance route through here, so a resumed session can't double-ask.
  const askedIndexRef = useRef<number | null>(null);
  useEffect(() => {
    if (!introDone) return;
    if (askedIndexRef.current === currentIndex) return;
    askedIndexRef.current = currentIndex;
    askCurrentQuestion();
    // Same StrictMode hazard as the intro: clearing the guard lets the remount
    // re-ask (the transcript dedupes), and the failsafe releases the input if
    // the question's speech callback is swallowed.
    const failsafe = window.setTimeout(
      () => setPhase((p) => (p === 'asking' ? 'answering' : p)),
      FLOW_FAILSAFE_MS
    );
    return () => {
      askedIndexRef.current = null;
      window.clearTimeout(failsafe);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, introDone]);

  const handleRetry = () => {
    setJudgement(null);
    setQuestionScore(null);
    setRetryOffered(false);
    setSpeechSettled(false);
    setAttempt(1);
    setPhase('answering');
    stopSpeaking();
    setBubbleText(null);
  };

  const handleDeclineRetry = () => {
    // Keep the incorrect verdict on the record rather than dropping the question,
    // then pay out the lesson that was held back while the retry was offered —
    // skipping straight to the next question would teach them nothing.
    const lastUserAnswer = [...transcript].reverse().find((e) => e.role === 'user')?.text || '';
    if (judgement) recordAnswer(lastUserAnswer, judgement, attempt, hintUsedThisQuestion);
    setRetryOffered(false);
    const teaching = judgement?.teaching?.trim();
    if (!teaching) {
      advance();
      return;
    }
    appendCharacterLine(teaching);
    void say(teaching, undefined, () => setSpeechSettled(true));
  };

  const handleSkip = () => {
    setAnswers((prev) => [
      ...prev,
      {
        questionIndex,
        question: question?.text || '',
        userAnswer: '',
        verdict: 'unrelated',
        scoreRatio: 0,
        pointsEarned: 0,
        attempts: 0,
        hintUsed: hintUsedThisQuestion,
        aiSource: 'fallback',
        durationMs: Date.now() - questionStartRef.current,
      },
    ]);
    advance();
  };

  const handleFinish = () => {
    stopSpeaking();
    if (typeof window !== 'undefined' && sessionStorageKey) {
      try { window.sessionStorage.removeItem(sessionStorageKey); } catch { /* noop */ }
    }
    const maxPossibleScore = order.reduce(
      (sum, i) => sum + (allQuestions[i]?.points ?? pointsPerQuestion),
      0
    );
    const correctCount = answers.filter((a) => a.verdict === 'correct').length;
    const partialCount = answers.filter((a) => a.verdict === 'partial').length;
    const incorrectCount = answers.length - correctCount - partialCount;
    onComplete({
      score: totalEarned,
      maxPossibleScore,
      durationMs: Date.now() - startTimeRef.current,
      hintUsed: usedAnyHint,
      attempts: answers.reduce((sum, a) => sum + a.attempts, 0),
      metadata: {
        stationType: 'avatarQuiz',
        ...(settings.topic?.trim() ? { topic: settings.topic.trim() } : {}),
        correctCount,
        partialCount,
        incorrectCount,
        answers,
      },
    });
  };

  const confirmHint = () => {
    setHintWarningOpen(false);
    setHintUsedThisQuestion(true);
    setUsedAnyHint(true);
    setHintTextOpen(true);
  };

  // ─── Render ───

  if (allQuestions.length === 0 || totalQuestions === 0) {
    return (
      <Container>
        <StationHeader>
          <StationTitle style={textColor ? { color: textColor } : undefined}>{station.name}</StationTitle>
          <StationDescriptionText style={textColor ? { color: textColor } : undefined}>
            {t.noQuestions}
          </StationDescriptionText>
        </StationHeader>
        <FixedContinue onClick={handleFinish}>{t.finish}</FixedContinue>
      </Container>
    );
  }

  const verdictLabel = (v: Verdict) =>
    v === 'correct' ? t.verdictCorrect
    : v === 'partial' ? t.verdictPartial
    : v === 'incorrect' ? t.verdictIncorrect
    : t.verdictUnrelated;

  const verdictGlyph = (v: Verdict) => (v === 'correct' ? '✓' : v === 'partial' ? '~' : '✗');

  const answeredVerdicts = new Map(answers.map((a) => [a.questionIndex, a.verdict]));
  void answeredVerdicts;

  // Live through `feedback` too: that is where follow-up questions happen.
  // Between questions the character just gives her feedback and moves on; the
  // input only comes back at the end, once every question has been answered.
  const showChat =
    phase === 'asking' || phase === 'answering' || phase === 'evaluating' ||
    (phase === 'summary' && !followUpUnavailable);
  const canSend = draft.trim().length > 0 && phase !== 'evaluating';

  return (
    <QuizContainer>
      <StationHeader>
        <StationTitle style={textColor ? { color: textColor } : undefined}>{station.name}</StationTitle>
        {station.description && !descriptionAsPopup && (
          <StationDescriptionText style={textColor ? { color: textColor } : undefined}>
            {station.description}
          </StationDescriptionText>
        )}
      </StationHeader>

      <CharacterWindow>
        {activeVideoUrl ? (
          <CharacterVideo key={activeVideoUrl} src={activeVideoUrl} autoPlay loop muted playsInline />
        ) : settings.characterImageUrl ? (
          <QuizCharacterImage src={settings.characterImageUrl} alt={settings.characterName || ''} />
        ) : null}
        {settings.characterName && <CharacterNameBadge>{settings.characterName}</CharacterNameBadge>}
        {descriptionAsPopup && (
          <InfoButton type="button" aria-label="show description" onClick={() => setDescriptionPopupOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </InfoButton>
        )}
        {transcript.length > 0 && (
          <HistoryButton type="button" aria-label={t.openHistory} onClick={() => setPopupOpen(true)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <HistoryCountBadge>{transcript.length}</HistoryCountBadge>
          </HistoryButton>
        )}
      </CharacterWindow>

      {phase === 'evaluating' ? (
        <QuizSpeakingBubble>
          {thinkingLabel}
          <ThinkingDots aria-hidden><i /><i /><i /></ThinkingDots>
        </QuizSpeakingBubble>
      ) : bubbleText ? (
        <QuizSpeakingBubble>
          {/* Verdict rides in the bubble; there is no second feedback card. */}
          {phase === 'feedback' && judgement && (
            <VerdictRow variant={judgement.verdict}>
              <VerdictIcon variant={judgement.verdict}>{verdictGlyph(judgement.verdict)}</VerdictIcon>
              {verdictLabel(judgement.verdict)}
              {questionScore && questionScore.max > 0 && (
                <VerdictScore variant={judgement.verdict}>
                  {Math.round((questionScore.earned / questionScore.max) * 100)}/100
                </VerdictScore>
              )}
            </VerdictRow>
          )}
          {bubbleText}
          {phase === 'feedback' && !retryOffered && question?.learnMoreUrl && (
            <div style={{ marginTop: 8 }}>
              <LearnMoreLink href={question.learnMoreUrl} target="_blank" rel="noopener noreferrer">
                {t.learnMore}
              </LearnMoreLink>
            </div>
          )}
          {retryOffered && (
            <RetryRow style={{ marginTop: 10 }}>
              <TeachingText style={{ fontWeight: 700 }}>{t.tryAgain}</TeachingText>
              <SmallButton type="button" onClick={handleRetry}>{t.retryYes}</SmallButton>
              <SmallButton type="button" tone="ghost" onClick={handleDeclineRetry}>{t.retryNo}</SmallButton>
            </RetryRow>
          )}
        </QuizSpeakingBubble>
      ) : null}

      {question?.mediaUrl && question.mediaType !== 'video' && phase !== 'summary' && (
        <QuestionMedia src={question.mediaUrl} alt="" />
      )}

      {phase === 'answering' && question?.hint?.text?.trim() && (
        <InlineHintButton
          type="button"
          onClick={() => (hintUsedThisQuestion ? setHintTextOpen(true) : setHintWarningOpen(true))}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
          </svg>
          {hintUsedThisQuestion ? t.showHint : t.hint}
        </InlineHintButton>
      )}

      {showChat && (
        <InputWrap>
          <ChatBar onSubmit={handleSubmit}>
            <ChatInput
              placeholder={
                phase === 'summary' ? t.followUpPlaceholder : t.answerPlaceholder
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={phase === 'evaluating'}
            />
            <ChatIconButton type="submit" aria-label={t.send} disabled={!canSend}>
              <span>{t.send}</span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </ChatIconButton>
          </ChatBar>
          {settings.allowSkip && phase !== 'evaluating' && (
            <ActionRow style={{ marginTop: 10 }}>
              <SmallButton type="button" tone="ghost" onClick={handleSkip}>{t.skip}</SmallButton>
            </ActionRow>
          )}
        </InputWrap>
      )}

      {/* Portalled to <body> on purpose. These overlays use `backdrop-filter`,
          and rendering them inside the station meant the filter sampled the
          animated stage above it (AnimatedStage/AnimatedContent run keyframes
          with fill-mode `both`, which keeps that subtree on its own compositing
          layer and makes it the backdrop root). The blur then picked up a
          stale, offset frame and painted a ghosted copy of the page behind the
          modal. From <body> the backdrop root is the real page, so the blur
          stays and the ghost goes. */}
      {popupOpen && createPortal(
        <>
          <PopupBackdrop onClick={() => setPopupOpen(false)} />
          <PopupPanel>
            <PopupTitleBar>
              <span>{settings.characterName || t.conversation}</span>
              <PopupCloseButton type="button" aria-label={t.close} onClick={() => setPopupOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </PopupCloseButton>
            </PopupTitleBar>
            <ScrollArea ref={scrollRef}>
              {transcript.map((entry, i) =>
                entry.role === 'character' ? (
                  <CharacterMessageRow key={i}>
                    <MessageBubble role="character">{entry.text}</MessageBubble>
                    {speakingId !== null && i === transcript.length - 1 && (
                      <SpeakButton type="button" aria-label={t.mute} onClick={stopSpeaking}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <line x1="23" y1="9" x2="17" y2="15" />
                          <line x1="17" y1="9" x2="23" y2="15" />
                        </svg>
                      </SpeakButton>
                    )}
                  </CharacterMessageRow>
                ) : (
                  <MessageBubble key={i} role="user">{entry.text}</MessageBubble>
                )
              )}
            </ScrollArea>
          </PopupPanel>
        </>,
        document.body,
      )}

      {hintWarningOpen && createPortal(
        <>
          <PopupBackdrop onClick={() => setHintWarningOpen(false)} />
          <HintModalCard>
            <TeachingText style={{ textAlign: 'center', fontWeight: 700 }}>{t.hintWarning}</TeachingText>
            <ActionRow>
              <SmallButton type="button" tone="ghost" onClick={() => setHintWarningOpen(false)}>{t.hintCancel}</SmallButton>
              <SmallButton type="button" onClick={confirmHint}>{t.hintConfirm}</SmallButton>
            </ActionRow>
          </HintModalCard>
        </>,
        document.body,
      )}

      {hintTextOpen && question?.hint && createPortal(
        <>
          <PopupBackdrop onClick={() => setHintTextOpen(false)} />
          <HintModalCard>
            {question.hint.imageUrl && <HintModalImage src={question.hint.imageUrl} alt={t.hint} />}
            <TeachingText style={{ textAlign: 'center' }}>{question.hint.text}</TeachingText>
            <ActionRow>
              <SmallButton type="button" onClick={() => setHintTextOpen(false)}>{t.hintClose}</SmallButton>
            </ActionRow>
          </HintModalCard>
        </>,
        document.body,
      )}

      {/* No "next question" button — she moves on herself after a quiet gap.
          The only fixed action left is leaving the station at the end. */}
      {phase === 'summary' && (
        <FixedContinue onClick={handleFinish}>{t.finish}</FixedContinue>
      )}

      {descriptionAsPopup && descriptionPopupOpen && station.description && (
        <StationDescriptionPopup
          title={station.name}
          description={station.description}
          onDismiss={() => setDescriptionPopupOpen(false)}
        />
      )}
    </QuizContainer>
  );
}
