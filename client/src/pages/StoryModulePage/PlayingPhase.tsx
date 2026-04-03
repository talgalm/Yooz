import React, { useState, useRef, useCallback } from 'react';
import ThemedBackground from '../../components/ThemedBackground';
import OrderGame from '../../components/games/OrderGame';
import TriviaGame from '../../components/games/TriviaGame';
import PuzzleGame from '../../components/games/PuzzleGame';
import TrueFalseGame from '../../components/games/TrueFalseGame';
import BallGame from '../../components/games/BallGame';
import TrashSortGame from '../../components/games/TrashSortGame';
import NarrativeStation from '../../components/stations/NarrativeStation';
import BadgeStation from '../../components/stations/BadgeStation';
import CollageStation from '../../components/stations/CollageStation';
import FeedbackStation, { type FeedbackResult } from '../../components/stations/FeedbackStation';
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
} from '../../components/styled';
import {
  PlayingContent,
  MediaStationWrapper,
  MediaStationVideo,
  MediaStationImageWrapper,
  MediaStationImage,
  ModalTitle,
  ModalBody,
  ModalButtonRow,
  StationWindow,
  StationHeadline,
  StationBodyText,
  StationContinueButton,
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
import type { GameResult } from '../../components/games/types';
import type { ModuleItemData, GameItemData, StationItemData, MissionItemData, GameData } from './types';

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

const StationHintButton = DarkHeaderTextButton;

const StationTitleText = styled('h2')({
  fontSize: 22,
  fontWeight: 800,
  color: '#333',
  margin: '0 0 6px',
  textAlign: 'center',
});

const StationDescriptionText = styled(StationHeadline)({
  marginBottom: 0,
  marginTop: -4,
});

const StationTopLayout = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '8px 24px 100px',
  textAlign: 'center',
});

const FixedContinueButton = styled(StationContinueButton)({
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 40,
  boxShadow: '0 4px 20px rgba(108,92,231,0.35)',
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

// ─── Component ───

interface PlayingPhaseProps {
  currentItem: ModuleItemData;
  stationHintText: string | null;
  stationHintUsed: boolean;
  bgStyle: React.CSSProperties;
  theme?: string;
  code?: string;
  onGameComplete: (result: GameResult) => void;
  onLogout: () => void;
  onViewLeaderboard?: () => void;
  onStationContinue: () => void;
  onFeedbackContinue: (result: FeedbackResult) => void;
  onBallGameMuteToggle: () => void;
  ballGameMuted: boolean;
  onStationHintClick: () => void;
  showStationHintWarning: boolean;
  showStationHintText: boolean;
  onConfirmStationHint: () => void;
  onCloseHintWarning: () => void;
  onCloseHintText: () => void;
  /** Running total minus hint penalties — same basis as roadmap / finish. */
  currentPoints: number;
  popupModal: React.ReactNode;
  t: Record<string, string>;
}

export default function PlayingPhase({
  currentItem,
  stationHintText,
  stationHintUsed,
  bgStyle: _bgStyle,
  theme,
  code,
  onGameComplete,
  onLogout,
  onViewLeaderboard,
  onStationContinue,
  onFeedbackContinue,
  onBallGameMuteToggle,
  ballGameMuted,
  onStationHintClick,
  showStationHintWarning,
  showStationHintText,
  onConfirmStationHint,
  onCloseHintWarning,
  onCloseHintText,
  currentPoints,
  popupModal,
  t,
}: PlayingPhaseProps) {
  const activityHeaderSlot = useActivityPlayingHeaderSlot();
  const isGameStep = currentItem.type === 'game';
  useActivityGameHeaderFallbackWhenNeeded(isGameStep, currentItem._id);
  const showMusicInGameSlot = isGameStep && activityHeaderSlot != null;
  const showStandaloneLeaderboard =
    !isGameStep && Boolean(onViewLeaderboard);

  const renderContent = () => {
    if (currentItem.type === 'mission') {
      const missionItem = currentItem as MissionItemData;
      return (
        <MissionInlinePlayer
          mission={missionItem}
          onComplete={onGameComplete}
          code={code}
        />
      );
    }

    if (currentItem.type === 'station') {
      const station = currentItem as StationItemData;

      if (station.stationType === 'text') {
        return (
          <StationTopLayout>
            <StationTitleText>{station.name}</StationTitleText>
            {station.description && (
              <StationDescriptionText>{station.description}</StationDescriptionText>
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
          />
        );
      }

      if (station.stationType === 'image') {
        const descAfter = station.settings?.descPosition === 'after';
        const descEl = station.description ? <StationDescriptionText>{station.description}</StationDescriptionText> : null;
        const mediaEl = (
          <StationWindow style={{ marginTop: 16 }} isDynamic>
            <MediaStationImageWrapper style={{ marginBottom: 0 }}>
              <MediaStationImage
                src={station.settings?.mediaUrl as string}
                alt=""
              />
            </MediaStationImageWrapper>
          </StationWindow>
        );
        return (
          <StationTopLayout>
            <StationTitleText>{station.name}</StationTitleText>
            {descAfter ? <>{mediaEl}{descEl}</> : <>{descEl}{mediaEl}</>}
            <FixedContinueButton onClick={onStationContinue}>
              {t.continueButton}
            </FixedContinueButton>
          </StationTopLayout>
        );
      }

      if (station.stationType === 'narrative') {
        return <NarrativeStation station={station} onContinue={onStationContinue} />;
      }

      if (station.stationType === 'badge') {
        return <BadgeStation station={station} onContinue={onStationContinue} />;
      }

      if (station.stationType === 'collage') {
        return <CollageStation station={station} onContinue={onStationContinue} code={code} />;
      }

      if (station.stationType === 'feedback') {
        return <FeedbackStation station={station} onContinue={onFeedbackContinue} />;
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
      return (
        <TriviaGame
          game={gameData}
          onComplete={onGameComplete}
        />
      );
    }

    if (gameData.type === 'puzzle') {
      return (
        <PuzzleGame
          game={gameData}
          onComplete={onGameComplete}
        />
      );
    }

    if (gameData.type === 'trueFalse') {
      return (
        <TrueFalseGame
          game={gameData}
          onComplete={onGameComplete}
        />
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

    if (gameData.type === 'trashSort') {
      return (
        <TrashSortGame
          game={gameData}
          onComplete={onGameComplete}
        />
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
    <DarkHeaderActionIconButton
      type="button"
      onClick={activityHeaderSlot.toggleMute}
      aria-label={activityHeaderSlot.isMuted ? 'Unmute game music' : 'Mute game music'}
      title={activityHeaderSlot.isMuted ? 'Unmute game music' : 'Mute game music'}
    >
      {activityHeaderSlot.isMuted ? <MutedIcon /> : <SpeakerIcon />}
    </DarkHeaderActionIconButton>
  ) : showStandaloneLeaderboard && onViewLeaderboard ? (
    <DarkHeaderActionIconButton type="button" onClick={onViewLeaderboard} aria-label="Leaderboard" title={t.leaderboardTitle || 'Leaderboard'}>
      <SessionHeaderTrophyIcon />
    </DarkHeaderActionIconButton>
  ) : (
    <SessionHeaderIconPlaceholder aria-hidden />
  );

  const headerBar = (
    <ActivitySessionHeader
      onLogout={onLogout}
      currentPoints={currentPoints}
      t={t}
      thirdSlot={headerThirdSlot}
      topRow={stationHintText ? (
        <StationHintButton type="button" onClick={onStationHintClick}>
          {stationHintUsed ? t.showStationHint : t.stationHint}
        </StationHintButton>
      ) : undefined}
    />
  );

  const hintModals = (
    <>
      {showStationHintWarning && (
        <ModalOverlay onClick={onCloseHintWarning}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle>{t.hintWarning}</ModalTitle>
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
    <ThemedBackground theme={theme}>
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

function VideoStationPlayer({ station, onContinue, t }: {
  station: StationItemData;
  onContinue: () => void;
  t: Record<string, string>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showReplay, setShowReplay] = useState(false);

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
  const descEl = station.description ? <StationDescriptionText>{station.description}</StationDescriptionText> : null;
  const mediaEl = (
    <StationWindow isDynamic style={{ marginTop: 16 }}>
      <MediaStationWrapper style={{ position: 'relative', marginBottom: 0 }}>
        <MediaStationVideo
          ref={videoRef}
          src={station.settings?.mediaUrl as string}
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
      </MediaStationWrapper>
    </StationWindow>
  );

  return (
    <StationTopLayout>
      <StationTitleText>{station.name}</StationTitleText>
      {descAfter ? <>{mediaEl}{descEl}</> : <>{descEl}{mediaEl}</>}
      <FixedContinueButton onClick={onContinue}>
        {t.continueButton}
      </FixedContinueButton>
    </StationTopLayout>
  );
}

function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity="0.3" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity="0.3" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
