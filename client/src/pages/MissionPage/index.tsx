import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslations } from '../../context/LanguageContext';
import { apiFetch, apiFetchWithRetry } from '../../utils/api';
import { texts } from './MissionPage.i18n';
import {
  MissionWrapper,
  FrameContainer,
  FrameHeaderOverlay,
  FrameFooterOverlay,
  MissionHeader,
  HeaderText,
  MissionContent,
  DescriptionText,
  ScreenImage,
  MissionButton,
} from './MissionFrame';
import MissionPuzzle from './MissionPuzzle';
import MissionTrashSort from './MissionTrashSort';
import MissionTopMenu from './MissionTopMenu';
import { useMissionSounds } from './useMissionSounds';
import { styled, keyframes } from '@mui/material/styles';

function useFrameReady(imageSrcs: string[]) {
  const [ready, setReady] = useState(false);
  const attempted = useRef(false);
  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    let loaded = 0;
    const total = imageSrcs.length;
    if (total === 0) { setReady(true); return; }
    imageSrcs.forEach((src) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded >= total) setReady(true);
      };
      img.src = src;
    });
  }, [imageSrcs]);
  return ready;
}

const API = import.meta.env.VITE_API_URL || '';

// ─── Types ───

interface MissionScreen {
  header?: string;
  description?: string;
  buttonText?: string;
  image?: string;
  backgroundImage?: string;
}

interface PuzzleConfig {
  completeHeader?: string;
  completeButton?: string;
}

interface TrashSortConfig {
  title?: string;
  description?: string;
  scoreLabel?: string;
  gameFinalText?: string;
  completeHeader?: string;
  completeButton?: string;
  badgeHeader?: string;
  badgeCurveText?: string;
  badgeAwardText?: string;
  badgeAchievementText?: string;
  shareButton?: string;
  continueButton?: string;
}

interface MissionData {
  _id: string;
  name: string;
  explanationScreens: MissionScreen[];
  puzzleConfig?: PuzzleConfig;
  trashSortConfig?: TrashSortConfig;
}

interface MissionModule {
  type: 'mission';
  mission: MissionData;
}

// ─── Loading animation ───

const pulse = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`;

const LoadingWrapper = styled('div')({
  minHeight: '100dvh',
  background: '#1a0a2e',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const LoadingDots = styled('div')({
  display: 'flex',
  gap: 8,
  '& span': {
    width: 12,
    height: 12,
    borderRadius: '50%',
    background: '#39CABC',
    animation: `${pulse} 1.4s infinite ease-in-out`,
  },
  '& span:nth-of-type(2)': { animationDelay: '0.2s' },
  '& span:nth-of-type(3)': { animationDelay: '0.4s' },
});

const ErrorWrapper = styled('div')({
  minHeight: '100dvh',
  background: '#1a0a2e',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#F2F7FF',
  fontSize: 18,
  textAlign: 'center',
  padding: 24,
  direction: 'rtl',
  fontFamily: "'Rubik', sans-serif",
  gap: 16,
});

const RetryButton = styled('button')({
  padding: '12px 28px',
  fontSize: 16,
  fontWeight: 700,
  color: '#1a0a2e',
  background: '#39CABC',
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

// ─── Session helpers ───

type Phase = 'screens' | 'puzzle' | 'done';

function sessionKey(code: string) { return `mission_${code}`; }

function loadSession(code: string): { phase: Phase; currentScreen: number } {
  try {
    const raw = sessionStorage.getItem(sessionKey(code));
    if (raw) {
      const data = JSON.parse(raw);
      return { phase: data.phase ?? 'screens', currentScreen: data.currentScreen ?? 0 };
    }
  } catch { /* ignore */ }
  return { phase: 'screens', currentScreen: 0 };
}

function saveSession(code: string, phase: Phase, currentScreen: number) {
  sessionStorage.setItem(sessionKey(code), JSON.stringify({ phase, currentScreen }));
}

// ─── Component ───

const FRAME_IMAGES = ['/images/mission-frame.svg', '/images/mission-header.svg', '/images/mission-footer.svg'];

const BROWSER_CHROME_COLOR = '#1a0a2e';

export default function MissionPage() {
  const { code } = useParams<{ code: string }>();
  const { participant } = useAuth();
  const t = useTranslations(texts);
  const sounds = useMissionSounds();
  const [mission, setMission] = useState<MissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const saved = loadSession(code || '');
  const [currentScreen, setCurrentScreen] = useState(saved.currentScreen);
  const [phase, setPhase] = useState<Phase>(saved.phase);
  const frameReady = useFrameReady(FRAME_IMAGES);
  const sessionStartRef = useRef(Date.now());
  const puzzleStartRef = useRef(Date.now());


  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevBodyBg = body.style.backgroundColor;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyWidth = body.style.width;
    const prevBodyHeight = body.style.height;
    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlHeight = html.style.height;

    body.style.backgroundColor = BROWSER_CHROME_COLOR;
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.width = '100%';
    body.style.height = '100%';
    html.style.overflow = 'hidden';
    html.style.height = '100%';

    const preventScroll = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest?.('[data-scrollable]')) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventScroll, { passive: false });

    const metas = document.querySelectorAll('meta[name="theme-color"]') as NodeListOf<HTMLMetaElement>;
    const prevThemes = Array.from(metas).map((m) => m.content);
    metas.forEach((m) => { m.content = 'transparent'; });

    return () => {
      body.style.backgroundColor = prevBodyBg;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.width = prevBodyWidth;
      body.style.height = prevBodyHeight;
      html.style.overflow = prevHtmlOverflow;
      html.style.height = prevHtmlHeight;
      metas.forEach((m, i) => { m.content = prevThemes[i]; });
      document.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  // Fetch mission module data
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    const fetchMission = async () => {
      setError('');
      setLoading(true);
      try {
        const data = await apiFetchWithRetry<{ module: MissionModule }>(
          `/api/activities/${code}/module`,
        );
        if (cancelled) return;
        const mod = data.module;
        if (mod.type !== 'mission' || !mod.mission) {
          throw new Error(t.errorNotMission);
        }
        setMission(mod.mission);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t.errorLoad);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchMission();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, loadAttempt]);

  // Persist session on phase/screen changes
  useEffect(() => {
    if (code) saveSession(code, phase, currentScreen);
  }, [code, phase, currentScreen]);

  // Track when puzzle phase starts
  useEffect(() => {
    if (phase === 'puzzle') {
      puzzleStartRef.current = Date.now();
    }
  }, [phase]);

  const savePuzzleProgress = useCallback(async () => {
    if (!code) return;
    fetch(`${API}/api/activities/${code}/mission-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'puzzle_completed' }),
    }).catch(() => {});

    const now = new Date();
    await apiFetchWithRetry(`${API}/api/activities/${code}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({
        itemResult: {
          itemIndex: 0,
          itemType: 'game',
          itemName: 'Puzzle',
          score: 0,
          maxPossibleScore: 0,
          startedAt: new Date(puzzleStartRef.current),
          completedAt: now,
          durationMs: now.getTime() - puzzleStartRef.current,
        },
        totalItemsCompleted: 1,
        lastActiveItemIndex: 0,
        runningTotal: 0,
      }),
    });
  }, [code]);

  const handleTrashSortComplete = useCallback(async (score: number) => {
    if (!code) return;
    const sessionDurationMs = Date.now() - sessionStartRef.current;
    try {
      await apiFetchWithRetry(`${API}/api/activities/${code}/scores`, {
        method: 'POST',
        body: JSON.stringify({
          scores: [{ gameName: 'Trash Sort', score }],
          sessionDurationMs,
        }),
      });
    } catch { /* session is in sessionStorage — user can retry by replaying finish */ }
  }, [code]);

  const handleNext = useCallback(() => {
    if (!mission) return;
    sounds.playClick();
    sounds.startBg(); // starts on first user interaction
    if (currentScreen < mission.explanationScreens.length - 1) {
      setCurrentScreen((prev) => prev + 1);
    } else {
      // Explanation screens done → start the puzzle
      setPhase('puzzle');
    }
  }, [mission, currentScreen, sounds]);

  const handlePuzzleComplete = useCallback(async () => {
    await savePuzzleProgress();
    setPhase('done');
  }, [savePuzzleProgress]);

  if (loading || !frameReady) {
    return (
      <LoadingWrapper>
        <LoadingDots>
          <span /><span /><span />
        </LoadingDots>
      </LoadingWrapper>
    );
  }

  if (error || !mission) {
    return (
      <ErrorWrapper>
        <div>{error || t.errorNotFound}</div>
        {error && (
          <>
            <div style={{ fontSize: 14, opacity: 0.85 }}>{t.errorMessage}</div>
            <RetryButton type="button" onClick={() => setLoadAttempt((n) => n + 1)}>
              {t.retry}
            </RetryButton>
          </>
        )}
      </ErrorWrapper>
    );
  }

  // ─── Puzzle phase ───
  // The puzzle image is used as the blurred background in step 3 and during the puzzle
  const PUZZLE_BG = '/images/puzzle-env.png';

  if (phase === 'puzzle') {
    return (
      <MissionPuzzle
        onComplete={handlePuzzleComplete}
        backgroundImage={PUZZLE_BG}
        playCorrect={sounds.playCorrect}
        playWrong={sounds.playWrong}
        playClick={sounds.playClick}
        playComplete={sounds.playComplete}
        muted={sounds.muted}
        toggleMute={sounds.toggleMute}
        code={code}
        completeHeader={mission.puzzleConfig?.completeHeader}
        completeButton={mission.puzzleConfig?.completeButton}
      />
    );
  }

  // ─── Trash sort phase (Part 2 — after puzzle) ───
  if (phase === 'done') {
    return (
      <MissionTrashSort
        score={0}
        muted={sounds.muted}
        toggleMute={sounds.toggleMute}
        startTrashBg={sounds.startTrashBg}
        stopTrashBg={sounds.stopTrashBg}
        stopBg={sounds.stopBg}
        startBg={sounds.startBg}
        participantName={participant?.name}
        activityCode={code}
        onComplete={handleTrashSortComplete}
        title={mission.trashSortConfig?.title}
        description={mission.trashSortConfig?.description}
        scoreLabel={mission.trashSortConfig?.scoreLabel}
        gameFinalText={mission.trashSortConfig?.gameFinalText}
        completeHeader={mission.trashSortConfig?.completeHeader}
        completeButton={mission.trashSortConfig?.completeButton}
        badgeHeader={mission.trashSortConfig?.badgeHeader}
        badgeCurveText={mission.trashSortConfig?.badgeCurveText}
        badgeAwardText={mission.trashSortConfig?.badgeAwardText}
        badgeAchievementText={mission.trashSortConfig?.badgeAchievementText}
        shareButton={mission.trashSortConfig?.shareButton}
        continueButton={mission.trashSortConfig?.continueButton}
      />
    );
  }

  // ─── Explanation screens phase ───
  const screens = mission.explanationScreens;
  const screen = screens[currentScreen];

  if (!screen) {
    return <ErrorWrapper>{t.errorNoScreens}</ErrorWrapper>;
  }

  const hasHeader = !!screen.header;
  const hasDescription = !!screen.description;
  const hasImage = !!screen.image;
  const hasButton = !!screen.buttonText;

  // Step 3 (index 3) uses the puzzle image as blurred background
  const screenBg = currentScreen === 3 ? PUZZLE_BG : screen.backgroundImage;
  const showFrameHeaderFooter = currentScreen >= 3;

  return (
    <MissionWrapper key={currentScreen} bg={screenBg} step={currentScreen}>
      <FrameContainer>
        {showFrameHeaderFooter && (
          <>
            <FrameHeaderOverlay src="/images/mission-header.svg" alt="" />
            <FrameFooterOverlay src="/images/mission-footer.svg" alt="" />
          </>
        )}

        {/* Info menu (top-right): tap to open menu with mute/help/logout rows */}
        <MissionTopMenu toggleMute={sounds.toggleMute} muted={sounds.muted} />

        {/* Header - only shown if has content */}
        {hasHeader && (
          <MissionHeader>
            <HeaderText>{screen.header}</HeaderText>
          </MissionHeader>
        )}

        {/* Content */}
        <MissionContent>
          {hasDescription && (
            <DescriptionText step={currentScreen}>{screen.description}</DescriptionText>
          )}

          {hasImage && (
            <ScreenImage src={screen.image} alt="" />
          )}

        </MissionContent>

        {/* CTA Button - only shown if has text */}
        {hasButton && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <MissionButton step={currentScreen} onClick={handleNext}>
              {screen.buttonText}
            </MissionButton>
          </div>
        )}
      </FrameContainer>
    </MissionWrapper>
  );
}
