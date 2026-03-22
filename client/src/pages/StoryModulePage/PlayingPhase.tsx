import React, { useState, useRef, useCallback } from 'react';
import ActivityLogoutButton from '../../components/ActivityLogoutButton';
import NatureBackground from '../../components/NatureBackground';
import SpyThemeWrapper from '../../components/themes/SpyThemeWrapper';
import OrderGame from '../../components/games/OrderGame';
import TriviaGame from '../../components/games/TriviaGame';
import PuzzleGame from '../../components/games/PuzzleGame';
import TrueFalseGame from '../../components/games/TrueFalseGame';
import BallGame from '../../components/games/BallGame';
import TrashSortGame from '../../components/games/TrashSortGame';
import NarrativeStation from '../../components/stations/NarrativeStation';
import BadgeStation from '../../components/stations/BadgeStation';
import { styled, keyframes } from '@mui/material/styles';
import {
  PageContainer,
  HeaderActions,
  OutlineButton,
  CenteredContent,
  BodyText,
  PrimaryButton,
  ModalOverlay,
  ModalCard,
} from '../../components/styled';
import {
  PlayingContent,
  StationSubtitle,
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

const PlayingHeader = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 16px',
  background: 'linear-gradient(135deg, rgba(30,30,40,0.55) 0%, rgba(20,20,30,0.45) 100%)',
  backdropFilter: 'blur(12px)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
});

const PlayingHeaderLeft = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  minWidth: 0,
});

const PlayingHeaderTop = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

const PlayingHeaderName = styled('span')({
  fontWeight: 700,
  fontSize: 14,
  color: '#fff',
  textShadow: '0 1px 2px rgba(0,0,0,0.2)',
});

const PlayingHeaderProgress = styled('span')({
  fontSize: 11,
  color: 'rgba(255,255,255,0.6)',
  fontWeight: 600,
});

const PlayingHeaderIconBtn = styled('button')({
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  width: 34,
  height: 34,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: 16,
  transition: 'all 0.15s',
  '&:hover': {
    background: 'rgba(255,255,255,0.2)',
  },
});

const AnimatedStage = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100dvh',
  position: 'relative',
  animation: `${pageFadeIn} 620ms cubic-bezier(0.22, 1, 0.36, 1) both`,
});

const AnimatedHeader = styled('div')({
  animation: `${headerFadeIn} 520ms cubic-bezier(0.22, 1, 0.36, 1) both`,
});

const AnimatedContent = styled('div')({
  position: 'relative',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  animation: `${pageFadeIn} 680ms cubic-bezier(0.22, 1, 0.36, 1) 90ms both`,
});

const StationHintButton = styled(OutlineButton)({
  padding: '4px 12px',
  fontSize: 11,
});

const HeaderIconButton = styled(OutlineButton)({
  width: 36,
  height: 36,
  minWidth: 36,
  padding: 0,
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  borderColor: 'rgba(255,255,255,0.55)',
  background: 'rgba(0,0,0,0.2)',
  '&:active': {
    background: 'rgba(0,0,0,0.34)',
  },
});

const StationDescriptionText = styled(StationHeadline)({
  marginBottom: 16,
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
  currentItemIndex: number;
  totalItems: number;
  stationHintText: string | null;
  stationHintUsed: boolean;
  participantAge?: number;
  bgStyle: React.CSSProperties;
  theme?: string;
  code?: string;
  onGameComplete: (result: GameResult) => void;
  onLogout: () => void;
  onViewLeaderboard?: () => void;
  onStationContinue: () => void;
  onBallGameMuteToggle: () => void;
  ballGameMuted: boolean;
  onStationHintClick: () => void;
  showStationHintWarning: boolean;
  showStationHintText: boolean;
  onConfirmStationHint: () => void;
  onCloseHintWarning: () => void;
  onCloseHintText: () => void;
  activityName?: string;
  groupName?: string;
  popupModal: React.ReactNode;
  t: Record<string, string>;
}

export default function PlayingPhase({
  currentItem,
  currentItemIndex,
  totalItems,
  stationHintText,
  stationHintUsed,
  participantAge,
  bgStyle,
  theme,
  code,
  onGameComplete,
  onLogout,
  onViewLeaderboard,
  onStationContinue,
  onBallGameMuteToggle,
  ballGameMuted,
  onStationHintClick,
  showStationHintWarning,
  showStationHintText,
  onConfirmStationHint,
  onCloseHintWarning,
  onCloseHintText,
  activityName,
  groupName,
  popupModal,
  t,
}: PlayingPhaseProps) {
  const progressText = `${t.step} ${currentItemIndex + 1} ${t.of} ${totalItems}`;
  const isBallGameItem = currentItem.type === 'game' && (currentItem as GameItemData).gameType === 'ballGame';

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
          <CenteredContent>
            {station.description && (
              <StationDescriptionText>{station.description}</StationDescriptionText>
            )}
            <StationWindow>
              <StationBodyText>
                {(station.settings?.content as string) || ''}
              </StationBodyText>
            </StationWindow>
            <StationContinueButton onClick={onStationContinue}>
              {t.continueButton}
            </StationContinueButton>
          </CenteredContent>
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
        return (
          <CenteredContent>
            {station.description && (
              <StationDescriptionText>{station.description}</StationDescriptionText>
            )}
            <StationWindow>
              <MediaStationImageWrapper style={{ marginBottom: 0 }}>
                <MediaStationImage
                  src={station.settings?.mediaUrl as string}
                  alt=""
                />
              </MediaStationImageWrapper>
            </StationWindow>
            <StationContinueButton onClick={onStationContinue}>
              {t.continueButton}
            </StationContinueButton>
          </CenteredContent>
        );
      }

      if (station.stationType === 'narrative') {
        return <NarrativeStation station={station} onContinue={onStationContinue} />;
      }

      if (station.stationType === 'badge') {
        return <BadgeStation station={station} onContinue={onStationContinue} />;
      }

      // Unknown station type fallback
      return (
        <CenteredContent>
          <StationWindow>
            <StationBodyText>Unknown station type</StationBodyText>
          </StationWindow>
          <StationContinueButton onClick={onStationContinue}>
            {t.continueButton}
          </StationContinueButton>
        </CenteredContent>
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
          participantAge={participantAge}
        />
      );
    }

    if (gameData.type === 'trivia') {
      return (
        <TriviaGame
          game={gameData}
          onComplete={onGameComplete}
          participantAge={participantAge}
        />
      );
    }

    if (gameData.type === 'puzzle') {
      return (
        <PuzzleGame
          game={gameData}
          onComplete={onGameComplete}
          participantAge={participantAge}
        />
      );
    }

    if (gameData.type === 'trueFalse') {
      return (
        <TrueFalseGame
          game={gameData}
          onComplete={onGameComplete}
          participantAge={participantAge}
        />
      );
    }

    if (gameData.type === 'ballGame') {
      return (
        <BallGame
          game={gameData}
          onComplete={onGameComplete}
          participantAge={participantAge}
        />
      );
    }

    if (gameData.type === 'trashSort') {
      return (
        <TrashSortGame
          game={gameData}
          onComplete={onGameComplete}
          participantAge={participantAge}
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

  const isStation = currentItem.type === 'station';

  const headerBar = (
    <PlayingHeader style={{ position: 'sticky', top: 0, zIndex: 30, flexShrink: 0 }}>
      <PlayingHeaderLeft>
        <PlayingHeaderTop>
          {activityName && <PlayingHeaderName>{activityName}</PlayingHeaderName>}
          <PlayingHeaderProgress>{progressText}</PlayingHeaderProgress>
        </PlayingHeaderTop>
        <StationSubtitle style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 2px rgba(0,0,0,0.15)', fontSize: 12 }}>
          {currentItem.name}
          {groupName ? ` · ${groupName}` : ''}
        </StationSubtitle>
      </PlayingHeaderLeft>
      <HeaderActions style={{ gap: 6 }}>
        {stationHintText && (
          <StationHintButton onClick={onStationHintClick}>
            {stationHintUsed ? t.showStationHint : t.stationHint}
          </StationHintButton>
        )}
        {isBallGameItem && (
          <HeaderIconButton
            type="button"
            onClick={onBallGameMuteToggle}
            aria-label={ballGameMuted ? 'Unmute game music' : 'Mute game music'}
            title={ballGameMuted ? 'Unmute game music' : 'Mute game music'}
          >
            {ballGameMuted ? <MutedIcon /> : <SpeakerIcon />}
          </HeaderIconButton>
        )}
        {onViewLeaderboard && (
          <PlayingHeaderIconBtn onClick={onViewLeaderboard} aria-label="Leaderboard" title={t.leaderboardTitle || 'Leaderboard'}>
            🏆
          </PlayingHeaderIconBtn>
        )}
        <ActivityLogoutButton onClick={onLogout} ariaLabel={t.exitActivity} />
      </HeaderActions>
    </PlayingHeader>
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

  // Missions render their own full-screen layout
  if (currentItem.type === 'mission') {
    return renderContent();
  }

  const Wrapper = theme === 'spy' ? SpyThemeWrapper : NatureBackground;

  return (
    <Wrapper>
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
    </Wrapper>
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
  const [hasEnded, setHasEnded] = useState(false);
  const [showReplay, setShowReplay] = useState(false);

  const buttonAfterEnd = station.settings?.buttonAfterEnd !== false;

  const handleEnded = useCallback(() => {
    setHasEnded(true);
    setShowReplay(true);
  }, []);

  const handleReplay = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setShowReplay(false);
    }
  }, []);

  return (
    <CenteredContent>
      {station.description && (
        <StationDescriptionText>{station.description}</StationDescriptionText>
      )}
      <StationWindow>
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
      {(!buttonAfterEnd || hasEnded) && (
        <StationContinueButton onClick={onContinue}>
          {t.continueButton}
        </StationContinueButton>
      )}
    </CenteredContent>
  );
}

function SpeakerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity="0.3" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" opacity="0.3" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
