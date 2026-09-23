import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../context/AuthContext';
import { useTranslations, useLang } from '../../context/LanguageContext';
import { texts } from './PlayPage.i18n';
import ActivityLogin from '../../components/login/ActivityLogin';
import { apiFetchWithRetry } from '../../utils/api';
import { participantMissionPath, participantStoryPath, rememberActivityCode } from '../../utils/participantActivity';
import { startEarlyModulePrefetch } from '../../utils/earlyModulePrefetch';
import { participantImageUrl, participantVideoUrl } from '../../utils/participantMedia';
import { useMediaPreload } from '../../hooks/useMediaPreload';
import { GameLoadingSpinner } from '../../components/games/styled';
import GroupEntryChoice from '../../components/groupEntry/GroupEntryChoice';
import CreateGroupForm from '../../components/groupEntry/CreateGroupForm';
import GroupCreatedSuccess from '../../components/groupEntry/GroupCreatedSuccess';
import JoinExistingGroupForm from '../../components/groupEntry/JoinExistingGroupForm';
import JoinGroupLogin from '../../components/groupEntry/JoinGroupLogin';
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
import LangDrawer from '../../components/LangDrawer';
import { rememberActivityLanguages } from '../../utils/activityLanguages';

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
  groupEntryMode?: 'preset' | 'selfService';
  groups: GroupConfig[];
  opening?: OpeningConfig;
  scheduledStart?: string;
  scheduledEnd?: string;
  moduleType?: string;
  /** Languages this activity was prepared in besides Hebrew. */
  languages?: string[];
}

type GroupFlow = 'choice' | 'create' | 'join-paste' | 'join-login' | 'success';

type OpeningPhase = 'playing' | 'fading' | 'done';

const OpeningRetryWrap = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  minHeight: 200,
  padding: 24,
  textAlign: 'center',
  color: '#fff',
});

const OpeningRetryButton = styled('button')({
  padding: '12px 24px',
  background: '#fff',
  color: '#4c1d95',
  border: 'none',
  borderRadius: 50,
  fontSize: 14,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
});

interface CustomOpeningOverlayProps {
  activity: ActivityConfig;
  openingPhase: OpeningPhase;
  openingType: 'video' | 'image' | undefined;
  videoStarted: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  t: Record<string, string>;
  onOverlayClick: () => void;
  onVideoEnded: () => void;
  onStartVideo: (e: React.MouseEvent) => void;
}

function CustomOpeningOverlay({
  activity,
  openingPhase,
  openingType,
  videoStarted,
  videoRef,
  t,
  onOverlayClick,
  onVideoEnded,
  onStartVideo,
}: CustomOpeningOverlayProps) {
  const opening = activity.opening!;
  const mediaUrl = opening.type === 'video'
    ? participantVideoUrl(opening.url)
    : participantImageUrl(opening.url);
  const { ready, failed, retry } = useMediaPreload([mediaUrl]);

  return (
    <OpeningOverlay
      fading={openingPhase === 'fading'}
      onClick={onOverlayClick}
    >
      {!ready && !failed && <GameLoadingSpinner />}
      {failed && (
        <OpeningRetryWrap>
          <BodyText style={{ color: '#fff' }}>{t.mediaLoadSlow}</BodyText>
          <OpeningRetryButton type="button" onClick={retry}>
            {t.mediaRetry}
          </OpeningRetryButton>
        </OpeningRetryWrap>
      )}
      {ready && opening.type === 'video' ? (
        <>
          <OpeningMedia
            ref={videoRef}
            src={participantVideoUrl(opening.url)}
            playsInline
            preload="auto"
            muted={!videoStarted}
            onEnded={onVideoEnded}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (!videoStarted && v.currentTime === 0) {
                try { v.currentTime = 0.001; } catch {}
              }
            }}
          />
          {!videoStarted && (
            <PlayWithSoundButton type="button" onClick={onStartVideo}>
              <span className="play-icon" aria-hidden="true">▶</span>
              <span>{t.tapToStart}</span>
            </PlayWithSoundButton>
          )}
        </>
      ) : ready ? (
        <OpeningImage
          src={participantImageUrl(opening.url)}
          alt=""
        />
      ) : null}
      {ready && (openingType !== 'video' || videoStarted) && (
        <SkipHint>{t.tapToSkip}</SkipHint>
      )}
    </OpeningOverlay>
  );
}

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
  const { code, inviteToken: inviteTokenParam } = useParams<{ code: string; inviteToken?: string }>();
  const [activity, setActivity] = useState<ActivityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { login, establishSession, isAuthenticated, participant } = useAuth();
  const navigate = useNavigate();
  const t = useTranslations(texts);
  const { restrictToLanguages } = useLang();
  const resumeCheckedForCode = useRef<string | null>(null);

  const isSelfService = activity?.connectionType === 'group' && activity?.groupEntryMode === 'selfService';
  const [groupFlow, setGroupFlow] = useState<GroupFlow | null>(inviteTokenParam ? 'join-login' : null);
  const [resolvedInvite, setResolvedInvite] = useState<{ token: string; name: string } | null>(null);
  const [inviteError, setInviteError] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<{ name: string; inviteUrl: string } | null>(null);

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
    if (!isAuthenticated) resumeCheckedForCode.current = null;
  }, [isAuthenticated]);

  // Remember activity as soon as the QR / link is opened (before login).
  useEffect(() => {
    if (code) rememberActivityCode(code);
  }, [code]);

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
        // The screens after login need the same answer and fetch nothing else,
        // and the interface narrows to it straight away rather than on the next
        // navigation - this is the screen the participant is already reading.
        rememberActivityLanguages(data.code, data.languages);
        restrictToLanguages(data.languages ?? []);
        if (!data.opening?.url) setShowDefaultSplash(true);
        if (
          data.connectionType === 'group'
          && data.groupEntryMode === 'selfService'
          && !inviteTokenParam
        ) {
          setGroupFlow('choice');
        }
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
  }, [code, retryCount, inviteTokenParam]);

  // Resolve invite token from URL
  useEffect(() => {
    if (!activity || !inviteTokenParam || activity.groupEntryMode !== 'selfService') return;
    let cancelled = false;
    setInviteError(false);
    fetch(`/api/activities/${encodeURIComponent(activity.code)}/groups/by-token/${encodeURIComponent(inviteTokenParam)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setInviteError(true);
          return;
        }
        const data = await res.json() as { name: string };
        setResolvedInvite({ token: inviteTokenParam, name: data.name });
        setGroupFlow('join-login');
      })
      .catch(() => {
        if (!cancelled) setInviteError(true);
      });
    return () => { cancelled = true; };
  }, [activity, inviteTokenParam]);

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

  const prefetchModuleIfNeeded = useCallback((activityCode: string, group = '') => {
    if (!activity?.moduleType) return;
    if (activity.moduleType === 'story' || activity.moduleType === 'spiders' || activity.moduleType === 'mission') {
      startEarlyModulePrefetch(activityCode, group);
    }
  }, [activity?.moduleType]);

  // Start downloading activity media while the login / opening screen is visible.
  useEffect(() => {
    if (!isAuthenticated || !activity?.code || scheduleStatus !== 'active') return;
    prefetchModuleIfNeeded(activity.code, participant?.group || '');
  }, [isAuthenticated, activity?.code, scheduleStatus, participant?.group, prefetchModuleIfNeeded]);

  // If the participant still has a valid token and saved progress, skip the login
  // screen and return them to the activity (e.g. after a connection drop).
  useEffect(() => {
    if (!isAuthenticated || !activity || !code || scheduleStatus !== 'active') return;
    if (resumeCheckedForCode.current === code) return;
    resumeCheckedForCode.current = code;

    let cancelled = false;
    (async () => {
      try {
        if (isSelfService) {
          const status = await apiFetchWithRetry<{ canProceed: boolean }>(
            `/api/activities/${encodeURIComponent(activity.code)}/groups/status`,
          );
          if (!status.canProceed || cancelled) return;
        }

        const progress = await apiFetchWithRetry<{
          completionStatus: string;
          totalItemsCompleted: number;
        }>(`/api/activities/${code}/my-progress`);

        if (cancelled) return;
        if (progress.completionStatus !== 'in_progress' || progress.totalItemsCompleted <= 0) return;

        prefetchModuleIfNeeded(activity.code, participant?.group || '');

        if (activity.moduleType === 'mission') {
          navigate(participantMissionPath(activity.code), { replace: true });
        } else if (activity.moduleType === 'story' || activity.moduleType === 'spiders') {
          navigate(participantStoryPath(activity.code), { replace: true });
        }
      } catch {
        // Stay on login — user can sign in manually
      }
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated, activity, code, scheduleStatus, isSelfService, navigate, participant?.group, prefetchModuleIfNeeded]);

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

  const handleGroupLogin = async (data: {
    participantName?: string;
    phoneNumber?: string;
    email?: string;
    groupToken: string;
  }) => {
    await login({
      activityCode: activity!.code,
      ...data,
    });
  };

  const renderLoginContent = () => {
    if (!activity) return null;

    if (isSelfService && groupFlow) {
      if (inviteError) {
        return <BodyText style={{ color: '#ffcdd2', textAlign: 'center' }}>{t.invalidInvite}</BodyText>;
      }

      if (groupFlow === 'success' && createdGroup) {
        return (
          <GroupCreatedSuccess
            activityCode={activity.code}
            groupName={createdGroup.name}
            inviteUrl={createdGroup.inviteUrl}
            onContinue={() => { void handleSuccess(); }}
          />
        );
      }

      if (groupFlow === 'choice') {
        return (
          <GroupEntryChoice
            onCreate={() => setGroupFlow('create')}
            onJoin={() => setGroupFlow('join-paste')}
          />
        );
      }

      if (groupFlow === 'create') {
        return (
          <CreateGroupForm
            activityCode={activity.code}
            loginFields={activity.loginFields}
            onBack={() => setGroupFlow('choice')}
            onEstablishSession={(token) => establishSession(token, activity.code)}
            onCreated={(result) => {
              setCreatedGroup({ name: result.groupName, inviteUrl: result.inviteUrl });
              setGroupFlow('success');
            }}
          />
        );
      }

      if (groupFlow === 'join-paste') {
        return (
          <JoinExistingGroupForm
            activityCode={activity.code}
            onBack={() => setGroupFlow('choice')}
            onTokenResolved={(token) => {
              setResolvedInvite(null);
              navigate(`/play/${activity.code}/join/${token}`, { replace: true });
            }}
          />
        );
      }

      if (groupFlow === 'join-login' && resolvedInvite) {
        return (
          <JoinGroupLogin
            activityCode={activity.code}
            groupName={resolvedInvite.name}
            groupToken={resolvedInvite.token}
            loginFields={activity.loginFields}
            onBack={inviteTokenParam ? undefined : () => setGroupFlow('choice')}
            onLogin={handleGroupLogin}
            onSuccess={() => { void handleSuccess(); }}
          />
        );
      }

      if (groupFlow === 'join-login' && inviteTokenParam) {
        return (
          <PurpleLoadingScreen style={{ position: 'relative', inset: 'auto', background: 'transparent', minHeight: 80 }}>
            <LoaderWave aria-label={t.loading}>
              <span>Y</span><span>o</span><span>o</span><span>z</span>
            </LoaderWave>
          </PurpleLoadingScreen>
        );
      }
    }

    return (
      <ActivityLogin
        activityCode={activity.code}
        loginFields={activity.loginFields}
        emailGoogle={activity.emailGoogle}
        connectionType={activity.connectionType}
        groups={activity.groups}
        onSuccess={handleSuccess}
        onLogin={login}
      />
    );
  };

  const loginHeading = groupFlow === 'success'
    ? t.teamCreatedHeading
    : groupFlow === 'create'
      ? t.createTeamHeading
      : groupFlow === 'join-login'
        ? t.joinTeamHeading
        : t.readyForAdventure;

  const loginSubheading = groupFlow === 'success'
    ? t.teamCreatedSubheading
    : groupFlow === 'choice'
      ? t.groupChoiceSubheading
      : t.connectAndPlay;

  const handleSuccess = async () => {
    if (isSelfService && activity) {
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const status = await apiFetchWithRetry<{ canProceed: boolean }>(
            `/api/activities/${encodeURIComponent(activity.code)}/groups/status`,
          );
          if (!status.canProceed) return;
          break;
        } catch {
          if (attempt >= 5) return;
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }
    if (activity?.code) {
      prefetchModuleIfNeeded(activity.code, participant?.group || '');
    }
    if (activity?.moduleType === 'mission') {
      navigate(participantMissionPath(activity.code), { replace: true });
    } else if (activity?.moduleType === 'story' || activity?.moduleType === 'spiders') {
      navigate(participantStoryPath(activity.code), { replace: true });
    } else {
      navigate('/home', { replace: true });
    }
  };

  if (loading) {
    return (
      <PurpleLoadingScreen>
        <LoaderWave aria-label={t.loading}>
          <span>Y</span>
          <span>o</span>
          <span>o</span>
          <span>z</span>
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
          <span>Y</span><span>o</span><span>o</span><span>z</span>
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
      {hasOpening && openingPhase !== 'done' && activity && (
        <CustomOpeningOverlay
          activity={activity}
          openingPhase={openingPhase}
          openingType={openingType}
          videoStarted={videoStarted}
          videoRef={videoRef}
          t={t}
          onOverlayClick={handleOpeningClick}
          onVideoEnded={handleVideoEnded}
          onStartVideo={handleStartVideo}
        />
      )}

      {/* Login page — full screen purple */}
      <PurpleLoginPage visible={openingPhase !== 'playing'}>
        {/*
          Offered on the first screen a participant reads, so someone who cannot
          read the language can get out of it before working out which field is
          their name. Only the languages the activity was prepared in: an
          activity nobody translated shows no control at all, rather than an
          English shell around Hebrew stations.
        */}
        <LangDrawer variant="fab" only={activity?.languages ?? []} />
        <LoginLogo src="/images/logo-white.png" alt="Yooz" />
        <LoginHeading>{loginHeading}</LoginHeading>
        <LoginSubheading>{loginSubheading}</LoginSubheading>
        <LoginFormWrapper>
          {renderLoginContent()}
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
