import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useMediaPreload } from '../../hooks/useMediaPreload';
import { resolveVideoSource } from '../../utils/videoSource';
import ThemedBackground from '../../components/ThemedBackground';
import OrderGame from '../../components/games/OrderGame';
import TriviaGame from '../../components/games/TriviaGame';
import PuzzleGame from '../../components/games/PuzzleGame';
import TrueFalseGame from '../../components/games/TrueFalseGame';
import BallGame from '../../components/games/BallGame';
import TrashSortGame from '../../components/games/TrashSortGame';
import LuckyChickenGame from '../../components/games/LuckyChickenGame';
import NarrativeStation from '../../components/stations/NarrativeStation';
import BadgeStation from '../../components/stations/BadgeStation';
import CollageStation from '../../components/stations/CollageStation';
import FeedbackStation, { type FeedbackResult } from '../../components/stations/FeedbackStation';
import RiddleStation from '../../components/stations/RiddleStation';
import AvatarStation from '../../components/stations/AvatarStation';
import EnteringTextStation from '../../components/stations/EnteringTextStation';
import { styled, keyframes } from '@mui/material/styles';
import {
  OutlineButton,
  CenteredContent,
  BodyText,
  PrimaryButton,
  ModalOverlay,
  ModalCard,
  DarkHeaderActionIconButton,
  DarkHeaderTextButton,
  PuzzleDarkHeaderActionIconButton,
  PuzzleDarkHeaderTextButton,
} from '../../components/styled';
import {
  PlayingContent,
  MediaStationWrapper,
  MediaStationVideo,
  MediaStationIframeWrapper,
  MediaStationIframe,
  MediaStationImageWrapper,
  MediaStationImage,
  ModalTitle,
  ModalBody,
  ModalButtonRow,
  StationWindow,
  StationHeadline,
  StationBodyText,
  StationContinueButton,
  GameLoadingSpinner,
} from '../../components/games/styled';
import MissionInlinePlayer from './MissionInlinePlayer';
import ActivitySessionHeader, {
  SessionHeaderIconPlaceholder,
  SessionHeaderTrophyIcon,
} from './ActivitySessionHeader';
import {
  useActivityPlayingHeaderSlot,
  useActivityGameHeaderFallbackWhenNeeded,
} from '../../context/activityPlayingHeaderContext';
import { useHelpChat } from '../../components/HelpChat/HelpChatContext';
import type { GameResult } from '../../components/games/types';
import type { ModuleItemData, GameItemData, StationItemData, MissionItemData, GameData, CustomThemeData } from './types';

// ─── Local styled components ───

const pageFadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const headerFadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const AnimatedStage = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  position: 'relative',
  animation: `${pageFadeIn} 620ms cubic-bezier(0.22, 1, 0.36, 1) both`,
});

const AnimatedHeader = styled('div')({
  animation: `${headerFadeIn} 520ms cubic-bezier(0.22, 1, 0.36, 1) both`,
});

const AnimatedContent = styled('div')({
  position: 'relative',
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  animation: `${pageFadeIn} 680ms cubic-bezier(0.22, 1, 0.36, 1) 90ms both`,
});

const StationTitleText = styled('h2')({
  fontSize: 26,
  fontWeight: 800,
  color: '#fff',
  WebkitTextStroke: '1.5px #000',
  paintOrder: 'stroke fill',
  margin: '0 0 16px',
  textAlign: 'center',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  paddingTop: 8,
});

const StationDescriptionText = styled(StationHeadline)({
  color: '#111',
  marginBottom: 0,
  marginTop: 8,
});

const StationTopLayout = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '24px 24px 100px',
  textAlign: 'center',
});

/** Same as StationTopLayout but for video/image stations */
const MediaStationLayout = styled(StationTopLayout)({});

const FixedContinueButton = styled(StationContinueButton)({
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 40,
  '&:active': {
    transform: 'translateX(-50%) translateY(3px)',
  },
});

const SkipButton = styled(PrimaryButton)({
  maxWidth: 200,
  marginTop: 16,
});

const ModalActionButton = styled(PrimaryButton)({
  width: 'auto',
  padding: '10px 20px',
  fontSize: 14,
});

const ModalCloseButton = styled(PrimaryButton)({
  width: 'auto',
  padding: '10px 24px',
  fontSize: 14,
});

// ─── Media gate — shows spinner until all URLs are loaded ───

function MediaGateWrapper({ urls, children }: { urls: (string | undefined | null)[]; children: React.ReactNode }) {
  const ready = useMediaPreload(urls);
  if (!ready) return <GameLoadingSpinner />;
  return <>{children}</>;
}

// ─── Component ───

interface PlayingPhaseProps {
  currentItem: ModuleItemData;
  stationHintText: string | null;
  stationHintUsed: boolean;
  bgStyle: React.CSSProperties;
  theme?: string;
  customTheme?: CustomThemeData;
  code?: string;
  onGameComplete: (result: GameResult) => void;
  onLogout: () => void;
  onViewLeaderboard?: () => void;
  onStationContinue: () => void;
  onStationBackToRoadmap: () => void;
  onStationFinishActivity: () => void;
  onFeedbackContinue: (result: FeedbackResult) => void;
  onBallGameMuteToggle: () => void;
  ballGameMuted: boolean;
  onStationHintClick: () => void;
  showStationHintWarning: boolean;
  showStationHintText: boolean;
  onConfirmStationHint: () => void;
  onCloseHintWarning: () => void;
  onCloseHintText: () => void;
  /** Called when the EnteringText "show solution" hint is confirmed — applies the 4-min time penalty. */
  onEnteringTextSolutionHintUsed: () => void;
  /** Running total minus hint penalties — same basis as roadmap / finish. */
  currentPoints: number;
  popupModal: React.ReactNode;
  t: Record<string, string>;
  leaderboardMode?: 'points' | 'time';
  elapsedSeconds?: number;
  activityDurationMinutes?: number;
}

export default function PlayingPhase({
  currentItem,
  stationHintText,
  stationHintUsed,
  bgStyle: _bgStyle,
  theme,
  customTheme,
  code,
  onGameComplete,
  onLogout,
  onViewLeaderboard,
  onStationContinue,
  onStationBackToRoadmap,
  onStationFinishActivity,
  onFeedbackContinue,
  onBallGameMuteToggle,
  ballGameMuted,
  onStationHintClick,
  showStationHintWarning,
  showStationHintText,
  onConfirmStationHint,
  onCloseHintWarning,
  onCloseHintText,
  onEnteringTextSolutionHintUsed,
  currentPoints,
  popupModal,
  t,
  leaderboardMode,
  elapsedSeconds,
  activityDurationMinutes,
}: PlayingPhaseProps) {
  const activityHeaderSlot = useActivityPlayingHeaderSlot();
  const { toggle: toggleHelpChat } = useHelpChat();
  const isGameStep = currentItem.type === 'game';
  const isPuzzleGame = isGameStep && (currentItem as GameItemData).gameType === 'puzzle';
  const isOrderGame = isGameStep && (currentItem as GameItemData).gameType === 'order';
  const isBallGame = isGameStep && (currentItem as GameItemData).gameType === 'ballGame';
  const isTextVideoImageStation = currentItem.type === 'station' && ['text', 'video', 'image', 'riddle', 'avatar', 'enteringText'].includes((currentItem as StationItemData).stationType);
  const puzzleSessionChrome = (isPuzzleGame || isOrderGame || isBallGame || isTextVideoImageStation) ? 'puzzle' : 'default';
  const useDarkChrome = isPuzzleGame || isOrderGame || isBallGame || isTextVideoImageStation;
  const SessionHeaderIconButton = useDarkChrome ? PuzzleDarkHeaderActionIconButton : DarkHeaderActionIconButton;
  const SessionHintButton = useDarkChrome ? PuzzleDarkHeaderTextButton : DarkHeaderTextButton;
  useActivityGameHeaderFallbackWhenNeeded(isGameStep, currentItem._id);
  const showMusicInGameSlot = isGameStep && activityHeaderSlot != null;
  const showStandaloneLeaderboard =
    !isGameStep && Boolean(onViewLeaderboard);
  const isRiddleStation = currentItem.type === 'station' && (currentItem as StationItemData).stationType === 'riddle';
  const isEnteringTextStation = currentItem.type === 'station' && (currentItem as StationItemData).stationType === 'enteringText';

  const renderContent = () => {
    if (currentItem.type === 'mission') {
      const missionItem = currentItem as MissionItemData;
      return (
        <MissionInlinePlayer
          mission={missionItem}
          onComplete={onGameComplete}
          code={code}
          onLogout={onLogout}
          onHelp={toggleHelpChat}
        />
      );
    }

    if (currentItem.type === 'station') {
      const station = currentItem as StationItemData;

      if (station.stationType === 'text') {
        return (
          <StationTopLayout>
            <StationTitleText style={customTheme?.textColor ? { color: customTheme.textColor } : undefined}>{station.name}</StationTitleText>
            {station.description && (
              <StationDescriptionText style={customTheme?.textColor ? { color: customTheme.textColor } : undefined}>{station.description}</StationDescriptionText>
            )}
            <StationWindow style={{ marginTop: 16 }}>
              <StationBodyText>
                {(station.settings?.content as string) || ''}
              </StationBodyText>
            </StationWindow>
            <FixedContinueButton onClick={onStationContinue}>
              {t.continueButton}
            </FixedContinueButton>
          </StationTopLayout>
        );
      }

      if (station.stationType === 'video') {
        return (
          <VideoStationPlayer
            station={station}
            onContinue={onStationContinue}
            t={t}
            textColor={customTheme?.textColor}
          />
        );
      }

      if (station.stationType === 'image') {
        return (
          <ImageStationDisplay
            station={station}
            onContinue={onStationContinue}
            t={t}
            textColor={customTheme?.textColor}
          />
        );
      }

      if (station.stationType === 'narrative') {
        return (
          <MediaGateWrapper urls={[
            station.settings?.backgroundImage as string | undefined,
            station.settings?.imageUrl as string | undefined,
          ]}>
            <NarrativeStation station={station} onContinue={onStationContinue} />
          </MediaGateWrapper>
        );
      }

      if (station.stationType === 'badge') {
        const badgeUrl = (station.settings?.badgeImageUrl || station.settings?.mediaUrl) as string | undefined;
        return (
          <MediaGateWrapper urls={[badgeUrl]}>
            <BadgeStation station={station} onContinue={onStationContinue} />
          </MediaGateWrapper>
        );
      }

      if (station.stationType === 'collage') {
        return <CollageStation station={station} onContinue={onStationContinue} code={code} />;
      }

      if (station.stationType === 'feedback') {
        return (
          <FeedbackStation
            station={station}
            onContinue={onFeedbackContinue}
            textColor={customTheme?.textColor}
          />
        );
      }

      if (station.stationType === 'riddle') {
        const riddleMediaUrl = station.settings?.mediaUrl as string | undefined;
        return (
          <MediaGateWrapper urls={[riddleMediaUrl]}>
            <RiddleStation
              station={station}
              onComplete={onGameComplete}
              stationHintText={stationHintText}
              stationHintUsed={stationHintUsed}
              onStationHintClick={onStationHintClick}
              textColor={customTheme?.textColor}
              hintLabel={stationHintUsed ? t.showStationHint : t.stationHint}
            />
          </MediaGateWrapper>
        );
      }

      if (station.stationType === 'avatar') {
        const avatarImageUrl = station.settings?.characterImageUrl as string | undefined;
        return (
          <MediaGateWrapper urls={[avatarImageUrl]}>
            <AvatarStation
              station={station}
              onContinue={onStationContinue}
              continueLabel={t.continueButton}
              textColor={customTheme?.textColor}
              sessionStorageKey={code ? `yooz_avatar_chat_${code}_${station._id}` : undefined}
            />
          </MediaGateWrapper>
        );
      }

      if (station.stationType === 'enteringText') {
        return (
          <EnteringTextStation
            station={station}
            onContinue={onStationContinue}
            onBackToRoadmap={onStationBackToRoadmap}
            onFinishActivity={onStationFinishActivity}
            code={code}
            stationHintText={stationHintText}
            stationHintUsed={stationHintUsed}
            onStationHintClick={onStationHintClick}
            hintLabel={stationHintUsed ? t.showStationHint : t.stationHint}
            onSolutionHintUsed={onEnteringTextSolutionHintUsed}
            solutionHintLabel={t.solutionHint}
            solutionHintWarning={t.solutionHintWarning}
            solutionHintConfirmLabel={t.solutionHintConfirm}
            hintCancelLabel={t.hintCancel}
            retryTitle={t.enteringTextRetryTitle}
            retryMessage={t.enteringTextRetryMessage}
            retryButtonLabel={t.enteringTextRetryButton}
            textColor={customTheme?.textColor}
          />
        );
      }

      // Unknown station type fallback
      return (
        <StationTopLayout>
          <StationWindow style={{ marginTop: 16 }}>
            <StationBodyText>Unknown station type</StationBodyText>
          </StationWindow>
          <FixedContinueButton onClick={onStationContinue}>
            {t.continueButton}
          </FixedContinueButton>
        </StationTopLayout>
      );
    }

    // Game item
    const gameItem = currentItem as GameItemData;
    const gameData: GameData = {
      _id: gameItem._id,
      name: gameItem.name,
      type: gameItem.gameType,
      settings: gameItem.settings,
    };

    if (gameData.type === 'order') {
      return (
        <OrderGame
          game={gameData}
          onComplete={onGameComplete}
        />
      );
    }

    if (gameData.type === 'trivia') {
      const triviaSettings = gameData.settings as { questions?: Array<{ media?: string }> };
      const triviaMedia = (triviaSettings.questions || []).map(q => q.media);
      return (
        <MediaGateWrapper urls={triviaMedia}>
          <TriviaGame game={gameData} onComplete={onGameComplete} />
        </MediaGateWrapper>
      );
    }

    if (gameData.type === 'puzzle') {
      const puzzleSettings = gameData.settings as { puzzleImage?: string; questions?: Array<{ media?: string }> };
      const puzzleMedia = [puzzleSettings.puzzleImage, ...(puzzleSettings.questions || []).map(q => q.media)];
      return (
        <MediaGateWrapper urls={puzzleMedia}>
          <PuzzleGame game={gameData} onComplete={onGameComplete} />
        </MediaGateWrapper>
      );
    }

    if (gameData.type === 'trueFalse') {
      const tfSettings = gameData.settings as { statements?: Array<{ media?: string }> };
      const tfMedia = (tfSettings.statements || []).map(s => s.media);
      return (
        <MediaGateWrapper urls={tfMedia}>
          <TrueFalseGame game={gameData} onComplete={onGameComplete} />
        </MediaGateWrapper>
      );
    }

    if (gameData.type === 'ballGame') {
      return (
        <BallGame
          game={gameData}
          onComplete={onGameComplete}
          embeddedInActivity
          activityBallMuted={ballGameMuted}
          onActivityBallMuteToggle={onBallGameMuteToggle}
        />
      );
    }

    if (gameData.type === 'luckyChicken') {
      return <LuckyChickenGame game={gameData} onComplete={onGameComplete} />;
    }

    if (gameData.type === 'trashSort') {
      const tsSettings = gameData.settings as { items?: Array<{ imageUrl?: string }>; bins?: Array<{ iconUrl?: string }> };
      const tsMedia = [
        ...(tsSettings.items || []).map(i => i.imageUrl),
        ...(tsSettings.bins || []).map(b => b.iconUrl),
      ];
      return (
        <MediaGateWrapper urls={tsMedia}>
          <TrashSortGame game={gameData} onComplete={onGameComplete} />
        </MediaGateWrapper>
      );
    }

    // Unknown game type fallback
    return (
      <CenteredContent>
        <BodyText>Unknown game type: {gameData.type}</BodyText>
        <SkipButton onClick={() => onGameComplete({ score: 0, maxPossibleScore: 0, durationMs: 0, hintUsed: false })}>
          Skip
        </SkipButton>
      </CenteredContent>
    );
  };

  const headerThirdSlot = showMusicInGameSlot && activityHeaderSlot ? (
    <SessionHeaderIconButton
      type="button"
      onClick={activityHeaderSlot.toggleMute}
      aria-label={activityHeaderSlot.isMuted ? 'Unmute game music' : 'Mute game music'}
      title={activityHeaderSlot.isMuted ? 'Unmute game music' : 'Mute game music'}
    >
      {activityHeaderSlot.isMuted ? <MutedIcon /> : <SpeakerIcon />}
    </SessionHeaderIconButton>
  ) : showStandaloneLeaderboard && onViewLeaderboard ? (
    <SessionHeaderIconButton type="button" onClick={onViewLeaderboard} aria-label="Leaderboard" title={t.leaderboardTitle || 'Leaderboard'}>
      <SessionHeaderTrophyIcon />
    </SessionHeaderIconButton>
  ) : (
    <SessionHeaderIconPlaceholder aria-hidden />
  );

  const headerBar = (
    <ActivitySessionHeader
      onLogout={onLogout}
      currentPoints={currentPoints}
      t={t}
      thirdSlot={headerThirdSlot}
      chromeVariant={puzzleSessionChrome}
      leaderboardMode={leaderboardMode}
      elapsedSeconds={elapsedSeconds}
      activityDurationMinutes={activityDurationMinutes}
      topRow={stationHintText && !isRiddleStation && !isEnteringTextStation ? (
        <SessionHintButton type="button" onClick={onStationHintClick}>
          {stationHintUsed ? t.showStationHint : t.stationHint}
        </SessionHintButton>
      ) : undefined}
    />
  );

  const hintModals = (
    <>
      {showStationHintWarning && (
        <ModalOverlay onClick={onCloseHintWarning}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle>{leaderboardMode === 'time' ? (t.hintWarningTime || t.hintWarning) : t.hintWarning}</ModalTitle>
            <ModalButtonRow>
              <OutlineButton onClick={onCloseHintWarning}>{t.hintCancel}</OutlineButton>
              <ModalActionButton onClick={onConfirmStationHint}>
                {t.hintConfirm}
              </ModalActionButton>
            </ModalButtonRow>
          </ModalCard>
        </ModalOverlay>
      )}
      {showStationHintText && stationHintText && (
        <ModalOverlay onClick={onCloseHintText}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle sx={{ marginBottom: '8px' }}>{t.hintTitle}</ModalTitle>
            <ModalBody>{stationHintText}</ModalBody>
            <ModalCloseButton onClick={onCloseHintText}>
              {t.hintClose}
            </ModalCloseButton>
          </ModalCard>
        </ModalOverlay>
      )}
      {popupModal}
    </>
  );

  // Missions and collage stations render their own full-screen layout
  if (currentItem.type === 'mission') {
    return renderContent();
  }

  // Lucky Chicken renders its own full-screen fixed layout
  if (currentItem.type === 'game' && (currentItem as GameItemData).gameType === 'luckyChicken') {
    return (
      <>
        {renderContent()}
        {hintModals}
      </>
    );
  }

  // Ball game renders its own full-screen fixed layout with a custom 3D room background
  if (currentItem.type === 'game' && (currentItem as GameItemData).gameType === 'ballGame') {
    return (
      <>
        {renderContent()}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60 }}>
          {headerBar}
        </div>
        {hintModals}
      </>
    );
  }

  if (currentItem.type === 'station' && (currentItem as StationItemData).stationType === 'collage') {
    return (
      <>
        {renderContent()}
        {hintModals}
      </>
    );
  }

  return (
    <ThemedBackground theme={theme} customTheme={customTheme}>
      <AnimatedStage>
        <AnimatedHeader>
          {headerBar}
        </AnimatedHeader>
        <AnimatedContent>
          <PlayingContent>
            {renderContent()}
          </PlayingContent>
        </AnimatedContent>
      </AnimatedStage>
      {hintModals}
    </ThemedBackground>
  );
}

// ─── Image Station with media preloading ───

function ImageStationDisplay({ station, onContinue, t, textColor }: {
  station: StationItemData;
  onContinue: () => void;
  t: Record<string, string>;
  textColor?: string;
}) {
  const mediaUrl = station.settings?.mediaUrl as string | undefined;
  const mediaReady = useMediaPreload([mediaUrl]);
  const descAfter = station.settings?.descPosition === 'after';
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [fullscreen]);

  const descEl = station.description ? <StationDescriptionText style={textColor ? { color: textColor } : undefined}>{station.description}</StationDescriptionText> : null;
  const mediaEl = mediaReady ? (
    <StationWindow style={{ marginTop: 16 }} isDynamic>
      <MediaStationImageWrapper style={{ marginBottom: 0 }}>
        <MediaStationImage
          src={mediaUrl}
          alt=""
          style={{ cursor: 'zoom-in' }}
          onClick={() => setFullscreen(true)}
        />
      </MediaStationImageWrapper>
    </StationWindow>
  ) : (
    <GameLoadingSpinner style={{ minHeight: 200, flex: 'none' }} />
  );

  return (
    <MediaStationLayout>
      <StationTitleText style={textColor ? { color: textColor } : undefined}>{station.name}</StationTitleText>
      {descAfter ? <>{mediaEl}{descEl}</> : <>{descEl}{mediaEl}</>}
      <FixedContinueButton onClick={onContinue} disabled={!mediaReady}>
        {t.continueButton}
      </FixedContinueButton>
      {fullscreen && mediaUrl && (
        <ImageFullscreenOverlay onClick={() => setFullscreen(false)} role="dialog" aria-modal="true">
          <ImageFullscreenClose
            type="button"
            aria-label="Close"
            onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}
          >
            ×
          </ImageFullscreenClose>
          <ImageFullscreenImg src={mediaUrl} alt="" onClick={(e) => e.stopPropagation()} />
        </ImageFullscreenOverlay>
      )}
    </MediaStationLayout>
  );
}

const ImageFullscreenOverlay = styled('div')({
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.92)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
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

// ─── Video Station with replay + conditional continue ───

const ReplayOverlay = styled('button')({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.45)',
  border: 'none',
  cursor: 'pointer',
  zIndex: 5,
});

const ReplayIcon = styled('div')({
  width: 64,
  height: 64,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
});

function VideoStationPlayer({ station, onContinue, t, textColor }: {
  station: StationItemData;
  onContinue: () => void;
  t: Record<string, string>;
  textColor?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showReplay, setShowReplay] = useState(false);
  const source = resolveVideoSource(station.settings?.mediaUrl as string);

  const handleEnded = useCallback(() => {
    setShowReplay(true);
  }, []);

  const handleReplay = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setShowReplay(false);
    }
  }, []);

  const descAfter = station.settings?.descPosition === 'after';
  const descEl = station.description ? <StationDescriptionText style={textColor ? { color: textColor } : undefined}>{station.description}</StationDescriptionText> : null;
  const mediaEl = (
    <StationWindow isDynamic style={{ marginTop: 16 }}>
      <MediaStationWrapper style={{ position: 'relative', marginBottom: 0 }}>
        {source.kind === 'iframe' ? (
          <MediaStationIframeWrapper>
            <MediaStationIframe
              src={source.src}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
            />
          </MediaStationIframeWrapper>
        ) : (
          <>
            <MediaStationVideo
              ref={videoRef}
              src={source.src}
              controls
              autoPlay
              onEnded={handleEnded}
            />
            {showReplay && (
              <ReplayOverlay onClick={handleReplay} type="button" aria-label="Replay video">
                <ReplayIcon>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </ReplayIcon>
              </ReplayOverlay>
            )}
          </>
        )}
      </MediaStationWrapper>
    </StationWindow>
  );

  return (
    <MediaStationLayout>
      <StationTitleText style={textColor ? { color: textColor } : undefined}>{station.name}</StationTitleText>
      {descAfter ? <>{mediaEl}{descEl}</> : <>{descEl}{mediaEl}</>}
      <FixedContinueButton onClick={onContinue}>
        {t.continueButton}
      </FixedContinueButton>
    </MediaStationLayout>
  );
}

function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11 5L6 9H2v6h4l5 4V5z"
        fill="currentColor"
      />
      <path
        d="M15.54 8.46a5 5 0 010 7.07"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.07 4.93a10 10 0 010 14.14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11 5L6 9H2v6h4l5 4V5z"
        fill="currentColor"
      />
      <line
        x1="23"
        y1="9"
        x2="17"
        y2="15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="17"
        y1="9"
        x2="23"
        y2="15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
