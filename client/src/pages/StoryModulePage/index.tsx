import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ActivityLogoutButton from '../../components/ActivityLogoutButton';
import { HelpChatHeaderButton } from '../../components/HelpChat';
import { useAuth } from '../../context/AuthContext';
import { ActivityPlayingHeaderProvider } from '../../context/activityPlayingHeaderContext';
import { useTranslations } from '../../context/LanguageContext';
import { apiFetch } from '../../utils/api';
import { preloadActivityMedia } from '../../utils/mediaPreloader';
import { texts } from './StoryModulePage.i18n';
import { GAME_CONSTANTS, type GameResult } from '../../components/games/types';
import LangDrawer from '../../components/LangDrawer';
import NatureBackground from '../../components/NatureBackground';
import ThemedBackground, { getThemeShellColor, getThemeTransitionBackground } from '../../components/ThemedBackground';
import { styled, keyframes } from '@mui/material/styles';
import {
  PageContainer,
  HeaderBar,
  HeaderActions,
  AccentText,
  OutlineButton,
  CenteredContent,
  Title,
  BodyText,
  ModalOverlay,
  ModalCard,
  PRIMARY,
  LoaderWave,
} from '../../components/styled';
import {
  SummaryScoresList,
  SummaryScoreRow,
  SummaryScoreValue,
  PopupImageWrapper,
  PopupImage,
} from '../../components/games/styled';
import type {
  ActivityModuleResponse,
  PopupData,
  LeaderboardEntry,
  Phase,
  GameScore,
  ModuleItemData,
  StationItemData,
} from './types';
import GuidelinesPopup from './GuidelinesPopup';
import RoadmapView from './RoadmapView';
import FinishScreen from './FinishScreen';
import LeaderboardView from './LeaderboardView';
import PlayingPhase from './PlayingPhase';

// ─── Local styled components (only those used in this file) ───

const PageShell = styled('div')<{ shellColor?: string }>(({ shellColor }) => ({
  minHeight: '100dvh',
  background: shellColor || '#9cd060',
}));

const FullScreenLoader = styled('div')({
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const SummaryTotal = styled(Title)({
  fontSize: 36,
  color: PRIMARY,
});

/** Rounded square — reference purple, dark ring, glossy top (no drop shadow) */
const PopupDismissButton = styled('button')({
  position: 'relative',
  boxSizing: 'border-box',
  width: 96,
  height: 50,
  minWidth: 96,
  minHeight: 50,
  padding: 8,
  margin: '0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '2px solid #5b21b6',
  borderRadius: 22,
  cursor: 'pointer',
  fontFamily: "'Rubik One', 'Encode Sans Expanded', sans-serif",
  fontWeight: 800,
  fontSize: 19,
  lineHeight: 1.15,
  letterSpacing: 0.03,
  color: '#f8f0d8',
  textAlign: 'center',
  unicodeBidi: 'plaintext',
  overflow: 'hidden',
  background: '#a78bfb',
  boxShadow: 'none',
  textShadow: `
    -1px -1px 0 #4a2c18,
    1px -1px 0 #4a2c18,
    -1px 1px 0 #4a2c18,
    1px 1px 0 #4a2c18,
    0 -1px 0 #4a2c18,
    0 1px 0 #4a2c18,
    -1px 0 0 #4a2c18,
    1px 0 0 #4a2c18
  `,
  transition: 'filter 0.15s, background 0.15s',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    borderRadius: '20px 20px 55% 55%',
    background: 'linear-gradient(160deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.12) 38%, transparent 72%)',
    pointerEvents: 'none',
  },
  '& > span': {
    position: 'relative',
    zIndex: 1,
  },
  '&:hover': {
    filter: 'brightness(0.97)',
    background: '#9b7ef8',
  },
  '&:active': {
    filter: 'brightness(0.93)',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&::before': { opacity: 0.85 },
  },
});

const PopupTitle = styled(Title)({
  fontSize: 20,
  marginBottom: 12,
});

const PopupText = styled(BodyText)({
  marginBottom: 20,
  whiteSpace: 'pre-wrap',
  color: '#444',
});

const PopupParticipantName = styled(BodyText)({
  marginBottom: 10,
  fontWeight: 600,
  fontSize: 17,
  color: '#333',
});

const popupBackdropIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const popupCardPop = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.88) translateY(18px);
  }
  70% {
    opacity: 1;
    transform: scale(1.03) translateY(-3px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`;

const PopupModalOverlay = styled(ModalOverlay)({
  animation: `${popupBackdropIn} 240ms ease-out forwards`,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    opacity: 1,
  },
});

const PopupModalCard = styled(ModalCard)({
  animation: `${popupCardPop} 480ms cubic-bezier(0.34, 1.45, 0.64, 1) forwards`,
  transformOrigin: 'center center',
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    opacity: 1,
    transform: 'none',
  },
});

const sceneTransitionClose = keyframes`
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
    transform: scale(1.02);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(8px);
    transform: scale(1);
  }
`;

const sceneTransitionOpen = keyframes`
  from {
    opacity: 1;
    backdrop-filter: blur(8px);
    transform: scale(1);
  }
  to {
    opacity: 0;
    backdrop-filter: blur(0px);
    transform: scale(0.985);
  }
`;

const summarySparkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50%       { opacity: 0.8; transform: scale(1.4); }
`;

const SceneTransitionOverlay = styled('div')<{ stage: 'closing' | 'opening'; transitionBg?: string }>(({ stage, transitionBg }) => ({
  position: 'fixed',
  inset: 0,
  zIndex: 1400,
  pointerEvents: 'auto',
  background: transitionBg || `
    radial-gradient(circle at center, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 26%, rgba(156,208,96,0.2) 56%, rgba(88,152,58,0.42) 100%),
    linear-gradient(180deg, rgba(184,232,240,0.18) 0%, rgba(156,208,96,0.2) 42%, rgba(84,146,50,0.34) 100%)
  `,
  animation: stage === 'closing'
    ? `${sceneTransitionClose} 320ms cubic-bezier(0.32, 0.72, 0, 1) forwards`
    : `${sceneTransitionOpen} 480ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
}));

// ─── Session persistence ───
const ENTRY_TRANSITION_CLOSE_MS = 320;
const ENTRY_TRANSITION_OPEN_MS = 480;

export default function StoryModulePage() {
  const { code } = useParams<{ code: string }>();
  const { participant, logout } = useAuth();
  const navigate = useNavigate();
  const t = useTranslations(texts);

  const [data, setData] = useState<ActivityModuleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [phase, setPhase] = useState<Phase>('roadmap');
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [scores, setScores] = useState<GameScore[]>([]);
  const [showFootsteps, setShowFootsteps] = useState(false);
  const [entryTransitionStage, setEntryTransitionStage] = useState<'idle' | 'closing' | 'opening'>('idle');
  const scoresSaved = useRef(false);
  const entryTransitionTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sessionStartedAt = useRef(Date.now());
  const itemStartTime = useRef(Date.now());

  // Guidelines popup (shown once on first roadmap entry)
  const [showGuidelines, setShowGuidelines] = useState(true);
  const hasProcessedEntry = useRef(false);

  // Station hint
  const [stationHintUsed, setStationHintUsed] = useState<Set<number>>(new Set());
  const [showStationHintWarning, setShowStationHintWarning] = useState(false);
  const [showStationHintText, setShowStationHintText] = useState(false);
  const stationHintPenalty = GAME_CONSTANTS.HINT_PENALTY;

  // Popup messages
  const [popupQueue, setPopupQueue] = useState<PopupData[]>([]);
  const [currentPopup, setCurrentPopup] = useState<PopupData | null>(null);
  const shownPopupIds = useRef<Set<string>>(new Set());
  const pendingAction = useRef<(() => void) | null>(null);
  /** After completing a step (not the last), show afterItem popups only once the roadmap is visible and footsteps finished */
  const pendingAfterItemPopupRef = useRef<number | null>(null);

  // Finish page state
  const [countdown, setCountdown] = useState(90);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [ballGameMuted, setBallGameMuted] = useState(false);

  /** Roadmap header: animate points from → to after a game (ATM-style tally). */
  const [pointsRoll, setPointsRoll] = useState<{ from: number; to: number } | null>(null);

  const handlePointsRollComplete = useCallback(() => {
    setPointsRoll(null);
  }, []);

  // ─── Session persistence ───
  // Must be STATE (not ref) so the save effect only runs after restored values are in state
  const [sessionRestored, setSessionRestored] = useState(false);
  const sessionFoundInStorage = useRef(false);

  // Restore session on mount
  useEffect(() => {
    if (!code) return;
    const raw = sessionStorage.getItem(`yooz_session_${code}`);
    if (!raw) { setSessionRestored(true); return; }
    try {
      const session = JSON.parse(raw);
      sessionFoundInStorage.current = true;
      setCurrentItemIndex(session.currentItemIndex ?? 0);
      setScores(session.scores ?? []);
      setPhase(session.phase === 'playing' ? 'roadmap' : (session.phase ?? 'roadmap'));
      (session.shownPopupIds ?? []).forEach((id: string) => shownPopupIds.current.add(id));
      setStationHintUsed(new Set(session.stationHintUsed ?? []));
      if (session.guidelinesDismissed) setShowGuidelines(false);
      if (session.scoresSaved) scoresSaved.current = true;
      setSessionRestored(true);
    } catch {
      sessionStorage.removeItem(`yooz_session_${code}`);
      setSessionRestored(true);
    }
  }, [code]);

  useEffect(() => {
    return () => {
      entryTransitionTimeouts.current.forEach(clearTimeout);
      entryTransitionTimeouts.current = [];
    };
  }, []);

  useEffect(() => {
    if (phase !== 'roadmap') setPointsRoll(null);
  }, [phase]);

  // Save session on state changes — only after restore is complete
  useEffect(() => {
    if (!code || !sessionRestored) return;
    const session = {
      currentItemIndex,
      scores,
      phase: phase === 'playing' ? 'roadmap' : phase,
      shownPopupIds: Array.from(shownPopupIds.current),
      stationHintUsed: Array.from(stationHintUsed),
      guidelinesDismissed: !showGuidelines,
      scoresSaved: scoresSaved.current,
      lastActive: Date.now(),
    };
    sessionStorage.setItem(`yooz_session_${code}`, JSON.stringify(session));
  }, [code, sessionRestored, currentItemIndex, scores, phase, stationHintUsed, showGuidelines]);

  useEffect(() => {
    if (!code) return;
    const controller = new AbortController();
    fetch(`/api/activities/${code}/module?group=${encodeURIComponent(participant?.group || '')}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then((d) => { setData(d); preloadActivityMedia(d); })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [code]);

  // Restore progress from server when no sessionStorage exists (cross-session resume)
  useEffect(() => {
    if (!sessionRestored || !data || !code || sessionFoundInStorage.current) return;
    apiFetch<{
      completionStatus: string;
      lastActiveItemIndex: number;
      totalItemsCompleted: number;
      scores?: { gameName: string; score: number }[];
      itemResults?: { itemIndex: number; itemName: string; score: number }[];
    }>(`/api/activities/${code}/my-progress`)
      .then((progress) => {
        if (progress.completionStatus === 'completed' && progress.scores?.length) {
          setScores(progress.scores.map((s, i) => ({ itemIndex: i, gameName: s.gameName, score: s.score })));
          scoresSaved.current = true;
          setShowGuidelines(false);
          setPhase('finish');
        } else if (progress.completionStatus === 'in_progress' && progress.totalItemsCompleted > 0) {
          const resumeIndex = Math.min(progress.lastActiveItemIndex + 1, data.module.items.length - 1);
          setCurrentItemIndex(resumeIndex);
          if (progress.itemResults?.length) {
            setScores(progress.itemResults.map((ir) => ({ itemIndex: ir.itemIndex, gameName: ir.itemName, score: ir.score })));
          }
          setShowGuidelines(false);
        }
      })
      .catch(() => { /* fresh start */ });
  }, [sessionRestored, data, code]);

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const doExit = useCallback(() => {
    const loginPath = code ? `/play/${code}` : '/';
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (code) sessionStorage.removeItem(`yooz_session_${code}`);
    navigate(loginPath, { replace: true });
    logout();
  }, [code, logout, navigate]);

  const handleExit = useCallback(() => {
    if (data?.isContinuous && phase !== 'finish') {
      setShowExitConfirm(true);
      return;
    }
    doExit();
  }, [data?.isContinuous, phase, doExit]);

  const handleConfirmExit = useCallback(async () => {
    setShowExitConfirm(false);
    // Delete report data for continuous activity
    if (code) {
      try {
        const token = localStorage.getItem('yooz_token');
        await fetch(`/api/activities/${code}/my-report`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      } catch { /* best effort */ }
    }
    doExit();
  }, [code, doExit]);

  // Auto-exit countdown for finish page
  useEffect(() => {
    if (phase !== 'finish') return;
    setCountdown(GAME_CONSTANTS.FINISH_COUNTDOWN_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleExit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [phase, handleExit]);

  // Pause countdown when viewing leaderboard
  useEffect(() => {
    if (phase === 'leaderboard' && countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, [phase]);

  // Resume previous phase when returning from leaderboard
  const handleBackFromLeaderboard = () => {
    const returnTo = preLeaderboardPhase.current;
    setPhase(returnTo);
    // Only restart countdown if returning to finish
    if (returnTo === 'finish') {
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleExit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Popup helpers
  const getPopupsForTrigger = useCallback((point: string, itemIndex?: number): PopupData[] => {
    if (!data?.module.popups) return [];
    return data.module.popups.filter((p) => {
      if (shownPopupIds.current.has(p._id)) return false;
      if (p.trigger.point !== point) return false;
      if (itemIndex !== undefined && p.trigger.itemIndex !== undefined) {
        return p.trigger.itemIndex === itemIndex;
      }
      return true;
    });
  }, [data]);

  const showPopupsOrRun = useCallback((point: string, itemIndex: number | undefined, action: () => void) => {
    const popups = getPopupsForTrigger(point, itemIndex);
    if (popups.length > 0) {
      popups.forEach((p) => shownPopupIds.current.add(p._id));
      setPopupQueue(popups.slice(1));
      setCurrentPopup(popups[0]);
      pendingAction.current = action;
    } else {
      action();
    }
  }, [getPopupsForTrigger]);

  const dismissPopup = () => {
    if (popupQueue.length > 0) {
      const [next, ...rest] = popupQueue;
      setCurrentPopup(next);
      setPopupQueue(rest);
    } else {
      setCurrentPopup(null);
      if (pendingAction.current) {
        const action = pendingAction.current;
        pendingAction.current = null;
        action();
      }
    }
  };

  // Process afterLogin popups on first data load (replaces welcome screen Start button)
  useEffect(() => {
    if (!data || hasProcessedEntry.current) return;
    hasProcessedEntry.current = true;

    const afterLoginPopups = getPopupsForTrigger('afterLogin');
    if (afterLoginPopups.length > 0) {
      afterLoginPopups.forEach((p) => shownPopupIds.current.add(p._id));
      setPopupQueue(afterLoginPopups.slice(1));
      setCurrentPopup(afterLoginPopups[0]);
      // No pending action — guidelines popup handles the transition
    }
  }, [data, getPopupsForTrigger]);

  const handleGuidelinesDismiss = () => {
    setShowGuidelines(false);
  };

  const advanceToNextItem = () => {
    if (!data) return;
    const completedIdx = currentItemIndex;
    const nextIdx = completedIdx + 1;
    const isLast = nextIdx >= data.module.items.length;

    if (!isLast) {
      pendingAfterItemPopupRef.current = completedIdx;
      setCurrentItemIndex(nextIdx);
      setShowFootsteps(true);
      setPhase('roadmap');
    } else {
      showPopupsOrRun('afterItem', completedIdx, () => {
        showPopupsOrRun('endOfActivity', undefined, () => {
          setPhase('finish');
        });
      });
    }
  };

  const handleNodeTap = (index: number) => {
    if (entryTransitionStage !== 'idle') return;

    const goPlay = () => {
      setEntryTransitionStage('closing');
      const closeTimer = setTimeout(() => {
        itemStartTime.current = Date.now();
        setPhase('playing');
        setEntryTransitionStage('opening');
        const openTimer = setTimeout(() => {
          setEntryTransitionStage('idle');
        }, ENTRY_TRANSITION_OPEN_MS);
        entryTransitionTimeouts.current.push(openTimer);
      }, ENTRY_TRANSITION_CLOSE_MS);
      entryTransitionTimeouts.current.push(closeTimer);
    };

    const pending = pendingAfterItemPopupRef.current;
    if (pending !== null) {
      pendingAfterItemPopupRef.current = null;
      setShowFootsteps(false);
      showPopupsOrRun('afterItem', pending, () => {
        showPopupsOrRun('beforeItem', index, goPlay);
      });
      return;
    }

    showPopupsOrRun('beforeItem', index, goPlay);
  };

  const handleFootstepsComplete = useCallback(() => {
    setShowFootsteps(false);
    const pending = pendingAfterItemPopupRef.current;
    if (pending !== null) {
      pendingAfterItemPopupRef.current = null;
      showPopupsOrRun('afterItem', pending, () => {});
    }
  }, [showPopupsOrRun]);

  // Skip roadmap entirely when there's only 1 station — auto-enter it
  const singleItemAutoEntered = useRef(false);
  useEffect(() => {
    if (
      phase === 'roadmap' &&
      data &&
      data.module.items.length === 1 &&
      !showGuidelines &&
      !currentPopup &&
      !singleItemAutoEntered.current &&
      entryTransitionStage === 'idle'
    ) {
      singleItemAutoEntered.current = true;
      handleNodeTap(0);
    }
  }, [phase, data, showGuidelines, currentPopup, entryTransitionStage]);

  const handleGameComplete = (result: GameResult) => {
    if (!data) return;
    const currentItem = data.module.items[currentItemIndex];
    const now = new Date();
    const nextIdx = currentItemIndex + 1;
    const willReturnToRoadmap = nextIdx < data.module.items.length;
    const hintPen = stationHintUsed.size * stationHintPenalty;
    const prevTotal = Math.max(0, scores.reduce((sum, s) => sum + s.score, 0) - hintPen);
    const newTotal = Math.max(0, prevTotal + result.score);
    if (willReturnToRoadmap && newTotal > prevTotal) {
      setPointsRoll({ from: prevTotal, to: newTotal });
    }

    setScores((prev) => [
      ...prev,
      {
        itemIndex: currentItemIndex,
        gameName: currentItem.name,
        score: result.score,
      },
    ]);

    // Build IItemResult for incremental progress saving
    const itemResult = {
      itemIndex: currentItemIndex,
      itemId: currentItem._id,
      itemType: currentItem.type as 'game' | 'station' | 'mission',
      itemName: currentItem.name,
      gameType: currentItem.type === 'game' ? (currentItem as { gameType?: string }).gameType : undefined,
      score: result.score,
      maxPossibleScore: result.maxPossibleScore,
      startedAt: new Date(itemStartTime.current),
      completedAt: now,
      durationMs: result.durationMs,
      hintUsed: result.hintUsed,
      hintPenalty: result.hintUsed ? GAME_CONSTANTS.HINT_PENALTY : 0,
      questionAnswers: result.questionAnswers,
      attempts: result.attempts,
      metadata: result.metadata,
    };

    const completedCount = currentItemIndex + 1;
    // scores state hasn't updated yet (setScores is async), so compute running total manually
    const runningTotal = scores.reduce((sum, s) => sum + s.score, 0) + result.score;

    // Save incrementally (fire & forget)
    if (code) {
      apiFetch(`/api/activities/${code}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({
          itemResult,
          totalItemsCompleted: completedCount,
          lastActiveItemIndex: currentItemIndex,
          runningTotal,
        }),
      }).catch(() => { /* best effort */ });
    }

    advanceToNextItem();
  };

  const handleStationContinue = () => {
    advanceToNextItem();
  };

  const handleFeedbackContinue = (feedbackResult: { answers: { questionIndex: number; questionText: string; value: number; label: string }[]; notes: string }) => {
    if (!data) return;
    const currentItem = data.module.items[currentItemIndex];
    // Save feedback answers as part of progress
    const now = new Date();
    const itemResult = {
      itemIndex: currentItemIndex,
      itemId: currentItem?._id,
      itemType: 'station' as const,
      itemName: currentItem?.name,
      score: 0,
      maxPossibleScore: 0,
      startedAt: new Date(itemStartTime.current),
      completedAt: now,
      durationMs: now.getTime() - itemStartTime.current,
      metadata: {
        feedbackType: 'rating_6_level',
        answers: feedbackResult.answers,
        notes: feedbackResult.notes,
        averageRating: feedbackResult.answers.length > 0
          ? +(feedbackResult.answers.reduce((sum, a) => sum + a.value, 0) / feedbackResult.answers.length).toFixed(2)
          : 0,
      },
    };

    const completedCount = currentItemIndex + 1;
    const runningTotal = scores.reduce((sum, s) => sum + s.score, 0);

    if (code) {
      apiFetch(`/api/activities/${code}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({
          itemResult,
          totalItemsCompleted: completedCount,
          lastActiveItemIndex: currentItemIndex,
          runningTotal,
        }),
      }).catch(() => { /* best effort */ });
    }

    advanceToNextItem();
  };

  const toggleBallGameMute = useCallback(() => {
    setBallGameMuted((prev) => !prev);
    window.dispatchEvent(new CustomEvent('yooz:ballgame-audio-toggle'));
  }, []);

  const getStationHint = (item: ModuleItemData) => {
    if (item.type !== 'station') return null;
    const station = item as StationItemData;
    if (['text', 'video', 'image'].includes(station.stationType)) return null;
    const hint = item.settings?.hint as { enabled?: boolean; text?: string } | undefined;
    return hint?.enabled && hint.text ? hint.text : null;
  };

  const handleStationHintClick = () => {
    if (stationHintUsed.has(currentItemIndex)) {
      setShowStationHintText(true);
      return;
    }
    setShowStationHintWarning(true);
  };

  const confirmStationHint = () => {
    setShowStationHintWarning(false);
    setStationHintUsed((prev) => new Set(prev).add(currentItemIndex));
    setShowStationHintText(true);
  };

  // Persist scores to server when finish phase is reached (with retry)
  useEffect(() => {
    if (phase !== 'finish' || scoresSaved.current || !code || scores.length === 0) return;
    scoresSaved.current = true;
    const totalHintPen = stationHintUsed.size * stationHintPenalty;
    const scorePayload = scores.map((s) => ({ gameName: s.gameName, score: s.score }));
    if (totalHintPen > 0) {
      scorePayload.push({ gameName: 'Hint Penalty', score: -totalHintPen });
    }
    const saveWithRetry = async (retries = 3) => {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          await apiFetch(`/api/activities/${code}/scores`, {
            method: 'POST',
            body: JSON.stringify({
              scores: scorePayload,
              sessionDurationMs: Date.now() - sessionStartedAt.current,
            }),
          });
          return;
        } catch {
          if (attempt < retries - 1) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
      }
    };
    saveWithRetry();
  }, [phase, code, scores]);

  // Fetch leaderboard
  const leaderboardAbortRef = useRef<AbortController | null>(null);
  const fetchLeaderboard = useCallback(async () => {
    if (!code) return;
    leaderboardAbortRef.current?.abort();
    const controller = new AbortController();
    leaderboardAbortRef.current = controller;
    setLeaderboardLoading(true);
    try {
      const res = await fetch(`/api/activities/${code}/leaderboard`, { signal: controller.signal });
      if (res.ok) {
        const d = await res.json();
        setLeaderboard(d.leaderboard || []);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setLeaderboard([]);
      }
    } finally {
      setLeaderboardLoading(false);
    }
  }, [code]);

  const preLeaderboardPhase = useRef<Phase>('finish');
  const handleViewLeaderboard = () => {
    preLeaderboardPhase.current = phase as Phase;
    fetchLeaderboard();
    setPhase('leaderboard');
  };

  const activeItemForUi = data?.module.items[currentItemIndex];
  const isBallGameActive = phase === 'playing'
    && activeItemForUi?.type === 'game'
    && ((activeItemForUi as { gameType?: string }).gameType === 'ballGame');

  useEffect(() => {
    document.body.classList.toggle('yooz-ballgame-active', isBallGameActive);
    window.dispatchEvent(new CustomEvent('yooz:ballgame-visibility', { detail: { active: isBallGameActive } }));
    return () => {
      document.body.classList.remove('yooz-ballgame-active');
      window.dispatchEvent(new CustomEvent('yooz:ballgame-visibility', { detail: { active: false } }));
    };
  }, [isBallGameActive]);

  const themeShellColor = getThemeShellColor(data?.module.theme);
  useEffect(() => {
    const body = document.body;
    const prevBodyBg = body.style.backgroundColor;

    body.style.backgroundColor = themeShellColor;

    const metas = document.querySelectorAll('meta[name="theme-color"]') as NodeListOf<HTMLMetaElement>;
    const prevThemes = Array.from(metas).map((m) => m.content);
    metas.forEach((m) => { m.content = themeShellColor; });

    return () => {
      body.style.backgroundColor = prevBodyBg;
      metas.forEach((m, i) => { m.content = prevThemes[i]; });
    };
  }, [themeShellColor]);

  // ─── Loading / Error ───

  if (loading) {
    return (
      <PageShell>
        <NatureBackground>
          <FullScreenLoader>
            <LoaderWave aria-label={t.loading}>
              <span>z</span>
              <span>o</span>
              <span>o</span>
              <span>Y</span>
            </LoaderWave>
          </FullScreenLoader>
        </NatureBackground>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <PageContainer>
          <CenteredContent>
            <BodyText>{t.error}</BodyText>
          </CenteredContent>
        </PageContainer>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell>
        <NatureBackground>
          <FullScreenLoader>
            <LoaderWave aria-label={t.loading}>
              <span>z</span>
              <span>o</span>
              <span>o</span>
              <span>Y</span>
            </LoaderWave>
          </FullScreenLoader>
        </NatureBackground>
      </PageShell>
    );
  }

  // ─── Derived values ───

  const bgStyle = data.module.backgroundImage
    ? {
        backgroundImage: `url(${data.module.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};

  const activityTheme = data.module.theme;
  const transitionBg = getThemeTransitionBackground(activityTheme);

  // Popup modal (shared across all phases)
  const popupModal = currentPopup ? (
    <PopupModalOverlay key={currentPopup._id}>
      <PopupModalCard onClick={(e) => e.stopPropagation()}>
        <PopupTitle>{currentPopup.title}</PopupTitle>
        {currentPopup.contentType === 'image' && currentPopup.image ? (
          <>
            {currentPopup.includeUsername && participant?.name && (
              <PopupParticipantName>{participant.name}</PopupParticipantName>
            )}
            <PopupImageWrapper>
              <PopupImage src={currentPopup.image} alt="" />
            </PopupImageWrapper>
          </>
        ) : (
          <>
            {currentPopup.includeUsername && participant?.name && (
              <PopupParticipantName>{participant.name}</PopupParticipantName>
            )}
            <PopupText>{currentPopup.text}</PopupText>
          </>
        )}
        <PopupDismissButton type="button" onClick={dismissPopup}>
          <span>{t.popupDismiss}</span>
        </PopupDismissButton>
      </PopupModalCard>
    </PopupModalOverlay>
  ) : null;

  // ─── Phase rendering ───

  if (phase === 'roadmap') {
    const roadmapTotalPoints = Math.max(
      0,
      scores.reduce((sum, s) => sum + s.score, 0) - stationHintUsed.size * stationHintPenalty,
    );
    return (
      <>
        <RoadmapView
          items={data.module.items}
          currentItemIndex={currentItemIndex}
          completedCount={currentItemIndex}
          currentPoints={roadmapTotalPoints}
          pointsRoll={pointsRoll}
          onPointsRollComplete={handlePointsRollComplete}
          showFootsteps={showFootsteps}
          onFootstepsComplete={handleFootstepsComplete}
          onNodeTap={handleNodeTap}
          onLogout={handleExit}
          onViewLeaderboard={handleViewLeaderboard}
          popupModal={popupModal}
          t={t}
          theme={data.module.theme}
        />
        {showGuidelines && !currentPopup && (
          <GuidelinesPopup
            itemCount={data.module.items.length}
            guidelines={data.guidelines}
            customInstructions={data.customInstructions}
            onDismiss={handleGuidelinesDismiss}
            t={t}
          />
        )}
        {entryTransitionStage !== 'idle' && (
          <SceneTransitionOverlay stage={entryTransitionStage} transitionBg={transitionBg} />
        )}
      </>
    );
  }

  if (phase === 'finish') {
    const rawTotal = scores.reduce((sum, s) => sum + s.score, 0);
    const totalHintPenalty = stationHintUsed.size * stationHintPenalty;
    const totalScore = Math.max(0, rawTotal - totalHintPenalty);

    return (
      <>
        <FinishScreen
          activityName={data.name}
          totalScore={totalScore}
          hasScores={scores.length > 0}
          itemCount={data.module.items.length}
          completedItems={data.module.items.length}
          countdown={countdown}
          countdownSeconds={GAME_CONSTANTS.FINISH_COUNTDOWN_SECONDS}
          bgStyle={bgStyle}
          onStay={() => setCountdown(GAME_CONSTANTS.FINISH_COUNTDOWN_SECONDS)}
          onViewLeaderboard={handleViewLeaderboard}
          onExit={handleExit}
          popupModal={popupModal}
          t={t}
        />
        {entryTransitionStage !== 'idle' && (
          <SceneTransitionOverlay stage={entryTransitionStage} transitionBg={transitionBg} />
        )}
      </>
    );
  }

  if (phase === 'leaderboard') {
    return (
      <>
        <LeaderboardView
          activityName={data.name}
          leaderboard={leaderboard}
          currentParticipantName={participant?.name}
          isLoading={leaderboardLoading}
          bgStyle={bgStyle}
          onBack={handleBackFromLeaderboard}
          onLogout={handleExit}
          t={t}
        />
        {entryTransitionStage !== 'idle' && (
          <SceneTransitionOverlay stage={entryTransitionStage} transitionBg={transitionBg} />
        )}
      </>
    );
  }

  // Summary screen (legacy fallback)
  if (phase === 'summary') {
    const rawTotal = scores.reduce((sum, s) => sum + s.score, 0);
    const totalHintPenalty = stationHintUsed.size * stationHintPenalty;
    const totalScore = Math.max(0, rawTotal - totalHintPenalty);
    const summaryDots = [
      { x: '12%', y: '8%', s: 3, d: 0 },
      { x: '88%', y: '12%', s: 2, d: 0.4 },
      { x: '6%', y: '30%', s: 4, d: 0.8 },
      { x: '92%', y: '28%', s: 2, d: 1.2 },
      { x: '18%', y: '55%', s: 3, d: 0.6 },
      { x: '82%', y: '52%', s: 2, d: 1.0 },
      { x: '50%', y: '18%', s: 2, d: 0.3 },
      { x: '35%', y: '75%', s: 3, d: 0.9 },
      { x: '70%', y: '80%', s: 2, d: 0.2 },
      { x: '25%', y: '92%', s: 2, d: 1.4 },
      { x: '78%', y: '90%', s: 3, d: 0.7 },
    ];

    return (
      <div
        style={{
          position: 'relative',
          minHeight: '100dvh',
          background: 'linear-gradient(180deg, #5c1a9e 0%, #1e0050 100%)',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          {summaryDots.map((dot, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: dot.x,
                top: dot.y,
                width: dot.s,
                height: dot.s,
                borderRadius: '50%',
                background: '#fff',
                animation: `${summarySparkle} ${2 + dot.d}s ease-in-out ${dot.d}s infinite`,
              }}
            />
          ))}
        </div>
        <HeaderBar style={{ position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <AccentText style={{ color: '#fff' }}>{data.name}</AccentText>
          <HeaderActions>
            <HelpChatHeaderButton />
            <ActivityLogoutButton onClick={handleExit} ariaLabel={t.exitActivity} />
            <LangDrawer variant="darkHeader" />
          </HeaderActions>
        </HeaderBar>
        <CenteredContent style={{ position: 'relative', zIndex: 1 }}>
          <Title style={{ color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{t.summary}</Title>
          <SummaryScoresList style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 16, padding: '12px 16px' }}>
            {scores.map((s, i) => (
              <SummaryScoreRow key={i} style={{ color: '#fff' }}>
                <span>{s.gameName}</span>
                <SummaryScoreValue style={{ color: '#fff' }}>{s.score} {t.points}</SummaryScoreValue>
              </SummaryScoreRow>
            ))}
          </SummaryScoresList>
          <SummaryTotal style={{ color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
            {totalScore} {t.points}
          </SummaryTotal>
          <BodyText sx={{ marginBottom: '24px', color: '#fff' }}>{t.totalScore}</BodyText>
          <OutlineButton
            style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }}
            onClick={() => navigate('/home')}
          >
            {t.backToHome}
          </OutlineButton>
        </CenteredContent>
        {popupModal}
      </div>
    );
  }

  // ─── Playing phase ───

  const currentItem = data.module.items[currentItemIndex];
  const currentItemHintText = getStationHint(currentItem);
  const playingTotalPoints = Math.max(
    0,
    scores.reduce((sum, s) => sum + s.score, 0) - stationHintUsed.size * stationHintPenalty,
  );

  return (
    <>
      <ActivityPlayingHeaderProvider>
      <PlayingPhase
        currentItem={currentItem}
        stationHintText={currentItemHintText}
        stationHintUsed={stationHintUsed.has(currentItemIndex)}
        bgStyle={bgStyle}
        theme={data.module.theme}
        code={code}
        onGameComplete={handleGameComplete}
        onLogout={handleExit}
        onViewLeaderboard={handleViewLeaderboard}
        currentPoints={playingTotalPoints}
        onStationContinue={handleStationContinue}
        onFeedbackContinue={handleFeedbackContinue}
        onBallGameMuteToggle={toggleBallGameMute}
        ballGameMuted={ballGameMuted}
        onStationHintClick={handleStationHintClick}
        showStationHintWarning={showStationHintWarning}
        showStationHintText={showStationHintText}
        onConfirmStationHint={confirmStationHint}
        onCloseHintWarning={() => setShowStationHintWarning(false)}
        onCloseHintText={() => setShowStationHintText(false)}
        popupModal={popupModal}
        t={t}
      />
      </ActivityPlayingHeaderProvider>
      {entryTransitionStage !== 'idle' && (
        <SceneTransitionOverlay stage={entryTransitionStage} transitionBg={transitionBg} />
      )}

      {/* Exit confirmation for continuous activities */}
      {showExitConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 340, width: '90%',
            textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#333' }}>{t.exitConfirmTitle}</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#666' }}>{t.exitConfirmMessage}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{
                  padding: '10px 24px', borderRadius: 10, border: '1.5px solid #ddd',
                  background: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 600, color: '#555',
                }}
              >
                {t.exitConfirmCancel}
              </button>
              <button
                onClick={handleConfirmExit}
                style={{
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: '#e74c3c', color: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 600,
                }}
              >
                {t.exitConfirmOk}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
