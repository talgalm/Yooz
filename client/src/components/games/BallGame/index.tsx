import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { useLang, useTranslations } from '../../../context/LanguageContext';
import type { GameProps, GameResult, QuestionAnswerRecord } from '../types';
import { useRegisterActivityGameHeader } from '../../../context/activityPlayingHeaderContext';
import { GameIntroHeaderBar, GameHeaderMuteButton } from '../styled';
import type { BallGameQuestion, BallGameSettings } from './types';
import { texts } from './BallGame.i18n';
import {
  FinishContainer,
  FinishContent,
  FinishStumpStage,
  FinishStump,
  FinishScoreNumber,
  FinishScoreLabel,
} from '../TrueFalseGame/styled';
import { IntroTitle, IntroStartButton } from '../TriviaGame/styled';
import {
  BallGameRoomBackground,
  ROOM_SIDE_WALL_COLOR,
  ROOM_FLOOR_COLOR,
} from './styled';

// The phaser game inside the iframe scales to whatever box it gets. On phones
// that's the full viewport; on desktop we shrink the box to a portrait stage
// so balls/buckets/question card stay readable instead of stretching wide
// across a monitor (QA Jun 2026 page 10).
const BallGameIframe = styled('iframe')({
  position: 'absolute',
  top: 100,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 2,
  width: '100%',
  height: 'calc(100dvh - 52px)',
  border: 'none',
  background: 'transparent',
  '@media (min-width: 768px)': {
    left: '50%',
    right: 'auto',
    transform: 'translateX(-50%)',
    width: 'min(560px, 80vw)',
    height: 'calc(100dvh - 120px)',
    maxHeight: 920,
  },
});

function RoomCornersSvg() {
  // L/R = side wall width, T = ceiling height, B = floor top — all in %
  const L = 5, R = 95, T = 4, B = 96;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
    >
      {/* Side walls */}
      <polygon points={`0,0 ${L},${T} ${L},${B} 0,100`} fill={ROOM_SIDE_WALL_COLOR} />
      <polygon points={`100,0 ${R},${T} ${R},${B} 100,100`} fill={ROOM_SIDE_WALL_COLOR} />
      {/* Ceiling */}
      <polygon points={`0,0 100,0 ${R},${T} ${L},${T}`} fill={ROOM_SIDE_WALL_COLOR} opacity="0.75" />
      {/* Floor */}
      <polygon points={`${L},${B} ${R},${B} 100,100 0,100`} fill={ROOM_FLOOR_COLOR} />
      {/* Corner edge lines */}
      <line x1={L} y1={T} x2="0" y2="0" stroke="rgba(0,0,0,0.15)" strokeWidth="0.4" />
      <line x1={R} y1={T} x2="100" y2="0" stroke="rgba(0,0,0,0.15)" strokeWidth="0.4" />
      <line x1={L} y1={B} x2="0" y2="100" stroke="rgba(0,0,0,0.12)" strokeWidth="0.35" />
      <line x1={R} y1={B} x2="100" y2="100" stroke="rgba(0,0,0,0.12)" strokeWidth="0.35" />
    </svg>
  );
}

type LegacyDetailedReport = {
  index: number;
  payload: {
    question?: string;
    userAnswer?: { text?: string; isTrue?: boolean };
    isCorrectAnswer?: boolean;
  };
};

type LegacyCompletePayload = {
  scoreReport?: { gameScore?: number; gameTimeSecond?: number };
  detailedReports?: LegacyDetailedReport[];
};


function mapQuestionToLegacyConfig(question: BallGameQuestion) {
  const correct = question.answers.find((a) => a.isCorrect) ?? question.answers[0];
  const fakes = question.answers.filter((a) => !a.isCorrect).map((a) => a.text);
  return {
    question: question.text,
    answer: correct?.text ?? '',
    fakeAnswer1: fakes[0] ?? '',
    fakeAnswer2: fakes[1] ?? '',
    fakeAnswer3: fakes[2] ?? '',
  };
}

function reportsToRecords(reports: LegacyDetailedReport[]): QuestionAnswerRecord[] {
  return reports.map((entry) => ({
    questionIndex: entry.index,
    questionText: entry.payload?.question ?? '',
    selectedAnswers: [],
    correctAnswers: [],
    isCorrect: Boolean(entry.payload?.isCorrectAnswer),
    pointsEarned: 0,
    timeSpentMs: 0,
  }));
}

export default function BallGame({
  game,
  onComplete,
  embeddedInActivity,
  activityBallMuted,
  onActivityBallMuteToggle,
}: GameProps & {
  embeddedInActivity?: boolean;
  activityBallMuted?: boolean;
  onActivityBallMuteToggle?: () => void;
}) {
  const { lang, dir } = useLang();
  const t = useTranslations(texts);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(52);
  const completedRef = useRef(false);
  const detailedReportsRef = useRef<LegacyDetailedReport[]>([]);
  const lastScoreRef = useRef<{ gameScore?: number; gameTimeSecond?: number }>({});
  const [pendingResult, setPendingResult] = useState<GameResult | null>(null);
  const [previewMuteIconMuted, setPreviewMuteIconMuted] = useState(false);
  const [showInstructionVideo, setShowInstructionVideo] = useState(false);

  const settings = game.settings as unknown as BallGameSettings;

  const filteredQuestions = useMemo(() => {
    return Array.isArray(settings.questions) ? settings.questions : [];
  }, [settings.questions]);

  const initPayload = useMemo(
    () => ({
      configurations: filteredQuestions.map(mapQuestionToLegacyConfig),
      timeLimitSeconds: settings.scoring?.timeLimitSeconds ?? 30,
      gameId: game._id,
      gameName: game.name,
      lang,
      dir,
    }),
    [filteredQuestions, settings.scoring?.timeLimitSeconds, game._id, lang, dir]
  );

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const sendInit = () => {
      iframe.contentWindow?.postMessage(
        { source: 'yooz-host', type: 'BALLGAME_INIT', payload: initPayload },
        '*'
      );
    };

    const onLoad = () => {
      sendInit();
      window.setTimeout(sendInit, 250);
      window.setTimeout(sendInit, 700);
      // Keep focus in the iframe so Phaser receives the next pointer events after host UI interaction.
      window.requestAnimationFrame(() => {
        iframe.focus();
      });
    };

    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [initPayload]);

  useEffect(() => {
    const handleToggleMute = () => {
      const iframe = iframeRef.current;
      iframe?.contentWindow?.postMessage(
        { source: 'yooz-host', type: 'BALLGAME_TOGGLE_MUTE' },
        '*'
      );
      // After using the parent header mute, refocus the iframe — otherwise the first taps
      // can be lost (Safari / embedded iframe) and answer clicks appear to do nothing.
      window.requestAnimationFrame(() => {
        iframe?.focus();
      });
    };
    window.addEventListener('yooz:ballgame-audio-toggle', handleToggleMute as EventListener);
    return () => window.removeEventListener('yooz:ballgame-audio-toggle', handleToggleMute as EventListener);
  }, []);

  useEffect(() => {
    completedRef.current = false;
    detailedReportsRef.current = [];
    lastScoreRef.current = {};
    setPendingResult(null);
  }, [game._id, filteredQuestions.length]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as
        | {
            source?: string;
            type?: string;
            payload?:
              | LegacyCompletePayload
              | LegacyDetailedReport
              | { gameScore?: number; gameTimeSecond?: number };
          }
        | undefined;
      if (!data || data.source !== 'yooz-ballgame') return;

      if (data.type === 'BALLGAME_SHOW_VIDEO') {
        setShowInstructionVideo(true);
        return;
      }

      if (data.type === 'BALLGAME_HIDE_VIDEO') {
        setShowInstructionVideo(false);
        return;
      }

      if (data.type === 'BALLGAME_PROGRESS') {
        lastScoreRef.current = (data.payload as { gameScore?: number; gameTimeSecond?: number }) || {};
        return;
      }

      if (data.type === 'BALLGAME_DETAILED') {
        detailedReportsRef.current.push(data.payload as LegacyDetailedReport);
        return;
      }

      if (data.type === 'BALLGAME_BACK' && !completedRef.current) {
        completedRef.current = true;
        const scoreReport = lastScoreRef.current || {};
        const score = Number(scoreReport.gameScore ?? 0);
        const durationMs = Number(scoreReport.gameTimeSecond ?? 0) * 1000;
        onComplete({
          score: Number.isFinite(score) ? score : 0,
          maxPossibleScore: 100 + filteredQuestions.length * 2,
          durationMs: Number.isFinite(durationMs) ? durationMs : 0,
          hintUsed: false,
          questionAnswers: reportsToRecords(detailedReportsRef.current),
          metadata: { mode: 'legacy-iframe', exitedEarly: true },
        });
        return;
      }

      if (data.type === 'BALLGAME_COMPLETE' && !completedRef.current) {
        completedRef.current = true;
        const payload = (data.payload as LegacyCompletePayload) || {};
        const scoreReport = payload.scoreReport || lastScoreRef.current || {};
        const detailed = payload.detailedReports || detailedReportsRef.current || [];

        const score = Number(scoreReport.gameScore ?? 0);
        const durationMs = Number(scoreReport.gameTimeSecond ?? 0) * 1000;
        const maxPossibleScore = 100 + filteredQuestions.length * 2;

        const result: GameResult = {
          score: Number.isFinite(score) ? score : 0,
          maxPossibleScore,
          durationMs: Number.isFinite(durationMs) ? durationMs : 0,
          hintUsed: false,
          questionAnswers: reportsToRecords(detailed),
          metadata: {
            mode: 'legacy-iframe',
            legacyReports: detailed.length,
          },
        };
        setPendingResult(result);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [filteredQuestions.length, onComplete]);

  const handleCloseInstructionVideo = useCallback(() => {
    setShowInstructionVideo(false);
    iframeRef.current?.contentWindow?.postMessage(
      { source: 'yooz-host', type: 'BALLGAME_CLOSE_VIDEO' },
      '*'
    );
  }, []);

  const activityBallHost = Boolean(embeddedInActivity && onActivityBallMuteToggle);
  useRegisterActivityGameHeader(
    activityBallHost,
    pendingResult ? 'finish' : 'playing',
    activityBallMuted ?? false,
    () => {
      onActivityBallMuteToggle?.();
    }
  );

  const src = `/assets/games/ballgame/index.html?v=5&embedded=1&lang=${encodeURIComponent(lang)}&dir=${encodeURIComponent(dir)}&gameId=${encodeURIComponent(game._id)}&timeLimit=${encodeURIComponent(String(settings.scoring?.timeLimitSeconds ?? 30))}`;
  if (pendingResult) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 50 }}>
        <BallGameRoomBackground>
          <RoomCornersSvg />
        </BallGameRoomBackground>
        <FinishContainer dir={dir}>
          <FinishContent $stumpCentered>
            <IntroTitle dir="auto" style={{ marginTop: 'clamp(24px, 6vh, 52px)' }}>
              {t.gameComplete}
            </IntroTitle>

            <FinishStumpStage aria-hidden>
              <FinishStump>
                <FinishScoreNumber>{pendingResult.score}</FinishScoreNumber>
                <FinishScoreLabel>{t.pointsFull ?? t.points}</FinishScoreLabel>
              </FinishStump>
            </FinishStumpStage>

            <IntroStartButton
              type="button"
              onClick={() => onComplete(pendingResult)}
              style={{
                marginTop: 'auto',
                marginBottom: 'clamp(40px, 10vh, 80px)',
                alignSelf: 'center',
                width: 'fit-content',
                minWidth: 'min(132px, 88vw)',
                maxWidth: 'min(200px, 88vw)',
                paddingLeft: 'clamp(22px, 6vw, 36px)',
                paddingRight: 'clamp(22px, 6vw, 36px)',
              }}
            >
              {t.continueBtn ?? t.backToRoadmap}
            </IntroStartButton>
          </FinishContent>
        </FinishContainer>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <BallGameRoomBackground>
        <RoomCornersSvg />
      </BallGameRoomBackground>
      {/*
        Desktop frame: on screens >= 768px we cap the phaser iframe to a
        portrait stage centered in the viewport so the question card,
        answer pods, balls and buckets stay proportional. Without this,
        stretching the iframe to full-width makes the question text look
        small and the buckets line up off-screen on wide monitors
        (QA Jun 2026 page 10).
      */}
      {!embeddedInActivity && (
        <div
          ref={(el) => {
            headerRef.current = el;
            if (el) setHeaderHeight(el.offsetHeight);
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 25,
            pointerEvents: 'none',
          }}
        >
          <GameIntroHeaderBar style={{ pointerEvents: 'auto' }}>
            <GameHeaderMuteButton
              type="button"
              onClick={() => {
                setPreviewMuteIconMuted((m) => !m);
                window.dispatchEvent(new CustomEvent('yooz:ballgame-audio-toggle'));
              }}
              aria-label={previewMuteIconMuted ? 'Unmute game sound' : 'Mute game sound'}
            >
              {previewMuteIconMuted ? '🔇' : '🔊'}
            </GameHeaderMuteButton>
          </GameIntroHeaderBar>
        </div>
      )}
      {showInstructionVideo && (
        <div
          onClick={handleCloseInstructionVideo}
          style={{
            position: 'absolute',
            top: headerHeight,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <video
            src="/assets/games/ballgame/assets/videos/instructions.mp4"
            autoPlay
            playsInline
            muted
            onEnded={handleCloseInstructionVideo}
            style={{ width: '100%', height: '100%', border: 'none', objectFit: 'contain' }}
          />
        </div>
      )}
      <BallGameIframe
        ref={iframeRef}
        src={src}
        title="Ball Game"
        tabIndex={-1}
        allow="autoplay"
      />
    </div>
  );
}
