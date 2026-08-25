import React, { useState, useRef, useCallback } from 'react';
import { useMediaPreload } from '../../hooks/useMediaPreload';
import { resolveVideoSource } from '../../utils/videoSource';
import { linkifyText } from '../../utils/linkifyText';
import ThemedBackground from '../../components/ThemedBackground';
import OrderGame from '../../components/games/OrderGame';
import type { OrderSurveySubmitPayload } from '../../components/games/OrderGame';
import TriviaGame from '../../components/games/TriviaGame';
import PuzzleGame from '../../components/games/PuzzleGame';
import TrueFalseGame from '../../components/games/TrueFalseGame';
import BallGame from '../../components/games/BallGame';
import TrashSortGame from '../../components/games/TrashSortGame';
import NarrativeStation from '../../components/stations/NarrativeStation';
import BadgeStation from '../../components/stations/BadgeStation';
import CollageStation from '../../components/stations/CollageStation';
import FeedbackStation, { type FeedbackResult } from '../../components/stations/FeedbackStation';
import RiddleStation from '../../components/stations/RiddleStation';
import AvatarStation from '../../components/stations/AvatarStation';
import AvatarQuizStation from '../../components/stations/AvatarQuizStation';
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
  PuzzleDarkHeaderActionIconButton,
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
  DesktopStationHeaderBand,
  DESKTOP_BREAKPOINT,
  DESKTOP_MEDIA_STATION_WIDTH,
} from '../../components/games/styled';
import { StationStage } from '../../components/StationStage';
import ImageZoomOverlay, { ZoomBadge, ZoomGlassIcon } from '../../components/ImageZoomOverlay';
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
import { getHeaderIconColor } from './roadmapThemes';

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
  [DESKTOP_BREAKPOINT]: {
    position: 'static',
    fontSize: 42,
    fontWeight: 600,
    color: '#111',
    WebkitTextStroke: '0',
    margin: 0,
    paddingTop: 0,
  },
});

const StationDescriptionText = styled(StationHeadline)({
  color: '#111',
  marginBottom: 0,
  marginTop: 8,
  [DESKTOP_BREAKPOINT]: {
    color: '#111',
    fontSize: 22,
    fontWeight: 400,
    margin: 0,
    WebkitTextStroke: '0',
  },
});

const StationTopLayout = styled('div')({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '24px 24px 150px',
  textAlign: 'center',
  [DESKTOP_BREAKPOINT]: {
    width: '100%',
    justifyContent: 'flex-start',
    padding: '32px 24px 160px',
  },
});

/** Video/image stations — compact header + media on desktop so content fits one screen. */
const MediaStationLayout = styled(StationTopLayout)({
  [DESKTOP_BREAKPOINT]: {
    padding: '22px 24px 160px',
  },
});

const MediaStationHeaderBand = styled(DesktopStationHeaderBand)({
  [DESKTOP_BREAKPOINT]: {
    width: DESKTOP_MEDIA_STATION_WIDTH,
    gap: 8,
    marginBottom: 14,
    padding: '14px 28px 17px',
    borderRadius: 15,
  },
});

const MediaStationTitleText = styled(StationTitleText)({
  [DESKTOP_BREAKPOINT]: {
    fontSize: 29,
  },
});

const MediaStationDescriptionText = styled(StationDescriptionText)({
  [DESKTOP_BREAKPOINT]: {
    fontSize: 15,
  },
});

const MediaStationWindow = styled(StationWindow)({
  [DESKTOP_BREAKPOINT]: {
    maxWidth: DESKTOP_MEDIA_STATION_WIDTH,
    padding: '22px 0px',
  },
});

const FixedContinueButton = styled(StationContinueButton)({
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 40,
  '&:active': {
    transform: 'translateX(-50%) translateY(3px)',
  },
  [DESKTOP_BREAKPOINT]: {
    bottom: 32,
  },
});

/** Floating clue button (lightbulb) for info/media stations — sits in the
 *  bottom-left corner, clear of the centered Continue button. */
/** Clue button (lightbulb + label) for info/media stations. Sits centered in
 *  the lower-middle of the station, above the centered Continue button. */
const StationClueButton = styled('button')({
  position: 'fixed',
  bottom: 96,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 41,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '11px 22px',
  borderRadius: 999,
  border: '2px solid #5143c6',
  background: 'linear-gradient(135deg, #8276f2 0%, #6c5ce7 100%)',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.2,
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(108, 92, 231, 0.4)',
  WebkitTapHighlightColor: 'transparent',
  transition: 'box-shadow 0.15s ease, background 0.15s ease',
  '&:hover': {
    background: 'linear-gradient(135deg, #8e83f5 0%, #5f4fe0 100%)',
  },
  '&:active': {
    transform: 'translateX(-50%) translateY(2px)',
    boxShadow: '0 2px 8px rgba(108, 92, 231, 0.35)',
  },
  [DESKTOP_BREAKPOINT]: {
    bottom: 108,
  },
});

function ClueLightbulbIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#fff"
        d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"
      />
    </svg>
  );
}

function StationHeaderBlock({
  title,
  description,
  textColor,
  descAfter,
  children,
  compactDesktop,
}: {
  title: string;
  description?: string | null;
  textColor?: string;
  descAfter?: boolean;
  children?: React.ReactNode;
  compactDesktop?: boolean;
}) {
  const HeaderBand = compactDesktop ? MediaStationHeaderBand : DesktopStationHeaderBand;
  const TitleText = compactDesktop ? MediaStationTitleText : StationTitleText;
  const DescriptionText = compactDesktop ? MediaStationDescriptionText : StationDescriptionText;

  const titleEl = (
    <TitleText style={textColor ? { color: textColor } : undefined}>{title}</TitleText>
  );
  const descEl = description ? (
    <DescriptionText style={textColor ? { color: textColor } : undefined}>
      {description}
    </DescriptionText>
  ) : null;

  return (
    <>
      <HeaderBand>
        {titleEl}
        {!descAfter && descEl}
      </HeaderBand>
      {children}
      {descAfter && descEl}
    </>
  );
}

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

const MediaLoadRetry = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  minHeight: 200,
  padding: 24,
  textAlign: 'center',
});

const MediaRetryButton = styled(PrimaryButton)({
  width: 'auto',
  minWidth: 160,
  padding: '12px 24px',
});

function MediaGateWrapper({
  urls,
  children,
  t,
}: {
  urls: (string | undefined | null)[];
  children: React.ReactNode;
  t: Record<string, string>;
}) {
  const { ready, failed, retry } = useMediaPreload(urls);
  if (ready) return <>{children}</>;
  if (failed) {
    return (
      <MediaLoadRetry>
        <BodyText>{t.mediaLoadSlow}</BodyText>
        <MediaRetryButton type="button" onClick={retry}>
          {t.mediaRetry}
        </MediaRetryButton>
      </MediaLoadRetry>
    );
  }
  return <GameLoadingSpinner />;
}

// ─── Component ───

interface PlayingPhaseProps {
  currentItem: ModuleItemData;
  currentItemIndex: number;
  stationHintText: string | null;
  stationHintImageUrl: string | null;
  stationHintUsed: boolean;
  bgStyle: React.CSSProperties;
  theme?: string;
  customTheme?: CustomThemeData;
  code?: string;
  onGameComplete: (result: GameResult) => void;
  onOrderSurveySubmit?: (payload: OrderSurveySubmitPayload) => void | Promise<void>;
  onOrderSurveyComplete?: (result: GameResult) => void;
  onLogout: () => void;
  onViewLeaderboard?: () => void;
  hideLeaderboardInHeader?: boolean;
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
  leaderboardMode?: 'points' | 'time' | 'both';
  elapsedSeconds?: number;
  activityDurationMinutes?: number;
  smsForCollage?: boolean;
}

export default function PlayingPhase({
  currentItem,
  currentItemIndex,
  stationHintText,
  stationHintImageUrl,
  stationHintUsed,
  bgStyle: _bgStyle,
  theme,
  customTheme,
  code,
  onGameComplete,
  onOrderSurveySubmit,
  onOrderSurveyComplete,
  onLogout,
  onViewLeaderboard,
  hideLeaderboardInHeader,
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
  smsForCollage,
}: PlayingPhaseProps) {
  const activityHeaderSlot = useActivityPlayingHeaderSlot();
  const { toggle: toggleHelpChat } = useHelpChat();
  const isGameStep = currentItem.type === 'game';
  const isPuzzleGame = isGameStep && (currentItem as GameItemData).gameType === 'puzzle';
  const isOrderGame = isGameStep && (currentItem as GameItemData).gameType === 'order';
  const isBallGame = isGameStep && (currentItem as GameItemData).gameType === 'ballGame';
  const isTextVideoImageStation = currentItem.type === 'station' && ['text', 'video', 'image', 'riddle', 'avatar', 'avatarQuiz', 'enteringText'].includes((currentItem as StationItemData).stationType);
  const puzzleSessionChrome = (isPuzzleGame || isOrderGame || isBallGame || isTextVideoImageStation) ? 'puzzle' : 'default';
  const useDarkChrome = isPuzzleGame || isOrderGame || isBallGame || isTextVideoImageStation;
  const headerIconColor = getHeaderIconColor(theme, customTheme);
  const SessionHeaderIconButton = useDarkChrome ? PuzzleDarkHeaderActionIconButton : DarkHeaderActionIconButton;
  useActivityGameHeaderFallbackWhenNeeded(isGameStep, currentItem._id);
  const showMusicInGameSlot = isGameStep && activityHeaderSlot != null;
  const showStandaloneLeaderboard =
    !isGameStep && Boolean(onViewLeaderboard) && !hideLeaderboardInHeader;
  const isEnteringTextStation = currentItem.type === 'station' && (currentItem as StationItemData).stationType === 'enteringText';
  const isRiddleStation = currentItem.type === 'station' && (currentItem as StationItemData).stationType === 'riddle';

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
            <StationHeaderBlock
              title={station.name}
              description={station.description}
              textColor={customTheme?.textColor}
            />
            <StationWindow style={{ marginTop: 16 }}>
              <StationBodyText>
                {linkifyText((station.settings?.content as string) || '')}
              </StationBodyText>
            </StationWindow>
            <FixedContinueButton onClick={onStationContinue}>
              {t.continueButton}
            </FixedContinueButton>
          </StationTopLayout>
        );
      }

      if (station.stationType === 'video') {
        const videoUrl = station.settings?.mediaUrl as string | undefined;
        const source = videoUrl ? resolveVideoSource(videoUrl) : null;
        const player = (
          <VideoStationPlayer
            station={station}
            onContinue={onStationContinue}
            t={t}
            textColor={customTheme?.textColor}
          />
        );
        if (!videoUrl || source?.kind === 'iframe') {
          return player;
        }
        return (
          <MediaGateWrapper urls={[videoUrl]} t={t}>
            {player}
          </MediaGateWrapper>
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
          ]} t={t}>
            <NarrativeStation station={station} onContinue={onStationContinue} />
          </MediaGateWrapper>
        );
      }

      if (station.stationType === 'badge') {
        const badgeUrl = (station.settings?.badgeImageUrl || station.settings?.mediaUrl) as string | undefined;
        return (
          <MediaGateWrapper urls={[badgeUrl]} t={t}>
            <BadgeStation station={station} onContinue={onStationContinue} />
          </MediaGateWrapper>
        );
      }

      if (station.stationType === 'collage') {
        return <CollageStation station={station} onContinue={onStationContinue} code={code} smsForCollage={smsForCollage} />;
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
          <MediaGateWrapper urls={[riddleMediaUrl]} t={t}>
            <RiddleStation
              station={station}
              onComplete={onGameComplete}
              textColor={customTheme?.textColor}
              stationHintText={stationHintText}
              stationHintImageUrl={stationHintImageUrl}
              stationHintUsed={stationHintUsed}
              onStationHintClick={onStationHintClick}
              hintLabel={stationHintUsed ? t.showStationHint : t.stationHint}
            />
          </MediaGateWrapper>
        );
      }

      if (station.stationType === 'avatar') {
        const avatarImageUrl = station.settings?.characterImageUrl as string | undefined;
        return (
          <MediaGateWrapper urls={[avatarImageUrl]} t={t}>
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

      if (station.stationType === 'avatarQuiz') {
        const quizSettings = station.settings as {
          characterImageUrl?: string;
          questions?: Array<{ mediaUrl?: string }>;
        };
        const quizMedia = [
          quizSettings.characterImageUrl,
          ...(quizSettings.questions || []).map((q) => q?.mediaUrl),
        ];
        return (
          <MediaGateWrapper urls={quizMedia} t={t}>
            <AvatarQuizStation
              station={station}
              onComplete={onGameComplete}
              textColor={customTheme?.textColor}
              sessionStorageKey={code ? `yooz_avatar_quiz_${code}_${station._id}` : undefined}
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
      const orderSettings = gameData.settings as { mode?: string };
      const isSurvey = orderSettings.mode === 'survey';
      return (
        <OrderGame
          game={gameData}
          onComplete={isSurvey && onOrderSurveyComplete ? onOrderSurveyComplete : onGameComplete}
          activityCode={code}
          itemIndex={currentItemIndex}
          onSurveySubmit={isSurvey ? onOrderSurveySubmit : undefined}
        />
      );
    }

    if (gameData.type === 'trivia') {
      const triviaSettings = gameData.settings as { questions?: Array<{ media?: string }> };
      const triviaMedia = (triviaSettings.questions || []).map(q => q.media);
      return (
        <MediaGateWrapper urls={triviaMedia} t={t}>
          <TriviaGame game={gameData} onComplete={onGameComplete} />
        </MediaGateWrapper>
      );
    }

    if (gameData.type === 'puzzle') {
      const puzzleSettings = gameData.settings as { puzzleImage?: string; questions?: Array<{ media?: string }> };
      const puzzleMedia = [puzzleSettings.puzzleImage, ...(puzzleSettings.questions || []).map(q => q.media)];
      return (
        <MediaGateWrapper urls={puzzleMedia} t={t}>
          <PuzzleGame game={gameData} onComplete={onGameComplete} />
        </MediaGateWrapper>
      );
    }

    if (gameData.type === 'trueFalse') {
      const tfSettings = gameData.settings as { statements?: Array<{ media?: string }> };
      const tfMedia = (tfSettings.statements || []).map(s => s.media);
      return (
        <MediaGateWrapper urls={tfMedia} t={t}>
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

    if (gameData.type === 'trashSort') {
      const tsSettings = gameData.settings as { items?: Array<{ imageUrl?: string }>; bins?: Array<{ iconUrl?: string }> };
      const tsMedia = [
        ...(tsSettings.items || []).map(i => i.imageUrl),
        ...(tsSettings.bins || []).map(b => b.iconUrl),
      ];
      return (
        <MediaGateWrapper urls={tsMedia} t={t}>
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

  const themedIconProps = useDarkChrome ? {} : { iconColor: headerIconColor };
  const headerThirdSlot = showMusicInGameSlot && activityHeaderSlot ? (
    <SessionHeaderIconButton
      type="button"
      onClick={activityHeaderSlot.toggleMute}
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.preventDefault()}
      aria-label={activityHeaderSlot.isMuted ? 'Unmute game music' : 'Mute game music'}
      title={activityHeaderSlot.isMuted ? 'Unmute game music' : 'Mute game music'}
      {...themedIconProps}
    >
      {activityHeaderSlot.isMuted ? <MutedIcon /> : <SpeakerIcon />}
    </SessionHeaderIconButton>
  ) : showStandaloneLeaderboard && onViewLeaderboard ? (
    <SessionHeaderIconButton type="button" onClick={onViewLeaderboard} aria-label="Leaderboard" title={t.leaderboardTitle || 'Leaderboard'} {...themedIconProps}>
      <SessionHeaderTrophyIcon />
    </SessionHeaderIconButton>
  ) : hideLeaderboardInHeader ? null : (
    <SessionHeaderIconPlaceholder aria-hidden />
  );

  const headerBar = (
    <ActivitySessionHeader
      onLogout={onLogout}
      currentPoints={currentPoints}
      t={t}
      headerIconColor={headerIconColor}
      omitThirdSlot={hideLeaderboardInHeader && !showMusicInGameSlot}
      thirdSlot={headerThirdSlot}
      chromeVariant={puzzleSessionChrome}
      leaderboardMode={leaderboardMode}
      elapsedSeconds={elapsedSeconds}
      activityDurationMinutes={activityDurationMinutes}
    />
  );

  // Floating clue button for info/media stations (text, video, image, narrative,
  // badge). Riddle/enteringText render their own clue UI, so they're excluded.
  const stationClueButton =
    (stationHintText || stationHintImageUrl) && !isEnteringTextStation && !isRiddleStation ? (
      <StationClueButton type="button" onClick={onStationHintClick}>
        <ClueLightbulbIcon />
        {stationHintUsed ? t.showStationHint : t.stationHint}
      </StationClueButton>
    ) : null;

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
      {showStationHintText && (stationHintText || stationHintImageUrl) && (
        <ModalOverlay onClick={onCloseHintText}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalTitle sx={{ marginBottom: '8px' }}>{t.hintTitle}</ModalTitle>
            {stationHintImageUrl && (
              <img
                src={stationHintImageUrl}
                alt={t.hintTitle}
                style={{
                  display: 'block',
                  width: '100%',
                  maxHeight: 280,
                  objectFit: 'contain',
                  borderRadius: 12,
                  marginBottom: stationHintText ? 12 : 16,
                }}
              />
            )}
            {stationHintText && <ModalBody>{stationHintText}</ModalBody>}
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
    <ThemedBackground theme={theme} customTheme={customTheme}>
      <AnimatedStage>
        <AnimatedHeader>
          {headerBar}
        </AnimatedHeader>
        <AnimatedContent>
          <PlayingContent>
            <StationStage>
              {renderContent()}
            </StationStage>
          </PlayingContent>
          {stationClueButton}
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
  const { ready, failed, retry } = useMediaPreload([mediaUrl]);
  const descAfter = station.settings?.descPosition === 'after';
  const [fullscreen, setFullscreen] = useState(false);

  const mediaEl = ready ? (
    <MediaStationWindow style={{ marginTop: 16 }} isDynamic>
      <MediaStationImageWrapper style={{ marginBottom: 0, position: 'relative' }}>
        <MediaStationImage
          src={mediaUrl}
          alt=""
          style={{ cursor: 'zoom-in' }}
          onClick={() => setFullscreen(true)}
        />
        <ZoomBadge type="button" aria-label={t.imageZoomHint || 'Enlarge image'}
          title={t.imageZoomHint || 'Enlarge image'}
          onClick={() => setFullscreen(true)}>
          <ZoomGlassIcon zoomed={false} />
        </ZoomBadge>
      </MediaStationImageWrapper>
    </MediaStationWindow>
  ) : failed ? (
    <MediaLoadRetry>
      <BodyText>{t.mediaLoadSlow}</BodyText>
      <MediaRetryButton type="button" onClick={retry}>
        {t.mediaRetry}
      </MediaRetryButton>
    </MediaLoadRetry>
  ) : (
    <GameLoadingSpinner style={{ minHeight: 200, flex: 'none' }} />
  );

  return (
    <MediaStationLayout>
      <StationHeaderBlock
        title={station.name}
        description={station.description}
        textColor={textColor}
        descAfter={descAfter}
        compactDesktop
      />
      {mediaEl}
      <FixedContinueButton onClick={onContinue} disabled={!ready}>
        {t.continueButton}
      </FixedContinueButton>
      {fullscreen && mediaUrl && (
        <ImageZoomOverlay src={mediaUrl} onClose={() => setFullscreen(false)} />
      )}
    </MediaStationLayout>
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

/** Escape hatch for the watch-to-the-end gate. Sits in the bottom-left corner —
 *  the centre column is taken by Continue and, when a hint exists, the clue button. */
const SkipVideoButton = styled('button')({
  position: 'fixed',
  bottom: 28,
  left: 16,
  zIndex: 41,
  padding: '8px 18px',
  borderRadius: 999,
  border: 'none',
  background: 'rgba(0,0,0,0.35)',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  [DESKTOP_BREAKPOINT]: {
    bottom: 36,
  },
});

function VideoStationPlayer({ station, onContinue, t, textColor }: {
  station: StationItemData;
  onContinue: () => void;
  t: Record<string, string>;
  textColor?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showReplay, setShowReplay] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const source = resolveVideoSource(station.settings?.mediaUrl as string);

  // Embedded players (YouTube/Vimeo iframes) don't expose an 'ended' event, so we
  // can't gate on them — only direct <video> playback blocks Continue until the end.
  const canContinue = source.kind === 'iframe' || videoEnded;

  const handleEnded = useCallback(() => {
    setShowReplay(true);
    setVideoEnded(true);
  }, []);

  const handleReplay = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setShowReplay(false);
    }
  }, []);

  const descAfter = station.settings?.descPosition === 'after';
  const mediaEl = (
    <MediaStationWindow isDynamic style={{ marginTop: 16 }}>
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
    </MediaStationWindow>
  );

  return (
    <MediaStationLayout>
      <StationHeaderBlock
        title={station.name}
        description={station.description}
        textColor={textColor}
        descAfter={descAfter}
        compactDesktop
      />
      {mediaEl}
      {!canContinue && (
        <SkipVideoButton type="button" onClick={onContinue}>
          {t.videoSkip}
        </SkipVideoButton>
      )}
      <FixedContinueButton onClick={onContinue} disabled={!canContinue}>
        {canContinue ? t.continueButton : (t.videoWatchToContinue || t.continueButton)}
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
