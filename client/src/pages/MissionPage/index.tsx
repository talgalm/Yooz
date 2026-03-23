import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslations } from '../../context/LanguageContext';
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
  MuteButton,
  MuteIcon,
  MutedSlash,
} from './MissionFrame';
import MissionPuzzle from './MissionPuzzle';
import MissionTrashSort from './MissionTrashSort';
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
  alignItems: 'center',
  justifyContent: 'center',
  color: '#F2F7FF',
  fontSize: 18,
  textAlign: 'center',
  padding: 24,
  direction: 'rtl',
  fontFamily: "'Rubik One', sans-serif",
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

const FRAME_IMAGES = ['/images/mission-frame.svg'];

const BROWSER_CHROME_COLOR = '#1a0a2e';

export default function MissionPage() {
  const { code } = useParams<{ code: string }>();
  const { token } = useAuth();
  const t = useTranslations(texts);
  const sounds = useMissionSounds();
  const [mission, setMission] = useState<MissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const saved = loadSession(code || '');
  const [currentScreen, setCurrentScreen] = useState(saved.currentScreen);
  const [phase, setPhase] = useState<Phase>(saved.phase);
  const frameReady = useFrameReady(FRAME_IMAGES);

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

    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    const prevTheme = meta?.content || '';
    if (meta) meta.content = BROWSER_CHROME_COLOR;

    return () => {
      body.style.backgroundColor = prevBodyBg;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.width = prevBodyWidth;
      body.style.height = prevBodyHeight;
      html.style.overflow = prevHtmlOverflow;
      html.style.height = prevHtmlHeight;
      if (meta) meta.content = prevTheme;
      document.removeEventListener('touchmove', preventScroll);
    };
  }, []);

  // Fetch mission module data
  useEffect(() => {
    if (!code) return;
    const fetchMission = async () => {
      try {
        const res = await fetch(`${API}/api/activities/${code}/module`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(t.errorLoad);
        const data = await res.json();
        const mod = data.module as MissionModule;
        if (mod.type !== 'mission' || !mod.mission) {
          throw new Error(t.errorNotMission);
        }
        setMission(mod.mission);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.errorLoad);
      } finally {
        setLoading(false);
      }
    };
    fetchMission();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, token]);

  // Persist session on phase/screen changes
  useEffect(() => {
    if (code) saveSession(code, phase, currentScreen);
  }, [code, phase, currentScreen]);

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

  const handlePuzzleComplete = useCallback(() => {
    setPhase('done');
  }, []);

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
    return <ErrorWrapper>{error || t.errorNotFound}</ErrorWrapper>;
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

  return (
    <MissionWrapper key={currentScreen} bg={screenBg} step={currentScreen}>
      <FrameContainer>
        {/* Decorative overlays — only from step 4 onward (index >= 3) */}
        {currentScreen >= 3 && <FrameHeaderOverlay src="/images/mission-header.svg" alt="" />}
        {currentScreen >= 3 && <FrameFooterOverlay src="/images/mission-footer.svg" alt="" />}

        {/* Mic / mute button */}
          <MuteButton onClick={sounds.toggleMute} aria-label={sounds.muted ? 'Unmute' : 'Mute'}>
            <MuteIcon src="/images/mic.svg" alt="" muted={sounds.muted} />
            {sounds.muted && <MutedSlash />}
          </MuteButton>
     

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
