import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ActivityLogoutButton from '../../components/ActivityLogoutButton';
import { HelpChatHeaderButton, useHelpChat, setHelpChatActivityContext } from '../../components/HelpChat';
import { useAuth } from '../../context/AuthContext';
import { ActivityPlayingHeaderProvider } from '../../context/activityPlayingHeaderContext';
import { useTranslations, useLang } from '../../context/LanguageContext';
import { apiFetch, apiFetchPersistSilent, apiFetchWithRetry } from '../../utils/api';
import { isRequestQueued, subscribeOfflineQueue } from '../../utils/offlineQueue';
import { participantPlayPath, rememberActivityCode } from '../../utils/participantActivity';
import { useParticipantExit } from '../../hooks/useParticipantExit';
import { preloadActivityMedia } from '../../utils/mediaPreloader';
import { optimizeActivityMediaData } from '../../utils/participantMedia';
import { getCachedModuleData, setCachedModuleData } from '../../utils/moduleCache';
import { rememberActivityLanguages } from '../../utils/activityLanguages';
import { clearStorySession, loadStorySessionRaw, saveStorySessionRaw } from '../../utils/storySession';
import { texts } from './StoryModulePage.i18n';
import { GAME_CONSTANTS, type GameResult } from '../../components/games/types';
import type { OrderSurveySubmitPayload } from '../../components/games/OrderGame';
import LangDrawer from '../../components/LangDrawer';
import { getThemeShellColor, getThemeTransitionBackground, getThemeSkyColor, getThemeGroundColor } from '../../components/ThemedBackground';
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
  GroupLeaderboardEntry,
  Phase,
  GameScore,
  ModuleItemData,
  StationItemData,
} from './types';
import GuidelinesPopup from './GuidelinesPopup';
import RoadmapView from './RoadmapView';
import SpidersView from './SpidersView';
import MapView from './MapView';
import { useMapRun } from '../../hooks/useMapRun';
import FinishScreen from './FinishScreen';
import LeaderboardView from './LeaderboardView';
import PlayingPhase from './PlayingPhase';
import { useLockStream } from '../../hooks/useLockStream';
import { useWakeLock } from '../../hooks/useWakeLock';

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

const TRIVIA_BROWSER_PURPLE = '#440e76';
const PUZZLE_BROWSER_GREEN = '#134a27';
const ORDER_BROWSER_ORANGE = '#ce6b42';
const GOLF_BROWSER_GREEN = '#355a24';
const BALL_BROWSER_BLUE = '#7ec7e1';

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

const ENTRY_TRANSITION_CLOSE_MS = 320;
const ENTRY_TRANSITION_OPEN_MS = 480;

export default function StoryModulePage() {
  const { code } = useParams<{ code: string }>();
  const { participant } = useAuth();
  const navigate = useNavigate();
  const exitActivity = useParticipantExit();
  const t = useTranslations(texts);
  const { restrictToLanguages } = useLang();

  const [data, setData] = useState<ActivityModuleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const hasModuleData = useRef(false);
  const lockedFromIndex = useLockStream(code, data?.lockedFromIndex ?? null);
  const isMap = data?.module?.type === 'map';
  const isGroupMap = isMap && !!participant?.group;
  const mapRun = useMapRun(code || '', isGroupMap);

  useWakeLock(true);
  const { nudge: nudgeHelp } = useHelpChat();

  useEffect(() => {
    if (code) rememberActivityCode(code);
  }, [code]);

  const [phase, setPhase] = useState<Phase>('roadmap');
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const revisitReturnIndex = useRef<number | null>(null);
  const [scores, setScores] = useState<GameScore[]>([]);

  useEffect(() => {
    const item = data?.module?.items?.[currentItemIndex];
    setHelpChatActivityContext({
      activityName: data?.name,
      phase,
      itemIndex: currentItemIndex,
      totalItems: data?.module?.items?.length,
      itemName: item?.name,
      itemType: item ? (item.type === 'game' ? item.gameType : item.type === 'station' ? item.stationType : item.type) : undefined,
    });
    return () => setHelpChatActivityContext(null);
  }, [data, phase, currentItemIndex]);
  const [showFootsteps, setShowFootsteps] = useState(false);
  const [entryTransitionStage, setEntryTransitionStage] = useState<'idle' | 'closing' | 'opening'>('idle');
  const scoresSaved = useRef(false);
  const [scoresSaveStatus, setScoresSaveStatus] = useState<'pending' | 'saved' | 'queued'>('pending');
  const entryTransitionTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const sessionStartedAt = useRef((() => {
    const token = localStorage.getItem('yooz_token') ?? 'anon';
    const key = `yooz_start_${code}_${token}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const t = parseInt(stored, 10);
      if (!isNaN(t)) return t;
    }
    const now = Date.now();
    localStorage.setItem(key, String(now));
    return now;
  })());
  const itemStartTime = useRef(Date.now());

  const [showGuidelines, setShowGuidelines] = useState(true);
  const [progressChecked, setProgressChecked] = useState(false);
  const hasProcessedEntry = useRef(false);

  const [completedSpiderItems, setCompletedSpiderItems] = useState<Set<number>>(new Set());

  const [stationHintUsed, setStationHintUsed] = useState<Set<number>>(new Set());
  const [showStationHintWarning, setShowStationHintWarning] = useState(false);
  const [showStationHintText, setShowStationHintText] = useState(false);
  const stationHintPenalty = GAME_CONSTANTS.HINT_PENALTY;

  const [popupQueue, setPopupQueue] = useState<PopupData[]>([]);
  const [currentPopup, setCurrentPopup] = useState<PopupData | null>(null);
  const shownPopupIds = useRef<Set<string>>(new Set());
  const pendingAction = useRef<(() => void) | null>(null);
  const pendingAfterItemPopupRef = useRef<number | null>(null);

  const [countdown, setCountdown] = useState<number | null>(90);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userStayedRef = useRef(false);
  const [finalDurationMs, setFinalDurationMs] = useState<number | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [groupLeaderboard, setGroupLeaderboard] = useState<GroupLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    Math.floor((Date.now() - sessionStartedAt.current) / 1000)
  );
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const timeWarningShown = useRef(false);
  const isTimeMode = data?.leaderboardMode === 'time';
  const showsTimer = isTimeMode || data?.leaderboardMode === 'both';
  const hasRoadmapTimer = (data?.roadmapTimerMinutes ?? 0) > 0;
  const needsElapsedTimer = showsTimer || hasRoadmapTimer;
  useEffect(() => {
    if (!needsElapsedTimer) return;
    if (phase === 'finish') return;
    const id = setInterval(() => {
      const secs = Math.floor((Date.now() - sessionStartedAt.current) / 1000);
      setElapsedSeconds(secs);
      const limitMins = data?.activityDurationMinutes;
      if (
        showsTimer
        && limitMins
        && !timeWarningShown.current
        && secs >= limitMins * 60 - 60
        && secs < limitMins * 60
      ) {
        timeWarningShown.current = true;
        setShowTimeWarning(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [needsElapsedTimer, showsTimer, data?.activityDurationMinutes, phase]);
  const [ballGameMuted, setBallGameMuted] = useState(false);

  const [pointsRoll, setPointsRoll] = useState<{ from: number; to: number } | null>(null);

  const handlePointsRollComplete = useCallback(() => {
    setPointsRoll(null);
  }, []);

  const [sessionRestored, setSessionRestored] = useState(false);

  useEffect(() => {
    if (!code) return;
    const raw = loadStorySessionRaw(code);
    if (!raw) { setSessionRestored(true); return; }
    try {
      const session = JSON.parse(raw);
      setCurrentItemIndex(session.currentItemIndex ?? 0);
      setScores(session.scores ?? []);
      setPhase(session.phase === 'playing' ? 'roadmap' : (session.phase ?? 'roadmap'));
      (session.shownPopupIds ?? []).forEach((id: string) => shownPopupIds.current.add(id));
      setStationHintUsed(new Set(session.stationHintUsed ?? []));
      setCompletedSpiderItems(new Set(session.completedSpiderItems ?? []));
      if (session.guidelinesDismissed) setShowGuidelines(false);
      if (session.scoresSaved) {
        scoresSaved.current = true;
        const scoresUrl = `/api/activities/${code}/scores`;
        setScoresSaveStatus(isRequestQueued(scoresUrl, 'POST') ? 'queued' : 'saved');
      }
      setSessionRestored(true);
    } catch {
      clearStorySession(code);
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

  useEffect(() => {
    if (!code || !sessionRestored) return;
    const session = {
      currentItemIndex: revisitReturnIndex.current ?? currentItemIndex,
      scores,
      phase: phase === 'playing' ? 'roadmap' : phase,
      shownPopupIds: Array.from(shownPopupIds.current),
      stationHintUsed: Array.from(stationHintUsed),
      completedSpiderItems: Array.from(completedSpiderItems),
      guidelinesDismissed: !showGuidelines,
      scoresSaved: scoresSaveStatus === 'saved',
      lastActive: Date.now(),
    };
    saveStorySessionRaw(code, JSON.stringify(session));
  }, [code, sessionRestored, currentItemIndex, scores, phase, stationHintUsed, completedSpiderItems, showGuidelines, scoresSaveStatus]);

  useEffect(() => {
    hasModuleData.current = !!data;
  }, [data]);

  const saveItemProgress = useCallback(async (
    overrides?: {
      itemIndex?: number;
      itemResult?: Record<string, unknown>;
      progressOnly?: boolean;
      completedCount?: number;
      runningTotal?: number;
    },
  ) => {
    if (!code || !data || revisitReturnIndex.current !== null) return;
    const idx = overrides?.itemIndex ?? currentItemIndex;
    const currentItem = data.module.items[idx];
    const now = new Date();
    const completedCount = overrides?.completedCount ?? idx + 1;
    const runningTotal = overrides?.runningTotal ?? Math.max(
      0,
      scores.reduce((sum, s) => sum + s.score, 0) - stationHintUsed.size * stationHintPenalty,
    );

    const payload: Record<string, unknown> = {
      totalItemsCompleted: completedCount,
      lastActiveItemIndex: idx,
      runningTotal,
    };

    if (overrides?.progressOnly) {
      payload.progressOnly = true;
    } else {
      payload.itemResult = overrides?.itemResult ?? {
        itemIndex: idx,
        itemId: currentItem._id,
        itemType: currentItem.type,
        itemName: currentItem.name,
        score: 0,
        maxPossibleScore: 0,
        startedAt: new Date(itemStartTime.current),
        completedAt: now,
        durationMs: now.getTime() - itemStartTime.current,
      };
    }

    await apiFetchPersistSilent(`/api/activities/${code}/progress`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }, [code, data, currentItemIndex, scores, stationHintUsed, stationHintPenalty]);

  const fetchModule = useCallback(async (signal?: AbortSignal, opts?: { soft?: boolean }) => {
    if (!code) return;
    try {
      const raw = await apiFetchWithRetry<ActivityModuleResponse>(
        `/api/activities/${code}/module?group=${encodeURIComponent(participant?.group || '')}`,
        { signal, headers: { 'Cache-Control': 'no-store' } },
        10,
      );
      const d = optimizeActivityMediaData(raw);
      setCachedModuleData(code, participant?.group || '', d);
      rememberActivityLanguages(code, d.languages);
      restrictToLanguages(d.languages ?? []);
      setData(d);
      setError(false);
      preloadActivityMedia(d);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (err instanceof Error && err.message === 'group_not_ready') {
        if (opts?.soft && hasModuleData.current) return;
        navigate(participantPlayPath(code), { replace: true });
        return;
      }
      if (err instanceof Error && err.name !== 'AbortError') {
        if (opts?.soft && hasModuleData.current) return;
        setError(true);
      }
    }
  }, [code, participant?.group, navigate]);

  useEffect(() => {
    if (!code) return;
    const group = participant?.group || '';
    const cached = getCachedModuleData<ActivityModuleResponse>(code, group);
    if (cached) {
      rememberActivityLanguages(code, cached.languages);
      restrictToLanguages(cached.languages ?? []);
      setData(cached);
      setError(false);
      preloadActivityMedia(cached);
      setLoading(false);
    }
    const controller = new AbortController();
    fetchModule(controller.signal).finally(() => setLoading(false));
    return () => controller.abort();
  }, [code, fetchModule]);

  useEffect(() => {
    if (!error || !code) return;
    const id = setInterval(() => {
      if (!navigator.onLine) return;
      fetchModule().then(() => setError(false)).catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [error, code, fetchModule]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchModule(undefined, { soft: true });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchModule]);

  useEffect(() => {
    if (!data) return;
    preloadActivityMedia(data, { priorityIndex: currentItemIndex });
  }, [data, currentItemIndex]);

  useEffect(() => {
    if (!sessionRestored || !data || !code) return;
    apiFetch<{
      completionStatus: string;
      lastActiveItemIndex: number;
      totalItemsCompleted: number;
      scores?: { gameName: string; score: number }[];
      itemResults?: { itemIndex: number; itemName: string; score: number }[];
    }>(`/api/activities/${code}/my-progress`, { headers: { 'Cache-Control': 'no-store' } })
      .then((progress) => {
        if (progress.completionStatus === 'completed' && progress.scores?.length) {
          setScores(progress.scores.map((s, i) => ({ itemIndex: i, gameName: s.gameName, score: s.score })));
          scoresSaved.current = true;
          setScoresSaveStatus('saved');
          setShowGuidelines(false);
          setPhase('finish');
        } else if (progress.completionStatus === 'in_progress' && progress.totalItemsCompleted > 0) {
          if (data.module.type === 'spiders' && progress.itemResults?.length) {
            setCompletedSpiderItems(new Set(progress.itemResults.map((ir) => ir.itemIndex)));
          } else {
            const resumeIndex = Math.min(progress.lastActiveItemIndex + 1, data.module.items.length - 1);
            setCurrentItemIndex(resumeIndex);
          }
          if (progress.itemResults?.length) {
            setScores(progress.itemResults.map((ir) => ({ itemIndex: ir.itemIndex, gameName: ir.itemName, score: ir.score })));
          }
          setShowGuidelines(false);
        }
      })
      .catch(() => { })
      .finally(() => setProgressChecked(true));
  }, [sessionRestored, data, code]);

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const doExit = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (code) clearStorySession(code);
    const token = localStorage.getItem('yooz_token') ?? 'anon';
    if (code) localStorage.removeItem(`yooz_start_${code}_${token}`);
    exitActivity(code);
  }, [code, exitActivity]);

  const handleExit = useCallback(() => {
    if (data?.isContinuous && phase !== 'finish') {
      setShowExitConfirm(true);
      return;
    }
    doExit();
  }, [data?.isContinuous, phase, doExit]);

  const handleConfirmExit = useCallback(async () => {
    setShowExitConfirm(false);
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
      } catch { }
    }
    doExit();
  }, [code, doExit]);

  useEffect(() => {
    if (phase !== 'finish') return;
    setFinalDurationMs((prev) => prev ?? Date.now() - sessionStartedAt.current);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'finish') return;
    if (userStayedRef.current) return;
    setCountdown(GAME_CONSTANTS.FINISH_COUNTDOWN_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (userStayedRef.current || prev === null) return prev;
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

  useEffect(() => {
    if (phase === 'leaderboard' && countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, [phase]);

  const handleBackFromLeaderboard = () => {
    const returnTo = preLeaderboardPhase.current;
    setPhase(returnTo);
    if (returnTo === 'finish' && !userStayedRef.current) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (userStayedRef.current || prev === null) return prev;
          if (prev <= 1) {
            handleExit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

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

  const dismissedByPointerRef = useRef(false);

  const handleDismissPointerUp = () => {
    dismissedByPointerRef.current = true;
    dismissPopup();
  };

  const handleDismissClick = () => {
    if (dismissedByPointerRef.current) {
      dismissedByPointerRef.current = false;
      return;
    }
    dismissPopup();
  };

  useEffect(() => {
    if (!data || hasProcessedEntry.current) return;
    hasProcessedEntry.current = true;

    const afterLoginPopups = getPopupsForTrigger('afterLogin');
    if (afterLoginPopups.length > 0) {
      afterLoginPopups.forEach((p) => shownPopupIds.current.add(p._id));
      setPopupQueue(afterLoginPopups.slice(1));
      setCurrentPopup(afterLoginPopups[0]);
    }
  }, [data, getPopupsForTrigger]);

  const handleGuidelinesDismiss = () => {
    setShowGuidelines(false);
    nudgeHelp();
  };

  const endRevisit = () => {
    const back = revisitReturnIndex.current;
    revisitReturnIndex.current = null;
    if (back !== null) setCurrentItemIndex(back);
    setShowFootsteps(false);
    setPhase('roadmap');
  };

  const advanceToNextItem = (justScored = 0) => {
    if (!data) return;
    if (revisitReturnIndex.current !== null) { endRevisit(); return; }
    const completedIdx = currentItemIndex;

    if (isGroupMap) {
      void mapRun.complete(completedIdx, justScored).then((next) => {
        if (!next) {
          setPhase('roadmap');
          return;
        }
        if (next.finished) {
          showPopupsOrRun('endOfActivity', undefined, () => setPhase('finish'));
          return;
        }
        setCurrentItemIndex(next.currentItemIndex);
        setPhase('roadmap');
      });
      return;
    }

    if (data.module.type === 'spiders') {
      const newCompleted = new Set([...completedSpiderItems, completedIdx]);
      setCompletedSpiderItems(newCompleted);
      const allDone = data.module.items.every((_, idx) => newCompleted.has(idx));
      if (allDone) {
        showPopupsOrRun('endOfActivity', undefined, () => {
          setPhase('finish');
        });
      } else {
        setPhase('roadmap');
      }
      return;
    }

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

  useEffect(() => {
    if (!isGroupMap || !mapRun.run || phase !== 'roadmap') return;
    if (mapRun.run.finished) {
      setPhase('finish');
      return;
    }
    setCurrentItemIndex(mapRun.run.currentItemIndex);
  }, [isGroupMap, mapRun.run, phase]);

  const spidersFinalItemIndex = data
    ? data.module.items.findIndex((it) => it.isFinal)
    : -1;

  const handleSpidersNodeTap = (index: number) => {
    if (entryTransitionStage !== 'idle') return;
    if (typeof lockedFromIndex === 'number' && index >= lockedFromIndex) return;

    if (spidersFinalItemIndex !== -1 && index === spidersFinalItemIndex) {
      const nonFinalCount = data!.module.items.length - 1;
      if (completedSpiderItems.size < nonFinalCount) return;
    }

    const goPlay = () => {
      setCurrentItemIndex(index);
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

    showPopupsOrRun('beforeItem', index, goPlay);
  };

  const handleNodeTap = (index: number) => {
    if (entryTransitionStage !== 'idle') return;
    if (typeof lockedFromIndex === 'number' && index >= lockedFromIndex) return;

    if (index !== currentItemIndex) {
      if (index >= currentItemIndex || !data?.module.items[index]?.revisitable) return;
      revisitReturnIndex.current = currentItemIndex;
      setCurrentItemIndex(index);
    }

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

  const singleItemAutoEntered = useRef(false);
  useEffect(() => {
    if (
      phase === 'roadmap' &&
      data &&
      data.module.items.length === 1 &&
      data.module.type !== 'spiders' &&
      data.module.type !== 'map' &&
      !singleItemAutoEntered.current
    ) {
      singleItemAutoEntered.current = true;
      itemStartTime.current = Date.now();
      setPhase('playing');
    }
  }, [phase, data]);

  const handleGameComplete = (result: GameResult) => {
    if (!data) return;
    if (revisitReturnIndex.current !== null) { endRevisit(); return; }
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
    const runningTotal = Math.max(
      0,
      scores.reduce((sum, s) => sum + s.score, 0) + result.score - stationHintUsed.size * stationHintPenalty,
    );

    if (code) {
      void apiFetchPersistSilent(`/api/activities/${code}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({
          itemResult,
          totalItemsCompleted: completedCount,
          lastActiveItemIndex: currentItemIndex,
          runningTotal,
        }),
      });
    }

    advanceToNextItem(result.score);
  };

  const handleOrderSurveySubmit = async (payload: OrderSurveySubmitPayload) => {
    if (!data || !code || revisitReturnIndex.current !== null) return;
    const currentItem = data.module.items[currentItemIndex];
    const now = new Date();
    const runningTotal = Math.max(
      0,
      scores.reduce((sum, s) => sum + s.score, 0) - stationHintUsed.size * stationHintPenalty,
    );
    const itemResult = {
      itemIndex: currentItemIndex,
      itemId: currentItem._id,
      itemType: 'game' as const,
      itemName: currentItem.name,
      gameType: 'order',
      score: 0,
      maxPossibleScore: 0,
      startedAt: new Date(itemStartTime.current),
      completedAt: now,
      durationMs: payload.durationMs,
      hintUsed: false,
      hintPenalty: 0,
      metadata: {
        orderSurvey: true,
        ranking: payload.ranking,
        items: payload.items,
        roundIndex: payload.roundIndex,
      },
    };

    await apiFetchPersistSilent(`/api/activities/${code}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({
        itemResult,
        totalItemsCompleted: currentItemIndex,
        lastActiveItemIndex: currentItemIndex,
        runningTotal,
      }),
    });
  };

  const handleOrderSurveyComplete = (result: GameResult) => {
    if (!data) return;
    if (revisitReturnIndex.current !== null) { endRevisit(); return; }
    const currentItem = data.module.items[currentItemIndex];
    const completedCount = currentItemIndex + 1;
    const runningTotal = Math.max(
      0,
      scores.reduce((sum, s) => sum + s.score, 0) - stationHintUsed.size * stationHintPenalty,
    );

    setScores((prev) => [
      ...prev,
      { itemIndex: currentItemIndex, gameName: currentItem.name, score: result.score },
    ]);

    if (code) {
      void apiFetchPersistSilent(`/api/activities/${code}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({
          progressOnly: true,
          totalItemsCompleted: completedCount,
          lastActiveItemIndex: currentItemIndex,
          runningTotal,
        }),
      });
    }

    advanceToNextItem();
  };

  const handleStationContinue = async () => {
    await saveItemProgress();
    advanceToNextItem();
  };

  const handleStationBackToRoadmap = () => {
    setPhase('roadmap');
  };

  const handleStationFinishActivity = async () => {
    if (revisitReturnIndex.current !== null) { endRevisit(); return; }
    await saveItemProgress();
    showPopupsOrRun('afterItem', currentItemIndex, () => {
      showPopupsOrRun('endOfActivity', undefined, () => {
        setPhase('finish');
      });
    });
  };

  const handleFeedbackContinue = async (feedbackResult: { answers: { questionIndex: number; questionText: string; value: number; label: string }[]; notes: string }) => {
    if (!data) return;
    if (revisitReturnIndex.current !== null) { endRevisit(); return; }
    const currentItem = data.module.items[currentItemIndex];
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
      await apiFetchPersistSilent(`/api/activities/${code}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({
          itemResult,
          totalItemsCompleted: completedCount,
          lastActiveItemIndex: currentItemIndex,
          runningTotal,
        }),
      });
    }

    advanceToNextItem();
  };

  const toggleBallGameMute = useCallback(() => {
    setBallGameMuted((prev) => !prev);
    window.dispatchEvent(new CustomEvent('yooz:ballgame-audio-toggle'));
  }, []);

  const getStationHint = (item: ModuleItemData): { text: string; imageUrl: string; free: boolean } | null => {
    if (item.type !== 'station') return null;
    const station = item as StationItemData;
    if (['feedback', 'avatar', 'avatarQuiz'].includes(station.stationType)) return null;
    const hint = item.settings?.hint as { enabled?: boolean; text?: string; imageUrl?: string; free?: boolean } | undefined;
    if (!hint?.enabled || (!hint.text && !hint.imageUrl)) return null;
    return { text: hint.text || '', imageUrl: hint.imageUrl || '', free: !!hint.free };
  };

  const isCurrentStationHintFree = (): boolean =>
    !!(data && getStationHint(data.module.items[currentItemIndex])?.free);

  const handleStationHintClick = () => {
    if (isCurrentStationHintFree()) {
      setShowStationHintText(true);
      return;
    }
    if (stationHintUsed.has(currentItemIndex)) {
      setShowStationHintText(true);
      return;
    }
    setShowStationHintWarning(true);
  };

  const applyTimePenalty = (penaltyMs: number) => {
    const newStart = sessionStartedAt.current - penaltyMs;
    sessionStartedAt.current = newStart;
    const token = localStorage.getItem('yooz_token') ?? 'anon';
    localStorage.setItem(`yooz_start_${code}_${token}`, String(newStart));
    setElapsedSeconds(Math.floor((Date.now() - newStart) / 1000));
  };

  const confirmStationHint = () => {
    setShowStationHintWarning(false);
    if (stationHintUsed.has(currentItemIndex)) {
      setShowStationHintText(true);
      return;
    }
    if (!isCurrentStationHintFree()) {
      setStationHintUsed((prev) => new Set(prev).add(currentItemIndex));
      if (isTimeMode) {
        applyTimePenalty(GAME_CONSTANTS.HINT_TIME_PENALTY_MS);
      }
    }
    setShowStationHintText(true);
  };

  const handleEnteringTextSolutionHintUsed = () => {
    if (isCurrentStationHintFree()) return;
    applyTimePenalty(GAME_CONSTANTS.SOLUTION_HINT_TIME_PENALTY_MS);
  };

  const scoresUrl = code ? `/api/activities/${code}/scores` : '';
  const saveScoresBodyRef = useRef('');

  const attemptSaveScores = useCallback(async () => {
    if (!code || !scoresUrl || scoresSaved.current) return;
    setScoresSaveStatus('pending');
    const ok = await apiFetchPersistSilent(scoresUrl, {
      method: 'POST',
      body: saveScoresBodyRef.current,
    });
    if (ok) {
      scoresSaved.current = true;
      setScoresSaveStatus('saved');
    } else {
      setScoresSaveStatus('queued');
    }
  }, [code, scoresUrl]);

  const scoresWereQueued = useRef(false);

  useEffect(() => {
    if (!scoresUrl) return;
    return subscribeOfflineQueue(() => {
      if (phase !== 'finish') return;
      if (isRequestQueued(scoresUrl, 'POST')) {
        scoresSaved.current = false;
        scoresWereQueued.current = true;
        setScoresSaveStatus('queued');
      } else if (scoresSaved.current || scoresWereQueued.current) {
        scoresSaved.current = true;
        scoresWereQueued.current = false;
        setScoresSaveStatus('saved');
      }
    });
  }, [phase, scoresUrl]);

  useEffect(() => {
    if (phase !== 'finish' || scoresSaved.current || !code) return;

    const totalHintPen = stationHintUsed.size * stationHintPenalty;
    const scorePayload = scores.map((s) => ({ gameName: s.gameName, score: s.score }));
    if (totalHintPen > 0) {
      scorePayload.push({ gameName: 'Hint Penalty', score: -totalHintPen });
    }

    saveScoresBodyRef.current = JSON.stringify({
      scores: scorePayload,
      sessionDurationMs: Date.now() - sessionStartedAt.current,
    });

    void attemptSaveScores();
    const interval = setInterval(() => {
      if (scoresSaved.current) {
        clearInterval(interval);
        return;
      }
      void attemptSaveScores();
    }, 15_000);

    return () => clearInterval(interval);
  }, [phase, code, scores, stationHintUsed, stationHintPenalty, attemptSaveScores]);

  const leaderboardAbortRef = useRef<AbortController | null>(null);
  const fetchLeaderboard = useCallback(async () => {
    if (!code) return;
    leaderboardAbortRef.current?.abort();
    const controller = new AbortController();
    leaderboardAbortRef.current = controller;
    setLeaderboardLoading(true);
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const res = await fetch(`/api/activities/${code}/leaderboard`, { signal: controller.signal });
          if (res.ok) {
            const d = await res.json();
            setLeaderboard(d.leaderboard || []);
            setGroupLeaderboard(d.groups || []);
            return;
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
      setLeaderboard([]);
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

  const [isGolfChallengeActive, setIsGolfChallengeActive] = useState(false);

  useEffect(() => {
    const onGolfVisibility = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean }>).detail;
      setIsGolfChallengeActive(Boolean(detail?.active));
    };
    window.addEventListener('yooz:order-golf-visibility', onGolfVisibility as EventListener);
    return () => {
      window.removeEventListener('yooz:order-golf-visibility', onGolfVisibility as EventListener);
    };
  }, []);

  const activeItemForUi = data?.module.items[currentItemIndex];
  const activeGameType = phase === 'playing' && activeItemForUi?.type === 'game'
    ? (activeItemForUi as { gameType?: string }).gameType
    : undefined;
  const isBallGameActive = activeGameType === 'ballGame';
  const isTriviaGameActive = activeGameType === 'trivia';

  useEffect(() => {
    document.body.classList.toggle('yooz-ballgame-active', isBallGameActive);
    window.dispatchEvent(new CustomEvent('yooz:ballgame-visibility', { detail: { active: isBallGameActive } }));
    return () => {
      document.body.classList.remove('yooz-ballgame-active');
      window.dispatchEvent(new CustomEvent('yooz:ballgame-visibility', { detail: { active: false } }));
    };
  }, [isBallGameActive]);

  const themeShellColor = getThemeShellColor(data?.module.theme);
  const customBgColor = data?.module.customTheme?.bgColor;
  const isTextVideoImageStation = phase === 'playing' &&
    activeItemForUi?.type === 'station' &&
    ['text', 'video', 'image'].includes((activeItemForUi as StationItemData).stationType);
  const isMissionActive = phase === 'playing' && activeItemForUi?.type === 'mission';
  const activeThemeTopColor = (() => {
    if (isTriviaGameActive) return TRIVIA_BROWSER_PURPLE;
    if (activeGameType === 'puzzle') return PUZZLE_BROWSER_GREEN;
    if (activeGameType === 'ballGame') return BALL_BROWSER_BLUE;
    if (activeGameType === 'order') {
      return isGolfChallengeActive ? GOLF_BROWSER_GREEN : ORDER_BROWSER_ORANGE;
    }
    if (activeGameType === 'trashSort') return '#0f1923';
    if (isMissionActive) return '#ffffff';
    if (isTextVideoImageStation) return customBgColor || getThemeSkyColor(data?.module.theme);
    return customBgColor || themeShellColor;
  })();
  const activeThemeBottomColor = isTextVideoImageStation
    ? (customBgColor || getThemeGroundColor(data?.module.theme))
    : activeThemeTopColor;
  useEffect(() => {
    const body = document.body;
    const prevBodyBg = body.style.backgroundColor;

    body.style.backgroundColor = activeThemeBottomColor;

    const metas = document.querySelectorAll('meta[name="theme-color"]') as NodeListOf<HTMLMetaElement>;
    const prevThemes = Array.from(metas).map((m) => m.content);
    metas.forEach((m) => { m.content = activeThemeTopColor; });

    return () => {
      body.style.backgroundColor = prevBodyBg;
      metas.forEach((m, i) => { m.content = prevThemes[i]; });
    };
  }, [activeThemeTopColor, activeThemeBottomColor]);

  if (loading) {
    return (
      <PageShell shellColor="#8B2FC9">
        <FullScreenLoader>
          <LoaderWave aria-label={t.loading}>
            <span>Y</span>
            <span>o</span>
            <span>o</span>
            <span>z</span>
          </LoaderWave>
        </FullScreenLoader>
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
      <PageShell shellColor="#8B2FC9">
        <FullScreenLoader>
          <LoaderWave aria-label={t.loading}>
            <span>Y</span>
            <span>o</span>
            <span>o</span>
            <span>z</span>
          </LoaderWave>
        </FullScreenLoader>
      </PageShell>
    );
  }

  const bgStyle = data.module.backgroundImage
    ? {
        backgroundImage: `url(${data.module.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};

  const activityTheme = data.module.theme;
  const transitionBg = getThemeTransitionBackground(activityTheme);

  const timeWarningPopup = showTimeWarning ? (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '28px 32px', maxWidth: 340, width: '90%',
        textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', 
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏰</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 20, color: '#333', fontWeight: 700 }}>{t.oneMinuteTitle}</h3>
        <p style={{ margin: '0 0 20px', fontSize: 15, color: '#666' }}>{t.oneMinuteBody}</p>
        <button
          onClick={() => setShowTimeWarning(false)}
          style={{
            padding: '10px 32px', borderRadius: 10, border: 'none',
            background: '#e74c3c', color: '#fff', fontSize: 15, cursor: 'pointer', fontWeight: 700,
          }}
        >
          {t.oneMinuteDismiss}
        </button>
      </div>
    </div>
  ) : null;

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
        <PopupDismissButton type="button" onClick={handleDismissClick} onPointerUp={handleDismissPointerUp}>
          <span>{t.popupDismiss}</span>
        </PopupDismissButton>
      </PopupModalCard>
    </PopupModalOverlay>
  ) : null;

  if (phase === 'roadmap') {
    const isSingleItem = data.module.items.length === 1;

    if (isSingleItem && data.module.type !== 'spiders' && data.module.type !== 'map') return null;

    const roadmapTotalPoints = Math.max(
      0,
      scores.reduce((sum, s) => sum + s.score, 0) - stationHintUsed.size * stationHintPenalty,
    );

    if (data.module.type === 'map') {
      return (
        <>
          <MapView
            items={data.module.items}
            currentItemIndex={currentItemIndex}
            completedIndices={
              mapRun.run?.completedIndices
              ?? Array.from({ length: currentItemIndex }, (_, i) => i)
            }
            others={mapRun.others}
            fix={mapRun.fix}
            geoError={mapRun.geoError}
            proximityMeters={data.module.proximityMeters}
            onArrive={() => handleNodeTap(currentItemIndex)}
            t={t}
          />
          {showGuidelines && progressChecked && !currentPopup && (
            <GuidelinesPopup
              itemCount={data.module.items.length}
              guidelines={data.guidelines}
              customInstructions={data.customInstructions}
              onDismiss={handleGuidelinesDismiss}
              t={t}
            />
          )}
          {popupModal}
        </>
      );
    }

    if (data.module.type === 'spiders') {
      return (
        <>
          <SpidersView
            items={data.module.items}
            completedItemIndices={completedSpiderItems}
            currentPoints={roadmapTotalPoints}
            onNodeTap={handleSpidersNodeTap}
            onLogout={doExit}
            onViewLeaderboard={handleViewLeaderboard}
            hideLeaderboardInHeader={data.hideLeaderboardInHeader}
            popupModal={popupModal}
            t={t}
            theme={data.module.theme}
            customTheme={data.module.customTheme}
            showStationNumbers={data.module.showStationNumbers}
            leaderboardMode={data.leaderboardMode}
            elapsedSeconds={elapsedSeconds}
            activityDurationMinutes={data.activityDurationMinutes}
            roadmapTimerMinutes={data.roadmapTimerMinutes}
            finalItemIndex={spidersFinalItemIndex !== -1 ? spidersFinalItemIndex : undefined}
            lockedFromIndex={lockedFromIndex}
          />
          {showGuidelines && progressChecked && !currentPopup && (
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
          {timeWarningPopup}
        </>
      );
    }

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
          hideLeaderboardInHeader={data.hideLeaderboardInHeader}
          popupModal={popupModal}
          t={t}
          theme={data.module.theme}
          customTheme={data.module.customTheme}
          leaderboardMode={data.leaderboardMode}
          elapsedSeconds={elapsedSeconds}
          activityDurationMinutes={data.activityDurationMinutes}
          roadmapTimerMinutes={data.roadmapTimerMinutes}
          lockedFromIndex={lockedFromIndex}
          activityNameOnRoadmap={data.includeOnRoadmap ? data.name : undefined}
        />
        {showGuidelines && progressChecked && !currentPopup && (
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
        {timeWarningPopup}
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
          completedItems={data.module.type === 'spiders' ? completedSpiderItems.size : data.module.items.length}
          countdown={countdown}
          countdownSeconds={GAME_CONSTANTS.FINISH_COUNTDOWN_SECONDS}
          bgStyle={bgStyle}
          leaderboardMode={data.leaderboardMode}
          hideLeaderboardInHeader={data.hideLeaderboardInHeader}
          finalDurationMs={finalDurationMs}
          onStay={() => {
            userStayedRef.current = true;
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
            setCountdown(null);
          }}
          onViewLeaderboard={handleViewLeaderboard}
          onExit={handleExit}
          scoresSaveStatus={scoresSaveStatus}
          onRetrySaveScores={() => { void attemptSaveScores(); }}
          popupModal={popupModal}
          t={t}
        />
        {entryTransitionStage !== 'idle' && (
          <SceneTransitionOverlay stage={entryTransitionStage} transitionBg={transitionBg} />
        )}
        {timeWarningPopup}
      </>
    );
  }

  if (phase === 'leaderboard') {
    return (
      <>
        <LeaderboardView
          languages={data.languages}
          showAllGroups={isMap}
          activityName={data.name}
          leaderboard={leaderboard}
          groupLeaderboard={groupLeaderboard}
          currentGroup={participant?.group}
          currentParticipantName={participant?.name}
          isLoading={leaderboardLoading}
          bgStyle={bgStyle}
          leaderboardMode={data.leaderboardMode}
          leaderboardAsGrade={data.leaderboardAsGrade}
          onBack={handleBackFromLeaderboard}
          onLogout={handleExit}
          t={t}
        />
        {entryTransitionStage !== 'idle' && (
          <SceneTransitionOverlay stage={entryTransitionStage} transitionBg={transitionBg} />
        )}
        {timeWarningPopup}
      </>
    );
  }

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
            <LangDrawer variant="darkHeader" only={data?.languages ?? []} />
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
            onClick={() => navigate(participantPlayPath(code), { replace: true })}
          >
            {t.backToHome}
          </OutlineButton>
        </CenteredContent>
        {popupModal}
        {timeWarningPopup}
      </div>
    );
  }

  const currentItem = data.module.showItemTitleNumbers
    ? { ...data.module.items[currentItemIndex], name: `${currentItemIndex + 1}. ${data.module.items[currentItemIndex].name}` }
    : data.module.items[currentItemIndex];
  const currentItemHint = getStationHint(currentItem);
  const playingTotalPoints = Math.max(
    0,
    scores.reduce((sum, s) => sum + s.score, 0) - stationHintUsed.size * stationHintPenalty,
  );

  return (
    <>
      <ActivityPlayingHeaderProvider>
      <PlayingPhase
        currentItem={currentItem}
        currentItemIndex={currentItemIndex}
        stationHintText={currentItemHint?.text || null}
        stationHintImageUrl={currentItemHint?.imageUrl || null}
        stationHintUsed={stationHintUsed.has(currentItemIndex)}
        bgStyle={bgStyle}
        theme={data.module.theme}
        customTheme={data.module.customTheme}
        code={code}
        onGameComplete={handleGameComplete}
        onOrderSurveySubmit={handleOrderSurveySubmit}
        onOrderSurveyComplete={handleOrderSurveyComplete}
        onLogout={handleExit}
        onViewLeaderboard={handleViewLeaderboard}
        hideLeaderboardInHeader={data.hideLeaderboardInHeader}
        currentPoints={playingTotalPoints}
        onStationContinue={handleStationContinue}
        onStationBackToRoadmap={handleStationBackToRoadmap}
        onStationFinishActivity={handleStationFinishActivity}
        onFeedbackContinue={handleFeedbackContinue}
        onBallGameMuteToggle={toggleBallGameMute}
        ballGameMuted={ballGameMuted}
        onStationHintClick={handleStationHintClick}
        showStationHintWarning={showStationHintWarning}
        showStationHintText={showStationHintText}
        onConfirmStationHint={confirmStationHint}
        onCloseHintWarning={() => setShowStationHintWarning(false)}
        onCloseHintText={() => setShowStationHintText(false)}
        onEnteringTextSolutionHintUsed={handleEnteringTextSolutionHintUsed}
        popupModal={popupModal}
        t={t}
        leaderboardMode={data.leaderboardMode}
        elapsedSeconds={elapsedSeconds}
        activityDurationMinutes={data.activityDurationMinutes}
        smsForCollage={data.smsForCollage}
      />
      </ActivityPlayingHeaderProvider>
      {entryTransitionStage !== 'idle' && (
        <SceneTransitionOverlay stage={entryTransitionStage} transitionBg={transitionBg} />
      )}
      {showGuidelines && progressChecked && !currentPopup && data.module.items.length === 1 && (
        <GuidelinesPopup
          itemCount={data.module.items.length}
          guidelines={data.guidelines}
          customInstructions={data.customInstructions}
          onDismiss={handleGuidelinesDismiss}
          t={t}
        />
      )}

      {timeWarningPopup}

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
