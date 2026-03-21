import { useEffect, useMemo, useRef, useState } from 'react';
import { useLang, useTranslations } from '../../../context/LanguageContext';
import type { GameProps, GameResult, QuestionAnswerRecord } from '../types';
import type { BallGameQuestion, BallGameSettings } from './types';
import { texts } from './BallGame.i18n';
import {
  FinishContainer,
  FinishContent,
  FinishTitleBanner,
  FinishStump,
  FinishScoreNumber,
  FinishScoreLabel,
  FinishFinalLabel,
  FinishStats,
  FinishContinueButton,
} from '../TrueFalseGame/styled';

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

function LeafVeinSvg() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 340 90"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.12 }}
    >
      <line x1="10" y1="45" x2="330" y2="45" stroke="#fff" strokeWidth="1.5" />
      <line x1="60" y1="45" x2="30" y2="15" stroke="#fff" strokeWidth="1" />
      <line x1="60" y1="45" x2="30" y2="75" stroke="#fff" strokeWidth="1" />
      <line x1="120" y1="45" x2="85" y2="12" stroke="#fff" strokeWidth="1" />
      <line x1="120" y1="45" x2="85" y2="78" stroke="#fff" strokeWidth="1" />
      <line x1="180" y1="45" x2="150" y2="15" stroke="#fff" strokeWidth="1" />
      <line x1="180" y1="45" x2="150" y2="75" stroke="#fff" strokeWidth="1" />
      <line x1="240" y1="45" x2="210" y2="10" stroke="#fff" strokeWidth="1" />
      <line x1="240" y1="45" x2="210" y2="80" stroke="#fff" strokeWidth="1" />
      <line x1="300" y1="45" x2="270" y2="18" stroke="#fff" strokeWidth="1" />
      <line x1="300" y1="45" x2="270" y2="72" stroke="#fff" strokeWidth="1" />
    </svg>
  );
}

function StumpRingsSvg() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 200 200"
      style={{ position: 'absolute', inset: 0, zIndex: 0 }}
    >
      <circle cx="100" cy="100" r="12" fill="none" stroke="#b8944a" strokeWidth="1" opacity="0.4" />
      <circle cx="100" cy="100" r="24" fill="none" stroke="#a88440" strokeWidth="1.2" opacity="0.35" />
      <circle cx="100" cy="100" r="36" fill="none" stroke="#b8944a" strokeWidth="1" opacity="0.3" />
      <circle cx="100" cy="100" r="48" fill="none" stroke="#a07838" strokeWidth="1.5" opacity="0.25" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="#b8944a" strokeWidth="1" opacity="0.22" />
      <circle cx="100" cy="100" r="72" fill="none" stroke="#907030" strokeWidth="1.5" opacity="0.2" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="#b8944a" strokeWidth="1" opacity="0.18" />
      <path d="M100,100 L98,60 L102,35 L99,12" fill="none" stroke="#7a5828" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
      <path d="M100,100 L104,70 L108,50" fill="none" stroke="#7a5828" strokeWidth="1.2" opacity="0.2" strokeLinecap="round" />
    </svg>
  );
}

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

export default function BallGame({ game, onComplete, participantAge }: GameProps) {
  const { lang, dir } = useLang();
  const t = useTranslations(texts);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const completedRef = useRef(false);
  const detailedReportsRef = useRef<LegacyDetailedReport[]>([]);
  const lastScoreRef = useRef<{ gameScore?: number; gameTimeSecond?: number }>({});
  const [pendingResult, setPendingResult] = useState<GameResult | null>(null);

  const settings = game.settings as unknown as BallGameSettings;

  const filteredQuestions = useMemo(() => {
    const source = Array.isArray(settings.questions) ? settings.questions : [];
    if (!participantAge) return source;
    return source.filter((q) => {
      if (!q.ageRange) return true;
      return participantAge >= q.ageRange.minAge && participantAge <= q.ageRange.maxAge;
    });
  }, [participantAge, settings.questions]);

  const initPayload = useMemo(
    () => ({
      configurations: filteredQuestions.map(mapQuestionToLegacyConfig),
      timeLimitSeconds: settings.scoring?.timeLimitSeconds ?? 30,
      gameId: game._id,
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
    };

    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [initPayload]);

  useEffect(() => {
    const handleToggleMute = () => {
      iframeRef.current?.contentWindow?.postMessage(
        { source: 'yooz-host', type: 'BALLGAME_TOGGLE_MUTE' },
        '*'
      );
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

  const src = `/assets/games/ballgame/index.html?v=4&embedded=1&lang=${encodeURIComponent(lang)}&dir=${encodeURIComponent(dir)}&gameId=${encodeURIComponent(game._id)}&timeLimit=${encodeURIComponent(String(settings.scoring?.timeLimitSeconds ?? 30))}`;
  if (pendingResult) {
    const answeredQuestions = pendingResult.questionAnswers?.length || filteredQuestions.length;
    const correctCount = pendingResult.questionAnswers?.filter((entry) => entry.isCorrect).length ?? 0;
    const accuracy = answeredQuestions > 0 ? Math.round((correctCount / answeredQuestions) * 100) : 0;

    return (
      <FinishContainer dir={dir}>
        <FinishContent>
          <FinishTitleBanner>
            <LeafVeinSvg />
            <span style={{ position: 'relative', zIndex: 1 }}>{t.gameComplete}</span>
          </FinishTitleBanner>

          <FinishStump>
            <StumpRingsSvg />
            <FinishScoreNumber>{pendingResult.score}</FinishScoreNumber>
            <FinishScoreLabel>{t.pointsFull ?? t.points}</FinishScoreLabel>
          </FinishStump>

          <FinishFinalLabel>{t.finalScore}</FinishFinalLabel>
          <FinishStats>
            {t.correctAnswers}: {correctCount}/{answeredQuestions}
            <br />
            {t.accuracy}: {accuracy}%
          </FinishStats>

          <FinishContinueButton onClick={() => onComplete(pendingResult)}>
            {t.continueBtn ?? t.backToRoadmap}
          </FinishContinueButton>
        </FinishContent>
      </FinishContainer>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'transparent',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <iframe
        ref={iframeRef}
        src={src}
        title="Ball Game"
        style={{
          width: '100vw',
          height: '100dvh',
          border: 'none',
          background: 'transparent',
        }}
        allow="autoplay"
      />
    </div>
  );
}
