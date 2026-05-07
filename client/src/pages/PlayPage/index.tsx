import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../context/AuthContext';
import { useTranslations } from '../../context/LanguageContext';
import { texts } from './PlayPage.i18n';
import ActivityLogin from '../../components/login/ActivityLogin';
import {
  CenteredPage,
  Card,
  BodyText,
  LoaderWave,
} from '../../components/styled';
import {
  OpeningOverlay,
  OpeningMedia,
  OpeningImage,
  SkipHint,
  PlayWithSoundButton,
  DefaultSplashOverlay,
  SplashLogo,
  PurpleLoginPage,
  LoginLogo,
  LoginHeading,
  LoginSubheading,
  LoginFormWrapper,
} from '../admin/styled';

type LoginField = 'email' | 'phoneNumber' | 'name';

interface GroupConfig {
  name: string;
}

interface OpeningConfig {
  type: 'video' | 'image';
  url: string;
}

interface ActivityConfig {
  code: string;
  name: string;
  loginFields: LoginField[];
  emailGoogle?: boolean;
  connectionType: 'single' | 'group';
  groups: GroupConfig[];
  opening?: OpeningConfig;
  scheduledStart?: string;
  scheduledEnd?: string;
  moduleType?: string;
}

type OpeningPhase = 'playing' | 'fading' | 'done';

const PurpleLoadingScreen = styled('div')({
  position: 'fixed',
  inset: 0,
  background: '#8B2FC9',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
});


const ScheduleScreen = styled('div')({
  position: 'fixed',
  inset: 0,
  background: '#8B2FC9',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
  color: '#fff',
  padding: 24,
  textAlign: 'center',
});

const ScheduleLogo = styled('img')({
  width: 160,
  marginBottom: 32,
});

const ScheduleTitle = styled('h1')({
  fontSize: 28,
  fontWeight: 700,
  margin: '0 0 16px',
});

const ScheduleSubtext = styled('p')({
  fontSize: 16,
  opacity: 0.85,
  margin: '0 0 32px',
});

const CountdownRow = styled('div')({
  display: 'flex',
  gap: 16,
  direction: 'ltr',
});

const CountdownUnit = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minWidth: 56,
});

const CountdownNumber = styled('span')({
  fontSize: 40,
  fontWeight: 800,
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
});

const CountdownLabel = styled('span')({
  fontSize: 13,
  opacity: 0.7,
  marginTop: 4,
});


export default function PlayPage() {
  const { code } = useParams<{ code: string }>();
  const [activity, setActivity] = useState<ActivityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();
  const t = useTranslations(texts);

  // Scheduling state
  const [scheduleStatus, setScheduleStatus] = useState<'pending' | 'active' | 'expired' | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Opening state
  const [openingPhase, setOpeningPhase] = useState<OpeningPhase>('playing');
  const [showDefaultSplash, setShowDefaultSplash] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fadeStartedRef = useRef(false);
  const hasOpening = activity?.opening?.url;
  const openingType = activity?.opening?.type;

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    setNotFound(false);
    setSlowLoad(false);

    const slowTimer = setTimeout(() => {
      if (!cancelled) setSlowLoad(true);
    }, 4000);

    const fetchWithTimeout = async (attempt: number): Promise<void> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      try {
        const res = await fetch(`/api/activities/${code}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setActivity(data);
        if (!data.opening?.url) setShowDefaultSplash(true);
      } catch (err) {
        clearTimeout(timeoutId);
        if (cancelled) return;
        // Auto-retry once on network/timeout failures (handles cold-start / PM2 restart windows)
        if (attempt < 1) {
          await new Promise((r) => setTimeout(r, 1500));
          if (!cancelled) await fetchWithTimeout(attempt + 1);
          return;
        }
        setLoadError(true);
      }
    };

    fetchWithTimeout(0).finally(() => {
      if (!cancelled) {
        clearTimeout(slowTimer);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [code, retryCount]);

  // Check scheduling and run countdown
  useEffect(() => {
    if (!activity) return;
    const now = new Date();
    const start = activity.scheduledStart ? new Date(activity.scheduledStart) : null;
    const end = activity.scheduledEnd ? new Date(activity.scheduledEnd) : null;

    if (end && now >= end) {
      setScheduleStatus('expired');
      return;
    }
    if (start && now < start) {
      setScheduleStatus('pending');
      const tick = () => {
        const diff = Math.max(0, new Date(activity.scheduledStart!).getTime() - Date.now());
        if (diff <= 0) {
          setScheduleStatus('active');
          return;
        }
        setCountdown({
          days: Math.floor(diff / 86400000),
          hours: Math.floor((diff % 86400000) / 3600000),
          minutes: Math.floor((diff % 3600000) / 60000),
          seconds: Math.floor((diff % 60000) / 1000),
        });
      };
      tick();
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }
    setScheduleStatus('active');
  }, [activity]);

  const startFadeOut = useCallback(() => {
    if (fadeStartedRef.current) return;
    fadeStartedRef.current = true;
    setOpeningPhase('fading');
    setTimeout(() => {
      setOpeningPhase('done');
    }, 1200); // match CSS transition duration
  }, []);

  // Auto-fade: 1.5s for default splash, 5s for image opening.
  // Video openings wait for the user to press play; fade-out is then triggered by onEnded.
  useEffect(() => {
    if (openingPhase !== 'playing') return;
    if (!hasOpening && !showDefaultSplash) return;
    if (hasOpening && openingType === 'video') return;
    const delay = showDefaultSplash ? 1500 : 5000;
    const timer = setTimeout(startFadeOut, delay);
    return () => clearTimeout(timer);
  }, [hasOpening, openingType, showDefaultSplash, openingPhase, startFadeOut]);

  // Lock body scroll while opening is visible
  useEffect(() => {
    if ((hasOpening || showDefaultSplash) && openingPhase !== 'done') {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [hasOpening, showDefaultSplash, openingPhase]);

  const handleVideoEnded = () => {
    startFadeOut();
  };

  const handleOpeningClick = () => {
    // Don't let an outside click skip the splash before the user has chosen
    // to start the video — they need to press the play button first.
    if (hasOpening && openingType === 'video' && !videoStarted) return;
    if (openingPhase === 'playing') {
      startFadeOut();
    }
  };

  const handleStartVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    try { v.currentTime = 0; } catch {}
    setVideoStarted(true);
    v.play().catch(() => {});
  };

  const handleSuccess = () => {
    if (activity?.moduleType === 'mission') {
      navigate(`/mission/${activity.code}`);
    } else if (activity?.moduleType === 'story' || activity?.moduleType === 'spiders') {
      navigate(`/story/${activity.code}`);
    } else {
      navigate('/home');
    }
  };

  if (loading) {
    return (
      <PurpleLoadingScreen>
        <LoaderWave aria-label={t.loading}>
          <span>z</span>
          <span>o</span>
          <span>o</span>
          <span>Y</span>
        </LoaderWave>
        {slowLoad && (
          <div style={{ position: 'absolute', bottom: 80, color: '#fff', opacity: 0.85, fontSize: 14 }}>
            {t.stillLoading}
          </div>
        )}
      </PurpleLoadingScreen>
    );
  }

  if (loadError) {
    return (
      <CenteredPage>
        <Card>
          <img src="/images/logo-purple.png" alt="Yooz" style={{ width: 120, marginBottom: 16 }} />
          <BodyText style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>{t.loadFailed}</BodyText>
          <BodyText style={{ marginBottom: 16 }}>{t.loadFailedMessage}</BodyText>
          <button
            onClick={() => setRetryCount((n) => n + 1)}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 600,
              color: '#fff',
              background: '#8B2FC9',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t.retry}
          </button>
        </Card>
      </CenteredPage>
    );
  }

  if (notFound || !activity) {
    return (
      <CenteredPage>
        <Card>
          <img src="/images/logo-purple.png" alt="Yooz" style={{ width: 120, marginBottom: 16 }} />
          <BodyText style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>{t.notFound}</BodyText>
          <BodyText>{t.notFoundMessage}</BodyText>
        </Card>
      </CenteredPage>
    );
  }

  // Wait for schedule check to resolve
  if (scheduleStatus === null && (activity.scheduledStart || activity.scheduledEnd)) {
    return (
      <PurpleLoadingScreen>
        <LoaderWave aria-label={t.loading}>
          <span>z</span><span>o</span><span>o</span><span>Y</span>
        </LoaderWave>
      </PurpleLoadingScreen>
    );
  }

  // Show scheduling screens
  if (scheduleStatus === 'expired') {
    return (
      <ScheduleScreen>
        <ScheduleLogo src="/images/logo-white.png" alt="Yooz" />
        <ScheduleTitle>{t.activityExpired}</ScheduleTitle>
        <ScheduleSubtext>{t.activityExpiredMessage}</ScheduleSubtext>
      </ScheduleScreen>
    );
  }

  if (scheduleStatus === 'pending') {
    return (
      <ScheduleScreen>
        <ScheduleLogo src="/images/logo-white.png" alt="Yooz" />
        <ScheduleTitle>{t.activityNotOpenYet}</ScheduleTitle>
        <ScheduleSubtext>{t.opensIn}</ScheduleSubtext>
        <CountdownRow>
          {countdown.days > 0 && (
            <CountdownUnit>
              <CountdownNumber>{countdown.days}</CountdownNumber>
              <CountdownLabel>{t.days}</CountdownLabel>
            </CountdownUnit>
          )}
          <CountdownUnit>
            <CountdownNumber>{String(countdown.hours).padStart(2, '0')}</CountdownNumber>
            <CountdownLabel>{t.hours}</CountdownLabel>
          </CountdownUnit>
          <CountdownUnit>
            <CountdownNumber>{String(countdown.minutes).padStart(2, '0')}</CountdownNumber>
            <CountdownLabel>{t.minutes}</CountdownLabel>
          </CountdownUnit>
          <CountdownUnit>
            <CountdownNumber>{String(countdown.seconds).padStart(2, '0')}</CountdownNumber>
            <CountdownLabel>{t.seconds}</CountdownLabel>
          </CountdownUnit>
        </CountdownRow>
      </ScheduleScreen>
    );
  }

  return (
    <>
      {/* Default splash — shown when activity has no opening media */}
      {showDefaultSplash && openingPhase !== 'done' && (
        <DefaultSplashOverlay
          fading={openingPhase === 'fading'}
          onClick={handleOpeningClick}
        >
          <SplashLogo src="/images/logo-white.png" alt="Yooz" />
          <SkipHint>{t.tapToSkip}</SkipHint>
        </DefaultSplashOverlay>
      )}

      {/* Custom opening overlay */}
      {hasOpening && openingPhase !== 'done' && (
        <OpeningOverlay
          fading={openingPhase === 'fading'}
          onClick={handleOpeningClick}
        >
          {activity.opening!.type === 'video' ? (
            <>
              <OpeningMedia
                ref={videoRef}
                src={activity.opening!.url}
                playsInline
                preload="auto"
                muted={!videoStarted}
                onEnded={handleVideoEnded}
                onLoadedMetadata={(e) => {
                  // Force the first frame to paint so the splash isn't a black
                  // screen before the user presses play. iOS/Safari only renders
                  // a frame after currentTime moves.
                  const v = e.currentTarget;
                  if (!videoStarted && v.currentTime === 0) {
                    try { v.currentTime = 0.001; } catch {}
                  }
                }}
              />
              {!videoStarted && (
                <PlayWithSoundButton type="button" onClick={handleStartVideo}>
                  <span className="play-icon" aria-hidden="true">▶</span>
                  <span>{t.tapToStart}</span>
                </PlayWithSoundButton>
              )}
            </>
          ) : (
            <OpeningImage
              src={activity.opening!.url}
              alt=""
            />
          )}
          {(openingType !== 'video' || videoStarted) && (
            <SkipHint>{t.tapToSkip}</SkipHint>
          )}
        </OpeningOverlay>
      )}

      {/* Login page — full screen purple */}
      <PurpleLoginPage visible={openingPhase !== 'playing'}>
        <LoginLogo src="/images/logo-white.png" alt="Yooz" />
        <LoginHeading>{t.readyForAdventure}</LoginHeading>
        <LoginSubheading>{t.connectAndPlay}</LoginSubheading>
        <LoginFormWrapper>
          <ActivityLogin
            activityCode={activity.code}
            loginFields={activity.loginFields}
            emailGoogle={activity.emailGoogle}
            connectionType={activity.connectionType}
            groups={activity.groups}
            onSuccess={handleSuccess}
            onLogin={login}
          />
        </LoginFormWrapper>
      </PurpleLoginPage>

      {/* Keyframe animation for skip hint */}
      {(hasOpening || showDefaultSplash) && openingPhase !== 'done' && (
        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateX(-50%) translateY(10px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
        `}</style>
      )}

    </>
  );
}
